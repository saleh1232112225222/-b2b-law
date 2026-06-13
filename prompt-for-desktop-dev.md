
## المطلوب: تطبيق تحليل نتائج الجلسات الذكي — شجرة القرارات الهرمية  

### 1. Backend: `judgmentAnalyzer.service.ts`  
**الملف:** `cloud-server/src/services/judgmentAnalyzer.service.ts`

**التغيير الجوهري — إعادة كتابة `analyzeJudgment()`:**

```typescript
// ── بعد التعديل ──

// 1. تحديد درجة الحكم من المدخلات
const degree = input.judgmentType?.includes('قطعي') ? 'قطعي'
  : input.judgmentType?.includes('نهائي') ? 'نهائي'
  : input.judgmentType?.includes('استئناف') ? 'استئنافي'
  : input.judgmentType?.includes('ابتدائي') ? 'ابتدائي'
  : determineDegree(input.result)

// 2. قابلية الطعن — فقط نهائي هو النهائي
const isInitial = degree === 'ابتدائي' || degree === 'استئنافي' || degree === 'قطعي'
const isFinal = degree === 'نهائي'

// 3. تحديد صاحب الحكم من input (كان سابقاً hardcoded)
const favors = input.isForClient === undefined ? undefined
  : input.isForClient ? 'موكل' : 'خصم'
```

**المنطق الهرمي (بعد التعديل):**

```
if (outcomeType !== 'حكم') → analyzeNonJudgmentOutcome()

if (isInitial):
  if (favors === 'موكل'):
    needsExecution = input.needsExecution ?? false
    hasAppealGrounds = false
    if needsExecution → مهام تنفيذ (3 مهام)
    else → مهمة أرشفة فقط
    ← مهمة تبليغ العميل
  
  if (favors === 'خصم'):
    hasAppealGrounds = input.hasAppealGrounds ?? false
    if hasAppealGrounds → مهام تقديم اعتراض (2 مهمة) + موعد نهائي
    ← مهمة تبليغ العميل

if (isFinal):
  if (favors === 'موكل'):
    نفس منطق isInitial لكن بدون hasAppealGrounds (ممنوع)
  
  if (favors === 'خصم'):
    → مهمة أرشفة + تبليغ (لا يقبل الطعن)
```

**دالة جديدة `analyzeNonJudgmentOutcome()`:**  
تتعامل مع `قرار`، `حجز للحكم`، `تأجيل`، `تبليغ / إجراء إداري`، `أخرى` — كل نوع يرجع مهامه الخاصة.

**ثوابت المهلة:**  
```typescript
const CASE_TYPE_DEADLINES: Record<string, number> = {
  مدنية: 30, تجارية: 30, عمالية: 30, جنائية: 30, إدارية: 60, default: 30
}
```

---

### 2. Frontend – الأسئلة الذكية في المودال  

**الملفات:**  
- `SessionRoom.vue` — شاشة الجلسة  
- `BriefingDashboard.vue` — لوحة الموجز  

**المودال يحتوي على (بترتيب الظهور):**

```
1. v-if="result === 'صدور حكم قطعي'"
   ← درجة الحكم: استئنافي | قطعي | نهائي  (v-btn-toggle)

2. الحكم لصالح من؟
   ← الموكل | الخصم  (v-btn-toggle, mandatory)

3. v-if="judgmentFavors === 'الموكل'"
   ← هل الحكم يحتاج تنفيذ؟
     ← نعم، يحتاج تنفيذ | لا، براءة أو منتهي (v-btn-toggle)

4. v-if="judgmentFavors === 'الخصم'"
   ← هل يوجد سبب مشروع للاعتراض على الحكم؟
     ← نعم، يوجد أسباب | لا، الحكم صحيح (v-btn-toggle)
     
4a. v-if="judgmentHasAppealGrounds === 'نعم'"
    ← تاريخ التبليغ بالحكم (date input)

5. نوع القضية (لحساب المدة النظامية)
   ← مدنية | تجارية | عمالية | جنائية | إدارية | أحوال شخصية (v-select)
```

**حقول `outcomeModal` ref — أضف:**

```typescript
judgmentFavors: '',
judgmentNeedsExecution: '',
judgmentHasAppealGrounds: '',
judgmentDegree: '',
caseType: ''
```

**دالة `openOutcomeModal()` — أضف التصفير للحقول الجديدة:**

```typescript
judgmentFavors: '',
judgmentNeedsExecution: '',
judgmentHasAppealGrounds: '',
judgmentDegree: '',
caseType: ''
```

---

### 3. Payload — تصحيح `submitOutcome()`

**قبل (خاطئ — hardcoded):**
```typescript
payload.judgmentData = {
  judgment_number: ...,
  judgment_type: ...,
  is_executable: result === 'صدور حكم قطعي',
  objection_period_days: 30,
  judgment_date: ...,
  service_date: ...,
  is_for_client: true,          // ← خاطئ: دائماً true
  has_appeal_grounds: false,    // ← خاطئ: دائماً false
  needs_execution: result === 'صدور حكم قطعي' // ← خاطئ
}
```

