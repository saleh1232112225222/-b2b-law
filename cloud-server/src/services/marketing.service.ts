import { query } from '../db/connection'
import { sendEmail } from './notification'

const ADMIN_EMAIL = 'slaehmap@gmail.com'

async function checkTrialExpiry(): Promise<string[]> {
  const now = new Date()
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  const expiring = await query(
    `SELECT name, email, phone, trial_expires_at
     FROM companies
     WHERE is_verified = TRUE
       AND trial_expires_at IS NOT NULL
       AND trial_expires_at BETWEEN $1 AND $2
     ORDER BY trial_expires_at`,
    [now.toISOString(), threeDaysLater.toISOString()]
  )

  const expired = await query(
    `SELECT name, email, phone, trial_expires_at
     FROM companies
     WHERE is_verified = TRUE
       AND trial_expires_at IS NOT NULL
       AND trial_expires_at <= $1
     ORDER BY trial_expires_at DESC`,
    [now.toISOString()]
  )

  const lines: string[] = []

  if (expiring.rows.length > 0) {
    lines.push('<h3 style="color:#e9c349;">⚠️ مشتركين تنتهي تجربتهم خلال 3 أيام</h3>')
    lines.push('<table style="width:100%;border-collapse:collapse;font-size:14px;color:#fff;">')
    lines.push(
      '<tr style="background:rgba(233,195,73,0.15);"><th style="padding:8px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.1);">الاسم</th><th style="padding:8px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.1);">البريد</th><th style="padding:8px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.1);">ينتهي في</th></tr>'
    )
    for (const row of expiring.rows) {
      const d = new Date(row.trial_expires_at).toLocaleDateString('ar-SA')
      lines.push(
        `<tr><td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.05);">${row.name}</td><td style="padding:6px 8px;">${row.email}</td><td style="padding:6px 8px;">${d}</td></tr>`
      )
    }
    lines.push('</table>')
  }

  if (expired.rows.length > 0) {
    lines.push('<h3 style="color:#e74c3c;margin-top:24px;">🔴 مشتركين انتهت تجربتهم</h3>')
    lines.push('<table style="width:100%;border-collapse:collapse;font-size:14px;color:#fff;">')
    lines.push(
      '<tr style="background:rgba(231,76,60,0.15);"><th style="padding:8px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.1);">الاسم</th><th style="padding:8px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.1);">البريد</th><th style="padding:8px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.1);">انتهت في</th></tr>'
    )
    for (const row of expired.rows) {
      const d = new Date(row.trial_expires_at).toLocaleDateString('ar-SA')
      lines.push(
        `<tr><td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.05);">${row.name}</td><td style="padding:6px 8px;">${row.email}</td><td style="padding:6px 8px;">${d}</td></tr>`
      )
    }
    lines.push('</table>')
  }

  return lines
}

async function checkInactiveUsers(): Promise<string[]> {
  const intervals = [7, 14, 30]
  const lines: string[] = []

  for (const days of intervals) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const res = await query(
      `SELECT u.full_name, u.recovery_email, c.name AS company_name,
              GREATEST(u.last_login_at, u.created_at) AS last_active
       FROM users u
       JOIN companies c ON c.id = u.company_id
       WHERE u.is_active = TRUE
         AND (u.last_login_at IS NULL OR u.last_login_at < $1)
         AND u.created_at < $1
       ORDER BY last_active`,
      [cutoff]
    )

    if (res.rows.length > 0) {
      const color = days === 30 ? '#e74c3c' : days === 14 ? '#e9c349' : '#f39c12'
      lines.push(
        `<h3 style="color:${color};margin-top:24px;">😴 مستخدمين غير نشطين (${days}+ يوم)</h3>`
      )
      lines.push('<table style="width:100%;border-collapse:collapse;font-size:14px;color:#fff;">')
      lines.push(
        '<tr style="background:rgba(255,255,255,0.05);"><th style="padding:8px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.1);">المستخدم</th><th style="padding:8px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.1);">البريد</th><th style="padding:8px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.1);">الشركة</th><th style="padding:8px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.1);">آخر نشاط</th></tr>'
      )
      for (const row of res.rows) {
        const d = new Date(row.last_active).toLocaleDateString('ar-SA')
        lines.push(
          `<tr><td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.05);">${row.full_name}</td><td style="padding:6px 8px;">${row.recovery_email}</td><td style="padding:6px 8px;">${row.company_name}</td><td style="padding:6px 8px;">${d}</td></tr>`
        )
      }
      lines.push('</table>')
    }
  }

  return lines
}

