import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import { createMemoryHistory, createRouter } from 'vue-router'
import SubscriptionPlans from '../SubscriptionPlans.vue'

const vuetify = createVuetify()
const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/subscription', component: SubscriptionPlans }]
})

describe('subscription plans page', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {
          return undefined
        }
        unobserve() {
          return undefined
        }
        disconnect() {
          return undefined
        }
      }
    )
    ;(window as any).api = {
      subscriptions: {
        getPlans: vi.fn().mockResolvedValue([
          {
            id: 'yearly',
            name: 'Yearly',
            name_ar: 'سنوي',
            description_ar: 'اشتراك سنوي كامل',
            interval: 'year',
            price: '999.00',
            currency: 'SAR',
            features_ar: ['قضايا غير محدودة', 'جميع التقارير']
          }
        ]),
        getStatus: vi.fn().mockResolvedValue({ status: 'trial', daysLeft: 12 })
      }
    }
  })

  it('shows transparent plans and uses a sales activation link without collecting card data', async () => {
    const wrapper = mount(SubscriptionPlans, {
      global: { plugins: [createPinia(), router, vuetify] }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('خطط واضحة تناسب مرحلة مكتبك')
    expect(wrapper.text()).toContain('سنوي')
    expect(wrapper.text()).toContain('٩٩٩')
    expect(wrapper.text()).toContain('طلب تفعيل هذه الخطة')
    expect(wrapper.find('a[href*="wa.me"]').exists()).toBe(true)
    expect(wrapper.find('input[autocomplete="cc-number"]').exists()).toBe(false)
  })
})
