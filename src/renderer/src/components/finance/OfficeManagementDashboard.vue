<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="accent" size="64" width="4" />
      <div class="mt-4 text-h6 text-gold font-weight-black">جاري تحميل البيانات...</div>
    </div>

    <template v-else-if="dashboard">
      <!-- Period Selector -->
      <div class="d-flex align-center justify-space-between mb-6">
        <div class="d-flex align-center ga-3">
          <v-select v-model="selectedMonth" :items="months" item-title="title" item-value="value"
            label="الشهر" variant="outlined" density="compact" hide-details style="width: 150px" @update:model-value="loadData" />
          <v-select v-model="selectedYear" :items="years" label="السنة" variant="outlined" density="compact"
            hide-details style="width: 120px" @update:model-value="loadData" />
        </div>
        <div class="d-flex ga-2">
          <v-btn color="accent" variant="flat" class="font-weight-black rounded-lg" @click="showAddExpense = true">
            <v-icon class="me-1">mdi-plus</v-icon> مصروف جديد
          </v-btn>
          <v-btn color="gold" variant="tonal" class="font-weight-black rounded-lg" @click="showAddPartner = true">
            <v-icon class="me-1">mdi-account-plus</v-icon> شريك جديد
          </v-btn>
        </div>
      </div>

      <!-- Summary Cards -->
      <v-row class="mb-6" dense>
        <v-col cols="12" sm="6" md="3">
          <v-card class="glass-card pa-5" elevation="0">
            <div class="d-flex align-center mb-3">
              <v-avatar color="success" size="48" class="me-3">
                <v-icon color="white">mdi-trending-up</v-icon>
              </v-avatar>
              <div>
                <div class="text-caption text-gold opacity-60">إجمالي الإيرادات (الدخل الفعلي)</div>
                <div class="text-h5 font-weight-black text-success">{{ formatCurrency(dashboard.summary.total_revenue) }}</div>
              </div>
            </div>
            <div class="text-caption text-gold opacity-40">الفواتير المدفوعة للشهر الحالي</div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card class="glass-card pa-5" elevation="0">
            <div class="d-flex align-center mb-3">
              <v-avatar color="error" size="48" class="me-3">
                <v-icon color="white">mdi-trending-down</v-icon>
              </v-avatar>
              <div>
                <div class="text-caption text-gold opacity-60">إجمالي المصروفات التشغيلية</div>
                <div class="text-h5 font-weight-black text-error">{{ formatCurrency(dashboard.summary.total_expenses) }}</div>
              </div>
            </div>
            <div class="text-caption text-gold opacity-40">المصروفات الفعلية للشهر الحالي</div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card class="glass-card pa-5" elevation="0">
            <div class="d-flex align-center mb-3">
              <v-avatar color="warning" size="48" class="me-3">
                <v-icon color="white">mdi-scale-balance</v-icon>
              </v-avatar>
              <div>
                <div class="text-caption text-gold opacity-60">صافي التوزان المالي</div>
                <div class="text-h5 font-weight-black" :class="dashboard.summary.net_profit >= 0 ? 'text-success' : 'text-error'">
                  {{ formatCurrency(dashboard.summary.net_profit) }}
                </div>
              </div>
            </div>
            <div class="text-caption text-gold opacity-40">المصروفات الفعلية مقارنة بالميزانية</div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card class="glass-card pa-5" elevation="0">
            <div class="d-flex align-center mb-3">
              <v-avatar color="accent" size="48" class="me-3">
                <v-icon color="white">mdi-hand-coin</v-icon>
              </v-avatar>
              <div>
                <div class="text-caption text-gold opacity-60">الميزانية التخزينية المرصودة</div>
                <div class="text-h5 font-weight-black text-accent">{{ formatCurrency(dashboard.summary.yearly_revenue) }}</div>
              </div>
            </div>
            <div class="text-caption text-gold opacity-40">المتحصلات للشهر الحالي</div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Tabs -->
      <v-card class="glass-card overflow-hidden">
        <v-tabs v-model="activeTab" color="accent" grow class="border-b border-gold-thin" show-arrows>
          <v-tab value="budget" class="font-weight-black">
            <v-icon size="18" class="me-2">mdi-chart-pie</v-icon> ميزانية الت骼ع وأصحاب الربح
          </v-tab>
          <v-tab value="expenses" class="font-weight-black">
            <v-icon size="18" class="me-2">mdi-cash-minus</v-icon> المصروفات
          </v-tab>
          <v-tab value="partners" class="font-weight-black">
            <v-icon size="18" class="me-2">mdi-account-group</v-icon> الشركاء
          </v-tab>
          <v-tab value="contributions" class="font-weight-black">
            <v-icon size="18" class="me-2">mdi-chart-bar</v-icon> مساهمات الشركاء
          </v-tab>
          <v-tab value="distributions" class="font-weight-black">
            <v-icon size="18" class="me-2">mdi-cash-multiple</v-icon> توزيع الأرباح
          </v-tab>
        </v-tabs>

        <v-window v-model="activeTab" class="pa-6">
          <!-- Budget Tab -->
          <v-window-item value="budget">
            <!-- Partner Profit Distribution -->
            <div class="mb-8">
              <div class="d-flex justify-space-between align-center mb-4">
                <h3 class="text-h6 font-weight-black text-gold">انتاجية ونسبة مساهمة الشركاء والمحامين</h3>
                <v-btn size="small" variant="tonal" color="accent" @click="distributeProfits">
                  <v-icon size="14" class="me-1">mdi-calculator</v-icon> حساب الأرباح
                </v-btn>
              </div>
              <div v-if="dashboard.partners.length === 0" class="text-center py-8 text-grey">
                لا يوجد شركاء مسجلين. أضف شريكاً أولاً.
              </div>
              <v-table v-else class="bg-transparent">
                <thead>
                  <tr>
                    <th class="text-right text-gold font-weight-black">المحامي / الشريك</th>
                    <th class="text-right text-gold font-weight-black">عدد الأعضاء</th>
                    <th class="text-right text-gold font-weight-black">إجمالي قيمة العقود</th>
                    <th class="text-right text-gold font-weight-black">المبلغ المصروف</th>
                    <th class="text-right text-gold font-weight-black">نسبة المساهمة من الدخل</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in dashboard.partners" :key="p.partner_id">
                    <td class="text-right font-weight-black text-white">
                      {{ p.name }}
                      <v-chip v-if="p.role" size="x-small" color="accent" variant="tonal" class="ms-2">{{ getRoleLabel(p.role) }}</v-chip>
                    </td>
                    <td class="text-right text-white">1</td>
                    <td class="text-right font-weight-black text-white">{{ p.share_percentage }}%</td>
                    <td class="text-right font-weight-black text-error">{{ formatCurrency(Math.abs(p.distributable_amount)) }}</td>
                    <td class="text-right">
                      <v-progress-linear :model-value="p.share_percentage" color="accent" height="8" rounded style="max-width: 120px" />
                      <span class="text-caption text-gold">{{ p.share_percentage }}%</span>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>

            <!-- Operational Budget -->
            <div>
              <div class="d-flex justify-space-between align-center mb-4">
                <h3 class="text-h6 font-weight-black text-gold">استهلاكات الميزانية التشغيلية للمؤع</h3>
                <v-btn size="small" variant="tonal" color="accent" @click="showBudgetEditor = true">
                  <v-icon size="14" class="me-1">mdi-pencil</v-icon> تعديل الميزانية
                </v-btn>
              </div>
              <v-row dense>
                <v-col v-for="cat in expenseCategories" :key="cat.key" cols="12" sm="6" md="4">
                  <v-card variant="outlined" class="pa-4 rounded-lg mb-3">
                    <div class="d-flex justify-space-between align-center mb-2">
                      <span class="font-weight-black text-body-2">{{ cat.label }}</span>
                      <v-chip size="x-small" color="accent" variant="tonal">
                        {{ getCategoryPercentage(cat.key) }}%
                      </v-chip>
                    </div>
                    <div class="d-flex justify-space-between align-center mb-2">
                      <span class="text-caption text-medium-emphasis">الميزانية:</span>
                      <span class="font-weight-black">{{ formatCurrency(getBudgetAmount(cat.key)) }}</span>
                    </div>
                    <div class="d-flex justify-space-between align-center mb-2">
                      <span class="text-caption text-medium-emphasis">الفعلي:</span>
                      <span class="font-weight-black text-error">{{ formatCurrency(getCategoryActual(cat.key)) }}</span>
                    </div>
                    <v-progress-linear
                      :model-value="getCategoryProgress(cat.key)"
                      :color="getCategoryProgress(cat.key) > 100 ? 'error' : 'success'"
                      height="6" rounded class="mt-2"
                    />
                  </v-card>
                </v-col>
              </v-row>
            </div>
          </v-window-item>

          <!-- Expenses Tab -->
          <v-window-item value="expenses">
            <div class="d-flex justify-space-between align-center mb-4">
              <h3 class="text-h6 font-weight-black text-gold">جميع المصروفات</h3>
              <v-btn color="accent" variant="flat" class="font-weight-black rounded-lg" @click="showAddExpense = true">
                <v-icon class="me-1">mdi-plus</v-icon> إضافة مصروف
              </v-btn>
            </div>
            <v-table class="bg-transparent">
              <thead>
                <tr>
                  <th class="text-right text-gold font-weight-black">التاريخ</th>
                  <th class="text-right text-gold font-weight-black">التصنيف</th>
                  <th class="text-right text-gold font-weight-black">الوصف</th>
                  <th class="text-right text-gold font-weight-black">المبلغ</th>
                  <th class="text-right text-gold font-weight-black">الدفع بواسطة</th>
                  <th class="text-right text-gold font-weight-black">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="e in expenses" :key="e.id">
                  <td class="text-right text-white">{{ formatDate(e.expense_date) }}</td>
                  <td class="text-right">
                    <v-chip size="x-small" :color="getCategoryColor(e.category)" class="font-weight-black">
                      {{ getCategoryLabel(e.category) }}
                    </v-chip>
                  </td>
                  <td class="text-right text-white">{{ e.description }}</td>
                  <td class="text-right font-weight-black text-error">{{ formatCurrency(e.amount) }}</td>
                  <td class="text-right text-white">{{ e.paid_by || 'المكتب' }}</td>
                  <td class="text-right">
                    <v-btn size="x-small" icon color="error" variant="text" @click="confirmDeleteExpense(e)">
                      <v-icon size="16">mdi-delete</v-icon>
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-window-item>

          <!-- Partners Tab -->
          <v-window-item value="partners">
            <div class="d-flex justify-space-between align-center mb-4">
              <h3 class="text-h6 font-weight-black text-gold">شركاء المكتب</h3>
              <v-btn color="accent" variant="flat" class="font-weight-black rounded-lg" @click="showAddPartner = true">
                <v-icon class="me-1">mdi-account-plus</v-icon> إضافة شريك
              </v-btn>
            </div>
            <v-row dense>
              <v-col v-for="p in partners" :key="p.id" cols="12" sm="6" md="4">
                <v-card class="glass-card pa-5" elevation="0">
                  <div class="d-flex align-center mb-3">
                    <v-avatar :color="p.role === 'managing_partner' ? 'accent' : 'primary'" size="48" class="me-3">
                      <span class="text-white font-weight-black text-h6">{{ p.name?.charAt(0) }}</span>
                    </v-avatar>
                    <div>
                      <div class="font-weight-black text-body-1">{{ p.name }}</div>
                      <div class="text-caption text-gold opacity-60">{{ p.employee_name || '---' }}</div>
                    </div>
                  </div>
                  <v-divider class="mb-3" />
                  <div class="d-flex justify-space-between mb-2">
                    <span class="text-caption text-medium-emphasis">نسبة الربح:</span>
                    <span class="font-weight-black text-accent">{{ p.share_percentage }}%</span>
                  </div>
                  <div class="d-flex justify-space-between mb-2">
                    <span class="text-caption text-medium-emphasis">الدور:</span>
                    <v-chip size="x-small" color="accent" variant="tonal" class="font-weight-black">
                      {{ getRoleLabel(p.role) }}
                    </v-chip>
                  </div>
                  <div class="d-flex justify-space-between">
                    <span class="text-caption text-medium-emphasis">الحالة:</span>
                    <v-chip size="x-small" :color="p.is_active ? 'success' : 'grey'" class="font-weight-black">
                      {{ p.is_active ? 'نشط' : 'غير نشط' }}
                    </v-chip>
                  </div>
                </v-card>
              </v-col>
            </v-row>
          </v-window-item>

          <!-- Contributions Tab -->
          <v-window-item value="contributions">
            <div class="d-flex justify-space-between align-center mb-4">
              <h3 class="text-h6 font-weight-black text-gold">مساهمات الشركاء</h3>
              <v-btn color="accent" variant="flat" class="font-weight-black rounded-lg" @click="showAddContribution = true">
                <v-icon class="me-1">mdi-plus</v-icon> إضافة مساهمة
              </v-btn>
            </div>
            <v-table class="bg-transparent">
              <thead>
                <tr>
                  <th class="text-right text-gold font-weight-black">التاريخ</th>
                  <th class="text-right text-gold font-weight-black">الشريك</th>
                  <th class="text-right text-gold font-weight-black">نوع المساهمة</th>
                  <th class="text-right text-gold font-weight-black">الوصف</th>
                  <th class="text-right text-gold font-weight-black">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in contributions" :key="c.id">
                  <td class="text-right text-white">{{ formatDate(c.contribution_date) }}</td>
                  <td class="text-right font-weight-black text-white">{{ c.partner_name }}</td>
                  <td class="text-right">
                    <v-chip size="x-small" color="accent" variant="tonal" class="font-weight-black">
                      {{ getContributionTypeLabel(c.contribution_type) }}
                    </v-chip>
                  </td>
                  <td class="text-right text-white">{{ c.description || '---' }}</td>
                  <td class="text-right font-weight-black text-success">{{ formatCurrency(c.amount) }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-window-item>

          <!-- Distributions Tab -->
          <v-window-item value="distributions">
            <div class="d-flex justify-space-between align-center mb-4">
              <h3 class="text-h6 font-weight-black text-gold">توزيع الأرباح</h3>
              <v-btn color="accent" variant="flat" class="font-weight-black rounded-lg" @click="distributeProfits">
                <v-icon class="me-1">mdi-calculator</v-icon> حساب وتوزيع الأرباح
              </v-btn>
            </div>
            <div v-if="distributions.length === 0" class="text-center py-8 text-grey">
              لا توجد توزيعات أرباح لهذا الشهر. اضغط "حساب وتوزيع الأرباح".
            </div>
            <v-table v-else class="bg-transparent">
              <thead>
                <tr>
                  <th class="text-right text-gold font-weight-black">الشريك</th>
                  <th class="text-right text-gold font-weight-black">الدور</th>
                  <th class="text-right text-gold font-weight-black">نسبة الربح</th>
                  <th class="text-right text-gold font-weight-black">صافي الربح</th>
                  <th class="text-right text-gold font-weight-black">نصيب الشريك</th>
                  <th class="text-right text-gold font-weight-black">الحالة</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in distributions" :key="d.id">
                  <td class="text-right font-weight-black text-white">{{ d.partner_name }}</td>
                  <td class="text-right text-white">{{ getRoleLabel(d.role) }}</td>
                  <td class="text-right text-accent font-weight-black">{{ d.share_percentage }}%</td>
                  <td class="text-right font-weight-black text-white">{{ formatCurrency(d.net_profit) }}</td>
                  <td class="text-right font-weight-black text-success">{{ formatCurrency(d.partner_share) }}</td>
                  <td class="text-right">
                    <v-chip size="x-small" :color="d.distributed ? 'success' : 'warning'" class="font-weight-black">
                      {{ d.distributed ? 'تم التوزيع' : 'لم يتم التوزيع' }}
                    </v-chip>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-window-item>
        </v-window>
      </v-card>
    </template>

    <!-- Add Expense Dialog -->
    <v-dialog v-model="showAddExpense" max-width="600" persistent>
      <v-card class="rounded-xl">
        <v-card-title class="text-h6 font-weight-black">إضافة مصروف جديد</v-card-title>
        <v-card-text>
          <v-select v-model="newExpense.category" :items="expenseCategories" item-title="title" item-value="value"
            label="التصنيف" variant="outlined" class="mb-3" />
          <v-text-field v-model="newExpense.description" label="الوصف" variant="outlined" class="mb-3" />
          <v-text-field v-model.number="newExpense.amount" label="المبلغ" type="number" variant="outlined" class="mb-3" />
          <v-text-field v-model="newExpense.expense_date" label="التاريخ" type="date" variant="outlined" class="mb-3" />
          <v-select v-model="newExpense.paid_by" :items="['المكتب', 'شريك', 'أخرى']" label="الدفع بواسطة"
            variant="outlined" class="mb-3" clearable />
          <v-textarea v-model="newExpense.notes" label="ملاحظات" variant="outlined" rows="2" />
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showAddExpense = false">إلغاء</v-btn>
          <v-btn color="accent" :loading="saving" :disabled="!newExpense.description || !newExpense.amount" @click="handleAddExpense">
            إضافة
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Partner Dialog -->
    <v-dialog v-model="showAddPartner" max-width="500" persistent>
      <v-card class="rounded-xl">
        <v-card-title class="text-h6 font-weight-black">إضافة شريك جديد</v-card-title>
        <v-card-text>
          <v-text-field v-model="newPartner.name" label="اسم الشريك" variant="outlined" class="mb-3" />
          <v-text-field v-model.number="newPartner.share_percentage" label="نسبة الربح (%)" type="number" variant="outlined" class="mb-3" />
          <v-select v-model="newPartner.role" :items="partnerRoles" item-title="title" item-value="value"
            label="الدور" variant="outlined" class="mb-3" />
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showAddPartner = false">إلغاء</v-btn>
          <v-btn color="accent" :loading="saving" :disabled="!newPartner.name || !newPartner.share_percentage" @click="handleAddPartner">
            إضافة
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Contribution Dialog -->
    <v-dialog v-model="showAddContribution" max-width="600" persistent>
      <v-card class="rounded-xl">
        <v-card-title class="text-h6 font-weight-black">إضافة مساهمة شريك</v-card-title>
        <v-card-text>
          <v-select v-model="newContribution.partner_id" :items="partners" item-title="name" item-value="id"
            label="الشريك" variant="outlined" class="mb-3" />
          <v-select v-model="newContribution.contribution_type" :items="contributionTypes" item-title="title" item-value="value"
            label="نوع المساهمة" variant="outlined" class="mb-3" />
          <v-text-field v-model="newContribution.description" label="الوصف" variant="outlined" class="mb-3" />
          <v-text-field v-model.number="newContribution.amount" label="المبلغ (اختياري)" type="number" variant="outlined" class="mb-3" />
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showAddContribution = false">إلغاء</v-btn>
          <v-btn color="accent" :loading="saving" :disabled="!newContribution.partner_id || !newContribution.contribution_type" @click="handleAddContribution">
            إضافة
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" rounded="lg">
      <span class="font-weight-black">{{ snackbarText }}</span>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOfficeManagementStore } from '../../stores/officeManagement'

