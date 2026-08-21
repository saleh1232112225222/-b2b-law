<template>
  <v-container fluid class="pa-6 pb-12 rtl report-page">
    <PrintReportFrame title="سجل مراقبة النشاط" />

    <!-- Header -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="user-check" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">سجل مراقبة النشاط</h1>
            <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
              تتبع زمني دقيق لكافة العمليات والإجراءات المنفذة من قبل أعضاء النظام
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="auto">
        <v-btn
          variant="outlined"
          color="gold"
          class="rounded-lg px-6 font-weight-black premium-hover premium-btn-gold-gradient"
          @click="$router.push('/reports')"
        >
          <LucideIcon name="arrow-right" :size="18" class="me-2" /> رجوع للمركز
        </v-btn>
      </v-col>
    </v-row>

    <v-card
      elevation="0"
      class="glass-card pa-8 border-gold border-opacity-20 border-2 overflow-hidden glass-card"
    >
      <!-- Filters Row -->
      <v-row dense class="mb-8 align-center">
        <v-col cols="12" md="4">
          <v-select
            v-model="actor"
            :items="users"
            :loading="loadingUsers"
            item-title="title"
            item-value="value"
            label="اختر المستخدم للمراقبة"
            variant="outlined"
            class="glass-input"
            hide-details
            clearable
          >
            <template #prepend-inner>
              <LucideIcon name="user-search" :size="20" class="text-gold me-2" />
            </template>
          </v-select>
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field
            v-model="from"
            label="من تاريخ"
            type="date"
            variant="outlined"
            class="glass-input"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field
            v-model="to"
            label="إلى تاريخ"
            type="date"
            variant="outlined"
            class="glass-input"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-btn
            color="accent"
            variant="flat"
            block
            height="56"
            class="rounded-xl font-weight-black premium-lift text-ebony premium-btn-gold-gradient"
            :loading="loading"
            @click="load"
          >
            توليد السجل
          </v-btn>
        </v-col>
      </v-row>

      <!-- Export Actions -->
      <div class="d-flex flex-wrap justify-end mb-8 gap-3 report-actions">
        <v-btn
          variant="tonal"
          color="white"
          height="48"
          class="rounded-xl px-6 font-weight-black premium-btn-gold-gradient"
          @click="printPage"
        >
          <LucideIcon name="printer" :size="20" class="me-2 text-gold" /> طباعة
        </v-btn>
        <v-btn
          variant="tonal"
          color="white"
          height="48"
          class="rounded-xl px-6 font-weight-black premium-btn-gold-gradient"
          @click="exportPdf"
        >
          <LucideIcon name="file-text" :size="20" class="me-2 text-gold" /> تصدير PDF
        </v-btn>
        <v-btn
          variant="tonal"
          color="white"
          height="48"
          class="rounded-xl px-6 font-weight-black premium-btn-gold-gradient"
          :disabled="safeLength(rows) === 0"
          @click="exportCsv"
        >
          <LucideIcon name="file-spreadsheet" :size="20" class="me-2 text-gold" /> تصدير CSV
        </v-btn>
      </div>

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

      <!-- Chart Section -->
      <div class="d-flex align-center mb-4">
        <div class="glass-panel-light pa-2 rounded-lg me-3 border border-gold border-opacity-10">
          <LucideIcon name="bar-chart-3" :size="20" class="text-gold" />
        </div>
        <span class="text-h6 font-weight-black text-white">تحليل كثافة العمليات حسب النوع</span>
      </div>

      <v-card
        elevation="0"
        class="glass-panel-light pa-6 rounded-xl mb-12 border border-gold border-opacity-10 glass-card"
      >
        <v-skeleton-loader
          v-if="loading"
          type="image"
          height="180"
          color="transparent"
        ></v-skeleton-loader>
        <SimpleBarChart v-else :data="chartByAction()" :height="220" />
      </v-card>

      <!-- Activity Table -->
      <div class="d-flex align-center mb-4">
        <div class="glass-panel-light pa-2 rounded-lg me-3 border border-gold border-opacity-10">
          <LucideIcon name="list" :size="20" class="text-gold" />
        </div>
        <span class="text-h6 font-weight-black text-white">تفاصيل السجل الزمني</span>
      </div>

      <v-card
        elevation="0"
        class="glass-card border border-gold border-opacity-10 rounded-xl overflow-hidden glass-card"
      >
        <v-table density="comfortable" class="premium-table">
          <thead>
            <tr>
              <th class="text-right text-gold font-weight-black">توقيت العملية</th>
              <th class="text-right text-gold font-weight-black">الوحدة</th>
              <th class="text-right text-gold font-weight-black">الإجراء</th>
              <th class="text-right text-gold font-weight-black">التفاصيل</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading">
              <tr v-for="i in 5" :key="i">
                <td colspan="4" class="pa-4">
                  <v-skeleton-loader type="table-row" color="transparent"></v-skeleton-loader>
                </td>
              </tr>
            </template>
            <template v-else>
              <tr v-if="safeLength(rows) === 0">
                <td colspan="4" class="text-center py-12 text-gold opacity-20">
                  لا توجد أنشطة مسجلة لهذا المستخدم ضمن الفترة المحددة
                </td>
              </tr>
              <tr v-for="r in safeArray(rows)" :key="(r as any).id" class="premium-hover-row">
                <td class="text-caption font-weight-black text-accent font-mono">
                  {{ (r as any).timestamp }}
                </td>
                <td>
                  <v-chip
                    size="x-small"
                    variant="flat"
                    color="gold"
                    class="text-ebony font-weight-black px-4"
                  >
                    {{ (r as any).module_key }}
                  </v-chip>
                </td>
                <td class="text-white font-weight-black">
                  {{ (r as any).action_key }}
                </td>
                <td class="text-body-2 text-white opacity-80" style="max-width: 420px">
                  {{ (r as any).details }}
                </td>
              </tr>
            </template>
          </tbody>
        </v-table>
      </v-card>

      <div
        class="mt-8 pa-4 glass-panel-light rounded-xl border border-gold border-opacity-10 d-flex align-center"
      >
        <LucideIcon name="info" :size="18" class="text-gold me-3" />
        <span class="text-subtitle-2 font-weight-black text-gold opacity-60"
          >إجمالي العمليات المرصودة في التقرير:</span
        >
        <v-spacer />
        <span class="text-h6 font-weight-black text-white">{{ safeLength(rows) }} عملية</span>
      </div>
    </v-card>

    <PrintSignaturePage />
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SimpleBarChart from '../components/SimpleBarChart.vue'
import { safeArray, safeLength } from '../utils/safe'
import PrintReportFrame from '../components/common/PrintReportFrame.vue'
import PrintSignaturePage from '../components/common/PrintSignaturePage.vue'
import LucideIcon from '../components/common/LucideIcon.vue'

