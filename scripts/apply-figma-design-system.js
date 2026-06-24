/**
 * تطبيق نظام التصميم المستخرج من Figma Mockups (POA) على جميع ملفات Vue
 * 
 * التصاميم المرجعية: G:\w2w\figma-designs\poa-mockups\
 * - figma_poa_form_light.png / figma_poa_form_dark.png
 * - figma_poa_mobile_first_light.png / figma_poa_mobile_first_dark.png  
 * - figma_poa_preview_light.png / figma_poa_preview_dark.png
 * 
 * الأنماط المستخرجة من التصاميم:
 * 
 * === LIGHT MODE ===
 * الخلفية: #f4f6f9 → #ffffff
 * الكروت: glass rgba(255,255,255,0.7) + backdrop-filter: blur(20px)
 *   + border: 1px solid rgba(233, 195, 73, 0.15)
 *   + border-radius: 14px
 * الذهبي: #e9c349 (accent), #B8941E (text)
 * الأزرار: linear-gradient(135deg, #e9c349 → #b88a14) + border-radius: 12px
 * الحقول: border ذهبي + خلفية شفافة + border-radius: 14px
 * الهيدر: navy #0F2A55 → #1A437D
 * البطاقات الجانبية: border ذهبي خفيف
 * 
 * === DARK MODE ===
 * الخلفية: #0d0f14 → #161920
 * الكروت: rgba(255,255,255,0.03) + backdrop-filter: blur(25px) saturate(150%)
 *   + border: 1px solid rgba(233, 195, 73, 0.25)
 *   + border-radius: 14px  
 * الذهبي: #e9c349 (accent/labels), #FFF3C4 (text on dark)
 * الأزرار: linear-gradient(135deg, #e9c349 → #b88a14) + أسود #0c0e14 للنص
 * التوهج: box-shadow عند hover
 * 
 * === GENERAL ===
 * زوايا:  24px → dialogs, 14px → cards, 12px → buttons, 10px → inputs
 * 3D: cards لها subtle shadow/glow
 * RTL: كل التصاميم من اليمين لليسار
 * 
 * الكلاسات CSS الجاهزة المستخدمة:
 * - .glass-card (v-card)
 * - .glass-input (v-text-field, v-select, etc.)
 * - .premium-btn-gold-gradient (primary buttons)
 * - .text-gold (gold text)
 * - .premium-button-highlight (secondary buttons)
 * - .border-gold-alpha / .border-gold-soft (gold borders)
 */

const fs = require('fs');
const path = require('path');

// المسارات
const VIEWS_DIR = path.resolve(__dirname, '..', 'src', 'renderer', 'src', 'views');
const COMPONENTS_DIR = path.resolve(__dirname, '..', 'src', 'renderer', 'src', 'components');
const LAYOUTS_DIR = path.resolve(__dirname, '..', 'src', 'renderer', 'src', 'layouts');
const APP_FILE = path.resolve(__dirname, '..', 'src', 'renderer', 'src', 'App.vue');

// إحصائيات
let stats = {
  scanned: 0,
  modified: 0,
  errors: 0,
  files: []
};

/**
 * أنماط البحث في ملفات Vue
 */
