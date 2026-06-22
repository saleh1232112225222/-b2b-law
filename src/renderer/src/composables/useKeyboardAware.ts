import { ref, onMounted, onUnmounted } from 'vue'

export function useKeyboardAware() {
  const keyboardHeight = ref(0)
  const isKeyboardOpen = ref(false)

  const onResize = () => {
    const visualViewport = window.visualViewport
    if (!visualViewport) return

    const windowHeight = window.innerHeight
    const heightDiff = windowHeight - visualViewport.height

    if (heightDiff > 100) {
      keyboardHeight.value = heightDiff
      isKeyboardOpen.value = true
    } else {
      keyboardHeight.value = 0
      isKeyboardOpen.value = false
    }
  }

  onMounted(() => {
    window.visualViewport?.addEventListener('resize', onResize)
  })

  onUnmounted(() => {
    window.visualViewport?.removeEventListener('resize', onResize)
  })

  const scrollToElement = (el: HTMLElement | null) => {
    if (!el || !isKeyboardOpen.value) return
    setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
  }

  return { keyboardHeight, isKeyboardOpen, scrollToElement }
}
