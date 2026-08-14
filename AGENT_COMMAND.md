# الأمر التنفيذي الإلزامي للوكيل — حماية ومزامنة بيانات برنامج المحاماة بين Web وDesktop وOneDrive

## 0. طبيعة المهمة

أنت تعمل على مشروع قائم وحساس يحتوي على بيانات قانونية حقيقية.

ممنوع التعامل مع المشروع كمشروع جديد، وممنوع إعادة بناء قاعدة البيانات أو الواجهات من الصفر لمجرد تنفيذ التكامل أو المزامنة.

الهدف النهائي هو تمكين المستخدم من العمل بالتناوب من:

- تطبيق Desktop.
- تطبيق Web.
- النسخ المحلية.
- النسخ المحفوظة عبر OneDrive.

مع ضمان عدم فقدان أي تعديل، وعدم الكتابة فوق نسخة أحدث، واكتشاف التعارضات قبل قبولها.

**الأولوية القصوى:**

> Data Integrity + Backward Compatibility + Safe Synchronization + Conflict Detection + Recovery

---

# 1. قاعدة عدم التخريب — CRITICAL

قبل كتابة أو تعديل أي كود يجب فحص النظام الحالي كاملًا.

ممنوع تنفيذ أي من الآتي مباشرة:

- حذف جدول.
- حذف عمود.
- إعادة تسمية جدول.
- إعادة تسمية عمود.
- تغيير نوع حقل قائم.
- تغيير Primary Key.
- تغيير Foreign Key.
- كسر علاقة قائمة.
- إعادة إنشاء قاعدة البيانات.
- استبدال قاعدة البيانات الكاملة بنسخة أخرى.
- استبدال بيانات الإنتاج بـSnapshot.
- تغيير Business Logic قائم دون تحليل أثر.
- إعادة تصميم الواجهات الحالية دون ضرورة.
- استبدال ملف قاعدة البيانات تلقائيًا من OneDrive.

أي تغيير من هذه الأنواع لا يتم إلا بعد:

1. Dependency Analysis.
2. Impact Analysis.
3. Backup.
4. Migration Plan.
5. Rollback Plan.
6. اختبار على نسخة غير إنتاجية.
7. إثبات عدم فقد البيانات وعدم كسر الوظائف.

إذا كان التغيير خطرًا وغير قابل للإثبات، لا تنفذه. سجله في التقرير مع البديل الآمن.

---

# 2. ابدأ بالفحص فقط — لا تبدأ البرمجة

أول مرحلة يجب أن تكون Audit فقط.

افحص كامل المشروع، ويشمل ذلك:

## Database

- جميع الجداول.
- جميع الحقول.
- Primary Keys.
- Foreign Keys.
- Unique Constraints.
- Indexes.
- Soft Delete.
- Timestamps.
- العلاقات.
- قواعد التكامل المرجعي.

## Backend

- Repositories.
- Services.
- APIs.
- Handlers.
- Database Access Layer.
- Existing Sync Logic.
- Export/Import.
- Snapshot/Restore.

## Frontend

- Views.
- Components.
- Stores.
- Forms.
- Dialogs.
- State Management.
- API calls.
- Loading/Error states.

## Desktop

- Local Database.
- Local Cache.
- File paths.
- OneDrive integration.
- Snapshot generation.
- Snapshot restoration.
- Offline behavior.

## Web

- مصدر البيانات.
- API.
- Authentication.
- Cache.
- Local state.
- طريقة القراءة والكتابة.

لا تعدل أي شيء قبل إكمال هذا الفحص.

---

# 3. افحص Snapshot الحالي

يوجد Snapshot فعلي للمشروع باسم:

`manual-snapshot-2026-08-14T10-18-10-812Z.json`

استخدمه لفهم بنية البيانات الحالية، ولا تعتبره تلقائيًا مصدر الحقيقة الوحيد.

افحص خصوصًا:

