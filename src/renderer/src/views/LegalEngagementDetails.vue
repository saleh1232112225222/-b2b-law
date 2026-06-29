<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <v-btn icon variant="text" class="me-4 text-gold" @click="$router.push('/legal-services')">
            <LucideIcon name="arrow-right" :size="24" />
          </v-btn>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">تفاصيل التعاقد: {{ engagement?.engagement_number || '...' }}</h1>
            <p class="text-subtitle-1 text-white opacity-60 font-weight-black mb-0">
              العميل: {{ clientName }} | الحالة:
              <v-chip size="small" :color="getStatusColor(engagement?.status_name || '')" class="font-weight-bold">
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
      <v-row>
        <v-col cols="12" md="8">
          <v-card class="glass-card pa-6 mb-6">
            <h3 class="text-h6 font-weight-black text-gold mb-4 border-b border-gold-thin pb-2">تفاصيل الخدمة</h3>
            <v-row>
              <v-col cols="12" sm="6">
                <div class="text-caption text-gold mb-1">الخدمة</div>
                <div class="text-body-1 font-weight-bold text-white">{{ serviceName }}</div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="text-caption text-gold mb-1">التصنيف</div>
                <div class="text-body-1 font-weight-bold text-white">{{ engagement.category_name }}</div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="text-caption text-gold mb-1">المحامي المسؤول</div>
                <div class="text-body-1 font-weight-bold text-white">{{ engagement.responsible_name || 'غير محدد' }}</div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="text-caption text-gold mb-1">تاريخ البدء</div>
                <div class="text-body-1 font-weight-bold text-white">{{ formatDate(engagement.start_date) }}</div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="text-caption text-gold mb-1">تاريخ الانتهاء المتوقع</div>
                <div class="text-body-1 font-weight-bold text-white">{{ formatDate(engagement.expected_end_date) }}</div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="text-caption text-gold mb-1">الأولوية</div>
                <v-chip size="x-small" :color="engagement.priority_color || 'grey'" variant="tonal" class="font-weight-black">
                  {{ engagement.priority_name }}
                </v-chip>
              </v-col>
              <v-col cols="12" v-if="engagement.case_number">
                <div class="text-caption text-gold mb-1">القضية المرتبطة</div>
                <div class="text-body-1 font-weight-bold text-accent">{{ engagement.case_number }}</div>
              </v-col>
              <v-col cols="12" v-if="engagement.description">
                <div class="text-caption text-gold mb-1">الوصف</div>
                <div class="text-body-2 text-white opacity-80" style="white-space: pre-wrap;">{{ engagement.description }}</div>
              </v-col>
            </v-row>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card class="glass-card pa-6 mb-6">
            <h3 class="text-h6 font-weight-black text-gold mb-4 border-b border-gold-thin pb-2">المالية</h3>
            <div class="d-flex justify-space-between align-center mb-3">
              <span class="text-white opacity-80">المقابل المالي:</span>
              <span class="font-weight-bold text-accent">{{ formatCurrency(engagement.financial_compensation || 0) }}</span>
            </div>
            <div class="d-flex justify-space-between align-center mb-3">
              <span class="text-white opacity-80">الضريبة:</span>
              <span class="font-weight-bold text-white">{{ formatCurrency(engagement.tax || 0) }}</span>
            </div>
            <v-divider class="my-3 border-gold-thin" />
            <div class="d-flex justify-space-between align-center mb-3">
              <span class="text-white opacity-80">الإجمالي:</span>
              <span class="font-weight-bold text-accent">{{ formatCurrency((engagement.financial_compensation || 0) + (engagement.tax || 0)) }}</span>
            </div>
            <div class="d-flex justify-space-between align-center mb-3">
              <span class="text-white opacity-80">المبلغ المدفوع:</span>
              <span class="font-weight-bold text-success">{{ formatCurrency(engagement.paid_amount || 0) }}</span>
            </div>
            <div class="d-flex justify-space-between align-center mb-4">
              <span class="text-white opacity-80">المتبقي:</span>
              <span class="font-weight-bold text-error">{{ formatCurrency(engagement.remaining_amount || 0) }}</span>
            </div>
            <div class="d-flex justify-space-between align-center mb-4">
              <span class="text-white opacity-80">طريقة الدفع:</span>
              <span class="font-weight-bold text-white">{{ engagement.payment_method || '-' }}</span>
            </div>

            <v-divider class="my-3 border-gold-thin" />

            <!-- Finance Record Info -->
            <div v-if="loadingFinance" class="text-center py-4">
              <v-progress-circular indeterminate color="accent" size="20" />
            </div>
            <div v-else-if="financeRecord" class="mb-4">
              <div class="d-flex justify-space-between align-center mb-2">
                <span class="text-caption text-white opacity-60">حالة السجل المالي:</span>
                <v-chip size="x-small" :color="getFinanceStatusColor(financeRecord.status)" class="font-weight-black text-ebony">
                  {{ getFinanceStatusLabel(financeRecord.status) }}
                </v-chip>
              </div>
              <div class="d-flex justify-space-between align-center">
                <span class="text-caption text-white opacity-60">تاريخ التسجيل:</span>
                <span class="text-caption font-weight-bold">{{ formatDate(financeRecord.date) }}</span>
              </div>
            </div>

            <v-btn block color="accent" class="font-weight-black mb-3" @click="openFinanceTab">
              <LucideIcon name="wallet" :size="16" class="me-2" /> عرض المالية الكامل
            </v-btn>
            <v-btn
              v-if="!engagement.invoice_id"
              block variant="outlined"
              color="gold"
              class="font-weight-black mb-3"
              :loading="generatingInvoice"
              @click="generateInvoice"
            >
              <LucideIcon name="receipt" :size="16" class="me-2" /> إنشاء فاتورة
            </v-btn>
            <v-btn
              v-else
              block variant="outlined"
              color="success"
              class="font-weight-black mb-3"
              :loading="printingInvoice"
              @click="printInvoice"
            >
              <LucideIcon name="printer" :size="16" class="me-2" /> طباعة الفاتورة
            </v-btn>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LucideIcon from '../components/common/LucideIcon.vue'
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

const financeRecord = ref<any>(null)
const loadingFinance = ref(false)
const generatingInvoice = ref(false)
const printingInvoice = ref(false)

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
})

const clientName = computed(() => {
  if (!engagement.value) return ''
  const client = clientsStore.clients.find(c => c.id === engagement.value?.client_id)
  return client ? client.name : 'غير معروف'
})

const serviceName = computed(() => {
  if (!engagement.value) return ''
  const srv = legalStore.types.find((s: any) => s.id === engagement.value?.engagement_type_id)
  return srv ? srv.name_ar : 'غير معروف'
})

const getStatusColor = (status: string) => {
  switch (status) {
    case 'مكتمل': return 'success'
    case 'قيد العمل': return 'primary'
    case 'ملغى': return 'error'
    default: return 'warning'
  }
}

const getFinanceStatusColor = (status: string) => {
  switch (status) {
    case 'paid': return 'success'
    case 'partially_paid': return 'warning'
    case 'overdue': return 'error'
    default: return 'grey'
  }
}

const getFinanceStatusLabel = (status: string) => {
  switch (status) {
    case 'paid': return 'مدفوع بالكامل'
    case 'partially_paid': return 'مدفوع جزئياً'
    case 'overdue': return 'متأخر'
    case 'pending': return 'معلق'
    default: return status || 'معلق'
  }
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(val)
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('ar-SA')
  } catch {
    return dateStr
  }
}

const openFinanceTab = () => {
  router.push('/legal-services')
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
