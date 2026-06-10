<template>
  <v-container fluid class="dashboard-viewport" :class="{ 'dashboard-viewport--mobile': isMobile }">
    <DashboardKpiCards :stats="stats" :is-mobile="isMobile" @navigate="$router.push($event)" />

    <v-row v-if="loading" class="mt-3">
      <v-col cols="12" lg="8">
        <v-skeleton-loader type="list-item-avatar-two-line@3, table@2" class="rounded-xl mb-4" />
      </v-col>
      <v-col cols="12" lg="4">
        <v-skeleton-loader type="list-item-two-line@3, list-item-three-line@4" class="rounded-xl" />
      </v-col>
    </v-row>

    <v-row
      v-else
      class="dashboard-grid mt-2"
      :class="{ 'flex-grow-1 overflow-hidden': !isMobile }"
      dense
      :style="{ '--dashboard-bottom-h': bottomStripHeight + 'px' }"
    >
      <v-col cols="12" md="9" class="d-flex flex-column" style="gap: 12px" :class="{ 'overflow-hidden h-100': !isMobile }">
        <v-card flat class="dashboard-panel-card d-flex flex-column" :class="{ 'flex-grow-1 overflow-hidden': !isMobile }">
          <div class="dashboard-panel-header d-flex align-center justify-space-between shrink-0 pa-3 px-4">
            <div class="d-flex align-center">
              <div class="panel-icon-wrapper me-3">
                <LucideIcon name="sliders-horizontal" :size="18" class="panel-icon" />
              </div>
              <span class="panel-title">لوحة التحليل والتقويم</span>
            </div>
            <v-tabs v-model="topPanelTab" density="compact" color="primary" class="panel-tabs">
              <v-tab value="calendar" class="font-weight-bold px-3 panel-tab">التقويم</v-tab>
              <v-tab value="charts" class="font-weight-bold px-3 panel-tab">الرسوم البيانية</v-tab>
              <v-tab value="metrics" class="font-weight-bold px-3 panel-tab">المؤشرات</v-tab>
            </v-tabs>
          </div>
          <v-divider opacity="0.06"></v-divider>
          <v-card-text class="pa-2 flex-grow-1 overflow-y-auto">
            <v-window v-model="topPanelTab" class="mb-1" style="min-height: 150px">
              <DashboardCalendarPanel
                :calendar-month-label="calendarMonthLabel"
                :calendar-cells="calendarCells"
                :selected-date="selectedDate"
                :important-dates-by-day="importantDatesByDay"
                :selected-important-dates="selectedImportantDates"
                :week-days="weekDays"
                :is-mobile="isMobile"
                @prev-month="prevMonth"
                @next-month="nextMonth"
                @select-date="selectDate($event)"
              />
              <v-window-item value="charts">
                <DashboardChartsPanel
                  :pie-labels="pieLabels"
                  :pie-data="pieData"
                  :pie-colors="pieColors"
                  :trend-labels="trendLabels"
                  :trend-values="trendValues"
                />
              </v-window-item>
            </v-window>

            <DashboardSessionsAlerts
              :today-sessions="sessionsStore.todaySessions"
              :tomorrow-sessions="sessionsStore.tomorrowSessions"
              :agency-alerts="agencyAlerts"
              :session-headers-compact="sessionHeadersCompact"
              :is-mobile="isMobile"
              @open-agency="openEditAgency($event)"
              @navigate="$router.push($event)"
            />
          </v-card-text>
        </v-card>

        <DashboardBottomStrip
          ref="bottomStripRef"
          :dashboard-tasks="dashboardTasks"
          :alerts="alerts"
          :is-mobile="isMobile"
          @navigate="$router.push($event)"
        />
      </v-col>

      <DashboardQuickActions :last-refresh-time="lastRefreshTime" :is-mobile="isMobile" @navigate="$router.push($event)" @action="handleQuickAction($event)" />
    </v-row>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="snackbar.timeout"
      location="top"
      class="font-weight-black"
    >
      {{ snackbar.text }}
      <template #actions>
        <v-btn variant="text" icon @click="snackbar.show = false">
          <LucideIcon name="x" :size="16" />
        </v-btn>
      </template>
    </v-snackbar>

    <DashboardAgencyDialog :agency-edit-dialog="agencyEditDialog" :clients="clientsStore.clients" :is-mobile="isMobile" @save="handleAgencySave($event)" @close="agencyEditDialog.show = false" />

    <ConfirmDialog
      v-model="confirmDialog.show"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :color="confirmDialog.color"
      :icon="confirmDialog.icon"
      :confirm-text="confirmDialog.confirmText"
      :cancel-text="confirmDialog.cancelText"
      :loading="confirmDialog.loading"
      @confirm="confirmDialog.action"
    />
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { Alert } from '../types'
import { useClientsStore } from '../stores/clients'
import { useCasesStore } from '../stores/cases'
import { useSessionsStore } from '../stores/sessions'
import { useTasksStore } from '../stores/tasks'
import { useAgenciesStore } from '../stores/agencies'
import { safeArray, safeLength } from '../utils/safe'

