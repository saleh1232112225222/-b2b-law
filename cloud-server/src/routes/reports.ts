import { Router, Request, Response } from 'express'
import { query } from '../db/connection'
import { authMiddleware } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { getCompanyId } from '../middleware/tenant'

export const reportsRouter = Router()

reportsRouter.use(authMiddleware)

reportsRouter.get(
  '/case',
  requirePermission('export_reports'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { caseId, from, to } = req.query
      if (!caseId) {
        res.status(400).json({ error: 'معرف القضية مطلوب' })
        return
      }
      const caseData = await query('SELECT * FROM cases WHERE id = $1 AND company_id = $2', [
        caseId,
        companyId
      ])
      if (caseData.rows.length === 0) {
        res.status(404).json({ error: 'القضية غير موجودة' })
        return
      }
      const caseRow = caseData.rows[0]

      const appendDateRange = (
        sql: string,
        values: any[],
        column: string
      ): { sql: string; values: any[] } => {
        let filteredSql = sql
        if (from) {
          values.push(from)
          filteredSql += ` AND ${column} >= $${values.length}`
        }
        if (to) {
          values.push(to)
          filteredSql += ` AND ${column} <= $${values.length}`
        }
        return { sql: filteredSql, values }
      }

      const sessionsFilter = appendDateRange(
        'SELECT * FROM sessions WHERE case_id = $1 AND company_id = $2',
        [caseId, companyId],
        'date'
      )
      const tasksFilter = appendDateRange(
        'SELECT * FROM tasks_v2 WHERE case_id = $1 AND company_id = $2',
        [caseId, companyId],
        'created_at'
      )
      const financesFilter = appendDateRange(
        'SELECT * FROM finances WHERE case_id = $1 AND company_id = $2',
        [caseId, companyId],
        'date'
      )
      const documentsFilter = appendDateRange(
        'SELECT * FROM documents_v2 WHERE case_id = $1 AND company_id = $2',
        [caseId, companyId],
        'created_at'
      )
      const activityFilter = appendDateRange(
        `SELECT * FROM activity_logs
         WHERE company_id = $1
           AND (
             entity_id = $2
             OR metadata_json ->> 'caseId' = $2
             OR metadata_json ->> 'case_id' = $2
           )`,
        [companyId, String(caseId)],
        'timestamp'
      )

      const [sessions, tasks, finances, documents, activityLogs] = await Promise.all([
        query(`${sessionsFilter.sql} ORDER BY date DESC`, sessionsFilter.values),
        query(`${tasksFilter.sql} ORDER BY created_at DESC`, tasksFilter.values),
        query(`${financesFilter.sql} ORDER BY date DESC`, financesFilter.values),
        query(`${documentsFilter.sql} ORDER BY created_at DESC`, documentsFilter.values),
        query(`${activityFilter.sql} ORDER BY timestamp DESC LIMIT 50`, activityFilter.values)
      ])

      // Build timeline combining sessions, tasks, documents
      const timelineRows: any[] = []
      for (const s of sessions.rows) {
        timelineRows.push({
          at: s.date,
          type: 'جلسة',
          title: s.type || s.session_type || 'جلسة',
          id: s.id
        })
      }
      for (const t of tasks.rows) {
        timelineRows.push({
          at: t.created_at,
          type: 'مهمة',
          title: t.title || t.task_title || 'مهمة',
          id: t.id
        })
      }
      for (const d of documents.rows) {
        timelineRows.push({
          at: d.created_at,
          type: 'مستند',
          title: d.title || d.file_name || 'مستند',
          id: d.id
        })
      }
      timelineRows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

      // Calculate KPIs
      const totalIn = finances.rows.reduce(
        (sum: number, f: any) => sum + parseFloat(f.amount_in || f.amount || 0),
        0
      )
      const totalOut = finances.rows.reduce(
        (sum: number, f: any) => sum + parseFloat(f.amount_out || 0),
        0
      )

      // Build parties from clients
      const clientData = await query('SELECT cl.* FROM clients cl WHERE cl.id = $1', [
        caseRow.client_id
      ]).catch(() => ({ rows: [] }))

      res.json({
        case: {
          ...caseRow,
          client_name: clientData.rows[0]?.name || caseRow.client_name || '',
          parties:
            clientData.rows.length > 0
              ? [
                  {
                    id: clientData.rows[0].id,
                    name: clientData.rows[0].name,
                    party_type: 'client'
                  }
                ]
              : []
        },
        kpis: {
          sessionsTotal: sessions.rows.length,
          totalIn,
          balance: totalIn - totalOut
        },
        timeline: {
          rows: timelineRows.slice(0, 20),
          pageInfo: { page: 1, pageSize: 20, totalRows: timelineRows.length }
        },
        sessions: {
          rows: sessions.rows.map((s: any) => ({
            id: s.id,
            date: s.date,
            status: s.status || 'مجدول',
            notes: s.notes || s.result || ''
          }))
        },
        activity: {
          rows: activityLogs.rows.slice(0, 10).map((a: any) => ({
            id: a.id,
            timestamp: a.timestamp,
            actor: a.actor || '',
            details: a.details || ''
          }))
        },
        executive: {
          lastAction: timelineRows[0]?.title || null,
          nextAction: sessions.rows.find((s: any) => new Date(s.date) > new Date())?.type || null,
          alerts: [],
          recommendations: [],
          counts: {
            sessionsNext7: sessions.rows.filter((s: any) => {
              const d = new Date(s.date)
              const n = new Date()
              const w = new Date()
              w.setDate(w.getDate() + 7)
              return d >= n && d <= w
            }).length,
            tasksOverdue: tasks.rows.filter(
              (t: any) =>
                t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
            ).length,
            tasksNext7: tasks.rows.filter((t: any) => {
              const d = new Date(t.due_date)
              const n = new Date()
              const w = new Date()
              w.setDate(w.getDate() + 7)
              return d >= n && d <= w
            }).length,
            unclosedPastSessions: sessions.rows.filter(
              (s: any) => new Date(s.date) < new Date() && s.status !== 'منتهية'
            ).length
          }
        }
      })
    } catch (err) {
      console.error('[REPORTS] Case report error:', err)
      res.status(500).json({ error: 'فشل إنشاء تقرير القضية' })
    }
  }
)

reportsRouter.get(
  '/sessions',
  requirePermission('export_reports'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { from, to, caseId, page = '1', pageSize = '25' } = req.query
      const limit = parseInt(pageSize as string)
      const offset = (parseInt(page as string) - 1) * limit

      let countSql = 'SELECT COUNT(*) FROM sessions s WHERE s.company_id = $1'
      let sql =
        'SELECT s.*, c.case_number FROM sessions s LEFT JOIN cases c ON c.id = s.case_id WHERE s.company_id = $1'
      const params: any[] = [companyId]
      let idx = 2
      if (from) {
        countSql += ` AND s.date >= $${idx}`
        sql += ` AND s.date >= $${idx}`
        params.push(from)
        idx++
      }
      if (to) {
        countSql += ` AND s.date <= $${idx}`
        sql += ` AND s.date <= $${idx}`
        params.push(to)
        idx++
      }
      if (caseId) {
        countSql += ` AND s.case_id = $${idx}`
        sql += ` AND s.case_id = $${idx}`
        params.push(caseId)
        idx++
      }

      sql += ` ORDER BY s.date DESC, s.time DESC LIMIT $${idx} OFFSET $${idx + 1}`

      const countRes = await query(countSql, params)
      const totalRows = parseInt(countRes.rows[0].count)

      const result = await query(sql, [...params, limit, offset])
      res.json({
        rows: result.rows,
        pageInfo: {
          page: parseInt(page as string),
          pageSize: limit,
          totalRows
        }
      })
    } catch (err) {
      console.error('[REPORTS] Sessions report error:', err)
      res.status(500).json({ error: 'فشلت العملية' })
    }
  }
)

reportsRouter.get(
  '/financial-summary',
  requirePermission('export_reports'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { from, to, type, caseId, page = '1', pageSize = '25' } = req.query
      const limit = parseInt(pageSize as string)
      const offset = (parseInt(page as string) - 1) * limit

      let whereSql = ' WHERE f.company_id = $1'
      const params: any[] = [companyId]
      let idx = 2

      if (from) {
        whereSql += ` AND f.date >= $${idx}`
        params.push(from)
        idx++
      }
      if (to) {
        whereSql += ` AND f.date <= $${idx}`
        params.push(to)
        idx++
      }
      if (type) {
        whereSql += ` AND f.type = $${idx}`
        params.push(type)
        idx++
      }
      if (caseId) {
        whereSql += ` AND f.case_id = $${idx}`
        params.push(caseId)
        idx++
      }

      // Calculate totals based on the filtered criteria (without limit/offset)
      const totalsSql = `
        SELECT 
          COALESCE(SUM(CASE WHEN f.type = 'income' THEN f.amount ELSE 0 END), 0) as total_in,
          COALESCE(SUM(CASE WHEN f.type = 'expense' THEN f.amount ELSE 0 END), 0) as total_out
        FROM finances f
        ${whereSql}
      `
      const totalsRes = await query(totalsSql, params)
      const totalIn = parseFloat(totalsRes.rows[0].total_in)
      const totalOut = parseFloat(totalsRes.rows[0].total_out)
      const balance = totalIn - totalOut

      // Count total rows
      const countSql = `SELECT COUNT(*) FROM finances f ${whereSql}`
      const countRes = await query(countSql, params)
      const totalRows = parseInt(countRes.rows[0].count)

      // Get detailed paginated rows
      const dataSql = `
        SELECT f.*, c.case_number, cl.name as client_name
        FROM finances f
        LEFT JOIN cases c ON f.case_id = c.id
        LEFT JOIN clients cl ON f.client_id = cl.id
        ${whereSql}
        ORDER BY f.date DESC, f.created_at DESC
        LIMIT $${idx} OFFSET $${idx + 1}
      `
      const dataRes = await query(dataSql, [...params, limit, offset])

      res.json({
        totals: {
          totalIn,
          totalOut,
          balance
        },
        rows: dataRes.rows,
        pageInfo: {
          page: parseInt(page as string),
          pageSize: limit,
          totalRows
        }
      })
    } catch (err) {
      console.error('[REPORTS] Financial summary error:', err)
      res.status(500).json({ error: 'فشلت العملية' })
    }
  }
)

reportsRouter.get(
  '/activity',
  requirePermission('view_activity_logs'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { from, to } = req.query
      let sql = 'SELECT * FROM activity_logs WHERE company_id = $1'
      const params: any[] = [companyId]
      let idx = 2
      if (from) {
        sql += ` AND timestamp >= $${idx++}`
        params.push(from)
      }
      if (to) {
        sql += ` AND timestamp <= $${idx++}`
        params.push(to)
      }
      sql += ' ORDER BY timestamp DESC LIMIT 200'
      const result = await query(sql, params)
      res.json(result.rows)
    } catch (err) {
      console.error('[REPORTS] Activity error:', err)
      res.status(500).json({ error: 'فشلت العملية' })
    }
  }
)

reportsRouter.post(
  '/export/csv',
  requirePermission('export_reports'),
  (req: Request, res: Response) => {
    const { filename, rows } = req.body
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ error: 'لا توجد بيانات للتصدير' })
      return
    }
    const headers = Object.keys(rows[0])
    const outputFilename = String(filename || 'export')
      .trim()
      .replace(/[\r\n"\\/]/g, '_')
    const csvFilename = outputFilename.toLowerCase().endsWith('.csv')
      ? outputFilename
      : `${outputFilename}.csv`
    const csvRows = [
      headers.map((header) => `"${String(header).replace(/"/g, '""')}"`).join(','),
      ...rows.map((r: any) =>
        headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')
      )
    ]
    const csv = `\uFEFF${csvRows.join('\r\n')}`
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report.csv"; filename*=UTF-8''${encodeURIComponent(csvFilename)}`
    )
    res.send(csv)
  }
)

reportsRouter.post(
  '/export/pdf',
  requirePermission('export_reports'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { type, params } = req.body
      const html = await generateReportHtmlString(companyId, type, params, true)
      res.setHeader('Content-Type', 'text/html')
      res.setHeader('Content-Disposition', `inline; filename="report.html"`)
      res.send(html)
    } catch (err: any) {
      console.error('[REPORTS] export pdf error:', err)
      res.status(500).json({
        error: 'فشل تصدير التقرير',
        details: err?.message || String(err),
        stack: err?.stack
      })
    }
  }
)

reportsRouter.post(
  '/export/html',
  requirePermission('export_reports'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { type, params } = req.body
      const html = await generateReportHtmlString(companyId, type, params, false)
      res.setHeader('Content-Type', 'text/html')
      res.setHeader('Content-Disposition', `attachment; filename="report.html"`)
      res.send(html)
    } catch (err: any) {
      console.error('[REPORTS] export html error:', err)
      res.status(500).json({
        error: 'فشل تصدير التقرير',
        details: err?.message || String(err),
        stack: err?.stack
      })
    }
  }
)

