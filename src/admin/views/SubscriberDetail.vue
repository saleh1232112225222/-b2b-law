<template>
  <v-container fluid class="pa-6 rtl">
    <!-- Loading -->
    <div v-if="loading" class="d-flex justify-center py-16">
      <v-progress-circular indeterminate color="gold" :size="48" />
    </div>

    <template v-else-if="subscriber">
      <!-- Back Button + Header -->
      <div class="d-flex align-center mb-6">
        <v-btn icon variant="text" class="me-3" @click="$router.back()">
          <v-icon icon="mdi-arrow-right" />
        </v-btn>
        <div>
          <h1 class="text-h5 font-weight-black text-ebony">
            {{ subscriber.company?.name || subscriber.user?.username }}
          </h1>
          <p class="text-body-2 text-grey-darken-1">تفاصيل المشترك وسجل النشاط</p>
        </div>
      </div>

      <!-- Stats Cards -->
      <v-row class="mb-6">
        <v-col v-for="stat in statsCards" :key="stat.label" cols="12" sm="6" md="4" lg="2">
          <v-card class="rounded-xl glass-card text-center pa-4" elevation="0">
            <v-avatar :color="stat.color" size="44" class="mb-2">
              <v-icon :icon="stat.icon" :size="22" color="white" />
            </v-avatar>
            <div class="text-h5 font-weight-black text-ebony">{{ stat.value }}</div>
            <div class="text-caption text-grey-darken-1">{{ stat.label }}</div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Account Info + Subscription -->
      <v-row class="mb-6">
        <v-col cols="12" md="6">
          <v-card class="rounded-xl glass-card" elevation="0">
            <div class="pa-5 border-b border-gold border-opacity-10 d-flex align-center">
              <v-avatar color="primary" size="36" class="me-3">
                <v-icon icon="mdi-account-circle" :size="20" />
              </v-avatar>
              <span class="text-h6 font-weight-black">معلومات الحساب</span>
            </div>
            <v-card-text class="pa-5">
              <v-list density="compact" class="bg-transparent">
                <v-list-item>
                  <template #prepend><v-icon icon="mdi-domain" class="me-2 text-gold" /></template>
                  <v-list-item-title class="font-weight-bold">اسم المشترك</v-list-item-title>
                  <v-list-item-subtitle>{{ subscriber.company?.name || '-' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <template #prepend><v-icon icon="mdi-account" class="me-2 text-gold" /></template>
                  <v-list-item-title class="font-weight-bold">اسم المستخدم</v-list-item-title>
                  <v-list-item-subtitle>{{ subscriber.user?.username }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <template #prepend><v-icon icon="mdi-email" class="me-2 text-gold" /></template>
                  <v-list-item-title class="font-weight-bold">البريد الإلكتروني</v-list-item-title>
                  <v-list-item-subtitle>{{
                    subscriber.company?.email || 'غير محدد'
                  }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <template #prepend><v-icon icon="mdi-phone" class="me-2 text-gold" /></template>
                  <v-list-item-title class="font-weight-bold">رقم الجوال</v-list-item-title>
                  <v-list-item-subtitle>{{
                    subscriber.company?.phone || 'غير محدد'
                  }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <template #prepend
                    ><v-icon icon="mdi-calendar-plus" class="me-2 text-gold"
                  /></template>
                  <v-list-item-title class="font-weight-bold">تاريخ الإنشاء</v-list-item-title>
                  <v-list-item-subtitle>{{
                    formatDate(subscriber.user?.createdAt)
                  }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <template #prepend
                    ><v-icon icon="mdi-shield-check" class="me-2 text-gold"
                  /></template>
                  <v-list-item-title class="font-weight-bold">حالة الحساب</v-list-item-title>
                  <v-list-item-subtitle>
                    <v-chip
                      :color="subscriber.user?.isActive ? 'success' : 'error'"
                      size="small"
                      variant="flat"
                    >
                      {{ subscriber.user?.isActive ? 'نشط' : 'معطل' }}
                    </v-chip>
                    <v-chip
                      v-if="subscriber.user?.mustChangePassword"
                      color="warning"
                      size="small"
                      variant="flat"
                      class="ms-1"
                    >
                      كلمة المرور مؤقتة
                    </v-chip>
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card class="rounded-xl glass-card" elevation="0">
            <div class="pa-5 border-b border-gold border-opacity-10 d-flex align-center">
              <v-avatar color="accent" size="36" class="me-3">
                <v-icon icon="mdi-card-account-details" :size="20" />
              </v-avatar>
              <span class="text-h6 font-weight-black">معلومات الاشتراك</span>
            </div>
            <v-card-text class="pa-5">
              <template v-if="subscriber.subscription">
                <v-list density="compact" class="bg-transparent">
                  <v-list-item>
                    <template #prepend><v-icon icon="mdi-tag" class="me-2 text-gold" /></template>
                    <v-list-item-title class="font-weight-bold">الخطة</v-list-item-title>
                    <v-list-item-subtitle>{{
                      subscriber.subscription.planName || 'تجربة'
                    }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <template #prepend><v-icon icon="mdi-cash" class="me-2 text-gold" /></template>
                    <v-list-item-title class="font-weight-bold">السعر</v-list-item-title>
                    <v-list-item-subtitle>{{
                      subscriber.subscription.price ? subscriber.subscription.price + ' ريال' : '-'
                    }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <template #prepend
                      ><v-icon icon="mdi-clock-start" class="me-2 text-gold"
                    /></template>
                    <v-list-item-title class="font-weight-bold">تاريخ البداية</v-list-item-title>
                    <v-list-item-subtitle>{{
                      formatDate(
                        subscriber.subscription.currentPeriodStart ||
                          subscriber.subscription.trialStart
                      )
                    }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <template #prepend
                      ><v-icon icon="mdi-clock-end" class="me-2 text-gold"
                    /></template>
                    <v-list-item-title class="font-weight-bold">تاريخ الانتهاء</v-list-item-title>
                    <v-list-item-subtitle>{{
                      formatDate(
                        subscriber.subscription.currentPeriodEnd || subscriber.subscription.trialEnd
                      )
                    }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <template #prepend
                      ><v-icon icon="mdi-calendar-clock" class="me-2 text-gold"
                    /></template>
                    <v-list-item-title class="font-weight-bold">الأيام المتبقية</v-list-item-title>
                    <v-list-item-subtitle>
                      <v-chip
                        :color="
                          subscriber.subscription.isExpired
                            ? 'error'
                            : subscriber.subscription.daysLeft <= 7
                              ? 'warning'
                              : 'success'
                        "
                        size="small"
                        variant="flat"
                      >
                        {{
                          subscriber.subscription.isExpired
                            ? 'منتهي'
                            : subscriber.subscription.daysLeft + ' يوم'
                        }}
                      </v-chip>
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <template #prepend
                      ><v-icon icon="mdi-information" class="me-2 text-gold"
                    /></template>
                    <v-list-item-title class="font-weight-bold">الحالة</v-list-item-title>
                    <v-list-item-subtitle>
                      <v-chip
                        :color="getStatusColor(subscriber.subscription.status)"
                        size="small"
                        variant="flat"
                      >
                        {{ getStatusText(subscriber.subscription.status) }}
                      </v-chip>
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </template>
              <v-alert v-else type="info" variant="tonal" class="rounded-lg">
                لا يوجد اشتراك مسجل
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Login Info -->
      <v-card class="rounded-xl glass-card mb-6" elevation="0">
        <div class="pa-5 border-b border-gold border-opacity-10 d-flex align-center">
          <v-avatar color="success" size="36" class="me-3">
            <v-icon icon="mdi-login" :size="20" />
          </v-avatar>
          <span class="text-h6 font-weight-black">سجل الدخول</span>
        </div>
        <v-card-text class="pa-5">
          <v-row>
            <v-col cols="12" sm="4">
              <div class="text-center pa-4 bg-grey-lighten-4 rounded-xl">
                <v-icon icon="mdi-clock-outline" :size="24" class="text-success mb-1" />
                <div class="text-body-2 text-grey-darken-1">آخر دخول</div>
                <div class="text-body-1 font-weight-black">
                  {{
                    subscriber.stats?.lastLogin
                      ? formatDateTime(subscriber.stats.lastLogin.login_time)
                      : 'لم يسجل دخول بعد'
                  }}
                </div>
                <div v-if="subscriber.stats?.lastLogin?.device_info" class="text-caption text-grey">
                  {{ subscriber.stats.lastLogin.device_info }} —
                  {{ subscriber.stats.lastLogin.browser_info }}
                </div>
              </div>
            </v-col>
            <v-col cols="12" sm="4">
              <div class="text-center pa-4 bg-grey-lighten-4 rounded-xl">
                <v-icon icon="mdi-clock-fast" :size="24" class="text-primary mb-1" />
                <div class="text-body-2 text-grey-darken-1">أول دخول</div>
                <div class="text-body-1 font-weight-black">
                  {{ subscriber.stats?.firstLogin ? formatDate(subscriber.stats.firstLogin) : '-' }}
                </div>
              </div>
            </v-col>
            <v-col cols="12" sm="4">
              <div class="text-center pa-4 bg-grey-lighten-4 rounded-xl">
                <v-icon icon="mdi-login-variant" :size="24" class="text-gold mb-1" />
                <div class="text-body-2 text-grey-darken-1">عدد مرات الدخول</div>
                <div class="text-h4 font-weight-black text-gold">
                  {{ subscriber.stats?.totalLogins || 0 }}
                </div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Tabs: Activity Logs / Login History / Failed Attempts -->
      <v-card class="rounded-xl glass-card" elevation="0">
        <v-tabs v-model="activeTab" color="gold" class="border-b border-gold border-opacity-10">
          <v-tab value="activity" prepend-icon="mdi-format-list-bulleted">سجل النشاطات</v-tab>
          <v-tab value="logins" prepend-icon="mdi-history">سجل الدخول</v-tab>
          <v-tab value="failed" prepend-icon="mdi-shield-alert">المحاولات الفاشلة</v-tab>
        </v-tabs>

        <v-card-text class="pa-0">
          <v-tabs-window v-model="activeTab">
            <!-- Activity Logs -->
            <v-tabs-window-item value="activity">
              <v-data-table
                :headers="activityHeaders"
                :items="activityLogs"
                :loading="loadingActivity"
                :items-per-page="10"
                density="comfortable"
                class="text-ebony"
              >
                <template #item.created_at="{ item }">
                  {{ formatDateTime(item.created_at) }}
                </template>
                <template #item.activity_type="{ item }">
                  <v-chip :color="getActivityColor(item.activity_type)" size="small" variant="flat">
                    {{ getActivityText(item.activity_type) }}
                  </v-chip>
                </template>
                <template #no-data>
                  <div class="text-center py-8 text-grey">لا توجد نشاطات مسجلة</div>
                </template>
              </v-data-table>
            </v-tabs-window-item>

            <!-- Login History -->
            <v-tabs-window-item value="logins">
              <v-data-table
                :headers="loginHeaders"
                :items="loginLogs"
                :loading="loadingLogins"
                :items-per-page="10"
                density="comfortable"
                class="text-ebony"
              >
                <template #item.login_time="{ item }">
                  {{ formatDateTime(item.login_time) }}
                </template>
                <template #item.logout_time="{ item }">
                  {{ item.logout_time ? formatDateTime(item.logout_time) : 'لم يسجل خروج' }}
                </template>
                <template #item.is_successful="{ item }">
                  <v-chip
                    :color="item.is_successful ? 'success' : 'error'"
                    size="small"
                    variant="flat"
                  >
                    {{ item.is_successful ? 'نجاح' : 'فشل' }}
                  </v-chip>
                </template>
                <template #no-data>
                  <div class="text-center py-8 text-grey">لا توجد سجلات دخول</div>
                </template>
              </v-data-table>
            </v-tabs-window-item>

            <!-- Failed Attempts -->
            <v-tabs-window-item value="failed">
              <v-data-table
                :headers="failedHeaders"
                :items="failedLogs"
                :loading="loadingFailed"
                :items-per-page="10"
                density="comfortable"
                class="text-ebony"
              >
                <template #item.login_time="{ item }">
                  {{ formatDateTime(item.login_time) }}
                </template>
                <template #item.failure_reason="{ item }">
                  <v-chip color="error" size="small" variant="tonal">
                    {{ item.failure_reason || 'غير محدد' }}
                  </v-chip>
                </template>
                <template #no-data>
                  <div class="text-center py-8 text-success">
                    <v-icon icon="mdi-shield-check" :size="40" class="mb-2" />
                    <div>لا توجد محاولات فاشلة — حساب آمن</div>
                  </div>
                </template>
              </v-data-table>
            </v-tabs-window-item>
          </v-tabs-window>
        </v-card-text>
      </v-card>
    </template>

    <!-- Not Found -->
    <v-alert v-else type="error" variant="tonal" class="mx-auto" style="max-width: 500px">
      المشترك غير موجود
    </v-alert>
  </v-container>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const userId = route.params.userId as string

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? ''
    : 'https://b2b-law-g2qr.onrender.com')

async function apiRequest(method, path) {
  const token = localStorage.getItem('b2b_cloud_token') || localStorage.getItem('token')
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

const loading = ref(true)
const subscriber = ref(null)
const activeTab = ref('activity')

const activityLogs = ref([])
const loginLogs = ref([])
const failedLogs = ref([])

const loadingActivity = ref(false)
const loadingLogins = ref(false)
const loadingFailed = ref(false)

const statsCards = computed(() => {
  const s = subscriber.value?.stats || {}
  return [
    { label: 'مرات الدخول', value: s.totalLogins || 0, icon: 'mdi-login', color: 'success' },
    {
      label: 'آخر دخول',
      value: s.lastLogin ? formatTime(s.lastLogin.login_time) : '-',
      icon: 'mdi-clock-outline',
      color: 'primary'
    },
    {
      label: 'محاولات فاشلة',
      value: s.totalFailedAttempts || 0,
      icon: 'mdi-shield-alert',
      color: 'error'
    },
    { label: 'الأجهزة', value: s.distinctDevices || 0, icon: 'mdi-devices', color: 'info' },
    {
      label: 'إجمالي النشاطات',
      value: s.totalActivities || 0,
      icon: 'mdi-format-list-bulleted',
      color: 'warning'
    }
  ]
})

const activityHeaders = [
  { title: 'التاريخ', key: 'created_at', sortable: true },
  { title: 'النوع', key: 'activity_type', sortable: true },
  { title: 'الوصف', key: 'activity_description', sortable: false }
]

const loginHeaders = [
  { title: 'وقت الدخول', key: 'login_time', sortable: true },
  { title: 'وقت الخروج', key: 'logout_time', sortable: true },
  { title: 'الحالة', key: 'is_successful', sortable: true },
  { title: 'IP', key: 'ip_address', sortable: false },
  { title: 'الجهاز', key: 'device_info', sortable: false },
  { title: 'المتصفح', key: 'browser_info', sortable: false }
]

const failedHeaders = [
  { title: 'التاريخ', key: 'login_time', sortable: true },
  { title: 'IP', key: 'ip_address', sortable: false },
  { title: 'السبب', key: 'failure_reason', sortable: false },
  { title: 'المتصفح', key: 'browser_info', sortable: false }
]

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatDateTime(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatTime(d) {
  if (!d) return '-'
  return new Date(d).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
}

function getStatusColor(status) {
  const map = {
    active: 'success',
    trial: 'info',
    expired: 'error',
    canceled: 'warning',
    lifetime: 'success'
  }
  return map[status] || 'grey'
}

function getStatusText(status) {
  const map = {
    active: 'نشط',
    trial: 'تجربة',
    expired: 'منتهي',
    canceled: 'ملغى',
    lifetime: 'مدى الحياة'
  }
  return map[status] || status
}

function getActivityColor(type) {
  if (type?.includes('LOGIN')) return type.includes('FAILED') ? 'error' : 'success'
  if (type?.includes('LOGOUT')) return 'warning'
  return 'info'
}

function getActivityText(type) {
  const map = {
    LOGIN_SUCCESS: 'دخول ناجح',
    LOGIN_FAILED: 'دخول فاشل',
    LOGOUT: 'خروج',
    CREATE: 'إنشاء',
    UPDATE: 'تعديل',
    DELETE: 'حذف'
  }
  return map[type] || type
}

async function fetchAll() {
  loading.value = true
  try {
    const overviewRes = await apiRequest('GET', `/api/admin/subscriber-tracking/${userId}/overview`)
    subscriber.value = overviewRes
  } catch (err) {
    console.error('Failed to fetch subscriber overview:', err)
  } finally {
    loading.value = false
  }

  loadingActivity.value = true
  loadingLogins.value = true
  loadingFailed.value = true

  const [activityRes, loginsRes] = await Promise.allSettled([
    apiRequest('GET', `/api/admin/subscriber-tracking/${userId}/activity-logs?limit=50`),
    apiRequest('GET', `/api/admin/subscriber-tracking/${userId}/login-logs?limit=50`)
  ])

  activityLogs.value = activityRes.status === 'fulfilled' ? activityRes.value.data || [] : []
  loginLogs.value = loginsRes.status === 'fulfilled' ? loginsRes.value.data || [] : []
  failedLogs.value = loginLogs.value.filter((l) => !l.is_successful)

  loadingActivity.value = false
  loadingLogins.value = false
  loadingFailed.value = false
}

onMounted(fetchAll)
</script>

<style scoped>
.rtl {
  direction: rtl;
}
.glass-card {
  background: var(--surface, #ffffff) !important;
  border: 1px solid var(--border, rgba(212, 175, 55, 0.12)) !important;
  color: var(--text-primary) !important;
}
</style>