import LucideIcon from '../components/common/LucideIcon.vue'
import DashboardKpiCards from './dashboard/DashboardKpiCards.vue'
import DashboardCalendarPanel from './dashboard/DashboardCalendarPanel.vue'
import DashboardChartsPanel from './dashboard/DashboardChartsPanel.vue'
import DashboardSessionsAlerts from './dashboard/DashboardSessionsAlerts.vue'
import DashboardBottomStrip from './dashboard/DashboardBottomStrip.vue'
import DashboardQuickActions from './dashboard/DashboardQuickActions.vue'
import DashboardAgencyDialog from './dashboard/DashboardAgencyDialog.vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import PieChart from '../components/charts/PieChart.vue'
import TimeSeriesLineChart from '../components/charts/TimeSeriesLineChart.vue'
import { computeImportantDates, getSixMonthKeys, getMonthRange } from '../utils/dashboardAnalytics'
import { gregorianIsoToHijriIso } from '../utils/hijriIso'
import type { Session } from '../types/session'

const clientsStore = useClientsStore()
const casesStore = useCasesStore()
const sessionsStore = useSessionsStore()
const tasksStore = useTasksStore()
const agenciesStore = useAgenciesStore()

const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value || (typeof window !== 'undefined' && window.innerWidth <= 768))

const handleQuickAction = (action: string) => {
  if (action === 'snapshot') handleSnapshotExport()
  else if (action === 'backup') handleBackupExport()
}

const snackbar = ref({
  show: false,
  text: '',
  color: 'success',
  timeout: 4000
})

const showMessage = (text: string, color = 'success'): void => {
  snackbar.value.text = text
  snackbar.value.color = color
  snackbar.value.show = true
}

const isExportingBackup = ref(false)
const handleBackupExport = async (): Promise<void> => {
  if (isExportingBackup.value) return
  isExportingBackup.value = true
  try {
    const res = await (window as any).api.backup.export()
    if (res?.success) {
      showMessage('تم تصدير النسخة الاحتياطية بنجاح')
    } else if (res?.message && res.message !== 'تم الإلغاء') {
      showMessage(res.message, 'error')
    }
  } catch (err: any) {
    showMessage('حدث خطأ أثناء التصدير: ' + (err.message || err), 'error')
  } finally {
    isExportingBackup.value = false
  }
}

const isExportingSnapshot = ref(false)
const handleSnapshotExport = async (): Promise<void> => {
  if (isExportingSnapshot.value) return
  isExportingSnapshot.value = true
  try {
    const res = await (window as any).api.system.exportManualSnapshot()
    if (res?.success) {
      showMessage('تم حفظ ملف البيانات بنجاح')
    } else if (res?.message && res.message !== 'تم الإلغاء') {
      showMessage(res.message, 'error')
    }
  } catch (err: any) {
    showMessage('حدث خطأ أثناء الحفظ: ' + (err.message || err), 'error')
  } finally {
    isExportingSnapshot.value = false
  }
}

const loading = ref(true)

const alerts = ref<Alert[]>([])
const agencyAlerts = ref<any[]>([])
const lastRefreshTime = ref('')
const employeesCount = ref(0)

