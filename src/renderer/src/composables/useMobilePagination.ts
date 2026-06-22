import { ref, type Ref } from 'vue'

interface PaginationOptions<T> {
  fetchFn: (params: { page: number; pageSize: number }) => Promise<T[]>
  pageSize?: number
}

export function useMobilePagination<T>({ fetchFn, pageSize = 20 }: PaginationOptions<T>) {
  const items = ref<T[]>([]) as Ref<T[]>
  const loading = ref(false)
  const page = ref(1)
  const hasMore = ref(true)

  const loadMore = async () => {
    if (loading.value || !hasMore.value) return
    loading.value = true
    try {
      const newItems = await fetchFn({ page: page.value, pageSize })
      if (newItems.length < pageSize) {
        hasMore.value = false
      }
      items.value = [...items.value, ...newItems] as T[]
      page.value++
    } finally {
      loading.value = false
    }
  }

  const refresh = async () => {
    page.value = 1
    hasMore.value = true
    items.value = [] as T[]
    await loadMore()
  }

  const reset = () => {
    page.value = 1
    hasMore.value = true
    items.value = [] as T[]
    loading.value = false
  }

  return { items, loading, hasMore, loadMore, refresh, reset }
}
