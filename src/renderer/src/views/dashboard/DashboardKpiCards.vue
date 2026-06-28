<template>
  <div class="kpi-cards-grid mb-1">
    <div v-for="stat in stats" :key="stat.title" class="kpi-card-wrapper">
      <DashboardCard
        :title="stat.title"
        :value="stat.value"
        :icon="stat.icon"
        :color="stat.color"
        :is-mobile="isMobile"
        class="kpi-card-compact h-100"
        @click="$emit('navigate', stat.to)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import DashboardCard from '../../components/common/DashboardCard.vue'

defineProps<{
  stats: { title: string; value: string | number; icon: string; color: string; to: string }[]
  isMobile: boolean
}>()

defineEmits<{
  navigate: [path: string]
}>()
</script>

<style scoped>
.kpi-cards-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, 1fr);
}

@media (min-width: 600px) {
  .kpi-cards-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 960px) {
  .kpi-cards-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1260px) {
  .kpi-cards-grid {
    grid-template-columns: repeat(7, 1fr);
  }
}

.kpi-card-wrapper {
  min-width: 0;
}
</style>
