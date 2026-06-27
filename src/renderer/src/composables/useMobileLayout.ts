import { ref, computed, onMounted, onUnmounted } from 'vue'

export function useMobileLayout() {
  const width = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)

  const updateWidth = () => {
    width.value = window.innerWidth
  }

  onMounted(() => {
    window.addEventListener('resize', updateWidth)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateWidth)
  })

  const isPhone = computed(() => width.value <= 480)
  const isSmallTablet = computed(() => width.value > 480 && width.value <= 768)
  const isMobile = computed(() => isPhone.value || isSmallTablet.value)

  return { isPhone, isSmallTablet, isMobile, width }
}
