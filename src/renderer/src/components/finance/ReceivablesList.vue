<template>
  <div class="pa-4">
    <v-row class="mb-4 align-center">
      <v-col>
        <h3 class="text-h5 font-weight-black text-gold">الذمم والديون المستحقة</h3>
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field
          v-model="search"
          label="بحث سريع..."
          :prepend-inner-icon="ICONS.UI.SEARCH"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="glass-input"
        ></v-text-field>
      </v-col>
    </v-row>

    <v-data-table
      :headers="headers"
      :items="safeArray(receivables)"
      :loading="loading"
      :search="search"
      items-per-page-text="عدد الذمم لكل صفحة:"
      class="premium-table"
      hover
    >
      <template #[`item.status`]="{ item }">
        <v-chip :color="getStatusColor((item as Receivable).status)" size="small" variant="flat">
          {{ getStatusName((item as Receivable).status) }}
        </v-chip>
      </template>
      <template #[`item.amount_due`]="{ item }">
        <span class="font-weight-bold"
          >{{ ((item as Receivable).amount_due || 0).toLocaleString('ar-SA') }} ريال</span
        >
      </template>
      <template #[`item.amount_paid`]="{ item }">
        <span class="text-success"
          >{{ ((item as Receivable).amount_paid || 0).toLocaleString('ar-SA') }} ريال</span
        >
      </template>
      <template #[`item.remaining`]="{ item }">
        <span class="text-error font-weight-bold">
          {{
            (
              ((item as Receivable).amount_due || 0) - ((item as Receivable).amount_paid || 0)
            ).toLocaleString('ar-SA')
          }}
          ريال
        </span>
      </template>
      <template #[`item.actions`]="{ item }">
        <v-btn
          v-if="(item as Receivable).status !== 'paid'"
          color="accent"
          variant="tonal"
          size="small"
          :prepend-icon="ICONS.FINANCE.BANKNOTE"
          class="font-weight-black rounded-lg"
          @click="openPaymentDialog(item as Receivable)"
          >تحصيل دفعة</v-btn
        >
      </template>
    </v-data-table>

    <!-- Payment Dialog -->
    <v-dialog v-model="showPaymentDialog" width="90%" max-width="800" persistent scrollable>
      <v-card v-if="showPaymentDialog" class="rounded-xl modal-card glass-card">
        <v-toolbar color="primary" class="px-6" height="72">
          <LucideIcon name="banknote" :size="24" class="text-white me-3" />
          <v-toolbar-title class="font-weight-black text-white">تحصيل مبلغ</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn
            :icon="ICONS.UI.CLOSE"
            variant="text"
            color="white"
            @click="showPaymentDialog = false"
          ></v-btn>
        </v-toolbar>
        <v-card-text class="pa-6 text-center modal-scrollable">
          <v-alert v-if="paymentError" type="error" variant="tonal" class="mb-4" closable @click:close="paymentError = ''">
            {{ paymentError }}
          </v-alert>
          <div class="mb-4 text-subtitle-1">
            تسجيل دفعة لـ: <strong>{{ selectedReceivable?.client_name || 'غير معروف' }}</strong>
          </div>
          <div v-if="selectedReceivable" class="mb-6 text-h6 text-error font-weight-bold">
            المتبقي:
            {{
              (
                (selectedReceivable.amount_due || 0) - (selectedReceivable.amount_paid || 0)
              ).toLocaleString('ar-SA')
            }}
            ريال
          </div>

          <v-text-field
            v-model.number="paymentAmount"
            class="glass-input"
            label="المبلغ المحصل*"
            type="number"
            variant="outlined"
            prefix="ريال"
            :prepend-inner-icon="ICONS.FINANCE.DOLLAR"
            autofocus
            hide-details
          ></v-text-field>
          <v-select
            v-model="paymentAccountId"
            class="glass-input mt-4"
            :items="paymentAccounts"
            item-title="name"
            item-value="id"
            label="حساب التحصيل*"
            variant="outlined"
            :rules="[(v) => !!v || 'حساب التحصيل مطلوب']"
          />
        </v-card-text>
        <v-card-actions class="pa-6 modal-footer-sticky">
          <v-btn variant="text" @click="showPaymentDialog = false">إلغاء</v-btn>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            variant="elevated"
            :loading="paying"
            :disabled="!paymentAmount || paymentAmount <= 0 || !paymentAccountId"
            @click="handlePayment"
            >تأكيد التحصيل</v-btn
          >
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
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useFinanceStore } from '../../stores/finance'
import { useSearch } from '../../composables/useSearch'
import { storeToRefs } from 'pinia'
import { Receivable } from '../../types'
import { safeArray } from '../../utils/safe'
import ConfirmDialog from '../common/ConfirmDialog.vue'
import { useConfirmDialog } from '../../composables/useConfirmDialog'
import LucideIcon from '../common/LucideIcon.vue'
import { ICONS } from '../../config/icons'

