<template>
  <v-card flat class="pa-4 bg-transparent border rounded-lg">
    <div class="text-h6 font-weight-black mb-4 text-gold d-flex align-center">
      <LucideIcon name="heart" :size="24" class="text-gold me-2" />
      بيانات تنفيذ الأحوال الشخصية
    </div>

    <!-- نوع الطلب التفصيلي -->
    <v-row dense class="mb-4">
      <v-col cols="12">
        <v-btn-toggle
          v-model="model.personal_request_type"
          color="accent"
          variant="outlined"
          mandatory
          class="w-100 rounded-lg"
          density="comfortable"
        >
          <v-btn
            value="alimony"
            :prepend-icon="ICONS.FINANCE.BANKNOTE"
            class="flex-grow-1 font-weight-black"
            >نفقة مالية</v-btn
          >
          <v-btn
            value="visit_custody"
            :prepend-icon="ICONS.LEGAL.PEOPLE"
            class="flex-grow-1 font-weight-black"
            >زيارة / حضانة</v-btn
          >
        </v-btn-toggle>
      </v-col>
    </v-row>

    <v-row dense>
      <!-- حقول النفقة -->
      <template v-if="model.personal_request_type === 'alimony'">
        <v-col cols="12" md="6">
          <v-text-field
            v-model.number="model.alimony_amount"
            class="glass-input"
            label="مبلغ النفقة المقرر"
            type="number"
            variant="outlined"
            density="comfortable"
            :prepend-inner-icon="ICONS.FINANCE.DOLLAR"
            suffix="SAR"
            hide-details="auto"
          ></v-text-field>
        </v-col>

        <v-col cols="12" md="6">
          <v-select
            v-model="model.execution_frequency"
            class="glass-input"
            label="دورية التنفيذ"
            :items="frequencies"
            variant="outlined"
            density="comfortable"
            :prepend-inner-icon="ICONS.LEGAL.SESSION"
            hide-details="auto"
          ></v-select>
        </v-col>
      </template>

      <!-- حقول الزيارة/الحضانة -->
      <template v-else>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="model.visit_time"
            class="glass-input"
            label="مقتضى التنفيذ (مثلاً: زيارة أسبوعية)"
            variant="outlined"
            density="comfortable"
            :prepend-inner-icon="ICONS.LEGAL.SESSION"
            hide-details="auto"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="model.visit_location"
            class="glass-input"
            label="مكان التنفيذ / التسليم"
            variant="outlined"
            density="comfortable"
            :prepend-inner-icon="ICONS.LEGAL.LOCATION"
            hide-details="auto"
          ></v-text-field>
        </v-col>
      </template>

      <v-col cols="12" class="mt-2">
        <v-text-field
          v-model="model.beneficiary_name"
          class="glass-input"
          label="اسم المستفيد (أو الأبناء)"
          variant="outlined"
          density="comfortable"
          required
          :prepend-inner-icon="ICONS.LEGAL.PEOPLE"
          hide-details="auto"
        ></v-text-field>
      </v-col>

      <v-col cols="12">
        <v-textarea
          v-model="model.visit_custody_details"
          class="glass-input"
          label="تفاصيل إضافية"
          variant="outlined"
          rows="3"
          :prepend-inner-icon="ICONS.ENTITY.DOCUMENT"
          placeholder="اكتب أي تفاصيل أخرى تتعلق بالتنفيذ..."
          hide-details="auto"
        ></v-textarea>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import LucideIcon from '../common/LucideIcon.vue'
import { ICONS } from '../../config/icons'

const props = defineProps({
  modelValue: { type: Object, required: true }
})

const emit = defineEmits(['update:modelValue'])

const model = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const frequencies = ['شهرياً', 'أسبوعياً', 'مرة واحدة', 'أخرى']

onMounted(() => {
  if (!model.value.personal_request_type) {
    model.value.personal_request_type = 'alimony'
  }
})
</script>
