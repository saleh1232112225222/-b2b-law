<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <MobileFinance
      v-if="isMobile"
      @add-transaction="openAddDialog"
      @add-invoice="openAddDialog"
      @add-receivable="openAddDialog"
    />
    <template v-else>
      <!-- Header -->
      <v-row dense class="mb-8 align-center">
        <v-col>
          <div class="d-flex align-center">
            <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
              <LucideIcon name="banknote" :size="36" class="text-accent" />
            </div>
            <div>
              <h1 class="text-h5 font-weight-black text-gold mb-1">المنظومة المالية والمحاسبية</h1>
              <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
                إدارة التدفقات النقدية، المصاريف التشغيلية، وصافي الربحية للمكتب
              </p>
            </div>
          </div>
        </v-col>
        <v-col cols="auto">
          <v-btn
            color="accent"
            size="large"
            class="font-weight-black rounded-lg px-8 premium-lift h-100 premium-btn-gold-gradient"
            @click="openAddDialog"
          >
            <LucideIcon name="plus-circle" :size="20" class="me-3" /> تسجيل حركة مالية
          </v-btn>
          <v-btn
            color="error"
            variant="outlined"
            size="large"
            class="font-weight-black rounded-lg px-8 premium-lift h-100 ms-3 premium-btn-gold-gradient"
            @click="showCreditNoteDialog = true"
          >
            <LucideIcon name="file-minus" :size="20" class="me-3" /> إصدار إشعار دائن
          </v-btn>
        </v-col>
      </v-row>

      <!-- Stats Summary Cards -->
      <v-row class="mb-8" dense>
        <v-col v-for="(stat, key) in statCards" :key="key" cols="12" md="4">
          <v-card
            elevation="0"
            class="glass-card premium-hover pa-6 position-relative overflow-hidden glass-card"
          >
            <v-skeleton-loader
              v-if="loading || !stats"
              type="list-item-two-line"
              class="bg-transparent"
            ></v-skeleton-loader>
            <div v-else class="position-relative z-index-1">
              <div
                class="text-tiny font-weight-black text-gold opacity-60 mb-2 uppercase tracking-widest"
              >
                {{ stat.title }}
              </div>
              <div class="text-h5 font-weight-black d-flex align-baseline" :class="stat.textColor">
                {{ formatCurrency(stat.value) }}
                <span class="text-subtitle-2 ms-2 font-weight-bold opacity-60">SAR</span>
              </div>
            </div>
            <LucideIcon
              :name="stat.icon"
              :size="80"
              class="position-absolute opacity-5"
              style="bottom: -10px; left: -10px"
            />
          </v-card>
        </v-col>
      </v-row>

      <!-- Main Content Tabs -->
      <v-card elevation="0" class="glass-card overflow-hidden glass-card">
        <div class="glass-panel px-6 pt-2">
          <v-tabs v-model="tab" color="accent" align-tabs="start" class="premium-tabs">
            <v-tab value="transactions" class="font-weight-black">
              <LucideIcon name="list" :size="18" class="me-2" /> سجل العمليات
            </v-tab>
            <v-tab value="invoices" class="font-weight-black">
              <LucideIcon name="file-text" :size="18" class="me-2" /> الفواتير
            </v-tab>
            <v-tab value="vouchers" class="font-weight-black">
              <LucideIcon name="receipt" :size="18" class="me-2" /> السندات
            </v-tab>
            <v-tab value="receivables" class="font-weight-black">
              <LucideIcon name="wallet" :size="18" class="me-2" /> الذمم
            </v-tab>
            <v-tab value="accounts" class="font-weight-black">
              <LucideIcon name="git-branch" :size="18" class="me-2" /> شجرة الحسابات
            </v-tab>
            <v-tab value="reports" class="font-weight-black">
              <LucideIcon name="pie-chart" :size="18" class="me-2" /> تقارير الأداء
            </v-tab>
          </v-tabs>
        </div>
        <v-divider class="border-gold opacity-10" />

        <v-card-text class="pa-0 glass-card">
          <v-window v-model="tab">
            <!-- Transactions Tab -->
            <v-window-item value="transactions">
              <div class="glass-panel-light pa-6 border-b">
                <v-row dense align="center">
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="localSearch"
                      placeholder="بحث في السجل العام (الموكل، رقم القضية، البيان)..."
                      variant="outlined"
                      density="comfortable"
                      hide-details
                      class="glass-input glass-input"
                      clearable
                    >
                      <template #prepend-inner>
                        <LucideIcon name="search" :size="20" class="text-gold opacity-50" />
                      </template>
                    </v-text-field>
                  </v-col>
                  <v-spacer></v-spacer>
                  <v-col cols="auto">
                    <v-btn
                      variant="text"
                      color="gold"
                      class="rounded-lg opacity-70 premium-btn-gold-gradient"
                      :loading="loading"
                      @click="financeStore.fetchFinanceData()"
                    >
                      <LucideIcon name="refresh-cw" :size="20" class="me-2" />
                      <span class="font-weight-black">تحديث البيانات</span>
                    </v-btn>
                  </v-col>
                </v-row>
              </div>

              <v-data-table
                :headers="headers"
                :items="safeArray(transactions)"
                :search="localSearch"
                :loading="loading"
                class="bg-transparent premium-table"
                hover
                :items-per-page="15"
              >
                <template #[`column.date`]="{ column }">
                  <span class="text-gold opacity-70 font-weight-black">{{ column.title }}</span>
                </template>
                <template #[`column.type`]="{ column }">
                  <span class="text-gold opacity-70 font-weight-black">{{ column.title }}</span>
                </template>
                <template #[`column.display_entity`]="{ column }">
                  <span class="text-gold opacity-70 font-weight-black">{{ column.title }}</span>
                </template>
                <template #[`column.account_name`]="{ column }">
                  <span class="text-gold opacity-70 font-weight-black">{{ column.title }}</span>
                </template>
                <template #[`column.amount`]="{ column }">
                  <span class="text-gold opacity-70 font-weight-black">{{ column.title }}</span>
                </template>
                <template #[`column.category`]="{ column }">
                  <span class="text-gold opacity-70 font-weight-black">{{ column.title }}</span>
                </template>
                <template #[`column.actions`]="{ column }">
                  <span class="text-gold opacity-70 font-weight-black">{{ column.title }}</span>
                </template>

                <template #[`item.type`]="{ item }">
                  <v-chip
                    :color="(item as Transaction).type === 'income' ? 'green-darken-3' : 'error'"
                    size="x-small"
                    variant="flat"
                    class="font-weight-black rounded-md px-3"
                  >
                    <LucideIcon
                      :name="
                        (item as Transaction).type === 'income'
                          ? 'arrow-down-left'
                          : 'arrow-up-right'
                      "
                      :size="12"
                      class="me-1"
                    />
                    {{ (item as Transaction).type === 'income' ? 'إيراد' : 'مصروف' }}
                  </v-chip>
                </template>

                <template #[`item.display_entity`]="{ item }">
                  <div class="d-flex flex-column text-right py-2">
                    <span class="font-weight-black text-white">
                      {{ (item as Transaction).client_name || 'تشغيلي - للمكتب' }}
                    </span>
                    <div
                      v-if="(item as Transaction).case_number"
                      class="text-tiny font-weight-black text-accent d-flex align-center mt-1"
                    >
                      <LucideIcon name="gavel" :size="12" class="me-1" />
                      رقم القضية: {{ (item as Transaction).case_number }}
                    </div>
                  </div>
                </template>

                <template #[`item.amount`]="{ item }">
                  <div
                    class="font-weight-black text-left"
                    :class="
                      (item as Transaction).type === 'income' ? 'text-green-darken-2' : 'text-error'
                    "
                  >
                    <span class="me-1">{{ formatCurrency((item as Transaction).amount) }}</span>
                    <span class="text-tiny opacity-60">SAR</span>
                  </div>
                </template>

                <template #[`item.date`]="{ item }">
                  <div class="text-tiny font-weight-black text-gold opacity-50 font-mono">
                    {{ (item as Transaction).date }}
                  </div>
                </template>

                <template #[`item.account_name`]="{ item }">
                  <span class="text-white opacity-80 font-weight-black">{{
                    (item as Transaction).account_name
                  }}</span>
                </template>

                <template #[`item.category`]="{ item }">
                  <v-chip size="x-small" variant="tonal" color="gold" class="font-weight-black">
                    {{ (item as Transaction).category }}
                  </v-chip>
                </template>

                <template #[`item.actions`]="{ item }">
                  <v-btn
                    icon
                    variant="text"
                    color="error"
                    size="small"
                    class="premium-hover opacity-70 premium-btn-gold-gradient"
                    @click="confirmDelete(item as Transaction)"
                  >
                    <LucideIcon name="trash-2" :size="18" />
                  </v-btn>
                </template>

                <template #no-data>
                  <div class="pa-12 text-center">
                    <LucideIcon name="database-zap" :size="64" class="mb-4 opacity-10" />
                    <div class="text-h6 text-gold opacity-30 font-weight-black">
                      لا توجد حركات مالية مسجلة في هذا النطاق
                    </div>
                  </div>
                </template>
              </v-data-table>
            </v-window-item>

            <v-window-item value="invoices"><InvoicesList /></v-window-item>
            <v-window-item value="vouchers"><VouchersList /></v-window-item>
            <v-window-item value="receivables"><ReceivablesList /></v-window-item>
            <v-window-item value="accounts"><AccountsChart /></v-window-item>
            <v-window-item value="reports"><ProfitabilityReport /></v-window-item>
          </v-window>
        </v-card-text>
      </v-card>

      <!-- Add Transaction Dialog -->
      <v-dialog v-model="showDialog" width="90%" max-width="850" persistent scrollable>
        <v-card v-if="showDialog" class="rounded-xl elevation-24 overflow-hidden modal-card glass-card">
          <v-toolbar color="white" class="px-8 border-b" height="72">
            <div class="bg-gold-alpha pa-2 rounded-lg me-4">
              <LucideIcon name="plus-circle" :size="24" class="text-gold" />
            </div>
            <v-toolbar-title class="text-h5 font-weight-black text-pure-black"
              >إدراج عملية مالية جديدة</v-toolbar-title
            >
            <v-spacer></v-spacer>
            <v-btn icon variant="text" size="small" class="rounded-lg premium-btn-gold-gradient" @click="closeDialog">
              <LucideIcon name="x" :size="24" class="text-pure-black" />
            </v-btn>
          </v-toolbar>

          <v-card-text class="pa-8 bg-white modal-scrollable glass-card">
            <v-form ref="formRef" v-model="formValid">
              <v-row>
                <!-- Transaction Type Switch -->
                <v-col cols="12" class="mb-6">
                  <div class="glass-panel-light pa-1 rounded-xl border overflow-hidden">
                    <v-btn-toggle
                      v-model="editItem.type"
                      mandatory
                      color="gold"
                      class="w-100 rounded-lg overflow-hidden bg-white border-gold-alpha premium-btn-gold-gradient"
                      variant="flat"
                      density="comfortable"
                    >
                      <v-btn
                        value="income"
                        class="flex-grow-1 h-48 font-weight-black text-gold premium-btn-gold-gradient"
                        :active="editItem.type === 'income'"
                      >
                        <LucideIcon name="trending-up" :size="18" class="me-2" /> إيراد / أتعاب
                      </v-btn>
                      <v-btn
                        value="expense"
                        class="flex-grow-1 h-48 font-weight-black text-gold premium-btn-gold-gradient"
                        :active="editItem.type === 'expense'"
                      >
                        <LucideIcon name="trending-down" :size="18" class="me-2" /> مصروفات تشغيلية
                      </v-btn>
                    </v-btn-toggle>
                  </div>
                </v-col>

                <v-col v-if="editItem.type === 'expense'" cols="12">
                  <label class="mb-2 font-weight-black text-gold">وجهة صرف المبلغ*</v-label
                  >
                  <v-select
                    v-model="editItem.expense_owner_type"
                    :items="expenseOwnerTypes"
                    variant="outlined"
                    class="glass-input glass-input"
                    :rules="[(v) => !!v || 'وجهة الصرف مطلوبة']"
                  >
                    <template #prepend-inner>
                      <LucideIcon name="share-2" :size="20" class="text-gold opacity-50" />
                    </template>
                  </v-select>
                </v-col>

                <v-col v-if="shouldShowClientSelector" cols="12" md="6">
                  <label class="mb-2 font-weight-black text-gold">الموكل المعني*</v-label
                  >
                  <v-autocomplete
                    v-model="editItem.client_id"
                    :items="safeArray(lookupClients)"
                    item-title="name"
                    item-value="id"
                    placeholder="اختر الموكل..."
                    variant="outlined"
                    class="glass-input glass-input"
                    :loading="loadingLookups"
                    clearable
                    :rules="[(v) => !!v || 'اختيار الموكل إلزامي لهذا النوع']"
                  >
                    <template #prepend-inner>
                      <LucideIcon name="user" :size="20" class="text-gold opacity-50" />
                    </template>
                  </v-autocomplete>
                </v-col>

                <v-col v-if="shouldShowCaseSelector" cols="12" md="6">
                  <label class="mb-2 font-weight-black text-gold">ملف القضية المتأثر*</v-label
                  >
                  <v-autocomplete
                    v-model="editItem.case_id"
                    :items="safeArray(filteredCasesForLink)"
                    item-value="id"
                    item-title="displayLabel"
                    placeholder="رقم القضية..."
                    variant="outlined"
                    class="glass-input glass-input"
                    :loading="loadingLookups"
                    no-data-text="لا يوجد قضايا للموكل المحدد"
                    clearable
                  >
                    <template #prepend-inner>
                      <LucideIcon name="gavel" :size="20" class="text-gold opacity-50" />
                    </template>
                  </v-autocomplete>
                </v-col>

                <v-col cols="12" md="6">
                  <label class="mb-2 font-weight-black text-gold">المبلغ النقدي الأساسي*</v-label
                  >
                  <v-text-field
                    v-model.number="editItem.amount"
                    type="number"
                    variant="outlined"
                    class="glass-input glass-input"
                    prefix="SAR"
                    :rules="[(v) => !!v || 'المبلغ مطلوب', (v) => v > 0 || 'يجب إدخال مبلغ صحيح']"
                  >
                    <template #prepend-inner>
                      <LucideIcon name="dollar-sign" :size="20" class="text-accent opacity-50" />
                    </template>
                  </v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <label class="mb-2 font-weight-black text-gold">وعاء الضريبة (VAT)*</v-label
                  >
                  <v-select
                    v-model.number="editItem.vat_rate"
                    :items="vatRates"
                    variant="outlined"
                    class="glass-input glass-input"
                  >
                    <template #prepend-inner>
                      <LucideIcon name="percent" :size="20" class="text-gold opacity-50" />
                    </template>
                  </v-select>
                </v-col>

                <v-col cols="12" md="6">
                  <label class="mb-2 font-weight-black text-gold">الحساب المالي المتأثر*</v-label
                  >
                  <v-select
                    v-model="editItem.account_id"
                    :items="safeArray(filteredAccounts)"
                    item-title="name"
                    item-value="id"
                    placeholder="اختر الحساب..."
                    variant="outlined"
                    class="glass-input glass-input"
                    :rules="[(v) => !!v || 'يجب اختيار الحساب المالي']"
                  >
                    <template #prepend-inner>
                      <LucideIcon name="wallet" :size="20" class="text-gold opacity-50" />
                    </template>
                  </v-select>
                </v-col>

                <v-col cols="12" md="6">
                  <label class="mb-2 font-weight-black text-gold">تاريخ تسجيل الحركة*</v-label
                  >
                  <DualDatePicker v-model="editItem.date" />
                </v-col>

                <v-col cols="12">
                  <label class="mb-2 font-weight-black text-gold">وصف العملية / البيان المحاسبي</v-label
                  >
                  <v-textarea
                    v-model="editItem.description"
                    placeholder="اكتب تفاصيل إضافية لهذا القيد..."
                    variant="outlined"
                    class="glass-input"
                    rows="3"
                  >
                    <template #prepend-inner>
                      <LucideIcon name="edit-3" :size="20" class="text-gold opacity-50 mt-1" />
                    </template>
                  </v-textarea>
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>

          <v-card-actions class="pa-8 modal-footer-solid glass-card">
            <v-btn
              color="gold"
              variant="outlined"
              size="large"
              class="px-12 font-weight-black btn-unified action-btn-unified h-56 premium-btn-gold-gradient"
              @click="closeDialog"
              >إلغاء</v-btn
            >
            <v-spacer></v-spacer>
            <v-btn
              color="gold"
              variant="outlined"
              size="large"
              class="px-12 font-weight-black btn-unified action-btn-unified h-56 premium-btn-gold-gradient"
              :loading="saving"
              @click="handleSave"
            >
              تثبيت القيد المالي
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Delete Confirmation -->
      <v-dialog v-model="showDeleteDialog" width="90%" max-width="500" persistent>
        <v-card class="rounded-xl elevation-24 overflow-hidden modal-card border-error-alpha glass-card">
          <v-toolbar color="white" class="px-8 border-b" height="72">
            <LucideIcon name="alert-triangle" :size="24" class="text-error me-4" />
            <v-toolbar-title class="text-h6 font-weight-black text-error"
              >شطب العملية المالية</v-toolbar-title
            >
            <v-spacer></v-spacer>
            <v-btn
              icon
              variant="text"
              size="small"
              class="rounded-lg premium-btn-gold-gradient"
              @click="showDeleteDialog = false"
            >
              <LucideIcon name="x" :size="24" class="text-pure-black" />
            </v-btn>
          </v-toolbar>
          <v-card-text class="pa-8 bg-white text-center glass-card">
            <div class="text-body-1 mb-6 font-weight-black text-pure-black">
              هل أنت متأكد من حذف هذا القيد المالي نهائياً من السجلات؟
            </div>
            <div class="glass-panel-light pa-6 rounded-lg border border-error-alpha mb-6 bg-white">
              <div class="text-h5 font-weight-black text-error mb-2">
                {{ formatCurrency(itemToDelete?.amount) }}
                <span class="text-subtitle-2 opacity-60">SAR</span>
              </div>
              <div class="text-tiny font-weight-black text-pure-black opacity-50">
                {{ itemToDelete?.description || 'بدون بيان' }}
              </div>
            </div>
            <div class="text-tiny text-error opacity-70 font-weight-black">
              سيؤدي هذا الإجراء إلى إعادة حساب الأرصدة وإلغاء الربط بالقضية/الموكل بشكل قطعي.
            </div>
          </v-card-text>
          <v-card-actions class="pa-8 modal-footer-solid glass-card">
            <v-btn
              color="gold"
              variant="outlined"
              size="large"
              class="px-8 font-weight-black btn-unified h-56 premium-btn-gold-gradient"
              @click="showDeleteDialog = false"
              >تراجع</v-btn
            >
            <v-spacer></v-spacer>
            <v-btn
              color="error"
              variant="flat"
              size="large"
              class="px-8 font-weight-black rounded-lg premium-lift h-56 premium-btn-gold-gradient"
              :loading="deleting"
              @click="handleDelete"
            >
              تأكيد الحذف النهائي
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Success Snackbar -->
      <v-snackbar v-model="snackbar" :color="snackbarColor" rounded="lg" elevation="24">
        <div class="d-flex align-center">
          <LucideIcon
            :name="snackbarColor === 'success' ? 'check-circle' : 'alert-circle'"
            :size="18"
            class="me-3"
          />
          <span class="font-weight-black">{{ snackbarText }}</span>
        </div>
      </v-snackbar>

      <!-- Credit Note Dialog -->
      <CreateCreditNoteModal v-model="showCreditNoteDialog" @created="onCreditNoteCreated" />
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue'
import { useFinanceStore } from '../stores/finance'
import { useSearch } from '../composables/useSearch'
import { Transaction, Account } from '../types'
import { storeToRefs } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import InvoicesList from '../components/finance/InvoicesList.vue'
import VouchersList from '../components/finance/VouchersList.vue'
import ReceivablesList from '../components/finance/ReceivablesList.vue'
import AccountsChart from '../components/finance/AccountsChart.vue'
import ProfitabilityReport from '../components/finance/ProfitabilityReport.vue'
import CreateCreditNoteModal from '../components/finance/CreateCreditNoteModal.vue'
import DualDatePicker from '../components/DualDatePicker.vue'
import LucideIcon from '../components/common/LucideIcon.vue'
import { safeArray, safeLength, valWithDefault as safeDefaults } from '../utils/safe'
import { useMobileLayout } from '../composables/useMobileLayout'
import MobileFinance from '../components/mobile/MobileFinance.vue'

