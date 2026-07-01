<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="600"
    persistent
  >
    <v-card class="rounded-xl">
      <v-card-title class="text-h6 font-weight-black d-flex align-center">
        <LucideIcon name="wallet" :size="20" class="me-2" />
        تسجيل دفعة جديدة
      </v-card-title>
      <v-card-text>
        <v-card variant="outlined" class="pa-4 mb-4 rounded-xl bg-grey-lighten-5">
          <div class="text-body-2 text-medium-emphasis mb-1">
            الخدمة:
            <span class="font-weight-bold text-primary">{{ engagement?.engagement_number }}</span>
          </div>
          <v-row dense class="mt-2">
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">المبلغ الإجمالي</div>
              <div class="text-h6 font-weight-black text-primary">
                {{ formatMoney(totalDue) }} <span class="text-caption">ريال</span>
              </div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">المتبقي</div>
              <div class="text-h6 font-weight-black text-error">
                {{ formatMoney(engagement?.remaining_amount || 0) }}
                <span class="text-caption">ريال</span>
              </div>
            </v-col>
          </v-row>
        </v-card>

        <v-text-field
          v-model.number="paymentAmount"
          label="مبلغ الدفعة"
          type="number"
          variant="outlined"
          class="mb-1"
          :rules="[(v) => v > 0 || 'المبلغ يجب أن يكون أكبر من صفر']"
        />

        <v-select
          v-model="paymentMethod"
          :items="paymentMethods"
          item-title="text"
          item-value="value"
          label="طريقة الدفع"
          variant="outlined"
          class="mb-1"
        />

        <v-textarea
          v-model="paymentNotes"
          label="ملاحظات (اختياري)"
          variant="outlined"
          rows="2"
          class="mb-1"
        />

        <v-checkbox
          v-model="linkToSchedule"
          label="ربط مع جدول الأقساط"
          color="primary"
          class="mt-0"
          v-if="hasInstallments"
        />

        <v-select
          v-if="linkToSchedule && hasInstallments"
          v-model="selectedScheduleId"
          :items="availableSchedules"
          item-title="title"
          item-value="id"
          label="اختر القسط"
          variant="outlined"
        />
      </v-card-text>

      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">إلغاء</v-btn>
        <v-btn
          color="primary"
          :loading="saving"
          :disabled="!paymentAmount || paymentAmount <= 0"
          @click="handleSave"
        >
          <LucideIcon name="check-circle" :size="16" class="me-1" />
          تسجيل الدفعة
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useFinanceStore } from '../../stores/finance'

const props = defineProps<{
  modelValue: boolean
  engagement: any
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  save: []
}>()

const financeStore = useFinanceStore()
const paymentAmount = ref(0)
const paymentMethod = ref('cash')
const paymentNotes = ref('')
const linkToSchedule = ref(false)
const selectedScheduleId = ref('')
const saving = ref(false)

const paymentMethods = [
  { text: 'نقدي', value: 'cash' },
  { text: 'تحويل بنكي', value: 'bank_transfer' },
  { text: 'شيك', value: 'check' },
  { text: 'بطاقة ائتمان', value: 'card' }
]

const totalDue = computed(
  () => Number(props.engagement?.financial_compensation || 0) + Number(props.engagement?.tax || 0)
)

const hasInstallments = computed(() => Number(props.engagement?.installment_count || 0) > 1)

const availableSchedules = computed(() =>
  financeStore.paymentSchedules.filter((s) => s.status === 'pending')
)

const formatMoney = (v: number) => (v || 0).toLocaleString('ar-SA')

watch(
  () => props.modelValue,
  (val) => {
    if (val && props.engagement) {
      paymentAmount.value = Number(props.engagement.remaining_amount || 0)
      paymentMethod.value = 'cash'
      paymentNotes.value = ''
      linkToSchedule.value = false
      selectedScheduleId.value = ''
      if (Number(props.engagement.installment_count || 0) > 1) {
        financeStore.fetchInstallments(props.engagement.id)
      }
    }
  }
)

const handleSave = async () => {
  saving.value = true
  try {
    await financeStore.recordPayment(props.engagement.id, {
      amount: paymentAmount.value,
      payment_method: paymentMethod.value,
      payment_schedule_id: linkToSchedule.value ? selectedScheduleId.value : undefined,
      notes: paymentNotes.value || undefined
    })
    emit('save')
    emit('update:modelValue', false)
  } catch (e) {
    console.error('Error recording payment:', e)
  } finally {
    saving.value = false
  }
}
</script>
