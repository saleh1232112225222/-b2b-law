<template>
  <v-dialog
    :model-value="modelValue"
    persistent
    max-width="480"
    transition="dialog-bottom-transition"
    class="idle-timeout-dialog"
  >
    <v-card class="idle-modal-card rounded-2xl overflow-hidden elevation-24 border-gold">
      <!-- Top Accent Bar -->
      <div class="modal-top-bar bg-gold-gradient"></div>

      <v-card-text class="pa-6 text-center">
        <!-- Shield & Clock Icon Badge -->
        <div class="icon-wrapper mx-auto mb-4">
          <div class="icon-pulse-ring"></div>
          <v-avatar size="64" class="icon-inner-badge icon-gold-bg border border-gold">
            <LucideIcon name="shield-alert" :size="32" class="text-gold" />
          </v-avatar>
        </div>

        <!-- Title -->
        <h2 class="text-h6 font-weight-black text-visible-high mb-2">
          تنبيه أمان: خمول الجلسة
        </h2>

        <!-- Reassuring & Polite Message -->
        <p class="text-body-2 text-medium-emphasis mb-5 leading-relaxed">
          عزيزي المستخدم، تم رصد توقف النشاط على النظام لمدة <strong>5 دقائق</strong>.<br />
          حفاظاً على سرية وأمان بيانات وقضايا مكتبكم، سيتم تسجيل الخروج تلقائياً خلال:
        </p>

        <!-- Countdown Timer Box -->
        <div class="countdown-box rounded-xl pa-3 mb-5 d-flex align-center justify-center ga-3">
          <LucideIcon name="clock" :size="22" class="text-gold" />
          <span class="countdown-text font-weight-black font-mono">
            {{ formatCountdown(countdown) }}
          </span>
          <span class="text-caption text-medium-emphasis">ثانية متبقية</span>
        </div>

        <v-progress-linear
          :model-value="(countdown / 60) * 100"
          color="accent"
          height="6"
          rounded
          class="mb-6"
        />

        <!-- Action Buttons -->
        <div class="d-flex flex-column flex-sm-row ga-3 justify-center">
          <v-btn
            color="accent"
            size="large"
            class="font-weight-black rounded-xl premium-btn-gold-gradient flex-grow-1"
            elevation="2"
            @click="emit('extend')"
          >
            <LucideIcon name="refresh-cw" :size="18" class="me-2" />
            تمديد الجلسة ومتابعة العمل
          </v-btn>

          <v-btn
            variant="outlined"
            color="error"
            size="large"
            class="font-weight-bold rounded-xl flex-grow-1"
            @click="emit('logout')"
          >
            <LucideIcon name="log-out" :size="18" class="me-2" />
            تسجيل الخروج الآن
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import LucideIcon from './LucideIcon.vue'

defineProps<{
  modelValue: boolean
  countdown: number
}>()

const emit = defineEmits<{
  extend: []
  logout: []
}>()

const formatCountdown = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
</script>

<style scoped>
.idle-modal-card {
  background: var(--surface, #ffffff) !important;
  border: 1.5px solid #c5a028 !important;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25) !important;
}

.modal-top-bar {
  height: 6px;
  width: 100%;
}

.icon-wrapper {
  position: relative;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-pulse-ring {
  position: absolute;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(233, 195, 73, 0.2);
  animation: pulse-ring 2s infinite ease-out;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.85);
    opacity: 1;
  }
  100% {
    transform: scale(1.3);
    opacity: 0;
  }
}

.countdown-box {
  background: rgba(233, 195, 73, 0.1);
  border: 1px dashed rgba(233, 195, 73, 0.5);
}

.countdown-text {
  font-size: 1.4rem;
  color: var(--accent, #c5a028);
  letter-spacing: 1px;
}

/* Dark Mode Overrides */
:global([data-theme='dark'] .idle-modal-card) {
  background: #0D1929 !important;
  border-color: #c5a028 !important;
}

:global([data-theme='dark'] .countdown-box) {
  background: #111F31 !important;
  border-color: rgba(233, 195, 73, 0.4) !important;
}
</style>
