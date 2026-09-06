<template>
  <v-dialog
    v-model="visible"
    :max-width="isMobile ? '95vw' : '560px'"
    scrollable
    persistent
    class="premium-confirm-dialog"
  >
    <v-card class="rounded-xl confirm-dialog-card elevation-24 d-flex flex-column">
      <!-- Top Decorative Accent -->
      <div class="decorative-accent" :style="{ backgroundColor: `var(--${color}, #735c00)` }"></div>

      <!-- Header (Sticky / Fixed at Top) -->
      <v-card-title class="modal-header border-b pa-4 pa-sm-5 d-flex align-center justify-space-between flex-shrink-0">
        <div class="d-flex align-center gap-3">
          <div
            class="icon-wrapper rounded-xl pa-2 pa-sm-3"
            style="background: rgba(115, 92, 0, 0.08); border: 1px solid rgba(208, 198, 175, 0.5);"
          >
            <LucideIcon
              :name="icon || 'brain'"
              :size="isMobile ? 22 : 28"
              class="text-gold"
            />
          </div>
          <h3 class="font-weight-black text-gold mb-0" :class="isMobile ? 'text-subtitle-1' : 'text-h6'">
            {{ title }}
          </h3>
        </div>
        <v-btn
          icon
          variant="text"
          density="comfortable"
          size="small"
          class="rounded-lg text-medium-emphasis"
          :disabled="loading"
          @click="handleCancel"
        >
          <LucideIcon name="x" :size="18" />
        </v-btn>
      </v-card-title>

      <!-- Scrollable Message Body -->
      <v-card-text class="pa-4 pa-sm-5 confirm-body-box flex-grow-1 overflow-y-auto">
        <div class="confirm-message-inner">
          <div class="message-text">{{ message }}</div>
          <div v-if="debugInfo" class="mt-4 pa-3 bg-grey-lighten-4 rounded text-caption text-left font-mono">
            <pre>{{ debugInfo }}</pre>
          </div>
        </div>
      </v-card-text>

      <!-- Actions Footer (Pinned & Always Visible at Bottom) -->
      <v-card-actions class="modal-footer-solid border-t d-flex align-center gap-3 pa-4 pa-sm-5 flex-shrink-0">
        <v-btn
          variant="outlined"
          class="rounded-lg flex-grow-1 font-weight-black btn-secondary"
          :height="isMobile ? 44 : 50"
          :disabled="loading"
          @click="handleCancel"
        >
          {{ cancelText }}
        </v-btn>
        <v-btn
          variant="outlined"
          class="rounded-lg flex-grow-1 font-weight-black btn-confirm-action"
          :height="isMobile ? 44 : 50"
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
  debugInfo?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'تأكيد الإجراء',
  message: 'هل أنت متأكد من رغبتك في الاستمرار؟',
  confirmText: 'تأكيد',
  cancelText: 'تراجع',
  color: 'primary',
  confirmButtonColor: '',
  icon: 'alert-circle',
  loading: false,
  debugInfo: ''
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
  flex-shrink: 0;
}

.confirm-dialog-card {
  background: var(--surface, #ffffff) !important;
  color: var(--text-primary, #1f1b13) !important;
  border: 1.5px solid var(--border, rgba(208, 198, 175, 0.6)) !important;
  max-height: min(88vh, 88dvh) !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

.modal-header {
  background: var(--surface-variant, #fbf3e5) !important;
  border-bottom: 1px solid var(--border, rgba(208, 198, 175, 0.5)) !important;
}

.confirm-body-box {
  background: var(--surface, #ffffff) !important;
  overflow-y: auto !important;
  max-height: calc(88vh - 160px) !important;
  scrollbar-width: thin;
  scrollbar-color: rgba(115, 92, 0, 0.3) transparent;
}

.confirm-body-box::-webkit-scrollbar {
  width: 6px;
}
.confirm-body-box::-webkit-scrollbar-thumb {
  background: rgba(115, 92, 0, 0.3);
  border-radius: 4px;
}

.confirm-message-inner {
  color: #1f1b13 !important;
  background: var(--surface-variant, #fcf8f2) !important;
  border: 1px solid var(--border, rgba(208, 198, 175, 0.6)) !important;
  border-radius: 14px !important;
  padding: 16px !important;
}

.message-text {
  font-size: 0.95rem !important;
  font-weight: 700 !important;
  line-height: 1.8 !important;
  white-space: pre-wrap !important;
  text-align: right !important;
  direction: rtl !important;
  word-break: break-word !important;
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

.text-gold {
  color: #735c00 !important;
}

/* Secondary (Cancel) Button */
.btn-secondary {
  background: #ffffff !important;
  border: 1.5px solid rgba(208, 198, 175, 0.8) !important;
  color: #4f4539 !important;
  transition: all 0.25s ease-in-out !important;
}

.btn-secondary :deep(.v-btn__content),
.btn-secondary .v-btn__content,
.btn-secondary span {
  color: #4f4539 !important;
  font-weight: 700 !important;
  font-size: 0.95rem !important;
}

.btn-secondary:hover:not(.v-btn--disabled) {
  background: #fbf8f2 !important;
  border-color: #735c00 !important;
}

/* Primary Confirm Button */
.btn-confirm-action {
  background: #fdfbf7 !important;
  border: 1.5px solid #d4af37 !important;
  color: #735c00 !important;
  font-weight: 800 !important;
  border-radius: 12px !important;
  box-shadow: 0 2px 8px rgba(115, 92, 0, 0.12) !important;
  transition: all 0.25s ease-in-out !important;
}

.btn-confirm-action :deep(.v-btn__content),
.btn-confirm-action .v-btn__content,
.btn-confirm-action span {
  color: #735c00 !important;
  font-weight: 800 !important;
  font-size: 1rem !important;
}

.btn-confirm-action:hover:not(.v-btn--disabled) {
  background: #ffffff !important;
  border-color: #bfa035 !important;
  box-shadow: 0 4px 16px rgba(233, 195, 73, 0.35) !important;
  transform: translateY(-2px) !important;
}

.btn-confirm-action:hover:not(.v-btn--disabled) :deep(.v-btn__content),
.btn-confirm-action:hover:not(.v-btn--disabled) .v-btn__content,
.btn-confirm-action:hover:not(.v-btn--disabled) span {
  color: #735c00 !important;
}

[data-theme='dark'] .btn-confirm-action,
.v-theme--dark .btn-confirm-action {
  background: #1e293b !important;
  border-color: #e5b52b !important;
}

[data-theme='dark'] .btn-confirm-action :deep(.v-btn__content),
.v-theme--dark .btn-confirm-action :deep(.v-btn__content),
[data-theme='dark'] .btn-confirm-action span,
.v-theme--dark .btn-confirm-action span {
  color: #f6d267 !important;
}
</style>
