<template>
  <div class="pa-4">
    <div class="d-flex justify-space-between align-center mb-4 flex-wrap gap-2">
      <div class="d-flex align-center flex-grow-1 me-4">
        <h3 class="text-h6 font-weight-black text-gold me-4">سندات القبض والصرف</h3>
        <v-text-field
          v-model="search"
          label="بحث سريع..."
          :prepend-inner-icon="ICONS.UI.SEARCH"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="glass-input"
          style="max-width: 300px"
        ></v-text-field>
      </div>
      <v-btn
        color="accent"
        :prepend-icon="ICONS.UI.PLUS"
        class="rounded-lg font-weight-black"
        @click="openAddDialog"
        >إنشاء سند جديد</v-btn
      >
    </div>

    <v-data-table
      :headers="headers"
      :items="safeArray(vouchers)"
      :loading="loading"
      :search="search"
      items-per-page-text="عدد السندات لكل صفحة:"
      hover
      class="premium-table"
    >
      <template #[`item.voucher_number`]="{ item }">
        <v-btn
          variant="text"
          color="secondary"
          class="px-0 font-weight-black"
          @click="openVoucherView(item as Voucher)"
        >
          {{ (item as Voucher).voucher_number || '-' }}
        </v-btn>
      </template>
      <template #[`item.type`]="{ item }">
        <v-chip
          :color="(item as Voucher).type === 'receipt' ? 'success' : 'error'"
          size="small"
          variant="flat"
        >
          {{ (item as Voucher).type === 'receipt' ? 'سند قبض' : 'سند صرف' }}
        </v-chip>
      </template>
      <template #[`item.date`]="{ item }">
        <div class="d-flex flex-column text-start">
          <span class="text-subtitle-2">{{ (item as Voucher).date || '-' }} مـ</span>
        </div>
      </template>
      <template #[`item.amount`]="{ item }">
        <span class="font-weight-bold"
          >{{ ((item as Voucher).amount || 0).toLocaleString('ar-SA') }} ريال</span
        >
      </template>
      <template #[`item.actions`]="{ item }">
        <v-btn :icon="ICONS.SYSTEM.PRINTER" variant="text" color="primary" size="small"></v-btn>
        <v-btn
          :icon="ICONS.ACTION.DELETE"
          variant="text"
          color="error"
          size="small"
          @click="confirmDelete(item as Voucher)"
        ></v-btn>
      </template>
    </v-data-table>

    <!-- Add Voucher Dialog -->
    <v-dialog v-model="showDialog" width="90%" max-width="800" persistent scrollable>
      <v-card v-if="showDialog" class="rounded-xl overflow-hidden modal-card">
        <v-toolbar color="primary" class="px-6" height="72">
          <LucideIcon name="receipt" :size="24" class="text-white me-3" />
          <v-toolbar-title class="font-weight-black text-white">إنشاء سند مالي</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn
            :icon="ICONS.UI.CLOSE"
            variant="text"
            color="white"
            @click="showDialog = false"
          ></v-btn>
        </v-toolbar>
        <v-card-text class="pa-6 bg-grey-lighten-4 modal-scrollable">
          <v-form ref="formRef" v-model="formValid">
            <v-row dense>
              <v-col cols="12">
                <v-radio-group v-model="editItem.type" inline label="نوع السند*" mandatory>
                  <v-radio label="سند قبض" value="receipt" color="success"></v-radio>
                  <v-radio label="سند صرف" value="payment" color="error"></v-radio>
                </v-radio-group>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editItem.voucher_number"
                  label="رقم السند (اختياري)"
                  variant="outlined"
                  bg-color="white"
                  hint="اتركه فارغاً للتوليد التلقائي"
                  persistent-hint
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="editItem.account_id"
                  :items="safeArray(filteredAccounts)"
                  item-title="name"
                  item-value="id"
                  label="الحساب المتأثر*"
                  variant="outlined"
                  bg-color="white"
                  :prepend-inner-icon="ICONS.LEGAL.BANK"
                  :rules="[(v) => !!v || 'الحساب مطلوب']"
                  persistent-hint
                  hint="اختر الحساب المتأثر بهذه العملية (مثل الصندوق أو البنك)"
                  required
                >
                </v-select>
                <div v-if="safeLength(accounts) === 0" class="text-caption text-error mt-1 px-2">
                  <LucideIcon name="alert-triangle" :size="14" class="me-1" /> لم يتم العثور على
                  حسابات في النظام. قم بتهيئتها من دليل الحسابات أولاً.
                </div>
              </v-col>
              <v-col cols="12">
                <DualDatePicker
                  v-model="editItem.date"
                  label="تاريخ السند*"
                  :icon="ICONS.LEGAL.SESSION"
                  :rules="[(v: any) => !!v || 'التاريخ مطلوب']"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="editItem.reference_type"
                  :items="referenceTypes"
                  label="مرجع السند (إلزامي)*"
                  variant="outlined"
                  bg-color="white"
                  :rules="[(v) => !!v || 'المرجع مطلوب']"
                  required
                  persistent-hint
                  hint="يجب ربط كل سند بمرجع مالي (فاتورة أو إشعار دائن)"
                ></v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="editItem.reference_id"
                  :items="filteredReferences"
                  item-title="label"
                  item-value="id"
                  :label="referenceLabel"
                  variant="outlined"
                  bg-color="white"
                  :rules="[(v) => !!v || 'اختيار المرجع مطلوب']"
                  :disabled="!editItem.reference_type"
                  :loading="loadingReferences"
                  required
                ></v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="editItem.client_id"
                  :items="safeArray(clientsStore.clients)"
                  item-title="name"
                  item-value="id"
                  label="الموكل / الجهة*"
                  variant="outlined"
                  bg-color="white"
                  :rules="[(v) => !!v || 'الموكل مطلوب']"
                  readonly
                  hint="يتم تحديده تلقائياً من المرجع"
                  required
                ></v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="editItem.amount"
                  type="number"
                  label="المبلغ*"
                  variant="outlined"
                  bg-color="white"
                  prefix="ريال"
                  :rules="[
                    (v) => !!v || 'المبلغ مطلوب',
                    (v) => v > 0 || 'المبلغ يجب أن يكون أكبر من صفر',
                    (v) => validateAmount(v) || 'المبلغ يتجاوز المتبقي في المرجع'
                  ]"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="editItem.description"
                  label="ملاحظات / البيان"
                  variant="outlined"
                  bg-color="white"
                  rows="2"
                ></v-textarea>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-6 bg-white modal-footer-sticky">
          <v-btn variant="text" size="large" @click="showDialog = false">إلغاء</v-btn>
          <v-spacer></v-spacer>
          <v-btn
            color="secondary"
            variant="elevated"
            size="large"
            :loading="saving"
            :disabled="!formValid"
            @click="handleSave"
            >حفظ وطباعة</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showVoucherViewDialog" width="90%" max-width="800" persistent scrollable>
      <v-card v-if="voucherToView" class="rounded-xl modal-card">
        <v-toolbar color="primary" class="px-6" height="72">
          <LucideIcon name="receipt-text" :size="24" class="text-white me-3" />
          <v-toolbar-title class="font-weight-black text-white">عرض السند</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn
            :icon="ICONS.UI.CLOSE"
            variant="text"
            color="white"
            @click="showVoucherViewDialog = false"
          ></v-btn>
        </v-toolbar>
        <v-card-text class="pa-6 modal-scrollable">
          <v-row dense>
            <v-col cols="12" md="6">
              <div class="text-caption text-grey-darken-1 font-weight-bold">رقم السند</div>
              <div class="text-body-1 font-weight-black">
                {{ voucherToView.voucher_number || '-' }}
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-caption text-grey-darken-1 font-weight-bold">النوع</div>
              <v-chip
                :color="voucherToView.type === 'receipt' ? 'success' : 'error'"
                size="small"
                variant="flat"
              >
                {{ voucherToView.type === 'receipt' ? 'سند قبض' : 'سند صرف' }}
              </v-chip>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-caption text-grey-darken-1 font-weight-bold">الموكل / الجهة</div>
              <div class="text-body-2 font-weight-black">
                {{ voucherToView.client_name || '-' }}
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-caption text-grey-darken-1 font-weight-bold">الحساب</div>
              <div class="text-body-2 font-weight-black">
                {{ voucherToView.account_name || '-' }}
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-caption text-grey-darken-1 font-weight-bold">المبلغ</div>
              <div class="text-body-2 font-weight-black">
                {{ (voucherToView.amount || 0).toLocaleString('ar-SA') }} ريال
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-caption text-grey-darken-1 font-weight-bold">التاريخ</div>
              <div class="text-body-2 font-weight-black">{{ voucherToView.date || '-' }}</div>
            </v-col>
            <v-col cols="12">
              <div class="text-caption text-grey-darken-1 font-weight-bold">ملاحظات / البيان</div>
              <div class="text-body-2">{{ voucherToView.description || '-' }}</div>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-6 bg-white modal-footer-sticky">
          <v-spacer></v-spacer>
          <v-btn variant="text" size="large" @click="showVoucherViewDialog = false">إغلاق</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ConfirmDialog
      v-model="confirmDialog.show"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :color="confirmDialog.color"
      :confirm-button-color="confirmDialog.confirmButtonColor"
      :icon="confirmDialog.icon"
      :confirm-text="confirmDialog.confirmText"
      :cancel-text="confirmDialog.cancelText"
      :loading="confirmDialog.loading"
      @confirm="confirmDialog.action"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue'
