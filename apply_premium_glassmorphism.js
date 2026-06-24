/**
 * script name: apply_premium_glassmorphism.js
 * Description: Automates the application of premium Glassmorphism design tokens (glass-card, glass-input, premium-btn-gold-gradient)
 *              across all Vue view components in the project.
 */

const fs = require('fs');
const path = require('path');

const VIEWS_DIR = path.join(__dirname, 'src/renderer/src/views');

// Check if directory exists
if (!fs.existsSync(VIEWS_DIR)) {
  console.error(`Error: Views directory not found at: ${VIEWS_DIR}`);
  process.exit(1);
}

// Helper to scan directory recursively
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

const files = getVueFiles(VIEWS_DIR);
console.log(`🚀 Starting visual alignment for ${files.length} views...\n`);

let modifiedCount = 0;

files.forEach((filePath) => {
  const relativePath = path.relative(VIEWS_DIR, filePath);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Inject 'glass-card' into <v-card>
  // Match `<v-card ...>` but skip if it already contains 'glass-card'
  content = content.replace(/<v-card([^>]*?)>/g, (match, attrs) => {
    if (attrs.includes('glass-card')) {
      return match; // Already applied
    }
    // If it has class, append glass-card
    if (attrs.includes('class="')) {
      return `<v-card${attrs.replace(/class="([^"]*)"/, 'class="glass-card $1"')}>`;
    } else if (attrs.includes("class='")) {
      return `<v-card${attrs.replace(/class='([^']*)'/, "class='glass-card $1'")}>`;
    } else {
      // No class attribute, add class="glass-card"
      return `<v-card class="glass-card"${attrs}>`;
    }
  });

  // 2. Inject 'glass-input' into form fields (<v-text-field>, <v-select>, <v-autocomplete>, <v-textarea>, <v-combobox>)
  const inputTags = ['v-text-field', 'v-select', 'v-autocomplete', 'v-textarea', 'v-combobox'];
  inputTags.forEach((tag) => {
    const regex = new RegExp(`<${tag}([^>]*?)>`, 'g');
    content = content.replace(regex, (match, attrs) => {
      if (attrs.includes('glass-input')) {
        return match; // Already applied
      }
      if (attrs.includes('class="')) {
        return `<${tag}${attrs.replace(/class="([^"]*)"/, 'class="glass-input $1"')}>`;
      } else if (attrs.includes("class='")) {
        return `<${tag}${attrs.replace(/class='([^']*)'/, "class='glass-input $1'")}>`;
      } else {
        return `<${tag} class="glass-input"${attrs}>`;
      }
    });
  });

  // 3. Inject 'premium-btn-gold-gradient' to primary gold-themed buttons
  // Target buttons that have color="primary" or color="gold"
  content = content.replace(/<v-btn([^>]*?)>/g, (match, attrs) => {
    const isGoldPrimary = attrs.includes('color="primary"') || attrs.includes('color="gold"') || attrs.includes("color='primary'") || attrs.includes("color='gold'");
    const isTonalOrText = attrs.includes('variant="text"') || attrs.includes('variant="tonal"') || attrs.includes("variant='text'") || attrs.includes("variant='tonal'") || attrs.includes('icon');
    
    if (isGoldPrimary && !isTonalOrText && !attrs.includes('premium-btn-gold-gradient')) {
      if (attrs.includes('class="')) {
        return `<v-btn${attrs.replace(/class="([^"]*)"/, 'class="premium-btn-gold-gradient $1"')}>`;
      } else if (attrs.includes("class='")) {
        return `<v-btn${attrs.replace(/class='([^']*)'/, "class='premium-btn-gold-gradient $1'")}>`;
      } else {
        return `<v-btn class="premium-btn-gold-gradient"${attrs}>`;
      }
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Aligned UI style: ${relativePath}`);
    modifiedCount++;
  }
});

console.log(`\n✨ Finished processing! Modified ${modifiedCount} files out of ${files.length} total views.`);
