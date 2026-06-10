<template>
  <v-card class="glass-card premium-lift" :class="{ 'cursor-pointer': hoverable }" :elevation="0">
    <div class="pa-5">
      <div class="d-flex align-center justify-space-between mb-4">
        <div
          class="icon-container pa-3 rounded-lg"
          :style="{ backgroundColor: `var(--${color}-alpha)` }"
        >
          <LucideIcon :name="icon" :size="22" :style="{ color: `var(--${color})` }" />
        </div>
        <div
          v-if="trend !== undefined"
          class="trend-badge d-flex align-center px-2 py-1 rounded-pill"
          :class="trend >= 0 ? 'trend-up' : 'trend-down'"
        >
          <LucideIcon
            :name="trend >= 0 ? 'trending-up' : 'trending-down'"
            :size="14"
            class="me-1"
          />
          <span class="text-tiny font-weight-black text-pure-black">{{ Math.abs(trend) }}%</span>
        </div>
      </div>

      <div class="card-content">
        <div class="text-h4 font-weight-black text-pure-black mb-1">
          <slot name="value">{{ value }}</slot>
        </div>
        <div class="text-tiny text-pure-black font-weight-black">
          {{ title }}
        </div>
      </div>

      <div
        v-if="sparkline && sparkline.length > 0"
        class="sparkline-wrapper mt-4"
        style="height: 32px"
      >
        <LineChart :data="sparkline" :color="getHexColor(color)" />
      </div>

      <div v-if="$slots.footer" class="footer-slot mt-4 pt-4 border-t border-gold opacity-10">
        <slot name="footer"></slot>
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import LineChart from '../charts/LineChart.vue'
import LucideIcon from './LucideIcon.vue'

interface Props {
  title: string
  value?: string | number
  icon: string
  color?: string
  trend?: number
  hoverable?: boolean
  sparkline?: number[]
}

const props = withDefaults(defineProps<Props>(), {
  color: 'gold',
  hoverable: true
})

const getHexColor = (colorName: string): string => {
  if (colorName === 'gold' || colorName === 'primary') return '#C5A028'
  if (colorName === 'success') return '#059669'
  if (colorName === 'error') return '#DC2626'
  if (colorName === 'warning') return '#F59E0B'
  if (colorName === 'info') return '#3B82F6'
  return '#C5A028'
}
</script>

<style scoped>
.icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-smooth);
  border: 1px solid var(--gold-alpha);
}

.premium-lift:hover .icon-container {
  transform: scale(1.1) rotate(-5deg);
  box-shadow: 0 4px 12px var(--gold-alpha);
}

.trend-badge {
  font-family: inherit;
}

.trend-up {
  background: rgba(5, 150, 105, 0.1);
  color: var(--success);
}

.trend-down {
  background: rgba(220, 38, 38, 0.1);
  color: var(--error);
}

.footer-slot {
  border-top-style: dashed !important;
}

.sparkline-wrapper {
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.05));
}

/* Premium KPI card enhancements */
.glass-card.premium-lift {
  border: 1px solid var(--gold-alpha) !important;
  background: var(--glass-bg-soft) !important;
  transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.glass-card.premium-lift:hover {
  border-color: var(--gold-royal) !important;
  box-shadow: 0 8px 24px -4px var(--gold-alpha), 0 0 0 1px var(--gold-alpha) !important;
  transform: translateY(-4px) scale(1.01);
}

[data-theme='dark'] .glass-card.premium-lift {
  background: rgba(13, 21, 38, 0.7) !important;
  border-color: rgba(233, 195, 73, 0.12) !important;
}

[data-theme='dark'] .glass-card.premium-lift:hover {
  border-color: rgba(233, 195, 73, 0.4) !important;
  box-shadow: 0 8px 32px -4px rgba(233, 195, 73, 0.15), 0 0 0 1px rgba(233, 195, 73, 0.1) !important;
}
</style>
