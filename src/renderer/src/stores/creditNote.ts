import { defineStore } from 'pinia'
import { CreditNote } from '../types'

export const useCreditNoteStore = defineStore('creditNote', {
  state: () => ({
    creditNotes: [] as CreditNote[],
    loading: false
  }),
  actions: {
    async fetchAll() {
      this.loading = true
      try {
        this.creditNotes = await window.api.creditNotes.getAll()
      } catch (error) {
        console.error('Failed to fetch credit notes:', error)
      } finally {
        this.loading = false
      }
    },
    async create(data: Partial<CreditNote>) {
      try {
        const id = await window.api.creditNotes.create(data)
        await this.fetchAll()
        return id
      } catch (error) {
        console.error('Failed to create credit note:', error)
        throw error
      }
    },
    async approve(id: string) {
      try {
        await window.api.creditNotes.approve(id)
        await this.fetchAll()
      } catch (error) {
        console.error('Failed to approve credit note:', error)
        throw error
      }
    },
    async delete(id: string) {
      try {
        await window.api.creditNotes.delete(id)
        await this.fetchAll()
      } catch (error) {
        console.error('Failed to delete credit note:', error)
        throw error
      }
    }
  }
})