- `meta.schemaVersion`
- `meta.createdAt`
- `meta.appVersion`
- `tables`
- `clients`
- `defendants`
- `cases`
- `sessions`
- `agencies`
- `judgments`
- `memoranda`
- الخدمات القانونية.
- البيانات المالية.
- الجداول التي تحتوي `created_at`.
- الجداول التي تحتوي `updated_at`.
- الجداول التي تحتوي `is_deleted`.
- الجداول التي تحتوي `deleted_at`.
- الجداول التي تحتوي `deleted_by`.

لاحظ أن البيانات الحالية تستخدم بالفعل حقول الإنشاء والتحديث، كما توجد آلية Soft Delete في بعض الجداول. يجب الحفاظ على ذلك وعدم استبداله دون مبرر. 

---

# 4. أنشئ Baseline قبل أي تعديل

أنشئ تقريرًا يصف الوضع الحالي بدقة:

## A — Current Architecture

كيف يعمل النظام حاليًا؟

## B — Current Data Flow

كيف تنتقل البيانات بين:

```text
Desktop
Web
Local DB
Snapshot
OneDrive
Cloud
```

## C — Current Source of Truth

حدد فعليًا أين توجد قاعدة البيانات المرجعية الحالية بناءً على الكود، ولا تفترض ذلك.

## D — Current Snapshot Mechanism

كيف يتم:

- إنشاء Snapshot.
- حفظه.
- مزامنته مع OneDrive.
- استعادته.
- التحقق من صلاحيته.

## E — Database Dependency Map

حدد لكل جدول/حقل مهم:

- أين يعرف.
- أين يقرأ.
- أين يكتب.
- من يعتمد عليه.
- ما الواجهات التي تستخدمه.
- ما الخدمات التي تستخدمه.

## F — UI Dependency Map

حدد الواجهات والنماذج التي تعتمد على البيانات المراد تعديلها.

---

# 5. لا تجعل OneDrive مصدر الحقيقة

OneDrive يمكن أن يستخدم في:

- Backup.
- Snapshot.
- نقل ملفات.
- Recovery.
- المستندات والمرفقات.

لكن لا تستخدم:

> آخر ملف تمت مزامنته على OneDrive = أحدث قاعدة بيانات.

وممنوع بناء منطق:

```text
Latest File Wins
```

لأن ذلك قد يستبدل تغييرات أحدث بملف أقدم.

---

# 6. لا تستخدم File-Level Synchronization للبيانات

ممنوع:

```text
Desktop DB → Replace → Web DB
```

وممنوع:

```text
Web DB → Replace → Desktop DB
```

وممنوع:

```text
Snapshot A → Replace → Snapshot B
```

المزامنة يجب أن تكون على مستوى السجل والتغيير:

```text
Record
↓
Compare
↓
Detect Change
↓
Validate
↓
Apply Safe Change
↓
Revision
↓
Sync Log
```

---

# 7. حدد Source of Truth قبل التنفيذ

بعد فحص المشروع، حدد هل المصدر المرجعي الحالي هو:

- Cloud.
- Local.
- Hybrid.

واشرح لماذا.

إذا كان هناك Cloud/PostgreSQL فعلي كمصدر مركزي، فافحص إمكانية استخدامه كمصدر الحقيقة بدل مشاركة ملف قاعدة بيانات عبر OneDrive.

إذا كانت البنية الحالية تعتمد على Local DB وSnapshot، لا تستبدلها مباشرة؛ اقترح طبقة Synchronization آمنة فوقها.

---

# 8. المزامنة يجب أن تكون Record-Level

لكل كيان قابل للتعديل من Web أو Desktop، يجب أن نستطيع معرفة آخر Revision خاص به.

ابدأ بدراسة الجداول التي تشمل عادةً:

```text
clients
defendants
cases
case_parties
sessions
agencies
judgments
memoranda
case_documents
legal_services
legal_service_timeline
```

وأي جدول آخر يثبت الفحص أنه يتغير بين الويب والديسكتوب.

