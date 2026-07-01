-- ============================================================
-- 0006: نظام حسابات المكتب — جداول الدفعات والأقساط
-- ============================================================

-- جدول 1: جدول الدفعات / الأقساط
CREATE TABLE IF NOT EXISTS payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  legal_engagement_id UUID NOT NULL REFERENCES legal_engagements(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  paid_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','cancelled')),
  payment_method TEXT,
  voucher_id UUID REFERENCES vouchers(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول 2: سجل الدفعات (Audit Trail)
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  legal_engagement_id UUID NOT NULL REFERENCES legal_engagements(id),
  payment_schedule_id UUID REFERENCES payment_schedules(id),
  amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT NOT NULL,
  voucher_id UUID REFERENCES vouchers(id),
  notes TEXT,
  received_by UUID,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول 3: حسابات العملاء (Summary)
CREATE TABLE IF NOT EXISTS client_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  total_due NUMERIC(12,2) DEFAULT 0,
  total_paid NUMERIC(12,2) DEFAULT 0,
  balance NUMERIC(12,2) DEFAULT 0,
  overdue_amount NUMERIC(12,2) DEFAULT 0,
  last_payment_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','settled','overdue')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, client_id)
);

-- الفهارس
CREATE INDEX IF NOT EXISTS idx_payment_schedules_engagement ON payment_schedules(legal_engagement_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON payment_schedules(status);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date ON payment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_history_engagement ON payment_history(legal_engagement_id);
CREATE INDEX IF NOT EXISTS idx_client_accounts_client ON client_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_accounts_status ON client_accounts(status);

-- أعمدة جديدة على legal_engagements
ALTER TABLE legal_engagements ADD COLUMN IF NOT EXISTS installment_count INTEGER DEFAULT 1;
ALTER TABLE legal_engagements ADD COLUMN IF NOT EXISTS installment_frequency TEXT DEFAULT 'none';
ALTER TABLE legal_engagements ADD COLUMN IF NOT EXISTS finance_status TEXT DEFAULT 'pending';
ALTER TABLE legal_engagements ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE legal_engagements ADD COLUMN IF NOT EXISTS discount_reason TEXT;
ALTER TABLE legal_engagements ADD COLUMN IF NOT EXISTS original_compensation NUMERIC(12,2);
ALTER TABLE legal_engagements ADD COLUMN IF NOT EXISTS late_fee_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE legal_engagements ADD COLUMN IF NOT EXISTS late_fee_amount NUMERIC(12,2) DEFAULT 0;

-- أعمدة جديدة على finances
ALTER TABLE finances ADD COLUMN IF NOT EXISTS payment_schedules_count INTEGER DEFAULT 0;
ALTER TABLE finances ADD COLUMN IF NOT EXISTS finance_status TEXT DEFAULT 'pending';