const store = useOfficeManagementStore()

const now = new Date()
const selectedMonth = ref(now.getMonth() + 1)
const selectedYear = ref(now.getFullYear())
const activeTab = ref('budget')
const loading = ref(true)
const saving = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const showAddExpense = ref(false)
const showAddPartner = ref(false)
const showAddContribution = ref(false)
const showBudgetEditor = ref(false)

const newExpense = ref<any>({ category: 'other', description: '', amount: 0, expense_date: now.toISOString().split('T')[0], paid_by: 'المكتب', notes: '' })
const newPartner = ref<any>({ name: '', share_percentage: 0, role: 'partner' })
const newContribution = ref<any>({ partner_id: '', contribution_type: 'client_acquired', description: '', amount: 0 })

const months = [
  { title: 'يناير', value: 1 }, { title: 'فبراير', value: 2 }, { title: 'مارس', value: 3 },
  { title: 'أبريل', value: 4 }, { title: 'مايو', value: 5 }, { title: 'يونيو', value: 6 },
  { title: 'يوليو', value: 7 }, { title: 'أغسطس', value: 8 }, { title: 'سبتمبر', value: 9 },
  { title: 'أكتوبر', value: 10 }, { title: 'نوفمبر', value: 11 }, { title: 'ديسمبر', value: 12 }
]
const years = [2024, 2025, 2026, 2027, 2028]

