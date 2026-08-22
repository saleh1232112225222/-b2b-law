<template>
  <div ref="containerRef" class="mobile-tasks-container rtl pa-2">
    <!-- Pull to refresh indicator -->
    <div v-if="isRefreshing" class="mobile-pull-indicator mobile-pull-indicator--active">
      <v-progress-circular indeterminate color="accent" :size="20" :width="2" class="me-2" />
      جاري التحديث...
    </div>

    <!-- Quick Filter Tabs -->
    <div class="filter-pills d-flex align-center gap-1 overflow-x-auto pb-2 mb-2">
      <v-chip
        v-for="tab in filterTabs"
        :key="tab.key"
        size="small"
        :color="activeFilter === tab.key ? 'accent' : 'grey'"
        :variant="activeFilter === tab.key ? 'flat' : 'tonal'"
        class="font-weight-black cursor-pointer px-3 flex-shrink-0"
        @click="activeFilter = tab.key"
      >
        {{ tab.label }}
        <span class="ms-1 opacity-70">({{ getFilterCount(tab.key) }})</span>
      </v-chip>
    </div>

    <!-- Loading State -->
    <div v-if="loading && (!items || items.length === 0)" class="d-flex justify-center pa-8">
      <v-progress-circular indeterminate color="primary" :size="40" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!loading && filteredItems.length === 0"
      class="text-center pa-8 client-style-card rounded-2xl mx-1 my-4"
    >
      <v-icon icon="mdi-clipboard-check-outline" :size="56" color="accent" class="mb-3 opacity-60" />
      <div class="text-subtitle-1 font-weight-black text-slate-800 mb-1">لا توجد مهام</div>
      <div class="text-caption text-slate-500 mb-4">
        لم يتم العثور على مهام ضمن التصفية الحالية
      </div>
      <v-btn
        color="accent"
        variant="flat"
        class="rounded-xl font-weight-black premium-btn-gold-gradient px-6"
        @click="emit('add')"
      >
        <v-icon icon="mdi-plus" class="me-2" />
        إضافة مهمة جديدة
      </v-btn>
    </div>

    <!-- Tasks List -->
    <template v-else>
      <div class="tasks-list">
        <v-card
          v-for="task in filteredItems"
          :key="task.id"
          class="client-style-card mb-3 rounded-2xl overflow-hidden"
          elevation="0"
          @click="emit('edit', task)"
        >
          <!-- 1. Header Row -->
          <div class="card-header d-flex justify-space-between align-center px-4 py-3">
            <div class="d-flex align-center gap-2 min-w-0">
              <v-icon
                :icon="task.status === 'completed' ? 'mdi-checkbox-marked-circle' : 'mdi-clipboard-text-outline'"
                :color="task.status === 'completed' ? 'success' : 'accent'"
                size="20"
                class="flex-shrink-0"
              />
              <span
                class="card-title text-subtitle-1 font-weight-black text-slate-800 text-truncate"
                :class="{ 'text-decoration-line-through opacity-60': task.status === 'completed' }"
              >
                {{ task.title || 'مهمة بدون عنوان' }}
              </span>
            </div>

            <div class="d-flex align-center gap-1.5 flex-shrink-0">
              <span v-if="task.priority" class="badge-priority" :class="getPriorityBadgeClass(task.priority)">
                {{ task.priority }}
              </span>
              <span class="badge-status" :class="getStatusBadgeClass(task.status)">
                {{ getStatusLabel(task.status) }}
              </span>
            </div>
          </div>

          <!-- 2. Body Details -->
          <div class="card-body px-4 py-3">
            <!-- Related Entities (Pills) -->
            <div
              v-if="task.case_number || task.client_name || task.context_label"
              class="d-flex flex-wrap align-center gap-1.5 mb-2"
            >
              <v-chip
                v-if="task.case_number"
                size="small"
                color="primary"
                variant="tonal"
                class="font-weight-bold rounded-lg clickable-pill"
                @click.stop="goToCase(task.case_id)"
              >
                <v-icon icon="mdi-scale-balance" size="14" class="me-1 text-gold" />
                <span>قضية: {{ task.case_number }}</span>
              </v-chip>

              <v-chip
                v-if="task.client_name"
                size="small"
                color="success"
                variant="tonal"
                class="font-weight-bold rounded-lg"
              >
                <v-icon icon="mdi-account-tie" size="14" class="me-1" />
                <span>موكل: {{ task.client_name }}</span>
              </v-chip>

              <v-chip
                v-if="task.context_label"
                size="small"
                color="warning"
                variant="tonal"
                class="font-weight-bold rounded-lg"
              >
                <v-icon icon="mdi-link-variant" size="14" class="me-1" />
                <span>{{ task.context_label }}</span>
              </v-chip>
            </div>

            <!-- Task Description / Notes -->
            <div class="task-description-box rounded-xl pa-2.5 mb-2">
              <p class="text-caption font-weight-medium text-slate-700 mb-0 leading-relaxed text-wrap">
                {{ task.description || 'لا يوجد وصف تشغيلي متاح' }}
              </p>
            </div>

            <!-- Assignee & Due Date Row -->
            <div class="d-flex align-center justify-space-between text-caption pt-1 flex-wrap gap-2">
              <div class="d-flex align-center gap-1">
                <span class="label-text">المسؤول:</span>
                <span class="value-text font-weight-bold text-slate-800">{{ task.responsible_name || 'غير محدد' }}</span>
              </div>

              <div
                v-if="task.due_date"
                class="d-flex align-center gap-1 font-weight-black"
                :class="isOverdue(task.due_date, task.status) ? 'text-red-600' : 'text-slate-700'"
              >
                <v-icon
                  :icon="isOverdue(task.due_date, task.status) ? 'mdi-clock-alert-outline' : 'mdi-calendar-clock'"
                  size="15"
                  :color="isOverdue(task.due_date, task.status) ? 'error' : 'accent'"
                />
                <span>الموعد: {{ formatDate(task.due_date) }}</span>
                <span v-if="isOverdue(task.due_date, task.status)" class="badge-overdue ms-1">
                  متأخرة
                </span>
              </div>
            </div>
          </div>

          <!-- 3. Footer Row -->
          <div class="card-footer d-flex align-center justify-space-between px-4 py-2.5">
            <!-- Left Actions -->
            <div class="d-flex align-center gap-2">
              <!-- Edit Button -->
              <button
                type="button"
                class="action-btn-icon btn-edit"
                title="تعديل المهمة"
                @click.stop="emit('edit', task)"
              >
                <v-icon icon="mdi-pencil-outline" size="18" />
              </button>

              <!-- Complete Button (if not completed) -->
              <v-btn
                v-if="task.status !== 'completed' && task.status !== 'cancelled' && task.status !== 'closed'"
                size="small"
                color="success"
                variant="flat"
                class="rounded-lg font-weight-black px-3"
                @click.stop="emit('complete', task)"
              >
                <v-icon icon="mdi-check" size="16" class="me-1" />
                إكمال المهمة
              </v-btn>

              <!-- Session Screen Button if applicable -->
              <v-btn
                v-if="isSessionRelated(task)"
                size="small"
                variant="tonal"
                color="accent"
                class="rounded-lg font-weight-bold px-2"
                @click.stop="goToSessions"
              >
                <v-icon icon="mdi-gavel" size="14" class="me-1" />
                الجلسات
              </v-btn>
            </div>

            <!-- More Actions Menu -->
            <v-menu location="bottom end">
              <template #activator="{ props: menuProps }">
                <button
                  v-bind="menuProps"
                  type="button"
                  class="action-btn-icon btn-edit"
                  @click.stop
                >
                  <v-icon icon="mdi-dots-vertical" size="18" />
                </button>
              </template>
              <v-list density="compact" class="rounded-xl border shadow-sm">
                <v-list-item
                  v-if="task.status !== 'completed' && task.status !== 'cancelled' && task.status !== 'closed'"
                  @click="emit('complete', task)"
                >
                  <template #prepend>
                    <v-icon icon="mdi-check-circle-outline" size="18" color="success" class="me-2" />
                  </template>
                  <v-list-item-title class="font-weight-black">إكمال المهمة</v-list-item-title>
                </v-list-item>

                <v-list-item
                  v-if="canCancel && task.status !== 'cancelled' && task.status !== 'closed'"
                  @click="emit('cancel', task)"
                >
                  <template #prepend>
                    <v-icon icon="mdi-close-circle-outline" size="18" color="error" class="me-2" />
                  </template>
                  <v-list-item-title class="font-weight-black">إلغاء المهمة</v-list-item-title>
                </v-list-item>

                <v-list-item
                  v-if="canClose && task.status !== 'closed'"
                  @click="emit('close', task)"
                >
                  <template #prepend>
                    <v-icon icon="mdi-lock-outline" size="18" color="warning" class="me-2" />
                  </template>
                  <v-list-item-title class="font-weight-black">إقفال المهمة</v-list-item-title>
                </v-list-item>

                <v-list-item
                  v-if="canArchive"
                  @click="emit('archive', task)"
                >
                  <template #prepend>
                    <v-icon icon="mdi-archive-outline" size="18" color="info" class="me-2" />
                  </template>
                  <v-list-item-title class="font-weight-black">أرشفة المهمة</v-list-item-title>
                </v-list-item>

                <v-list-item
                  v-if="canReopen && task.status === 'completed'"
                  @click="emit('reopen', task)"
                >
                  <template #prepend>
                    <v-icon icon="mdi-refresh" size="18" color="accent" class="me-2" />
                  </template>
                  <v-list-item-title class="font-weight-black">إعادة فتح المهمة</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </v-card>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePullToRefresh } from '../../composables/usePullToRefresh'

