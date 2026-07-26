<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <v-btn
            icon
            variant="text"
            class="me-4 text-gold"
            @click="$router.push('/legal-services')"
          >
            <LucideIcon name="arrow-right" :size="24" />
          </v-btn>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">
              تفاصيل التعاقد: {{ engagement?.engagement_number || '...' }}
            </h1>
            <p class="text-subtitle-1 text-white opacity-60 font-weight-black mb-0">
              العميل: {{ clientName }} | الحالة:
              <v-chip
                size="small"
                :color="getStatusColor(engagement?.status_name || '')"
                class="font-weight-bold"
              >
                {{ engagement?.status_name || '' }}
              </v-chip>
            </p>
          </div>
        </div>
      </v-col>
    </v-row>

    <v-row v-if="loading" class="mt-4">
      <v-col cols="12" class="text-center py-10">
        <v-progress-circular indeterminate color="accent" size="64"></v-progress-circular>
      </v-col>
    </v-row>

    <template v-else-if="engagement">
      <v-card class="glass-card mb-6">
        <v-tabs v-model="detailsTab" color="accent" grow class="border-b border-gold-thin">
          <v-tab value="details" class="font-weight-black">
            <LucideIcon name="info" :size="18" class="me-2" /> التفاصيل
          </v-tab>
          <v-tab value="finance" class="font-weight-black">
            <LucideIcon name="wallet" :size="18" class="me-2" /> المالية
            <v-badge
              v-if="paymentHistory.length > 0"
              :content="paymentHistory.length"
              color="accent"
              class="ms-2"
              inline
            />
          </v-tab>
        </v-tabs>

        <v-window v-model="detailsTab" class="pa-6">
          <!-- Details Tab -->
          <v-window-item value="details">
            <v-row>
              <v-col cols="12" sm="6">
                <div class="text-caption text-gold mb-1">الخدمة</div>
                <div class="text-body-1 font-weight-bold text-white">{{ serviceName }}</div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="text-caption text-gold mb-1">التصنيف</div>
                <div class="text-body-1 font-weight-bold text-white">
                  {{ engagement.category_name }}
                </div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="text-caption text-gold mb-1">المحامي المسؤول</div>
                <div class="text-body-1 font-weight-bold text-white">
                  {{ engagement.responsible_name || 'غير محدد' }}
                </div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="text-caption text-gold mb-1">تاريخ البدء</div>
                <div class="text-body-1 font-weight-bold text-white">
                  {{ formatDate(engagement.start_date) }}
                </div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="text-caption text-gold mb-1">تاريخ الانتهاء المتوقع</div>
                <div class="text-body-1 font-weight-bold text-white">
                  {{ formatDate(engagement.expected_end_date) }}
                </div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="text-caption text-gold mb-1">الأولوية</div>
                <v-chip
                  size="x-small"
                  :color="engagement.priority_color || 'grey'"
                  variant="tonal"
                  class="font-weight-black"
                >
                  {{ engagement.priority_name }}
                </v-chip>
              </v-col>
              <v-col v-if="engagement.case_number" cols="12">
                <div class="text-caption text-gold mb-1">القضية المرتبطة</div>
                <div class="text-body-1 font-weight-bold text-accent">
                  {{ engagement.case_number }}
                </div>
              </v-col>
              <v-col v-if="engagement.description" cols="12">
                <div class="text-caption text-gold mb-1">الوصف</div>
                <div class="text-body-2 text-white opacity-80" style="white-space: pre-wrap">
                  {{ engagement.description }}
                </div>
              </v-col>
            </v-row>
          </v-window-item>

          <!-- Finance Tab -->
          <v-window-item value="finance">
            <!-- Summary Cards -->
            <v-row dense class="mb-4">
              <v-col cols="6" sm="3">
                <v-card variant="outlined" class="pa-3 text-center rounded-lg border-gold-thin">
                  <div class="text-caption text-gold mb-1">الإجمالي</div>
                  <div class="text-subtitle-1 font-weight-black text-accent">
                    {{ formatCurrency(totalDue) }}
                  </div>
                </v-card>
              </v-col>
              <v-col cols="6" sm="3">
                <v-card variant="outlined" class="pa-3 text-center rounded-lg border-gold-thin">
                  <div class="text-caption text-gold mb-1">المدفوع</div>
                  <div class="text-subtitle-1 font-weight-black text-success">
                    {{ formatCurrency(engagement.paid_amount || 0) }}
                  </div>
                </v-card>
              </v-col>
              <v-col cols="6" sm="3">
                <v-card variant="outlined" class="pa-3 text-center rounded-lg border-gold-thin">
                  <div class="text-caption text-gold mb-1">المتبقي</div>
                  <div class="text-subtitle-1 font-weight-black text-error">
                    {{ formatCurrency(engagement.remaining_amount || 0) }}
                  </div>
                </v-card>
              </v-col>
              <v-col cols="6" sm="3">
                <v-card variant="outlined" class="pa-3 text-center rounded-lg border-gold-thin">
                  <div class="text-caption text-gold mb-1">الحالة</div>
                  <v-chip
                    size="x-small"
                    :color="getFinanceStatusColor(engagement.finance_status || 'pending')"
                    class="font-weight-black mt-1"
                  >
                    {{ getFinanceStatusLabel(engagement.finance_status || 'pending') }}
                  </v-chip>
                </v-card>
              </v-col>
            </v-row>

            <!-- Action Buttons -->
            <div class="d-flex flex-wrap ga-3 mb-6">
              <v-btn
                v-if="(engagement.remaining_amount || 0) > 0"
                color="accent"
                class="font-weight-black rounded-lg"
                @click="showPaymentDialog = true"
              >
                <LucideIcon name="wallet" :size="16" class="me-2" /> تسجيل دفعة جديدة
              </v-btn>
              <v-btn
                v-if="(engagement.remaining_amount || 0) > 0 && !engagement.installment_count"
                color="gold"
                variant="tonal"
                class="font-weight-black rounded-lg"
                @click="showInstallmentDialog = true"
              >
                <LucideIcon name="calendar" :size="16" class="me-2" /> إنشاء جدول أقساط
              </v-btn>
              <v-btn
                v-if="!engagement.invoice_id"
                variant="outlined"
                color="gold"
                class="font-weight-black rounded-lg"
                :loading="generatingInvoice"
                @click="generateInvoice"
              >
                <LucideIcon name="receipt" :size="16" class="me-2" /> إنشاء فاتورة
              </v-btn>
              <v-btn
                v-else
                variant="outlined"
                color="success"
                class="font-weight-black rounded-lg"
                :loading="printingInvoice"
                @click="printInvoice"
              >
                <LucideIcon name="printer" :size="16" class="me-2" /> طباعة الفاتورة
              </v-btn>
            </div>

            <!-- Payment History -->
            <div v-if="loadingPayments" class="text-center py-6">
              <v-progress-circular indeterminate color="accent" size="32" />
            </div>
            <template v-else>
              <h4 class="text-subtitle-2 font-weight-black text-gold mb-3">سجل الدفعات</h4>
              <div
                v-if="paymentHistory.length === 0"
                class="text-center py-6 text-white opacity-50"
              >
                لا توجد دفعات مسجلة بعد.
              </div>
              <v-table v-else class="bg-transparent mb-6">
                <thead>
                  <tr>
                    <th class="text-right text-gold font-weight-black">التاريخ</th>
                    <th class="text-right text-gold font-weight-black">المبلغ</th>
                    <th class="text-right text-gold font-weight-black">طريقة الدفع</th>
                    <th class="text-right text-gold font-weight-black">رقم السند</th>
                    <th class="text-right text-gold font-weight-black">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in paymentHistory" :key="p.id">
                    <td class="text-right text-white">{{ formatDate(p.payment_date) }}</td>
                    <td class="text-right text-success font-weight-black">
                      {{ formatCurrency(p.amount) }}
                    </td>
                    <td class="text-right text-white">
                      {{ getPaymentMethodLabel(p.payment_method) }}
                    </td>
                    <td class="text-right text-white opacity-70 font-mono">
                      {{ p.voucher_number || '-' }}
                    </td>
                    <td class="text-right text-white opacity-70">{{ p.notes || '-' }}</td>
                  </tr>
                </tbody>
              </v-table>

              <!-- Installment Schedule -->
              <template v-if="installmentSchedules.length > 0">
                <h4 class="text-subtitle-2 font-weight-black text-gold mb-3">جدول الأقساط</h4>
                <v-table class="bg-transparent">
                  <thead>
                    <tr>
                      <th class="text-right text-gold font-weight-black">القسط</th>
                      <th class="text-right text-gold font-weight-black">المبلغ</th>
                      <th class="text-right text-gold font-weight-black">تاريخ الاستحقاق</th>
                      <th class="text-right text-gold font-weight-black">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(s, i) in installmentSchedules" :key="s.id">
                      <td class="text-right text-white font-weight-black">{{ i + 1 }}</td>
                      <td class="text-right text-white">{{ formatCurrency(s.amount) }}</td>
                      <td class="text-right text-white">{{ formatDate(s.due_date) }}</td>
                      <td class="text-right">
                        <v-chip
                          size="x-small"
                          :color="getScheduleStatusColor(s.status)"
                          class="font-weight-black"
                        >
                          {{ getScheduleStatusLabel(s.status) }}
                        </v-chip>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </template>
            </template>
          </v-window-item>
        </v-window>
      </v-card>
    </template>

    <!-- Payment Dialog -->
    <PaymentDialog
      v-if="showPaymentDialog && engagement"
      v-model="showPaymentDialog"
      :engagement="engagement"
      @save="handlePaymentSaved"
    />

    <!-- Installment Plan Dialog -->
    <InstallmentPlanDialog
      v-if="showInstallmentDialog && engagement"
      v-model="showInstallmentDialog"
      :engagement="engagement"
      @save="handleInstallmentSaved"
    />
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LucideIcon from '../components/common/LucideIcon.vue'
import PaymentDialog from '../components/finance/PaymentDialog.vue'
import InstallmentPlanDialog from '../components/finance/InstallmentPlanDialog.vue'
import { useLegalStore } from '../stores/legal'
import { useClientsStore } from '../stores/clients'

