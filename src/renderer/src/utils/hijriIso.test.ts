import { describe, expect, it } from 'vitest'
import { gregorianIsoToHijriIso, hijriIsoToGregorianIso } from './hijriIso'

describe('Hijri ISO conversion', () => {
  it('converts a known gregorian date to hijri ISO', () => {
    const h = gregorianIsoToHijriIso('2024-03-11')
    expect(h).toMatch(/^1445-0?9-/)
  })

  it('round-trips within the supported range', () => {
    const g = '2024-03-11'
    const h = gregorianIsoToHijriIso(g)
    const back = hijriIsoToGregorianIso(h)
    expect(back).toBe(g)
  })

  it('returns empty string for invalid inputs', () => {
    expect(gregorianIsoToHijriIso('')).toBe('')
    expect(hijriIsoToGregorianIso('')).toBe('')
    expect(hijriIsoToGregorianIso('1445-99-99')).toBe('')
  })
})
