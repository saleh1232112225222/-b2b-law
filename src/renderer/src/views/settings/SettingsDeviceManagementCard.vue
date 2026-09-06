<template>
  <v-card elevation="0" class="glass-card mb-4 border border-gold border-opacity-20 glass-card">
    <div class="pa-4 d-flex align-center border-b border-gold border-opacity-10">
      <LucideIcon name="laptop" :size="20" class="text-primary me-3" />
      <span class="text-subtitle-1 font-weight-black text-primary">إدارة الأجهزة وحالة النسخ الموثق</span>
      <v-spacer />
      <v-btn size="small" variant="flat" color="primary" class="font-weight-black me-2" :loading="pairingLoading" @click="openPairingDialog">
        <LucideIcon name="link" :size="14" class="me-1" /> بيانات إقران سطح المكتب
      </v-btn>
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

      <div v-if="activeDevices.length === 0 && revokedDevices.length === 0" class="text-center py-4 text-grey text-caption">
        لا توجد أجهزة مسجلة حالياً
      </div>

      <div v-else-if="activeDevices.length === 0" class="text-center py-3 text-grey text-caption">
        لا توجد أجهزة نشطة حالياً
      </div>

      <v-list v-if="activeDevices.length > 0" density="compact" class="bg-transparent pa-0">
        <v-list-item
          v-for="device in activeDevices"
          :key="device.id"
          class="mb-2 pa-3 rounded-lg border border-gold border-opacity-10 glass-card"
        >
          <template #prepend>
            <LucideIcon
              name="laptop"
              :size="20"
              class="text-primary me-3"
            />
          </template>

          <v-list-item-title class="text-body-2 font-weight-black">
            {{ device.name }}
            <v-chip color="success" size="x-small" class="ms-2 font-weight-bold">
              نشط
            </v-chip>
          </v-list-item-title>

          <v-list-item-subtitle class="text-caption text-grey mt-1">
            <div>معرّف الجهاز: <span class="font-mono">{{ device.id.slice(0, 8) }}...</span></div>
            <div>تاريخ الإقران: {{ formatDate(device.paired_at) }}</div>
            <div v-if="device.last_seen_at">آخر اتصال: {{ formatDate(device.last_seen_at) }}</div>
          </v-list-item-subtitle>

          <template #append>
            <v-btn
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

      <!-- Collapsible Revoked Devices -->
      <div v-if="revokedDevices.length > 0" class="mt-2">
        <v-btn
          variant="text"
          density="compact"
          size="small"
          color="grey-darken-1"
          class="text-caption px-2 font-weight-bold d-flex align-center"
          @click="showRevoked = !showRevoked"
        >
          <LucideIcon :name="showRevoked ? 'chevron-down' : 'chevron-left'" :size="14" class="me-1" />
          <span>الأجهزة ملغاة الترخيص ({{ revokedDevices.length }})</span>
        </v-btn>

        <v-expand-transition>
          <div v-if="showRevoked" class="mt-2">
            <v-list density="compact" class="bg-transparent pa-0">
              <v-list-item
                v-for="device in revokedDevices"
                :key="device.id"
                class="mb-2 pa-3 rounded-lg border border-gold border-opacity-10 glass-card opacity-60"
              >
                <template #prepend>
                  <LucideIcon
                    name="laptop-minimal"
                    :size="20"
                    class="text-grey me-3"
                  />
                </template>

                <v-list-item-title class="text-body-2 font-weight-black">
                  {{ device.name }}
                  <v-chip color="error" size="x-small" class="ms-2 font-weight-bold" variant="tonal">
                    ملغي الترخيص
                  </v-chip>
                </v-list-item-title>

                <v-list-item-subtitle class="text-caption text-grey mt-1">
                  <div>معرّف الجهاز: <span class="font-mono">{{ device.id.slice(0, 8) }}...</span></div>
                  <div>تاريخ الإقران: {{ formatDate(device.paired_at) }}</div>
                  <div v-if="device.last_seen_at">آخر اتصال: {{ formatDate(device.last_seen_at) }}</div>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>
        </v-expand-transition>
      </div>
    </v-card-text>

    <!-- Desktop Pairing Dialog -->
    <v-dialog v-model="showPairingDialog" max-width="560">
      <v-card class="glass-card border-gold border-2 pa-6">
        <div class="d-flex align-center mb-4">
          <LucideIcon name="laptop" :size="24" class="text-primary me-2" />
          <span class="text-h6 font-weight-black text-primary">بيانات إقران تطبيق سطح المكتب</span>
          <v-spacer />
          <v-btn icon variant="text" @click="showPairingDialog = false">
            <LucideIcon name="x" :size="20" />
          </v-btn>
        </div>

        <div class="text-caption text-grey mb-4">
          انسخ هذه البيانات وضعها في بطاقة <strong>«مزامنة المكتب الآمنة»</strong> بتطبيق سطح المكتب ثم اضغط <strong>«إقران الجهاز بأمان»</strong>:
        </div>

        <v-text-field
          label="عنوان خادم API"
          :model-value="pairingInfo.baseUrl"
          readonly
          variant="outlined"
          density="compact"
          class="mb-3 font-mono"
        >
          <template #append-inner>
            <v-btn size="x-small" variant="tonal" color="primary" @click="copyField(pairingInfo.baseUrl, 'عنوان الخادم')">
              نسخ
            </v-btn>
          </template>
        </v-text-field>

        <v-text-field
          label="معرّف المكتب (Tenant UUID)"
          :model-value="pairingInfo.tenantId"
          readonly
          variant="outlined"
          density="compact"
          class="mb-3 font-mono"
        >
          <template #append-inner>
            <v-btn size="x-small" variant="tonal" color="primary" @click="copyField(pairingInfo.tenantId, 'معرّف المكتب')">
              نسخ
            </v-btn>
          </template>
        </v-text-field>

        <v-text-field
          label="رمز الدخول المؤقت (Access Token)"
          :model-value="pairingInfo.accessToken"
          type="password"
          readonly
          variant="outlined"
          density="compact"
          class="mb-4 font-mono"
        >
          <template #append-inner>
            <v-btn size="x-small" variant="tonal" color="primary" @click="copyField(pairingInfo.accessToken, 'رمز الدخول')">
              نسخ
            </v-btn>
          </template>
        </v-text-field>

        <v-alert v-if="copiedMessage" type="success" variant="tonal" density="compact" class="mb-3">
          {{ copiedMessage }}
        </v-alert>

        <v-alert type="info" variant="tonal" density="compact" class="mb-4">
          بعد لصق معرّف المكتب ورمز الدخول في تطبيق سطح المكتب، اضغط على زر <strong>«إقران الجهاز بأمان»</strong> وسيتحول جهازك إلى «مقترن» بنجاح!
        </v-alert>

        <v-btn block color="primary" class="font-weight-black" @click="showPairingDialog = false">
          إغلاق النافذة
        </v-btn>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
