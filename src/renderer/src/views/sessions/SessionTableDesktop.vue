<template>
  <v-card elevation="0" class="glass-card min-h-500 glass-card">
    <div class="table-scroll-wrapper">
      <v-data-table-server
        :items-per-page="itemsPerPage"
        :headers="headers"
        :items="safeArray(sessions)"
        :items-length="totalSessions"
        :loading="loading"
        :search="search"
        class="bg-transparent premium-table"
        fixed-header
        height="calc(100vh - 430px)"
        hover
        density="comfortable"
        :items-per-page-options="[10, 25, 50, 100]"
        items-per-page-text="عدد الجلسات لكل صفحة:"
        no-data-text="لا توجد جلسات مجدولة ضمن النطاق المختار"
        loading-text="جاري مزامنة أجندة المواعيد..."
        @update:options="(o) => $emit('update:options', o)"
      >
        <template #[`header.date`]="{ column }">
          <span class="font-weight-black text-gold">{{ column.title }}</span>
        </template>
        <template #[`header.time`]="{ column }">
          <span class="font-weight-black text-gold">{{ column.title }}</span>
        </template>
        <template #[`header.case_number`]="{ column }">
          <span class="font-weight-black text-gold">{{ column.title }}</span>
        </template>
        <template #[`header.client_name`]="{ column }">
          <span class="font-weight-black text-gold">{{ column.title }}</span>
        </template>
        <template #[`header.court_room`]="{ column }">
          <span class="font-weight-black text-gold">{{ column.title }}</span>
        </template>
        <template #[`header.status`]="{ column }">
          <span class="font-weight-black text-gold">{{ column.title }}</span>
        </template>
        <template #[`header.google_sync`]="{ column }">
          <span class="font-weight-black text-gold">{{ column.title }}</span>
        </template>
        <template #[`header.actions`]="{ column }">
          <span class="font-weight-black text-gold">{{ column.title }}</span>
        </template>

        <template #[`item.date`]="{ item }">
          <div class="d-flex flex-column align-center py-3">
            <v-btn
              variant="text"
              color="gold"
              class="px-0 text-body-1 font-weight-black hover-gold"
              @click="$emit('edit', item)"
            >
              {{ item.date ? item.date.split('T')[0] : '' }} م
            </v-btn>
            <span class="text-tiny text-gold opacity-60 font-weight-black"
              >{{ item.date_hijri || '---' }} هـ</span
            >
            <v-btn
              v-if="item.meeting_link"
              color="accent"
              size="x-small"
              variant="flat"
              class="rounded-md px-3 mt-2 font-weight-black premium-lift premium-btn-gold-gradient"
              @click="$emit('open-najiz', item.meeting_link)"
            >
              <LucideIcon name="video" :size="12" class="me-2" /> انضمام مباشر
            </v-btn>
          </div>
        </template>

        <template #[`item.time`]="{ item }">
          <div class="d-flex align-center justify-center">
            <LucideIcon name="clock" :size="14" class="text-gold opacity-50 me-2" />
            <span class="font-weight-black text-white">{{ item.time || '--:--' }}</span>
          </div>
        </template>

        <template #[`item.client_name`]="{ item }">
          <v-btn
            v-if="item.client_id"
            variant="text"
            color="gold"
            class="px-0 text-body-2 font-weight-black opacity-80 hover-gold"
            :to="'/clients/' + item.client_id"
            density="compact"
          >
            {{ item.client_name }}
          </v-btn>
          <div v-else class="text-body-2 font-weight-black text-white opacity-40">
            {{ item.client_name || 'بدون موكل' }}
          </div>
        </template>

        <template #[`item.case_number`]="{ item }">
          <v-btn
            v-if="item.case_id"
            variant="text"
            color="accent"
            class="px-0 text-body-2 font-weight-black hover-gold"
            :to="'/cases/' + item.case_id"
            density="compact"
          >
            {{ item.case_number }}
          </v-btn>
          <div v-else class="text-body-2 font-weight-black text-accent opacity-60">
            {{ item.case_number }}
          </div>
        </template>

        <template #[`item.court_room`]="{ item }">
          <span class="text-body-2 font-weight-black text-white opacity-80">
            {{ item.court_room || '---' }}
          </span>
        </template>

        <template #[`item.status`]="{ item }">
          <v-chip
            :color="getStatusColor(item.status)"
            size="x-small"
            variant="flat"
            class="font-weight-black rounded-md"
            >{{ item.status }}</v-chip
          >
        </template>

        <template #[`item.google_sync`]="{ item }">
          <div class="d-flex align-center justify-center">
            <v-chip
              v-if="item.google_event_id"
              color="success"
              size="x-small"
              variant="tonal"
              class="font-weight-black rounded-md"
            >
              <LucideIcon name="calendar" :size="12" class="me-1" />
              مزامَن 🟢
            </v-chip>
            <v-chip
              v-else
              color="grey"
              size="x-small"
              variant="outlined"
              class="font-weight-medium rounded-md opacity-60"
            >
              غير مزامن
            </v-chip>
          </div>
        </template>

        <template #[`item.session_room`]="{ item }">
          <div class="d-flex justify-center ga-1">
            <v-btn
              icon
              variant="text"
              color="accent"
              size="small"
              class="premium-hover"
              @click="$emit('open-session-room', item)"
            >
              <LucideIcon name="swords" :size="20" />
              <v-tooltip activator="parent" location="top">غرفة العمليات</v-tooltip>
            </v-btn>
            <v-btn
              icon
              variant="text"
              color="primary"
              size="small"
              class="premium-hover"
              @click="$emit('open-session-room-new-window', item)"
            >
              <LucideIcon name="external-link" :size="18" />
              <v-tooltip activator="parent" location="top">فتح في نافذة مستقلة</v-tooltip>
            </v-btn>
          </div>
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-center gap-2">
            <v-btn
              icon
              variant="text"
              color="gold"
              size="small"
              class="premium-hover opacity-70"
              @click="$emit('edit', item)"
            >
              <LucideIcon name="edit-3" :size="18" />
            </v-btn>
            <v-btn
              icon
              variant="text"
              color="error"
              size="small"
              class="premium-hover opacity-70"
              @click="$emit('delete', item)"
            >
              <LucideIcon name="trash-2" :size="18" />
            </v-btn>
          </div>
        </template>

        <template #loading>
          <v-skeleton-loader type="table-row@10" class="bg-transparent"></v-skeleton-loader>
        </template>
      </v-data-table-server>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'
