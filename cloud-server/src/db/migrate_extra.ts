import { query } from './connection'
import fs from 'fs'
import path from 'path'
import { CANONICAL_CONTRACT_REGISTRY } from '../shared/canonicalContract'

export async function runExtraMigrations() {
  console.log('[MIGRATE_EXTRA] Running extra migrations...')

  const parityMigration = path.join(__dirname, 'migrations', '0009_portable_entity_parity.sql')
  if (!fs.existsSync(parityMigration)) throw new Error('PORTABLE_ENTITY_PARITY_MIGRATION_MISSING')
  await query(fs.readFileSync(parityMigration, 'utf8'))
  console.log('[MIGRATE_EXTRA] Portable Web/Windows entity parity tables ensured')

  // Keep legacy databases compatible with the canonical tenant contract.
  // Fresh databases receive this column from schema.sql; this reconciliation is
  // deliberately additive so an existing Docker volume is never rebuilt.
  try {
    await query(`ALTER TABLE agencies ADD COLUMN IF NOT EXISTS court TEXT`)
    await query(`ALTER TABLE agencies ADD COLUMN IF NOT EXISTS created_by UUID`)
    await query(`ALTER TABLE agencies ADD COLUMN IF NOT EXISTS updated_by UUID`)
    console.log('[MIGRATE_EXTRA] agencies canonical columns ensured')
  } catch (err: any) {
    console.warn('[MIGRATE_EXTRA] agencies.court reconciliation warning:', err.message)
  }

  // Ensure memoranda canonical columns for tenant backup & restore
  try {
    await query(`ALTER TABLE memoranda ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE`)
    console.log('[MIGRATE_EXTRA] memoranda canonical columns ensured')
  } catch (err: any) {
    console.warn('[MIGRATE_EXTRA] memoranda reconciliation warning:', err.message)
  }

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

  // The tracking DDL originally shipped outside Drizzle's journal. Execute it
  // idempotently here so both fresh and legacy databases expose the same audit
  // contract and indexes.
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS user_login_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        login_time TIMESTAMPTZ DEFAULT NOW(), logout_time TIMESTAMPTZ,
        ip_address TEXT, user_agent TEXT, device_info TEXT, browser_info TEXT,
        is_successful BOOLEAN DEFAULT TRUE, failure_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await query(`
      CREATE TABLE IF NOT EXISTS user_activity_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        activity_type TEXT NOT NULL, activity_description TEXT,
        entity_type TEXT, entity_id UUID, ip_address TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await query(`CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON user_login_logs(user_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_login_logs_company_id ON user_login_logs(company_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON user_login_logs(created_at DESC)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_user_activity_logs_company_id ON user_activity_logs(company_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at DESC)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_user_activity_logs_type ON user_activity_logs(activity_type)`)
    console.log('[MIGRATE_EXTRA] User login/activity audit tables ensured')
  } catch (err: any) {
    console.warn('[MIGRATE_EXTRA] User tracking reconciliation warning:', err.message)
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

  // Ensure recovery_email is properly configured and owner email is set to slaehmap@gmail.com
  try {
    // Drop old global unique index if present to avoid cross-tenant/test collision
    await query(`DROP INDEX IF EXISTS idx_users_recovery_email`)

    // Create unique index per company
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_company_recovery_email 
      ON users (company_id, LOWER(recovery_email)) WHERE recovery_email IS NOT NULL
    `)

    // Ensure super admin / owner user has recovery email set to slaehmap@gmail.com
    await query(`
      UPDATE users 
      SET recovery_email = 'slaehmap@gmail.com',
          security_question = COALESCE(NULLIF(security_question, ''), 'ماهو رقم جوالك الثاني')
      WHERE username = 'admin' AND (
        recovery_email IS NULL 
        OR recovery_email LIKE '%@b2blaw.local' 
        OR recovery_email = 'admin@b2blaw.local' 
        OR recovery_email = 'dev@b2blaw.local'
        OR recovery_email != 'slaehmap@gmail.com'
      )
    `)
    console.log('[MIGRATE_EXTRA] Admin recovery email configured to slaehmap@gmail.com')
  } catch (err: any) {
    console.warn('[MIGRATE_EXTRA] recovery_email migration warning:', err.message)
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
        event_type TEXT,
        event_title TEXT NOT NULL,
        event_description TEXT,
        actor TEXT,
        event_date TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
  // Reconcile deployments which created the first legal-services draft before
  // the portable Web/Windows contract was finalized. Legacy columns are kept.
  await query(`ALTER TABLE litigation_service_details ADD COLUMN IF NOT EXISTS court_level TEXT`)
  await query(`ALTER TABLE litigation_service_details ADD COLUMN IF NOT EXISTS opponent_details TEXT`)
  await query(`ALTER TABLE contract_service_details ADD COLUMN IF NOT EXISTS contract_scope TEXT`)
  await query(`ALTER TABLE contract_service_details ADD COLUMN IF NOT EXISTS drafting_language TEXT`)
  await query(`ALTER TABLE legal_service_timeline ADD COLUMN IF NOT EXISTS event_type TEXT`)
  await query(`ALTER TABLE legal_service_timeline ADD COLUMN IF NOT EXISTS actor TEXT`)
  await query(`ALTER TABLE legal_service_timeline ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`)
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
  await query(`ALTER TABLE finances ADD COLUMN IF NOT EXISTS finance_status TEXT`)
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
    const catRes = await query('SELECT id FROM legal_service_categories WHERE key = $1', [catKey])
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
      const typeRes = await query('SELECT id FROM legal_service_types WHERE key = $1', [typeKey])
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

  // Google Calendar Event ID column for sessions table
  try {
    await query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS google_event_id TEXT
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_google_event ON sessions(google_event_id) WHERE google_event_id IS NOT NULL
    `)
    console.log('[MIGRATE_EXTRA] sessions google_event_id column ensured')
  } catch (err: any) {
    console.warn('[MIGRATE_EXTRA] sessions google_event_id migration warning:', err.message)
  }

  // Repair and enforce links between legal services and the finance ledger.
  try {
    await query(`UPDATE invoices SET vat_rate = vat_rate / 100 WHERE vat_rate > 1`)
    await query(`
      UPDATE legal_engagements
      SET remaining_amount = GREATEST(
            COALESCE(financial_compensation, 0) + COALESCE(tax, 0) +
            COALESCE(late_fee_amount, 0) - COALESCE(paid_amount, 0), 0
          ),
          finance_status = CASE
            WHEN COALESCE(paid_amount, 0) >= COALESCE(financial_compensation, 0) + COALESCE(tax, 0) + COALESCE(late_fee_amount, 0) THEN 'paid'
            WHEN COALESCE(paid_amount, 0) > 0 THEN 'partial'
            ELSE 'pending'
          END
      WHERE deleted_at IS NULL AND finance_status <> 'closed'
    `)
    await query(`
      INSERT INTO finances (
        company_id, type, category, amount, vat_amount, total, description, date,
        legal_engagement_id, client_id, case_id, status, payment_method,
        paid_amount, remaining_amount, created_by, updated_by
      )
      SELECT e.company_id, 'receivable', 'legal_service', COALESCE(e.financial_compensation, 0),
        COALESCE(e.tax, 0), COALESCE(e.financial_compensation, 0) + COALESCE(e.tax, 0),
        'خدمة قانونية رقم ' || e.engagement_number, COALESCE(e.start_date, CURRENT_DATE),
        e.id, e.client_id, e.case_id, e.finance_status, e.payment_method,
        COALESCE(e.paid_amount, 0), COALESCE(e.remaining_amount, 0), e.created_by, e.updated_by
      FROM legal_engagements e
      WHERE e.deleted_at IS NULL AND NOT EXISTS (
        SELECT 1 FROM finances f WHERE f.company_id = e.company_id AND f.legal_engagement_id = e.id
      )
    `)
    await query(`
      UPDATE finances f SET
        amount = COALESCE(e.financial_compensation, 0), vat_amount = COALESCE(e.tax, 0),
        total = COALESCE(e.financial_compensation, 0) + COALESCE(e.tax, 0),
        paid_amount = COALESCE(e.paid_amount, 0), remaining_amount = COALESCE(e.remaining_amount, 0),
        status = e.finance_status, client_id = e.client_id, case_id = e.case_id, updated_at = NOW()
      FROM legal_engagements e
      WHERE f.company_id = e.company_id AND f.legal_engagement_id = e.id
    `)
    await query(`
      INSERT INTO client_accounts (
        company_id, client_id, total_due, total_paid, balance, overdue_amount,
        last_payment_date, status
      )
      SELECT e.company_id, e.client_id,
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
        total_due = EXCLUDED.total_due, total_paid = EXCLUDED.total_paid,
        balance = EXCLUDED.balance, overdue_amount = EXCLUDED.overdue_amount,
        last_payment_date = EXCLUDED.last_payment_date, status = EXCLUDED.status, updated_at = NOW()
    `)
    await query(`
      INSERT INTO permissions (company_id, permission_key, permission_name, module_key)
      SELECT c.id, p.permission_key, p.permission_name, 'finances'
      FROM companies c
      CROSS JOIN (VALUES
        ('delete_finances', 'حذف مالية'),
        ('manage_office', 'إدارة المكتب')
      ) AS p(permission_key, permission_name)
      WHERE NOT EXISTS (
        SELECT 1 FROM permissions existing
        WHERE existing.company_id = c.id AND existing.permission_key = p.permission_key
      )
    `)
    await query(`
      INSERT INTO role_permissions (id, company_id, role_key, permission_key)
      SELECT gen_random_uuid(), c.id, 'licensed_lawyer', p.permission_key
      FROM companies c
      CROSS JOIN (VALUES ('delete_finances'), ('manage_office')) AS p(permission_key)
      WHERE NOT EXISTS (
        SELECT 1 FROM role_permissions existing
        WHERE existing.company_id = c.id AND existing.role_key = 'licensed_lawyer'
          AND existing.permission_key = p.permission_key
      )
    `)
    await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_finances_company_engagement_unique
      ON finances(company_id, legal_engagement_id) WHERE legal_engagement_id IS NOT NULL`)
    await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_receivables_company_invoice_unique
      ON receivables(company_id, invoice_id) WHERE invoice_id IS NOT NULL`)
    console.log('[MIGRATE_EXTRA] Financial integrity links repaired and indexed')
  } catch (err: any) {
    console.warn('[MIGRATE_EXTRA] Financial integrity repair warning:', err.message)
  }

  await ensureCanonicalUniqueConstraints()
}

async function ensureCanonicalUniqueConstraints() {
  console.log('[MIGRATE_EXTRA] Ensuring canonical unique constraints for all entities...')
  try {
    const tablesRes = await query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `)
    const existingTables = new Set(tablesRes.rows.map((r: any) => r.tablename))

    const indexRes = await query(`
      SELECT
        c.relname AS table_name,
        i.relname AS index_name,
        ix.indisunique AS is_unique,
        pg_get_expr(ix.indpred, ix.indrelid) AS predicate,
        array_to_string(array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)), ', ') AS columns
      FROM pg_index ix
      JOIN pg_class c ON c.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(ix.indkey)
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND ix.indisunique = true
      GROUP BY c.relname, i.relname, ix.indisunique, ix.indpred, ix.indrelid
    `)

    const uniqueMap = new Map<string, string>()
    for (const row of indexRes.rows) {
      if (row.predicate) continue // skip partial indexes
      const key = `${row.table_name}:${row.columns}`
      uniqueMap.set(key, row.index_name)
    }

    for (const [entityName, contract] of Object.entries(CANONICAL_CONTRACT_REGISTRY)) {
      if (!contract.pgBinding) continue
      const tableName = contract.pgBinding.tableName
      if (!existingTables.has(tableName)) continue

      const pks = contract.pgBinding.primaryKey
      const pkStr = pks.join(', ')

      if (uniqueMap.has(`${tableName}:${pkStr}`)) continue

      const colsQuoted = pks.map((c) => `"${c}"`).join(', ')
      const indexName = `idx_uq_canon_${tableName}_${pks.join('_')}`.slice(0, 63)
      try {
        await query(`CREATE UNIQUE INDEX IF NOT EXISTS "${indexName}" ON "${tableName}" (${colsQuoted})`)
        console.log(`[MIGRATE_EXTRA] Created unique index "${indexName}" on "${tableName}" (${colsQuoted}) for entity ${entityName}`)
        uniqueMap.set(`${tableName}:${pkStr}`, indexName)
      } catch (err: any) {
        console.warn(`[MIGRATE_EXTRA] Failed to create unique index for ${tableName} (${colsQuoted}):`, err.message)
      }
    }
    console.log('[MIGRATE_EXTRA] Canonical unique constraints check completed')
  } catch (err: any) {
    console.warn('[MIGRATE_EXTRA] Canonical unique constraints check error:', err.message)
  }
}