import { useFinanceStore } from '../../stores/finance'
import { useClientsStore } from '../../stores/clients'
import { useSearch } from '../../composables/useSearch'
import { storeToRefs } from 'pinia'
import DualDatePicker from '../DualDatePicker.vue'
import { Voucher } from '../../types'
import { safeArray, safeLength } from '../../utils/safe'
import ConfirmDialog from '../common/ConfirmDialog.vue'
import { useConfirmDialog } from '../../composables/useConfirmDialog'
import LucideIcon from '../common/LucideIcon.vue'
import { ICONS } from '../../config/icons'

const store = useFinanceStore()
const { vouchers, accounts, loading } = storeToRefs(store)
const clientsStore = useClientsStore()

const { confirmDialog, openConfirm, closeConfirm } = useConfirmDialog()

const { search } = useSearch((val) => {
  console.log('Vouchers search:', val)
})

onUnmounted(() => {
  if (search) search.value = ''
})

onMounted(async () => {
  await store.fetchFinanceData()
})

const showDialog = ref(false)
const showVoucherViewDialog = ref(false)
const voucherToView = ref<Voucher | null>(null)
const formValid = ref(false)
const saving = ref(false)
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)

const headers = [
  { title: 'رقم السند', key: 'voucher_number' },
  { title: 'النوع', key: 'type' },
  { title: ' الحساب', key: 'account_name' },
  { title: 'الموكل / الجهة', key: 'client_name' },
  { title: 'المبلغ', key: 'amount' },
  { title: 'التاريخ', key: 'date' },
  { title: 'إجراءات', key: 'actions', align: 'end' as const }
]