import { safeArray } from '../../utils/safe'
import type { Session } from '../../types/session'

defineProps<{
  sessions: Session[]
  totalSessions: number
  loading: boolean
  search: string
  itemsPerPage: number
}>()

defineEmits<{
  'update:options': [
    options: {
      page: number
      itemsPerPage: number
      sortBy: { key: string; order?: 'asc' | 'desc' }[]
    }
  ]
  edit: [item: any]
  delete: [item: any]
  'open-session-room': [item: any]
  'open-session-room-new-window': [item: any]
  'open-najiz': [link: string]
}>()

const headers = [
  { title: 'موعد الجلسة', key: 'date', align: 'center' as const, width: 140 },
  { title: 'الوقت', key: 'time', align: 'center' as const, width: 80 },
  { title: 'رقم ملف القضية', key: 'case_number', align: 'center' as const, width: 160 },
  { title: 'اسم الموكل', key: 'client_name', align: 'center' as const, width: 150 },
  { title: 'القاعة / الدائرة', key: 'court_room', align: 'center' as const, width: 130 },
  { title: 'حالة الجلسة', key: 'status', align: 'center' as const, width: 100 },
  { title: 'تقويم Google', key: 'google_sync', align: 'center' as const, width: 120 },
  { title: '', key: 'session_room', sortable: false, align: 'center' as const, width: 80 },
  { title: 'إجراءات', key: 'actions', sortable: false, align: 'center' as const, width: 100 }
]

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

<style scoped>
.table-scroll-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.table-scroll-wrapper :deep(.premium-table) {
  overflow: visible !important;
}
</style>
