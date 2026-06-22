<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <!-- Header Section -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <v-btn icon variant="text" color="gold" class="me-4 premium-hover premium-btn-gold-gradient" @click="goBack">
            <LucideIcon name="arrow-right" :size="24" />
          </v-btn>
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="trending-up" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">تقرير أداء الموظف</h1>
            <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
              تحليل كمي ونوعي للمؤشرات التشغيلية: <span class="text-white">{{ employeeName }}</span>
            </p>
          </div>
        </div>
      </v-col>
    </v-row>

    <v-alert
      v-if="error"
      type="error"
      variant="flat"
      class="mb-8 rounded-xl font-weight-black border-2 border-error-darken-1"
    >
      <template #prepend>
        <LucideIcon name="alert-triangle" :size="24" class="me-3" />
      </template>
      {{ error }}
    </v-alert>

    <div class="glass-card pa-8 border-gold border-opacity-20 border-2 rounded-xl">
      <!-- KPI Metrics -->
      <v-row class="mb-8">
        <v-col cols="12" md="3">
          <div
            class="glass-panel-light pa-6 rounded-xl border border-gold border-opacity-10 premium-hover h-100"
          >
            <div class="text-subtitle-2 font-weight-black text-gold opacity-60 mb-2">
              القضايا المسندة
            </div>
            <div class="text-h5 font-weight-black text-white">{{ report.totalCases }}</div>
            <LucideIcon
              name="briefcase"
              :size="48"
              class="text-gold opacity-10 position-absolute"
              style="bottom: 10px; left: 10px"
            />
          </div>
        </v-col>
        <v-col cols="12" md="3">
          <div
            class="glass-panel-light pa-6 rounded-xl border border-gold border-opacity-10 premium-hover h-100"
          >
            <div class="text-subtitle-2 font-weight-black text-gold opacity-60 mb-2">
              إجمالي المهام
            </div>
            <div class="text-h5 font-weight-black text-accent">{{ report.totalTasks }}</div>
            <LucideIcon
              name="list-checks"
              :size="48"
              class="text-accent opacity-10 position-absolute"
              style="bottom: 10px; left: 10px"
            />
          </div>
        </v-col>
        <v-col cols="12" md="3">
          <div
            class="glass-panel-light pa-6 rounded-xl border border-gold border-opacity-10 premium-hover h-100"
          >
            <div class="text-subtitle-2 font-weight-black text-gold opacity-60 mb-2">
              المهام المكتملة
            </div>
            <div class="text-h5 font-weight-black text-success">{{ report.completedTasks }}</div>
            <LucideIcon
              name="check-circle"
              :size="48"
              class="text-success opacity-10 position-absolute"
              style="bottom: 10px; left: 10px"
            />
          </div>
        </v-col>
        <v-col cols="12" md="3">
          <div
            class="glass-panel-light pa-6 rounded-xl border border-gold border-opacity-10 premium-hover h-100 border-2"
            style="border-color: rgba(233, 195, 73, 0.3) !important"
          >
            <div class="text-subtitle-2 font-weight-black text-gold mb-2">معدل الإنجاز العام</div>
            <div class="text-h4 font-weight-black text-gold">
              {{ formatPercent(report.completionRate) }}
            </div>
            <v-progress-linear
              :model-value="report.completionRate"
              color="gold"
              height="6"
              rounded
              class="mt-4"
            />
          </div>
        </v-col>
      </v-row>

      <!-- Assignments Table -->
      <div class="d-flex align-center mb-6">
        <div class="glass-panel-light pa-2 rounded-lg me-4 border border-gold border-opacity-10">
          <LucideIcon name="layout-list" :size="24" class="text-gold" />
        </div>
        <div>
          <h2 class="text-h5 font-weight-black text-white">تفصيل القضايا والتعيينات النشطة</h2>
          <p class="text-caption text-gold opacity-40 font-weight-bold">
            تتبع مباشر للأدوار والمسؤوليات الموكلة للموظف
          </p>
        </div>
        <v-spacer />
        <v-progress-circular v-if="loading" indeterminate size="24" width="3" color="gold" />
      </div>

      <v-card
        elevation="0"
        class="glass-card border border-gold border-opacity-10 rounded-xl overflow-hidden glass-card"
      >
        <v-table density="comfortable" class="glass-table">
          <thead>
            <tr>
              <th class="text-right text-gold font-weight-black">رقم القضية</th>
              <th class="text-right text-gold font-weight-black">الموضوع</th>
              <th class="text-right text-gold font-weight-black">الدور المنوط</th>
              <th class="text-right text-gold font-weight-black">الحالة القضائية</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && assignments.length === 0">
              <td colspan="4" class="text-center py-12 text-gold opacity-20 font-weight-black">
                لا توجد تعيينات مسجلة حالياً لهذا الموظف
              </td>
            </tr>
            <tr v-for="a in assignments" :key="a.id" class="premium-hover-row">
              <td class="font-mono text-accent font-weight-black">{{ a.case_number || '-' }}</td>
              <td class="text-white font-weight-black">{{ a.subject || '-' }}</td>
              <td>
                <v-chip size="small" variant="tonal" color="gold" class="font-weight-black">
                  {{ a.role || '-' }}
                </v-chip>
              </td>
              <td>
                <v-chip
                  size="small"
                  variant="flat"
                  color="accent"
                  class="text-ebony font-weight-black"
                >
                  {{ a.case_status || '-' }}
                </v-chip>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LucideIcon from '../components/common/LucideIcon.vue'

