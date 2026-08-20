<template>
  <div class="mock-banner-container">
    <div class="mock-banner-content">
      <LucideIcon name="shield-check" :size="18" class="text-gold banner-icon" />
      <span class="banner-text">
        بوابة الدخول الآمنة | نظام B2B-LAW لإدارة مكاتب المحاماة
      </span>
      <span class="security-badge">
        <LucideIcon name="lock" :size="13" class="text-gold lock-icon" />
        اتصال مشفر 256-Bit SSL
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import LucideIcon from './common/LucideIcon.vue'
</script>

<style scoped>
.mock-banner-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background: rgba(15, 20, 35, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(212, 175, 55, 0.35);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 20px;
  animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.mock-banner-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #eaeaea;
  font-size: 0.88rem;
  font-weight: 500;
  direction: rtl;
  flex-wrap: wrap;
}

.banner-text {
  color: #f0f0f0;
  letter-spacing: 0.2px;
}

.text-gold {
  color: #e5c158 !important;
}

.banner-icon {
  animation: pulse-glow 2.5s infinite ease-in-out;
}

.lock-icon {
  margin-left: 4px;
}

.security-badge {
  display: inline-flex;
  align-items: center;
  background: rgba(229, 193, 88, 0.12);
  color: #e5c158;
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid rgba(229, 193, 88, 0.3);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.3px;
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
  0%,
  100% {
    transform: scale(1);
    filter: drop-shadow(0 0 2px rgba(229, 193, 88, 0.4));
  }
  50% {
    transform: scale(1.1);
    filter: drop-shadow(0 0 6px rgba(229, 193, 88, 0.7));
  }
}
</style>
