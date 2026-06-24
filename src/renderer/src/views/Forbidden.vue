<template>
  <v-container fluid class="pa-6 fill-height d-flex align-center justify-center rtl">
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <v-card
          elevation="0"
          class="glass-card pa-10 text-center overflow-hidden relative glass-card"
        >
          <div class="decorative-top-error"></div>

          <div
            class="glass-panel-light pa-8 rounded-full d-inline-flex mb-8 border-gold opacity-10"
          >
            <LucideIcon name="shield-alert" :size="80" class="text-error" />
          </div>

          <h1 class="text-h5 font-weight-black text-gold mb-2 tracking-tighter">
            غير مصرح بالدخول
          </h1>
          <p class="text-h6 text-gold opacity-60 font-weight-black mb-10 leading-relaxed px-10">
            نعتذر، ولكن حسابك الحالي لا يمتلك الصلاحيات الكافية للوصول إلى هذه المنطقة القانونية
            المؤمنة.
          </p>

          <v-divider class="border-gold opacity-10 mb-10" />

          <div class="d-flex flex-wrap justify-center ga-4">
            <v-btn
              variant="text"
              color="gold"
              class="px-10 font-weight-black opacity-50 h-56 premium-btn-gold-gradient"
              @click="goBack"
            >
              <LucideIcon name="arrow-right" :size="18" class="me-2" /> العودة للخلف
            </v-btn>
            <v-btn
              color="accent"
              size="large"
              class="px-12 font-weight-black rounded-lg premium-lift h-56 premium-btn-gold-gradient"
              @click="goHome"
            >
              <LucideIcon name="layout-dashboard" :size="18" class="me-2" /> لوحة التحكم الرئيسية
            </v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import LucideIcon from '../components/common/LucideIcon.vue'

const router = useRouter()

const goHome = () => {
  router.push('/dashboard')
}

const goBack = () => {
  router.back()
}
</script>

<style scoped>
.decorative-top-error {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(to right, transparent, #ff5252, transparent);
  opacity: 0.5;
}

.h-56 {
  height: 56px !important;
}

.leading-relaxed {
  line-height: 1.6;
}

.tracking-tighter {
  letter-spacing: -0.05em !important;
}
</style>
