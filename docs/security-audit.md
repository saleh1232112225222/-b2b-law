# تقرير التدقيق الأمني الشامل - نظام B2B-LAW

**تاريخ التدقيق:** 2 يوليو 2026  
**المدقق:** فريق الأمن السيبراني  
**نطاق التدقيق:** الواجهة الأمامية (Vue 3) + الخادم الخلفي (Node.js/Express) + قاعدة البيانات (PostgreSQL)  
**الإصدار:** ما قبل الإطلاق (Pre-Launch)

---

## ملخص تنفيذي

تم إجراء تدقيق أمني شامل لنظام B2B-LAW، وهو نظام إدارة مكاتب المحاماة متعدد المستأجرين (Multi-Tenant SaaS). كشف التدقيق عن **6 ثغرات حرجة**، و**8 ثغرات عالية الخطورة**، و**9 ثغرات متوسطة**، و**5 ثغرات منخفضة الخطورة**. يجب معالجة الثغرات الحرجة والعالية **قبل الإطلاق** لضمان أمان بيانات العملاء والامتثال للمعايير الأمنية.

### جدول الملخص

| الخطورة | العدد | الحالة |
|---------|-------|--------|
| 🔴 حرجة (Critical) | 6 | يجب الإصلاح فوراً |
| 🟠 عالية (High) | 8 | يجب الإصلاح قبل الإطلاق |
| 🟡 متوسطة (Medium) | 9 | يُوصى بالإصلاح قبل الإطلاق |
| 🟢 منخفضة (Low) | 5 | يُوصى بالإصلاح لاحقاً |

---

## 🔴 الثغرات الحرجة (Critical)

### C-01: مسار تصحيح الأخطاء (Debug Route) مكشوف بدون مصادقة

**الملف:** `cloud-server/src/routes/debug.ts`  
**المسار:** `POST /api/debug/extend-trial`  
**الوصف:** يوجد مسار تصحيح أخطاء مكشوف للعامة بدون أي مصادقة أو تفويض. يسمح هذا المسار بتمديد الفترة التجريبية لـ **جميع الشركات** في النظام بسنة كاملة. يمكن لأي شخص على الإنترنت استدعاء هذا المسار.

```typescript
// cloud-server/src/routes/debug.ts
debugRouter.post('/extend-trial', async (req, res) => {
  await query(`UPDATE companies SET trial_expires_at = NOW() + INTERVAL '365 days'`, [])
  res.json({ success: true })
})
```

**التأثير:** خسارة مالية مباشرة — يمكن لأي مهاجم تمديد اشتراكات جميع العملاء مجاناً.

**الحل:**
1. **حذف هذا المسار بالكامل** من بيئة الإنتاج
2. إذا كان ضرورياً للتطوير، يجب حمايته بـ:
   - التحقق من `NODE_ENV !== 'production'`
   - إضافة `authMiddleware` و `requirePermission('super_admin')`
   - تقييده بعنوان IP محدد

---

### C-02: سياسة CORS مفتوحة بالكامل (origin: '*')

**الملف:** `cloud-server/src/index.ts` — السطر 78  
**الوصف:** تم تعيين سياسة CORS للسماح بجميع المصادر (`origin: '*'`) مع تفعيل `credentials: true`. هذا يعني أن أي موقع ويب على الإنترنت يمكنه إرسال طلبات إلى الـ API الخاص بالنظام.

```typescript
app.use(cors({ origin: '*', credentials: true }))
```

**ملاحظة أمنية:** وفقاً لمواصفات CORS، المتصفحات لا ترسل ملفات تعريف الارتباط (cookies) عندما يكون `origin: '*'`، لكن النظام يستخدم JWT في الـ Header مما يجعل هذا الإعداد خطيراً لأن أي موقع خبيث يمكنه استخدام JavaScript لإرسال طلبات مع رمز JWT المسروق.

**التأثير:** يُسهّل هجمات CSRF وسرقة البيانات عبر المواقع.

