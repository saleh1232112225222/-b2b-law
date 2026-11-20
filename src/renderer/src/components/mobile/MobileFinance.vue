<template>
  <div class="pa-3">
    <!-- 4 Interactive Mobile KPI Cards (2x2 Grid) -->
    <v-row dense class="mb-3">
      <v-col cols="6">
        <v-card
          class="rounded-xl pa-3 text-center kpi-mobile-card"
          :class="{ 'kpi-mobile-active': activeKpi === 'income' }"
          variant="outlined"
          @click="onKpiTap('income')"
        >
          <div class="text-caption text-medium-emphasis font-weight-bold">الأتعاب المحصلة</div>
          <div class="text-subtitle-1 font-weight-black text-success">
            {{ formatMoney(stats.income) }}
          </div>
        </v-card>
      </v-col>
      <v-col cols="6">
        <v-card
          class="rounded-xl pa-3 text-center kpi-mobile-card"
          :class="{ 'kpi-mobile-active': activeKpi === 'pending' }"
          variant="outlined"
          @click="onKpiTap('pending')"
        >
          <div class="text-caption text-medium-emphasis font-weight-bold">الأتعاب المتبقية</div>
          <div class="text-subtitle-1 font-weight-black text-warning">
            {{ formatMoney((stats as any).total_remaining || 0) }}
          </div>
        </v-card>
      </v-col>
      <v-col cols="6">
        <v-card
          class="rounded-xl pa-3 text-center kpi-mobile-card"
          :class="{ 'kpi-mobile-active': activeKpi === 'expense' }"
          variant="outlined"
          @click="onKpiTap('expense')"
        >
          <div class="text-caption text-medium-emphasis font-weight-bold">المصروفات</div>
          <div class="text-subtitle-1 font-weight-black text-error">
            {{ formatMoney(stats.expense) }}
          </div>
        </v-card>
      </v-col>
      <v-col cols="6">
        <v-card
          class="rounded-xl pa-3 text-center kpi-mobile-card"
          :class="{ 'kpi-mobile-active': activeKpi === 'balance' }"
          variant="outlined"
          @click="onKpiTap('balance')"
        >
          <div class="text-caption text-medium-emphasis font-weight-bold">صافي التوازن</div>
          <div class="text-subtitle-1 font-weight-black text-primary">
            {{ formatMoney(stats.balance) }}
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Mobile Cash Flow Chart (6 Months) -->
    <CashFlowChart :items="cashFlow" :loading="loading" />

    <v-tabs
      v-model="activeTab"
      density="compact"
      color="primary"
      class="mb-3"
      show-arrows
      center-active
    >
      <v-tab value="transactions" class="font-weight-bold">المعاملات</v-tab>
      <v-tab value="invoices" class="font-weight-bold">الفواتير</v-tab>
      <v-tab value="receivables" class="font-weight-bold">الذمم</v-tab>
      <v-tab value="legal" class="font-weight-bold">الخدمات القانونية</v-tab>
      <v-tab value="client-accounts" class="font-weight-bold">حسابات المكتب</v-tab>
      <v-tab value="client-statement" class="font-weight-bold">كشف حساب</v-tab>
      <v-tab value="office-mgmt" class="font-weight-bold">إدارة المكتب</v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <v-window-item value="transactions">
        <div class="d-flex ga-1 mb-3">
          <v-chip
            size="small"
            :color="mobileTypeFilter === 'all' ? 'primary' : 'default'"
            :variant="mobileTypeFilter === 'all' ? 'flat' : 'outlined'"
            class="font-weight-bold"
            @click="applyMobileTypeFilter('all')"
          >
            الكل
          </v-chip>
          <v-chip
            size="small"
            :color="mobileTypeFilter === 'income' ? 'success' : 'default'"
            :variant="mobileTypeFilter === 'income' ? 'flat' : 'outlined'"
            class="font-weight-bold"
            @click="applyMobileTypeFilter('income')"
          >
            إيرادات
          </v-chip>
          <v-chip
            size="small"
            :color="mobileTypeFilter === 'expense' ? 'error' : 'default'"
            :variant="mobileTypeFilter === 'expense' ? 'flat' : 'outlined'"
            class="font-weight-bold"
            @click="applyMobileTypeFilter('expense')"
          >
            مصروفات
          </v-chip>
        </div>
        <MobileCardList
          :items="transactions"
          :loading="loading || transactionsLoading"
          title-field="description"
          subtitle-field="client_name"
          :info-fields="[
            { key: 'amount', label: 'المبلغ' },
            { key: 'category', label: 'التصنيف' }
          ]"
          icon-field="icon"
          default-icon="mdi-swap-horizontal"
          empty-text="لا توجد معاملات"
          can-add
          add-label="إضافة معاملة"
          @item-click="openItem"
          @add="emit('add-transaction')"
        />
      </v-window-item>

      <v-window-item value="invoices">
        <div class="d-flex ga-1 mb-3">
          <v-chip
            size="small"
            :color="mobileInvoiceFilter === 'all' ? 'primary' : 'default'"
            :variant="mobileInvoiceFilter === 'all' ? 'flat' : 'outlined'"
            class="font-weight-bold"
            @click="mobileInvoiceFilter = 'all'"
          >
            الكل
          </v-chip>
          <v-chip
            size="small"
            :color="mobileInvoiceFilter === 'pending' ? 'warning' : 'default'"
            :variant="mobileInvoiceFilter === 'pending' ? 'flat' : 'outlined'"
            class="font-weight-bold"
            @click="mobileInvoiceFilter = 'pending'"
          >
            معلقة (غير مدفوعة)
          </v-chip>
          <v-chip
            size="small"
            :color="mobileInvoiceFilter === 'paid' ? 'success' : 'default'"
            :variant="mobileInvoiceFilter === 'paid' ? 'flat' : 'outlined'"
            class="font-weight-bold"
            @click="mobileInvoiceFilter = 'paid'"
          >
            مدفوعة
          </v-chip>
        </div>
        <MobileCardList
          :items="filteredMobileInvoices"
          :loading="loading"
          title-field="invoice_number"
          subtitle-field="client_name"
          :info-fields="[
            { key: 'total_amount', label: 'المبلغ' },
            { key: 'status', label: 'الحالة' }
          ]"
          icon-field="icon"
          default-icon="mdi-file-invoice"
          empty-text="لا توجد فواتير"
          can-add
          add-label="إضافة فاتورة"
          @item-click="openItem"
          @add="emit('add-invoice')"
        />
      </v-window-item>

      <v-window-item value="receivables">
        <MobileCardList
          :items="receivables"
          :loading="loading"
          title-field="client_name"
          subtitle-field="invoice_number"
          :info-fields="[
            { key: 'remaining_amount', label: 'المتبقي' },
            { key: 'status', label: 'الحالة' }
          ]"
          icon-field="icon"
          default-icon="mdi-hand-coin"
          empty-text="لا توجد ذمم"
          can-add
          add-label="إصدار فاتورة وذمة"
          @item-click="openItem"
          @add="emit('add-receivable')"
        />
      </v-window-item>

      <v-window-item value="legal">
        <div class="pa-2">
          <div class="d-flex justify-space-between align-center mb-3">
            <div class="text-subtitle-2 font-weight-black">الخدمات القانونية المالية</div>
            <v-btn
              size="x-small"
              variant="tonal"
              color="accent"
              :loading="legalLoading"
              @click="loadLegalData"
            >
              <v-icon size="14">mdi-refresh</v-icon>
            </v-btn>
          </div>
          <v-row dense class="mb-3">
            <v-col cols="6">
              <v-card variant="outlined" class="pa-3 text-center rounded-lg">
                <div class="text-caption text-medium-emphasis">المحصل</div>
                <div class="text-subtitle-1 font-weight-black text-success">
                  {{ formatMoney(legalStats.total_paid) }}
                </div>
              </v-card>
            </v-col>
            <v-col cols="6">
              <v-card variant="outlined" class="pa-3 text-center rounded-lg">
                <div class="text-caption text-medium-emphasis">المتبقي</div>
                <div class="text-subtitle-1 font-weight-black text-error">
                  {{ formatMoney(legalStats.total_remaining) }}
                </div>
              </v-card>
            </v-col>
          </v-row>
          <div v-if="legalLoading" class="text-center py-6">
            <v-progress-circular indeterminate color="accent" size="32" />
          </div>
          <div v-else-if="legalList.length === 0" class="text-center py-6 text-medium-emphasis">
            لا توجد خدمات قانونية
          </div>
          <v-card
            v-for="svc in legalList"
            :key="svc.id"
            variant="outlined"
            class="mb-2 pa-3 rounded-lg"
            @click="$router.push('/legal-engagements/' + svc.id)"
          >
            <div class="d-flex justify-space-between align-start">
              <div>
                <div class="font-weight-bold text-body-2">{{ svc.service_type_name }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ svc.engagement_number }} - {{ svc.category_name }}
                </div>
              </div>
              <div class="text-end">
                <div class="text-caption text-success font-weight-bold">
                  {{ formatMoney(svc.paid_amount || 0) }}
                </div>
                <div
                  v-if="(svc.remaining_amount || 0) > 0"
                  class="text-caption text-error font-weight-bold"
                >
                  متبقي: {{ formatMoney(svc.remaining_amount || 0) }}
                </div>
              </div>
            </div>
          </v-card>
        </div>
      </v-window-item>

      <v-window-item value="client-accounts">
        <div class="pa-2">
          <div class="d-flex justify-space-between align-center mb-3">
            <div class="text-subtitle-2 font-weight-black">حسابات المكتب</div>
            <div class="d-flex ga-1">
              <v-btn size="x-small" variant="tonal" :loading="officeExporting" @click="exportOfficeReport">
                CSV
              </v-btn>
              <v-btn size="x-small" variant="tonal" @click="printOfficeReport">
                <v-icon size="14">mdi-printer</v-icon>
              </v-btn>
              <v-btn
                size="x-small"
                variant="tonal"
                color="accent"
                :loading="officeLoading"
                @click="loadOfficeData"
              >
                <v-icon size="14">mdi-refresh</v-icon>
              </v-btn>
            </div>
          </div>
          <v-card variant="outlined" class="pa-3 mb-3 rounded-lg">
            <v-row dense>
              <v-col cols="4" class="text-center">
                <div class="text-caption text-medium-emphasis">الإجمالي</div>
                <div class="text-subtitle-2 font-weight-black text-primary">
                  {{ formatMoney(officeReport.total_revenue || 0) }}
                </div>
              </v-col>
              <v-col cols="4" class="text-center">
                <div class="text-caption text-medium-emphasis">المحصل</div>
                <div class="text-subtitle-2 font-weight-black text-success">
                  {{ formatMoney(officeReport.total_collected || 0) }}
                </div>
              </v-col>
              <v-col cols="4" class="text-center">
                <div class="text-caption text-medium-emphasis">المتبقي</div>
                <div class="text-subtitle-2 font-weight-black text-error">
                  {{ formatMoney(officeReport.total_pending || 0) }}
                </div>
              </v-col>
            </v-row>
          </v-card>
          <div v-if="officeLoading" class="text-center py-6">
            <v-progress-circular indeterminate color="accent" size="32" />
          </div>
          <div
            v-else-if="!officeReport.clients?.length"
            class="text-center py-6 text-medium-emphasis"
          >
            لا توجد حسابات مسجلة
          </div>
          <v-card
            v-for="cl in officeReport.clients || []"
            :key="cl.client_id"
            variant="outlined"
            class="mb-2 pa-3 rounded-lg"
          >
            <div class="d-flex justify-space-between align-start">
              <div>
                <div class="font-weight-bold text-body-2">{{ cl.client_name }}</div>
                <div class="text-caption text-medium-emphasis">
                  الإجمالي: {{ formatMoney(cl.total || 0) }}
                </div>
              </div>
              <div class="text-end">
                <div class="text-caption text-success font-weight-bold">
                  {{ formatMoney(cl.collected || 0) }}
                </div>
                <div
                  v-if="Number(cl.total || 0) - Number(cl.collected || 0) > 0"
                  class="text-caption text-error font-weight-bold"
                >
                  متبقي: {{ formatMoney(Number(cl.total || 0) - Number(cl.collected || 0)) }}
                </div>
              </div>
            </div>
          </v-card>
        </div>
      </v-window-item>

      <v-window-item value="client-statement">
        <ClientFinancialStatement />
      </v-window-item>

      <v-window-item value="office-mgmt">
        <MobileOfficeManagement />
      </v-window-item>
    </v-window>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useFinanceStore } from '../../stores/finance'
