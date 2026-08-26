<template>
  <div ref="containerRef" class="mobile-memoranda-container rtl pa-2">
    <!-- Pull to refresh indicator -->
    <div v-if="isRefreshing" class="mobile-pull-indicator mobile-pull-indicator--active">
      <v-progress-circular indeterminate color="accent" :size="20" :width="2" class="me-2" />
      جاري التحديث...
    </div>

    <!-- Search & Quick Filters -->
    <div class="mb-3">
      <v-text-field
        v-model="localSearch"
        placeholder="بحث في المذكرات، رقم القضية، أو الأطراف..."
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="mb-2 client-search-input"
      >
        <template #prepend-inner>
          <v-icon icon="mdi-magnify" size="20" color="accent" />
        </template>
      </v-text-field>

      <!-- Filter chips -->
      <div class="d-flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <v-chip
          size="small"
          :variant="selectedStatus === null ? 'flat' : 'outlined'"
          :color="selectedStatus === null ? 'accent' : 'default'"
          class="font-weight-bold"
          @click="selectedStatus = null"
        >
          الكل ({{ items.length }})
        </v-chip>
        <v-chip
          v-for="st in statusList"
          :key="st"
          size="small"
          :variant="selectedStatus === st ? 'flat' : 'outlined'"
          :color="selectedStatus === st ? 'accent' : 'default'"
          class="font-weight-bold"
          @click="selectedStatus = selectedStatus === st ? null : st"
        >
          {{ st }}
        </v-chip>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading && (!items || items.length === 0)" class="d-flex justify-center pa-8">
      <v-progress-circular indeterminate color="primary" :size="40" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!loading && displayedItems.length === 0"
      class="text-center pa-8 client-style-card rounded-2xl mx-1 my-4"
    >
      <v-icon icon="mdi-file-document-outline" :size="56" color="accent" class="mb-3 opacity-60" />
      <div class="text-subtitle-1 font-weight-black text-slate-800 mb-1">لا توجد مذكرات أو لوائح</div>
      <div class="text-caption text-slate-500 mb-4">
        {{ localSearch ? 'لم يتم العثور على مذكرات مطابقة للبحث' : 'لم يتم تسجيل أي مذكرات أو لوائح قضائية بعد' }}
      </div>
      <v-btn
        color="accent"
        variant="flat"
        class="rounded-xl font-weight-black premium-btn-gold-gradient px-6"
        @click="emit('add')"
      >
        <v-icon icon="mdi-plus" class="me-2" />
        إنشاء مذكرة جديدة
      </v-btn>
    </div>

    <!-- Memoranda Cards List -->
    <template v-else>
      <div class="memoranda-list">
        <v-card
          v-for="item in displayedItems"
          :key="item.id"
          class="client-style-card mb-3 rounded-2xl overflow-hidden"
          elevation="0"
          @click="emit('preview', item)"
        >
          <!-- 1. Header Row -->
          <div class="card-header d-flex justify-space-between align-center px-4 py-3">
            <div class="d-flex align-center gap-2 min-w-0">
              <v-icon :icon="getMemoIcon(item.memo_type)" size="20" color="accent" class="flex-shrink-0" />
              <span class="card-title text-subtitle-1 font-weight-black text-slate-800 text-truncate">
                {{ item.memo_title || item.title || 'مذكرة بدون عنوان' }}
              </span>
            </div>

            <div class="d-flex align-center gap-1.5 flex-shrink-0">
              <span v-if="item.memo_type || item.memo_label" class="badge-type text-truncate">
                {{ item.memo_label || item.memo_type }}
              </span>
              <span class="badge-status" :class="getStatusBadgeClass(item.memo_status)">
                {{ item.memo_status || 'مسودة' }}
              </span>
            </div>
          </div>

          <!-- 2. Body Details -->
          <div class="card-body px-4 py-3">
            <!-- Case Number -->
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="d-flex align-center gap-1.5">
                <v-icon icon="mdi-briefcase-outline" size="16" color="accent" />
                <span class="label-text">القضية:</span>
                <span class="value-text font-weight-black text-slate-900">
                  {{ item.case_number || 'مستقلة / بدون قضية' }}
                </span>
              </div>
            </div>

            <!-- Client vs Opponent if available -->
            <div
              v-if="item.client_name || item.opponent_name"
              class="memo-parties-box rounded-xl pa-2.5 mb-2"
            >
              <div class="d-flex align-center justify-space-between text-caption mb-1">
                <span class="text-medium-emphasis">الموكل:</span>
                <span class="font-weight-black text-slate-900 text-truncate" style="max-width: 200px">
                  {{ item.client_name || '-' }}
                </span>
              </div>
              <div class="d-flex align-center justify-space-between text-caption">
                <span class="text-medium-emphasis">الخصم:</span>
                <span class="font-weight-bold text-error text-truncate" style="max-width: 200px">
                  {{ item.opponent_name || '-' }}
                </span>
              </div>
            </div>

            <!-- Date Box -->
            <div class="memo-date-box rounded-xl pa-2 d-flex align-center justify-space-between">
              <div class="d-flex align-center gap-1.5">
                <v-icon icon="mdi-calendar" size="16" color="accent" />
                <span class="label-text">تاريخ المذكرة:</span>
              </div>
              <span class="text-caption font-weight-bold text-slate-800">
                {{ formatMemoDate(item.memo_date || item.created_at) }}
              </span>
            </div>
          </div>

          <!-- 3. Footer Actions Row -->
          <div class="card-footer d-flex align-center justify-space-between px-4 py-2.5 gap-2">
            <!-- Action buttons -->
            <div class="d-flex align-center gap-2">
              <button
                type="button"
                class="action-btn-icon btn-preview"
                title="معاينة"
                @click.stop="emit('preview', item)"
              >
                <v-icon icon="mdi-eye-outline" size="18" />
              </button>
              <button
                type="button"
                class="action-btn-icon btn-edit"
                title="تعديل المذكرة"
                @click.stop="emit('edit', item)"
              >
                <v-icon icon="mdi-pencil-outline" size="18" />
              </button>
              <button
                type="button"
                class="action-btn-icon btn-print"
                title="طباعة"
                @click.stop="emit('print', item)"
              >
                <v-icon icon="mdi-printer-outline" size="18" />
              </button>
              <button
                type="button"
                class="action-btn-icon btn-delete"
                title="حذف المذكرة"
                @click.stop="emit('delete', item)"
              >
                <v-icon icon="mdi-trash-can-outline" size="18" />
              </button>
            </div>

            <!-- Quick Read Action -->
            <v-btn
              size="x-small"
              variant="tonal"
              color="accent"
              class="font-weight-black rounded-lg"
              @click.stop="emit('preview', item)"
            >
              معاينة سريعة
            </v-btn>
          </div>
        </v-card>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePullToRefresh } from '../../composables/usePullToRefresh'

