<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500"
    persistent
    transition="scale-transition"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="glass-card-noir border rounded-xl shadow-premium overflow-hidden">
      <div class="pa-6 bg-error shadow-sm d-flex align-center">
        <div class="pa-3 rounded-lg bg-white-alpha-10 me-4">
          <LucideIcon name="trash-2" :size="24" class="text-white" />
        </div>
        <v-card-title class="pa-0 text-white font-weight-black text-h6"
          >حذف ملف القضية</v-card-title
        >
      </div>
      <v-card-text class="pa-8 text-center">
        <div class="text-subtitle-1 mb-4 font-weight-medium text-text-muted">
          هل أنت متأكد من حذف ملف القضية رقم:
        </div>
        <div class="text-h5 font-weight-black text-error mb-6">
          {{ caseNumber }}
        </div>
        <v-alert type="error" variant="tonal" class="rounded-xl font-weight-bold" border="start">
          تحذير: هذا الإجراء نهائي ولا يمكن التراجع عنه. سيتم حذف كافة البيانات والملحقات المرتبطة.
        </v-alert>
      </v-card-text>
      <v-card-actions class="pa-6 pt-0">
        <v-btn
          variant="tonal"
          class="rounded-xl px-6 font-weight-black"
          @click="$emit('update:modelValue', false)"
        >
          تراجع
        </v-btn>
        <v-spacer />
        <v-btn
          color="error"
          variant="flat"
          class="rounded-xl px-10 font-weight-black shadow-sm"
          :loading="deleting"
          @click="$emit('confirm')"
        >
          حذف نهائي
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'

defineProps<{
  modelValue: boolean
  caseNumber: string
  deleting: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()
</script>
