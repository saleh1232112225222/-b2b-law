-- Migration 0007: Office Management - Expenses, Partners, Budget
-- الميزانية التشغيلية وأرباح الشركاء

-- 1. جدول المصروفات
CREATE TABLE IF NOT EXISTS office_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    category TEXT NOT NULL, -- 'salaries','rent','utilities','marketing','legal_supplies','office_supplies','other'
    description TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    paid_by TEXT, -- 'office','partner_a','partner_b'
    receipt_number TEXT,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول الشركاء
CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    share_percentage NUMERIC(5,2) NOT NULL DEFAULT 0, -- نسبة الربح 0-100
    role TEXT, -- 'managing_partner','senior_partner','junior_partner'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول مساهمات الشركاء (من جلب العميل، تسيير القضية، etc.)
CREATE TABLE IF NOT EXISTS partner_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    engagement_id UUID, -- ربط بخدمة قانونية
    case_id UUID, -- ربط بقضية
    contribution_type TEXT NOT NULL, -- 'client_acquired','case_managed','documents_prepared','case_closed','fee_collected'
    description TEXT,
    amount NUMERIC(15,2) DEFAULT 0, -- المبلغ الذي ساهم في تحقيقه
    contribution_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. جدول الميزانية التشغيلية الشهرية
CREATE TABLE IF NOT EXISTS office_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    month INTEGER NOT NULL, -- 1-12
    year INTEGER NOT NULL,
    category TEXT NOT NULL, -- 'salaries','rent','utilities','marketing','legal_supplies','office_supplies','other'
    budgeted_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    actual_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, month, year, category)
);

-- 5. جدول توزيع الأرباح
CREATE TABLE IF NOT EXISTS profit_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    total_revenue NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_expenses NUMERIC(15,2) NOT NULL DEFAULT 0,
    net_profit NUMERIC(15,2) NOT NULL DEFAULT 0,
    partner_share NUMERIC(15,2) NOT NULL DEFAULT 0, -- net_profit * share_percentage
    distributed BOOLEAN DEFAULT FALSE,
    distributed_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, partner_id, month, year)
);

-- Indexes
CREATE INDEX idx_office_expenses_company ON office_expenses(company_id);
CREATE INDEX idx_office_expenses_date ON office_expenses(expense_date);
CREATE INDEX idx_office_expenses_category ON office_expenses(category);
CREATE INDEX idx_partners_company ON partners(company_id);
CREATE INDEX idx_partner_contributions_company ON partner_contributions(company_id);
CREATE INDEX idx_partner_contributions_partner ON partner_contributions(partner_id);
CREATE INDEX idx_office_budgets_company ON office_budgets(company_id);
CREATE INDEX idx_office_budgets_period ON office_budgets(month, year);
CREATE INDEX idx_profit_distributions_company ON profit_distributions(company_id);
CREATE INDEX idx_profit_distributions_period ON profit_distributions(month, year);
