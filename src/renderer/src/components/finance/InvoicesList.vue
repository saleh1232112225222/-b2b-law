<template>
  <div class="pa-4">
    <div class="d-flex justify-space-between align-center mb-4 flex-wrap gap-2">
      <div class="d-flex align-center flex-grow-1 me-4">
        <h3 class="text-h6 font-weight-black text-gold me-4">قائمة الفواتير</h3>
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
        >إصدار فاتورة جديدة</v-btn
      >
    </div>

    <v-data-table
      :headers="headers"
      :items="safeArray(store.invoices)"
      :loading="store.loading"
      :search="search"
      items-per-page-text="عدد الفواتير لكل صفحة:"
      hover
      class="premium-table"
    >
      <template #[`item.invoice_number`]="{ item }">
        <v-btn
          variant="text"
          color="primary"
          class="px-0 font-weight-black"
          @click="openInvoiceView(item as Invoice)"
        >
          {{ (item as Invoice).invoice_number }}
        </v-btn>
      </template>
      <template #[`item.date`]="{ item }">
        <div class="d-flex flex-column text-start">
          <span class="text-subtitle-2">{{ formatDateOnly((item as Invoice).date) }} مـ</span>
          <v-chip
            v-if="isValidDate((item as Invoice).date)"
            size="x-small"
            color="secondary"
            variant="outlined"
            density="compact"
            class="mt-1"
          >
            {{ convertToHijri(new Date((item as Invoice).date)) }} هـ
          </v-chip>
        </div>
      </template>
      <template #[`item.total_amount`]="{ item }">
        <span class="font-weight-bold"
          >{{ ((item as Invoice).total_amount || 0).toLocaleString('ar-SA') }} ريال</span
        >
      </template>
      <template #[`item.status`]="{ item }">
        <v-chip :color="getStatusColor((item as Invoice).status)" size="small" variant="flat">
          {{ getStatusLabel((item as Invoice).status) }}
        </v-chip>
      </template>
      <template #[`item.actions`]="{ item }">
        <v-btn :icon="ICONS.SYSTEM.PRINTER" variant="text" color="primary" size="small"></v-btn>
        <v-btn
          :icon="ICONS.ACTION.DELETE"
          variant="text"
          color="error"
          size="small"
          @click="confirmDelete(item as Invoice)"
        ></v-btn>
      </template>
    </v-data-table>

    <!-- Add Invoice Dialog -->
    <v-dialog v-model="showDialog" width="90%" max-width="800" persistent scrollable>
      <v-card v-if="showDialog" class="rounded-xl modal-card glass-card">
        <v-toolbar color="primary" class="px-6" height="72">
          <LucideIcon name="file-edit" :size="24" class="text-white me-3" />
          <v-toolbar-title class="font-weight-black text-white"
            >إصدار فاتورة ضريبية</v-toolbar-title
          >
          <v-spacer></v-spacer>
          <v-btn
            :icon="ICONS.UI.CLOSE"
            variant="text"
            color="white"
            @click="showDialog = false"
          ></v-btn>
        </v-toolbar>
        <v-card-text class="pa-6 modal-scrollable">
          <v-form ref="formRef" v-model="formValid">
            <v-row>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="editItem.invoice_number"
                  class="glass-input"
                  label="رقم الفاتورة*"
                  variant="outlined"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="editItem.client_id"
                  class="glass-input"
                  :items="safeArray(clientsStore.clients)"
                  item-title="name"
                  item-value="id"
                  label="الموكل*"
                  variant="outlined"
                  required
                ></v-select>
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model.number="vat_rate"
                  class="glass-input"
                  :items="[
                    { title: 'بدون ضريبة', value: 0 },
                    { title: '15%', value: 0.15 }
                  ]"
                  label="نسبة الضريبة"
                  variant="outlined"
                  @update:model-value="calculateTotals"
                ></v-select>
              </v-col>
              <v-col cols="12">
                <DualDatePicker
                  v-model="editItem.date"
                  label="تاريخ الفاتورة (هجري/ميلادي)*"
                  :icon="ICONS.LEGAL.SESSION"
                />
              </v-col>

              <v-col cols="12">
                <v-divider class="mb-4"></v-divider>
                <div class="d-flex justify-space-between align-center mb-2">
                  <div class="text-subtitle-1 font-weight-bold">بنود الفاتورة</div>
                  <v-btn size="small" color="secondary" @click="addItem">إضافة بند</v-btn>
                </div>
                <v-row v-for="(line, index) in invoiceLineItems" :key="index" class="mb-2">
                  <v-col cols="8">
                    <v-text-field
                      v-model="line.description"
                      class="glass-input"
                      label="وصف الخدمة"
                      variant="outlined"
                      density="compact"
                      hide-details
                    ></v-text-field>
                  </v-col>
                  <v-col cols="3">
                    <v-text-field
                      v-model.number="line.amount"
                      class="glass-input"
                      type="number"
                      label="المبلغ"
                      variant="outlined"
                      density="compact"
                      hide-details
                      @update:model-value="calculateTotals"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="1">
                    <v-btn
                      :icon="ICONS.UI.CLOSE"
                      variant="text"
                      color="error"
                      size="small"
                      @click="removeItem(index)"
                    ></v-btn>
                  </v-col>
                </v-row>
              </v-col>

              <v-col cols="12">
                <v-card border flat class="pa-4 bg-grey-lighten-4 glass-card">
                  <div class="d-flex justify-space-between mb-1">
                    <span>المجموع الفرعي:</span>
                    <span>{{ (editItem.amount || 0).toLocaleString('ar-SA') }} ريال</span>
                  </div>
                  <div class="d-flex justify-space-between mb-1 text-info">
                    <span>ضريبة القيمة المضافة (15%):</span>
                    <span>{{ (editItem.vat_amount || 0).toLocaleString('ar-SA') }} ريال</span>
                  </div>
                  <v-divider class="my-2"></v-divider>
                  <div class="d-flex justify-space-between text-h6 font-weight-bold">
                    <span>الإجمالي النهائي:</span>
                    <span>{{ (editItem.total_amount || 0).toLocaleString('ar-SA') }} ريال</span>
                  </div>
                </v-card>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-6 modal-footer-sticky">
          <v-btn variant="text" @click="showDialog = false">إلغاء</v-btn>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            variant="elevated"
            :loading="saving"
            :disabled="!formValid"
            @click="handleSave"
            >حفظ وإصدار</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showInvoiceViewDialog" width="90%" max-width="800" persistent scrollable>
      <v-card v-if="invoiceToView" class="rounded-xl modal-card glass-card">
        <v-toolbar color="primary" class="px-6" height="72">
          <LucideIcon name="receipt-text" :size="24" class="text-white me-3" />
          <v-toolbar-title class="font-weight-black text-white">عرض الفاتورة</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn
            :icon="ICONS.UI.CLOSE"
            variant="text"
            color="white"
            @click="showInvoiceViewDialog = false"
          ></v-btn>
        </v-toolbar>
        <v-card-text class="pa-6 modal-scrollable">
          <v-row dense>
            <v-col cols="12" md="6">
              <div class="text-caption text-grey-darken-1 font-weight-bold">رقم الفاتورة</div>
              <div class="text-body-1 font-weight-black">{{ invoiceToView.invoice_number }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-caption text-grey-darken-1 font-weight-bold">الحالة</div>
              <v-chip :color="getStatusColor(invoiceToView.status)" size="small" variant="flat">
                {{ getStatusLabel(invoiceToView.status) }}
              </v-chip>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-caption text-grey-darken-1 font-weight-bold">الموكل</div>
              <div class="text-body-2 font-weight-black">
                {{ invoiceToView.client_name || '-' }}
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-caption text-grey-darken-1 font-weight-bold">التاريخ</div>
              <div class="text-body-2 font-weight-black">{{ invoiceToView.date || '-' }}</div>
            </v-col>
            <v-col cols="12">
              <div class="text-caption text-grey-darken-1 font-weight-bold">البيان</div>
              <div class="text-body-2">{{ invoiceToView.description || '-' }}</div>
            </v-col>
            <v-col cols="12">
              <v-divider class="my-3"></v-divider>
              <div
                class="d-flex justify-space-between font-weight-black align-center flex-wrap gap-4"
              >
                <div class="flex-grow-1">
                  <div class="d-flex justify-space-between mb-2">
                    <span>الإجمالي الخاضع للضريبة:</span>
                    <span>{{ (invoiceToView.amount || 0).toLocaleString('ar-SA') }} ريال</span>
                  </div>
                  <div class="d-flex justify-space-between mb-2 text-gold">
                    <span>ضريبة القيمة المضافة (15%):</span>
                    <span>{{ (invoiceToView.vat_amount || 0).toLocaleString('ar-SA') }} ريال</span>
                  </div>
                  <v-divider class="my-1 border-dashed"></v-divider>
                  <div class="d-flex justify-space-between text-h6 font-weight-black mt-2">
                    <span>الإجمالي شامل الضريبة:</span>
                    <span
                      >{{ (invoiceToView.total_amount || 0).toLocaleString('ar-SA') }} ريال</span
                    >
                  </div>
                </div>
                <!-- ZATCA QR Code -->
                <div class="d-flex flex-column align-center pa-2 bg-white rounded-lg border">
                  <v-img :src="getZatcaQrUrl(invoiceToView)" width="120" height="120" />
                  <span
                    class="text-caption text-grey-darken-4 mt-1 font-weight-bold"
                    style="font-size: 9px !important"
                    >فاتورة ضريبية مبسطة (ZATCA)</span
                  >
                </div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-6 modal-footer-sticky">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showInvoiceViewDialog = false">إغلاق</v-btn>
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
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useFinanceStore } from '../../stores/finance'
import { useClientsStore } from '../../stores/clients'
import { useSearch } from '../../composables/useSearch'
import DualDatePicker from '../DualDatePicker.vue'
import { convertToHijri } from '../../utils/hijri'
import { Invoice } from '../../types'
import { safeArray, isValidDate, formatDateOnly } from '../../utils/safe'
import ConfirmDialog from '../common/ConfirmDialog.vue'
import { useConfirmDialog } from '../../composables/useConfirmDialog'
import LucideIcon from '../common/LucideIcon.vue'
import { ICONS } from '../../config/icons'

