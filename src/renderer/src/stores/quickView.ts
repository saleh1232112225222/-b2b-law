import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useQuickViewStore = defineStore('quickView', () => {
  const isOpen = ref(false)
  const type = ref<'client' | 'contract' | 'session' | 'document' | null>(null)
  const itemId = ref<string | number | null>(null)
  const title = ref('')

  const open = (
    newType: 'client' | 'contract' | 'session' | 'document',
    id: string | number,
    newTitle: string = ''
  ) => {
    type.value = newType
    itemId.value = id
    title.value = newTitle
    isOpen.value = true
  }

  const close = () => {
    isOpen.value = false
  }

  return {
    isOpen,
    type,
    itemId,
    title,
    open,
    close
  }
})
