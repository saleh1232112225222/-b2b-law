<template>
  <v-col cols="12" md="3" class="d-flex flex-column gap-1" :class="{ 'overflow-hidden h-100': !isMobile }">
    <v-card elevation="0" class="glass-card d-flex flex-column" :class="{ 'flex-grow-1 overflow-hidden': !isMobile }">
      <v-card-title class="pa-2 px-3 text-body-2 font-weight-black dashboard-title"
        >إجراءات سريعة</v-card-title
      >
      <v-divider opacity="0.1"></v-divider>
      <v-card-text class="pa-2 overflow-y-auto">
        <v-row dense>
          <v-col v-for="action in quickActions" :key="action.title" cols="12" class="pa-1">
            <v-btn
              block
              variant="tonal"
              color="accent"
              size="small"
              class="rounded-lg text-tiny font-weight-black justify-start"
              :to="action.to"
              @click="action.to ? $emit('navigate', action.to) : action.onClick && $emit('action', action.onClick)"
            >
              <LucideIcon :name="action.icon" :size="16" class="me-2" />
              {{ action.title }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Refresh Indicator / Last Updated -->
    <v-card elevation="0" class="glass-card pa-2 shrink-0 text-center">
      <div class="text-tiny opacity-60 font-weight-bold">آخر تحديث: {{ lastRefreshTime }}</div>
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
