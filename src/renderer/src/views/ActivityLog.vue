<template>
  <v-container fluid class="activity-log-container pa-6 rtl">
    <v-card elevation="0" class="glass-card overflow-hidden glass-card">
      <div class="glass-panel d-flex align-center py-4 px-6 border-b">
        <LucideIcon name="history" :size="24" class="text-accent me-3" />
        <span class="text-h5 font-weight-black text-gold">سجل النشاط</span>
        <v-spacer></v-spacer>
        <v-btn
          variant="text"
          color="gold"
          class="font-weight-black opacity-70 premium-btn-gold-gradient"
          @click="$router.push('/reports')"
        >
          <LucideIcon name="arrow-left" :size="18" class="me-2" /> رجوع
        </v-btn>
        <v-btn
          v-if="canClearLogs"
          color="error"
          variant="tonal"
          class="rounded-lg ms-2 font-weight-black premium-btn-gold-gradient"
          @click="showClearDialog = true"
        >
          <LucideIcon name="trash-2" :size="18" class="me-2" /> تنظيف السجل
        </v-btn>
      </div>

      <v-card-text class="pa-0">
        <!-- Filters Area -->
        <v-expand-transition>
          <div v-if="showFilters" class="filters-panel pa-6 border-b glass-panel-light">
            <v-row dense>
              <v-col cols="12" sm="3">
                <v-select
                  v-model="filters.module_key"
                  :items="modules"
                  label="المجال (Module)"
                  density="comfortable"
                  variant="outlined"
                  clearable
                  hide-details
                  class="glass-input"
                ></v-select>
              </v-col>
              <v-col cols="12" sm="2">
                <v-select
                  v-model="filters.action_key"
                  :items="actions"
                  label="العملية"
                  density="comfortable"
                  variant="outlined"
                  clearable
                  hide-details
                  class="glass-input"
                ></v-select>
              </v-col>
              <v-col cols="12" sm="3">
                <v-text-field
                  v-model="filters.search"
                  label="بحث في التفاصيل..."
                  density="comfortable"
                  variant="outlined"
                  hide-details
                  class="glass-input"
                  clearable
                >
                  <template #prepend-inner>
                    <LucideIcon name="search" :size="18" class="text-gold opacity-50" />
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="12" sm="2">
                <v-text-field
                  v-model="filters.startDate"
                  label="من تاريخ"
                  type="date"
                  density="comfortable"
                  variant="outlined"
                  hide-details
                  class="glass-input"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="2">
                <v-text-field
                  v-model="filters.endDate"
                  label="إلى تاريخ"
                  type="date"
                  density="comfortable"
                  variant="outlined"
                  hide-details
                  class="glass-input"
                ></v-text-field>
              </v-col>
            </v-row>
            <div class="d-flex justify-end mt-4">
              <v-btn
                variant="text"
                color="gold"
                class="me-2 opacity-70 font-weight-black premium-btn-gold-gradient"
                @click="resetFilters"
              >
                إعادة تعيين
              </v-btn>
              <v-btn
                color="accent"
                class="rounded-lg px-6 font-weight-black premium-btn-gold-gradient"
                @click="loadLogs"
              >
                تطبيق الفلاتر
              </v-btn>
              <v-btn
                variant="tonal"
                color="gold"
                class="ms-2 font-weight-black premium-btn-gold-gradient"
                @click="exportPdf"
              >
                <LucideIcon name="file-down" :size="18" class="me-2" /> تصدير PDF
              </v-btn>
            </div>
          </div>
        </v-expand-transition>

        <div
          class="d-flex justify-space-between align-center pa-4 px-6 border-b glass-panel-darker"
        >
          <div class="text-subtitle-2 text-gold opacity-70">
            إجمالي السجلات: <span class="font-weight-black text-accent">{{ totalCount }}</span>
          </div>
          <v-btn
            variant="text"
            :color="showFilters ? 'accent' : 'gold'"
            class="opacity-70 premium-btn-gold-gradient"
            @click="showFilters = !showFilters"
          >
            <LucideIcon :name="showFilters ? 'filter-x' : 'filter'" :size="20" />
          </v-btn>
        </div>

        <!-- Data Table -->
        <v-table hover fixed-header height="calc(100vh - 370px)" class="premium-table">
          <thead>
            <tr>
              <th class="text-right text-gold font-weight-black">التوقيت</th>
              <th class="text-right text-gold font-weight-black">العملية</th>
              <th class="text-right text-gold font-weight-black">المجال</th>
              <th class="text-right text-gold font-weight-black">الوصف</th>
              <th class="text-right text-gold font-weight-black">المرجع</th>
              <th class="text-center text-gold font-weight-black">التفاصيل</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading">
              <tr v-for="i in 10" :key="i">
                <td colspan="6" class="pa-0">
                  <v-skeleton-loader
                    type="table-row"
                    height="48"
                    class="bg-transparent"
                  ></v-skeleton-loader>
                </td>
              </tr>
            </template>
            <template v-else>
              <tr v-if="safeLength(logs) === 0">
                <td colspan="6" class="pa-0">
                  <v-empty-state
                    :icon="ICONS.ACTION.SEARCH"
                    title="لا توجد سجلات"
                    text="لم يتم العثور على أي نشاط يطابق معايير البحث الحالية."
                    class="premium-table mt-4 text-gold py-12"
                  >
                    <template #media>
                      <LucideIcon name="search-x" :size="48" class="text-gold opacity-20 mb-4" />
                    </template>
                  </v-empty-state>
                </td>
              </tr>
              <tr
                v-for="log in safeArray(logs)"
                :key="(log as ActivityLog).id"
                class="premium-hover-row"
              >
                <td class="text-tiny font-weight-black text-gold opacity-70">
                  {{ formatDateTime((log as ActivityLog).timestamp) }}
                </td>
                <td>
                  <v-chip
                    :color="getActionColor((log as ActivityLog).action_key)"
                    size="x-small"
                    variant="flat"
                    class="font-weight-black"
                  >
                    {{ getActionLabel((log as ActivityLog).action_key) }}
                  </v-chip>
                </td>
                <td>
                  <div class="d-flex align-center">
                    <LucideIcon
                      :name="getModuleIcon((log as ActivityLog).module_key)"
                      :size="16"
                      class="me-2 text-gold opacity-50"
                    />
                    <span class="text-body-2 text-white">{{
                      getModuleLabel((log as ActivityLog).module_key)
                    }}</span>
                  </div>
                </td>
                <td
                  class="text-body-2 text-white font-weight-medium text-truncate"
                  style="max-width: 300px"
                >
                  {{ (log as ActivityLog).details }}
                </td>
                <td class="text-body-2 text-gold opacity-70">
                  {{ (log as ActivityLog).entity_name || '---' }}
                </td>
                <td class="text-center">
                  <v-btn
                    class="premium-btn-gold-gradient"
                    variant="text"
                    density="comfortable"
                    color="accent"
                    @click="viewDetails(log as ActivityLog)"
                  >
                    <LucideIcon name="eye" :size="18" />
                  </v-btn>
                </td>
              </tr>
            </template>
          </tbody>
        </v-table>

        <div class="d-flex align-center justify-space-between px-6 py-3 border-t glass-panel">
          <div class="text-tiny text-gold opacity-50">صفحة {{ page }} من {{ totalPages }}</div>
          <div class="d-flex align-center">
            <v-select
              v-model="pageSize"
              :items="[10, 25, 50, 100]"
              label="حجم الصفحة"
              density="compact"
              variant="outlined"
              hide-details
              style="width: 140px"
              class="me-3 glass-input"
            />
            <v-pagination
              v-model="page"
              :length="totalPages"
              :total-visible="5"
              density="comfortable"
              active-color="accent"
              class="text-gold"
            />
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Details Modal -->
    <v-dialog v-model="detailsModal" width="90%" max-width="800" persistent scrollable>
      <v-card class="glass-card overflow-hidden glass-card">
        <div class="glass-panel d-flex align-center pa-4 px-6 border-b">
          <LucideIcon name="search-code" :size="24" class="text-accent me-3" />
          <span class="text-h6 font-weight-black text-gold">تفاصيل النشاط</span>
          <v-spacer></v-spacer>
          <v-btn
            class="premium-btn-gold-gradient"
            variant="text"
            density="comfortable"
            color="gold"
            @click="detailsModal = false"
          >
            <LucideIcon name="x" :size="20" />
          </v-btn>
        </div>
        <v-card-text class="pa-6 modal-scrollable bg-primary-dark">
          <v-row dense>
            <v-col cols="12" sm="6">
              <div class="detail-row mb-4">
                <span class="text-tiny text-gold opacity-50 mb-1">تاريخ ووقت النشاط</span>
                <span class="text-body-1 text-white font-weight-black">{{
                  formatDateTime(selectedLog?.timestamp)
                }}</span>
              </div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="detail-row mb-4">
                <span class="text-tiny text-gold opacity-50 mb-1">المستخدم المسؤول</span>
                <span class="text-body-1 text-accent font-weight-black">{{
                  selectedLog?.actor || 'غير معروف'
                }}</span>
              </div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="detail-row mb-4">
                <span class="text-tiny text-gold opacity-50 mb-1">المجال / الوحدة</span>
                <span class="text-body-1 text-white font-weight-black">{{
                  getModuleLabel(selectedLog?.module_key)
                }}</span>
              </div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="detail-row mb-4">
                <span class="text-tiny text-gold opacity-50 mb-1">نوع العملية</span>
                <div>
                  <v-chip
                    :color="getActionColor(selectedLog?.action_key || '')"
                    size="small"
                    variant="flat"
                    class="font-weight-black mt-1"
                  >
                    {{ getActionLabel(selectedLog?.action_key || '') }}
                  </v-chip>
                </div>
              </div>
            </v-col>
          </v-row>

          <v-divider class="my-6 border-gold opacity-10"></v-divider>

          <div class="detail-row mb-6">
            <span class="text-tiny text-gold opacity-50 mb-2">الوصف المباشر</span>
            <div class="glass-panel-light pa-4 rounded-lg text-white leading-relaxed">
              {{ selectedLog?.details }}
            </div>
          </div>

          <div class="detail-row mb-6">
            <span class="text-tiny text-gold opacity-50 mb-2"
              >مرجع الكيان المتربط (Entity Reference)</span
            >
            <div class="d-flex align-center">
              <span class="text-body-1 text-gold font-weight-black">{{
                selectedLog?.entity_name || '---'
              }}</span>
              <v-chip size="x-small" variant="tonal" color="accent" class="ms-3 font-mono">
                ID: {{ selectedLog?.entity_id || 'N/A' }}
              </v-chip>
            </div>
          </div>

          <div class="text-subtitle-2 mb-3 font-weight-black text-gold d-flex align-center">
            <LucideIcon name="database" :size="16" class="me-2 text-accent" />
            البيانات التقنية (Metadata)
          </div>
          <pre
            class="metadata-box pa-4 rounded-lg glass-panel-darker text-tiny text-accent font-mono overflow-auto"
            >{{ formatMetadata(selectedLog?.metadata_json) }}</pre
          >
        </v-card-text>
        <v-card-actions class="pa-6 glass-panel">
          <v-btn
            color="accent"
            block
            variant="flat"
            height="48"
            class="font-weight-black rounded-lg premium-btn-gold-gradient"
            @click="detailsModal = false"
            >إغلاق النافذة</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Clear Dialog -->
    <v-dialog v-model="showClearDialog" width="90%" max-width="500" persistent>
      <v-card class="glass-card overflow-hidden glass-card">
        <div class="bg-error pa-4 text-white d-flex align-center">
          <LucideIcon name="alert-triangle" :size="24" class="me-3" />
          <span class="text-h6 font-weight-black">تأكيد تطهير السجلات</span>
        </div>
        <v-card-text class="pa-8 text-center bg-primary-dark">
          <LucideIcon name="history" :size="64" class="text-error opacity-20 mb-4" />
          <p class="text-h6 font-weight-black text-white mb-2">أنت على وشك حذف السجلات نهائياً</p>
          <p class="text-body-2 text-gold opacity-70 mb-6 leading-relaxed">
            سيتم حذف السجلات التي مضى عليها أكثر من
            <span class="text-accent font-weight-black">{{ retentionDays }}</span> يوماً. لا يمكن
            التراجع عن هذا الإجراء.
          </p>
          <v-text-field
            v-model="clearConfirm"
            placeholder="اكتب (حذف) للتأكيد"
            variant="outlined"
            density="comfortable"
            hide-details
            class="glass-input text-right glass-input"
            autocomplete="off"
          />
        </v-card-text>
        <v-divider class="border-gold opacity-10"></v-divider>
        <v-card-actions class="pa-6 bg-primary-dark d-flex flex-column gap-3">
          <v-btn
            color="error"
            variant="flat"
            block
            height="52"
            class="rounded-lg font-weight-black premium-btn-gold-gradient"
            :disabled="clearConfirm.trim() !== 'حذف' && clearConfirm.trim() !== 'DELETE'"
            @click="clearLogs"
          >
            تأكيد المسح النهائي
          </v-btn>
          <v-btn
            variant="text"
            block
            height="48"
            class="rounded-lg text-gold opacity-50 font-weight-black premium-btn-gold-gradient"
            @click="showClearDialog = false"
          >
            إلغاء وتراجع
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import { safeArray, safeLength } from '../utils/safe'
import LucideIcon from '../components/common/LucideIcon.vue'
import { ICONS } from '../config/icons'

