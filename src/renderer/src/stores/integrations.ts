import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface IntegrationService {
  id: string
  name: string
  category: string
  description: string
  icon: string
  provider: string
  status: 'connected' | 'disconnected' | 'error'
  last_sync_at: string | null
  config: Record<string, any>
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('b2b_cloud_token')
  const baseUrl = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : ''
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.error || `HTTP error ${res.status}`)
  }

  return res.json()
}

export const useIntegrationsStore = defineStore('integrations', () => {
  const integrations = ref<IntegrationService[]>([])
  const loading = ref(false)
  const syncing = ref(false)
  const error = ref<string | null>(null)

  async function fetchStatus() {
    loading.value = true
    error.value = null
    try {
      const data = await apiFetch<{ integrations: IntegrationService[] }>('/api/integrations/status')
      integrations.value = data.integrations || []
    } catch (err: any) {
      console.error('[IntegrationsStore] Error fetching status:', err)
      error.value = err.message || 'فشل تحميل حالة الخدمات الخارجية'
    } finally {
      loading.value = false
    }
  }

  async function connectService(serviceId: string, config?: Record<string, any>) {
    loading.value = true
    try {
      await apiFetch(`/api/integrations/connect/${serviceId}`, {
        method: 'POST',
        body: JSON.stringify({ config: config || { autoSync: true } })
      })
      await fetchStatus()
      return true
    } catch (err: any) {
      console.error(`[IntegrationsStore] Error connecting ${serviceId}:`, err)
      error.value = err.message || 'فشل ربط الخدمة'
      return false
    } finally {
      loading.value = false
    }
  }

  async function disconnectService(serviceId: string) {
    loading.value = true
    try {
      await apiFetch(`/api/integrations/disconnect/${serviceId}`, {
        method: 'POST'
      })
      await fetchStatus()
      return true
    } catch (err: any) {
      console.error(`[IntegrationsStore] Error disconnecting ${serviceId}:`, err)
      error.value = err.message || 'فشل إلغاء ربط الخدمة'
      return false
    } finally {
      loading.value = false
    }
  }

  async function pingService(serviceId: string) {
    try {
      const res = await apiFetch<{ success: boolean; verified: boolean; message: string }>(
        `/api/integrations/ping/${serviceId}`,
        { method: 'POST' }
      )
      return res
    } catch (err: any) {
      return { success: false, verified: false, message: err.message || 'فشل اختبار الاتصال' }
    }
  }

  async function triggerSync() {
    syncing.value = true
    try {
      const res = await apiFetch<{ success: boolean; message: string }>('/api/integrations/sync', {
        method: 'POST'
      })
      await fetchStatus()
      return res
    } catch (err: any) {
      console.error('[IntegrationsStore] Error triggering sync:', err)
      error.value = err.message || 'فشل إجراء المزامنة'
      return null
    } finally {
      syncing.value = false
    }
  }

  return {
    integrations,
    loading,
    syncing,
    error,
    fetchStatus,
    connectService,
    disconnectService,
    pingService,
    triggerSync
  }
})
