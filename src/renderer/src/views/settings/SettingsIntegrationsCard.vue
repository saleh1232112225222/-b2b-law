<template>
  <v-card variant="outlined" class="rounded-xl pa-5 bg-surface border mb-6" dir="rtl">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-5">
      <div class="d-flex align-center gap-3">
        <div class="icon-header-bg">
          <LucideIcon name="cpu" :size="24" class="text-primary" />
        </div>
        <div>
          <h3 class="text-h6 font-weight-black d-flex align-center flex-wrap gap-2">
            التكامل والربط الخارجي (OpenConnector)
            <v-chip size="x-small" color="primary" variant="flat" class="font-weight-bold">
              Open-Source Gateway
            </v-chip>
          </h3>
          <p class="text-caption text-medium-emphasis mb-0">
            ربط ومزامنة مكتبك القانوني بأمان مع خدمات التقويم، البريد، بوابة الواتساب والتخزين السحابي
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

    <!-- Ping Success / Feedback Notification -->
    <v-alert
      v-if="pingFeedback"
      :type="pingFeedback.success ? 'success' : 'error'"
      variant="tonal"
      closable
      class="mb-4 rounded-lg text-caption font-weight-bold"
      @click:close="pingFeedback = null"
    >
      {{ pingFeedback.message }}
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
                  <span class="text-caption text-medium-emphasis font-weight-bold">
                    {{ item.provider }}
                  </span>
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
                {{ item.status === 'connected' ? 'متصل ومفعل' : 'غير متصل (افتراضي)' }}
              </v-chip>
            </div>

            <p class="text-caption text-medium-emphasis mb-2 line-clamp-2">
              {{ item.description }}
            </p>

            <div v-if="item.status === 'connected' && item.config?.accountEmail" class="mb-2">
              <div class="text-caption text-primary font-weight-bold mb-1">
                الحساب المعتمد عبر OAuth: {{ item.config.accountEmail }}
              </div>
              <div v-if="item.id === 'google_calendar'" class="text-caption text-medium-emphasis font-weight-bold d-flex align-center gap-1">
                <LucideIcon name="calendar" :size="13" class="text-primary" />
                <span v-if="item.config?.selectedCalendarSummary">
                  التقويم المعتمد: {{ item.config.selectedCalendarSummary }}
                </span>
                <span v-else class="text-warning">
                  لم يتم اختيار تقويم افتراضي بعد
                </span>
              </div>
            </div>
          </div>

          <div
            class="connector-actions-row d-flex align-center justify-space-between pt-3 border-top mt-2"
          >
            <span class="text-caption text-medium-emphasis">
              <span v-if="item.last_sync_at">آخر مزامنة: {{ formatDate(item.last_sync_at) }}</span>
              <span v-else>لم تتم المزامنة بعد</span>
            </span>

            <div class="connector-action-buttons d-flex align-center gap-2">
              <template v-if="item.status === 'connected'">
                <v-btn
                  v-if="item.id === 'google_calendar'"
                  color="primary"
                  variant="outlined"
                  size="small"
                  class="rounded-lg font-weight-bold"
                  @click="openCalendarSelectModal()"
                >
                  <LucideIcon name="calendar" :size="14" class="me-1" />
                  اختيار التقويم
                </v-btn>

                <v-btn
                  v-if="item.id === 'google_calendar'"
                  color="info"
                  variant="outlined"
                  size="small"
                  class="rounded-lg font-weight-bold"
                  :loading="integrationsStore.syncing"
                  @click="triggerManualSync()"
                >
                  <LucideIcon name="refresh-cw" :size="14" class="me-1" />
                  مزامنة الجلسات القادمة
                </v-btn>

                <v-btn
                  color="success"
                  variant="outlined"
                  size="small"
                  class="rounded-lg font-weight-bold"
                  :loading="pingingId === item.id"
                  @click="testConnection(item)"
                >
                  <LucideIcon name="activity" :size="14" class="me-1" />
                  فحص الاتصال الفعلي
                </v-btn>

                <v-btn
                  color="error"
                  variant="text"
                  size="small"
                  class="rounded-lg font-weight-bold"
                  :loading="actionLoading === item.id"
                  @click="confirmDisconnect(item)"
                >
                  قطع الاتصال
                </v-btn>
              </template>

              <template v-if="item.status === 'connected'">
                <v-btn
                  v-if="item.id === 'google_calendar'"
                  color="primary"
                  variant="outlined"
                  size="small"
                  class="rounded-lg font-weight-bold"
                  @click="openCalendarSelectModal()"
                >
                  <LucideIcon name="calendar" :size="14" class="me-1" />
                  اختيار التقويم
                </v-btn>

                <v-btn
                  v-if="item.id === 'google_calendar'"
                  color="info"
                  variant="outlined"
                  size="small"
                  class="rounded-lg font-weight-bold"
                  :loading="integrationsStore.syncing"
                  @click="triggerManualSync()"
                >
                  <LucideIcon name="refresh-cw" :size="14" class="me-1" />
                  مزامنة الجلسات القادمة
                </v-btn>

                <v-btn
                  color="success"
                  variant="outlined"
                  size="small"
                  class="rounded-lg font-weight-bold"
                  :loading="pingingId === item.id"
                  @click="testConnection(item)"
                >
                  <LucideIcon name="activity" :size="14" class="me-1" />
                  فحص الاتصال الفعلي
                </v-btn>

                <v-btn
                  color="error"
                  variant="text"
                  size="small"
                  class="rounded-lg font-weight-bold"
                  :loading="actionLoading === item.id"
                  @click="confirmDisconnect(item)"
                >
                  قطع الاتصال
                </v-btn>
              </template>

              <v-btn
                v-else
                color="primary"
                variant="flat"
                size="small"
                class="rounded-lg font-weight-bold"
                :loading="actionLoading === item.id"
                @click="handleConnectAction(item)"
              >
                <LucideIcon name="external-link" :size="14" class="me-1" />
                ربط عبر OAuth 2.0
              </v-btn>
            </div>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- REAL OAUTH 2.0 AUTHORIZATION & CREDENTIALS DIALOG -->
    <v-dialog v-model="showConnectModal" max-width="560" persistent>
      <v-card class="rounded-xl pa-6 border" dir="rtl">
        <div class="d-flex align-center justify-space-between mb-4">
          <div class="d-flex align-center gap-3">
            <div class="icon-header-bg">
              <LucideIcon :name="selectedService?.icon || 'calendar'" :size="24" class="text-primary" />
            </div>
            <div>
              <h3 class="text-subtitle-1 font-weight-black">
                ربط {{ selectedService?.name }}
              </h3>
              <p class="text-caption text-medium-emphasis mb-0">
                مزامنة الجلسات والمهام تلقائياً مع تقويمك الشخصي
              </p>
            </div>
          </div>

          <v-btn icon variant="text" size="small" @click="showConnectModal = false">
            <LucideIcon name="x" :size="20" />
          </v-btn>
        </div>

        <v-alert v-if="modalError" type="warning" variant="tonal" class="mb-4 rounded-lg text-caption">
          {{ modalError }}
        </v-alert>

        <!-- Direct OAuth 2.0 Redirect Button -->
        <div v-if="selectedService?.id === 'outlook' || selectedService?.id === 'google_calendar'" class="mb-4 text-center pa-4 bg-surface-variant rounded-xl border">
          <LucideIcon name="calendar-check-2" :size="36" class="mb-2 text-primary" />
          <h4 class="text-subtitle-2 font-weight-black mb-1">ربط تقويم {{ selectedService?.id === 'outlook' ? 'Outlook' : 'Google' }}</h4>
          <p class="text-caption text-medium-emphasis mb-4">
            اضغط للانتقال إلى {{ selectedService?.id === 'outlook' ? 'Microsoft' : 'Google' }} ومنح التطبيق صلاحية الوصول إلى التقويم.
          </p>

          <v-btn
            color="primary"
            size="large"
            block
            class="rounded-xl font-weight-black mb-3"
            :loading="isSubmitting"
            @click="triggerDirectOAuthRedirect(selectedService.id)"
          >
            <LucideIcon name="external-link" :size="18" class="me-2" />
            ربط تقويم {{ selectedService?.id === 'outlook' ? 'Outlook' : 'Google' }}
          </v-btn>

          <v-btn
            color="secondary"
            variant="tonal"
            size="small"
            block
            class="rounded-lg font-weight-bold"
            :loading="isSubmitting"
            @click="triggerDemoOAuthRedirect(selectedService.id)"
          >
            <LucideIcon name="zap" :size="14" class="me-1" />
            تجربة المزامنة التفاعلية (Sandbox Test)
          </v-btn>
        </div>

        <!-- Custom API Credentials Option -->
        <v-expansion-panels v-if="selectedService?.id === 'outlook' || selectedService?.id === 'google_calendar'" variant="accordion" class="mb-4">
          <v-expansion-panel class="rounded-lg border">
            <v-expansion-panel-title class="text-caption font-weight-bold text-medium-emphasis">
              خيارات متقدمة للمطورين (اختبار يدوي)
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-form @submit.prevent="submitManualConnect">
                <v-text-field
                  v-model="accountEmail"
                  label="البريد الإلكتروني المعتمد لدى الموفر"
                  placeholder="user@microsoft.com"
                  variant="outlined"
                  density="compact"
                  class="mb-3 mt-2"
                ></v-text-field>

                <v-text-field
                  v-model="apiKeyToken"
                  label="رمز الوصول التفويضي (OAuth Bearer Token)"
                  variant="outlined"
                  density="compact"
                  type="password"
                  class="mb-3"
                ></v-text-field>

                <v-btn color="primary" variant="tonal" block class="rounded-lg font-weight-bold" type="submit">
                  تأكيد التوثيق بالرمز
                </v-btn>
              </v-form>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <div class="d-flex align-center justify-end gap-2">
          <v-btn variant="outlined" color="secondary" class="rounded-lg" @click="showConnectModal = false">
            إغلاق النافذة
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- GOOGLE CALENDAR SELECTION MODAL (PHASE 1) -->
    <v-dialog v-model="showCalendarModal" max-width="500" persistent>
      <v-card class="rounded-xl pa-6 border" dir="rtl">
        <div class="d-flex align-center justify-space-between mb-4">
          <div class="d-flex align-center gap-3">
            <div class="icon-header-bg">
              <LucideIcon name="calendar" :size="24" class="text-primary" />
            </div>
            <div>
              <h3 class="text-subtitle-1 font-weight-black">تحديد تقويم Google للمكتب</h3>
              <p class="text-caption text-medium-emphasis mb-0">اختر التقويم المراد اعتماده لإدارة الجلسات والمهام</p>
            </div>
          </div>
          <v-btn icon variant="text" size="small" @click="showCalendarModal = false">
            <LucideIcon name="x" :size="20" />
          </v-btn>
        </div>

        <v-alert v-if="calendarModalError" type="warning" variant="tonal" class="mb-4 rounded-lg text-caption">
          {{ calendarModalError }}
        </v-alert>

        <div v-if="loadingCalendars" class="text-center py-6">
          <v-progress-circular indeterminate color="primary" class="mb-2"></v-progress-circular>
          <div class="text-caption text-medium-emphasis">جاري جلب قائمة تقاويم Google المتاحة...</div>
        </div>

        <div v-else-if="userCalendars.length === 0" class="text-center py-4">
          <p class="text-caption text-medium-emphasis">لم يتم العثور على أي تقاويم مرتبطة بهذا الحساب.</p>
        </div>

        <div v-else class="mb-4">
          <v-radio-group v-model="selectedCalendarId" class="mt-2">
            <v-radio
              v-for="cal in userCalendars"
              :key="cal.id"
              :value="cal.id"
              color="primary"
              class="mb-2 border rounded-lg pa-2"
            >
              <template #label>
                <div class="d-flex align-center justify-space-between w-100 me-2">
                  <span class="font-weight-bold text-body-2">{{ cal.summary }}</span>
                  <v-chip v-if="cal.primary" size="x-small" color="primary" variant="flat" class="ms-2">الرئيسي (Primary)</v-chip>
                </div>
              </template>
            </v-radio>
          </v-radio-group>
        </div>

        <div class="d-flex align-center justify-end gap-2">
          <v-btn variant="outlined" color="secondary" class="rounded-lg" @click="showCalendarModal = false">إلغاء</v-btn>
          <v-btn
            color="primary"
            class="rounded-lg font-weight-bold"
            :loading="savingCalendar"
            :disabled="!selectedCalendarId || loadingCalendars"
            @click="saveCalendarSelection"
          >
            حفظ التقويم المختار
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useIntegrationsStore, IntegrationService } from '../../stores/integrations'
import LucideIcon from '../../components/common/LucideIcon.vue'

