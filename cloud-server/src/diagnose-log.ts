import * as fs from 'fs'
import * as path from 'path'

async function run() {
  const logPath =
    'C:\\Users\\saleh\\.gemini\\antigravity\\brain\\468028de-e9c5-4069-a2d4-7b521395acef\\.system_generated\\tasks\\task-281.log'
  if (!fs.existsSync(logPath)) {
    console.log('Log file does not exist')
    return
  }

  const content = fs.readFileSync(logPath, 'utf8')
  const lines = content.split('\n')

  const failedTables: Record<string, number> = {}
  const errors: Record<string, string[]> = {}

  for (const line of lines) {
    if (line.includes('[ImportSnapshot] FAILED row in')) {
      const match = line.match(/FAILED row in (\w+): (.*)/)
      if (match) {
        const table = match[1]
        const err = match[2]
        failedTables[table] = (failedTables[table] || 0) + 1
        if (!errors[table]) errors[table] = []
        if (errors[table].length < 3 && !errors[table].includes(err)) {
          errors[table].push(err)
        }
      }
    }
  }

  console.log('Failed row counts per table:', failedTables)
  console.log('Sample errors per table:', errors)
}

run()
