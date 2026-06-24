# تقرير فني - تحليل ستايل شاشة لوحة التحكم (Dashboard)

## 1. نظرة عامة على الهيكل

### المكونات الرئيسية (Component Tree)

```
Dashboard.vue
├── DashboardKpiCards.vue          ← بطاقات KPI (6 بطاقات)
├── DashboardCalendarPanel.vue     ← التقويم (التبويب الأول)
├── DashboardChartsPanel.vue       ← الرسوم البيانية (التبويب الثاني)
├── DashboardSessionsAlerts.vue    ← الجلسات والتنبيهات
├── DashboardBottomStrip.vue       ← الشريط السفلي (مهام + تنبيهات)
├── DashboardQuickActions.vue      ← الإجراءات السريعة (العمود الأيمن)
├── DashboardAgencyDialog.vue      ← حوار تعديل الوكالة
└── ConfirmDialog.vue              ← حوار التأكيد العام
```

### ملفات الـ Layout
- `layouts/DesktopLayout.vue` — الشريط الجانبي (Sidebar) + شريط الأدوات (Toolbar)
- `components/common/DashboardCard.vue` — بطاقة KPI قابلة لإعادة الاستخدام

---

## 2. اللوحة اللونية (Color Palette)

### الألوان الأساسية — من `plugins/vuetify.ts`

| Name           | Hex       | RGB               | الاستخدام                              |
|----------------|-----------|-------------------|----------------------------------------|
| `primary`      | `#1A437D` | `26,67,125`       | النصوص التفاعلية، الأزرار الرئيسية       |
| `accent/gold`  | `#E9C349` | `233,195,73`      | اللون المميز (العلامة التجارية)         |
| `gold`         | `#B8941E` | `184,148,30`      | لون ذهبي داكن للأيقونات الثانوية        |
| `background`   | `#F4F6FA` | `244,246,250`     | خلفية عامة                             |
| `surface`      | `#FFFFFF` | `255,255,255`     | سطح البطاقات                           |
| `sidebar-bg`   | `#0F2A55` | `15,42,85`        | خلفية الشريط الجانبي (كحلي غامق)        |

### ألوان الحالة (Status Colors)

| Status  | Light     | Dark      |
|---------|-----------|-----------|
| info    | `#3B82F6` | `#60A5FA` |
| success | `#059669` | `#34D399` |
| warning | `#D97706` | `#FBBF24` |
| error   | `#DC2626` | `#F87171` |

### ألوان الـ Surface (من theme.css)

```
--color-surface-bright:          #fff8f0   (بيج فاتح جداً - خلفية المحتوى)
--color-surface:                 #f5eddf   (بيج)
--color-surface-dim:             #e1d9cc   (بيج داكن)
--color-surface-container-low:   #fbf3e5   (بيج فاتح)
--color-surface-container:       #f5eddf   (بيج)
--color-surface-container-high:  #efe7da   (بيج متوسط)
--color-surface-container-highest: #eae2d4 (بيج غامق)
```

### ألوان النصوص

```
--color-on-surface:       #1f1b13  (كحلي/داكن - النص الأساسي)
--color-on-surface-variant: #4d4635 (نص ثانوي)
--color-outline:          #7f7663  (حدود)
--color-outline-variant:  #d0c6af  (حدود فاتحة)
--color-on-primary:       #735c00  (نص على الذهبي)
--color-inverse-surface:  #343027  (خلفية معكوسة)
```

---

## 3. الـ Glassmorphism (الزجاجي)

المشروع يعتمد بشكل كثيف على **Glassmorphism Effect**.

```css
.glass-card {
  background: rgba(255, 255, 255, 0.7);  /* glass-bg-white */
  backdrop-filter: blur(20px);
  border: 1px solid rgba(26, 43, 72, 0.08);  /* glass-border */
  box-shadow: 0 20px 40px rgba(26, 43, 72, 0.05);  /* shadow-premium */
  border-radius: 14px;  /* radius-lg */
}
```

### متغيرات الـ Glass

```
--glass-bg-white:     rgba(255, 255, 255, 0.7)
--glass-bg-soft:      rgba(255, 255, 255, 0.5)
--glass-bg-dark:      rgba(15, 42, 85, 0.08)
--glass-blur:         blur(20px)
--glass-border:       rgba(26, 43, 72, 0.08)
--glass-border-gold:  rgba(233, 195, 73, 0.25)
```

### تدرجات الـ Glass حسب السياق

