<template>
  <v-bottom-sheet v-model="localOpen" inset>
    <v-card class="rounded-t-xl pa-4">
      <v-alert v-if="saveError" type="error" variant="tonal" class="mb-3" closable @click:close="saveError = ''">
        {{ saveError }}
      </v-alert>
      <div class="d-flex justify-space-between align-center mb-4">
        <div class="d-flex align-center">
          <LucideIcon name="wallet" :size="20" class="me-2 text-accent" />
          <span class="text-h6 font-weight-black">تسجيل دفعة</span>
        </div>
        <v-btn icon variant="text" size="small" @click="localOpen = false">
          <LucideIcon name="x" :size="18" />
        </v-btn>
      </div>

      <v-card variant="outlined" class="pa-3 mb-4 rounded-xl bg-grey-lighten-5">
        <div class="text-caption text-medium-emphasis mb-1">
          الخدمة: <span class="font-weight-bold text-primary">{{ engagementNumber }}</span>
        </div>
        <v-row dense class="mt-1">
          <v-col cols="6">
            <div class="text-caption text-medium-emphasis">المتبقي</div>
            <div class="text-subtitle-1 font-weight-black text-error">
              {{ formatMoney(remainingAmount) }} ريال
            </div>
          </v-col>
        </v-row>
      </v-card>

      <v-text-field
        v-model.number="paymentAmount"
        label="مبلغ الدفعة"
        type="number"
        variant="outlined"
        density="comfortable"
        class="mb-3"
        :rules="[
          (v) => v > 0 || 'المبلغ يجب أن يكون أكبر من صفر',
          (v) => v <= remainingAmount || 'المبلغ يتجاوز المتبقي'
        ]"
      />

      <v-select
        v-model="paymentMethod"
        :items="paymentMethods"
        item-title="text"
        item-value="value"
        label="طريقة الدفع"
        variant="outlined"
        density="comfortable"
        class="mb-3"
      />

      <v-select
        v-model="paymentAccountId"
        :items="paymentAccounts"
        item-title="name"
        item-value="id"
        label="حساب التحصيل*"
        variant="outlined"
        density="comfortable"
        class="mb-3"
      />

      <v-textarea
        v-model="paymentNotes"
        label="ملاحظات (اختياري)"
        variant="outlined"
        rows="2"
        density="comfortable"
        class="mb-2"
      />

      <v-btn
        color="accent"
        block
        size="large"
        class="rounded-xl font-weight-black"
        :loading="saving"
        :disabled="!paymentAmount || paymentAmount <= 0 || paymentAmount > remainingAmount || !paymentAccountId"
        @click="handleSave"
      >
        <LucideIcon name="check-circle" :size="18" class="me-2" />
        تسجيل الدفعة
      </v-btn>
    </v-card>
  </v-bottom-sheet>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import LucideIcon from '../common/LucideIcon.vue'
import { useFinanceStore } from '../../stores/finance'

const props = defineProps<{
  open: boolean
  engagementId: string
  engagementNumber: string
  clientId: string
  remainingAmount: number
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
  saved: []
}>()

const localOpen = ref(props.open)
const paymentAmount = ref(props.remainingAmount || 0)
const paymentMethod = ref('cash')
const paymentNotes = ref('')
const saving = ref(false)
const saveError = ref('')
const financeStore = useFinanceStore()
const paymentAccountId = ref('')
const paymentAccounts = computed(() =>
  financeStore.accounts.filter((account) => account.type === 'asset' || account.type === 'revenue')
)
watch(paymentAccounts, (accounts) => {
  if (!paymentAccountId.value && accounts.length) {
    paymentAccountId.value = accounts.find((account) => account.code === '1101')?.id || accounts[0].id
  }
})

const paymentMethods = [
  { text: 'نقدي', value: 'cash' },
  { text: 'تحويل بنكي', value: 'bank_transfer' },
  { text: 'شيك', value: 'check' },
  { text: 'بطاقة ائتمان', value: 'card' }
]

const formatMoney = (v: number) => (v || 0).toLocaleString('ar-SA')

watch(
  () => props.open,
  (val) => {
    localOpen.value = val
    if (val) {
      paymentAmount.value = props.remainingAmount || 0
      paymentMethod.value = 'cash'
      paymentNotes.value = ''
      saveError.value = ''
      if (!financeStore.accounts.length) void financeStore.fetchFinanceData()
      paymentAccountId.value = paymentAccounts.value.find((account) => account.code === '1101')?.id || paymentAccounts.value[0]?.id || ''
    }
  }
)

watch(localOpen, (val) => {
  emit('update:open', val)
})

const handleSave = async () => {
  saving.value = true
  try {
    await financeStore.recordPayment(props.engagementId, {
      amount: paymentAmount.value,
      payment_method: paymentMethod.value,
      account_id: paymentAccountId.value,
      notes: paymentNotes.value || undefined
    })
    emit('saved')
    localOpen.value = false
  } catch (e) {
    saveError.value = (e as Error).message || 'تعذر تسجيل الدفعة'
    console.error('Error recording payment:', e)
  } finally {
    saving.value = false
  }
}
</script>
