const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src/renderer/src');

function getVueFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getVueFiles(fullPath));
    } else if (file.endsWith('.vue')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = getVueFiles(SRC_DIR);
console.log(`Scanning ${files.length} vue files for issues...`);

files.forEach((filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  const isViewFile = filePath.includes(path.join('src', 'views')) || filePath.includes('views/');

  // 1. Fix closing labels
  // If it's a view file, any </v-label...> closing tag should be </label> because there are no opening <v-label> tags in views.
  const vLabelRegex = /<\/v-label\s*>/gi;
  if (isViewFile && vLabelRegex.test(content)) {
    console.log(`Found v-label closing tag issue in: ${path.relative(SRC_DIR, filePath)}`);
    content = content.replace(vLabelRegex, '</label>');
  }

  const labelRegex = /<\/label\s*>/gi;
  if (labelRegex.test(content)) {
    console.log(`Found label closing tag issue in: ${path.relative(SRC_DIR, filePath)}`);
    content = content.replace(labelRegex, '</label>');
  }

  // 2. Fix corrupted v-btn-toggle opening tags
  const btnToggleRegex = /<v-btn\s+class="premium-btn-gold-gradient"-toggle/g;
  if (btnToggleRegex.test(content)) {
    console.log(`Found btn-toggle issue in: ${path.relative(SRC_DIR, filePath)}`);
    content = content.replace(btnToggleRegex, '<v-btn-toggle class="premium-btn-gold-gradient"');
  }

  // 3. Fix specific duplicate class attributes
  if (filePath.endsWith('BriefingDashboard.vue')) {
    content = content.replace(
      /<v-card class="glass-card"\s*v-if="actionRequired\.length > 0"\s*class="rounded-xl border border-error bg-white shadow-premium pa-6 text-center"/g,
      '<v-card v-if="actionRequired.length > 0" class="glass-card rounded-xl border border-error bg-white shadow-premium pa-6 text-center"'
    );
    content = content.replace(
      /<v-card class="glass-card"\s*v-if="awaitingEnforcement\.length > 0"\s*class="mt-6 rounded-xl border-accent bg-white pa-4"/g,
      '<v-card v-if="awaitingEnforcement.length > 0" class="glass-card mt-6 rounded-xl border-accent bg-white pa-4"'
    );
  }

  if (filePath.endsWith('CourtCasesReport.vue')) {
    content = content.replace(
      /<v-card class="glass-card"\s*v-if="reportCases\.length > 0"\s*elevation="0"\s*class="glass-card border border-gold border-opacity-10 rounded-xl overflow-hidden mb-8 print-table-card"/g,
      '<v-card v-if="reportCases.length > 0" elevation="0" class="glass-card border border-gold border-opacity-10 rounded-xl overflow-hidden mb-8 print-table-card"'
    );
  }

  if (filePath.endsWith('CaseFormDialog.vue')) {
    content = content.replace(
      /<v-select\s+class="glass-input"\s+v-model="item\.responsible_user_id"[\s\S]*?class="premium-select"/g,
      (match) => {
        console.log('Matched duplicate class in CaseFormDialog.vue!');
        let fixed = match.replace('class="glass-input"', '');
        fixed = fixed.replace('class="premium-select"', 'class="glass-input premium-select"');
        return fixed.replace(/\s+/g, ' ');
      }
    );
  }

  if (filePath.endsWith('CasePartiesEditor.vue')) {
    content = content.replace(
      /<v-autocomplete\s+class="glass-input"\s+:model-value="party\.client_id"[\s\S]*?class="premium-select"/g,
      (match) => {
        console.log('Matched duplicate class 1 in CasePartiesEditor.vue!');
        let fixed = match.replace('class="glass-input"', '');
        fixed = fixed.replace('class="premium-select"', 'class="glass-input premium-select"');
        return fixed.replace(/\s+/g, ' ');
      }
    );

    content = content.replace(
      /<v-autocomplete\s+class="glass-input"\s+:model-value="party\.defendant_id"[\s\S]*?class="flex-grow-1 premium-select"/g,
      (match) => {
        console.log('Matched duplicate class 2 in CasePartiesEditor.vue!');
        let fixed = match.replace('class="glass-input"', '');
        fixed = fixed.replace('class="flex-grow-1 premium-select"', 'class="glass-input flex-grow-1 premium-select"');
        return fixed.replace(/\s+/g, ' ');
      }
    );
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Saved fixes for: ${path.relative(SRC_DIR, filePath)}`);
  }
});

console.log(`Done!`);
