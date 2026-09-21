-- Migration 0012: Client Session Brief Reports with Audit & Delivery Trail
CREATE TABLE IF NOT EXISTS session_client_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_summary TEXT,
  lawyer_notes TEXT,
  internal_notes TEXT,
  dispatch_status TEXT NOT NULL DEFAULT 'draft',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  sent_by UUID,
  sent_at TIMESTAMPTZ,
  sent_via TEXT,
  metadata_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_session_client_reports_session ON session_client_reports(company_id, session_id);
