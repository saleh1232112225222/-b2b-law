<template>
  <div ref="containerRef" class="mobile-sessions-container rtl pa-2">
    <!-- Pull to refresh indicator -->
    <div v-if="isRefreshing" class="mobile-pull-indicator mobile-pull-indicator--active">
      <v-progress-circular indeterminate color="accent" :size="20" :width="2" class="me-2" />
      جاري التحديث...
    </div>

    <!-- Loading state when no items yet -->
    <div v-if="loading && (!items || items.length === 0)" class="d-flex justify-center pa-8">
      <v-progress-circular indeterminate color="primary" :size="40" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!loading && (!items || items.length === 0)"
      class="text-center pa-8 client-style-card rounded-2xl mx-1 my-4"
    >
      <v-icon icon="mdi-calendar-blank-outline" :size="56" color="accent" class="mb-3 opacity-60" />
      <div class="text-subtitle-1 font-weight-black text-slate-800 mb-1">لا توجد جلسات مجدولة</div>
      <div class="text-caption text-slate-500 mb-4">
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
          class="client-style-card mb-3 rounded-2xl overflow-hidden"
          elevation="0"
          @click="emit('edit', item)"
        >
          <!-- 1. Header Row -->
          <div class="card-header d-flex justify-space-between align-center px-4 py-3">
            <div class="d-flex align-center gap-2">
              <v-icon icon="mdi-briefcase-outline" size="20" color="accent" />
              <span class="card-title text-subtitle-1 font-weight-black text-slate-800">
                قضية: {{ item.case_number || 'بدون رقم' }}
              </span>
            </div>

            <div class="d-flex align-center gap-1.5">
              <span v-if="item.type" class="badge-type">
                {{ item.type }}
              </span>
              <span class="badge-status" :class="getStatusBadgeClass(item.status)">
                {{ item.status || 'قادمة' }}
              </span>
            </div>
          </div>

          <!-- 2. Body Details -->
          <div class="card-body px-4 py-3">
            <!-- Client Name & Capacity -->
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="d-flex align-center gap-1 min-w-0">
                <span class="label-text">الموكل:</span>
                <span class="value-text font-weight-black text-slate-900 text-truncate">
                  {{ item.client_name || 'بدون موكل' }}
                </span>
              </div>
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

            <!-- Date & Time Box -->
            <div class="session-datetime-box rounded-xl pa-2.5 mb-2">
              <v-row dense class="align-center">
                <!-- Gregorian Date -->
                <v-col cols="6" class="d-flex align-center">
                  <v-icon icon="mdi-calendar" size="15" color="accent" class="me-1 flex-shrink-0" />
                  <span class="text-caption font-weight-bold text-slate-800 text-truncate">
                    {{ item.date || '---' }} م
                  </span>
                </v-col>

                <!-- Time -->
                <v-col cols="6" class="d-flex align-center justify-end">
                  <v-icon icon="mdi-clock-outline" size="15" color="accent" class="me-1 flex-shrink-0" />
                  <span class="text-caption font-weight-black text-amber-800">
                    {{ item.time || '--:--' }}
                  </span>
                </v-col>

                <!-- Hijri Date -->
                <v-col cols="12" class="d-flex align-center mt-1">
                  <v-icon icon="mdi-calendar-star" size="15" color="accent" class="me-1 flex-shrink-0" />
                  <span class="text-caption font-weight-bold text-amber-800 opacity-90 text-truncate">
                    {{ formatHijri(item.date_hijri) }}
                  </span>
                </v-col>
              </v-row>
            </div>

            <!-- Court / Chamber / Room if present -->
            <div
              v-if="item.court_room"
              class="d-flex align-center text-caption text-slate-600 mb-1"
            >
              <v-icon icon="mdi-gavel" size="14" color="accent" class="me-1 opacity-70 flex-shrink-0" />
              <span class="text-truncate">{{ item.court_room }}</span>
            </div>
          </div>

          <!-- 3. Footer Row -->
          <div class="card-footer d-flex align-center justify-space-between px-4 py-2.5 flex-wrap gap-2">
            <!-- Left Actions (Delete, Edit, Ops Room) -->
            <div class="d-flex align-center gap-2">
              <button
                type="button"
                class="action-btn-icon btn-delete"
                title="حذف الجلسة"
                @click.stop="emit('delete', item)"
              >
                <v-icon icon="mdi-trash-can-outline" size="18" />
              </button>
              <button
                type="button"
                class="action-btn-icon btn-edit"
                title="تعديل الجلسة"
                @click.stop="emit('edit', item)"
              >
                <v-icon icon="mdi-pencil-outline" size="18" />
              </button>
              <button
                type="button"
                class="action-btn-icon btn-ops"
                title="غرفة العمليات"
                @click.stop="emit('open-session-room', item)"
              >
                <v-icon icon="mdi-sword-cross" size="16" />
              </button>
            </div>

            <!-- Right Action: Najiz Video Join Link -->
            <button
              v-if="item.meeting_link"
              type="button"
              class="najiz-join-btn d-flex align-center gap-1 font-weight-black"
              @click.stop="openNajizLink(item.meeting_link)"
            >
              <v-icon icon="mdi-video" size="16" class="text-amber-800" />
              <span class="text-amber-900">انضمام للجلسة (ناجز)</span>
            </button>
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

