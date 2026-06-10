<template>
  <div class="d-flex flex-column gap-1">
    <div style="height: 120px">
      <PieChart :labels="pieLabels" :data="pieData" :colors="pieColors" />
    </div>
    <div style="height: 120px">
      <TimeSeriesLineChart
        :labels="trendLabels"
        :data="trendValues"
        color="#1a437d"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import PieChart from '../../components/charts/PieChart.vue'
import TimeSeriesLineChart from '../../components/charts/TimeSeriesLineChart.vue'

defineProps<{
  pieLabels: string[]
  pieData: number[]
  pieColors: string[]
  trendLabels: string[]
  trendValues: number[]
}>()
</script>
