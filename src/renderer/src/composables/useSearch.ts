import { watch, onUnmounted, ref, Ref } from 'vue'

export function useSearch(
  onExecute: (val: string) => void,
  initialValue: string = '',
  options = { debounce: 300 }
): { search: Ref<string>; cleanup: () => void } {
  const search = ref(initialValue)
  let timer: ReturnType<typeof setTimeout> | null = null

  const stopWatcher = watch(search, (val) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      onExecute(val || '')
    }, options.debounce)
  })

  const cleanup = (): void => {
    if (timer) clearTimeout(timer)
    stopWatcher()
  }

  onUnmounted(cleanup)

  return {
    search,
    cleanup
  }
}