const props = defineProps<{ id: string }>()
const route = useRoute()
const router = useRouter()

const legalStore = useLegalStore()
const clientsStore = useClientsStore()

const loading = ref(true)
const engagementId = (props.id || route.params.id) as string
const engagement = computed(() => legalStore.services.find((e: any) => e.id === engagementId))

const detailsTab = ref('details')
const financeRecord = ref<any>(null)
const loadingFinance = ref(false)
const generatingInvoice = ref(false)
const printingInvoice = ref(false)

// Payment & installment state
const paymentHistory = ref<any[]>([])
const installmentSchedules = ref<any[]>([])
const loadingPayments = ref(false)
const showPaymentDialog = ref(false)
const showInstallmentDialog = ref(false)

const totalDue = computed(
  () => Number(engagement.value?.financial_compensation || 0) + Number(engagement.value?.tax || 0)
)

onMounted(async () => {
  loading.value = true
  if (!legalStore.services.length) {
    await legalStore.fetchServices({ page: 1, pageSize: 50 })
  }
  if (!legalStore.metadataLoaded) {
    await legalStore.fetchMetadata()
  }
  if (!clientsStore.clients.length) {
    await clientsStore.fetchClients()
  }
  loading.value = false

  // Load finance record
  if (engagementId) {
    loadingFinance.value = true
    try {
      financeRecord.value = await window.api.legalServices.getFinance(engagementId)
    } catch (e) {
      financeRecord.value = null
    } finally {
      loadingFinance.value = false
    }
  }

  // Load payment history and installments
  await loadPaymentData()
})

