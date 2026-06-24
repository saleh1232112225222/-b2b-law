# B2B-LAW Mobile-First Redesign Plan

> المراجعة: v2 (بعد ملاحظات المشرف)
> تاريخ الإعداد: 22 يونيو 2026

---

## 1. Overview

تحويل تطبيق B2B-LAW بالكامل إلى تصميم **Mobile-First** مع الحفاظ على تجربة سطح المكتب الحالية. يتم تقديم تخطيط هاتف منفصل (`MobileAppShell.vue`) يستبدل واجهة Vuetify sidebar/AppBar بالكامل عند اكتشاف جهاز محمول.

> **ملاحظة:** نفذ POC (Proof of Concept) للمرحلة 1 أولاً في فرع منفصل (`feat/mobile-shell`)، واختبره على أجهزة حقيقية (وليس Chrome DevTools فقط) قبل الالتزام بـ 100+ ساعة. إذا نجح POC، نكمل.

---

## 2. Breakpoint Levels (معدّل — ثلاثي المستويات)

تم تعديل الـ breakpoint بعد مراجعة المشرف: `<= 768px` يشمل iPad Mini (744–820px) في 2026 ويعطيه تجربة هاتف مضغوطة. يستخدم الآن **ثلاثة مستويات**:

| المستوى                     | العرض       | التخطيط                           | الجمهور                       |
| --------------------------- | ----------- | --------------------------------- | ----------------------------- |
| **هاتف صغير**               | `<= 480px`  | MobileAppShell (ضيق)              | iPhone SE, Galaxy S10e        |
| **هاتف كبير / تابلت صغير**  | `481–768px` | MobileAppShell (واسع، Cards أكبر) | iPhone 15 Pro Max, iPad Mini  |
| **سطح المكتب / تابلت كبير** | `> 768px`   | DesktopLayout الحالي              | Laptop, iPad Air/Pro, Desktop |

### آلية الكشف

```ts
// composables/useMobileLayout.ts
import { useMediaQuery } from '@vueuse/core'

export const useMobileLayout = () => {
  const isPhone = useMediaQuery('(max-width: 480px)')
  const isSmallTablet = useMediaQuery('(min-width: 481px) and (max-width: 768px)')
  const isMobile = computed(() => isPhone.value || isSmallTablet.value)

  return { isPhone, isSmallTablet, isMobile }
}
```

> **مهم:** لا نستخدم `useDisplay().mobile || innerWidth <= 768` — الـ `useDisplay().mobile` في Vuetify 3 يعتمد على `mobileBreakpoint` (افتراضياً 960px أو 1264px)، والجمع بينهما ينتج حالات غير متوقعة. نستبدله كلياً بـ `useMediaQuery` من VueUse.

**إصلاح Sessions.vue:** يستخدم حالياً `<= 1023px` (سطر ~100) — يجب تغييره لاستخدام composable الموحد.

---

## 3. Architecture

### 3.1 التبديل بين التخطيطين — بدون لمس `App.vue` مباشرة (معدّل)

**بدلاً من إضافة `v-if` إلى `App.vue` (~700 سطر)،** نستخدم نمط layout component الديناميكي:

```vue
<!-- App.vue (سطر ~5) -->
<component :is="layoutComponent" />

<script setup>
import { computed } from 'vue'
import { useMobileLayout } from './composables/useMobileLayout'

const { isMobile } = useMobileLayout()

// يتم استخراج DesktopLayout الحالي إلى ملف منفصل:
// src/renderer/src/layouts/DesktopLayout.vue
const DesktopLayout = defineAsyncComponent(() => import('./layouts/DesktopLayout.vue'))
const MobileAppShell = defineAsyncComponent(() => import('./components/mobile/MobileAppShell.vue'))

const layoutComponent = computed(() =>
  hideLayout.value ? null : isMobile.value ? MobileAppShell : DesktopLayout
)
</script>
```

- `hideLayout` (سطر 667) لا يزال يعمل: يخفي _كلا_ التخطيطين لصفحات Login/Register.
- `DesktopLayout.vue` (جديد): ينقل إليه محتوى `App.vue` الحالي (sidebar + app bar + router-view).
- هذا يمنع زيادة تعقيد `App.vue` ويحافظ على الفصل النظيف.

### 3.2 مكونات الموبايل الجديدة

كلها توضع في: `src/renderer/src/components/mobile/`

