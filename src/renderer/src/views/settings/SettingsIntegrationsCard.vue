<template>
  <v-card variant="outlined" class="rounded-xl pa-5 bg-surface border mb-6" dir="rtl">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-5">
      <div class="d-flex align-center gap-3">
        <div class="icon-header-bg">
          <LucideIcon name="cpu" :size="24" class="text-primary" />
        </div>
        <div>
          <h3 class="text-h6 font-weight-black d-flex align-center gap-2">
            التكامل والربط الخارجي (OpenConnector)
            <v-chip size="x-small" color="primary" variant="flat" class="font-weight-bold">
              Open-Source Gateway
            </v-chip>
          </h3>
          <p class="text-caption text-medium-emphasis mb-0">
            ربط ومزامنة مكتبك القانوني بأمان مع خدمات التقويم، البريد، بوابة الواتساب والتخزين
            السحابي
          </p>
        </div>
      </div>

      <div class="d-flex align-center gap-2">
        <v-btn
          color="primary"
          variant="outlined"
          size="small"
          class="rounded-lg font-weight-bold"
          :loading="integrationsStore.syncing"
          @click="handleSyncAll"
        >
          <LucideIcon name="refresh-cw" :size="14" class="me-1" />
          مزامنة الكل الآن
        </v-btn>
      </div>
    </div>

    <!-- Alert / Status message -->
    <v-alert
      v-if="integrationsStore.error"
      type="error"
      variant="tonal"
      closable
      class="mb-4 rounded-lg"
    >
      {{ integrationsStore.error }}
    </v-alert>

    <!-- Connectors Grid -->
    <v-row dense>
      <v-col
        v-for="item in integrationsStore.integrations"
        :key="item.id"
        cols="12"
        md="6"
        class="pa-2"
      >
        <div
          class="connector-card pa-4 rounded-xl border d-flex flex-column justify-space-between h-100"
          :class="item.status === 'connected' ? 'connected-border' : ''"
        >
          <div>
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="d-flex align-center gap-3">
                <div
                  class="connector-icon-wrapper rounded-lg d-flex align-center justify-center pa-2"
                  :class="item.status === 'connected' ? 'bg-primary-light' : 'bg-surface-variant'"
                >
                  <LucideIcon
                    :name="item.icon"
                    :size="22"
                    :class="item.status === 'connected' ? 'text-primary' : 'text-medium-emphasis'"
                  />
                </div>
                <div>
                  <h4 class="text-subtitle-1 font-weight-black mb-0">{{ item.name }}</h4>
                  <span class="text-caption text-secondary font-weight-bold">{{
                    item.provider
                  }}</span>
                </div>
              </div>

              <!-- Status Badge -->
              <v-chip
                size="small"
                :color="item.status === 'connected' ? 'success' : 'default'"
                variant="tonal"
                class="font-weight-bold"
              >
                <span
                  class="status-dot me-1"
                  :class="item.status === 'connected' ? 'dot-active' : 'dot-inactive'"
                ></span>
                {{ item.status === 'connected' ? 'متصل ومفعل' : 'غير متصل' }}
              </v-chip>
            </div>

            <p class="text-caption text-medium-emphasis mb-3 line-clamp-2">
              {{ item.description }}
            </p>
          </div>

          <div class="d-flex align-center justify-space-between pt-3 border-top mt-2">
            <span class="text-caption text-medium-emphasis">
              <span v-if="item.last_sync_at">آخر مزامنة: {{ formatDate(item.last_sync_at) }}</span>
              <span v-else>لم تتم المزامنة بعد</span>
            </span>

            <div class="d-flex align-center gap-2">
              <v-btn
                v-if="item.status === 'connected'"
                color="error"
                variant="text"
                size="small"
                class="rounded-lg font-weight-bold"
                :loading="actionLoading === item.id"
                @click="toggleConnect(item)"
              >
                إلغاء الربط
              </v-btn>

              <v-btn
                v-else
                color="primary"
                variant="flat"
                size="small"
                class="rounded-lg font-weight-bold"
                :loading="actionLoading === item.id"
                @click="toggleConnect(item)"
              >
                <LucideIcon name="link" :size="14" class="me-1" />
                ربط الحساب
              </v-btn>
            </div>
          </div>
        </div>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useIntegrationsStore, IntegrationService } from '../../stores/integrations'
import LucideIcon from '../../components/common/LucideIcon.vue'

const integrationsStore = useIntegrationsStore()
const actionLoading = ref<string | null>(null)

onMounted(() => {
  integrationsStore.fetchStatus()
})

async function toggleConnect(item: IntegrationService) {
  actionLoading.value = item.id
  if (item.status === 'connected') {
    await integrationsStore.disconnectService(item.id)
  } else {
    await integrationsStore.connectService(item.id, { autoSync: true })
  }
  actionLoading.value = null
}

async function handleSyncAll() {
  await integrationsStore.triggerSync()
}

function formatDate(isoStr: string | null) {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    return d.toLocaleDateString('ar-SA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (e) {
    return isoStr
  }
}
</script>

<style scoped>
.icon-header-bg {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background-color: #f0fdf4;
  display: flex;
  align-items: center;
  justify-content: center;
}
.connector-card {
  background-color: #ffffff;
  transition: all 0.2s ease-in-out;
}
.connector-card:hover {
  border-color: #3b82f6 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
.connected-border {
  border-color: #10b981 !important;
  background-color: #fafdfb;
}
.bg-primary-light {
  background-color: #e0f2fe;
}
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}
.dot-active {
  background-color: #10b981;
}
.dot-inactive {
  background-color: #9ca3af;
}
.border-top {
  border-top: 1px solid #f3f4f6;
}
</style>