const route = useRoute()
const router = useRouter()

const employeeId = computed(() => String(route.params.id || ''))

const loading = ref(false)
const error = ref('')

const employee = ref<any | null>(null)
const report = ref({
  totalCases: 0,
  totalTasks: 0,
  completedTasks: 0,
  totalMemoranda: 0,
  completionRate: 0
})
const assignments = ref<any[]>([])

const employeeName = computed(
  () => employee.value?.name || employee.value?.full_name || 'موظف غير معروف'
)

const goBack = () => {
  router.push('/employees')
}

const formatPercent = (val: number) => {
  const n = Number.isFinite(val) ? val : 0
  return `${n.toFixed(0)}%`
}

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const id = employeeId.value
    if (!id) throw new Error('المعرف غير صالح')
    employee.value = await (window as any).api.employees.get(id)
    report.value = await (window as any).api.employees.getPerformanceReport(id)
    assignments.value = await (window as any).api.employees.getAssignments(id)
  } catch (e: any) {
    error.value = e?.message || 'فشل تحميل تقرير الأداء'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.rtl {
  direction: rtl;
}
.font-mono {
  font-family: 'Consolas', 'Monaco', monospace;
}

.glass-table {
  background: transparent !important;
}

:deep(.glass-table th) {
  background: rgba(212, 175, 55, 0.05) !important;
  border-bottom: 1px solid rgba(212, 175, 55, 0.1) !important;
}

:deep(.glass-table td) {
  border-bottom: 1px solid rgba(212, 175, 55, 0.05) !important;
}

/* Mobile (<=1023px only) */
@media (max-width: 1023px) {
  :deep(.v-row.mb-8.align-center > .v-col-auto) {
    flex: 0 0 100% !important;
    max-width: 100% !important;
    margin-top: 8px;
  }
  :deep(.v-row.mb-8.align-center > .v-col-auto .v-btn) {
    width: 100% !important;
  }
  :deep(.v-table) {
    overflow-x: auto !important;
    display: block !important;
  }
  :deep(.v-table thead th) {
    white-space: nowrap !important;
    font-size: 0.7rem !important;
    padding: 8px !important;
  }
  :deep(.v-table tbody td) {
    padding: 8px !important;
    font-size: 0.78rem !important;
  }
  :deep(.v-data-table .v-table__wrapper) {
    overflow-x: auto !important;
  }
  :deep(.v-dialog > .v-overlay__content) {
    width: 95vw !important;
    max-width: 95vw !important;
    margin: 8px !important;
  }
  :deep(.v-card-text.pa-8) {
    padding: 12px !important;
  }
  :deep(.v-card-actions.pa-8) {
    padding: 12px !important;
    flex-wrap: wrap !important;
    gap: 8px !important;
  }
  :deep(.v-card-actions .v-spacer) {
    display: none !important;
  }
  :deep(.v-card-actions .v-btn) {
    flex: 1 1 auto !important;
    min-width: 100px !important;
  }
}
</style>
