<template>
  <PremiumConfirm
    v-model="internalValue"
    :title="title"
    :message="message"
    :confirm-text="confirmText"
    :cancel-text="cancelText"
    :color="color"
    :confirm-button-color="confirmButtonColor"
    :icon="icon"
    :loading="loading"
    @confirm="emit('confirm')"
    @cancel="emit('cancel')"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PremiumConfirm from './PremiumConfirm.vue'

interface Props {
  modelValue: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  color?: string
  confirmButtonColor?: string
  icon?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'تأكيد الإجراء',
  message: 'هل أنت متأكد من رغبتك في الاستمرار؟',
  confirmText: 'تأكيد',
  cancelText: 'تراجع',
  color: 'primary',
  confirmButtonColor: '',
  icon: 'alert-circle',
  loading: false
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const internalValue = computed({
  get: () => props.modelValue,
  set: (val) => {
    emit('update:modelValue', val)
  }
})
</script>