interface ActivityLog {
  id: string
  action_key: string
  module_key: string
  details: string
  entity_id?: string
  entity_name?: string
  actor: string
  metadata_json?: string
  timestamp: string
}

const logs = ref<ActivityLog[]>([])
const loading = ref(false)
const showFilters = ref(false)
const detailsModal = ref(false)
const selectedLog = ref<ActivityLog | null>(null)
const showClearDialog = ref(false)
const clearConfirm = ref('')
const totalCount = ref(0)
const page = ref(1)
const pageSize = ref(25)
const totalPages = ref(1)
const retentionDays = ref(30)
const canClearLogs = ref(false)
const isMounted = ref(false)

const filters = ref({
  module_key: null as string | null,
  action_key: null as string | null,
  search: '',
  startDate: '',
  endDate: ''
})

const modules = [
  { title: 'الموكلين', value: 'clients' },
  { title: 'القضايا', value: 'cases' },
  { title: 'الجلسات', value: 'sessions' },
  { title: 'المهمات', value: 'tasks' },
  { title: 'الأحكام', value: 'judgments' },
  { title: 'المستندات', value: 'documents' },
  { title: 'المالية', value: 'finances' },
  { title: 'الفواتير', value: 'invoices' },
  { title: 'السندات', value: 'vouchers' },
  { title: 'الذمم', value: 'receivables' },
  { title: 'النظام', value: 'system' }
]

