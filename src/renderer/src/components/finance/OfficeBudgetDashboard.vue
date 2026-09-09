<template>
  <div class="pa-4 office-budget-dashboard">
    <!-- Header / Filters -->
    <div class="d-flex justify-space-between align-center mb-6 flex-wrap gap-4 no-print">
      <div class="d-flex align-center gap-3">
        <h3 class="text-h6 font-weight-black text-gold">ميزانية التشغيل وأعمال الشركاء</h3>
        <!-- Month Selector -->
        <v-select
          v-model="selectedMonth"
          :items="months"
          label="الشهر"
          variant="outlined"
          density="compact"
          hide-details
          style="width: 120px"
          class="glass-input"
          @update:model-value="loadData"
        ></v-select>
        <!-- Year Selector -->
        <v-select
          v-model="selectedYear"
          :items="years"
          label="السنة"
          variant="outlined"
          density="compact"
          hide-details
          style="width: 120px"
          class="glass-input"
          @update:model-value="loadData"
        ></v-select>
      </div>

      <div class="d-flex gap-2">
        <v-btn
          color="accent"
          variant="outlined"
          prepend-icon="mdi-pencil-box-outline"
          class="rounded-lg font-weight-black"
          @click="openBudgetEditDialog"
        >
          تعديل حدود الميزانية
        </v-btn>
        <v-btn
          color="accent"
          variant="flat"
          prepend-icon="mdi-file-delimited"
          class="rounded-lg font-weight-black text-black"
          @click="exportCsv"
        >
          تصدير Excel / CSV
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-printer"
          class="rounded-lg font-weight-black"
          @click="printDashboard"
        >
          طباعة التقرير
        </v-btn>
      </div>
    </div>

    <!-- Print Title -->
    <div class="print-only text-center text-black mb-6">
      <h2 class="text-h4 font-weight-black">تقرير الميزانية التشغيلية ونسب الشركاء</h2>
      <h3 class="text-h5 mt-2">شهر {{ selectedMonth }} - سنة {{ selectedYear }}</h3>
      <v-divider class="my-4" color="black"></v-divider>
    </div>

    <v-row v-if="loading" class="no-print">
      <v-col cols="12" class="text-center py-12">
        <v-progress-circular indeterminate color="accent" size="64"></v-progress-circular>
        <div class="text-subtitle-1 mt-4 text-gold">
          جاري تحميل تقارير الميزانية وأعمال الشركاء...
        </div>
      </v-col>
    </v-row>

    <template v-else>
      <!-- 1. Executive Summary Cards -->
      <v-row class="mb-6">
        <v-col cols="12" sm="3">
          <v-card border rounded="xl" class="pa-4 bg-glass text-start card-income">
            <div class="text-subtitle-2 text-grey">إجمالي التحصيلات (الدخل الفعلي)</div>
            <div class="text-h4 font-weight-black text-success mt-2">
              {{ (financeStore.budgetStats?.income || 0).toLocaleString('ar-SA') }}
              <span class="text-caption">ريال</span>
            </div>
            <div class="text-caption text-grey mt-1">المقبوضات الفعلية للشهر الحالي</div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="3">
          <v-card border rounded="xl" class="pa-4 bg-glass text-start card-expense">
            <div class="text-subtitle-2 text-grey">إجمالي المصاريف التشغيلية الفعلية</div>
            <div class="text-h4 font-weight-black text-error mt-2">
              {{ (financeStore.budgetStats?.expense || 0).toLocaleString('ar-SA') }}
              <span class="text-caption">ريال</span>
            </div>
            <div class="text-caption text-grey mt-1">المصروفات الفعلية للشهر الحالي</div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="3">
          <v-card border rounded="xl" class="pa-4 bg-glass text-start card-profit">
            <div class="text-subtitle-2 text-grey">صافي الأرباح القابلة للتوزيع</div>
            <div class="text-h4 font-weight-black text-gold mt-2">
              {{
                (
                  (financeStore.budgetStats?.income || 0) - (financeStore.budgetStats?.expense || 0)
                ).toLocaleString('ar-SA')
              }}
              <span class="text-caption">ريال</span>
            </div>
            <div class="text-caption text-grey mt-1">الدخل الفعلي مطروحاً منه المصاريف</div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="3">
          <v-card border rounded="xl" class="pa-4 bg-glass text-start card-budget">
            <div class="text-subtitle-2 text-grey">الميزانية التقديرية المرصودة</div>
            <div class="text-h4 font-weight-black text-info mt-2">
              {{ (financeStore.budgetStats?.budgeted || 0).toLocaleString('ar-SA') }}
              <span class="text-caption">ريال</span>
            </div>
            <div class="text-caption text-grey mt-1">الحدود المخططة للمصروفات</div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Visual Budget Charts -->
      <v-row class="mb-6 no-print" dense>
        <v-col cols="12" md="5">
          <v-card border rounded="xl" class="pa-5 bg-glass text-start h-100">
            <div class="text-subtitle-2 font-weight-black text-gold mb-3">
              توزيع التدفقات المالية (الدخل / المصاريف / الأرباح)
            </div>
            <div style="height: 220px">
              <PieChart :labels="budgetPieLabels" :data="budgetPieValues" :colors="budgetPieColors" />
            </div>
          </v-card>
        </v-col>
        <v-col cols="12" md="7">
          <v-card border rounded="xl" class="pa-5 bg-glass text-start h-100">
            <div class="text-subtitle-2 font-weight-black text-gold mb-3">
              مقارنة مبالغ التحصيل للشركاء والمحامين
            </div>
            <div style="height: 220px">
              <SimpleBarChart :data="lawyersBarData" :height="220" />
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mb-6">
        <!-- 2. Lawyer Contributions (Goal 2) -->
        <v-col cols="12" md="7">
          <v-card border rounded="xl" class="bg-glass text-start h-100">
            <v-card-item class="px-6 py-4">
              <div class="d-flex justify-space-between align-center">
                <v-card-title class="font-weight-black text-gold"
                  >إنتاجية ونسب مساهمة الشركاء والمحامين</v-card-title
                >
                <v-chip color="accent" size="small">إيرادات الأعمال</v-chip>
              </div>
            </v-card-item>
            <v-divider></v-divider>
            <v-table class="premium-table">
              <thead>
                <tr>
                  <th class="text-start">المحامي / الشريك</th>
                  <th class="text-start">عدد الأعمال</th>
                  <th class="text-start">إجمالي قيمة العقود</th>
                  <th class="text-start">المبالغ المحصلة</th>
                  <th class="text-start">نسبة المساهمة من الدخل</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="lawyer in (accountsStore.report as any)?.lawyer_contributions"
                  :key="lawyer.lawyer_name"
                >
                  <td class="font-weight-bold">{{ lawyer.lawyer_name }}</td>
                  <td>{{ lawyer.works_count }} أعمال</td>
                  <td>{{ lawyer.total_contracts_amount.toLocaleString('ar-SA') }} ريال</td>
                  <td class="text-success font-weight-bold">
                    {{ lawyer.collected_amount.toLocaleString('ar-SA') }} ريال
                  </td>
                  <td>
                    <div class="d-flex align-center gap-2">
                      <v-progress-linear
                        :model-value="lawyer.contribution_percentage"
                        color="accent"
                        height="8"
                        rounded
                        style="width: 60px"
                      ></v-progress-linear>
                      <span class="font-weight-bold text-accent"
                        >{{ lawyer.contribution_percentage }}%</span
                      >
                    </div>
                  </td>
                </tr>
                <tr
                  v-if="
                    !(accountsStore.report as any)?.lawyer_contributions ||
                    (accountsStore.report as any)?.lawyer_contributions.length === 0
                  "
                >
                  <td colspan="5" class="text-center py-6 text-grey">
                    لا توجد مساهمات مسجلة للمحامين هذا الشهر
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card>
        </v-col>

        <!-- 3. Expenses vs Budget limit by category -->
        <v-col cols="12" md="5">
          <v-card border rounded="xl" class="bg-glass text-start h-100">
            <v-card-item class="px-6 py-4">
              <v-card-title class="font-weight-black text-gold"
                >استهلاك الميزانية التشغيلية للفروع</v-card-title
              >
            </v-card-item>
            <v-divider></v-divider>
            <div class="pa-6">
              <div
                v-for="cat in financeStore.budgetStats?.categoriesStats"
                :key="cat.category_id"
                class="mb-4"
              >
                <div class="d-flex justify-space-between align-center mb-1">
                  <span class="font-weight-bold">{{ cat.category_name }}</span>
                  <span class="text-caption text-grey">
                    {{ cat.actual_amount.toLocaleString('ar-SA') }} /
                    {{ cat.budget_limit.toLocaleString('ar-SA') }} ريال
                  </span>
                </div>
                <div class="d-flex align-center gap-3">
                  <v-progress-linear
                    :model-value="cat.percent"
                    :color="getBudgetBarColor(cat.percent)"
                    height="12"
                    rounded
                  ></v-progress-linear>
                  <span
                    class="text-caption font-weight-bold"
                    :class="getBudgetTextColor(cat.percent)"
                  >
                    {{ cat.percent }}%
                  </span>
                </div>
              </div>

              <div
                v-if="
                  !financeStore.budgetStats?.categoriesStats ||
                  financeStore.budgetStats.categoriesStats.length === 0
                "
                class="text-center py-6 text-grey"
              >
                لا توجد ميزانيات أو تصنيفات مصروفات نشطة حالياً
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Budget Edit Dialog -->
    <v-dialog v-model="showBudgetEditDialog" width="100%" max-width="500" persistent>
      <v-card class="rounded-xl modal-card">
        <v-toolbar color="primary" class="px-6" height="64">
          <v-toolbar-title class="font-weight-black text-white"
            >تعديل حدود الميزانية التقديرية</v-toolbar-title
          >
          <v-spacer></v-spacer>
          <v-btn
            :icon="ICONS.UI.CLOSE"
            variant="text"
            color="white"
            @click="showBudgetEditDialog = false"
          ></v-btn>
        </v-toolbar>

        <v-card-text class="pa-6" style="max-height: 400px; overflow-y: auto">
          <v-form ref="budgetFormRef">
            <v-row dense>
              <v-col v-for="b in editBudgets" :key="b.category_id" cols="12" class="mb-2">
                <v-text-field
                  v-model.number="b.amount"
                  :label="b.category_name + ' (حد الميزانية بريال)'"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  class="glass-input"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions class="pa-6 pt-0">
          <v-spacer></v-spacer>
          <v-btn variant="text" color="grey" @click="showBudgetEditDialog = false">إلغاء</v-btn>
          <v-btn
            color="accent"
            class="rounded-lg font-weight-black px-6"
            :loading="savingBudget"
            @click="saveBudgets"
          >
            حفظ التغييرات
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useFinanceStore } from '../../stores/finance'
import { useOfficeAccountsStore } from '../../stores/officeAccounts'
import { ICONS } from '../../config/icons'

