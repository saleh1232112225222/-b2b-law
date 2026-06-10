<template>
  <div
    class="daily-progress-glass px-6 py-3 rounded-pill d-flex align-center premium-lift shadow-sm"
  >
    <div class="status-indicator me-3 pulse-gold"></div>
    <span class="text-caption font-weight-black text-gold me-5 text-no-wrap tracking-tighter"
      >مؤشر الإنجاز اليومي</span
    >
    <v-progress-linear
      :model-value="modelValue"
      color="accent"
      height="10"
      rounded
      active
      class="flex-grow-1 progress-glow"
    >
      <template #default>
        <v-tooltip activator="parent" location="top">
          <span class="font-weight-black">دقة الإنجاز: {{ Math.round(modelValue) }}%</span>
        </v-tooltip>
      </template>
    </v-progress-linear>
    <div class="ms-5 d-flex align-center">
      <span class="text-white font-weight-black text-h6 leading-none">{{
        Math.round(modelValue)
      }}</span>
      <span class="text-caption font-weight-black text-gold ms-1 mt-1">%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: number
}>()
</script>

<style scoped>
.daily-progress-glass {
  background: var(--glass-bg) !important;
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border) !important;
  box-shadow:
    0 26px 70px -34px rgba(0, 0, 0, 0.85),
    0 0 0 1px rgba(148, 163, 184, 0.08),
    0 0 18px rgba(59, 130, 246, 0.08) !important;
  min-width: 340px;
  transition: var(--transition-smooth);
}

.progress-glow {
  box-shadow: 0 0 18px rgba(59, 130, 246, 0.22);
  background: rgba(59, 130, 246, 0.1) !important;
}

.progress-glow :deep(.v-progress-linear__background) {
  opacity: 1 !important;
  background: rgba(59, 130, 246, 0.12) !important;
}

.progress-glow :deep(.v-progress-linear__determinate) {
  box-shadow: 0 0 18px rgba(59, 130, 246, 0.35) !important;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}

.pulse-gold {
  box-shadow: 0 0 0 0 rgba(var(--v-theme-accent), 0.4);
  animation: pulse-gold-inner 2s infinite;
}

@keyframes pulse-gold-inner {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(var(--v-theme-accent), 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 10px rgba(var(--v-theme-accent), 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(var(--v-theme-accent), 0);
  }
}

.tracking-tighter {
  letter-spacing: -0.05em;
}
.leading-none {
  line-height: 1;
}
</style>
