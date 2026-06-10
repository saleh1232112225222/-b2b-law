import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Evidence {
  id?: string
  case_id?: string
  title: string
  description?: string
  evidence_date?: string
  status?: 'active' | 'archived'
  created_at?: string
  updated_at?: string
  case_number?: string
  // New Memoranda fields
  memo_type?: string
  memo_label?: string
  najiz_number?: string
  najiz_date?: string
  memo_status?: string
  opponent_name?: string
  memo_text?: string
  client_name?: string
}

export const useEvidenceStore = defineStore('evidence', () => {
  const evidenceList = ref<Evidence[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')

  const fetchAll = async () => {
    loading.value = true
    error.value = null
    try {
      evidenceList.value = await window.api.evidence.getAll()
    } catch (e: unknown) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  const fetchByCaseId = async (caseId: string) => {
    loading.value = true
    try {
      return await window.api.evidence.getByCaseId(caseId)
    } catch (e: unknown) {
      error.value = (e as Error).message
      return []
    } finally {
      loading.value = false
    }
  }

  const addEvidence = async (evidence: Evidence) => {
    try {
      await window.api.evidence.create(JSON.parse(JSON.stringify(evidence)))
      await fetchAll()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const updateEvidence = async (id: string, evidence: Partial<Evidence>) => {
    try {
      await window.api.evidence.update(id, JSON.parse(JSON.stringify(evidence)))
      await fetchAll()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const deleteEvidence = async (id: string) => {
    try {
      await window.api.evidence.delete(id)
      await fetchAll()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const filteredEvidence = () => {
    if (!searchQuery.value) return evidenceList.value
    const q = searchQuery.value.toLowerCase()
    return evidenceList.value.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.case_number && e.case_number.toLowerCase().includes(q))
    )
  }

  return {
    evidenceList,
    loading,
    error,
    searchQuery,
    fetchAll,
    fetchByCaseId,
    addEvidence,
    updateEvidence,
    deleteEvidence,
    filteredEvidence
  }
})
