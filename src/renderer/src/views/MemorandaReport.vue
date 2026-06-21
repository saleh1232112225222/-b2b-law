<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <PrintReportFrame title="بيان المذكرات واللوائح القانونية" />

    <!-- Header Section -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="file-signature" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">تقرير المذكرات واللوائح</h1>
            <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
              استعراض تحليلي لكافة الدفوع القانونية، المذكرات الجوابية، ولوائح الدعوى
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="auto">
        <v-btn
          variant="outlined"
          color="gold"
          class="rounded-lg px-6 font-weight-black premium-hover"
          @click="$router.push('/reports')"
        >
          <LucideIcon name="arrow-right" :size="18" class="me-2" /> رجوع للمركز
        </v-btn>
      </v-col>
    </v-row>

    <v-card
      elevation="0"
      class="glass-card pa-8 border-gold border-opacity-20 border-2 overflow-hidden"
    >
      <!-- Filters Row -->
      <v-row dense class="mb-8 align-center">
        <v-col cols="12" md="4">
          <v-select
            v-model="caseId"
            :items="cases"
            :loading="loadingCases"
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
        <v-col cols="12" md="3">
          <v-text-field
            v-model="from"
            label="من تاريخ"
            type="date"
            variant="outlined"
            class="glass-input"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="3">
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
          <v-btn
            color="accent"
            variant="flat"
            block
            height="56"
            class="rounded-xl font-weight-black premium-lift text-ebony"
            :loading="loading"
            @click="load"
          >
            استعلام
          </v-btn>
        </v-col>
      </v-row>

      <!-- Export Actions -->
      <div class="d-flex flex-wrap justify-end mb-8 gap-3">
        <v-btn
          variant="tonal"
          color="white"
          height="48"
          class="rounded-xl px-6 font-weight-black"
          @click="printPage"
        >
          <LucideIcon name="printer" :size="20" class="me-2 text-gold" /> طباعة
        </v-btn>
        <v-btn
          variant="tonal"
          color="white"
          height="48"
          class="rounded-xl px-6 font-weight-black"
          @click="exportPdf"
        >
          <LucideIcon name="file-text" :size="20" class="me-2 text-gold" /> تصدير PDF
        </v-btn>
        <v-btn
          variant="tonal"
          color="white"
          height="48"
          class="rounded-xl px-6 font-weight-black"
          :disabled="safeLength(rows) === 0"
          @click="exportCsv"
        >
          <LucideIcon name="file-spreadsheet" :size="20" class="me-2 text-gold" /> تصدير CSV
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

      <!-- Memoranda Table -->
      <div class="d-flex align-center mb-4">
        <div class="glass-panel-light pa-2 rounded-lg me-3 border border-gold border-opacity-10">
          <LucideIcon name="clipboard-list" :size="20" class="text-gold" />
        </div>
        <span class="text-h6 font-weight-black text-white">بيان المذكرات واللوائح الموثقة</span>
      </div>

      <v-card
        elevation="0"
        class="glass-card border border-gold border-opacity-10 rounded-xl overflow-hidden mb-8"
      >
        <v-table density="comfortable" class="premium-table">
          <thead>
            <tr>
              <th class="text-right text-gold font-weight-black">رقم القضية</th>
              <th class="text-right text-gold font-weight-black">عنوان المذكرة</th>
              <th class="text-right text-gold font-weight-black">تاريخ المذكرة</th>
              <th class="text-right text-gold font-weight-black">النوع</th>
              <th class="text-right text-gold font-weight-black">الحالة</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading">
              <tr v-for="i in 8" :key="i">
                <td colspan="5" class="pa-4">
                  <v-skeleton-loader type="table-row" color="transparent"></v-skeleton-loader>
                </td>
              </tr>
            </template>
            <template v-else>
              <tr v-if="safeLength(rows) === 0">
                <td colspan="5" class="text-center py-12 text-gold opacity-20">
                  لا توجد مذكرات مسجلة ضمن المعايير المحددة
                </td>
              </tr>
              <tr v-for="r in safeArray(rows)" :key="(r as any).id" class="premium-hover-row">
                <td class="text-caption font-mono text-accent font-weight-black">
                  {{ (r as any).case_number || '-' }}
                </td>
                <td
                  class="text-body-2 font-weight-black text-white text-truncate"
                  style="max-width: 300px"
                >
                  {{ (r as any).memo_title }}
                </td>
                <td class="text-caption text-white opacity-60">
                  {{ (r as any).memo_date || '-' }}
                </td>
                <td>
                  <v-chip
                    size="x-small"
                    variant="outlined"
                    color="accent"
                    class="font-weight-black px-4"
                  >
                    {{ (r as any).memo_type || '-' }}
                  </v-chip>
                </td>
                <td>
                  <v-chip
                    size="x-small"
                    :color="getStatusColor((r as any).memo_status)"
                    variant="flat"
                    class="text-ebony font-weight-black px-4"
                  >
                    {{ (r as any).memo_status || 'مسودة' }}
                  </v-chip>
                </td>
              </tr>
            </template>
          </tbody>
        </v-table>
      </v-card>

      <div
        class="mt-8 pa-4 glass-panel-light rounded-xl border border-gold border-opacity-10 d-flex align-center"
      >
        <LucideIcon name="info" :size="18" class="text-gold me-3" />
        <span class="text-subtitle-2 font-weight-black text-gold opacity-60"
          >إجمالي المذكرات المكتشفة في التقرير:</span
        >
        <v-spacer />
        <span class="text-h6 font-weight-black text-white">{{ safeLength(rows) }} مذكرة</span>
      </div>
    </v-card>

    <PrintSignaturePage />
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { safeArray, safeLength } from '../utils/safe'
import PrintReportFrame from '../components/common/PrintReportFrame.vue'
import PrintSignaturePage from '../components/common/PrintSignaturePage.vue'
import LucideIcon from '../components/common/LucideIcon.vue'

