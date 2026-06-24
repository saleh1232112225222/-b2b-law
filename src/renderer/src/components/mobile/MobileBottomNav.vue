<template>
  <v-bottom-navigation
    v-model="activeTab"
    grow
    fixed
    app
    class="mobile-bottom-nav"
    bg-color="surface"
    elevation="8"
  >
    <v-btn
      v-for="tab in visibleTabs"
      :key="tab.name"
      :value="tab.name"
      :to="tab.to"
      :disabled="!tab.enabled"
      class="mobile-action-btn"
      @click="tab.name === 'more' && $emit('more-click')"
    >
      <div class="nav-icon-wrapper">
        <v-icon :icon="tab.icon" :size="20" />
      </div>
      <span class="nav-label">{{ tab.label }}</span>
    </v-btn>
  </v-bottom-navigation>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { usePermissions } from '../../composables/usePermissions'

const route = useRoute()
const { can } = usePermissions()

const activeTab = ref(route.path)

const allTabs = computed(() => [
  {
    name: 'dashboard',
    label: 'لوحة التحكم',
    icon: 'mdi-view-dashboard',
    to: '/dashboard',
    perm: null,
    enabled: true
  },
  {
    name: 'clients',
    label: 'العملاء',
    icon: 'mdi-account-group',
    to: '/clients',
    perm: 'view_clients',
    enabled: true
  },
  {
    name: 'cases',
    label: 'القضايا',
    icon: 'mdi-scale-balance',
    to: '/cases',
    perm: 'view_cases',
    enabled: true
  },
  {
    name: 'sessions',
    label: 'الجلسات',
    icon: 'mdi-calendar-clock',
    to: '/sessions',
    perm: 'view_sessions',
    enabled: true
  },
  { name: 'more', label: 'المزيد', icon: 'mdi-dots-horizontal', to: '', perm: null, enabled: true }
])

const visibleTabs = computed(() =>
  allTabs.value.filter((t) => !t.perm || (typeof can === 'function' && can(t.perm)))
)

defineEmits<{ 'more-click': [] }>()
const hideBottomNav = computed(
  () => route.path === '/login' || route.path === '/register' || route.query.window === 'new'
)
</script>
