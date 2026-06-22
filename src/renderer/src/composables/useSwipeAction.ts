import { ref, type Ref } from 'vue'

interface SwipeOptions {
  threshold?: number
  onSwipeLeft?: (item: any) => void
  onSwipeRight?: (item: any) => void
}

export function useSwipeAction(options: SwipeOptions = {}) {
  const threshold = options.threshold || 80
  const swipedItemId = ref<string | null>(null)

  let startX = 0
  let startY = 0
  let currentTranslate = 0
  let isDragging = false

  const onTouchStart = (e: TouchEvent, item: any) => {
    startX = e.touches[0].clientX
    startY = e.touches[0].clientY
    isDragging = false
    currentTranslate = 0
  }

  const onTouchMove = (e: TouchEvent, item: any) => {
    if (!isDragging) {
      const dx = Math.abs(e.touches[0].clientX - startX)
      const dy = Math.abs(e.touches[0].clientY - startY)
      if (dx > dy && dx > 10) {
        isDragging = true
      } else {
        return
      }
    }

    currentTranslate = e.touches[0].clientX - startX
  }

  const onTouchEnd = (_e: TouchEvent, item: any) => {
    if (!isDragging) return

    if (currentTranslate < -threshold) {
      swipedItemId.value = item.id
      options.onSwipeLeft?.(item)
    } else if (currentTranslate > threshold) {
      swipedItemId.value = item.id
      options.onSwipeRight?.(item)
    }

    currentTranslate = 0
    isDragging = false
  }

  const resetSwipe = () => {
    swipedItemId.value = null
  }

  return { swipedItemId, onTouchStart, onTouchMove, onTouchEnd, resetSwipe }
}