const dashboardTasks = computed(() => safeArray(tasksStore.pendingTasks).slice(0, 10))

const bottomStripRef = ref<any>(null)
const bottomStripHeight = ref(0)
let bottomStripObserver: ResizeObserver | null = null

const caseCounts = ref({ total: 0, active: 0, pending: 0, closed: 0, urgent: 0 })
const refreshCaseCounts = async (): Promise<void> => {
  try {
    const api = (window as any).api?.cases
    if (!api || typeof api.count !== 'function') return
    const base = { q: '', status: 'الكل', priority: 'الكل', page: 1, pageSize: 1 }
    const [total, active, pending, closed, urgent] = await Promise.all([
      api.count(base),
      api.count({ ...base, status: 'قيد النظر' }),
      api.count({ ...base, status: 'معلقة' }),
      api.count({ ...base, status: 'مغلقة' }),
      api.count({ ...base, priority: 'عالية' })
    ])
    caseCounts.value = {
      total: Number(total) || 0,
      active: Number(active) || 0,
      pending: Number(pending) || 0,
      closed: Number(closed) || 0,
      urgent: Number(urgent) || 0
    }
  } catch {}
}

const topPanelTab = ref<'calendar' | 'charts' | 'metrics'>('calendar')

watch(topPanelTab, () => {
  if (topPanelTab.value === 'charts') void refreshAnalytics(false)
})

const analyticsLoading = ref(false)
const analytics = ref<{
  total: number
  buckets: { new: number; review: number; court: number; done: number }
  trend: Record<string, number>
}>({
  total: 0,
  buckets: { new: 0, review: 0, court: 0, done: 0 },
  trend: {}
})

const pieLabels = ['جديدة', 'قيد المراجعة', 'في المحكمة', 'منتهية']
const pieColors = [
  'rgba(26, 67, 125, 0.85)',
  'rgba(245, 158, 11, 0.85)',
  'rgba(59, 130, 246, 0.85)',
  'rgba(16, 185, 129, 0.85)'
]

const pieData = computed(() => {
  const b = analytics.value.buckets
  return [b.new, b.review, b.court, b.done]
})

const trend = computed(() => {
  const keys = getSixMonthKeys(new Date())
  return keys.map((k) => ({
    key: k.key,
    label: k.label,
    value: Number(analytics.value.trend[k.key]) || 0
  }))
})
const trendLabels = computed(() => trend.value.map((p) => p.label))
const trendValues = computed(() => trend.value.map((p) => p.value))

const refreshAnalytics = async (force: boolean): Promise<void> => {
  if (analyticsLoading.value) return
  if (!force && analytics.value.total > 0) return
  analyticsLoading.value = true
  try {
    const data = await (window as any).api.cases.getDashboardAnalytics()
    if (data && typeof data === 'object') {
      analytics.value = {
        total: Number((data as any).total) || 0,
        buckets: {
          new: Number((data as any).buckets?.new) || 0,
          review: Number((data as any).buckets?.review) || 0,
          court: Number((data as any).buckets?.court) || 0,
          done: Number((data as any).buckets?.done) || 0
        },
        trend: ((data as any).trend as Record<string, number>) || {}
      }
    } else {
      analytics.value = {
        total: 0,
        buckets: { new: 0, review: 0, court: 0, done: 0 },
        trend: {}
      }
    }
  } catch {
    analytics.value = {
      total: 0,
      buckets: { new: 0, review: 0, court: 0, done: 0 },
      trend: {}
    }
  } finally {
    analyticsLoading.value = false
  }
}

const calendarAnchor = ref(new Date())
const weekDays = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']
const calendarMonthLabel = computed(() =>
  calendarAnchor.value.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' })
)

const selectedDate = ref(new Date().toLocaleDateString('en-CA'))
const monthSessions = ref<Session[]>([])