const financeStore = useFinanceStore()
const accountsStore = useOfficeAccountsStore()

const selectedMonth = ref(new Date().getMonth() + 1)
const selectedYear = ref(new Date().getFullYear())
const loading = ref(false)

const months = Array.from({ length: 12 }, (_, i) => i + 1)
const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i)

const showBudgetEditDialog = ref(false)
const savingBudget = ref(false)
const editBudgets = ref<any[]>([])

const loadData = async () => {
  loading.value = true
  try {
    const filters = {
      from_date: `${selectedYear.value}-${String(selectedMonth.value).padStart(2, '0')}-01`,
      to_date: `${selectedYear.value}-${String(selectedMonth.value).padStart(2, '0')}-31`
    }
    await Promise.all([
      financeStore.fetchBudgetStats(selectedMonth.value, selectedYear.value),
      accountsStore.fetchReport(filters)
    ])
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadData()
})

const getBudgetBarColor = (percent: number) => {
  if (percent >= 100) return 'error'
  if (percent >= 85) return 'warning'
  return 'accent'
}

const getBudgetTextColor = (percent: number) => {
  if (percent >= 100) return 'text-error'
  if (percent >= 85) return 'text-warning'
  return 'text-accent'
}

const openBudgetEditDialog = async () => {
  await financeStore.fetchBudgets(selectedMonth.value, selectedYear.value)
  editBudgets.value = financeStore.budgets.map((b) => ({
    category_id: b.category_id,
    category_name: b.category_name,
    amount: b.budget_limit
  }))
  showBudgetEditDialog.value = true
}