لا تضف أعمدة أو جداول عشوائيًا. يجب تقديم Impact Analysis لكل إضافة.

---

# 9. Revision Control

ادرس إضافة نظام Revision للسجلات المهمة، مثل:

```text
version
revision
updated_at
updated_by
updated_device_id
content_hash
sync_status
```

لكن قبل ذلك تحقق مما هو موجود بالفعل، ولا تنشئ حقولًا مكررة إذا كان النظام يملك بديلًا صالحًا.

يجب أن يكون Revision قابلًا للمقارنة وترتيبه موثوقًا.

مثال:

```text
20 → 21 → 22 → 23
```

كل تعديل معتمد يزيد Revision وفق آلية آمنة ومتسقة.

---

# 10. لا تعتمد على updated_at وحده

`updated_at` مفيد للتدقيق والعرض، لكنه ليس وحده آلية كافية لمنع الكتابة فوق نسخة أحدث.

يجب أن توجد آلية Revision/Concurrency Control مناسبة.

لا تعتمد على اختلاف ساعات الأجهزة لتحديد الأحدث.

---

# 11. Optimistic Concurrency Control

أي عملية حفظ يجب أن تتحقق من النسخة التي قرأ منها المستخدم.

المثال:

```text
User loaded record
base_revision = 21
```

عند الحفظ:

```text
UPDATE ...
WHERE id = ...
AND revision = 21
```

إذا كانت النسخة الحالية على المصدر المرجعي أصبحت 22، يجب رفض الحفظ وعدم الكتابة فوق Revision 22.

النتيجة:

```text
CONFLICT
```

ويجب إعادة الحالة للواجهة بدل تنفيذ الكتابة الصامتة.

---

# 12. Content Hash

ادرس استخدام `SHA-256` أو آلية مكافئة لبصمة المحتوى بعد Canonical Serialization.

البصمة يجب أن تمثل محتوى السجل الحقيقي، وليس Metadata المتغيرة فقط.

افصل الحقول التشغيلية مثل Revision وsync metadata عن Content Hash عند الحاجة.

الهدف:

```text
Same Content → Same Hash
Different Content → Different Hash
```

---

# 13. حالات المزامنة المطلوبة

يجب أن يستطيع النظام تمييز الحالات التالية:

### SYNCED

```text
Local revision = Server revision
Hash equal
```

### PULL REQUIRED

المصدر المرجعي أحدث.

### PUSH REQUIRED

يوجد تعديل محلي لم يُرفع.

### CONFLICT

توجد تغييرات محلية وتغييرات أحدث على المصدر نفسه قبل إتمام الحفظ.

### OFFLINE

لا يوجد اتصال.

### FAILED

فشلت المزامنة ويجب تسجيل السبب.

---

# 14. ممنوع Last-Write-Wins عشوائيًا

لا تستخدم قاعدة:

> آخر تعديل زمني يفوز.

خصوصًا في:

- نص القضية.
- الطلبات.
- المذكرات.
- الملاحظات.
- مبالغ المطالبات.
- الجلسات.
- الأحكام.
- الوكالات.
- البيانات المالية.

في هذه الحالات يجب اكتشاف التعارض وعرض الفرق.

---

# 15. Conflict Resolution

عند التعارض، أنشئ آلية تعرض:

```text
Entity
Entity ID
Field
Remote Value
Local Value
Remote Revision
Local Base Revision
Remote Updated At
Local Updated At
Remote User
Local User
Remote Device
Local Device
```

والخيارات المناسبة بحسب طبيعة السجل:

```text
اعتماد النسخة البعيدة
اعتماد النسخة المحلية
دمج يدوي
إلغاء
```

لا تعتمد الدمج التلقائي في الحقول القانونية الحساسة دون إثبات سلامته.

---

# 16. Offline Mode

إذا كانت Desktop تدعم العمل دون اتصال:

كل تعديل محلي يجب أن يسجل كـPending Change.

مثلًا:

```text
pending_sync = true
base_revision
local_revision
operation_id
entity_type
entity_id
user_id
device_id
created_at
```

