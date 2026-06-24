/**
 * Fix <v-label>...</label> → <v-label>...</v-label>
 * Vue compiler throws error when component tags have mismatched closing tags.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'src', 'renderer', 'src');

function getAllVueFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) results = results.concat(getAllVueFiles(fp));
    else if (e.name.endsWith('.vue')) results.push(fp);
  }
  return results;
}

const files = getAllVueFiles(SRC);
let fixed = 0;

for (const fp of files) {
  let content = fs.readFileSync(fp, 'utf-8');
  
  // Fix: <v-label ...>...</label> → <v-label ...>...</v-label>
  // Only fix </label> when the matching opening tag is <v-label>
  // Simple approach: find all </label> preceded by a <v-label> and change to </v-label>
  const newContent = content.replace(/<v-label([^>]*)>([\s\S]*?)<\/label>/g, (match, attrs, inner) => {
    return '<v-label' + attrs + '>' + inner + '</v-label>';
  });
  
  if (newContent !== content) {
    fs.writeFileSync(fp, newContent, 'utf-8');
    const rel = path.relative(path.resolve(__dirname, '..'), fp);
    console.log('  Fixed: ' + rel);
    fixed++;
  }
}

console.log('Done: ' + fixed + ' files fixed');
