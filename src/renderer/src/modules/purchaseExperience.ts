export type SubscriptionInterval = 'month' | 'year' | 'lifetime' | 'trial'

export interface SubscriptionPlan {
  id: string
  name: string
  nameAr: string
  descriptionAr: string
  interval: SubscriptionInterval
  price: number
  currency: string
  featuresAr: string[]
}

export interface ActivationCounts {
  clients: number
  cases: number
  sessions: number
}

export interface ActivationStep {
  key: 'client' | 'case' | 'session'
  label: string
  route: string
  complete: boolean
}

export interface ActivationJourney {
  steps: ActivationStep[]
  completedCount: number
  totalCount: number
  progress: number
  isComplete: boolean
  nextRoute: string
  nextLabel: string
}

const validIntervals = new Set<SubscriptionInterval>(['month', 'year', 'lifetime', 'trial'])

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

const asText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const asTextArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.map(asText).filter(Boolean)
}

export const normalizeSubscriptionPlans = (input: unknown): SubscriptionPlan[] => {
  if (!Array.isArray(input)) return []

  return input.flatMap((raw) => {
    const row = asRecord(raw)
    if (!row) return []

    const id = asText(row.id)
    const name = asText(row.name)
    const nameAr = asText(row.name_ar ?? row.nameAr) || name
    const descriptionAr =
      asText(row.description_ar ?? row.descriptionAr ?? row.description) ||
      'وصول كامل للميزات المشمولة'
    const intervalRaw = asText(row.interval) as SubscriptionInterval
    const interval = validIntervals.has(intervalRaw) ? intervalRaw : 'month'
    const price = Number(row.price)
    const currency = asText(row.currency) || 'SAR'
    const featuresAr = asTextArray(row.features_ar ?? row.featuresAr ?? row.features)

    if (!id || !nameAr || !Number.isFinite(price) || price < 0) return []

    return [
      {
        id,
        name,
        nameAr,
        descriptionAr,
        interval,
        price,
        currency,
        featuresAr
      }
    ]
  })
}

export const buildActivationJourney = (counts: ActivationCounts): ActivationJourney => {
  const steps: ActivationStep[] = [
    {
      key: 'client',
      label: 'إضافة أول موكل',
      route: '/clients?new=1',
      complete: counts.clients > 0
    },
    {
      key: 'case',
      label: 'إنشاء أول قضية',
      route: '/cases?new=1',
      complete: counts.cases > 0
    },
    {
      key: 'session',
      label: 'جدولة أول جلسة',
      route: '/sessions?new=1',
      complete: counts.sessions > 0
    }
  ]

  const completedCount = steps.filter((step) => step.complete).length
  const nextStep = steps.find((step) => !step.complete)
  const isComplete = !nextStep

  return {
    steps,
    completedCount,
    totalCount: steps.length,
    progress: Math.round((completedCount / steps.length) * 100),
    isComplete,
    nextRoute: nextStep?.route || '/subscription',
    nextLabel:
      nextStep?.key === 'client'
        ? 'أضف أول موكل'
        : nextStep?.key === 'case'
          ? 'أنشئ أول قضية'
          : nextStep?.key === 'session'
            ? 'جدول أول جلسة'
            : 'استعرض خطط الاستمرار'
  }
}

export const buildSalesContactHref = ({
  planName,
  price,
  currency,
  status
}: {
  planName: string
  price: number
  currency: string
  status?: string
}): string => {
  const message = [
    'مرحبًا، أرغب في تفعيل اشتراك B2B-LAW.',
    `الخطة: ${planName}`,
    `السعر المعروض: ${price} ${currency}`,
    status ? `حالة الحساب: ${status}` : ''
  ]
    .filter(Boolean)
    .join('\n')

  return `https://wa.me/966567905696?text=${encodeURIComponent(message)}`
}