const expenseCategories = [
  { title: 'رواتب', value: 'salaries', key: 'salaries', label: 'رواتب', icon: 'mdi-account-cash', color: 'primary' },
  { title: 'إيجار', value: 'rent', key: 'rent', label: 'إيجار', icon: 'mdi-home', color: 'amber' },
  { title: 'مرافق', value: 'utilities', key: 'utilities', label: 'مرافق', icon: 'mdi-flash', color: 'orange' },
  { title: 'تسويق', value: 'marketing', key: 'marketing', label: 'تسويق', icon: 'mdi-bullhorn', color: 'purple' },
  { title: 'مستلزمات قانونية', value: 'legal_supplies', key: 'legal_supplies', label: 'مستلزمات قانونية', icon: 'mdi-scale', color: 'teal' },
  { title: 'مستلزمات مكتبية', value: 'office_supplies', key: 'office_supplies', label: 'مستلزمات مكتبية', icon: 'mdi-pillar', color: 'indigo' }
]

const partnerRoles = [
  { title: 'شريك إداري', value: 'managing_partner' },
  { title: 'شريك أول', value: 'senior_partner' },
  { title: 'شريك', value: 'partner' },
  { title: 'شريك مشارك', value: 'junior_partner' }
]

const contributionTypes = [
  { title: 'جلب العميل', value: 'client_acquired' },
  { title: 'تسيير القضية', value: 'case_managed' },
  { title: 'إعداد المستندات', value: 'documents_prepared' },
  { title: 'إغلاق الملف', value: 'case_closed' },
  { title: 'تحصيل الأتعاب', value: 'fee_collected' }
]

