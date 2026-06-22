import { computed } from 'vue'
import { useMediaQuery } from '@vueuse/core'

export function useMobileLayout() {
  const isPhone = useMediaQuery('(max-width: 480px)')
  const isSmallTablet = useMediaQuery('(min-width: 481px) and (max-width: 768px)')
  const isMobile = computed(() => isPhone.value || isSmallTablet.value)

  return { isPhone, isSmallTablet, isMobile }
}
