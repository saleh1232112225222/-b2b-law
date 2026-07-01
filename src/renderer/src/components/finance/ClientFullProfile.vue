<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <!-- Client Search -->
    <v-card class="glass-card pa-6 mb-6">
      <div class="d-flex align-center mb-4">
        <div class="glass-panel-light pa-3 rounded-xl me-4 border-gold opacity-20">
          <LucideIcon name="user-search" :size="28" class="text-accent" />
        </div>
        <div>
          <h1 class="text-h5 font-weight-black text-gold mb-1">الملف المالي للعميل</h1>
          <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
            اكتب اسم العميل لعرض جميع تعاملاته ومالياته
          </p>
        </div>
      </div>
      <v-autocomplete
        v-model="selectedClientId"
        :items="allClients"
        item-title="name"
        item-value="id"
        label="ابحث عن العميل..."
        variant="outlined"
        density="comfortable"
        clearable
        prepend-inner-icon="mdi-magnify"
        class="mb-2"
        @update:model-value="loadProfile"
      />
    </v-card>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="accent" size="64" width="4" />
      <div class="mt-4 text-h6 text-gold font-weight-black">جاري تحميل الملف المالي...</div>
    </div>

    <!-- Profile Content -->
    <template v-if="profile && !loading">
      <!-- Client Header Card -->
      <v-card class="glass-card pa-6 mb-6 overflow-hidden">
        <v-row>
          <v-col cols="12" md="4">
            <div class="d-flex align-center mb-4">
              <v-avatar color="accent" size="72" class="font-weight-black text-h4 text-black me-4">
                {{ profile.client.name?.charAt(0) }}
              </v-avatar>
              <div>
                <h2 class="text-h5 font-weight-black text-gold">{{ profile.client.name }}</h2>
                <v-chip
                  size="small"
                  :color="profile.client.type === 'شركات' ? 'primary' : 'accent'"
                  variant="flat"
                  class="font-weight-black mt-1"
                >
                  {{ profile.client.type || 'فرد' }}
                </v-chip>
              </div>
            </div>
          </v-col>
          <v-col cols="12" md="8">
            <v-row dense>
              <v-col cols="6" sm="3">
                <div class="text-caption text-gold opacity-60 mb-1">رقم الهوية</div>
                <div class="text-body-1 font-weight-black text-white">
                  {{ profile.client.id_number || '---' }}
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-caption text-gold opacity-60 mb-1">الجوال</div>
                <div class="text-body-1 font-weight-black text-white ltr-text">
                  {{ profile.client.phone || '---' }}
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-caption text-gold opacity-60 mb-1">المدينة</div>
                <div class="text-body-1 font-weight-black text-white">
                  {{ profile.client.city || '---' }}
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-caption text-gold opacity-60 mb-1">أول تعامل</div>
                <div class="text-body-1 font-weight-black text-white">
                  {{ formatDate(profile.first_deal_date) }}
                </div>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-card>

      <!-- Summary Cards -->
      <v-row class="mb-6" dense>
        <v-col v-for="card in summaryCards" :key="card.title" cols="6" sm="4" md="2">
          <v-card class="glass-card pa-4 text-center" elevation="0">
            <v-icon :color="card.color" size="28" class="mb-2">{{ card.icon }}</v-icon>
            <div class="text-caption text-gold opacity-60 mb-1">{{ card.title }}</div>
            <div class="text-h6 font-weight-black" :class="'text-' + card.color">
              {{ card.value }}
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Main Tabs -->
      <v-card class="glass-card overflow-hidden">
        <v-tabs
          v-model="activeTab"
          color="accent"
          grow
          class="border-b border-gold-thin"
          show-arrows
        >
          <v-tab value="cases" class="font-weight-black">
            <v-icon size="18" class="me-2">mdi-gavel</v-icon> القضايا ({{ profile.cases.length }})
          </v-tab>
          <v-tab value="services" class="font-weight-black">
            <v-icon size="18" class="me-2">mdi-briefcase</v-icon> الخدمات ({{
              profile.services.length
            }})
          </v-tab>
          <v-tab value="payments" class="font-weight-black">
            <v-icon size="18" class="me-2">mdi-cash</v-icon> الدفعات ({{ profile.payments.length }})
          </v-tab>
          <v-tab value="invoices" class="font-weight-black">
            <v-icon size="18" class="me-2">mdi-receipt</v-icon> الفواتير ({{
              profile.invoices.length
            }})
          </v-tab>
          <v-tab value="vouchers" class="font-weight-black">
            <v-icon size="18" class="me-2">mdi-file-document</v-icon> السندات ({{
              profile.vouchers.length
            }})
          </v-tab>
          <v-tab value="installments" class="font-weight-black">
            <v-icon size="18" class="me-2">mdi-calendar-clock</v-icon> الأقساط
          </v-tab>
        </v-tabs>

        <v-window v-model="activeTab" class="pa-6">
          <!-- Cases Tab -->
          <v-window-item value="cases">
            <div v-if="profile.cases.length === 0" class="text-center py-8 text-grey">
              <v-icon size="64" class="text-gold opacity-30 mb-3">mdi-gavel</v-icon>
              <div class="text-h6 font-weight-black">لا توجد قضايا مسجلة</div>
            </div>
            <v-table v-else class="bg-transparent">
              <thead>
                <tr>
                  <th class="text-right text-gold font-weight-black">رقم القضية</th>
                  <th class="text-right text-gold font-weight-black">النوع</th>
                  <th class="text-right text-gold font-weight-black">الخصم</th>
                  <th class="text-right text-gold font-weight-black">الحالة</th>
                  <th class="text-right text-gold font-weight-black">الأتعاب</th>
                  <th class="text-right text-gold font-weight-black">المدفوع</th>
                  <th class="text-right text-gold font-weight-black">المتبقي</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in profile.cases" :key="c.id">
                  <td class="text-right font-weight-black text-white font-mono">
                    {{ c.case_number }}
                  </td>
                  <td class="text-right text-white">{{ c.case_type_name || c.case_type }}</td>
                  <td class="text-right text-white">{{ c.opponent_name || '---' }}</td>
                  <td class="text-right">
                    <v-chip
                      size="x-small"
                      :color="getCaseStatusColor(c.status_name || c.status)"
                      class="font-weight-black"
                    >
                      {{ c.status_name || c.status }}
                    </v-chip>
                  </td>
                  <td class="text-right font-weight-black text-white">
                    {{ formatCurrency(c.total_fee) }}
                  </td>
                  <td class="text-right font-weight-black text-success">
                    {{ formatCurrency(c.paid_amount) }}
                  </td>
                  <td
                    class="text-right font-weight-black"
                    :class="c.remaining > 0 ? 'text-error' : 'text-success'"
                  >
                    {{ formatCurrency(c.remaining) }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="border-t border-gold-thin">
                  <td colspan="4" class="text-right font-weight-black text-gold">الإجمالي</td>
                  <td class="text-right font-weight-black text-white">
                    {{ formatCurrency(casesTotals.fee) }}
                  </td>
                  <td class="text-right font-weight-black text-success">
                    {{ formatCurrency(casesTotals.paid) }}
                  </td>
                  <td class="text-right font-weight-black text-error">
                    {{ formatCurrency(casesTotals.remaining) }}
                  </td>
                </tr>
              </tfoot>
            </v-table>
          </v-window-item>

          <!-- Services Tab -->
          <v-window-item value="services">
            <div v-if="profile.services.length === 0" class="text-center py-8 text-grey">
              <v-icon size="64" class="text-gold opacity-30 mb-3">mdi-briefcase</v-icon>
              <div class="text-h6 font-weight-black">لا توجد خدمات مسجلة</div>
            </div>
            <v-table v-else class="bg-transparent">
              <thead>
                <tr>
                  <th class="text-right text-gold font-weight-black">رقم التعاقد</th>
                  <th class="text-right text-gold font-weight-black">الخدمة</th>
                  <th class="text-right text-gold font-weight-black">التصنيف</th>
                  <th class="text-right text-gold font-weight-black">المحامي</th>
                  <th class="text-right text-gold font-weight-black">القيمة</th>
                  <th class="text-right text-gold font-weight-black">المدفوع</th>
                  <th class="text-right text-gold font-weight-black">المتبقي</th>
                  <th class="text-right text-gold font-weight-black">التاريخ</th>
                  <th class="text-right text-gold font-weight-black">الحالة</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in profile.services" :key="s.id">
                  <td class="text-right font-weight-black text-white font-mono">
                    {{ s.engagement_number }}
                  </td>
                  <td class="text-right text-white">{{ s.service_type_name }}</td>
                  <td class="text-right text-gold opacity-80">{{ s.category_name }}</td>
                  <td class="text-right text-white">{{ s.responsible_name || '---' }}</td>
                  <td class="text-right font-weight-black text-white">
                    {{ formatCurrency(s.total_amount) }}
                  </td>
                  <td class="text-right font-weight-black text-success">
                    {{ formatCurrency(s.paid_amount) }}
                  </td>
                  <td
                    class="text-right font-weight-black"
                    :class="s.remaining_amount > 0 ? 'text-error' : 'text-success'"
                  >
                    {{ formatCurrency(s.remaining_amount) }}
                  </td>
                  <td class="text-right text-white">{{ formatDate(s.start_date) }}</td>
                  <td class="text-right">
                    <v-chip
                      size="x-small"
                      :color="getServiceStatusColor(s.finance_status)"
                      class="font-weight-black"
                    >
                      {{ getServiceStatusLabel(s.finance_status) }}
                    </v-chip>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="border-t border-gold-thin">
                  <td colspan="4" class="text-right font-weight-black text-gold">الإجمالي</td>
                  <td class="text-right font-weight-black text-white">
                    {{ formatCurrency(servicesTotals.total) }}
                  </td>
                  <td class="text-right font-weight-black text-success">
                    {{ formatCurrency(servicesTotals.paid) }}
                  </td>
                  <td class="text-right font-weight-black text-error">
                    {{ formatCurrency(servicesTotals.remaining) }}
                  </td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </v-table>
          </v-window-item>

          <!-- Payments Tab -->
          <v-window-item value="payments">
            <div v-if="profile.payments.length === 0" class="text-center py-8 text-grey">
              <v-icon size="64" class="text-gold opacity-30 mb-3">mdi-cash</v-icon>
              <div class="text-h6 font-weight-black">لا توجد دفعات مسجلة</div>
            </div>
            <v-table v-else class="bg-transparent">
              <thead>
                <tr>
                  <th class="text-right text-gold font-weight-black">التاريخ</th>
                  <th class="text-right text-gold font-weight-black">الخدمة</th>
                  <th class="text-right text-gold font-weight-black">رقم التعاقد</th>
                  <th class="text-right text-gold font-weight-black">المبلغ</th>
                  <th class="text-right text-gold font-weight-black">طريقة الدفع</th>
                  <th class="text-right text-gold font-weight-black">رقم السند</th>
                  <th class="text-right text-gold font-weight-black">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in profile.payments" :key="p.id">
                  <td class="text-right text-white">{{ formatDate(p.payment_date) }}</td>
                  <td class="text-right text-white">{{ p.service_type_name }}</td>
                  <td class="text-right font-mono text-gold opacity-80">
                    {{ p.engagement_number }}
                  </td>
                  <td class="text-right font-weight-black text-success">
                    {{ formatCurrency(p.amount) }}
                  </td>
                  <td class="text-right text-white">
                    {{ getPaymentMethodLabel(p.payment_method) }}
                  </td>
                  <td class="text-right text-white opacity-70 font-mono text-caption">
                    {{ p.voucher_number || '---' }}
                  </td>
                  <td class="text-right text-white opacity-70 text-caption">
                    {{ p.notes || '---' }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="border-t border-gold-thin">
                  <td colspan="3" class="text-right font-weight-black text-gold">
                    إجمالي المدفوعات
                  </td>
                  <td class="text-right font-weight-black text-success">
                    {{ formatCurrency(totalPayments) }}
                  </td>
                  <td colspan="3"></td>
                </tr>
              </tfoot>
            </v-table>
          </v-window-item>

          <!-- Invoices Tab -->
          <v-window-item value="invoices">
            <div v-if="profile.invoices.length === 0" class="text-center py-8 text-grey">
              <v-icon size="64" class="text-gold opacity-30 mb-3">mdi-receipt</v-icon>
              <div class="text-h6 font-weight-black">لا توجد فواتير مسجلة</div>
            </div>
            <v-table v-else class="bg-transparent">
              <thead>
                <tr>
                  <th class="text-right text-gold font-weight-black">رقم الفاتورة</th>
                  <th class="text-right text-gold font-weight-black">التاريخ</th>
                  <th class="text-right text-gold font-weight-black">المبلغ</th>
                  <th class="text-right text-gold font-weight-black">الضريبة</th>
                  <th class="text-right text-gold font-weight-black">الإجمالي</th>
                  <th class="text-right text-gold font-weight-black">الحالة</th>
                  <th class="text-right text-gold font-weight-black">الوصف</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="inv in profile.invoices" :key="inv.id">
                  <td class="text-right font-weight-black text-white font-mono">
                    {{ inv.invoice_number }}
                  </td>
                  <td class="text-right text-white">{{ formatDate(inv.date) }}</td>
                  <td class="text-right text-white">{{ formatCurrency(inv.amount) }}</td>
                  <td class="text-right text-white">{{ formatCurrency(inv.vat_amount) }}</td>
                  <td class="text-right font-weight-black text-accent">
                    {{ formatCurrency(inv.total_amount) }}
                  </td>
                  <td class="text-right">
                    <v-chip
                      size="x-small"
                      :color="getInvoiceStatusColor(inv.status)"
                      class="font-weight-black"
                    >
                      {{ getInvoiceStatusLabel(inv.status) }}
                    </v-chip>
                  </td>
                  <td class="text-right text-white opacity-70 text-caption">
                    {{ inv.description || '---' }}
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-window-item>

          <!-- Vouchers Tab -->
          <v-window-item value="vouchers">
            <div v-if="profile.vouchers.length === 0" class="text-center py-8 text-grey">
              <v-icon size="64" class="text-gold opacity-30 mb-3">mdi-file-document</v-icon>
              <div class="text-h6 font-weight-black">لا توجد سندات مسجلة</div>
            </div>
            <v-table v-else class="bg-transparent">
              <thead>
                <tr>
                  <th class="text-right text-gold font-weight-black">رقم السند</th>
                  <th class="text-right text-gold font-weight-black">التاريخ</th>
                  <th class="text-right text-gold font-weight-black">النوع</th>
                  <th class="text-right text-gold font-weight-black">المبلغ</th>
                  <th class="text-right text-gold font-weight-black">الوصف</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="v in profile.vouchers" :key="v.id">
                  <td class="text-right font-weight-black text-white font-mono">
                    {{ v.voucher_number }}
                  </td>
                  <td class="text-right text-white">{{ formatDate(v.date) }}</td>
                  <td class="text-right">
                    <v-chip
                      size="x-small"
                      :color="v.type === 'receipt' ? 'success' : 'warning'"
                      class="font-weight-black"
                    >
                      {{ v.type === 'receipt' ? 'قبض' : 'صرف' }}
                    </v-chip>
                  </td>
                  <td
                    class="text-right font-weight-black"
                    :class="v.type === 'receipt' ? 'text-success' : 'text-error'"
                  >
                    {{ formatCurrency(v.amount) }}
                  </td>
                  <td class="text-right text-white opacity-70 text-caption">
                    {{ v.description || '---' }}
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-window-item>

          <!-- Installments Tab -->
          <v-window-item value="installments">
            <div
              v-if="profile.installment_schedules.length === 0"
              class="text-center py-8 text-grey"
            >
              <v-icon size="64" class="text-gold opacity-30 mb-3">mdi-calendar-clock</v-icon>
              <div class="text-h6 font-weight-black">لا توجد أقساط معلقة</div>
            </div>
            <v-table v-else class="bg-transparent">
              <thead>
                <tr>
                  <th class="text-right text-gold font-weight-black">رقم القسط</th>
                  <th class="text-right text-gold font-weight-black">العنوان</th>
                  <th class="text-right text-gold font-weight-black">رقم التعاقد</th>
                  <th class="text-right text-gold font-weight-black">المبلغ</th>
                  <th class="text-right text-gold font-weight-black">المدفوع</th>
                  <th class="text-right text-gold font-weight-black">تاريخ الاستحقاق</th>
                  <th class="text-right text-gold font-weight-black">الحالة</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="inst in profile.installment_schedules" :key="inst.id">
                  <td class="text-right font-weight-black text-white">
                    {{ inst.installment_number }}
                  </td>
                  <td class="text-right text-white">{{ inst.title }}</td>
                  <td class="text-right font-mono text-gold opacity-80">
                    {{ inst.engagement_number }}
                  </td>
                  <td class="text-right font-weight-black text-white">
                    {{ formatCurrency(inst.amount) }}
                  </td>
                  <td class="text-right font-weight-black text-success">
                    {{ formatCurrency(inst.paid_amount) }}
                  </td>
                  <td class="text-right text-white">{{ formatDate(inst.due_date) }}</td>
                  <td class="text-right">
                    <v-chip
                      size="x-small"
                      :color="getInstallmentStatusColor(inst.status)"
                      class="font-weight-black"
                    >
                      {{ getInstallmentStatusLabel(inst.status) }}
                    </v-chip>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-window-item>
        </v-window>
      </v-card>

      <!-- Print Button -->
      <div class="d-flex justify-end mt-6">
        <v-btn
          color="accent"
          size="large"
          class="font-weight-black rounded-lg px-8"
          @click="printProfile"
        >
          <v-icon class="me-2">mdi-printer</v-icon> طباعة الكشف المالي
        </v-btn>
      </div>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import LucideIcon from '../common/LucideIcon.vue'
import { useClientsStore } from '../../stores/clients'
import { useOfficeAccountsStore } from '../../stores/officeAccounts'
import type { ClientFullProfile } from '../../types/finance'

const clientsStore = useClientsStore()
const officeStore = useOfficeAccountsStore()

const selectedClientId = ref('')
const loading = ref(false)
const activeTab = ref('cases')
const profile = ref<ClientFullProfile | null>(null)

const allClients = computed(() => clientsStore.clients)

// Summary Cards
const summaryCards = computed(() => {
  if (!profile.value) return []
  const s = profile.value.summary
  return [
    { title: 'القضايا', value: s.total_cases, icon: 'mdi-gavel', color: 'primary' },
    { title: 'الخدمات', value: s.total_services, icon: 'mdi-briefcase', color: 'accent' },
    {
      title: 'الإجمالي',
      value: formatCurrency(s.total_services_amount),
      icon: 'mdi-coins',
      color: 'warning'
    },
    {
      title: 'المدفوع',
      value: formatCurrency(s.total_payments),
      icon: 'mdi-check-circle',
      color: 'success'
    },
    {
      title: 'المتبقي',
      value: formatCurrency(s.total_services_remaining),
      icon: 'mdi-alert',
      color: 'error'
    },
    {
      title: 'الأقساط المعلقة',
      value: s.pending_installments + s.overdue_installments,
      icon: 'mdi-calendar-clock',
      color: s.overdue_installments > 0 ? 'error' : 'warning'
    }
  ]
})

// Totals
const casesTotals = computed(() => {
  const t = { fee: 0, paid: 0, remaining: 0 }
  profile.value?.cases.forEach((c) => {
    t.fee += Number(c.total_fee || 0)
    t.paid += Number(c.paid_amount || 0)
    t.remaining += Number(c.remaining || 0)
  })
  return t
})

const servicesTotals = computed(() => {
  const t = { total: 0, paid: 0, remaining: 0 }
  profile.value?.services.forEach((s) => {
    t.total += Number(s.total_amount || 0)
    t.paid += Number(s.paid_amount || 0)
    t.remaining += Number(s.remaining_amount || 0)
  })
  return t
})

const totalPayments = computed(
  () => profile.value?.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0
)

// Helpers
const formatCurrency = (val: number) =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0
  }).format(val || 0)

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '---'
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
  return map[method] || method || '---'
}

