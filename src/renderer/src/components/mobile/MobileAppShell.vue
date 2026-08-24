<template>
  <MobileErrorBoundary>
    <v-layout full-height class="mobile-layout">
      <MobileHeader
        :title="currentRouteName"
        :is-dark="isDark"
        @toggle-drawer="drawerOpen = !drawerOpen"
        @toggle-theme="emit('toggle-theme')"
        @open-settings="router.push('/settings')"
      />

      <MobileDrawer
        v-model="drawerOpen"
        :username="currentUser?.username || ''"
        :role="currentUser?.roleKey || ''"
        :is-dark="isDark"
        @logout="emit('logout')"
        @toggle-theme="emit('toggle-theme')"
      />

      <v-main class="mobile-app-shell">
        <div class="main-body-wrapper pa-3">
          <router-view v-slot="{ Component }">
            <transition name="slide-x-reverse" mode="out-in">
              <component :is="Component" :key="$route.path" />
            </transition>
          </router-view>
        </div>
      </v-main>

      <MobileBottomNav :hidden="bottomNavHidden" @more-click="drawerOpen = !drawerOpen" />

      <div v-if="showFab" class="mobile-fab" :class="{ 'mobile-fab--hidden': fabHidden }">
        <v-btn
          v-if="currentFabAction"
          color="primary"
          :icon="currentFabAction.icon"
          :size="56"
          elevation="8"
          class="elevation-8"
          @click="currentFabAction?.handler()"
        />
      </div>
    </v-layout>
  </MobileErrorBoundary>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFabAction } from '../../composables/useFabAction'
import '../../assets/mobile.css'
import MobileHeader from './MobileHeader.vue'
import MobileDrawer from './MobileDrawer.vue'
import MobileBottomNav from './MobileBottomNav.vue'
import MobileErrorBoundary from './MobileErrorBoundary.vue'
import { resetMobileScroll } from '../../utils/mobileScroll'

defineProps<{
  isDark: boolean
  currentUser: any
  currentRouteName: string
}>()

const emit = defineEmits<{
  logout: []
  'toggle-theme': []
}>()

const route = useRoute()
const router = useRouter()
const drawerOpen = ref(false)
const { fabAction: currentFabAction } = useFabAction()

// --- FAB & BottomNav visibility based on scroll ---
let lastScrollY = 0
const fabHidden = ref(false)
const bottomNavHidden = ref(false)
const showFab = computed(() => {
  const fabRoutes = [
    '/clients',
    '/cases',
    '/sessions',
    '/tasks',
    '/documents',
    '/memoranda',
    '/vault'
  ]
  return fabRoutes.includes(route.path)
})

watch(
  () => route.fullPath,
  async () => {
    await nextTick()
    resetMobileScroll()
  },
  { flush: 'post' }
)

const handleScroll = () => {
  const currentY = window.scrollY
  const scrollingDown = currentY > lastScrollY && currentY > 50
  const scrollingUp = currentY < lastScrollY
  fabHidden.value = scrollingDown
  bottomNavHidden.value = scrollingDown
  if (scrollingUp) {
    bottomNavHidden.value = false
  }
  lastScrollY = currentY
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style>
.slide-x-reverse-enter-active,
.slide-x-reverse-leave-active {
  transition: all 0.2s ease;
}
.slide-x-reverse-enter-from {
  transform: translateX(30px);
  opacity: 0;
}
.slide-x-reverse-leave-to {
  transform: translateX(-30px);
  opacity: 0;
}
</style>
