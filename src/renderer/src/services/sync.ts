import { ref, type Ref } from 'vue'

type SyncService = {
  isSyncing: Ref<boolean>
  lastSyncTime: Ref<string>
  lastSpreadsheetUrl: Ref<string>
  refreshStatus: () => Promise<void>
  setUrl: (url: string) => Promise<string>
  normalizeUrl: (raw: string) => string
  testConnection: () => Promise<boolean>
  uploadAll: () => Promise<boolean>
  test: () => Promise<boolean>
  syncAll: () => Promise<boolean>
  openSpreadsheet: () => Promise<void>
}

export const useSyncService = (): SyncService => {
  const isSyncing = ref(false)
  const lastSyncTime = ref('غير محدد')
  const lastSpreadsheetUrl = ref('')

  const normalizeUrl = (raw: string): string => {
    const s = String(raw || '').trim()
    if (!s) return ''
    if (/^https?:\/\//i.test(s)) return s
    if (s.startsWith('script.google.com/')) return `https://${s}`
    if (s.startsWith('com/macros/s/') || s.startsWith('/macros/s/') || s.startsWith('macros/s/'))
      return `https://script.google.com/${s.replace(/^\/+/, '')}`
    return `https://${s}`
  }

  const refreshStatus = async (): Promise<void> => {
    const settings = (await window.api.settings.get()) as {
      cloudSyncLastSuccess?: string
      cloudSyncLastSpreadsheetUrl?: string
    }
    if (settings?.cloudSyncLastSuccess) {
      const date = new Date(settings.cloudSyncLastSuccess)
      lastSyncTime.value = date.toLocaleString('ar-SA')
    } else {
      lastSyncTime.value = 'غير محدد'
    }
    lastSpreadsheetUrl.value = settings?.cloudSyncLastSpreadsheetUrl || ''
  }

  const setUrl = async (url: string): Promise<string> => {
    const normalized = normalizeUrl(url)
    await window.api.cloudSync.setUrl(normalized)
    return normalized
  }

  const testConnection = async (): Promise<boolean> => {
    try {
      const ok = await window.api.cloudSync.test()
      await refreshStatus()
      return ok
    } catch (e) {
      console.error('Sync Test Failed:', e)
      return false
    }
  }

  const uploadAll = async (): Promise<boolean> => {
    isSyncing.value = true
    try {
      // Note: CloudSyncService.collectAllData() is now called in main if payload is null
      const ok = await window.api.cloudSync.uploadAll(null)
      await refreshStatus()
      return ok
    } finally {
      isSyncing.value = false
    }
  }

  const openSpreadsheet = async (): Promise<void> => {
    await window.api.cloudSync.openSpreadsheet()
  }

  return {
    isSyncing,
    lastSyncTime,
    lastSpreadsheetUrl,
    refreshStatus,
    setUrl,
    normalizeUrl,
    testConnection,
    uploadAll,
    test: testConnection,
    syncAll: uploadAll,
    openSpreadsheet
  }
}
