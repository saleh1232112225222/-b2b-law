<template>
  <v-dialog
    v-model="internalValue"
    max-width="640"
    persistent
    transition="dialog-bottom-transition"
    class="premium-modal"
  >
    <v-card class="rounded-xl overflow-hidden glass-card modal-card-flex" elevation="24">
      <!-- Header -->
      <div class="modal-header pa-5 pa-sm-6 d-flex align-center flex-shrink-0 border-b">
        <div class="header-icon-box me-4">
          <LucideIcon :name="icon || 'gavel'" :size="24" class="text-gold" />
        </div>
        <div>
          <h3 class="text-h6 font-weight-black text-gold tracking-tight">{{ title }}</h3>
          <div v-if="subtitle" class="text-caption text-visible-high font-weight-bold opacity-80">{{ subtitle }}</div>
        </div>
        <v-spacer></v-spacer>
        <v-btn
          icon
          variant="tonal"
          color="error"
          density="comfortable"
          class="rounded-lg close-btn"
          aria-label="إغلاق"
          title="إغلاق"
          @click="close"
        >
          <LucideIcon name="x" :size="20" class="text-error" />
        </v-btn>
      </div>

      <!-- Body -->
      <v-card-text class="pa-6 pa-sm-8 bg-surface modal-body-scroll">
        <slot></slot>
      </v-card-text>

      <!-- Footer -->
      <v-divider class="flex-shrink-0"></v-divider>
      <v-card-actions class="pa-4 pa-sm-6 modal-footer-solid flex-shrink-0 dialog-actions-sticky d-flex align-center gap-3">
        <v-btn
          variant="outlined"
          class="btn-secondary px-6 font-weight-black"
          @click="close"
        >
          إلغاء
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn
          variant="outlined"
          class="btn-confirm-action px-8 font-weight-black"
          :loading="loading"
          @click="$emit('save')"
        >
          {{ saveLabel || 'حفظ الإجراء' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LucideIcon from './LucideIcon.vue'
import { ICONS } from '../../config/icons'

const props = defineProps<{
  modelValue: boolean
  title: string
  subtitle?: string
  icon?: string
  saveLabel?: string
  saveColor?: string
  loading?: boolean
}>()

const emit = defineEmits(['update:modelValue', 'save', 'close'])

const internalValue = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

function close() {
  internalValue.value = false
  emit('close')
}
</script>

<style scoped>
.modal-card-flex {
  display: flex !important;
  flex-direction: column !important;
  max-height: 90vh !important;
  height: auto !important;
  background: var(--surface, #ffffff) !important;
  border: 1px solid var(--border, rgba(208, 198, 175, 0.6)) !important;
}

.modal-body-scroll {
  flex: 1 1 auto !important;
  overflow-y: auto !important;
  max-height: calc(90vh - 140px) !important;
  padding-bottom: 2rem !important;
}

.dialog-actions-sticky {
  position: sticky !important;
  bottom: 0 !important;
  z-index: 10 !important;
  background: var(--surface-variant, #fbf3e5) !important;
  border-top: 1px solid var(--border, rgba(208, 198, 175, 0.4)) !important;
}

.modal-header {
  background: var(--surface-variant, #fbf3e5) !important;
  border-bottom: 1px solid var(--border, rgba(208, 198, 175, 0.4)) !important;
}

.header-icon-box {
  width: 44px;
  height: 44px;
  background: rgba(115, 92, 0, 0.08);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(208, 198, 175, 0.5);
}

.tracking-tight {
  letter-spacing: -0.02em;
}

/* Close Button */
.close-btn {
  transition: all 0.2s ease-in-out !important;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.2) !important;
  transform: scale(1.05);
}

.close-btn :deep(.v-btn__content),
.close-btn .v-btn__content {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
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

/* Primary Confirm / Save Button */
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