const dashboard = computed(() => store.dashboard)
const expenses = computed(() => store.expenses)
const partners = computed(() => store.partners)
const contributions = computed(() => store.contributions)
const distributions = computed(() => store.distributions)

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(val || 0)

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '---'
  try { return new Date(dateStr).toLocaleDateString('ar-SA') } catch { return dateStr }
}

const getCategoryLabel = (key: string) => expenseCategories.find(c => c.value === key)?.label || key
const getCategoryColor = (key: string) => expenseCategories.find(c => c.value === key)?.color || 'grey'
const getRoleLabel = (role: string) => {
  const r = partnerRoles.find(r => r.value === role)
  return r?.title || role || 'شريك'
}
const getContributionTypeLabel = (type: string) => contributionTypes.find(c => c.value === type)?.title || type

const getCategoryPercentage = (key: string) => {
  const total = Number(dashboard.value?.summary.total_expenses || 1)
  const cat = dashboard.value?.expenses_by_category.find((c: any) => c.category === key)
  return Math.round((Number(cat?.total || 0) / total) * 100)
}

const getBudgetAmount = (key: string) => {
  const b = dashboard.value?.budget.find((b: any) => b.category === key)
  return Number(b?.budgeted_amount || 0)
}

const getCategoryActual = (key: string) => {
  const cat = dashboard.value?.expenses_by_category.find((c: any) => c.category === key)
  return Number(cat?.total || 0)
}

