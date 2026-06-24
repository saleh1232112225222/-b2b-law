# وكيل تطبيق نظام التصميم المستخرج من Figma (POA Mockups)

## المهمة

تطبيق نظام التصميم الزجاجي الذهبي (Gold Glassmorphism) المستخرج بدقة من 6 صور Figma
على جميع شاشات وواجهات برنامج B2B-LAW.

## المصادر

1. **التصاميم المرجعية**: `G:\w2w\figma-designs\poa-mockups\`
   - `figma_poa_form_light/dark.png` — نموذج إضافة/تعديل وكالة
   - `figma_poa_mobile_first_light/dark.png` — قائمة الوكالات (جوال)
   - `figma_poa_preview_light/dark.png` — معاينة تفاصيل الوكالة

2. **الأنماط المضافة**: `G:\w2w\src\renderer\src\assets\css\theme.css`
   (تم إضافة 40 كلاس/style جديد)

3. **السكربت التلقائي**: `G:\w2w\scripts\apply-figma-design-system.js`
   (طبق التعديلات على 43 ملف — الباقي يحتاج مراجعة يدوية)

4. **جميع ملفات Vue**: 162 ملف في `src/renderer/src/`

## المواصفات التصميمية الدقيقة (Figma Pixel Analysis)

### الألوان

| العنصر            | الوضع الفاتح                         | الوضع الداكن                                         |
| ----------------- | ------------------------------------ | ---------------------------------------------------- |
| الخلفية الأساسية  | `#f4f6f9` → `#ffffff`                | `#0d0f14` → `#161920`                                |
| لون الكروت        | `rgba(255,255,255,0.7)` + blur(20px) | `rgba(255,255,255,0.03)` + blur(25px) saturate(150%) |
| حدود الكروت       | `rgba(233,195,73,0.15)`              | `rgba(233,195,73,0.25)`                              |
| لون الذهب الأساسي | `#e9c349` (RGB 233,195,73)           | `#e9c349`                                            |
| لون الذهب للنص    | `#B8941E` (أسود للتباين)             | `#e9c349` أو `#FFF3C4`                               |
| لون النص الأساسي  | `#000000`                            | `#F1F5F9`                                            |
| لون النص الثانوي  | `#334155`                            | `rgba(241,245,249,0.78)`                             |
| Navy (هيدر)       | `#0F2A55` → `#1A437D`                | `#060C18` → `#131D30`                                |
| زوايا الكروت      | 14px                                 | 14px                                                 |
| زوايا الحوارات    | 24px                                 | 24px                                                 |
| زوايا الأزرار     | 12px                                 | 12px                                                 |
| زوايا الحقول      | 14px                                 | 14px                                                 |

### الكلاسات الرئيسية المستخدمة

```html
<!-- الكروت -->
<v-card class="glass-card">...</v-card>

<!-- الأزرار الرئيسية (ذهبية) -->
<v-btn class="premium-btn-gold-gradient">حفظ</v-btn>

<!-- الأزرار الثانوية -->
<v-btn class="btn-gold-outline">إلغاء</v-btn>

<!-- الحقول -->
<v-text-field class="glass-input"></v-text-field>

<!-- الحوارات -->
<v-card class="glass-dialog">
  <div class="glass-dialog-header">...</div>
  <div class="glass-dialog-body">...</div>
  <div class="glass-dialog-footer">...</div>
</v-card>

<!-- النص الذهبي -->
<span class="text-gold">عنوان</span>

<!-- الحدود الذهبية -->
<v-divider class="divider-gold"></v-divider>

<!-- البطاقات الجوال -->
<v-card class="mobile-poa-card">
  <div class="mobile-poa-card-header">...</div>
  <div class="mobile-poa-card-footer">...</div>
</v-card>

<!-- علامات التبويب -->
<v-btn-toggle class="glass-tabs">
  <v-btn class="glass-tab-active">نشط</v-btn>
</v-btn-toggle>

<!-- مربع المعاينة -->
<div class="preview-box">...</div>

<!-- بطاقة أطراف -->
<div class="party-card">...</div>

<!-- بند الصلاحية -->
<div class="power-item">
  <span class="power-bullet"></span>
  النص
</div>

<!-- شريط البحث -->
<v-text-field class="search-field"></v-text-field>

<!-- تأثير الرفع -->
<v-card class="card-lift">...</v-card>
```

## قائمة الشاشات (49 رئيسية + 103 فرعية = 162 ملف)

### الشاشات الرئيسية التي تحتاج مراجعة (48 ملف):

