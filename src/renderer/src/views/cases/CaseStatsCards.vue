<template>
  <v-row class="mb-4" dense>
    <v-col cols="12" md="6">
      <v-card elevation="0" class="glass-card pa-6 premium-lift overflow-hidden">
        <v-skeleton-loader v-if="loading" type="list-item-two-line" class="bg-transparent" />
        <div v-else>
          <div
            class="text-caption font-weight-black text-gold opacity-60 mb-2 uppercase tracking-widest"
          >
            إجمالي القضايا النشطة
          </div>
          <div class="d-flex align-center justify-space-between">
            <div class="text-h5 font-weight-black text-white tabular-nums">
              {{ total }}
            </div>
            <div class="bg-accent-alpha pa-3 rounded-xl">
              <LucideIcon name="folder-search" :size="32" class="text-gold" />
            </div>
          </div>
        </div>
      </v-card>
    </v-col>
    <v-col cols="12" md="6">
      <v-card elevation="0" class="glass-card pa-6 premium-lift overflow-hidden">
        <div
          class="text-caption font-weight-black text-gold opacity-60 mb-2 uppercase tracking-widest"
        >
          معدل انتهاء القضايا
        </div>
        <div class="d-flex align-center justify-space-between">
          <div class="text-h5 font-weight-black text-white tabular-nums">{{ completionRate }}%</div>
          <div class="bg-accent-alpha pa-3 rounded-xl">
            <LucideIcon name="trending-up" :size="32" class="text-gold" />
          </div>
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'

defineProps<{
  total: number
  completionRate: string | number
  loading: boolean
}>()
</script>
