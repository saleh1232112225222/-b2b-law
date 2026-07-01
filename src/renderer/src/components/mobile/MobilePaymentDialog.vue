<template>
  <v-bottom-sheet v-model="localOpen" inset>
    <v-card class="rounded-t-xl pa-4">
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
        :rules="[(v) => v > 0 || 'المبلغ يجب أن يكون أكبر من صفر']"
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
        :disabled="!paymentAmount || paymentAmount <= 0"
        @click="handleSave"
      >
        <LucideIcon name="check-circle" :size="18" class="me-2" />
        تسجيل الدفعة
      </v-btn>
    </v-card>
  </v-bottom-sheet>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import LucideIcon from '../common/LucideIcon.vue'

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
    }
  }
)

watch(localOpen, (val) => {
  emit('update:open', val)
})

const handleSave = async () => {
  saving.value = true
  try {
    const { useFinanceStore } = await import('../../stores/finance')
    const financeStore = useFinanceStore()
    await financeStore.recordPayment(props.engagementId, {
      amount: paymentAmount.value,
      payment_method: paymentMethod.value,
      notes: paymentNotes.value || undefined
    })
    emit('saved')
    localOpen.value = false
  } catch (e) {
    console.error('Error recording payment:', e)
  } finally {
    saving.value = false
  }
}
</script>
