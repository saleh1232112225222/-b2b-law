<template>
  <div class="admin-recycle-bin-page">
    <!-- Header -->
    <v-card class="mb-6 rounded-xl border-gold border-1 bg-surface" elevation="0">
      <v-card-text class="d-flex align-center justify-space-between pa-6">
        <div class="d-flex align-center">
          <v-avatar color="error-lighten-4" size="56" class="me-4">
            <v-icon icon="mdi-delete-restore" class="text-error" size="32"></v-icon>
          </v-avatar>
          <div>
            <h1 class="text-h4 font-weight-bold text-primary mb-1">سلة المحذوفات</h1>
            <div class="text-subtitle-1 text-medium-emphasis">
              المشتركون المحذوفون - يمكن استعادتهم في أي وقت
            </div>
          </div>
        </div>

        <div class="d-flex gap-4">
          <v-btn
            color="secondary"
            size="large"
            class="font-weight-bold rounded-lg mr-4"
            elevation="2"
            prepend-icon="mdi-arrow-right"
            @click="$router.push('/admin/subscriptions')"
          >
            العودة لإدارة الاشتراكات
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Stats -->
    <div class="stats-grid mb-6">
      <div class="stat-card">
        <div class="stat-icon deleted"></div>
        <div class="stat-info">
          <div class="stat-value">{{ deletedCompanies.length }}</div>
          <div class="stat-label">مشترك محذوف</div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <v-card v-if="isLoading" class="rounded-xl border-gold border-1" elevation="0">
      <v-card-text class="text-center pa-12">
        <v-progress-circular
          indeterminate
          color="gold"
          size="48"
          class="mb-4"
        ></v-progress-circular>
        <div class="text-subtitle-1 text-medium-emphasis">جارٍ تحميل البيانات...</div>
      </v-card-text>
    </v-card>

    <!-- Empty State -->
    <v-card
      v-else-if="deletedCompanies.length === 0"
      class="rounded-xl border-gold border-1"
      elevation="0"
    >
      <v-card-text class="text-center pa-12">
        <v-avatar color="success-lighten-4" size="80" class="mb-4">
          <v-icon icon="mdi-check-circle" class="text-success" size="48"></v-icon>
        </v-avatar>
        <h3 class="text-h5 font-weight-bold text-primary mb-2">سلة المحذوفات فارغة</h3>
        <div class="text-subtitle-1 text-medium-emphasis">لا يوجد مشتركون محذوفون حالياً</div>
      </v-card-text>
    </v-card>

    <!-- Deleted Companies Table -->
    <v-card v-else class="rounded-xl border-gold border-1" elevation="0">
      <v-card-text class="pa-0">
        <div class="table-container">
          <table class="subscriptions-table">
            <thead>
              <tr>
                <th>اسم الشركة</th>
                <th>اسم المستخدم</th>
                <th>نوع الاشتراك</th>
                <th>الحالة قبل الحذف</th>
                <th>بواسطة من تم الحذف</th>
                <th>تاريخ الحذف</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="company in deletedCompanies" :key="company.id">
                <td>
                  <div class="font-weight-bold">{{ company.companyName }}</div>
                  <div class="text-caption text-medium-emphasis">{{ company.email }}</div>
                </td>
                <td>{{ company.username || '-' }}</td>
                <td>{{ company.planName || '-' }}</td>
                <td>
                  <span class="status-badge" :class="getStatusClass(company.subscriptionStatus)">
                    {{ getStatusText(company.subscriptionStatus) }}
                  </span>
                </td>
                <td>{{ company.deletedBy }}</td>
                <td>{{ formatDate(company.deletedAt) }}</td>
                <td class="actions">
                  <v-btn
                    color="success"
                    variant="tonal"
                    size="small"
                    class="font-weight-bold me-2"
                    prepend-icon="mdi-restore"
                    :loading="restoringId === company.id"
                    @click="restoreCompany(company)"
                  >
                    استعادة
                  </v-btn>
                  <v-btn
                    color="error"
                    variant="outlined"
                    size="small"
                    class="font-weight-bold"
                    prepend-icon="mdi-delete-forever"
                    @click="confirmPermanentDelete(company)"
                  >
                    حذف دائم
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>
    </v-card>

    <!-- Permanent Delete Confirmation Dialog -->
    <v-dialog v-model="showPermanentDeleteDialog" max-width="500px" persistent>
      <v-card class="rounded-xl">
        <v-card-title class="bg-error text-white pa-4 d-flex align-center">
          <v-icon icon="mdi-alert-circle" class="me-2"></v-icon>
          <span class="text-h6 font-weight-bold">تأكيد الحذف الدائم</span>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" @click="showPermanentDeleteDialog = false"></v-btn>
        </v-card-title>

        <v-card-text class="pa-6">
          <v-alert type="error" variant="tonal" class="mb-4 rounded-lg" density="compact">
            هذا الإجراء لا يمكن التراجع عنه!
          </v-alert>

          <div class="text-body-1 mb-4">
            <p class="mb-2">
              أنت على وشك حذف المشترك
              <strong class="text-error">{{ companyToDelete?.companyName }}</strong>
              نهائياً من النظام.
            </p>
            <p class="text-medium-emphasis">
              سيتم حذف جميع بياناته وسجلاته وحساباته بشكل دائم ولا يمكن استعادتها.
            </p>
          </div>

          <v-text-field
            v-model="permanentDeleteConfirm"
            label="اكتب حذف للتأكيد"
            variant="outlined"
            color="error"
            hide-details="auto"
            class="mb-2"
          ></v-text-field>
        </v-card-text>

        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="showPermanentDeleteDialog = false">
            إلغاء
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            :disabled="permanentDeleteConfirm !== 'حذف'"
            :loading="isDeleting"
            @click="permanentDelete"
          >
            حذف نهائي
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, onMounted } from 'vue'

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? ''
    : 'https://b2b-law-g2qr.onrender.com')

