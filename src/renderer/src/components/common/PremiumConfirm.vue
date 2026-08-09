<template>
  <v-dialog v-model="visible" max-width="580" persistent>
    <v-card class="glass-card overflow-hidden rounded-xl border-gold-soft">
      <!-- Top Decorative Accent -->
      <div class="decorative-accent" :style="{ backgroundColor: `var(--${color})` }"></div>

      <v-card-title
        class="d-flex flex-column align-center modal-header border-b"
        :class="isMobile ? 'pa-4 pb-2' : 'pa-6'"
      >
        <div
          class="icon-wrapper rounded-xl mb-3"
          :class="isMobile ? 'pa-3' : 'pa-4'"
          style="background: rgba(115, 92, 0, 0.08); border: 1px solid rgba(208, 198, 175, 0.5);"
        >
          <LucideIcon
            :name="icon"
            :size="isMobile ? 28 : 36"
            class="text-gold"
          />
        </div>
        <h3 class="font-weight-black text-center text-gold" :class="isMobile ? 'text-h6' : 'text-h5'">
          {{ title }}
        </h3>
      </v-card-title>

      <v-card-text
        class="py-4 font-weight-bold confirm-message-box"
        :class="isMobile ? 'px-4 text-body-2' : 'px-6 text-body-1'"
      >
        {{ message }}
      </v-card-text>

      <v-card-actions class="modal-footer-solid border-t d-flex align-center gap-3" :class="isMobile ? 'pa-4' : 'pa-6'">
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

.confirm-message-box {
  color: var(--text-primary, #1f1b13) !important;
  white-space: pre-wrap !important;
  text-align: right !important;
  direction: rtl !important;
  line-height: 1.75 !important;
  background: var(--surface-variant, #fdfbf7) !important;
  border: 1px solid var(--border, rgba(208, 198, 175, 0.6)) !important;
  border-radius: 14px !important;
  margin: 12px 16px !important;
  padding: 16px !important;
  font-size: 0.95rem !important;
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