عند عودة الاتصال:

```text
Reconnect
↓
Compare Base Revision
↓
Same → Push
Different → Conflict
```

---

# 17. Sync Queue

ادرس إنشاء Queue مستقلة، مثل:

```text
sync_queue
```

تحتوي عند الحاجة على:

```text
id
operation_id
entity_type
entity_id
operation
base_revision
local_revision
payload
content_hash
device_id
user_id
created_at
status
error
retry_count
```

الحالات:

```text
pending
processing
synced
conflict
failed
cancelled
```

يجب أن تكون العمليات قابلة لإعادة المحاولة دون إنشاء نسخ مكررة.

---

# 18. Idempotency

كل عملية مزامنة يجب أن تملك `operation_id` فريدًا.

إعادة إرسال العملية نفسها بسبب انقطاع الشبكة يجب ألا ينشئ التعديل مرتين.

---

# 19. Sync Log

أنشئ سجلًا تشغيليًا للمزامنة إذا لم يكن موجودًا أصلًا، مثل:

```text
sync_log
```

ليحتوي على الأقل على:

```text
id
operation_id
device_id
user_id
entity_type
entity_id
operation
old_revision
new_revision
timestamp
result
conflict_id
```

يجب أن يمكننا معرفة:

- من عدل.
- ماذا عدل.
- متى عدل.
- من أي جهاز.
- هل نجحت المزامنة.
- هل وقع تعارض.

---

# 20. Soft Delete

احترم الحقول الموجودة حاليًا مثل:

```text
is_deleted
deleted_at
deleted_by
```

ممنوع تفسير عدم وجود سجل في Snapshot بأنه حذف.

الحذف يجب أن يكون تغييرًا معروفًا في سجل المزامنة.

---

# 21. منع الكتابة فوق سجل أحدث

هذا سيناريو اختبار إلزامي:

```text
Desktop reads Revision 20
↓
Web changes to Revision 21
↓
Desktop attempts save using Revision 20
```

النتيجة المطلوبة:

```text
SAVE REJECTED
CONFLICT DETECTED
NO OVERWRITE
NO DATA LOSS
```

---

# 22. مزامنة Desktop عند التشغيل

صمم آلية تشغيل آمنة مثل:

```text
START
↓
Identify Device
↓
Check Connectivity
↓
Read Local Sync State
↓
Check Current Remote Revision
↓
Detect Pending Local Changes
↓
Pull Safe Remote Changes
↓
Detect Conflicts
↓
Apply Safe Changes
↓
Push Local Changes
↓
Validate
↓
Mark Synced
↓
Open Application
```

إذا وجدت تعارضات حساسة، لا تضع الحالة `SYNCED`.

---

# 23. مزامنة القضية قبل التحرير

عند فتح قضية للتعديل:

1. تحقق من آخر Revision.
2. إذا كانت النسخة المحلية قديمة، نفذ Pull/Sync.
3. إذا وجد تعارض، أوقف التحرير أو افرض آلية حل التعارض المناسبة.
4. افتح محرر القضية بعد استقرار النسخة.

لا تسمح بالتعديل الصامت على Cache قديم.

---

# 24. واجهة حالة المزامنة

أضف عنصرًا غير مدمر في الواجهة الحالية:

```text
حالة المزامنة
```

والحالات:

```text
✅ متزامنة
⟳ جارٍ التزامن
⚠ توجد تحديثات
⚠ يوجد تعارض
✕ فشل التزامن
◌ غير متصل
```

مع عرض:

- آخر مزامنة.
- آخر تغيير.
- عدد التحديثات المعلقة.
- عدد التعارضات.

أضف زر:

```text
مزامنة الآن
```

ولا تعيد تصميم الواجهات القائمة.

---

# 25. Snapshot ليس Restore تلقائيًا

يجب أن يبقى Snapshot وسيلة Backup/Recovery/Export، وليس وسيلة Synchronization الأساسية.

