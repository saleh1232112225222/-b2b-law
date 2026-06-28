<template>
  <v-dialog v-model="visible" max-width="480" persistent>
    <v-card class="glass-card overflow-hidden">
      <!-- Top Decorative Accent -->
      <div class="decorative-accent" :style="{ backgroundColor: `var(--${color})` }"></div>

      <v-card-title class="d-flex flex-column align-center" :class="isMobile ? 'pa-5 pb-2' : 'pa-8'">
        <div
          class="icon-wrapper rounded-xl mb-4"
          :class="isMobile ? 'pa-3' : 'pa-4'"
          :style="{ backgroundColor: `var(--${color}-alpha)` }"
        >
          <LucideIcon :name="icon" :size="isMobile ? 32 : 40" :style="{ color: `var(--${color})` }" />
        </div>
        <h3 class="font-weight-black text-center" :class="isMobile ? 'text-h6' : 'text-h5'">{{ title }}</h3>
      </v-card-title>

      <v-card-text 
        class="text-center py-0 text-secondary font-weight-medium"
        :class="isMobile ? 'px-5 text-body-2 mb-2' : 'px-10 text-body-1'"
      >
        {{ message }}
      </v-card-text>

      <v-card-actions class="justify-center gap-4" :class="isMobile ? 'pa-5 pt-0' : 'pa-8'">
        <v-btn
          variant="tonal"
          color="secondary"
          class="rounded-lg flex-grow-1 font-weight-black"
          :height="isMobile ? 44 : 52"
          @click="handleCancel"
        >
          {{ cancelText }}
        </v-btn>
        <v-btn
          variant="flat"
          :color="confirmButtonColor || color"
          class="rounded-lg flex-grow-1 font-weight-black shadow-lg"
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
