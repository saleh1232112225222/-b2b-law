<template>
  <div class="pa-3">
    <v-card class="rounded-xl pa-4 mb-3" variant="outlined">
      <v-row dense>
        <v-col cols="4" class="text-center">
          <div class="text-caption text-medium-emphasis">الإيرادات</div>
          <div class="text-subtitle-1 font-weight-black text-success">
            {{ formatMoney(stats.income) }}
          </div>
        </v-col>
        <v-col cols="4" class="text-center">
          <div class="text-caption text-medium-emphasis">المصروفات</div>
          <div class="text-subtitle-1 font-weight-black text-error">
            {{ formatMoney(stats.expense) }}
          </div>
        </v-col>
        <v-col cols="4" class="text-center">
          <div class="text-caption text-medium-emphasis">الرصيد</div>
          <div class="text-subtitle-1 font-weight-black text-primary">
            {{ formatMoney(stats.balance) }}
          </div>
        </v-col>
      </v-row>
    </v-card>

    <v-tabs v-model="activeTab" density="compact" color="primary" class="mb-3">
      <v-tab value="transactions" class="font-weight-bold">المعاملات</v-tab>
      <v-tab value="invoices" class="font-weight-bold">الفواتير</v-tab>
      <v-tab value="receivables" class="font-weight-bold">الذمم</v-tab>
      <v-tab value="legal" class="font-weight-bold">الخدمات القانونية</v-tab>
      <v-tab value="client-accounts" class="font-weight-bold">حسابات المكتب</v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <v-window-item value="transactions">
        <MobileCardList
          :items="transactions"
          :loading="loading"
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
        <MobileCardList
          :items="invoices"
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
          add-label="إضافة ذمة"
          @item-click="openItem"
          @add="emit('add-receivable')"
        />
      </v-window-item>

      <v-window-item value="legal">
        <div class="pa-2">
          <div class="d-flex justify-space-between align-center mb-3">
            <div class="text-subtitle-2 font-weight-black">الخدمات القانونية المالية</div>
            <v-btn size="x-small" variant="tonal" color="accent" :loading="legalLoading" @click="loadLegalData">
              <v-icon size="14">mdi-refresh</v-icon>
            </v-btn>
          </div>
          <v-row dense class="mb-3">
            <v-col cols="6">
              <v-card variant="outlined" class="pa-3 text-center rounded-lg">
                <div class="text-caption text-medium-emphasis">المحصل</div>
                <div class="text-subtitle-1 font-weight-black text-success">{{ formatMoney(legalStats.total_paid) }}</div>
              </v-card>
            </v-col>
            <v-col cols="6">
              <v-card variant="outlined" class="pa-3 text-center rounded-lg">
                <div class="text-caption text-medium-emphasis">المتبقي</div>
                <div class="text-subtitle-1 font-weight-black text-error">{{ formatMoney(legalStats.total_remaining) }}</div>
              </v-card>
            </v-col>
          </v-row>
          <div v-if="legalLoading" class="text-center py-6">
            <v-progress-circular indeterminate color="accent" size="32" />
          </div>
          <div v-else-if="legalList.length === 0" class="text-center py-6 text-medium-emphasis">
            لا توجد خدمات قانونية
          </div>
          <v-card v-for="svc in legalList" :key="svc.id" variant="outlined" class="mb-2 pa-3 rounded-lg" @click="$router.push('/legal-engagements/' + svc.id)">
            <div class="d-flex justify-space-between align-start">
              <div>
                <div class="font-weight-bold text-body-2">{{ svc.service_type_name }}</div>
                <div class="text-caption text-medium-emphasis">{{ svc.engagement_number }} - {{ svc.category_name }}</div>
              </div>
              <div class="text-end">
                <div class="text-caption text-success font-weight-bold">{{ formatMoney(svc.paid_amount || 0) }}</div>
                <div class="text-caption text-error font-weight-bold" v-if="(svc.remaining_amount || 0) > 0">متبقي: {{ formatMoney(svc.remaining_amount || 0) }}</div>
              </div>
            </div>
          </v-card>
        </div>
      </v-window-item>

      <v-window-item value="client-accounts">
        <div class="pa-2">
          <div class="d-flex justify-space-between align-center mb-3">
            <div class="text-subtitle-2 font-weight-black">حسابات المكتب</div>
            <v-btn size="x-small" variant="tonal" color="accent" :loading="officeLoading" @click="loadOfficeData">
              <v-icon size="14">mdi-refresh</v-icon>
            </v-btn>
          </div>
          <v-card variant="outlined" class="pa-3 mb-3 rounded-lg">
            <v-row dense>
              <v-col cols="4" class="text-center">
                <div class="text-caption text-medium-emphasis">الإجمالي</div>
                <div class="text-subtitle-2 font-weight-black text-primary">{{ formatMoney(officeReport.total_revenue || 0) }}</div>
              </v-col>
              <v-col cols="4" class="text-center">
                <div class="text-caption text-medium-emphasis">المحصل</div>
                <div class="text-subtitle-2 font-weight-black text-success">{{ formatMoney(officeReport.total_collected || 0) }}</div>
              </v-col>
              <v-col cols="4" class="text-center">
                <div class="text-caption text-medium-emphasis">المتبقي</div>
                <div class="text-subtitle-2 font-weight-black text-error">{{ formatMoney(officeReport.total_pending || 0) }}</div>
              </v-col>
            </v-row>
          </v-card>
          <div v-if="officeLoading" class="text-center py-6">
            <v-progress-circular indeterminate color="accent" size="32" />
          </div>
          <div v-else-if="!officeReport.clients?.length" class="text-center py-6 text-medium-emphasis">
            لا توجد حسابات مسجلة
          </div>
          <v-card v-for="cl in officeReport.clients || []" :key="cl.client_id" variant="outlined" class="mb-2 pa-3 rounded-lg">
            <div class="d-flex justify-space-between align-start">
              <div>
                <div class="font-weight-bold text-body-2">{{ cl.client_name }}</div>
                <div class="text-caption text-medium-emphasis">{{ cl.engagement_count || 0 }} تعاقدهات</div>
              </div>
              <div class="text-end">
                <div class="text-caption text-success font-weight-bold">{{ formatMoney(cl.total_paid || 0) }}</div>
                <div class="text-caption text-error font-weight-bold" v-if="(cl.total_remaining || 0) > 0">متبقي: {{ formatMoney(cl.total_remaining || 0) }}</div>
              </div>
            </div>
          </v-card>
        </div>
      </v-window-item>
    </v-window>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFinanceStore } from '../../stores/finance'
