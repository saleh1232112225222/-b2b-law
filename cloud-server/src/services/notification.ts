import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter
  const host = process.env.SMTP_HOST
  if (!host) {
    console.log('[NOTIFICATION] SMTP not configured — OTP will be logged to console only')
    return null
  }
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
  const from = process.env.SMTP_FROM || 'noreply@b2blaw.com'

  console.log('\n================================================================================')
  console.log(`[OTP] Sending verification code...`)
  console.log(` - Target Email: ${email}`)
  console.log(` - Target Phone: ${phone}`)
  console.log(` - Verification OTP Code: ${code}`)

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

  console.log(`[OTP] ⚠ Email not sent — using console fallback. Code: ${code}`)
  console.log('================================================================================\n')
}

export async function sendEmail(options: { to: string; subject: string; text: string; html?: string }): Promise<void> {
  const t = getTransporter()
  const from = process.env.SMTP_FROM || 'noreply@b2blaw.com'

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
  console.log(`[EMAIL] ⚠ Email not sent (SMTP not configured): "${options.subject}" -> ${options.to}`)
}