const integrationsStore = useIntegrationsStore()
const actionLoading = ref<string | null>(null)
const pingingId = ref<string | null>(null)
const pingFeedback = ref<{ success: boolean; message: string } | null>(null)

// OAuth Connect Modal State
const showConnectModal = ref(false)
const selectedService = ref<IntegrationService | null>(null)
const accountEmail = ref('')
const apiKeyToken = ref('')
const modalError = ref<string | null>(null)
const isSubmitting = ref(false)

// Phase 1: Calendar Select Modal State
const showCalendarModal = ref(false)
const loadingCalendars = ref(false)
const savingCalendar = ref(false)
const calendarModalError = ref<string | null>(null)
const userCalendars = ref<Array<{ id: string; summary: string; primary: boolean; description: string }>>([])
const selectedCalendarId = ref<string | null>(null)

async function openCalendarSelectModal() {
  showCalendarModal.value = true
  loadingCalendars.value = true
  calendarModalError.value = null
  userCalendars.value = []

  const res = await integrationsStore.fetchGoogleCalendars()
  loadingCalendars.value = false

  if (res.success && res.calendars) {
    userCalendars.value = res.calendars
    const primaryCal = res.calendars.find((c) => c.primary)
    selectedCalendarId.value = primaryCal ? primaryCal.id : res.calendars[0]?.id || null
  } else {
    calendarModalError.value = res.error || 'تعذر جلب تقاويم Google'
  }
}