const calendarCells = computed(() => {
  const d = new Date(calendarAnchor.value.getFullYear(), calendarAnchor.value.getMonth(), 1)
  const startDow = (d.getDay() + 1) % 7
  const start = new Date(d)
  start.setDate(start.getDate() - startDow)
  const cells: { key: string; iso: string; day: number; inMonth: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const cur = new Date(start)
    cur.setDate(start.getDate() + i)
    const iso = cur.toLocaleDateString('en-CA')
    cells.push({
      key: `${iso}-${i}`,
      iso,
      day: cur.getDate(),
      inMonth: cur.getMonth() === calendarAnchor.value.getMonth()
    })
  }
  return cells
})

const refreshMonthSessions = async (): Promise<void> => {
  try {
    const { from, to } = getMonthRange(calendarAnchor.value)
    const data = await (window as any).api.sessions.list({
      page: 1,
      pageSize: 200,
      from,
      to,
      status: 'الكل'
    })
    monthSessions.value = Array.isArray(data) ? (data as Session[]) : []
  } catch {
    monthSessions.value = []
  }
}

const importantDates = computed(() => {
  const { from, to } = getMonthRange(calendarAnchor.value)
  return computeImportantDates({
    sessions: monthSessions.value,
    tasks: safeArray(tasksStore.pendingTasks),
    agencyAlerts: safeArray(agencyAlerts.value),
    from,
    to
  })
})

const importantDatesByDay = computed(() => {
  const map: Record<string, any[]> = {}
  for (const it of importantDates.value) {
    if (!map[it.date]) map[it.date] = []
    map[it.date].push(it)
  }
  return map
})

const selectedImportantDates = computed(() =>
  safeArray((importantDatesByDay.value as any)[selectedDate.value])
)

const selectDate = (iso: string) => {
  selectedDate.value = iso
}

const prevMonth = () => {
  const d = new Date(calendarAnchor.value)
  d.setMonth(d.getMonth() - 1)
  calendarAnchor.value = d
}

const nextMonth = () => {
  const d = new Date(calendarAnchor.value)
  d.setMonth(d.getMonth() + 1)
  calendarAnchor.value = d
}

watch(calendarAnchor, () => {
  void refreshMonthSessions()
})

const stats = computed(() => [
  {
    title: 'إجمالي الموكلين',
    value: safeLength(clientsStore.clients),
    icon: 'users',
    color: 'primary',
    to: '/clients'
  },
  {
    title: 'عدد الموظفين',
    value: employeesCount.value,
    icon: 'briefcase',
    color: 'primary',
    to: '/employees'
  },
  {
    title: 'القضايا النشطة',
    value: safeArray(casesStore.cases).filter((c) => c.status === 'قيد النظر').length,
    icon: 'gavel',
    color: 'indigo',
    to: '/cases'
  },
  {
    title: 'جلسات اليوم',
    value: safeLength(sessionsStore.todaySessions),
    icon: 'calendar-clock',
    color: 'accent',
    to: '/sessions'
  },
  {
    title: 'مهام معلقة',
    value: safeLength(tasksStore.pendingTasks),
    icon: 'clipboard-list',
    color: 'success',
    to: '/tasks'
  },
  {
    title: 'طلب تنفيذ',
    value: enforcementCount.value,
    icon: 'hand-coins',
    color: 'error',
    to: '/enforcement'
  }
])

const sessionHeadersCompact = [
  { title: 'الوقت', key: 'time', width: '70px', sortable: false },
  { title: 'العميل', key: 'client_name', sortable: false }
]

