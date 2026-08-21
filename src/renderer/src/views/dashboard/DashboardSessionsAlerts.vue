<template>
  <v-row dense class="ma-0 border-t border-gold border-opacity-10 pt-2 mt-1">
    <v-col cols="12" md="4">
      <v-card
        elevation="0"
        class="glass-card-light overflow-hidden dashboard-sessions-today dashboard-bottom-inner-card glass-card"
      >
        <v-card-title class="pa-1 px-2 d-flex align-center justify-space-between">
          <div class="font-weight-black text-tiny-v dashboard-title">
            جلسات اليوم ({{ safeArray(todaySessions).length }})
          </div>
          <v-btn
            class="premium-btn-gold-gradient"
            icon
            variant="text"
            size="x-small"
            @click="$emit('navigate', '/sessions')"
            ><LucideIcon name="external-link" :size="10"
          /></v-btn>
        </v-card-title>
        <div class="max-h-140 overflow-y-auto">
          <v-data-table
            :headers="sessionHeadersCompact"
            :items="safeArray(todaySessions)"
            density="compact"
            hide-default-footer
            class="table-mini"
          >
            <template #[`item.client_name`]="{ item }">
              <div class="d-flex flex-column">
                <span class="text-tiny-v font-weight-black">{{ item.client_name }}</span>
                <span class="text-tiny-vv opacity-70">قضية: {{ item.case_number }}</span>
              </div>
            </template>
          </v-data-table>
        </div>
      </v-card>
    </v-col>
    <v-col cols="12" md="4">
      <v-card
        elevation="0"
        class="glass-card-light overflow-hidden dashboard-sessions-tomorrow dashboard-bottom-inner-card glass-card"
      >
        <v-card-title class="pa-1 px-2 d-flex align-center justify-space-between">
          <div class="font-weight-black text-tiny-v dashboard-title">
            جلسات غداً ({{ safeArray(tomorrowSessions).length }})
          </div>
        </v-card-title>
        <div class="max-h-140 overflow-y-auto">
          <v-data-table
            :headers="sessionHeadersCompact"
            :items="safeArray(tomorrowSessions)"
            density="compact"
            hide-default-footer
            class="table-mini"
          >
            <template #[`item.client_name`]="{ item }">
              <div class="d-flex flex-column">
                <span class="text-tiny-v font-weight-black">{{ item.client_name }}</span>
                <span class="text-tiny-vv opacity-70">قضية: {{ item.case_number }}</span>
              </div>
            </template>
          </v-data-table>
        </div>
      </v-card>
    </v-col>
    <v-col cols="12" md="4">
      <v-card
        elevation="0"
        class="glass-card-light overflow-hidden dashboard-agency-alerts dashboard-bottom-inner-card border-warning-alpha glass-card"
      >
        <v-card-title class="pa-1 px-2 d-flex align-center justify-space-between">
          <div class="font-weight-black text-tiny-v dashboard-title">
            تنبيهات الوكالات ({{ safeLength(agencyAlerts) }})
          </div>
          <v-btn
            class="premium-btn-gold-gradient"
            icon
            variant="text"
            size="x-small"
            @click="$emit('navigate', '/clients')"
            ><LucideIcon name="users" :size="10"
          /></v-btn>
        </v-card-title>
        <div class="max-h-140 overflow-y-auto">
          <v-list v-if="safeLength(agencyAlerts) > 0" class="pa-0 bg-transparent" density="compact">
            <v-list-item
              v-for="ag in agencyAlerts"
              :key="ag.id"
              class="px-2 border-b"
              @click="$emit('navigate', '/clients/' + ag.client_id)"
            >
              <template #prepend>
                <v-avatar
                  size="24"
                  :color="ag.days_remaining <= 0 ? 'error-alpha' : 'warning-alpha'"
                  class="me-1 rounded-lg"
                >
                  <LucideIcon
                    :name="ag.days_remaining <= 0 ? 'user-x' : 'user-check'"
                    :size="12"
                    :class="ag.days_remaining <= 0 ? 'text-error' : 'text-warning'"
                  />
                </v-avatar>
              </template>
              <v-list-item-title class="font-weight-black text-tiny-v">{{
                ag.client_name
              }}</v-list-item-title>
              <template #append>
                <div class="d-flex align-center">
                  <v-chip
                    size="x-small"
                    :color="ag.days_remaining <= 0 ? 'error' : 'warning'"
                    variant="flat"
                    class="text-tiny-v font-weight-black rounded-pill me-1"
                    style="min-width: 80px; justify-content: center; height: 16px !important"
                  >
                    {{
                      ag.days_remaining > 0
                        ? `متبقي ${ag.days_remaining} يوم`
                        : `منتهية منذ ${Math.abs(ag.days_remaining)} يوم`
                    }}
                  </v-chip>
                  <v-btn
                    icon
                    size="x-small"
                    variant="text"
                    color="accent"
                    class="opacity-60 hover-opacity-100 premium-btn-gold-gradient"
                    style="width: 20px; height: 20px"
                    @click.stop="$emit('open-agency', ag)"
                  >
                    <LucideIcon name="refresh-cw" :size="12" />
                    <v-tooltip activator="parent" location="top">تحديث بيانات الوكالة</v-tooltip>
                  </v-btn>
                </div>
              </template>
            </v-list-item>
          </v-list>
          <div v-else class="pa-2 text-center opacity-40 text-tiny-v">لا توجد تنبيهات</div>
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'
import { safeArray, safeLength } from '../../utils/safe'