const actions = [
  { title: 'إضافة', value: 'create' },
  { title: 'تعديل', value: 'update' },
  { title: 'حذف', value: 'delete' },
  { title: 'رفع ملف', value: 'upload' },
  { title: 'سداد', value: 'payment' },
  { title: 'تشغيل', value: 'system_start' },
  { title: 'إغلاق', value: 'system_stop' },
  { title: 'تهيئة', value: 'system_init' }
]

const buildPlainFilters = () => {
  return {
    module_key: filters.value.module_key || undefined,
    action_key: filters.value.action_key || undefined,
    search: filters.value.search || undefined,
    startDate: filters.value.startDate || undefined,
    endDate: filters.value.endDate || undefined
  }
}

const loadLogs = async (): Promise<void> => {
  if (loading.value) return
  loading.value = true
  try {
    const api = (window as any).api
    if (!api?.activityLogs) {
      console.warn('Activity Logs API not available')
      return
    }

    const plainFilters = buildPlainFilters()
    const count = await api.activityLogs.count(plainFilters)

    if (!isMounted.value) return

    totalCount.value = count || 0
    totalPages.value = Math.max(1, Math.ceil(totalCount.value / pageSize.value))

    if (page.value > totalPages.value) page.value = totalPages.value

    const result = await api.activityLogs.list({
      page: page.value,
      pageSize: pageSize.value,
      filters: plainFilters
    })

    if (isMounted.value) {
      logs.value = safeArray(result)
    }
  } catch (err: unknown) {
    console.error('Error loading logs:', err)
    if (isMounted.value) {
      logs.value = []
      totalCount.value = 0
      totalPages.value = 1
    }
  } finally {
    if (isMounted.value) {
      loading.value = false
    }
  }
}

