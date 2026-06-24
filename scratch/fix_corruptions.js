const fs = require('fs')
const path = require('path')

const rootDir = process.cwd()
const DIRS = [
  path.join(rootDir, 'src/renderer/src/views'),
  path.join(rootDir, 'src/renderer/src/components'),
  path.join(rootDir, 'src/renderer/src/layouts')
]
const APP_FILE = path.join(rootDir, 'src/renderer/src/App.vue')

function getVueFiles(dir) {
  let results = []
  if (!fs.existsSync(dir)) return []
  const list = fs.readdirSync(dir)
  list.forEach((file) => {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat && stat.isDirectory()) {
      results = results.concat(getVueFiles(fullPath))
    } else if (file.endsWith('.vue')) {
      results.push(fullPath)
    }
  })
  return results
}

let vueFiles = []
DIRS.forEach((dir) => {
  vueFiles = vueFiles.concat(getVueFiles(dir))
})
if (fs.existsSync(APP_FILE)) {
  vueFiles.push(APP_FILE)
}

console.log(`Scanning ${vueFiles.length} Vue files to fix class name corruptions...\n`)

const REPLACEMENTS = [
  // Class names starting with single hyphen inside class strings
  { from: /\b-white\b/g, to: 'text-white' },
  { from: /\b-column\b/g, to: 'flex-column' },
  { from: /\b-row\b/g, to: 'flex-row' },
  { from: /\b-body-1\b/g, to: 'text-body-1' },
  { from: /\b-body-2\b/g, to: 'text-body-2' },
  { from: /\b-pure-black\b/g, to: 'text-pure-black' },
  { from: /\b-grey-darken-3\b/g, to: 'text-grey-darken-3' },
  { from: /\b-grey-darken-2\b/g, to: 'text-grey-darken-2' },
  { from: /\b-grey-darken-1\b/g, to: 'text-grey-darken-1' },
  { from: /\b-grey-lighten-4\b/g, to: 'text-grey-lighten-4' },
  { from: /\b-start\b/g, to: 'text-start' },
  { from: /\b-center\b/g, to: 'text-center' },
  { from: /\b-end\b/g, to: 'text-end' },
  { from: /\b-primary\b/g, to: 'text-primary' },
  { from: /\b-accent\b/g, to: 'text-accent' },
  { from: /\b-h1\b/g, to: 'text-h1' },
  { from: /\b-h2\b/g, to: 'text-h2' },
  { from: /\b-h3\b/g, to: 'text-h3' },
  { from: /\b-h4\b/g, to: 'text-h4' },
  { from: /\b-h5\b/g, to: 'text-h5' },
  { from: /\b-h6\b/g, to: 'text-h6' },
  { from: /\b-caption\b/g, to: 'text-caption' },
  { from: /\b-tiny\b/g, to: 'text-tiny' },
  // specific known corruptions
  {
    from: /class="me-4 border-white-2 shadow-sm bg-"/g,
    to: 'class="me-4 border-white-2 shadow-sm bg-white"'
  },
  { from: /'juris-crystal-canvas':\s*,/g, to: "'juris-crystal-canvas': isDark," }
]

let fixedCount = 0

vueFiles.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8')
  let originalContent = content

  REPLACEMENTS.forEach((rep) => {
    content = content.replace(rep.from, rep.to)
  })

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8')
    console.log(`Fixed corruptions in: ${path.relative(rootDir, file)}`)
    fixedCount++
  }
})

console.log(`\nDone! Fixed corruptions in ${fixedCount} files.`)
