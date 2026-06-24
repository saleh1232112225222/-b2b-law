<template>
  <v-dialog
    v-model="internalValue"
    max-width="600"
    persistent
    transition="dialog-bottom-transition"
    class="premium-modal"
  >
    <v-card class="rounded-xl overflow-hidden glass-card" elevation="24">
      <!-- Header -->
      <div class="modal-header pa-6 d-flex align-center bg-primary text-white">
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
      <v-card-text class="pa-8 bg-surface">
        <slot></slot>
      </v-card-text>

      <!-- Footer -->
      <v-divider></v-divider>
      <v-card-actions class="pa-6 bg-grey-lighten-5">
        <v-spacer></v-spacer>
        <v-btn
          variant="text"
          color="secondary"
          class="rounded-lg font-weight-black px-6"
          @click="close"
        >
          الغاء
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