const resetFilters = (): void => {
  filters.value = {
    module_key: null,
    action_key: null,
    search: '',
    startDate: '',
    endDate: ''
  }
  page.value = 1
  loadLogs()
}

const exportPdf = async (): Promise<void> => {
  try {
    await (window as any).api.reports.exportPdf({
      type: 'activity_log',
      params: { ...filters.value }
    })
  } catch (e: unknown) {
    console.error('Export error:', e)
  }
}

const formatDateTime = (ts: string | undefined): string => {
  if (!ts) return ''
  try {
    const isoStr = ts.includes(' ') ? ts.replace(' ', 'T') : ts
    const date = new Date(isoStr)
    if (isNaN(date.getTime())) return ts

    return new Intl.DateTimeFormat('ar-SA', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date)
  } catch (e: unknown) {
    return ts || ''
  }
}

const getActionLabel = (key: string): string => {
  const map: Record<string, string> = {
    create: 'إضافة',
    update: 'تعديل',
    delete: 'حذف',
    upload: 'رفع ملف',
    payment: 'سداد',
    system_start: 'تشغيل النظام',
    system_stop: 'إغلاق النظام',
    system_init: 'تهيئة القاعدة'
  }
  return map[key] || key
}

const getActionColor = (key: string): string => {
  const map: Record<string, string> = {
    create: 'success',
    update: 'info',
    delete: 'error',
    upload: 'deep-purple',
    payment: 'teal',
    system_start: 'primary',
    system_stop: 'orange-darken-4',
    system_init: 'blue-grey'
  }
  return map[key] || 'grey'
}