const PATTERNS = {
  // 1. v-card بدون class glass-card
  vcard: {
    match: /<v-card[\s>](?![\s\S]*?class=["'][^"']*glass-card[^"']*["'])/g,
    check: (content) => {
      // لا نعدل v-card داخل v-data-table
      const lines = content.split('\n');
      return lines.some(line => /<v-card[^>]*>/.test(line) && !/glass-card/.test(line) && !/v-data-table/.test(line));
    }
  },

  // 2. v-text-field, v-select, v-autocomplete, v-textarea, v-combobox بدون class glass-input
  input: {
    match: /<(v-text-field|v-select|v-autocomplete|v-textarea|v-combobox)[\s>](?![\s\S]*?class=["'][^"']*glass-input[^"']*["'])/g,
  },

  // 3. v-btn رئيسي (color="accent" أو color="primary" أو اللون الذهبي) بدون premium-btn-gold-gradient
  btn: {
    match: /<v-btn[\s>](?=[\s\S]*?color=["'](?:accent|primary|gold)["'])(?![\s\S]*?class=["'][^"']*premium-btn-gold-gradient[^"']*["'])[\s\S]*?>/g,
  },
};

/**
 * جمع كل ملفات Vue
 */
function getAllVueFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllVueFiles(fullPath));
    } else if (entry.name.endsWith('.vue')) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * تحسين أنماط v-card لتتوافق مع Figma
 */
function enhanceVCard(content) {
  // v-card بدون glass-card
  content = content.replace(
    /<v-card([^>]*?)(class=")([^"]*)("[\s>])/g,
    (match, before, clsOpen, clsVal, clsClose) => {
      if (clsVal.includes('glass-card')) return match;
      // لا نعدل v-card في v-data-table
      if (clsVal.includes('v-data-table')) return match;
      const newClass = clsVal.trim() ? `${clsVal.trim()} glass-card` : 'glass-card';
      return `<v-card${before}${clsOpen}${newClass}${clsClose}`;
    }
  );

  // v-card بدون class attribute
  content = content.replace(
    /<v-card([\s>])(?![\s\S]*?class=)/g,
    '<v-card$1 class="glass-card" '
  );

  return content;
}

/**
 * تحسين أنماط حقول الإدخال لتتوافق مع Figma
 */
function enhanceInputs(content) {
  const inputTags = ['v-text-field', 'v-select', 'v-autocomplete', 'v-textarea', 'v-combobox'];
  
  for (const tag of inputTags) {
    const regex = new RegExp(
      `<${tag}([^>]*?)(class=")([^"]*)(")`,
      'g'
    );
    content = content.replace(regex, (match, before, clsOpen, clsVal, clsClose) => {
      if (clsVal.includes('glass-input')) return match;
      const newClass = clsVal.trim() ? `${clsVal.trim()} glass-input` : 'glass-input';
      return `<${tag}${before}${clsOpen}${newClass}${clsClose}`;
    });

    // بدون class attribute
    const regex2 = new RegExp(`<${tag}([\\s>])(?![\\s\\S]*?class=)`, 'g');
    content = content.replace(regex2, `<${tag}$1 class="glass-input" `);
  }

  return content;
}

/**
 * تحسين أزرار v-btn الرئيسية
 */
function enhanceButtons(content) {
  // الأزرار الرئيسية - color="accent"
  content = content.replace(
    /<v-btn([^>]*?)(class=")([^"]*)("[\s>][\s\S]*?color=["'](?:accent|gold)["'])/g,
    (match, before, clsOpen, clsVal, clsClose) => {
      if (clsVal.includes('premium-btn-gold-gradient')) return match;
      const newClass = clsVal.trim() ? `${clsVal.trim()} premium-btn-gold-gradient` : 'premium-btn-gold-gradient';
      return `<v-btn${before}${clsOpen}${newClass}${clsClose}`;
    }
  );

  // v-btn مع color="primary" مع variant="flat"
  content = content.replace(
    /<v-btn([^>]*?)(class=")([^"]*)("[\s>][\s\S]*?color=["']primary["'][\s\S]*?variant=["']flat["'])/g,
    (match, before, clsOpen, clsVal, clsClose) => {
      if (clsVal.includes('premium-btn-gold-gradient') || clsVal.includes('v-data-table')) return match;
      const newClass = clsVal.trim() ? `${clsVal.trim()} premium-btn-gold-gradient` : 'premium-btn-gold-gradient';
      return `<v-btn${before}${clsOpen}${newClass}${clsClose}`;
    }
  );

  return content;
}

/**
 * إضافة border ذهبي للحاويات الرئيسية
 */
function enhanceGoldBorders(content) {
  // v-container رئيسي بدونه border
  content = content.replace(
    /<v-container([^>]*?)(class=")([^"]*)(fluid[\s>][^>]*>)/g,
    (match, before, clsOpen, clsVal, rest) => {
      if (clsVal.includes('border-gold')) return match;
      return `<v-container${before}${clsOpen}${clsVal} border-gold-soft${rest}`;
    }
  );

  return content;
}

