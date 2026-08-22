<template>
  <div ref="containerRef" class="mobile-sessions-container rtl">
    <!-- Pull to refresh indicator -->
    <div v-if="isRefreshing" class="mobile-pull-indicator mobile-pull-indicator--active">
      <v-progress-circular indeterminate color="accent" :size="20" :width="2" class="me-2" />
      جاري التحديث...
    </div>

    <!-- Loading state when no items yet -->
    <div v-if="loading && (!items || items.length === 0)" class="d-flex justify-center pa-8">
      <v-progress-circular indeterminate color="accent" :size="40" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!loading && (!items || items.length === 0)"
      class="text-center pa-8 glass-card rounded-2xl mx-1 my-4"
    >
      <v-icon icon="mdi-calendar-blank-outline" :size="56" color="accent" class="mb-3 opacity-60" />
      <div class="text-subtitle-1 text-gold font-weight-black mb-1">لا توجد جلسات مجدولة</div>
      <div class="text-caption text-medium-emphasis mb-4">
        لم يتم العثور على أي جلسات ضمن التصفية المحددة
      </div>
      <v-btn
        color="accent"
        variant="flat"
        class="rounded-xl font-weight-black premium-btn-gold-gradient px-6"
        @click="emit('add')"
      >
        <v-icon icon="mdi-plus" class="me-2" />
        جدولة جلسة جديدة
      </v-btn>
    </div>

    <!-- Sessions Cards List -->
    <template v-else>
      <div class="sessions-list">
        <v-card
          v-for="item in items"
          :key="item.id"
          class="session-mobile-card mb-3 rounded-2xl overflow-hidden glass-card"
          variant="outlined"
          :class="getCardBorderClass(item.status)"
          @click="emit('edit', item)"
        >
          <div class="pa-3 pa-sm-4">
            <!-- Header: Case Number + Session Type + Status Badge -->
            <div class="d-flex justify-space-between align-center mb-2 pb-2 border-b-subtle gap-2">
              <div class="d-flex align-center gap-1 min-w-0">
                <v-icon icon="mdi-briefcase-outline" size="18" color="accent" class="flex-shrink-0" />
                <span class="text-subtitle-2 font-weight-black text-gold text-truncate">
                  قضية: {{ item.case_number || 'بدون رقم' }}
                </span>
              </div>

              <div class="d-flex align-center gap-1 flex-shrink-0">
                <v-chip
                  v-if="item.type"
                  size="x-small"
                  variant="outlined"
                  color="accent"
                  class="font-weight-bold"
                >
                  {{ item.type }}
                </v-chip>
                <v-chip
                  size="x-small"
                  :color="getStatusColor(item.status)"
                  variant="flat"
                  class="font-weight-black"
                >
                  {{ item.status || 'قادمة' }}
                </v-chip>
              </div>
            </div>

            <!-- Client Info + Client Capacity (مدعي / مدعى عليه) -->
            <div class="client-section mb-2 d-flex align-center justify-space-between flex-wrap gap-2">
              <div class="d-flex align-center gap-1 min-w-0">
                <v-icon icon="mdi-account-tie" size="18" class="text-gold opacity-80 flex-shrink-0" />
                <span class="text-body-2 font-weight-black text-white text-truncate">
                  {{ item.client_name || 'بدون موكل' }}
                </span>
              </div>

              <!-- Client Role Chip -->
              <v-chip
                v-if="item.client_role"
                size="x-small"
                variant="tonal"
                :color="getClientRoleColor(item.client_role)"
                class="font-weight-black px-2"
              >
                {{ formatClientRole(item.client_role) }}
              </v-chip>
            </div>

            <!-- Date & Time Box (Gregorian, Hijri, Time) -->
            <div class="session-datetime-box rounded-xl pa-2 mb-2">
              <v-row dense class="align-center">
                <!-- Gregorian Date -->
                <v-col cols="6" class="d-flex align-center">
                  <v-icon icon="mdi-calendar" size="15" color="accent" class="me-1 flex-shrink-0" />
                  <span class="text-caption font-weight-bold text-high-emphasis text-truncate">
                    {{ item.date || '---' }} م
                  </span>
                </v-col>

                <!-- Time -->
                <v-col cols="6" class="d-flex align-center justify-end">
                  <v-icon icon="mdi-clock-outline" size="15" color="accent" class="me-1 flex-shrink-0" />
                  <span class="text-caption font-weight-black text-gold">
                    {{ item.time || '--:--' }}
                  </span>
                </v-col>

                <!-- Hijri Date -->
                <v-col cols="12" class="d-flex align-center mt-1">
                  <v-icon icon="mdi-calendar-star" size="15" color="accent" class="me-1 flex-shrink-0" />
                  <span class="text-caption font-weight-bold text-gold opacity-90 text-truncate">
                    {{ formatHijri(item.date_hijri) }}
                  </span>
                </v-col>
              </v-row>
            </div>

            <!-- Court / Chamber / Room if present -->
            <div
              v-if="item.court_room"
              class="d-flex align-center text-caption text-medium-emphasis mb-2 px-1"
            >
              <v-icon icon="mdi-gavel" size="14" color="accent" class="me-1 opacity-70 flex-shrink-0" />
              <span class="text-truncate">{{ item.court_room }}</span>
            </div>

            <!-- Actions Row -->
            <div class="d-flex align-center justify-space-between pt-2 border-t-subtle flex-wrap gap-2">
              <!-- Left: Najiz Join Link + Session Room -->
              <div class="d-flex align-center gap-2 flex-wrap">
                <!-- Direct Najiz Video Link Button -->
                <v-btn
                  v-if="item.meeting_link"
                  color="accent"
                  size="small"
                  variant="flat"
                  class="font-weight-black rounded-lg premium-btn-gold-gradient px-3"
                  @click.stop="openNajizLink(item.meeting_link)"
                >
                  <v-icon icon="mdi-video" size="16" class="me-1" />
                  انضمام للجلسة (ناجز)
                </v-btn>

                <!-- Operations Room -->
                <v-btn
                  color="primary"
                  size="small"
                  variant="tonal"
                  class="font-weight-bold rounded-lg px-2"
                  @click.stop="emit('open-session-room', item)"
                >
                  <v-icon icon="mdi-sword-cross" size="15" class="me-1" />
                  غرفة العمليات
                </v-btn>
              </div>

              <!-- Right: Edit & Delete Icons -->
              <div class="d-flex align-center gap-1 ms-auto">
                <v-btn
                  icon
                  variant="text"
                  size="small"
                  color="gold"
                  class="opacity-80 hover-opacity-100"
                  @click.stop="emit('edit', item)"
                >
                  <v-icon icon="mdi-pencil-outline" size="18" />
                  <v-tooltip activator="parent" location="top">تعديل الجلسة</v-tooltip>
                </v-btn>
                <v-btn
                  icon
                  variant="text"
                  size="small"
                  color="error"
                  class="opacity-80 hover-opacity-100"
                  @click.stop="emit('delete', item)"
                >
                  <v-icon icon="mdi-trash-can-outline" size="18" />
                  <v-tooltip activator="parent" location="top">حذف الجلسة</v-tooltip>
                </v-btn>
              </div>
            </div>
          </div>
        </v-card>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePullToRefresh } from '../../composables/usePullToRefresh'