export async function generateReportHtmlString(
  companyId: string,
  type: string,
  params: any,
  isPdf: boolean
): Promise<string> {
  params = params && typeof params === 'object' ? params : {}
  let title = 'تقرير النظام'
  let headers: string[] = []
  let rows: any[][] = []
  let summary = ''

  if (type === 'contract') {
    const contractId = params.contractId
    const cRes = await query(`SELECT * FROM contracts WHERE id = $1 AND company_id = $2`, [
      contractId,
      companyId
    ])
    if (cRes.rows.length > 0) {
      const c = cRes.rows[0]
      title = c.title || 'عقد قانوني'
      summary = `مرجع العقد: ${c.contract_no || '—'} | تاريخ العقد: ${c.contract_date ? new Date(c.contract_date).toLocaleDateString('ar-SA') : '—'}`

      const textContent = c.text_content || 'نص العقد غير متوفر'

      const pRes = await query(
        `
        SELECT cp.id, cp.role_key, cp.role_label, cs.signature_status, cs.signature_payload_json, cl.name as client_name, u.full_name as user_name
        FROM contract_participants cp
        LEFT JOIN contract_signatures cs ON cs.participant_id = cp.id
        LEFT JOIN contract_parties p ON cp.party_id = p.id
        LEFT JOIN clients cl ON p.client_id = cl.id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE cp.contract_id = $1 AND cp.company_id = $2
      `,
        [contractId, companyId]
      )

      const sigsHtml = pRes.rows
        .map((p) => {
          let imgTag = ''
          if (p.signature_payload_json) {
            try {
              const pay = JSON.parse(p.signature_payload_json)
              if (pay.image) {
                imgTag = `<img src="${pay.image}" style="max-height: 60px; max-width: 150px; display: block; margin-top: 5px; border: 1px dashed #ccc;" />`
              }
            } catch {}
          }
          const name = p.client_name || p.user_name || 'الطرف الآخر'
          return `
          <div style="width: 45%; margin-bottom: 20px; float: right; box-sizing: border-box; padding: 10px;">
            <strong>الاسم:</strong> ${name}<br/>
            <strong>الصفة:</strong> ${p.role_label || p.role_key}<br/>
            <strong>التوقيع:</strong> ${imgTag ? imgTag : '<span style="color:#e9a049;">(لم يوقع بعد)</span>'}
          </div>
        `
        })
        .join('')

      return `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 50px; color: #333; direction: rtl; line-height: 1.8; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e9c349; padding-bottom: 20px; }
            .header h1 { color: #1e293b; margin: 0 0 10px 0; font-size: 26px; }
            .header p { color: #64748b; margin: 0; font-size: 14px; }
            .content-box { background-color: #fcfcfc; border: 1px solid #e2e8f0; padding: 30px; border-radius: 8px; font-size: 15px; text-align: justify; white-space: pre-wrap; margin-bottom: 40px; }
            .signatures-box { border-top: 2px solid #e2e8f0; padding-top: 20px; margin-top: 40px; }
            .signatures-box::after { content: ""; clear: both; display: table; }
            @media print {
              body { margin: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title}</h1>
            <p>${summary}</p>
          </div>
          <div class="content-box">
            ${textContent}
          </div>
          <div class="signatures-box">
            <h3 style="margin-top:0; border-bottom:1px solid #ddd; padding-bottom:5px;">تواقيع أطراف العقد:</h3>
            ${sigsHtml}
          </div>
          <script>window.onload = () => { setTimeout(() => { window.print(); }, 500); }</script>
        </body>
        </html>
      `
    }
  }

  try {
    if (type === 'case-a4' || type === 'case') {
      const selectedCaseId = String(params.caseId || '').trim()
      if (!selectedCaseId) throw new Error('معرف القضية مطلوب لإنشاء تقرير القضية')

      title = 'تقرير قضية شامل'
      const result = await query(
        `SELECT c.id, c.case_number, COALESCE(cl.name, '') AS client_name,
                c.court, c.circuit, c.status, c.subject, c.case_type,
                c.registration_date, c.opponent_name, c.client_role, c.phase,
                c.priority, c.notes
         FROM cases c
         LEFT JOIN clients cl ON c.client_id = cl.id
         WHERE c.company_id = $1 AND c.id = $2`,
        [companyId, selectedCaseId]
      )
      if (result.rows.length === 0) throw new Error('القضية المحددة غير موجودة')
      const c = result.rows[0]
      headers = ['رقم القضية', 'الموكل', 'الخصم', 'المحكمة / الدائرة', 'الحالة', 'الموضوع']
      rows = [
        [
          c.case_number || '',
          c.client_name || '',
          c.opponent_name || '-',
          `${c.court || ''}${c.circuit ? ` / ${c.circuit}` : ''}`,
          c.status || '',
          c.subject || ''
        ]
      ]
      summary = `القضية المحددة: ${c.case_number || selectedCaseId} | نوع القضية: ${c.case_type || '-'} | المرحلة: ${c.phase || '-'} | الأولوية: ${c.priority || '-'} | تاريخ القيد: ${c.registration_date ? new Date(c.registration_date).toLocaleDateString('ar-SA') : '-'}`
    } else if (type === 'financial') {
      title = 'التقرير المالي وحسابات المكتب'
      let sql = `SELECT f.date, f.amount, f.description, f.type, f.category, c.case_number,
                        COALESCE(cl.name, '') AS client_name
                 FROM finances f
                 LEFT JOIN cases c ON f.case_id = c.id
                 LEFT JOIN clients cl ON f.client_id = cl.id
                 WHERE f.company_id = $1`
      const queryParams: any[] = [companyId]
      let pIdx = 2
      if (params.caseId) {
        sql += ` AND f.case_id = $${pIdx++}`
        queryParams.push(params.caseId)
      }
      if (params.from) {
        sql += ` AND f.date >= $${pIdx++}`
        queryParams.push(params.from)
      }
      if (params.to) {
        sql += ` AND f.date <= $${pIdx++}`
        queryParams.push(params.to)
      }
      if (params.type) {
        sql += ` AND f.type = $${pIdx++}`
        queryParams.push(params.type)
      }
      sql += ' ORDER BY f.date DESC, f.created_at DESC'
      const result = await query(sql, queryParams)
      headers = ['التاريخ', 'المبلغ (ريال)', 'العملية', 'التصنيف', 'رقم القضية', 'الموكل', 'البيان']
      rows = result.rows.map((r: any) => [
        r.date ? new Date(r.date).toLocaleDateString('ar-SA') : '',
        Number(r.amount || 0).toLocaleString('ar-SA'),
        r.type === 'income' ? 'دخل' : r.type === 'expense' ? 'مصروف' : r.type || '',
        r.category || '-',
        r.case_number || '-',
        r.client_name || '-',
        r.description || ''
      ])
      const totalIn = result.rows.reduce(
        (sum: number, r: any) => sum + (r.type === 'income' ? Number(r.amount || 0) : 0),
        0
      )
      const totalOut = result.rows.reduce(
        (sum: number, r: any) => sum + (r.type === 'expense' ? Number(r.amount || 0) : 0),
        0
      )
      summary = `إجمالي المقبوضات: ${totalIn.toLocaleString('ar-SA')} ريال | إجمالي المصروفات: ${totalOut.toLocaleString('ar-SA')} ريال | صافي الرصيد: ${(totalIn - totalOut).toLocaleString('ar-SA')} ريال | عدد العمليات: ${result.rows.length}`
    } else if (type === 'activity_log' || type === 'activity') {
      title = 'تقرير سجل النشاطات والعمليات'
      let sql = `SELECT timestamp, actor, details, module_key, action_key
                 FROM activity_logs WHERE company_id = $1`
      const queryParams: any[] = [companyId]
      let pIdx = 2
      if (params.from) {
        sql += ` AND timestamp >= $${pIdx++}`
        queryParams.push(params.from)
      }
      if (params.to) {
        sql += ` AND timestamp <= $${pIdx++}`
        queryParams.push(params.to)
      }
      if (params.actor) {
        sql += ` AND actor = $${pIdx++}`
        queryParams.push(params.actor)
      }
      sql += ' ORDER BY timestamp DESC LIMIT 500'
      const result = await query(sql, queryParams)
      headers = ['الوقت والتاريخ', 'المستخدم/المنفذ', 'الوحدة', 'العملية', 'التفاصيل']
      rows = result.rows.map((r: any) => [
        r.timestamp ? new Date(r.timestamp).toLocaleString('ar-SA') : '',
        r.actor || 'النظام',
        r.module_key || '-',
        r.action_key || '-',
        r.details || ''
      ])
      summary = `عدد العمليات المطابقة للتصفية: ${result.rows.length}`
    } else if (type === 'users_permissions') {
      title = 'تقرير صلاحيات ومستخدمي النظام'
      const result = await query(
        `SELECT username, full_name, role_key, is_active, must_change_password
         FROM users WHERE company_id = $1 ORDER BY full_name, username`,
        [companyId]
      )
      headers = ['اسم المستخدم', 'الاسم الكامل', 'الدور/الصلاحية', 'الحالة', 'تغيير كلمة المرور']
      rows = result.rows.map((r: any) => [
        r.username || '',
        r.full_name || '',
        r.role_key || '',
        r.is_active ? 'نشط' : 'معطل',
        r.must_change_password ? 'مطلوب' : 'غير مطلوب'
      ])
      summary = `إجمالي عدد مستخدمي النظام: ${result.rows.length}`
    } else if (type === 'sessions') {
      title = 'تقرير جلسات الموكلين والمحاكم'
      let sql = `SELECT s.date, s.time, s.status, s.notes, s.result, c.case_number,
                        COALESCE(cl.name, '') AS client_name
                 FROM sessions s
                 LEFT JOIN cases c ON s.case_id = c.id
                 LEFT JOIN clients cl ON c.client_id = cl.id
                 WHERE s.company_id = $1`
      const queryParams: any[] = [companyId]
      let pIdx = 2
      if (params.caseId) {
        sql += ` AND s.case_id = $${pIdx++}`
        queryParams.push(params.caseId)
      }
      if (params.from) {
        sql += ` AND s.date >= $${pIdx++}`
        queryParams.push(params.from)
      }
      if (params.to) {
        sql += ` AND s.date <= $${pIdx++}`
        queryParams.push(params.to)
      }
      if (params.q) {
        sql += ` AND (COALESCE(s.notes, '') ILIKE $${pIdx} OR COALESCE(s.result, '') ILIKE $${pIdx} OR COALESCE(c.case_number, '') ILIKE $${pIdx})`
        queryParams.push(`%${params.q}%`)
        pIdx++
      }
      sql += ' ORDER BY s.date DESC, s.time DESC'
      const result = await query(sql, queryParams)
      headers = ['تاريخ الجلسة', 'الوقت', 'رقم القضية', 'الموكل', 'الحالة', 'النتيجة / الملاحظات']
      rows = result.rows.map((r: any) => [
        r.date ? new Date(r.date).toLocaleDateString('ar-SA') : '',
        r.time || '',
        r.case_number || '-',
        r.client_name || '-',
        r.status || '-',
        r.result || r.notes || '-'
      ])
      summary = `إجمالي عدد الجلسات المطابقة للتصفية: ${result.rows.length}`
    } else if (type === 'evidence') {
      title = 'تقرير الأدلة والقرائن'
      let sql = `SELECT e.title, e.description, e.memo_type, e.memo_label, e.status,
                        e.evidence_date, c.case_number
                 FROM evidence e
                 LEFT JOIN cases c ON e.case_id = c.id
                 WHERE e.company_id = $1`
      const queryParams: any[] = [companyId]
      let pIdx = 2
      if (params.caseId) {
        sql += ` AND e.case_id = $${pIdx++}`
        queryParams.push(params.caseId)
      }
      if (params.from) {
        sql += ` AND e.evidence_date >= $${pIdx++}`
        queryParams.push(params.from)
      }
      if (params.to) {
        sql += ` AND e.evidence_date <= $${pIdx++}`
        queryParams.push(params.to)
      }
      sql += ' ORDER BY e.created_at DESC'
      const result = await query(sql, queryParams)
      headers = ['عنوان الدليل', 'التصنيف', 'التاريخ', 'الحالة', 'رقم القضية', 'الوصف']
      rows = result.rows.map((r: any) => [
        r.title || '',
        r.memo_label || r.memo_type || '-',
        r.evidence_date ? new Date(r.evidence_date).toLocaleDateString('ar-SA') : '-',
        r.status || '',
        r.case_number || '-',
        r.description || '-'
      ])
      summary = `إجمالي الأدلة المطابقة للتصفية: ${result.rows.length}`
    } else if (type === 'documents') {
      title = 'تقرير المستندات والوثائق'
      let sql = `SELECT d.name, d.file_type, d.link_type, d.linked_title, d.status,
                        d.created_at, c.case_number
                 FROM documents_v2 d
                 LEFT JOIN cases c ON d.case_id = c.id
                 WHERE d.company_id = $1`
      const queryParams: any[] = [companyId]
      let pIdx = 2
      if (params.linkType) {
        sql += ` AND d.link_type = $${pIdx++}`
        queryParams.push(params.linkType)
      }
      if (params.parentId) {
        const parentColumn =
          params.linkType === 'task'
            ? 'task_id'
            : params.linkType === 'session'
              ? 'session_id'
              : 'case_id'
        sql += ` AND d.${parentColumn} = $${pIdx++}`
        queryParams.push(params.parentId)
      }
      if (params.from) {
        sql += ` AND d.created_at >= $${pIdx++}`
        queryParams.push(params.from)
      }
      if (params.to) {
        sql += ` AND d.created_at <= $${pIdx++}`
        queryParams.push(params.to)
      }
      sql += ' ORDER BY d.created_at DESC'
      const result = await query(sql, queryParams)
      headers = [
        'اسم المستند',
        'نوع الملف',
        'نوع الارتباط',
        'المرجع',
        'رقم القضية',
        'الحالة',
        'تاريخ الإضافة'
      ]
      rows = result.rows.map((r: any) => [
        r.name || '',
        r.file_type || '-',
        r.link_type || '-',
        r.linked_title || '-',
        r.case_number || '-',
        r.status || '-',
        r.created_at ? new Date(r.created_at).toLocaleDateString('ar-SA') : '-'
      ])
      summary = `إجمالي المستندات المطابقة للتصفية: ${result.rows.length}`
    } else if (type === 'memoranda' || type === 'memoranda_list') {
      const memorandumId = type === 'memoranda' ? String(params.id || '').trim() : ''
      if (type === 'memoranda' && !memorandumId) throw new Error('معرف المذكرة مطلوب')
      title = type === 'memoranda' ? 'تقرير مذكرة قانونية' : 'تقرير المذكرات القانونية'
      let sql = `SELECT m.memo_title, m.memo_summary, m.memo_date, m.memo_type,
                        m.memo_label, m.memo_status, m.najiz_number, c.case_number,
                        COALESCE(cl.name, '') AS client_name
                 FROM memoranda m
                 LEFT JOIN cases c ON m.case_id = c.id
                 LEFT JOIN clients cl ON c.client_id = cl.id
                 WHERE m.company_id = $1`
      const queryParams: any[] = [companyId]
      let pIdx = 2
      if (memorandumId) {
        sql += ` AND m.id = $${pIdx++}`
        queryParams.push(memorandumId)
      }
      if (params.caseId) {
        sql += ` AND m.case_id = $${pIdx++}`
        queryParams.push(params.caseId)
      }
      if (params.from) {
        sql += ` AND COALESCE(m.memo_date, m.created_at::date) >= $${pIdx++}`
        queryParams.push(params.from)
      }
      if (params.to) {
        sql += ` AND COALESCE(m.memo_date, m.created_at::date) <= $${pIdx++}`
        queryParams.push(params.to)
      }
      if (params.q) {
        sql += ` AND (m.memo_title ILIKE $${pIdx} OR COALESCE(m.memo_summary, '') ILIKE $${pIdx})`
        queryParams.push(`%${params.q}%`)
        pIdx++
      }
      sql += ' ORDER BY m.created_at DESC'
      const result = await query(sql, queryParams)
      headers = ['عنوان المذكرة', 'النوع', 'التاريخ', 'الحالة', 'رقم القضية', 'الموكل', 'الملخص']
      rows = result.rows.map((r: any) => [
        r.memo_title || '',
        r.memo_label || r.memo_type || '-',
        r.memo_date ? new Date(r.memo_date).toLocaleDateString('ar-SA') : '-',
        r.memo_status || '-',
        r.case_number || '-',
        r.client_name || '-',
        r.memo_summary || '-'
      ])
      summary = `${type === 'memoranda' ? 'المذكرة المحددة' : 'إجمالي المذكرات المطابقة للتصفية'}: ${result.rows.length}`
    } else if (type === 'operations' || type === 'operations_advanced') {
      title =
        type === 'operations_advanced'
          ? 'تقرير الأداء التشغيلي التفصيلي'
          : 'التقرير التشغيلي اليومي'
      const result = await query(
        `SELECT
           (SELECT COUNT(*) FROM cases WHERE company_id = $1) AS total_cases,
           (SELECT COUNT(*) FROM sessions WHERE company_id = $1) AS total_sessions,
           (SELECT COUNT(*) FROM tasks_v2 WHERE company_id = $1) AS total_tasks,
           (SELECT COUNT(*) FROM clients WHERE company_id = $1) AS total_clients`,
        [companyId]
      )
      const stats = result.rows[0] || {}
      headers = ['المؤشر', 'القيمة']
      rows = [
        ['إجمالي القضايا', stats.total_cases || 0],
        ['إجمالي الجلسات', stats.total_sessions || 0],
        ['إجمالي المهام', stats.total_tasks || 0],
        ['إجمالي الموكلين', stats.total_clients || 0]
      ]
      summary = 'ملخص مؤشرات التشغيل المرتبطة ببيانات المكتب الحالية'
    } else if (type === 'court-cases' || type === 'court_cases' || type === 'cases') {
      title = 'تقرير قضايا المحكمة والملفات القانونية'
      let sql = `SELECT c.id, c.case_number, COALESCE(cl.name, '') as client_name, c.court, c.circuit, c.status, c.subject
                 FROM cases c
                 LEFT JOIN clients cl ON c.client_id = cl.id
                 WHERE c.company_id = $1`
      const queryParams: any[] = [companyId]
      let pIdx = 2

      if (params?.caseId && String(params.caseId).trim()) {
        sql += ` AND c.id = $${pIdx++}`
        queryParams.push(String(params.caseId).trim())
      }
      if (params?.court && String(params.court).trim()) {
        sql += ` AND (c.court ILIKE $${pIdx} OR c.circuit ILIKE $${pIdx})`
        queryParams.push(`%${String(params.court).trim()}%`)
        pIdx++
      }
      if (params?.from && String(params.from).trim()) {
        sql += ` AND c.registration_date >= $${pIdx++}`
        queryParams.push(String(params.from).trim())
      }
      if (params?.to && String(params.to).trim()) {
        sql += ` AND c.registration_date <= $${pIdx++}`
        queryParams.push(String(params.to).trim())
      }

      sql += ` ORDER BY c.created_at DESC`
      const result = await query(sql, queryParams)

      headers = [
        'رقم القضية',
        'الموكل',
        'المحكمة / الدائرة',
        'الحالة',
        'الموضوع',
        'ملاحظات التقرير'
      ]
      rows = result.rows.map((r: any) => [
        r.case_number || '',
        r.client_name || '',
        `${r.court || ''} ${r.circuit ? ' / ' + r.circuit : ''}`,
        r.status || '',
        r.subject || '',
        params?.notes && params.notes[r.id] ? params.notes[r.id] : '-'
      ])
      summary = `إجمالي عدد القضايا في التقرير: ${result.rows.length}`
    } else {
      throw new Error(`نوع التقرير غير مدعوم: ${type || 'غير محدد'}`)
    }
  } catch (err: any) {
    console.error(`[REPORTS] Error building report ${type}:`, err?.message || err)
    title = 'تعذر إنشاء التقرير المطلوب'
    headers = ['الحالة', 'الرسالة']
    rows = [['فشل استخراج بيانات التقرير', err?.message || '']]
  }

  const tableHeaders = headers
    .map(
      (h) =>
        `<th style="border: 1px solid #e2e8f0; padding: 12px; background-color: #f1f5f9; color: #1e293b; font-weight: bold; text-align: right;">${h}</th>`
    )
    .join('')
  const tableRows = rows
    .map((row) => {
      const cells = row
        .map(
          (cell) =>
            `<td style="border: 1px solid #e2e8f0; padding: 12px; text-align: right;">${cell !== null && cell !== undefined ? cell : ''}</td>`
        )
        .join('')
      return `<tr>${cells}</tr>`
    })
    .join('')

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #333; direction: rtl; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e9c349; padding-bottom: 20px; }
        .header h1 { color: #1e293b; margin: 0 0 10px 0; font-size: 24px; }
        .header p { color: #64748b; margin: 0; font-size: 14px; }
        .summary { background-color: #f8fafc; border-right: 4px solid #e9c349; padding: 15px; margin-bottom: 30px; border-radius: 4px; font-size: 14px; line-height: 1.6; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
        th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: right; }
        th { background-color: #f1f5f9; color: #1e293b; font-weight: bold; }
        tr:nth-child(even) { background-color: #f8fafc; }
        @media print {
          body { margin: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        <p>برنامج B2B LAWYER PRO - تقرير تم إنشاؤه في ${new Date().toLocaleDateString('ar-SA')}</p>
      </div>
      ${summary ? `<div class="summary">${summary}</div>` : ''}
      <table>
        <thead>
          <tr>${tableHeaders}</tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      ${isPdf ? '<script>window.onload = () => { setTimeout(() => { window.print(); }, 500); }</script>' : ''}
    </body>
    </html>
  `
}

reportsRouter.get(
  '/users',
  requirePermission('manage_users'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const result = await query(
        'SELECT id, username, full_name, role_key, is_active, employee_id FROM users WHERE company_id = $1',
        [companyId]
      )
      res.json(result.rows)
    } catch (err) {
      res.status(500).json({ error: 'فشلت العملية' })
    }
  }
)

reportsRouter.get(
  '/clients',
  requirePermission('view_clients'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const result = await query(
        'SELECT id, name, id_number, phone FROM clients WHERE company_id = $1 ORDER BY name',
        [companyId]
      )
      res.json(result.rows)
    } catch (err) {
      res.status(500).json({ error: 'فشلت العملية' })
    }
  }
)

reportsRouter.get(
  '/operations-summary',
  requirePermission('view_cases'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const [cases, sessions, tasks, clients] = await Promise.all([
        query('SELECT COUNT(*) FROM cases WHERE company_id = $1', [companyId]),
        query('SELECT COUNT(*) FROM sessions WHERE company_id = $1', [companyId]),
        query('SELECT COUNT(*) FROM tasks_v2 WHERE company_id = $1', [companyId]),
        query('SELECT COUNT(*) FROM clients WHERE company_id = $1', [companyId])
      ])
      res.json({
        totalCases: parseInt(cases.rows[0].count),
        totalSessions: parseInt(sessions.rows[0].count),
        totalTasks: parseInt(tasks.rows[0].count),
        totalClients: parseInt(clients.rows[0].count)
      })
    } catch (err) {
      res.status(500).json({ error: 'فشلت العملية' })
    }
  }
)

reportsRouter.get(
  '/operations',
  requirePermission('view_cases'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)

      // 1. Cases stats
      const totalCasesRes = await query('SELECT COUNT(*) FROM cases WHERE company_id = $1', [
        companyId
      ])
      const wonRes = await query(
        "SELECT COUNT(DISTINCT case_id) FROM judgments WHERE company_id = $1 AND favor = 'موكل'",
        [companyId]
      )
      const lostRes = await query(
        "SELECT COUNT(DISTINCT case_id) FROM judgments WHERE company_id = $1 AND favor = 'خصم'",
        [companyId]
      )

      const totalCases = parseInt(totalCasesRes.rows[0].count) || 0
      const won = parseInt(wonRes.rows[0].count) || 0
      const lost = parseInt(lostRes.rows[0].count) || 0
      const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0

      // 2. Tasks stats
      const completedTasksRes = await query(
        "SELECT COUNT(*) FROM tasks_v2 WHERE company_id = $1 AND status IN ('completed', 'closed')",
        [companyId]
      )
      const pendingTasksRes = await query(
        "SELECT COUNT(*) FROM tasks_v2 WHERE company_id = $1 AND status NOT IN ('completed', 'closed', 'cancelled')",
        [companyId]
      )

      const completed = parseInt(completedTasksRes.rows[0].count) || 0
      const pending = parseInt(pendingTasksRes.rows[0].count) || 0
      const completionRate =
        completed + pending > 0 ? Math.round((completed / (completed + pending)) * 100) : 0

      // 3. Finances stats
      const incomeRes = await query(
        "SELECT COALESCE(SUM(amount), 0) as total FROM finances WHERE company_id = $1 AND type = 'income'",
        [companyId]
      )
      const engagementFinRes = await query(
        'SELECT COALESCE(SUM(financial_compensation), 0) as revenue, COALESCE(SUM(paid_amount), 0) as paid FROM legal_engagements WHERE company_id = $1 AND deleted_at IS NULL',
        [companyId]
      )

      const income = parseFloat(incomeRes.rows[0].total) || 0
      const revenue = parseFloat(engagementFinRes.rows[0].revenue) || 0
      const paid = parseFloat(engagementFinRes.rows[0].paid) || 0
      const collectionRate = revenue > 0 ? Math.round((paid / revenue) * 100) : 0

      // 4. Enforcement stats
      const enforcementTotalRes = await query(
        'SELECT COUNT(*) FROM enforcement_files WHERE company_id = $1',
        [companyId]
      )
      const enforcementCollectedRes = await query(
        'SELECT COALESCE(SUM(collected_amount), 0) as total FROM enforcement_files WHERE company_id = $1',
        [companyId]
      )

      const enforcementTotal = parseInt(enforcementTotalRes.rows[0].count) || 0
      const enforcementCollected = parseFloat(enforcementCollectedRes.rows[0].total) || 0

      // 5. Employees list
      const employeesRes = await query(
        `
        SELECT 
          emp.id,
          emp.name,
          COALESCE((SELECT COUNT(*) FROM cases c JOIN users u ON c.responsible_user_id = u.id WHERE u.employee_id = emp.id AND c.company_id = emp.company_id), 0) as cases_count,
          COALESCE((SELECT COUNT(*) FROM sessions s JOIN users u ON s.responsible_user_id = u.id WHERE u.employee_id = emp.id AND s.company_id = emp.company_id), 0) as sessions_count,
          COALESCE((SELECT COUNT(*) FROM tasks_v2 t JOIN users u ON t.responsible_user_id = u.id WHERE u.employee_id = emp.id AND t.company_id = emp.company_id), 0) as tasks_count
        FROM employees emp
        WHERE emp.company_id = $1 AND emp.status = 'active'
      `,
        [companyId]
      )

      const employeesList = employeesRes.rows.map((row: any) => {
        const casesCount = parseInt(row.cases_count) || 0
        const sessionsCount = parseInt(row.sessions_count) || 0
        const tasksCount = parseInt(row.tasks_count) || 0
        const memosCount = 0

        const casesScore = casesCount * 2
        const sessionsScore = sessionsCount * 1.5
        const tasksScore = tasksCount * 0.8
        const rawScore = (casesScore + sessionsScore + tasksScore) / 5
        const score = Math.min(10, Math.max(1, Math.round(rawScore * 10) / 10 || 1))

        let level = 'منخفض'
        if (score >= 8) level = 'عالي الأداء'
        else if (score >= 5) level = 'متوسط'

        return {
          name: row.name,
          casesCount,
          sessionsCount,
          tasksCount,
          memosCount,
          score,
          level
        }
      })

      res.json({
        cases: {
          winRate,
          won,
          lost
        },
        tasks: {
          completionRate,
          completed,
          pending
        },
        finances: {
          collectionRate,
          income
        },
        enforcement: {
          total: enforcementTotal,
          collected: enforcementCollected
        },
        employees: employeesList
      })
    } catch (err) {
      console.error('[REPORTS] operations error:', err)
      res.status(500).json({ error: 'فشل جلب تقرير الأداء والعمليات' })
    }
  }
)

reportsRouter.get(
  '/users-permissions',
  requirePermission('manage_users'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const users = await query(
        'SELECT id, username, full_name, role_key, is_active, must_change_password FROM users WHERE company_id = $1',
        [companyId]
      )
      const permissions = await query(
        'SELECT permission_key, permission_name, module_key FROM permissions WHERE company_id = $1',
        [companyId]
      )
      res.json({
        users: users.rows,
        permissions: permissions.rows
      })
    } catch (err) {
      console.error('[REPORTS] users-permissions error:', err)
      res.status(500).json({ error: 'فشلت العملية' })
    }
  }
)

reportsRouter.get(
  '/dashboard',
  requirePermission('view_cases'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const [caseCount, sessionCount, taskCount, clientCount, recentCases, todaySessions] =
        await Promise.all([
          query("SELECT COUNT(*) FROM cases WHERE company_id = $1 AND status != 'منتهية'", [
            companyId
          ]),
          query('SELECT COUNT(*) FROM sessions WHERE company_id = $1 AND date >= CURRENT_DATE', [
            companyId
          ]),
          query(
            "SELECT COUNT(*) FROM tasks_v2 WHERE company_id = $1 AND status NOT IN ('completed','closed','cancelled')",
            [companyId]
          ),
          query('SELECT COUNT(*) FROM clients WHERE company_id = $1', [companyId]),
          query('SELECT * FROM cases WHERE company_id = $1 ORDER BY created_at DESC LIMIT 10', [
            companyId
          ]),
          query(
            'SELECT s.*, c.case_number FROM sessions s LEFT JOIN cases c ON c.id = s.case_id WHERE s.company_id = $1 AND s.date = CURRENT_DATE ORDER BY s.time',
            [companyId]
          )
        ])
      res.json({
        openCases: parseInt(caseCount.rows[0].count),
        todaySessionsCount: parseInt(sessionCount.rows[0].count),
        pendingTasks: parseInt(taskCount.rows[0].count),
        totalClients: parseInt(clientCount.rows[0].count),
        recentCases: recentCases.rows,
        todaySessions: todaySessions.rows
      })
    } catch (err) {
      res.status(500).json({ error: 'فشلت العملية' })
    }
  }
)

reportsRouter.get(
  '/cases',
  requirePermission('view_cases'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const result = await query(
        `SELECT c.*, cl.name as client_name 
       FROM cases c 
       LEFT JOIN clients cl ON c.client_id = cl.id 
       WHERE c.company_id = $1 AND c.is_archived = FALSE 
       ORDER BY c.created_at DESC`,
        [companyId]
      )
      res.json(result.rows)
    } catch (err) {
      console.error('[REPORTS] listCases error:', err)
      res.status(500).json({ error: 'فشل عرض القضايا' })
    }
  }
)

reportsRouter.get(
  '/user-activity',
  requirePermission('view_activity_logs'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { from, to, actor, page = '1', pageSize = '500' } = req.query
      const limit = parseInt(pageSize as string)
      const offset = (parseInt(page as string) - 1) * limit

      let countSql = 'SELECT COUNT(*) FROM activity_logs WHERE company_id = $1'
      let sql = 'SELECT * FROM activity_logs WHERE company_id = $1'
      const params: any[] = [companyId]
      let idx = 2
      if (from) {
        countSql += ` AND timestamp >= $${idx}`
        sql += ` AND timestamp >= $${idx}`
        params.push(from)
        idx++
      }
      if (to) {
        countSql += ` AND timestamp <= $${idx}`
        sql += ` AND timestamp <= $${idx}`
        params.push(to)
        idx++
      }
      if (actor) {
        countSql += ` AND (actor = $${idx} OR created_by = $${idx})`
        sql += ` AND (actor = $${idx} OR created_by = $${idx})`
        params.push(actor)
        idx++
      }
      sql += ` ORDER BY timestamp DESC LIMIT $${idx} OFFSET $${idx + 1}`

      const countRes = await query(countSql, params)
      const totalRows = parseInt(countRes.rows[0].count)

      const dataRes = await query(sql, [...params, limit, offset])
      res.json({
        rows: dataRes.rows,
        pageInfo: {
          page: parseInt(page as string),
          pageSize: limit,
          totalRows
        }
      })
    } catch (err) {
      console.error('[REPORTS] user-activity error:', err)
      res.status(500).json({ error: 'فشل جلب نشاط المستخدم' })
    }
  }
)

reportsRouter.get(
  '/evidence',
  requirePermission('view_documents'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { from, to, caseId, page = '1', pageSize = '25' } = req.query
      const limit = parseInt(pageSize as string)
      const offset = (parseInt(page as string) - 1) * limit

      let countSql = 'SELECT COUNT(*) FROM evidence WHERE company_id = $1'
      let sql = 'SELECT * FROM evidence WHERE company_id = $1'
      const params: any[] = [companyId]
      let idx = 2
      if (from) {
        countSql += ` AND evidence_date >= $${idx}`
        sql += ` AND evidence_date >= $${idx}`
        params.push(from)
        idx++
      }
      if (to) {
        countSql += ` AND evidence_date <= $${idx}`
        sql += ` AND evidence_date <= $${idx}`
        params.push(to)
        idx++
      }
      if (caseId) {
        countSql += ` AND case_id = $${idx}`
        sql += ` AND case_id = $${idx}`
        params.push(caseId)
        idx++
      }
      sql += ` ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`

      const countRes = await query(countSql, params)
      const totalRows = parseInt(countRes.rows[0].count)

      const dataRes = await query(sql, [...params, limit, offset])
      res.json({
        rows: dataRes.rows,
        pageInfo: {
          page: parseInt(page as string),
          pageSize: limit,
          totalRows
        }
      })
    } catch (err) {
      console.error('[REPORTS] evidence report error:', err)
      res.status(500).json({ error: 'فشل جلب تقرير الأدلة' })
    }
  }
)

reportsRouter.get(
  '/memoranda',
  requirePermission('view_documents'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { from, to, caseId, q, status = 'active', page = '1', pageSize = '25' } = req.query
      const limit = parseInt(pageSize as string)
      const offset = (parseInt(page as string) - 1) * limit

      const isArchived = status === 'archived'
      let countSql = `SELECT COUNT(*) FROM memoranda
                      WHERE company_id = $1
                        AND COALESCE((to_jsonb(memoranda) ->> 'is_archived')::boolean, false) = $2`
      let sql = `SELECT * FROM memoranda
                 WHERE company_id = $1
                   AND COALESCE((to_jsonb(memoranda) ->> 'is_archived')::boolean, false) = $2`
      const params: any[] = [companyId, isArchived]
      let idx = 3
      if (from) {
        countSql += ` AND (memo_date >= $${idx} OR created_at >= $${idx})`
        sql += ` AND (memo_date >= $${idx} OR created_at >= $${idx})`
        params.push(from)
        idx++
      }
      if (to) {
        countSql += ` AND (memo_date <= $${idx} OR created_at <= $${idx})`
        sql += ` AND (memo_date <= $${idx} OR created_at <= $${idx})`
        params.push(to)
        idx++
      }
      if (caseId) {
        countSql += ` AND case_id = $${idx}`
        sql += ` AND case_id = $${idx}`
        params.push(caseId)
        idx++
      }
      if (q) {
        countSql += ` AND (memo_title ILIKE $${idx} OR memo_summary ILIKE $${idx} OR memo_text ILIKE $${idx})`
        sql += ` AND (memo_title ILIKE $${idx} OR memo_summary ILIKE $${idx} OR memo_text ILIKE $${idx})`
        params.push(`%${q}%`)
        idx++
      }
      sql += ` ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`

      const countRes = await query(countSql, params)
      const totalRows = parseInt(countRes.rows[0].count)

      const dataRes = await query(sql, [...params, limit, offset])
      res.json({
        rows: dataRes.rows,
        pageInfo: {
          page: parseInt(page as string),
          pageSize: limit,
          totalRows
        }
      })
    } catch (err) {
      console.error('[REPORTS] memoranda report error:', err)
      res.status(500).json({ error: 'فشل جلب تقريرالمذكرات' })
    }
  }
)

reportsRouter.get(
  '/memoranda/:id',
  requirePermission('view_documents'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const result = await query(
        `SELECT m.*, c.case_number, cl.name as client_name, cl.id as client_id
       FROM memoranda m
       LEFT JOIN cases c ON m.case_id = c.id
       LEFT JOIN clients cl ON c.client_id = cl.id
       WHERE m.id = $1 AND m.company_id = $2`,
        [req.params.id, companyId]
      )
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'المذكرة غير موجودة' })
        return
      }
      res.json(result.rows[0])
    } catch (err) {
      console.error('[REPORTS] memorandum detail error:', err)
      res.status(500).json({ error: 'فشل جلب تفاصيل المذكرة' })
    }
  }
)

reportsRouter.get(
  '/documents',
  requirePermission('view_documents'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { linkType, parentId, from, to, page = '1', pageSize = '25' } = req.query
      const limit = parseInt(pageSize as string)
      const offset = (parseInt(page as string) - 1) * limit

      let countSql = 'SELECT COUNT(*) FROM documents_v2 WHERE company_id = $1'
      let sql = 'SELECT * FROM documents_v2 WHERE company_id = $1'
      const params: any[] = [companyId]
      let idx = 2
      if (linkType) {
        countSql += ` AND link_type = $${idx}`
        sql += ` AND link_type = $${idx}`
        params.push(linkType)
        idx++
      }
      if (parentId) {
        if (linkType === 'case') {
          countSql += ` AND case_id = $${idx}`
          sql += ` AND case_id = $${idx}`
          params.push(parentId)
          idx++
        } else if (linkType === 'task') {
          countSql += ` AND task_id = $${idx}`
          sql += ` AND task_id = $${idx}`
          params.push(parentId)
          idx++
        } else if (linkType === 'session') {
          countSql += ` AND session_id = $${idx}`
          sql += ` AND session_id = $${idx}`
          params.push(parentId)
          idx++
        }
      }
      if (from) {
        countSql += ` AND created_at >= $${idx}`
        sql += ` AND created_at >= $${idx}`
        params.push(from)
        idx++
      }
      if (to) {
        countSql += ` AND created_at <= $${idx}`
        sql += ` AND created_at <= $${idx}`
        params.push(to)
        idx++
      }
      sql += ` ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`

      const countRes = await query(countSql, params)
      const totalRows = parseInt(countRes.rows[0].count)

      const dataRes = await query(sql, [...params, limit, offset])
      res.json({
        rows: dataRes.rows,
        pageInfo: {
          page: parseInt(page as string),
          pageSize: limit,
          totalRows
        }
      })
    } catch (err) {
      console.error('[REPORTS] documents report error:', err)
      res.status(500).json({ error: 'فشل جلب تقرير المستندات' })
    }
  }
)

reportsRouter.get(
  '/sessions-list',
  requirePermission('view_sessions'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { caseId } = req.query
      let sql = 'SELECT * FROM sessions WHERE company_id = $1'
      const params: any[] = [companyId]
      if (caseId) {
        sql += ' AND case_id = $2'
        params.push(caseId)
      }
      sql += ' ORDER BY date DESC, time DESC'
      const result = await query(sql, params)
      res.json(result.rows)
    } catch (err) {
      console.error('[REPORTS] sessions-list error:', err)
      res.status(500).json({ error: 'فشل جلب قائمة الجلسات' })
    }
  }
)

reportsRouter.get(
  '/tasks-list',
  requirePermission('view_tasks'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { caseId } = req.query
      let sql = 'SELECT * FROM tasks_v2 WHERE company_id = $1'
      const params: any[] = [companyId]
      if (caseId) {
        sql += ' AND case_id = $2'
        params.push(caseId)
      }
      sql += ' ORDER BY created_at DESC'
      const result = await query(sql, params)
      res.json(result.rows)
    } catch (err) {
      console.error('[REPORTS] tasks-list error:', err)
      res.status(500).json({ error: 'فشل جلب قائمة المهام' })
    }
  }
)

reportsRouter.get(
  '/legal-services',
  requirePermission('export_reports'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const {
        clientId,
        caseId,
        lawyerId,
        fromDate,
        toDate,
        groupBy,
        category_id,
        status_id,
        priority_id,
        q,
        page = '1',
        pageSize = '500'
      } = req.query

      const limit = parseInt(pageSize as string)
      const offset = (parseInt(page as string) - 1) * limit

      // Build WHERE clause
      let whereSql = ' WHERE e.company_id = $1 AND e.deleted_at IS NULL'
      const params: any[] = [companyId]
      let paramIndex = 2

      if (clientId) {
        whereSql += ` AND e.client_id = $${paramIndex++}`
        params.push(clientId)
      }
      if (caseId) {
        whereSql += ` AND e.case_id = $${paramIndex++}`
        params.push(caseId)
      }
      if (lawyerId) {
        whereSql += ` AND e.responsible_lawyer_id = $${paramIndex++}`
        params.push(lawyerId)
      }
      if (fromDate) {
        whereSql += ` AND e.start_date >= $${paramIndex++}`
        params.push(fromDate)
      }
      if (toDate) {
        whereSql += ` AND e.start_date <= $${paramIndex++}`
        params.push(toDate)
      }
      if (category_id && category_id !== 'الكل') {
        whereSql += ` AND e.category_id = $${paramIndex++}`
        params.push(category_id)
      }
      if (status_id && status_id !== 'الكل') {
        whereSql += ` AND e.status_id = $${paramIndex++}`
        params.push(status_id)
      }
      if (priority_id && priority_id !== 'الكل') {
        whereSql += ` AND e.priority_id = $${paramIndex++}`
        params.push(priority_id)
      }
      if (q) {
        whereSql += ` AND (e.engagement_number ILIKE $${paramIndex} OR e.description ILIKE $${paramIndex} OR e.purpose ILIKE $${paramIndex})`
        params.push(`%${q}%`)
        paramIndex++
      }

      const joinSql = `
        FROM legal_engagements e
        LEFT JOIN legal_service_categories c ON e.category_id = c.id
        LEFT JOIN legal_service_types t ON e.engagement_type_id = t.id
        LEFT JOIN legal_service_statuses s ON e.status_id = s.id
        LEFT JOIN legal_service_priorities p ON e.priority_id = p.id
        LEFT JOIN clients cl ON e.client_id = cl.id
        LEFT JOIN employees emp ON e.responsible_lawyer_id = emp.id
        LEFT JOIN cases ca ON e.case_id = ca.id
        LEFT JOIN invoices inv ON e.invoice_id = inv.id
      `

      // Get total count
      const countResult = await query(`SELECT COUNT(*) ${joinSql} ${whereSql}`, params)
      const totalRows = parseInt(countResult.rows[0].count)

      // Get grouped data if groupBy is specified
      let groupResult = null
      if (groupBy) {
        let groupSelect: string
        let groupField: string
        switch (groupBy) {
          case 'lawyer':
            groupSelect = `COALESCE(emp.name, 'غير معين') as group_name, emp.id as group_id`
            groupField = `emp.name`
            break
          case 'client':
            groupSelect = `cl.name as group_name, cl.id as group_id`
            groupField = `cl.name`
            break
          case 'category':
            groupSelect = `c.name_ar as group_name, c.id as group_id`
            groupField = `c.name_ar`
            break
          case 'case':
            groupSelect = `COALESCE(ca.case_number, 'بدون قضية') as group_name, ca.id as group_id`
            groupField = `ca.case_number`
            break
          case 'month':
            groupSelect = `TO_CHAR(e.start_date, 'YYYY-MM') as group_name, TO_CHAR(e.start_date, 'YYYY-MM') as group_id`
            groupField = `TO_CHAR(e.start_date, 'YYYY-MM')`
            break
          case 'year':
            groupSelect = `TO_CHAR(e.start_date, 'YYYY') as group_name, TO_CHAR(e.start_date, 'YYYY') as group_id`
            groupField = `TO_CHAR(e.start_date, 'YYYY')`
            break
          default:
            groupSelect = 'NULL as group_name, NULL as group_id'
            groupField = 'NULL'
        }

        const groupSql = `
          SELECT ${groupSelect},
            COUNT(*) as service_count,
            COALESCE(SUM(e.financial_compensation), 0) as total_compensation,
            COALESCE(SUM(e.paid_amount), 0) as total_paid,
            COALESCE(SUM(e.remaining_amount), 0) as total_remaining,
            COALESCE(SUM(e.tax), 0) as total_tax
          ${joinSql} ${whereSql}
          GROUP BY ${groupField}
          ORDER BY service_count DESC
        `
        groupResult = await query(groupSql, params)
      }

      // Get paginated detailed data
      const selectSql = `
        SELECT e.*,
          c.name_ar as category_name,
          t.name_ar as service_type_name,
          s.status_name_ar as status_name,
          s.color as status_color,
          p.priority_name_ar as priority_name,
          p.color as priority_color,
          cl.name as client_name,
          COALESCE(emp.name, 'غير معين') as responsible_name,
          ca.case_number as linked_case_number,
          inv.invoice_number
      `

      const dataSql = `${selectSql} ${joinSql} ${whereSql} ORDER BY e.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
      const dataResult = await query(dataSql, [...params, limit, offset])

      // Status distribution for charts
      const statusDistSql = `
        SELECT s.status_name_ar, s.color, COUNT(*) as count
        ${joinSql} ${whereSql}
        GROUP BY s.status_name_ar, s.color
        ORDER BY count DESC
      `
      const statusDist = await query(statusDistSql, params)

      // Category distribution for charts
      const catDistSql = `
        SELECT c.name_ar, COUNT(*) as count,
          COALESCE(SUM(e.financial_compensation), 0) as total_amount
        ${joinSql} ${whereSql}
        GROUP BY c.name_ar
        ORDER BY count DESC
      `
      const catDist = await query(catDistSql, params)

      // Lawyer distribution for charts
      const lawyerDistSql = `
        SELECT COALESCE(emp.name, 'غير معين') as name, COUNT(*) as count,
          COALESCE(SUM(e.financial_compensation), 0) as total_amount,
          COALESCE(SUM(e.paid_amount), 0) as total_paid
        ${joinSql} ${whereSql}
        GROUP BY emp.name
        ORDER BY count DESC
      `
      const lawyerDist = await query(lawyerDistSql, params)

      // Summary stats from ALL matching rows (not just paginated page)
      const summarySql = `
        SELECT
          COUNT(*) as total_services,
          COALESCE(SUM(e.financial_compensation), 0) as total_revenue,
          COALESCE(SUM(e.paid_amount), 0) as total_paid,
          COALESCE(SUM(e.remaining_amount), 0) as total_remaining,
          COUNT(*) FILTER (WHERE e.status_id = 'status_completed') as completed_count,
          COUNT(*) FILTER (WHERE e.status_id = 'status_in_progress') as in_progress_count
        ${joinSql} ${whereSql}
      `
      const summaryResult = await query(summarySql, params)
      const s = summaryResult.rows[0]

      const totalServices = parseInt(s.total_services)
      const totalRevenue = parseFloat(s.total_revenue)
      const totalPaid = parseFloat(s.total_paid)
      const totalRemaining = parseFloat(s.total_remaining)
      const completedCount = parseInt(s.completed_count)
      const inProgressCount = parseInt(s.in_progress_count)

      res.json({
        services: dataResult.rows,
        pageInfo: {
          page: parseInt(page as string),
          pageSize: limit,
          totalRows
        },
        summary: {
          totalServices,
          totalRevenue,
          totalPaid,
          totalRemaining,
          completedCount,
          inProgressCount
        },
        distributions: {
          byStatus: statusDist.rows,
          byCategory: catDist.rows,
          byLawyer: lawyerDist.rows
        },
        groups: groupResult ? groupResult.rows : null
      })
    } catch (err) {
      console.error('[REPORTS] legal-services error:', err)
      res.status(500).json({ error: 'فشل جلب تقرير الخدمات القانونية' })
    }
  }
)

// Export legal services report as CSV
// Quick stats summary for dashboard KPI
reportsRouter.get(
  '/legal-services/stats',
  requirePermission('view_legal_services'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)

      const totalResult = await query(
        `
        SELECT
          COUNT(*) as total_services,
          COALESCE(SUM(financial_compensation), 0) as total_compensation,
          COALESCE(SUM(paid_amount), 0) as total_paid,
          COALESCE(SUM(remaining_amount), 0) as total_remaining,
          COUNT(*) FILTER (WHERE status_id = 'status_completed') as completed_count,
          COUNT(*) FILTER (WHERE status_id = 'status_in_progress') as in_progress_count,
          COUNT(*) FILTER (WHERE status_id = 'status_pending') as pending_count
        FROM legal_engagements
        WHERE company_id = $1 AND deleted_at IS NULL
      `,
        [companyId]
      )

      const monthlyResult = await query(
        `
        SELECT
          TO_CHAR(start_date, 'YYYY-MM') as month,
          COUNT(*) as count,
          COALESCE(SUM(financial_compensation), 0) as total_amount
        FROM legal_engagements
        WHERE company_id = $1 AND deleted_at IS NULL AND start_date IS NOT NULL
        GROUP BY TO_CHAR(start_date, 'YYYY-MM')
        ORDER BY month DESC
        LIMIT 12
      `,
        [companyId]
      )

      res.json({
        totals: totalResult.rows[0],
        monthly: monthlyResult.rows
      })
    } catch (err) {
      console.error('[REPORTS] legal-services stats error:', err)
      res.status(500).json({ error: 'فشل جلب إحصائيات الخدمات القانونية' })
    }
  }
)

reportsRouter.post(
  '/legal-services/export',
  requirePermission('export_reports'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { format, clientId, caseId, lawyerId, fromDate, toDate, category_id, status_id } =
        req.body

      let sql = `
        SELECT e.engagement_number, e.description, e.purpose,
          c.name_ar as category_name,
          t.name_ar as service_type_name,
          s.status_name_ar as status_name,
          p.priority_name_ar as priority_name,
          cl.name as client_name,
          COALESCE(emp.name, 'غير معين') as responsible_name,
          ca.case_number as linked_case_number,
          inv.invoice_number,
          e.financial_compensation, e.tax, e.paid_amount, e.remaining_amount,
          e.start_date, e.expected_end_date, e.completion_date,
          e.payment_method
        FROM legal_engagements e
        LEFT JOIN legal_service_categories c ON e.category_id = c.id
        LEFT JOIN legal_service_types t ON e.engagement_type_id = t.id
        LEFT JOIN legal_service_statuses s ON e.status_id = s.id
        LEFT JOIN legal_service_priorities p ON e.priority_id = p.id
        LEFT JOIN clients cl ON e.client_id = cl.id
        LEFT JOIN employees emp ON e.responsible_lawyer_id = emp.id
        LEFT JOIN cases ca ON e.case_id = ca.id
        LEFT JOIN invoices inv ON e.invoice_id = inv.id
        WHERE e.company_id = $1 AND e.deleted_at IS NULL
      `
      const params: any[] = [companyId]
      let paramIndex = 2

      if (clientId) {
        sql += ` AND e.client_id = $${paramIndex++}`
        params.push(clientId)
      }
      if (caseId) {
        sql += ` AND e.case_id = $${paramIndex++}`
        params.push(caseId)
      }
      if (lawyerId) {
        sql += ` AND e.responsible_lawyer_id = $${paramIndex++}`
        params.push(lawyerId)
      }
      if (fromDate) {
        sql += ` AND e.start_date >= $${paramIndex++}`
        params.push(fromDate)
      }
      if (toDate) {
        sql += ` AND e.start_date <= $${paramIndex++}`
        params.push(toDate)
      }
      if (category_id && category_id !== 'الكل') {
        sql += ` AND e.category_id = $${paramIndex++}`
        params.push(category_id)
      }
      if (status_id && status_id !== 'الكل') {
        sql += ` AND e.status_id = $${paramIndex++}`
        params.push(status_id)
      }

      sql += ' ORDER BY e.created_at DESC'

      const result = await query(sql, params)

      if (format === 'csv') {
        const headers = [
          'رقم الخدمة',
          'الوصف',
          'الغرض',
          'التصنيف',
          'نوع الخدمة',
          'الحالة',
          'الأولوية',
          'العميل',
          'المسؤول',
          'رقم القضية',
          'رقم الفاتورة',
          'المقابل المالي',
          'الضريبة',
          'المدفوع',
          'المتبقي',
          'تاريخ البداية',
          'تاريخ الانتهاء المتوقع',
          'تاريخ الإنجاز',
          'طريقة الدفع'
        ]

        const csvRows = [
          headers.join(','),
          ...result.rows.map((r: any) =>
            [
              r.engagement_number,
              r.description || '',
              r.purpose || '',
              r.category_name || '',
              r.service_type_name || '',
              r.status_name || '',
              r.priority_name || '',
              r.client_name || '',
              r.responsible_name || '',
              r.linked_case_number || '',
              r.invoice_number || '',
              r.financial_compensation || 0,
              r.tax || 0,
              r.paid_amount || 0,
              r.remaining_amount || 0,
              r.start_date || '',
              r.expected_end_date || '',
              r.completion_date || '',
              r.payment_method || ''
            ]
              .map((v) => `"${String(v).replace(/"/g, '""')}"`)
              .join(',')
          )
        ]

        const csv = '\uFEFF' + csvRows.join('\n')
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename="legal-services-report.csv"`)
        res.send(csv)
      } else {
        res.status(400).json({ error: 'الصيغة المطلوبة غير مدعومة. استخدم csv' })
      }
    } catch (err) {
      console.error('[REPORTS] legal-services export error:', err)
      res.status(500).json({ error: 'فشل تصدير تقرير الخدمات القانونية' })
    }
  }
)

reportsRouter.post(
  '/preview',
  requirePermission('export_reports'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { type, params } = req.body
      const html = await generateReportHtmlString(companyId, type, params || {}, false)
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.send(html)
    } catch (err) {
      console.error('[REPORTS] preview error:', err)
      res.status(500).json({ error: 'فشل جلب معاينة التقرير' })
    }
  }
)

// ============================================================
// Case Success Metrics & Judicial Performance Statistics
// ============================================================

reportsRouter.get(
  '/case-success-stats',
  requirePermission('export_reports'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { from, to, court, caseType, lawyerId, clientRole } = req.query

      const conditions: string[] = ['c.company_id = $1']
      const params: any[] = [companyId]

      if (from) {
        params.push(from)
        conditions.push(`c.registration_date >= $${params.length}`)
      }
      if (to) {
        params.push(to)
        conditions.push(`c.registration_date <= $${params.length}`)
      }
      if (court) {
        params.push(court)
        conditions.push(`c.court = $${params.length}`)
      }
      if (caseType) {
        params.push(caseType)
        conditions.push(`c.case_type = $${params.length}`)
      }
      if (lawyerId) {
        params.push(lawyerId)
        conditions.push(`c.responsible_user_id = $${params.length}`)
      }
      if (clientRole && clientRole !== 'الكل') {
        params.push(clientRole)
        conditions.push(`(c.client_role = $${params.length} OR (c.client_role ILIKE '%' || $${params.length} || '%'))`)
      }

      const whereClause = conditions.join(' AND ')

      const statsSql = `
        WITH latest_judgments AS (
          SELECT j1.case_id, j1.favor, j1.notes, j1.judgment_date
          FROM judgments j1
          INNER JOIN (
            SELECT case_id, MAX(judgment_date) as max_date
            FROM judgments
            WHERE company_id = $1
            GROUP BY case_id
          ) j2 ON j1.case_id = j2.case_id AND j1.judgment_date = j2.max_date
          WHERE j1.company_id = $1
          GROUP BY j1.case_id, j1.favor, j1.notes, j1.judgment_date
        ),
        effective_cases AS (
          SELECT 
            c.*,
            j.judgment_date,
            COALESCE(
              NULLIF(c.final_outcome, 'pending'),
              CASE 
                WHEN j.favor ILIKE '%ضد%' OR j.favor ILIKE '%خصم%' THEN 'lost'
                WHEN j.favor ILIKE '%جزئي%' OR j.favor ILIKE '%شبه كلي%' THEN 'partial_win'
                WHEN j.favor ILIKE '%صلح%' OR j.favor ILIKE '%تسوية%' THEN 'settled'
                WHEN j.favor ILIKE '%لصالح%' OR j.favor ILIKE '%للموكل%' OR (j.favor ILIKE '%الموكل%' AND j.favor NOT ILIKE '%ضد%')
                  THEN (CASE WHEN c.client_role ILIKE '%مدعى عليه%' OR c.client_role ILIKE '%مدعي عليه%' THEN 'dismissed' ELSE 'full_win' END)
                WHEN c.status IN ('منتهية', 'مغلقة', 'بانتظار التنفيذ', 'محكومة', 'محكومة بحكم نهائي')
                  THEN (CASE WHEN c.client_role ILIKE '%مدعى عليه%' OR c.client_role ILIKE '%مدعي عليه%' THEN 'dismissed' ELSE 'full_win' END)
                ELSE 'pending'
              END
            ) AS eff_outcome,
            COALESCE(NULLIF(c.claimed_amount, 0), c.contract_amount, 0) AS eff_claimed,
            COALESCE(
              NULLIF(c.awarded_amount, 0),
              CASE 
                WHEN j.favor ILIKE '%لصالح%' OR j.favor ILIKE '%للموكل%' OR c.status IN ('منتهية', 'مغلقة', 'بانتظار التنفيذ')
                  THEN COALESCE(NULLIF(c.claimed_amount, 0), c.contract_amount, 0)
                ELSE 0
              END
            ) AS eff_awarded
          FROM cases c
          LEFT JOIN latest_judgments j ON j.case_id = c.id
          WHERE ${whereClause}
        )
        SELECT 
          COUNT(*) as total_cases,
          COUNT(CASE WHEN eff_outcome = 'full_win' THEN 1 END) as full_win,
          COUNT(CASE WHEN eff_outcome = 'dismissed' THEN 1 END) as dismissed,
          COUNT(CASE WHEN eff_outcome = 'settled' THEN 1 END) as settled,
          COUNT(CASE WHEN eff_outcome = 'partial_win' THEN 1 END) as partial_win,
          COUNT(CASE WHEN eff_outcome = 'lost' THEN 1 END) as lost,
          COUNT(CASE WHEN eff_outcome = 'pending' OR eff_outcome IS NULL THEN 1 END) as pending,
          COALESCE(SUM(eff_claimed), 0) as total_claimed,
          COALESCE(SUM(eff_awarded), 0) as total_awarded,
          AVG(
            CASE 
              WHEN judgment_date IS NOT NULL AND registration_date IS NOT NULL 
              THEN (judgment_date - registration_date)
              ELSE NULL 
            END
          ) as avg_duration_days
        FROM effective_cases
      `

      const result = await query(statsSql, params)
      const r = result.rows[0]

      const fullWin = parseInt(r.full_win) || 0
      const dismissed = parseInt(r.dismissed) || 0
      const settled = parseInt(r.settled) || 0
      const partialWin = parseInt(r.partial_win) || 0
      const lost = parseInt(r.lost) || 0
      const pending = parseInt(r.pending) || 0
      const totalCases = parseInt(r.total_cases) || 0
      const closedCases = fullWin + dismissed + settled + partialWin + lost

      // Weighted success rate: Full Win & Dismissed = 100%, Settled = 75%, Partial = 50%
      const weightedSuccessPoints = fullWin + dismissed + settled * 0.75 + partialWin * 0.5
      const successRate = closedCases > 0 ? Math.round((weightedSuccessPoints / closedCases) * 1000) / 10 : 0
      const pureWinRate = closedCases > 0 ? Math.round(((fullWin + dismissed) / closedCases) * 1000) / 10 : 0

      const totalClaimed = parseFloat(r.total_claimed) || 0
      const totalAwarded = parseFloat(r.total_awarded) || 0
      const financialRecoveryRate = totalClaimed > 0 ? Math.round((totalAwarded / totalClaimed) * 1000) / 10 : 0
      const avgDurationDays = r.avg_duration_days ? Math.round(parseFloat(r.avg_duration_days)) : 0

      res.json({
        totalCases,
        closedCases,
        pendingCases: pending,
        fullWinCases: fullWin,
        dismissedCases: dismissed,
        settledCases: settled,
        partialWinCases: partialWin,
        lostCases: lost,
        successRate,
        pureWinRate,
        avgDurationDays,
        totalClaimedAmount: totalClaimed,
        totalAwardedAmount: totalAwarded,
        financialRecoveryRate
      })
    } catch (err) {
      console.error('[REPORTS] case-success-stats error:', err)
      res.status(500).json({ error: 'فشل جلب إحصائيات نجاح القضايا' })
    }
  }
)

reportsRouter.get(
  '/case-success-breakdown',
  requirePermission('export_reports'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { from, to, court } = req.query

      const conditions: string[] = ['c.company_id = $1']
      const params: any[] = [companyId]

      if (from) {
        params.push(from)
        conditions.push(`c.registration_date >= $${params.length}`)
      }
      if (to) {
        params.push(to)
        conditions.push(`c.registration_date <= $${params.length}`)
      }
      if (court) {
        params.push(court)
        conditions.push(`c.court = $${params.length}`)
      }

      const whereClause = conditions.join(' AND ')

      const baseCte = `
        WITH latest_judgments AS (
          SELECT j1.case_id, j1.favor, j1.notes, j1.judgment_date
          FROM judgments j1
          INNER JOIN (
            SELECT case_id, MAX(judgment_date) as max_date
            FROM judgments
            WHERE company_id = $1
            GROUP BY case_id
          ) j2 ON j1.case_id = j2.case_id AND j1.judgment_date = j2.max_date
          WHERE j1.company_id = $1
          GROUP BY j1.case_id, j1.favor, j1.notes, j1.judgment_date
        ),
        effective_cases AS (
          SELECT 
            c.*,
            j.judgment_date,
            COALESCE(
              NULLIF(c.final_outcome, 'pending'),
              CASE 
                WHEN j.favor ILIKE '%ضد%' OR j.favor ILIKE '%خصم%' THEN 'lost'
                WHEN j.favor ILIKE '%جزئي%' OR j.favor ILIKE '%شبه كلي%' THEN 'partial_win'
                WHEN j.favor ILIKE '%صلح%' OR j.favor ILIKE '%تسوية%' THEN 'settled'
                WHEN j.favor ILIKE '%لصالح%' OR j.favor ILIKE '%للموكل%' OR (j.favor ILIKE '%الموكل%' AND j.favor NOT ILIKE '%ضد%')
                  THEN (CASE WHEN c.client_role ILIKE '%مدعى عليه%' OR c.client_role ILIKE '%مدعي عليه%' THEN 'dismissed' ELSE 'full_win' END)
                WHEN c.status IN ('منتهية', 'مغلقة', 'بانتظار التنفيذ', 'محكومة', 'محكومة بحكم نهائي')
                  THEN (CASE WHEN c.client_role ILIKE '%مدعى عليه%' OR c.client_role ILIKE '%مدعي عليه%' THEN 'dismissed' ELSE 'full_win' END)
                ELSE 'pending'
              END
            ) AS eff_outcome
          FROM cases c
          LEFT JOIN latest_judgments j ON j.case_id = c.id
          WHERE ${whereClause}
        )
      `

      // 1. By Client Role
      const roleRes = await query(
        `${baseCte}
         SELECT 
           COALESCE(c.client_role, 'غير محدد') as role,
           COUNT(*) as total,
           COUNT(CASE WHEN eff_outcome IN ('full_win', 'dismissed') THEN 1 END) as pure_win,
           COUNT(CASE WHEN eff_outcome IN ('full_win', 'dismissed', 'settled', 'partial_win') THEN 1 END) as total_success,
           COUNT(CASE WHEN eff_outcome = 'lost' THEN 1 END) as lost
         FROM effective_cases c
         GROUP BY COALESCE(c.client_role, 'غير محدد')
         ORDER BY total DESC`,
        params
      )

      // 2. By Case Type
      const typeRes = await query(
        `${baseCte}
         SELECT 
           COALESCE(c.case_type, 'أخرى') as case_type,
           COUNT(*) as total,
           COUNT(CASE WHEN eff_outcome IN ('full_win', 'dismissed') THEN 1 END) as pure_win,
           COUNT(CASE WHEN eff_outcome IN ('full_win', 'dismissed', 'settled', 'partial_win') THEN 1 END) as total_success,
           COUNT(CASE WHEN eff_outcome = 'lost' THEN 1 END) as lost
         FROM effective_cases c
         GROUP BY COALESCE(c.case_type, 'أخرى')
         ORDER BY total DESC`,
        params
      )

      // 3. By Lawyer
      const lawyerRes = await query(
        `${baseCte}
         SELECT 
           COALESCE(u.full_name, u.username, 'غير مسند') as lawyer_name,
           c.responsible_user_id as lawyer_id,
           COUNT(*) as total,
           COUNT(CASE WHEN eff_outcome IN ('full_win', 'dismissed') THEN 1 END) as pure_win,
           COUNT(CASE WHEN eff_outcome IN ('full_win', 'dismissed', 'settled', 'partial_win') THEN 1 END) as total_success,
           COUNT(CASE WHEN eff_outcome = 'lost' THEN 1 END) as lost
         FROM effective_cases c
         LEFT JOIN users u ON u.id = c.responsible_user_id
         GROUP BY c.responsible_user_id, COALESCE(u.full_name, u.username, 'غير مسند')
         ORDER BY total DESC`,
        params
      )

      // 4. By Quarter (Time Trend)
      const trendRes = await query(
        `${baseCte}
         SELECT 
           TO_CHAR(COALESCE(c.judgment_date, c.registration_date), 'YYYY-"Q"Q') as period,
           COUNT(*) as total,
           COUNT(CASE WHEN eff_outcome IN ('full_win', 'dismissed') THEN 1 END) as pure_win,
           COUNT(CASE WHEN eff_outcome IN ('full_win', 'dismissed', 'settled', 'partial_win') THEN 1 END) as total_success
         FROM effective_cases c
         WHERE eff_outcome != 'pending' OR c.status IN ('منتهية', 'مغلقة', 'محكومة', 'محكومة بحكم نهائي')
         GROUP BY TO_CHAR(COALESCE(c.judgment_date, c.registration_date), 'YYYY-"Q"Q')
         ORDER BY period ASC`,
        params
      )

      res.json({
        byClientRole: roleRes.rows,
        byCaseType: typeRes.rows,
        byLawyer: lawyerRes.rows,
        byQuarter: trendRes.rows
      })
    } catch (err) {
      console.error('[REPORTS] case-success-breakdown error:', err)
      res.status(500).json({ error: 'فشل جلب تفاصيل نجاح القضايا' })
    }
  }
)

reportsRouter.get(
  '/case-failure-analysis',
  requirePermission('export_reports'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { from, to } = req.query

      const conditions: string[] = ['c.company_id = $1']
      const params: any[] = [companyId]

      if (from) {
        params.push(from)
        conditions.push(`c.registration_date >= $${params.length}`)
      }
      if (to) {
        params.push(to)
        conditions.push(`c.registration_date <= $${params.length}`)
      }

      const whereClause = conditions.join(' AND ')

      const failureSql = `
        WITH latest_judgments AS (
          SELECT j1.case_id, j1.favor, j1.notes, j1.judgment_date
          FROM judgments j1
          INNER JOIN (
            SELECT case_id, MAX(judgment_date) as max_date
            FROM judgments
            WHERE company_id = $1
            GROUP BY case_id
          ) j2 ON j1.case_id = j2.case_id AND j1.judgment_date = j2.max_date
          WHERE j1.company_id = $1
          GROUP BY j1.case_id, j1.favor, j1.notes, j1.judgment_date
        ),
        effective_cases AS (
          SELECT 
            c.*,
            COALESCE(
              NULLIF(c.final_outcome, 'pending'),
              CASE 
                WHEN j.favor ILIKE '%ضد%' OR j.favor ILIKE '%خصم%' THEN 'lost'
                WHEN j.favor ILIKE '%جزئي%' OR j.favor ILIKE '%شبه كلي%' THEN 'partial_win'
                WHEN j.favor ILIKE '%صلح%' OR j.favor ILIKE '%تسوية%' THEN 'settled'
                WHEN j.favor ILIKE '%لصالح%' OR j.favor ILIKE '%للموكل%' OR (j.favor ILIKE '%الموكل%' AND j.favor NOT ILIKE '%ضد%')
                  THEN (CASE WHEN c.client_role ILIKE '%مدعى عليه%' OR c.client_role ILIKE '%مدعي عليه%' THEN 'dismissed' ELSE 'full_win' END)
                WHEN c.status IN ('منتهية', 'مغلقة', 'بانتظار التنفيذ', 'محكومة', 'محكومة بحكم نهائي')
                  THEN (CASE WHEN c.client_role ILIKE '%مدعى عليه%' OR c.client_role ILIKE '%مدعي عليه%' THEN 'dismissed' ELSE 'full_win' END)
                ELSE 'pending'
              END
            ) AS eff_outcome,
            COALESCE(NULLIF(TRIM(c.failure_reason), ''), NULLIF(TRIM(j.notes), ''), 'أسباب موضوعية / حكم ضد الموكل') AS eff_failure_reason
          FROM cases c
          LEFT JOIN latest_judgments j ON j.case_id = c.id
          WHERE ${whereClause}
        )
        SELECT 
          COALESCE(NULLIF(TRIM(eff_failure_reason), ''), 'أسباب موضوعية / أخرى') as reason,
          COUNT(*) as count,
          ROUND((COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER(), 0)), 1) as percentage
        FROM effective_cases
        WHERE eff_outcome = 'lost'
        GROUP BY COALESCE(NULLIF(TRIM(eff_failure_reason), ''), 'أسباب موضوعية / أخرى')
        ORDER BY count DESC
      `

      const result = await query(failureSql, params)
      res.json({
        totalLostCases: result.rows.reduce((acc: number, r: any) => acc + parseInt(r.count), 0),
        reasons: result.rows
      })
    } catch (err) {
      console.error('[REPORTS] case-failure-analysis error:', err)
      res.status(500).json({ error: 'فشل جلب تحليل أسباب الإخفاق' })
    }
  }
)

// ═══════════════════════════════════════════════════════════════
// 1. تقرير الأحكام والقرارات القضائية (Judgments Report)
// ═══════════════════════════════════════════════════════════════
reportsRouter.get(
  '/judgments',
  requirePermission('export_reports'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const {
        page = '1',
        pageSize = '50',
        caseId,
        clientId,
        lawyerId,
        favor,
        judgmentType,
        from,
        to,
        q
      } = req.query

      const limit = Math.min(Math.max(parseInt(pageSize as string) || 50, 1), 500)
      const offset = (Math.max(parseInt(page as string) || 1, 1) - 1) * limit

      let whereSql = 'WHERE j.company_id = $1'
      const params: any[] = [companyId]
      let paramIndex = 2

      if (caseId) {
        whereSql += ` AND j.case_id = $${paramIndex++}`
        params.push(caseId)
      }
      if (clientId) {
        whereSql += ` AND c.client_id = $${paramIndex++}`
        params.push(clientId)
      }
      if (lawyerId) {
        whereSql += ` AND (c.responsible_lawyer_id = $${paramIndex} OR c.assigned_lawyer_id = $${paramIndex})`
        params.push(lawyerId)
        paramIndex++
      }
      if (favor) {
        whereSql += ` AND (j.favor = $${paramIndex} OR j.favor ILIKE $${paramIndex})`
        params.push(`%${favor}%`)
        paramIndex++
      }
      if (judgmentType) {
        whereSql += ` AND (j.type = $${paramIndex} OR j.judgment_type = $${paramIndex})`
        params.push(judgmentType)
        paramIndex++
      }
      if (from) {
        whereSql += ` AND j.judgment_date >= $${paramIndex++}`
        params.push(from)
      }
      if (to) {
        whereSql += ` AND j.judgment_date <= $${paramIndex++}`
        params.push(to)
      }
      if (q) {
        whereSql += ` AND (j.judgment_number ILIKE $${paramIndex} OR c.case_number ILIKE $${paramIndex} OR cl.name ILIKE $${paramIndex} OR c.court ILIKE $${paramIndex})`
        params.push(`%${q}%`)
        paramIndex++
      }

      const querySql = `
        SELECT
          j.*,
          COALESCE(j.type, j.judgment_type) as type,
          COALESCE(j.favor, 'غير محدد') as favor,
          c.case_number,
          c.case_type,
          c.court,
          c.client_role,
          c.opponent_name,
          cl.name as client_name
        FROM judgments j
        JOIN cases c ON j.case_id = c.id
        LEFT JOIN clients cl ON c.client_id = cl.id
        ${whereSql}
        ORDER BY j.judgment_date DESC, j.created_at DESC, j.id DESC
      `
      const rowsRes = await query(querySql, params)
      const rawRows = rowsRes.rows

      const sanitizeDeedNumber = (val: any) => {
        if (!val) return { isRegistered: false, display: 'غير مسجل', raw: '' }
        const s = String(val).trim()
        if (!s || s === '---' || s === '-' || s === 'غير مسجل' || s === 'غير محدد' || /^0+$/.test(s)) {
          return { isRegistered: false, display: 'غير مسجل', raw: s }
        }
        return { isRegistered: true, display: s, raw: s }
      }

      const normalizeStage = (t: string) => {
        const s = String(t || '').trim()
        if (s.includes('ابتدائي')) return 'ابتدائي'
        if (s.includes('استئناف')) return 'استئناف'
        if (s.includes('عليا') || s.includes('تمييز')) return 'عليا'
        if (s.includes('قطعي') || s.includes('نهائي')) return 'قطعي'
        return s || 'غير محدد'
      }

      for (const r of rawRows) {
        const deed = sanitizeDeedNumber(r.judgment_number)
        r.deed_info = deed
        r.display_judgment_number = deed.display
        r.is_deed_registered = deed.isRegistered
        r.normalized_stage = normalizeStage(r.type)

        let plaintiffName = r.client_role === 'مدعى عليه' ? r.opponent_name || 'غير محدد' : r.client_name || 'غير محدد'
        let defendantName = r.client_role === 'مدعى عليه' ? r.client_name || 'غير محدد' : r.opponent_name || 'غير محدد'
        r.plaintiff_name = plaintiffName
        r.defendant_name = defendantName

        if (!r.objection_deadline) {
          r.display_objection_deadline = r.normalized_stage === 'قطعي' ? 'حكم قطعي / نهائي' : 'غير محدد'
        } else {
          r.display_objection_deadline = r.objection_deadline
        }
      }

      // Conservative Deduplication: group by (case_id, judgment_date, normalized_stage)
      const groups = new Map<string, any[]>()
      for (const r of rawRows) {
        const gKey = `${r.case_id}__${r.judgment_date || ''}__${r.normalized_stage}`
        if (!groups.has(gKey)) groups.set(gKey, [])
        groups.get(gKey)!.push(r)
      }

      const uniqueRows: any[] = []
      const excludedDuplicates: any[] = []

      for (const [_, gList] of groups.entries()) {
        if (gList.length === 1) {
          uniqueRows.push(gList[0])
        } else {
          gList.sort((a, b) => {
            if (a.is_deed_registered && !b.is_deed_registered) return -1
            if (!a.is_deed_registered && b.is_deed_registered) return 1
            const timeA = new Date(a.created_at || a.judgment_date || 0).getTime()
            const timeB = new Date(b.created_at || b.judgment_date || 0).getTime()
            return timeB - timeA
          })
          uniqueRows.push(gList[0])
          for (let i = 1; i < gList.length; i++) {
            excludedDuplicates.push({
              duplicateId: gList[i].id,
              primaryId: gList[0].id,
              caseNumber: gList[i].case_number,
              judgmentDate: gList[i].judgment_date,
              stage: gList[i].normalized_stage,
              reason: 'تطابق في القضية والتاريخ والمرحلة القضائية'
            })
          }
        }
      }

      uniqueRows.sort((a, b) => {
        const cmpDate = String(b.judgment_date || '').localeCompare(String(a.judgment_date || ''))
        if (cmpDate !== 0) return cmpDate
        return String(b.created_at || '').localeCompare(String(a.created_at || ''))
      })

      // KPIs
      const uniqueCaseIds = new Set(uniqueRows.map((r) => r.case_id))
      const preliminaryCount = uniqueRows.filter((r) => r.normalized_stage === 'ابتدائي').length
      const appealCount = uniqueRows.filter((r) => r.normalized_stage === 'استئناف').length
      const finalCount = uniqueRows.filter((r) => r.normalized_stage === 'قطعي' || r.normalized_stage.includes('نهائي')).length
      const otherStagesCount = uniqueRows.length - (preliminaryCount + appealCount + finalCount)
      const unregisteredDeedsCount = uniqueRows.filter((r) => !r.is_deed_registered).length

      const inFavor = uniqueRows.filter((r) => r.favor?.includes('لصالح') || r.favor?.includes('للموكل') || r.favor?.includes('كلي')).length
      const against = uniqueRows.filter((r) => r.favor?.includes('ضد') || r.favor?.includes('خصم')).length
      const settlement = uniqueRows.filter((r) => r.favor?.includes('صلح') || r.favor?.includes('تسوية')).length
      const partial = uniqueRows.filter((r) => r.favor?.includes('شبه') || r.favor?.includes('جزئي')).length
      const unassigned = uniqueRows.filter((r) => !r.favor || r.favor === 'غير محدد').length
      const decided = inFavor + against
      const winRate = decided > 0 ? Math.round((inFavor / decided) * 100) : 0

      // Analytical summary: court & case type distributions
      const courtCounts: Record<string, number> = {}
      for (const r of uniqueRows) {
        const c = r.court || 'غير محدد'
        courtCounts[c] = (courtCounts[c] || 0) + 1
      }
      const byCourt = Object.entries(courtCounts)
        .map(([court, count]) => ({
          court,
          count,
          percentage: Math.round((count / (uniqueRows.length || 1)) * 100)
        }))
        .sort((a, b) => b.count - a.count)

      const caseTypeCounts: Record<string, number> = {}
      for (const r of uniqueRows) {
        const ct = r.case_type || 'أخرى'
        caseTypeCounts[ct] = (caseTypeCounts[ct] || 0) + 1
      }
      const byCaseType = Object.entries(caseTypeCounts)
        .map(([caseType, count]) => ({
          caseType,
          count,
          percentage: Math.round((count / (uniqueRows.length || 1)) * 100)
        }))
        .sort((a, b) => b.count - a.count)

      // Case Groups (by_case mode)
      const caseJudgmentMap = new Map<string, any[]>()
      for (const r of uniqueRows) {
        if (!caseJudgmentMap.has(r.case_id)) caseJudgmentMap.set(r.case_id, [])
        caseJudgmentMap.get(r.case_id)!.push(r)
      }

      const multiJudgmentCases: any[] = []
      const caseGroups: any[] = []

      for (const [cId, jList] of caseJudgmentMap.entries()) {
        jList.sort((a, b) => String(a.judgment_date || '').localeCompare(String(b.judgment_date || '')))
        const base = jList[0]
        const latest = jList[jList.length - 1]

        const caseObj = {
          case_id: cId,
          case_number: base.case_number,
          court: base.court,
          case_type: base.case_type,
          client_name: base.client_name,
          plaintiff_name: base.plaintiff_name,
          defendant_name: base.defendant_name,
          judgments_count: jList.length,
          latest_judgment_date: latest.judgment_date,
          latest_favor: latest.favor,
          latest_stage: latest.normalized_stage,
          is_multi_stage: jList.length > 1,
          timeline: jList.map((j) => ({
            id: j.id,
            stage: j.normalized_stage,
            raw_type: j.type,
            judgment_date: j.judgment_date,
            judgment_date_hijri: j.judgment_date_hijri,
            display_judgment_number: j.display_judgment_number,
            is_deed_registered: j.is_deed_registered,
            favor: j.favor,
            objection_deadline: j.display_objection_deadline,
            notes: j.notes
          }))
        }

        caseGroups.push(caseObj)
        if (jList.length > 1) {
          multiJudgmentCases.push({
            caseNumber: base.case_number,
            court: base.court,
            judgmentsCount: jList.length,
            stages: jList.map((j) => j.normalized_stage).join(' ← ')
          })
        }
      }

      caseGroups.sort((a, b) => String(b.latest_judgment_date || '').localeCompare(String(a.latest_judgment_date || '')))

      const viewMode = req.query.viewMode === 'by_case' ? 'by_case' : 'by_judgment'
      let pagedRows: any[] = []
      let pagedCaseGroups: any[] = []
      let totalItems = 0

      if (viewMode === 'by_case') {
        totalItems = caseGroups.length
        pagedCaseGroups = caseGroups.slice(offset, offset + limit)
        pagedRows = pagedCaseGroups
      } else {
        totalItems = uniqueRows.length
        pagedRows = uniqueRows.slice(offset, offset + limit)
      }

      res.json({
        viewMode,
        rows: pagedRows,
        caseGroups: pagedCaseGroups,
        allUniqueRows: uniqueRows,
        allCaseGroups: caseGroups,
        pageInfo: {
          page: Math.max(parseInt(page as string) || 1, 1),
          pageSize: limit,
          totalRows: totalItems,
          uniqueJudgmentsTotal: uniqueRows.length,
          uniqueCasesTotal: uniqueCaseIds.size,
          rawRecordsTotal: rawRows.length
        },
        stats: {
          total: uniqueRows.length,
          rawTotal: rawRows.length,
          uniqueCases: uniqueCaseIds.size,
          preliminaryCount,
          appealCount,
          finalCount,
          otherStagesCount,
          excludedDuplicatesCount: excludedDuplicates.length,
          unregisteredDeedsCount,
          inFavor,
          against,
          settlement,
          partial,
          unassigned,
          winRate,
          byCourt: byCourt.slice(0, 8)
        },
        analyticalSummary: {
          casesByCourt: byCourt,
          casesByType: byCaseType,
          stagesDistribution: {
            preliminary: preliminaryCount,
            appeal: appealCount,
            final: finalCount,
            other: otherStagesCount
          },
          multiJudgmentCasesCount: multiJudgmentCases.length,
          multiJudgmentCasesList: multiJudgmentCases,
          unregisteredDeedsCount,
          deedComplianceRate:
            uniqueRows.length > 0
              ? Math.round(((uniqueRows.length - unregisteredDeedsCount) / uniqueRows.length) * 100)
              : 100
        }
      })
    } catch (err) {
      console.error('[REPORTS] judgments error:', err)
      res.status(500).json({ error: 'فشل جلب تقرير الأحكام القضائية' })
    }
  }
)

reportsRouter.get(
  '/judgments/stats',
  requirePermission('export_reports'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const statsSql = `
        SELECT
          COUNT(*) as total_judgments,
          COUNT(*) FILTER (WHERE j.favor ILIKE '%لصالحنا%' OR j.favor ILIKE '%لصالح الموكل%' OR j.favor ILIKE '%كلي%' OR j.favor ILIKE '%جزئي%') as favorable_judgments,
          COUNT(*) FILTER (WHERE j.favor ILIKE '%ضدنا%' OR j.favor ILIKE '%ضد الموكل%' OR j.favor ILIKE '%لصالح الخصم%') as unfavorable_judgments,
          COUNT(*) FILTER (WHERE j.is_executable = 1) as executable_judgments
        FROM judgments j
        WHERE j.company_id = $1
      `
      const statsRes = await query(statsSql, [companyId])
      const rawStats = statsRes.rows[0] || {}

      res.json({
        totalJudgments: parseInt(rawStats.total_judgments || '0', 10),
        favorableJudgments: parseInt(rawStats.favorable_judgments || '0', 10),
        unfavorableJudgments: parseInt(rawStats.unfavorable_judgments || '0', 10),
        executableJudgments: parseInt(rawStats.executable_judgments || '0', 10)
      })
    } catch (err) {
      console.error('[REPORTS] judgments stats error:', err)
      res.status(500).json({ error: 'فشل جلب إحصائيات الأحكام' })
    }
  }
)

// ═══════════════════════════════════════════════════════════════
// 2. كشف حساب الموكل الموحد (Unified Account Statement)
// ═══════════════════════════════════════════════════════════════
reportsRouter.get(
  ['/client-financial/:clientId', '/client-financial'],
  requirePermission('export_reports'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const clientId = (req.params.clientId || req.query.clientId || req.query.client_id) as string
      if (!clientId) {
        res.status(400).json({ error: 'معرف العميل مطلوب' })
        return
      }

      // Fetch client basic info
      const clientRes = await query('SELECT * FROM clients WHERE id = $1 AND company_id = $2', [clientId, companyId])
      if (clientRes.rows.length === 0) {
        res.status(404).json({ error: 'العميل غير موجود' })
        return
      }
      const client = clientRes.rows[0]

      // Fetch cases
      const casesRes = await query(
        `SELECT c.*, 
          COALESCE(c.total_fees, c.total_amount, 0) as total_fee,
          COALESCE(c.paid_amount, 0) as paid_amount,
          GREATEST(COALESCE(c.total_fees, c.total_amount, 0) - COALESCE(c.paid_amount, 0), 0) as remaining
         FROM cases c
         WHERE c.client_id = $1 AND c.company_id = $2 AND c.deleted_at IS NULL
         ORDER BY c.created_at DESC`,
        [clientId, companyId]
      )

      // Fetch services / engagements
      const servicesRes = await query(
        `SELECT e.*,
          t.name as service_type_name,
          cat.name as category_name,
          u.full_name as responsible_name,
          (e.financial_compensation + e.tax + COALESCE(e.late_fee_amount, 0)) as total_amount,
          e.paid_amount,
          GREATEST(e.financial_compensation + e.tax + COALESCE(e.late_fee_amount, 0) - e.paid_amount, 0) as remaining_amount
         FROM legal_engagements e
         LEFT JOIN legal_service_types t ON e.engagement_type_id = t.id
         LEFT JOIN legal_service_categories cat ON e.category_id = cat.id
         LEFT JOIN users u ON e.responsible_lawyer_id = u.id
         WHERE e.client_id = $1 AND e.company_id = $2 AND e.deleted_at IS NULL
         ORDER BY e.created_at DESC`,
        [clientId, companyId]
      )

      // Fetch payments
      const paymentsRes = await query(
        `SELECT p.*, e.engagement_number
         FROM payments p
         LEFT JOIN legal_engagements e ON p.legal_engagement_id = e.id
         WHERE (p.client_id = $1 OR e.client_id = $1) AND p.company_id = $2
         ORDER BY p.payment_date DESC`,
        [clientId, companyId]
      )

      // Fetch invoices
      const invoicesRes = await query(
        `SELECT i.* FROM invoices i
         WHERE i.client_id = $1 AND i.company_id = $2
         ORDER BY i.created_at DESC`,
        [clientId, companyId]
      )

      // Fetch vouchers
      const vouchersRes = await query(
        `SELECT v.* FROM payment_vouchers v
         WHERE v.client_id = $1 AND v.company_id = $2
         ORDER BY v.created_at DESC`,
        [clientId, companyId]
      )

      // Fetch installments / payment schedules
      const installmentsRes = await query(
        `SELECT ps.*, e.engagement_number
         FROM payment_schedules ps
         JOIN legal_engagements e ON ps.legal_engagement_id = e.id
         WHERE e.client_id = $1 AND ps.company_id = $2
         ORDER BY ps.due_date ASC`,
        [clientId, companyId]
      )

      // First deal date
      const firstDealDate = casesRes.rows[casesRes.rows.length - 1]?.created_at ||
        servicesRes.rows[servicesRes.rows.length - 1]?.start_date ||
        client.created_at

      // Financial totals
      const totalInvoiced = invoicesRes.rows.reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0)
      const totalPaid = paymentsRes.rows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0)
      const totalBalance = Math.max(0, totalInvoiced - totalPaid)
      const overdueAmount = installmentsRes.rows
        .filter((i: any) => i.status !== 'paid' && i.due_date && new Date(i.due_date) < new Date())
        .reduce((s: number, r: any) => s + (Number(r.amount || 0) - Number(r.paid_amount || 0)), 0)

      res.json({
        client,
        first_deal_date: firstDealDate,
        summary: {
          total_invoiced: totalInvoiced,
          total_paid: totalPaid,
          balance: totalBalance,
          overdue_amount: overdueAmount,
          cases_count: casesRes.rows.length,
          services_count: servicesRes.rows.length,
          active_installments: installmentsRes.rows.filter((i: any) => i.status !== 'paid').length
        },
        cases: casesRes.rows,
        services: servicesRes.rows,
        payments: paymentsRes.rows,
        invoices: invoicesRes.rows,
        vouchers: vouchersRes.rows,
        installments: installmentsRes.rows
      })
    } catch (err) {
      console.error('[REPORTS] client-financial error:', err)
      res.status(500).json({ error: 'فشل جلب كشف حساب الموكل الموحد' })
    }
  }
)

// ═══════════════════════════════════════════════════════════════
// 3. تقرير ميزانية وأعمال الشركاء (Partners Budget Report)
// ═══════════════════════════════════════════════════════════════
reportsRouter.get(
  '/partner-budget',
  requirePermission('export_reports'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const now = new Date()
      const month = parseInt((req.query.month as string) || String(now.getMonth() + 1), 10)
      const year = parseInt((req.query.year as string) || String(now.getFullYear()), 10)

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

      // 1. Actual Income (Payments collected this month)
      const incomeRes = await query(
        `SELECT COALESCE(SUM(amount), 0) as total_income
         FROM payments
         WHERE company_id = $1 AND payment_date >= $2 AND payment_date < $3`,
        [companyId, startDate, endDate]
      )
      const income = Number(incomeRes.rows[0]?.total_income || 0)

      // 2. Actual Expenses (Recorded expenses this month)
      const expenseRes = await query(
        `SELECT COALESCE(SUM(amount), 0) as total_expense
         FROM office_expenses
         WHERE company_id = $1 AND expense_date >= $2 AND expense_date < $3`,
        [companyId, startDate, endDate]
      )
      const expense = Number(expenseRes.rows[0]?.total_expense || 0)

      // 3. Planned Budget
      const budgetRes = await query(
        `SELECT 
          COALESCE(SUM(b.amount), 0) as total_budgeted
         FROM office_budgets b
         WHERE b.company_id = $1 AND b.month = $2 AND b.year = $3`,
        [companyId, month, year]
      )
      const budgeted = Number(budgetRes.rows[0]?.total_budgeted || 0)

      // 4. Categories Stats (Expenses vs Budget limit by category)
      const catStatsRes = await query(
        `SELECT 
          COALESCE(cat.id, 'uncategorized') as category_id,
          COALESCE(cat.name, 'مصروفات عامة') as category_name,
          COALESCE(b.amount, 0) as budget_limit,
          COALESCE(SUM(e.amount), 0) as actual_amount
         FROM office_expenses e
         LEFT JOIN expense_categories cat ON e.category_id = cat.id
         LEFT JOIN office_budgets b ON b.category_id = cat.id AND b.month = $2 AND b.year = $3 AND b.company_id = $1
         WHERE e.company_id = $1 AND e.expense_date >= $4 AND e.expense_date < $5
         GROUP BY cat.id, cat.name, b.amount`,
        [companyId, month, year, startDate, endDate]
      )
      const categoriesStats = catStatsRes.rows.map((r: any) => {
        const actual = Number(r.actual_amount || 0)
        const limit = Number(r.budget_limit || 0)
        const percent = limit > 0 ? Math.round((actual / limit) * 100) : (actual > 0 ? 100 : 0)
        return {
          category_id: r.category_id,
          category_name: r.category_name,
          actual_amount: actual,
          budget_limit: limit,
          percent
        }
      })

      // 5. Lawyer Contributions
      const lawyersRes = await query(
        `SELECT 
          u.id as lawyer_id,
          u.full_name as lawyer_name,
          COUNT(e.id) as works_count,
          COALESCE(SUM(e.financial_compensation + e.tax + COALESCE(e.late_fee_amount, 0)), 0) as total_contracts_amount,
          COALESCE(SUM(e.paid_amount), 0) as collected_amount
         FROM users u
         LEFT JOIN legal_engagements e ON (e.responsible_lawyer_id = u.id AND e.company_id = $1 AND e.start_date >= $2 AND e.start_date < $3)
         WHERE u.company_id = $1 AND u.role IN ('lawyer', 'consultant', 'partner', 'admin')
         GROUP BY u.id, u.full_name
         ORDER BY collected_amount DESC`,
        [companyId, startDate, endDate]
      )
      const totalCollected = lawyersRes.rows.reduce((s: number, r: any) => s + Number(r.collected_amount || 0), 0)
      const lawyer_contributions = lawyersRes.rows.map((r: any) => {
        const collected = Number(r.collected_amount || 0)
        const percent = totalCollected > 0 ? Math.round((collected / totalCollected) * 100) : 0
        return {
          lawyer_name: r.lawyer_name,
          works_count: parseInt(r.works_count, 10) || 0,
          total_contracts_amount: Number(r.total_contracts_amount || 0),
          collected_amount: collected,
          contribution_percentage: percent
        }
      })

      res.json({
        income,
        expense,
        budgeted,
        categoriesStats,
        lawyer_contributions
      })
    } catch (err) {
      console.error('[REPORTS] partner-budget error:', err)
      res.status(500).json({ error: 'فشل جلب تقرير ميزانية وأعمال الشركاء' })
    }
  }
)
