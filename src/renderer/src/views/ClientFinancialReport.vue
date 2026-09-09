<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <!-- Header -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="users" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">كشف حساب الموكل الموحد</h1>
            <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
              الملف المالي المتكامل لتعاملات الموكل السابقة والنشطة
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="auto">
        <v-btn
          variant="outlined"
          color="gold"
          class="rounded-lg px-6 font-weight-black premium-hover h-56"
          @click="$router.push('/reports')"
        >
          <LucideIcon name="arrow-right" :size="18" class="me-2" /> رجوع للمركز
        </v-btn>
      </v-col>
    </v-row>

    <!-- Embed Component -->
    <ClientFullProfile />
  </v-container>
</template>

<script setup lang="ts">
import ClientFullProfile from '../components/finance/ClientFullProfile.vue'
import LucideIcon from '../components/common/LucideIcon.vue'
</script>