| المكون                    | المسار                                      | الوصف                                                                               |
| ------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------- |
| `MobileAppShell.vue`      | `components/mobile/MobileAppShell.vue`      | الهيكل الرئيسي: Header ثابت + BottomNav + ErrorBoundary + router-view مع transition |
| `MobileBottomNav.vue`     | `components/mobile/MobileBottomNav.vue`     | شريط سفلي بـ 5 تبويبات مع أيقونات Mdi، تظهر/تختفي مع scroll                         |
| `MobileHeader.vue`        | `components/mobile/MobileHeader.vue`        | شريط علوي ثابت (عنوان الصفحة + زر القائمة الجانبية)                                 |
| `MobileDrawer.vue`        | `components/mobile/MobileDrawer.vue`        | القائمة الجانبية المنزلقة (Profile + الروابط + تبديل الثيم + تسجيل الخروج)          |
| `MobileCardList.vue`      | `components/mobile/MobileCardList.vue`      | **عرض البطاقات فقط** — لا يحتوي على تفاعلات Gestures (انظر 3.4)                     |
| `MobileActionSheet.vue`   | `components/mobile/MobileActionSheet.vue`   | BottomSheet عام لأزرار الإجراءات (إضافة، تعديل، حذف)                                |
| `MobileErrorBoundary.vue` | `components/mobile/MobileErrorBoundary.vue` | ErrorBoundary يمنع انهيار التطبيق بأكمله عند خطأ في مكون                            |

### 3.3 Composable Archives — منفصلة عن المكونات (معدّل — تم تقسيم God Component)

بعد ملاحظة المشرف، **`MobileCardList` لا يحتوي على Pull-to-Refresh ولا Swipe ولا Long-press** — كل تفاعل هو composable منفصل:

| Composable          | الملف                              | الوظيفة                                                      | المصدر                                           |
| ------------------- | ---------------------------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| `useMobileLayout`   | `composables/useMobileLayout.ts`   | `isPhone`, `isSmallTablet`, `isMobile`                       | `useMediaQuery` من VueUse                        |
| `usePullToRefresh`  | `composables/usePullToRefresh.ts`  | سحب للأسفل → تحديث البيانات                                  | غلاف لـ `pulltorefreshjs` (وليس touchstart يدوي) |
| `useInfiniteScroll` | `composables/useInfiniteScroll.ts` | IntersectionObserver → تحميل المزيد                          | مدمج مع `MobileCardList`                         |
| `useSwipeAction`    | `composables/useSwipeAction.ts`    | سحب أفقي → إظهار أزرار إجراءات                               | `@vueuse/gesture` (غلاف)                         |
| `useLongPress`      | `composables/useLongPress.ts`      | ضغط مطول → فتح MobileActionSheet                             | `@vueuse/gesture` (غلاف)                         |
| `useKeyboardAware`  | `composables/useKeyboardAware.ts`  | رفع الـ inputs عند ظهور keyboard + تجنب التداخل مع BottomNav | VisualViewport API                               |

> **مكتبات خارجية:** سنستخدم `@vueuse/gesture` للـ touch gestures و `pulltorefreshjs` لـ Pull-to-Refresh.  
> ⚠️ **ملاحظة مهمة — تم التحقق:** هذه الحزم **غير مثبتة حالياً** في المشروع. المتوفر فقط `@vueuse/core ^14.2.1` (لا يتضمن gesture افتراضياً).  
> **خطوة إلزامية قبل البدء:**
>
> ```
> npm install @vueuse/gesture pulltorefreshjs
> ```
>
> **البديل (في حال تعارض الإصدارات مع Vue 3.5.25 / Vuetify 3.7.15):** composable يدوي باستخدام raw touch events + `requestAnimationFrame`، مع اختبار مكثف على أجهزة حقيقية.

### 3.4 MobileCardList — مسؤولية واحدة فقط (Single Responsibility)

```
MobileCardList.vue
├── يستقبل :items, :loading, :total, :fields (كما في v1)
├── يعرض قائمة بطاقات مع v-for
├── يحتوي على IntersectionObserver واحد فقط (Infinite Scroll)
├── البطاقة الواحدة: أيقونة + عنوان + سطرين معلومات + Border حسب الحالة
├── لا يحتوي على أزرار إجراءات مباشرة — ينبعث events فقط:
│   @item-click → يفتح الصفحة
│   @item-longpress → يفتح MobileActionSheet
│   @item-swipe → يظهر أزرار إجراءات (من SwipeActions wrapper)
└── لا يحتوي على Pull-to-Refresh (يتم إضافته من composable خارجي)
```

### 3.5 تعارض التفاعلات (Gesture Conflict Resolution) — (معدّل)

لأن Pull-to-Refresh + Swipe + Long-press + Scroll كلها تعتمد على `touchstart/move/end`:

| المشكلة                                                 | الحل                                                                                      |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| سحب البطاقة أفقياً ينفذ Pull-to-Refresh                 | `touch-action: pan-y` على `.mobile-card` ← يمنع السحب الأفقي على مستوى المتصفح            |
| الضغط المطوّل يظهر native text selection / context menu | `user-select: none`, `-webkit-touch-callout: none` على البطاقات                           |
| التمييز بين سحب عمودي (pull) وأفقي (swipe)              | زاوية السحب angle > 45° → Pull-to-Refresh؛ < 45° → Swipe (يتم حسابه من `@vueuse/gesture`) |
| Pull-to-Refresh يتعارض مع Infinite Scroll               | IntersectionObserver + `rootMargin: '200px'` للتحميل المسبق قبل الوصول للنهاية            |

### 3.6 Bottom Navigation — 5 تبويبات

