<template>
  <div v-if="isMobile" class="mobile-cards-list pa-4 bg-transparent overflow-y-auto" style="height: calc(100vh - 360px)">
    <v-skeleton-loader v-if="loading" type="card@3" class="bg-transparent" />
    <div v-else-if="items.length === 0" class="text-center py-8 opacity-50 text-white">
      لا يوجد قضايا مطابقة للمدخلات الحالية
    </div>
    <div v-else class="d-flex flex-column ga-4">
      <v-card v-for="item in items" :key="item.id" elevation="0" class="glass-card pa-4 rounded-xl border premium-lift position-relative">
        <div class="d-flex justify-space-between align-center mb-3">
          <v-btn variant="text" color="accent" class="px-0 font-weight-black text-subtitle-1" :to="'/cases/' + item.id">
            {{ item.case_number }}
          </v-btn>
          <div class="d-flex align-center ga-2">
            <v-chip :color="getPriorityColor(item.priority)" size="x-small" variant="tonal" class="font-weight-black rounded-lg">
              {{ item.priority }}
            </v-chip>
            <v-chip :color="getStatusColor(item.status)" size="x-small" variant="flat" class="font-weight-black rounded-lg shadow-sm">
              {{ item.status }}
            </v-chip>
            <v-menu location="bottom" :close-on-content-click="true" transition="slide-y-transition">
              <template #activator="{ props }">
                <v-btn v-bind="props" icon variant="tonal" color="primary" size="x-small" class="rounded-lg glass-card">
                  <LucideIcon name="more-vertical" :size="16" />
                </v-btn>
              </template>
              <v-list density="compact" class="py-2 glass-card border-0">
                <v-list-item :to="'/cases/' + item.id" class="rounded-lg mx-1 mb-1">
                  <template #prepend><LucideIcon name="eye" :size="18" class="text-info me-2" /></template>
                  <v-list-item-title class="font-weight-black text-subtitle-2">عرض</v-list-item-title>
                </v-list-item>
                <v-list-item class="rounded-lg mx-1 mb-1" @click="$emit('edit', item)">
                  <template #prepend><LucideIcon name="edit-3" :size="18" class="text-primary me-2" /></template>
                  <v-list-item-title class="font-weight-black text-subtitle-2">تعديل</v-list-item-title>
                </v-list-item>
                <v-divider class="my-1 opacity-10" />
                <v-list-item class="rounded-lg mx-1" @click="$emit('delete', item)">
                  <template #prepend><LucideIcon name="trash-2" :size="18" class="text-error me-2" /></template>
                  <v-list-item-title class="font-weight-black text-subtitle-2">حذف</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </div>
        <div class="mb-3">
          <div class="d-flex align-center flex-wrap ga-2">
            <span class="text-caption text-gold font-weight-bold">الموكل:</span>
            <v-btn v-if="getCaseClientId(item)" variant="text" color="accent" class="px-0 font-weight-bold text-body-2" :to="'/clients/' + getCaseClientId(item)" density="compact" style="min-width: 0; height: auto;">
              {{ getCaseClientName(item) || 'بدون موكل' }}
            </v-btn>
            <span v-else class="font-weight-bold text-body-2 text-white">{{ getCaseClientName(item) || 'بدون موكل' }}</span>
            <span v-if="getCaseOpponentName(item)" class="text-caption text-white opacity-60 mx-1">ضد</span>
            <span v-if="getCaseOpponentName(item)" class="text-body-2 text-text-muted font-weight-bold">{{ getCaseOpponentName(item) }}</span>
          </div>
          <div v-if="getCaseExtraPartiesCount(item) > 0" class="text-caption text-text-muted opacity-70 mt-1">
            +{{ getCaseExtraPartiesCount(item) }} أطراف إضافية
          </div>
        </div>
        <div class="d-flex flex-wrap ga-x-4 ga-y-2 border-t pt-3 border-white-alpha-10">
          <div class="d-flex align-center ga-1 text-caption">
            <LucideIcon name="user" :size="14" class="text-gold" />
            <span class="text-text-muted">المسؤول:</span>
            <span class="text-white font-weight-bold">{{ item.responsible_name || 'غير محدد' }}</span>
          </div>
          <div class="d-flex align-center ga-1 text-caption">
            <LucideIcon name="landmark" :size="14" class="text-gold" />
            <span class="text-text-muted">المحكمة:</span>
            <span class="text-white font-weight-bold">{{ item.court }}</span>
          </div>
          <div class="d-flex align-center ga-1 text-caption">
            <LucideIcon name="file-text" :size="14" class="text-gold" />
            <span class="text-text-muted">نوع الدعوى:</span>
            <span class="text-white font-weight-bold">{{ item.case_type }}</span>
          </div>
          <div class="d-flex align-center ga-1 text-caption">
            <LucideIcon name="calendar" :size="14" class="text-gold" />
            <span class="text-text-muted">التسجيل:</span>
            <span class="text-white font-weight-bold">{{ item.registration_date }} م</span>
          </div>
        </div>
      </v-card>
    </div>
    <div class="d-flex align-center justify-space-between mt-4">
      <v-btn variant="tonal" color="primary" size="small" class="rounded-lg px-4 font-weight-black" :disabled="page <= 1" @click="$emit('pagePrev')">
        السابق
      </v-btn>
      <span class="text-caption text-text-muted">صفحة {{ page }} من {{ totalPages }}</span>
      <v-btn variant="tonal" color="primary" size="small" class="rounded-lg px-4 font-weight-black" :disabled="page >= totalPages" @click="$emit('pageNext')">
        التالي
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'

const props = defineProps<{
  items: any[]
  loading: boolean
  isMobile: boolean
  page: number
  totalPages: number
}>()

defineEmits<{
  edit: [item: any]
  delete: [item: any]
  pagePrev: []
  pageNext: []
}>()

const getCaseParties = (item: any): any[] => Array.isArray(item?.parties) ? item.parties : []
const getCaseClientId = (item: any): string => getCaseParties(item).find((x: any) => x?.party_type === 'client')?.client_id || item?.client_id || ''
const getCaseClientName = (item: any): string => getCaseParties(item).find((x: any) => x?.party_type === 'client')?.name || item?.client_name || ''
const getCaseOpponentName = (item: any): string => getCaseParties(item).find((x: any) => x?.party_type && x?.party_type !== 'client')?.name || item?.opponent_name || ''
const getCaseExtraPartiesCount = (item: any): number => Math.max(0, getCaseParties(item).length - 2)

const getStatusColor = (status: string): string => {
  const map: Record<string, string> = {
    'قيد النظر': 'success', 'تحت الدراسة': 'info', معلقة: 'warning', 'محكومة بحكم نهائي': 'error',
    منتهية: 'error', مغلقة: 'error', مؤرشفة: 'grey-darken-1'
  }
  return map[status] || 'indigo'
}

const getPriorityColor = (priority: string): string => {
  const map: Record<string, string> = { عالية: 'var(--status-error)', متوسط: 'var(--status-warning)', منخفض: 'var(--status-success)', حرجة: 'var(--status-error-dark)' }
  return map[priority] || 'var(--text-muted)'
}
</script>