import { storeToRefs } from 'pinia'
import MobileCardList from './MobileCardList.vue'
import MobileOfficeManagement from './MobileOfficeManagement.vue'
import CashFlowChart from '../finance/CashFlowChart.vue'
import ClientFinancialStatement from '../finance/ClientFinancialStatement.vue'

const emit = defineEmits<{
  'add-transaction': []
  'add-invoice': []
  'add-receivable': []
}>()

const financeStore = useFinanceStore()
const { transactions, invoices, receivables, stats, loading, transactionsLoading, cashFlow } =
  storeToRefs(financeStore)

const activeTab = ref('transactions')
const activeKpi = ref('balance')
const mobileTypeFilter = ref<'all' | 'income' | 'expense'>('all')
const mobileInvoiceFilter = ref<'all' | 'pending' | 'paid'>('all')

const applyMobileTypeFilter = async (type: 'all' | 'income' | 'expense') => {
  mobileTypeFilter.value = type
  activeKpi.value = type === 'all' ? 'balance' : type
  await financeStore.fetchFilteredTransactions({
    page: 1,
    pageSize: 200,
    filters: { type: type === 'all' ? undefined : type }
  })
}

const onKpiTap = (key: 'income' | 'pending' | 'expense' | 'balance') => {
  activeKpi.value = key
  if (key === 'income') {
    activeTab.value = 'transactions'
    void applyMobileTypeFilter('income')
  } else if (key === 'expense') {
    activeTab.value = 'transactions'
    void applyMobileTypeFilter('expense')
  } else if (key === 'pending') {
    mobileInvoiceFilter.value = 'pending'
    activeTab.value = 'invoices'
  } else {
    activeTab.value = 'transactions'
    void applyMobileTypeFilter('all')
  }
}

