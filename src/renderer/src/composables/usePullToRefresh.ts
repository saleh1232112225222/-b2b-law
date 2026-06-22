import { ref, onMounted, onUnmounted, type Ref } from 'vue'

export function usePullToRefresh(
  elementRef: Ref<HTMLElement | null>,
  onRefresh: () => Promise<void>
) {
  const isRefreshing = ref(false)
  const pullDistance = ref(0)

  let startY = 0
  let currentY = 0
  const threshold = 80

  const onTouchStart = (e: TouchEvent) => {
    if (elementRef.value && elementRef.value.scrollTop === 0) {
      startY = e.touches[0].clientY
    }
  }

  const onTouchMove = (e: TouchEvent) => {
    if (startY === 0) return
    currentY = e.touches[0].clientY
    const diff = currentY - startY

    if (diff > 0 && elementRef.value?.scrollTop === 0) {
      pullDistance.value = Math.min(diff * 0.5, 120)
    }
  }

  const onTouchEnd = async () => {
    if (pullDistance.value >= threshold && !isRefreshing.value) {
      isRefreshing.value = true
      try {
        await onRefresh()
      } finally {
        isRefreshing.value = false
      }
    }
    pullDistance.value = 0
    startY = 0
  }

  onMounted(() => {
    const el = elementRef.value
    if (!el) return
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
  })

  onUnmounted(() => {
    const el = elementRef.value
    if (!el) return
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchmove', onTouchMove)
    el.removeEventListener('touchend', onTouchEnd)
  })

  return { isRefreshing, pullDistance }
}
