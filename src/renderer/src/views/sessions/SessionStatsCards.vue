<template>
  <v-row class="mb-8" dense>
    <v-col cols="12" md="4">
      <v-card elevation="0" class="glass-card pa-6 position-relative overflow-hidden premium-lift">
        <v-skeleton-loader v-if="loading" type="list-item-two-line" class="bg-transparent"></v-skeleton-loader>
        <div v-else>
          <div class="text-tiny font-weight-black text-gold mb-1">جلسات اليوم</div>
          <div class="d-flex align-center justify-space-between">
            <div class="text-h5 font-weight-black text-accent">{{ todayCount }}</div>
            <LucideIcon name="calendar-check" :size="40" class="text-accent opacity-20" />
          </div>
        </div>
      </v-card>
    </v-col>
    <v-col cols="12" md="4">
      <v-card elevation="0" class="glass-card pa-6 position-relative overflow-hidden premium-lift">
        <v-skeleton-loader v-if="loading" type="list-item-two-line" class="bg-transparent"></v-skeleton-loader>
        <div v-else>
          <div class="text-tiny font-weight-black text-gold mb-1">جلسات الغد</div>
          <div class="d-flex align-center justify-space-between">
            <div class="text-h5 font-weight-black text-gold">{{ tomorrowCount }}</div>
            <LucideIcon name="calendar-days" :size="40" class="text-gold opacity-20" />
          </div>
        </div>
      </v-card>
    </v-col>
    <v-col cols="12" md="4">
      <v-card elevation="0" class="glass-card pa-6 position-relative overflow-hidden premium-lift">
        <v-skeleton-loader v-if="loading" type="list-item-two-line" class="bg-transparent"></v-skeleton-loader>
        <div v-else>
          <div class="text-tiny font-weight-black text-gold mb-1">إجمالي المواعيد</div>
          <div class="d-flex align-center justify-space-between">
            <div class="text-h5 font-weight-black text-gold">{{ totalCount }}</div>
            <LucideIcon name="database" :size="40" class="text-gold opacity-30" />
          </div>
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'
defineProps<{
  todayCount: number
  tomorrowCount: number
  totalCount: number
  loading: boolean
}>()
</script>
