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
      <v-progress-circular indeterminate color="accent" :size="40" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!loading && filteredItems.length === 0"
      class="text-center pa-8 glass-card rounded-2xl mx-1 my-4"
    >
      <v-icon icon="mdi-clipboard-check-outline" :size="56" color="accent" class="mb-3 opacity-60" />
      <div class="text-subtitle-1 text-gold font-weight-black mb-1">لا توجد مهام</div>
      <div class="text-caption text-medium-emphasis mb-4">
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
          class="task-mobile-card mb-3 rounded-2xl overflow-hidden glass-card"
          variant="outlined"
          :class="getCardBorderClass(task)"
          @click="emit('edit', task)"
        >
          <div class="pa-3 pa-sm-4">
            <!-- 1. Header: Title + Priority + Status -->
            <div class="d-flex justify-space-between align-start mb-2 pb-2 border-b-subtle gap-2">
              <div class="d-flex align-start gap-2 min-w-0">
                <v-icon
                  :icon="task.status === 'completed' ? 'mdi-checkbox-marked-circle' : 'mdi-clipboard-text-outline'"
                  :color="task.status === 'completed' ? 'success' : 'accent'"
                  size="20"
                  class="mt-0.5 flex-shrink-0"
                />
                <div class="d-flex flex-column min-w-0">
                  <span
                    class="text-subtitle-2 font-weight-black text-gold text-truncate-2"
                    :class="{ 'text-decoration-line-through opacity-60': task.status === 'completed' }"
                  >
                    {{ task.title || 'مهمة بدون عنوان' }}
                  </span>
                </div>
              </div>

              <!-- Badges -->
              <div class="d-flex align-center gap-1 flex-shrink-0">
                <v-chip
                  v-if="task.priority"
                  size="x-small"
                  :color="getPriorityColor(task.priority)"
                  variant="flat"
                  class="font-weight-black"
                >
                  {{ task.priority }}
                </v-chip>
                <v-chip
                  size="x-small"
                  :color="getStatusColor(task.status)"
                  variant="tonal"
                  class="font-weight-bold"
                >
                  {{ getStatusLabel(task.status) }}
                </v-chip>
              </div>
            </div>

            <!-- 2. Related Entities (قضية / موكل / سياق) -->
            <div
              v-if="task.case_number || task.client_name || task.context_label"
              class="d-flex flex-wrap align-center gap-1 mb-2"
            >
              <!-- Clickable Case Pill -->
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

              <!-- Client Pill -->
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

              <!-- Context Pill -->
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

            <!-- 3. Task Description / Notes (الوصف وتفاصيل التنفيذ) -->
            <div class="task-description-box rounded-xl pa-2.5 mb-2">
              <div class="d-flex align-start gap-1.5">
                <v-icon icon="mdi-text-box-outline" size="16" color="accent" class="mt-0.5 flex-shrink-0 opacity-80" />
                <p class="text-caption font-weight-medium text-white mb-0 leading-relaxed text-wrap">
                  {{ task.description || 'لا يوجد وصف تشغيلي متاح' }}
                </p>
              </div>
            </div>

            <!-- 4. Meta Row: Assignee & Due Date -->
            <div class="d-flex align-center justify-space-between text-caption pt-1 pb-1 flex-wrap gap-2">
              <!-- Assignee -->
              <div class="d-flex align-center gap-1 text-medium-emphasis">
                <v-icon icon="mdi-account-check-outline" size="15" color="accent" />
                <span class="font-weight-bold">المسؤول:</span>
                <span class="font-weight-black text-gold">{{ task.responsible_name || 'غير محدد' }}</span>
              </div>

              <!-- Due Date with Overdue Indicator -->
              <div
                v-if="task.due_date"
                class="d-flex align-center gap-1 font-weight-black"
                :class="isOverdue(task.due_date, task.status) ? 'text-error' : 'text-accent'"
              >
                <v-icon
                  :icon="isOverdue(task.due_date, task.status) ? 'mdi-clock-alert-outline' : 'mdi-calendar-clock'"
                  size="15"
                />
                <span>مستحق: {{ formatDate(task.due_date) }}</span>
                <v-chip
                  v-if="isOverdue(task.due_date, task.status)"
                  size="x-small"
                  color="error"
                  variant="flat"
                  class="font-weight-black px-1.5 ms-1"
                >
                  متأخرة
                </v-chip>
              </div>
            </div>

            <!-- 5. Actions Bar -->
            <div class="d-flex align-center justify-space-between pt-2 mt-1 border-t-subtle gap-2 flex-wrap">
              <div class="d-flex align-center gap-1">
                <!-- Direct Session Screen Shortcut if task relates to session -->
                <v-btn
                  v-if="isSessionRelated(task)"
                  size="small"
                  variant="tonal"
                  color="accent"
                  class="rounded-lg font-weight-bold px-2.5"
                  @click.stop="goToSessions"
                >
                  <v-icon icon="mdi-gavel" size="14" class="me-1" />
                  شاشة الجلسات
                </v-btn>

                <!-- Mark Complete Button -->
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
              </div>

              <!-- Edit & More Actions Menu -->
              <div class="d-flex align-center gap-1 ms-auto">
                <v-btn
                  icon
                  variant="text"
                  size="small"
                  color="gold"
                  class="opacity-80 hover-opacity-100"
                  @click.stop="emit('edit', task)"
                >
                  <v-icon icon="mdi-pencil-outline" size="18" />
                  <v-tooltip activator="parent" location="top">تعديل المهمة</v-tooltip>
                </v-btn>

                <v-menu location="bottom end">
                  <template #activator="{ props: menuProps }">
                    <v-btn
                      v-bind="menuProps"
                      icon
                      variant="text"
                      size="small"
                      color="white"
                      class="opacity-80 hover-opacity-100"
                      @click.stop
                    >
                      <v-icon icon="mdi-dots-vertical" size="18" />
                    </v-btn>
                  </template>
                  <v-list density="compact" class="rounded-xl glass-card border">
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
            </div>
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

