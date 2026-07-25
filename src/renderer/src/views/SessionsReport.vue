<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <PrintReportFrame title="بيان الجلسات المنعقدة" />

    <!-- Header -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="calendar-range" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">تقرير تفصيلي للجلسات</h1>
            <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
              استعراض المواعيد القضائية، الجلسات المنعقدة، وحالة المرافعة لكافة القضايا
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="auto">
        <v-btn
          variant="outlined"
          color="gold"
          class="rounded-lg px-6 font-weight-black premium-hover premium-btn-gold-gradient"
          @click="$router.push('/reports')"
        >
          <LucideIcon name="arrow-right" :size="18" class="me-2" /> رجوع للمركز
        </v-btn>
      </v-col>
    </v-row>

    <v-card
      elevation="0"
      class="glass-card pa-8 border-gold border-opacity-20 border-2 overflow-hidden glass-card"
    >
      <!-- Filters Row -->
      <v-row dense class="mb-8 align-center">
        <v-col cols="12" md="4">
          <v-select
            v-model="caseId"
            :items="cases"
            item-title="title"
            item-value="value"
            label="تصفية حسب القضية"
            variant="outlined"
            class="glass-input"
            hide-details
            clearable
          >
            <template #prepend-inner>
              <LucideIcon name="briefcase" :size="20" class="text-gold me-2" />
            </template>
          </v-select>
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field
            v-model="from"
            label="من تاريخ"
            type="date"
            variant="outlined"
            class="glass-input"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field
            v-model="to"
            label="إلى تاريخ"
            type="date"
            variant="outlined"
            class="glass-input"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field
            v-model="q"
            label="بحث نصي..."
            variant="outlined"
            class="glass-input"
            hide-details
          >
            <template #prepend-inner>
              <LucideIcon name="search" :size="20" class="text-gold me-2" />
            </template>
          </v-text-field>
        </v-col>
        <v-col cols="12" md="2">
          <v-btn
            color="accent"
            variant="flat"
            block
            height="56"
            class="rounded-xl font-weight-black premium-lift text-ebony premium-btn-gold-gradient"
            :loading="loading"
            @click="load"
          >
            تحديث البيانات
          </v-btn>
        </v-col>
      </v-row>

      <!-- Export Actions -->
      <div class="d-flex flex-wrap justify-end mb-8 gap-3">
        <v-btn
          variant="tonal"
          color="white"
          height="48"
          class="rounded-xl px-6 font-weight-black premium-btn-gold-gradient"
          @click="showExportDialog = true"
        >
          <LucideIcon name="hard-drive-download" :size="20" class="me-2 text-gold" /> تصدير وحفظ التقرير
        </v-btn>
        <v-btn
          variant="tonal"
          color="white"
          height="48"
          class="rounded-xl px-6 font-weight-black premium-btn-gold-gradient"
          @click="printPage"
        >
          <LucideIcon name="printer" :size="20" class="me-2 text-gold" /> طباعة مباشرة
        </v-btn>
      </div>

      <v-alert
        v-if="error"
        type="error"
        variant="flat"
        class="mb-8 rounded-xl font-weight-black border-2 border-error-darken-1"
      >
        <template #prepend>
          <LucideIcon name="alert-triangle" :size="24" class="me-3" />
        </template>
        {{ error }}
      </v-alert>

      <!-- Date Range Context -->
      <div
        v-if="from || to"
        class="mb-8 d-flex align-center glass-panel-light pa-4 rounded-xl border border-gold border-opacity-10"
      >
        <LucideIcon name="calendar" :size="20" class="me-3 text-gold" />
        <div class="text-subtitle-1 font-weight-black text-accent">
          نطاق الجلسات: من {{ from || 'البداية' }} حتى {{ to || 'الآن' }}
        </div>
      </div>

      <!-- Chart Section -->
      <div class="d-flex align-center mb-4">
        <div class="glass-panel-light pa-2 rounded-lg me-3 border border-gold border-opacity-10">
          <LucideIcon name="bar-chart-3" :size="20" class="text-gold" />
        </div>
        <span class="text-h6 font-weight-black text-high-contrast">كثافة الجلسات الشهرية</span>
      </div>

      <v-card
        elevation="0"
        class="glass-panel-light pa-6 rounded-xl mb-12 border border-gold border-opacity-10 glass-card"
      >
        <v-skeleton-loader
          v-if="loading"
          type="image"
          height="180"
          color="transparent"
        ></v-skeleton-loader>
        <SimpleBarChart v-else :data="chartData()" :height="220" />
      </v-card>

      <!-- Sessions Table -->
      <div class="d-flex align-center mb-4">
        <div class="glass-panel-light pa-2 rounded-lg me-3 border border-gold border-opacity-10">
          <LucideIcon name="list" :size="20" class="text-gold" />
        </div>
        <span class="text-h6 font-weight-black text-high-contrast">بيان الجلسات التفصيلي</span>
      </div>

      <v-card
        elevation="0"
        class="glass-card border border-gold border-opacity-10 rounded-xl overflow-hidden mb-8 glass-card"
      >
        <v-table density="comfortable" class="premium-table">
          <thead>
            <tr>
              <th class="text-right text-gold font-weight-black">رقم الجلسة</th>
              <th class="text-right text-gold font-weight-black">التاريخ (م/هـ)</th>
              <th class="text-right text-gold font-weight-black">الوقت</th>
              <th class="text-right text-gold font-weight-black">رقم القضية</th>
              <th class="text-right text-gold font-weight-black">الموكل</th>
              <th class="text-right text-gold font-weight-black">الخصم</th>
              <th class="text-right text-gold font-weight-black">المحكمة / الدائرة</th>
              <th class="text-right text-gold font-weight-black">الحالة</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading">
              <tr v-for="i in 8" :key="i">
                <td colspan="8" class="pa-4">
                  <v-skeleton-loader type="table-row" color="transparent"></v-skeleton-loader>
                </td>
              </tr>
            </template>
            <template v-else>
              <tr v-if="safeLength(rows) === 0">
                <td colspan="8" class="text-center py-12 text-gold opacity-50 font-weight-black">
                  لا توجد جلسات مجدولة ضمن المعايير المختارة
                </td>
              </tr>
              <tr v-for="r in safeArray(rows)" :key="(r as any).id" class="premium-hover-row">
                <td>
                  <v-chip
                    size="x-small"
                    color="gold"
                    variant="tonal"
                    class="font-weight-black px-3"
                  >
                    الجلسة {{ arabicOrdinal((r as any).session_ordinal) }}
                  </v-chip>
                </td>
                <td>
                  <div class="d-flex flex-column py-1">
                    <span class="font-mono font-weight-black text-high-contrast text-body-2 mb-1">
                      {{ (r as any).date ? String((r as any).date).split('T')[0] : '-' }} م
                    </span>
                    <span class="font-mono text-gold text-caption font-weight-bold">
                      {{ (r as any).date_hijri || '-' }} هـ
                    </span>
                  </div>
                </td>
                <td>
                  <div class="d-flex align-center">
                    <LucideIcon name="clock" :size="15" class="me-2 text-gold" />
                    <span class="font-mono font-weight-black text-high-contrast text-body-2">
                      {{ (r as any).time || '-' }}
                    </span>
                  </div>
                </td>
                <td>
                  <v-chip
                    size="small"
                    variant="flat"
                    color="accent"
                    class="font-mono font-weight-black text-ebony px-3 rounded-lg"
                  >
                    {{ (r as any).case_number || '-' }}
                  </v-chip>
                </td>
                <td>
                  <span class="font-weight-black text-high-contrast text-body-2">
                    {{ (r as any).client_name || '-' }}
                  </span>
                </td>
                <td>
                  <span class="font-weight-bold text-medium-contrast text-caption">
                    {{ (r as any).opponent_name || '-' }}
                  </span>
                </td>
                <td>
                  <div class="text-caption text-gold font-weight-black">
                    <span>{{ (r as any).court_name || '-' }}</span>
                    <span
                      v-if="(r as any).court_room || (r as any).court_room_label"
                      class="ms-1 text-high-contrast"
                    >
                      / {{ (r as any).court_room_label || (r as any).court_room }}
                    </span>
                  </div>
                </td>
                <td>
                  <v-chip
                    size="small"
                    :class="getStatusBadgeClass((r as any).status)"
                    class="font-weight-black px-3 rounded-md"
                  >
                    {{ (r as any).status || 'غير محدد' }}
                  </v-chip>
                </td>
              </tr>
            </template>
          </tbody>
        </v-table>
      </v-card>

      <!-- Pagination -->
      <div class="d-flex justify-space-between align-center px-4">
        <div class="text-caption text-gold opacity-40 font-weight-black">
          الصفحة {{ page }} من إجمالي {{ totalRows }} جلسة
        </div>
        <div class="d-flex align-center gap-2">
          <v-btn
            icon
            size="small"
            variant="tonal"
            color="gold"
            class="rounded-lg premium-btn-gold-gradient"
            :disabled="page <= 1"
            @click="prevPage"
          >
            <LucideIcon name="chevron-right" :size="18" />
          </v-btn>
          <v-btn
            icon
            size="small"
            variant="tonal"
            color="gold"
            class="rounded-lg premium-btn-gold-gradient"
            :disabled="page >= totalPages"
            @click="nextPage"
          >
            <LucideIcon name="chevron-left" :size="18" />
          </v-btn>
        </div>
      </div>
    </v-card>

    <PrintSignaturePage />

    <ExportReportDialog
      v-model="showExportDialog"
      report-title="تقرير الجلسات المنعقدة"
      default-filename="تقرير_الجلسات"
      report-type="sessions"
      :rows-data="rows"
      :export-params="{
        caseId: caseId || undefined,
        from: from || undefined,
        to: to || undefined,
        q: q || undefined
      }"
    />
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SimpleBarChart from '../components/SimpleBarChart.vue'
import { safeArray, safeLength } from '../utils/safe'
import PrintReportFrame from '../components/common/PrintReportFrame.vue'
import PrintSignaturePage from '../components/common/PrintSignaturePage.vue'
import LucideIcon from '../components/common/LucideIcon.vue'
import ExportReportDialog from '../components/common/ExportReportDialog.vue'

