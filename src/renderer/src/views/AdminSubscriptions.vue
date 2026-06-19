<template>
  <v-container fluid class="pa-6 rtl">
    <!-- Page Header -->
    <v-row dense class="mb-6 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="bg-white pa-4 rounded-xl me-5 border-gold-alpha">
            <LucideIcon name="crown" :size="36" class="text-gold" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-pure-black mb-1">إدارة الاشتراكات</h1>
            <p class="text-subtitle-1 text-pure-black font-weight-black">
              إدارة اشتراكات العملاء وتفعيل الخطط
            </p>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Stats Cards -->
    <v-row dense class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="0" class="bg-white pa-5 rounded-xl border-gold-alpha">
          <div class="d-flex align-center">
            <div class="pa-3 rounded-lg me-4" style="background: rgba(76, 175, 80, 0.1)">
              <LucideIcon name="shield-check" :size="28" class="text-success" />
            </div>
            <div>
              <div class="text-caption text-grey-darken-1 mb-1">اشتراكات نشطة</div>
              <div class="text-h4 font-weight-black text-success">{{ stats.activeCount }}</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="0" class="bg-white pa-5 rounded-xl border-gold-alpha">
          <div class="d-flex align-center">
            <div class="pa-3 rounded-lg me-4" style="background: rgba(33, 150, 243, 0.1)">
              <LucideIcon name="clock" :size="28" class="text-info" />
            </div>
            <div>
              <div class="text-caption text-grey-darken-1 mb-1">اشتراكات تجريبية</div>
              <div class="text-h4 font-weight-black text-info">{{ stats.trialCount }}</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="0" class="bg-white pa-5 rounded-xl border-gold-alpha">
          <div class="d-flex align-center">
            <div class="pa-3 rounded-lg me-4" style="background: rgba(255, 152, 0, 0.1)">
              <LucideIcon name="alert-triangle" :size="28" class="text-warning" />
            </div>
            <div>
              <div class="text-caption text-grey-darken-1 mb-1">اشتراكات منتهية</div>
              <div class="text-h4 font-weight-black text-warning">{{ stats.expiredCount }}</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="0" class="bg-white pa-5 rounded-xl border-gold-alpha">
          <div class="d-flex align-center">
            <div class="pa-3 rounded-lg me-4" style="background: rgba(158, 158, 158, 0.1)">
              <LucideIcon name="users" :size="28" class="text-grey" />
            </div>
            <div>
              <div class="text-caption text-grey-darken-1 mb-1">إجمالي العملاء</div>
              <div class="text-h4 font-weight-black text-grey-darken-1">{{ stats.totalCustomers }}</div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Loading -->
    <v-row v-if="loading" class="justify-center py-12">
      <v-progress-circular indeterminate color="gold" :size="48" />
    </v-row>

    <!-- Data Table -->
    <v-card v-else elevation="0" class="bg-white rounded-xl border-gold-alpha overflow-hidden">
      <div class="pa-4 px-6 bg-gold-gradient d-flex align-center">
        <LucideIcon name="list" :size="22" class="me-3 text-ebony" />
        <span class="text-h6 font-weight-black text-ebony">قائمة الاشتراكات</span>
        <v-spacer />
        <v-btn
          variant="text"
          icon
          color="ebony"
          @click="fetchData"
        >
          <LucideIcon name="refresh-cw" :size="20" />
        </v-btn>
      </div>

      <v-table class="glass-table">
        <thead>
          <tr>
            <th class="font-weight-black text-body-2">الشركة</th>
            <th class="font-weight-black text-body-2">الحالة</th>
            <th class="font-weight-black text-body-2">الخطة</th>
            <th class="font-weight-black text-body-2">الأيام المتبقية</th>
            <th class="font-weight-black text-body-2">تاريخ الانتهاء</th>
            <th class="font-weight-black text-body-2 text-center">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sub in subscriptions" :key="sub.companyId">
            <td>
              <div class="d-flex align-center py-2">
                <v-avatar size="40" color="gold" class="me-3">
                  <span class="text-white font-weight-black text-h6">{{ getInitial(sub.companyName) }}</span>
                </v-avatar>
                <div>
                  <div class="text-body-2 font-weight-black text-pure-black">{{ sub.companyName }}</div>
                  <div class="text-caption text-grey-darken-1">{{ sub.email || '-' }}</div>
                </div>
              </div>
            </td>
            <td>
              <v-chip
                :color="getStatusColor(sub.status)"
                size="small"
                variant="elevated"
                class="font-weight-black"
              >
                {{ getStatusText(sub.status) }}
              </v-chip>
            </td>
            <td>
              <span class="text-body-2 font-weight-black">{{ sub.planName || '-' }}</span>
            </td>
            <td>
              <v-chip
                v-if="sub.daysRemaining !== undefined && sub.daysRemaining !== null"
                :color="sub.daysRemaining <= 0 ? 'error' : sub.daysRemaining <= 7 ? 'warning' : 'success'"
                size="small"
                variant="tonal"
                class="font-weight-black"
              >
                {{ sub.daysRemaining <= 0 ? 'منتهي' : sub.daysRemaining + ' يوم' }}
              </v-chip>
              <span v-else class="text-body-2 text-grey">-</span>
            </td>
            <td>
              <span class="text-body-2">{{ sub.expiryDate ? formatDate(sub.expiryDate) : '-' }}</span>
            </td>
            <td>
              <div class="d-flex align-center justify-center" style="gap: 4px">
                <v-btn
                  icon
                  variant="text"
                  size="small"
                  color="success"
                  title="تفعيل"
                  @click="openActivateDialog(sub)"
                >
                  <LucideIcon name="check-circle" :size="18" />
                </v-btn>
                <v-btn
                  icon
                  variant="text"
                  size="small"
                  color="info"
                  title="تمديد"
                  @click="openExtendDialog(sub)"
                >
                  <LucideIcon name="calendar-plus" :size="18" />
                </v-btn>
                <v-btn
                  icon
                  variant="text"
                  size="small"
                  color="warning"
                  title="إيقاف"
                  @click="suspendSubscription(sub)"
                >
                  <LucideIcon name="pause-circle" :size="18" />
                </v-btn>
                <v-btn
                  icon
                  variant="text"
                  size="small"
                  color="error"
                  title="إلغاء"
                  @click="cancelSubscription(sub)"
                >
                  <LucideIcon name="x-circle" :size="18" />
                </v-btn>
              </div>
            </td>
          </tr>
          <tr v-if="!subscriptions.length">
            <td colspan="6" class="text-center py-8">
              <div class="text-grey">
                <LucideIcon name="inbox" :size="48" class="mb-3" />
                <div class="text-body-1 font-weight-black">لا توجد اشتراكات</div>
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Activate Dialog -->
    <v-dialog v-model="activateDialog.show" max-width="520" persistent>
      <v-card class="rounded-xl">
        <div class="pa-5 bg-gold-gradient d-flex align-center">
          <LucideIcon name="shield-check" :size="24" class="me-3 text-ebony" />
          <span class="text-h6 font-weight-black text-ebony">تفعيل اشتراك</span>
          <v-spacer />
          <v-btn icon variant="text" color="ebony" @click="activateDialog.show = false">
            <LucideIcon name="x" :size="22" />
          </v-btn>
        </div>

        <v-card-text class="pa-6 rtl">
          <div class="text-body-1 font-weight-black mb-4">
            الشركة: {{ activateDialog.companyName }}
          </div>

          <v-select
            v-model="activateDialog.planId"
            :items="plans"
            item-title="name_ar"
            item-value="id"
            label="اختر الخطة"
            variant="outlined"
            density="comfortable"
            class="mb-4"
          />

          <v-select
            v-model="activateDialog.duration"
            :items="durationOptions"
            item-title="label"
            item-value="value"
            label="المدة"
            variant="outlined"
            density="comfortable"
            class="mb-4"
            :disabled="activateDialog.isLifetime"
          />

          <v-checkbox
            v-model="activateDialog.isLifetime"
            label="اشتراك مدى الحياة"
            color="gold"
            hide-details
            class="mb-4"
          />

          <v-alert v-if="activateDialog.error" type="error" variant="tonal" class="mb-4" closable>
            {{ activateDialog.error }}
          </v-alert>
        </v-card-text>

        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="activateDialog.show = false">إلغاء</v-btn>
          <v-btn
            color="accent"
            variant="elevated"
            class="font-weight-black rounded-xl px-6"
            :loading="activateDialog.loading"
            @click="activateSubscription"
          >
            تفعيل
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Extend Dialog -->
    <v-dialog v-model="extendDialog.show" max-width="480" persistent>
      <v-card class="rounded-xl">
        <div class="pa-5 bg-gold-gradient d-flex align-center">
          <LucideIcon name="calendar-plus" :size="24" class="me-3 text-ebony" />
          <span class="text-h6 font-weight-black text-ebony">تمديد الاشتراك</span>
          <v-spacer />
          <v-btn icon variant="text" color="ebony" @click="extendDialog.show = false">
            <LucideIcon name="x" :size="22" />
          </v-btn>
        </div>

        <v-card-text class="pa-6 rtl">
          <div class="text-body-1 font-weight-black mb-4">
            الشركة: {{ extendDialog.companyName }}
          </div>

          <v-select
            v-model="extendDialog.duration"
            :items="durationOptions"
            item-title="label"
            item-value="value"
            label="مدة التمديد"
            variant="outlined"
            density="comfortable"
            class="mb-4"
          />

          <v-alert v-if="extendDialog.error" type="error" variant="tonal" class="mb-4" closable>
            {{ extendDialog.error }}
          </v-alert>
        </v-card-text>

        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="extendDialog.show = false">إلغاء</v-btn>
          <v-btn
            color="accent"
            variant="elevated"
            class="font-weight-black rounded-xl px-6"
            :loading="extendDialog.loading"
            @click="extendSubscription"
          >
            تمديد
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="snackbar.timeout"
      location="top"
      class="font-weight-black"
    >
      {{ snackbar.text }}
      <template #actions>
        <v-btn variant="text" icon @click="snackbar.show = false">
          <LucideIcon name="x" :size="16" />
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LucideIcon from '../components/common/LucideIcon.vue'

