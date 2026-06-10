<template>
  <v-row dense class="mb-4">
    <v-col v-for="(card, i) in kpis" :key="i" cols="12" sm="3">
      <DashboardCard
        :title="card.title"
        :value="card.value"
        :icon="card.icon"
        :color="card.color"
        :trend="card.trendValue"
        :sparkline="card.sparkline"
        glow
      >
        <template #footer>
          <div class="d-flex align-center justify-space-between">
            <span class="text-caption text-pure-black font-weight-bold">{{ card.suffix }}</span>
            <v-icon size="14" color="black">{{ ICONS.UI.CHEVRON_LEFT }}</v-icon>
          </div>
        </template>
      </DashboardCard>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DashboardCard from '../common/DashboardCard.vue'
import { ICONS } from '../../config/icons'

const props = defineProps<{
  pendingSessions: number
  activeObjections: number
  enforcementBonds: number
  preparationEfficiency: number
  totalSessions: number
}>()

const kpis = computed(() => [
  {
    title: 'الجلسات المتبقية',
    value: props.pendingSessions,
    suffix: 'جلسة اليوم',
    icon: 'calendar-clock',
    color: 'primary',
    trendValue: 12,
    sparkline: [4, 7, 5, 8, 10, 8, 12]
  },
  {
    title: 'مدد الاعتراض',
    value: props.activeObjections,
    suffix: 'حكماً بانتظار الرد',
    icon: 'award',
    color: 'error',
    trendValue: -5,
    sparkline: [10, 8, 9, 6, 5, 4, 3]
  },
  {
    title: 'سندات التنفيذ',
    value: props.enforcementBonds,
    suffix: 'سند بانتظار الإجراء',
    icon: 'gavel',
    color: 'accent',
    trendValue: 8,
    sparkline: [2, 4, 3, 5, 7, 6, 8]
  },
  {
    title: 'كفاءة التحضير',
    value: props.preparationEfficiency,
    suffix: `/ ${props.totalSessions} مكتمل`,
    icon: 'shield-check',
    color: 'success',
    trendValue: 100,
    sparkline: [80, 85, 90, 88, 95, 98, 100]
  }
])
</script>

<style scoped>
/* Scoped styles removed as they are now handled by DashboardCard.vue */
</style>
