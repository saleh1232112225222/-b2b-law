<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <!-- Header -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-card pa-4 rounded-xl me-5 border-gold-alpha">
            <LucideIcon name="scale" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">تقرير الخدمات والارتباطات القانونية</h1>
            <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
              تحليل شامل ومؤشرات للارتباطات التعاقدية والخدمات القانونية المقدمة لعملائنا
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="auto" class="d-flex gap-3 flex-wrap">
        <v-btn variant="outlined" color="gold" class="rounded-lg px-6 font-weight-black premium-hover h-56"
          @click="$router.push('/reports')">
          <LucideIcon name="arrow-right" :size="18" class="me-2" /> رجوع للمركز
        </v-btn>
        <v-btn color="accent" variant="flat" class="rounded-lg px-6 font-weight-black premium-lift h-56 text-ebony"
          @click="exportCSV">
          <LucideIcon name="file-text" :size="18" class="me-2" /> تصدير CSV
        </v-btn>
        <v-btn color="accent" variant="flat" class="rounded-lg px-6 font-weight-black premium-lift h-56 text-ebony"
          @click="printReport">
          <LucideIcon name="printer" :size="18" class="me-2" /> طباعة التقرير
        </v-btn>
      </v-col>
    </v-row>

    <!-- Advanced Filters -->
    <v-card elevation="0" class="glass-card pa-6 border-gold-alpha mb-6">
      <v-row dense>
        <v-col cols="12" md="3">
          <v-autocomplete v-model="filters.client_id" :items="clients" item-title="name" item-value="id" label="العميل"
            variant="outlined" density="comfortable" hide-details clearable />
        </v-col>
        <v-col cols="12" md="3">
          <v-autocomplete v-model="filters.lawyer_id" :items="lawyers" item-title="name" item-value="id"
            label="المحامي المسؤول" variant="outlined" density="comfortable" hide-details clearable />
        </v-col>
        <v-col cols="12" md="3">
          <v-autocomplete v-model="filters.case_id" :items="cases" item-title="case_number" item-value="id"
            label="القضية" variant="outlined" density="comfortable" hide-details clearable />
        </v-col>
        <v-col cols="12" md="3">
          <v-select v-model="filters.category_id" :items="store.categories" item-title="name_ar" item-value="id"
            label="التصنيف" variant="outlined" density="comfortable" hide-details clearable />
        </v-col>
        <v-col cols="12" md="2">
          <v-select v-model="filters.status_id" :items="store.statuses" item-title="status_name_ar" item-value="id"
            label="الحالة" variant="outlined" density="comfortable" hide-details clearable />
        </v-col>
        <v-col cols="12" md="2">
          <v-select v-model="filters.priority_id" :items="store.priorities" item-title="priority_name_ar" item-value="id"
            label="الأولوية" variant="outlined" density="comfortable" hide-details clearable />
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field v-model="filters.from_date" label="من تاريخ" type="date" variant="outlined" density="comfortable"
            hide-details />
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field v-model="filters.to_date" label="إلى تاريخ" type="date" variant="outlined" density="comfortable"
            hide-details />
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field v-model="filters.q" label="بحث سريع..." variant="outlined" density="comfortable" hide-details
            clearable prepend-inner-icon="mdi-magnify" />
        </v-col>
        <v-col cols="12" md="2">
          <v-select v-model="filters.groupBy" :items="groupOptions" item-title="text" item-value="value" label="تجميع حسب"
            variant="outlined" density="comfortable" hide-details clearable />
        </v-col>
        <v-col cols="12" md="2">
          <v-btn color="accent" variant="tonal" block height="48" class="rounded-lg font-weight-black"
            :loading="loading" @click="loadData">
            تصفية البيانات
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <!-- KPIs -->
    <v-row class="mb-6" dense>
      <v-col cols="6" sm="6" md="3">
        <v-card elevation="0" class="glass-card pa-5 rounded-xl border-gold-alpha premium-hover h-100">
          <div class="text-caption font-weight-black text-ebony opacity-60 mb-2">إجمالي الخدمات</div>
          <div class="text-h5 font-weight-black text-ebony">{{ summary.totalServices }}</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="6" md="3">
        <v-card elevation="0" class="glass-card pa-5 rounded-xl border-gold-alpha premium-hover h-100">
          <div class="text-caption font-weight-black text-ebony opacity-60 mb-2">المقابل المالي الكلي</div>
          <div class="text-h5 font-weight-black text-accent">{{ fmt(summary.totalRevenue) }}</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="6" md="3">
        <v-card elevation="0" class="glass-card pa-5 rounded-xl border-gold-alpha premium-hover h-100">
          <div class="text-caption font-weight-black text-ebony opacity-60 mb-2">المحصل فعلياً</div>
          <div class="text-h5 font-weight-black text-success">{{ fmt(summary.totalPaid) }}</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="6" md="3">
        <v-card elevation="0" class="glass-card pa-5 rounded-xl border-gold premium-hover h-100 border-2">
          <div class="text-caption font-weight-black text-gold mb-2">المستحقات المتبقية</div>
          <div class="text-h5 font-weight-black text-gold">{{ fmt(summary.totalRemaining) }}</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Charts Section -->
    <v-row class="mb-6" dense v-if="hasChartData">
      <v-col cols="12" md="4">
        <v-card elevation="0" class="glass-card pa-5 rounded-xl border-gold-alpha h-100">
          <div class="text-subtitle-2 font-weight-black text-gold mb-4">توزيع الخدمات حسب الحالة</div>
          <div style="height: 220px;">
            <PieChart :labels="statusLabels" :data="statusValues" :colors="statusColors" />
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card elevation="0" class="glass-card pa-5 rounded-xl border-gold-alpha h-100">
          <div class="text-subtitle-2 font-weight-black text-gold mb-4">الخدمات حسب المحامي</div>
          <SimpleBarChart :data="lawyerChartData" :height="220" />
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card elevation="0" class="glass-card pa-5 rounded-xl border-gold-alpha h-100">
          <div class="text-subtitle-2 font-weight-black text-gold mb-4">المقابل المالي حسب التصنيف</div>
          <SimpleBarChart :data="categoryChartData" :height="220" />
        </v-card>
      </v-col>
    </v-row>

    <!-- Client Financial Summary (auto-computed from data) -->
    <v-card v-if="clientFinancialSummary.length > 0" elevation="0" class="glass-card rounded-xl border-gold-alpha mb-6 overflow-hidden">
      <div class="pa-5 border-b border-gold-alpha">
        <div class="text-subtitle-2 font-weight-black text-gold">الملخص المالي حسب العميل</div>
      </div>
      <v-table density="comfortable" class="glass-table">
        <thead>
          <tr>
            <th class="text-right text-gold font-weight-black">العميل</th>
            <th class="text-right text-gold font-weight-black">عدد الخدمات</th>
            <th class="text-right text-gold font-weight-black">إجمالي المقابل</th>
            <th class="text-right text-gold font-weight-black">المحصل</th>
            <th class="text-right text-gold font-weight-black">المتبقي</th>
            <th class="text-right text-gold font-weight-black">نسبة التحصيل</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in clientFinancialSummary" :key="c.client_name" class="premium-hover-row">
            <td class="font-weight-black text-white">{{ c.client_name || 'غير محدد' }}</td>
            <td class="font-weight-black text-accent">{{ c.count }}</td>
            <td class="font-weight-black text-accent">{{ fmt(c.total_compensation) }}</td>
            <td class="font-weight-black text-success">{{ fmt(c.total_paid) }}</td>
            <td class="font-weight-black text-gold">{{ fmt(c.total_remaining) }}</td>
            <td>
              <v-progress-linear :model-value="c.collection_rate" color="success" height="8" rounded class="mt-1" style="max-width: 100px;" />
              <div class="text-caption text-grey mt-1">{{ c.collection_rate.toFixed(0) }}%</div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Grouped Data -->
    <v-card v-if="groups && groups.length" elevation="0" class="glass-card rounded-xl border-gold-alpha mb-6 overflow-hidden">
      <v-table density="comfortable" class="glass-table">
        <thead>
          <tr>
            <th class="text-right text-gold font-weight-black">المجموعة</th>
            <th class="text-right text-gold font-weight-black">عدد الخدمات</th>
            <th class="text-right text-gold font-weight-black">إجمالي المقابل</th>
            <th class="text-right text-gold font-weight-black">المحصل</th>
            <th class="text-right text-gold font-weight-black">المتبقي</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="g in groups" :key="g.group_id" class="premium-hover-row">
            <td class="font-weight-black text-white">{{ g.group_name || 'غير محدد' }}</td>
            <td class="font-weight-black text-accent">{{ g.service_count }}</td>
            <td class="font-weight-black text-accent">{{ fmt(g.total_compensation) }}</td>
            <td class="font-weight-black text-success">{{ fmt(g.total_paid) }}</td>
            <td class="font-weight-black text-gold">{{ fmt(g.total_remaining) }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Data Table -->
    <v-card elevation="0" class="glass-card rounded-xl border-gold-alpha overflow-hidden">
      <v-table density="comfortable" class="glass-table">
        <thead>
          <tr>
            <th class="text-right text-gold font-weight-black">رقم الخدمة</th>
            <th class="text-right text-gold font-weight-black">العميل</th>
            <th class="text-right text-gold font-weight-black">التصنيف والنوع</th>
            <th class="text-right text-gold font-weight-black">المسؤول</th>
            <th class="text-right text-gold font-weight-black">القضية</th>
            <th class="text-right text-gold font-weight-black">المقابل المالي</th>
            <th class="text-right text-gold font-weight-black">المحصل</th>
            <th class="text-right text-gold font-weight-black">المتبقي</th>
            <th class="text-right text-gold font-weight-black">الحالة</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!loading && items.length === 0">
            <td colspan="9" class="text-center py-12 text-gold opacity-30 font-weight-black">
              لا توجد خدمات مطابقة للتصفية الحالية
            </td>
          </tr>
          <tr v-for="item in items" :key="item.id" class="premium-hover-row">
            <td class="font-mono text-accent font-weight-black">{{ item.engagement_number }}</td>
            <td class="text-white font-weight-black">{{ item.client_name || '-' }}</td>
            <td class="text-white font-weight-bold">
              <div>{{ item.category_name }}</div>
              <div class="text-caption text-grey">{{ item.service_type_name }}</div>
            </td>
            <td class="text-grey-lighten-1">{{ item.responsible_name || '-' }}</td>
            <td class="text-grey-lighten-1">{{ item.linked_case_number || '-' }}</td>
            <td class="text-accent font-weight-black">{{ fmt(item.financial_compensation || 0) }}</td>
            <td class="text-success font-weight-black">{{ fmt(item.paid_amount || 0) }}</td>
            <td class="text-gold font-weight-black">{{ fmt(item.remaining_amount || 0) }}</td>
            <td>
              <v-chip size="small" variant="flat" :color="item.status_color || 'primary'"
                class="text-ebony font-weight-black">
                {{ item.status_name }}
              </v-chip>
            </td>
          </tr>
        </tbody>
      </v-table>

      <!-- Pagination -->
      <v-divider class="border-gold opacity-10" />
      <div class="d-flex align-center justify-space-between pa-4 bg-transparent flex-wrap ga-2">
        <span class="text-caption text-gold opacity-60">إجمالي السجلات: {{ summary.totalServices }}</span>
        <div class="d-flex align-center ga-4">
          <v-btn size="small" variant="tonal" color="accent" :disabled="page <= 1" @click="prevPage">
            السابق
          </v-btn>
          <span class="text-caption text-white font-weight-black">
            صفحة {{ page }} من {{ totalPages }}
          </span>
          <v-btn size="small" variant="tonal" color="accent" :disabled="page >= totalPages" @click="nextPage">
            التالي
          </v-btn>
        </div>
      </div>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useLegalStore } from '../stores/legal'