**الحل:**
```typescript
const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://app.b2blaw.com',
  'https://b2blaw.com'
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
```

---

### C-03: كلمة مرور المدير الأعلى مُضمّنة في الكود المصدري (Hardcoded)

**الملف:** `cloud-server/src/index.ts` — الأسطر 487-504  
**الوصف:** يتم تضمين هاش كلمة مرور المدير الأعلى (Super Admin) مباشرة في الكود المصدري، ويتم إعادة تعيينه عند كل تشغيل للخادم. كلمة المرور المعروفة هي `admin1390` (أو `admin123` في ملفات الاختبار). هذا يعني:
1. كلمة المرور معروفة لأي شخص لديه وصول للكود
2. لا يمكن تغيير كلمة المرور بشكل دائم — يتم إعادة تعيينها عند كل إعادة تشغيل
3. البريد الإلكتروني للاسترداد مُضمّن أيضاً (`slaehmap@gmail.com`)

```typescript
const ADMIN_HASH = '$2a$12$phlOfNeLBHtvuP0rt.sTl.uVGOLP2LAEENAvE64HEyCklPyV4gXjm'
// يُعاد تعيين كلمة المرور عند كل تشغيل:
await dbQuery(`UPDATE users SET password_hash = '${ADMIN_HASH}' ...`)
```

**التأثير:** وصول كامل غير مصرح به لحساب المدير الأعلى الذي يملك صلاحيات مطلقة على جميع الشركات.

**الحل:**
1. نقل هاش كلمة المرور إلى متغير بيئة: `ADMIN_BOOTSTRAP_HASH`
2. إنشاء الحساب فقط إذا لم يكن موجوداً (إزالة `UPDATE` الدائم)
3. فرض تغيير كلمة المرور عند أول تسجيل دخول (`must_change_password = TRUE`)
4. إزالة البريد الإلكتروني المُضمّن ونقله لمتغير بيئة

---

### C-04: تسريب رمز OTP في استجابة API

**الملف:** `cloud-server/src/routes/auth.ts` — السطر 1003  
**الوصف:** عندما لا يكون خادم SMTP متاحاً، يتم إرسال رمز OTP مباشرة في استجابة API. هذا يعني أن أي مهاجم يمكنه التسجيل وتفعيل حسابه بدون بريد إلكتروني حقيقي.

```typescript
res.status(201).json({
  success: true,
  companyId,
  username,
  ...(smtpAvailable ? {} : { devOtp: otpCode })
})
```

**التأثير:** تجاوز كامل لآلية التحقق من البريد الإلكتروني في بيئة الإنتاج إذا لم يتم تكوين SMTP.

**الحل:**
1. عدم إرسال OTP في الاستجابة أبداً في بيئة الإنتاج
2. التحقق من `NODE_ENV`:
```typescript
if (!smtpAvailable && process.env.NODE_ENV === 'production') {
  console.error('SMTP not configured in production!')
  return res.status(503).json({ error: 'خدمة البريد غير متاحة' })
}
```

---

### C-05: تمرير رمز JWT في عنوان URL (Google OAuth Callback)

**الملف:** `cloud-server/src/routes/auth.ts` — الأسطر 598، 756  
**الوصف:** بعد مصادقة Google OAuth، يتم تمرير رمز JWT مباشرة في عنوان URL كمعامل استعلام:

```typescript
res.redirect(`${frontendUrl}/#/login?google_token=${token}`)
```

**التأثير:**
- يتم تسجيل الرمز في سجلات الخادم (server logs)
- يتم تسجيله في سجل المتصفح (browser history)
- يمكن تسريبه عبر رأس `Referer` إلى مواقع خارجية
- يظهر في أدوات المراقبة والتحليل

**الحل:**
1. استخدام رمز مؤقت (authorization code) قصير العمر بدلاً من JWT
2. تبادل الرمز المؤقت بـ JWT عبر طلب POST منفصل:
```typescript
// الخادم: إنشاء رمز مؤقت
const tempCode = crypto.randomUUID()
await redis.set(`oauth:${tempCode}`, JSON.stringify(tokenPayload), 'EX', 60)
res.redirect(`${frontendUrl}/#/login?code=${tempCode}`)

