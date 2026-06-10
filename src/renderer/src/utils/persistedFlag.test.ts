import { describe, expect, it } from 'vitest'
import { readPersistedFlag, writePersistedFlag } from './persistedFlag'

describe('persistedFlag', () => {
  it('reads fallback when storage is empty', () => {
    localStorage.removeItem('k')
    expect(readPersistedFlag('k', true)).toBe(true)
    expect(readPersistedFlag('k', false)).toBe(false)
  })

  it('writes and reads boolean flags', () => {
    writePersistedFlag('k2', true)
    expect(readPersistedFlag('k2', false)).toBe(true)
    writePersistedFlag('k2', false)
    expect(readPersistedFlag('k2', true)).toBe(false)
  })
})
