<template>
  <v-card flat class="pa-4 bg-transparent border rounded-lg mt-4">
    <div class="text-h6 font-weight-black mb-4 text-gold d-flex align-center">
      <LucideIcon name="gavel" :size="24" class="text-gold me-2" />
      القرارات الإجرائية الصادرة
      <v-spacer></v-spacer>
      <v-btn
        color="accent"
        variant="elevated"
        size="small"
        :prepend-icon="ICONS.UI.PLUS"
        class="font-weight-black rounded-lg"
        @click="addDecision"
      >
        إضافة قرار
      </v-btn>
    </div>

    <v-table density="comfortable" class="premium-table">
      <thead class="bg-grey-lighten-4">
        <tr>
          <th class="text-right">نوع القرار</th>
          <th class="text-right">التاريخ</th>
          <th class="text-right">ملاحظات / الحالة</th>
          <th class="text-center" width="80">حذف</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(decision, index) in model" :key="index">
          <td class="pa-2">
            <v-select
              v-model="decision.decision_type"
              class="glass-input"
              :items="decisionTypes"
              variant="outlined"
              density="compact"
              hide-details
              placeholder="اختر النوع"
            ></v-select>
          </td>
          <td class="pa-2" style="min-width: 180px">
            <DualDatePicker
              v-model="decision.decision_date"
              label="تاريخ القرار"
              density="compact"
              hide-details
            />
          </td>
          <td class="pa-2">
            <v-text-field
              v-model="decision.notes"
              class="glass-input"
              variant="outlined"
              density="compact"
              placeholder="مثال: تم التبليغ، بانتظار الرد..."
              hide-details
            ></v-text-field>
          </td>
          <td class="text-center">
            <v-btn
              :icon="ICONS.ACTION.DELETE"
              size="small"
              variant="text"
              color="error"
              @click="removeDecision(index)"
            ></v-btn>
          </td>
        </tr>
        <tr v-if="!model || model.length === 0">
          <td colspan="4" class="text-center text-text-muted py-12">
            <LucideIcon name="file-search" :size="48" class="mb-3 opacity-20 mx-auto d-block" />
            لا توجد قرارات مضافة لهذا الطلب حتى الآن.
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DualDatePicker from '../DualDatePicker.vue'
import LucideIcon from '../common/LucideIcon.vue'
import { ICONS } from '../../config/icons'

const props = defineProps({
  modelValue: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue'])

const model = computed({
  get: () => props.modelValue as any[],
  set: (val) => emit('update:modelValue', val)
})

const decisionTypes = [
  'إبلاغ بالتنفيذ (قرار 34)',
  'الطلبات الإجرائية (قرار 46)',
  'منع من السفر',
  'إيقاف خدمات',
  'أمر حبس',
  'إفصاح عن أموال',
  'حجز تنفيذي',
  'أخرى'
]

const addDecision = () => {
  const newList = [...model.value]
  newList.push({
    decision_type: '',
    decision_date: new Date().toISOString().split('T')[0],
    notes: ''
  })
  model.value = newList
}

const removeDecision = (index: number) => {
  const newList = [...model.value]
  newList.splice(index, 1)
  model.value = newList
}
</script>

<style scoped>
.v-table {
  background: white !important;
}
</style>