const getModuleLabel = (key: string | undefined): string => {
  if (!key) return '---'
  const item = modules.find((m) => m.value === key)
  return item ? item.title : key
}

const getModuleIcon = (key: string | undefined): string => {
  if (!key) return 'box'
  const map: Record<string, string> = {
    clients: 'users',
    cases: 'gavel',
    sessions: 'calendar',
    tasks: 'check-square',
    judgments: 'file-certificate',
    documents: 'files',
    finances: 'banknote',
    invoices: 'receipt',
    vouchers: 'banknote',
    receivables: 'banknote',
    system: 'cog'
  }
  return map[key] || 'box'
}

const viewDetails = (log: ActivityLog): void => {
  selectedLog.value = log
  detailsModal.value = true
}

const formatMetadata = (json: string | undefined): string => {
  if (!json || json === '{}' || json === 'null') return 'لا توجد بيانات إضافية'
  try {
    return JSON.stringify(JSON.parse(json), null, 2)
  } catch {
    return json
  }
}

const clearLogs = async (): Promise<void> => {
  try {
    const days = Number(retentionDays.value || 30)
    const cleanupThreshold = new Date()
    cleanupThreshold.setDate(cleanupThreshold.getDate() - days)
    const dateStr = cleanupThreshold.toISOString().split('T')[0]

    await (window as any).api.activityLogs.clearBeforeDate(dateStr)
    showClearDialog.value = false
    clearConfirm.value = ''
    loadLogs()
  } catch (err: unknown) {
    console.error('Error clearing logs:', err)
  }
}