const editItem = reactive({
  id: undefined as string | undefined,
  voucher_number: '',
  type: 'receipt' as 'receipt' | 'payment',
  client_id: '' as string,
  account_id: '' as string,
  amount: 0,
  date: new Date().toISOString().split('T')[0],
  description: '',
  reference_type: '' as string,
  reference_id: '' as string
})

const referenceTypes = [
  { title: 'فاتورة ضريبية (مستحقة)', value: 'invoice' },
  { title: 'إشعار دائن (رصيد مسترد)', value: 'credit_note' }
]

const loadingReferences = ref(false)
const references = ref<any[]>([])

const referenceLabel = computed(() => {
  if (editItem.reference_type === 'invoice') return 'اختر الفاتورة المفتوحة*'
  if (editItem.reference_type === 'credit_note') return 'اختر إشعار الدائن المعتمد*'
  return 'المرجع'
})

const filteredReferences = computed(() => {
  return safeArray(references.value).map((r: any) => ({
    ...r,
    label: r.invoice_number
      ? `فاتورة: ${r.invoice_number} (المتبقي: ${r.remaining_amount} ريال)`
      : `إشعار دائن بقيمة: ${r.amount} ريال - ${r.reason}`
  }))
})

watch(
  () => editItem.reference_type,
  async (newType) => {
    if (!newType) {
      references.value = []
      return
    }
    loadingReferences.value = true
    try {
      if (newType === 'invoice') {
        const recs = await window.api.receivables.getAll()
        // Only show unpaid invoices
        references.value = safeArray(recs).filter((r: any) => r.remaining_amount > 0)
        editItem.type = 'receipt'
      } else {
        const cns = await window.api.creditNotes.getAll()
        // Only show approved/unused credit notes
        references.value = safeArray(cns).filter((c: any) => c.status === 'approved')
        editItem.type = 'payment'
      }
    } finally {
      loadingReferences.value = false
    }
  }
)

