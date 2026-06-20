# تقرير التدقيق الهندسي — Audit Report

**التاريخ:** 2026-06-20
**الدور:** مهندس تقني — مراجعة صارمة
**الحالة:** اكتمل الرصد والتقييم

---

## ✅ 1. تنفيذ الخطة الأساسية — مطابقة 100%

| البند | النتيجة | التفاصيل |
|-------|---------|----------|
| إضافة `lifetime` للـ Enum | ✅ | `subscriptions.ts:4` |
| تطبيق Enum على الأعمدة | ✅ | `planIntervalEnum`, `subscriptionStatusEnum`, `paymentStatusEnum` |
| إصلاح FK `defendant_id` | ✅ | يشير إلى `defendants.id` — `cases.ts:55` |
| `isExcludedPath` في `auth.ts` | ✅ | أسطر 77-83 |
| حذف `readOnlyOnExpired.ts` | ✅ | تم الحذف — لا يوجد في المشروع |
| حذف `subscriptionCheck.ts` | ✅ | تم الحذف — لا يوجد في المشروع |
| إزالة الاستيرادات من `index.ts`, `users.ts`, `tasks.ts`, `entity.ts` | ✅ | لا توجد أي إشارة متبقية |
| إضافة `past_due` و `lifetime` إلى `AdminSubscriptions.vue` | ✅ | `getStatusColor()` و `getStatusText()` |
| إصلاح `auth.service.ts` | ✅ | يقبل `isVerified` و `verificationCode` |

**الخلاصة:** الخطة نُفذت بدقة 100% بدون انحراف. عمل ممتاز من الوكيل.

---

## 🔴 2. مشاكل حرجة — MUST FIX

### CRIT-1: Google OAuth Token يفتقد `subscriptionStatus`

**الملف:** `cloud-server/src/routes/auth.ts` — سطر 358-364

```ts
// ⛔ الحالي — ناقص subscriptionStatus
const token = generateToken({
  userId, companyId, username, roleKey, trialExpired
})

// ✅ المطلوب
const token = generateToken({
  userId, companyId, username, roleKey, trialExpired,
  subscriptionStatus
})
```

**التأثير:** أي مستخدم سجّل عبر Google يحصل على JWT بدون `subscriptionStatus`. الراوتر الأمامي (`router/index.ts:313`) يفحص `session.subscriptionStatus !== 'active'` والسياق سيكون `undefined !== 'active'` ← **TRUE** ← يتم تفعيل وضع القراءة فقط بشكل خاطئ. المستخدم الجديد لا يستطيع إضافة أو تعديل أي شيء.

**الوقت التقديري للإصلاح:** دقيقتان

---

### CRIT-2: تحقق `lifetime` غير موجود في شروط القراءة فقط

**الملف:** `src/renderer/src/stores/licensing.ts:118-135`
**الملف:** `src/renderer/src/router/index.ts:313`

```ts
// ⛔ الحالي — لا يستثني lifetime
session.subscriptionStatus !== 'active'
subscriptionStatus.value.status !== 'active'

// ✅ المطلوب — يستثني lifetime أيضاً
session.subscriptionStatus !== 'active' && session.subscriptionStatus !== 'lifetime'
```

**التأثير:** إذا حدث خطأ في بيانات الاشتراك (مثلاً `isExpired = true` لمستخدم lifetime بسبب `null current_period_end`)، سيتم حظر مالك اشتراك مدى الحياة بشكل خاطئ. هذا غير مقبول لعميل دفع آلاف الريالات.

**الوقت التقديري للإصلاح:** 5 دقائق

---

### CRIT-3: JWT Secret مكتوب في الكود صراحة

**الملف:** `cloud-server/src/middleware/auth.ts:5`

```ts
const JWT_SECRET = process.env.JWT_SECRET || 'b2b-law-cloud-jwt-secret-change-in-production'
```

