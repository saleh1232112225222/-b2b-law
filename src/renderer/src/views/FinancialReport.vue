<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <PrintReportFrame title="ملخص العمليات المالية" />

    <!-- Header -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="banknote" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">التقرير المالي الأساسي</h1>
            <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
              تحليل شامل للتدفقات النقدية، المصروفات الإدارية، والأرصدة الختامية للمكتب
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
            :loading="loadingCases"
            item-title="title"
            item-value="value"
            label="تصفية حسب القضية"
            variant="outlined"
            class="glass-input glass-input"
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
            class="glass-input glass-input"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field
            v-model="to"
            label="إلى تاريخ"
            type="date"
            variant="outlined"
            class="glass-input glass-input"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-select
            v-model="type"
            :items="types"
            label="نوع العملية"
            variant="outlined"
            class="glass-input glass-input"
            hide-details
            clearable
          >
            <template #prepend-inner>
              <LucideIcon name="filter" :size="20" class="text-gold me-2" />
            </template>
          </v-select>
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
            تحديث التقرير
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
          @click="printPage"
        >
          <LucideIcon name="printer" :size="20" class="me-2 text-gold" /> طباعة
        </v-btn>
        <v-btn
          variant="tonal"
          color="white"
          height="48"
          class="rounded-xl px-6 font-weight-black premium-btn-gold-gradient"
          @click="exportPdf"
        >
          <LucideIcon name="file-text" :size="20" class="me-2 text-gold" /> تصدير PDF
        </v-btn>
        <v-btn
          variant="tonal"
          color="white"
          height="48"
          class="rounded-xl px-6 font-weight-black premium-btn-gold-gradient"
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

      <!-- KPI Summary -->
      <v-row v-if="loading" dense class="mb-12">
        <v-col v-for="i in 3" :key="i" cols="12" md="4">
          <v-skeleton-loader
            type="card"
            height="120"
            color="transparent"
            class="glass-card"
          ></v-skeleton-loader>
        </v-col>
      </v-row>
      <v-row v-else-if="totals" dense class="mb-12">
        <v-col cols="12" md="4">
          <v-card
            elevation="0"
            class="glass-panel-light pa-6 rounded-xl text-center border border-success border-opacity-30 glass-card"
          >
            <LucideIcon
              name="trending-up"
              :size="24"
              class="text-success opacity-40 mb-3 mx-auto"
            />
            <div class="text-subtitle-2 font-weight-black text-gold opacity-60 mb-1">
              إجمالي الدخل
            </div>
            <div class="text-h5 font-weight-black text-success">
              {{ formatCurrency(totals.totalIn) }}
              <span class="text-caption">ر.س</span>
            </div>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card
            elevation="0"
            class="glass-panel-light pa-6 rounded-xl text-center border border-error border-opacity-30 glass-card"
          >
            <LucideIcon
              name="trending-down"
              :size="24"
              class="text-error opacity-40 mb-3 mx-auto"
            />
            <div class="text-subtitle-2 font-weight-black text-gold opacity-60 mb-1">
              إجمالي المصروف
            </div>
            <div class="text-h5 font-weight-black text-error">
              {{ formatCurrency(totals.totalOut) }}
              <span class="text-caption">ر.س</span>
            </div>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card
            elevation="0"
            class="glass-panel-light pa-6 rounded-xl text-center border border-gold border-opacity-30 glass-card"
          >
            <LucideIcon name="wallet" :size="24" class="text-gold opacity-40 mb-3 mx-auto" />
            <div class="text-subtitle-2 font-weight-black text-gold opacity-60 mb-1">
              الرصيد الختامي
            </div>
            <div class="text-h5 font-weight-black text-white">
              {{ formatCurrency(totals.balance) }}
              <span class="text-caption text-gold">ر.س</span>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-divider class="border-gold opacity-10 mb-12" />

      <!-- Monthly Charts -->
      <div class="d-flex align-center mb-6">
        <div class="glass-panel-light pa-2 rounded-lg me-3 border border-gold border-opacity-10">
          <LucideIcon name="bar-chart-3" :size="20" class="text-gold" />
        </div>
        <span class="text-h6 font-weight-black text-white">المخطط الشهري المقارن</span>
      </div>

      <v-row dense class="mb-12">
        <v-col cols="12" md="6">
          <v-card
            elevation="0"
            class="glass-panel-light pa-6 rounded-xl border border-gold border-opacity-10 h-100 glass-card"
          >
            <div class="text-subtitle-2 font-weight-black text-success mb-4 d-flex align-center">
              <LucideIcon name="arrow-up-right" :size="16" class="me-2" />
              إحصائيات الدخل الشهري
            </div>
            <v-skeleton-loader
              v-if="loading"
              type="image"
              height="220"
              color="transparent"
            ></v-skeleton-loader>
            <SimpleBarChart v-else :data="chartData().income" :height="220" />
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card
            elevation="0"
            class="glass-panel-light pa-6 rounded-xl border border-gold border-opacity-10 h-100 glass-card"
          >
            <div class="text-subtitle-2 font-weight-black text-error mb-4 d-flex align-center">
              <LucideIcon name="arrow-down-right" :size="16" class="me-2" />
              إحصائيات المصروفات الشهرية
            </div>
            <v-skeleton-loader
              v-if="loading"
              type="image"
              height="220"
              color="transparent"
            ></v-skeleton-loader>
            <SimpleBarChart v-else :data="chartData().expense" :height="220" />
          </v-card>
        </v-col>
      </v-row>

      <!-- Ledger Table -->
      <div class="d-flex align-center mb-4">
        <div class="glass-panel-light pa-2 rounded-lg me-3 border border-gold border-opacity-10">
          <LucideIcon name="list" :size="20" class="text-gold" />
        </div>
        <span class="text-h6 font-weight-black text-white">سجل العمليات المالية التفصيلي</span>
      </div>

      <v-card
        elevation="0"
        class="glass-card border border-gold border-opacity-10 rounded-xl overflow-hidden mb-8 glass-card"
      >
        <v-table density="comfortable" class="premium-table">
          <thead>
            <tr>
              <th class="text-right text-gold font-weight-black">التاريخ</th>
              <th class="text-right text-gold font-weight-black">النوع</th>
              <th class="text-right text-gold font-weight-black">المبلغ</th>
              <th class="text-right text-gold font-weight-black">الوصف والبيان</th>
              <th class="text-right text-gold font-weight-black">القضية</th>
              <th class="text-right text-gold font-weight-black">الموكل</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading">
              <tr v-for="i in 10" :key="i">
                <td colspan="6" class="pa-4">
                  <v-skeleton-loader type="table-row" color="transparent"></v-skeleton-loader>
                </td>
              </tr>
            </template>
            <template v-else>
              <tr v-if="safeLength(rows) === 0">
                <td colspan="6" class="text-center py-12 text-gold opacity-20">
                  لا توجد عمليات مالية تطابق معايير البحث
                </td>
              </tr>
              <tr v-for="r in safeArray(rows)" :key="(r as any).id" class="premium-hover-row">
                <td class="text-caption font-mono text-white">{{ (r as any).date }}</td>
                <td>
                  <v-chip
                    size="x-small"
                    :color="(r as any).type === 'income' ? 'success' : 'error'"
                    variant="flat"
                    class="font-weight-black text-ebony px-3"
                  >
                    {{ (r as any).type === 'income' ? 'دخل' : 'مصروف' }}
                  </v-chip>
                </td>
                <td
                  class="text-h6 font-weight-black"
                  :class="(r as any).type === 'income' ? 'text-success' : 'text-error'"
                >
                  {{ formatCurrency((r as any).amount) }}
                </td>
                <td
                  class="text-body-2 text-white opacity-80 text-truncate"
                  style="max-width: 280px"
                >
                  {{ (r as any).description || '---' }}
                </td>
                <td class="text-caption text-accent font-weight-black">
                  {{ (r as any).case_number || '---' }}
                </td>
                <td class="text-caption text-white opacity-60">
                  {{ (r as any).client_name || '---' }}
                </td>
              </tr>
            </template>
          </tbody>
        </v-table>
      </v-card>

      <!-- Pagination -->
      <div class="d-flex justify-space-between align-center px-4">
        <div class="text-caption text-gold opacity-40 font-weight-black">
          الصفحة {{ page }} من إجمالي {{ totalRows }} سجل مالي
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
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SimpleBarChart from '../components/SimpleBarChart.vue'
import { safeArray, safeLength } from '../utils/safe'
import PrintReportFrame from '../components/common/PrintReportFrame.vue'
import PrintSignaturePage from '../components/common/PrintSignaturePage.vue'
import LucideIcon from '../components/common/LucideIcon.vue'