import LucideIcon from '../components/common/LucideIcon.vue'
import PieChart from '../components/charts/PieChart.vue'
import SimpleBarChart from '../components/SimpleBarChart.vue'

const store = useLegalStore()
const loading = ref(false)

const filters = reactive({
  client_id: null,
  lawyer_id: null,
  case_id: null,
  category_id: null,
  status_id: null,
  priority_id: null,
  from_date: '',
  to_date: '',
  q: '',
  groupBy: null as string | null
})

const groupOptions = [
  { text: 'بدون تجميع', value: null },
  { text: 'حسب المحامي', value: 'lawyer' },
  { text: 'حسب العميل', value: 'client' },
  { text: 'حسب التصنيف', value: 'category' },
  { text: 'حسب القضية', value: 'case' },
  { text: 'حسب الشهر', value: 'month' },
  { text: 'حسب السنة', value: 'year' }
]

const clients = ref<any[]>([])
const lawyers = ref<any[]>([])
const cases = ref<any[]>([])
const items = ref<any[]>([])
const groups = ref<any[] | null>(null)

const page = ref(1)
const pageSize = ref(500)
const totalRows = ref(0)

const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / pageSize.value)))

const summary = reactive({
  totalServices: 0,
  totalRevenue: 0,
  totalPaid: 0,
  totalRemaining: 0,
  completedCount: 0,
  inProgressCount: 0
})

