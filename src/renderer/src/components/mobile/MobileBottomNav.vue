<template>
  <v-bottom-navigation
    v-model="activeTab"
    grow
    fixed
    app
    class="mobile-bottom-nav"
    :class="{ 'mobile-bottom-nav--hidden': hidden }"
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

defineProps<{
  hidden?: boolean
}>()

defineEmits<{ 'more-click': [] }>()
</script>

<style scoped>
.mobile-bottom-nav {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border-top: 1px solid rgba(212, 175, 55, 0.2) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
.mobile-bottom-nav--hidden {
  transform: translateY(100%);
}
.nav-label {
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: -0.2px;
}
.nav-icon-wrapper {
  margin-bottom: 2px;
}
:deep(.v-btn--active) {
  color: #d4af37 !important;
}
:deep(.v-btn--active .nav-icon-wrapper) {
  transform: scale(1.12);
  transition: transform 0.2s ease;
}
</style>
