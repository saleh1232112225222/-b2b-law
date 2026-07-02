<template>
  <v-data-table-server
    v-model:items-per-page="localPageSize"
    :headers="headers"
    :items="items"
    :loading="loading"
    :items-length="total"
    class="bg-transparent cases-table"
    fixed-header
    height="calc(100vh - 360px)"
    hover
    density="comfortable"
    :items-per-page-options="[10, 25, 50, 100]"
    items-per-page-text="عدد القضايا لكل صفحة:"
    no-data-text="لا يوجد قضايا مطابقة للمدخلات الحالية"
    loading-text="جاري مزامنة ملفات القضايا..."
    @update:options="$emit('updateOptions', $event)"
  >
    <template #[`item.case_number`]="{ item }">
      <v-btn
        variant="text"
        color="accent"
        class="px-0 font-weight-black text-body-2"
        :to="'/cases/' + item.id"
      >
        {{ item.case_number }}
      </v-btn>
    </template>
    <template #[`item.client_name`]="{ item }">
      <div class="d-flex flex-column">
        <div class="d-flex align-center flex-wrap ga-1">
          <v-btn
            v-if="getCaseClientId(item)"
            variant="text"
            color="accent"
            class="px-0 font-weight-black text-body-2"
            :to="'/clients/' + getCaseClientId(item)"
            density="compact"
          >
            {{ getCaseClientName(item) || 'بدون موكل' }}
          </v-btn>
          <div v-else class="font-weight-black text-body-2 text-accent">
            {{ getCaseClientName(item) || 'بدون موكل' }}
          </div>
          <span
            v-if="getCaseOpponentsCount(item) > 0"
            class="text-caption font-weight-black text-error mx-1"
            >ضد</span
          >
          <div v-if="getCaseOpponentName(item)" class="text-body-2 font-weight-bold text-ebony">
            {{ getCaseOpponentName(item) }}
          </div>
          <div v-else class="text-caption font-weight-bold text-grey-darken-1 opacity-70">
            بدون خصم
          </div>
        </div>
        <div
          v-if="getCaseExtraPartiesCount(item) > 0"
          class="text-caption font-weight-bold text-grey-darken-1 opacity-70 mt-1"
        >
          +{{ getCaseExtraPartiesCount(item) }} أطراف إضافية
        </div>
      </div>
    </template>
    <template #[`item.status`]="{ item }">
      <v-chip
        :color="getStatusColor(item.status)"
        size="small"
        variant="flat"
        class="font-weight-black rounded-lg shadow-sm"
        >{{ item.status }}</v-chip
      >
    </template>
    <template #[`item.responsible_name`]="{ item }">
      <div class="d-flex align-center text-body-2 font-weight-bold text-ebony">
        <LucideIcon name="user-check" :size="16" class="me-2 text-accent" />
        {{ item.responsible_name || 'غير محدد' }}
      </div>
    </template>
    <template #[`item.priority`]="{ item }">
      <v-chip
        :color="getPriorityColor(item.priority)"
        size="small"
        variant="tonal"
        class="font-weight-black rounded-lg border"
      >
        <LucideIcon name="flag" :size="14" class="me-1" /> {{ item.priority }}
      </v-chip>
    </template>
    <template #[`item.subject`]="{ item }">
      <div class="text-body-2 font-weight-bold text-ebony text-truncate" style="max-width: 300px">
        {{ item.subject || '—' }}
      </div>
    </template>
    <template #[`item.sub_classification`]="{ item }">
      <div class="text-body-2 font-weight-bold text-ebony">
        {{ item.sub_classification || '—' }}
      </div>
    </template>
    <template #[`item.case_type`]="{ item }">
      <div class="text-body-2 font-weight-bold text-ebony">
        {{ item.case_type || '—' }}
      </div>
    </template>
    <template #[`item.court`]="{ item }">
      <div class="text-body-2 font-weight-bold text-ebony">
        {{ item.court || '—' }}
      </div>
    </template>
    <template #[`item.phase`]="{ item }">
      <div class="text-body-2 font-weight-bold text-ebony">
        {{ item.phase || '—' }}
      </div>
    </template>
    <template #[`item.registration_date`]="{ item }">
      <div class="d-flex flex-column align-start">
        <div class="text-body-2 font-weight-black text-accent">
          {{ formatGregorianDate(item.registration_date) }} م
        </div>
        <div class="text-caption font-weight-bold text-grey-darken-1 mt-1">
          {{ item.registration_date_hijri }} هـ
        </div>
      </div>
    </template>
    <template #[`item.actions`]="{ item }">
      <div class="d-flex justify-end">
        <v-menu location="bottom" :close-on-content-click="true" transition="slide-y-transition">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon
              variant="tonal"
              color="primary"
              size="small"
              class="rounded-lg glass-card shadow-sm premium-btn-gold-gradient"
            >
              <LucideIcon name="more-vertical" :size="18" />
            </v-btn>
          </template>
          <v-list density="compact" class="py-2 glass-card border-0">
            <v-list-item :to="'/cases/' + item.id" class="rounded-lg mx-1 mb-1">
              <template #prepend
                ><LucideIcon name="eye" :size="18" class="text-info me-2"
              /></template>
              <v-list-item-title class="font-weight-black text-subtitle-2">عرض</v-list-item-title>
            </v-list-item>
            <v-list-item class="rounded-lg mx-1 mb-1" @click="$emit('edit', item)">
              <template #prepend
                ><LucideIcon name="edit-3" :size="18" class="text-primary me-2"
              /></template>
              <v-list-item-title class="font-weight-black text-subtitle-2">تعديل</v-list-item-title>
            </v-list-item>
            <v-divider class="my-1 opacity-10" />
            <v-list-item class="rounded-lg mx-1" @click="$emit('delete', item)">
              <template #prepend
                ><LucideIcon name="trash-2" :size="18" class="text-error me-2"
              /></template>
              <v-list-item-title class="font-weight-black text-subtitle-2">حذف</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </template>
    <template #loading>
      <v-skeleton-loader type="table-row-divider@10" class="bg-transparent" />
    </template>
  </v-data-table-server>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import LucideIcon from '../../components/common/LucideIcon.vue'

