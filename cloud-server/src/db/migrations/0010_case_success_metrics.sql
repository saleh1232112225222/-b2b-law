-- Phase 1: Case Success Metrics & Structured Outcomes
ALTER TABLE cases ADD COLUMN IF NOT EXISTS final_outcome TEXT DEFAULT 'pending';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS claimed_amount NUMERIC(14,2) DEFAULT 0;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS awarded_amount NUMERIC(14,2) DEFAULT 0;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS failure_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_cases_company_final_outcome ON cases(company_id, final_outcome);
CREATE INDEX IF NOT EXISTS idx_cases_company_client_role ON cases(company_id, client_role);
