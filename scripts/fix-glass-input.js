const fs = require('fs');
const path = require('path');

const files = [
  'components/ClientForm.vue',
  'components/DefendantForm.vue',
  'components/enforcement/BaseInfoForm.vue',
  'components/enforcement/DecisionsManager.vue',
  'components/enforcement/DirectFields.vue',
  'components/enforcement/FinancialFields.vue',
  'components/enforcement/PersonalFields.vue',
  'components/finance/AccountsChart.vue',
  'components/finance/CreateCreditNoteModal.vue',
  'components/finance/InvoicesList.vue',
  'components/finance/ReceivablesList.vue',
  'components/finance/VouchersList.vue',
  'views/Communications.vue',
  'views/cases/CasePartiesEditor.vue',
  'views/tasks/TaskFilterBar.vue',
];

const SRC = path.resolve(__dirname, '..', 'src', 'renderer', 'src');
let fixed = 0;

for (const rel of files) {
  const fp = path.join(SRC, rel);
  if (!fs.existsSync(fp)) {
    console.log('  SKIP (not found): ' + rel);
    continue;
  }
  let content = fs.readFileSync(fp, 'utf-8');
  let modified = false;

  const inputTags = ['v-text-field', 'v-select', 'v-autocomplete', 'v-textarea', 'v-combobox'];

  for (const tag of inputTags) {
    const tagPattern = '<' + tag;
    let idx = content.indexOf(tagPattern);
    while (idx !== -1) {
      // Find the end of the opening > tag
      const endIdx = content.indexOf('>', idx);
      if (endIdx === -1) break;

      const tagOpen = content.substring(idx, endIdx + 1);

      // Skip self-closing or if already has glass-input or search-field or inside data-table
      if (tagOpen.includes('glass-input') || tagOpen.includes('search-field') || tagOpen.includes('v-data-table')) {
        idx = content.indexOf(tagPattern, endIdx);
        continue;
      }

      // Check if has class attribute
      const classMatch = tagOpen.match(/class="([^"]*)"/);
      if (classMatch) {
        if (!classMatch[1].includes('glass-input')) {
          const newClassVal = classMatch[1].trim() + ' glass-input';
          const oldStr = 'class="' + classMatch[1] + '"';
          const newStr = 'class="' + newClassVal + '"';
          content = content.substring(0, idx) + content.substring(idx, endIdx + 1).replace(oldStr, newStr) + content.substring(endIdx + 1);
          modified = true;
        }
      } else {
        // No class - add one
        const insertion = ' class="glass-input" ';
        // Insert after the tag name
        const tagNameEnd = idx + tagPattern.length;
        content = content.substring(0, tagNameEnd) + insertion + content.substring(tagNameEnd);
        modified = true;
      }

      idx = content.indexOf(tagPattern, endIdx + 1);
    }
  }

  if (modified) {
    fs.writeFileSync(fp, content, 'utf-8');
    console.log('  Fixed: ' + rel);
    fixed++;
  }
}

console.log('Done: ' + fixed + ' files fixed');
