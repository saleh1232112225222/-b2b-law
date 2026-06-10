<template>
  <div
    class="premium-alert d-flex align-center pa-4 rounded-xl border-s-4 mb-4 transition-all"
    :class="[`bg-${color}-lighten-5`, `border-${color}`]"
  >
    <div class="premium-alert__icon me-4">
      <v-avatar :color="`${color}-lighten-4`" size="40">
        <v-icon :color="color" size="24">{{ icon }}</v-icon>
      </v-avatar>
    </div>
    <div class="premium-alert__content flex-grow-1">
      <div class="text-subtitle-2 font-weight-black" :class="`text-${color}-darken-4`">
        {{ title }}
      </div>
      <div class="text-caption text-secondary font-weight-bold">
        {{ description }}
      </div>
    </div>
    <div class="premium-alert__actions ms-4">
      <slot name="actions">
        <v-btn
          v-if="actionLabel"
          variant="flat"
          :color="color"
          size="small"
          class="rounded-lg font-weight-black px-4"
          @click="$emit('action')"
        >
          {{ actionLabel }}
        </v-btn>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description: string
  icon: string
  color?: string
  actionLabel?: string
}>()

defineEmits(['action'])
</script>

<style scoped>
.premium-alert {
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}

.premium-alert:hover {
  transform: translateX(-4px);
  box-shadow: var(--shadow-md);
}

.transition-all {
  transition: all 0.3s ease;
}

.border-s-4 {
  border-inline-start-width: 4px !important;
}
</style>
