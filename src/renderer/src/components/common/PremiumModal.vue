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
          :icon="ICONS.UI.CLOSE"
          variant="tonal"
          color="error"
          class="rounded-lg"
          @click="close"
        ></v-btn>
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
          variant="flat"
          class="btn-gold-outline px-8 font-weight-black"
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
</style>