const getCaseStatusColor = (status: string) => {
  if (status?.includes('منتهية') || status?.includes('مكتمل')) return 'success'
  if (status?.includes('منظورة') || status?.includes('قيد')) return 'primary'
  if (status?.includes('مفتوحة')) return 'warning'
  return 'grey'
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

const getInvoiceStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
      return 'success'
    case 'sent':
      return 'primary'
    case 'draft':
      return 'grey'
    case 'cancelled':
      return 'error'
    default:
      return 'grey'
  }
}

const getInvoiceStatusLabel = (status: string) => {
  switch (status) {
    case 'paid':
      return 'مدفوعة'
    case 'sent':
      return 'مرسلة'
    case 'draft':
      return 'مسودة'
    case 'cancelled':
      return 'ملغاة'
    default:
      return status || '---'
  }
}

const getInstallmentStatusColor = (status: string) => {
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

const getInstallmentStatusLabel = (status: string) => {
  switch (status) {
    case 'paid':
      return 'مدفوع'
    case 'pending':
      return 'معلق'
    case 'overdue':
      return 'متأخر'
    default:
      return status || '---'
  }
}

// Load Profile
const loadProfile = async (clientId: string) => {
  if (!clientId) {
    profile.value = null
    return
  }
  loading.value = true
  try {
    await officeStore.fetchClientFullProfile(clientId)
    profile.value = officeStore.clientFullProfile
  } catch (e) {
    console.error('Error loading profile:', e)
    profile.value = null
  } finally {
    loading.value = false
  }
}

const printProfile = () => {
  window.print()
}

onMounted(async () => {
  if (!clientsStore.clients.length) {
    await clientsStore.fetchClients({ page: 1, pageSize: 500 })
  }
})
</script>
