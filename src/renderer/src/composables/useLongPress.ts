import { ref } from 'vue'

export function useLongPress(onLongPress: (item: any) => void, delay = 500) {
  const longPressedItem = ref<any>(null)
  let timer: ReturnType<typeof setTimeout> | null = null

  const onTouchStart = (item: any) => {
    timer = setTimeout(() => {
      longPressedItem.value = item
      onLongPress(item)
    }, delay)
  }

  const onTouchEnd = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  const onTouchMove = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  const resetLongPress = () => {
    longPressedItem.value = null
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  return { longPressedItem, onTouchStart, onTouchEnd, onTouchMove, resetLongPress }
}