الاستعادة يجب أن تكون عملية صريحة وآمنة:

```text
Backup Current State
↓
Validate Snapshot
↓
Compare Schema
↓
Preview Impact
↓
Confirm
↓
Restore
↓
Validate Integrity
```

ممنوع:

```text
Open Snapshot → Replace Database
```

---

# 26. OneDrive

افحص بدقة طريقة استخدام OneDrive حاليًا.

حدد:

- هل قاعدة البيانات نفسها داخل مجلد OneDrive؟
- هل هناك ملفات مؤقتة؟
- هل توجد أقفال؟
- هل يمكن أن يكون OneDrive في طور المزامنة أثناء الكتابة؟
- كيف تتم تسمية النسخ؟
- كيف يتم اكتشاف اكتمال الرفع؟
- هل توجد أكثر من نسخة؟

إذا كانت قاعدة البيانات SQLite يتم فتحها مباشرة من مجلد OneDrive من أكثر من بيئة، صنف ذلك كـHIGH أو CRITICAL RISK بحسب البنية الفعلية، ولا تغيّره قبل تقديم بديل وخطة ترحيل آمنة.

---

# 27. Backward Compatibility

يجب أن تبقى البيانات والواجهات القديمة صالحة أثناء تطبيق التعديلات الجديدة.

الأفضل عند الحاجة:

```text
ADD TABLE
ADD COLUMN
ADD INDEX
```

بدل:

```text
DROP
RENAME
RECREATE
```

ولا تحذف القديم حتى تثبت أن جميع المستهلكين انتقلوا بأمان.

---

# 28. اختبار Regression

بعد أي تعديل، اختبر:

## Database Regression

- العلاقات.
- القيود.
- الفهارس.
- Nullability.
- Defaults.
- أنواع البيانات.

## Backend Regression

- إنشاء.
- تعديل.
- حذف.
- استرجاع.
- قراءة.

## Frontend Regression

- فتح الصفحات.
- النماذج.
- الحفظ.
- التعديل.
- الفلاتر.
- البحث.
- التنقل.

## Data Integrity

تأكد من عدم:

- فقد بيانات.
- Duplicate Records.
- Orphan Records.
- تغييرات صامتة.

---

# 29. اختبارات المزامنة الإلزامية

## TEST 1 — Desktop → Web

1. افتح Desktop.
2. عدل قضية.
3. احفظ.
4. افتح Web.
5. افتح القضية نفسها.
6. تحقق من ظهور التعديل.

## TEST 2 — Web → Desktop

1. افتح Web.
2. عدل القضية.
3. احفظ.
4. افتح Desktop.
5. تحقق من ظهور التعديل.

## TEST 3 — Conflict

1. افتح نفس القضية على Desktop.
2. لا تزامن.
3. عدل القضية محليًا.
4. عدل نفس القضية من Web.
5. احفظ Web.
6. عد إلى Desktop.
7. حاول الحفظ.

النتيجة المطلوبة:

```text
CONFLICT
NO OVERWRITE
NO DATA LOSS
```

## TEST 4 — Independent Changes

إذا عدل Desktop حقلًا، وعدل Web حقلًا مختلفًا، افحص إمكانية الدمج الآمن بدل رفض التعديلين، بشرط إثبات سلامة التصميم.

## TEST 5 — Soft Delete

اختبر حذف سجل Soft Delete من Desktop وظهور النتيجة نفسها في Web، والعكس.

## TEST 6 — Offline

1. افصل الإنترنت.
2. عدل سجلًا من Desktop.
3. تأكد من تسجيل Pending Change.
4. أعد الاتصال.
5. نفذ Sync.
6. إذا تغيرت النسخة المرجعية أثناء الانقطاع، يجب اكتشاف Conflict وعدم overwrite.

## TEST 7 — Retry

أوقف الاتصال أثناء عملية Sync.

ثم أعد الاتصال.

يجب إعادة المحاولة دون تكرار التعديلات.

---

