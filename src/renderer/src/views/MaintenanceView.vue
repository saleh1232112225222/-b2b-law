<template>
  <v-container fluid class="maintenance-container pa-0">
    <!-- Premium Cinematic Background -->
    <div class="background-wrapper">
      <div class="background-overlay"></div>
    </div>

    <v-row
      no-gutters
      class="z-10 py-8 py-md-12"
      style="min-height: 100vh"
      align="center"
      justify="center"
    >
      <v-col cols="12" sm="10" md="7" lg="5" class="d-flex flex-column align-center px-4">
        <!-- Glassmorphism Card -->
        <v-card class="premium-glass-card pa-8 pa-md-10 w-100 rtl glass-card text-center" elevation="0">
          <!-- Card Glow Effect Corners -->
          <div class="corner-glow top-left"></div>
          <div class="corner-glow bottom-right"></div>

          <!-- Logo & Branding -->
          <div class="branding-header text-center mb-6">
            <div class="logo-stack mb-3">
              <div class="logo-shield">
                <LucideIcon name="shield" :size="52" class="text-gold main-shield" />
                <LucideIcon name="scale" :size="26" class="text-gold inner-scales" />
              </div>
              <h1 class="brand-title mt-2">B2B-LAW</h1>
            </div>
            <div class="status-badge mb-3">
              <span class="status-dot"></span>
              إشعار إداري: مرحلة المراجعة والتجهيز
            </div>
          </div>

          <!-- Maintenance Message Box -->
          <div class="maintenance-message-card pa-6 mb-6">
            <LucideIcon name="clock" :size="36" class="text-gold mx-auto mb-3" />
            <h2 class="maintenance-title mb-3">النظام حالياً قيد المراجعة والتجهيز</h2>
            <p class="maintenance-text">
              «النظام حالياً تحت المراجعة والتجهيز للإطلاق. لطلب عرض خاص يرجى التواصل مع الإدارة.»
            </p>
          </div>

          <!-- Notice on Data Protection & Technical Compliance -->
          <div class="compliance-note pa-4 mb-6 text-right">
            <div class="d-flex align-center mb-2">
              <LucideIcon name="shield-check" :size="20" class="text-gold me-2" />
              <span class="font-weight-bold text-white text-body-2">الخصوصية وضوابط الأمان:</span>
            </div>
            <p class="text-caption text-grey-lighten-1 mb-0" style="line-height: 1.7">
              تُطبّق ضوابط أمنية تقنية، ويخضع النظام حالياً لمراجعة الامتثال والأمن قبل الإطلاق العام لضمان أعلى معايير حماية البيانات وسرية المعاملات.
            </p>
          </div>

          <!-- Action Buttons -->
          <div class="d-flex flex-column gap-3 mb-6">
            <v-btn
              href="https://wa.me/966567905696?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%D8%8C%20%D8%A3%D9%88%D8%AF%20%D8%B7%D9%84%D8%A8%20%D8%B9%D8%B1%D8%B6%20%D8%AE%D8%A7%D8%B5%20%D9%84%D9%86%D8%B8%D8%A7%D9%85%20B2B-LAW"
              target="_blank"
              block
              height="52"
              class="contact-whatsapp-btn mb-2"
            >
              <template #prepend>
                <LucideIcon name="message-circle" :size="20" class="me-2" />
              </template>
              طلب عرض خاص عبر واتساب
            </v-btn>

            <v-btn
              href="tel:+966567905696"
              block
              height="48"
              variant="outlined"
              class="contact-phone-btn mb-2"
            >
              <template #prepend>
                <LucideIcon name="phone" :size="18" class="text-gold me-2" />
              </template>
              الاتصال بالإدارة: 0567905696
            </v-btn>

            <v-btn
              href="https://saleh-lawyer.com/b2b-law"
              block
              height="44"
              variant="text"
              class="back-to-site-btn"
            >
              <template #prepend>
                <LucideIcon name="arrow-right" :size="16" class="me-1" />
              </template>
              العودة إلى الصفحة التعريفية للنظام
            </v-btn>
          </div>

          <!-- Footer Note -->
          <div class="text-caption text-grey text-center">
            مكتب صالح المحمدي للمحاماة والاستشارات القانونية &copy; 2026
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import LucideIcon from '../components/common/LucideIcon.vue'
</script>

<style scoped>
.maintenance-container {
  min-height: 100vh;
  position: relative;
  background-color: #0c1b2a;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.background-wrapper {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 30%, rgba(200, 169, 81, 0.12) 0%, rgba(12, 27, 42, 1) 75%);
  z-index: 1;
}

.premium-glass-card {
  background: rgba(15, 34, 54, 0.85) !important;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(200, 169, 81, 0.3) !important;
  border-radius: 20px !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
  position: relative;
  overflow: hidden;
}

.logo-stack {
  position: relative;
  display: inline-block;
}

.logo-shield {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  background: rgba(200, 169, 81, 0.12);
  border-radius: 50%;
  border: 1px solid rgba(200, 169, 81, 0.4);
}

.inner-scales {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.brand-title {
  color: #c8a951;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(200, 169, 81, 0.15);
  border: 1px solid rgba(200, 169, 81, 0.4);
  color: #c8a951;
  padding: 5px 16px;
  border-radius: 50px;
  font-size: 13px;
  font-weight: 700;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #c8a951;
  border-radius: 50%;
  box-shadow: 0 0 8px #c8a951;
}

.maintenance-message-card {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(200, 169, 81, 0.2);
  border-radius: 14px;
}

.maintenance-title {
  font-size: 20px;
  font-weight: 800;
  color: #ffffff;
}

.maintenance-text {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.8;
  color: #f1e4c3;
  margin: 0;
}

.compliance-note {
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(200, 169, 81, 0.25);
  border-radius: 10px;
}

.contact-whatsapp-btn {
  background: linear-gradient(135deg, #25d366 0%, #128c7e 100%) !important;
  color: #ffffff !important;
  font-weight: 700 !important;
  font-size: 15px !important;
  border-radius: 10px !important;
  text-decoration: none;
}

.contact-phone-btn {
  border-color: rgba(200, 169, 81, 0.4) !important;
  color: #ffffff !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  border-radius: 10px !important;
}

.back-to-site-btn {
  color: #c8a951 !important;
  font-weight: 600 !important;
  font-size: 14px !important;
}

.corner-glow {
  position: absolute;
  width: 140px;
  height: 140px;
  background: radial-gradient(circle, rgba(200, 169, 81, 0.15) 0%, rgba(200, 169, 81, 0) 70%);
  pointer-events: none;
}
.corner-glow.top-left {
  top: 0;
  left: 0;
}
.corner-glow.bottom-right {
  bottom: 0;
  right: 0;
}

.rtl {
  direction: rtl;
}

.text-gold {
  color: #c8a951 !important;
}
</style>