const actor = ref<string | null>(null)
const from = ref('')
const to = ref('')
const rows = ref<any[]>([])
const loading = ref(false)
const loadingUsers = ref(false)
const error = ref('')
const users = ref<{ title: string; value: string }[]>([])

const load = async (): Promise<void> => {
  loading.value = true
  error.value = ''
  try {
    const res = await (window as any).api.reports.getUserActivityReport({
      actor: actor.value || '',
      from: from.value || undefined,
      to: to.value || undefined,
      page: 1,
      pageSize: 500
    })
    rows.value = safeArray(res.rows)
  } catch (e: unknown) {
    error.value = (e as Error)?.message || 'فشل تحميل تقرير نشاط المستخدم'
  } finally {
    loading.value = false
  }
}

const printPage = () => window.print()

const exportCsv = async (): Promise<void> => {
  if (safeLength(rows.value) === 0) return
  try {
    await (window as any).api.reports.exportCsv('user-activity.csv', rows.value)
  } catch {
    error.value = 'فشل تصدير ملف CSV'
  }
}

const exportPdf = async (): Promise<void> => {
  try {
    await (window as any).api.reports.exportPdf({
      type: 'activity',
      params: {
        actor: actor.value || undefined,
        from: from.value || undefined,
        to: to.value || undefined
      }
    })
  } catch {
    error.value = 'فشل تصدير PDF'
  }
}

const chartByAction = () => {
  const counts: Record<string, number> = {}
  safeArray(rows.value).forEach((r: any) => {
    const key = String(r.action_key || 'unknown')
    counts[key] = (counts[key] || 0) + 1
  })
  return Object.keys(counts)
    .sort()
    .map((k) => ({
      label: k,
      value: counts[k],
      color: '#D4AF37'
    }))
}

const loadUsers = async (): Promise<void> => {
  loadingUsers.value = true
  try {
    const data = await (window as any).api.reports.listUsers()
    users.value = safeArray(data).map((u: any) => ({
      title: u.username || u.name || '---',
      value: u.username || u.name
    }))
  } catch {
    users.value = []
  } finally {
    loadingUsers.value = false
  }
}

onMounted(() => {
  loadUsers()
  load()
})
</script>

<style scoped>
.rtl {
  direction: rtl;
}
.font-mono {
  font-family: 'Consolas', 'Monaco', monospace;
}
.gap-3 {
  gap: 0.75rem;
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
