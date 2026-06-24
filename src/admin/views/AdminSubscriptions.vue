<template>
  <div class="admin-subscriptions-page">
    <!-- Vuetify Header -->
    <v-card class="mb-6 rounded-xl border-gold border-1 bg-surface" elevation="0">
      <v-card-text class="d-flex align-center justify-space-between pa-6">
        <div class="d-flex align-center">
          <v-avatar color="gold-lighten-4" size="56" class="me-4">
            <v-icon icon="mdi-crown" class="text-gold" size="32"></v-icon>
          </v-avatar>
          <div>
            <h1 class="text-h4 font-weight-bold text-primary mb-1">إدارة الاشتراكات</h1>
            <div class="text-subtitle-1 text-medium-emphasis">
              إدارة اشتراكات العملاء وتفعيل الخطط
            </div>
          </div>
        </div>

        <div class="d-flex gap-4">
          <v-btn
            color="secondary"
            size="x-large"
            class="font-weight-bold rounded-lg mr-4"
            elevation="2"
            prepend-icon="mdi-file-chart"
            @click="openReportDialog"
          >
            توليد التقرير
          </v-btn>
          <v-btn
            color="gold"
            size="x-large"
            class="font-weight-bold rounded-lg text-ebony"
            elevation="2"
            prepend-icon="mdi-plus"
            @click="openAddSubscriberDialog"
          >
            إضافة مشترك جديد
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon active"></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.activeCount }}</div>
          <div class="stat-label">نشط</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon trial"></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.trialCount }}</div>
          <div class="stat-label">تجربة</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon expired"></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.expiredCount }}</div>
          <div class="stat-label">منتهية</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon canceled"></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.canceledCount }}</div>
          <div class="stat-label">ملغاة</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon none"></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.noSubscriptionCount }}</div>
          <div class="stat-label">بدون اشتراك</div>
        </div>
      </div>
    </div>

    <div class="table-container">
      <table class="subscriptions-table">
        <thead>
          <tr>
            <th>اسم الشركة</th>
            <th>البريد الإلكتروني</th>
            <th>الهاتف</th>
            <th>الحالة</th>
            <th>الخطة</th>
            <th>الأيام المتبقية</th>
            <th>تاريخ الانتهاء</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="company in companies" :key="company.id">
            <td>{{ company.companyName }}</td>
            <td>{{ company.email }}</td>
            <td>{{ company.phone }}</td>
            <td>
              <span class="status-badge" :class="getStatusClass(company.effectiveStatus)">
                {{ getStatusText(company.effectiveStatus) }}
              </span>
            </td>
            <td>{{ company.planName || '-' }}</td>
            <td>{{ company.daysRemaining }}</td>
            <td>{{ formatDate(company.expiryDate) }}</td>
            <td class="actions">
              <button class="btn-icon" title="تفعيل الاشتراك" @click="openActivateDialog(company)">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button class="btn-icon" title="تمديد الاشتراك" @click="openExtendDialog(company)">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M4 4v5h.01M20 14v5h-5M14 14l-5 5m0-5l5-5" />
                </svg>
              </button>
              <button
                class="btn-icon danger"
                title="تعليق الاشتراك"
                @click="suspendSubscription(company)"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M10 11l-4 4m0 0l4-4m-4 4V7m8 14l4-4m-4 0l4 4" />
                </svg>
              </button>
              <button class="btn-icon" title="إلغاء الاشتراك" @click="cancelSubscription(company)">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add Subscriber Vuetify Dialog -->
    <v-dialog v-model="showAddSubscriberDialog" max-width="600px" persistent>
      <v-card class="rounded-xl border-gold border-1">
        <v-card-title class="bg-gold-gradient text-ebony pa-4 d-flex align-center">
          <v-icon icon="mdi-account-plus" class="me-2"></v-icon>
          <span class="text-h6 font-weight-bold">إضافة مشترك جديد</span>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" @click="closeAddSubscriberDialog"></v-btn>
        </v-card-title>

        <v-card-text class="pa-6">
          <v-form ref="addForm" @submit.prevent="createSubscriber">
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="newSubscriber.fullName"
                  label="اسم المشترك / الشركة"
                  variant="outlined"
                  color="gold"
                  prepend-inner-icon="mdi-domain"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="newSubscriber.username"
                  label="اسم المستخدم (للدخول)"
                  variant="outlined"
                  color="gold"
                  prepend-inner-icon="mdi-account"
                  hide-details="auto"
                  :rules="[
                    (v) => !!v || 'اسم المستخدم مطلوب',
                    (v) =>
                      /^[a-zA-Z0-9_]{4,20}$/.test(v) ||
                      'اسم المستخدم يجب أن يكون إنجليزي فقط (4-20 حرف)'
                  ]"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="newSubscriber.password"
                  label="كلمة المرور"
                  type="password"
                  variant="outlined"
                  color="gold"
                  prepend-inner-icon="mdi-lock"
                  hide-details="auto"
                  :rules="[
                    (v) => !!v || 'كلمة المرور مطلوبة',
                    (v) =>
                      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
                        v
                      ) || 'كلمة المرور يجب أن تكون قوية'
                  ]"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="newSubscriber.email"
                  label="البريد الإلكتروني"
                  type="email"
                  variant="outlined"
                  color="gold"
                  prepend-inner-icon="mdi-email"
                  hide-details="auto"
                  :rules="[
                    (v) => !!v || 'البريد الإلكتروني مطلوب',
                    (v) =>
                      /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(v) ||
                      'البريد الإلكتروني غير صحيح'
                  ]"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="newSubscriber.phone"
                  label="رقم الجوال"
                  type="tel"
                  variant="outlined"
                  color="gold"
                  prepend-inner-icon="mdi-phone"
                  hide-details="auto"
                  :rules="[
                    (v) => !!v || 'رقم الجوال مطلوب',
                    (v) => /^05\d{8}$/.test(v) || 'يجب إدخال رقم جوال سعودي صحيح (مثال: 0512345678)'
                  ]"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="newSubscriber.subscriptionType"
                  :items="[
                    { title: 'تجربة مجانية (30 يوم)', value: 'trial' },
                    { title: 'اشتراك شهري', value: 'monthly' },
                    { title: 'اشتراك سنوي', value: 'yearly' },
                    { title: 'مدى الحياة', value: 'lifetime' }
                  ]"
                  label="نوع الاشتراك"
                  variant="outlined"
                  color="gold"
                  prepend-inner-icon="mdi-card-account-details"
                ></v-select>
              </v-col>
              <v-col v-if="newSubscriber.subscriptionType !== 'trial'" cols="12">
                <v-select
                  v-model="newSubscriber.planId"
                  :items="availablePlans"
                  item-title="name"
                  item-value="id"
                  label="خطة الاشتراك"
                  variant="outlined"
                  color="gold"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props" :subtitle="`${item.raw.price} ريال`"></v-list-item>
                  </template>
                </v-select>
              </v-col>
            </v-row>
            <div class="d-flex justify-end mt-4">
              <v-btn
                color="grey-darken-1"
                variant="text"
                class="me-2"
                @click="closeAddSubscriberDialog"
                >إلغاء</v-btn
              >
              <v-btn
                color="gold"
                type="submit"
                class="text-ebony font-weight-bold"
                :loading="isCreatingSubscriber"
              >
                إنشاء المشترك
              </v-btn>
            </div>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Activate Subscription Dialog -->
    <div class="modal" :class="{ show: showActivateDialog }" @click="closeActivateDialog">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>تفعيل الاشتراك</h3>
          <button class="close-btn" @click="closeActivateDialog">×</button>
        </div>
        <div class="modal-body">
          <div v-if="selectedCompany" class="company-info">
            <p><strong>الشركة:</strong> {{ selectedCompany.companyName }}</p>
            <p><strong>البريد الإلكتروني:</strong> {{ selectedCompany.email }}</p>
          </div>
          <form @submit.prevent="activateSubscription">
            <div class="form-group">
              <label>الخطة</label>
              <select v-model="activateData.planId" required>
                <option value="">اختر الخطة...</option>
                <option v-for="plan in availablePlans" :key="plan.id" :value="plan.id">
                  {{ plan.name }} - {{ plan.price }} ريال ({{ plan.interval }})
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>المدة</label>
              <select v-model="activateData.durationMonths">
                <option value="">اختر...</option>
                <option value="1">شهر واحد</option>
                <option value="3">3 أشهر</option>
                <option value="6">6 أشهر</option>
                <option value="12">12 شهر</option>
              </select>
            </div>
            <div class="form-group">
              <label>&nbsp;</label>
              <label class="checkbox-label">
                <input v-model="activateData.lifetime" type="checkbox" />
                اشتراك مدى الحياة
              </label>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-secondary" @click="closeActivateDialog">
                إلغاء
              </button>
              <button type="submit" class="btn-primary" :disabled="isActivating">
                {{ isActivating ? 'جارِ التفعيل...' : 'تفعيل الاشتراك' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Extend Subscription Dialog -->
    <div class="modal" :class="{ show: showExtendDialog }" @click="closeExtendDialog">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>تمديد الاشتراك</h3>
          <button class="close-btn" @click="closeExtendDialog">×</button>
        </div>
        <div class="modal-body">
          <div v-if="selectedCompany" class="company-info">
            <p><strong>الشركة:</strong> {{ selectedCompany.companyName }}</p>
            <p>
              <strong>الحالة الحالية:</strong>
              <span :class="getStatusClass(selectedCompany.effectiveStatus)">{{
                getStatusText(selectedCompany.effectiveStatus)
              }}</span>
            </p>
          </div>
          <form @submit.prevent="extendSubscription">
            <div class="form-group">
              <label>مدة التمديد</label>
              <select v-model="extendData.extendMonths">
                <option value="">اختر...</option>
                <option value="1">شهر واحد</option>
                <option value="3">3 أشهر</option>
                <option value="6">6 أشهر</option>
                <option value="12">12 شهر</option>
              </select>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-secondary" @click="closeExtendDialog">إلغاء</button>
              <button type="submit" class="btn-primary" :disabled="isExtending">
                {{ isExtending ? 'جارِ التمديد...' : 'تمديد الاشتراك' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Report Generation Dialog -->
    <v-dialog v-model="showReportDialog" max-width="500px">
      <v-card class="rounded-xl border-gold border-1">
        <v-card-title class="bg-gold-gradient text-ebony pa-4 d-flex align-center">
          <v-icon icon="mdi-file-chart" class="me-2"></v-icon>
          <span class="text-h6 font-weight-bold">توليد تقرير المستخدمين</span>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" @click="showReportDialog = false"></v-btn>
        </v-card-title>

        <v-card-text class="pa-6">
          <v-form @submit.prevent="sendReport">
            <v-text-field
              v-model="reportData.email"
              label="البريد الإلكتروني للارسال"
              variant="outlined"
              color="gold"
              prepend-inner-icon="mdi-email"
              type="email"
              required
              class="mb-4"
            ></v-text-field>

            <v-text-field
              v-model="reportData.scheduleDate"
              label="تاريخ ووقت الإرسال (اختياري لجدولة الإرسال)"
              type="datetime-local"
              variant="outlined"
              color="gold"
              prepend-inner-icon="mdi-calendar-clock"
              class="mb-4"
              hint="إذا تركته فارغاً سيتم إرسال التقرير فوراً"
              persistent-hint
            ></v-text-field>

            <div class="d-flex flex-column gap-3 mt-6">
              <v-btn
                color="gold"
                type="submit"
                size="large"
                class="text-ebony font-weight-bold w-100"
                :loading="isSendingReport"
                prepend-icon="mdi-send"
              >
                إرسال التقرير (بريد إلكتروني)
              </v-btn>

              <v-btn
                color="secondary"
                size="large"
                class="font-weight-bold w-100"
                prepend-icon="mdi-printer"
                :loading="isPrintingReport"
                @click="printReport"
              >
                طباعة التقرير الآن
              </v-btn>
            </div>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, reactive, onMounted } from 'vue'

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? ''
    : 'https://b2b-law-g2qr.onrender.com')

async function apiRequest(method, path, body = null) {
  const token = localStorage.getItem('b2b_cloud_token') || localStorage.getItem('token')
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${API_BASE}${path}`, opts)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return { data }
}

const companies = ref([])
const stats = ref({
  activeCount: 0,
  trialCount: 0,
  expiredCount: 0,
  canceledCount: 0,
  noSubscriptionCount: 0,
  totalCount: 0
})
const availablePlans = ref([])

const showAddSubscriberDialog = ref(false)
const showActivateDialog = ref(false)
const showExtendDialog = ref(false)
const showReportDialog = ref(false)

const selectedCompany = ref(null)
const isCreatingSubscriber = ref(false)
const isActivating = ref(false)
const isExtending = ref(false)
const isSendingReport = ref(false)
const isPrintingReport = ref(false)

const reportData = reactive({
  email: 'slaehmap@gmail.com',
  scheduleDate: ''
})

const newSubscriber = reactive({
  fullName: '',
  username: '',
  password: '',
  email: '',
  phone: '',
  subscriptionType: 'trial'
})

const activateData = reactive({
  companyId: '',
  planId: '',
  durationMonths: '',
  durationYears: '',
  lifetime: false
})

const extendData = reactive({
  companyId: '',
  extendMonths: '',
  extendYears: ''
})

onMounted(async () => {
  await fetchData()
  await fetchPlans()
})

async function fetchData() {
  try {
    const [companiesRes, statsRes] = await Promise.all([
      apiRequest('GET', '/api/admin/subscriptions'),
      apiRequest('GET', '/api/admin/subscriptions/stats/overview')
    ])
    companies.value = companiesRes.data?.data || companiesRes.data || []
    stats.value = statsRes.data?.subscriptions || statsRes.data || {}
  } catch (error) {
    console.error('Failed to fetch subscription data:', error)
  }
}

async function fetchPlans() {
  try {
    const response = await apiRequest('GET', '/api/subscriptions/plans')
    availablePlans.value = response.data?.data || response.data || []
  } catch (error) {
    console.error('Failed to fetch plans:', error)
  }
}

function openAddSubscriberDialog() {
  resetNewSubscriber()
  showAddSubscriberDialog.value = true
}

function closeAddSubscriberDialog() {
  showAddSubscriberDialog.value = false
}

function openActivateDialog(company) {
  selectedCompany.value = company
  activateData.companyId = company.id
  activateData.planId = ''
  activateData.durationMonths = ''
  activateData.durationYears = ''
  activateData.lifetime = false
  showActivateDialog.value = true
}

function closeActivateDialog() {
  showActivateDialog.value = false
  selectedCompany.value = null
}

function openExtendDialog(company) {
  selectedCompany.value = company
  extendData.companyId = company.id
  extendData.extendMonths = ''
  extendData.extendYears = ''
  showExtendDialog.value = true
}

function closeExtendDialog() {
  showExtendDialog.value = false
  selectedCompany.value = null
}

function getStatusClass(status) {
  const statusMap = {
    active: 'status-active',
    trial: 'status-trial',
    expired: 'status-expired',
    canceled: 'status-canceled',
    none: 'status-none'
  }
  return statusMap[status] || ''
}

function getStatusText(status) {
  const statusMap = {
    active: 'نشط',
    trial: 'تجربة',
    expired: 'منتهي',
    canceled: 'ملغى',
    none: 'بدون اشتراك'
  }
  return statusMap[status] || status
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('ar-SA')
}

async function createSubscriber() {
  if (!newSubscriber.username || !newSubscriber.password || !newSubscriber.fullName) {
    alert('اسم المستخدم وكلمة المرور واسم الشركة/المشترك مطلوبان')
    return
  }

  isCreatingSubscriber.value = true
  try {
    // Create company and super admin user in one step using the auth/register endpoint
    const companyResponse = await apiRequest('POST', '/api/auth/register', {
      username: newSubscriber.username,
      password: newSubscriber.password,
      companyName: newSubscriber.fullName,
      email: newSubscriber.email || `${newSubscriber.username}@example.com`,
      phone: newSubscriber.phone || '0500000000'
    })

    const companyId = companyResponse.data?.companyId

    if (!companyId) {
      alert('فشل إنشاء الشركة. قد يكون اسم المستخدم أو البريد الإلكتروني مسجل مسبقاً.')
      return
    }

    // Create subscription if not a basic trial
    // NOTE: /api/auth/register automatically creates a trial subscription,
    // but we can activate a different plan if selected.
    if (newSubscriber.subscriptionType !== 'trial') {
      const subscriptionBody = {
        companyId: companyId,
        planId: newSubscriber.planId,
        durationMonths:
          newSubscriber.subscriptionType === 'monthly'
            ? 1
            : newSubscriber.subscriptionType === 'yearly'
              ? 12
              : null,
        lifetime: newSubscriber.subscriptionType === 'lifetime'
      }
      await apiRequest('POST', '/api/admin/subscriptions/activate', subscriptionBody)
    }

    alert('تم إنشاء المشترك بنجاح')
    closeAddSubscriberDialog()
    await fetchData()
  } catch (error) {
    console.error('Failed to create subscriber:', error)
    const backendMsg = error.response?.data?.message || error.response?.data?.error
    alert(
      backendMsg || 'حدث خطأ أثناء إنشاء المشترك. يرجى التأكد من أن البيانات المدخلة غير مكررة.'
    )
  } finally {
    isCreatingSubscriber.value = false
  }
}

async function activateSubscription() {
  if (!activateData.planId) {
    alert('يرجى اختيار الخطة')
    return
  }

  isActivating.value = true
  try {
    await apiRequest('POST', '/api/admin/subscriptions/activate', activateData)
    alert('تم تفعيل الاشتراك بنجاح')
    closeActivateDialog()
    await fetchData()
  } catch (error) {
    console.error('Failed to activate subscription:', error)
    alert('حدث خطأ أثناء تفعيل الاشتراك')
  } finally {
    isActivating.value = false
  }
}

async function suspendSubscription(company) {
  if (!confirm('هل ترغب بتعليق الاشتراك لهذا المشترك؟')) {
    return
  }

  try {
    await apiRequest('POST', '/api/admin/subscriptions/suspend', {
      companyId: company.id,
      reason: 'تعليق من لوحة الإدارة'
    })
    alert('تم تعليق الاشتراك بنجاح')
    await fetchData()
  } catch (error) {
    console.error('Failed to suspend subscription:', error)
    alert('حدث خطأ أثناء تعليق الاشتراك')
  }
}

async function cancelSubscription(company) {
  if (!confirm('هل ترغب بحذف المشترك لايمكن استعادة بعد الحذف')) {
    return
  }

  try {
    await apiRequest('DELETE', `/api/admin/subscriptions/${company.id}`)
    alert('تم الحذف بنجاح')
    await fetchData()
  } catch (error) {
    console.error('Failed to cancel subscription:', error)
    alert('حدث خطأ أثناء التنفيذ')
  }
}

async function extendSubscription() {
  if (!extendData.extendMonths) {
    alert('يرجى اختيار مدة التمديد')
    return
  }

  isExtending.value = true
  try {
    await apiRequest('POST', '/api/admin/subscriptions/extend', extendData)
    alert('تم تمديد الاشتراك بنجاح')
    closeExtendDialog()
    await fetchData()
  } catch (error) {
    console.error('Failed to extend subscription:', error)
    alert('حدث خطأ أثناء تمديد الاشتراك')
  } finally {
    isExtending.value = false
  }
}

function resetNewSubscriber() {
  newSubscriber.fullName = ''
  newSubscriber.username = ''
  newSubscriber.password = ''
  newSubscriber.email = ''
  newSubscriber.phone = ''
  newSubscriber.subscriptionType = 'trial'
}

function openReportDialog() {
  reportData.scheduleDate = ''
  showReportDialog.value = true
}

async function sendReport() {
  isSendingReport.value = true
  try {
    const response = await apiRequest('POST', '/api/admin/subscriptions/report/send', {
      email: reportData.email,
      scheduleDate: reportData.scheduleDate || null
    })
    alert(response.data?.message || 'تمت العملية بنجاح')
    showReportDialog.value = false
  } catch (error) {
    console.error('Failed to send report:', error)
    alert('حدث خطأ أثناء إرسال التقرير')
  } finally {
    isSendingReport.value = false
  }
}

async function printReport() {
  isPrintingReport.value = true
  try {
    const token = localStorage.getItem('b2b_cloud_token') || localStorage.getItem('token')
    const response = await fetch(`${API_BASE}/api/admin/subscriptions/report/html`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    })

    if (!response.ok) throw new Error('Failed to fetch report HTML')

    const html = await response.text()

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      // Wait for content to load then print
      printWindow.onload = function () {
        printWindow.focus()
        printWindow.print()
      }
    } else {
      alert('الرجاء السماح بفتح النوافذ المنبثقة (Pop-ups)')
    }
  } catch (error) {
    console.error('Failed to print report:', error)
    alert('حدث خطأ أثناء تحميل التقرير للطباعة')
  } finally {
    isPrintingReport.value = false
  }
}
</script>

<style scoped>
.admin-subscriptions-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: #1e293b;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background-color: #2563eb;
}

.btn-primary:disabled {
  background-color: #94a3b8;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 10px 20px;
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.btn-secondary:hover {
  background-color: #e2e8f0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
}

.stat-icon.active {
  background-color: #dcfce7;
}

.stat-icon.trial {
  background-color: #fef3c7;
}

.stat-icon.expired {
  background-color: #fee2e2;
}

.stat-icon.canceled {
  background-color: #e2e8f0;
}

.stat-icon.none {
  background-color: #f3f4f6;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
}

.table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.subscriptions-table {
  width: 100%;
  border-collapse: collapse;
}

.subscriptions-table th,
.subscriptions-table td {
  padding: 16px;
  text-align: right;
  border-bottom: 1px solid #e2e8f0;
}

.subscriptions-table th {
  background-color: #f8fafc;
  font-weight: 600;
  color: #475569;
}

.subscriptions-table tr:hover {
  background-color: #f8fafc;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-active {
  background-color: #dcfce7;
  color: #166534;
}

.status-trial {
  background-color: #fef3c7;
  color: #92400e;
}

.status-expired {
  background-color: #fee2e2;
  color: #991b1b;
}

.status-canceled {
  background-color: #e2e8f0;
  color: #475569;
}

.status-none {
  background-color: #f3f4f6;
  color: #6b7280;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  background-color: #e2e8f0;
}

.btn-icon.danger {
  background-color: #fee2e2;
  border-color: #fecaca;
}

.btn-icon.danger:hover {
  background-color: #fee2e2;
}

.modal {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.modal.show {
  opacity: 1;
  pointer-events: all;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 24px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #64748b;
}

.close-btn:hover {
  color: #1e293b;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #475569;
}

.form-group input,
.form-group select {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.company-info {
  background-color: #f8fafc;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 24px;
}

.company-info p {
  margin: 8px 0;
  color: #475569;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .table-container {
    overflow-x: auto;
  }
}
</style>
