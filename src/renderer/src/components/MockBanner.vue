<template>
  <div v-if="isMockMode" class="mock-banner-container">
    <div class="mock-banner-content">
      <LucideIcon name="info" :size="18" class="text-gold banner-icon" />
      <span class="banner-text">
        وضع التحقق التجريبي نشط: لن يتم إرسال رسائل بريد حقيقية. الرمز الافتراضي هو 
        <strong class="otp-highlight">123456</strong>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LucideIcon from './common/LucideIcon.vue'

const isMockMode = computed(() => import.meta.env.VITE_USE_MOCK_OTP === 'true')
</script>

<style scoped>
.mock-banner-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background: rgba(20, 16, 10, 0.9);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(212, 175, 55, 0.4);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 24px;
  animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.mock-banner-content {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #eaeaea;
  font-size: 0.95rem;
  font-weight: 500;
  letter-spacing: 0.5px;
  direction: rtl;
}

.text-gold {
  color: #e5c158 !important;
}

.banner-icon {
  animation: pulse-glow 2s infinite ease-in-out;
}

.otp-highlight {
  color: #e5c158;
  background: rgba(229, 193, 88, 0.15);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid rgba(229, 193, 88, 0.3);
  margin: 0 6px;
  font-family: monospace;
  font-size: 1rem;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes pulse-glow {
  0%, 100% {
    transform: scale(1);
    filter: drop-shadow(0 0 2px rgba(229, 193, 88, 0.4));
  }
  50% {
    transform: scale(1.15);
    filter: drop-shadow(0 0 8px rgba(229, 193, 88, 0.8));
  }
}
</style>