const showExportDialog = ref(false)
const from = ref('')
const to = ref('')
const q = ref('')
const caseId = ref<string | null>(null)
const rows = ref<any[]>([])
const loading = ref(false)
const error = ref('')
const page = ref(1)
const pageSize = 50
const totalRows = ref(0)
const totalPages = ref(1)
const cases = ref<{ title: string; value: string }[]>([])

const arabicOrdinal = (n: number | undefined) => {
  const map: Record<number, string> = {
    1: 'الأولى',
    2: 'الثانية',
    3: 'الثالثة',
    4: 'الرابعة',
    5: 'الخامسة',
    6: 'السادسة',
    7: 'السابعة',
    8: 'الثامنة',
    9: 'التاسعة',
    10: 'العاشرة'
  }
  const v = Number(n)
  if (!Number.isFinite(v) || v <= 0) return '-'
  return map[v] || `رقم ${v}`
}

const load = async (): Promise<void> => {
  loading.value = true
  error.value = ''
  try {
    const res = await (window as any).api.reports.getSessionsReport({
      from: from.value || undefined,
      to: to.value || undefined,
      q: q.value || undefined,
      caseId: caseId.value || undefined,
      page: page.value,
      pageSize
    })
    rows.value = safeArray(res.rows)
    totalRows.value = res.pageInfo?.totalRows || 0
    totalPages.value = Math.max(1, Math.ceil(totalRows.value / pageSize))
  } catch (e: unknown) {
    error.value = (e as Error)?.message || 'فشل تحميل تقرير الجلسات'
  } finally {
    loading.value = false
  }
}

