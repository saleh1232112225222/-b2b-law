import { describe, expect, it } from 'vitest'
import { computeDeadline } from './deadlines'

describe('computeDeadline', () => {
  it('adds days and pushes forward if landing on weekend (Fri/Sat)', () => {
    // 2024-03-07 is Thu; +1 => Fri (weekend) => push to Sun 2024-03-10 (Fri/Sat weekend)
    const d = computeDeadline('2024-03-07', 1, { weekendDays: [5, 6] })
    expect(d).toBe('2024-03-10')
  })

  it('pushes forward if landing on holiday', () => {
    const d = computeDeadline('2024-03-06', 1, { holidays: ['2024-03-07'], weekendDays: [] })
    expect(d).toBe('2024-03-08')
  })

  it('returns empty string for invalid inputs', () => {
    expect(computeDeadline('', 10)).toBe('')
    expect(computeDeadline('invalid', 10)).toBe('')
    expect(computeDeadline('2024-01-01', -1)).toBe('')
  })
})