// الواجهة: تبادل الرمز
const { data } = await axios.post('/api/auth/exchange', { code: tempCode })
const jwt = data.token
```

---

### C-06: غياب حماية Helmet لرؤوس HTTP الأمنية

**الملف:** `cloud-server/src/index.ts`  
**الوصف:** لا يتم استخدام مكتبة `helmet` أو أي آلية أخرى لتعيين رؤوس HTTP الأمنية. هذا يعني غياب:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy` (CSP)
- `X-XSS-Protection`
- `Referrer-Policy`

**التأثير:** يُسهّل هجمات XSS، Clickjacking، MIME sniffing، وهجمات man-in-the-middle.

**الحل:**
```bash
npm install helmet
```
```typescript
import helmet from 'helmet'
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL]
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}))
```

---

## 🟠 الثغرات العالية الخطورة (High)

### H-01: حد محاولات تسجيل الدخول مرتفع جداً (50 محاولة / 15 دقيقة)

**الملف:** `cloud-server/src/routes/auth.ts` — الأسطر 92-121  
**الوصف:** يسمح نظام تحديد المعدل بـ 50 محاولة تسجيل دخول كل 15 دقيقة لكل عنوان IP. هذا يعادل 200 محاولة في الساعة، وهو كافٍ لهجمات القوة الغاشمة (Brute Force) على كلمات المرور الضعيفة.

بالإضافة لذلك:
- يتم تخزين المحاولات في الذاكرة (`Map`) مما يعني فقدانها عند إعادة التشغيل
- لا يوجد تحديد معدل على مستوى اسم المستخدم (فقط IP)
- لا يوجد تحديد معدل عام على جميع مسارات API

**الحل:**
1. تقليل الحد إلى **5-10 محاولات** كل 15 دقيقة
2. إضافة تحديد معدل على مستوى اسم المستخدم
3. استخدام `express-rate-limit` مع مخزن Redis:
```typescript
import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ /* Redis config */ })
})
```
4. إضافة تحديد معدل عام:
```typescript
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100 // 100 طلب في الدقيقة
})
app.use('/api/', globalLimiter)
```

---

### H-02: غياب حماية CSRF

**الوصف:** لا يوجد أي آلية لحماية CSRF في النظام. بالرغم من أن النظام يستخدم JWT في رأس Authorization (وليس cookies)، إلا أن:
1. سياسة CORS المفتوحة (`origin: '*'`) تُلغي الحماية الطبيعية
2. بعض المتصفحات القديمة قد لا تطبق سياسة CORS بشكل صحيح

**الحل:**
1. إصلاح سياسة CORS (انظر C-02) — هذا هو الحل الأساسي
2. إضافة رمز CSRF للعمليات الحساسة (تغيير كلمة المرور، حذف البيانات)
3. التحقق من رأس `Origin` أو `Referer` في الطلبات الحساسة

---

### H-03: حقن SQL محتمل في جدول الكيانات العام (Entity Router)

**الملف:** `cloud-server/src/routes/entity.ts` — الأسطر 89-110  
**الوصف:** يتم بناء استعلامات SQL ديناميكياً باستخدام أسماء الجداول والأعمدة من التكوين. بالرغم من استخدام معاملات مُعدّة (parameterized queries) للقيم، إلا أن:

1. **أسماء الأعمدة في البحث** تُدرج مباشرة في SQL بدون تعقيم:
```typescript
const searchConditions = searchFields.map((f) => {
  params.push(`%${q}%`)
  return `LOWER("${f}") LIKE LOWER($${paramIndex++})`
})
```
2. **أسماء الجداول** تُدرج مباشرة:
```typescript
query(`SELECT COUNT(*) FROM ${table} ${whereClause}`, params)
```