const props = defineProps<{
  items: any[]
  loading: boolean
  total: number
  pageSize: number
}>()

const emit = defineEmits<{
  edit: [item: any]
  delete: [item: any]
  updateOptions: [options: { page: number; itemsPerPage: number }]
}>()

const localPageSize = ref(props.pageSize)
watch(
  () => props.pageSize,
  (v) => {
    localPageSize.value = v
  }
)
watch(localPageSize, (v) => {
  emit('updateOptions', { page: 1, itemsPerPage: v })
})

const headers = [
  {
    title: 'رقم ملف القضية',
    key: 'case_number',
    align: 'start' as const,
    width: 130,
    minWidth: 130
  },
  { title: 'الأولوية', key: 'priority', align: 'center' as const, width: 80, minWidth: 80 },
  { title: 'الموضوع', key: 'subject', align: 'start' as const, minWidth: 200 },
  { title: 'أطراف القضية', key: 'client_name', align: 'start' as const, minWidth: 280 },
  {
    title: 'مسؤول القضية',
    key: 'responsible_name',
    align: 'start' as const,
    width: 130,
    minWidth: 130
  },
  {
    title: 'التصنيف',
    key: 'sub_classification',
    align: 'start' as const,
    width: 130,
    minWidth: 130
  },
  { title: 'نوع الدعوى', key: 'case_type', align: 'start' as const, width: 120, minWidth: 120 },
  { title: 'المحكمة', key: 'court', align: 'start' as const, width: 130, minWidth: 130 },
  { title: 'المرحلة', key: 'phase', align: 'center' as const, width: 110, minWidth: 110 },
  { title: 'حالة القضية', key: 'status', align: 'center' as const, width: 110, minWidth: 110 },
  {
    title: 'تاريخ التسجيل',
    key: 'registration_date',
    align: 'start' as const,
    width: 140,
    minWidth: 140
  },
  {
    title: 'إجراءات',
    key: 'actions',
    sortable: false,
    align: 'end' as const,
    width: 100,
    minWidth: 100
  }
]

const getCaseParties = (item: any): any[] => (Array.isArray(item?.parties) ? item.parties : [])
const getCaseClientId = (item: any): string =>
  getCaseParties(item).find((x: any) => x?.party_type === 'client')?.client_id ||
  item?.client_id ||
  ''
const getCaseClientName = (item: any): string =>
  getCaseParties(item).find((x: any) => x?.party_type === 'client')?.name || item?.client_name || ''
const getCaseOpponentName = (item: any): string =>
  getCaseParties(item).find((x: any) => x?.party_type && x?.party_type !== 'client')?.name ||
  item?.opponent_name ||
  ''
const getCaseOpponentsCount = (item: any): number =>
  getCaseParties(item).filter((x: any) => x?.party_type && x?.party_type !== 'client').length
const getCaseExtraPartiesCount = (item: any): number => Math.max(0, getCaseParties(item).length - 2)

const formatGregorianDate = (dateStr?: string): string => {
  if (!dateStr) return '—'
  return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
}

const getStatusColor = (status: string): string => {
  const map: Record<string, string> = {
    'قيد النظر': 'success',
    'تحت الدراسة': 'info',
    معلقة: 'warning',
    'موقفة بطلب من أطراف الدعوى': 'warning',
    'محكومة بحكم غير نهائي': 'indigo',
    'محكومة بحكم نهائي': 'error',
    منتهية: 'error',
    'كأن لم تكن': 'grey-darken-1',
    مغلقة: 'error',
    مؤرشفة: 'grey-darken-1'
  }
  return map[status] || 'indigo'
}

const getPriorityColor = (priority: string): string => {
  const map: Record<string, string> = {
    عالية: 'error',
    متوسط: 'warning',
    متوسطة: 'warning',
    منخفض: 'success',
    منخفضة: 'success',
    حرجة: 'red-darken-4'
  }
  return map[priority] || 'grey'
}
</script>
