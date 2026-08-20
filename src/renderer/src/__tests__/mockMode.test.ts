import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MockBanner from '../components/MockBanner.vue'

describe('MockBanner.vue', () => {
  it('renders security banner with SSL encryption info', () => {
    const wrapper = mount(MockBanner, {
      global: {
        stubs: {
          LucideIcon: true
        }
      }
    })
    expect(wrapper.find('.mock-banner-container').exists()).toBe(true)
    expect(wrapper.text()).toContain('بوابة الدخول الآمنة')
    expect(wrapper.text()).toContain('256-Bit SSL')
  })
})

