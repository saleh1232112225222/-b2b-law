-- Financial integrity repair. Idempotent and non-destructive.
CREATE UNIQUE INDEX IF NOT EXISTS idx_finances_company_engagement_unique
  ON finances(company_id, legal_engagement_id)
  WHERE legal_engagement_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_receivables_company_invoice_unique
  ON receivables(company_id, invoice_id)
  WHERE invoice_id IS NOT NULL;

UPDATE invoices
SET vat_rate = vat_rate / 100
WHERE vat_rate > 1;

UPDATE legal_engagements
SET remaining_amount = GREATEST(
      COALESCE(financial_compensation, 0) + COALESCE(tax, 0) +
      COALESCE(late_fee_amount, 0) - COALESCE(paid_amount, 0), 0
    ),
    finance_status = CASE
      WHEN COALESCE(paid_amount, 0) >= COALESCE(financial_compensation, 0) + COALESCE(tax, 0) + COALESCE(late_fee_amount, 0)
        THEN 'paid'
      WHEN COALESCE(paid_amount, 0) > 0 THEN 'partial'
      ELSE 'pending'
    END
WHERE deleted_at IS NULL AND finance_status <> 'closed';

INSERT INTO finances (
  company_id, type, category, amount, vat_amount, total, description, date,
  legal_engagement_id, client_id, case_id, status, payment_method,
  paid_amount, remaining_amount, created_by, updated_by
)
SELECT
  e.company_id, 'receivable', 'legal_service', COALESCE(e.financial_compensation, 0),
  COALESCE(e.tax, 0), COALESCE(e.financial_compensation, 0) + COALESCE(e.tax, 0),
  'خدمة قانونية رقم ' || e.engagement_number, COALESCE(e.start_date, CURRENT_DATE),
  e.id, e.client_id, e.case_id, e.finance_status, e.payment_method,
  COALESCE(e.paid_amount, 0), COALESCE(e.remaining_amount, 0), e.created_by, e.updated_by
FROM legal_engagements e
WHERE e.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM finances f
    WHERE f.company_id = e.company_id AND f.legal_engagement_id = e.id
  );

UPDATE finances f
SET amount = COALESCE(e.financial_compensation, 0),
    vat_amount = COALESCE(e.tax, 0),
    total = COALESCE(e.financial_compensation, 0) + COALESCE(e.tax, 0),
    paid_amount = COALESCE(e.paid_amount, 0),
    remaining_amount = COALESCE(e.remaining_amount, 0),
    status = e.finance_status,
    client_id = e.client_id,
    case_id = e.case_id,
    updated_at = NOW()
FROM legal_engagements e
WHERE f.company_id = e.company_id AND f.legal_engagement_id = e.id;

INSERT INTO client_accounts (
  company_id, client_id, total_due, total_paid, balance, overdue_amount,
  last_payment_date, status
)
SELECT
  e.company_id, e.client_id,
  SUM(COALESCE(e.financial_compensation, 0) + COALESCE(e.tax, 0) + COALESCE(e.late_fee_amount, 0)),
  SUM(COALESCE(e.paid_amount, 0)),
  SUM(GREATEST(COALESCE(e.financial_compensation, 0) + COALESCE(e.tax, 0) + COALESCE(e.late_fee_amount, 0) - COALESCE(e.paid_amount, 0), 0)),
  SUM(CASE WHEN e.finance_status = 'overdue' THEN GREATEST(COALESCE(e.remaining_amount, 0), 0) ELSE 0 END),
  MAX(ph.received_at)::date,
  CASE
    WHEN SUM(GREATEST(COALESCE(e.remaining_amount, 0), 0)) <= 0 THEN 'settled'
    WHEN SUM(CASE WHEN e.finance_status = 'overdue' THEN GREATEST(COALESCE(e.remaining_amount, 0), 0) ELSE 0 END) > 0 THEN 'overdue'
    ELSE 'active'
  END
FROM legal_engagements e
LEFT JOIN (
  SELECT company_id, legal_engagement_id, MAX(received_at) AS received_at
  FROM payment_history GROUP BY company_id, legal_engagement_id
) ph ON ph.legal_engagement_id = e.id AND ph.company_id = e.company_id
WHERE e.deleted_at IS NULL AND e.client_id IS NOT NULL
GROUP BY e.company_id, e.client_id
ON CONFLICT (company_id, client_id) DO UPDATE SET
  total_due = EXCLUDED.total_due,
  total_paid = EXCLUDED.total_paid,
  balance = EXCLUDED.balance,
  overdue_amount = EXCLUDED.overdue_amount,
  last_payment_date = EXCLUDED.last_payment_date,
  status = EXCLUDED.status,
  updated_at = NOW();