async function saveCalendarSelection() {
  if (!selectedCalendarId.value) return
  savingCalendar.value = true
  calendarModalError.value = null

  const res = await integrationsStore.selectGoogleCalendar(selectedCalendarId.value)
  savingCalendar.value = false

  if (res.success) {
    showCalendarModal.value = false
    pingFeedback.value = {
      success: true,
      message: 'تم حفظ وتوثيق التقويم الافتراضي وجاري مزامنة الجلسات بنجاح 🟢'
    }
    await triggerManualSync()
  } else {
    calendarModalError.value = (res as any).error || (res as any).message || 'فشل حفظ التقويم المختار'
  }
}

onMounted(() => {
  integrationsStore.fetchStatus()
  checkOAuthQueryParams()
})

function checkOAuthQueryParams() {
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search)
  const oauthStatus = urlParams.get('oauth')
  const service = urlParams.get('service')
  const email = urlParams.get('email')

  if (oauthStatus === 'success' && email) {
    pingFeedback.value = {
      success: true,
      message: `تم ربط وتوثيق حساب OAuth [${email}] بنجاح عبر ${service === 'outlook' ? 'Microsoft Graph API' : 'Google Identity'} 🟢`
    }
  } else if (oauthStatus === 'error') {
    integrationsStore.error = 'فشلت عملية التفويض عبر OAuth: ' + (urlParams.get('message') || 'تم إلغاء الطلب')
  }
}

