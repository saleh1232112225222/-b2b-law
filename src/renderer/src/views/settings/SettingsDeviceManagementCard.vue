<template>
  <v-card elevation="0" class="glass-card mb-4 border border-gold border-opacity-20 glass-card">
    <div class="pa-4 d-flex align-center border-b border-gold border-opacity-10">
      <LucideIcon name="laptop" :size="20" class="text-primary me-3" />
      <span class="text-subtitle-1 font-weight-black text-primary">إدارة الأجهزة وحالة النسخ الموثق</span>
      <v-spacer />
      <v-btn size="small" variant="outlined" color="gold" class="font-weight-black" :loading="loading" @click="loadData">
        <LucideIcon name="refresh-cw" :size="14" class="me-1" /> تحديث
      </v-btn>
    </div>

    <v-card-text class="pa-4">
      <!-- Latest Verified Backup Status -->
      <div class="mb-4 pa-3 rounded-lg border border-gold border-opacity-20 glass-panel-light">
        <div class="d-flex align-center justify-space-between mb-2">
          <span class="text-subtitle-2 font-weight-black text-primary d-flex align-center">
            <LucideIcon name="shield-check" :size="16" class="text-success me-2" />
            آخر نسخة احتياطية موثقة (Verified Catalog)
          </span>
          <v-chip :color="latestBackup ? 'success' : 'warning'" size="x-small" class="font-weight-black">
            {{ latestBackup ? 'متحقق منها' : 'لا توجد نسخة موثقة' }}
          </v-chip>
        </div>

        <div v-if="latestBackup" class="text-caption text-grey">
          <div><strong class="text-primary">تاريخ التحقق:</strong> {{ formatDate(latestBackup.last_verified_at) }}</div>
          <div><strong class="text-primary">الحجم:</strong> {{ formatBytes(latestBackup.byte_size) }} | <strong class="text-primary">الوجهة:</strong> {{ latestBackup.destination }}</div>
          <div class="font-mono text-tiny mt-1 text-truncate"><strong class="text-primary">البصمة (SHA-256):</strong> {{ latestBackup.content_hash }}</div>
        </div>
        <div v-else class="text-caption text-grey">
          لم يتم العثور على نسخة احتياطية مسجلة وموثقة في الكتالوج المستقل لهذا المكتب حتى الآن.
        </div>
      </div>

      <!-- Active Registered Devices -->
      <div class="text-subtitle-2 font-weight-black text-primary mb-2 d-flex align-center">
        <LucideIcon name="hard-drive" :size="16" class="text-gold me-2" />
        الأجهزة المقترنة والمرخصة للمزامنة
      </div>

      <div v-if="devices.length === 0" class="text-center py-4 text-grey text-caption">
        لا توجد أي أجهزة مسجلة حالياً
      </div>

      <v-list v-else density="compact" class="bg-transparent pa-0">
        <v-list-item
          v-for="device in devices"
          :key="device.id"
          class="mb-2 pa-3 rounded-lg border border-gold border-opacity-10 glass-card"
        >
          <template #prepend>
            <LucideIcon
              :name="device.revoked_at ? 'laptop-minimal' : 'laptop'"
              :size="20"
              :class="device.revoked_at ? 'text-grey me-3' : 'text-primary me-3'"
            />
          </template>

          <v-list-item-title class="text-body-2 font-weight-black">
            {{ device.name }}
            <v-chip :color="device.revoked_at ? 'error' : 'success'" size="x-small" class="ms-2 font-weight-bold">
              {{ device.revoked_at ? 'ملغي الترخيص' : 'نشط' }}
            </v-chip>
          </v-list-item-title>

          <v-list-item-subtitle class="text-caption text-grey mt-1">
            <div>معرّف الجهاز: <span class="font-mono">{{ device.id.slice(0, 8) }}...</span></div>
            <div>تاريخ الإقران: {{ formatDate(device.paired_at) }}</div>
            <div v-if="device.last_seen_at">آخر ظهور: {{ formatDate(device.last_seen_at) }}</div>
          </v-list-item-subtitle>

          <template #append>
            <v-btn
              v-if="!device.revoked_at"
              color="error"
              variant="tonal"
              size="x-small"
              class="font-weight-black"
              :loading="revokingId === device.id"
              @click="revokeDevice(device.id)"
            >
              إلغاء الترخيص
            </v-btn>
          </template>
        </v-list-item>
      </v-list>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LucideIcon from '../../components/common/LucideIcon.vue'

interface DeviceItem {
  id: string
  name: string
  paired_at: string
  last_seen_at?: string
  revoked_at?: string
}

interface LatestBackupItem {
  export_id: string
  content_hash: string
  byte_size: number
  destination: string
  status: string
  last_verified_at: string
  created_at: string
}

const devices = ref<DeviceItem[]>([])
const latestBackup = ref<LatestBackupItem | null>(null)
const loading = ref(false)
const revokingId = ref<string | null>(null)

const formatDate = (isoStr?: string) => {
  if (!isoStr) return '—'
  try { return new Date(isoStr).toLocaleString('ar-SA') } catch { return isoStr }
}

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const loadData = async () => {
  loading.value = true
  try {
    const api = (window as any).api?.sync
    if (api?.getRegisteredDevices) {
      const res = await api.getRegisteredDevices()
      devices.value = res?.devices || []
    }
    if (api?.getLatestVerifiedBackup) {
      const bRes = await api.getLatestVerifiedBackup()
      latestBackup.value = bRes?.backup || null
    }
  } catch (err) {
    console.error('[DeviceManagement] Failed to load devices or backup state:', err)
  } finally {
    loading.value = false
  }
}

const revokeDevice = async (deviceId: string) => {
  if (!confirm('هل أنت متأكد من رغبتك في إلغاء ترخيص هذا الجهاز؟ سيتم حظر المزامنة منه فوراً.')) return
  revokingId.value = deviceId
  try {
    const api = (window as any).api?.sync
    if (api?.revokeDevice) {
      await api.revokeDevice(deviceId)
      await loadData()
    }
  } catch (err) {
    console.error('[DeviceManagement] Failed to revoke device:', err)
  } finally {
    revokingId.value = null
  }
}

onMounted(() => {
  loadData()
})
</script>
