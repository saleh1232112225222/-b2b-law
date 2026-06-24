const { Client } = require('pg')
const nodemailer = require('nodemailer')
const fs = require('fs')
const path = require('path')

// Manually parse .env file to get SMTP credentials
const envPath = path.join(__dirname, '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const parts = trimmed.split('=')
    const key = parts[0].trim()
    let val = parts.slice(1).join('=').trim()
    if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1)
    if (val.startsWith("'") && val.endsWith("'")) val = val.substring(1, val.length - 1)
    process.env[key] = val
  })
}

// Production Render Database URL
const connectionString =
  'postgresql://b2b_law_db_user:qYBOp4HQMz9aePegF79xoJqmQiLiudBC@dpg-d8hhj6j7uimc73d10pb0-a.singapore-postgres.render.com/b2b_law_db?ssl=true'

const dbClient = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
})

async function main() {
  try {
    console.log('Connecting to Live Render database...')
    await dbClient.connect()

    console.log('Fetching registered users...')
    const res = await dbClient.query(`
      SELECT 
        c.name AS company_name,
        c.email AS company_email,
        c.phone AS company_phone,
        c.is_verified,
        c.created_at,
        u.username,
        u.full_name,
        u.recovery_email
      FROM companies c
      LEFT JOIN users u ON c.id = u.company_id
      ORDER BY c.created_at DESC
    `)

    console.log(`Found ${res.rows.length} records. Generating report...`)

    let tableRows = ''
    res.rows.forEach((row, i) => {
      const method = row.company_phone ? 'تسجيل يدوي (OTP)' : 'تسجيل عبر Google'
      const status = row.is_verified
        ? '<span style="color: #2e7d32; font-weight: bold;">مفعل ✅</span>'
        : '<span style="color: #c62828;">غير مفعل ⏳</span>'
      const date = new Date(row.created_at).toLocaleString('ar-EG', { timeZone: 'Asia/Riyadh' })

      tableRows += `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 12px; text-align: right;">${i + 1}</td>
          <td style="padding: 12px; text-align: right; font-weight: bold;">${row.company_name}</td>
          <td style="padding: 12px; text-align: right;"><a href="mailto:${row.company_email}">${row.company_email}</a></td>
          <td style="padding: 12px; text-align: right;">${row.company_phone || 'غير متوفر'}</td>
          <td style="padding: 12px; text-align: right;">${method}</td>
          <td style="padding: 12px; text-align: right;">${status}</td>
          <td style="padding: 12px; text-align: right; font-size: 13px;">${date}</td>
        </tr>
      `
    })

    const htmlContent = `
      <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px;">
        <div style="background: #0c0e14; padding: 30px; border-radius: 12px; text-align: center; border: 2px solid #e9c349; margin-bottom: 20px;">
          <h1 style="color: #e9c349; margin: 0; font-size: 26px;">📊 تقرير المستخدمين المسجلين في B2B Lawyer</h1>
          <p style="color: #fff; margin-top: 10px; font-size: 15px;">تم توليد هذا التقرير تلقائياً بناءً على طلبك.</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #e9c349; color: #000; font-weight: bold;">
              <th style="padding: 12px; text-align: right;">#</th>
              <th style="padding: 12px; text-align: right;">اسم المكتب/المشترك</th>
              <th style="padding: 12px; text-align: right;">البريد الإلكتروني</th>
              <th style="padding: 12px; text-align: right;">رقم الهاتف</th>
              <th style="padding: 12px; text-align: right;">طريقة التسجيل</th>
              <th style="padding: 12px; text-align: right;">حالة الحساب</th>
              <th style="padding: 12px; text-align: right;">تاريخ ووقت التسجيل</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <p style="text-align: center; color: #777; font-size: 12px; margin-top: 30px;">
          تاريخ استخراج التقرير: ${new Date().toLocaleString('ar-EG', { timeZone: 'Asia/Riyadh' })}
        </p>
      </div>
    `

    console.log('Connecting to SMTP Mailer...')
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || 'slaehmap@gmail.com',
        pass: process.env.SMTP_PASS || 'kkod vuiv zvgu izux'
      }
    })

    console.log('Sending report to your email...')
    const info = await transporter.sendMail({
      from: `"B2B Lawyer Reports" <${process.env.SMTP_USER || 'slaehmap@gmail.com'}>`,
      to: 'slaehmap@gmail.com',
      subject: `📊 تقرير المشتركين المسجلين في B2B Lawyer - ${new Date().toLocaleDateString('ar-EG')}`,
      html: htmlContent
    })

    console.log('Report sent successfully!')
    console.log('Message ID:', info.messageId)
  } catch (err) {
    console.error('Error occurred:', err)
  } finally {
    await dbClient.end()
  }
}

main()
