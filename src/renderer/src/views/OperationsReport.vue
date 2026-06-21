<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <!-- Header Section -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="bar-chart-big" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">محرك التحليلات التشغيلية</h1>
            <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
              استقصاء ذكي لأداء المكتب، معدلات الإنجاز، والإنتاجية النوعية للفريق القانوني
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="auto" class="d-flex gap-3">
        <v-btn
          color="gold"
          variant="outlined"
          height="48"
          class="rounded-xl px-6 font-weight-black premium-hover"
          :loading="loading"
          @click="load"
        >
          <LucideIcon name="refresh-cw" :size="20" class="me-2" /> تحديث المحرك
        </v-btn>

        <v-menu transition="scale-transition">
          <template #activator="{ props }">
            <v-btn
              color="accent"
              variant="flat"
              height="48"
              class="rounded-xl px-8 font-weight-black premium-lift text-ebony"
              v-bind="props"
            >
              <LucideIcon name="download" :size="20" class="me-2" /> تصدير التقارير
            </v-btn>
          </template>
          <v-list class="glass-card border border-gold border-opacity-20 mt-2">
            <v-list-item class="premium-hover-row" @click="exportPdf">
              <template #prepend
                ><LucideIcon name="file-text" :size="18" class="text-gold me-3"
              /></template>
              <v-list-item-title class="text-white font-weight-black"
                >تقرير PDF تفصيلي</v-list-item-title
              >
            </v-list-item>
            <v-list-item class="premium-hover-row" @click="printPage">
              <template #prepend
                ><LucideIcon name="printer" :size="18" class="text-gold me-3"
              /></template>
              <v-list-item-title class="text-white font-weight-black"
                >طباعة فورية</v-list-item-title
              >
            </v-list-item>
            <v-list-item class="premium-hover-row" @click="exportJson">
              <template #prepend
                ><LucideIcon name="code" :size="18" class="text-gold me-3"
              /></template>
              <v-list-item-title class="text-white font-weight-black"
                >تصدير بيانات خام (JSON)</v-list-item-title
              >
            </v-list-item>
          </v-list>
        </v-menu>
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

    <!-- Main Dashboard -->
    <v-row v-if="summary">
      <!-- KPI Cards -->
      <v-col cols="12" sm="6" md="3">
        <v-card
          elevation="0"
          class="glass-card pa-6 rounded-xl border border-gold border-opacity-10 premium-hover h-100"
        >
          <div class="d-flex justify-space-between align-start mb-6">
            <div>
              <div class="text-subtitle-2 font-weight-black text-gold opacity-60 mb-1">
                نسبة النجاح القضائي
              </div>
              <div class="text-h5 font-weight-black text-success">{{ summary.cases.winRate }}%</div>
            </div>
            <div class="glass-panel-light pa-3 rounded-xl border border-success border-opacity-20">
              <LucideIcon name="trophy" :size="24" class="text-success" />
            </div>
          </div>
          <v-progress-linear
            :model-value="summary.cases.winRate"
            color="success"
            height="8"
            rounded
          />
          <div class="d-flex justify-space-between mt-4 text-caption font-weight-black">
            <span class="text-success">{{ summary.cases.won }} حكم لصالحنا</span>
            <span class="text-white opacity-40">{{ summary.cases.lost }} خسارة</span>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card
          elevation="0"
          class="glass-card pa-6 rounded-xl border border-gold border-opacity-10 premium-hover h-100"
        >
          <div class="d-flex justify-space-between align-start mb-6">
            <div>
              <div class="text-subtitle-2 font-weight-black text-gold opacity-60 mb-1">
                كفاءة إنجاز المهام
              </div>
              <div class="text-h5 font-weight-black text-accent">
                {{ summary.tasks.completionRate }}%
              </div>
            </div>
            <div class="glass-panel-light pa-3 rounded-xl border border-accent border-opacity-20">
              <LucideIcon name="check-circle" :size="24" class="text-accent" />
            </div>
          </div>
          <v-progress-linear
            :model-value="summary.tasks.completionRate"
            color="accent"
            height="8"
            rounded
          />
          <div class="d-flex justify-space-between mt-4 text-caption font-weight-black">
            <span class="text-accent">{{ summary.tasks.completed }} منجز</span>
            <span class="text-white opacity-40">{{ summary.tasks.pending }} معلق</span>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card
          elevation="0"
          class="glass-card pa-6 rounded-xl border border-gold border-opacity-10 premium-hover h-100"
        >
          <div class="d-flex justify-space-between align-start mb-6">
            <div>
              <div class="text-subtitle-2 font-weight-black text-gold opacity-60 mb-1">
                معدل التحصيل المالي
              </div>
              <div class="text-h5 font-weight-black text-warning">
                {{ summary.finances.collectionRate }}%
              </div>
            </div>
            <div class="glass-panel-light pa-3 rounded-xl border border-warning border-opacity-20">
              <LucideIcon name="banknote" :size="24" class="text-warning" />
            </div>
          </div>
          <v-progress-linear
            :model-value="summary.finances.collectionRate"
            color="warning"
            height="8"
            rounded
          />
          <div class="d-flex justify-space-between mt-4 text-caption font-weight-black">
            <span class="text-warning">{{ formatCurrency(summary.finances.income) }}</span>
            <span class="text-white opacity-40">محصل فعلياً</span>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card
          elevation="0"
          class="glass-card pa-6 rounded-xl border border-gold border-opacity-10 premium-hover h-100"
        >
          <div class="d-flex justify-space-between align-start mb-6">
            <div>
              <div class="text-subtitle-2 font-weight-black text-gold opacity-60 mb-1">
                التنفيذ القضائي
              </div>
              <div class="text-h5 font-weight-black text-gold">{{ summary.enforcement.total }}</div>
            </div>
            <div class="glass-panel-light pa-3 rounded-xl border border-gold border-opacity-20">
              <LucideIcon name="gavel" :size="24" class="text-gold" />
            </div>
          </div>
          <div class="text-h5 font-weight-black text-white mb-1">
            {{ formatCurrency(summary.enforcement.collected) }}
          </div>
          <div class="text-caption text-gold opacity-40 font-weight-black">
            إجمالي مبالغ التنفيذ المنتهية
          </div>
        </v-card>
      </v-col>

      <!-- Team Productivity -->
      <v-col cols="12" md="8">
        <v-card
          elevation="0"
          class="glass-card border border-gold border-opacity-10 rounded-xl overflow-hidden h-100"
        >
          <div
            class="glass-panel-light pa-6 border-b border-gold border-opacity-10 d-flex align-center"
          >
            <LucideIcon name="users" :size="24" class="text-gold me-4" />
            <div>
              <div class="text-h6 font-weight-black text-white">
                لوحة إنتاجية الفريق (Efficiency Leaderboard)
              </div>
              <div class="text-caption text-gold opacity-40">
                تصنيف الموظفين حسب معامل الإنجاز النوعي
              </div>
            </div>
            <v-spacer />
            <v-chip size="small" color="gold" variant="flat" class="text-ebony font-weight-black"
              >مؤشر حي</v-chip
            >
          </div>

          <v-table density="comfortable" class="premium-table">
            <thead>
              <tr>
                <th class="text-right text-gold font-weight-black">الموظف / المحامي</th>
                <th class="text-center text-gold font-weight-black">معامل الإنتاجية</th>
                <th class="text-center text-gold font-weight-black">المهام (إنجاز)</th>
                <th class="text-center text-gold font-weight-black">المذكرات</th>
                <th class="text-center text-gold font-weight-black">التقييم</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="emp in summary.employees" :key="emp.id" class="premium-hover-row">
                <td>
                  <div class="d-flex align-center py-3">
                    <v-avatar
                      color="gold"
                      size="40"
                      class="me-4 border border-gold border-opacity-20"
                    >
                      <span class="text-ebony font-weight-black">{{ emp.name[0] }}</span>
                    </v-avatar>
                    <div>
                      <div class="font-weight-black text-white">{{ emp.name }}</div>
                      <div class="text-caption text-gold opacity-40 font-weight-bold">
                        {{ emp.title }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="text-center">
                  <v-chip
                    :color="getScoreColor(emp.score)"
                    variant="tonal"
                    class="font-weight-black px-6"
                  >
                    {{ emp.score }}
                  </v-chip>
                </td>
                <td class="text-center px-6" style="width: 180px">
                  <div class="d-flex align-center gap-3">
                    <span class="text-caption text-white opacity-60 font-mono"
                      >{{ emp.tasks.done }}/{{ emp.tasks.total }}</span
                    >
                    <v-progress-linear
                      :model-value="(emp.tasks.done / (emp.tasks.total || 1)) * 100"
                      color="accent"
                      height="6"
                      rounded
                    />
                  </div>
                </td>
                <td class="text-center font-weight-black text-white text-h6">{{ emp.memos }}</td>
                <td class="text-center">
                  <v-chip
                    :color="getLevelColor(emp.level)"
                    size="x-small"
                    variant="flat"
                    class="text-ebony font-weight-black"
                  >
                    {{ emp.level }}
                  </v-chip>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>

      <!-- Side Stats -->
      <v-col cols="12" md="4">
        <v-card
          elevation="0"
          class="glass-card pa-8 rounded-xl border border-gold border-opacity-10 h-100"
        >
          <div class="d-flex align-center mb-6">
            <LucideIcon name="pie-chart" :size="20" class="text-gold me-3" />
            <h3 class="text-h6 font-weight-black text-white">توزيع الجهد التشغيلي</h3>
          </div>

          <div class="mb-8">
            <div class="d-flex justify-space-between mb-3">
              <span class="text-subtitle-2 text-white font-weight-bold">القضايا النشطة</span>
              <span class="text-subtitle-2 font-weight-black text-accent">{{
                summary.cases.active
              }}</span>
            </div>
            <v-progress-linear
              :model-value="(summary.cases.active / (summary.cases.total || 1)) * 100"
              color="accent"
              height="10"
              rounded
            />
          </div>

          <div class="mb-10">
            <div class="d-flex justify-space-between mb-3">
              <span class="text-subtitle-2 text-white font-weight-bold">القضايا المغلقة</span>
              <span class="text-subtitle-2 font-weight-black text-success">{{
                summary.cases.closed
              }}</span>
            </div>
            <v-progress-linear
              :model-value="(summary.cases.closed / (summary.cases.total || 1)) * 100"
              color="success"
              height="10"
              rounded
            />
          </div>

          <v-divider class="border-gold opacity-10 mb-8" />

          <div class="d-flex align-center mb-6">
            <LucideIcon name="file-text" :size="20" class="text-gold me-3" />
            <h3 class="text-h6 font-weight-black text-white">إنتاجية المذكرات</h3>
          </div>

          <v-list class="bg-transparent pa-0">
            <v-list-item class="px-0 mb-2">
              <template #prepend>
                <div class="glass-panel-light pa-2 rounded-lg me-4">
                  <LucideIcon name="file-edit" :size="18" class="text-gold" />
                </div>
              </template>
              <v-list-item-title class="text-white font-weight-black"
                >المسودات الأولية</v-list-item-title
              >
              <v-list-item-subtitle class="text-gold opacity-60 font-weight-bold"
                >{{ summary.memoranda.drafts }} مذكرة</v-list-item-subtitle
              >
            </v-list-item>

            <v-list-item class="px-0">
              <template #prepend>
                <div class="glass-panel-light pa-2 rounded-lg me-4">
                  <LucideIcon name="file-check" :size="18" class="text-success" />
                </div>
              </template>
              <v-list-item-title class="text-white font-weight-black"
                >مذكرات مودعة</v-list-item-title
              >
              <v-list-item-subtitle class="text-success font-weight-bold"
                >{{ summary.memoranda.submitted }} مذكرة منتهية</v-list-item-subtitle
              >
            </v-list-item>
          </v-list>

          <div
            class="mt-10 pa-5 glass-panel-light rounded-xl border border-gold border-opacity-10 d-flex flex-column gap-3"
          >
            <div class="d-flex align-center">
              <LucideIcon name="lightbulb" :size="20" class="text-accent me-3" />
              <span class="text-subtitle-2 font-weight-black text-accent">توصية محرك الذكاء:</span>
            </div>
            <p class="text-caption text-white opacity-80 leading-relaxed font-weight-bold">
              بناءً على وتيرة العمل الحالية، يحتاج المكتب لزيادة معدل إغلاق المهام بنسبة
              <span class="text-accent">15%</span> لتحقيق المستهدف السنوي المخطط له.
            </p>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Loading State -->
    <v-row v-else-if="loading">
      <v-col v-for="i in 4" :key="i" cols="12" md="3">
        <v-skeleton-loader type="card" class="rounded-xl glass-card" color="transparent" />
      </v-col>
      <v-col cols="12" md="8">
        <v-skeleton-loader type="table" class="rounded-xl glass-card" color="transparent" />
      </v-col>
      <v-col cols="12" md="4">
        <v-skeleton-loader type="article" class="rounded-xl glass-card" color="transparent" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LucideIcon from '../components/common/LucideIcon.vue'

const summary = ref<any | null>(null)
const error = ref('')
const loading = ref(false)

const load = async (): Promise<void> => {
  loading.value = true
  error.value = ''
  try {
    summary.value = await (window as any).api.analytics.getDashboard()
  } catch (e: unknown) {
    error.value = (e as Error)?.message || 'فشل تحميل محرك التحليلات'
    summary.value = null
  } finally {
    loading.value = false
  }
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0
  })
    .format(val)
    .replace('SAR', 'ر.س')
}

