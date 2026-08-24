import { describe, expect, it } from 'vitest'
import {
  buildActivationJourney,
  buildSalesContactHref,
  normalizeSubscriptionPlans
} from './purchaseExperience'

describe('purchase experience', () => {
  it('normalizes subscription plans returned by the existing server contract', () => {
    const plans = normalizeSubscriptionPlans([
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
    ])

    expect(plans).toEqual([
      {
        id: 'yearly',
        name: 'Yearly',
        nameAr: 'سنوي',
        descriptionAr: 'اشتراك سنوي كامل',
        interval: 'year',
        price: 999,
        currency: 'SAR',
        featuresAr: ['قضايا غير محدودة', 'جميع التقارير']
      }
    ])
  })

  it('guides a new office through client, case, and session in order', () => {
    expect(buildActivationJourney({ clients: 0, cases: 0, sessions: 0 })).toMatchObject({
      completedCount: 0,
      totalCount: 3,
      nextRoute: '/clients?new=1',
      nextLabel: 'أضف أول موكل'
    })

    expect(buildActivationJourney({ clients: 1, cases: 0, sessions: 0 })).toMatchObject({
      completedCount: 1,
      nextRoute: '/cases?new=1',
      nextLabel: 'أنشئ أول قضية'
    })

    expect(buildActivationJourney({ clients: 1, cases: 1, sessions: 1 })).toMatchObject({
      completedCount: 3,
      isComplete: true,
      nextRoute: '/subscription',
      nextLabel: 'استعرض خطط الاستمرار'
    })
  })

  it('builds a sales link containing the chosen plan and the displayed price', () => {
    const href = buildSalesContactHref({
      planName: 'سنوي',
      price: 999,
      currency: 'SAR',
      status: 'trial'
    })

    expect(href).toContain('https://wa.me/966567905696?text=')
    expect(decodeURIComponent(href)).toContain('الخطة: سنوي')
    expect(decodeURIComponent(href)).toContain('السعر المعروض: 999 SAR')
  })
})