const saveBudgets = async () => {
  savingBudget.value = true
  try {
    const payload = editBudgets.value.map((b) => ({
      category_id: b.category_id,
      amount: b.amount,
      month: selectedMonth.value,
      year: selectedYear.value
    }))
    await financeStore.saveBudgets(payload)
    showBudgetEditDialog.value = false
    await loadData()
  } finally {
    savingBudget.value = false
  }
}

const budgetPieLabels = computed(() => ['الدخل الفعلي', 'المصاريف التشغيلية', 'صافي الأرباح'])
const budgetPieValues = computed(() => [
  Number(financeStore.budgetStats?.income || 0),
  Number(financeStore.budgetStats?.expense || 0),
  Math.max(0, Number(financeStore.budgetStats?.income || 0) - Number(financeStore.budgetStats?.expense || 0))
])
const budgetPieColors = ['#4ade80', '#ef4444', '#cda152']

const lawyersBarData = computed(() => {
  const lawyers = (accountsStore.report as any)?.lawyer_contributions || financeStore.budgetStats?.lawyer_contributions || []
  if (!lawyers || lawyers.length === 0) {
    return [{ label: 'لا توجد مساهمات', value: 0, color: '#38bdf8' }]
  }
  return lawyers.slice(0, 6).map((l: any) => ({
    label: String(l.lawyer_name || 'محامي').slice(0, 14),
    value: Number(l.collected_amount || 0),
    color: '#38bdf8'
  }))
})