const financeStore = useFinanceStore()
const { transactions, accounts, stats, loading } = storeToRefs(financeStore)
const { isMobile } = useMobileLayout()

const tab = ref('transactions')
const showDialog = ref(false)
const formValid = ref(false)
const saving = ref(false)
const formRef = ref<any>(null)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')
const showCreditNoteDialog = ref(false)

const onCreditNoteCreated = () => {
  showSnackbar('تم إصدار إشعار الدائن بنجاح. يرجى اعتماده لتفعيل الأثر المالي.', 'success')
  financeStore.fetchFinanceData()
}

// Metadata lookups
const lookupClients = ref<any[]>([])
const lookupCases = ref<any[]>([])
const loadingLookups = ref(false)

const { search: localSearch } = useSearch((val) => {
  financeStore.searchQuery = val
})

onUnmounted(() => {
  financeStore.searchQuery = ''
})

const openAddDialog = (): void => {
  resetEditItem()
  showDialog.value = true
}

const closeDialog = (): void => {
  showDialog.value = false
}

const editItem = reactive<Partial<Transaction> & { expense_owner_type: string }>({
  type: 'income',
  amount: 0,
  vat_rate: 0.15,
  date: new Date().toISOString().split('T')[0],
  category: 'أتعاب محاماة',
  client_id: undefined,
  case_id: undefined,
  account_id: undefined,
  description: '',
  expense_owner_type: 'office'
})