const financeStore = useFinanceStore()
const { receivables, accounts, loading } = storeToRefs(financeStore)
const { search } = useSearch((val) => {
  console.log('Receivables search:', val)
})

onUnmounted(() => {
  if (search) search.value = ''
})

const { confirmDialog, openConfirm, closeConfirm } = useConfirmDialog()

onMounted(async () => {
  await financeStore.fetchFinanceData()
})

const showPaymentDialog = ref(false)
const selectedReceivable = ref<Receivable | null>(null)
const paymentAmount = ref(0)
const paying = ref(false)
const paymentError = ref('')
const paymentAccountId = ref('')
const paymentAccounts = computed(() =>
  safeArray(accounts.value).filter((account: any) => account.type === 'asset' || account.type === 'revenue')
)

const headers = [
  { title: 'الموكل', key: 'client_name', align: 'start' as const },
  { title: 'رقم الفاتورة', key: 'invoice_number', align: 'start' as const },
  { title: 'تاريخ الاستحقاق', key: 'due_date', align: 'start' as const },
  { title: 'الإجمالي', key: 'amount_due', align: 'end' as const },
  { title: 'المدفوع', key: 'amount_paid', align: 'end' as const },
  { title: 'المتبقي', key: 'remaining', align: 'end' as const },
  { title: 'الحالة', key: 'status', align: 'center' as const },
  { title: 'إجراءات', key: 'actions', sortable: false, align: 'end' as const }
]

const getStatusName = (status: string): string => {
  const map: Record<string, string> = {
    pending: 'معلق',
    partial: 'مدفوع جزئياً',
    paid: 'مسدد بالكامل',
    cancelled: 'ملغى'
  }
  return map[status] || status
}

const getStatusColor = (status: string): string => {
  const map: Record<string, string> = {
    pending: 'warning',
    partial: 'info',
    paid: 'success',
    cancelled: 'grey'
  }
  return map[status] || 'grey'
}

const openPaymentDialog = (item: Receivable): void => {
  selectedReceivable.value = item
  paymentAmount.value = (item.amount_due || 0) - (item.amount_paid || 0)
  paymentAccountId.value = paymentAccounts.value.find((account: any) => account.code === '1101')?.id || paymentAccounts.value[0]?.id || ''
  paymentError.value = ''
  showPaymentDialog.value = true
}

const executePayment = async (): Promise<void> => {
  if (!selectedReceivable.value) return
  paying.value = true
  try {
    await financeStore.applyReceivablePayment(
      selectedReceivable.value.id, paymentAmount.value, paymentAccountId.value
    )
    showPaymentDialog.value = false
  } catch (e: unknown) {
    paymentError.value = (e as Error).message || 'تعذر تسجيل الدفعة'
    console.error('Error applying payment:', e)
  } finally {
    paying.value = false
  }
}

const handlePayment = async (): Promise<void> => {
  if (!selectedReceivable.value) return
  openConfirm({
    title: 'تأكيد تحصيل الدفعة',
    message: `هل أنت متأكد من تسجيل دفعة بمبلغ:\n${(paymentAmount.value || 0).toLocaleString('ar-SA')} ريال\nللموكل: ${selectedReceivable.value.client_name || '---'}؟`,
    color: 'warning',
    confirmButtonColor: 'primary',
    icon: ICONS.FINANCE.BANKNOTE,
    confirmText: 'موافق',
    cancelText: 'إلغاء الأمر',
    action: async () => {
      confirmDialog.value.loading = true
      try {
        await executePayment()
        closeConfirm()
      } finally {
        confirmDialog.value.loading = false
      }
    }
  })
}
</script>
