import { describe, it, expect } from 'vitest'
import { convertToHijri } from './hijri'

describe('Hijri Conversion Utility', () => {
  it('should convert a known date correctly', () => {
    // 2024-03-11 is roughly 1 Ramadan 1445
    const date = new Date(2024, 2, 11) // Months are 0-indexed
    const result = convertToHijri(date)

    expect(result).toContain('رمضان')
    expect(result).toContain('1445')
  })

  it('should return empty string for invalid date', () => {
    const result = convertToHijri(new Date('invalid'))
    expect(result).toBe('')
  })

  it('should include the weekday in the output', () => {
    const date = new Date(2024, 2, 11)
    const result = convertToHijri(date)
    // 2024-03-11 was Monday (الإثنين)
    expect(result).toMatch(/الإثنين|الاثنين/)
  })
})