onMounted(async () => {
  isMounted.value = true

  // Check permissions
  try {
    const sessionRaw = localStorage.getItem('web_currentUserSession')
    if (sessionRaw) {
      const s = JSON.parse(sessionRaw) as { roleKey?: string; permissions?: string[] }
      canClearLogs.value =
        s?.roleKey === 'admin' ||
        (Array.isArray(s?.permissions) && s.permissions.includes('clear_activity_logs'))
    }
  } catch (e: unknown) {
    console.error('Permission check failed:', e)
  }

  // Load retention settings
  try {
    const settings = await (window as any).api.settings.get()
    const d = Number(settings?.activityLogRetentionDays || 365)
    if (Number.isFinite(d) && d > 0) retentionDays.value = d
  } catch (e: unknown) {
    console.error('Settings load failed:', e)
  }

  await loadLogs()
})

onBeforeUnmount(() => {
  isMounted.value = false
})

watch([page, pageSize], () => {
  loadLogs()
})
</script>

<style scoped>
.activity-log-container {
  max-width: 1400px;
  margin: 0 auto;
}

.filters-panel {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.activity-table :deep(th) {
  background: rgba(255, 255, 255, 0.05) !important;
  font-size: 0.85rem !important;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(212, 175, 55, 0.1) !important;
}

.activity-table :deep(td) {
  border-bottom: 1px solid rgba(212, 175, 55, 0.05) !important;
}

.premium-hover-row:hover {
  background: rgba(212, 175, 55, 0.03) !important;
}

.font-mono {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
}

.detail-row {
  display: flex;
  flex-direction: column;
}

.metadata-box {
  max-height: 300px;
  white-space: pre-wrap;
  word-break: break-all;
  direction: ltr !important;
  text-align: left !important;
  line-height: 1.5;
}

.italic {
  font-style: italic;
}

.gap-3 {
  gap: 0.75rem;
}

.leading-relaxed {
  line-height: 1.6 !important;
}

/* RTL Specifics */
.rtl {
  direction: rtl;
}

/* Mobile (<=1023px only) */
@media (max-width: 1023px) {
  :deep(.v-row.mb-8.align-center > .v-col-auto) {
    flex: 0 0 100% !important;
    max-width: 100% !important;
    margin-top: 8px;
  }
  :deep(.v-row.mb-8.align-center > .v-col-auto .v-btn) {
    width: 100% !important;
  }
  :deep(.v-table) {
    overflow-x: auto !important;
    display: block !important;
  }
  :deep(.v-table thead th) {
    white-space: nowrap !important;
    font-size: 0.7rem !important;
    padding: 8px !important;
  }
  :deep(.v-table tbody td) {
    padding: 8px !important;
    font-size: 0.78rem !important;
  }
  :deep(.v-data-table .v-table__wrapper) {
    overflow-x: auto !important;
  }
  :deep(.v-dialog > .v-overlay__content) {
    width: 95vw !important;
    max-width: 95vw !important;
    margin: 8px !important;
  }
  :deep(.v-card-text.pa-8) {
    padding: 12px !important;
  }
  :deep(.v-card-actions.pa-8) {
    padding: 12px !important;
    flex-wrap: wrap !important;
    gap: 8px !important;
  }
  :deep(.v-card-actions .v-spacer) {
    display: none !important;
  }
  :deep(.v-card-actions .v-btn) {
    flex: 1 1 auto !important;
    min-width: 100px !important;
  }
}
</style>
