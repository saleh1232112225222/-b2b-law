import { ref, onMounted, onUnmounted, type Ref } from 'vue'

export function useInfiniteScroll(
  containerRef: Ref<HTMLElement | null>,
  onLoadMore: () => Promise<void>,
  options: { rootMargin?: string; threshold?: number } = {}
) {
  const isLoading = ref(false)
  const hasMore = ref(true)
  let observer: IntersectionObserver | null = null

  const sentinelRef = ref<HTMLElement | null>(null)

  const setupObserver = () => {
    if (!sentinelRef.value || !containerRef.value) return

    observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && hasMore.value && !isLoading.value) {
          isLoading.value = true
          try {
            await onLoadMore()
          } finally {
            isLoading.value = false
          }
        }
      },
      {
        root: containerRef.value,
        rootMargin: options.rootMargin || '200px',
        threshold: options.threshold || 0
      }
    )

    observer.observe(sentinelRef.value)
  }

  onMounted(() => {
    setupObserver()
  })

  onUnmounted(() => {
    observer?.disconnect()
  })

  const reset = () => {
    hasMore.value = true
    isLoading.value = false
    observer?.disconnect()
    setupObserver()
  }

  return { isLoading, hasMore, sentinelRef, reset }
}
