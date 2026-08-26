<template>
  <v-navigation-drawer
    v-model="localDrawer"
    temporary
    location="right"
    width="320"
    class="glass-card pa-0 mobile-drawer"
  >
    <div class="d-flex flex-column h-100 pa-4">
      <div class="text-center mb-4 mt-2">
        <v-avatar size="64" class="mb-2 icon-gold-bg border border-gold border-opacity-30">
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

      <v-list
        v-model:opened="openedGroups"
        nav
        density="compact"
        class="flex-grow-1 bg-transparent overflow-y-auto pa-0"
      >
        <template v-for="item in categorizedMenu" :key="item.title">
          <!-- Accordion Group -->
          <v-list-group v-if="item.children" :value="item.title" class="mb-2">
            <template #activator="{ props: groupProps }">
              <v-list-item v-bind="groupProps" class="rounded-lg glass-input mb-1">
                <template #prepend>
                  <v-icon :icon="item.icon" :size="20" class="text-accent me-3" />
                </template>
                <v-list-item-title class="font-weight-bold text-body-2 text-visible-high">
                  {{ item.title }}
                </v-list-item-title>
              </v-list-item>
            </template>

            <v-list-item
              v-for="child in item.children"
              :key="child.title"
              :to="child.to"
              link
              active-color="accent"
              class="rounded-lg mb-1 ps-6 glass-input"
              @click="localDrawer = false"
            >
              <template #prepend>
                <v-icon :icon="child.icon" :size="18" class="text-accent me-3" />
              </template>
              <v-list-item-title class="font-weight-bold text-caption text-visible-high">
                {{ child.title }}
              </v-list-item-title>
            </v-list-item>
          </v-list-group>

          <!-- Single Item -->
          <v-list-item
            v-else
            :to="item.to"
            link
            active-color="accent"
            class="rounded-lg mb-1 glass-input"
            @click="localDrawer = false"
          >
            <template #prepend>
              <v-icon :icon="item.icon" :size="20" class="text-accent me-3" />
            </template>
            <v-list-item-title class="font-weight-bold text-body-2 text-visible-high">
              {{ item.title }}
            </v-list-item-title>
          </v-list-item>
        </template>
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
import { ref, computed } from 'vue'
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

const { session, can } = usePermissions()

const localDrawer = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
})

const handleLogout = () => {
  localDrawer.value = false
  emit('logout')
}

const openedGroups = ref(['الإعدادات والأدوات'])

const categorizedMenu = computed(() => {
  const baseStructure = [
    {
      title: 'العمل القانوني',
      icon: 'mdi-scale-balance',
      children: [
        {
          title: 'الجلسات والتقويم',
          icon: 'mdi-calendar-clock',
          to: '/sessions',
          perm: 'view_sessions'
        },
        {
          title: 'المهام والتذكيرات',
          icon: 'mdi-clipboard-list',
          to: '/tasks',
          perm: 'view_tasks'
        },
        {
          title: 'المذكرات واللوائح',
          icon: 'mdi-file-document-edit',
          to: '/memoranda',
          perm: 'view_drafting'
        },
        {
          title: 'التنفيذ والتحصيل',
          icon: 'mdi-gavel',
          to: '/enforcement',
          perm: 'view_enforcement'
        },
        { title: 'الأرشيف القانوني', icon: 'mdi-archive', to: '/archive' }
      ]
    },
    {
      title: 'الموكلين والملفات',
      icon: 'mdi-account-group',
      children: [
        {
          title: 'إدارة الموكلين',
          icon: 'mdi-account-multiple',
          to: '/clients',
          perm: 'view_clients'
        },
        {
          title: 'إدارة الخصوم',
          icon: 'mdi-account-cancel',
          to: '/defendants',
          perm: 'view_defendants'
        },
        { title: 'الوكالات والتفويضات', icon: 'mdi-file-sign', to: '/poa' },
        {
          title: 'الأرشفة والمستندات',
          icon: 'mdi-file-document',
          to: '/documents',
          perm: 'view_documents'
        }
      ]
    },
    {
      title: 'الخدمات القانونية',
      icon: 'mdi-scale',
      to: '/legal-services',
      perm: 'view_legal_services'
    },
    {
      title: 'الإدارة والمالية',
      icon: 'mdi-chart-areaspline',
      children: [
        { title: 'المالية', icon: 'mdi-bank', to: '/finance', perm: 'view_finances' },
        { title: 'تتبع الوقت', icon: 'mdi-clock-outline', to: '/time-tracking' },
        { title: 'العقود', icon: 'mdi-file-certificate', to: '/contracts', perm: 'view_contracts' },
        {
          title: 'شؤون الموظفين',
          icon: 'mdi-account-cog',
          to: '/employees',
          perm: 'view_employees'
        },
        { title: 'الخبراء', icon: 'mdi-school', to: '/experts' },
        { title: 'المراسلات', icon: 'mdi-email-search', to: '/communications' },
        { title: 'إدارة المكتب', icon: 'mdi-office-building', to: '/firm' }
      ]
    },
    {
      title: 'الإعدادات والأدوات',
      icon: 'mdi-cog-box',
      children: [
        ...((session.value as any)?.companyId === '00000000-0000-0000-0000-000000000000'
          ? [{ title: 'إدارة الاشتراكات', icon: 'mdi-crown', to: '/admin/subscriptions' }]
          : []),
        {
          title: 'إدارة المستخدمين',
          icon: 'mdi-account-supervisor',
          to: '/users',
          perm: 'manage_users'
        },
        { title: 'إعدادات النظام', icon: 'mdi-cog', to: '/settings', perm: 'manage_settings' },
        {
          title: 'مركز التقارير',
          icon: 'mdi-chart-box',
          to: '/reports',
          perm: 'export_reports'
        },
        { title: 'خزانة المكتب', icon: 'mdi-folder-lock', to: '/vault', perm: 'view_files' },
        {
          title: 'سجل النشاط',
          icon: 'mdi-history',
          to: '/activity-log',
          perm: 'view_activity_logs'
        }
      ]
    },
    {
      title: 'الملف الشخصي',
      icon: 'mdi-account-circle',
      to: '/profile'
    }
  ]

  return baseStructure
    .map((item) => {
      const newItem = { ...item }
      if (newItem.children) {
        newItem.children = newItem.children.filter(
          (c: any) => !c.perm || (typeof can === 'function' && can(c.perm))
        )
      }
      return newItem
    })
    .filter((item: any) => {
      if (item.children) return item.children.length > 0
      return !item.perm || (typeof can === 'function' && can(item.perm))
    })
})
</script>