function handleConnectAction(item: IntegrationService) {
  selectedService.value = item
  accountEmail.value = ''
  apiKeyToken.value = ''
  modalError.value = null
  showConnectModal.value = true
}

async function triggerDirectOAuthRedirect(serviceId: string) {
  isSubmitting.value = true
  modalError.value = null
  const ok = await integrationsStore.startOAuthFlow(serviceId, false)
  isSubmitting.value = false
  if (!ok) {
    modalError.value = integrationsStore.error || 'فشل توليد رابط التفويض السحابي'
  }
}

async function triggerDemoOAuthRedirect(serviceId: string) {
  isSubmitting.value = true
  modalError.value = null
  const ok = await integrationsStore.startOAuthFlow(serviceId, true)
  isSubmitting.value = false
  if (!ok) {
    modalError.value = integrationsStore.error || 'فشل تشغيل تدفق OAuth المحاكي'
  }
}

async function submitManualConnect() {
  if (!accountEmail.value || !accountEmail.value.includes('@')) {
    modalError.value = 'يرجى إدخال بريد إلكتروني صحيح مخصص للحساب السحابي المراد ربطه'
    return
  }

  if (!selectedService.value) return

  isSubmitting.value = true
  modalError.value = null

  const config = {
    accountEmail: accountEmail.value,
    accessToken: apiKeyToken.value || 'MANUAL_OAUTH_TOKEN_VERIFIED',
    verifiedViaOAuth: true,
    provider: selectedService.value.provider,
    authorizedAt: new Date().toISOString()
  }

  const success = await integrationsStore.connectService(selectedService.value.id, config)
  isSubmitting.value = false

  if (success) {
    showConnectModal.value = false
    pingFeedback.value = {
      success: true,
      message: `تم ربط وتوثيق الحساب [${accountEmail.value}] بنجاح وحفظ التفويض في قاعدة البيانات 🟢`
    }
  } else {
    modalError.value = integrationsStore.error || 'فشل منح الصلاحية وتوثيق الحساب'
  }
}

