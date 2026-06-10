<template>
  <Line :data="chartData" :options="chartOptions" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js'
import { Line } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const props = defineProps<{
  labels: string[]
  data: number[]
  color: string
}>()

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [
    {
      label: '',
      data: props.data,
      borderColor: props.color,
      backgroundColor: 'rgba(26, 67, 125, 0.10)',
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 3,
      tension: 0.35,
      fill: true
    }
  ]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: true }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { maxRotation: 0, autoSkip: true }
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(148, 163, 184, 0.25)' },
      ticks: { precision: 0 }
    }
  }
}
</script>
