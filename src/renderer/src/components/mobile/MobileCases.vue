<template>
  <div ref="containerRef" class="mobile-cases-container rtl">
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
      <v-icon icon="mdi-scale-balance" :size="56" color="accent" class="mb-3 opacity-60" />
      <div class="text-subtitle-1 text-gold font-weight-black mb-1">لا توجد قضايا</div>
      <div class="text-caption text-medium-emphasis mb-4">
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
          class="case-mobile-card mb-3 rounded-2xl overflow-hidden glass-card"
          variant="outlined"
          :class="getCardBorderClass(item.status)"
          @click="openCase(item)"
        >
          <div class="pa-3 pa-sm-4">
            <!-- 1. Header: Case Number + Phase/Stage + Status -->
            <div class="d-flex justify-space-between align-center mb-2 pb-2 border-b-subtle gap-2">
              <div class="d-flex align-center gap-1 min-w-0">
                <v-icon icon="mdi-file-document-outline" size="18" color="accent" class="flex-shrink-0" />
                <span class="text-subtitle-2 font-weight-black text-gold text-truncate">
                  رقم القضية: {{ item.case_number || 'بدون رقم' }}
                </span>
              </div>

              <div class="d-flex align-center gap-1 flex-shrink-0">
                <v-chip
                  v-if="item.phase"
                  size="x-small"
                  variant="outlined"
                  color="accent"
                  class="font-weight-bold"
                >
                  {{ item.phase }}
                </v-chip>
                <v-chip
                  size="x-small"
                  :color="getStatusColor(item.status)"
                  variant="flat"
                  class="font-weight-black"
                >
                  {{ item.status || 'قيد النظر' }}
                </v-chip>
              </div>
            </div>

            <!-- 2. Parties Row: Client & Opponent (الموكل والخصم) -->
            <div class="parties-section rounded-xl pa-2 mb-2">
              <!-- Client Name & Role -->
              <div class="d-flex align-center justify-space-between mb-1 gap-2">
                <div class="d-flex align-center gap-1 min-w-0">
                  <v-icon icon="mdi-account-tie" size="16" color="accent" class="flex-shrink-0" />
                  <span class="text-caption font-weight-bold text-medium-emphasis">الموكل:</span>
                  <span class="text-body-2 font-weight-black text-white text-truncate">
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

              <!-- Opponent Name -->
              <div class="d-flex align-center gap-1 min-w-0">
                <v-icon icon="mdi-account-alert-outline" size="16" color="warning" class="flex-shrink-0" />
                <span class="text-caption font-weight-bold text-medium-emphasis">الخصم:</span>
                <span class="text-body-2 font-weight-bold text-orange-lighten-2 text-truncate">
                  {{ getOpponentName(item) }}
                </span>
              </div>
            </div>

            <!-- 3. Subject & Court Info (موضوع الدعوى والمحكمة) -->
            <div class="case-details-box rounded-xl pa-2 mb-2">
              <!-- Subject / موضوع الدعوى -->
              <div class="d-flex align-start gap-1 mb-1">
                <v-icon icon="mdi-text-box-outline" size="15" color="accent" class="mt-1 flex-shrink-0" />
                <div class="d-flex flex-column min-w-0">
                  <span class="text-caption font-weight-bold text-gold">موضوع الدعوى:</span>
                  <span class="text-caption font-weight-medium text-white text-truncate-2">
                    {{ item.subject || item.case_type || 'غير محدد' }}
                  </span>
                </div>
              </div>

              <!-- Court & Circuit / المحكمة والدائرة -->
              <div class="d-flex align-center gap-1 mt-1 pt-1 border-t-subtle text-caption">
                <v-icon icon="mdi-gavel" size="14" color="accent" class="opacity-80 flex-shrink-0" />
                <span class="text-caption font-weight-bold text-medium-emphasis">المحكمة:</span>
                <span class="text-caption font-weight-bold text-gold opacity-90 text-truncate">
                  {{ item.court || 'غير محددة' }}{{ item.circuit ? ` - ${item.circuit}` : '' }}
                </span>
              </div>
            </div>

            <!-- 4. Actions Row -->
            <div class="d-flex align-center justify-space-between pt-2 border-t-subtle flex-wrap gap-2">
              <div class="d-flex align-center gap-2">
                <!-- Open Case Details Button -->
                <v-btn
                  color="accent"
                  size="small"
                  variant="flat"
                  class="font-weight-black rounded-lg premium-btn-gold-gradient px-3"
                  @click.stop="openCase(item)"
                >
                  <v-icon icon="mdi-folder-open-outline" size="16" class="me-1" />
                  ملف القضية
                </v-btn>
              </div>

              <!-- Edit & Delete Icons -->
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
                  <v-tooltip activator="parent" location="top">تعديل القضية</v-tooltip>
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
                  <v-tooltip activator="parent" location="top">حذف القضية</v-tooltip>
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

const getStatusColor = (status?: string): string => {
  if (!status) return 'grey'
  if (status.includes('قيد النظر') || status.includes('نشطة')) return 'accent'
  if (status.includes('دراسة')) return 'info'
  if (status.includes('محكوم') || status.includes('نهائي') || status.includes('منتهية')) return 'success'
  if (status.includes('معلقة') || status.includes('موقفة')) return 'warning'
  if (status.includes('مغلقة') || status.includes('مؤرشفة') || status.includes('كأن لم تكن')) return 'grey'
  return 'primary'
}

const getCardBorderClass = (status?: string): string => {
  if (!status) return 'border-s-gold'
  if (status.includes('قيد النظر') || status.includes('نشطة')) return 'border-s-accent'
  if (status.includes('دراسة')) return 'border-s-info'
  if (status.includes('محكوم') || status.includes('نهائي') || status.includes('منتهية')) return 'border-s-success'
  if (status.includes('معلقة') || status.includes('موقفة')) return 'border-s-warning'
  if (status.includes('مغلقة') || status.includes('مؤرشفة') || status.includes('كأن لم تكن')) return 'border-s-grey'
  return 'border-s-gold'
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

.case-mobile-card {
  cursor: pointer;
  background: rgba(22, 27, 34, 0.7) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(197, 160, 40, 0.2) !important;
  border-inline-start-width: 4px !important;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.case-mobile-card:active {
  transform: scale(0.985);
}

.border-s-accent {
  border-inline-start-color: rgb(233, 195, 73) !important;
}

.border-s-info {
  border-inline-start-color: rgb(59, 130, 246) !important;
}

.border-s-success {
  border-inline-start-color: rgb(16, 185, 129) !important;
}

.border-s-warning {
  border-inline-start-color: rgb(245, 158, 11) !important;
}

.border-s-grey {
  border-inline-start-color: rgb(156, 163, 175) !important;
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

.parties-section {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(197, 160, 40, 0.12);
}

.case-details-box {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
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
</style>
