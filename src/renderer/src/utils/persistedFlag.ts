// Safe helpers for persisting simple UI flags without breaking when storage is unavailable (private mode / sandbox).
export const readPersistedFlag = (key: string, fallback: boolean): boolean => {
  try {
    const v = localStorage.getItem(key)
    if (v == null) return fallback
    return v === '1' || v === 'true'
  } catch {
    return fallback
  }
}

export const writePersistedFlag = (key: string, value: boolean): void => {
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch {}
}
