import { query } from './connection'

export async function runExtraMigrations() {
  console.log('[MIGRATE_EXTRA] Running extra migrations...')

  // Soft delete columns for companies table
  try {
    await query(`
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE
    `)
    await query(`
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ
    `)
    await query(`
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_by UUID
    `)
    console.log('[MIGRATE_EXTRA] Soft delete columns ensured for companies table')
  } catch (err: any) {
    console.warn('[MIGRATE_EXTRA] Soft delete columns migration warning:', err.message)
  }

  // Google User ID column for users table
  try {
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_user_id TEXT
    `)
    // Unique index on google_user_id (only non-null values)
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_user_id 
      ON users (google_user_id) WHERE google_user_id IS NOT NULL
    `)
    console.log('[MIGRATE_EXTRA] google_user_id column and index ensured for users table')
  } catch (err: any) {
    console.warn('[MIGRATE_EXTRA] google_user_id migration warning:', err.message)
  }

  // Unique index on recovery_email to prevent duplicate accounts
  try {
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_recovery_email 
      ON users (recovery_email) WHERE recovery_email IS NOT NULL
    `)
    console.log('[MIGRATE_EXTRA] recovery_email unique index ensured for users table')
  } catch (err: any) {
    console.warn('[MIGRATE_EXTRA] recovery_email index migration warning:', err.message)
  }

  // is_suspended column for explicit user suspension control
  try {
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE
    `)
    console.log('[MIGRATE_EXTRA] is_suspended column ensured for users table')
  } catch (err: any) {
    console.warn('[MIGRATE_EXTRA] is_suspended migration warning:', err.message)
  }

  // suspended_at column for subscriptions to distinguish suspension from cancellation
  try {
    await query(`
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ
    `)
    await query(`
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS suspend_reason TEXT
    `)
    console.log(
      '[MIGRATE_EXTRA] suspended_at and suspend_reason columns ensured for subscriptions table'
    )
  } catch (err: any) {
    console.warn('[MIGRATE_EXTRA] subscriptions suspension columns migration warning:', err.message)
  }

  // Legal Services Tables
  // Ensure Legal Service Reference Tables
  await query(`
      CREATE TABLE IF NOT EXISTS legal_service_categories (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT UNIQUE NOT NULL,
        name_ar TEXT NOT NULL,
        name_en TEXT
      )
    `)
  await query(`
      CREATE TABLE IF NOT EXISTS legal_service_types (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id TEXT NOT NULL REFERENCES legal_service_categories(id) ON DELETE CASCADE,
        key TEXT UNIQUE NOT NULL,
        name_ar TEXT NOT NULL,
        name_en TEXT
      )
    `)
  await query(`
      CREATE TABLE IF NOT EXISTS legal_service_statuses (
        id TEXT PRIMARY KEY,
        status_key TEXT UNIQUE NOT NULL,
        status_name_ar TEXT NOT NULL,
        status_name_en TEXT,
        color TEXT
      )
    `)
  await query(`
      CREATE TABLE IF NOT EXISTS legal_service_priorities (
        id TEXT PRIMARY KEY,
        priority_key TEXT UNIQUE NOT NULL,
        priority_name_ar TEXT NOT NULL,
        priority_name_en TEXT,
        color TEXT
      )
    `)
  await query(`
      CREATE TABLE IF NOT EXISTS legal_engagements (
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
        deleted_by UUID
      )
    `)
  await query(`
      CREATE TABLE IF NOT EXISTS consultation_service_details (
        engagement_id UUID PRIMARY KEY REFERENCES legal_engagements(id) ON DELETE CASCADE,
        consultation_medium TEXT,
        legal_opinion_summary TEXT
      )
    `)
  await query(`
      CREATE TABLE IF NOT EXISTS litigation_service_details (
        engagement_id UUID PRIMARY KEY REFERENCES legal_engagements(id) ON DELETE CASCADE,
        court_name TEXT,
        case_number TEXT,
        judgment_summary TEXT
      )
    `)
  await query(`
      CREATE TABLE IF NOT EXISTS contract_service_details (
        engagement_id UUID PRIMARY KEY REFERENCES legal_engagements(id) ON DELETE CASCADE,
        contract_parties TEXT,
        contract_value NUMERIC(12,2)
      )
    `)
  await query(`
      CREATE TABLE IF NOT EXISTS legal_service_attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        engagement_id UUID NOT NULL REFERENCES legal_engagements(id) ON DELETE CASCADE,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        uploaded_by UUID,
        uploaded_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
  await query(`
      CREATE TABLE IF NOT EXISTS legal_service_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        engagement_id UUID NOT NULL REFERENCES legal_engagements(id) ON DELETE CASCADE,
        note_text TEXT NOT NULL,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
  await query(`
      CREATE TABLE IF NOT EXISTS legal_service_timeline (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        engagement_id UUID NOT NULL REFERENCES legal_engagements(id) ON DELETE CASCADE,
        event_title TEXT NOT NULL,
        event_description TEXT,
        event_date TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID
      )
    `)
  console.log('[MIGRATE_EXTRA] Legal services tables created if not exists')

  // Ensure Legal engagement relations
  await query(`
      ALTER TABLE tasks_v2 ADD COLUMN IF NOT EXISTS legal_engagement_id UUID
    `)
  await query(`
      ALTER TABLE finances ADD COLUMN IF NOT EXISTS legal_engagement_id UUID
    `)
  // Add FK constraints separately (column may exist from Drizzle without FK)
  await query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_v2_legal_engagement_id_fkey') THEN
          ALTER TABLE tasks_v2 ADD CONSTRAINT tasks_v2_legal_engagement_id_fkey FOREIGN KEY (legal_engagement_id) REFERENCES legal_engagements(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `)
  await query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finances_legal_engagement_id_fkey') THEN
          ALTER TABLE finances ADD CONSTRAINT finances_legal_engagement_id_fkey FOREIGN KEY (legal_engagement_id) REFERENCES legal_engagements(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `)
  await query(`
      ALTER TABLE finances ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0
    `)
  await query(`
      ALTER TABLE finances ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(12,2) DEFAULT 0
    `)
  await query(`
      ALTER TABLE finances ADD COLUMN IF NOT EXISTS payment_method TEXT
    `)
  await query(`
      ALTER TABLE finances ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'
    `)
  console.log('[MIGRATE_EXTRA] Legal engagement relations ensured for tasks and finances')

  // ═══════════════════════════════════════════════════
  // Office Accounts: payment_schedules, payment_history, client_accounts
  // ═══════════════════════════════════════════════════
  try {
    await query(`
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
          status TEXT DEFAULT 'pending',
          payment_method TEXT,
          voucher_id UUID REFERENCES vouchers(id),
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `)
    await query(`
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
        )
      `)
    await query(`
        CREATE TABLE IF NOT EXISTS client_accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL,
          client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
          total_due NUMERIC(12,2) DEFAULT 0,
          total_paid NUMERIC(12,2) DEFAULT 0,
          balance NUMERIC(12,2) DEFAULT 0,
          overdue_amount NUMERIC(12,2) DEFAULT 0,
          last_payment_date DATE,
          status TEXT DEFAULT 'active',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(company_id, client_id)
        )
      `)
    // Indexes
    await query(
      `CREATE INDEX IF NOT EXISTS idx_payment_schedules_engagement ON payment_schedules(legal_engagement_id)`
    )
    await query(
      `CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON payment_schedules(status)`
    )
    await query(
      `CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date ON payment_schedules(due_date)`
    )
    await query(
      `CREATE INDEX IF NOT EXISTS idx_payment_history_engagement ON payment_history(legal_engagement_id)`
    )
    await query(
      `CREATE INDEX IF NOT EXISTS idx_client_accounts_client ON client_accounts(client_id)`
    )
    await query(`CREATE INDEX IF NOT EXISTS idx_client_accounts_status ON client_accounts(status)`)
    // CHECK constraints for status fields
    await query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_schedules_status_check') THEN
          ALTER TABLE payment_schedules ADD CONSTRAINT payment_schedules_status_check
          CHECK (status IN ('pending','paid','overdue','cancelled'));
        END IF;
      END $$;
    `)
    await query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_accounts_status_check') THEN
          ALTER TABLE client_accounts ADD CONSTRAINT client_accounts_status_check
          CHECK (status IN ('active','settled','overdue'));
        END IF;
      END $$;
    `)
    // New columns on legal_engagements
    await query(
      `ALTER TABLE legal_engagements ADD COLUMN IF NOT EXISTS installment_count INTEGER DEFAULT 1`
    )
    await query(
      `ALTER TABLE legal_engagements ADD COLUMN IF NOT EXISTS installment_frequency TEXT DEFAULT 'none'`
    )
    await query(
      `ALTER TABLE legal_engagements ADD COLUMN IF NOT EXISTS finance_status TEXT DEFAULT 'pending'`
    )
    await query(
      `ALTER TABLE legal_engagements ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0`
    )
    await query(`ALTER TABLE legal_engagements ADD COLUMN IF NOT EXISTS discount_reason TEXT`)
    await query(
      `ALTER TABLE legal_engagements ADD COLUMN IF NOT EXISTS original_compensation NUMERIC(12,2)`
    )
    await query(
      `ALTER TABLE legal_engagements ADD COLUMN IF NOT EXISTS late_fee_rate NUMERIC(5,2) DEFAULT 0`
    )
    await query(
      `ALTER TABLE legal_engagements ADD COLUMN IF NOT EXISTS late_fee_amount NUMERIC(12,2) DEFAULT 0`
    )
    // New columns on finances
    await query(
      `ALTER TABLE finances ADD COLUMN IF NOT EXISTS payment_schedules_count INTEGER DEFAULT 0`
    )
    await query(`ALTER TABLE finances ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'`)
    await query(
      `ALTER TABLE finances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`
    )
    console.log('[MIGRATE_EXTRA] Office accounts tables and columns ensured')
  } catch (err: any) {
    console.warn('[MIGRATE_EXTRA] Office accounts migration warning:', err.message)
  }

  // Fix FK: responsible_lawyer_id should reference employees(id), not users(id)
  await query(`
      ALTER TABLE legal_engagements
      DROP CONSTRAINT IF EXISTS legal_engagements_responsible_lawyer_id_fkey
    `)
  await query(`
      ALTER TABLE legal_engagements
      ADD CONSTRAINT legal_engagements_responsible_lawyer_id_fkey
      FOREIGN KEY (responsible_lawyer_id) REFERENCES employees(id) ON DELETE SET NULL
    `)
  console.log('[MIGRATE_EXTRA] Fixed responsible_lawyer_id FK to reference employees(id)')

  // 4. Seed Statuses
  const statuses = [
    { key: 'pending', ar: 'قيد الانتظار', color: 'orange' },
    { key: 'in_progress', ar: 'قيد العمل', color: 'blue' },
    { key: 'completed', ar: 'منجزة', color: 'green' },
    { key: 'cancelled', ar: 'ملغاة', color: 'red' }
  ]
  for (const s of statuses) {
    await query(
      `INSERT INTO legal_service_statuses (id, status_key, status_name_ar, status_name_en, color)
         SELECT $1, $2, $3, $4, $5
         WHERE NOT EXISTS (SELECT 1 FROM legal_service_statuses WHERE id = $1)`,
      [`status_${s.key}`, s.key, s.ar, s.key, s.color]
    )
  }

  // 5. Seed Priorities
  const priorities = [
    { key: 'low', ar: 'منخفضة', color: 'green' },
    { key: 'medium', ar: 'متوسطة', color: 'blue' },
    { key: 'high', ar: 'مرتفعة', color: 'orange' },
    { key: 'urgent', ar: 'عاجلة', color: 'red' }
  ]
  for (const p of priorities) {
    await query(
      `INSERT INTO legal_service_priorities (id, priority_key, priority_name_ar, priority_name_en, color)
         SELECT $1, $2, $3, $4, $5
         WHERE NOT EXISTS (SELECT 1 FROM legal_service_priorities WHERE id = $1)`,
      [`priority_${p.key}`, p.key, p.ar, p.key, p.color]
    )
  }

  // 6. Seed Categories and Types
  const classificationSeed: Record<string, string[]> = {
    الاستشارات: ['استشارة شفوية', 'استشارة مكتوبة', 'رأي قانوني'],
    التقاضي: [
      'رفع دعوى',
      'الدفاع في دعوى',
      'الاعتراض على حكم',
      'الاستئناف',
      'النقض',
      'التماس إعادة النظر',
      'التنفيذ'
    ],
    العقود: ['إعداد عقد', 'مراجعة عقد', 'تعديل عقد', 'ترجمة عقد', 'توثيق عقد'],
    الشركات: [
      'تأسيس شركة',
      'تعديل عقد تأسيس',
      'تحويل كيان',
      'زيادة رأس المال',
      'تخفيض رأس المال',
      'تصفية شركة',
      'حوكمة'
    ],
    التنفيذ: ['طلب تنفيذ', 'منازعة تنفيذ', 'إيقاف تنفيذ', 'رفع إيقاف', 'متابعة التنفيذ'],
    التوثيق: ['وكالة', 'إقرار', 'مصالحة', 'مخالصة', 'تعهد', 'إنذار', 'محضر اتفاق'],
    'الملكية الفكرية': [
      'تسجيل علامة',
      'اعتراض على علامة',
      'نقل ملكية علامة',
      'ترخيص استخدام',
      'حقوق مؤلف'
    ],
    العقار: ['إفراغ', 'بيع', 'شراء', 'تقسيم', 'فرز', 'نزاعات عقارية', 'مراجعة صكوك'],
    العمل: ['صياغة عقد عمل', 'لائحة تنظيم العمل', 'فصل موظف', 'مطالبات عمالية', 'تسوية عمالية'],
    التجارة: ['وكالة تجارية', 'امتياز تجاري', 'توزيع', 'تحصيل ديون', 'إفلاس', 'إعادة تنظيم مالي'],
    التحكيم: ['اتفاق تحكيم', 'تمثيل في التحكيم', 'تنفيذ حكم تحكيم'],
    الوساطة: ['وساطة', 'تفاوض', 'تسوية', 'صلح'],
    الامتثال: ['سياسات', 'لوائح داخلية', 'مكافحة غسل الأموال', 'حماية البيانات', 'الحوكمة'],
    'الجهات الحكومية': ['استخراج تراخيص', 'الاعتراضات الإدارية', 'التظلمات', 'متابعة الطلبات'],
    'خدمات أخرى': [
      'إنذار عدلي',
      'مذكرة قانونية',
      'خطاب رسمي',
      'دراسة نظامية',
      'بحث قانوني',
      'خدمة أخرى'
    ]
  }

  // Clean up removed types/categories
  await query(`DELETE FROM legal_service_types WHERE name_ar = 'فتوى نظامية'`)
  await query(`DELETE FROM legal_service_categories WHERE name_ar = 'الترجمة القانونية'`)

  for (const [catName, subServices] of Object.entries(classificationSeed)) {
    const catKey = catName
    // Check category
    let catRes = await query('SELECT id FROM legal_service_categories WHERE key = $1', [catKey])
    let catId = catRes.rows[0]?.id
    if (!catId) {
      catId = `cat_${Math.random().toString(36).substring(2, 10)}`
      await query(
        `INSERT INTO legal_service_categories (id, key, name_ar, name_en) VALUES ($1, $2, $3, $4)`,
        [catId, catKey, catName, catKey]
      )
    }

    for (const subName of subServices) {
      const typeKey = `${catKey}_${subName}`
      let typeRes = await query('SELECT id FROM legal_service_types WHERE key = $1', [typeKey])
      if (typeRes.rows.length === 0) {
        const typeId = `type_${Math.random().toString(36).substring(2, 10)}`
        await query(
          `INSERT INTO legal_service_types (id, category_id, key, name_ar, name_en) VALUES ($1, $2, $3, $4, $5)`,
          [typeId, catId, typeKey, subName, typeKey]
        )
      }
    }
  }
  console.log('[MIGRATE_EXTRA] Legal services reference metadata seeded')

  // Inject permissions for existing companies
  const companies = await query('SELECT id FROM companies')
  for (const company of companies.rows) {
    const companyId = company.id
    const newPerms = [
      { key: 'view_legal_services', name: 'عرض الخدمات القانونية', module: 'legal_services' },
      { key: 'create_legal_services', name: 'إضافة خدمة قانونية', module: 'legal_services' },
      { key: 'edit_legal_services', name: 'تعديل خدمة قانونية', module: 'legal_services' },
      { key: 'delete_legal_services', name: 'حذف خدمة قانونية', module: 'legal_services' },
      { key: 'manage_legal_services', name: 'إدارة قائمة الخدمات', module: 'legal_services' },
      {
        key: 'create_legal_engagements',
        name: 'إضافة التعاقدات القانونية',
        module: 'legal_services'
      }
    ]

    for (const p of newPerms) {
      await query(
        `INSERT INTO permissions (company_id, permission_key, permission_name, module_key)
           SELECT $1, $2, $3, $4
           WHERE NOT EXISTS (
             SELECT 1 FROM permissions WHERE company_id = $1 AND permission_key = $2
           )`,
        [companyId, p.key, p.name, p.module]
      )
    }

    // Add to licensed_lawyer
    const roleKey = 'licensed_lawyer'
    for (const pKey of [
      'view_legal_services',
      'create_legal_services',
      'edit_legal_services',
      'delete_legal_services',
      'manage_legal_services',
      'create_legal_engagements'
    ]) {
      await query(
        `INSERT INTO role_permissions (id, company_id, role_key, permission_key)
           SELECT gen_random_uuid(), $1, $2, $3
           WHERE NOT EXISTS (
             SELECT 1 FROM role_permissions WHERE company_id = $1 AND role_key = $2 AND permission_key = $3
           )`,
        [companyId, roleKey, pKey]
      )
    }

    // Add to trainee_lawyer
    await query(
      `INSERT INTO role_permissions (id, company_id, role_key, permission_key)
           SELECT gen_random_uuid(), $1, $2, $3
           WHERE NOT EXISTS (
             SELECT 1 FROM role_permissions WHERE company_id = $1 AND role_key = $2 AND permission_key = $3
           )`,
      [companyId, 'trainee_lawyer', 'view_legal_services']
    )

    // Add to secretary
    for (const pKey of ['view_legal_services', 'create_legal_engagements']) {
      await query(
        `INSERT INTO role_permissions (id, company_id, role_key, permission_key)
           SELECT gen_random_uuid(), $1, $2, $3
           WHERE NOT EXISTS (
             SELECT 1 FROM role_permissions WHERE company_id = $1 AND role_key = $2 AND permission_key = $3
           )`,
        [companyId, 'secretary', pKey]
      )
    }
  }
  console.log('[MIGRATE_EXTRA] Legal services permissions seeded for existing companies')

  // ═══════════════════════════════════════════
  // Office Management: Expenses, Partners, Budget
  // ═══════════════════════════════════════════
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS office_expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
        paid_by TEXT,
        receipt_number TEXT,
        notes TEXT,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await query(`
      CREATE TABLE IF NOT EXISTS partners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        share_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
        role TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await query(`
      CREATE TABLE IF NOT EXISTS partner_contributions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
        engagement_id UUID,
        case_id UUID,
        contribution_type TEXT NOT NULL,
        description TEXT,
        amount NUMERIC(15,2) DEFAULT 0,
        contribution_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await query(`
      CREATE TABLE IF NOT EXISTS office_budgets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        category TEXT NOT NULL,
        budgeted_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        actual_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, month, year, category)
      )
    `)
    await query(`
      CREATE TABLE IF NOT EXISTS profit_distributions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        total_revenue NUMERIC(15,2) NOT NULL DEFAULT 0,
        total_expenses NUMERIC(15,2) NOT NULL DEFAULT 0,
        net_profit NUMERIC(15,2) NOT NULL DEFAULT 0,
        partner_share NUMERIC(15,2) NOT NULL DEFAULT 0,
        distributed BOOLEAN DEFAULT FALSE,
        distributed_date DATE,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, partner_id, month, year)
      )
    `)
    // Indexes
    await query(
      `CREATE INDEX IF NOT EXISTS idx_office_expenses_company ON office_expenses(company_id)`
    )
    await query(
      `CREATE INDEX IF NOT EXISTS idx_office_expenses_date ON office_expenses(expense_date)`
    )
    await query(
      `CREATE INDEX IF NOT EXISTS idx_office_expenses_category ON office_expenses(category)`
    )
    await query(`CREATE INDEX IF NOT EXISTS idx_partners_company ON partners(company_id)`)
    await query(
      `CREATE INDEX IF NOT EXISTS idx_partner_contributions_company ON partner_contributions(company_id)`
    )
    await query(
      `CREATE INDEX IF NOT EXISTS idx_partner_contributions_partner ON partner_contributions(partner_id)`
    )
    await query(
      `CREATE INDEX IF NOT EXISTS idx_office_budgets_company ON office_budgets(company_id)`
    )
    await query(
      `CREATE INDEX IF NOT EXISTS idx_office_budgets_period ON office_budgets(month, year)`
    )
    await query(
      `CREATE INDEX IF NOT EXISTS idx_profit_distributions_company ON profit_distributions(company_id)`
    )
    await query(
      `CREATE INDEX IF NOT EXISTS idx_profit_distributions_period ON profit_distributions(month, year)`
    )
    console.log('[MIGRATE_EXTRA] Office management tables created with FKs and indexes')
  } catch (err: any) {
    console.warn('[MIGRATE_EXTRA] Office management migration warning:', err.message)
  }

  // Fix missing FKs on partner_contributions and profit_distributions (for tables created without FKs in earlier versions)
  try {
    // partner_contributions.partner_id FK
    await query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partner_contributions_partner_id_fkey') THEN
          ALTER TABLE partner_contributions ADD CONSTRAINT partner_contributions_partner_id_fkey
          FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `)
    // profit_distributions.partner_id FK
    await query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profit_distributions_partner_id_fkey') THEN
          ALTER TABLE profit_distributions ADD CONSTRAINT profit_distributions_partner_id_fkey
          FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `)
    // partners.employee_id FK
    await query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partners_employee_id_fkey') THEN
          ALTER TABLE partners ADD CONSTRAINT partners_employee_id_fkey
          FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `)
    // Add missing indexes if they don't exist
    await query(
      `CREATE INDEX IF NOT EXISTS idx_office_expenses_category ON office_expenses(category)`
    )
    await query(
      `CREATE INDEX IF NOT EXISTS idx_partner_contributions_partner ON partner_contributions(partner_id)`
    )
    await query(
      `CREATE INDEX IF NOT EXISTS idx_office_budgets_period ON office_budgets(month, year)`
    )
    await query(
      `CREATE INDEX IF NOT EXISTS idx_profit_distributions_period ON profit_distributions(month, year)`
    )
    console.log('[MIGRATE_EXTRA] Office management FKs and indexes ensured')
  } catch (err: any) {
    console.warn('[MIGRATE_EXTRA] Office management FK fix warning:', err.message)
  }

  // OpenConnector & External Office Integrations Table
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS office_integrations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        service_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'disconnected',
        config_data JSONB DEFAULT '{}'::jsonb,
        last_sync_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, service_name)
      );
    `)
    await query(
      `CREATE INDEX IF NOT EXISTS idx_office_integrations_company ON office_integrations(company_id)`
    )
    console.log('[MIGRATE_EXTRA] office_integrations table ensured')
  } catch (err: any) {
    console.warn('[MIGRATE_EXTRA] office_integrations table warning:', err.message)
  }
}