const printPage = () => {
  window.print()
}

const exportCsv = async (): Promise<void> => {
  if (safeLength(rows.value) === 0) return
  try {
    const res = await (window as any).api.reports.exportCsv('sessions-report.csv', rows.value)
    const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = res.filename
    link.click()
    URL.revokeObjectURL(url)
  } catch (e: unknown) {
    error.value = (e as Error)?.message || 'فشل تصدير ملف CSV'
  }
}

const exportPdf = async (): Promise<void> => {
  try {
    await (window as any).api.reports.exportPdf({
      type: 'sessions',
      params: {
        caseId: caseId.value || undefined,
        from: from.value || undefined,
        to: to.value || undefined,
        q: q.value || undefined
      }
    })
  } catch (e: unknown) {
    error.value = (e as Error)?.message || 'فشل تصدير PDF'
  }
}

const prevPage = () => {
  if (page.value <= 1) return
  page.value -= 1
  load()
}

const nextPage = () => {
  if (page.value >= totalPages.value) return
  page.value += 1
  load()
}

const chartData = () => {
  const counts: Record<string, number> = {}
  safeArray(rows.value).forEach((r: any) => {
    const date = String(r.date || '')
    const key = date ? date.slice(0, 7) : 'غير معروف'
    counts[key] = (counts[key] || 0) + 1
  })
  return Object.keys(counts)
    .sort()
    .map((k) => ({
      label: k,
      value: counts[k],
      color: '#D4AF37'
    }))
}

const getStatusColor = (status: string | undefined): string => {
  if (!status) return 'grey'
  if (status.includes('منتهية')) return 'success'
  if (status.includes('قادمة')) return 'accent'
  if (status.includes('مؤجلة')) return 'warning'
  if (status.includes('ملغاة')) return 'error'
  return 'gold'
}

const getStatusBadgeClass = (status: string | undefined): string => {
  if (!status) return 'status-badge-next'
  if (status.includes('منتهية')) return 'status-badge-finished'
  if (status.includes('قادمة')) return 'status-badge-next'
  if (status.includes('مؤجلة')) return 'status-badge-delayed'
  if (status.includes('ملغاة')) return 'status-badge-canceled'
  return 'status-badge-next'
}

const loadCases = async (): Promise<void> => {
  try {
    const data = await (window as any).api.reports.listCases()
    cases.value = safeArray(data).map((r: any) => ({
      value: r.id,
      title: `${r.case_number || r.id} — ${r.client_name || ''}`
    }))
  } catch {
    cases.value = []
  }
}

onMounted(() => {
  loadCases()
  load()
})
</script>

<style scoped>
.rtl {
  direction: rtl;
}
.font-mono {
  font-family: 'Consolas', 'Monaco', monospace;
}
.gap-2 {
  gap: 0.5rem;
}
.gap-3 {
  gap: 0.75rem;
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
