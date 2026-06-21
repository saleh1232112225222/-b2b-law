<template>
  <div>
    <div v-if="loading">
      <v-skeleton-loader v-for="n in 5" :key="n" type="card" class="rounded-xl mb-3 glass-card" />
    </div>
    <div v-else-if="safeLength(sessions) === 0" class="text-center pa-12 glass-card rounded-xl">
      <LucideIcon name="calendar-x" :size="48" class="text-gold opacity-30 mb-4" />
      <div class="text-body-1 font-weight-black text-gold opacity-60">لا توجد جلسات مجدولة</div>
    </div>
    <v-card
      v-for="session in safeArray(sessions)"
      v-else
      :key="session.id"
      elevation="0"
      class="glass-card mb-3 rounded-xl overflow-hidden session-mobile-card"
    >
      <div class="session-card-header pa-3 d-flex align-center justify-space-between">
        <div class="d-flex align-center gap-2">
          <LucideIcon name="calendar" :size="16" class="text-gold" />
          <span class="font-weight-black text-gold">{{ session.date }} م</span>
          <span class="text-caption text-gold opacity-50">{{ session.time || '' }}</span>
        </div>
        <v-chip
          :color="getStatusColor(session.status)"
          size="x-small"
          variant="flat"
          class="font-weight-black rounded-md"
          >{{ session.status }}</v-chip
        >
      </div>
      <v-divider class="border-gold opacity-10" />
      <v-card-text class="pa-3">
        <div class="d-flex align-start justify-space-between">
          <div class="flex-grow-1">
            <div class="d-flex align-center gap-1 mb-2">
              <LucideIcon name="gavel" :size="14" class="text-accent" />
              <span class="text-caption font-weight-black text-accent">{{
                session.case_number || 'بدون رقم قضية'
              }}</span>
            </div>
            <div class="d-flex align-center gap-1 mb-2">
              <LucideIcon name="user" :size="14" class="text-gold opacity-60" />
              <span class="text-caption font-weight-black">{{
                session.client_name || 'بدون موكل'
              }}</span>
            </div>
            <div v-if="session.court_room" class="d-flex align-center gap-1">
              <LucideIcon name="landmark" :size="14" class="text-gold opacity-60" />
              <span class="text-caption font-weight-black">{{ session.court_room }}</span>
            </div>
          </div>
          <div class="d-flex flex-column gap-1 ms-2">
            <v-btn
              icon
              variant="tonal"
              color="accent"
              size="small"
              class="rounded-lg"
              @click="$emit('open-session-room', session)"
            >
              <LucideIcon name="swords" :size="16" />
            </v-btn>
            <v-btn
              icon
              variant="tonal"
              color="gold"
              size="small"
              class="rounded-lg"
              @click="$emit('edit', session)"
            >
              <LucideIcon name="edit-3" :size="16" />
            </v-btn>
            <v-btn
              icon
              variant="tonal"
              color="error"
              size="small"
              class="rounded-lg"
              @click="$emit('delete', session)"
            >
              <LucideIcon name="trash-2" :size="16" />
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>
    <div class="d-flex justify-center mt-4">
      <v-pagination
        v-model="page"
        :length="Math.ceil(totalSessions / itemsPerPage)"
        :total-visible="3"
        density="compact"
        color="accent"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'
import { safeArray, safeLength } from '../../utils/safe'
import type { Session } from '../../types/session'

const props = withDefaults(
  defineProps<{
    sessions: Session[]
    loading: boolean
    totalSessions: number
    itemsPerPage: number
  }>(),
  {}
)

const page = defineModel<number>('modelValue', { required: true })

defineEmits<{
  edit: [item: any]
  delete: [item: any]
  'open-session-room': [item: any]
}>()

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'قادمة':
      return 'accent'
    case 'تمت':
      return 'green-darken-3'
    case 'مؤجلة':
      return 'warning'
    case 'ملغاة':
      return 'error'
    default:
      return 'grey'
  }
}
</script>