const props = withDefaults(
  defineProps<{
    items: any[]
    loading: boolean
    canCancel?: boolean
    canClose?: boolean
    canArchive?: boolean
    canReopen?: boolean
  }>(),
  {
    canCancel: true,
    canClose: true,
    canArchive: true,
    canReopen: true
  }
)

const emit = defineEmits<{
  edit: [task: any]
  add: []
  complete: [task: any]
  cancel: [task: any]
  close: [task: any]
  archive: [task: any]
  reopen: [task: any]
  'view-case': [caseId: string]
  refresh: []
}>()

const router = useRouter()
const containerRef = ref<HTMLElement | null>(null)
const activeFilter = ref<'all' | 'in_progress' | 'high_priority' | 'overdue' | 'completed'>('all')

const filterTabs = [
  { key: 'all' as const, label: 'الكل' },
  { key: 'in_progress' as const, label: 'قيد التنفيذ' },
  { key: 'high_priority' as const, label: 'أولوية عالية' },
  { key: 'overdue' as const, label: 'متأخرة' },
  { key: 'completed' as const, label: 'مكتملة' }
]

const { isRefreshing } = usePullToRefresh(containerRef, async () => {
  emit('refresh')
})

const isOverdue = (date: string, status: string): boolean => {
  if (!date || status === 'completed' || status === 'cancelled' || status === 'closed') return false
  return new Date(date) < new Date()
}

