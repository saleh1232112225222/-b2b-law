# خطة إعادة تصميم شاشات الوكالات الشرعية للجوال أولاً (Mobile-First Redesign Plan for POA)

يحتوي هذا المستند على مقترح وتصاميم واجهة مستخدم حديثة وبسيطة (Minimalistic & Premium UX) مخصصة للجوال لكافة شاشات وحالات **إدارة الوكالات الشرعية (POA.vue)**. تم فصل هذه المقترحات والتصاميم في مجلد مستقل داخل المشروع لعدم ربطها المباشر بالأكواد الحالية حتى يتم اعتمادها.

---

## 📂 مجلد التصاميم والمخرجات (Designs Directory)

تم حفظ ملفات التصاميم (مخرجات Figma المقترحة) في المجلد التالي داخل المشروع:

- **مسار المجلد:** [poa-mockups](file:///g:/w2w/figma-designs/poa-mockups)
- **المستندات بالملفات:**
  - شاشة القائمة (List View): [figma_poa_mobile_first_dark.png](file:///g:/w2w/figma-designs/poa-mockups/figma_poa_mobile_first_dark.png) / [figma_poa_mobile_first_light.png](file:///g:/w2w/figma-designs/poa-mockups/figma_poa_mobile_first_light.png)
  - شاشة النموذج (Add/Edit Form): [figma_poa_form_dark.png](file:///g:/w2w/figma-designs/poa-mockups/figma_poa_form_dark.png) / [figma_poa_form_light.png](file:///g:/w2w/figma-designs/poa-mockups/figma_poa_form_light.png)
  - شاشة المعاينة (Preview Dialog): [figma_poa_preview_dark.png](file:///g:/w2w/figma-designs/poa-mockups/figma_poa_preview_dark.png) / [figma_poa_preview_light.png](file:///g:/w2w/figma-designs/poa-mockups/figma_poa_preview_light.png)

---

## 🎨 معاينة التصاميم المقترحة للشاشات (Mockups Preview)

### 1. شاشة عرض قائمة الوكالات (List View Dashboard)

توضح هذه الشاشة طريقة عرض الكروت والفرز والبحث الذكي للهاتف بدلاً من الجداول التقليدية.

```carousel
![عرض القائمة - الوضع الداكن](file:///C:/Users/saleh/.gemini/antigravity-ide/brain/cd235ed2-26a6-4143-8a8d-1121552e9894/figma_poa_mobile_first_dark_1782146056409.png)
<!-- slide -->
![عرض القائمة - الوضع الفاتح](file:///C:/Users/saleh/.gemini/antigravity-ide/brain/cd235ed2-26a6-4143-8a8d-1121552e9894/figma_poa_mobile_first_light_1782146096181.png)
```

---

### 2. نموذج إضافة وتعديل وكالة (Add/Edit Agency Form)

نموذج بسيط وعملي لإدخال رقم الوكالة وتواريخ الصدور والانتهاء والجهة المصدرة بشكل متجانس.

```carousel
![نموذج الإدخال - الوضع الداكن](file:///C:/Users/saleh/.gemini/antigravity-ide/brain/cd235ed2-26a6-4143-8a8d-1121552e9894/figma_poa_form_dark_1782147485739.png)
<!-- slide -->
![نموذج الإدخال - الوضع الفاتح](file:///C:/Users/saleh/.gemini/antigravity-ide/brain/cd235ed2-26a6-4143-8a8d-1121552e9894/figma_poa_form_light_1782147508193.png)
```

---

### 3. شاشة معاينة تفاصيل الوكالة (POA Preview Dialog)

تظهر على شكل لوحة منزلقة من أسفل الشاشة (Bottom Sheet) لعرض كافة البنود والصلاحيات الممنوحة للوكالة.

```carousel
![معاينة الوكالة - الوضع الداكن](file:///C:/Users/saleh/.gemini/antigravity-ide/brain/cd235ed2-26a6-4143-8a8d-1121552e9894/figma_poa_preview_dark_1782147532640.png)
<!-- slide -->
![معاينة الوكالة - الوضع الفاتح](file:///C:/Users/saleh/.gemini/antigravity-ide/brain/cd235ed2-26a6-4143-8a8d-1121552e9894/figma_poa_preview_light_1782147552226.png)
```

---

## 💡 تفاصيل مقترح التصميم (Design Architecture)

### 1. شريط البحث والتصفية الذكي (Smart Filter & Search)

- **قبل (التصميم الحالي):** جدول تقليدي يحتوي على تصفية عامة تستهلك مساحة أفقية كبيرة.
- **بعد (المقترح):**
  - شريط بحث مرن بالأعلى مع حواف دائرية أنيقة للبحث الفوري عن رقم الوكالة أو اسم الموكل.
  - زر تبديل سريع (Toggle Tabs) لتصفية الوكالات حسب حالتها: (الكل، سارية، منتهية).

### 2. تحويل الجدول إلى كروت تفاعلية (Interactive Grid Cards)

- **المشكلة في الجوال:** الجداول تسبب تمرير أفقي سيئ وصعب القراءة على شاشات الجوال.
- **الحل المقترح:** تحويل كل صف في الجدول إلى كارت تفاعلي مستقل يحتوي على:
  - **رأس الكارت:** رقم الوكالة بخط واضح وعريض مع أيقونة ملف نظامي ورمز الحالة (ملصق ملون: أخضر للنشط، برتقالي للموشك على الانتهاء، أحمر للمنتهي).
  - **تفاصيل الكارت:** اسم الموكل (مع رابط لملفه)، وتاريخ الصدور والانتهاء (ميلادي وهجري معاً) بشكل متراص عمودياً ومريح للعين.
  - **أزرار التحكم الجانبية السريعة:** تظهر بشكل مدمج ومرتب في جانب الكارت (معاينة، تعديل، حذف) مع مساحات لمس مناسبة لمعايير الجوال (تمنع الضغط الخاطئ).

### 3. تحسين النماذج المنبثقة (Responsive Dialogs)

- **المقترح:** عند النقر على "تسجيل وكالة جديدة" أو "تعديل"، تفتح النافذة المنبثقة كصفحة منزلقة من الأسفل (Bottom Sheet) بدلاً من نافذة ممركزة في المنتصف، لتسهيل عملية الإدخال باستخدام إبهام اليد الواحدة على شاشات الجوال.

---

## 🛠️ خطة التطبيق البرمجي المقترحة (Future Code Implementation)

عند اتخاذ قرار تفعيل التصميم وربطه بالكود، سيتم استبدال المكونات الحالية في [POA.vue](file:///g:/w2w/src/renderer/src/views/POA.vue) بمكونين منفصلين حسب حجم الشاشة:

1. **لشاشات الكمبيوتر (Desktop):** الاستمرار في عرض جدول البيانات الموسع.
2. **لشاشات الجوال (Mobile):** تفعيل عرض الكروت التفاعلية باستخدام وسوم الحاويات المرنة لـ Vuetify مثل `<v-row>` و `<v-card>` مع التجاوب التلقائي عبر الخاصية `:class="{ 'mobile-view': isMobile }"`.