const store = useFinanceStore()
const clientsStore = useClientsStore()

const { confirmDialog, openConfirm, closeConfirm } = useConfirmDialog()

const { search } = useSearch((val) => {
  console.log('Invoices search:', val)
})

onUnmounted(() => {
  // Store search cleanup handled by parent
})

const officeName = ref('مكتب المحاماة')
const vatNumber = ref('300000000000003')

onMounted(async () => {
  await store.fetchFinanceData()
  try {
    const settings = await (window as any).api.settings.get()
    if (settings) {
      if (settings.officeName) officeName.value = settings.officeName
      if (settings.vatNumber) vatNumber.value = settings.vatNumber
    }
  } catch (e) {
    console.error('Failed to load settings in InvoicesList:', e)
  }
})

const showDialog = ref(false)
const showInvoiceViewDialog = ref(false)
const invoiceToView = ref<Invoice | null>(null)
const formValid = ref(false)
const saving = ref(false)
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)

const headers = [
  { title: 'رقم الفاتورة', key: 'invoice_number' },
  { title: 'الموكل', key: 'client_name' },
  { title: 'التاريخ', key: 'date' },
  { title: 'الإجمالي (مع الضريبة)', key: 'total_amount' },
  { title: 'الحالة', key: 'status' },
  { title: 'إجراءات', key: 'actions', align: 'end' as const }
]

