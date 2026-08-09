<template>
  <v-dialog v-model="visible" max-width="580" persistent>
    <v-card class="overflow-hidden rounded-xl confirm-dialog-card elevation-24">
      <!-- Top Decorative Accent -->
      <div class="decorative-accent" :style="{ backgroundColor: `var(--${color})` }"></div>

      <!-- Header -->
      <v-card-title
        class="d-flex flex-column align-center modal-header border-b pa-5 pa-sm-6"
      >
        <div
          class="icon-wrapper rounded-xl mb-3 pa-3 pa-sm-4"
          style="background: rgba(115, 92, 0, 0.08); border: 1px solid rgba(208, 198, 175, 0.5);"
        >
          <LucideIcon
            :name="icon || 'brain'"
            :size="isMobile ? 28 : 36"
            class="text-gold"
          />
        </div>
        <h3 class="font-weight-black text-center text-gold" :class="isMobile ? 'text-h6' : 'text-h5'">
          {{ title }}
        </h3>
      </v-card-title>

      <!-- Message Content -->
      <v-card-text class="pa-4 pa-sm-6 confirm-body-box">
        <div class="confirm-message-inner">{{ message }}</div>
      </v-card-text>

      <!-- Actions Footer -->
      <v-card-actions class="modal-footer-solid border-t d-flex align-center gap-3 pa-4 pa-sm-6">
        <v-btn
          variant="outlined"
          class="rounded-lg flex-grow-1 font-weight-black btn-secondary"
          :height="isMobile ? 44 : 52"
          @click="handleCancel"
        >
          {{ cancelText }}
        </v-btn>
        <v-btn
          variant="flat"
          class="rounded-lg flex-grow-1 font-weight-black btn-gold-outline"
          :height="isMobile ? 44 : 52"
          :loading="loading"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LucideIcon from './LucideIcon.vue'
import { useMobileLayout } from '../../composables/useMobileLayout'

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

const { isMobile } = useMobileLayout()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  visible.value = false
  emit('cancel')
}
</script>

<style scoped>
.decorative-accent {
  height: 4px;
  width: 100%;
}

.confirm-dialog-card {
  background: var(--surface, #ffffff) !important;
  color: var(--text-primary, #1f1b13) !important;
  border: 1.5px solid var(--border, rgba(208, 198, 175, 0.6)) !important;
}

.modal-header {
  background: var(--surface-variant, #fbf3e5) !important;
  border-bottom: 1px solid var(--border, rgba(208, 198, 175, 0.5)) !important;
}

.confirm-body-box {
  background: var(--surface, #ffffff) !important;
}

.confirm-message-inner {
  color: #1f1b13 !important;
  background: var(--surface-variant, #fcf8f2) !important;
  border: 1px solid var(--border, rgba(208, 198, 175, 0.6)) !important;
  border-radius: 14px !important;
  padding: 18px !important;
  font-size: 0.95rem !important;
  font-weight: 800 !important;
  line-height: 1.8 !important;
  white-space: pre-wrap !important;
  text-align: right !important;
  direction: rtl !important;
}

.modal-footer-solid {
  background: var(--surface-variant, #fbf3e5) !important;
  border-top: 1px solid var(--border, rgba(208, 198, 175, 0.5)) !important;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