# 30. لا تعدّل بيانات الإنتاج أثناء الاختبار

أنشئ نسخة اختبارية أو بيئة Staging إن أمكن.

أي اختبار يغير بيانات حقيقية يجب أن يكون مقيدًا ومعلومًا.

---

# 31. تقرير Compatibility Matrix

قبل أي تنفيذ فعلي، أنشئ جدولًا بهذه البنية:

| العنصر | المصدر الحالي | Web | Desktop | OneDrive | التوافق | الخطر | الإجراء |
|---|---|---|---|---|---|---|---|
| clients | ... | ... | ... | ... | ... | ... | ... |
| cases | ... | ... | ... | ... | ... | ... | ... |
| sessions | ... | ... | ... | ... | ... | ... | ... |
| agencies | ... | ... | ... | ... | ... | ... | ... |
| judgments | ... | ... | ... | ... | ... | ... | ... |
| memoranda | ... | ... | ... | ... | ... | ... | ... |
| case_documents | ... | ... | ... | ... | ... | ... | ... |
| legal_services | ... | ... | ... | ... | ... | ... | ... |

صنف التوافق إلى:

```text
🟢 Compatible
🟡 Partially Compatible
🟠 Requires Migration
🔴 Conflict / High Risk
```

---

# 32. تقرير Impact Analysis

لكل تعديل مقترح، أخرج:

```text
File
Table
Field
Component
Store
API
Repository
Current Behavior
Proposed Behavior
Dependencies
Risk
Impact
Migration
Rollback
Tests
```

---

# 33. تقرير الإجراءات المتوافقة وغير المتوافقة

لا تكتفِ بفحص الحقول.

افحص أيضًا العمليات:

- إنشاء عميل.
- تعديل عميل.
- حذف عميل.
- إنشاء قضية.
- تعديل قضية.
- إضافة طرف.
- تعديل جلسة.
- إضافة وكالة.
- تعديل وكالة.
- إضافة حكم.
- إضافة مذكرة.
- إضافة مستند.
- تعديل خدمة قانونية.
- العمليات المالية.
- الأرشفة.
- Soft Delete.
- استعادة المحذوف.
- Snapshot.
- Restore.
- Import.
- Export.
- Web → Desktop.
- Desktop → Web.
- Offline → Online.

ولكل عملية حدد:

```text
Compatible
Partially Compatible
Incompatible
High Risk
```

مع الأثر المتوقع وطريقة المعالجة.

---

# 34. لا تخلط بيانات النظام مع بيانات ناجز

بيانات ناجز الخارجية يجب أن تعامل كمصدر خارجي موثق.

أما بيانات المكتب الداخلية مثل:

- أتعاب المكتب.
- ملاحظات المحامي.
- تقييم القضية.
- الاستراتيجية.
- المهام.
- بيانات العمل الداخلية.

فيجب ألا تستبدل تلقائيًا ببيانات مصدر خارجي.

افصل بين:

```text
External Source Data
```

و:

```text
Internal Law Firm Data
```

ولا تحذف أي من النوعين بسبب اختلاف المزامنة دون قاعدة صريحة.

---

# 35. تكامل ناجز يجب أن يخضع للنفس القواعد

أي بيانات تستورد من ناجز يجب ألا تدخل قاعدة البيانات بطريقة تكسر المزامنة.

المطلوب:

```text
Najiz Extraction
↓
Normalize
↓
Validate
↓
Compare Existing Data
↓
Detect Change
↓
Revision / Conflict Check
↓
Persist Safely
↓
Log
```

ولا يجوز أن يقوم استيراد ناجز بعمل Full Replace لجدول كامل لمجرد أن البيانات مصدرها ناجز.

---

# 36. مطلوب عدم إخفاء الأخطاء

إذا فشلت مزامنة سجل واحد، لا تخفي الخطأ خلف نجاح عام للعملية.

يجب أن يظهر:

```text
Sync completed with errors

Success: 37
Conflicts: 1
Failed: 2
Pending: 4
```

