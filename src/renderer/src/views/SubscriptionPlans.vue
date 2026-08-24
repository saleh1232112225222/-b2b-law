<template>
  <main class="subscription-page" dir="rtl">
    <section class="hero" aria-labelledby="subscription-title">
      <div class="hero-copy panel">
        <span class="eyebrow">اشتراك واضح وآمن</span>
        <h1 id="subscription-title">خطط واضحة تناسب مرحلة مكتبك</h1>
        <p>
          اختر الخطة المناسبة ثم أرسل طلب التفعيل للدعم. لا يطلب البرنامج بيانات بطاقتك البنكية داخل
          هذه الصفحة.
        </p>
        <div class="actions">
          <v-btn color="primary" size="large" @click="openPlans"
            >استعرض الخطط <LucideIcon name="arrow-down" :size="18"
          /></v-btn>
          <v-btn
            variant="outlined"
            size="large"
            href="https://wa.me/966567905696"
            target="_blank"
            rel="noopener noreferrer"
            >تحدث مع الدعم <LucideIcon name="message-circle" :size="18"
          /></v-btn>
        </div>
      </div>
      <aside class="status panel" aria-label="حالة الاشتراك الحالية">
        <span class="muted">حالة حسابك الآن</span>
        <div class="status-title">
          <LucideIcon name="shield-check" :size="28" /><strong>{{ statusLabel }}</strong>
        </div>
        <p>{{ statusDescription }}</p>
        <div v-if="daysRemaining !== null" class="days">
          <span>الأيام المتبقية</span><strong>{{ daysRemaining }}</strong>
        </div>
      </aside>
    </section>

    <section ref="plansSection" class="plans panel" aria-labelledby="plans-title">
      <header class="section-heading">
        <div>
          <span class="eyebrow">الخطط والأسعار</span>
          <h2 id="plans-title">اختر ما يناسب طريقة عملك</h2>
        </div>
        <p>الأسعار المعروضة بعملة الريال السعودي، ويؤكد الدعم الإجمالي النهائي قبل التفعيل.</p>
      </header>

      <div v-if="loading" class="state">
        <v-progress-circular indeterminate color="primary" /><span>جارٍ تحميل الخطط…</span>
      </div>
      <v-alert v-else-if="loadError" type="warning" variant="tonal"
        >{{ loadError }}
        <button class="retry" type="button" @click="fetchData">إعادة المحاولة</button></v-alert
      >
      <div v-else class="plans-grid">
        <article
          v-for="plan in plans"
          :key="plan.id"
          class="plan-card"
          :class="{ featured: plan.interval === 'year' }"
        >
          <span v-if="plan.interval === 'year'" class="featured-label">الأكثر توازناً</span>
          <div class="plan-head">
            <div>
              <span class="muted">{{ intervalLabel(plan.interval) }}</span>
              <h3>{{ plan.nameAr }}</h3>
            </div>
            <span v-if="isCurrentPlan(plan)" class="current">خطتك الحالية</span>
          </div>
          <p class="description">{{ plan.descriptionAr }}</p>
          <div class="price">
            <strong>{{ formatPrice(plan.price) }}</strong
            ><span>{{ currencyLabel(plan.currency) }}</span>
          </div>
          <ul>
            <li v-for="feature in visibleFeatures(plan)" :key="feature">
              <LucideIcon name="check" :size="17" /><span>{{ feature }}</span>
            </li>
            <li v-if="plan.featuresAr.length === 0">
              <LucideIcon name="check" :size="17" /><span
                >الوصول إلى الميزات المشمولة في الخطة</span
              >
            </li>
          </ul>
          <v-btn
            :href="activationHref(plan)"
            target="_blank"
            rel="noopener noreferrer"
            color="primary"
            size="large"
            block
            >طلب تفعيل هذه الخطة <LucideIcon name="message-circle" :size="18"
          /></v-btn>
          <small>لن يتم خصم أي مبلغ من داخل البرنامج.</small>
        </article>
        <div v-if="plans.length === 0" class="state">
          <LucideIcon name="circle-help" :size="36" />
          <h3>لم تتوفر الخطط الآن</h3>
          <p>يمكن للدعم مساعدتك في اختيار الخطة وتأكيد السعر.</p>
          <v-btn href="tel:0567905696" variant="outlined">اتصل بالدعم 0567905696</v-btn>
        </div>
      </div>
    </section>

    <section class="trust panel" aria-labelledby="trust-title">
      <header class="section-heading">
        <div>
          <span class="eyebrow">قبل أن تقرر</span>
          <h2 id="trust-title">بيانات مكتبك تبقى تحت سيطرتك</h2>
        </div>
      </header>
      <div class="trust-grid">
        <article>
          <LucideIcon name="database-backup" :size="24" />
          <h3>لا حجز للبيانات</h3>
          <p>بعد انتهاء التجربة يبقى الوصول للقراءة والتصدير متاحاً وفق سياسة الترخيص.</p>
        </article>
        <article>
          <LucideIcon name="users" :size="24" />
          <h3>صلاحيات للفريق</h3>
          <p>نظّم وصول أعضاء المكتب بحسب أدوارهم دون مشاركة الحسابات.</p>
        </article>
        <article>
          <LucideIcon name="history" :size="24" />
          <h3>سجل للأنشطة</h3>
          <p>راجع العمليات المهمة داخل النظام لتعزيز المساءلة والمتابعة.</p>
        </article>
        <article>
          <LucideIcon name="credit-card" :size="24" />
          <h3>لا نجمع بيانات البطاقة هنا</h3>
          <p>التفعيل الحالي يتم بعد تأكيد الخطة والسعر مباشرة مع الدعم.</p>
        </article>
      </div>
    </section>

    <section class="support panel" aria-label="التواصل قبل الاشتراك">
      <div>
        <strong>تحتاج مساعدة في المقارنة؟</strong><span>سنوضح لك الخطة الأنسب دون التزام.</span>
      </div>
      <div class="actions">
        <v-btn href="tel:0567905696" variant="text"
          ><LucideIcon name="phone" :size="18" /> 0567905696</v-btn
        ><v-btn
          href="https://wa.me/966567905696"
          target="_blank"
          rel="noopener noreferrer"
          variant="outlined"
          >واتساب <LucideIcon name="message-circle" :size="18"
        /></v-btn>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import LucideIcon from '../components/common/LucideIcon.vue'
