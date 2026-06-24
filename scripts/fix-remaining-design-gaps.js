/**
 * Fix remaining design gaps after the initial automated pass.
 * This script handles edge cases the generic regex missed:
 * - Duplicate classes (glass-card glass-card)
 * - glass-card on wrong elements (v-card-title, v-card-text)
 * - Missing glass-card on v-cards in specific components
 * - Missing glass-input on form fields
 * - Fix broken HTML (</v-label> → </label>)
 */
const fs = require('fs')
const path = require('path')

const SRC = path.resolve(__dirname, '..', 'src', 'renderer', 'src')

function getAllVueFiles(dir) {
  let results = []
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) results = results.concat(getAllVueFiles(fullPath))
      else if (entry.name.endsWith('.vue')) results.push(fullPath)
    }
  } catch {}
  return results
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8')
  let modified = false

  // 1. Fix duplicate classes: "glass-card glass-card" → "glass-card"
  const dupPatterns = [
    /\bglass-card\s+glass-card\b/g,
    /\bglass-input\s+glass-input\b/g,
    /\bpremium-btn-gold-gradient\s+premium-btn-gold-gradient\b/g
  ]
  for (const pat of dupPatterns) {
    if (pat.test(content)) {
      content = content.replace(pat, (m) => {
        const cls = m.split(/\s+/)[0]
        return cls
      })
      modified = true
    }
  }

  // 2. Remove glass-card from non-card elements (v-card-title, v-card-text, v-card-actions, v-card-subtitle)
  const wrongElements = ['v-card-title', 'v-card-text', 'v-card-actions', 'v-card-subtitle']
  for (const el of wrongElements) {
    const re = new RegExp(`(<${el}[^>]*?class=")([^"]*?)glass-card([^"]*?)(")`, 'g')
    content = content.replace(re, (match, before, clsBefore, clsAfter, quote) => {
      let cls = (clsBefore + clsAfter).trim().replace(/\s+/g, ' ')
      if (cls === '' || cls === ' ') return `<${el}${before.slice(0, -1)}${quote}`
      return `${before}${cls}${quote}`
    })
    modified = true
  }

  // 3. Fix broken </v-label> → </label>
  const brokenLabel = /<\/v-label>/g
  if (brokenLabel.test(content)) {
    content = content.replace(brokenLabel, '</label>')
    modified = true
  }

  // 4. Fix broken v-btn-toggle tags (e.g., <v-btn class="..."-toggle)
  const brokenBtnToggle = /<v-btn\s+([^>]*?)class="([^"]*)"-toggle/g
  if (brokenBtnToggle.test(content)) {
    content = content.replace(brokenBtnToggle, '<v-btn-toggle class="$2"')
    modified = true
  }

  // 5. Add glass-card to plain v-cards that obviously need it
  //    (skip those with bg-transparent, border-0, or inside data tables)
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Check if this is a <v-card> without glass-card and without explicit exclusion
    if (
      /<v-card[\s>]/.test(line) &&
      !/glass-card/.test(line) &&
      !/bg-transparent/.test(line) &&
      !/border-0/.test(line) &&
      !/v-data-table/.test(line) &&
      !/variant="outlined"/.test(line) &&
      !/v-alert/.test(line)
    ) {
      // Add glass-card to class attribute if it exists
      if (/class="[^"]*"/.test(line)) {
        lines[i] = line.replace(/class="([^"]*)"/, (m, cls) => {
          if (cls.includes('glass-card')) return m
          return `class="${cls.trim()} glass-card"`
        })
        modified = true
      }
    }
  }
  content = lines.join('\n')

  // 6. Add glass-input to input fields that don't have it
  const inputTags = ['v-text-field', 'v-select', 'v-autocomplete', 'v-textarea', 'v-combobox']
  for (const tag of inputTags) {
    const re = new RegExp(`<${tag}([^>]*?)(class=")([^"]*)(")`, 'g')
    content = content.replace(re, (match, before, clsOpen, clsVal, clsClose) => {
      if (clsVal.includes('glass-input') || clsVal.includes('search-field')) return match
      return `<${tag}${before}${clsOpen}${clsVal.trim()} glass-input${clsClose}`
    })
    // Only mark as modified if actual changes were made
  }
  // Check if input regex actually changed anything
  const newContentInput = content
  // We can't easily track, so let's compare
  if (newContentInput !== fs.readFileSync(filePath, 'utf-8')) {
    modified = true
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8')
    const rel = path.relative(path.resolve(__dirname, '..'), filePath)
    console.log(`  ✓ Fixed: ${rel}`)
    return true
  }
  return false
}

console.log('Scanning and fixing remaining design gaps...\n')

const files = getAllVueFiles(SRC)
let fixed = 0
let skipped = 0

for (const f of files) {
  if (f.includes('node_modules')) continue
  if (fixFile(f)) fixed++
  else skipped++
}

console.log(`\nDone: ${fixed} files fixed, ${skipped} files already clean`)