**التأثير:** أي شخص يطلع على الكود (أو يتم نشره بدون متغير بيئة) يمكنه تزوير توكن لأي مستخدم — بما فيهم super admin. المطور يعلم أن هذه القيمة افتراضية ويجب تغييرها، ولا يوجد أي ضمان بعدم نسيان ذلك.

**الحل:** يجب إضافة إيقاف تشغيل عند بدء التشغيل:

```ts
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET || JWT_SECRET === 'b2b-law-cloud-jwt-secret-change-in-production') {
  console.error('❌ CRITICAL: JWT_SECRET is not set or is still the default value!')
  process.exit(1)
}
```

**الوقت التقديري للإصلاح:** 5 دقائق

---

### CRIT-4: نظام الصلاحيات (Permissions) لا يُطبق على الـ Backend

**الملف:** جميع الـ routes — `entity.ts`, `users.ts`, `cases.ts`, `tasks.ts` وغيرها

**اكتشاف:** جداول `permissions`, `role_permissions`, `user_permissions` موجودة في قاعدة البيانات، ويتم إنشاؤها في الـ migration، ويتم تغذيتها من الواجهة الأمامية، لكن **لا يوجد أي middleware على الباك إند يتحقق من الصلاحيات لأي مسار**.

**ماذا يعني هذا؟**
- أي مستخدم لديه JWT صحيح يمكنه تنفيذ CRUD كامل على كل كيان في الشركة
- `roleKey` يتم استخدامه فقط في واجهة المستخدم لتحديد الأزرار الظاهرة
- يمكن لأي مستخدم تجاوز جميع قيود الصلاحيات عبر Postman أو أي أداة API مباشرة
- لا يوجد فرق بين "مدير" و"موظف" و"مشاهد" على مستوى الـ API

**الصلاحيات الحقيقية الوحيدة المطبقة:**
1. التحقق من هوية المستخدم (JWT) — `authMiddleware`
2. عزل الشركة (multi-tenancy) — `company_id`
3. التحقق من هوية المالك (`companyId === '00000000-...'`) — فقط في مسارات `adminSubscriptions`
4. منع الكتابة عند انتهاء الاشتراك — `isExcludedPath`

**الوقت التقديري للإصلاح:** 2-3 أيام (يتطلب بناء middleware جديد للصلاحيات وتطبيقه على كل المسارات)

---

## 🟠 3. مشاكل عالية — HIGH

### HIGH-1: `must_change_password = FALSE` للمالك

**الملف:** `cloud-server/src/index.ts:253`

المالك (super admin) لا يُجبر على تغيير كلمة السر عند أول تسجيل. كلمة السر الأصلية مشفرة في الكود. إذا كانت كلمة السر ضعيفة أو معروفة، النظام بالكامل مكشوف.

**الحل:** تغيير `must_change_password: FALSE` إلى `TRUE`.

### HIGH-2: JWT في localStorage — ثغرة XSS

**الملف:** جميع ملفات الواجهة الأمامية التي تخزن التوكن

أي هجوم XSS في أي صفحة يمكنه سرقة توكن المدير العام والتحكم بالنظام بالكامل (خاصة إذا كان التوكن لـ super admin). التوصية: استخدام httpOnly cookie بدلاً من localStorage، أو على الأقل sessionStorage.

### HIGH-3: `clear-all-data` و `import-snapshot` بدون حماية كافية

**الملف:** `cloud-server/src/routes/system.ts:420, 123`

هذه المسارات محمية فقط بـ `authMiddleware`. أي مستخدم عادي يمكنه حذف كل بيانات شركته (غير قابل للاسترداد) أو حقن بيانات عشوائية.

**الحل:** إضافة `requireAdminRole` أو على الأقل التحقق من `roleKey === 'admin'` داخل الشركة نفسها.

### HIGH-4: لا يوجد Rate Limiting على الإطلاق

لا توجد حماية ضد:
- هجمات تخمين كلمة السر على `POST /api/auth/login`
- هجمات إنشاء حسابات عشوائية على `POST /api/auth/register`
- هجمات تخمين OTP على `POST /api/auth/verify`
- هجمات حجب الخدمة (DoS) على أي API

