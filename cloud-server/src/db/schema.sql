-- ============================================================
-- B2B-LAW PostgreSQL Full Schema
-- المصدر: تحويل DDL من SQLite إلى PostgreSQL مع Multi-Tenancy
-- تاريخ: 21 مايو 2026
-- ملاحظة: جميع الجداول تحتوي company_id لعزل بيانات الشركات
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_code TEXT,
    trial_expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 1. الجداول الأساسية (Core Tables)
-- ============================================================

CREATE TABLE agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    agency_number TEXT NOT NULL,
    date DATE,
    expiry_date DATE,
    notes TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    id_number TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    nationality TEXT DEFAULT 'سعودي',
    city TEXT,
    birth_date DATE,
    notes TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE defendants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    id_number TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    nationality TEXT DEFAULT 'سعودي',
    city TEXT,
    birth_date DATE,
    notes TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name TEXT NOT NULL,
    national_id TEXT,
    nationality TEXT DEFAULT 'سعودي',
    phone TEXT,
    email TEXT,
    job_title TEXT,
    role_type TEXT,
    qualification TEXT,
    license_number TEXT,
    contract_number TEXT,
    salary NUMERIC(12,2),
    hourly_rate NUMERIC(8,2),
    status TEXT DEFAULT 'active',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    username TEXT NOT NULL,
    full_name TEXT,
    password_hash TEXT,
    role_key TEXT,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    must_change_password BOOLEAN DEFAULT TRUE,
    recovery_email TEXT,
    security_question TEXT,
    security_answer_hash TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, username)
);

-- ============================================================
-- 2. القضايا والجلسات (Cases & Sessions)
-- ============================================================

CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    case_number TEXT NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    responsible_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    case_type TEXT,
    main_classification TEXT,
    sub_classification TEXT,
    subject TEXT,
    court TEXT,
    circuit TEXT,
    opponent_name TEXT,
    opponent_id TEXT,
    opponent_nationality TEXT,
    opponent_city TEXT,
    opponent_phone TEXT,
    opponent_address TEXT,
    opponent_email TEXT,
    registration_date DATE,
    registration_date_hijri TEXT,
    contract_date DATE,
    contract_amount NUMERIC(12,2),
    client_role TEXT,
    assessment TEXT,
    client_requirement TEXT,
    plaintiff_requests TEXT,
    phase TEXT,
    status TEXT DEFAULT 'قيد النظر',
    priority TEXT DEFAULT 'متوسطة',
    folder_link TEXT,
    notes TEXT,
    najiz_url TEXT,
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    archived_by UUID,
    archive_reason TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, case_number)
);

CREATE TABLE case_parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    party_type TEXT NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    defendant_id UUID REFERENCES defendants(id) ON DELETE SET NULL,
    name TEXT,
    id_number TEXT,
    phone TEXT,
    nationality TEXT,
    city TEXT,
    address TEXT,
    email TEXT,
    role TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    responsible_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    date_hijri TEXT,
    time TIME,
    court_room TEXT,
    status TEXT DEFAULT 'قادمة',
    notes TEXT,
    result TEXT,
    meeting_link TEXT,
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    archived_by UUID,
    archive_reason TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE session_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    result TEXT NOT NULL,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2.5. الخدمات القانونية (Legal Services) - Advanced Schema
-- ============================================================

CREATE TABLE legal_service_categories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name_ar TEXT NOT NULL,
    name_en TEXT
);

CREATE TABLE legal_service_types (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id TEXT NOT NULL REFERENCES legal_service_categories(id) ON DELETE CASCADE,
    key TEXT UNIQUE NOT NULL,
    name_ar TEXT NOT NULL,
    name_en TEXT
);

CREATE TABLE legal_service_statuses (
    id TEXT PRIMARY KEY,
    status_key TEXT UNIQUE NOT NULL,
    status_name_ar TEXT NOT NULL,
    status_name_en TEXT,
    color TEXT
);

CREATE TABLE legal_service_priorities (
    id TEXT PRIMARY KEY,
    priority_key TEXT UNIQUE NOT NULL,
    priority_name_ar TEXT NOT NULL,
    priority_name_en TEXT,
    color TEXT
);

