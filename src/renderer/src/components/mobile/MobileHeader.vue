<template>
  <v-app-bar flat :height="56" class="mobile-header glass-header" app>
    <div class="d-flex align-center w-100 px-2">
      <v-btn icon variant="text" class="mobile-action-btn" @click="emit('toggle-drawer')">
        <v-icon icon="mdi-menu" :size="24" />
      </v-btn>

      <v-toolbar-title class="font-weight-black text-subtitle-1 text-center">
        {{ title }}
      </v-toolbar-title>

      <v-spacer />

      <v-btn icon variant="text" class="mobile-action-btn" @click="emit('toggle-theme')">
        <v-icon :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'" :size="24" />
      </v-btn>
    </div>
  </v-app-bar>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  isDark: boolean
}>()

const emit = defineEmits<{
  'toggle-drawer': []
  'toggle-theme': []
}>()
</script>
