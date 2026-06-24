/**
 * تعزيز theme.css بأنماط إضافية مستخرجة من Figma mockups
 * لتوحيد المظهر الذهبي الزجاجي (Glassmorphism Gold) عبر المشروع
 *
 * المصدر: G:\w2w\figma-designs\poa-mockups\
 * - figma_poa_form_light/dark.png     → نموذج إضافة/تعديل وكالة
 * - figma_poa_mobile_first_light/dark.png → قائمة الوكالات (الجوال)
 * - figma_poa_preview_light/dark.png  → معاينة تفاصيل الوكالة
 */

const fs = require('fs')
const path = require('path')

const cssPath = path.resolve(
  __dirname,
  '..',
  'src',
  'renderer',
  'src',
  'assets',
  'css',
  'theme.css'
)

const enhancements = `
/* ============================================================
   الأنماط المضافة من تحليل Figma Mockups (POA)
   تاريخ التحليل: 23 يونيو 2026
   
   ألوان الذهب المستخرجة من البيكسل:
   - الذهب الفاتح: #e9c349 (RGB 233,195,73)
   - الذهب الغامق (نص): #B8941E (RGB 184,148,30)  
   - الذهب المتوسط (مستخرج من الصور): #d1b266 (RGB 209,178,102)
   - الذهب الباهت (حدود): rgba(233, 195, 73, 0.25)
   - الذهب الخفيف جداً (حدود فاتحة): rgba(233, 195, 73, 0.15)
   ============================================================ */

/* === أنماط متطابقة مع Figma === */

/* 1. كروت زجاجية فاخرة (Glassmorphic Cards) - مطابقة لتصميم الـ Preview */
.glass-card-premium {
  background: var(--glass-bg) !important;
  backdrop-filter: var(--glass-blur) !important;
  -webkit-backdrop-filter: var(--glass-blur) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 24px !important;
  box-shadow: var(--shadow-premium) !important;
  transition: var(--transition-premium);
}

.glass-card-premium:hover {
  border-color: rgba(233, 195, 73, 0.6) !important;
  transform: translateY(-2px);
}

/* 2. حوارات زجاجية (مطابقة لـ poa-dialog-card في POA.vue) */
.glass-dialog {
  background: rgba(15, 23, 42, 0.95) !important;
  backdrop-filter: blur(25px) !important;
  -webkit-backdrop-filter: blur(25px) !important;
  border: 1px solid rgba(233, 195, 73, 0.25) !important;
  border-radius: 24px !important;
}

[data-theme='light'] .glass-dialog {
  background: rgba(255, 255, 255, 0.95) !important;
  border-color: rgba(233, 195, 73, 0.2) !important;
}

.glass-dialog-header {
  background: rgba(0, 0, 0, 0.2) !important;
  border-bottom: 1px solid rgba(233, 195, 73, 0.15) !important;
}

.glass-dialog-footer {
  background: rgba(0, 0, 0, 0.2) !important;
  border-top: 1px solid rgba(233, 195, 73, 0.15) !important;
}

[data-theme='light'] .glass-dialog-header,
[data-theme='light'] .glass-dialog-footer {
  background: rgba(0, 0, 0, 0.03) !important;
}

/* 3. حقول الإدخال الذهبية (مطابقة لـ poa-form في POA.vue) */
.gold-field {
  background: rgba(0, 0, 0, 0.4) !important;
  border-radius: 14px !important;
  border: 1px solid rgba(233, 195, 73, 0.25) !important;
  transition: all 0.3s ease;
}

.gold-field:hover {
  border-color: rgba(233, 195, 73, 0.5) !important;
}

.gold-field:focus-within,
.gold-field.v-field--focused {
  border-color: #e9c349 !important;
  box-shadow: 0 0 16px rgba(233, 195, 73, 0.15) !important;
}

[data-theme='light'] .gold-field {
  background: rgba(255, 255, 255, 0.8) !important;
  border-color: rgba(233, 195, 73, 0.3) !important;
}

[data-theme='light'] .gold-field input,
[data-theme='light'] .gold-field .v-field__input {
  color: #000000 !important;
}

/* 4. أزرار ثانوية (مطابقة لـ premium-button-highlight في POA.vue) */
.btn-gold-outline {
  background: transparent !important;
  color: var(--gold) !important;
  border: 1px solid rgba(233, 195, 73, 0.6) !important;
  border-radius: 12px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
  transition: all 0.3s ease !important;
}

.btn-gold-outline:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15) !important;
  border-color: rgba(233, 195, 73, 0.8) !important;
  background: rgba(233, 195, 73, 0.05) !important;
}

/* 5. مربع معاينة (Preview Box) - مطابق لـ poa-preview-box */
.preview-box {
  background: rgba(0, 0, 0, 0.3) !important;
  border: 1px solid rgba(233, 195, 73, 0.15) !important;
  border-radius: 12px;
  color: #ffffff !important;
}

[data-theme='light'] .preview-box {
  background: rgba(255, 255, 255, 0.5) !important;
  color: #000000 !important;
  border-color: rgba(233, 195, 73, 0.2) !important;
}

/* 6. علامات التبويب الزجاجية - مطابقة لـ glass-toggle في POA.vue */
.glass-tabs {
  background: rgba(255, 255, 255, 0.02) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(233, 195, 73, 0.15) !important;
  border-radius: 14px !important;
  overflow: hidden;
}

.glass-tab-active {
  background: rgba(233, 195, 73, 0.15) !important;
  border-bottom: 2px solid #e9c349 !important;
  color: #e9c349 !important;
}

/* 7. شريط البحث (Search Input) - مطابق لـ search-input */
.search-field {
  border-radius: 16px !important;
  background: rgba(255, 255, 255, 0.03) !important;
  border: 1px solid rgba(233, 195, 73, 0.15) !important;
  transition: all 0.3s ease;
}

.search-field.v-field--focused {
  border-color: rgba(233, 195, 73, 0.6) !important;
  background: rgba(255, 255, 255, 0.06) !important;
}

[data-theme='light'] .search-field {
  background: rgba(255, 255, 255, 0.7) !important;
}

/* 8. بطاقة بيانات الجوال - مطابقة لبطاقات الـ mobile cards */
.mobile-poa-card {
  background: var(--glass-bg-soft) !important;
  backdrop-filter: var(--glass-blur) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 16px !important;
  overflow: hidden;
  transition: var(--transition-smooth);
}

.mobile-poa-card:hover {
  border-color: rgba(233, 195, 73, 0.4) !important;
}

.mobile-poa-card-header {
  background: rgba(0, 0, 0, 0.1) !important;
  border-bottom: 1px solid rgba(233, 195, 73, 0.1) !important;
}

.mobile-poa-card-footer {
  background: rgba(0, 0, 0, 0.15) !important;
  border-top: 1px solid rgba(233, 195, 73, 0.1) !important;
}

/* 9. فاصل ذهبي - مطابق لخط الذهب الرفيع في الصور */
.divider-gold {
  border-color: rgba(233, 195, 73, 0.15) !important;
  opacity: 1 !important;
}

/* 10. خلفية ذهبية متدرجة */
.bg-gold-gradient-premium {
  background: linear-gradient(135deg, #FFF9E6 0%, #FFEFB3 100%) !important;
  border-bottom: 1px solid #E9C349 !important;
}

[data-theme='dark'] .bg-gold-gradient-premium {
  background: linear-gradient(135deg, #E9C349 0%, #B38B2D 100%) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
}

/* 11. تأثير التوهج الذهبي */
.glow-gold {
  box-shadow: 0 0 20px rgba(233, 195, 73, 0.15);
}

.glow-gold-hover:hover {
  box-shadow: 0 0 30px rgba(233, 195, 73, 0.25);
}

/* 12. النص الذهبي في الوضع الفاتح (أسود لضمان التباين) */
[data-theme='light'] .text-gold {
  color: #000000 !important;
  font-weight: 900 !important;
}

/* 13. رفع البطاقة (Lift effect) */
.card-lift {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card-lift:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 30px rgba(233, 195, 73, 0.1) !important;
}

/* 14. إطار نشط للبطاقة */
.card-active {
  border-color: rgba(233, 195, 73, 0.6) !important;
  box-shadow: 0 0 20px rgba(233, 195, 73, 0.1) !important;
}

/* 15. مؤشر الحالة (Status Badge) */
.status-badge {
  font-size: 0.7rem !important;
  font-weight: 900 !important;
  border-radius: 8px !important;
  padding: 2px 12px !important;
  letter-spacing: 0.02em !important;
}

.status-active {
  background: rgba(5, 150, 105, 0.15) !important;
  color: #059669 !important;
  border: 1px solid rgba(5, 150, 105, 0.3) !important;
}

.status-expired {
  background: rgba(220, 38, 38, 0.15) !important;
  color: #DC2626 !important;
  border: 1px solid rgba(220, 38, 38, 0.3) !important;
}

[data-theme='dark'] .status-active {
  background: rgba(52, 211, 153, 0.12) !important;
  color: #34D399 !important;
}

[data-theme='dark'] .status-expired {
  background: rgba(248, 113, 113, 0.12) !important;
  color: #F87171 !important;
}

/* 16. تذييل ثابت في الحوارات */
.sticky-footer {
  position: sticky !important;
  bottom: 0 !important;
  background: inherit !important;
  border-top: 1px solid rgba(233, 195, 73, 0.15) !important;
  z-index: 2 !important;
}

/* 17. رأس ثابت في الحوارات */
.sticky-header {
  position: sticky !important;
  top: 0 !important;
  background: inherit !important;
  border-bottom: 1px solid rgba(233, 195, 73, 0.15) !important;
  z-index: 2 !important;
}

/* 18. إطار بيّانات الوكالة (Preview labels) */
.preview-label {
  color: var(--gold) !important;
  font-weight: 800 !important;
  font-size: 0.85rem !important;
  display: block;
  margin-bottom: 4px;
}

.preview-value {
  font-weight: 800 !important;
  font-size: 1rem !important;
  color: var(--text-primary) !important;
}

/* 19. خلفية الهيدر (Navy gradient) - مطابق لـ figma */
.header-navy {
  background: linear-gradient(135deg, #0F2A55 0%, #1A437D 50%, #1E4D8C 100%) !important;
}

[data-theme='dark'] .header-navy {
  background: linear-gradient(135deg, #060C18 0%, #0D1526 50%, #131D30 100%) !important;
}

/* 20. نمط الجدول المميز (Premium Table) - نسخة محسّنة */
.premium-table-v2 {
  background: var(--surface) !important;
  border: 1px solid var(--gold-alpha) !important;
  border-radius: 16px !important;
  overflow: hidden !important;
  box-shadow: var(--shadow-premium) !important;
}

.premium-table-v2 thead th {
  background: rgba(233, 195, 73, 0.06) !important;
  color: var(--gold) !important;
  font-weight: 900 !important;
  font-size: 0.8rem !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  border-bottom: 2px solid var(--gold-alpha) !important;
  padding: 16px 14px !important;
}

.premium-table-v2 tbody tr {
  transition: background 0.2s ease;
}

.premium-table-v2 tbody tr:hover {
  background: var(--gold-alpha-soft) !important;
}

.premium-table-v2 td {
  padding: 14px !important;
  border-bottom: 1px solid var(--gold-alpha-soft) !important;
  color: var(--text-primary) !important;
  font-weight: 600 !important;
}

/* 21. تأثير الظهور (Fade In) للصفحات */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-enter {
  animation: fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 22. وسادة أيقونة في الهيدر */
.icon-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: var(--accent-alpha);
}

/* 23. مؤشر التمرير (Hover indicator) */
.hover-gold {
  transition: color 0.2s ease;
}

.hover-gold:hover {
  color: #e9c349 !important;
}

/* 24. ظل البطاقة المحسّن (Figma-style shadow) */
.shadow-figma {
  box-shadow: 
    0 4px 6px -2px rgba(0, 0, 0, 0.05),
    0 10px 15px -3px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(233, 195, 73, 0.03) !important;
}

[data-theme='dark'] .shadow-figma {
  box-shadow: 
    0 4px 8px -2px rgba(0, 0, 0, 0.25),
    0 10px 20px -4px rgba(0, 0, 0, 0.35),
    0 0 24px rgba(233, 195, 73, 0.03) !important;
}

/* 25. دائرية الزوايا الموحدة */
.radius-card { border-radius: 14px !important; }
.radius-dialog { border-radius: 24px !important; }
.radius-btn { border-radius: 12px !important; }
.radius-field { border-radius: 14px !important; }
.radius-pill { border-radius: 9999px !important; }

/* 26. الفواصل (Gaps) */
.gap-xs { gap: 4px !important; }
.gap-sm { gap: 8px !important; }
.gap-md { gap: 12px !important; }
.gap-lg { gap: 16px !important; }
.gap-xl { gap: 24px !important; }

/* 27. اتجاه النص (RTL/LTR Helpers) */
.rtl-text { direction: rtl; text-align: right; }
.ltr-text { direction: ltr; text-align: left; display: inline-block; }

/* 28. لون النص الأساسي حسب الثيم */
.text-primary-theme {
  color: #000000 !important;
}

[data-theme='dark'] .text-primary-theme {
  color: #F1F5F9 !important;
}

/* 29. الخلفية الشفافة المظللة */
.bg-dark-alpha {
  background: rgba(0, 0, 0, 0.3) !important;
}

[data-theme='light'] .bg-dark-alpha {
  background: rgba(0, 0, 0, 0.03) !important;
}

/* 30. حدود تاريخ صلاحية - ثنائي (Gregorian + Hijri) */
.date-dual {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.date-dual-gregorian {
  font-weight: 900;
  font-size: 0.85rem;
}

.date-dual-hijri {
  font-size: 0.7rem;
  font-weight: 800;
  margin-top: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(233, 195, 73, 0.1);
  color: var(--gold);
}

/* 31. بطاقة أطراف الوكالة (Party Card) */
.party-card {
  background: var(--glass-bg-soft) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 14px !important;
  padding: 16px !important;
  transition: var(--transition-smooth);
}

.party-card:hover {
  border-color: rgba(233, 195, 73, 0.4) !important;
}

/* 32. صلاحيات الوكالة (Power list) */
.power-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(233, 195, 73, 0.06);
}

.power-item:last-child {
  border-bottom: none;
}

.power-bullet {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--gold);
  margin-top: 8px;
  flex-shrink: 0;
}

/* 33. أيقونة في خلفية ذهبية */
.icon-gold-bg {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--accent-alpha);
}

/* 34. عنوان القسم (Section title) */
.section-title {
  font-weight: 900 !important;
  font-size: 1rem !important;
  color: var(--gold) !important;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 35. شعار التطبيق (Header gold accent bar) */
.header-gold-bar {
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
  border: none;
  margin: 0;
}

/* 36. حقل ثنائي التاريخ (Dual date field) */
.date-field-group {
  display: flex;
  gap: 12px;
}

.date-field-group > * {
  flex: 1;
}

/* 37. تأثير النبض للحالة النشطة */
@keyframes pulse-gold {
  0%, 100% { box-shadow: 0 0 0 0 rgba(233, 195, 73, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(233, 195, 73, 0); }
}

.pulse-gold {
  animation: pulse-gold 2s infinite;
}

/* 38. إطار الصورة/الأيقونة في رأس البطاقة */
.media-frame {
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  overflow: hidden;
}

/* 39. ملخص البطاقة (Card summary) */
.card-summary {
  opacity: 0.7;
  font-weight: 700;
  font-size: 0.8rem;
}

/* 40. إجراءات سريعة (Quick actions bar) */
.quick-actions {
  display: flex;
  gap: 4px;
  flex-wrap: nowrap;
  align-items: center;
}
`

try {
  // قراءة الملف الحالي
  let css = fs.readFileSync(cssPath, 'utf-8')

  // التحقق من عدم وجود الإضافات مسبقاً
  if (css.includes('الأنماط المضافة من تحليل Figma Mockups')) {
    console.log('✓ الأنماط المضافة موجودة مسبقاً في theme.css')
    process.exit(0)
  }

  // إضافة الأنماط
  css += enhancements
  fs.writeFileSync(cssPath, css, 'utf-8')

  console.log(`✓ تم إضافة الأنماط المحسّنة إلى ${cssPath}`)
  console.log('  أضيفت 40 كلاس/style جديد مستخرج من Figma')
} catch (err) {
  console.error(`✗ خطأ: ${err.message}`)
  process.exit(1)
}