const props = defineProps<{
  items: any[]
  loading: boolean
}>()

const emit = defineEmits<{
  add: []
  edit: [item: any]
  preview: [item: any]
  delete: [item: any]
  print: [item: any]
  refresh: []
}>()

const containerRef = ref<HTMLElement | null>(null)
const localSearch = ref('')
const selectedStatus = ref<string | null>(null)

const { isRefreshing } = usePullToRefresh(containerRef, async () => {
  emit('refresh')
})

const statusList = ['مسودة', 'معتمدة', 'مودعة', 'ملغاة']

const displayedItems = computed(() => {
  let list = props.items || []

  if (selectedStatus.value) {
    list = list.filter((item) => (item.memo_status || 'مسودة') === selectedStatus.value)
  }

  if (localSearch.value.trim()) {
    const q = localSearch.value.trim().toLowerCase()
    list = list.filter((item) => {
      const title = (item.memo_title || item.title || '').toLowerCase()
      const caseNum = (item.case_number || '').toLowerCase()
      const client = (item.client_name || '').toLowerCase()
      const opponent = (item.opponent_name || '').toLowerCase()
      const text = (item.memo_text || '').toLowerCase()
      return title.includes(q) || caseNum.includes(q) || client.includes(q) || opponent.includes(q) || text.includes(q)
    })
  }

  return list
})

