<template>
  <v-navigation-drawer
    v-model="localDrawer"
    temporary
    location="right"
    width="300"
    class="mobile-drawer"
  >
    <div class="d-flex flex-column h-100 pa-4">
      <div class="text-center mb-6">
        <v-avatar size="64" class="mb-2 border-accent-glow">
          <v-img
            :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}&background=1A437D&color=E9C349&bold=true`"
          />
        </v-avatar>
        <div class="text-subtitle-1 font-weight-black">{{ username || 'المستخدم' }}</div>
        <div class="text-caption text-medium-emphasis">{{ role || '—' }}</div>
      </div>

      <v-divider class="mb-4" />

      <v-list nav density="compact" class="flex-grow-1">
        <v-list-item
          v-for="item in moreItems"
          :key="item.title"
          :to="item.to"
          link
          active-color="primary"
          class="rounded-lg mb-1"
          @click="localDrawer = false"
        >
          <template #prepend>
            <v-icon :icon="item.icon" :size="20" class="me-3" />
          </template>
          <v-list-item-title class="font-weight-bold text-body-2">{{
            item.title
          }}</v-list-item-title>
        </v-list-item>
      </v-list>

      <v-divider class="mb-4" />

      <v-btn
        block
        color="error"
        variant="tonal"
        class="rounded-lg font-weight-bold"
        @click="handleLogout"
      >
        <v-icon icon="mdi-logout" class="me-2" :size="20" />
        تسجيل الخروج
      </v-btn>
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  username: string
  role: string
  isDark: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  logout: []
  'toggle-theme': []
}>()

const localDrawer = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
})

const handleLogout = () => {
  localDrawer.value = false
  emit('logout')
}

const moreItems = [
  { title: 'المهام', icon: 'mdi-clipboard-list', to: '/tasks' },
  { title: 'المالية', icon: 'mdi-bank', to: '/finance' },
  { title: 'المستندات', icon: 'mdi-file-document', to: '/documents' },
  { title: 'المذكرات', icon: 'mdi-file-document-edit', to: '/memoranda' },
  { title: 'العقود', icon: 'mdi-file-sign', to: '/contracts' },
  { title: 'التنفيذ', icon: 'mdi-gavel', to: '/enforcement' },
  { title: 'الملفات', icon: 'mdi-folder-lock', to: '/vault' },
  { title: 'التقارير', icon: 'mdi-chart-box', to: '/reports' },
  { title: 'الملف الشخصي', icon: 'mdi-account', to: '/profile' },
  { title: 'الإعدادات', icon: 'mdi-cog', to: '/settings' }
]
</script>