const getPriorityColor = (priority?: string): string => {
  switch (priority) {
    case 'عالية':
      return 'error'
    case 'متوسطة':
      return 'warning'
    case 'منخفضة':
      return 'info'
    default:
      return 'grey'
  }
}

const getStatusColor = (status?: string): string => {
  switch (status) {
    case 'completed':
      return 'success'
    case 'in_progress':
      return 'accent'
    case 'scheduled':
      return 'info'
    case 'draft':
      return 'grey'
    case 'waiting':
    case 'blocked':
      return 'warning'
    case 'cancelled':
    case 'closed':
      return 'grey-darken-1'
    default:
      return 'primary'
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

const getCardBorderClass = (task: any): string => {
  if (task.status === 'completed') return 'border-s-success'
  if (isOverdue(task.due_date, task.status)) return 'border-s-error'
  if (task.priority === 'عالية') return 'border-s-error'
  if (task.priority === 'متوسطة') return 'border-s-warning'
  if (task.priority === 'منخفضة') return 'border-s-info'
  return 'border-s-gold'
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

.task-mobile-card {
  cursor: pointer;
  background: rgba(22, 27, 34, 0.7) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(197, 160, 40, 0.2) !important;
  border-inline-start-width: 4px !important;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.task-mobile-card:active {
  transform: scale(0.985);
}

.border-s-error {
  border-inline-start-color: rgb(239, 68, 68) !important;
}

.border-s-warning {
  border-inline-start-color: rgb(245, 158, 11) !important;
}

.border-s-info {
  border-inline-start-color: rgb(59, 130, 246) !important;
}

.border-s-success {
  border-inline-start-color: rgb(16, 185, 129) !important;
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

.task-description-box {
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(197, 160, 40, 0.12);
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

.text-truncate-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hover-opacity-100:hover {
  opacity: 1 !important;
}

.leading-relaxed {
  line-height: 1.6;
}
</style>
