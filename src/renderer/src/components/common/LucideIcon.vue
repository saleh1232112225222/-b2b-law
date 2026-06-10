<template>
  <component
    :is="iconComponent"
    :size="size"
    :stroke-width="strokeWidth"
    :class="['lucide-icon', colorClass]"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import * as icons from 'lucide-vue-next'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: [Number, String],
    default: 20
  },
  strokeWidth: {
    type: [Number, String],
    default: 2
  },
  colorClass: {
    type: String,
    default: ''
  }
})

const iconComponent = computed(() => {
  const iconName = props.name
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
  return (icons as any)[iconName] || icons.HelpCircle
})
</script>

<style scoped>
.lucide-icon {
  display: inline-block;
  vertical-align: middle;
  transition:
    transform 0.2s ease,
    stroke 0.2s ease;
}
</style>
