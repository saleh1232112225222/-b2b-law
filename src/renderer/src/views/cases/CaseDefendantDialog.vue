<template>
  <v-dialog
    :model-value="modelValue"
    width="90%"
    max-width="800"
    persistent
    scrollable
    transition="dialog-bottom-transition"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="glass-card-noir border rounded-xl shadow-premium overflow-hidden glass-card">
      <v-toolbar color="transparent" class="px-6 border-b" height="72">
        <div class="pa-3 rounded-xl glass-card border-accent me-4">
          <LucideIcon name="user-plus" :size="24" class="text-accent" />
        </div>
        <v-toolbar-title class="font-weight-black text-primary"
          >إضافة خصم جديد للمنظومة</v-toolbar-title
        >
        <v-spacer />
        <v-btn icon variant="tonal" class="rounded-lg premium-btn-gold-gradient" @click="$emit('update:modelValue', false)">
          <LucideIcon name="x" :size="20" />
        </v-btn>
      </v-toolbar>
      <v-card-text class="pa-8 bg-transparent glass-card">
        <DefendantForm ref="formRef" v-model="defendant" />
      </v-card-text>
      <v-divider class="opacity-10" />
      <v-card-actions class="pa-6 bg-transparent glass-card">
        <v-btn
          variant="tonal"
          class="px-6 font-weight-black rounded-xl premium-btn-gold-gradient"
          @click="$emit('update:modelValue', false)"
          >إلغاء</v-btn
        >
        <v-spacer />
        <v-btn
          color="primary"
          variant="flat"
          class="px-10 font-weight-black rounded-xl shadow-premium premium-btn-gold-gradient"
          :loading="saving"
          @click="onSave"
        >
          حفظ الخصم
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DefendantForm from '../../components/DefendantForm.vue'
import LucideIcon from '../../components/common/LucideIcon.vue'

const props = defineProps<{
  modelValue: boolean
  saving: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: []
}>()

const formRef = ref<any>(null)
const defendant = ref<any>({
  name: '',
  type: 'فرد',
  id_number: '',
  phone: '',
  nationality: 'سعودي',
  city: ''
})

const onSave = async (): Promise<void> => {
  const { valid } = (await formRef.value?.validate()) || { valid: false }
  if (!valid) return
  emit('save')
}
</script>