const props = defineProps<{
  items: any[]
  loading: boolean
}>()

const emit = defineEmits<{
  edit: [item: any]
  add: []
  delete: [item: any]
  'open-najiz': [link: string]
  'open-session-room': [item: any]
  refresh: []
}>()

const containerRef = ref<HTMLElement | null>(null)

const { isRefreshing } = usePullToRefresh(containerRef, async () => {
  emit('refresh')
})

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'قادمة':
      return 'accent'
    case 'منعقدة':
    case 'تمت':
      return 'success'
    case 'مؤجلة':
      return 'warning'
    case 'ملغاة':
      return 'error'
    default:
      return 'grey'
  }
}

const getCardBorderClass = (status: string): string => {
  switch (status) {
    case 'قادمة':
      return 'border-s-accent'
    case 'منعقدة':
    case 'تمت':
      return 'border-s-success'
    case 'مؤجلة':
      return 'border-s-warning'
    case 'ملغاة':
      return 'border-s-error'
    default:
      return 'border-s-gold'
  }
}

const getClientRoleColor = (role: string): string => {
  if (!role) return 'grey'
  const r = role.toLowerCase()
  if (r.includes('مدعي') && !r.includes('عليه')) return 'info'
  if (r.includes('مدعى عليه') || r.includes('ضده')) return 'warning'
  if (r.includes('مستأنف') && !r.includes('ضده')) return 'purple'
  if (r.includes('طالب')) return 'cyan'
  return 'accent'
}

const formatClientRole = (role: string): string => {
  if (!role) return ''
  const trimmed = role.trim()
  if (trimmed.startsWith('صفة') || trimmed.startsWith('الموكل')) {
    return trimmed
  }
  return `صفة الموكل: ${trimmed}`
}

const formatHijri = (hijri?: string): string => {
  if (!hijri || hijri.trim() === '' || hijri === '---') {
    return 'التاريخ الهجري غير متوفر'
  }
  if (hijri.endsWith('هـ') || hijri.endsWith('ه')) {
    return hijri
  }
  return `${hijri} هـ`
}

const openNajizLink = (link: string): void => {
  if (!link) return
  emit('open-najiz', link)
  const fullUrl = link.startsWith('http://') || link.startsWith('https://') ? link : `https://${link}`
  window.open(fullUrl, '_blank')
}
</script>

<style scoped>
.mobile-sessions-container {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.session-mobile-card {
  cursor: pointer;
  background: rgba(22, 27, 34, 0.7) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(197, 160, 40, 0.2) !important;
  border-inline-start-width: 4px !important;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.session-mobile-card:active {
  transform: scale(0.985);
}

.border-s-accent {
  border-inline-start-color: rgb(233, 195, 73) !important;
}

.border-s-success {
  border-inline-start-color: rgb(16, 185, 129) !important;
}

.border-s-warning {
  border-inline-start-color: rgb(245, 158, 11) !important;
}

.border-s-error {
  border-inline-start-color: rgb(239, 68, 68) !important;
}

.border-s-gold {
  border-inline-start-color: rgba(197, 160, 40, 0.8) !important;
}

.border-b-subtle {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.border-t-subtle {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.session-datetime-box {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(197, 160, 40, 0.12);
}

.min-w-0 {
  min-width: 0;
}

.hover-opacity-100:hover {
  opacity: 1 !important;
}
</style>
