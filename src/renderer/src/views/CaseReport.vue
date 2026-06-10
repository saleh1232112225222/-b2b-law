<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <PrintReportFrame title="تقرير قضية شامل" />

    <!-- Header -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="search-code" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">تقرير قضية شامل</h1>
            <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
              رؤية بانورامية متكاملة لكافة جوانب القضية: الإجراءات، المواعيد، والتدفقات المالية
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="auto">
        <v-btn
          variant="outlined"
          color="gold"
          class="rounded-lg px-6 font-weight-black premium-hover"
          @click="$router.push('/reports')"
        >
          <LucideIcon name="arrow-right" :size="18" class="me-2" /> رجوع للمركز
        </v-btn>
      </v-col>
    </v-row>

    <v-card
      elevation="0"
      class="glass-card pa-8 border-gold border-opacity-20 border-2 overflow-hidden"
    >
      <!-- Filters Row -->
      <v-row dense class="mb-8 align-center">
        <v-col cols="12" md="6">
          <v-select
            v-model="caseId"
            :items="cases"
            :loading="loadingCases"
            item-title="title"
            item-value="value"
            label="اختر القضية للمعاينة"
            variant="outlined"
            class="glass-input"
            hide-details
            clearable
          >
            <template #prepend-inner>
              <LucideIcon name="briefcase" :size="20" class="text-gold me-2" />
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
        <v-col cols="12" class="d-flex justify-end gap-3 mt-6">
          <v-btn
            color="accent"
            variant="flat"
            width="160"
            height="56"
            class="rounded-xl font-weight-black premium-lift text-ebony"
            :loading="loading"
            :disabled="!caseId"
            @click="load"
          >
            <LucideIcon name="refresh-cw" :size="18" class="me-2" /> توليد التقرير
          </v-btn>

          <v-divider vertical class="mx-2 border-gold opacity-10" />

          <v-btn
            variant="tonal"
            color="white"
            height="56"
            class="rounded-xl px-6 font-weight-black"
            :loading="printPreviewLoading"
            :disabled="!caseId || loading"
            @click="printPage"
          >
            <LucideIcon name="printer" :size="20" class="me-2 text-gold" /> طباعة
          </v-btn>
          <v-btn
            variant="tonal"
            color="white"
            height="56"
            class="rounded-xl px-6 font-weight-black"
            :loading="exporting"
            :disabled="!caseId || loading"
            @click="exportPdf"
          >
            <LucideIcon name="file-text" :size="20" class="me-2 text-gold" /> تصدير PDF
          </v-btn>
          <v-btn
            variant="tonal"
            color="white"
            height="56"
            class="rounded-xl px-6 font-weight-black"
            :disabled="!report"
            @click="exportExcel"
          >
            <LucideIcon name="file-spreadsheet" :size="20" class="me-2 text-gold" /> تصدير Excel
          </v-btn>
        </v-col>
      </v-row>

      <v-divider v-if="report || loading" class="border-gold opacity-10 mb-8" />

      <template v-if="loading">
        <v-row dense>
          <v-col cols="12" md="4">
            <v-skeleton-loader
              type="card"
              height="120"
              color="transparent"
              class="glass-card"
            ></v-skeleton-loader>
          </v-col>
          <v-col cols="12" md="8">
            <v-row dense>
              <v-col v-for="i in 3" :key="i" cols="12" md="4">
                <v-skeleton-loader
                  type="card"
                  height="120"
                  color="transparent"
                  class="glass-card"
                ></v-skeleton-loader>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
        <v-skeleton-loader
          type="table"
          class="mt-8 glass-card"
          color="transparent"
        ></v-skeleton-loader>
      </template>

      <template v-else-if="report">
        <!-- Summary Dashboard -->
        <v-row dense class="mb-12">
          <v-col cols="12" md="4">
            <v-card
              elevation="0"
              class="glass-panel-light pa-6 rounded-xl h-100 border border-gold border-opacity-30"
            >
              <div class="text-subtitle-2 font-weight-black text-gold opacity-60 mb-2">
                بيانات القضية الأساسية
              </div>
              <div class="text-h5 font-weight-black text-white mb-4">
                {{ report.case.case_number || report.case.id }}
              </div>
              <div class="d-flex align-center mb-4">
                <v-chip
                  size="small"
                  color="accent"
                  variant="flat"
                  class="font-weight-black text-ebony px-4"
                >
                  الحالة: {{ report.case.status || '-' }}
                </v-chip>
              </div>
              <v-divider class="border-gold opacity-10 mb-4" />
              <div class="parties-list">
                <div
                  v-for="party in safeArray(report.case.parties)"
                  :key="party.id"
                  class="d-flex align-center justify-space-between text-body-2 mb-2"
                >
                  <span class="text-white font-weight-black">
                    <LucideIcon name="user" :size="14" class="me-2 text-gold" />
                    {{ party.name }}
                  </span>
                  <v-chip
                    size="x-small"
                    variant="tonal"
                    :color="party.party_type === 'client' ? 'accent' : 'error'"
                    class="font-weight-bold"
                  >
                    {{ party.party_type === 'client' ? 'موكل' : 'خصم' }}
                  </v-chip>
                </div>
                <div
                  v-if="safeLength(report.case.parties) === 0"
                  class="text-white opacity-60 text-body-2"
                >
                  الموكل الرئيسي: {{ report.case.client_name || '-' }}
                </div>
              </div>
            </v-card>
          </v-col>
          <v-col cols="12" md="8">
            <v-row dense>
              <v-col cols="12" md="4">
                <v-card
                  elevation="0"
                  class="glass-panel-light pa-6 rounded-xl text-center border border-gold border-opacity-10"
                >
                  <LucideIcon
                    name="calendar-days"
                    :size="24"
                    class="text-gold opacity-40 mb-3 mx-auto"
                  />
                  <div class="text-subtitle-2 font-weight-black text-gold opacity-60 mb-1">
                    إجمالي الجلسات
                  </div>
                  <div class="text-h5 font-weight-black text-white">
                    {{ report.kpis.sessionsTotal ?? 0 }}
                  </div>
                </v-card>
              </v-col>
              <v-col cols="12" md="4">
                <v-card
                  elevation="0"
                  class="glass-panel-light pa-6 rounded-xl text-center border border-gold border-opacity-10"
                >
                  <LucideIcon
                    name="trending-up"
                    :size="24"
                    class="text-success opacity-40 mb-3 mx-auto"
                  />
                  <div class="text-subtitle-2 font-weight-black text-gold opacity-60 mb-1">
                    إيرادات القضية
                  </div>
                  <div class="text-h5 font-weight-black text-success">
                    {{ report.kpis.totalIn ?? 0 }}
                    <span class="text-caption">ر.س</span>
                  </div>
                </v-card>
              </v-col>
              <v-col cols="12" md="4">
                <v-card
                  elevation="0"
                  class="glass-panel-light pa-6 rounded-xl text-center border border-gold border-opacity-10"
                >
                  <LucideIcon
                    name="banknote"
                    :size="24"
                    class="text-warning opacity-40 mb-3 mx-auto"
                  />
                  <div class="text-subtitle-2 font-weight-black text-gold opacity-60 mb-1">
                    الرصيد المتبقي
                  </div>
                  <div class="text-h5 font-weight-black text-warning">
                    {{ report.kpis.balance ?? 0 }}
                    <span class="text-caption">ر.س</span>
                  </div>
                </v-card>
              </v-col>
            </v-row>
          </v-col>
        </v-row>

        <v-row dense class="mb-10">
          <v-col cols="12">
            <v-card
              elevation="0"
              class="glass-card border border-gold border-opacity-10 rounded-xl overflow-hidden"
            >
              <div
                class="glass-panel-light pa-4 border-b border-gold border-opacity-10 d-flex align-center"
              >
                <LucideIcon name="sparkles" :size="18" class="text-gold me-3" />
                <span class="text-subtitle-1 font-weight-black text-white"
                  >ملخص تنفيذي (للعمل)</span
                >
              </div>
              <div class="pa-4">
                <div class="d-flex flex-wrap gap-2 mb-4">
                  <v-chip size="small" variant="tonal" color="gold" class="font-weight-black">
                    جلسات 7 أيام: {{ report.executive?.counts?.sessionsNext7 ?? 0 }}
                  </v-chip>
                  <v-chip size="small" variant="tonal" color="error" class="font-weight-black">
                    مهام متأخرة: {{ report.executive?.counts?.tasksOverdue ?? 0 }}
                  </v-chip>
                  <v-chip size="small" variant="tonal" color="warning" class="font-weight-black">
                    مهام 7 أيام: {{ report.executive?.counts?.tasksNext7 ?? 0 }}
                  </v-chip>
                  <v-chip size="small" variant="tonal" color="accent" class="font-weight-black">
                    جلسات بحاجة إغلاق:
                    {{ report.executive?.counts?.unclosedPastSessions ?? 0 }}
                  </v-chip>
                </div>

                <v-row dense>
                  <v-col cols="12" md="6">
                    <div class="text-caption font-weight-black text-gold opacity-60 mb-1">
                      آخر إجراء
                    </div>
                    <div class="text-body-2 text-white font-weight-bold">
                      {{ report.executive?.lastAction || '—' }}
                    </div>
                  </v-col>
                  <v-col cols="12" md="6">
                    <div class="text-caption font-weight-black text-gold opacity-60 mb-1">
                      الإجراء القادم
                    </div>
                    <div class="text-body-2 text-white font-weight-bold">
                      {{ report.executive?.nextAction || '—' }}
                    </div>
                  </v-col>
                </v-row>

                <v-divider class="border-gold opacity-10 my-4" />

                <div v-if="safeLength(report.executive?.alerts) > 0" class="mb-3">
                  <div class="text-caption font-weight-black text-gold opacity-60 mb-2">
                    تنبيهات
                  </div>
                  <div class="d-flex flex-wrap gap-2">
                    <v-chip
                      v-for="(a, i) in safeArray(report.executive?.alerts)"
                      :key="i"
                      size="small"
                      color="warning"
                      variant="tonal"
                      class="font-weight-black"
                    >
                      {{ a }}
                    </v-chip>
                  </div>
                </div>

                <div v-if="safeLength(report.executive?.recommendations) > 0">
                  <div class="text-caption font-weight-black text-gold opacity-60 mb-2">
                    توصيات سريعة
                  </div>
                  <div class="d-flex flex-column gap-2">
                    <div
                      v-for="(r, i) in safeArray(report.executive?.recommendations)"
                      :key="i"
                      class="text-body-2 text-white font-weight-bold"
                    >
                      • {{ r }}
                    </div>
                  </div>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Timeline -->
        <div class="d-flex align-center mb-4">
          <div class="glass-panel-light pa-2 rounded-lg me-3 border border-gold border-opacity-10">
            <LucideIcon name="history" :size="20" class="text-gold" />
          </div>
          <span class="text-h6 font-weight-black text-white">التسلسل الزمني المتكامل للقضية</span>
        </div>

        <v-card
          elevation="0"
          class="glass-card border border-gold border-opacity-10 rounded-xl overflow-hidden mb-6"
        >
          <v-table density="comfortable" class="premium-table">
            <thead>
              <tr>
                <th class="text-right text-gold font-weight-black" style="width: 200px">التوقيت</th>
                <th class="text-right text-gold font-weight-black" style="width: 150px">
                  نوع الحدث
                </th>
                <th class="text-right text-gold font-weight-black">الحدث / التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="safeLength(report.timeline.rows) === 0">
                <td colspan="3" class="text-center py-12 text-gold opacity-20">
                  لا توجد أحداث مسجلة في السجل الزمني
                </td>
              </tr>
              <tr
                v-for="(t, idx) in safeArray(report.timeline.rows)"
                :key="idx"
                class="premium-hover-row"
              >
                <td class="text-caption font-mono text-accent font-weight-black">
                  {{ t.at }}
                </td>
                <td>
                  <v-chip
                    size="x-small"
                    variant="flat"
                    color="gold"
                    class="text-ebony font-weight-black px-4"
                  >
                    {{ t.type }}
                  </v-chip>
                </td>
                <td class="text-body-2 text-white font-weight-bold">{{ t.title }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>

        <div class="d-flex justify-space-between align-center mb-12">
          <div class="text-caption text-gold opacity-40 font-weight-black">
            إجمالي السجلات المرصودة: {{ report.timeline.pageInfo?.totalRows ?? 0 }}
          </div>
          <div class="d-flex align-center gap-2">
            <v-btn
              icon
              size="small"
              variant="tonal"
              color="gold"
              class="rounded-lg"
              :disabled="report.timeline.pageInfo?.page <= 1"
              @click="prevTimelinePage"
            >
              <LucideIcon name="chevron-right" :size="18" />
            </v-btn>
            <v-btn
              icon
              size="small"
              variant="tonal"
              color="gold"
              class="rounded-lg"
              :disabled="
                report.timeline.pageInfo?.page >=
                Math.ceil(
                  (report.timeline.pageInfo?.totalRows ?? 0) /
                    (report.timeline.pageInfo?.pageSize ?? 1)
                )
              "
              @click="nextTimelinePage"
            >
              <LucideIcon name="chevron-left" :size="18" />
            </v-btn>
          </div>
        </div>

        <v-row dense>
          <!-- Sessions Summary -->
          <v-col cols="12" md="6">
            <v-card
              elevation="0"
              class="glass-card border border-gold border-opacity-10 rounded-xl overflow-hidden h-100"
            >
              <div
                class="glass-panel-light pa-4 border-b border-gold border-opacity-10 d-flex align-center"
              >
                <LucideIcon name="calendar-clock" :size="18" class="text-gold me-3" />
                <span class="text-subtitle-1 font-weight-black text-white"
                  >تتبع الجلسات والمواعيد</span
                >
              </div>
              <v-table density="compact" class="glass-table">
                <thead>
                  <tr>
                    <th class="text-right text-gold font-weight-black">التاريخ</th>
                    <th class="text-right text-gold font-weight-black">الحالة</th>
                    <th class="text-right text-gold font-weight-black">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="safeLength(report.sessions.rows) === 0">
                    <td colspan="3" class="text-center py-6 text-gold opacity-20">
                      لا توجد جلسات مسجلة
                    </td>
                  </tr>
                  <tr
                    v-for="s in safeArray(report.sessions.rows)"
                    :key="s.id"
                    class="premium-hover-row"
                  >
                    <td class="text-caption font-mono text-white">{{ s.date }}</td>
                    <td>
                      <v-chip
                        size="x-small"
                        :color="getSessionColor(s.status)"
                        variant="flat"
                        class="font-weight-black"
                        >{{ s.status }}</v-chip
                      >
                    </td>
                    <td
                      class="text-truncate text-caption text-gold opacity-60"
                      style="max-width: 200px"
                    >
                      {{ s.notes || '-' }}
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-card>
          </v-col>

          <!-- Recent Activity -->
          <v-col cols="12" md="6">
            <v-card
              elevation="0"
              class="glass-card border border-gold border-opacity-10 rounded-xl overflow-hidden h-100"
            >
              <div
                class="glass-panel-light pa-4 border-b border-gold border-opacity-10 d-flex align-center"
              >
                <LucideIcon name="activity" :size="18" class="text-gold me-3" />
                <span class="text-subtitle-1 font-weight-black text-white"
                  >آخر إجراءات المعالجة</span
                >
              </div>
              <v-table density="compact" class="glass-table">
                <thead>
                  <tr>
                    <th class="text-right text-gold font-weight-black">الوقت</th>
                    <th class="text-right text-gold font-weight-black">بواسطة</th>
                    <th class="text-right text-gold font-weight-black">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="safeLength(report.activity.rows) === 0">
                    <td colspan="3" class="text-center py-6 text-gold opacity-20">
                      لا توجد إجراءات حديثة
                    </td>
                  </tr>
                  <tr
                    v-for="a in safeArray(report.activity.rows)"
                    :key="a.id"
                    class="premium-hover-row"
                  >
                    <td class="text-caption font-mono text-white">{{ a.timestamp }}</td>
                    <td class="text-caption text-accent font-weight-black">
                      {{ a.actor }}
                    </td>
                    <td
                      class="text-truncate text-caption text-white opacity-80"
                      style="max-width: 200px"
                    >
                      {{ a.details }}
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-card>
          </v-col>
        </v-row>
      </template>

      <div v-else-if="!loading" class="text-center py-24">
        <LucideIcon name="file-search-2" :size="100" class="text-gold opacity-10 mb-6 mx-auto" />
        <div class="text-h5 text-gold opacity-30 font-weight-black">
          الرجاء اختيار قضية لتوليد التقرير الشامل
        </div>
      </div>

      <v-alert
        v-if="error"
        type="error"
        variant="flat"
        class="mt-8 rounded-xl font-weight-black border-2 border-error-darken-1"
      >
        <template #prepend>
          <LucideIcon name="alert-triangle" :size="24" class="me-3" />
        </template>
        {{ error }}
      </v-alert>

      <PrintSignaturePage />
    </v-card>

    <v-dialog v-model="printPreviewDialog" width="90%" max-width="980" scrollable>
      <v-card class="rounded-xl overflow-hidden">
        <v-toolbar color="primary" height="64" class="px-4">
          <LucideIcon name="printer" :size="18" class="me-2 text-white" />
          <v-toolbar-title class="text-white font-weight-black"
            >معاينة الطباعة (A4)</v-toolbar-title
          >
          <v-spacer></v-spacer>
          <v-btn icon variant="text" color="white" @click="printPreviewDialog = false">
            <LucideIcon name="x" />
          </v-btn>
        </v-toolbar>
        <v-card-text class="pa-0">
          <div v-if="printPreviewLoading" class="pa-10 text-center">
            <v-progress-circular indeterminate color="primary" />
            <div class="mt-4 text-grey-darken-1 font-weight-black">جاري تجهيز المعاينة...</div>
          </div>
          <iframe
            v-else-if="printPreviewHtml"
            class="print-preview-frame"
            :srcdoc="printPreviewHtml"
          />
          <div v-else class="pa-8 text-center text-grey-darken-1">
            {{ printPreviewError || 'لا توجد معاينة متاحة.' }}
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" class="font-weight-black" @click="printPreviewDialog = false"
            >إغلاق</v-btn
          >
          <v-btn
            color="accent"
            variant="elevated"
            class="font-weight-black"
            :loading="printingReport"
            :disabled="printPreviewLoading || !printPreviewHtml"
            @click="printFromPreview"
          >
            طباعة
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      rounded="pill"
      elevation="12"
      timeout="4000"
    >
      <div class="d-flex align-center">
        <LucideIcon :name="snackbar.icon" :size="20" class="me-3" />
        <span class="font-weight-black">{{ snackbar.text }}</span>
      </div>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { safeArray, safeLength } from '../utils/safe'
import PrintReportFrame from '../components/common/PrintReportFrame.vue'
import PrintSignaturePage from '../components/common/PrintSignaturePage.vue'
import LucideIcon from '../components/common/LucideIcon.vue'

interface CaseReportData {
  case: { id: string; case_number: string; status: string; client_name: string; parties: any[] }
  executive?: any
  kpis: { sessionsTotal: number; totalIn: number; balance: number }
  timeline: { rows: any[]; pageInfo: any }
  sessions: { rows: any[] }
  activity: { rows: any[] }
}

const caseId = ref<string | null>(null)
const from = ref('')
const to = ref('')
const report = ref<CaseReportData | null>(null)
const error = ref('')
const loading = ref(false)
const exporting = ref(false)
const printPreviewDialog = ref(false)
const printPreviewHtml = ref('')
const printPreviewLoading = ref(false)
const printPreviewError = ref('')
const printingReport = ref(false)
const loadingCases = ref(false)
const cases = ref<{ title: string; value: string }[]>([])

const snackbar = ref({ show: false, text: '', color: 'success', icon: 'check-circle' })
const showSnackbar = (text: string, type: 'success' | 'error' = 'success'): void => {
  snackbar.value = {
    show: true,
    text,
    color: type === 'success' ? 'success' : 'error',
    icon: type === 'success' ? 'check-circle' : 'alert-circle'
  }
}

const sections = ref({
  sessionsPage: 1,
  financePage: 1,
  activityPage: 1,
  timelinePage: 1
})

const nextTimelinePage = (): void => {
  sections.value.timelinePage++
  load()
}

const prevTimelinePage = (): void => {
  if (sections.value.timelinePage > 1) {
    sections.value.timelinePage--
    load()
  }
}

const load = async (): Promise<void> => {
  if (!caseId.value) return
  error.value = ''
  loading.value = true
  try {
    const data = await (window as any).api.reports.getCaseReport({
      caseId: caseId.value,
      from: from.value || undefined,
      to: to.value || undefined,
      sections: {
        ...sections.value,
        sessionsPageSize: 10,
        financePageSize: 10,
        activityPageSize: 10,
        timelinePageSize: 20
      }
    })
    report.value = data
  } catch (e: unknown) {
    error.value = (e as Error)?.message || 'فشل تحميل التقرير الشامل'
    report.value = null
  } finally {
    loading.value = false
  }
}

const printPage = () => {
  generatePrintPreview().catch((e) => {
    error.value = (e as Error)?.message || 'تعذر فتح معاينة الطباعة'
  })
}

const exportPdf = async (): Promise<void> => {
  if (!caseId.value) return
  exporting.value = true
  error.value = ''
  try {
    const res = await (window as any).api.reports.exportPdf({
      type: 'case-a4',
      params: {
        caseId: caseId.value,
        from: from.value || undefined,
        to: to.value || undefined,
        sections: { ...sections.value }
      }
    })
    if (res?.saved) {
      showSnackbar(res?.path ? `تم حفظ التقرير: ${res.path}` : 'تم حفظ التقرير بنجاح', 'success')
    } else {
      showSnackbar('تم إلغاء حفظ التقرير', 'error')
    }
  } catch (e: unknown) {
    const msg = (e as Error)?.message || 'فشل تصدير PDF'
    error.value = msg
    showSnackbar(msg, 'error')
  } finally {
    exporting.value = false
  }
}

async function generatePrintPreview(): Promise<void> {
  if (!caseId.value) return
  printPreviewError.value = ''
  printPreviewHtml.value = ''
  printPreviewLoading.value = true
  printPreviewDialog.value = true
  try {
    printPreviewHtml.value = await (window as any).api.reports.getPreviewHtml({
      type: 'case-a4',
      params: {
        caseId: caseId.value,
        from: from.value || undefined,
        to: to.value || undefined,
        sections: { ...sections.value }
      }
    })
    if (!printPreviewHtml.value) {
      printPreviewError.value = 'تعذر توليد المعاينة (لم يتم إرجاع محتوى)'
    }
  } catch (e: unknown) {
    printPreviewError.value = (e as Error)?.message || 'تعذر فتح معاينة التقرير'
    error.value = printPreviewError.value
    showSnackbar(printPreviewError.value, 'error')
  } finally {
    printPreviewLoading.value = false
  }
}

async function printFromPreview(): Promise<void> {
  if (!caseId.value || printingReport.value) return
  printingReport.value = true
  try {
    const ok = await (window as any).api.reports.printReport({
      type: 'case-a4',
      params: {
        caseId: caseId.value,
        from: from.value || undefined,
        to: to.value || undefined,
        sections: { ...sections.value }
      }
    })
    if (ok) {
      showSnackbar('تم إرسال التقرير للطباعة', 'success')
    } else {
      showSnackbar('تم إلغاء الطباعة', 'error')
    }
  } catch (e: unknown) {
    const msg = (e as Error)?.message || 'فشل الطباعة'
    error.value = msg
    showSnackbar(msg, 'error')
  } finally {
    printingReport.value = false
  }
}

const exportExcel = async (): Promise<void> => {
  if (!report.value) return
  try {
    const c = (report.value as any).case || {}
    const rows = safeArray((report.value as any).timeline?.rows).map((t: any) => ({
      case_number: c.case_number || c.id || '',
      responsible: c.responsible_name || '',
      at: t.at || '',
      type: t.type || '',
      title: t.title || ''
    }))
    const res = await (window as any).api.reports.exportCsv('case-report.csv', rows)
    const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = res.filename
    link.click()
    URL.revokeObjectURL(url)
  } catch {
    error.value = 'فشل تصدير Excel'
  }
}

const loadCases = async (): Promise<void> => {
  loadingCases.value = true
  try {
    const rows = await (window as any).api.reports.listCases()
    cases.value = safeArray(rows).map((r: any) => ({
      value: r.id,
      title: `${r.case_number || r.id} — ${r.client_name || ''}`
    }))
  } catch (e: unknown) {
    console.error('Failed to load cases:', e)
  } finally {
    loadingCases.value = false
  }
}

const getSessionColor = (status: string | undefined): string => {
  if (!status) return 'grey'
  if (status.includes('منتهية')) return 'success'
  if (status.includes('قادمة')) return 'accent'
  if (status.includes('مؤجلة')) return 'warning'
  return 'gold'
}

onMounted(() => {
  loadCases()
})
</script>

<style scoped>
.print-preview-frame {
  width: 100%;
  height: 72vh;
  border: 0;
  display: block;
  background: #ffffff;
}

.rtl {
  direction: rtl;
}
.font-mono {
  font-family: 'Consolas', 'Monaco', monospace;
}
.gap-2 {
  gap: 0.5rem;
}
.gap-3 {
  gap: 0.75rem;
}
</style>