// --- State ---
const loading = ref(true)
const subscriptions = ref<any[]>([])
const plans = ref<any[]>([])
const stats = ref({
  activeCount: 0,
  trialCount: 0,
  expiredCount: 0,
  totalCustomers: 0
})

const snackbar = ref({ show: false, text: '', color: 'success', timeout: 3000 })

const durationOptions = [
  { label: 'شهر واحد', value: '1' },
  { label: '3 أشهر', value: '3' },
  { label: '6 أشهر', value: '6' },
  { label: 'سنة واحدة', value: '12' }
]

const activateDialog = ref({
  show: false,
  companyId: '',
  companyName: '',
  planId: '',
  duration: '1',
  isLifetime: false,
  loading: false,
  error: ''
})

const extendDialog = ref({
  show: false,
  companyId: '',
  companyName: '',
  duration: '1',
  loading: false,
  error: ''
})

// --- Helpers ---
function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'success',
    trial: 'info',
    expired: 'warning',
    canceled: 'error',
    none: 'grey'
  }
  return map[status] || 'grey'
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    active: 'نشط',
    trial: 'تجريبي',
    expired: 'منتهي',
    canceled: 'ملغي',
    none: 'بدون اشتراك'
  }
  return map[status] || status
}

function getIntervalText(interval: string): string {
  const map: Record<string, string> = {
    month: 'شهري',
    year: 'سنوي',
    lifetime: 'مدى الحياة'
  }
  return map[interval] || interval
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return dateStr
  }
}

