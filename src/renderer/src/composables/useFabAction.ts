import { ref, readonly, computed, onDeactivated } from 'vue'
import { useRoute } from 'vue-router'

interface FabAction {
  icon: string
  handler: () => void
  routeKey: string
}

const fabAction = ref<FabAction | null>(null)

export function setFabAction(icon: string, handler: () => void, routeKey: string) {
  fabAction.value = { icon, handler, routeKey }
}

export function clearFabAction() {
  fabAction.value = null
}

export function useFabAction() {
  const route = useRoute()

  const safeAction = computed(() => {
    if (!fabAction.value || fabAction.value.routeKey !== route.path) return null
    return { icon: fabAction.value.icon, handler: fabAction.value.handler }
  })

  return { fabAction: safeAction, setFabAction, clearFabAction }
}

export function useFabActionForView(icon: string, handler: () => void) {
  const route = useRoute()
  onDeactivated(() => clearFabAction())
  return {
    register: () => setFabAction(icon, handler, route.path),
    unregister: () => clearFabAction()
  }
}