async function apiRequest(method, path, body = null) {
  const token = localStorage.getItem('b2b_cloud_token') || localStorage.getItem('token')
  let xsrfToken = null
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/)
  if (match) {
    xsrfToken = decodeURIComponent(match[1])
  } else {
    xsrfToken = localStorage.getItem('csrfToken')
  }

  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(xsrfToken ? { 'X-XSRF-TOKEN': xsrfToken } : {})
    }
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${API_BASE}${path}`, opts)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return { data }
}

const deletedCompanies = ref([])
const isLoading = ref(true)
const restoringId = ref(null)
const isDeleting = ref(false)

const showPermanentDeleteDialog = ref(false)
const companyToDelete = ref(null)
const permanentDeleteConfirm = ref('')

onMounted(async () => {
  await fetchDeletedCompanies()
})

async function fetchDeletedCompanies() {
  isLoading.value = true
  try {
    const response = await apiRequest('GET', '/api/admin/subscriptions/deleted')
    deletedCompanies.value = response.data?.data || response.data || []
  } catch (error) {
    console.error('Failed to fetch deleted companies:', error)
    alert('حدث خطأ أثناء جلب البيانات')
  } finally {
    isLoading.value = false
  }
}

async function restoreCompany(company) {
  if (!confirm(`هل تريد استعادة المشترك "${company.companyName}"؟`)) {
    return
  }

  restoringId.value = company.id
  try {
    const response = await apiRequest('POST', `/api/admin/subscriptions/restore/${company.id}`)
    alert(response.data?.message || 'تمت الاستعادة بنجاح')
    await fetchDeletedCompanies()
  } catch (error) {
    console.error('Failed to restore company:', error)
    alert('حدث خطأ أثناء استعادة المشترك')
  } finally {
    restoringId.value = null
  }
}

function confirmPermanentDelete(company) {
  companyToDelete.value = company
  permanentDeleteConfirm.value = ''
  showPermanentDeleteDialog.value = true
}

async function permanentDelete() {
  if (permanentDeleteConfirm.value !== 'حذف') return

  isDeleting.value = true
  try {
    const response = await apiRequest(
      'DELETE',
      `/api/admin/subscriptions/permanent/${companyToDelete.value.id}`
    )
    alert(response.data?.message || 'تم الحذف الدائم بنجاح')
    showPermanentDeleteDialog.value = false
    await fetchDeletedCompanies()
  } catch (error) {
    console.error('Failed to permanently delete:', error)
    alert('حدث خطأ أثناء الحذف الدائم')
  } finally {
    isDeleting.value = false
  }
}

function getStatusClass(status) {
  const statusMap = {
    active: 'status-active',
    trial: 'status-trial',
    expired: 'status-expired',
    canceled: 'status-canceled',
    past_due: 'status-past-due',
    lifetime: 'status-lifetime',
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
    past_due: 'معلق',
    lifetime: 'مدى الحياة',
    none: 'بدون اشتراك'
  }
  return statusMap[status] || status
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.admin-recycle-bin-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 16px;
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

.stat-icon.deleted {
  background-color: #fee2e2;
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

.status-past-due {
  background-color: #fef3c7;
  color: #92400e;
}

.status-lifetime {
  background-color: #dbeafe;
  color: #1e40af;
}

.status-none {
  background-color: #f3f4f6;
  color: #6b7280;
}

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
