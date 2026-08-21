<template>
  <div class="pa-4">
    <v-row class="mb-4 align-center">
      <v-col>
        <h3 class="text-h5 font-weight-bold primary--text">تقرير ربحية القضايا الاحترافي</h3>
        <div class="text-caption text-grey">
          يتم توزيع مصروفات المكتب العامة بنسبة الدخل، واستبعاد المصاريف المستردة من تكلفة القضية.
        </div>
      </v-col>
      <v-col cols="auto" class="d-flex ga-2 report-actions">
        <v-btn variant="outlined" :loading="exporting" @click="exportCsv">تصدير CSV</v-btn>
        <v-btn color="primary" variant="tonal" @click="printReport">طباعة</v-btn>
      </v-col>
    </v-row>

    <v-data-table
      :headers="headers"
      :items="safeArray(profitabilityData)"
      :loading="loading"
      class="elevation-1 rounded-lg"
      hover
    >
      <template #[`item.income`]="{ item }">
        <span class="text-success"
          >{{ ((item as any).income || 0).toLocaleString('ar-SA') }} ريال</span
        >
      </template>
      <template #[`item.expenses`]="{ item }">
        <span class="text-error"
          >{{ ((item as any).expenses || 0).toLocaleString('ar-SA') }} ريال</span
        >
      </template>
      <template #[`item.overhead`]="{ item }">
        <span class="text-warning"
          >{{
            ((item as any).overhead || 0).toLocaleString('ar-SA', { maximumFractionDigits: 0 })
          }}
          ريال</span
        >
      </template>
      <template #[`item.profit`]="{ item }">
        <v-chip
          :color="((item as any).profit || 0) >= 0 ? 'success' : 'error'"
          size="small"
          variant="elevated"
        >
          {{ ((item as any).profit || 0).toLocaleString('ar-SA', { maximumFractionDigits: 0 }) }}
          ريال
        </v-chip>
      </template>
    </v-data-table>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFinanceStore } from '../../stores/finance'
import { useCasesStore } from '../../stores/cases'
import { storeToRefs } from 'pinia'
import { safeArray } from '../../utils/safe'

const financeStore = useFinanceStore()
const casesStore = useCasesStore()
const { transactions, loading } = storeToRefs(financeStore)
const { cases } = storeToRefs(casesStore)
const exporting = ref(false)

const headers = [
  { title: 'رقم القضية', key: 'case_number', align: 'start' as const },
  { title: 'الموضوع', key: 'subject', align: 'start' as const },
  { title: 'إجمالي الأتعاب', key: 'income', align: 'end' as const },
  { title: 'مصاريف القضية (غير المستردة)', key: 'expenses', align: 'end' as const },
  { title: 'منصرف المكتب التشغيلي', key: 'overhead', align: 'end' as const },
  { title: 'صافي الربح التقديري', key: 'profit', align: 'end' as const }
]

const profitabilityData = computed((): any[] => {
  const currentCases = safeArray(cases.value)
  const currentTransactions = safeArray(transactions.value)
  if (currentCases.length === 0 || currentTransactions.length === 0) return []

  // 1. Calculate general office overhead
  const overheadTotal = currentTransactions
    .filter((t) => t.type === 'expense' && t.expense_owner_type === 'office')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

  // 2. Calculate total income across all cases for allocation ratio
  const totalIncomeAll = currentTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

  const data: any[] = []

  currentCases.forEach((c) => {
    const caseTrans = currentTransactions.filter((t) => t.case_id === c.id)

    // Income for this case
    const income = caseTrans
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

    // Non-refundable expenses for this case (ignore is_refundable=1)
    const expenses = caseTrans
      .filter((t) => t.type === 'expense' && Number(t.is_refundable) !== 1)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

    // Allocated overhead: ratio of this case's income to total income
    const allocationRatio = totalIncomeAll > 0 ? income / totalIncomeAll : 0
    const overhead = overheadTotal * allocationRatio

    const profit = income - expenses - overhead

    if (income > 0 || expenses > 0) {
      data.push({
        id: c.id,
        case_number: c.case_number,
        subject: c.subject,
        income,
        expenses,
        overhead,
        profit
      })
    }
  })

  return data.sort((a, b) => b.profit - a.profit)
})

const exportCsv = async () => {
  exporting.value = true
  try {
    await window.api.reports.exportCsv('case-profitability-report.csv', profitabilityData.value)
  } finally {
    exporting.value = false
  }
}

const printReport = () => window.print()
</script>

<style scoped>
@media print {
  .report-actions,
  :deep(.v-data-table-footer) {
    display: none !important;
  }

  :deep(.v-table__wrapper) {
    overflow: visible !important;
  }
}
</style>