watch(
  () => editItem.reference_id,
  (newId) => {
    if (!newId) return
    const refItem = references.value.find((r) => r.id === newId)
    if (refItem) {
      editItem.client_id = refItem.client_id
      if (editItem.reference_type === 'invoice') {
        editItem.amount = refItem.remaining_amount
      } else {
        editItem.amount = refItem.amount
      }
    }
  }
)

const validateAmount = (val: number): boolean => {
  if (!editItem.reference_id) return true
  const refItem = references.value.find((r) => r.id === editItem.reference_id)
  if (!refItem) return true
  const limit = editItem.reference_type === 'invoice' ? refItem.remaining_amount : refItem.amount
  return val <= limit
}

const openAddDialog = (): void => {
  Object.assign(editItem, {
    voucher_number: '',
    type: 'receipt',
    client_id: '',
    account_id: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference_type: '',
    reference_id: ''
  })
  showDialog.value = true
}

const openVoucherView = (item: Voucher): void => {
  voucherToView.value = item
  showVoucherViewDialog.value = true
}

const filteredAccounts = computed(() => {
  const all = safeArray(accounts.value) as any[]
  if (all.length === 0) return []

  let filtered: any[] = []
  if (editItem.type === 'receipt') {
    filtered = all.filter((acc) => acc.type === 'revenue' || acc.type === 'asset')
  } else {
    filtered = all.filter((acc) => acc.type === 'expense' || acc.type === 'asset')
  }

  return filtered.length > 0 ? filtered : all
})

watch([filteredAccounts, () => editItem.account_id], ([newAccs, currentId]) => {
  if (newAccs.length > 0 && !currentId && showDialog.value) {
    const defaultAcc = newAccs.find((a) => a.code === '1101') || newAccs[0]
    editItem.account_id = defaultAcc.id
  }
})

const executeSave = async (): Promise<void> => {
  if (!formRef.value) return
  const { valid } = await formRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    await store.addVoucher({ ...editItem })
    showDialog.value = false
  } catch (e: unknown) {
    console.error('Error saving voucher:', e)
  } finally {
    saving.value = false
  }
}

const handleSave = async (): Promise<void> => {
  openConfirm({
    title: 'تأكيد حفظ السند',
    message: 'هل أنت متأكد من رغبتك في حفظ هذا السند المالي؟',
    color: 'success',
    confirmButtonColor: 'success',
    icon: ICONS.SYSTEM.SAVE_CHECK,
    confirmText: 'نعم، احفظ',
    cancelText: 'تراجع',
    action: async () => {
      confirmDialog.value.loading = true
      try {
        await executeSave()
        closeConfirm()
      } finally {
        confirmDialog.value.loading = false
      }
    }
  })
}

const confirmDelete = async (item: Voucher): Promise<void> => {
  openConfirm({
    title: 'تأكيد حذف السند',
    message: `هل أنت متأكد من حذف السند التالي نهائياً؟\n${item.voucher_number || item.id}\n\nتحذير: لا يمكن التراجع عن هذا الإجراء.`,
    color: 'error',
    confirmButtonColor: 'primary',
    icon: ICONS.SYSTEM.DELETE_ALERT,
    confirmText: 'موافق',
    cancelText: 'إلغاء الأمر',
    action: async () => {
      confirmDialog.value.loading = true
      try {
        await store.deleteVoucher(item.id)
        closeConfirm()
      } catch (e: unknown) {
        console.error('Error deleting voucher:', e)
      } finally {
        confirmDialog.value.loading = false
      }
    }
  })
}
</script>