const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'معتمدة':
    case 'مودعة':
      return 'badge-status-success'
    case 'مسودة':
      return 'badge-status-warning'
    case 'ملغاة':
      return 'badge-status-danger'
    default:
      return 'badge-status-default'
  }
}

const getMemoIcon = (type: string): string => {
  switch (type) {
    case 'صحيفة دعوى':
      return 'mdi-file-plus-outline'
    case 'مذكرة جوابية':
      return 'mdi-file-document-edit-outline'
    case 'مذكرة استئناف':
      return 'mdi-scale-balance'
    case 'لائحة اعتراضية':
      return 'mdi-alert-circle-outline'
    case 'مذكرة رد':
      return 'mdi-reply'
    default:
      return 'mdi-file-document-outline'
  }
}

const formatMemoDate = (dateStr?: string): string => {
  if (!dateStr) return '---'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toISOString().split('T')[0] + ' مـ'
  } catch {
    return dateStr
  }
}
</script>

<style scoped>
.mobile-memoranda-container {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

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

.card-header {
  border-bottom: 1px solid rgba(197, 160, 40, 0.35);
}

.card-title {
  color: #1e293b;
  font-size: 0.95rem;
}

.badge-type {
  background: rgba(197, 160, 40, 0.15);
  color: #854d0e;
  border: 1px solid rgba(197, 160, 40, 0.4);
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 0.72rem;
  font-weight: 800;
  max-width: 110px;
}

.badge-status {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.72rem;
  font-weight: 800;
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

.memo-parties-box,
.memo-date-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.card-footer {
  border-top: 1px solid rgba(197, 160, 40, 0.35);
  background: #fafaf9;
}

.action-btn-icon {
  width: 34px;
  height: 34px;
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

.btn-preview {
  background: #e0f2fe;
  color: #0369a1;
}

.btn-print {
  background: #fef3c7;
  color: #92400e;
}

.min-w-0 {
  min-width: 0;
}

/* Dark Mode Overrides */
:global([data-theme='dark'] .mobile-memoranda-container .client-style-card) {
  background: #0D1929 !important;
  border-color: #c5a028 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
}

:global([data-theme='dark'] .mobile-memoranda-container .card-header),
:global([data-theme='dark'] .mobile-memoranda-container .card-body) {
  background: #0D1929 !important;
}

:global([data-theme='dark'] .mobile-memoranda-container .card-footer) {
  background: #111F31 !important;
  border-top-color: rgba(197, 160, 40, 0.35) !important;
}

:global([data-theme='dark'] .mobile-memoranda-container .memo-parties-box),
:global([data-theme='dark'] .mobile-memoranda-container .memo-date-box) {
  background: #111F31 !important;
  border-color: #26364A !important;
}

:global([data-theme='dark'] .mobile-memoranda-container .card-title),
:global([data-theme='dark'] .mobile-memoranda-container .value-text),
:global([data-theme='dark'] .mobile-memoranda-container .memo-date-box .text-slate-800) {
  color: #F3F6FA !important;
}

:global([data-theme='dark'] .mobile-memoranda-container .label-text) {
  color: #E5B52B !important;
}

:global([data-theme='dark'] .mobile-memoranda-container .btn-edit) {
  background: #1e293b !important;
  color: #F3F6FA !important;
}

:global([data-theme='dark'] .mobile-memoranda-container .btn-preview) {
  background: #1e3a8a !important;
  color: #93c5fd !important;
}

:global([data-theme='dark'] .mobile-memoranda-container .btn-print) {
  background: rgba(197, 160, 40, 0.2) !important;
  color: #E5B52B !important;
}
</style>