**الحل:** إضافة `express-rate-limit` على الأقل للمسارات الحرجة.

### HIGH-5: Migration 0001 يستخدم TEXT بدلاً من ENUM

**الملف:** `cloud-server/src/db/migrations/0001_subscriptions.sql:7, 22, 39`

```
interval TEXT NOT NULL DEFAULT 'month'     ← سطر 7
status TEXT NOT NULL DEFAULT 'trial'       ← سطر 22
status TEXT NOT NULL DEFAULT 'pending'     ← سطر 39
```

يتم إنشاء الأعمدة بـ `TEXT` في migration 0001 ثم تحويلها لاحقاً إلى ENUM في migration 0002. إذا فشل الترحيل 0002 لأي سبب، تبقى القاعدة في حالة غير متناسقة مع الـ schema. الأفضل كان دمج التغييرين في migration واحد.

---

## 🟡 4. مشاكل متوسطة — MEDIUM

| # | الموقع | المشكلة | الحل |
|---|--------|---------|------|
| M1 | `auth.service.ts:44-75` | دالة `registerCompany` غير مستخدمة (orphaned)، تستخدم trial 7 أيام بدلاً من 30 | إزالة الدالة أو تصحيحها لتتماشى مع المسار الرئيسي |
| M2 | `AdminSubscriptions.vue:468-475` | تسمية مزدوجة snake_case/camelCase في معالجة API — `r.plan_name \|\| r.planName` | توحيد التسمية إلى camelCase فقط |
| M3 | `AdminSubscriptions.vue:475` | fallback ثلاثي: `r.current_period_end \|\| r.trial_expires_at \|\| r.expiryDate` — قد يؤدي لقراءة قيمة خاطئة | توحيد حقل واحد للتاريخ |
| M4 | `seed.ts:16-18` | لا ينشئ سجل اشتراك للشركة المزروعة | إضافة `INSERT INTO subscriptions` بعد إنشاء الشركة |
| M5 | `adminSubscriptions.ts:255-258` | لا يوجد حد أقصى لمدة الاشتراك (يمكن إدخال 999999 شهر) | إضافة `Math.min(durationMonths, 1200)` و `Math.min(durationYears, 100)` |
| M6 | `adminSubscriptions.ts:398` | `canceled_at` يُضبط أثناء عملية التعليق (suspend) — خطأ دلالي | استخدام حقل `suspended_at` منفصل بدلاً من إعادة استخدام `canceled_at` |
| M7 | `auth.ts:27` | متغير `JWT_EXPIRY` معرف في السطر 6 لكن غير مستخدم في السطر 27 | استخدام `JWT_EXPIRY` في دالة `generateToken()` بدلاً من '24h' الثابت |
| M8 | `entity.ts:233` | `created_by` يُضبط بقيمة `companyId` بدلاً من `userId` | تغيير إلى `getUserId(req)` بدلاً من `getCompanyId(req)` |
| M9 | `adminSubscriptions.ts:479, 553` | مساران مكرران يفعلان نفس الشيء: `activate` (سطر 232) و `activate-company` (سطر 479) | إزالة المسار المكرر أو دمج المنطق |
| M10 | `router/index.ts:326-341` | الفحص الأمامي للأدمن يتحقق من `companyId` فقط، لا يتأكد من `roleKey === 'admin'` | إضافة التحقق من `roleKey` مع `companyId` |

---

## 🟢 5. مشاكل بسيطة — LOW

### L1: مسار `/api/marketing/report` بدون أي مصادقة
أي شخص يمكنه تشغيل تقرير تسويقي. ضرر محدود (مجرد إرسال إيميل) لكنه نمط سيئ.

