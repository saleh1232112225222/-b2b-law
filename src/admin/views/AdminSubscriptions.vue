<template>
  <div class="admin-subscriptions-page">
    <div class="page-header">
      <h1>إدارة الاشتراكات</h1>
      <button class="btn-primary" @click="openAddSubscriberDialog">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        إضافة مشترك جديد
      </button>
    </div>

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
              <button class="btn-icon" @click="openActivateDialog(company)" title="تفعيل الاشتراك">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </button>
              <button class="btn-icon" @click="openExtendDialog(company)" title="تمديد الاشتراك">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4v5h.01M20 14v5h-5M14 14l-5 5m0-5l5-5"/>
                </svg>
              </button>
              <button class="btn-icon danger" @click="suspendSubscription(company)" title="تعليق الاشتراك">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10 11l-4 4m0 0l4-4m-4 4V7m8 14l4-4m-4 0l4 4"/>
                </svg>
              </button>
              <button class="btn-icon" @click="cancelSubscription(company)" title="إلغاء الاشتراك">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add Subscriber Dialog -->
    <div class="modal" :class="{ 'show': showAddSubscriberDialog }" @click="closeAddSubscriberDialog">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>إضافة مشترك جديد</h3>
          <button class="close-btn" @click="closeAddSubscriberDialog">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="createSubscriber">
            <div class="form-grid">
              <div class="form-group">
                <label>اسم المشترك الكامل</label>
                <input type="text" v-model="newSubscriber.fullName" required />
              </div>
              <div class="form-group">
                <label>اسم المستخدم</label>
                <input type="text" v-model="newSubscriber.username" required />
              </div>
              <div class="form-group">
                <label>كلمة المرور</label>
                <input type="password" v-model="newSubscriber.password" required />
              </div>
              <div class="form-group">
                <label>البريد الإلكتروني</label>
                <input type="email" v-model="newSubscriber.email" />
              </div>
              <div class="form-group">
                <label>رقم الهاتف</label>
                """
                <input type="tel" v-model="newSubscriber.phone" />
              </div>
              <div class="form-group">
                <label>نوع الاشتراك</label>
                <select v-model="newSubscriber.subscriptionType">
                  <option value="trial">تجربة (30 يوم)</option>
                  <option value="monthly">شهري (99 ريال)</option>
                  <option value="yearly">سنوي (999 ريال)</option>
                  <option value="lifetime">مدى الحياة (2,499 ريال)</option>
                </select>
              </div>
              <div class="form-group" v-if="newSubscriber.subscriptionType === 'lifetime'">
                <label>خطة الاشتراك</label>
                <select v-model="newSubscriber.planId">
                  <option value="">اختر الخطة...</option>
                  <option v-for="plan in availablePlans" :key="plan.id" :value="plan.id">{{ plan.name }} - {{ plan.price }} ريال</option>
                </select>
              </div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-secondary" @click="closeAddSubscriberDialog">إلغاء</button>
              <button type="submit" class="btn-primary" :disabled="isCreatingSubscriber">
                {{ isCreatingSubscriber ? 'جارِ الإنشاء...' : 'إنشاء المشترك' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Activate Subscription Dialog -->
    <div class="modal" :class="{ 'show': showActivateDialog }" @click="closeActivateDialog">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>تفعيل الاشتراك</h3>
          <button class="close-btn" @click="closeActivateDialog">×</button>
        </div>
        <div class="modal-body">
          <div class="company-info">
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
                <input type="checkbox" v-model="activateData.lifetime" />
                اشتراك مدى الحياة
              </label>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-secondary" @click="closeActivateDialog">إلغاء</button>
              <button type="submit" class="btn-primary" :disabled="isActivating">
                {{ isActivating ? 'جارِ التفعيل...' : 'تفعيل الاشتراك' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Extend Subscription Dialog -->
    <div class="modal" :class="{ 'show': showExtendDialog }" @click="closeExtendDialog">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>تمديد الاشتراك</h3>
          <button class="close-btn" @click="closeExtendDialog">×</button>
        </div>
        <div class="modal-body">
          <div class="company-info">
            <p><strong>الشركة:</strong> {{ selectedCompany.companyName }}</p>
            <p><strong>الحالة الحالية:</strong> <span :class="getStatusClass(selectedCompany.effectiveStatus)">{{ getStatusText(selectedCompany.effectiveStatus) }}</span></p>
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useApi } from '../../../api'

const api = useApi()

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

const selectedCompany = ref(null)
const isCreatingSubscriber = ref(false)
const isActivating = ref(false)
const isExtending = ref(false)

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
      api.get('/api/admin/subscriptions'),
      api.get('/api/admin/subscriptions/stats/overview')
    ])
    companies.value = companiesRes.data || []
    stats.value = statsRes.data || {}
  } catch (error) {
    console.error('Failed to fetch subscription data:', error)
  }
}

async function fetchPlans() {
  try {
    const response = await api.get('/api/subscriptions/plans')
    availablePlans.value = response.data || []
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
  showActivateDialog.value
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
  showExtendDialog.value
}

function closeExtendDialog() {
  showExtendDialog.value = false
  selectedCompany.value = null
}

function getStatusClass(status) {
  const statusMap = {
    'active': 'status-active',
    'trial': 'status-trial',
    'expired': 'status-expired',
    'canceled': 'status-canceled',
    'none': 'status-none'
  }
  return statusMap[status] || ''
}

function getStatusText(status) {
  const statusMap = {
    'active': 'نشط',
    'trial': 'تجربة',
    'expired': 'منتهي',
    'canceled': 'ملغى',
    'none': 'بدون اشتراك'
  }
  return statusMap[status] || status
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('ar-SA')
}

async function createSubscriber() {
  if (!newSubscriber.username || !newSubscriber.password) {
    alert('اسم المستخدم وكلمة المرور مطلوبان')
    return
  }

  isCreatingSubscriber.value = true
  try {
    // Create user
    const userResponse = await api.post('/api/users', {
      username: newSubscriber.username,
      password: newSubscriber.password,
      full_name: newSubscriber.fullName || newSubscriber.username,
      role_key: 'secretary',
      employee_id: null
    })

    const userId = userResponse.data?.userId
    if (!userId) {
      alert('فشل إنشاء المستخدم')
      return
    }

    // Create company
    const companyResponse = await api.post('/api/auth/register', {
      username: newSubscriber.username,
      password: newSubscriber.password,
      companyName: newSubscriber.fullName || `شركة ${newSubscriber.username}`,
      email: newSubscriber.email || `${newSubscriber.username}@example.com`,
      phone: newSubscriber.phone || '0500000000'
    })

    const companyId = companyResponse.data?.companyId || userId

    // Create subscription
    const subscriptionBody = {
      companyId: companyId,
      planId: newSubscriber.subscriptionType === 'lifetime' ? availablePlans.value.find(p => p.interval === 'lifetime')?.id : '933c1f86-78bb-4239-b35c-14cc94dc56db',
      durationMonths: newSubscriber.subscriptionType === 'trial' ? 1 : null,
      lifetime: newSubscriber.subscriptionType === 'lifetime'
    }

    await api.post('/api/admin/subscriptions/activate', subscriptionBody)

    alert('تم إنشاء المشترك بنجاح')
    closeAddSubscriberDialog()
    await fetchData()
  } catch (error) {
    console.error('Failed to create subscriber:', error)
    alert('حدث خطأ أثناء إنشاء المشترك')
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
    await api.post('/api/admin/subscriptions/activate', activateData)
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

async function extendSubscription() {
  if (!extendData.extendMonths) {
    alert('يرجى اختيار مدة التمديد')
    return
  }

  isExtending.value = true
  try {
    await api.post('/api/admin/subscriptions/extend', extendData)
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