const resetEditItem = (): void => {
  Object.assign(editItem, {
    id: uuidv4(),
    type: 'income',
    amount: 0,
    vat_rate: 0.15,
    date: new Date().toISOString().split('T')[0],
    category: 'أتعاب محاماة',
    client_id: undefined,
    case_id: undefined,
    account_id: undefined,
    description: '',
    expense_owner_type: 'office'
  })
}

const statCards = computed(() => [
  {
    title: 'إجمالي الأتعاب المحصلة',
    value: stats.value?.income,
    textColor: 'text-green-darken-2',
    iconColor: 'success',
    icon: 'trending-up'
  },
  {
    title: 'إجمالي المصاريف والمدفوعات',
    value: stats.value?.expense,
    textColor: 'text-error',
    iconColor: 'error',
    icon: 'trending-down'
  },
  {
    title: 'صافي التوازن المالي',
    value: stats.value?.balance,
    textColor: 'text-accent',
    iconColor: 'accent',
    icon: 'scale'
  }
])

const expenseOwnerTypes = [
  { title: 'مصروف مكتبي عام (إيجار، رواتب، تشغيل)', value: 'office' },
  { title: 'مصروف مرتبط بقضية (رسوم، معاينة، سفريات)', value: 'case' },
  { title: 'ذمة مستلمة من موكل (إيداعات)', value: 'client' }
]

