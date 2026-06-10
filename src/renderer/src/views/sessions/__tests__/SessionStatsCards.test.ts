import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import SessionStatsCards from '../SessionStatsCards.vue'

const vuetify = createVuetify()

function mountWithVuetify(component: any, options?: any) {
  return mount(component, {
    global: { plugins: [vuetify] },
    ...options
  })
}

describe('SessionStatsCards', () => {
  it('renders all three stat cards', () => {
    const wrapper = mountWithVuetify(SessionStatsCards, {
      props: { todayCount: 3, tomorrowCount: 5, totalCount: 20, loading: false }
    })
    expect(wrapper.text()).toContain('جلسات اليوم')
    expect(wrapper.text()).toContain('جلسات الغد')
    expect(wrapper.text()).toContain('إجمالي المواعيد')
  })

  it('displays the correct count values', () => {
    const wrapper = mountWithVuetify(SessionStatsCards, {
      props: { todayCount: 3, tomorrowCount: 5, totalCount: 20, loading: false }
    })
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('5')
    expect(wrapper.text()).toContain('20')
  })

  it('shows skeleton loader when loading', () => {
    const wrapper = mountWithVuetify(SessionStatsCards, {
      props: { todayCount: 0, tomorrowCount: 0, totalCount: 0, loading: true }
    })
    expect(wrapper.html()).toContain('v-skeleton-loader')
  })

  it('hides counts when loading', () => {
    const wrapper = mountWithVuetify(SessionStatsCards, {
      props: { todayCount: 3, tomorrowCount: 5, totalCount: 20, loading: true }
    })
    expect(wrapper.text()).not.toContain('3')
    expect(wrapper.text()).not.toContain('5')
    expect(wrapper.text()).not.toContain('20')
  })
})