import { storeToRefs } from 'pinia'
import MobileCardList from './MobileCardList.vue'

const emit = defineEmits<{
  'add-transaction': []
  'add-invoice': []
  'add-receivable': []
}>()

const financeStore = useFinanceStore()
const { transactions, invoices, receivables, stats, loading } = storeToRefs(financeStore)

const activeTab = ref('transactions')

// Legal services finance data
const legalLoading = ref(false)
const legalStats = ref<any>({ total_services: 0, total_compensation: 0, total_paid: 0, total_remaining: 0 })
const legalList = ref<any[]>([])

// Office accounts data
const officeLoading = ref(false)
const officeReport = ref<any>({ total_revenue: 0, total_collected: 0, total_pending: 0, clients: [] })

const formatMoney = (val: number) => (val || 0).toLocaleString()

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

const openItem = (item: any) => {
  // handled by parent if needed
}

const loadOfficeData = async () => {
  officeLoading.value = true
  try {
    const { useOfficeAccountsStore } = await import('../../stores/officeAccounts')
    const officeStore = useOfficeAccountsStore()
    const data = await officeStore.fetchReport()
    if (data) {
      officeReport.value = data
    }
  } catch (e) {
    console.warn('Failed to load office accounts:', e)
  } finally {
    officeLoading.value = false
  }
}

onMounted(() => {
  financeStore.fetchFinanceData()
})
</script>