const vatRates = [
  { title: 'الإعفاء الضريبي (0%)', value: 0 },
  { title: 'ضريبة القيمة المضافة (15%)', value: 0.15 }
]

const shouldShowClientSelector = computed(() => {
  return (
    editItem.type === 'income' ||
    editItem.expense_owner_type === 'client' ||
    editItem.expense_owner_type === 'case'
  )
})

const shouldShowCaseSelector = computed(() => {
  return editItem.type === 'income' || editItem.expense_owner_type === 'case'
})

const filteredCasesForLink = computed(() => {
  const cases = safeArray(lookupCases.value) as any[]
  if (cases.length === 0) return []
  if (editItem.expense_owner_type === 'office' || !editItem.client_id) return cases
  const targetClientId = String(editItem.client_id).trim()
  return cases.filter((c) => String(c.client_id || '').trim() === targetClientId)
})

const filteredAccounts = computed(() => {
  const all = safeArray(accounts.value) as Account[]
  if (editItem.type === 'income')
    return all.filter(
      (acc) => acc.type === 'revenue' || acc.type === 'asset' || acc.type === 'equity'
    )
  return all.filter(
    (acc) => acc.type === 'expense' || acc.type === 'asset' || acc.type === 'liability'
  )
})

const handleSave = async (): Promise<void> => {
  if (!formRef.value) return
  const { valid } = await formRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const sanitizeId = (id: unknown): string | null => {
      if (!id) return null
      const s = String(id).trim()
      return s === '' ? null : s
    }

    const payload = {
      ...editItem,
      client_id: sanitizeId(editItem.client_id),
      case_id: sanitizeId(editItem.case_id),
      account_id: sanitizeId(editItem.account_id)
    }

    if (payload.type === 'income') {
      payload.expense_owner_type = 'case'
    } else {
      if (payload.expense_owner_type === 'office') {
        payload.client_id = null
        payload.case_id = null
      } else if (payload.expense_owner_type === 'client') {
        payload.case_id = null
      }
    }

    await financeStore.addTransaction(payload as Transaction)
    showSnackbar('تم تثبيت الحركة المالية في السجل العام بنجاح', 'success')
    closeDialog()
    resetEditItem()
  } catch (e: unknown) {
    showSnackbar('فشل في حفظ العملية: ' + (e as Error).message, 'error')
  } finally {
    saving.value = false
  }
}

