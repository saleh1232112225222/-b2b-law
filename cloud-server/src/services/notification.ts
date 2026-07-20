import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

export function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
  })
  return transporter
}

export async function sendOTP(email: string, phone: string, code: string): Promise<void> {
  const t = getTransporter()
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || ''

  if (t) {
    try {
      await t.sendMail({
        from: `"B2B Lawyer" <${from}>`,
        to: email,
        subject: 'رمز تفعيل حسابك في B2B Lawyer',
        text: `مرحباً،\n\nرمز تفعيل حسابك في B2B Lawyer هو:\n\n${code}\n\nهذا الرقم صالح لمدة 10 دقائق.\n\nشكراً لاستخدامك B2B Lawyer.`,
        html: `
          <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0c0e14; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #e9c349; font-size: 24px; margin: 0;">B2B Lawyer</h1>
            </div>
            <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; text-align: center;">
              <h2 style="color: #fff; font-size: 18px; margin: 0 0 16px;">رمز تفعيل حسابك</h2>
              <div style="background: #1a1d28; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                <span style="font-size: 36px; font-weight: 800; color: #e9c349; letter-spacing: 8px;">${code}</span>
              </div>
              <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin: 0;">هذا الرمز صالح لمدة 10 دقائق</p>
            </div>
            <p style="color: rgba(255,255,255,0.4); font-size: 12px; text-align: center; margin-top: 24px;">
              إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة.
            </p>
          </div>
        `
      })
      console.log(`[OTP] ✓ Email sent successfully to ${email}`)
      return
    } catch (err) {
      console.error(`[OTP] ✗ Email send failed:`, err)
    }
  }

  console.log(`[OTP] ⚠ Email not sent — SMTP not configured or failed for ${email}`)
}

export async function sendEmail(options: {
  to: string
  subject: string
  text: string
  html?: string
}): Promise<void> {
  const t = getTransporter()
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || ''

  if (t) {
    try {
      await t.sendMail({
        from: `"B2B Lawyer" <${from}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      })
      console.log(`[EMAIL] ✓ Sent to ${options.to}: "${options.subject}"`)
      return
    } catch (err) {
      console.error(`[EMAIL] ✗ Failed to send to ${options.to}:`, err)
    }
  }
  console.log(
    `[EMAIL] ⚠ Email not sent (SMTP not configured): "${options.subject}" -> ${options.to}`
  )
}

export async function notifyAdminOfNewRegistration(details: {
  name: string
  email: string
  phone?: string
  method: 'Google' | 'Manual'
  trialExpiresAt: Date
}): Promise<void> {
  const formattedDate = new Date().toLocaleString('ar-EG', { timeZone: 'Asia/Riyadh' })
  const formattedExpiry = details.trialExpiresAt.toLocaleString('ar-EG', {
    timeZone: 'Asia/Riyadh'
  })

  const html = `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 550px; margin: 0 auto; padding: 32px; background: #0c0e14; border-radius: 16px; border: 1px solid #e9c349;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #e9c349; font-size: 24px; margin: 0;">🎉 مشترك جديد في B2B Lawyer</h1>
        <p style="color: rgba(255, 255, 255, 0.6); font-size: 14px; margin-top: 8px;">تم تسجيل حساب جديد في النظام بنجاح</p>
      </div>
      <div style="background: rgba(255, 255, 255, 0.03); border-radius: 12px; padding: 24px; color: #fff;">
        <table style="width: 100%; border-collapse: collapse; font-size: 15px; line-height: 1.8;">
          <tr>
            <td style="color: #e9c349; font-weight: bold; width: 140px; padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">الاسم / المكتب:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${details.name}</td>
          </tr>
          <tr>
            <td style="color: #e9c349; font-weight: bold; padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">البريد الإلكتروني:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);"><a href="mailto:${details.email}" style="color: #fff; text-decoration: none;">${details.email}</a></td>
          </tr>
          <tr>
            <td style="color: #e9c349; font-weight: bold; padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">رقم الهاتف:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${details.phone || 'غير متوفر (تسجيل Google)'}</td>
          </tr>
          <tr>
            <td style="color: #e9c349; font-weight: bold; padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">طريقة التسجيل:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${details.method === 'Google' ? 'تسجيل دخول عبر Google' : 'تسجيل يدوي (مع تفعيل)'}</td>
          </tr>
          <tr>
            <td style="color: #e9c349; font-weight: bold; padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">تاريخ التسجيل:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${formattedDate}</td>
          </tr>
          <tr>
            <td style="color: #e9c349; font-weight: bold; padding: 8px 0;">نهاية الفترة التجريبية:</td>
            <td style="padding: 8px 0;">${formattedExpiry}</td>
          </tr>
        </table>
      </div>
      <p style="color: rgba(255, 255, 255, 0.4); font-size: 12px; text-align: center; margin-top: 24px;">
        هذا التنبيه مرسل تلقائياً من خادم B2B Lawyer.
      </p>
    </div>
  `

  await sendEmail({
    to: process.env.ADMIN_EMAIL || 'admin@b2blaw.local',
    subject: `🎉 مشترك جديد (${details.method === 'Google' ? 'Google' : 'يدوي'}): ${details.name}`,
    text: `مرحباً أستاذ صالح،\n\nتم تسجيل مشترك جديد بنجاح:\n- الاسم: ${details.name}\n- البريد الإلكتروني: ${details.email}\n- الهاتف: ${details.phone || 'غير متوفر'}\n- طريقة التسجيل: ${details.method}\n- التاريخ: ${formattedDate}\n\nشكراً لك.`,
    html
  })
}
