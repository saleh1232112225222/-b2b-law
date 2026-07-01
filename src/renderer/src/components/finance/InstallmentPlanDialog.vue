<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="700" persistent>
    <v-card class="rounded-xl">
      <v-card-title class="text-h6 font-weight-black d-flex align-center">
        <LucideIcon name="calendar-clock" :size="20" class="me-2" />
        جدول تقسيط الأتعاب
      </v-card-title>
      <v-card-text>
        <v-card variant="outlined" class="pa-4 mb-4 rounded-xl bg-grey-lighten-5">
          <div class="text-body-2 text-medium-emphasis">المبلغ الإجمالي المتبقي</div>
          <div class="text-h5 font-weight-black text-primary">
            {{ formatMoney(engagement?.remaining_amount || 0) }} <span class="text-body-2">ريال</span>
          </div>
        </v-card>

        <v-select v-model="frequency" :items="frequencies" item-title="text" item-value="value"
          label="دورة السداد" variant="outlined" class="mb-4" />

        <div class="d-flex justify-space-between align-center mb-3">
          <div class="text-subtitle-2 font-weight-black">الأقساط</div>
          <v-btn size="small" color="accent" variant="flat" @click="addInstallment">
            <LucideIcon name="plus" :size="14" class="me-1" /> إضافة قسط
          </v-btn>
        </div>

        <v-card v-for="(inst, i) in installments" :key="i" variant="outlined" class="mb-2 pa-3 rounded-lg">
          <v-row dense align="center">
            <v-col cols="1">
              <div class="text-caption font-weight-bold text-center text-medium-emphasis">{{ i + 1 }}</div>
            </v-col>
            <v-col cols="4">
              <v-text-field v-model="inst.title" label="عنوان القسط" variant="outlined" density="compact" hide-details />
            </v-col>
            <v-col cols="3">
              <v-text-field v-model.number="inst.amount" label="المبلغ" type="number" variant="outlined" density="compact" hide-details />
            </v-col>
            <v-col cols="3">
              <v-text-field v-model="inst.due_date" label="تاريخ الاستحقاق" type="date" variant="outlined" density="compact" hide-details />
            </v-col>
            <v-col cols="1" class="d-flex justify-center">
              <v-btn icon size="x-small" variant="text" color="error" @click="removeInstallment(i)">
                <LucideIcon name="x" :size="16" />
              </v-btn>
            </v-col>
          </v-row>
        </v-card>

        <div v-if="installments.length === 0" class="text-center py-6 text-medium-emphasis">
          لا توجد أقساط بعد. اضغط "إضافة قسط" للبدء.
        </div>

        <v-alert v-if="installments.length > 0 && totalInstallments !== (engagement?.remaining_amount || 0)"
          type="warning" density="compact" class="mt-3">
          إجمالي الأقساط ({{ formatMoney(totalInstallments) }}) لا يطابق المتبقي
          ({{ formatMoney(engagement?.remaining_amount || 0) }})
        </v-alert>
      </v-card-text>

      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">إلغاء</v-btn>
        <v-btn color="primary" :loading="saving" :disabled="!isValid" @click="handleSave">
          <LucideIcon name="save" :size="16" class="me-1" />
          حفظ جدول الأقساط
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
const frequency = ref('monthly')
const installments = ref<{ title: string; amount: number; due_date: string }[]>([])
const saving = ref(false)

const frequencies = [
  { text: 'شهري', value: 'monthly' },
  { text: 'ربع سنوي', value: 'quarterly' },
  { text: 'نصف سنوي', value: 'biannual' },
  { text: 'مخصص', value: 'custom' }
]

const formatMoney = (v: number) => (v || 0).toLocaleString('ar-SA')

const totalInstallments = computed(() =>
  installments.value.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
)

const isValid = computed(() =>
  installments.value.length > 0 &&
  installments.value.every(i => i.title && i.amount > 0 && i.due_date) &&
  totalInstallments.value > 0
)

watch(() => props.modelValue, (val) => {
  if (val) {
    installments.value = []
    frequency.value = 'monthly'
  }
})

const addInstallment = () => {
  const num = installments.value.length + 1
  installments.value.push({
    title: `القسط ${num}`,
    amount: 0,
    due_date: ''
  })
}

const removeInstallment = (index: number) => {
  installments.value.splice(index, 1)
}

const handleSave = async () => {
  saving.value = true
  try {
    await financeStore.createInstallments(
      props.engagement.id,
      installments.value,
      frequency.value
    )
    emit('save')
    emit('update:modelValue', false)
  } catch (e) {
    console.error('Error creating installments:', e)
  } finally {
    saving.value = false
  }
}
</script>
