<template>
  <v-dialog v-model="showVal" max-width="760">
    <v-card class="rounded-xl glass-card border shadow-premium overflow-hidden">
      <v-toolbar color="primary" class="px-6 glass-card-noir border-b" height="64">
        <LucideIcon name="calendar-search" :size="24" class="text-accent me-3" />
        <v-toolbar-title class="font-weight-black text-white">اختيار الجلسة</v-toolbar-title>
        <v-spacer />
        <v-btn icon variant="text" color="white" @click="showVal = false"><LucideIcon name="x" :size="24" /></v-btn>
      </v-toolbar>
      <v-card-text class="pa-6 bg-noir-surface">
        <v-alert v-if="pickOptions.length === 0" type="info" variant="tonal" class="rounded-xl border" text="لا توجد جلسات اليوم أو الغد.">
          <template #prepend><LucideIcon name="info" :size="24" class="me-3" /></template>
        </v-alert>
        <v-list v-else density="comfortable" class="bg-transparent ga-3">
          <v-list-item v-for="s in pickOptions" :key="s.id" class="rounded-xl glass-card border mb-2 premium-hover" @click="choose(s)">
            <template #prepend>
              <div class="pa-2 rounded-lg bg-primary-alpha me-3"><LucideIcon name="calendar" :size="20" class="text-primary" /></div>
            </template>
            <v-list-item-title class="font-weight-black text-primary">{{ s.case_number || 'جلسة' }} — {{ formatSessionDate(s) }}</v-list-item-title>
            <v-list-item-subtitle class="text-caption font-weight-bold text-text-muted">{{ s.client_name || '—' }}</v-list-item-subtitle>
            <template #append><LucideIcon name="arrow-left" :size="20" class="text-primary" /></template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'
import { formatSessionDate } from './helpers'

const showVal = defineModel<boolean>('show', { required: true })
defineProps<{ pickOptions: any[] }>()
const emit = defineEmits<{ choose: [session: any] }>()
const choose = (s: any) => { showVal.value = false; emit('choose', s) }
</script>
