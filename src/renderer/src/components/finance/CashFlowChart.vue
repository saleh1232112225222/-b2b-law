<template>
  <v-card elevation="0" class="glass-card pa-5 mb-6 rounded-xl border">
    <div class="d-flex align-center justify-space-between flex-wrap gap-3 mb-4">
      <div class="d-flex align-center">
        <div class="pa-2 rounded-lg me-3" style="background: rgba(212, 175, 55, 0.14)">
          <LucideIcon name="bar-chart-3" :size="20" class="text-gold" />
        </div>
        <div>
          <h3 class="text-subtitle-1 font-weight-black mb-0">
            التدفق النقدي الشهري (الإيرادات مقابل المصروفات — آخر 6 أشهر)
          </h3>
          <div class="text-caption opacity-70 font-weight-bold">
            مقارنة مباشرة من قاعدة البيانات لدعم قرارات السيولة والميزانية
          </div>
        </div>
      </div>

      <div class="d-flex align-center gap-3 flex-wrap">
        <v-chip size="small" color="success" variant="tonal" class="font-weight-black">
          الإيرادات: {{ formatCurrency(periodTotals.income) }} ر.س
        </v-chip>
        <v-chip size="small" color="error" variant="tonal" class="font-weight-black">
          المصروفات: {{ formatCurrency(periodTotals.expense) }} ر.س
        </v-chip>
        <v-chip
          size="small"
          :color="periodTotals.net >= 0 ? 'primary' : 'warning'"
          variant="flat"
          class="font-weight-black"
        >
          صافي التدفق: {{ formatCurrency(periodTotals.net) }} ر.س
        </v-chip>
        <v-btn
          size="small"
          variant="text"
          color="primary"
          class="font-weight-bold"
          @click="collapsed = !collapsed"
        >
          <LucideIcon :name="collapsed ? 'chevron-down' : 'chevron-up'" :size="16" class="me-1" />
          {{ collapsed ? 'إظهار الرسم' : 'طيّ الرسم' }}
        </v-btn>
      </div>
    </div>

    <div v-if="!collapsed" class="chart-wrapper">
      <v-skeleton-loader v-if="loading" type="image" height="220" class="bg-transparent" />
      <Bar v-else :data="chartData" :options="chartOptions" />
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  type ChartOptions
} from 'chart.js'
import LucideIcon from '../common/LucideIcon.vue'
import type { CashFlowItem } from '../../stores/finance'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps<{
  items: CashFlowItem[]
  loading?: boolean
}>()

const collapsed = ref(false)

const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر'
]

const formatMonthArabic = (ym: string): string => {
  const parts = String(ym || '').split('-')
  if (parts.length !== 2) return ym
  const year = parts[0]
  const monthIdx = Number(parts[1]) - 1
  const name = ARABIC_MONTHS[monthIdx] || parts[1]
  return `${name} ${year}`
}

const formatCurrency = (val: number): string =>
  Number(val || 0).toLocaleString('ar-SA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })

const periodTotals = computed(() => {
  const list = Array.isArray(props.items) ? props.items : []
  const income = list.reduce((s, r) => s + Number(r.income || 0), 0)
  const expense = list.reduce((s, r) => s + Number(r.expense || 0), 0)
  return { income, expense, net: income - expense }
})

const chartData = computed(() => {
  const list = Array.isArray(props.items) ? props.items : []
  return {
    labels: list.map((i) => formatMonthArabic(i.month)),
    datasets: [
      {
        label: 'الإيرادات المحصلة (ر.س)',
        data: list.map((i) => Number(i.income || 0)),
        backgroundColor: 'rgba(22, 163, 74, 0.82)',
        borderColor: '#15803d',
        borderWidth: 1,
        borderRadius: 6,
        maxBarThickness: 38
      },
      {
        label: 'المصروفات (ر.س)',
        data: list.map((i) => Number(i.expense || 0)),
        backgroundColor: 'rgba(220, 38, 38, 0.78)',
        borderColor: '#b91c1c',
        borderWidth: 1,
        borderRadius: 6,
        maxBarThickness: 38
      }
    ]
  }
})

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 350 },
  plugins: {
    legend: {
      position: 'top',
      rtl: true,
      labels: {
        usePointStyle: true,
        padding: 16,
        font: { family: 'Cairo, Tajawal, sans-serif', size: 12, weight: 'bold' }
      }
    },
    tooltip: {
      rtl: true,
      textDirection: 'rtl',
      backgroundColor: 'rgba(15, 23, 42, 0.94)',
      padding: 12,
      titleFont: { family: 'Cairo, Tajawal, sans-serif', size: 13, weight: 'bold' },
      bodyFont: { family: 'Cairo, Tajawal, sans-serif', size: 12 },
      callbacks: {
        label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(Number(ctx.parsed.y || 0))} ر.س`
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        font: { family: 'Cairo, Tajawal, sans-serif', size: 12, weight: 'bold' }
      }
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(148, 163, 184, 0.18)' },
      ticks: {
        font: { family: 'Cairo, Tajawal, sans-serif', size: 11 },
        callback: (value) => `${Number(value).toLocaleString('ar-SA')}`
      }
    }
  }
}))
</script>

<style scoped>
.chart-wrapper {
  position: relative;
  height: 230px;
  width: 100%;
}
</style>
