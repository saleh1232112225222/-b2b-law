-- Migration 0011: Ensure firm_data deduplication and unique index on (company_id, key)
DELETE FROM firm_data f1
USING firm_data f2
WHERE f1.ctid < f2.ctid
  AND f1.company_id = f2.company_id
  AND f1.key = f2.key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_firm_data_company_key ON firm_data (company_id, key);
