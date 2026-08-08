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
      <div class="modal-header pa-5 pa-sm-6 d-flex align-center bg-primary text-white flex-shrink-0">
        <div class="header-icon-box me-4">
          <LucideIcon :name="icon || 'gavel'" :size="28" class="text-white" />
        </div>
        <div>
          <h3 class="text-h6 font-weight-black tracking-tight">{{ title }}</h3>
          <div class="text-caption opacity-80 font-weight-bold">{{ subtitle }}</div>
        </div>
        <v-spacer></v-spacer>
        <v-btn
          :icon="ICONS.UI.CLOSE"
          variant="text"
          color="white"
          class="opacity-70"
          @click="close"
        ></v-btn>
      </div>

      <!-- Body -->
      <v-card-text class="pa-6 pa-sm-8 bg-surface modal-body-scroll">
        <slot></slot>
      </v-card-text>

      <!-- Footer -->
      <v-divider class="flex-shrink-0"></v-divider>
      <v-card-actions class="pa-4 pa-sm-6 bg-grey-lighten-5 flex-shrink-0 dialog-actions-sticky">
        <v-spacer></v-spacer>
        <v-btn
          variant="outlined"
          color="secondary"
          class="rounded-lg font-weight-black px-6"
          @click="close"
        >
          إلغاء
        </v-btn>
        <v-btn
          :color="saveColor || 'primary'"
          variant="flat"
          class="rounded-lg font-weight-black px-8 shadow-sm"
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
.premium-modal :deep(.v-card) {
  border: 1px solid rgba(var(--v-theme-primary), 0.1);
}

.modal-card-flex {
  display: flex !important;
  flex-direction: column !important;
  max-height: 90vh !important;
  height: auto !important;
}

.modal-body-scroll {
  flex: 1 1 auto !important;
  overflow-y: auto !important;
  max-height: calc(90vh - 130px) !important;
  padding-bottom: 2rem !important;
}

.dialog-actions-sticky {
  position: sticky !important;
  bottom: 0 !important;
  z-index: 10 !important;
  background-color: #f8fafc !important;
  border-top: 1px solid rgba(0, 0, 0, 0.08) !important;
}

.modal-header {
  background: linear-gradient(135deg, var(--primary) 0%, #15406d 100%);
}

.header-icon-box {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.tracking-tight {
  letter-spacing: -0.02em;
}
</style>
