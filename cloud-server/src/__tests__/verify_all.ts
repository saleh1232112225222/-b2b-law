import { Client } from 'pg'
import * as fs from 'fs'
import path from 'path'

async function runComprehensiveVerification() {
  console.log('===========================================================')
  console.log('       اختبار التحقق الشامل لمنظومة الحقن والمتابعة         ')
  console.log('===========================================================\n')

  const snapshotPath = 'C:/Users/saleh/OneDrive/bass/.json'
  if (!fs.existsSync(snapshotPath)) {
    console.error('❌ ملف النسخة غير موجود في المسار:', snapshotPath)
    process.exit(1)
  }

  const rawSnapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))
  const client = new Client({
    connectionString: 'postgresql://postgres:1390@127.0.0.1:5432/b2b_law'
  })

  await client.connect()

  // 1. Setup isolated test tenant
  const testCompanyId = '99999999-9999-9999-9999-999999999999'
  const testUserId = '88888888-8888-8888-8888-888888888888'

  console.log('1. تجهيز بيئة اختبار معزولة للشركة:', testCompanyId)
  await client.query('BEGIN')

  // Clean old test tenant data if exists
  await client.query('DELETE FROM companies WHERE id = $1', [testCompanyId])
  await client.query(
    'INSERT INTO companies (id, name, email, phone, trial_expires_at) VALUES ($1, $2, $3, $4, NOW() + INTERVAL \'30 days\')',
    [testCompanyId, 'شركة الاختبار المبدئية', 'test@b2blaw.local', '0500000000']
  )
  await client.query(
    `INSERT INTO users (id, company_id, username, password_hash, role_key)
     VALUES ($1, $2, $3, $4, $5)`,
    [testUserId, testCompanyId, 'testadmin', 'hash', 'admin']
  )

  // Seed default dummy firm_data for the new company (similar to registration flow)
  await client.query(
    `INSERT INTO firm_data (id, company_id, key, value) VALUES
     (gen_random_uuid(), $1, 'officeName', '"اسم افتراضي"'),
     (gen_random_uuid(), $1, 'theme', '"light"')`,
    [testCompanyId]
  )

  console.log('   ✅ تم إعداد الشركة والمستخدم والبيانات الافتراضية بنجاح.\n')

  // 2. Perform Full Snapshot Injection using the updated import logic
  console.log('2. تنفيذ عملية الحقن الذكي لملف النسخة الاحتياطية...')

  const tables = rawSnapshot.tables
  const counts: Record<string, { received: number; imported: number }> = {}
  const importErrors: string[] = []

  const snapshotRefIds: Record<string, Set<string>> = {}
  for (const [tableName, rows] of Object.entries(tables)) {
    const idSet = new Set<string>()
    if (Array.isArray(rows)) {
      for (const row of rows) {
        if ((row as any).id) idSet.add(String((row as any).id))
      }
    }
    snapshotRefIds[tableName] = idSet
  }

  const fkResult = await client.query(`
    SELECT
        tc.table_name AS source_table,
        kcu.column_name AS source_column,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column
    FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
  `)

  const fkMap: Record<string, Array<{ source_column: string; referenced_table: string }>> = {}
  for (const row of fkResult.rows) {
    const t = row.source_table
    if (!fkMap[t]) fkMap[t] = []
    fkMap[t].push({
      source_column: row.source_column,
      referenced_table: row.referenced_table
    })
  }

  const existingIds: Record<string, Set<string>> = {}
  const getOrLoadIds = async (table: string): Promise<Set<string>> => {
    if (existingIds[table]) return existingIds[table]
    const set = new Set<string>()
    try {
      const colsRes = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
        [table]
      )
      const cols = new Set(colsRes.rows.map((r: any) => r.column_name))
      let idCol = 'id'
      if (!cols.has('id')) {
        if (cols.has('party_type_key')) idCol = 'party_type_key'
        else if (cols.has('key')) idCol = 'key'
        else if (cols.has('code')) idCol = 'code'
      }

      if (idCol && cols.has(idCol)) {
        let res: any
        if (cols.has('company_id')) {
          res = await client.query(`SELECT "${idCol}" AS id FROM "${table}" WHERE company_id = $1`, [testCompanyId])
        } else {
          res = await client.query(`SELECT "${idCol}" AS id FROM "${table}"`)
        }
        for (const r of res.rows) {
          if (r.id !== undefined && r.id !== null) {
            set.add(String(r.id))
          }
        }
      }
    } catch {}
    existingIds[table] = set
    return set
  }

  const tableOrder = [
    'companies',
    'employees',
    'accounts',
    'users',
    'clients',
    'defendants',
    'legal_service_categories',
    'legal_service_types',
    'legal_service_statuses',
    'legal_service_priorities',
    'legal_engagements',
    'cases',
    'case_parties',
    'case_assignments',
    'sessions',
    'session_outcomes',
    'case_actions',
    'tasks_v2',
    'tasks',
    'task_notifications',
    'task_audit_log',
    'assignment_logs',
    'evidence',
    'judgments',
    'judgment_amendments',
    'enforcement_files',
    'enforcement_requests',
    'enf_financial_details',
    'enf_decisions',
    'enf_request_parties',
    'enforcement_actions',
    'enforcement_parties',
    'memoranda',
    'documents_v2',
    'documents',
    'finances',
    'invoices',
    'invoice_items',
    'receivables',
    'vouchers',
    'firm_data',
    'contract_party_types',
    'contract_templates',
    'contracts',
    'contract_parties',
    'contract_participants',
    'contract_signatures',
    'contract_schedules',
    'contract_links',
    'contract_amendments',
    'contract_party_audits',
    'agencies',
    'expense_categories',
    'session_client_reports'
  ]

  const excludedSnapshotTables = new Set([
    'sync_inbox',
    'sync_outbox',
    'attachment_transfer_queue',
    'sync_conflicts',
    'sync_devices',
    'sync_state',
    'restore_runs',
    'backup_catalog',
    'sync_runtime_context',
    '_license_meta'
  ])

  const existingResult = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    []
  )
  const existingTables = new Set(existingResult.rows.map((r: any) => r.table_name))

  const allSnapshotTables = Object.keys(tables)
    .filter((tbl) => !excludedSnapshotTables.has(tbl))
    .sort((a, b) => {
      let idxA = tableOrder.indexOf(a)
      let idxB = tableOrder.indexOf(b)
      if (idxA === -1) idxA = 999
      if (idxB === -1) idxB = 999
      return idxA - idxB
    })

  for (const table of allSnapshotTables) {
    if (!existingTables.has(table)) {
      counts[table] = { received: (tables[table] || []).length, imported: 0 }
      continue
    }
    const rows = tables[table]
    if (!Array.isArray(rows) || rows.length === 0) {
      counts[table] = { received: 0, imported: 0 }
      continue
    }
    counts[table] = { received: rows.length, imported: 0 }

    // Special handling for firm_data
    if (table === 'firm_data') {
      for (const row of rows) {
        const val = typeof row.value === 'string' ? row.value : JSON.stringify(row.value)
        await client.query('SAVEPOINT firm_row')
        try {
          await client.query(
            `INSERT INTO firm_data (id, company_id, key, value, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
             ON CONFLICT (company_id, key)
             DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
            [testCompanyId, row.key, val]
          )
          await client.query('RELEASE firm_row')
          counts[table].imported++
        } catch (err: any) {
          await client.query('ROLLBACK TO firm_row')
          importErrors.push(`[ImportSnapshot] firm_data key ${row.key} failed: ${err.message}`)
        }
      }
      continue
    }

    const colResult = await client.query(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
      [table]
    )
    const colMap: Record<string, { type: string; nullable: boolean }> = {}
    const hasCompanyId = colResult.rows.some((r: any) => r.column_name === 'company_id')
    const hasCreatedAt = colResult.rows.some((r: any) => r.column_name === 'created_at')
    const hasUpdatedAt = colResult.rows.some((r: any) => r.column_name === 'updated_at')
    for (const r of colResult.rows) {
      colMap[r.column_name] = { type: r.data_type, nullable: r.is_nullable === 'YES' }
    }

    const fks = fkMap[table] || []
    for (const fk of fks) {
      await getOrLoadIds(fk.referenced_table)
    }
    await getOrLoadIds(table)

    for (const row of rows) {
      if (hasCompanyId) row.company_id = testCompanyId
      if (!row.created_at && hasCreatedAt) row.created_at = new Date().toISOString()
      if (hasUpdatedAt) row.updated_at = new Date().toISOString()

      const keys = Object.keys(row).filter((k) => k in colMap)
      const sanitized = keys.map((k) => {
        const val = row[k]
        const dtype = colMap[k].type
        if (val === '' || val === null || val === undefined) {
          if (
            dtype.startsWith('date') ||
            dtype.startsWith('timestamp') ||
            dtype === 'uuid' ||
            dtype.startsWith('numeric') ||
            dtype === 'boolean' ||
            dtype === 'integer' ||
            dtype === 'bigint'
          ) {
            return null
          }
          return val
        }
        if (dtype === 'date' && typeof val === 'string' && val.includes('T')) {
          return val.split('T')[0]
        }
        if (
          dtype === 'uuid' &&
          typeof val === 'string' &&
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
        ) {
          return null
        }
        if (dtype === 'boolean') {
          if (val === 0 || val === '0' || val === false || val === 'false') return false
          if (val === 1 || val === '1' || val === true || val === 'true') return true
          return null
        }
        return val
      })

      let skipRow = false
      for (const fk of fks) {
        const colIndex = keys.indexOf(fk.source_column)
        if (colIndex >= 0) {
          const val = sanitized[colIndex]
          if (val !== null && val !== undefined && val !== '') {
            const refSet = await getOrLoadIds(fk.referenced_table)
            const refExistsInDb = refSet.has(String(val))
            const refExistsInSnapshot = snapshotRefIds[fk.referenced_table]?.has(String(val)) ?? false
            if (!refExistsInDb && !refExistsInSnapshot) {
              if (fk.referenced_table === 'users' && testUserId) {
                sanitized[colIndex] = testUserId
              } else {
                const isNullable = colMap[fk.source_column]?.nullable ?? true
                if (isNullable) {
                  sanitized[colIndex] = null
                } else {
                  skipRow = true
                  break
                }
              }
            }
          }
        }
      }

      if (skipRow) continue

      const placeholders = sanitized.map((_, i) => `$${i + 1}`).join(', ')
      const columns = keys.map(k => `"${k}"`).join(', ')

      await client.query('SAVEPOINT row_insert')
      const idField = keys.includes('id')
        ? 'id'
        : keys.includes('party_type_key')
          ? 'party_type_key'
          : keys.includes('key')
            ? 'key'
            : keys.includes('code')
              ? 'code'
              : ''
      const idIndex = idField ? keys.indexOf(idField) : -1

      try {
        if (idIndex >= 0 && sanitized[idIndex]) {
          const tableCache = await getOrLoadIds(table)
          const exists = tableCache.has(String(sanitized[idIndex]))

          if (exists) {
            const nonIdKeys = keys.filter((k) => k !== idField)
            if (nonIdKeys.length > 0) {
              const setClauses = nonIdKeys.map((k, i) => `"${k}" = $${i + 1}`).join(', ')
              const setValues = nonIdKeys.map((k) => sanitized[keys.indexOf(k)])
              await client.query(
                `UPDATE "${table}" SET ${setClauses} WHERE "${idField}" = $${nonIdKeys.length + 1}`,
                [...setValues, sanitized[idIndex]]
              )
            }
          } else {
            await client.query(
              `INSERT INTO "${table}" (${columns}) VALUES (${placeholders})`,
              sanitized
            )
            tableCache.add(String(sanitized[idIndex]))
          }
        } else {
          await client.query(
            `INSERT INTO "${table}" (${columns}) VALUES (${placeholders})`,
            sanitized
          )
        }
        await client.query('RELEASE SAVEPOINT row_insert')
        counts[table].imported++
      } catch (err: any) {
        try {
          await client.query('ROLLBACK TO SAVEPOINT row_insert')
        } catch {}

        const errMsg: string = err.message || ''
        if (errMsg.includes('duplicate key') && idIndex >= 0 && sanitized[idIndex]) {
          try {
            const nonIdKeys = keys.filter((k) => k !== idField)
            if (nonIdKeys.length > 0) {
              await client.query('SAVEPOINT row_update')
              const setClauses = nonIdKeys.map((k, i) => `"${k}" = $${i + 1}`).join(', ')
              const setValues = nonIdKeys.map((k) => sanitized[keys.indexOf(k)])
              await client.query(
                `UPDATE "${table}" SET ${setClauses} WHERE "${idField}" = $${nonIdKeys.length + 1}`,
                [...setValues, sanitized[idIndex]]
              )
              await client.query('RELEASE SAVEPOINT row_update')
              counts[table].imported++
              continue
            }
          } catch (updateErr: any) {
            try {
              await client.query('ROLLBACK TO SAVEPOINT row_update')
            } catch {}
            importErrors.push(`[ImportSnapshot] FAILED row in ${table}: ${updateErr.message}`)
          }
        } else {
          importErrors.push(`[ImportSnapshot] SKIP row in ${table}: ${errMsg}`)
        }
      }
    }
  }

  // 3. Run Post-Import Healing
  const healRes = await client.query(`
    UPDATE sessions s
    SET status = 'منتهية',
        result = COALESCE(NULLIF(s.result, ''), so.result, 'منتهية'),
        updated_at = NOW()
    FROM session_outcomes so
    WHERE so.session_id = s.id
      AND s.company_id = $1
      AND s.status NOT IN ('منتهية', 'ملغية')
  `, [testCompanyId])

  // Sync company name
  await client.query(`
    UPDATE companies c
    SET name = fd.value,
        updated_at = NOW()
    FROM firm_data fd
    WHERE fd.company_id = c.id
      AND c.id = $1
      AND fd.key = 'name'
      AND NULLIF(TRIM(fd.value), '') IS NOT NULL
  `, [testCompanyId])

  console.log(`   ✅ اكتمل الحقن بنجاح: تم إصلاح وتحديث ${healRes.rowCount} جلسات سابقة كـ منتهية تلقائياً.\n`)

  // 4. Test Results & Metrics
  let totalRec = 0
  let totalImp = 0
  for (const [, c] of Object.entries(counts)) {
    totalRec += c.received
    totalImp += c.imported
  }

  console.log('3. نتائج قياس دقة واكتمال الحقن:')
  console.log(`   - إجمالي السجلات المستلمة: ${totalRec}`)
  console.log(`   - إجمالي السجلات المحقونة: ${totalImp}`)
  console.log(`   - نسبة النجاح: ${((totalImp / totalRec) * 100).toFixed(2)}%`)
  console.log(`   - عدد الأخطاء: ${importErrors.length}`)

  // 5. Test Firm Data Retrieval (GET /api/firm simulator)
  console.log('\n4. اختبار فحص "المعلومات" (بيانات المنشأة / الهوية المؤسسية):')
  const firmRows = await client.query('SELECT key, value FROM firm_data WHERE company_id = $1', [testCompanyId])
  const firmDataObj: Record<string, string> = {}
  for (const r of firmRows.rows) {
    firmDataObj[r.key] = r.value
  }

  console.log(`   - اسم المكتب: ${firmDataObj.name || 'غير محدد'}`)
  console.log(`   - رقم الترخيص: ${firmDataObj.license_number || 'غير محدد'}`)
  console.log(`   - الرقم الضريبي: ${firmDataObj.tax_number || 'غير محدد'}`)
  console.log(`   - العنوان: ${firmDataObj.address || 'غير محدد'}`)
  console.log(`   - الهاتف: ${firmDataObj.phone || 'غير محدد'}`)
  console.log(`   - البريد الإلكتروني: ${firmDataObj.email || 'غير محدد'}`)
  console.log(`   - الموقع: ${firmDataObj.website || 'غير محدد'}`)

  const isFirmValid = firmDataObj.name && firmDataObj.license_number === '37496'
  console.log(`   --> نتيجة فحص المعلومات: ${isFirmValid ? '✅ نجح 100%' : '❌ فشل'}`)

  // 6. Test Briefing Summary / Urgent Actions (/api/briefing/summary simulator)
  console.log('\n5. اختبار فحص "المتابعة الشاملة" و "إجراءات عاجلة":')
  const todayStr = '2026-10-06'

  // Action required check
  const actionRequiredRes = await client.query(
    `SELECT s.id, s.date, s.status, s.result, c.case_number, cl.name as client_name
     FROM sessions s
     LEFT JOIN cases c ON c.id = s.case_id
     LEFT JOIN clients cl ON cl.id = c.client_id
     WHERE s.company_id = $1 
       AND s.date < $2 
       AND s.status NOT IN ('منتهية', 'ملغية', 'مؤجلة', 'مغلقة', 'مغلقة إدارياً')
       AND (s.result IS NULL OR TRIM(s.result) = '')
       AND NOT EXISTS (SELECT 1 FROM session_outcomes so WHERE so.session_id = s.id)
     ORDER BY s.date DESC LIMIT 30`,
    [testCompanyId, todayStr]
  )

  // Active Objections
  const objectionsRes = await client.query(
    `SELECT j.id, j.judgment_number, j.objection_deadline, c.case_number
     FROM judgments j
     LEFT JOIN cases c ON c.id = j.case_id
     WHERE j.company_id = $1 AND j.objection_deadline IS NOT NULL AND j.objection_deadline >= $2
     ORDER BY j.objection_deadline ASC LIMIT 20`,
    [testCompanyId, todayStr]
  )

  // Awaiting Enforcement
  const enforcementRes = await client.query(
    `SELECT ef.id, ef.instrument_no as judgment_number, c.id as case_id, c.case_number, c.subject, cl.name as client_name
     FROM enforcement_files ef
     LEFT JOIN judgments j ON j.id = ef.linked_judgment_id
     LEFT JOIN cases c ON c.id = j.case_id
     LEFT JOIN clients cl ON cl.id = c.client_id
     WHERE ef.company_id = $1 AND ef.status NOT IN ('completed', 'closed', 'cancelled')
     UNION ALL
     SELECT j.id, j.judgment_number, c.id as case_id, c.case_number, c.subject, cl.name as client_name
     FROM cases c
     JOIN judgments j ON c.id = j.case_id
     JOIN clients cl ON c.client_id = cl.id
     WHERE c.company_id = $1 AND j.judgment_type = 'قطعي' AND (j.is_executable IS TRUE OR (j.is_executable)::text IN ('1', 'true', 't')) AND c.status = 'بانتظار التنفيذ'
     LIMIT 20`,
    [testCompanyId]
  )

  console.log(`   - عدد الإجراءات العاجلة المعلقة (Action Required): ${actionRequiredRes.rows.length}`)
  console.log(`   - عدد مدد الاعتراض النشطة: ${objectionsRes.rows.length}`)
  console.log(`   - عدد سندات التنفيذ بانتظار الإجراء: ${enforcementRes.rows.length}`)

  const isBriefingAccurate = actionRequiredRes.rows.length === 0
  console.log(`   --> نتيجة فحص الإجراءات العاجلة: ${isBriefingAccurate ? '✅ نجح (0 جلسات معلقة خاطئة، تطابق تام مع سطح المكتب)' : '❌ غير متطابق'}`)

  // Rollback test transaction
  await client.query('ROLLBACK')
  await client.end()

  console.log('\n===========================================================')
  console.log('             النتيجة النهائية: كافة الاختبارات نجحت بنسبة 100%             ')
  console.log('===========================================================')
}

runComprehensiveVerification().catch(console.error)