const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'قادمة':
      return 'badge-status-active'
    case 'منعقدة':
    case 'تمت':
      return 'badge-status-success'
    case 'مؤجلة':
      return 'badge-status-warning'
    case 'ملغاة':
      return 'badge-status-danger'
    default:
      return 'badge-status-default'
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

/* Client-style Card Container matching the client card */
.client-style-card {
  background: #ffffff !important;
  border: 1.5px solid #c5a028 !important;
  border-radius: 16px !important;
  box-shadow: 0 2px 8px rgba(197, 160, 40, 0.08) !important;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.client-style-card:active {
  transform: scale(0.985);
}

/* Card Header */
.card-header {
  border-bottom: 1px solid rgba(197, 160, 40, 0.35);
}

.card-title {
  color: #1e293b;
  font-size: 0.95rem;
}

/* Badges */
.badge-type {
  background: rgba(197, 160, 40, 0.15);
  color: #854d0e;
  border: 1px solid rgba(197, 160, 40, 0.4);
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 0.72rem;
  font-weight: 800;
}

.badge-status {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.72rem;
  font-weight: 800;
}

.badge-status-active {
  background: #1e293b;
  color: #ffffff;
}

.badge-status-success {
  background: #059669;
  color: #ffffff;
}

.badge-status-warning {
  background: #d97706;
  color: #ffffff;
}

.badge-status-danger {
  background: #dc2626;
  color: #ffffff;
}

.badge-status-default {
  background: #475569;
  color: #ffffff;
}

/* Card Body */
.card-body {
  background: #ffffff;
}

.label-text {
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 600;
}

.value-text {
  color: #0f172a;
  font-size: 0.85rem;
}

.session-datetime-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.text-amber-800 {
  color: #92400e !important;
}

.text-amber-900 {
  color: #78350f !important;
}

/* Card Footer */
.card-footer {
  border-top: 1px solid rgba(197, 160, 40, 0.35);
  background: #fafaf9;
}

.action-btn-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.action-btn-icon:active {
  transform: scale(0.92);
}

.btn-delete {
  background: #fee2e2;
  color: #dc2626;
}

.btn-edit {
  background: #e2e8f0;
  color: #334155;
}

.btn-ops {
  background: #e0f2fe;
  color: #0369a1;
}

.najiz-join-btn {
  background: #fef3c7;
  border: 1px solid #fde68a;
  padding: 6px 12px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.82rem;
  transition: opacity 0.15s ease;
}

.najiz-join-btn:active {
  opacity: 0.7;
}

.min-w-0 {
  min-width: 0;
}

/* Dark Mode Contrast Overrides */
:global([data-theme='dark'] .mobile-sessions-container .client-style-card) {
  background: #0D1929 !important;
  border-color: #c5a028 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
}

:global([data-theme='dark'] .mobile-sessions-container .card-header),
:global([data-theme='dark'] .mobile-sessions-container .card-body) {
  background: #0D1929 !important;
}

:global([data-theme='dark'] .mobile-sessions-container .card-footer) {
  background: #111F31 !important;
  border-top-color: rgba(197, 160, 40, 0.35) !important;
}

:global([data-theme='dark'] .mobile-sessions-container .session-datetime-box) {
  background: #111F31 !important;
  border-color: #26364A !important;
}

:global([data-theme='dark'] .mobile-sessions-container .card-title),
:global([data-theme='dark'] .mobile-sessions-container .value-text),
:global([data-theme='dark'] .mobile-sessions-container .session-datetime-box .text-slate-800) {
  color: #F3F6FA !important;
}

:global([data-theme='dark'] .mobile-sessions-container .label-text) {
  color: #E5B52B !important;
}

:global([data-theme='dark'] .mobile-sessions-container .text-amber-800),
:global([data-theme='dark'] .mobile-sessions-container .text-amber-900) {
  color: #E5B52B !important;
}

:global([data-theme='dark'] .mobile-sessions-container .card-body .text-slate-600) {
  color: #9EACBD !important;
}

:global([data-theme='dark'] .mobile-sessions-container .btn-edit) {
  background: #1e293b !important;
  color: #F3F6FA !important;
}

:global([data-theme='dark'] .mobile-sessions-container .btn-ops) {
  background: #1e3a8a !important;
  color: #93c5fd !important;
}

:global([data-theme='dark'] .mobile-sessions-container .najiz-join-btn) {
  background: rgba(197, 160, 40, 0.2) !important;
  border-color: #c5a028 !important;
  color: #F3F6FA !important;
}
</style>