CREATE TABLE legal_engagements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    engagement_number TEXT UNIQUE NOT NULL,
    engagement_type_id TEXT NOT NULL REFERENCES legal_service_types(id),
    category_id TEXT NOT NULL REFERENCES legal_service_categories(id),
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    beneficiary TEXT,
    linked_parties TEXT,
    responsible_lawyer_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    assistant_team TEXT,
    description TEXT,
    purpose TEXT,
    start_date DATE,
    expected_end_date DATE,
    completion_date DATE,
    status_id TEXT NOT NULL REFERENCES legal_service_statuses(id),
    priority_id TEXT NOT NULL REFERENCES legal_service_priorities(id),
    financial_compensation NUMERIC(12,2) DEFAULT 0,
    tax NUMERIC(12,2) DEFAULT 0,
    paid_amount NUMERIC(12,2) DEFAULT 0,
    remaining_amount NUMERIC(12,2) DEFAULT 0,
    payment_method TEXT,
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,
    installment_count INTEGER DEFAULT 1,
    installment_frequency TEXT DEFAULT 'none',
    finance_status TEXT DEFAULT 'pending',
    discount_amount NUMERIC(12,2) DEFAULT 0,
    discount_reason TEXT,
    original_compensation NUMERIC(12,2),
    late_fee_rate NUMERIC(5,2) DEFAULT 0,
    late_fee_amount NUMERIC(12,2) DEFAULT 0
);

CREATE TABLE consultation_service_details (
    engagement_id UUID PRIMARY KEY REFERENCES legal_engagements(id) ON DELETE CASCADE,
    consultation_medium TEXT,
    legal_opinion_summary TEXT
);

CREATE TABLE litigation_service_details (
    engagement_id UUID PRIMARY KEY REFERENCES legal_engagements(id) ON DELETE CASCADE,
    court_level TEXT,
    opponent_details TEXT
);

CREATE TABLE contract_service_details (
    engagement_id UUID PRIMARY KEY REFERENCES legal_engagements(id) ON DELETE CASCADE,
    contract_scope TEXT,
    drafting_language TEXT
);

CREATE TABLE legal_service_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engagement_id UUID NOT NULL REFERENCES legal_engagements(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_by UUID,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE legal_service_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engagement_id UUID NOT NULL REFERENCES legal_engagements(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE legal_service_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engagement_id UUID NOT NULL REFERENCES legal_engagements(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_title TEXT NOT NULL,
    event_description TEXT,
    actor UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. المهام (Tasks)
-- ============================================================

CREATE TABLE tasks_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    legal_engagement_id UUID REFERENCES legal_engagements(id) ON DELETE SET NULL,
    link_type TEXT,
    external_name TEXT,
    owner_type TEXT,
    responsible_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    status TEXT,
    priority TEXT,
    status_changed_at TIMESTAMPTZ,
    scheduled_for TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    closed_by UUID,
    closure_note TEXT,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID,
    cancel_reason TEXT,
    waiting_on_type TEXT,
    waiting_on_name TEXT,
    blocked_reason TEXT,
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    archived_by UUID,
    archive_reason TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    task_id UUID NOT NULL REFERENCES tasks_v2(id) ON DELETE CASCADE,
    action_key TEXT NOT NULL,
    actor_user_id UUID,
    before_json JSONB,
    after_json JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    task_id UUID NOT NULL REFERENCES tasks_v2(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    notified_on TEXT NOT NULL,
    notified_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. الحسابات (Accounts) — توضع قبل المالية لتفادي FK dependency
-- ============================================================

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name TEXT NOT NULL,
    code TEXT DEFAULT '',
    parent_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    balance NUMERIC(12,2) DEFAULT 0,
    type TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_refundable BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. المالية (Finance)
-- ============================================================

CREATE TABLE finances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    legal_engagement_id UUID REFERENCES legal_engagements(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    category TEXT,
    description TEXT,
    date DATE NOT NULL,
    vat_rate NUMERIC(4,2) DEFAULT 0.15,
    vat_amount NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2),
    is_refundable BOOLEAN DEFAULT FALSE,
    expense_owner_type TEXT DEFAULT 'office',
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    reference_id TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    payment_schedules_count INTEGER DEFAULT 0,
    finance_status TEXT DEFAULT 'pending'
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    date DATE,
    subtotal NUMERIC(12,2),
    tax_amount NUMERIC(12,2),
    vat_rate NUMERIC(4,2),
    total NUMERIC(12,2),
    status TEXT,
    notes TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, invoice_number)
);

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT,
    amount NUMERIC(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    voucher_number TEXT NOT NULL,
    type TEXT,
    amount NUMERIC(12,2),
    date DATE,
    payment_method TEXT,
    notes TEXT,
    reference_type TEXT,
    reference_id TEXT,
    linked_transaction_id TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, voucher_number)
);

CREATE TABLE receivables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    amount_due NUMERIC(12,2),
    amount_paid NUMERIC(12,2) DEFAULT 0,
    due_date DATE,
    status TEXT,
    description TEXT,
    linked_credit_note_id UUID,
    last_voucher_id UUID,
    version INTEGER DEFAULT 1,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL,
    reason TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT DEFAULT 'pending',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. المستندات والملفات (Documents & Files)
-- ============================================================

CREATE TABLE documents_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks_v2(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    link_type TEXT,
    linked_title TEXT,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT DEFAULT 0,
    status TEXT DEFAULT 'active',
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE file_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    original_name TEXT,
    stored_path TEXT,
    size_bytes BIGINT,
    mime_type TEXT,
    checksum_sha256 TEXT,
    doc_type TEXT,
    linked_entity_type TEXT,
    linked_entity_id TEXT,
    tags_json JSONB,
    uploaded_by UUID,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. العقود (Contracts)
-- ============================================================

CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    contract_no TEXT,
    contract_type TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    title TEXT,
    template_id UUID,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    employee_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    representative_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    contract_date DATE,
    start_date DATE,
    end_date DATE,
    is_fixed_term BOOLEAN DEFAULT FALSE,
    term_years INTEGER,
    total_amount NUMERIC(12,2) DEFAULT 0,
    salary_amount NUMERIC(12,2) DEFAULT 0,
    salary_due_day INTEGER,
    text_content TEXT,
    created_by UUID,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    archived_by UUID,
    archive_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- باقي جداول العقود مماثلة...

-- ============================================================
-- 8. التنفيذ (Enforcement)
-- ============================================================

CREATE TABLE enforcement_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    request_no TEXT NOT NULL,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    is_office_case BOOLEAN DEFAULT FALSE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    request_type TEXT,
    instrument_no TEXT,
    najiz_request_no TEXT,
    instrument_type_main TEXT,
    instrument_type_sub TEXT,
    instrument_date DATE,
    court_name TEXT,
    case_number TEXT,
    request_classification TEXT,
    other_explanation TEXT,
    status TEXT DEFAULT 'draft',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, request_no)
);