async function getUsageStats(): Promise<string[]> {
  const res = await query(
    `SELECT
       c.name,
       c.email,
       c.phone,
       c.created_at,
       (SELECT COUNT(*) FROM sessions s WHERE s.company_id = c.id) AS session_count,
       (SELECT COUNT(*) FROM tasks_v2 t WHERE t.company_id = c.id) AS task_count,
       (SELECT COUNT(*) FROM cases ca WHERE ca.company_id = c.id) AS case_count,
       (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id) AS user_count
     FROM companies c
     WHERE c.is_verified = TRUE
     ORDER BY session_count DESC, task_count DESC`
  )

  const lines: string[] = [
    '<h3 style="color:#3498db;margin-top:24px;">📊 إحصائيات الاستخدام</h3>',
    '<table style="width:100%;border-collapse:collapse;font-size:13px;color:#fff;">',
    '<tr style="background:rgba(52,152,219,0.15);">',
    '<th style="padding:6px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.1);">#</th>',
    '<th style="padding:6px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.1);">الشركة</th>',
    '<th style="padding:6px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.1);">جلسات</th>',
    '<th style="padding:6px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.1);">مهام</th>',
    '<th style="padding:6px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.1);">قضايا</th>',
    '<th style="padding:6px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.1);">مستخدمين</th>',
    '<th style="padding:6px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.1);">مسجل منذ</th>',
    '</tr>'
  ]

  let i = 1
  for (const row of res.rows) {
    const d = new Date(row.created_at).toLocaleDateString('ar-SA')
    lines.push(
      `<tr><td style="padding:6px;border-bottom:1px solid rgba(255,255,255,0.05);color:rgba(255,255,255,0.5);">${i++}</td><td style="padding:6px;border-bottom:1px solid rgba(255,255,255,0.05);">${row.name}<br><small style="color:rgba(255,255,255,0.5);">${row.email}</small></td><td style="padding:6px;border-bottom:1px solid rgba(255,255,255,0.05);">${row.session_count}</td><td style="padding:6px;border-bottom:1px solid rgba(255,255,255,0.05);">${row.task_count}</td><td style="padding:6px;border-bottom:1px solid rgba(255,255,255,0.05);">${row.case_count}</td><td style="padding:6px;border-bottom:1px solid rgba(255,255,255,0.05);">${row.user_count}</td><td style="padding:6px;border-bottom:1px solid rgba(255,255,255,0.05);">${d}</td></tr>`
    )
  }

  lines.push('</table>')
  return lines
}

export async function sendMarketingReport(): Promise<void> {
  console.log('[MARKETING] Generating marketing report...')
  const now = new Date().toLocaleString('ar-EG', { timeZone: 'Asia/Riyadh' })

  const sections: string[] = [
    '<div style="text-align:center;margin-bottom:24px;">',
    '<h1 style="color:#e9c349;font-size:22px;margin:0;">📊 تقرير B2B Lawyer التسويقي</h1>',
    `<p style="color:rgba(255,255,255,0.5);font-size:13px;margin-top:4px;">${now}</p>`,
    '</div>'
  ]

  const trialSection = await checkTrialExpiry()
  const inactiveSection = await checkInactiveUsers()
  const usageSection = await getUsageStats()

  sections.push(...trialSection)
  sections.push(...inactiveSection)
  sections.push(...usageSection)

  if (sections.length <= 4) {
    sections.push(
      '<p style="color:rgba(255,255,255,0.5);text-align:center;">لا توجد بيانات جديدة حالياً.</p>'
    )
  }

  const html = `
    <div dir="rtl" style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:650px;margin:0 auto;padding:32px;background:#0c0e14;border-radius:16px;border:1px solid #e9c349;">
      ${sections.join('')}
      <p style="color:rgba(255,255,255,0.4);font-size:12px;text-align:center;margin-top:32px;">
        هذا التقرير يُرسل تلقائياً كل 6 ساعات من خادم B2B Lawyer.
      </p>
    </div>
  `

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `📊 تقرير B2B Lawyer التسويقي - ${new Date().toLocaleDateString('ar-SA')}`,
    text: 'تقرير تسويقي - افتح الإيميل بصيغة HTML',
    html
  })

  console.log('[MARKETING] Report sent to admin.')
}
