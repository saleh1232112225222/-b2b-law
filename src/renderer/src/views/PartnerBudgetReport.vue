<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <!-- Header -->
    <v-row dense class="mb-6 mb-md-8 align-center ga-3">
      <v-col cols="12" md="8">
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-3 pa-md-4 rounded-xl me-3 me-md-5 border-gold opacity-20 flex-shrink-0">
            <LucideIcon name="piggy-bank" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h6 text-md-h5 font-weight-black text-gold mb-1">ميزانية وأعمال الشركاء</h1>
            <p class="text-body-2 text-md-subtitle-1 text-gold opacity-60 font-weight-black mb-0">
              تقرير التوزيع المالي، الميزانية التشغيلية ونسب مساهمة الشركاء
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="auto" class="ms-md-auto">
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
    <OfficeBudgetDashboard />
  </v-container>
</template>

<script setup lang="ts">
import OfficeBudgetDashboard from '../components/finance/OfficeBudgetDashboard.vue'
import LucideIcon from '../components/common/LucideIcon.vue'
</script>