const getFilterCount = (key: string): number => {
  if (!props.items) return 0
  switch (key) {
    case 'in_progress':
      return props.items.filter((t: any) => t.status === 'in_progress' || t.status === 'draft' || t.status === 'scheduled').length
    case 'high_priority':
      return props.items.filter((t: any) => t.priority === 'عالية').length
    case 'overdue':
      return props.items.filter((t: any) => isOverdue(t.due_date, t.status)).length
    case 'completed':
      return props.items.filter((t: any) => t.status === 'completed').length
    default:
      return props.items.length
  }
}

const filteredItems = computed(() => {
  if (!props.items) return []
  switch (activeFilter.value) {
    case 'in_progress':
      return props.items.filter((t: any) => t.status === 'in_progress' || t.status === 'draft' || t.status === 'scheduled')
    case 'high_priority':
      return props.items.filter((t: any) => t.priority === 'عالية')
    case 'overdue':
      return props.items.filter((t: any) => isOverdue(t.due_date, t.status))
    case 'completed':
      return props.items.filter((t: any) => t.status === 'completed')
    default:
      return props.items
  }
})

const getPriorityBadgeClass = (priority?: string): string => {
  switch (priority) {
    case 'عالية':
      return 'badge-priority-high'
    case 'متوسطة':
      return 'badge-priority-medium'
    case 'منخفضة':
      return 'badge-priority-low'
    default:
      return 'badge-priority-medium'
  }
}

