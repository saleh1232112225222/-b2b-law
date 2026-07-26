<template>
  <div class="pa-2">
    <div class="d-flex justify-space-between align-center mb-3">
      <div class="text-subtitle-2 font-weight-black">إدارة المكتب المالية</div>
      <v-btn size="x-small" variant="tonal" color="accent" :loading="loading" @click="loadData">
        <v-icon size="14">mdi-refresh</v-icon>
      </v-btn>
    </div>

    <div v-if="loading" class="text-center py-6">
      <v-progress-circular indeterminate color="accent" size="32" />
    </div>

    <template v-else-if="dashboard">
      <!-- Period Selector -->
      <v-row dense class="mb-3">
        <v-col cols="6">
          <v-select
            v-model="selectedMonth"
            :items="months"
            item-title="title"
            item-value="value"
            label="الشهر"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="loadData"
          />
        </v-col>
        <v-col cols="6">
          <v-select
            v-model="selectedYear"
            :items="years"
            label="السنة"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="loadData"
          />
        </v-col>
      </v-row>

      <!-- Summary Cards -->
      <v-row dense class="mb-3">
        <v-col cols="4">
          <v-card variant="outlined" class="pa-3 text-center rounded-lg">
            <div class="text-caption text-medium-emphasis">الإيرادات</div>
            <div class="text-subtitle-2 font-weight-black text-success">
              {{ formatMoney(dashboard.summary.total_revenue) }}
            </div>
          </v-card>
        </v-col>
        <v-col cols="4">
          <v-card variant="outlined" class="pa-3 text-center rounded-lg">
            <div class="text-caption text-medium-emphasis">المصروفات</div>
            <div class="text-subtitle-2 font-weight-black text-error">
              {{ formatMoney(dashboard.summary.total_expenses) }}
            </div>
          </v-card>
        </v-col>
        <v-col cols="4">
          <v-card variant="outlined" class="pa-3 text-center rounded-lg">
            <div class="text-caption text-medium-emphasis">صافي الربح</div>
            <div
              class="text-subtitle-2 font-weight-black"
              :class="dashboard.summary.net_profit >= 0 ? 'text-success' : 'text-error'"
            >
              {{ formatMoney(dashboard.summary.net_profit) }}
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Partner Distribution Summary -->
      <div class="mb-3">
        <div class="text-subtitle-2 font-weight-black mb-2">توزيع الأرباح</div>
        <v-card
          v-if="dashboard.partners.length === 0"
          variant="outlined"
          class="pa-4 text-center rounded-lg"
        >
          <div class="text-caption text-medium-emphasis">لا يوجد شركاء مسجلين</div>
        </v-card>
        <v-card
          v-for="p in dashboard.partners"
          v-else
          :key="p.partner_id"
          variant="outlined"
          class="mb-2 pa-3 rounded-lg"
        >
          <div class="d-flex justify-space-between align-center">
            <div>
              <div class="font-weight-bold text-body-2">{{ p.name }}</div>
              <div class="text-caption text-medium-emphasis">{{ getRoleLabel(p.role) }}</div>
            </div>
            <div class="text-end">
              <div class="text-caption text-accent font-weight-bold">{{ p.share_percentage }}%</div>
              <div class="text-caption text-error font-weight-bold">
                {{ formatMoney(Math.abs(p.distributable_amount)) }}
              </div>
            </div>
          </div>
        </v-card>
      </div>

      <!-- Expenses Summary -->
      <div class="mb-3">
        <div class="d-flex justify-space-between align-center mb-2">
          <div class="text-subtitle-2 font-weight-black">مصروفات الشهر</div>
          <v-btn size="x-small" variant="tonal" color="accent" @click="showAddExpense = true">
            <v-icon size="14">mdi-plus</v-icon> إضافة
          </v-btn>
        </div>
        <v-card v-if="expenses.length === 0" variant="outlined" class="pa-4 text-center rounded-lg">
          <div class="text-caption text-medium-emphasis">لا توجد مصروفات</div>
        </v-card>
        <v-card
          v-for="e in expenses.slice(0, 5)"
          v-else
          :key="e.id"
          variant="outlined"
          class="mb-2 pa-3 rounded-lg"
        >
          <div class="d-flex justify-space-between align-center">
            <div>
              <div class="font-weight-bold text-body-2">{{ getCategoryLabel(e.category) }}</div>
              <div class="text-caption text-medium-emphasis">{{ e.description }}</div>
            </div>
            <div class="text-end">
              <div class="text-caption text-error font-weight-bold">
                {{ formatMoney(e.amount) }}
              </div>
              <div class="text-caption text-medium-emphasis">{{ formatDate(e.expense_date) }}</div>
            </div>
          </div>
        </v-card>
      </div>

      <!-- Add Expense Dialog -->
      <v-dialog v-model="showAddExpense" max-width="100%" fullscreen>
        <v-card class="rounded-t-xl">
          <v-toolbar color="primary" density="compact">
            <v-btn icon @click="showAddExpense = false"><v-icon>mdi-close</v-icon></v-btn>
            <v-toolbar-title class="font-weight-black">إضافة مصروف</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-select
              v-model="newExpense.category"
              :items="expenseCategories"
              item-title="title"
              item-value="value"
              label="التصنيف"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-text-field
              v-model="newExpense.description"
              label="الوصف"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-text-field
              v-model.number="newExpense.amount"
              label="المبلغ"
              type="number"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-text-field
              v-model="newExpense.expense_date"
              label="التاريخ"
              type="date"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-text-field
              v-model="newExpense.paid_by"
              label="الدفع بواسطة"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-textarea
              v-model="newExpense.notes"
              label="ملاحظات"
              variant="outlined"
              density="compact"
              rows="2"
            />
          </v-card-text>
          <v-card-actions class="pa-4">
            <v-btn variant="text" @click="showAddExpense = false">إلغاء</v-btn>
            <v-spacer />
            <v-btn
              color="accent"
              :loading="saving"
              :disabled="!newExpense.description || !newExpense.amount"
              @click="handleAddExpense"
            >
              إضافة
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>

    <div v-else class="text-center py-6 text-medium-emphasis">
      لا توجد بيانات متاحة. اضغط للتحديث.
    </div>

    <v-snackbar v-model="snackbar" :color="snackbarColor" rounded="lg">
      <span class="font-weight-black">{{ snackbarText }}</span>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const loading = ref(true)