بالرغم من أن `searchFields` و `table` تأتي من التكوين الثابت (وليس من المستخدم)، إلا أن هذا النمط خطير ويمكن أن يؤدي لثغرات إذا تم تعديل التكوين لاحقاً.

3. **مرشحات الاستعلام** من المستخدم تُستخدم كأسماء أعمدة بعد التحقق من وجودها في الجدول:
```typescript
Object.entries(filters).forEach(([key, val]) => {
  if (columns.includes(lowerKey)) {
    whereClause += ` AND "${lowerKey}" = $${paramIndex++}`
  }
})
```

**الحل:**
1. استخدام قائمة بيضاء صريحة لأسماء الأعمدة المسموح بها
2. التحقق من أسماء الأعمدة باستخدام regex: `/^[a-z_][a-z0-9_]*$/`
3. استخدام ORM (مثل Drizzle الموجود بالفعل) بدلاً من SQL الخام

---

### H-04: غياب التحقق من صحة المدخلات (Input Validation) في معظم المسارات

**الوصف:** باستثناء مسار التسجيل (`/register`) الذي يحتوي على تحقق جيد، فإن معظم مسارات API لا تتحقق من صحة المدخلات:

- **مسار إنشاء الكيانات** (`entity.ts POST /`): يقبل أي حقول من `req.body` ويدرجها مباشرة في قاعدة البيانات
- **مسار التحديث** (`entity.ts PUT /:id`): نفس المشكلة
- **مسارات القضايا والعقود**: لا يوجد تحقق من أنواع البيانات أو أطوالها

**التأثير:** يمكن إدخال بيانات غير صالحة أو خبيثة في قاعدة البيانات.

**الحل:**
1. استخدام مكتبة تحقق مثل `zod` أو `joi`:
```typescript
import { z } from 'zod'

const createCaseSchema = z.object({
  case_number: z.string().min(1).max(50),
  subject: z.string().min(1).max(500),
  court: z.string().max(200).optional(),
  // ...
})

router.post('/', async (req, res) => {
  const result = createCaseSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues })
  }
  // استخدام result.data
})
```

---

### H-05: غياب حماية XSS على مستوى الخادم

**الوصف:** لا يوجد تعقيم (sanitization) شامل للمدخلات ضد هجمات XSS. التعقيم الوحيد الموجود هو في مسار التسجيل لاسم الشركة فقط:

```typescript
companyName = companyName.replace(/[<>"'&]/g, '')
```

جميع الحقول الأخرى (أسماء العملاء، عناوين القضايا، الملاحظات، إلخ) لا يتم تعقيمها.

**التأثير:** يمكن تخزين كود JavaScript خبيث في قاعدة البيانات وتنفيذه عند عرض البيانات (Stored XSS).

**الحل:**
1. إضافة middleware عام لتعقيم المدخلات:
```typescript
import xss from 'xss'

function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key])
      }
    }
  }
  next()
}
app.use(sanitizeBody)
```
2. تعقيم البيانات عند العرض في الواجهة الأمامية (Vue.js يفعل ذلك تلقائياً مع `{{ }}` لكن ليس مع `v-html`)

---

### H-06: ثغرة أمنية عالية في مكتبة nodemailer

**المصدر:** `npm audit`  
**الوصف:** الإصدار المُثبّت من `nodemailer` (≤9.0.0) يحتوي على ثغرة عالية الخطورة:
- **GHSA-p6gq-j5cr-w38f**: خيار `raw` على مستوى الرسالة يتجاوز `disableFileAccess`/`disableUrlAccess`، مما يُمكّن من قراءة ملفات عشوائية وهجمات SSRF

**الحل:**
```bash
cd cloud-server
npm install nodemailer@latest
```

---