const caseId = ref<string | null>(null)
const from = ref('')
const to = ref('')
const rows = ref<any[]>([])
const loading = ref(false)
const loadingCases = ref(false)
const error = ref('')
const cases = ref<{ title: string; value: string }[]>([])

const load = async (): Promise<void> => {
  loading.value = true
  error.value = ''
  try {
    const res = await (window as any).api.reports.getMemorandaReport({
      caseId: caseId.value || undefined,
      from: from.value || undefined,
      to: to.value || undefined,
      page: 1,
      pageSize: 500
    })
    rows.value = safeArray(res.rows)
  } catch (e: unknown) {
    error.value = (e as Error)?.message || 'فشل تحميل تقرير المذكرات'
  } finally {
    loading.value = false
  }
}

const printPage = async () => {
  try {
    await (window as any).api.reports.printReport({
      type: 'memoranda_list',
      params: {
        caseId: caseId.value || undefined,
        from: from.value || undefined,
        to: to.value || undefined,
        q: ''
      }
    })
  } catch {
    error.value = 'فشل عملية الطباعة'
  }
}

const exportCsv = async (): Promise<void> => {
  if (safeLength(rows.value) === 0) return
  try {
    const res = await (window as any).api.reports.exportCsv('memoranda-report.csv', rows.value)
    const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = res.filename
    link.click()
    URL.revokeObjectURL(url)
  } catch {
    error.value = 'فشل تصدير ملف CSV'
  }
}

const exportPdf = async (): Promise<void> => {
  try {
    await (window as any).api.reports.exportPdf({
      type: 'memoranda_list',
      params: {
        caseId: caseId.value || undefined,
        from: from.value || undefined,
        to: to.value || undefined,
        q: ''
      }
    })
  } catch {
    error.value = 'فشل تصدير PDF'
  }
}

const getStatusColor = (status: string | undefined): string => {
  if (!status) return 'warning'
  if (status.includes('نهائية') || status.includes('Final')) return 'success'
  if (status.includes('مسودة') || status.includes('Draft')) return 'warning'
  return 'accent'
}

const loadCases = async (): Promise<void> => {
  loadingCases.value = true
  try {
    const data = await (window as any).api.reports.listCases()
    cases.value = safeArray(data).map((r: any) => ({
      value: r.id,
      title: `${r.case_number || r.id} — ${r.client_name || ''}`
    }))
  } catch {
    cases.value = []
  } finally {
    loadingCases.value = false
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