const getStatusBadgeClass = (status?: string): string => {
  switch (status) {
    case 'completed':
      return 'badge-status-success'
    case 'in_progress':
      return 'badge-status-active'
    case 'scheduled':
      return 'badge-status-study'
    case 'waiting':
    case 'blocked':
      return 'badge-status-warning'
    default:
      return 'badge-status-default'
  }
}

const getStatusLabel = (status?: string): string => {
  switch (status) {
    case 'completed':
      return 'مكتملة'
    case 'in_progress':
      return 'قيد التنفيذ'
    case 'scheduled':
      return 'مجدولة'
    case 'draft':
      return 'مسودة'
    case 'waiting':
      return 'بانتظار طرف'
    case 'blocked':
      return 'معلقة'
    case 'closed':
      return 'مغلقة'
    case 'cancelled':
      return 'ملغاة'
    default:
      return status || 'قيد التنفيذ'
  }
}

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return ''
  try {
    const raw = String(dateStr).split('T')[0]
    return raw
  } catch {
    return dateStr
  }
}

const isSessionRelated = (task: any): boolean => {
  const text = `${task.title || ''} ${task.description || ''} ${task.context_label || ''}`
  return text.includes('جلسة') || text.includes('الجلسة') || text.includes('الجلسات')
}

const goToCase = (caseId?: string): void => {
  if (caseId) {
    router.push(`/cases/${caseId}`)
  }
}

const goToSessions = (): void => {
  router.push('/sessions')
}
</script>

<style scoped>
.mobile-tasks-container {
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
.badge-priority {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 0.72rem;
  font-weight: 800;
}

.badge-priority-high {
  background: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fca5a5;
}

.badge-priority-medium {
  background: #fef3c7;
  color: #b45309;
  border: 1px solid #fde68a;
}

.badge-priority-low {
  background: #e0f2fe;
  color: #0369a1;
  border: 1px solid #bae6fd;
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

.badge-status-study {
  background: #2563eb;
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

.badge-status-default {
  background: #475569;
  color: #ffffff;
}

.badge-overdue {
  background: #dc2626;
  color: #ffffff;
  padding: 1px 6px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 900;
}

/* Card Body */
.card-body {
  background: #ffffff;
}

.task-description-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
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

.text-red-600 {
  color: #dc2626 !important;
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

.btn-edit {
  background: #e2e8f0;
  color: #334155;
}

.clickable-pill {
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.clickable-pill:active {
  opacity: 0.7;
}

.min-w-0 {
  min-width: 0;
}

.leading-relaxed {
  line-height: 1.6;
}

/* Dark Mode Contrast Overrides */
:global([data-theme='dark']) .client-style-card {
  background: #0D1929 !important;
  border-color: #c5a028 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
}

:global([data-theme='dark']) .card-header,
:global([data-theme='dark']) .card-body {
  background: #0D1929 !important;
}

:global([data-theme='dark']) .card-footer {
  background: #111F31 !important;
  border-top-color: rgba(197, 160, 40, 0.35) !important;
}

:global([data-theme='dark']) .task-description-box {
  background: #111F31 !important;
  border-color: #26364A !important;
  color: #F3F6FA !important;
}

:global([data-theme='dark']) .card-title,
:global([data-theme='dark']) .value-text {
  color: #F3F6FA !important;
}

:global([data-theme='dark']) .label-text {
  color: #9EACBD !important;
}

:global([data-theme='dark']) .btn-edit {
  background: #1e293b !important;
  color: #F3F6FA !important;
}
</style>