const vat_rate = ref(0.15)
const invoiceLineItems = ref([{ description: 'أتعاب محاماة', amount: 0 }])

const editItem = reactive({
  id: undefined as string | undefined,
  invoice_number: '',
  client_id: '' as string,
  date: new Date().toISOString().split('T')[0],
  amount: 0,
  vat_amount: 0,
  total_amount: 0,
  status: 'draft' as 'draft' | 'sent' | 'paid' | 'cancelled',
  description: ''
})

const openAddDialog = (): void => {
  Object.assign(editItem, {
    invoice_number: 'INV-' + Date.now().toString().slice(-6),
    client_id: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    vat_amount: 0,
    total_amount: 0,
    status: 'draft',
    description: ''
  })
  invoiceLineItems.value = [{ description: 'أتعاب محاماة', amount: 0 }]
  vat_rate.value = 0.15
  showDialog.value = true
}

const openInvoiceView = (item: Invoice): void => {
  invoiceToView.value = item
  showInvoiceViewDialog.value = true
}

const addItem = (): void => {
  invoiceLineItems.value.push({ description: '', amount: 0 })
}

const removeItem = (index: number): void => {
  invoiceLineItems.value.splice(index, 1)
  calculateTotals()
}

const calculateTotals = (): void => {
  editItem.amount = invoiceLineItems.value.reduce(
    (acc, item) => acc + (Number(item.amount) || 0),
    0
  )
  editItem.vat_amount = editItem.amount * (vat_rate.value || 0)
  editItem.total_amount = editItem.amount + editItem.vat_amount
  editItem.description = invoiceLineItems.value.map((i) => i.description).join(', ')
}