const getScoreColor = (score: number) => {
  if (score > 8) return 'success'
  if (score > 4) return 'accent'
  return 'warning'
}

const getLevelColor = (level: string) => {
  if (level === 'عالي الأداء') return 'success'
  if (level === 'متوسط') return 'accent'
  return 'error'
}

const printPage = () => window.print()

const exportPdf = async (): Promise<void> => {
  try {
    await (window as any).api.reports.exportPdf({ type: 'operations_advanced', params: {} })
  } catch {
    error.value = 'فشل تصدير PDF للمحرك'
  }
}

const exportJson = () => {
  const dataStr =
    'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(summary.value, null, 2))
  const downloadAnchorNode = document.createElement('a')
  downloadAnchorNode.setAttribute('href', dataStr)
  downloadAnchorNode.setAttribute('download', 'legal_analytics.json')
  document.body.appendChild(downloadAnchorNode)
  downloadAnchorNode.click()
  downloadAnchorNode.remove()
}

onMounted(() => {
  load()
})
</script>

<style scoped>
.rtl {
  direction: rtl;
}
.gap-3 {
  gap: 0.75rem;
}
.leading-relaxed {
  line-height: 1.6 !important;
}
.font-mono {
  font-family: 'Consolas', 'Monaco', monospace;
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
