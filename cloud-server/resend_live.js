const { Client } = require('pg')
const nodemailer = require('nodemailer')

const connectionString =
  'postgresql://b2b_law_db_user:qYBOp4HQMz9aePegF79xoJqmQiLiudBC@dpg-d8hhj6j7uimc73d10pb0-a.singapore-postgres.render.com/b2b_law_db?ssl=true'

const dbClient = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
})

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'slaehmap@gmail.com',
    pass: 'kkod vuiv zvgu izux'
  }
})

async function main() {
  try {
    await dbClient.connect()

    const res = await dbClient.query(`
      SELECT email, phone, verification_code, name 
      FROM companies 
      WHERE is_verified = FALSE AND verification_code IS NOT NULL
      ORDER BY created_at DESC LIMIT 1
    `)

    for (const row of res.rows) {
      console.log(`Sending to ${row.email}...`)
      const info = await transporter.sendMail({
        from: '"B2B Lawyer" <slaehmap@gmail.com>',
        to: row.email,
        subject: 'إعادة إرسال: رمز تفعيل حسابك في B2B Lawyer',
        text: `مرحباً،\n\nرمز تفعيل حسابك هو:\n\n${row.verification_code}\n\nشكراً لك.`,
        html: `
          <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0c0e14; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #e9c349; font-size: 24px; margin: 0;">B2B Lawyer</h1>
            </div>
            <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; text-align: center;">
              <h2 style="color: #fff; font-size: 18px; margin: 0 0 16px;">إعادة إرسال رمز التفعيل</h2>
              <div style="background: #1a1d28; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                <span style="font-size: 36px; font-weight: 800; color: #e9c349; letter-spacing: 8px;">${row.verification_code}</span>
              </div>
            </div>
          </div>
        `
      })
      console.log(`Success: ${info.response}`)
    }
  } catch (err) {
    console.error(err)
  } finally {
    await dbClient.end()
  }
}

main()