### H-07: إرسال إشعارات بريدية تحتوي على بيانات حساسة

**الملف:** `cloud-server/src/routes/auth.ts` — الأسطر 282-294، 858-862، 992-997  
**الوصف:** يتم إرسال بريد إلكتروني للمدير عند كل تسجيل دخول ناجح وعند كل محاولة تسجيل، ويحتوي على:
- رمز OTP بنص واضح
- أسماء المستخدمين وبياناتهم
- عناوين البريد الإلكتروني وأرقام الهواتف

```typescript
text: `... رمز التفعيل (OTP): ${otpCode} ...`
```

**التأثير:** إذا تم اختراق بريد المدير، يمكن الوصول لجميع رموز OTP وبيانات المستخدمين.

**الحل:**
1. عدم إرسال رمز OTP في البريد الإلكتروني للمدير
2. تقليل البيانات الحساسة في الإشعارات
3. استخدام لوحة تحكم إدارية بدلاً من البريد الإلكتروني

---

### H-08: غياب آلية إبطال رموز JWT (Token Revocation)

**الملف:** `cloud-server/src/middleware/auth.ts`  
**الوصف:** لا توجد آلية لإبطال رموز JWT بعد إصدارها. عند تسجيل الخروج (`/logout`)، يتم فقط تسجيل وقت الخروج في قاعدة البيانات، لكن الرمز يبقى صالحاً حتى انتهاء صلاحيته (24 ساعة).

**التأثير:**
- لا يمكن إنهاء جلسة مستخدم مُخترق فوراً
- لا يمكن إبطال الرمز عند تعليق حساب المستخدم
- لا يمكن فرض تسجيل خروج عند تغيير كلمة المرور

**الحل:**
1. استخدام قائمة سوداء (blacklist) للرموز المُبطلة في Redis
2. تقليل مدة صلاحية JWT إلى 15-30 دقيقة مع استخدام Refresh Token
3. التحقق من حالة المستخدم في كل طلب (موجود جزئياً لكن لا يتحقق من `is_active`)

---

## 🟡 الثغرات المتوسطة (Medium)

### M-01: JWT_SECRET الافتراضي ضعيف

**الملف:** `cloud-server/src/middleware/auth.ts` — الأسطر 5-23  
**الوصف:** بالرغم من وجود فحص للقيم الافتراضية في بيئة الإنتاج (مع إيقاف الخادم)، إلا أن:
1. القيمة الافتراضية في `.env.example` هي `your-secret-key-here-change-in-production`
2. القيمة الافتراضية في `docker-compose.yml` هي `dev-secret-change-in-production`
3. لا يتم التحقق من طول أو تعقيد المفتاح

**الحل:**
1. إنشاء مفتاح عشوائي قوي (256 بت على الأقل):
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
2. إضافة تحقق من طول المفتاح:
```typescript
if (JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters')
  process.exit(1)
}
```

---

### M-02: كلمة مرور قاعدة البيانات ضعيفة في Docker Compose

**الملف:** `docker-compose.yml` — السطر 8  
**الوصف:** كلمة مرور PostgreSQL في Docker Compose هي `b2b_law_pass` وهي ضعيفة وسهلة التخمين.

```yaml
POSTGRES_PASSWORD: b2b_law_pass
```

بالإضافة لذلك، منفذ قاعدة البيانات (5432) مكشوف للخارج:
```yaml
ports:
  - '5432:5432'
```

**الحل:**
1. استخدام كلمة مرور قوية عبر متغير بيئة:
```yaml
POSTGRES_PASSWORD: ${DB_PASSWORD}
```
2. إزالة تعريض المنفذ أو تقييده:
```yaml
# حذف ports أو تقييده للمضيف المحلي فقط:
ports:
  - '127.0.0.1:5432:5432'
```

---

### M-03: غياب تشفير SSL/TLS لاتصال قاعدة البيانات