1. `Login.vue` — صفحة تسجيل الدخول
2. `Register.vue` — صفحة التسجيل
3. `LockScreen.vue` — شاشة القفل
4. `Dashboard.vue` — لوحة التحكم الرئيسية
5. `BriefingDashboard.vue` — الموجز الشامل
6. `SessionRoom.vue` — غرفة الجلسات
7. `Clients.vue` — إدارة الموكلين
8. `ClientProfile.vue` — ملف الموكل
9. `Defendants.vue` — إدارة المدعين
10. `POA.vue` — إدارة الوكالات (مرجع أساسي)
11. `Cases.vue` — إدارة القضايا
12. `CaseDetails.vue` — تفاصيل القضية
13. `Sessions.vue` — إدارة الجلسات
14. `Tasks.vue` — إدارة المهام
15. `Documents.vue` — المستندات
16. `Drafting.vue` — الصياغة
17. `Memoranda.vue` — المذكرات
18. `Experts.vue` — تقارير الخبرة
19. `Finance.vue` — المالية
20. `Contracts.vue` — العقود
21. `Enforcement.vue` — التنفيذ
22. `Communications.vue` — المراسلات
23. `Firm.vue` — إدارة المكتب
24. `Employees.vue` — الموظفين
25. `EmployeePerformance.vue` — أداء الموظفين
26. `Settings.vue` — الإعدادات
27. `SubscriptionPlans.vue` — خطط الاشتراك
28. `Search.vue` — البحث العام
29. `Archive.vue` — الأرشيف
30. `ActivityLog.vue` — سجل النشاطات
31. `UsersManagement.vue` — إدارة المستخدمين
32. `OfficeVaultSetup.vue` — إعداد الخزنة
33. `FileVault.vue` — خزنة الملفات
34. `ReportsDashboard.vue` — مركز التقارير
    34-44. `*Report.vue` — 10 تقارير مختلفة
35. `Profile.vue` — الملف الشخصي
36. `Forbidden.vue` — وصول ممنوع
37. `SkeletonBase.vue` — هيكل التحميل
38. `DevConsole.vue` — كونسول المطور

### المكونات المشتركة (57 ملف):

- `components/common/*.vue` — 13 مكون مشترك
- `components/enforcement/*.vue` — 7 مكونات تنفيذ
- `components/finance/*.vue` — 6 مكونات مالية
- `components/mobile/*.vue` — 17 مكون جوال
- `components/charts/*.vue` — 3 مكونات رسوم بيانية
- `components/briefing/*.vue` — 4 مكونات موجز
- `components/*.vue` — 7 مكونات أخرى

## خطوات العمل

### المرحلة 1: فحص الكلاسات (مهمة الوكيل الذكي)

لكل ملف Vue من الـ 162 ملف:

1. **ابحث عن `<v-card>`**: تأكد من وجود `class="glass-card"` أو `class="... glass-card ..."`
   - إذا كانت v-card داخل v-data-table → تجاهلها
   - إذا كانت v-card داخل v-dialog → استخدم `class="glass-dialog"` بدلاً من ذلك

2. **ابحث عن `<v-text-field>`, `<v-select>`, `<v-autocomplete>`, `<v-textarea>`, `<v-combobox>`**:
   - تأكد من وجود `class="glass-input"` أو `class="... glass-input ..."`
   - لحقول البحث → استخدم `class="search-field"` بدلاً من أو بالإضافة

3. **ابحث عن `<v-btn>` الرئيسية** (color="accent", color="primary", color="gold", أو الأزرار التي تحوي "حفظ", "إضافة", "تسجيل", "اعتماد"):
   - تأكد من وجود `class="premium-btn-gold-gradient"`
   - الأزرار الثانوية (إلغاء, تراجع) → `class="btn-gold-outline"`

4. **ابحث عن الـ `<v-dialog>`**:
   - v-card داخل الـ dialog → استخدم `glass-dialog` بدلاً من `glass-card`
   - أضف `glass-dialog-header` و `glass-dialog-footer` للأقسام العلوية والسفلية

5. **ابحث عن الـ `<v-btn-toggle>`**:
   - أضف `class="glass-tabs"`
   - الزر النشط → `class="glass-tab-active"`

6. **ابحث عن حدود وفواصل**:
   - `<v-divider>` → أضف `class="divider-gold"`
   - borders → استخدم `rgba(233,195,73,0.15)` للذهبي

7. **ابحث عن نصوص ذهبية وعناوين**:
   - استخدم `class="text-gold"` للعناوين الرئيسية
   - استخدم `class="text-gold"` مع `font-weight-black` للتباين

8. **ابحث عن `<v-chip>` للحالات**:
   - نشط → `class="status-badge status-active"`
   - منتهي/خطأ → `class="status-badge status-expired"`

### المرحلة 2: إصلاح المشاكل الشائعة

1. **كلاسات مكررة**: `class="glass-card glass-card"` → `class="glass-card"`
2. **كلاسات متضاربة**: لا تضع `premium-btn-gold-gradient` على v-btn في v-data-table
3. **التباين في الوضع الفاتح**: النص الذهبي في الوضع الفاتح يجب أن يكون أسود (`#000000`)
4. **الفواصل بين الحقول**: استخدم `gap-md` أو `gap-lg`
5. **حقول التاريخ المزدوج (Gregorian + Hijri)**: استخدم `date-dual` للنمط

