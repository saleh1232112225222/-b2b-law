import { describe, expect, it } from 'vitest'
import { unwrapArrayResponse } from './ApiAdapter'

describe('unwrapArrayResponse', () => {
  const rows = [{ id: 'case-1' }]

  it.each([
    ['direct arrays', rows],
    ['data envelopes', { data: rows }],
    ['rows envelopes', { rows }],
    ['items envelopes', { items: rows }]
  ])('normalizes %s', (_label, response) => {
    expect(unwrapArrayResponse(response)).toEqual(rows)
  })

  it.each([undefined, null, {}, { data: {} }, 'invalid'])('returns an empty array for %p', (response) => {
    expect(unwrapArrayResponse(response)).toEqual([])
  })
})
