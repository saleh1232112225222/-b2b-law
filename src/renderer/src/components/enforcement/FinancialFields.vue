<template>
  <v-card flat class="pa-4 bg-transparent border rounded-lg">
    <div class="text-h6 font-weight-black mb-4 text-gold d-flex align-center">
      <LucideIcon name="banknote" :size="24" class="text-gold me-2" />
      تفاصيل التنفيذ المالي (حق العميل)
    </div>

    <v-row dense>
      <v-col cols="12" md="6">
        <v-text-field
          v-model.number="model.amount_instrument"
          label="مبلغ السند الإجمالي"
          type="number"
          variant="outlined"
          density="comfortable"
          required
          suffix="SAR"
          :prepend-inner-icon="ICONS.FINANCE.DOLLAR"
        ></v-text-field>
      </v-col>

      <v-col cols="12" md="6">
        <v-text-field
          v-model.number="model.amount_collected_for_client"
          label="المبلغ المسترد للعميل حالياً"
          type="number"
          variant="outlined"
          density="comfortable"
          required
          suffix="SAR"
          :prepend-inner-icon="ICONS.FINANCE.BANKNOTE"
          hint="المبلغ الذي تم تحصيله لصالح العميل حتى الآن"
          persistent-hint
        ></v-text-field>
      </v-col>

      <v-col cols="12">
        <v-alert type="info" variant="tonal" class="mt-4" border="start" density="compact">
          المبلغ المتبقي للتحصيل:
          <strong
            >{{
              (model.amount_instrument - model.amount_collected_for_client).toLocaleString()
            }}
            ريال</strong
          >
        </v-alert>
      </v-col>

      <v-col cols="12" class="mt-4">
        <v-select
          v-model="model.currency"
          label="العملة"
          :items="['ريال سعودي', 'دولار أمريكي', 'درهم إماراتي', 'أخرى']"
          variant="outlined"
          density="comfortable"
        ></v-select>
      </v-col>
    </v-row>

    <v-divider class="my-4"></v-divider>
    <div class="text-caption text-grey">
      * هذه الحسابات مخصصة لمتابعة مطالبة التنفيذ فقط ولا تدخل في موازنة المكتب الأساسية.
    </div>
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
</script>