**الملف:** `cloud-server/src/db/connection.ts` — السطر 44  
**الوصف:** يتم تفعيل SSL فقط عند الاتصال بـ Render.com، وحتى في هذه الحالة يتم تعطيل التحقق من الشهادة:

```typescript
ssl: process.env.DATABASE_URL?.includes('render.com')
  ? { rejectUnauthorized: false }
  : false
```

**التأثير:** البيانات تُنقل بنص واضح بين الخادم وقاعدة البيانات.

**الحل:**
```typescript
ssl: process.env.NODE_ENV === 'production'
  ? { rejectUnauthorized: true, ca: fs.readFileSync('/path/to/ca-cert.pem') }
  : false
```

---

### M-04: غياب تسجيل أمني شامل (Security Logging)

**الوصف:** بالرغم من وجود تسجيل لمحاولات تسجيل الدخول، إلا أنه لا يوجد:
- تسجيل لمحاولات الوصول غير المصرح بها (403)
- تسجيل لمحاولات حقن SQL أو XSS
- تسجيل لتغييرات الصلاحيات
- نظام تنبيهات للأنشطة المشبوهة
- تسجيل مركزي (centralized logging)

**الحل:**
1. إضافة middleware لتسجيل جميع الطلبات المرفوضة
2. استخدام نظام تسجيل مركزي (مثل Winston + ELK Stack)
3. إعداد تنبيهات للأنشطة المشبوهة

---

### M-05: ثغرات متوسطة في التبعيات (Dependencies)

**المصدر:** `npm audit`  
**الوصف:** تم اكتشاف 5 ثغرات متوسطة الخطورة:

| المكتبة | الثغرة | الوصف |
|---------|--------|-------|
| esbuild ≤0.24.2 | GHSA-67mh-4wv8-2f99 | يسمح لأي موقع بإرسال طلبات لخادم التطوير |
| esbuild ≤0.24.2 | GHSA-g7r4-m6w7-qqqr | قراءة ملفات عشوائية على Windows |
| uuid <11.1.1 | GHSA-w5hq-g745-h8pq | فحص حدود المخزن المؤقت مفقود |

**الحل:**
```bash
cd cloud-server
npm audit fix --force
# أو تحديث المكتبات يدوياً
npm install uuid@latest
```

---

### M-06: غياب حد لحجم الطلبات على مستوى Nginx

**الملف:** `nginx.conf`  
**الوصف:** لا يوجد تحديد لحجم الطلبات في تكوين Nginx. الحد الوحيد هو `10mb` في Express:
```typescript
app.use(express.json({ limit: '10mb' }))
```

لكن Nginx لا يحتوي على `client_max_body_size` مما يعني أن الحد الافتراضي (1MB) سيُطبّق، وقد يتسبب في مشاكل أو يمكن تجاوزه.

**الحل:**
```nginx
server {
    client_max_body_size 10m;
    
    # إضافة رؤوس أمنية
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'" always;
    
    # تعطيل إظهار إصدار Nginx
    server_tokens off;
}
```

---

### M-07: غياب آلية رفع الملفات الآمنة

**الوصف:** بالرغم من وجود جدول `legal_service_attachments` في قاعدة البيانات مع حقول `file_name` و `file_path`، لا يوجد كود فعلي لرفع الملفات (لا multer ولا formidable). هذا يعني:
1. إما أن رفع الملفات غير مُنفّذ بعد
2. أو أنه يتم عبر آلية غير آمنة