**بعد (صحيح — من أسئلة المودال):**
```typescript
payload.judgmentData = {
  judgment_number: outcomeModal.value.judgmentNumber,
  judgment_type: outcomeModal.value.judgmentDegree || jt,
  judgment_date: outcomeModal.value.judgmentDate,
  service_date: outcomeModal.value.serviceDate || outcomeModal.value.judgmentDate,
  is_for_client: outcomeModal.value.judgmentFavors === 'الموكل',       // boolean
  has_appeal_grounds: outcomeModal.value.judgmentHasAppealGrounds === 'نعم', // boolean
  needs_execution: outcomeModal.value.judgmentNeedsExecution === 'نعم'    // boolean
}
```

**وأضف في الـ payload الرئيسي:**
```typescript
caseType: outcomeModal.value.caseType || undefined
```
(وأرسله أيضاً في `preview` و `apply` API calls)

---

### 4. رسالة التأكيد — حسب السيناريو  

**قبل (عامة — نفس الشي للجميع):**
```
══════════════════════════════
  التحليل الذكي للنتيجة
══════════════════════════════
• نوع النتيجة: ...
• درجة الحكم: ...
• لصالح: ...
• يحتاج تنفيذ: نعم
• يوجد أسباب اعتراض: نعم
• مدة الاعتراض: 30 يوم
• آخر موعد للاعتراض: ...
──────────────────────────────
  المهام التي سيتم إنشاؤها:
──────────────────────────────
...
══════════════════════════════
هل تريد المتابعة في تسجيل النتيجة؟
```

**بعد (حسب المسار — رسائل مختلفة لكل سيناريو):**

```
// سيناريو: حكم + لصالح الموكل + يحتاج تنفيذ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  تحليل الحكم القضائي
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• نوع النتيجة: حكم
• درجة الحكم: ابتدائي
• الحكم: لصالح الموكل
• الإجراء: يحتاج تنفيذ
• المسار: إنشاء مهام تنفيذ الحكم

──────────────────────────────
  المهام الذكية التي ستُنشأ:
──────────────────────────────
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
هل أنت متأكد من تسجيل النتيجة؟
سيتم إغلاق الجلسة وإنشاء المهام أعلاه.
```

```
// سيناريو: حكم + ضد الموكل + يوجد اعتراض
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  تحليل الحكم القضائي
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• نوع النتيجة: حكم
• درجة الحكم: قطعي
• الحكم: ضد الموكل (لصالح الخصم)
• الإجراء: يوجد أسباب اعتراض
• المسار: الطعن بالنقض
• مدة الاعتراض: 30 يوم
• آخر موعد: 2026-07-01
...
```

```
// سيناريو: غير حكم (تأجيل مثلًا)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  تحليل نتيجة الجلسة
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• نوع النتيجة: تأجيل
• الإجراء: متابعة تاريخ الجلسة الجديدة
...
```

---

### 5. إضافة `BRAIN` إلى `ICONS.SYSTEM`  

**الملف:** `src/renderer/src/config/icons.ts`  

أضف قبل إغلاق `SYSTEM`:
```typescript
SYSTEM: {
  ...
  SYNC: 'refresh-cw',
  BRAIN: 'brain'   // ← جديد
}
```

---

### 6. `emptyOutDir: true` في `vite.config.ts`  

```typescript
build: {
  outDir: resolve('dist/web'),
  emptyOutDir: true,   // ← من false إلى true
```

يمنع تراكم ملفات الـ build القديمة.

---

### 7. CI/CD — تصحيح `secrets` في `if` conditions  

**الملف:** `.github/workflows/ci-cd.yml`  

GitHub Actions يمنع استخدام `secrets.X` مباشرة في `if:` على مستوى الـ step.  
الحل: تمرير الـ secrets كـ env vars على مستوى الـ job، ثم استخدام `env.X` في `if:`.

```yaml
deploy:
  env:
    RENDER_DEPLOY_HOOK_URL: ${{ secrets.RENDER_DEPLOY_HOOK_URL || '' }}
    RENDER_API_KEY: ${{ secrets.RENDER_API_KEY || '' }}
  steps:
    - name: Deploy to Render
      if: env.RENDER_DEPLOY_HOOK_URL != ''
      run: curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_URL }}"
```

---

### الخلاصة — شجرة القرارات  

```
نتيجة الجلسة
├── غير حكم (تأجيل/حجز/تبليغ/قرار/أخرى)
│   └── رسالة + مهام مخصصة حسب النوع
│
└── حكم (ابتدائي/قطعي)
    ├── درجة: ↓ (قطعي فقط يظهر Degree Selector)
    ├── لصالح من؟ ↓
    │   ├── الموكل → هل يحتاج تنفيذ؟ ↓
    │   │   ├── نعم → 4 مهام (تبليغ+تنفيذ+متابعة+أرشفة)
    │   │   └── لا (براءة) → 2 مهام (تبليغ+أرشفة)
    │   │
    │   └── الخصم → هل يوجد أسباب اعتراض؟ ↓
    │       ├── نعم → تاريخ تبليغ → 3 مهام (تبليغ+اعتراض+دراسة) + موعد نهائي
    │       └── لا → 1 مهمة (تبليغ) 
    │
    └── نوع القضية → لحساب المدة (30 أو 60 يوم)
```

**كل الإجابات من أسئلة المودال ترسل كـ payload صحيح (`is_for_client`, `has_appeal_grounds`, `needs_execution`)** بدلاً من القيم الثابتة.  
**رسالة التأكيد تختلف** حسب المسار المحدد.
