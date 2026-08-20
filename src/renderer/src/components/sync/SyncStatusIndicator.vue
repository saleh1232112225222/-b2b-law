<template>
  <div class="d-inline-flex align-center gap-2">
    <!-- Status Badge -->
    <v-chip
      :color="statusInfo.color"
      size="small"
      variant="tonal"
      class="font-weight-black px-2 px-sm-3 rounded-lg cursor-pointer"
      @click="handleBadgeClick"
    >
      <LucideIcon :name="statusInfo.icon" :size="14" class="me-1" :class="{ 'spin-anim': isSyncing }" />
      <span class="d-none d-sm-inline">{{ statusInfo.text }}</span>
      <v-badge
        v-if="conflictCount > 0"
        :content="conflictCount"
        color="error"
        inline
        class="ms-1"
      ></v-badge>
      <v-badge
        v-else-if="pendingCount > 0"
        :content="pendingCount"
        color="warning"
        inline
        class="ms-1"
      ></v-badge>
    </v-chip>

    <!-- Sync Now Button -->
    <v-btn
      size="small"
      variant="outlined"
      color="gold"
      class="font-weight-black rounded-lg premium-btn-gold-gradient px-2 px-sm-3"
      :loading="isSyncing"
      @click="triggerSync"
    >
      <LucideIcon name="refresh-cw" :size="14" :class="{ 'spin-anim': isSyncing, 'me-1': true }" />
      <span class="text-tiny d-none d-sm-inline">مزامنة الآن</span>
    </v-btn>

    <!-- Conflict Resolution Modal -->
    <ConflictResolutionModal v-model="showConflictModal" />

    <!-- Notification Snackbar -->
    <v-snackbar
      v-model="snackbar"
      :color="snackbarColor"
      timeout="4000"
      location="bottom"
      class="font-weight-bold text-center"
    >
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSyncStore } from '../../stores/sync'
import LucideIcon from '../common/LucideIcon.vue'
import ConflictResolutionModal from './ConflictResolutionModal.vue'

const syncStore = useSyncStore()
const { syncStatus, isSyncing, pendingCount, conflictCount } = storeToRefs(syncStore)

const showConflictModal = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

let statusInterval: any = null

onMounted(async () => {
  await syncStore.checkStatus()
  statusInterval = setInterval(() => {
    syncStore.checkStatus()
  }, 30000)
})

onUnmounted(() => {
  if (statusInterval) clearInterval(statusInterval)
})

const statusInfo = computed(() => {
  switch (syncStatus.value) {
    case 'syncing':
      return { text: 'جارٍ التزامن...', color: 'info', icon: 'refresh-cw' }
    case 'conflict':
      return { text: 'يوجد تعارض', color: 'error', icon: 'alert-triangle' }
    case 'push_required':
      return { text: 'تحديثات معلقة', color: 'warning', icon: 'upload-cloud' }
    case 'pull_required':
      return { text: 'تحديثات سحابية', color: 'indigo', icon: 'download-cloud' }
    case 'offline':
      return { text: 'دون اتصال', color: 'grey', icon: 'wifi-off' }
    case 'failed':
      return { text: 'فشل التزامن', color: 'error', icon: 'x-circle' }
    case 'synced':
    default:
      return { text: 'متزامنة', color: 'success', icon: 'check-circle' }
  }
})

const handleBadgeClick = () => {
  if (conflictCount.value > 0) {
    showConflictModal.value = true
  } else {
    triggerSync()
  }
}

const triggerSync = async () => {
  const res = await syncStore.syncNow()
  snackbarText.value = res.message || 'عزيزي المستخدم: خدمة المزامنة قيد التطوير والترقية حالياً، وسوف تتاح في الإصدارات القادمة بإذن الله.'
  snackbarColor.value = 'info'
  snackbar.value = true
}
</script>

<style scoped>
.spin-anim {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}
</style>
