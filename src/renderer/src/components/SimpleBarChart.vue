<template>
  <div class="chart">
    <svg :width="width" :height="height" role="img">
      <g>
        <line
          :x1="padding"
          :y1="height - padding"
          :x2="width - padding"
          :y2="height - padding"
          stroke="#ccc"
        />
        <line :x1="padding" :y1="padding" :x2="padding" :y2="height - padding" stroke="#ccc" />
      </g>

      <g v-for="(d, idx) in data" :key="d.label">
        <rect
          :x="barX(idx)"
          :y="barY(d.value)"
          :width="barWidth"
          :height="barH(d.value)"
          :fill="d.color || defaultColor"
          rx="4"
        />
        <text
          :x="barX(idx) + barWidth / 2"
          :y="height - padding + 14"
          text-anchor="middle"
          font-size="10"
          fill="#666"
        >
          {{ d.label }}
        </text>
        <text
          :x="barX(idx) + barWidth / 2"
          :y="barY(d.value) - 6"
          text-anchor="middle"
          font-size="10"
          fill="#333"
        >
          {{ formatValue(d.value) }}
        </text>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  data: Array<{ label: string; value: number; color?: string }>
  width?: number
  height?: number
  padding?: number
  defaultColor?: string
  valueFormatter?: (v: number) => string
}>()

const width = computed(() => props.width ?? 640)
const height = computed(() => props.height ?? 220)
const padding = computed(() => props.padding ?? 28)
const defaultColor = computed(() => props.defaultColor ?? '#1565C0')

const max = computed(() => Math.max(1, ...props.data.map((d) => Number(d.value) || 0)))
const plotW = computed(() => width.value - padding.value * 2)
const plotH = computed(() => height.value - padding.value * 2)

const barWidth = computed(() => {
  const n = Math.max(1, props.data.length)
  return Math.max(8, Math.floor(plotW.value / n) - 10)
})

const gap = computed(() => {
  const n = Math.max(1, props.data.length)
  return Math.floor((plotW.value - barWidth.value * n) / (n + 1))
})

const barX = (idx: number) => padding.value + gap.value + idx * (barWidth.value + gap.value)
const barH = (v: number) => Math.round((Math.max(0, v) / max.value) * plotH.value)
const barY = (v: number) => height.value - padding.value - barH(v)

const formatValue = (v: number) => (props.valueFormatter ? props.valueFormatter(v) : String(v))
</script>

<style scoped>
.chart {
  overflow-x: auto;
}
</style>
