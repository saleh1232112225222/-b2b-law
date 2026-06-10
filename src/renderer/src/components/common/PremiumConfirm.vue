<template>
  <v-dialog v-model="visible" max-width="480" persistent>
    <v-card class="glass-card overflow-hidden">
      <!-- Top Decorative Accent -->
      <div class="decorative-accent" :style="{ backgroundColor: `var(--${color})` }"></div>

      <v-card-title class="d-flex flex-column align-center pa-8">
        <div
          class="icon-wrapper pa-4 rounded-xl mb-4"
          :style="{ backgroundColor: `var(--${color}-alpha)` }"
        >
          <LucideIcon :name="icon" :size="40" :style="{ color: `var(--${color})` }" />
        </div>
        <h3 class="text-h5 font-weight-black text-center">{{ title }}</h3>
      </v-card-title>

      <v-card-text class="text-center px-10 py-0 text-body-1 text-secondary font-weight-medium">
        {{ message }}
      </v-card-text>

      <v-card-actions class="pa-8 justify-center gap-4">
        <v-btn
          variant="tonal"
          color="secondary"
          class="rounded-lg flex-grow-1 font-weight-black"
          height="52"
          @click="handleCancel"
        >
          {{ cancelText }}
        </v-btn>
        <v-btn
          variant="flat"
          :color="confirmButtonColor || color"
          class="rounded-lg flex-grow-1 font-weight-black shadow-lg"
          height="52"
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

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse-subtle 2s infinite ease-in-out;
}

@keyframes pulse-subtle {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
