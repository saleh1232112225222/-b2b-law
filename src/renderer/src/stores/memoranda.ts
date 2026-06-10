import { defineStore } from 'pinia'
import { Memorandum } from '../types/memorandum'

export const useMemorandaStore = defineStore('memoranda', {
  state: () => ({
    memoranda: [] as Memorandum[],
    loading: false,
    error: null as string | null
  }),

  actions: {
    async fetchAll() {
      this.loading = true
      try {
        this.memoranda = await window.api.memoranda.getAll()
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    async fetchByCaseId(caseId: string) {
      this.loading = true
      try {
        return await window.api.memoranda.getByCaseId(caseId)
      } catch (err: any) {
        this.error = err.message
        return []
      } finally {
        this.loading = false
      }
    },

    async create(memo: Partial<Memorandum>) {
      try {
        const cleanMemo = JSON.parse(JSON.stringify(memo))
        const id = await window.api.memoranda.create(cleanMemo)
        await this.fetchAll()
        return id
      } catch (err: any) {
        this.error = err.message
        throw err
      }
    },

    async update(id: string, memo: Partial<Memorandum>) {
      try {
        const cleanMemo = JSON.parse(JSON.stringify(memo))
        const ok = await window.api.memoranda.update(id, cleanMemo)
        if (ok) await this.fetchAll()
        return ok
      } catch (err: any) {
        this.error = err.message
        throw err
      }
    },

    async delete(id: string) {
      if (!confirm('هل أنت متأكد من حذف هذه المذكرة؟')) return false
      try {
        const ok = await window.api.memoranda.delete(id)
        if (ok) await this.fetchAll()
        return ok
      } catch (err: any) {
        this.error = err.message
        throw err
      }
    },

    async toggleArchive(id: string, isArchived: boolean) {
      try {
        const ok = await window.api.memoranda.toggleArchive(id, isArchived)
        if (ok) await this.fetchAll()
        return ok
      } catch (err: any) {
        this.error = err.message
        throw err
      }
    }
  }
})
