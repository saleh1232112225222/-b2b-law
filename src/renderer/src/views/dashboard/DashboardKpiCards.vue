<template>
  <v-row class="dashboard-row mb-1" dense>
    <v-col v-for="stat in stats" :key="stat.title" cols="12" sm="6" md="4" lg="2">
      <DashboardCard
        :title="stat.title"
        :value="stat.value"
        :icon="stat.icon"
        :color="stat.color"
        class="kpi-card-compact"
        @click="$emit('navigate', stat.to)"
      />
    </v-col>
  </v-row>
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
