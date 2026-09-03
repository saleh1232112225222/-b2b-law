# دليل التشغيل الميداني للتعافي من الكوارث (Disaster Recovery Runbook)
**المشروع:** نظام B2B-LAW (تطبيق الويب + تطبيق سطح المكتب Windows)  
**الإصدار المعماري:** v3.0 (Multi-Slot Envelope & Encrypted Staging)  
**تاريخ الاعتماد:** 2026-08-31

---

## 1. الأهداف ونطاق الاستعادة (Scope & Objectives)
يوفر هذا الدليل إجراءات تشغيلية قياسية للمشغل البشري أو مهندس الأنظمة لاستعادة بيئة العمل بالكامل في الحالات التالية:
1. **الانهيار الشامل لقاعدة بيانات الخادم المركزي (PostgreSQL Central Database Collapse).**
2. **تلف جهاز سطح المكتب بالكامل والانتقال إلى جهاز Windows جديد ونظيف (Clean Machine Recovery).**
3. **التراجع الفوري (Emergency Rollback) عند تعثر أي عملية استعادة أو ترقية.**

---

## 2. استعادة خادم PostgreSQL من الصفر (Cloud Database DR)

### أ. المتطلبات القبلية (Prerequisites):
- توفر بيئة PostgreSQL نظيفة وفارغة (PostgreSQL 16+).
- توفر مجلد النسخة الاحتياطية المعتمدة ويحتوي على:
  - `database.dump` (صيغة PostgreSQL Custom Format المضغوطة).
  - `manifest.json` (بيان التجزئة والأعداد والمرفقات).
  - مجلد `attachments/` (المرفقات الموثقة ببصمات SHA-256).

### ب. خطوات التنفيذ عبر سطر الأوامر المستقل:
1. تعيين المتغيرات البيئية:
   ```bash
   export DR_TARGET_DATABASE_URL="postgresql://user:password@hostname:5432/target_empty_db"
   ```
2. فك تشفير الحزمة (إذا كانت مشفرة بـ `streamingCrypto v3`):
   ```bash
   node -e "
     const { decryptDumpFile } = require('./dist/recovery/postgresDisasterRecovery');
     decryptDumpFile('backup.dump.enc', 'backup/database.dump', 'YOUR_RECOVERY_PASSPHRASE');
   "
   ```
3. تنفيذ أمر الاستعادة الموثق مع تأكيد خلو القاعدة الهدف:
   ```bash
   npm run dr:restore -- --backup /path/to/backup --confirm-empty-target
   # أو بالأمر المباشر:
   # tsx src/cli/postgres-dr.ts restore --backup /path/to/backup --confirm-empty-target
   ```

### ج. معايير التحقق بعد الاستعادة:
- التأكد من خروج الأمر بكود نجاح `0`.
- مطابقة أعداد الجداول والمرفقات مع مانيفست الاستعادة `manifest.json`.
- تشغيل اختبار الاتصال `http://localhost:8080/health` والتأكد من إرجاع `{ "status": "ok" }`.

---

## 3. استعادة مكتب سطح المكتب على جهاز Windows نظيف (Clean Windows Recovery)

### أ. فك ارتباط هوية الجهاز القديم (Machine-Agnostic):
- حزم `.b2btenant` وحزم `streamingCrypto v3` لا ترتبط إطلاقاً برقم اللوحة الأم أو ملف ترخيص الجهاز القديم.
- يلزم فقط **عبارة مرور الاسترداد (Recovery Passphrase)** الخاصة بالمالك أو **مفتاح الأتمتة (Automation Key)**.

### ب. خطوات الاستعادة داخل التطبيق:
1. تثبيت تطبيق B2B-LAW على جهاز Windows الجديد.
2. فتح التطبيق والانتقال إلى: `الإعدادات` ← `حفظ واستعادة البيانات` ← `استعادة من حزمة مكتب (.b2btenant)`.
3. اختيار ملف الحزمة وإدخال كلمة المرور.
4. يقوم النظام تلقائياً بـ:
   - التحقق من ترويسة الغلاف والمنافذ الثنائية (Multi-Slot Envelope).
   - فك التشفير إلى مجلد مرحلي مؤقت (`Staging Sandbox`).
   - التحقق من كافة بصمات الجداول والمرفقات قبل المساس بقاعدة البيانات الحية.
   - أخذ نقطة تفتيش ذرية (`Atomic Checkpoint`) للقاعدة الحالية قبل الإحلال.
   - استبدال قاعدة SQLite ونقل المستندات إلى مجلد الخزينة `OfficeVault` ذرياً.

---

## 4. خطة التراجع الفوري (Emergency Rollback Procedures)

### أ. في تطبيق سطح المكتب:
- إذا انقطع التيار الكهربائي أو فشلت عملية الاستعادة في أي مرحلة:
  1. تبقى النسخة السابقة محفوظة في المسار:
     `%APPDATA%/b2b/backups/startup/checkpoint-*.sqlite`
  2. يقوم منسق الإقلاع `StartupCoordinator` باكتشاف أي خلل في السلامة `integrity_check` تلقائياً، ويعيد تحميل آخر نقطة تفتيش ذرية سليمة ويفتح التطبيق في وضع `Offline Safe Mode`.

### ب. في خادم PostgreSQL المركزي:
- أداة `postgres-dr.ts` ترفض صراحةً الكتابة فوق أي قاعدة تحتوي على جداول (`DR_TARGET_DATABASE_NOT_EMPTY`).
- الاستعادة تتم حصراً داخل قاعدة مؤقتة أو فارغة، مما يمنع الكتابة فوق البيانات الحية قبل التحقق التام.

---

## 5. سياسة الاحتفاظ الدورية (Backup Retention Policy)

- يتم تشغيل أداة الاحتفاظ `applyRetentionPolicy` دورياً لحذف النسخ القديمة مع تطبيق **القاعدة الذهبية الصارمة**:
  > **حظر حذف أحدث نسخة موثقة وسليمة نهائياً (Strict Preservation of Latest Verified Backup)** حتى لو تجاوزت المهلة المحددة بالأيام.