-- ============================================================
-- 9. الصلاحيات والإعدادات (Permissions & Settings)
-- ============================================================

CREATE TABLE permissions (
    permission_key TEXT,
    company_id UUID NOT NULL,
    permission_name TEXT,
    module_key TEXT,
    PRIMARY KEY (company_id, permission_key)
);

CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    role_key TEXT,
    permission_key TEXT,
    UNIQUE(company_id, role_key, permission_key)
);

CREATE TABLE user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_key TEXT NOT NULL,
    is_allowed BOOLEAN,
    UNIQUE(company_id, user_id, permission_key)
);

CREATE TABLE settings (
    key TEXT,
    company_id UUID NOT NULL,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (company_id, key)
);

CREATE TABLE firm_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, key)
);

-- ============================================================
-- 9. سجل النشاطات (Activity Logs)
-- ============================================================

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    action_key TEXT,
    module_key TEXT,
    details TEXT,
    entity_id TEXT,
    entity_name TEXT,
    actor TEXT,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata_json JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. الفهارس الأساسية
-- ============================================================

CREATE INDEX idx_clients_company ON clients(company_id);
CREATE INDEX idx_cases_company_status ON cases(company_id, status);
CREATE INDEX idx_cases_company_number ON cases(company_id, case_number);
CREATE INDEX idx_sessions_company_date ON sessions(company_id, date);
CREATE INDEX idx_sessions_case_date ON sessions(company_id, case_id, date);
CREATE INDEX idx_tasks_v2_company_status ON tasks_v2(company_id, status);
CREATE INDEX idx_tasks_v2_responsible ON tasks_v2(company_id, responsible_user_id);
CREATE INDEX idx_tasks_v2_due ON tasks_v2(company_id, due_date);
CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_vouchers_company ON vouchers(company_id);
CREATE INDEX idx_receivables_company_client ON receivables(company_id, client_id);
CREATE INDEX idx_enforcement_requests_company ON enforcement_requests(company_id);
CREATE INDEX idx_contracts_company ON contracts(company_id);
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_file_assets_entity ON file_assets(company_id, linked_entity_type, linked_entity_id);
CREATE INDEX idx_activity_logs_company ON activity_logs(company_id);
CREATE INDEX idx_documents_v2_case ON documents_v2(company_id, case_id);
CREATE INDEX idx_firm_data_company ON firm_data(company_id);
CREATE INDEX idx_agencies_company ON agencies(company_id);
CREATE INDEX idx_agencies_client ON agencies(company_id, client_id);
CREATE INDEX idx_agencies_expiry ON agencies(company_id, expiry_date);
CREATE INDEX idx_employees_company ON employees(company_id);

CREATE TABLE scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_email TEXT NOT NULL,
    report_type TEXT DEFAULT 'users_report',
    send_at TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. نظام حسابات المكتب (Office Accounts)
-- ============================================================

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

-- فهارس حسابات المكتب
CREATE INDEX IF NOT EXISTS idx_payment_schedules_engagement ON payment_schedules(legal_engagement_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON payment_schedules(status);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date ON payment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_history_engagement ON payment_history(legal_engagement_id);
CREATE INDEX IF NOT EXISTS idx_client_accounts_client ON client_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_accounts_status ON client_accounts(status);