### المرحلة 3: التحقق

1. تأكد من أن `glass-card` موجودة على كل `v-card` (باستثناء الجداول)
2. تأكد من أن `premium-btn-gold-gradient` موجودة على كل زر رئيسي
3. تأكد من أن `glass-input` موجودة على كل حقل إدخال
4. تأكد من عدم وجود كلاسات مكررة

## أمثلة على التطبيق الصحيح

### مثال 1: صفحة مع قائمة وجدول

```html
<v-container fluid class="pa-6">
  <!-- العنوان -->
  <div class="d-flex align-center mb-6">
    <div class="icon-gold-bg me-3">
      <LucideIcon name="file-text" :size="24" class="text-gold" />
    </div>
    <div>
      <h1 class="text-h5 font-weight-black text-gold mb-1">عنوان الصفحة</h1>
      <p class="text-body-2 text-gold opacity-60 font-weight-black">وصف الصفحة</p>
    </div>
  </div>

  <!-- شريط البحث -->
  <v-text-field class="search-field mb-4" placeholder="بحث..." hide-details />

  <!-- الجدول داخل كرت زجاجي -->
  <v-card class="glass-card">
    <v-data-table ... />
  </v-card>
</v-container>
```

### مثال 2: حوار (Dialog) فاخر

```html
<v-dialog max-width="800">
  <v-card class="glass-dialog">
    <div class="glass-dialog-header d-flex align-center pa-6">
      <div class="icon-gold-bg me-3">
        <LucideIcon name="plus" :size="24" class="text-gold" />
      </div>
      <span class="text-h5 font-weight-black text-gold">عنوان الحوار</span>
      <v-spacer />
      <v-btn icon class="btn-gold-outline" @click="close">
        <LucideIcon name="x" :size="20" />
      </v-btn>
    </div>

    <v-card-text class="pa-6">
      <v-row>
        <v-col cols="12" md="6">
          <label class="mb-2 font-weight-black text-gold">حقل 1</label>
          <v-text-field class="glass-input" />
        </v-col>
      </v-row>
    </v-card-text>

    <v-divider class="divider-gold" />

    <div class="glass-dialog-footer d-flex pa-6">
      <v-btn class="btn-gold-outline">إلغاء</v-btn>
      <v-spacer />
      <v-btn class="premium-btn-gold-gradient">حفظ</v-btn>
    </div>
  </v-card>
</v-dialog>
```

### مثال 3: بطاقة بيانات الجوال

```html
<v-card class="mobile-poa-card mb-4">
  <div class="mobile-poa-card-header d-flex align-center pa-4">
    <div class="d-flex align-center">
      <div class="icon-gold-bg me-3">
        <LucideIcon name="file-text" :size="20" class="text-gold" />
      </div>
      <div>
        <span class="text-caption text-gold d-block">الرقم المرجعي</span>
        <span class="font-weight-black">P0A-12345</span>
      </div>
    </div>
    <v-chip class="status-badge status-active me-auto">نشط</v-chip>
  </div>

  <v-card-text class="pa-4">
    <!-- محتوى البطاقة -->
  </v-card-text>

  <div class="mobile-poa-card-footer d-flex pa-2">
    <v-btn class="premium-btn-gold-gradient" size="small">عرض</v-btn>
    <v-btn class="btn-gold-outline" size="small">تعديل</v-btn>
  </div>
</v-card>
```

## معايير القبول

1. **جميع الـ 162 ملف Vue** مطبق عليها النظام التصميمي بشكل متسق
2. **جميع الكروت** تستخدم `glass-card` مع الحدود الذهبية والشفافية الزجاجية
3. **جميع الأزرار الرئيسية** تستخدم `premium-btn-gold-gradient` مع التدرج الذهبي
4. **جميع الحقول** تستخدم `glass-input` مع الحدود الذهبية
5. **جميع الحوارات** تستخدم `glass-dialog` مع زوايا 24px
6. **لا يوجد كلاسات مكررة** أو متضاربة
7. **التوافق مع الوضع الفاتح والداكن** باستخدام `[data-theme='dark']`
8. **التجاوب مع الجوال** باستخدام `useMobileLayout` والكلاسات المناسبة
9. **كل شاشة من الـ 49 شاشة** تطابق التصميم المرجعي في Figma

## التقارير المطلوبة

بعد الانتهاء، أعد تقرير يتضمن:

1. عدد الملفات التي تم تعديلها
2. عدد الملفات التي كانت متوافقة مسبقاً
3. أي تحديات أو استثناءات واجهتها
4. قائمة بالشاشات التي تحتاج مراجعة إضافية