const exportCsv = async (): Promise<void> => {
  try {
    const lawyers = (accountsStore.report as any)?.lawyer_contributions || financeStore.budgetStats?.lawyer_contributions || []
    const categories = financeStore.budgetStats?.categoriesStats || []
    const rows = [
      { 'القسم': 'ملخص عام', 'البند': 'إجمالي التحصيلات (الدخل)', 'القيمة': financeStore.budgetStats?.income || 0, 'البيان': 'ريال' },
      { 'القسم': 'ملخص عام', 'البند': 'المصاريف التشغيلية', 'القيمة': financeStore.budgetStats?.expense || 0, 'البيان': 'ريال' },
      { 'القسم': 'ملخص عام', 'البند': 'صافي الأرباح', 'القيمة': (financeStore.budgetStats?.income || 0) - (financeStore.budgetStats?.expense || 0), 'البيان': 'ريال' },
      { 'القسم': 'ملخص عام', 'البند': 'الميزانية التقديرية', 'القيمة': financeStore.budgetStats?.budgeted || 0, 'البيان': 'ريال' },
      ...categories.map((c: any) => ({
        'القسم': 'تصنيفات المصاريف',
        'البند': c.category_name || '',
        'القيمة': c.actual_amount || 0,
        'البيان': `الحد المرصود: ${c.budget_limit || 0} ريال (${c.percent || 0}%)`
      })),
      ...lawyers.map((l: any) => ({
        'القسم': 'مساهمات الشركاء والمحامين',
        'البند': l.lawyer_name || '',
        'القيمة': l.collected_amount || 0,
        'البيان': `الأعمال: ${l.works_count || 0} - نسبة المساهمة: ${l.contribution_percentage || 0}%`
      }))
    ]
    const filename = `ميزانية_أعمال_الشركاء_${selectedYear.value}_${selectedMonth.value}.csv`
    const res = await (window.api as any).reports?.exportCsv?.(filename, rows)
    if (res?.csv) {
      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.filename || filename
      a.click()
      URL.revokeObjectURL(url)
    }
  } catch (e) {
    console.error('Export CSV error:', e)
  }
}

const printDashboard = () => {
  window.print()
}
</script>

<style scoped>
.bg-glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.card-income {
  border-left: 4px solid #4caf50 !important;
}
.card-expense {
  border-left: 4px solid #f44336 !important;
}
.card-profit {
  border-left: 4px solid var(--v-theme-gold, #cda152) !important;
}
.card-budget {
  border-left: 4px solid #2196f3 !important;
}

/* Printing */
.print-only {
  display: none;
}

@media print {
  body {
    background: white !important;
    color: black !important;
  }
  .no-print {
    display: none !important;
  }
  .print-only {
    display: block !important;
  }
  .bg-glass {
    background: transparent !important;
    backdrop-filter: none !important;
    border: 1px solid #ccc !important;
    color: black !important;
  }
  .text-gold,
  .text-success,
  .text-warning,
  .text-error,
  .text-accent {
    color: black !important;
  }
  .premium-table th {
    background-color: #f0f0f0 !important;
    color: black !important;
    border-bottom: 2px solid #ccc !important;
  }
  .premium-table td {
    border-bottom: 1px solid #ddd !important;
    color: black !important;
  }
}
</style>