const showRevoked = ref(false)
const activeDevices = computed(() => devices.value.filter((d) => !d.revoked_at))
const revokedDevices = computed(() => devices.value.filter((d) => Boolean(d.revoked_at)))


const showPairingDialog = ref(false)
const pairingLoading = ref(false)
const copiedMessage = ref('')
const pairingInfo = ref({
  baseUrl: 'https://b2b-law-g2qr.onrender.com/api',
  tenantId: '',
  accessToken: '',
  expiresAt: ''
})

const openPairingDialog = async () => {
  pairingLoading.value = true
  copiedMessage.value = ''
  try {
    const api = (window as any).api?.sync
    if (api?.getPairingInfo) {
      const res = await api.getPairingInfo()
      pairingInfo.value = {
        baseUrl: res?.baseUrl || 'https://b2b-law-g2qr.onrender.com/api',
        tenantId: res?.tenantId || '',
        accessToken: res?.accessToken || '',
        expiresAt: res?.expiresAt || ''
      }
    }
  } catch {
    const rawSession = localStorage.getItem('web_currentUserSession')
    let parsedTenant = ''
    try { parsedTenant = JSON.parse(rawSession || '{}')?.companyId || '' } catch {}
    pairingInfo.value = {
      baseUrl: 'https://b2b-law-g2qr.onrender.com/api',
      tenantId: parsedTenant,
      accessToken: localStorage.getItem('b2b_cloud_token') || localStorage.getItem('token') || '',
      expiresAt: ''
    }
  } finally {
    if (!pairingInfo.value.tenantId) {
      const rawSession = localStorage.getItem('web_currentUserSession')
      try { pairingInfo.value.tenantId = JSON.parse(rawSession || '{}')?.companyId || '' } catch {}
    }
    if (!pairingInfo.value.accessToken) {
      pairingInfo.value.accessToken = localStorage.getItem('b2b_cloud_token') || localStorage.getItem('token') || ''
    }
    pairingLoading.value = false
    showPairingDialog.value = true
  }
}

const copyField = async (text: string, label: string) => {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copiedMessage.value = `تم نسخ ${label} إلى الحافظة بنجاح!`
    setTimeout(() => { copiedMessage.value = '' }, 3000)
  } catch {
    copiedMessage.value = `تعذر النسخ التلقائي؛ يمكنك تحديد النص ونسخه يدوياً.`
  }
}

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
  window.addEventListener('backup-catalog-updated', loadData)
})

onUnmounted(() => {
  window.removeEventListener('backup-catalog-updated', loadData)
})
</script>