import {
  buildSalesContactHref,
  normalizeSubscriptionPlans,
  type SubscriptionInterval,
  type SubscriptionPlan
} from '../modules/purchaseExperience'

type SubscriptionStatus = Record<string, unknown> | null
const plans = ref<SubscriptionPlan[]>([])
const currentSub = ref<SubscriptionStatus>(null)
const loading = ref(true)
const loadError = ref('')
const plansSection = ref<HTMLElement | null>(null)
const rawStatus = computed(() =>
  typeof currentSub.value?.status === 'string' ? currentSub.value.status.toLowerCase() : ''
)
const statusLabel = computed(() =>
  ['active', 'activated', 'lifetime'].includes(rawStatus.value)
    ? 'اشتراك فعّال'
    : rawStatus.value === 'trial'
      ? 'فترة تجريبية'
      : ['expired', 'cancelled', 'canceled'].includes(rawStatus.value)
        ? 'وصول للقراءة'
        : 'جارٍ التحقق من الحالة'
)
const statusDescription = computed(() =>
  ['active', 'activated', 'lifetime'].includes(rawStatus.value)
    ? 'يمكنك استخدام مزايا خطتك الحالية بصورة طبيعية.'
    : rawStatus.value === 'trial'
      ? 'استكشف مسار العمل كاملاً، ثم اختر الخطة المناسبة عند استعدادك.'
      : ['expired', 'cancelled', 'canceled'].includes(rawStatus.value)
        ? 'بياناتك محفوظة، ويمكنك قراءتها وتصديرها أو طلب إعادة التفعيل.'
        : 'نعرض لك الخطط المتاحة بينما نتحقق من حالة ترخيصك.'
)
const daysRemaining = computed<number | null>(() => {
  const value = currentSub.value?.daysLeft ?? currentSub.value?.daysRemaining
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
})
const currentPlanId = computed(() => {
  const direct = currentSub.value?.planId ?? currentSub.value?.plan_id
  if (typeof direct === 'string') return direct
  const nested = currentSub.value?.plan
  if (nested && typeof nested === 'object' && 'id' in nested) {
    const id = (nested as Record<string, unknown>).id
    return typeof id === 'string' ? id : ''
  }
  return ''
})

