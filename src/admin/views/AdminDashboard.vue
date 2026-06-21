<template>
  <div class="admin-dashboard">
    <!-- Header -->
    <div class="dashboard-header">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">لوحة تحكم الأدمن</h1>
        <p class="text-subtitle-1 text-medium-emphasis">إدارة النظام والمستخدمين والاشتراكات</p>
      </div>
      <div class="d-flex gap-3">
        <v-btn
          color="primary"
          prepend-icon="mdi-crown"
          @click="router.push('/admin/subscriptions')"
        >
          إدارة الاشتراكات
        </v-btn>
      </div>
    </div>

    <!-- Stats Grid -->
    <v-row>
      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card" elevation="2">
          <v-card-text class="text-center pa-6">
            <v-icon icon="mdi-account-group" size="48" color="primary" class="mb-3"></v-icon>
            <div class="text-h3 font-weight-bold">{{ stats.totalUsers }}</div>
            <div class="text-subtitle-1 text-medium-emphasis">إجمالي المستخدمين</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card" elevation="2">
          <v-card-text class="text-center pa-6">
            <v-icon icon="mdi-domain" size="48" color="success" class="mb-3"></v-icon>
            <div class="text-h3 font-weight-bold">{{ stats.totalCompanies }}</div>
            <div class="text-subtitle-1 text-medium-emphasis">إجمالي الشركات</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card" elevation="2">
          <v-card-text class="text-center pa-6">
            <v-icon icon="mdi-check-circle" size="48" color="success" class="mb-3"></v-icon>
            <div class="text-h3 font-weight-bold">{{ stats.activeSubscriptions }}</div>
            <div class="text-subtitle-1 text-medium-emphasis">اشتراكات نشطة</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card" elevation="2">
          <v-card-text class="text-center pa-6">
            <v-icon icon="mdi-cash-multiple" size="48" color="warning" class="mb-3"></v-icon>
            <div class="text-h3 font-weight-bold">{{ formatCurrency(stats.monthlyRevenue) }}</div>
            <div class="text-subtitle-1 text-medium-emphasis">إيرادات الشهر</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Recent Activity -->
    <v-row>
      <v-col cols="12" md="8">
        <v-card elevation="2">
          <v-card-title class="d-flex align-center pa-4">
            <v-icon icon="mdi-history" class="me-2"></v-icon>
            <span>النشاط الأخير</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-list>
            <v-list-item
              v-for="activity in recentActivities"
              :key="activity.id"
              :prepend-icon="activity.icon"
              :subtitle="activity.description"
              :title="activity.user"
            >
              <template #append>
                <span class="text-caption text-medium-emphasis">{{ activity.time }}</span>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card elevation="2">
          <v-card-title class="d-flex align-center pa-4">
            <v-icon icon="mdi-chart-pie" class="me-2"></v-icon>
            <span>توزيع الاشتراكات</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <div class="d-flex flex-column gap-3">
              <div v-for="item in subscriptionDistribution" :key="item.label">
                <div class="d-flex justify-space-between mb-1">
                  <span>{{ item.label }}</span>
                  <span class="font-weight-bold">{{ item.value }}</span>
                </div>
                <v-progress-linear
                  :color="item.color"
                  :model-value="item.percentage"
                  height="8"
                  rounded
                ></v-progress-linear>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Quick Actions -->
    <v-row>
      <v-col cols="12">
        <v-card elevation="2">
          <v-card-title class="d-flex align-center pa-4">
            <v-icon icon="mdi-lightning-bolt" class="me-2"></v-icon>
            <span>إجراءات سريعة</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <div class="d-flex flex-wrap gap-3">
              <v-btn
                color="primary"
                variant="outlined"
                prepend-icon="mdi-account-plus"
                @click="router.push('/users')"
              >
                إضافة مستخدم
              </v-btn>
              <v-btn
                color="success"
                variant="outlined"
                prepend-icon="mdi-domain-plus"
                @click="showAddCompanyDialog = true"
              >
                إضافة شركة
              </v-btn>
              <v-btn
                color="warning"
                variant="outlined"
                prepend-icon="mdi-crown"
                @click="router.push('/admin/subscriptions')"
              >
                تفعيل اشتراك
              </v-btn>
              <v-btn
                color="info"
                variant="outlined"
                prepend-icon="mdi-database-export"
                @click="exportData"
              >
                تصدير البيانات
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

interface Stats {
  totalUsers: number
  totalCompanies: number
  activeSubscriptions: number
  monthlyRevenue: number
}

interface Activity {
  id: number
  user: string
  description: string
  time: string
  icon: string
}

interface SubscriptionItem {
  label: string
  value: number
  percentage: number
  color: string
}

const stats = ref<Stats>({
  totalUsers: 0,
  totalCompanies: 0,
  activeSubscriptions: 0,
  monthlyRevenue: 0
})

const recentActivities = ref<Activity[]>([])
const subscriptionDistribution = ref<SubscriptionItem[]>([])
const showAddCompanyDialog = ref(false)

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0
  }).format(amount)
}

const loadDashboardData = async () => {
  try {
    // TODO: Replace with actual API calls
    // Mock data for now
    stats.value = {
      totalUsers: 247,
      totalCompanies: 56,
      activeSubscriptions: 42,
      monthlyRevenue: 125000
    }

    recentActivities.value = [
      {
        id: 1,
        user: 'أحمد محمد',
        description: 'قام بتفعيل اشتراك لشركة النور للمحاماة',
        time: 'منذ 5 دقائق',
        icon: 'mdi-check-circle'
      },
      {
        id: 2,
        user: 'فاطمة علي',
        description: 'أضافت مستخدم جديد للنظام',
        time: 'منذ 15 دقيقة',
        icon: 'mdi-account-plus'
      },
      {
        id: 3,
        user: 'محمد عبدالله',
        description: 'قام بتصدير تقرير مالي',
        time: 'منذ ساعة',
        icon: 'mdi-file-export'
      },
      {
        id: 4,
        user: 'سارة أحمد',
        description: 'حدّثت بيانات شركة',
        time: 'منذ ساعتين',
        icon: 'mdi-domain'
      }
    ]

    subscriptionDistribution.value = [
      { label: 'خطة برونزية', value: 18, percentage: 32, color: 'amber' },
      { label: 'خطة فضية', value: 15, percentage: 27, color: 'grey' },
      { label: 'خطة ذهبية', value: 9, percentage: 16, color: 'warning' },
      { label: 'تجريبية', value: 14, percentage: 25, color: 'info' }
    ]
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  }
}

const exportData = async () => {
  try {
    // TODO: Implement actual export functionality
    console.log('Exporting data...')
  } catch (error) {
    console.error('Failed to export data:', error)
  }
}

onMounted(() => {
  loadDashboardData()
})
</script>

<style scoped>
.admin-dashboard {
  padding: 24px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.stat-card {
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.gap-3 {
  gap: 12px;
}
</style>