function getInitial(name: string): string {
  if (!name) return '?'
  return name.charAt(0).toUpperCase()
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('b2b_cloud_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

function showSnackbar(text: string, color = 'success') {
  snackbar.value = { show: true, text, color, timeout: 3000 }
}

// --- Data Fetching ---
async function fetchData() {
  loading.value = true
  try {
    const headers = getAuthHeaders()

    const [subsRes, overviewRes, plansRes] = await Promise.all([
      fetch('/api/admin/subscriptions', { headers }).then(r => r.json()),
      fetch('/api/admin/subscriptions/stats/overview', { headers }).then(r => r.json()),
      fetch('/api/subscriptions/plans', { headers }).then(r => r.json())
    ])

    const rawData: any[] = Array.isArray(subsRes) ? subsRes : subsRes.data || []
    subscriptions.value = rawData.map((r: any) => ({
      id: r.id,
      companyId: r.id,
      companyName: r.company_name || r.companyName || '',
      email: r.email || '',
      phone: r.phone || '',
      status: r.effective_status || r.status || 'none',
      planName: r.plan_name || r.planName || null,
      planInterval: r.plan_interval || r.planInterval || null,
      daysRemaining: r.days_remaining ?? r.daysRemaining ?? null,
      expiryDate: r.current_period_end || r.trial_expires_at || r.expiryDate || null
    }))

    plans.value = Array.isArray(plansRes) ? plansRes : plansRes.data || []

    if (overviewRes && overviewRes.subscriptions) {
      const s = overviewRes.subscriptions
      stats.value = {
        activeCount: s.active_count ?? 0,
        trialCount: s.trial_count ?? 0,
        expiredCount: s.expired_count ?? 0,
        totalCustomers: s.total_count ?? subscriptions.value.length
      }
    } else if (overviewRes && typeof overviewRes === 'object') {
      stats.value = {
        activeCount: overviewRes.active_count ?? overviewRes.activeCount ?? 0,
        trialCount: overviewRes.trial_count ?? overviewRes.trialCount ?? 0,
        expiredCount: overviewRes.expired_count ?? overviewRes.expiredCount ?? 0,
        totalCustomers: overviewRes.total_count ?? overviewRes.totalCount ?? subscriptions.value.length
      }
    }
  } catch (e: any) {
    console.error('Failed to fetch admin subscriptions data:', e)
    showSnackbar('فشل في تحميل البيانات', 'error')
  } finally {
    loading.value = false
  }
}

// --- Actions ---
function openActivateDialog(sub: any) {
  activateDialog.value = {
    show: true,
    companyId: sub.companyId,
    companyName: sub.companyName,
    planId: plans.value.length ? plans.value[0].id : '',
    duration: '1',
    isLifetime: false,
    loading: false,
    error: ''
  }
}

function openExtendDialog(sub: any) {
  extendDialog.value = {
    show: true,
    companyId: sub.companyId,
    companyName: sub.companyName,
    duration: '1',
    loading: false,
    error: ''
  }
}

async function activateSubscription() {
  const d = activateDialog.value
  if (!d.planId) {
    d.error = 'يرجى اختيار خطة'
    return
  }
  d.loading = true
  d.error = ''
  try {
    const headers = getAuthHeaders()
    const body: Record<string, any> = {
      companyId: d.companyId,
      planId: d.planId,
      durationMonths: d.isLifetime ? 0 : parseInt(d.duration, 10),
      isLifetime: d.isLifetime
    }
    const res = await fetch('/api/admin/subscriptions/activate', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || data.message || 'فشل التفعيل')
    d.show = false
    showSnackbar('تم تفعيل الاشتراك بنجاح')
    await fetchData()
  } catch (e: any) {
    d.error = e?.message || 'فشل تفعيل الاشتراك'
  } finally {
    d.loading = false
  }
}

async function extendSubscription() {
  const d = extendDialog.value
  d.loading = true
  d.error = ''
  try {
    const headers = getAuthHeaders()
    const body = {
      companyId: d.companyId,
      durationMonths: parseInt(d.duration, 10)
    }
    const res = await fetch('/api/admin/subscriptions/extend', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || data.message || 'فشل التمديد')
    d.show = false
    showSnackbar('تم تمديد الاشتراك بنجاح')
    await fetchData()
  } catch (e: any) {
    d.error = e?.message || 'فشل تمديد الاشتراك'
  } finally {
    d.loading = false
  }
}

async function suspendSubscription(sub: any) {
  if (!confirm(`هل أنت متأكد من إيقاف اشتراك "${sub.companyName}"؟`)) return
  try {
    const headers = getAuthHeaders()
    const res = await fetch('/api/admin/subscriptions/suspend', {
      method: 'POST',
      headers,
      body: JSON.stringify({ companyId: sub.companyId })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || data.message || 'فشل الإيقاف')
    showSnackbar('تم إيقاف الاشتراك بنجاح', 'warning')
    await fetchData()
  } catch (e: any) {
    showSnackbar(e?.message || 'فشل إيقاف الاشتراك', 'error')
  }
}

async function cancelSubscription(sub: any) {
  if (!confirm(`هل أنت متأكد من إلغاء اشتراك "${sub.companyName}" نهائياً؟`)) return
  try {
    const headers = getAuthHeaders()
    const res = await fetch('/api/admin/subscriptions/cancel', {
      method: 'POST',
      headers,
      body: JSON.stringify({ companyId: sub.companyId })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || data.message || 'فشل الإلغاء')
    showSnackbar('تم إلغاء الاشتراك بنجاح', 'error')
    await fetchData()
  } catch (e: any) {
    showSnackbar(e?.message || 'فشل إلغاء الاشتراك', 'error')
  }
}

// --- Lifecycle ---
onMounted(fetchData)
</script>

<style scoped>
.rtl {
  direction: rtl;
}
.glass-table {
  background: transparent !important;
}
.glass-table :deep(thead tr th) {
  font-size: 0.8rem;
  padding: 12px 16px;
}
.glass-table :deep(tbody tr td) {
  padding: 10px 16px;
}
.glass-table :deep(tbody tr:hover) {
  background: rgba(0, 0, 0, 0.02);
}
@media (max-width: 1023px) {
  :deep(.v-dialog > .v-overlay__content) {
    width: 95vw !important;
    max-width: 95vw !important;
    margin: 4px !important;
  }
}
</style>