const fetchData = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const api = (window as any).api?.subscriptions
    if (!api) throw new Error('subscriptions-api-unavailable')
    const [plansResult, statusResult] = await Promise.allSettled([api.getPlans(), api.getStatus()])
    if (plansResult.status === 'fulfilled') {
      const payload = Array.isArray(plansResult.value) ? plansResult.value : plansResult.value?.data
      plans.value = normalizeSubscriptionPlans(payload)
    } else loadError.value = 'تعذر تحميل الخطط حالياً. يمكنك إعادة المحاولة أو التواصل مع الدعم.'
    if (statusResult.status === 'fulfilled') currentSub.value = statusResult.value
  } catch (error) {
    console.error('Failed to fetch subscription data:', error)
    loadError.value = 'تعذر الاتصال بخدمة الاشتراك حالياً. لم يتم إجراء أي تغيير على حسابك.'
  } finally {
    loading.value = false
  }
}
const openPlans = () => {
  const target = plansSection.value
  if (!target) return

  const mobileScroller = target.closest('.mobile-app-shell') as HTMLElement | null
  if (mobileScroller) {
    mobileScroller.scrollTo({ top: Math.max(0, target.offsetTop - 12), behavior: 'smooth' })
    return
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
}
const formatPrice = (price: number) =>
  new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(price)
const currencyLabel = (currency: string) => (currency.toUpperCase() === 'SAR' ? 'ر.س' : currency)
const intervalLabel = (interval: SubscriptionInterval) =>
  ({ month: 'شهري', year: 'سنوي', lifetime: 'مدى الحياة', trial: 'تجريبي' })[interval]
const visibleFeatures = (plan: SubscriptionPlan) => plan.featuresAr.slice(0, 6)
const isCurrentPlan = (plan: SubscriptionPlan) => {
  if (currentPlanId.value) return currentPlanId.value === plan.id
  const name = currentSub.value?.planName ?? currentSub.value?.plan_name
  return typeof name === 'string' && [plan.name, plan.nameAr].includes(name)
}
const activationHref = (plan: SubscriptionPlan) =>
  buildSalesContactHref({
    planName: plan.nameAr,
    price: plan.price,
    currency: plan.currency,
    status: statusLabel.value
  })
onMounted(fetchData)
</script>

<style scoped>
.subscription-page {
  --page: #f7f5ef;
  --surface: #fff;
  --raised: #fffaf0;
  --text: #172033;
  --muted: #657087;
  --border: #d9dde6;
  --gold: #b78918;
  --goldText: #8c6508;
  min-height: 100%;
  padding: clamp(18px, 3vw, 42px);
  background: var(--page);
  color: var(--text);
}
.hero,
.plans,
.trust,
.support {
  width: min(1180px, 100%);
  margin-inline: auto;
}
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.7fr);
  gap: 22px;
}
.panel {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 22px;
}
.hero-copy {
  padding: clamp(24px, 4vw, 48px);
  background:
    radial-gradient(circle at 10% 10%, rgba(229, 181, 43, 0.16), transparent 34%), var(--surface);
}
.eyebrow {
  display: inline-block;
  color: var(--goldText);
  font-weight: 800;
  margin-bottom: 8px;
}
h1,
h2,
h3,
p {
  margin-top: 0;
}
h1 {
  max-width: 700px;
  margin-bottom: 14px;
  font-size: clamp(2rem, 5vw, 3.5rem);
  line-height: 1.22;
}
.hero-copy > p {
  max-width: 700px;
  margin-bottom: 24px;
  color: var(--muted);
  font-size: 1.05rem;
  line-height: 1.9;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.actions :deep(.v-btn) {
  font-weight: 800;
  letter-spacing: 0;
}
.status {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 28px;
  background: var(--raised);
}
.muted,
.status p,
.section-heading p,
.description,
.trust-grid p,
.support span {
  color: var(--muted);
}
.muted {
  font-size: 0.84rem;
  font-weight: 700;
}
.status-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0;
  color: var(--goldText);
  font-size: 1.35rem;
}
.status p,
.description,
.trust-grid p {
  line-height: 1.75;
}
.days {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
.plans,
.trust {
  margin-top: 24px;
  padding: clamp(20px, 3vw, 34px);
}
.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 24px;
  margin-bottom: 24px;
}
.section-heading h2 {
  margin-bottom: 0;
  font-size: clamp(1.35rem, 3vw, 2rem);
}
.section-heading p {
  max-width: 440px;
  margin-bottom: 0;
}
.state {
  display: flex;
  min-height: 240px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 14px;
  text-align: center;
}
.retry {
  margin-inline-start: 10px;
  color: inherit;
  font-weight: 800;
  text-decoration: underline;
}
.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 18px;
}
.plan-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--raised);
}
.plan-card.featured {
  border: 2px solid var(--gold);
  box-shadow: 0 14px 34px rgba(116, 83, 8, 0.12);
}
.featured-label {
  position: absolute;
  inset-inline-start: 18px;
  top: -12px;
  padding: 5px 11px;
  border-radius: 999px;
  background: var(--gold);
  color: #101722;
  font-size: 0.75rem;
  font-weight: 900;
}
.plan-head {
  display: flex;
  min-height: 64px;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}
