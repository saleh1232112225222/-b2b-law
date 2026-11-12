<template>
  <v-app-bar flat :height="52" class="mobile-header glass-header" app>
    <div class="d-flex align-center justify-space-between w-100 px-3">
      <!-- القائمة الجانبية -->
      <v-btn
        icon
        variant="text"
        density="comfortable"
        class="mobile-action-btn text-ebony me-1"
        aria-label="القائمة الرئيسية"
        @click="emit('toggle-drawer')"
      >
        <v-icon icon="mdi-menu" :size="24" />
      </v-btn>

      <!-- عنوان الصفحة كامل بدون قص -->
      <v-toolbar-title class="font-weight-black text-subtitle-1 text-ebony text-truncate flex-grow-1 text-center px-1">
        {{ title }}
      </v-toolbar-title>

      <!-- عناصر التحكم السريعة -->
      <div class="d-flex align-center gap-1 ms-1">
        <SyncStatusIndicator class="mobile-sync-chip" />

        <v-btn
          icon
          variant="text"
          density="comfortable"
          class="mobile-action-btn text-ebony"
          aria-label="تبديل المظهر"
          @click="emit('toggle-theme')"
        >
          <v-icon
            :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
            :size="20"
          />
        </v-btn>
      </div>
    </div>
  </v-app-bar>
</template>

<script setup lang="ts">
import SyncStatusIndicator from '../sync/SyncStatusIndicator.vue'

defineProps<{
  title: string
  isDark: boolean
}>()

const emit = defineEmits<{
  'toggle-drawer': []
  'toggle-theme': []
  'open-settings': []
}>()
</script>

<style scoped>
.mobile-header {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(212, 175, 55, 0.18) !important;
}
:deep(.mobile-sync-chip .premium-btn-gold-gradient) {
  display: none !important; /* إخفاء زر مزامنة الآن الطويل في شريط الجوال لتوفير المساحة */
}
</style>
