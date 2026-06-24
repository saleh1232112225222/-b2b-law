const fs = require('fs')
const path = require('path')
const dir = 'G:/w2w/dist/web/assets'
const files = fs.readdirSync(dir).filter((f) => f.includes('SessionRoom') && f.endsWith('.js'))
const patterns = [
  '\u0627\u0644\u062D\u0643\u0645 \u0644\u0635\u0627\u0644\u062D \u0645\u0646',
  '\u0647\u0644 \u0627\u0644\u062D\u0643\u0645 \u064A\u062D\u062A\u0627\u062C \u062A\u0646\u0641\u064A\u0630',
  '\u0647\u0644 \u064A\u0648\u062C\u062F \u0633\u0628\u0628 \u0645\u0634\u0631\u0648\u0639',
  '\u062F\u0631\u062C\u0629 \u0627\u0644\u062D\u0643\u0645:',
  '\u0646\u0648\u0639 \u0627\u0644\u0642\u0636\u064A\u0629'
]
const labels = [
  '\u0627\u0644\u062D\u0643\u0645 \u0644\u0635\u0627\u0644\u062D \u0645\u0646',
  '\u0647\u0644 \u0627\u0644\u062D\u0643\u0645 \u064A\u062D\u062A\u0627\u062C \u062A\u0646\u0641\u064A\u0630',
  '\u0647\u0644 \u064A\u0648\u062C\u062F \u0633\u0628\u0628 \u0645\u0634\u0631\u0648\u0639',
  '\u062F\u0631\u062C\u0629 \u0627\u0644\u062D\u0643\u0645:',
  '\u0646\u0648\u0639 \u0627\u0644\u0642\u0636\u064A\u0629'
]
files.forEach((f) => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8')
  console.log('=== ' + f + ' (' + (content.length / 1024).toFixed(1) + ' KB) ===')
  patterns.forEach((p, i) => {
    const idx = content.indexOf(p)
    if (idx >= 0) {
      console.log('  OK - "' + labels[i] + '" found at offset ' + idx)
      console.log('     context: ...' + content.substring(Math.max(0, idx - 30), idx + 30) + '...')
    } else {
      console.log('  MISS - "' + labels[i] + '" NOT FOUND!')
    }
  })
})
