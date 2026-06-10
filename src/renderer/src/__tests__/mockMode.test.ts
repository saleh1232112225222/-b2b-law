import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import MockBanner from '../components/MockBanner.vue'

describe('MockBanner.vue', () => {
  it('does not render when VITE_USE_MOCK_OTP is not true', () => {
    // Modify import.meta.env directly
    const originalVal = import.meta.env.VITE_USE_MOCK_OTP
    import.meta.env.VITE_USE_MOCK_OTP = 'false'

    const wrapper = mount(MockBanner, {
      global: {
        stubs: {
          LucideIcon: true
        }
      }
    })
    expect(wrapper.find('.mock-banner-container').exists()).toBe(false)

    // Restore
    import.meta.env.VITE_USE_MOCK_OTP = originalVal
  })

  it('renders correctly when VITE_USE_MOCK_OTP is true', () => {
    const originalVal = import.meta.env.VITE_USE_MOCK_OTP
    import.meta.env.VITE_USE_MOCK_OTP = 'true'

    const wrapper = mount(MockBanner, {
      global: {
        stubs: {
          LucideIcon: true
        }
      }
    })
    expect(wrapper.find('.mock-banner-container').exists()).toBe(true)
    expect(wrapper.text()).toContain('123456')

    import.meta.env.VITE_USE_MOCK_OTP = originalVal
  })
})