.plan-head h3 {
  margin: 4px 0 0;
  font-size: 1.3rem;
}
.current {
  padding: 5px 9px;
  border: 1px solid var(--gold);
  border-radius: 999px;
  color: var(--goldText);
  font-size: 0.72rem;
  font-weight: 800;
  white-space: nowrap;
}
.description {
  min-height: 52px;
  margin-bottom: 12px;
}
.price {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 6px 0 18px;
}
.price strong {
  color: var(--goldText);
  font-size: 2.25rem;
  line-height: 1;
}
.price span {
  color: var(--muted);
  font-weight: 800;
}
.plan-card ul {
  display: grid;
  gap: 11px;
  flex: 1;
  margin: 0 0 22px;
  padding: 0;
  list-style: none;
}
.plan-card li {
  display: flex;
  align-items: start;
  gap: 9px;
  line-height: 1.55;
}
.plan-card li :deep(svg) {
  flex: 0 0 auto;
  margin-top: 3px;
  color: var(--goldText);
}
.plan-card small {
  display: block;
  margin-top: 10px;
  color: var(--muted);
  text-align: center;
}
.trust-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.trust-grid article {
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--raised);
}
.trust-grid :deep(svg) {
  color: var(--goldText);
}
.trust-grid h3 {
  margin: 12px 0 5px;
  font-size: 1rem;
}
.trust-grid p {
  margin-bottom: 0;
  font-size: 0.9rem;
}
.support {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-top: 24px;
  padding: 20px 24px;
}
.support strong,
.support span {
  display: block;
}
:global([data-theme='dark'] .subscription-page),
:global(.v-theme--dark .subscription-page) {
  --page: #071321;
  --surface: #0d1929;
  --raised: #111f31;
  --text: #f3f6fa;
  --muted: #aeb9c8;
  --border: #314257;
  --gold: #e5b52b;
  --goldText: #f1c94d;
}
@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
  }
  .trust-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 600px) {
  .subscription-page {
    padding: 12px 12px 90px;
  }
  .panel {
    border-radius: 16px;
  }
  .hero-copy,
  .status,
  .plans,
  .trust {
    padding: 20px;
  }
  h1 {
    font-size: 1.85rem;
  }
  .hero .actions,
  .hero .actions :deep(.v-btn) {
    width: 100%;
  }
  .section-heading,
  .support {
    align-items: stretch;
    flex-direction: column;
  }
  .plans-grid,
  .trust-grid {
    grid-template-columns: 1fr;
  }
  .description {
    min-height: auto;
  }
  .support .actions,
  .support .actions :deep(.v-btn) {
    width: 100%;
  }
}
@media (prefers-reduced-motion: reduce) {
  * {
    scroll-behavior: auto !important;
  }
}
</style>