const filteredMobileInvoices = computed(() => {
  const list = Array.isArray(invoices.value) ? invoices.value : []
  if (mobileInvoiceFilter.value === 'paid') {
    return list.filter((i: any) => String(i.status || '').toLowerCase() === 'paid')
  }
  if (mobileInvoiceFilter.value === 'pending') {
    return list.filter((i: any) => {
      const s = String(i.status || '').toLowerCase()
      return !['paid', 'cancelled', 'canceled', 'void', 'draft'].includes(s)
    })
  }
  return list
})

watch(activeTab, (tab) => {
  if (tab === 'legal') void loadLegalData()
  if (tab === 'client-accounts') void loadOfficeData()
})

const legalLoading = ref(false)
const legalStats = ref<any>({
  total_services: 0,
  total_compensation: 0,
  total_paid: 0,
  total_remaining: 0
})
const legalList = ref<any[]>([])

const officeLoading = ref(false)
const officeExporting = ref(false)
const officeReport = ref<any>({
  total_revenue: 0,
  total_collected: 0,
  total_pending: 0,
  clients: []
})

const formatMoney = (val: number) => (val || 0).toLocaleString('ar-SA')

const loadLegalData = async () => {
  legalLoading.value = true
  try {
    const data = await (window as any).api.reports.getLegalServicesReport({ pageSize: 100 })
    if (data && data.summary) {
      legalStats.value = {
        total_services: data.summary.totalServices || 0,
        total_compensation: data.summary.totalRevenue || 0,
        total_paid: data.summary.totalPaid || 0,
        total_remaining: data.summary.totalRemaining || 0
      }
      legalList.value = data.services || []
    }
  } catch (e) {
    console.warn('Failed to load legal finance data:', e)
  } finally {
    legalLoading.value = false
  }
}