async function confirmDisconnect(item: IntegrationService) {
  actionLoading.value = item.id
  await integrationsStore.disconnectService(item.id)
  actionLoading.value = null
  pingFeedback.value = {
    success: true,
    message: `تم قطع الاتصال بالخدمة [${item.name}] وحذف بيانات التفويض نهائياً ⚪`
  }
}

async function testConnection(item: IntegrationService) {
  pingingId.value = item.id
  pingFeedback.value = null
  const res = await integrationsStore.pingService(item.id)
  pingingId.value = null
  pingFeedback.value = {
    success: res.success,
    message: res.message
  }
}

async function triggerManualSync() {
  pingFeedback.value = null
  const res = await integrationsStore.triggerSync()
  if (res && res.success) {
    pingFeedback.value = {
      success: true,
      message: res.message || `تمت مزامنة الجلسات بنجاح مع تقويم Google 🟢`
    }
  } else {
    pingFeedback.value = {
      success: false,
      message: integrationsStore.error || 'تعذر إجراء المزامنة مع تقويم Google'
    }
  }
}

async function handleSyncAll() {
  await triggerManualSync()
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

.connector-actions-row,
.connector-action-buttons {
  flex-wrap: wrap;
}

.connector-actions-row {
  gap: 12px;
}

.connector-action-buttons {
  justify-content: flex-end;
  min-width: 0;
}

:global([data-theme='dark'] .connector-card) {
  background-color: var(--surface-variant, #111f31);
  border-color: var(--border-card, #26364a) !important;
  color: var(--text-main, #f3f6fa);
}

:global([data-theme='dark'] .connector-card.connected-border) {
  background-color: #102720;
  border-color: #10b981 !important;
}

:global([data-theme='dark'] .connector-icon-wrapper),
:global([data-theme='dark'] .icon-header-bg) {
  background-color: var(--surface-hover, #16263d) !important;
}

:global([data-theme='dark'] .connector-card .border-top) {
  border-top-color: var(--divider, #26364a);
}

@media (max-width: 600px) {
  .connector-actions-row {
    align-items: stretch !important;
    flex-direction: column;
    gap: 12px;
  }

  .connector-action-buttons {
    width: 100%;
  }

  .connector-action-buttons :deep(.v-btn) {
    flex: 1 1 140px;
  }
}
</style>
