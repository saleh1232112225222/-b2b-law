<template>
  <div>
    <!-- Client Selector -->
    <v-card class="glass-card pa-6 mb-6">
      <div class="d-flex align-center mb-4">
        <LucideIcon name="users" :size="24" class="me-3 text-accent" />
        <h2 class="text-h6 font-weight-black text-gold">كشف حساب العميل</h2>
      </div>
      <v-autocomplete
        v-model="selectedClientId"
        :items="clientsStore.clients"
        item-title="name"
        item-value="id"
        label="اختر العميل..."
        variant="outlined"
        density="comfortable"
        clearable
        class="mb-4"
        @update:model-value="loadClientSummary"
      >
        <template #prepend-inner>
          <LucideIcon name="search" :size="18" class="text-gold opacity-50" />
        </template>
      </v-autocomplete>
    </v-card>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-10">
      <v-progress-circular indeterminate color="accent" size="48" />
      <div class="mt-4 text-gold font-weight-black">جاري تحميل البيانات...</div>
    </div>

    <!-- Summary Content -->
    <template v-if="summary && !loading">
      <!-- Summary Cards -->
      <v-row class="mb-6" dense>
        <v-col cols="6" md="3">
          <v-card class="glass-card pa-5 text-center" elevation="0">
            <LucideIcon name="layers" :size="28" class="text-accent mb-2" />
            <div class="text-caption text-gold opacity-60 mb-1">إجمالي الخدمات</div>
            <div class="text-h5 font-weight-black text-white">{{ summary.total_services }}</div>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card class="glass-card pa-5 text-center" elevation="0">
            <LucideIcon name="coins" :size="28" class="text-warning mb-2" />
            <div class="text-caption text-gold opacity-60 mb-1">الإجمالي المستحق</div>
            <div class="text-h5 font-weight-black text-white">
              {{ formatCurrency(summary.total_due) }}
            </div>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card class="glass-card pa-5 text-center" elevation="0">
            <LucideIcon name="check-circle" :size="28" class="text-success mb-2" />
            <div class="text-caption text-gold opacity-60 mb-1">المبلغ المدفوع</div>
            <div class="text-h5 font-weight-black text-success">
              {{ formatCurrency(summary.total_paid) }}
            </div>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card class="glass-card pa-5 text-center" elevation="0">
            <LucideIcon name="alert-triangle" :size="28" class="text-error mb-2" />
            <div class="text-caption text-gold opacity-60 mb-1">المتبقي</div>
            <div class="text-h5 font-weight-black text-error">
              {{ formatCurrency(summary.balance) }}
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Collection Rate -->
      <v-card class="glass-card pa-5 mb-6">
        <div class="d-flex justify-space-between align-center mb-3">
          <span class="text-body-1 font-weight-black text-gold">نسبة التحصيل</span>
          <span
            class="text-h6 font-weight-black"
            :class="collectionRate >= 50 ? 'text-success' : 'text-error'"
          >
            {{ collectionRate }}%
          </span>
        </div>
        <v-progress-linear
          :model-value="collectionRate"
          :color="collectionRate >= 75 ? 'success' : collectionRate >= 50 ? 'warning' : 'error'"
          height="12"
          rounded
        />
      </v-card>

      <!-- Tabs: Services + Payments -->
      <v-card class="glass-card overflow-hidden">
        <v-tabs v-model="activeTab" color="accent" grow class="border-b border-gold-thin">
          <v-tab value="services" class="font-weight-black">
            <LucideIcon name="layers" :size="18" class="me-2" /> الخدمات القانونية ({{
              services.length
            }})
          </v-tab>
          <v-tab value="payments" class="font-weight-black">
            <LucideIcon name="banknote" :size="18" class="me-2" /> سجل الدفعات ({{
              payments.length
            }})
          </v-tab>
        </v-tabs>

        <v-window v-model="activeTab" class="pa-6">
          <!-- Services Tab -->
          <v-window-item value="services">
            <div v-if="services.length === 0" class="text-center py-8 text-grey">
              <LucideIcon name="inbox" :size="48" class="mb-3 text-gold opacity-30" />
              <div>لا توجد خدمات قانونية مسجلة لهذا العميل</div>
            </div>
            <v-table v-else class="bg-transparent">
              <thead>
                <tr>
                  <th class="text-right text-gold font-weight-black">رقم التعاقد</th>
                  <th class="text-right text-gold font-weight-black">الخدمة</th>
                  <th class="text-right text-gold font-weight-black">التصنيف</th>
                  <th class="text-right text-gold font-weight-black">المبلغ الإجمالي</th>
                  <th class="text-right text-gold font-weight-black">المدفوع</th>
                  <th class="text-right text-gold font-weight-black">المتبقي</th>
                  <th class="text-right text-gold font-weight-black">الحالة</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="svc in services" :key="svc.id">
                  <td class="text-right font-weight-black text-white font-mono">
                    {{ svc.engagement_number }}
                  </td>
                  <td class="text-right text-white">{{ svc.service_type_name }}</td>
                  <td class="text-right text-gold opacity-80">{{ svc.category_name }}</td>
                  <td class="text-right font-weight-black text-white">
                    {{ formatCurrency(svc.total_amount || 0) }}
                  </td>
                  <td class="text-right font-weight-black text-success">
                    {{ formatCurrency(svc.paid_amount || 0) }}
                  </td>
                  <td
                    class="text-right font-weight-black"
                    :class="(svc.remaining_amount || 0) > 0 ? 'text-error' : 'text-success'"
                  >
                    {{ formatCurrency(svc.remaining_amount || 0) }}
                  </td>
                  <td class="text-right">
                    <v-chip
                      size="x-small"
                      :color="getServiceStatusColor(svc.finance_status)"
                      class="font-weight-black"
                    >
                      {{ getServiceStatusLabel(svc.finance_status) }}
                    </v-chip>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="border-t border-gold-thin">
                  <td colspan="3" class="text-right font-weight-black text-gold">الإجمالي</td>
                  <td class="text-right font-weight-black text-white">
                    {{ formatCurrency(totals.total) }}
                  </td>
                  <td class="text-right font-weight-black text-success">
                    {{ formatCurrency(totals.paid) }}
                  </td>
                  <td class="text-right font-weight-black text-error">
                    {{ formatCurrency(totals.remaining) }}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </v-table>
          </v-window-item>

          <!-- Payments Tab -->
          <v-window-item value="payments">
            <div v-if="payments.length === 0" class="text-center py-8 text-grey">
              <LucideIcon name="banknote" :size="48" class="mb-3 text-gold opacity-30" />
              <div>لا توجد دفعات مسجلة لهذا العميل</div>
            </div>
            <v-table v-else class="bg-transparent">
              <thead>
                <tr>
                  <th class="text-right text-gold font-weight-black">التاريخ</th>
                  <th class="text-right text-gold font-weight-black">الخدمة</th>
                  <th class="text-right text-gold font-weight-black">المبلغ</th>
                  <th class="text-right text-gold font-weight-black">طريقة الدفع</th>
                  <th class="text-right text-gold font-weight-black">رقم السند</th>
                  <th class="text-right text-gold font-weight-black">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in payments" :key="p.id">
                  <td class="text-right text-white">{{ formatDate(p.payment_date) }}</td>
                  <td class="text-right">
                    <div class="text-white font-weight-black">{{ p.service_type_name }}</div>
                    <div class="text-caption text-gold opacity-60">{{ p.engagement_number }}</div>
                  </td>
                  <td class="text-right font-weight-black text-success">
                    {{ formatCurrency(p.amount) }}
                  </td>
                  <td class="text-right text-white">
                    {{ getPaymentMethodLabel(p.payment_method) }}
                  </td>
                  <td class="text-right text-white opacity-70 font-mono text-caption">
                    {{ p.voucher_number || '-' }}
                  </td>
                  <td class="text-right text-white opacity-70 text-caption">
                    {{ p.notes || '-' }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="border-t border-gold-thin">
                  <td colspan="2" class="text-right font-weight-black text-gold">
                    إجمالي المدفوعات
                  </td>
                  <td class="text-right font-weight-black text-success">
                    {{ formatCurrency(totalPaid) }}
                  </td>
                  <td colspan="3"></td>
                </tr>
              </tfoot>
            </v-table>
          </v-window-item>
        </v-window>
      </v-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClientsStore } from '../../stores/clients'