defineProps<{
  todaySessions: any[]
  tomorrowSessions: any[]
  agencyAlerts: any[]
  sessionHeadersCompact: { title: string; key: string }[]
  isMobile: boolean
}>()

defineEmits<{
  'open-agency': [data: any]
  navigate: [path: string]
}>()
</script>

<style scoped>
.max-h-140 {
  max-height: 140px;
}

.text-tiny-v {
  font-size: 0.6rem !important;
  height: 18px !important;
}

.text-tiny-vv {
  font-size: 0.55rem !important;
  line-height: 1 !important;
}

.table-mini :deep(.v-data-table__td) {
  font-size: 0.65rem !important;
  padding: 4px 8px !important;
  height: 28px !important;
}

.dashboard-title {
  color: var(--text-primary) !important;
}

:global([data-theme='dark']) .dashboard-title {
  color: #ffffff !important;
}

.dashboard-bottom-inner-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.dashboard-sessions-today :deep(.text-subtitle-2),
.dashboard-sessions-tomorrow :deep(.text-subtitle-2) {
  font-size: 0.8rem !important;
  line-height: 1.1 !important;
  font-weight: 800 !important;
}

.dashboard-sessions-today :deep(.text-caption),
.dashboard-sessions-tomorrow :deep(.text-caption) {
  font-size: 0.6rem !important;
  line-height: 1.1 !important;
  opacity: 0.7;
}

.dashboard-sessions-today :deep(.v-data-table__td),
.dashboard-sessions-tomorrow :deep(.v-data-table__td) {
  padding-top: 4px !important;
  padding-bottom: 4px !important;
  font-size: 0.85rem !important;
  font-weight: 800 !important;
  color: var(--text-primary) !important;
}

.dashboard-sessions-today :deep(.v-data-table__th),
.dashboard-sessions-tomorrow :deep(.v-data-table__th) {
  font-size: 0.85rem !important;
  font-weight: 900 !important;
  color: var(--text-primary) !important;
}

:global([data-theme='dark']) .dashboard-sessions-today :deep(.v-data-table__td),
:global([data-theme='dark']) .dashboard-sessions-tomorrow :deep(.v-data-table__td),
:global([data-theme='dark']) .dashboard-sessions-today :deep(.text-tiny-v),
:global([data-theme='dark']) .dashboard-sessions-tomorrow :deep(.text-tiny-v) {
  color: #f3f6fa !important;
}

:global([data-theme='dark']) .dashboard-sessions-today :deep(.v-data-table__th),
:global([data-theme='dark']) .dashboard-sessions-tomorrow :deep(.v-data-table__th) {
  color: #e5b52b !important;
}

:global([data-theme='dark']) .dashboard-sessions-today :deep(.text-tiny-vv),
:global([data-theme='dark']) .dashboard-sessions-tomorrow :deep(.text-tiny-vv) {
  color: #9eacbd !important;
  opacity: 1 !important;
}
</style>