interface FinancialTotals {
  totalIn: number
  totalOut: number
  balance: number
}

const caseId = ref<string | null>(null)
const from = ref('')
const to = ref('')
const type = ref<string | null>(null)
const types = [
  { title: 'عمليات الدخل', value: 'income' },
  { title: 'عمليات المصروف', value: 'expense' }
]

const rows = ref<any[]>([])
const totals = ref<FinancialTotals | null>(null)
const loading = ref(false)
const loadingCases = ref(false)
const error = ref('')
const page = ref(1)
const pageSize = 50
const totalRows = ref(0)
const totalPages = ref(1)
const cases = ref<{ title: string; value: string }[]>([])

const load = async (): Promise<void> => {
  loading.value = true
  error.value = ''
  try {
    const res = await (window as any).api.reports.getFinancialSummary({
      from: from.value || undefined,
      to: to.value || undefined,
      type: type.value || undefined,
      caseId: caseId.value || undefined,
      page: page.value,
      pageSize
    })
    totals.value = res.totals
    rows.value = safeArray(res.rows)
    totalRows.value = res.pageInfo?.totalRows || 0
    totalPages.value = Math.max(1, Math.ceil(totalRows.value / pageSize))
  } catch (e: unknown) {
    error.value = (e as Error)?.message || 'فشل تحميل التقرير المالي'
  } finally {
    loading.value = false
  }
}

