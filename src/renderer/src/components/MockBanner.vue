<template>
  <v-alert v-if="isMockMode" type="info" variant="tonal" class="mock-banner" dense>
    Mock OTP mode enabled – no real emails will be sent.
  </v-alert>
</template>

<script setup lang="ts">
import { computed } from 'vue';
const isMockMode = computed(() => import.meta.env.VITE_USE_MOCK_OTP === 'true');
</script>

<style scoped>
.mock-banner {
  background: linear-gradient(90deg, rgba(255,215,0,0.2), rgba(255,255,255,0.1));
  color: #b8860b;
  font-weight: 600;
  border-radius: 8px;
  margin-bottom: 1rem;
}
</style>
