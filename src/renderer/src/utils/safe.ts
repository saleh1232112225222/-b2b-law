/**
 * Safe data access utilities to prevent runtime crashes in Vue templates
 * and components during asynchronous data fetching.
 */

/**
 * Ensures a value is an array, otherwise returns an empty array.
 */
export function safeArray<T = any>(arr: unknown): T[] {
  return Array.isArray(arr) ? (arr as T[]) : []
}

/**
 * Ensures a value is an object, otherwise returns an empty object.
 */
export function safeObject<T extends object>(obj: T | undefined | null): T | Record<string, never> {
  return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {}
}

/**
 * Returns the length of an array safely.
 */
export function safeLength(arr: any[] | undefined | null): number {
  return safeArray(arr).length
}

/**
 * Provides a default value if the main value is undefined or null.
 */
export function valWithDefault<T>(value: T | undefined | null, defaultValue: T): T {
  return value !== undefined && value !== null ? value : defaultValue
}

/**
 * Checks if a string or date object represents a valid date.
 */
export function isValidDate(d: any): boolean {
  if (!d) return false
  const date = new Date(d)
  return !isNaN(date.getTime())
}

/**
 * Safely extracts/formats a date string to YYYY-MM-DD,
 * stripping out ISO timestamp zero values (e.g. '2026-08-09T00:00:00.000Z' -> '2026-08-09').
 */
export function formatDateOnly(val: unknown, fallback: string = '—'): string {
  if (!val) return fallback
  const str = String(val).trim()
  if (!str || str === 'undefined' || str === 'null') return fallback
  if (str.includes('T')) return str.split('T')[0]
  if (str.includes(' ')) return str.split(' ')[0]
  return str
}

