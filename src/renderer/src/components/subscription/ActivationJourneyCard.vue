<template>
  <section class="journey-card" dir="rtl" aria-labelledby="journey-title">
    <div class="journey-copy">
      <span class="journey-eyebrow">ابدأ بالقيمة قبل الاشتراك</span>
      <h2 id="journey-title">
        {{
          journey.isComplete
            ? 'أصبحت دورة العمل الأساسية جاهزة'
            : 'حوّل بيانات مكتبك إلى مسار عمل كامل'
        }}
      </h2>
      <p v-if="!journey.isComplete">
        ثلاث خطوات عملية تكفي لتجربة الربط الحقيقي بين الموكل والقضية والجلسة.
      </p>
      <p v-else>
        جرّبت الآن المسار اليومي الأساسي. يمكنك متابعة العمل أو مراجعة خطط الاستمرار بوضوح.
      </p>
    </div>

    <div
      class="journey-progress"
      :aria-label="`اكتمل ${journey.completedCount} من ${journey.totalCount}`"
    >
      <div class="progress-meta">
        <strong>{{ progressLabel }}</strong>
        <span v-if="daysRemaining !== null">متبقي {{ localizedDays }} يوم</span>
      </div>
      <div
        class="progress-track"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="journey.progress"
      >
        <span :style="{ width: `${journey.progress}%` }"></span>
      </div>
      <ol>
        <li v-for="step in journey.steps" :key="step.key" :class="{ complete: step.complete }">
          <span class="step-icon" aria-hidden="true">{{ step.complete ? '✓' : '•' }}</span>
          <span>{{ step.label }}</span>
        </li>
      </ol>
    </div>

    <button
      data-test="journey-next"
      type="button"
      class="journey-action"
      @click="emit('navigate', journey.nextRoute)"
    >
      <span>{{ journey.nextLabel }}</span>
      <LucideIcon name="arrow-left" :size="18" />
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LucideIcon from '../common/LucideIcon.vue'
import { buildActivationJourney } from '../../modules/purchaseExperience'

const props = withDefaults(
  defineProps<{
    clients: number
    cases: number
    sessions: number
    daysRemaining?: number | null
  }>(),
  { daysRemaining: null }
)
const emit = defineEmits<{ navigate: [route: string] }>()
const journey = computed(() =>
  buildActivationJourney({ clients: props.clients, cases: props.cases, sessions: props.sessions })
)
const numberFormat = new Intl.NumberFormat('ar-SA')
const progressLabel = computed(
  () =>
    `${numberFormat.format(journey.value.completedCount)} من ${numberFormat.format(journey.value.totalCount)}`
)
const localizedDays = computed(() => numberFormat.format(Math.max(0, props.daysRemaining ?? 0)))
</script>

<style scoped>
.journey-card {
  --journey-bg: #fffaf0;
  --journey-border: #d7b04a;
  --journey-text: #172033;
  --journey-muted: #657087;
  --journey-gold: #a87909;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.9fr) auto;
  align-items: center;
  gap: 24px;
  width: 100%;
  padding: 20px 22px;
  border: 1px solid var(--journey-border);
  border-radius: 16px;
  background: var(--journey-bg);
  color: var(--journey-text);
  box-shadow: 0 8px 24px rgba(37, 43, 57, 0.07);
}
.journey-copy h2 {
  margin: 4px 0 7px;
  font-size: 1.15rem;
  line-height: 1.5;
}
.journey-copy p {
  margin: 0;
  color: var(--journey-muted);
  font-size: 0.88rem;
  line-height: 1.7;
}
.journey-eyebrow {
  color: var(--journey-gold);
  font-size: 0.76rem;
  font-weight: 900;
}
.progress-meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 0.78rem;
}
.progress-meta span {
  color: var(--journey-muted);
}
.progress-track {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(115, 124, 141, 0.2);
}
.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--journey-gold);
  transition: width 0.25s ease;
}
.journey-progress ol {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}
.journey-progress li {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--journey-muted);
  font-size: 0.74rem;
}
.journey-progress li.complete {
  color: var(--journey-text);
  font-weight: 800;
}
.step-icon {
  display: grid;
  width: 17px;
  height: 17px;
  place-items: center;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-size: 0.68rem;
}
.journey-action {
  display: flex;
  min-width: 174px;
  min-height: 46px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border: 0;
  border-radius: 12px;
  background: #e5b52b;
  color: #101722;
  font: inherit;
  font-weight: 900;
  cursor: pointer;
}
.journey-action:hover {
  background: #f0c94f;
}
.journey-action:focus-visible {
  outline: 3px solid #377fd0;
  outline-offset: 3px;
}
:global([data-theme='dark'] .journey-card),
:global(.v-theme--dark .journey-card) {
  --journey-bg: #111f31;
  --journey-border: #725f29;
  --journey-text: #f3f6fa;
  --journey-muted: #aeb9c8;
  --journey-gold: #f1c94d;
  box-shadow: none;
}
@media (max-width: 900px) {
  .journey-card {
    grid-template-columns: 1fr;
  }
  .journey-action {
    width: 100%;
  }
}
@media (max-width: 600px) {
  .journey-card {
    gap: 17px;
    padding: 18px;
    border-radius: 14px;
  }
  .journey-progress ol {
    display: grid;
    grid-template-columns: 1fr;
  }
  .journey-copy h2 {
    font-size: 1.05rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .progress-track span {
    transition: none;
  }
}
</style>
