type ScrollViewport = Pick<Window, 'scrollTo'>

export const resetMobileScroll = (
  root: ParentNode = document,
  viewport: ScrollViewport | null = typeof window === 'undefined' ? null : window
): void => {
  const scroller = root.querySelector('.mobile-app-shell') as HTMLElement | null
  if (scroller) {
    scroller.scrollTop = 0
    scroller.scrollLeft = 0
    scroller.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }
  viewport?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
}