const getCategoryProgress = (key: string) => {
  const budget = getBudgetAmount(key)
  if (budget <= 0) return 0
  return Math.round((getCategoryActual(key) / budget) * 100)
}

const loadData = async () => {
  loading.value = true
  await Promise.all([
    store.fetchDashboard({ month: selectedMonth.value, year: selectedYear.value }),
    store.fetchExpenses({ month: selectedMonth.value, year: selectedYear.value }),
    store.fetchPartners(),
    store.fetchContributions({ month: selectedMonth.value, year: selectedYear.value }),
    store.fetchDistributions({ month: selectedMonth.value, year: selectedYear.value })
  ])
  loading.value = false
}

const triggerSnackbar = (text: string, color = 'success') => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

const handleAddExpense = async () => {
  saving.value = true
  try {
    await store.addExpense(newExpense.value)
    showAddExpense.value = false
    newExpense.value = { category: 'other', description: '', amount: 0, expense_date: now.toISOString().split('T')[0], paid_by: 'المكتب', notes: '' }
    await loadData()
    triggerSnackbar('تم إضافة المصروف بنجاح')
  } catch (e) {
    triggerSnackbar('حدث خطأ', 'error')
  } finally {
    saving.value = false
  }
}

const confirmDeleteExpense = async (expense: any) => {
  if (!confirm('هل أنت متأكد من حذف هذا المصروف؟')) return
  try {
    await store.deleteExpense(expense.id)
    await loadData()
    triggerSnackbar('تم حذف المصروف')
  } catch (e) {
    triggerSnackbar('حدث خطأ', 'error')
  }
}