const loadPaymentData = async () => {
  if (!engagementId) return
  loadingPayments.value = true
  try {
    const { useFinanceStore } = await import('../stores/finance')
    const financeStore = useFinanceStore()
    await financeStore.fetchPayments(engagementId)
    paymentHistory.value = financeStore.paymentHistory
    if (engagement.value?.installment_count && engagement.value.installment_count > 1) {
      await financeStore.fetchInstallments(engagementId)
      installmentSchedules.value = financeStore.paymentSchedules
    }
  } catch (e) {
    console.warn('Failed to load payment data:', e)
  } finally {
    loadingPayments.value = false
  }
}

const handlePaymentSaved = () => {
  showPaymentDialog.value = false
  loadPaymentData()
  legalStore.fetchServices({ page: 1, pageSize: 50 })
}

const handleInstallmentSaved = () => {
  showInstallmentDialog.value = false
  loadPaymentData()
  legalStore.fetchServices({ page: 1, pageSize: 50 })
}

const clientName = computed(() => {
  if (!engagement.value) return ''
  const client = clientsStore.clients.find((c) => c.id === engagement.value?.client_id)
  return client ? client.name : 'غير معروف'
})

const serviceName = computed(() => {
  if (!engagement.value) return ''
  const srv = legalStore.types.find((s: any) => s.id === engagement.value?.engagement_type_id)
  return srv ? srv.name_ar : 'غير معروف'
})

const getStatusColor = (status: string) => {
  switch (status) {
    case 'مكتمل':
      return 'success'
    case 'قيد العمل':
      return 'primary'
    case 'ملغى':
      return 'error'
    default:
      return 'warning'
  }
}

const getFinanceStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
      return 'success'
    case 'partially_paid':
      return 'warning'
    case 'overdue':
      return 'error'
    default:
      return 'grey'
  }
}

const getFinanceStatusLabel = (status: string) => {
  switch (status) {
    case 'paid':
      return 'مدفوع بالكامل'
    case 'partially_paid':
      return 'مدفوع جزئياً'
    case 'overdue':
      return 'متأخر'
    case 'pending':
      return 'معلق'
    default:
      return status || 'معلق'
  }
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0
  }).format(val)
}

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
    card: 'بطاقة'
  }
  return map[method] || method || '-'
}

const getScheduleStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
      return 'success'
    case 'pending':
      return 'warning'
    case 'overdue':
      return 'error'
    default:
      return 'grey'
  }
}

const getScheduleStatusLabel = (status: string) => {
  switch (status) {
    case 'paid':
      return 'مدفوع'
    case 'pending':
      return 'معلق'
    case 'overdue':
      return 'متأخر'
    default:
      return status || 'معلق'
  }
}

const generateInvoice = async () => {
  if (!engagement.value?.id) return
  generatingInvoice.value = true
  try {
    await window.api.legalServices.generateInvoice(engagement.value.id)
  } catch (e: any) {
    console.error(e)
  } finally {
    generatingInvoice.value = false
  }
}

const printInvoice = async () => {
  if (!engagement.value?.invoice_id) return
  printingInvoice.value = true
  try {
    const result = await window.api.reports.exportPdf({
      type: 'invoice',
      params: { id: engagement.value.invoice_id }
    })
    if (result && result.saved && result.path) {
      await window.api.documents.open(result.path)
    }
  } catch (e: any) {
    console.error(e)
  } finally {
    printingInvoice.value = false
  }
}
</script>
