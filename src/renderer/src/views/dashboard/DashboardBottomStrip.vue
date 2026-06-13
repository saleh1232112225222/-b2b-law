<template>
  <div ref="bottomStripRef" class="shrink-0 dashboard-bottom-info-panel d-flex flex-column gap-1">
    <v-row dense class="ma-0">
      <v-col cols="12" md="6">
        <v-card
          elevation="0"
          class="glass-card d-flex flex-column overflow-hidden dashboard-bottom-inner-card"
        >
          <v-card-title class="pa-1 px-2 d-flex align-center justify-space-between shrink-0">
            <span class="font-weight-black text-tiny-v dashboard-title">المهام المعلقة</span>
            <v-btn
              variant="text"
              color="accent"
              to="/tasks"
              size="x-small"
              class="font-weight-bold"
              @click="$emit('navigate', '/tasks')"
            >الكل</v-btn>
          </v-card-title>
          <v-divider opacity="0.1"></v-divider>
          <div class="overflow-y-auto flex-grow-1 pa-1 max-h-150">
            <v-list class="pa-0 bg-transparent" density="compact">
              <v-list-item
                v-for="task in dashboardTasks"
                :key="task.id"
                class="rounded-lg mb-1 border glass-card-light pa-1"
                @click="$emit('navigate', '/tasks')"
              >
                <v-list-item-title class="font-weight-black text-tiny-v">{{
                  task.title
                }}</v-list-item-title>
                <template #append>
                  <v-chip
                    size="x-small"
                    :color="getPriorityColor(task.priority)"
                    variant="flat"
                    class="text-tiny-vv px-1"
                    style="height: 14px !important"
                  >{{ task.priority }}</v-chip>
                </template>
              </v-list-item>
            </v-list>
            <div
              v-if="dashboardTasks.length === 0"
              class="pa-2 text-center opacity-40 text-tiny-v"
            >
              لا توجد مهام
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card
          elevation="0"
          class="glass-card d-flex flex-column overflow-hidden dashboard-bottom-inner-card border-error-alpha"
        >
          <v-card-title class="pa-1 px-2 d-flex align-center shrink-0">
            <LucideIcon name="alert-triangle" :size="12" class="text-error me-2 pulse-icon" />
            <span class="font-weight-black text-tiny-v dashboard-title">تنبيهات عاجلة</span>
          </v-card-title>
          <v-divider opacity="0.1"></v-divider>
          <div class="overflow-y-auto flex-grow-1 max-h-150">
            <v-list
              v-if="safeLength(alerts) > 0"
              class="pa-0 bg-transparent"
              density="compact"
            >
              <v-list-item
                v-for="alert in alerts"
                :key="alert.id"
                class="px-2 border-b"
                @click="$emit('navigate', '/cases/' + alert.case_id)"
              >
                <v-list-item-title class="font-weight-black text-tiny-v text-error">{{
                  alert.title
                }}</v-list-item-title>
                <v-list-item-subtitle class="text-tiny-vv opacity-70">{{
                  alert.subtitle
                }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
            <div v-else class="pa-2 text-center opacity-40 text-tiny-v">لا توجد تنبيهات</div>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import LucideIcon from '../../components/common/LucideIcon.vue'
import { safeLength } from '../../utils/safe'

defineProps<{
  dashboardTasks: any[]
  alerts: any[]
  isMobile: boolean
}>()

defineEmits<{
  navigate: [path: string]
}>()

const bottomStripRef = ref<HTMLElement | null>(null)

const getPriorityColor = (priority: string): string => {
  const map: Record<string, string> = {
    'عاجل': 'error',
    'مرتفع': 'error',
    'متوسط': 'warning',
    'عادي': 'success',
    'منخفض': 'success'
  }
  return map[priority] || 'grey'
}

defineExpose({ bottomStripRef })
</script>

<style scoped>
.dashboard-bottom-inner-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.max-h-150 {
  max-height: 150px;
}

@media (max-width: 768px) {
  .dashboard-bottom-inner-card {
    margin-bottom: 12px;
  }
}
</style>
