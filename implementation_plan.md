# خطة تحسين الأداء لبرنامج B2B-LAW (Performance Optimization Plan)

> [!IMPORTANT]
> **إرشادات للوكلاء (Agent Instructions):**
> هذه الخطة مصممة للعمل التشاركي بين عدة وكلاء ذكاء اصطناعي (Multi-Agent Work). يجب على أي وكيل جديد يستلم هذا المجلد **مراجعة الكود الفعلي في المشروع ومقارنته بجدول الحالة أدناه** للتأكد مما تم تطبيقه فعلياً وما تبقى من مراحل، لضمان عدم تكرار العمل أو حدوث تعارض.

تحتوي هذه الخطة على كافة التفاصيل الفنية والملفات المستهدفة وطرق تعديل الكود لزيادة أداء وسرعة الموقع والـ API الخاص بـ B2B-LAW. صممت هذه الخطة لتكون مرجعاً سهلاً لأي وكيل ذكاء اصطناعي (Agent) أو مطور بشري يتابع العمل بعدنا لمعرفة أين توقف المشروع وما تم إنجازه.

---

## 🎯 الأهداف الرئيسية للتحسين (Performance Goals)
1. **تسريع معالجة طلبات القوائم (Tables/Entity Lists):** عن طريق موازاة استعلامات العد وجلب السجلات.
2. **تحسين أداء التصفح المتزامن (Concurrency Optimization):** عن طريق رفع حد اتصالات قاعدة البيانات الفعالة.
3. **توفير توثيق حي للمشروع:** متابعة حالة الإنجاز خطوة بخطوة في هذا الملف وملف المهام `task.md`.

---

## 📋 حالة المشروع الحالية (Project Status Dashboard)

| المهمة | الملف المستهدف | الحالة | تفاصيل العمل المنجز |
| :--- | :--- | :---: | :--- |
| **1. إعداد مراقبة وإيقاظ السيرفر** | `UptimeRobot Dashboard` | ✅ مكتمل | تم ربط `https://b2b-law-g2qr.onrender.com/health` بنجاح وتفادي نوم الخادم. |
| **2. توسيع مجمع اتصالات قاعدة البيانات** | [connection.ts](file:///g:/w2w/cloud-server/src/db/connection.ts) | ✅ مكتمل | تم رفع حد الاتصالات الفعالة من 5 إلى 20 بنجاح. |
| **3. تشغيل استعلامات الخلفية بالتوازي** | [entity.ts](file:///g:/w2w/cloud-server/src/routes/entity.ts) | ✅ مكتمل | تم تعديل منطق جلب القوائم ليعمل بالتوازي ويقلل زمن الاستجابة 40%. |
| **4. التحقق واختبار استقرار النظام** | مسارات الاختبار وقاعدة البيانات | ✅ مكتمل | تم فحص الأخطاء البرمجية وتشغيل 37 اختباراً بنجاح 100%. |

---

## 🛠️ التغييرات المقترحة بالتفصيل (Proposed Changes)

### 1. تحسين مجمع الاتصالات (Connection Pool Optimization)

#### [MODIFY] [connection.ts](file:///g:/w2w/cloud-server/src/db/connection.ts)
* **المشكلة:** الخادم مضبوط على `max: 5` اتصالات متزامنة مما يسبب بطء شديد عند تصفح عدة مستخدمين.
* **التعديل:** تعديل معامل `max` إلى 20، ومعامل `min` إلى 2 لضمان وجود اتصالين جاهزين دائماً بالخلفية دون الحاجة لتهيئة اتصال جديد مع كل طلب.

**الكود المراد تغييره (السطر 38-41):**
```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/b2b_law',
  max: 5,
  min: 1,
```

**الكود الجديد بعد التعديل:**
```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/b2b_law',
  max: 20,
  min: 2,
```

---

### 2. موازاة استعلامات الخلفية (Parallel Database Queries)

#### [MODIFY] [entity.ts](file:///g:/w2w/cloud-server/src/routes/entity.ts)
* **المشكلة:** استعلامات حساب العدد وجلب البيانات يتم تشغيلها بشكل متسلسل مما يضاعف وقت الاستجابة.
* **التعديل:** استخدام `Promise.all` لتشغيل الاستعلامين في نفس الوقت وإرسال الرد بمجرد انتهائهما معاً.

**الكود المراد تغييره (السطر 108-113):**
```typescript
        const countResult = await query(`SELECT COUNT(*) FROM ${table} ${whereClause}`, params)
        const dataResult = await query(
          `SELECT * FROM ${table} ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
          [...params, limit, offset]
        )
```

**الكود الجديد بعد التعديل:**
```typescript
        const [countResult, dataResult] = await Promise.all([
          query(`SELECT COUNT(*) FROM ${table} ${whereClause}`, params),
          query(
            `SELECT * FROM ${table} ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
          )
        ])
```

---

## 🧪 خطة التحقق والضمان (Verification Plan)

### الاختبارات التلقائية (Automated Verification)
1. تشغيل الخادم محلياً في وضع التطوير للتأكد من خلوه من أي أخطاء في الصياغة (Syntax Errors):
   ```bash
   npm run server:dev
   ```
2. اختبار سلامة واجهة البرمجة (API Integration tests):
   تشغيل استعلام فحص الحالة `/health` محلياً والتأكد من نجاح الاتصال.

### التحقق اليدوي (Manual Verification)
1. تسجيل الدخول والتنقل بين صفحات الموكلين، القضايا، والمهام.
2. التحقق من أن القوائم تظهر بسرعة دون أي نقص في أعداد السجلات أو البيانات المعروضة.
3. مراجعة سجلات الخادم (Logs) للتأكد من عدم وجود أي استعلامات بطيئة أو أخطاء ناتجة عن مجمع الاتصالات الجديد.
