<template>
  <v-app-bar flat :height="48" class="mobile-header glass-header" app>
    <div class="d-flex align-center w-100 px-2">
      <v-btn
        icon
        variant="text"
        class="mobile-action-btn text-ebony"
        @click="emit('toggle-drawer')"
      >
        <v-icon icon="mdi-menu" :size="22" />
      </v-btn>

      <v-toolbar-title class="font-weight-black text-subtitle-1 text-center text-ebony">
        {{ title }}
      </v-toolbar-title>

      <v-spacer />

      <SyncStatusIndicator class="me-2" />

      <v-btn icon variant="text" class="mobile-action-btn text-ebony" @click="emit('toggle-theme')">
        <v-icon
          :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
          :size="22"
        />
      </v-btn>
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
