<template>
  <div ref="containerRef" class="mobile-cases-container rtl pa-2">
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
      <v-icon icon="mdi-scale-balance" :size="56" color="accent" class="mb-3 opacity-60" />
      <div class="text-subtitle-1 font-weight-black text-slate-800 mb-1">لا توجد قضايا</div>
      <div class="text-caption text-slate-500 mb-4">
        لم يتم العثور على أي قضايا ضمن التصفية المحددة
      </div>
      <v-btn
        v-if="canAdd"
        color="accent"
        variant="flat"
        class="rounded-xl font-weight-black premium-btn-gold-gradient px-6"
        @click="emit('add')"
      >
        <v-icon icon="mdi-plus" class="me-2" />
        {{ addLabel || 'إضافة قضية جديدة' }}
      </v-btn>
    </div>

    <!-- Cases List -->
    <template v-else>
      <div class="cases-list">
        <v-card
          v-for="item in items"
          :key="item.id"
          class="client-style-card mb-3 rounded-2xl overflow-hidden"
          elevation="0"
          @click="openCase(item)"
        >
          <!-- 1. Header Row -->
          <div class="card-header d-flex justify-space-between align-center px-4 py-3">
            <div class="d-flex align-center gap-2">
              <v-icon icon="mdi-scale-balance" size="22" color="accent" />
              <span class="card-title text-subtitle-1 font-weight-black text-slate-800">
                رقم القضية: {{ item.case_number || 'بدون رقم' }}
              </span>
            </div>

            <div class="d-flex align-center gap-1.5">
              <span v-if="item.phase" class="badge-phase">
                {{ item.phase }}
              </span>
              <span class="badge-status" :class="getStatusBadgeClass(item.status)">
                {{ item.status || 'قيد النظر' }}
              </span>
            </div>
          </div>

          <!-- 2. Body Details -->
          <div class="card-body px-4 py-3">
            <!-- Row 1: Client & Role -->
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
                color="info"
                class="font-weight-bold flex-shrink-0"
              >
                {{ item.client_role }}
              </v-chip>
            </div>

            <!-- Row 2: Opponent -->
            <div class="d-flex align-center gap-1 mb-2 min-w-0">
              <span class="label-text">الخصم:</span>
              <span class="value-text font-weight-bold text-amber-700 text-truncate">
                {{ getOpponentName(item) }}
              </span>
            </div>

            <!-- Row 3: Case Subject -->
            <div class="d-flex align-start gap-1 mb-2">
              <span class="label-text flex-shrink-0">موضوع الدعوى:</span>
              <span class="value-text font-weight-bold text-slate-800 text-truncate-2">
                {{ item.subject || item.case_type || 'غير محدد' }}
              </span>
            </div>

            <!-- Row 4: Court & Circuit -->
            <div class="d-flex align-center gap-1 min-w-0">
              <span class="label-text">المحكمة:</span>
              <span class="value-text font-weight-bold text-slate-800 text-truncate">
                {{ item.court || 'غير محددة' }}{{ item.circuit ? ` - ${item.circuit}` : '' }}
              </span>
            </div>
          </div>

          <!-- 3. Footer Row -->
          <div class="card-footer d-flex align-center justify-space-between px-4 py-2.5">
            <!-- Left Action Icons (Delete & Edit) -->
            <div class="d-flex align-center gap-2">
              <button
                type="button"
                class="action-btn-icon btn-delete"
                title="حذف القضية"
                @click.stop="emit('delete', item)"
              >
                <v-icon icon="mdi-trash-can-outline" size="18" />
              </button>
              <button
                type="button"
                class="action-btn-icon btn-edit"
                title="تعديل القضية"
                @click.stop="emit('edit', item)"
              >
                <v-icon icon="mdi-pencil-outline" size="18" />
              </button>
            </div>

            <!-- Right Action: Open Case Details -->
            <button
              type="button"
              class="action-link-btn d-flex align-center gap-1 font-weight-black"
              @click.stop="openCase(item)"
            >
              <v-icon icon="mdi-eye-outline" size="18" class="text-slate-700" />
              <span class="text-slate-800">ملف القضية</span>
            </button>
          </div>
        </v-card>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePullToRefresh } from '../../composables/usePullToRefresh'

const props = withDefaults(
  defineProps<{
    items: any[]
    loading: boolean
    canAdd?: boolean
    addLabel?: string
  }>(),
  {
    canAdd: true,
    addLabel: 'إضافة قضية'
  }
)

const emit = defineEmits<{
  edit: [item: any]
  add: []
  delete: [item: any]
  refresh: []
}>()

const router = useRouter()
const containerRef = ref<HTMLElement | null>(null)

const { isRefreshing } = usePullToRefresh(containerRef, async () => {
  emit('refresh')
})

const getStatusBadgeClass = (status?: string): string => {
  if (!status) return 'badge-status-default'
  if (status.includes('قيد النظر') || status.includes('نشطة')) return 'badge-status-active'
  if (status.includes('دراسة')) return 'badge-status-study'
  if (status.includes('محكوم') || status.includes('نهائي') || status.includes('منتهية')) return 'badge-status-success'
  if (status.includes('معلقة') || status.includes('موقفة')) return 'badge-status-warning'
  return 'badge-status-default'
}

const getOpponentName = (item: any): string => {
  if (item.opponent_name && item.opponent_name.trim() !== '') {
    return item.opponent_name
  }
  if (item.parties && Array.isArray(item.parties)) {
    const opp = item.parties.find((p: any) => p.party_type === 'opponent')
    if (opp?.name) return opp.name
  }
  return 'غير محدد'
}

const openCase = (item: any): void => {
  if (item.id) {
    router.push(`/cases/${item.id}`)
  } else {
    emit('edit', item)
  }
}
</script>

<style scoped>
.mobile-cases-container {
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
.badge-phase {
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

.text-amber-700 {
  color: #b45309 !important;
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

.action-link-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  color: #1e293b;
  transition: opacity 0.15s ease;
}

.action-link-btn:active {
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
</style>
