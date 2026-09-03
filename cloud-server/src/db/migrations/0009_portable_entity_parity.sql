CREATE TABLE IF NOT EXISTS assignment_logs (
  id UUID PRIMARY KEY, company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, old_user_id UUID, new_user_id UUID,
  changed_by UUID, reason TEXT, changed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS case_actions (
  id UUID PRIMARY KEY, company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE, session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  type_key TEXT NOT NULL, status TEXT, title TEXT, metadata JSONB, opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ, closed_reason TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS case_assignments (
  id UUID PRIMARY KEY, company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE, employee_id UUID NOT NULL REFERENCES employees(id),
  role TEXT, assigned_at TIMESTAMPTZ DEFAULT NOW(), notes TEXT
);
CREATE TABLE IF NOT EXISTS contract_party_audits (
  id UUID PRIMARY KEY, company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE, action_key TEXT NOT NULL,
  actor_user_id UUID, participant_id UUID, before_json JSONB, after_json JSONB, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY, company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE, linked_title TEXT, name TEXT NOT NULL,
  file_path TEXT NOT NULL, file_type TEXT, file_size BIGINT, status TEXT, is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS enf_attachments (
  id UUID PRIMARY KEY, company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES enforcement_requests(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES file_assets(id), label TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS enf_decisions (
  id UUID PRIMARY KEY, company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES enforcement_requests(id) ON DELETE CASCADE,
  decision_type TEXT, decision_date DATE, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS enf_direct_details (
  request_id UUID PRIMARY KEY REFERENCES enforcement_requests(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  execution_location TEXT, action_type TEXT, work_description TEXT
);
CREATE TABLE IF NOT EXISTS enf_financial_details (
  request_id UUID PRIMARY KEY REFERENCES enforcement_requests(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  amount_instrument NUMERIC(14,2), amount_collected_for_client NUMERIC(14,2), currency TEXT
);
CREATE TABLE IF NOT EXISTS enf_personal_details (
  request_id UUID PRIMARY KEY REFERENCES enforcement_requests(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  alimony_amount NUMERIC(14,2), execution_frequency TEXT, beneficiary_name TEXT, visit_custody_details TEXT
);
CREATE TABLE IF NOT EXISTS enf_request_parties (
  id UUID PRIMARY KEY, company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES enforcement_requests(id) ON DELETE CASCADE,
  party_name TEXT NOT NULL, party_role TEXT, is_client BOOLEAN, linked_entity_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS finances_new (
  id UUID PRIMARY KEY, company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE, data JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS professional_liability_logs (
  id UUID PRIMARY KEY, company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL, actor_username TEXT, actor_role_key TEXT, module_key TEXT NOT NULL,
  action_key TEXT NOT NULL, rule_id TEXT NOT NULL, decision TEXT NOT NULL, severity TEXT NOT NULL,
  message TEXT NOT NULL, legal_effect TEXT NOT NULL, entity_type TEXT, entity_id TEXT, payload_json JSONB,
  override_reason TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY, company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE, responsible_user_id UUID,
  title TEXT NOT NULL, description TEXT, due_date DATE, status TEXT, priority TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ, archived_by UUID, archive_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_assignment_logs_company ON assignment_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_case_actions_company ON case_actions(company_id);
CREATE INDEX IF NOT EXISTS idx_case_assignments_company ON case_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_contract_party_audits_company ON contract_party_audits(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_enf_attachments_company ON enf_attachments(company_id);
CREATE INDEX IF NOT EXISTS idx_enf_decisions_company ON enf_decisions(company_id);
CREATE INDEX IF NOT EXISTS idx_finances_new_company ON finances_new(company_id);
CREATE INDEX IF NOT EXISTS idx_professional_liability_logs_company ON professional_liability_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id);