| السياق | الخلفية | الحدود | الاستخدام |
|--------|---------|--------|-----------|
| بطاقة عادية | `rgba(255,255,255,0.7)` | `rgba(26,43,72,0.08)` | بطاقات KPI, التقويم |
| بطاقة شفافة | `rgba(255,255,255,0.5)` | `rgba(26,43,72,0.08)` | البطاقات الجانبية |
| بطاقة ذهبية | `rgba(233,195,73,0.1)` | `rgba(233,195,73,0.25)` | التبويب النشط, التنبيهات |
| خلفية داكنة | `rgba(15,42,85,0.08)` | `rgba(26,43,72,0.08)` | العناصر على الخلفيات الفاتحة |

---

## 4. الظلال (Shadows)

| المتغير | القيمة | الاستخدام |
|---------|--------|-----------|
| `--shadow-premium` | `0 20px 40px rgba(26,43,72,0.05)` | البطاقات الأساسية |
| `--shadow-md` | `0 4px 12px rgba(26,43,72,0.08)` | البطاقات الفرعية |
| `--shadow-lg` | `0 8px 20px rgba(26,43,72,0.1)` | Hover |
| `--shadow-gold` | `0 4px 20px rgba(233,195,73,0.2)` | الأزرار الذهبية |

---

## 5. الخطوط (Typography)

| الخاصية | القيمة |
|----------|--------|
| Font Stack | `Cairo, Inter, Manrope, sans-serif` |
| حجم الأساس | `16px` |
| وزن الأساس | `400` |
| أوزان مستخدمة | `400`, `700`, `800`, `900` (black) |
| اتجاه الصفحة | `rtl` (في المحتوى), `ltr` (للشريط الجانبي الأيمن) |

### أحجام النصوص

| السياق | الحجم | الوزن | اللون |
|--------|-------|-------|-------|
| عناوين البطاقات | `0.95rem` | `800` | `#d4af37` |
| القيم الرقمية (KPI) | `1.5rem` (h4) | `900` | `#1f1b13` |
| عناوين الأعمدة (KPI) | `0.75rem` | `900` | `#1f1b13` |
| علامات التبويب | `0.78rem` | `700` | متغير |
| نص الجدول | `0.85rem` | `800` | `#000000` |
| عناوين الجدول | `0.85rem` | `900` | `#000000` |

---

## 6. الـ Border Radius

| المتغير | القيمة | الاستخدام |
|---------|--------|-----------|
| `--radius-sm` | `8px` | أيقونات, حواف صغيرة |
| `--radius-md` | `12px` | قوائم, حقول إدخال |
| `--radius-lg` | `14px` | **البطاقات الأساسية (Standard)** |
| `--radius-xl` | `24px` | الحوارات, الهوية الجانبية |
| `--radius-full` | `9999px` | شارات, أفاتار |

---

## 7. الشريط الجانبي (Sidebar)

### ملف: `DesktopLayout.vue` — الطبقة `premium-sidebar-modern`

| الخاصية | القيمة |
|----------|--------|
| العرض | `320px` |
| الاتجاه | `rtl` |
| الخلفية | `#0F2A55` (كحلي غامق) |
| توزيع العناصر | `flex column` |
| تباعد | `pa-4` |

### عناصر القائمة

| الحالة | الخلفية | لون النص | الحدود | الظل |
|--------|---------|----------|--------|------|
| **محدد (Active)** | `rgba(233,195,73,0.15)` | `#E9C349` | `1px solid #E9C349` | `0 0 20px rgba(233,195,73,0.2)` |
| **عادي** | `rgba(255,255,255,0.05)` | `#FFFFFF` | `1px solid rgba(255,255,255,0.6)` | لا |
| **ثانوي (Sub-item)** | `rgba(255,255,255,0.01)` | `rgba(255,255,255,0.7)` | `1px solid rgba(255,255,255,0.1)` | لا |

### هوية الشريط (B2B-LAW Logo)

| العنصر | القيمة |
|--------|--------|
| أيقونة الشعار | `80x80` مع `border-accent-glow` |
| العنوان H1 | `Roboto, sans-serif`, وزن `900`, لون `#E9C349` |
| الوصف | `font-weight: 900`, بحجم صغير, `opacity: 0.7` |

---

## 8. شريط الأدوات العلوي (Toolbar)

| الخاصية | القيمة |
|----------|--------|
| الخلفية | `rgba(255,255,255,0.78)` (زجاجي) |
| الحدود السفلية | `14px` (منحنية أسفل) |
| الظل | `0 18px 50px -34px rgba(15,23,42,0.18)` |
| العرض | `1120px` (باقي المساحة بعد السايدبار) |
| الارتفاع | `81px` |

---

## 9. بطاقات KPI (DashboardCard.vue)

### تعريف الـ Props

