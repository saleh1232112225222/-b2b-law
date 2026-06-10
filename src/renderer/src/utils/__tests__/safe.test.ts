import { describe, it, expect } from 'vitest'
import { safeArray, safeObject, safeLength, valWithDefault, isValidDate } from '../safe'

describe('safeArray', () => {
  it('returns the array when given an array', () => {
    expect(safeArray([1, 2, 3])).toEqual([1, 2, 3])
  })
  it('returns empty array for null', () => {
    expect(safeArray(null)).toEqual([])
  })
  it('returns empty array for undefined', () => {
    expect(safeArray(undefined)).toEqual([])
  })
  it('returns empty array for non-array values', () => {
    expect(safeArray('hello')).toEqual([])
    expect(safeArray(42)).toEqual([])
    expect(safeArray({})).toEqual([])
  })
})

describe('safeObject', () => {
  it('returns the object when given an object', () => {
    expect(safeObject({ a: 1 })).toEqual({ a: 1 })
  })
  it('returns empty object for null', () => {
    expect(safeObject(null)).toEqual({})
  })
  it('returns empty object for undefined', () => {
    expect(safeObject(undefined)).toEqual({})
  })
})

describe('safeLength', () => {
  it('returns length for an array', () => {
    expect(safeLength([1, 2, 3])).toBe(3)
  })
  it('returns 0 for null', () => {
    expect(safeLength(null)).toBe(0)
  })
  it('returns 0 for undefined', () => {
    expect(safeLength(undefined)).toBe(0)
  })
})

describe('valWithDefault', () => {
  it('returns the value when not null/undefined', () => {
    expect(valWithDefault('hello', 'default')).toBe('hello')
    expect(valWithDefault(0, 42)).toBe(0)
    expect(valWithDefault(false, true)).toBe(false)
  })
  it('returns default for null', () => {
    expect(valWithDefault(null, 'default')).toBe('default')
  })
  it('returns default for undefined', () => {
    expect(valWithDefault(undefined, 'default')).toBe('default')
  })
})

describe('isValidDate', () => {
  it('returns true for valid dates', () => {
    expect(isValidDate(new Date())).toBe(true)
    expect(isValidDate(new Date('2024-01-01'))).toBe(true)
  })
  it('returns false for invalid dates', () => {
    expect(isValidDate(new Date('invalid'))).toBe(false)
    expect(isValidDate(null)).toBe(false)
    expect(isValidDate(undefined)).toBe(false)
  })
})
