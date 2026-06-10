<template>
  <div class="modern-data-list">
    <div v-if="(items || []).length === 0" class="text-center py-12">
      <LucideIcon :name="ICONS.STATUS.DATABASE" :size="64" class="text-grey-lighten-2" />
      <div class="text-h6 text-grey-darken-1 mt-4">لا توجد بيانات للعرض</div>
    </div>

    <div v-else class="data-list-container">
      <div
        v-for="(item, index) in items || []"
        :key="item.id || index"
        class="data-card mb-3 pa-4 d-flex align-center cursor-pointer"
        :class="{ 'border-s-4': showStatusBorder }"
        :style="showStatusBorder ? { borderInlineStartColor: getStatusColor(item) } : {}"
        @click="emit('row-click', item)"
      >
        <!-- Avatar/Prefix -->
        <v-avatar :color="getStatusColor(item, 0.1)" size="48" class="me-4 rounded-lg">
          <v-icon v-if="item.icon" :color="getStatusColor(item)">{{ item.icon }}</v-icon>
          <span
            v-else
            class="text-subtitle-1 font-weight-black"
            :style="{ color: getStatusColor(item) }"
          >
            {{ getInitials(item.title) }}
          </span>
        </v-avatar>

        <!-- Main Content -->
        <div class="flex-grow-1">
          <div class="d-flex align-center justify-space-between mb-1">
            <div class="text-subtitle-1 font-weight-black primary--text">
              {{ item.title }}
            </div>
            <v-chip
              v-if="item.status"
              size="x-small"
              :color="getStatusColor(item)"
              variant="flat"
              class="font-weight-bold px-3"
            >
              {{ item.status }}
            </v-chip>
          </div>

          <div class="d-flex align-center text-caption text-secondary">
            <span v-if="item.subtitle" class="me-3">
              <LucideIcon :name="ICONS.UI.TAG" :size="14" class="me-1" />
              {{ item.subtitle }}
            </span>
            <span v-if="item.date">
              <LucideIcon :name="ICONS.NAV.SESSIONS" :size="14" class="me-1" />
              {{ item.date }}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="ms-4 actions-column">
          <v-menu location="bottom end">
            <template #activator="{ props: menuProps }">
              <v-btn
                :icon="ICONS.UI.MORE"
                variant="text"
                size="small"
                v-bind="menuProps"
                @click.stop
              ></v-btn>
            </template>
            <v-list density="compact" width="160">
              <v-list-item
                v-for="action in actions"
                :key="action.title"
                :prepend-icon="action.icon"
                :title="action.title"
                @click="emit('action', { type: action.value, item })"
              />
            </v-list>
          </v-menu>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ICONS } from '../../config/icons'

interface Item {
  id?: any
  title: string
  subtitle?: string
  date?: string
  status?: string
  color?: string
  icon?: string
}

interface Action {
  title: string
  icon: string
  value: string
}

const props = withDefaults(
  defineProps<{
    items?: Item[]
    actions?: Action[]
    showStatusBorder?: boolean
  }>(),
  {
    items: () => [],
    actions: () => [
      { title: 'تعديل', icon: ICONS.ACTION.EDIT, value: 'edit' },
      { title: 'حذف', icon: ICONS.ACTION.DELETE, value: 'delete' }
    ],
    showStatusBorder: true
  }
)

const emit = defineEmits<{
  (e: 'row-click', item: Item): void
  (e: 'action', payload: { type: string; item: Item }): void
}>()

const getInitials = (text: string) => {
  if (!text) return ''
  return text
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const getStatusColor = (item: Item, opacity = 1) => {
  const color = item.color || 'primary'
  if (opacity === 1) return `var(--${color}, #0A2B4E)`
  return `rgba(10, 43, 78, ${opacity})`
}
</script>

<style scoped>
.data-card {
  background: var(--surface) !important;
  border-radius: var(--radius-md) !important;
  border: 1px solid var(--border) !important;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02) !important;
}

.data-card:hover {
  transform: translateX(-4px);
  border-color: var(--primary-light) !important;
  box-shadow: var(--shadow-md) !important;
  background: var(--surface-hover) !important;
}

.modern-data-list {
  min-height: 100px;
}

.actions-column {
  opacity: 0.4;
  transition: opacity 0.2s ease;
}

.data-card:hover .actions-column {
  opacity: 1;
}

.border-s-4 {
  border-inline-start-width: 4px !important;
}
</style>
