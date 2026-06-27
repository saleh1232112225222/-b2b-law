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
        responsible_lawyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
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
      ALTER TABLE tasks_v2 ADD COLUMN IF NOT EXISTS legal_engagement_id UUID REFERENCES legal_engagements(id) ON DELETE SET NULL
    `)
    await query(`
      ALTER TABLE finances ADD COLUMN IF NOT EXISTS legal_engagement_id UUID REFERENCES legal_engagements(id) ON DELETE SET NULL
    `)
    console.log('[MIGRATE_EXTRA] Legal engagement relations ensured for tasks and finances')

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
      'الاستشارات': ['استشارة شفوية', 'استشارة مكتوبة', 'رأي قانوني'],
      'التقاضي': ['رفع دعوى', 'الدفاع في دعوى', 'الاعتراض على حكم', 'الاستئناف', 'النقض', 'التماس إعادة النظر', 'التنفيذ'],
      'العقود': ['إعداد عقد', 'مراجعة عقد', 'تعديل عقد', 'ترجمة عقد', 'توثيق عقد'],
      'الشركات': ['تأسيس شركة', 'تعديل عقد تأسيس', 'تحويل كيان', 'زيادة رأس المال', 'تخفيض رأس المال', 'تصفية شركة', 'حوكمة'],
      'التنفيذ': ['طلب تنفيذ', 'منازعة تنفيذ', 'إيقاف تنفيذ', 'رفع إيقاف', 'متابعة التنفيذ'],
      'التوثيق': ['وكالة', 'إقرار', 'مصالحة', 'مخالصة', 'تعهد', 'إنذار', 'محضر اتفاق'],
      'الملكية الفكرية': ['تسجيل علامة', 'اعتراض على علامة', 'نقل ملكية علامة', 'ترخيص استخدام', 'حقوق مؤلف'],
      'العقار': ['إفراغ', 'بيع', 'شراء', 'تقسيم', 'فرز', 'نزاعات عقارية', 'مراجعة صكوك'],
      'العمل': ['صياغة عقد عمل', 'لائحة تنظيم العمل', 'فصل موظف', 'مطالبات عمالية', 'تسوية عمالية'],
      'التجارة': ['وكالة تجارية', 'امتياز تجاري', 'توزيع', 'تحصيل ديون', 'إفلاس', 'إعادة تنظيم مالي'],
      'التحكيم': ['اتفاق تحكيم', 'تمثيل في التحكيم', 'تنفيذ حكم تحكيم'],
      'الوساطة': ['وساطة', 'تفاوض', 'تسوية', 'صلح'],
      'الامتثال': ['سياسات', 'لوائح داخلية', 'مكافحة غسل الأموال', 'حماية البيانات', 'الحوكمة'],
      'الجهات الحكومية': ['استخراج تراخيص', 'الاعتراضات الإدارية', 'التظلمات', 'متابعة الطلبات'],
      'الترجمة القانونية': ['ترجمة العقود', 'ترجمة الأحكام', 'ترجمة المذكرات'],
      'خدمات أخرى': ['إنذار عدلي', 'مذكرة قانونية', 'خطاب رسمي', 'دراسة نظامية', 'بحث قانوني', 'خدمة أخرى']
    }

    // Clean up removed types
    await query(`DELETE FROM legal_service_types WHERE name_ar = 'فتوى نظامية'`)

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
        { key: 'manage_legal_services', name: 'إدارة قائمة الخدمات', module: 'legal_services' },
        { key: 'create_legal_engagements', name: 'إضافة التعاقدات القانونية', module: 'legal_services' }
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
      for (const pKey of ['view_legal_services', 'manage_legal_services', 'create_legal_engagements']) {
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

}
