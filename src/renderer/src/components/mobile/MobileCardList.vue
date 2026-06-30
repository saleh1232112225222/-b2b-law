<template>
  <div ref="containerRef" class="mobile-card-list">
    <div v-if="isRefreshing" class="mobile-pull-indicator mobile-pull-indicator--active">
      <v-progress-circular indeterminate color="accent" :size="20" :width="2" class="me-2" />
      جاري التحديث...
    </div>

    <div v-if="loading && (!items || items.length === 0)" class="d-flex justify-center pa-8">
      <v-progress-circular indeterminate color="primary" :size="40" />
    </div>

    <div v-else-if="!loading && (!items || items.length === 0)" class="text-center pa-8">
      <v-icon icon="mdi-inbox-outline" :size="48" color="grey-lighten-1" class="mb-4" />
      <div class="text-body-1 text-medium-emphasis font-weight-bold">{{ emptyText }}</div>
      <v-btn
        v-if="canAdd"
        color="primary"
        variant="tonal"
        class="mt-4 rounded-lg font-weight-bold"
        @click="emit('add')"
      >
        <v-icon icon="mdi-plus" class="me-2" />
        {{ addLabel }}
      </v-btn>
    </div>

    <template v-else>
      <v-slide-y-reverse-transition group>
        <v-card
          v-for="item in items"
          :key="item.id"
          class="mobile-card mb-3 rounded-xl"
          variant="outlined"
          :class="getCardClass(item)"
          @click="emit('item-click', item)"
        >
          <div class="d-flex align-center pa-3">
            <v-icon
              v-if="iconField"
              :icon="getNestedValue(item, iconField) || defaultIcon"
              :size="28"
              :color="iconColor || 'primary'"
              class="me-3 flex-shrink-0"
            />

            <div class="flex-grow-1 min-width-0">
              <div class="text-subtitle-2 font-weight-black text-truncate">
                {{ getNestedValue(item, titleField) }}
              </div>
              <div
                v-if="subtitleField"
                class="text-caption text-medium-emphasis text-truncate mt-1"
              >
                {{ getNestedValue(item, subtitleField) }}
              </div>
              <div v-if="infoFields" class="d-flex flex-wrap gap-2 mt-1">
                <span
                  v-for="f in infoFields"
                  :key="f.key"
                  class="text-caption font-weight-medium"
                  :class="f.class || 'text-medium-emphasis'"
                >
                  {{ f.label }}: {{ getNestedValue(item, f.key) }}
                </span>
              </div>
            </div>
          </div>
        </v-card>
      </v-slide-y-reverse-transition>

      <div ref="sentinelRef" class="text-center pa-4">
        <v-progress-circular
          v-if="loading && items && items.length > 0"
          indeterminate
          color="primary"
          :size="24"
          :width="2"
        />
        <div v-else-if="!hasMore" class="text-caption text-medium-emphasis">
          — لا توجد نتائج أخرى —
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePullToRefresh } from '../../composables/usePullToRefresh'

interface InfoField {
  key: string
  label?: string
  class?: string
}

const props = defineProps<{
  items: any[]
  loading: boolean
  hasMore?: boolean
  titleField: string
  subtitleField?: string
  infoFields?: InfoField[]
  iconField?: string
  defaultIcon?: string
  iconColor?: string
  emptyText?: string
  canAdd?: boolean
  addLabel?: string
}>()

const emit = defineEmits<{
  'item-click': [item: any]
  add: []
  refresh: []
}>()

const containerRef = ref<HTMLElement | null>(null)
const sentinelRef = ref<HTMLElement | null>(null)

const { isRefreshing } = usePullToRefresh(containerRef, async () => {
  emit('refresh')
})

const getNestedValue = (obj: any, path: string) => {
  if (!path) return ''
  return path.split('.').reduce((acc, part) => (acc ? acc[part] : ''), obj) || ''
}

const getCardClass = (item: any) => {
  if (item.status) {
    const statusClass: Record<string, string> = {
      قادمة: 'border-s-4 border-accent',
      منعقدة: 'border-s-4 border-success',
      ملغاة: 'border-s-4 border-error',
      pending: 'border-s-4 border-warning',
      partially_paid: 'border-s-4 border-warning',
      paid: 'border-s-4 border-success',
      overdue: 'border-s-4 border-error',
      active: 'border-s-4 border-success',
      closed: 'border-s-4 border-grey'
    }
    return statusClass[item.status] || ''
  }
  return ''
}
</script>

<style scoped>
.mobile-card-list {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.mobile-card {
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.mobile-card:active {
  transform: scale(0.98);
}

.mobile-card .border-s-4 {
  border-inline-start: 4px solid;
}

.border-accent {
  border-color: rgb(233, 195, 73) !important;
}
.border-success {
  border-color: rgb(5, 150, 105) !important;
}
.border-error {
  border-color: rgb(220, 38, 38) !important;
}
.border-warning {
  border-color: rgb(217, 119, 6) !important;
}
.border-grey {
  border-color: rgb(156, 163, 175) !important;
}

.min-width-0 {
  min-width: 0;
}
</style>