const loadLookups = async (): Promise<void> => {
  loadingLookups.value = true
  try {
    const clients = await window.api.clients.getAll()
    lookupClients.value = safeArray(clients)

    const cases = await window.api.cases.getAll()
    lookupCases.value = safeArray(cases).map((c: any) => ({
      ...c,
      displayLabel: `${c.case_number} - (${c.client_name || 'بدون موكل'})`
    }))

    await financeStore.fetchFinanceData()
  } catch (e: unknown) {
    console.error('Core lookup failed:', e)
  } finally {
    loadingLookups.value = false
  }
}

onMounted(loadLookups)

const showSnackbar = (text: string, color: string = 'success'): void => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

const formatCurrency = (val: number | undefined): string => {
  return Number(safeDefaults(val, 0)).toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

watch(
  () => editItem.type,
  (newType) => {
    if (newType === 'income') {
      editItem.category = 'أتعاب محاماة'
      editItem.expense_owner_type = 'office'
    } else {
      editItem.category = 'رسوم قضائية'
      editItem.expense_owner_type = 'case'
    }
  }
)

watch([filteredAccounts, showDialog], ([newAccs, isShown]) => {
  if (isShown && safeLength(newAccs) > 0 && !editItem.account_id) {
    const def = newAccs.find((a) => a.code === '1101' || a.name.includes('صندوق')) || newAccs[0]
    editItem.account_id = def.id
  }
})

const headers = [
  { title: 'التاريخ', key: 'date', width: '120px' },
  { title: 'النوع', key: 'type', width: '100px' },
  { title: 'الكيان / الموكل', key: 'display_entity' },
  { title: 'الحساب المالي', key: 'account_name' },
  { title: 'المبلغ (SAR)', key: 'amount', align: 'end' as const },
  { title: 'التصنيف', key: 'category' },
  { title: 'إجراءات', key: 'actions', sortable: false, align: 'end' as const }
]

const showDeleteDialog = ref(false)
const itemToDelete = ref<Transaction | null>(null)
const deleting = ref(false)

const confirmDelete = (item: Transaction): void => {
  itemToDelete.value = item
  showDeleteDialog.value = true
}

const handleDelete = async (): Promise<void> => {
  if (!itemToDelete.value) return
  deleting.value = true
  try {
    await financeStore.deleteTransaction(itemToDelete.value.id)
    showSnackbar('تم شطب العملية المالية من السجلات')
    showDeleteDialog.value = false
  } catch (e: unknown) {
    showSnackbar('فشل في شطب العملية: ' + (e as Error).message, 'error')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.text-pure-black {
  color: #000000 !important;
}

.modal-card {
  background: #ffffff !important;
  border: 1px solid rgba(233, 195, 73, 0.4) !important;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2) !important;
}

.modal-footer-solid {
  background: #ffffff !important;
  opacity: 1 !important;
  border-top: 1px solid rgba(233, 195, 73, 0.2) !important;
}

.bg-gold-alpha {
  background: rgba(233, 195, 73, 0.1) !important;
}

.btn-unified {
  border: 1px solid rgba(233, 195, 73, 0.82) !important;
  background: transparent !important;
  border-radius: 12px !important;
}

.btn-unified:hover {
  background: rgba(233, 195, 73, 0.08) !important;
  border-color: rgba(233, 195, 73, 0.95) !important;
}

.action-btn-unified {
  min-width: 180px !important;
}

.modal-scrollable {
  max-height: calc(100vh - 260px);
  overflow-y: auto;
}

.uppercase {
  text-transform: uppercase;
}

.tracking-widest {
  letter-spacing: 0.1em;
}

.z-index-1 {
  position: relative;
  z-index: 1;
}

.border-error-alpha {
  border-color: rgba(244, 67, 54, 0.2) !important;
}

.rtl {
  direction: rtl;
}

.h-48 {
  height: 48px !important;
}

/* ---- Mobile Styles (max-width: 1023px) ---- */
@media (max-width: 1023px) {
  /* Header: stack buttons vertically */
  :deep(.v-row.mb-8.align-center > .v-col[cols='auto']) {
    flex: 0 0 100% !important;
    max-width: 100% !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 8px !important;
  }

  :deep(.v-row.mb-8.align-center > .v-col[cols='auto'] .v-btn) {
    width: 100% !important;
    margin: 0 !important;
  }

  /* Finance tabs: scrollable */
  :deep(.v-tabs) {
    overflow-x: auto !important;
    flex-wrap: nowrap !important;
  }

  :deep(.v-tab) {
    font-size: 0.78rem !important;
    padding: 0 8px !important;
    min-width: 80px !important;
  }

  :deep(.v-tab .v-icon) {
    display: none !important;
  }

  /* Table: horizontal scroll */
  :deep(.v-data-table) {
    overflow-x: auto !important;
  }

  /* Reduce modal padding */
  .modal-scrollable {
    max-height: calc(100dvh - 180px) !important;
    padding: 12px !important;
  }

  .btn-unified {
    min-width: 100px !important;
  }
}
</style>
