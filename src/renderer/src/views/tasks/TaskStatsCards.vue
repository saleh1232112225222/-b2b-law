<template>
  <v-row class="mb-8" dense>
    <v-col v-for="card in cards" :key="card.label" cols="12" md="4">
      <v-card
        elevation="0"
        class="rounded-xl pa-6 glass-card border shadow-premium overflow-hidden position-relative premium-hover glass-card"
      >
        <v-skeleton-loader
          v-if="loading"
          type="list-item-two-line"
          class="bg-transparent"
        ></v-skeleton-loader>
        <div v-else>
          <div
            class="text-subtitle-2 font-weight-black text-gold opacity-40 mb-2 uppercase tracking-widest"
          >
            {{ card.label }}
          </div>
          <div class="d-flex align-center justify-space-between">
            <div class="text-h5 font-weight-black tracking-tight" :class="card.valueClass">
              {{ stats[card.key as keyof typeof stats] }}
            </div>
            <div class="glass-panel-light pa-3 rounded-xl border-gold-alpha">
              <LucideIcon :name="card.icon" :size="32" :class="card.iconColor" />
            </div>
          </div>
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'

defineProps<{
  stats: { total: number; in_progress: number; completed: number }
  loading: boolean
}>()

const cards = [
  {
    label: 'إجمالي المهام',
    key: 'total',
    icon: 'layers',
    valueClass: 'text-accent',
    iconColor: 'text-accent'
  },
  {
    label: 'قيد الإنجاز',
    key: 'in_progress',
    icon: 'clock',
    valueClass: 'text-warning',
    iconColor: 'text-warning'
  },
  {
    label: 'تم الإنجاز',
    key: 'completed',
    icon: 'check-circle',
    valueClass: 'text-success',
    iconColor: 'text-success'
  }
]
</script>
