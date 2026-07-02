<template>
  <v-card-text class="pa-4 rtl">
    <v-row dense>
      <!-- Financial Metrics Card -->
      <v-col cols="12" md="6" class="mb-4">
        <v-card class="glass-panel pa-6 border border-gold border-opacity-10 h-100 rounded-xl">
          <div class="d-flex align-center mb-4">
            <div class="glass-panel-light pa-2 rounded-lg me-3 bg-accent-alpha">
              <LucideIcon name="wallet" :size="20" class="text-accent" />
            </div>
            <h3 class="text-subtitle-1 font-weight-black text-gold">الأداء المالي للمكتب</h3>
          </div>
          <v-divider class="mb-4 border-gold opacity-10"></v-divider>
          
          <div class="mb-4">
            <div class="d-flex justify-space-between text-body-2 mb-1">
              <span>إجمالي المقبوضات (التحصيل):</span>
              <span class="font-weight-black text-success">{{ formatCurrency(financials.income) }} ريال</span>
            </div>
            <v-progress-linear :model-value="incomePercent" color="success" height="6" rounded></v-progress-linear>
          </div>

          <div class="mb-4">
            <div class="d-flex justify-space-between text-body-2 mb-1">
              <span>إجمالي المصروفات:</span>
              <span class="font-weight-black text-error">{{ formatCurrency(financials.expense) }} ريال</span>
            </div>
            <v-progress-linear :model-value="expensePercent" color="error" height="6" rounded></v-progress-linear>
          </div>

          <v-divider class="my-4 border-dashed border-gold opacity-10"></v-divider>
          
          <div class="d-flex justify-space-between align-center">
            <span class="text-subtitle-2 font-weight-black">صافي الأرباح/الرصيد:</span>
            <v-chip color="accent" class="font-weight-black text-subtitle-1 px-4 premium-btn-gold-gradient" size="large">
              {{ formatCurrency(financials.balance) }} ريال
            </v-chip>
          </div>
        </v-card>
      </v-col>

      <!-- Task & Team Performance Card -->
      <v-col cols="12" md="6" class="mb-4">
        <v-card class="glass-panel pa-6 border border-gold border-opacity-10 h-100 rounded-xl">
          <div class="d-flex align-center mb-4">
            <div class="glass-panel-light pa-2 rounded-lg me-3 bg-accent-alpha">
              <LucideIcon name="gauge" :size="20" class="text-accent" />
            </div>
            <h3 class="text-subtitle-1 font-weight-black text-gold">أداء العمليات والفريق</h3>
          </div>
          <v-divider class="mb-4 border-gold opacity-10"></v-divider>
          
          <v-row dense class="align-center">
            <v-col cols="6">
              <div class="text-center py-2">
                <div class="text-h4 font-weight-black text-accent">{{ tasks.completed }}</div>
                <div class="text-caption text-grey mt-1">المهام المنجزة</div>
              </div>
            </v-col>
            <v-col cols="6" class="border-s">
              <div class="text-center py-2">
                <div class="text-h4 font-weight-black text-gold">{{ tasks.inProgress }}</div>
                <div class="text-caption text-grey mt-1">قيد المعالجة</div>
              </div>
            </v-col>
          </v-row>

          <v-divider class="my-4 border-dashed border-gold opacity-10"></v-divider>

          <div class="mb-2">
            <div class="d-flex justify-space-between text-body-2 mb-1">
              <span>معدل إنجاز المهام الكلي:</span>
              <span class="font-weight-black text-accent">{{ completionRate }}%</span>
            </div>
            <v-progress-linear :model-value="completionRate" color="accent" height="8" rounded></v-progress-linear>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-card-text>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import LucideIcon from '../../components/common/LucideIcon.vue'

const financials = ref({
  income: 0,
  expense: 0,
  balance: 0
})

const tasks = ref({
  total: 0,
  completed: 0,
  inProgress: 0
})

const incomePercent = computed(() => {
  const total = financials.value.income + financials.value.expense
  return total > 0 ? (financials.value.income / total) * 100 : 0
})

const expensePercent = computed(() => {
  const total = financials.value.income + financials.value.expense
  return total > 0 ? (financials.value.expense / total) * 100 : 0
})

const completionRate = computed(() => {
  return tasks.value.total > 0 ? Math.round((tasks.value.completed / tasks.value.total) * 100) : 0
})

const formatCurrency = (val: number) => {
  return (val || 0).toLocaleString('ar-SA')
}

onMounted(async () => {
  try {
    // Fetch financials
    const fin = await (window as any).api.finances.getStats()
    if (fin) {
      financials.value = {
        income: Number(fin.income || 0),
        expense: Number(fin.expense || 0),
        balance: Number(fin.balance || 0)
      }
    }
    
    // Fetch task counts
    const tCount = await (window as any).api.tasks.count({ status: 'all' })
    const cCount = await (window as any).api.tasks.count({ status: 'completed' })
    const pCount = await (window as any).api.tasks.count({ status: 'in_progress' })
    
    tasks.value = {
      total: tCount || 0,
      completed: cCount || 0,
      inProgress: pCount || 0
    }
  } catch (err) {
    console.error('Failed to load dashboard metrics:', err)
  }
})
</script>