| التبويب     | الأيقونة              | الرابط       | متى يظهر (حسب `can()`)               |
| ----------- | --------------------- | ------------ | ------------------------------------ |
| لوحة التحكم | `mdi-view-dashboard`  | `/dashboard` | دائماً                               |
| العملاء     | `mdi-account-group`   | `/clients`   | `can('view_clients')`                |
| القضايا     | `mdi-scale-balance`   | `/cases`     | `can('view_cases')`                  |
| الجلسات     | `mdi-calendar-clock`  | `/sessions`  | `can('view_sessions')`               |
| المزيد      | `mdi-dots-horizontal` | —            | دائماً (قائمة منسدلة للصفحات الأخرى) |

**قائمة "المزيد":** المهام، المالية، المستندات، المذكرات، العقود، التنفيذ، الملفات، التقارير، الملف الشخصي، الإعدادات. تظهر حسب صلاحيات `can()` لكل بند.

### 3.7 FAB + BottomNav — تداخل بصري (معدّل)

في شاشة iPhone SE (375px)، FAB + BottomNav + Keyboard قد يغطي 40% من الشاشة. **الحل:**

- FAB يختفي عند التمرير للأسفل (scroll down) ويظهر عند التمرير للأعلى (scroll up) — مثل سلوك `v-app-bar` مع `hide-on-scroll`
- عند فتح الكيبورد: FAB + BottomNav يختفيان تلقائياً عبر `useKeyboardAware`
- متباعدة عن BottomNav بمسافة `safe-area + 16px` باستخدام `bottom: calc(env(safe-area-inset-bottom) + 64px + 16px)`

### 3.8 MobileDrawer — القائمة الجانبية (معدّل)