مع القدرة على فتح تفاصيل كل خطأ.

---

# 37. Recovery

إذا حدث فشل أثناء Sync:

- لا تترك البيانات في حالة نصف مكتملة دون تسجيل.
- اجعل العملية قابلة للاستكمال.
- سجل ما تم تطبيقه.
- لا تعد تنفيذ العمليات الناجحة.
- لا تفقد العمليات الفاشلة.

---

# 38. Definition of Done

لا تعتبر المهمة مكتملة إلا إذا أثبت الاختبار أن:

- Desktop وWeb يعملان على نفس الحالة المرجعية بصورة آمنة.
- النظام يعرف أحدث Revision لكل سجل مهم.
- لا يمكن لنسخة قديمة الكتابة فوق نسخة أحدث.
- التعارضات تكتشف تلقائيًا.
- لا توجد Last-Write-Wins عشوائية.
- لا توجد Database Replacement أثناء Synchronization.
- لا توجد Data Loss.
- لا توجد Duplicate Records بسبب Sync.
- Soft Delete محفوظ.
- Offline Changes محفوظة.
- Pending Changes معروفة.
- Sync Queue تعمل بصورة صحيحة.
- Sync Log موجود وقابل للتدقيق.
- Snapshot ما زال يعمل.
- OneDrive لا يؤدي إلى overwrite صامت.
- الواجهات الحالية لم تنكسر.
- وظائف البرنامج السابقة لم تنكسر.
- Migration قابلة للرجوع عند الحاجة.
- نتائج اختبارات Regression موثقة.
- نتائج Compatibility Matrix موثقة.
- جميع التغييرات مقيدة بسبب تقني واضح.

---

# 39. أمر التنفيذ النهائي

**لا تبدأ بالتعديلات البرمجية مباشرة.**

نفذ بالترتيب الإجباري التالي:

```text
PHASE 1 — Full Audit
↓
PHASE 2 — Current Architecture Report
↓
PHASE 3 — Data & Dependency Map
↓
PHASE 4 — Compatibility Matrix
↓
PHASE 5 — Operations Compatibility Matrix
↓
PHASE 6 — Risk & Impact Analysis
↓
PHASE 7 — Proposed Sync Architecture
↓
PHASE 8 — Migration Plan
↓
PHASE 9 — Rollback Plan
↓
PHASE 10 — Test Plan
↓
PHASE 11 — Review Findings Against Existing Code
↓
PHASE 12 — Only Then Implement
↓
PHASE 13 — Regression Testing
↓
PHASE 14 — Final Integrity Report
```

**ممنوع تجاوز مرحلة إلى المرحلة التالية إذا كانت المرحلة السابقة تحتوي على خطر غير محلول يتعلق بسلامة البيانات أو كسر الواجهات.**

إذا اكتشفت تعارضًا بين البنية الحالية ومتطلبات المزامنة، لا تخمّن ولا تختر الحل الأسرع. وثق التعارض، قدم البدائل، واختر الحل الأقل خطورة والمتوافق مع البيانات الحالية.

## المبدأ الحاكم

> **قاعدة البيانات الحالية ليست شيئًا يعاد بناؤه لتناسب الميزة الجديدة؛ الميزة الجديدة هي التي يجب أن تتكيف مع النظام القائم، ما لم يثبت فنيًا أن Migration آمنة وضرورية.**

> **لا توجد نسخة «أحدث» بالاعتماد على اسم الملف وحده. أحدث نسخة هي أحدث حالة موثقة على مستوى السجل مع Revision وتحقق من التعارض.**

> **أي عملية Sync يجب أن تكون قابلة للتدقيق والاستئناف والاسترجاع، ولا يجوز أن تسبب فقدانًا أو overwrite صامتًا لبيانات أحدث.**

ابدأ الآن بالـAUDIT والتقارير فقط، ولا تعدل الكود أو قاعدة البيانات أو الواجهات قبل إظهار النتائج وفق المراحل السابقة.
