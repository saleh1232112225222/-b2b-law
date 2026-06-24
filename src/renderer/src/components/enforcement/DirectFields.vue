<template>
  <v-card flat class="pa-4 bg-transparent border rounded-lg">
    <div class="text-h6 font-weight-black mb-4 text-gold d-flex align-center">
      <LucideIcon name="hammer" :size="24" class="text-gold me-2" />
      بيانات التنفيذ المباشر
    </div>

    <v-row dense>
      <v-col cols="12">
        <v-text-field
          v-model="model.execution_location"
          class="glass-input"
          label="محل التنفيذ (العنوان التفصيلي)"
          variant="outlined"
          density="comfortable"
          required
          :prepend-inner-icon="ICONS.LEGAL.LOCATION"
          placeholder="مثلاً: مدينة الرياض - حي الملقا - شارع..."
        ></v-text-field>
      </v-col>

      <v-col cols="12" md="6">
        <v-select
          v-model="model.action_type"
          class="glass-input"
          label="نوع الإجراء المطلوب"
          :items="actionTypes"
          variant="outlined"
          density="comfortable"
          required
          :prepend-inner-icon="ICONS.LEGAL.ASSESSMENT"
        ></v-select>
      </v-col>

      <v-col cols="12">
        <v-textarea
          v-model="model.work_description"
          class="glass-input"
          label="وصف العمل المطلوب تنفيذه"
          variant="outlined"
          rows="4"
          required
          :prepend-inner-icon="ICONS.ENTITY.DOCUMENT"
          placeholder="اشرح بوضوح ما يجب تنفيذه (إخلاء، هدم، تسليم عين، إلخ)..."
        ></v-textarea>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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

const actionTypes = ['إخلاء عقار', 'تسليم عين', 'هدم أو إزالة', 'توقيع محرر', 'أخرى']
</script>
