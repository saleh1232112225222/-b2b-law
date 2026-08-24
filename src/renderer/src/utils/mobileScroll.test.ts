import { describe, expect, it, vi } from 'vitest'
import { resetMobileScroll } from './mobileScroll'

describe('resetMobileScroll', () => {
  it('returns the mobile application scroller to the visible start', () => {
    const scrollTo = vi.fn()
    const scroller = { scrollTo, scrollTop: 420, scrollLeft: 90 }
    const viewportScrollTo = vi.fn()
    const root = {
      querySelector: vi.fn().mockReturnValue(scroller)
    } as unknown as ParentNode

    resetMobileScroll(root, { scrollTo: viewportScrollTo })

    expect(root.querySelector).toHaveBeenCalledWith('.mobile-app-shell')
    expect(scroller.scrollTop).toBe(0)
    expect(scroller.scrollLeft).toBe(0)
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' })
    expect(viewportScrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' })
  })
})