- صورة المستخدم واسمه ودوره مع زر **تبديل الثيم** (داكن/فاتح) — مع لون متغير حسب الثيم
- جميع روابط "المزيد" (كما في BottomNav's More) — مع RTL animations
- زر تسجيل الخروج
- يفتح من أيقونة Hamburglar في MobileHeader أو عبر سحب من الحافة اليمنى (`v-navigation-drawer temporary` مع `right`)
- جميع الأزرار تحقق `min-height: 44px`

### 3.9 Safe Area + Dark Mode — (جديد — نقاط مفقودة)

**Safe Area:**

```css
.mobile-app-shell {
  padding-top: env(safe-area-inset-top);
}
.mobile-bottom-nav {
  padding-bottom: env(safe-area-inset-bottom);
}
.mobile-header {
  padding-top: env(safe-area-inset-top);
  height: calc(56px + env(safe-area-inset-top));
}
```

**Dark Mode:**

- `MobileDrawer` يحتوي على زر `mdi-weather-night` / `mdi-weather-sunny`
- يستخدم `useTheme()` من Vuetify: `theme.global.name.value = isDark ? 'dark' : 'light'`
- جميع المكونات الجديدة تستخدم CSS Variables من `main.css` (التي تدعم dark/light theme مسبقاً)
- أيقونة BottomNav النشطة تتغير لونها وفق `--accent` (ذهبي في light، ذهبي فاتح في dark)

### 3.10 Accessibility — (جديد)

- كل زر في تطبيقات الهاتف مزود بـ `:aria-label` ديناميكي بالعربية (مثال: `aria-label="عرض القضية"`)
- `role="list"` و `role="listitem"` للبطاقات
- BottomNav مزود بـ `role="tablist"` وكل تبويب `role="tab"` مع `aria-selected`
- `focus-visible` outline لجميع العناصر القابلة للنقر
- الألوان تحقق تباين `WCAG AA` (النصوص الداكنة على خلفية فاتحة والعكس)—نفس نظام `main.css` الحالي

### 3.11 Error Boundaries — (جديد)

- `MobileErrorBoundary.vue` يغلف كل شاشة موبايل داخل `MobileAppShell`
- إذا انهار `MobileCardList` أو أي مكون، يظهر:
  - أيقونة خطأ + "حدث خطأ غير متوقع"
  - زر "إعادة المحاولة"
  - زر "العودة للرئيسية"
- `onErrorCaptured` يمنع انتشار الخطأ إلى `App.vue` أو انهيار التطبيق بالكامل

### 3.12 المتطلبات الأساسية (Touch Targets)

- **جميع الأزرار:** `min-height: 44px`, `min-width: 44px`
- **جميع خانات النقر:** `min-height: 44px`
- **البطاقات:** `min-height: 72px` + مساحة نقر كافية
- **التباعد:** `padding: 12px 16px` للبطاقات، `gap: 12px` بين العناصر

---

## 4. تحويل كل صفحة بالتفصيل

### 4.1 Dashboard (`Dashboard.vue` — ~300 سطر)

**الوضع الحالي (Desktop):**

- 3 أقسام (تقويم، رسوم بيانية، مقاييس) تظهر حسب `isMobile` inline class
- بطاقات: إجمالي القضايا، العملاء، الجلسات القادمة، الإيرادات

**التصميم للموبايل:**

- **شاشة واحدة قابلة للتمرير** بدلاً من التبويبات الثلاثة
- **بطاقات المقاييس الأربع:** 2×2 Grid (بدلاً من 4 أعمدة في Desktop) على الهاتف الصغير، 3×2 على التابلت الصغير
- **آخر 5 جلسات قادمة:** قائمة بطاقات مصغرة
- **آخر 5 معاملات مالية:** قائمة بطاقات مع لون (أخضر للإيرادات، أحمر للمصروفات)
- **رسم بياني واحد مبسط:** Spakline أو شريط بسيط (Canvas أو SVG)
- **خطأ:** `MobileErrorBoundary` يغلف Dashboard بالكامل

**الملف الجديد:** `components/mobile/MobileDashboard.vue`

### 4.2 العملاء (`Clients.vue` — يوجد بالفعل inline mobile code ~148 سطر)

**الوضع الحالي:**

- Desktop: VDataTable مع أزرار تصدير
- Mobile: `المحامين` inline section مع `v-list` — ولكنه مدمج داخل الملف

**التصميم للموبايل:**

- `MobileCardList` مع `fields` للعميل: الاسم، رقم الهاتف، النوع
- شريط بحث في أعلى الصفحة (VTextField مع Debounce 300ms)
- FAB لإضافة عميل جديد (+) — يختفي عند التمرير للأسفل
- Swipe للإجراءات السريعة (عبر `useSwipeAction`)
- Long-press → MobileActionSheet: تعديل / حذف / عرض التفاصيل
- **Keyboard Avoiding:** `useKeyboardAware` لرفع حقل البحث عند فتح الكيبورد

**الملف:** `Clients.vue` — إزالة الكود المضمن للموبايل (سطور ~148-250)، واستخدام `MobileCardList` بشكل شرطي.

### 4.3 القضايا (`Cases.vue` — يستخدم `CaseMobileList.vue` بالفعل)

**الوضع الحالي:**

- `CaseMobileList.vue` (~200 سطر) — بطاقات قضايا مع أزرار `x-small` (16px — مخالفة للمعايير)
- لا يوجد Pull-to-Refresh ولا Infinite Scroll

**التعديلات:**

- إعادة كتابة `CaseMobileList.vue` باستخدام `MobileCardList` + `usePullToRefresh` + `useInfiniteScroll`
- إضافة FAB لإضافة قضية جديدة — يختفي عند التمرير للأسفل
- تغيير جميع الأزرار إلى 44px كحد أدنى
- إضافة Swipe-to-action عبر `useSwipeAction`: سحب لليسار → عرض القضية، سحب لليمين → تعديل
- Long-press → MobileActionSheet: جميع الإجراءات

### 4.4 الجلسات (`Sessions.vue` — يستخدم `SessionCardMobile.vue` + 1023px breakpoint خطأ)

**المشكلة:**

- يستخدم `<= 1023px` بدلاً من composable الموحد (سطر ~100 من `Sessions.vue`)

**التعديلات:**

- إصلاح الـ breakpoint لاستخدام `useMobileLayout().isMobile`
- إعادة كتابة `SessionCardMobile.vue` (~150 سطر) باستخدام `MobileCardList`
- إضافة FAB لإضافة جلسة جديدة — يختفي عند التمرير
- إضافة Swipe-to-action عبر `useSwipeAction`
- اللون الجانبي للبطاقة حسب الحالة: قادمة (ذهبي)، منعقدة (أخضر)، ملغاة (أحمر)
- Long-press → MobileActionSheet

### 4.5 المهام (`Tasks.vue`)

**الوضع الحالي:**

- Desktop: VDataTable مع مرشحات

**التصميم للموبايل:**

- `MobileCardList` مع حقول: المهمة (عنوان)، الميعاد، القضية المرتبطة، الحالة
- FAB لإضافة مهمة (+) — يختفي عند التمرير
- خيارات تصفية (الكل / اليوم / هذا الأسبوع / المتأخرة)
- Swipe للإجراءات السريعة
- Long-press → MobileActionSheet

### 4.6 المالية (`Finance.vue`)

**الوضع الحالي:**

- لوحة تحكم مالية مع VDataTables متعددة (المعاملات، الفواتير، السندات، الذمم)

**التصميم للموبايل:**

- **شاشة مقسمة إلى 3 أقسام قابلة للتبديل (Tabs):**
  1. المعاملات (قائمة بطاقات)
  2. الفواتير (قائمة بطاقات)
  3. الذمم (قائمة بطاقات مع حالة الدفع)
- **بطاقة ملخص علوية:** مع `$stats.income` (أخضر)، `$stats.expense` (أحمر)، `$stats.balance` (أزرق)
- **FAB** → MobileActionSheet: إضافة معاملة / فاتورة / سند
- Swipe للإجراءات السريعة

**ملاحظة:** نستخدم `finance.ts` store الحالي مباشرة (سطر 11: `stats: FinanceStats { income, expense, balance }`). لا حاجة لتعديل الـ store.

### 4.7 المستندات (`Documents.vue`)

**الوضع الحالي:**

- Desktop: VDataTable مع روابط تحميل ومعاينة

**التصميم للموبايل:**

- `MobileCardList` مع حقول: اسم المستند، نوعه، تاريخ الرفع، القضية المرتبطة
- Swipe لليسار: تحميل / معاينة
- FAB لرفع مستند جديد (يفتح BottomSheet مع خيارات الرفع)
- **PDF viewer:** لا نستخدم معاينة داخلية في الموبايل (معقدة). نفتح المستند في المتصفح أو تطبيق PDF خارجي عبر `window.open(url, '_system')` أو `<a>` مع `target="_blank"`

### 4.8 المذكرات (`Memoranda.vue`)

**التصميم للموبايل:**

- `MobileCardList` مع حقول: عنوان المذكرة، تاريخها، نوعها (دفاع / شرح / طلب)
- Swipe: عرض / تعديل / تصدير PDF
- FAB لإضافة مذكرة جديدة — يختفي عند التمرير
- تحميل PDF في المتصفح الخارجي (نفس نظام Documents)
- Long-press → MobileActionSheet

### 4.9 العقود (`Contracts.vue`) — إن وجدت

- نفس نمط `MobileCardList` مع: اسم العقد، الطرفين، تاريخ البدء/الانتهاء، الحالة

### 4.10 التنفيذ (`Enforcement.vue`) — إن وجدت

- نفس النمط مع حالة التنفيذ، المحكمة، رقم الحكم

### 4.11 التقارير (`Reports*.vue`) — (معدّل)

**سابقاً:** "لا يتم تحويلها للموبايل" → تجربة مكسورة.
**الآن:**

- شاشة **قائمة تقارير** بسيطة (أسماء + أيقونات)
- عند النقر على تقرير: يظهر **رسالة:** "يفضل فتح هذه الصفحة على سطح المكتب للاستفادة من جميع الميزات" مع:
  - زر "عرض نسخة PDF" (تحميل التقرير كـ PDF مباشر)
  - زر "فتح في المتصفح" (فتح الرابط في متصفح خارجي)
- هذا يمنع تجربة الموبايل المكسورة

### 4.12 الملف الشخصي (`Profile.vue`)

- بطاقة المستخدم في `MobileDrawer` كافية
- صفحة منفصلة لتعديل البيانات الشخصية وتغيير كلمة المرور (نموذج بسيط)
- `useKeyboardAware` لرفع النموذج عند فتح الكيبورد
- Date picker للهاتف: استخدام `<input type="date">` الأصلي بدلاً من Vuetify date picker الذي قد لا يعمل جيداً في الموبايل

### 4.13 ملف القضايا (`FileVault.vue`)

- `MobileCardList` مع الملفات والمجلدات
- FAB لرفع ملف
- Swipe للتحميل
- فتح الملفات في المتصفح الخارجي

---

## 5. النماذج (Forms) في الموبايل — (جديد — Gap حرج)

النماذج هي نقطة ضعف في أي تطبيق موبايل. المعالجة:

| المشكلة                                        | الحل                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| الكيبورد يغطي حقل الإدخال                      | `useKeyboardAware` composable: يستخدم `VisualViewport API` لضبط `scroll-margin` للحقل النشط |
| الكيبورد + BottomNav يغطيان 70% من الشاشة      | BottomNav يختفي عند فتح الكيبورد (عبر `useKeyboardAware.resize` event)                      |
| Vuetify Date Picker لا يعمل جيداً على الموبايل | استخدام `<input type="date">` الأصلي + أيقونة `mdi-calendar`                                |
| رفع الملفات (File Upload)                      | `<input type="file" capture>` لالتقاط صورة مباشرة من الكاميرا، أو `document` لاختيار ملف    |
| الحقول الطويلة (مثل `description`)             | `v-textarea` مع `auto-grow` بحيث يتمدد مع النص ولا يحتاج لسكرول داخلي                       |
| أزرار الحفظ                                    | زر "حفظ" كبير (`min-height: 48px`) في أسفل النموذج (فوق الـ safe area)                      |
| Undo بعد الحذف                                 | Snackbar مع زر "تراجع" لمدة 3 ثوانٍ، أو Confirmation BottomSheet قبل الحذف النهائي          |

---

## 6. Swipe-to-Delete — مع Undo (معدّل)

بما أن Swipe-to-Delete بدون تأكيد خطر بيانات:

1. **سحب لليسار بالكامل:** يظهر "حذف" مع لون أحمر → إذا أكمل السحب → `deleteItem(id)` → **Snackbar مع "تراجع" لمدة 3 ثوانٍ** (`<v-snackbar :timeout="3000">`)
2. **سحب جزئي:** يظهر أزرار إجراءات (تعديل، عرض) دون حذف
3. **Long-press على بطاقة:** يظهر MobileActionSheet مع "تأكيد الحذف" وزر "تراجع" بعد التنفيذ

---

## 7. Vuetify 3 — v-bottom-sheet (معدّل)

**تحذير:** في Vuetify 3، `v-bottom-sheet` غير موجود كمكون مستقل. البديل:

```vue
<v-dialog v-model="showSheet" location="bottom" transition="slide-y-reverse" max-width="480">
  <v-card>...</v-card>
</v-dialog>
```

**التحقق من الإصدار:** يجب تأكيد إصدار Vuetify في `package.json` قبل البدء. إذا كان `3.x`، نستخدم `v-dialog` مع `location="bottom"`. إذا كانت ميزة `v-bottom-sheet` متوفرة في إصدار أحدث، نستخدمها.

---

## 8. الأمان والصلاحيات (بدون تغيير)

نظام الأمان الحالي يبقى كما هو دون أي تعديل:

| المكون                   | الحالة              | المرجع                          |
| ------------------------ | ------------------- | ------------------------------- |
| `router.beforeEach`      | يُعاد استخدامه      | `router/index.ts:300-372`       |
| `usePermissions().can()` | يُعاد استخدامه      | `composables/usePermissions.ts` |
| `session`, `roleKey`     | يُعاد استخدامه      | `usePermissions.ts`             |
| Subscription/readonly    | يُعاد استخدامه      | `router/index.ts:319-329`       |
| `hideLayout`             | يخفي التخطيطين معاً | `App.vue:667`                   |

- **BottomNav** يخفي التبويبات التي لا يملك المستخدم صلاحية الوصول إليها (عبر `v-if="can('view_clients')"`)
- **FABs** تظهر فقط مع `can('create_cases')`، وهكذا
- **أزرار الحذف** تظهر فقط مع `can('delete_cases')`

---

## 9. الحسابات المالية (بدون تغيير)

- لا حاجة لإضافة منطق حسابي جديد
- `finance.ts` store يزودنا بـ `stats.income`, `stats.expense`, `stats.balance` عبر `fetchFinanceData()`
- جميع حسابات العمولة (نسبة المحامي، نسبة المكتب، الضريبة) تتم من خلال نفس الـ API Calls
- الموبايل يعرض النتائج فقط

---

## 10. الـ Store و Pagination — (معدّل)

**Pagination عبر Infinite Scroll = منطق مختلف عن Desktop.**

Desktop يستخدم `page` و `pageSize` الحالية في `clients.ts` و `cases.ts`. الموبايل يحتاج:

1. **إضافة حقول `mobilePage` و `mobileItems` إلى الـ store** (أو استخدام composable منفصل `useMobilePagination`):
   ```ts
   // داخل composable/useMobilePagination.ts
   const mobileItems = ref<Item[]>([])
   const mobilePage = ref(1)
   const mobilePageSize = ref(20) // أصغر من Desktop للحفاظ على الأداء
   const hasMore = ref(true)
   ```
2. `loadMore()` تستدعي `fetchClients({ page: mobilePage.value, pageSize: mobilePageSize.value })` وتـ `concat` النتائج إلى `mobileItems`
3. `refresh()` تعيد ضبط `mobilePage = 1` و `mobileItems = []`
4. عند التبديل من موبايل → Desktop، نستخدم `items` الأصلي (المخزن في store)
5. **Performance مع 1000+ عنصر:** `v-lazy` للبطاقات + `keep-alive` للصفحات الرئيسية

> **ملاحظة:** هذا التصميم يتجنب تعديل الـ store المشترك بين Desktop/Mobile — `mobileItems` و `mobilePage` يؤثران فقط في تجربة الموبايل.

---

## 11. الجدول الزمني للتنفيذ — الواقعي (معدّل)

> **تقدير واقعي بعد ملاحظات المشرف:** 70–100 ساعة (ضرب التقدير القديم بـ 1.8–2.0). يُقسم إلى **Sprintين** لضمان التسليم الجزئي.

### Sprint 1 — الهيكل الأساسي + POC (الأولوية القصوى)

| المهمة                                                               | الملفات                                   | التقدير الواقعي                                      |
| -------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| POC: إنشاء فرع `feat/mobile-shell`                                   | —                                         | ساعة واحدة (تجهيز الفرع)                             |
| إنشاء `useMobileLayout.ts`                                           | `composables/useMobileLayout.ts`          | ساعة واحدة                                           |
| إنشاء `DesktopLayout.vue` (استخراج من App.vue)                       | `layouts/DesktopLayout.vue`               | ساعتان                                               |
| إنشاء `MobileAppShell.vue` + ErrorBoundary                           | `components/mobile/`                      | 3 ساعات                                              |
| إنشاء `MobileBottomNav.vue`                                          | `components/mobile/MobileBottomNav.vue`   | ساعتان                                               |
| إنشاء `MobileHeader.vue` + MobileDrawer.vue                          | `components/mobile/`                      | 4 ساعات (RTL + animations + permissions + dark mode) |
| إنشاء `MobileCardList.vue` (عرض فقط)                                 | `components/mobile/MobileCardList.vue`    | ساعتان                                               |
| إنشاء `MobileActionSheet.vue`                                        | `components/mobile/MobileActionSheet.vue` | ساعة ونصف                                            |
| إنشاء `usePullToRefresh.ts` (غلاف pulltorefreshjs)                   | `composables/usePullToRefresh.ts`         | ساعتان                                               |
| إنشاء `useInfiniteScroll.ts`                                         | `composables/useInfiniteScroll.ts`        | ساعة ونصف                                            |
| إنشاء `useSwipeAction.ts` + `useLongPress.ts` (غلاف @vueuse/gesture) | `composables/`                            | 4–5 ساعات (debugging على أجهزة حقيقية)               |
| إنشاء `useKeyboardAware.ts`                                          | `composables/useKeyboardAware.ts`         | ساعتان (VisualViewport API + اختبار)                 |
| إنشاء `useMobilePagination.ts`                                       | `composables/useMobilePagination.ts`      | ساعة ونصف                                            |
| تعديل `App.vue` (نقل DesktopLayout)                                  | `App.vue`                                 | ساعتان                                               |
| اختبار POC على جهاز حقيقي                                            | —                                         | 4 ساعات (iPhone + Android + iPad)                    |
| **المجموع Sprint 1**                                                 |                                           | **~30 ساعة**                                         |

### Sprint 2 — تحويل الصفحات

| المهمة                                 | الملفات                                                  | التقدير الواقعي                           |
| -------------------------------------- | -------------------------------------------------------- | ----------------------------------------- |
| MobileDashboard.vue                    | `Dashboard.vue` (تعديل) + إنشاء `MobileDashboard.vue`    | 5 ساعات (بطاقات + رسوم بيانية مبسطة)      |
| تحويل Clients.vue                      | `Clients.vue` (تعديل)                                    | 4 ساعات (بحث + FAB + swipe + form mobile) |
| تحويل Cases.vue                        | `CaseMobileList.vue` (إعادة كتابة)                       | 4 ساعات                                   |
| تحويل Sessions.vue                     | `SessionCardMobile.vue` (إعادة كتابة) + إصلاح breakpoint | 4 ساعات                                   |
| تحويل Tasks.vue                        | `Tasks.vue` (تعديل)                                      | 3 ساعات                                   |
| تحويل Finance.vue                      | `Finance.vue` (تعديل)                                    | 6 ساعات (3 تبويبات + ملخص + FAB)          |
| تحويل Documents.vue                    | `Documents.vue` (تعديل)                                  | 4 ساعات                                   |
| تحويل Memoranda.vue                    | `Memoranda.vue` (تعديل)                                  | 3 ساعات                                   |
| تحويل Contracts / Enforcement (إن وجد) | الملفات المعنية                                          | 3 ساعات                                   |
| تحويل Reports                          | `Reports*.vue` (تعديل)                                   | ساعتان (قائمة + تحميل PDF + رسالة)        |
| تحويل FileVault.vue / Profile.vue      | الملفات المعنية                                          | 3 ساعات                                   |
| **المجموع Sprint 2**                   |                                                          | **~41 ساعة**                              |

### Sprint 3 — الصقل والاختبار

| المهمة                                                                             | التقدير الواقعي |
| ---------------------------------------------------------------------------------- | --------------- |
| اختبار الإيماءات على 5+ أجهزة (iPhone 14/15/SE, Galaxy S23, iPad Mini, Galaxy Tab) | 8 ساعات         |
| Playwright E2E tests للشاشات الرئيسية (تنقل، إضافة، تعديل، حذف)                    | 8 ساعات         |
| تصحيح الأخطاء                                                                      | 8 ساعات         |
| اختبار Safe Area على أجهزة Notch / Dynamic Island                                  | 3 ساعات         |
| اختبار الأداء مع 1000+ عنصر (Infinite Scroll)                                      | 3 ساعات         |
| **المجموع Sprint 3**                                                               | **~30 ساعة**    |

### إجمالي التقدير الواقعي: **70–100 ساعة** (حسب عدد الأجهزة للاختبار وسرعة التصحيح)

---

## 12. الأنماط والتصميم (CSS Variables)

- جميع ألوان الموبايل تستخدم نفس **CSS Variables** المعرفة في `main.css`

| المتغير                               | الاستخدام                                 |
| ------------------------------------- | ----------------------------------------- |
| `--primary` (#1A437D / #E9C349)       | خلفية الأزرار الرئيسية، الـ Header        |
| `--accent` (#E9C349 / gold)           | الأيقونات النشطة في BottomNav، الـ Badges |
| `--gold` (#B8941E)                    | النصوص الذهبية، حدود البطاقات النشطة      |
| `--glass-bg`                          | خلفية زجاجية للـ Header و BottomNav       |
| `--radius-xl` (16px)                  | زوايا البطاقات                            |
| `--shadow-premium`                    | ظل البطاقات                               |
| `--surface` / `--on-surface`          | خلفية البطاقات والنصوص                    |
| `--success` / `--error` / `--warning` | ألوان الحالات                             |

- يضاف `mobile.css` في `assets/mobile.css` — يحتوي فقط على:
  - `safe-area-inset-*` padding
  - `touch-action: pan-y` على البطاقات
  - `user-select: none` + `-webkit-touch-callout: none`
  - متغيرات `--mobile-header-height: 56px` و `--mobile-bottom-nav-height: 64px`

---

## 13. الحالات الخاصة

### 13.1 صفحة غير موجودة (404) — `NotFound.vue`

- عرض نص "الصفحة غير موجودة" مع زر العودة للرئيسية

### 13.2 صفحة ممنوع (403) — `Forbidden.vue`

- عرض نص "ليس لديك صلاحية" مع زر العودة

### 13.3 خطأ عام / تحميل

- `loading` spinner من Vuetify (`v-progress-circular`)
- رسالة خطأ مع زر إعادة المحاولة — داخل `MobileErrorBoundary`

### 13.4 قائمة فارغة

- أيقونة + نص: "لا توجد بيانات" + زر إنشاء أول عنصر (إذا كان لديه صلاحية)

---

## 14. خريطة الـ Routes للموبايل

نفس الـ 47 route الموجودة حالياً تبقى كما هي — الموبايل يستخدم **نفس الـ Hash History ونفس الـ Paths**.

تغيير واحد فقط: صفحات Login/Register لا تظهر فيها BottomNav ولا Header (يتم التحكم عبر `hideLayout`).

---

## 15. ملاحظات فنية إضافية

1. **Vuetify RTL:** الموبايل يعمل بـ `rtl: true` تلقائياً لأن `ar` في `vuetify.ts` (سطر 24) يفعل الـ RTL. جميع عناصر Vuetify (BottomNav, BottomSheet, Dialog) تدعم RTL أصلاً.

2. **Vue Transitions:** استخدام `<transition name="slide-x-reverse">` للتنقل بين الصفحات، و `<transition name="fade">` لـ ActionSheet والمودالات.

3. **Performance:**
   - `v-lazy` لتحميل الصور في البطاقات
   - `keep-alive` لـ Dashboard و Clients (أكثر الصفحات استخداماً)
   - Pagination عبر `useMobilePagination` (20 عنصراً في كل مرة)
   - 1000+ عنصر مع Infinite Scroll → اختبار أداء إجباري

4. **Store Usage:** جميع الصفحات تستخدم `onActivated()` مع `keep-alive` لتحديث البيانات عند العودة للصفحة دون إعادة تحميل كامل.

5. **إصدار Vuetify:** يجب التأكد من الإصدار في `package.json` قبل البدء. إذا > 3.0.0، نستخدم `v-dialog location="bottom"` بدلاً من `v-bottom-sheet`.

---

## 16. توصيات عملية للبدء

1. **POC أولاً:** أنشئ فرع `feat/mobile-shell`، طبق المرحلة 1 (الهيكل)، واختبره على جهاز حقيقي (iPhone / Android) — وليس Chrome DevTools فقط.
2. **لا تعيد اختراع العجلة:** استخدم `@vueuse/gesture` للـ touch gestures و `pulltorefreshjs` لـ Pull-to-Refresh. غلّفها في composables خاصة بك.
3. **اختبر `MobileCardList` على بيانات حقيقية:** 1000+ عنصر مع Infinite Scroll لرؤية الأداء.
4. **أضف Safe Area في البداية:** لا تنتظر حتى المرحلة النهائية لتضيف `env(safe-area-inset-*)` — يسبب إعادة تخطيط (layout shift) إذا أضيف لاحقاً.
5. **اختبر على 5+ أجهزة:** iPhone 14/15/SE، Galaxy S23، iPad Mini، Galaxy Tab قبل المرحلة النهائية.
6. **Playwright E2E:** اكتب اختبارات لكل شاشة رئيسية (تنقل، إضافة، تعديل، حذف) — هذا يمنع الانحدار (regression) عند تحديث المكونات.

---

## 17. ماذا لو تمت الموافقة؟ (خطوات البدء الفورية)

1. تثبيت الحزم المطلوبة: `npm install @vueuse/gesture pulltorefreshjs` (تأكد من التوافق مع Vue 3.5.25 و Vuetify 3.7.15)
2. إنشاء فرع Git: `git checkout -b feat/mobile-shell`
3. إنشاء المجلدات:
   - `src/renderer/src/components/mobile/`
   - `src/renderer/src/layouts/`
4. إنشاء `mobile.css` في `assets/mobile.css`
5. إنشاء composables بالترتيب:
   - `useMobileLayout.ts` ← `useKeyboardAware.ts` ← `usePullToRefresh.ts` ← `useInfiniteScroll.ts` ← `useSwipeAction.ts` ← `useLongPress.ts` ← `useMobilePagination.ts`
6. إنشاء `DesktopLayout.vue` (نقل المحتوى من App.vue)
7. إنشاء `MobileErrorBoundary.vue`
8. إنشاء `MobileActionSheet.vue`
9. إنشاء `MobileCardList.vue`
10. إنشاء `MobileDrawer.vue` + `MobileHeader.vue`
11. إنشاء `MobileBottomNav.vue`
12. إنشاء `MobileAppShell.vue`
13. تعديل `App.vue` (استخدام `<component :is="layoutComponent" />`)
14. اختبار POC على جهاز حقيقي
15. بعد الموافقة على POC → بدء Sprint 2

---

_انتهت الخطة (v2 — بعد ملاحظات المشرف). في انتظار الموافقة للبدء بالمرحلة 1 (POC)._