**الحل عند التنفيذ:**
```typescript
import multer from 'multer'
import path from 'path'

const upload = multer({
  storage: multer.diskStorage({
    destination: '/secure/uploads/',
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname)}`
      cb(null, uniqueName)
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.png']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('نوع الملف غير مسموح'))
    }
  }
})
```

---

### M-08: عدم التحقق من حالة المستخدم (is_active) في middleware المصادقة

**الملف:** `cloud-server/src/middleware/auth.ts`  
**الوصف:** يتحقق middleware المصادقة من صلاحية JWT وحالة الاشتراك، لكنه **لا يتحقق** من حالة المستخدم (`is_active` أو `is_suspended`). هذا يعني أن المستخدم المُعلّق يمكنه الاستمرار في استخدام النظام حتى انتهاء صلاحية JWT (24 ساعة).

**الحل:**
```typescript
// إضافة في authMiddleware بعد التحقق من JWT:
const userCheck = await query(
  'SELECT is_active, is_suspended FROM users WHERE id = $1',
  [payload.userId]
)
if (!userCheck.rows[0]?.is_active || userCheck.rows[0]?.is_suspended) {
  res.status(403).json({ error: 'الحساب معطل أو معلق' })
  return
}
```

---

### M-09: استخدام String Interpolation في استعلامات SQL

**الملف:** `cloud-server/src/index.ts` — الأسطر 493، 501  
**الوصف:** يتم استخدام template literals لإدراج قيم مباشرة في استعلامات SQL:

```typescript
await dbQuery(
  `INSERT INTO users (...) VALUES (..., '${ADMIN_HASH}', ...)`, []
)
await dbQuery(
  `UPDATE users SET password_hash = '${ADMIN_HASH}' ...`, []
)
```

بالرغم من أن `ADMIN_HASH` ثابت وليس من مدخلات المستخدم، إلا أن هذا النمط خطير ويجب تجنبه.

**الحل:**
```typescript
await dbQuery(
  `INSERT INTO users (...) VALUES (..., $1, ...)`,
  [ADMIN_HASH]
)
```

---

## 🟢 الثغرات المنخفضة الخطورة (Low)

### L-01: بيانات اعتماد الاختبار في الكود المصدري

**الملفات:**
- `cloud-server/src/add-test-case.ts` — `{ username: 'admin', password: 'admin123' }`
- `cloud-server/src/test-api.ts` — `{ username: 'admin', password: 'admin123' }`
- `cloud-server/src/db/seed.ts` — `bcrypt.hash('admin123', 12)`

**الحل:** حذف هذه الملفات من بيئة الإنتاج أو نقل بيانات الاعتماد لمتغيرات بيئة.

---

### L-02: غياب HTTPS في تكوين Nginx

**الملف:** `nginx.conf`  
**الوصف:** يستمع Nginx على المنفذ 80 فقط (HTTP) بدون تكوين HTTPS/TLS.

**الحل:**
```nginx
server {
    listen 80;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    ssl_certificate /etc/ssl/certs/b2blaw.crt;
    ssl_certificate_key /etc/ssl/private/b2blaw.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    # ...
}
```

---

### L-03: عدم تعيين خيارات أمان ملفات تعريف الارتباط

**الوصف:** بالرغم من أن النظام يستخدم JWT في رأس Authorization (وليس cookies)، إلا أنه يجب التأكد من عدم استخدام cookies غير آمنة في المستقبل. يُوصى بتعيين:
- `httpOnly: true`
- `secure: true`
- `sameSite: 'strict'`

---

### L-04: كشف معلومات الخطأ في بيئة التطوير

**الملف:** `cloud-server/src/index.ts` — السطر 465  
**الوصف:** يتم إرسال رسائل الخطأ التفصيلية في بيئة التطوير:

```typescript
res.status(500).json({
  error: process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message
})
```

هذا جيد لكن يجب التأكد من تعيين `NODE_ENV=production` في بيئة الإنتاج.

---

### L-05: Dockerfile لا يُثبّت إصدارات محددة للتبعيات

**الملف:** `cloud-server/Dockerfile`  
**الوصف:** يستخدم `npm ci` الذي يُثبّت من `package-lock.json`، وهذا جيد. لكن يُوصى بإضافة:
1. فحص أمني في مرحلة البناء
2. تعيين `NODE_ENV=production` في مرحلة البناء

**الحل:**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci && npm audit --production
# ...
```