import { useOfficeAccountsStore } from '../../stores/officeAccounts'
import LucideIcon from '../common/LucideIcon.vue'
import type { ClientFinancialSummary } from '../../types/finance'

const clientsStore = useClientsStore()
const officeStore = useOfficeAccountsStore()

const selectedClientId = ref('')
const loading = ref(false)
const activeTab = ref('services')
const summaryData = ref<ClientFinancialSummary | null>(null)

const summary = computed(() => summaryData.value?.summary)
const services = computed(() => summaryData.value?.services || [])
const payments = computed(() => summaryData.value?.payments || [])

const collectionRate = computed(() => {
  if (!summary.value || !summary.value.total_due) return 0
  return Math.round((summary.value.total_paid / summary.value.total_due) * 100)
})

const totalPaid = computed(() =>
  payments.value.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
)

const totals = computed(() => {
  const t = { total: 0, paid: 0, remaining: 0 }
  services.value.forEach((s: any) => {
    t.total += Number(s.total_amount || 0)
    t.paid += Number(s.paid_amount || 0)
    t.remaining += Number(s.remaining_amount || 0)
  })
  return t
})

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0
  }).format(val || 0)

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('ar-SA')
  } catch {
    return dateStr
  }
}

const getPaymentMethodLabel = (method: string) => {
  const map: Record<string, string> = {
    cash: 'نقدي',
    bank_transfer: 'تحويل بنكي',
    check: 'شيك',
    card: 'بطاقة ائتمان'
  }
  return map[method] || method || '-'
}

const getServiceStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
      return 'success'
    case 'partial':
      return 'warning'
    case 'overdue':
      return 'error'
    default:
      return 'grey'
  }
}

const getServiceStatusLabel = (status: string) => {
  switch (status) {
    case 'paid':
      return 'مدفوع بالكامل'
    case 'partial':
      return 'مدفوع جزئياً'
    case 'overdue':
      return 'متأخر'
    case 'pending':
      return 'معلق'
    case 'closed':
      return 'مغلق'
    default:
      return status || 'معلق'
  }
}

const loadClientSummary = async (clientId: string) => {
  if (!clientId) {
    summaryData.value = null
    return
  }
  loading.value = true
  try {
    await officeStore.fetchClientSummary(clientId)
    summaryData.value = officeStore.clientSummary
  } catch (e) {
    console.error('Error loading client summary:', e)
    summaryData.value = null
  } finally {
    loading.value = false
  }
}
</script>