### L2: التوكن يظهر في URL أثناء Google OAuth
`auth.ts:366`:
```
redirect(`${frontendUrl}/#/login?google_token=${token}`)
```
التوكن يظهر في سجل المتصفح، سجلات السيرفر، وروابط الإحالة.

### L3: لا يوجد سبب إلزامي للإلغاء (Cancel)
`adminSubscriptions.ts:416` — لا يُطلب سبب للإلغاء، على عكس التعليق (suspend) الذي يقبل `reason`.

---

## ✅ 6. نقاط القوة — تعمل بشكل صحيح وتستحق الإشادة

1. **الـ Seed للمالك:** منشئ ذاتي (idempotent)، UUID ثابت، صلاحية حتى 2099، ON CONFLICT DO NOTHING — ممتاز.
2. **`requireAdminRole` في adminSubscriptions.ts:** فحص مزدوج — أولاً `companyId` من الـ JWT، ثانياً `role_key` باستعلام DB منفصل. هذا أسلوب دفاعي ممتاز (defense-in-depth).
3. **`isExcludedPath` في auth.ts:** استثناء `/system/`, `/subscriptions/`, `/admin/` من قفل انتهاء التجربة — صحيح ولا ثغرات فيه.
4. **عزل multi-tenancy:** كل استعلامات DB مصفاة بـ `WHERE company_id = $1` — صحيح ومطبق في كل مكان.
5. **حذف الملفين المكررين:** تم بشكل نظيف، بدون أي إشارات متبقية في أي مكان في المشروع.
6. **Bcrypt cost 12:** قوة تشفير ممتازة لكلمات المرور في كل أنحاء المشروع.
7. **Idempotent seed:** آمن للتشغيل المتكرر دون تدمير البيانات الموجودة.

---

## 🎯 7. ملخص التوجيه للوكيل — Priority Matrix

| الأولوية | المهمة | الموقع | الوقت التقديري |
|----------|--------|--------|---------------|
| 🔴 **فوراً** | إضافة `subscriptionStatus` إلى Google OAuth token | `auth.ts:363` | دقيقتان |
| 🔴 **فوراً** | إضافة `'lifetime'` إلى شروط `isReadOnly` في `licensing.ts` و `router/index.ts` | `licensing.ts:122,135` + `router/index.ts:313` | 5 دقائق |
| 🔴 **فوراً** | Check إيقاف تشغيل إذا JWT_SECRET لا يزال افتراضي | `auth.ts:5` | 5 دقائق |
| 🟠 **عاجل** | `must_change_password = TRUE` للمالك | `index.ts:253` | دقيقة |
| 🟠 **عاجل** | إضافة `requireAdminRole` على `clear-all-data` و `import-snapshot` | `system.ts` | 10 دقائق |
| 🟠 **عاجل** | Rate Limiting على auth endpoints | `index.ts` | 15 دقيقة |
| 🟡 **متوسط** | توحيد التسمية (camelCase) في `AdminSubscriptions.vue` | `AdminSubscriptions.vue:468-475` | 10 دقائق |
| 🟡 **متوسط** | إصلاح أو إزالة `auth.service.ts` (orphaned + trial 7d) | `auth.service.ts` | 10 دقائق |
| 🟡 **متوسط** | دمج migration 0001 + 0002 لضمان الاتساق | `migrations/` | 20 دقيقة |
| 🟡 **متوسط** | إضافة حد أقصى لمدة الاشتراك (100 سنة max) | `adminSubscriptions.ts:255` | 5 دقائق |
| 🟢 **بسيط** | إصلاح `canceled_at` أثناء التعليق (استخدام `suspended_at`) | `adminSubscriptions.ts:398` | 5 دقائق |
| 🟢 **بسيط** | استخدام `JWT_EXPIRY` بدلاً من '24h' الثابت | `auth.ts:27` | دقيقتان |
| 🟢 **بسيط** | إصلاح `entity.ts:233` — `created_by` يعين `companyId` بدلاً من `userId` | `entity.ts:233` | دقيقة |

---

*تم إعداد التقرير بواسطة المراجع التقني — 2026-06-20*