const distributions = reactive({
  byStatus: [] as any[],
  byCategory: [] as any[],
  byLawyer: [] as any[]
})

const hasChartData = computed(() =>
  distributions.byStatus.length > 0 || distributions.byCategory.length > 0
)

// Auto-compute client financial summary from items
const clientFinancialSummary = computed(() => {
  const map = new Map<string, any>()
  for (const item of items.value) {
    const name = item.client_name || 'غير محدد'
    if (!map.has(name)) {
      map.set(name, {
        client_name: name,
        count: 0,
        total_compensation: 0,
        total_paid: 0,
        total_remaining: 0,
        collection_rate: 0
      })
    }
    const entry = map.get(name)
    entry.count++
    entry.total_compensation += Number(item.financial_compensation || 0)
    entry.total_paid += Number(item.paid_amount || 0)
    entry.total_remaining += Number(item.remaining_amount || 0)
  }
  const result = Array.from(map.values())
  for (const entry of result) {
    entry.collection_rate = entry.total_compensation > 0
      ? Math.round((entry.total_paid / entry.total_compensation) * 100)
      : 0
  }
  return result.sort((a, b) => b.total_compensation - a.total_compensation)
})

const statusLabels = computed(() => distributions.byStatus.map((d: any) => d.status_name_ar))
const statusValues = computed(() => distributions.byStatus.map((d: any) => parseInt(d.count)))
const statusColors = computed(() => distributions.byStatus.map((d: any) => d.color || '#999'))