---

## ملخص التوصيات حسب الأولوية

### يجب تنفيذها فوراً (قبل الإطلاق):

| # | التوصية | الخطورة |
|---|---------|---------|
| 1 | حذف أو حماية مسار `/api/debug/extend-trial` | حرجة |
| 2 | تقييد سياسة CORS لنطاقات محددة | حرجة |
| 3 | نقل كلمة مرور المدير الأعلى لمتغير بيئة وإيقاف إعادة التعيين التلقائي | حرجة |
| 4 | منع تسريب OTP في استجابة API في بيئة الإنتاج | حرجة |
| 5 | استخدام رمز مؤقت بدلاً من JWT في عنوان URL لـ Google OAuth | حرجة |
| 6 | تثبيت وتكوين Helmet | حرجة |
| 7 | تقليل حد محاولات تسجيل الدخول وإضافة تحديد معدل عام | عالية |
| 8 | تحديث nodemailer لإصلاح الثغرة الأمنية | عالية |
| 9 | إضافة التحقق من صحة المدخلات (Input Validation) | عالية |
| 10 | إضافة حماية XSS على مستوى الخادم | عالية |
| 11 | إضافة آلية إبطال رموز JWT | عالية |

### يُوصى بتنفيذها قبل الإطلاق:

| # | التوصية | الخطورة |
|---|---------|---------|
| 12 | تعيين JWT_SECRET قوي والتحقق من طوله | متوسطة |
| 13 | تأمين كلمة مرور قاعدة البيانات وإخفاء المنفذ | متوسطة |
| 14 | تفعيل SSL لاتصال قاعدة البيانات | متوسطة |
| 15 | إضافة تسجيل أمني شامل | متوسطة |
| 16 | تحديث التبعيات الضعيفة | متوسطة |
| 17 | تكوين Nginx بشكل آمن | متوسطة |
| 18 | التحقق من حالة المستخدم في middleware المصادقة | متوسطة |
| 19 | إصلاح String Interpolation في استعلامات SQL | متوسطة |

### يُوصى بتنفيذها لاحقاً:

| # | التوصية | الخطورة |
|---|---------|---------|
| 20 | حذف ملفات الاختبار من بيئة الإنتاج | منخفضة |
| 21 | تكوين HTTPS في Nginx | منخفضة |
| 22 | تعيين خيارات أمان ملفات تعريف الارتباط | منخفضة |
| 23 | التأكد من تعيين NODE_ENV=production | منخفضة |
| 24 | إضافة فحص أمني في Dockerfile | منخفضة |

---

## الجوانب الإيجابية

يجب الإشارة إلى بعض الممارسات الأمنية الجيدة الموجودة في النظام:

1. **✅ استخدام bcrypt** لتشفير كلمات المرور بعامل تكلفة 12
2. **✅ استخدام معاملات مُعدّة** (Parameterized Queries) في معظم استعلامات SQL
3. **✅ عزل البيانات حسب الشركة** (Multi-Tenant Isolation) عبر `company_id`
4. **✅ نظام صلاحيات متعدد المستويات** (RBAC) مع صلاحيات مخصصة لكل مستخدم
5. **✅ تسجيل محاولات تسجيل الدخول** الناجحة والفاشلة
6. **✅ التحقق من قوة كلمة المرور** عند التسجيل
7. **✅ فحص JWT_SECRET الافتراضي** في بيئة الإنتاج مع إيقاف الخادم
8. **✅ Dockerfile آمن** مع مستخدم غير جذري (non-root user)
9. **✅ فصل مراحل البناء** (Multi-stage build) في Docker
10. **✅ ملفات .env مُستبعدة** من Git عبر `.gitignore`

---

## المراجع

- [OWASP Top 10 (2021)](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)

---

*تم إعداد هذا التقرير بتاريخ 2 يوليو 2026. يُوصى بإجراء تدقيق أمني دوري كل 3-6 أشهر.*
