import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, resolve } from 'path'

const walk = (root: string): string[] => {
  const out: string[] = []
  let entries: string[]
  try { entries = readdirSync(root) } catch { return [] }
  for (const e of entries) {
    const p = join(root, e)
    let s
    try { s = statSync(p) } catch { continue }
    if (s.isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

describe('UI audits', () => {
  it('does not use non-theme darken toolbar colors in dialogs', () => {
    const root = resolve(process.cwd(), 'src/renderer/src')
    const files = walk(root).filter((p) => p.endsWith('.vue'))
    const bad: Array<{ file: string; match: string }> = []
    const re = /<v-toolbar[^>]*(?:\scolor=|:color=)[^>]*(primary|indigo|secondary)-darken-\d+/g
    for (const f of files) {
      const txt = readFileSync(f, 'utf8')
      const matches = [...txt.matchAll(re)]
      if (matches.length) bad.push({ file: f, match: matches[0][0] })
    }
    expect(bad).toEqual([])
  })

  it('does not use window.confirm for destructive actions', () => {
    const roots = [resolve(process.cwd(), 'src/renderer/src'), resolve(process.cwd(), 'src/main')]
    const files = roots
      .flatMap((r) => walk(r))
      .filter(
        (p) =>
          (p.endsWith('.ts') || p.endsWith('.vue') || p.endsWith('.js')) && !p.includes('__tests__')
      )
    const bad: string[] = []
    for (const f of files) {
      const txt = readFileSync(f, 'utf8')
      if (/\bwindow\.confirm\s*\(/.test(txt)) bad.push(f)
    }
    expect(bad).toEqual([])
  })
})