```ts
interface Props {
  title: string      // عنوان البطاقة
  value: number      // القيمة الرقمية
  icon: string       // اسم أيقونة Lucide
  color: string      // لون (primary, accent, indigo, success, error)
  trend: number      // نسبة التغير (اختياري)
  hoverable: boolean // true
  sparkline: number[] // بيانات الرسم البياني المصغر (اختياري)
  isMobile: boolean
}
```

### الهيكل الداخلي

```
┌─────────────────────────────┐
│ [icon]             [+5% ▲] │ ← trend badge
│                             │
│ 25                          │ ← value (h4, weight 900)
│ إجمالي الموكلين             │ ← title (tiny, weight 900)
│                             │
│ ╱╲╱╲╱╲                      │ ← sparkline (اختياري)
└─────────────────────────────┘
```

### الـ Hover Effect

```css
.glass-card.premium-lift:hover {
  border-color: var(--accent) !important;
  box-shadow: 0 8px 24px -4px var(--accent-glow), 0 0 0 1px var(--accent-alpha);
  transform: translateY(-3px) scale(1.01);
}
```

### ألوان البطاقات حسب النوع

| البطاقة | اللون | أيقونة | الرابط |
|---------|-------|--------|--------|
| إجمالي الموكلين | `primary` | `users` | `/clients` |
| عدد الموظفين | `primary` | `briefcase` | `/employees` |
| القضايا النشطة | `indigo` | `gavel` | `/cases` |
| جلسات اليوم | `accent` | `calendar-clock` | `/sessions` |
| مهام معلقة | `success` | `clipboard-list` | `/tasks` |
| طلب تنفيذ | `error` | `hand-coins` | `/enforcement` |

---

## 10. لوحة التحليل والتقويم (Analysis Panel)

### هيكل الـ Tabs

```
┌──────────────────────────────────────────┐
│ [icon] لوحة التحليل والتقويم              │
│                    التقويم | الرسوم البيانية | المؤشرات │
├──────────────────────────────────────────┤
│ المحتوى (VWindow)                        │
│   └─ Calendar / Charts / (metrics)       │
└──────────────────────────────────────────┘
```

### خصائص الـ Panel Card

```
background: var(--glass-bg-soft)    → rgba(255,255,255,0.5)
backdrop-filter: blur(20px)
border: 1px solid var(--glass-border)  → rgba(26,43,72,0.08)
border-radius: 14px
box-shadow: 0 4px 12px rgba(26,43,72,0.08)
transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1)
```

### خصائص عنوان الـ Panel

```
font-weight: 800
font-size: 0.95rem
color: #d4af37
```

---

## 11. لوحة الألوان النهائية (Quick Reference)

```
خلفية الصفحة:          #FFF8F0  (rgb(255,248,240))
خلفية الشريط الجانبي: #0F2A55  (rgb(15,42,85))
خلفية البطاقات:       rgba(255,255,255,0.7) (زجاجي)
خلفية الـ Toolbar:    rgba(255,255,255,0.78) (زجاجي)

النص الأساسي:    #1F1B13 (rgb(31,27,19))
النص الثانوي:    #4D4635
النص المطفأ:     #7F7663

الذهبي:          #E9C349 (rgb(233,195,73))
الذهبي الداكن:   #735C00
الكحلي:          #1A437D (rgb(26,67,125))

نجاح:   #059669
تحذير:  #D97706
خطأ:    #DC2626
معلومات: #3B82F6

الحدود: rgba(26,43,72,0.08)
الفواصل: rgba(208,198,175,0.3)
ظل البطاقات: 0 20px 40px rgba(26,43,72,0.05)
```

---

## 12. توصيات للتطوير القادم

1. **توحيد نظام الألوان**: يوجد تباين بين `#d4af37` (في panel-title) و `#E9C349` (gold الرسمي) و `#C5A028` (في DashboardCard). يُفضل توحيد المرجع إلى `--color-gold`.
2. **ألوان النصوص**: في Dashboard.vue (سطور 756-789) تُستخدم `color: #000` مباشرة بدلاً من متغير CSS.
3. **الـ Dark Mode**: موجود في الـ Vuetify theme (سطر 95-124) ويدعم `data-theme="dark"` (سطور 791-803) لكن يبدو غير مكتمل في بعض المكونات.
4. **الاتجاه (RTL/LTR)**: الفرق بين `dir="rtl"` في المحتوى و `dir="ltr"` في الشريط الجانبي (بسبب `location="right"`) يسبب تعقيداً.
5. **CSS Variables**: يفضل نقل جميع القيم الثابتة (مثل `#d4af37`, `#000`, `#C5A028`) إلى CSS variables في `theme.css`.