const saving = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')
const showAddExpense = ref(false)

const now = new Date()
const selectedMonth = ref(now.getMonth() + 1)
const selectedYear = ref(now.getFullYear())

const dashboard = ref<any>(null)
const expenses = ref<any[]>([])

const newExpense = ref({
  category: 'other',
  description: '',
  amount: 0,
  expense_date: now.toISOString().split('T')[0],
  paid_by: 'المكتب',
  notes: ''
})

const months = [
  { title: 'يناير', value: 1 },
  { title: 'فبراير', value: 2 },
  { title: 'مارس', value: 3 },
  { title: 'أبريل', value: 4 },
  { title: 'مايو', value: 5 },
  { title: 'يونيو', value: 6 },
  { title: 'يوليو', value: 7 },
  { title: 'أغسطس', value: 8 },
  { title: 'سبتمبر', value: 9 },
  { title: 'أكتوبر', value: 10 },
  { title: 'نوفمبر', value: 11 },
  { title: 'ديسمبر', value: 12 }
]
const years = [2024, 2025, 2026, 2027, 2028]

const expenseCategories = [
  { title: 'رواتب', value: 'salaries' },
  { title: 'إيجار', value: 'rent' },
  { title: 'مرافق', value: 'utilities' },
  { title: 'تسويق', value: 'marketing' },
  { title: 'مستلزمات قانونية', value: 'legal_supplies' },
  { title: 'مستلزمات مكتبية', value: 'office_supplies' }
]

const partnerRoles: Record<string, string> = {
  managing_partner: 'شريك إداري',
  senior_partner: 'شريك أول',
  partner: 'شريك',
  junior_partner: 'شريك مشارك'
}

const formatMoney = (val: number) => (val || 0).toLocaleString()
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '---'
  try {
    return new Date(dateStr).toLocaleDateString('ar-SA')
  } catch {
    return dateStr
  }
}
const getCategoryLabel = (key: string) =>
  expenseCategories.find((c) => c.value === key)?.title || key
const getRoleLabel = (role: string) => partnerRoles[role] || role || 'شريك'

const loadData = async () => {
  loading.value = true
  try {
    const store = (await import('../../stores/officeManagement')).useOfficeManagementStore()
    await Promise.all([
      store.fetchDashboard({ month: selectedMonth.value, year: selectedYear.value }),
      store.fetchExpenses({ month: selectedMonth.value, year: selectedYear.value }),
      store.fetchPartners()
    ])
    dashboard.value = store.dashboard
    expenses.value = store.expenses
  } catch (e) {
    console.warn('Failed to load office management data:', e)
  } finally {
    loading.value = false
  }
}

const handleAddExpense = async () => {
  saving.value = true
  try {
    const store = (await import('../../stores/officeManagement')).useOfficeManagementStore()
    await store.addExpense(newExpense.value)
    showAddExpense.value = false
    newExpense.value = {
      category: 'other',
      description: '',
      amount: 0,
      expense_date: now.toISOString().split('T')[0],
      paid_by: 'المكتب',
      notes: ''
    }
    await loadData()
    snackbarText.value = 'تم إضافة المصروف بنجاح'
    snackbarColor.value = 'success'
    snackbar.value = true
  } catch (e) {
    snackbarText.value = 'حدث خطأ'
    snackbarColor.value = 'error'
    snackbar.value = true
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
</script>