let refreshTimer: any = null
const stampRefresh = () => {
  lastRefreshTime.value = new Date().toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const runAutoRefresh = async (forceAnalytics: boolean) => {
  try {
    if (document.hidden) return
    await fetchData()
    await refreshCaseCounts()
    await refreshMonthSessions()
    if (forceAnalytics || topPanelTab.value === 'charts') await refreshAnalytics(forceAnalytics)
    stampRefresh()
  } catch {}
}

onMounted(async () => {
  if (bottomStripRef.value) {
    const el = bottomStripRef.value.$el as HTMLElement
    if (el) {
      bottomStripHeight.value = Math.round(el.getBoundingClientRect().height)
      bottomStripObserver = new ResizeObserver((entries) => {
        const h = Math.round(entries[0]?.contentRect?.height || 0)
        if (h > 0) bottomStripHeight.value = h
      })
      bottomStripObserver.observe(el)
    }
  }
  try {
    await safeCall('تهيئة لوحة التحكم', () => fetchData(), 12000)
  } catch (error) {
    console.error('Dashboard init error:', error)
  } finally {
    loading.value = false
  }

  try {
    const today = new Date().toLocaleDateString('en-CA')
    const alertsData = await safeCall(
      'تنبيهات النظام',
      () => (window as any).api.system.getAlerts(today),
      8000
    )
    alerts.value = safeArray(alertsData as any)
  } catch {}

  await refreshCaseCounts()

  void refreshMonthSessions()

  stampRefresh()
  refreshTimer = setInterval(() => {
    void runAutoRefresh(false)
  }, 60000)
})

onUnmounted(() => {
  bottomStripObserver?.disconnect()
  bottomStripObserver = null
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = null
})

const enforcementCount = ref(0)

const withTimeout = async <T,>(p: Promise<T>, ms: number, label: string): Promise<T> => {
  let timeoutId: any = null
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`انتهت مهلة ${label} (${ms / 1000}s)`)), ms)
  })
  try {
    return await Promise.race([p, timeout])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

const safeCall = async <T,>(label: string, fn: () => Promise<T>, ms: number): Promise<T | null> => {
  try {
    const p = fn()
    return await withTimeout(p, ms, label)
  } catch (e) {
    console.error(`[Dashboard] ${label} failed:`, e)
    return null
  }
}

const fetchAgencyAlerts = async () => {
  try {
    const today = new Date().toLocaleDateString('en-CA')
    const data = await (window as any).api.agencies.getExpiryAlerts({ today, days: 30 })
    agencyAlerts.value = safeArray(data as any)
  } catch (e) {
    console.error('Failed to fetch agency alerts:', e)
  }
}

const agencyEditDialog = ref({
  show: false,
  saving: false,
  valid: true,
  data: {} as any
})
const openEditAgency = (ag: any) => {
  agencyEditDialog.value.data = { ...ag }
  agencyEditDialog.value.show = true
}

const confirmDialog = ref({
  show: false,
  title: '',
  message: '',
  color: 'success',
  icon: 'check',
  confirmText: 'نعم، احفظ',
  cancelText: 'تراجع',
  loading: false,
  action: () => {}
})

const handleAgencySave = async (data: any) => {
  confirmDialog.value = {
    show: true,
    title: 'تأكيد تحديث الوكالة',
    message: 'هل أنت متأكد من رغبتك في حفظ التعديلات على سجل الوكالة؟',
    color: 'success',
    icon: 'check',
    confirmText: 'نعم، احفظ',
    cancelText: 'تراجع',
    loading: false,
    action: async () => {
      confirmDialog.value.loading = true
      try {
        agencyEditDialog.value.saving = true
        const dataToSave = JSON.parse(JSON.stringify(data))
        await agenciesStore.updateAgency(dataToSave.id, dataToSave)
        showMessage('تم تحديث بيانات الوكالة بنجاح')
        agencyEditDialog.value.show = false
        confirmDialog.value.show = false
        await fetchAgencyAlerts()
      } catch (e: any) {
        showMessage('فشل في تحديث الوكالة: ' + (e.message || e), 'error')
      } finally {
        agencyEditDialog.value.saving = false
        confirmDialog.value.loading = false
      }
    }
  }
}

const fetchData = async () => {
  const reqList = (window as any)?.api?.enforcement?.request?.list
  const enforcement =
    typeof reqList === 'function'
      ? await safeCall('طلبات التنفيذ', () => reqList({ page: 1, pageSize: 1 }), 8000)
      : null
  enforcementCount.value =
    (enforcement as any)?.total ?? (Array.isArray(enforcement) ? (enforcement as any[]).length : 0)

  await Promise.allSettled([
    safeCall('جلب الموكلين', () => clientsStore.fetchClients(), 8000),
    safeCall('جلب القضايا', () => casesStore.fetchCases(), 8000),
    safeCall('جلسات اليوم', () => sessionsStore.fetchTodaySessions(25), 8000),
    safeCall('جلسات الغد', () => sessionsStore.fetchTomorrowSessions(25), 8000),
    safeCall('المهام المعلقة', () => tasksStore.fetchPendingTasks(), 8000),
    safeCall('تنبيهات الوكالات', () => fetchAgencyAlerts(), 8000),
    safeCall(
      'جلب الموظفين',
      async () => {
        const rows = await (window as any).api.employees.list()
        employeesCount.value = Array.isArray(rows) ? rows.length : 0
      },
      8000
    )
  ])
}

</script>

<style scoped>
.dashboard-viewport {
  padding: 12px 16px !important;
  height: calc(100vh - 64px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dashboard-viewport--mobile {
  height: auto !important;
  overflow: visible !important;
}

.dashboard-grid {
  height: 100%;
  min-height: 0;
}

.dashboard-panel-card {
  background: var(--glass-bg-soft) !important;
  backdrop-filter: var(--glass-blur) !important;
  -webkit-backdrop-filter: var(--glass-blur) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 14px !important;
  box-shadow: var(--shadow-md) !important;
  transition: var(--transition-smooth);
}

.dashboard-panel-header {
  min-height: 52px;
}

.panel-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--accent-alpha);
}

.panel-icon {
  color: var(--accent);
}

.panel-title {
  font-weight: 800;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.panel-tabs .v-tab {
  font-size: 0.78rem !important;
  letter-spacing: 0.01em;
}

.panel-tab {
  min-width: auto !important;
}

.dashboard-bottom-inner-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

@media (min-width: 960px) {
  .dashboard-bottom-card,
  .dashboard-bottom-spacer {
    height: var(--dashboard-bottom-h, 160px);
  }
}

.dashboard-sessions-today :deep(.text-subtitle-2),
.dashboard-sessions-tomorrow :deep(.text-subtitle-2) {
  font-size: 0.8rem !important;
  line-height: 1.1 !important;
  font-weight: 800 !important;
}

.dashboard-list-mini :deep(.v-list-item-title) {
  font-size: 0.7rem !important;
  line-height: 1.1 !important;
  font-weight: 800 !important;
  color: #000 !important;
}

.dashboard-sessions-today :deep(.text-caption),
.dashboard-sessions-tomorrow :deep(.text-caption),
.dashboard-list-mini :deep(.v-list-item-subtitle) {
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
  color: #000 !important;
}

.dashboard-sessions-today :deep(.v-data-table__th),
.dashboard-sessions-tomorrow :deep(.v-data-table__th) {
  font-size: 0.85rem !important;
  font-weight: 900 !important;
  color: #000 !important;
}

[data-theme='dark'] .dashboard-sessions-today :deep(.v-data-table__td),
[data-theme='dark'] .dashboard-sessions-tomorrow :deep(.v-data-table__td) {
  color: #F1F5F9 !important;
}

[data-theme='dark'] .dashboard-sessions-today :deep(.v-data-table__th),
[data-theme='dark'] .dashboard-sessions-tomorrow :deep(.v-data-table__th) {
  color: #F1F5F9 !important;
}

[data-theme='dark'] .dashboard-list-mini :deep(.v-list-item-title) {
  color: #F1F5F9 !important;
}

@media (min-width: 1280px) {
  .dashboard-sidebar-stack {
    margin-top: -76px;
  }
}

@media (max-width: 768px) {
  .dashboard-viewport {
    height: auto !important;
    overflow: visible !important;
    padding: 8px 10px !important;
  }

  .dashboard-viewport :deep(.dashboard-grid .v-col) {
    flex: 0 0 100% !important;
    max-width: 100% !important;
  }

  .dashboard-viewport :deep(.panel-tabs .v-tab) {
    font-size: 0.7rem !important;
    padding: 0 6px !important;
    min-width: auto !important;
  }

  .dashboard-viewport :deep(.panel-title) {
    font-size: 0.8rem !important;
  }

  .dashboard-viewport :deep(.dashboard-bottom-inner-card) {
    margin-bottom: 12px;
  }
}
</style>
