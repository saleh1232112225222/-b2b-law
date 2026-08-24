import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ActivationJourneyCard from '../ActivationJourneyCard.vue'

describe('ActivationJourneyCard', () => {
  it('guides a new office to the first incomplete value step', async () => {
    const wrapper = mount(ActivationJourneyCard, {
      props: { clients: 1, cases: 0, sessions: 0, daysRemaining: 11 }
    })

    expect(wrapper.text()).toContain('حوّل بيانات مكتبك إلى مسار عمل كامل')
    expect(wrapper.text()).toContain('١ من ٣')
    expect(wrapper.text()).toContain('أنشئ أول قضية')

    await wrapper.get('[data-test="journey-next"]').trigger('click')
    expect(wrapper.emitted('navigate')?.[0]).toEqual(['/cases?new=1'])
  })

  it('offers plans only after the first-value journey is complete', async () => {
    const wrapper = mount(ActivationJourneyCard, {
      props: { clients: 2, cases: 1, sessions: 1, daysRemaining: 4 }
    })

    expect(wrapper.text()).toContain('أصبحت دورة العمل الأساسية جاهزة')
    expect(wrapper.text()).toContain('استعرض خطط الاستمرار')

    await wrapper.get('[data-test="journey-next"]').trigger('click')
    expect(wrapper.emitted('navigate')?.[0]).toEqual(['/subscription'])
  })
})