const lawyerChartData = computed(() =>
  distributions.byLawyer.map((d: any) => ({
    label: d.name || 'غير محدد',
    value: parseInt(d.count),
    color: '#D4AF37'
  }))
)

const categoryChartData = computed(() =>
  distributions.byCategory.map((d: any) => ({
    label: d.name_ar,
    value: parseFloat(d.total_amount) || 0,
    color: '#1565C0'
  }))
)

const fmt = (val: number) =>
  new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(val)

const loadData = async () => {
  loading.value = true
  try {
    await store.fetchMetadata()
    const [c, l, casesData] = await Promise.all([
      window.api.clients.getAll(),
      window.api.employees?.getAll?.() || [],
      window.api.cases?.list?.({}) || []
    ])
    clients.value = c || []
    lawyers.value = l || []
    cases.value = casesData?.data || casesData || []

    const params: any = {
      page: page.value,
      pageSize: pageSize.value,
      clientId: filters.client_id || '',
      lawyerId: filters.lawyer_id || '',
      caseId: filters.case_id || '',
      category_id: filters.category_id || '',
      status_id: filters.status_id || '',
      priority_id: filters.priority_id || '',
      fromDate: filters.from_date || '',
      toDate: filters.to_date || '',
      q: filters.q || '',
      groupBy: filters.groupBy || ''
    }

    const data = await window.api.reports.getLegalServicesReport(params)
    items.value = Array.isArray(data.services) ? data.services : []
    totalRows.value = data.pageInfo?.totalRows || items.value.length

    if (data.summary) {
      summary.totalServices = data.summary.totalServices || 0
      summary.totalRevenue = data.summary.totalRevenue || 0
      summary.totalPaid = data.summary.totalPaid || 0
      summary.totalRemaining = data.summary.totalRemaining || 0
      summary.completedCount = data.summary.completedCount || 0
      summary.inProgressCount = data.summary.inProgressCount || 0
    }

    if (data.distributions) {
      distributions.byStatus = data.distributions.byStatus || []
      distributions.byCategory = data.distributions.byCategory || []
      distributions.byLawyer = data.distributions.byLawyer || []
    }

    groups.value = data.groups || null
  } catch (e) {
    console.error('Failed to load legal services report:', e)
  } finally {
    loading.value = false
  }
}

const nextPage = () => {
  page.value++
  loadData()
}

const prevPage = () => {
  if (page.value > 1) {
    page.value--
    loadData()
  }
}

const exportCSV = async () => {
  try {
    const params: any = {
      format: 'csv',
      clientId: filters.client_id || '',
      lawyerId: filters.lawyer_id || '',
      caseId: filters.case_id || '',
      category_id: filters.category_id || '',
      status_id: filters.status_id || '',
      fromDate: filters.from_date || '',
      toDate: filters.to_date || ''
    }
    const blob = await window.api.reports.exportLegalServices(params)
    if (blob instanceof Blob) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'legal-services-report.csv'
      a.click()
      URL.revokeObjectURL(url)
    } else if (blob && blob.saved) {
      await window.api.documents.open(blob.path)
    }
  } catch (e) {
    console.error('CSV export error:', e)
  }
}

const printReport = () => {
  window.print()
}

onMounted(loadData)
</script>

<style scoped>
.rtl { direction: rtl; }
.gap-3 { gap: 12px; }
.font-mono { font-family: 'Consolas', 'Monaco', monospace; }
.glass-table { background: transparent !important; }
:deep(.glass-table th) { background: rgba(212, 175, 55, 0.05) !important; border-bottom: 1px solid rgba(212, 175, 55, 0.1) !important; }
:deep(.glass-table td) { border-bottom: 1px solid rgba(212, 175, 55, 0.05) !important; }
</style>