/**
 * إضافة تأثيرات Glassmorphism للحوارات
 */
function enhanceDialogs(content) {
  // v-dialog → v-card داخله glass-card محسّن
  content = content.replace(
    /<v-card[\s>][\s\S]*?(?=<\/v-card>[\s\S]*?<\/v-dialog>)/g,
    (match) => {
      if (match.includes('glass-card')) return match;
      // تأكد من إضافة border-radius: 24px ليتوافق مع Figma
      return match.replace(
        /class="([^"]*)"/,
        (m, cls) => {
          if (cls.includes('glass-card')) return m;
          return `class="${cls.trim()} glass-card"`;
        }
      );
    }
  );

  return content;
}

/**
 * إضافة الكلاسات المفقودة والحفاظ على الموجود
 */
function applyDesignSystem(content) {
  let modified = false;
  let newContent = content;

  // 1. v-card enhancements
  const cardEnhanced = enhanceVCard(newContent);
  if (cardEnhanced !== newContent) modified = true;
  newContent = cardEnhanced;

  // 2. Form inputs enhancements
  const inputEnhanced = enhanceInputs(newContent);
  if (inputEnhanced !== newContent) modified = true;
  newContent = inputEnhanced;

  // 3. Button enhancements
  const btnEnhanced = enhanceButtons(newContent);
  if (btnEnhanced !== newContent) modified = true;
  newContent = btnEnhanced;

  // 4. Dialog enhancements
  const dialogEnhanced = enhanceDialogs(newContent);
  if (dialogEnhanced !== newContent) modified = true;
  newContent = dialogEnhanced;

  // 5. إصلاح الكلاسات المكررة (مثل class="glass-card glass-card")
  newContent = newContent.replace(
    /class="([^"]*?)\b(\w+(?:-\w+)*)\b([^"]*?)\2\b([^"]*?)"/g,
    (match, before, dup, middle, after) => {
      return `class="${before}${dup}${middle}${after}"`;
    }
  );

  return { content: newContent, modified };
}

/**
 * معالجة ملف Vue واحد
 */
function processFile(filePath) {
  try {
    const relativePath = path.relative(path.resolve(__dirname, '..'), filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const { content: newContent, modified } = applyDesignSystem(content);
    
    if (modified && newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      stats.modified++;
      stats.files.push({ file: relativePath, status: 'modified' });
      console.log(`  ✓ تم تعديل: ${relativePath}`);
    } else {
      stats.files.push({ file: relativePath, status: 'skipped' });
    }
    
    stats.scanned++;
  } catch (err) {
    stats.errors++;
    console.error(`  ✗ خطأ في ${filePath}: ${err.message}`);
  }
}

// ========== MAIN ==========
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  تطبيق نظام التصميم المستخرج من Figma Mockups (POA)     ║');
console.log('║  على جميع ملفات Vue في المشروع                          ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// جمع كل الملفات
const allFiles = [
  ...getAllVueFiles(VIEWS_DIR),
  ...getAllVueFiles(COMPONENTS_DIR),
  ...getAllVueFiles(LAYOUTS_DIR),
  APP_FILE,
];

// إزالة الملفات المكررة
const uniqueFiles = [...new Set(allFiles)];
const adminFiles = [];
const normalFiles = [];

for (const f of uniqueFiles) {
  if (f.includes('admin') || f.includes('node_modules')) continue;
  normalFiles.push(f);
}

console.log(`إجمالي ملفات Vue: ${normalFiles.length}`);
console.log('بدء المعالجة...\n');

for (const file of normalFiles) {
  processFile(file);
}

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║  التقرير النهائي                                        ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log(`  إجمالي الملفات الممسوحة: ${stats.scanned}`);
console.log(`  الملفات المعدلة:         ${stats.modified}`);
console.log(`  الأخطاء:                 ${stats.errors}`);
console.log('');

if (stats.files.filter(f => f.status === 'modified').length > 0) {
  console.log('الملفات المعدلة:');
  stats.files.filter(f => f.status === 'modified').forEach(f => {
    console.log(`  • ${f.file}`);
  });
}

console.log('\n--- تمت المعالجة ---');