const executeSave = async (): Promise<void> => {
  if (!formRef.value) return
  const { valid } = await formRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    await store.addInvoice({ ...editItem })
    showDialog.value = false
  } catch (e: unknown) {
    console.error('Error saving invoice:', e)
  } finally {
    saving.value = false
  }
}

const handleSave = async (): Promise<void> => {
  openConfirm({
    title: 'تأكيد إصدار الفاتورة',
    message: 'هل أنت متأكد من حفظ وإصدار هذه الفاتورة؟',
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

const getStatusColor = (s: string): string => {
  const map: Record<string, string> = {
    paid: 'success',
    draft: 'grey',
    sent: 'info',
    cancelled: 'error'
  }
  return map[s] || 'grey'
}

const getStatusLabel = (s: string): string => {
  const map: Record<string, string> = {
    paid: 'مدفوعة',
    draft: 'مسودة',
    sent: 'مرسلة',
    cancelled: 'ملغاة'
  }
  return map[s] || s
}

const confirmDelete = async (item: Invoice): Promise<void> => {
  openConfirm({
    title: 'تأكيد حذف الفاتورة',
    message: `هل أنت متأكد من حذف الفاتورة رقم:\n${item.invoice_number || ''}\n\nتحذير: لا يمكن التراجع عن هذا الإجراء.`,
    color: 'error',
    confirmButtonColor: 'primary',
    icon: ICONS.SYSTEM.DELETE_ALERT,
    confirmText: 'موافق',
    cancelText: 'إلغاء الأمر',
    action: async () => {
      confirmDialog.value.loading = true
      try {
        await store.deleteInvoice(item.id)
        closeConfirm()
      } catch (e: unknown) {
        console.error('Error deleting invoice:', e)
      } finally {
        confirmDialog.value.loading = false
      }
    }
  })
}

const getZatcaQrUrl = (invoice: Invoice): string => {
  const getTodayISO = () => {
    return invoice.date ? `${invoice.date}T12:00:00Z` : new Date().toISOString()
  }

  const toUtf8Bytes = (str: string): number[] => {
    const utf8: number[] = []
    for (let i = 0; i < str.length; i++) {
      let charcode = str.charCodeAt(i)
      if (charcode < 0x80) utf8.push(charcode)
      else if (charcode < 0x800) {
        utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f))
      } else if (charcode < 0xd800 || charcode >= 0xe000) {
        utf8.push(
          0xe0 | (charcode >> 12),
          0x80 | ((charcode >> 6) & 0x3f),
          0x80 | (charcode & 0x3f)
        )
      } else {
        i++
        charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff))
        utf8.push(
          0xf0 | (charcode >> 18),
          0x80 | ((charcode >> 12) & 0x3f),
          0x80 | ((charcode >> 6) & 0x3f),
          0x80 | (charcode & 0x3f)
        )
      }
    }
    return utf8
  }

  const getTlvBytes = (tag: number, val: string): number[] => {
    const valBytes = toUtf8Bytes(val)
    return [tag, valBytes.length, ...valBytes]
  }

  const totalStr = String(invoice.total_amount || '0')
  const vatStr = String(invoice.vat_amount || '0')

  try {
    const bytes = [
      ...getTlvBytes(1, officeName.value),
      ...getTlvBytes(2, vatNumber.value),
      ...getTlvBytes(3, getTodayISO()),
      ...getTlvBytes(4, totalStr),
      ...getTlvBytes(5, vatStr)
    ]
    const binString = String.fromCharCode(...bytes)
    const b64 = btoa(binString)
    return `https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=${encodeURIComponent(b64)}`
  } catch (err) {
    console.error('Zatca QR Code generation failed:', err)
    return ''
  }
}
</script>
