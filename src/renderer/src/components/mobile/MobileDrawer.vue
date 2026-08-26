<template>
  <v-navigation-drawer
    v-model="localDrawer"
    temporary
    location="right"
    width="300"
    class="glass-card pa-0 mobile-drawer"
  >
    <div class="d-flex flex-column h-100 pa-4">
      <div class="text-center mb-6 mt-4">
        <v-avatar size="72" class="mb-3 icon-gold-bg border border-gold border-opacity-30">
          <v-img
            :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}&background=0F2A55&color=E9C349&bold=true`"
          />
        </v-avatar>
        <div class="text-subtitle-1 font-weight-black text-visible-high">
          {{ username || 'المستخدم' }}
        </div>
        <div class="text-caption text-accent opacity-70">{{ role || '—' }}</div>
      </div>

      <div class="divider-gold my-2"></div>

      <v-list nav density="compact" class="flex-grow-1 bg-transparent">
        <v-list-item
          v-for="item in moreItems"
          :key="item.title"
          :to="item.to"
          link
          active-color="accent"
          class="rounded-lg mb-1 glass-input"
          @click="localDrawer = false"
        >
          <template #prepend>
            <v-icon :icon="item.icon" :size="20" class="text-accent me-3" />
          </template>
          <v-list-item-title class="font-weight-bold text-body-2 text-visible-high">{{
            item.title
          }}</v-list-item-title>
        </v-list-item>
      </v-list>

      <div class="divider-gold my-2"></div>

      <v-btn
        block
        variant="tonal"
        class="font-weight-bold rounded-xl btn-gold-outline my-2"
        @click="handleLogout"
      >
        <LucideIcon name="log-out" :size="18" class="me-2" />
        تسجيل الخروج
      </v-btn>
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LucideIcon from '../common/LucideIcon.vue'
import { usePermissions } from '../../composables/usePermissions'

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

const { session } = usePermissions()

const localDrawer = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
})

const handleLogout = () => {
  localDrawer.value = false
  emit('logout')
}

const isSuperAdminUser = computed(() => {
  return (session.value as any)?.companyId === '00000000-0000-0000-0000-000000000000'
})

const moreItems = computed(() => {
  const items = [
    { title: 'المهام', icon: 'mdi-clipboard-list', to: '/tasks' },
    { title: 'المالية', icon: 'mdi-bank', to: '/finance' },
    { title: 'الخدمات القانونية', icon: 'mdi-scale-balance', to: '/legal-services' },
    { title: 'المستندات', icon: 'mdi-file-document', to: '/documents' },
    { title: 'المذكرات', icon: 'mdi-file-document-edit', to: '/memoranda' },
    { title: 'العقود', icon: 'mdi-file-sign', to: '/contracts' },
    { title: 'التنفيذ', icon: 'mdi-gavel', to: '/enforcement' },
    { title: 'الملفات', icon: 'mdi-folder-lock', to: '/vault' },
    { title: 'التقارير', icon: 'mdi-chart-box', to: '/reports' },
    { title: 'الأرشيف', icon: 'mdi-archive', to: '/archive' },
    { title: 'الملف الشخصي', icon: 'mdi-account', to: '/profile' },
    { title: 'الإعدادات', icon: 'mdi-cog', to: '/settings' }
  ]

  if (isSuperAdminUser.value) {
    items.unshift({
      title: 'إدارة الاشتراكات',
      icon: 'mdi-crown',
      to: '/admin/subscriptions'
    })
  }

  return items
})
</script>