const openItem = (_item: any) => {
  // handled by parent if needed
}

const loadOfficeData = async () => {
  officeLoading.value = true
  try {
    const { useOfficeAccountsStore } = await import('../../stores/officeAccounts')
    const officeStore = useOfficeAccountsStore()
    await officeStore.fetchReport()
    if (officeStore.report) {
      officeReport.value = officeStore.report
    }
  } catch (e) {
    console.warn('Failed to load office accounts:', e)
  } finally {
    officeLoading.value = false
  }
}

const exportOfficeReport = async () => {
  if (!officeReport.value.clients?.length) await loadOfficeData()
  officeExporting.value = true
  try {
    const rows = (officeReport.value.clients || []).map((client: any) => ({
      العميل: client.client_name || 'غير محدد',
      الإجمالي: Number(client.total || 0),
      المحصل: Number(client.collected || 0),
      المتبقي: Number(client.total || 0) - Number(client.collected || 0)
    }))
    await window.api.reports.exportCsv('office-accounts-mobile.csv', rows)
  } finally {
    officeExporting.value = false
  }
}

const printOfficeReport = () => window.print()

onMounted(() => {
  financeStore.fetchFinanceData()
})
</script>

<style scoped>
.kpi-mobile-card {
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.kpi-mobile-active {
  border-color: rgb(var(--v-theme-primary)) !important;
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.16);
}
</style>
