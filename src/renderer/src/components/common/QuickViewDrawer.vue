<template>
  <v-navigation-drawer
    v-model="store.isOpen"
    location="left"
    temporary
    :width="600"
    scrim="rgba(0, 0, 0, 0.4)"
    class="quick-view-drawer"
  >
    <div class="drawer-header px-6 py-4 d-flex align-center justify-space-between border-b">
      <!-- Title & Icon -->
      <div class="d-flex align-center ga-3">
        <div class="bg-accent-alpha pa-2 rounded-lg">
          <LucideIcon :name="getIconName()" :size="20" class="text-gold" />
        </div>
        <span class="text-subtitle-1 font-weight-black text-gold">{{ store.title || 'معاينة سريعة' }}</span>
      </div>

      <!-- Action Buttons -->
      <div class="d-flex align-center ga-1">
        <!-- View Full Page button (if applicable) -->
        <v-tooltip v-if="hasFullPage()" text="فتح الصفحة الكاملة" location="bottom">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon
              variant="text"
              color="accent"
              size="small"
              class="rounded-lg"
              @click="goToFullPage"
            >
              <LucideIcon name="external-link" :size="18" />
            </v-btn>
          </template>
        </v-tooltip>

        <!-- Close button -->
        <v-btn
          icon
          variant="text"
          color="white"
          size="small"
          class="rounded-lg"
          @click="store.close()"
        >
          <LucideIcon name="x" :size="20" />
        </v-btn>
      </div>
    </div>

    <!-- Drawer Content Scrollable -->
    <div class="drawer-body pa-4">
      <ClientQuickPreview
        v-if="store.isOpen && store.type === 'client' && store.itemId"
        :client-id="store.itemId"
      />
      <SessionQuickPreview
        v-if="store.isOpen && store.type === 'session' && store.itemId"
        :session-id="store.itemId"
      />
      <ContractQuickPreview
        v-if="store.isOpen && store.type === 'contract' && store.itemId"
        :contract-id="store.itemId"
      />
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { useQuickViewStore } from '../../stores/quickView'
import { useRouter } from 'vue-router'
import LucideIcon from './LucideIcon.vue'
import ClientQuickPreview from './ClientQuickPreview.vue'
import SessionQuickPreview from './SessionQuickPreview.vue'
import ContractQuickPreview from './ContractQuickPreview.vue'

const store = useQuickViewStore()
const router = useRouter()

const getIconName = () => {
  switch (store.type) {
    case 'client':
      return 'user'
    case 'session':
      return 'calendar-days'
    case 'contract':
      return 'file-signature'
    default:
      return 'eye'
  }
}

const hasFullPage = () => {
  return store.type === 'client' || store.type === 'session'
}

const goToFullPage = () => {
  if (!store.itemId) return
  const currentType = store.type
  const id = store.itemId

  store.close()

  if (currentType === 'client') {
    router.push(`/clients/${id}`)
  } else if (currentType === 'session') {
    router.push('/sessions')
  }
}
</script>

<style scoped>
.quick-view-drawer {
  background: rgba(10, 15, 30, 0.92) !important;
  backdrop-filter: blur(25px) !important;
  border-right: 1px solid rgba(233, 195, 73, 0.15) !important;
  color: #ffffff !important;
  box-shadow: 10px 0 30px rgba(0, 0, 0, 0.5) !important;
  z-index: 99999 !important;
}

.drawer-header {
  background: rgba(233, 195, 73, 0.03);
  border-bottom: 1px solid rgba(233, 195, 73, 0.1) !important;
}

.drawer-body {
  height: calc(100% - 64px);
  overflow-y: auto;
}

.bg-accent-alpha {
  background: rgba(var(--v-theme-accent), 0.1) !important;
}

.text-gold {
  color: #e9c349 !important;
}
</style>