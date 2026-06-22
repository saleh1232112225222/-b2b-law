<template>
  <v-col
    cols="12"
    md="3"
    class="d-flex flex-column"
    style="gap: 12px"
    :class="{ 'overflow-hidden h-100': !isMobile }"
  >
    <v-card
      flat
      class="quick-actions-card d-flex flex-column glass-card"
      :class="{ 'flex-grow-1 overflow-hidden': !isMobile }"
    >
      <div class="d-flex align-center pa-3 px-4">
        <div class="quick-actions-icon-wrapper me-3">
          <LucideIcon name="zap" :size="18" class="quick-actions-icon" />
        </div>
        <span class="quick-actions-title">إجراءات سريعة</span>
      </div>
      <v-divider opacity="0.06"></v-divider>
      <v-card-text class="pa-3 overflow-y-auto glass-card">
        <v-row dense>
          <v-col v-for="action in quickActions" :key="action.title" cols="12" class="pa-1">
            <v-btn
              block
              variant="tonal"
              color="accent"
              size="small"
              class="quick-action-btn premium-btn-gold-gradient"
              :to="action.to"
              @click="
                action.to
                  ? $emit('navigate', action.to)
                  : action.onClick && $emit('action', action.onClick)
              "
            >
              <LucideIcon :name="action.icon" :size="16" class="me-2" />
              {{ action.title }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card flat class="quick-actions-card pa-3 shrink-0 text-center glass-card">
      <div class="text-caption opacity-50 font-weight-bold">آخر تحديث: {{ lastRefreshTime }}</div>
    </v-card>
  </v-col>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'

defineProps<{
  lastRefreshTime: string
  isMobile: boolean
}>()

const emit = defineEmits<{
  navigate: [path: string]
  action: [action: string]
}>()

const quickActions = [
  { title: 'إضافة قضية', icon: 'scale', to: '/cases?new=1' },
  { title: 'موكل جديد', icon: 'user-plus', to: '/clients?new=1' },
  { title: 'تسجيل جلسة', icon: 'calendar-plus', to: '/sessions?new=1' },
  { title: 'إضافة مهمة', icon: 'list-plus', to: '/tasks?new=1' },
  { title: 'طلب تنفيذ', icon: 'gavel', to: '/enforcement?new=1' },
  { title: 'البحث الشامل', icon: 'search', to: '/search' },
  { title: 'حفظ البيانات', icon: 'database-zap', onClick: 'snapshot' },
  { title: 'تصدير قاعدة بيانات', icon: 'file-down', onClick: 'backup' }
]
</script>

<style scoped>
.quick-actions-card {
  background: var(--glass-bg-soft) !important;
  backdrop-filter: var(--glass-blur) !important;
  -webkit-backdrop-filter: var(--glass-blur) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 14px !important;
  box-shadow: var(--shadow-md) !important;
  transition: var(--transition-smooth);
}

.quick-actions-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--accent-alpha);
}

.quick-actions-icon {
  color: var(--accent);
}

.quick-actions-title {
  font-weight: 800;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.quick-action-btn {
  justify-content: flex-start !important;
  font-size: 0.8rem !important;
  font-weight: 700 !important;
  border-radius: 10px !important;
  min-height: 40px !important;
  transition: var(--transition-smooth) !important;
  color: var(--text-primary) !important;
}

.quick-action-btn :deep(.lucide-icon) {
  stroke: var(--text-primary) !important;
}

.quick-action-btn:hover {
  transform: translateX(-2px);
}
</style>