const formatCurrency = (val: any): string => {
  const num = Number(val) || 0
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const printPage = () => {
  window.print()
}

const exportCsv = async (): Promise<void> => {
  if (safeLength(rows.value) === 0) return
  try {
    const res = await (window as any).api.reports.exportCsv('financial-report.csv', rows.value)
    const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = res.filename
    link.click()
    URL.revokeObjectURL(url)
  } catch (e: unknown) {
    error.value = (e as Error)?.message || 'فشل تصدير الفايل CSV'
  }
}

const exportPdf = async (): Promise<void> => {
  try {
    await (window as any).api.reports.exportPdf({
      type: 'financial',
      params: {
        caseId: caseId.value || undefined,
        from: from.value || undefined,
        to: to.value || undefined,
        type: type.value || undefined
      }
    })
  } catch (e: unknown) {
    error.value = (e as Error)?.message || 'فشل تصدير التقرير PDF'
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
  const sums: Record<string, { income: number; expense: number }> = {}
  safeArray(rows.value).forEach((r: any) => {
    const date = String(r.date || '')
    const key = date ? date.slice(0, 7) : 'غير معرّف'
    if (!sums[key]) sums[key] = { income: 0, expense: 0 }
    const amt = Number(r.amount) || 0
    if (r.type === 'income') sums[key].income += amt
    if (r.type === 'expense') sums[key].expense += amt
  })

  const labels = Object.keys(sums).sort()
  const income = labels.map((l) => ({
    label: l,
    value: Math.round(sums[l].income),
    color: '#D4AF37'
  }))
  const expense = labels.map((l) => ({
    label: l,
    value: Math.round(sums[l].expense),
    color: '#FF5252'
  }))
  return { income, expense }
}

const loadCases = async (): Promise<void> => {
  loadingCases.value = true
  try {
    const rows = await (window as any).api.reports.listCases()
    cases.value = safeArray(rows).map((r: any) => ({
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