const handleAddPartner = async () => {
  saving.value = true
  try {
    await store.addPartner(newPartner.value)
    showAddPartner.value = false
    newPartner.value = { name: '', share_percentage: 0, role: 'partner' }
    await loadData()
    triggerSnackbar('تم إضافة الشريك بنجاح')
  } catch (e) {
    triggerSnackbar('حدث خطأ', 'error')
  } finally {
    saving.value = false
  }
}

const handleAddContribution = async () => {
  saving.value = true
  try {
    await store.addContribution(newContribution.value)
    showAddContribution.value = false
    newContribution.value = { partner_id: '', contribution_type: 'client_acquired', description: '', amount: 0 }
    await loadData()
    triggerSnackbar('تم إضافة المساهمة بنجاح')
  } catch (e) {
    triggerSnackbar('حدث خطأ', 'error')
  } finally {
    saving.value = false
  }
}

const distributeProfits = async () => {
  try {
    await store.distributeProfits({ month: selectedMonth.value, year: selectedYear.value })
    await store.fetchDistributions({ month: selectedMonth.value, year: selectedYear.value })
    triggerSnackbar('تم حساب وتوزيع الأرباح بنجاح')
  } catch (e) {
    triggerSnackbar('حدث خطأ في التوزيع', 'error')
  }
}

onMounted(loadData)
</script>
