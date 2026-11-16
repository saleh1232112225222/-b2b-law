<template>
  <v-container fluid class="pa-4 pa-md-6 pb-12 rtl report-page">
    <PrintReportFrame :title="reportTitle" />

    <!-- Print Only Header for Native Browser Print -->
    <section class="print-only reports-print-index mb-6">
      <div class="d-flex justify-space-between align-center border-b pb-4 mb-4">
        <div>
          <h1 class="text-h6 font-weight-black mb-1">{{ reportTitle }}</h1>
          <p class="text-caption mb-0">
            تاريخ الطباعة: {{ printDate }} مـ | {{ printDateHijri }} هـ
          </p>
        </div>
        <div v-if="selectedCase" class="text-left">
          <div class="text-subtitle-2 font-weight-black">رقم القضية: {{ selectedCase.case_number || '-' }}</div>
          <div class="text-caption font-weight-bold">المحكمة: {{ selectedCase.court || '-' }}</div>
        </div>
      </div>
    </section>

    <!-- Header & Navigation Bar -->
    <v-row dense class="mb-6 align-center no-print">
      <v-col cols="12" md="8">
        <div class="d-flex align-center">
          <div class="header-icon-box pa-3 pa-md-4 rounded-xl me-4">
            <LucideIcon name="calendar-check-2" :size="32" class="text-primary-navy" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-theme-title mb-1">
              تقرير جلسات القضية
            </h1>
            <p class="text-caption text-md-subtitle-2 text-theme-subtitle font-weight-bold mb-0">
              بيان ملخص وتفصيلي لكافة الجلسات المنعقدة وتواريخها بالميلادي والهجري
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="4" class="text-left mt-2 mt-md-0 d-flex justify-md-end gap-2">
        <v-btn
          variant="outlined"
          color="primary"
          class="rounded-lg px-4 font-weight-black back-btn"
          @click="$router.push('/reports')"
        >
          <LucideIcon name="arrow-right" :size="16" class="me-1" /> رجوع للمركز
        </v-btn>
      </v-col>
    </v-row>

    <!-- Selection & Action Controls Card -->
    <v-card elevation="0" class="control-card pa-4 pa-md-5 rounded-xl mb-6 no-print">
      <v-row dense class="align-center">
        <!-- Cases Dropdown -->
        <v-col cols="12" md="6">
          <v-select
            v-model="caseId"
            :items="cases"
            :loading="loadingCases"
            item-title="title"
            item-value="value"
            label="اختر القضية من القائمة المنسدلة..."
            variant="outlined"
            density="comfortable"
            class="case-select-input"
            hide-details
            clearable
            @update:model-value="onCaseChange"
          >
            <template #prepend-inner>
              <LucideIcon name="briefcase" :size="20" class="text-gold-accent me-2" />
            </template>
          </v-select>
        </v-col>

        <!-- Action Buttons -->
        <v-col cols="12" md="6" class="d-flex flex-wrap gap-2 justify-md-end mt-3 mt-md-0">
          <!-- Refresh -->
          <v-btn
            variant="outlined"
            color="primary"
            height="44"
            class="rounded-lg font-weight-bold"
            :loading="loading"
            :disabled="!caseId"
            @click="loadCaseData"
          >
            <LucideIcon name="refresh-cw" :size="16" class="me-2" /> تحديث التقرير
          </v-btn>

          <!-- Print Preview A4 -->
          <v-btn
            variant="tonal"
            color="secondary"
            height="44"
            class="rounded-lg px-4 font-weight-bold print-action-btn"
            :disabled="!selectedCase || sessionsList.length === 0"
            @click="openPrintPreview"
          >
            <LucideIcon name="printer" :size="16" class="me-2" /> معاينة وطباعة A4
          </v-btn>

          <!-- Export PDF & Save to Directory -->
          <v-btn
            color="primary"
            variant="flat"
            height="44"
            class="rounded-lg px-5 font-weight-black export-pdf-btn"
            :loading="exportingPdf"
            :disabled="!selectedCase || sessionsList.length === 0"
            @click="exportPdfReport"
          >
            <LucideIcon name="download" :size="17" class="me-2" /> تصدير PDF (حفظ في مجلد)
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <!-- Error Alert -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-6 rounded-xl font-weight-black no-print"
      closable
      @click:close="error = ''"
    >
      <template #prepend>
        <LucideIcon name="alert-triangle" :size="22" class="me-3" />
      </template>
      {{ error }}
    </v-alert>

    <!-- Empty State: When no case selected -->
    <v-card
      v-if="!caseId && !loading"
      elevation="0"
      class="state-card pa-12 text-center rounded-xl no-print"
    >
      <div class="empty-icon-wrapper pa-4 rounded-circle d-inline-flex mb-4">
        <LucideIcon name="scale" :size="48" class="text-gold-accent opacity-60" />
      </div>
      <div class="text-h6 font-weight-black text-theme-title mb-2">
        يرجى اختيار قضية من القائمة المنسدلة أعلاه
      </div>
      <div class="text-body-2 text-theme-subtitle" style="max-width: 550px; margin: 0 auto;">
        سيتم إصدار التقرير المنظم متضمناً اسم الموكل، ورقم القضية، وعدد الجلسات، مع التفصيل الدقيق لكل جلسة باليوم والتاريخين الميلادي والهجري فور اختيارك للقضية
      </div>
    </v-card>

    <!-- Loading State -->
    <v-card
      v-else-if="loading"
      elevation="0"
      class="state-card pa-12 text-center rounded-xl"
    >
      <v-progress-circular indeterminate color="primary" size="52" />
      <div class="text-subtitle-1 font-weight-black text-theme-title mt-4">
        جاري استخراج بيانات القضية وسجل الجلسات...
      </div>
    </v-card>

    <!-- Report Content (Printable & Screen) -->
    <div v-else-if="selectedCase" class="report-content-body">
      <!-- 1. Executive Summary Box (اسم الموكل - رقم وموضوع القضية - عدد الجلسات) -->
      <v-card elevation="0" class="summary-banner-card pa-5 pa-md-6 rounded-xl mb-6">
        <v-row dense class="align-center">
          <!-- Client Name Column -->
          <v-col cols="12" sm="6" md="4" class="mb-3 mb-md-0">
            <div class="d-flex align-center">
              <div class="summary-metric-icon pa-3 rounded-xl me-3 icon-client">
                <LucideIcon name="user-check" :size="24" />
              </div>
              <div class="metric-text-content">
                <div class="metric-label">اسم الموكل</div>
                <div class="metric-value-primary text-truncate">
                  {{ selectedCase.client_name || 'غير محدد' }}
                </div>
                <div v-if="selectedCase.client_phone" class="metric-subtext text-truncate">
                  هاتف: {{ selectedCase.client_phone }}
                </div>
              </div>
            </div>
          </v-col>

          <!-- Case Number & Subject Column -->
          <v-col cols="12" sm="6" md="4" class="mb-3 mb-md-0">
            <div class="d-flex align-center">
              <div class="summary-metric-icon pa-3 rounded-xl me-3 icon-case">
                <LucideIcon name="file-text" :size="24" />
              </div>
              <div class="metric-text-content">
                <div class="metric-label">رقم وموضوع القضية</div>
                <div class="metric-value-primary font-mono text-truncate">
                  {{ selectedCase.case_number || '-' }}
                </div>
                <div class="metric-subtext text-truncate">
                  {{ selectedCase.court || 'المحكمة المختصة' }}
                  <span v-if="selectedCase.subject"> - {{ selectedCase.subject }}</span>
                </div>
              </div>
            </div>
          </v-col>

          <!-- Total Sessions Count Column (Prominent Badge) -->
          <v-col cols="12" sm="12" md="4">
            <div class="d-flex align-center justify-start justify-md-end">
              <div class="sessions-count-pill pa-4 rounded-xl d-flex align-center">
                <div class="count-icon-box me-3">
                  <LucideIcon name="gavel" :size="26" class="text-gold-royal" />
                </div>
                <div>
                  <div class="count-pill-label">عدد الجلسات للقضية</div>
                  <div class="count-pill-value font-weight-black">
                    عدد الجلسات: ( {{ sessionsList.length }} )
                  </div>
                </div>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-card>

      <!-- 2. Detailed Sessions Section (وهي: تحت يجي التفصيل فقط 1- المنعقدة بيوم ...) -->
      <v-card elevation="0" class="sessions-container-card pa-5 pa-md-6 rounded-xl mb-6">
        <!-- Section Header -->
        <div class="d-flex align-center justify-space-between mb-4 pb-3 border-b-subtle">
          <div class="d-flex align-center">
            <div class="section-bullet-bar me-3"></div>
            <h2 class="text-h6 font-weight-black text-theme-title mb-0">
              بيان الجلسات:
            </h2>
          </div>
          <v-chip size="small" color="primary" variant="tonal" class="font-weight-black px-3">
            إجمالي: {{ sessionsList.length }} جلسة
          </v-chip>
        </div>

        <!-- Empty Sessions Notice -->
        <div v-if="sessionsList.length === 0" class="text-center py-12 empty-sessions-box rounded-xl">
          <LucideIcon name="calendar-x" :size="44" class="mb-2 text-theme-subtitle opacity-60" />
          <div class="text-subtitle-1 font-weight-bold text-theme-subtitle">
            لا توجد جلسات مسجلة لهذه القضية حتى الآن
          </div>
        </div>

        <!-- Ordered Detailed Sessions List -->
        <div v-else class="sessions-details-list">
          <div
            v-for="(session, index) in sessionsList"
            :key="session.id || index"
            class="session-detail-card pa-4 mb-3 rounded-xl"
          >
            <div class="d-flex align-start justify-space-between flex-wrap gap-2">
              <!-- Number & Phrase: 1- المنعقدة بيوم ... الموافق (...) -->
              <div class="session-main-phrase">
                <span class="session-ordinal-number font-weight-black me-2">{{ index + 1 }}-</span>
                <span class="session-phrase-body">
                  المنعقدة بيوم
                  <strong class="session-day-name px-1">{{ formatDayName(session.date) }}</strong>
                  الموافق
                  <span class="session-dates-badge font-mono px-2 py-1 rounded-lg">
                    ({{ formatGregorianAndHijri(session.date, session.date_hijri) }})
                  </span>
                </span>
              </div>

              <!-- Badges (Time, Room, Status) -->
              <div class="d-flex align-center gap-2 flex-wrap session-badges-row">
                <span v-if="session.time" class="meta-chip font-mono">
                  <LucideIcon name="clock" :size="13" class="me-1 text-gold-royal" />
                  {{ session.time }}
                </span>
                <span v-if="session.court_room" class="meta-chip">
                  القاعة: {{ session.court_room }}
                </span>
                <v-chip
                  size="small"
                  :color="getSessionStatusColor(session.status)"
                  variant="flat"
                  class="font-weight-black status-chip"
                >
                  {{ session.status || 'منعقدة' }}
                </v-chip>
              </div>
            </div>

            <!-- Optional Result / Notes line if recorded -->
            <div v-if="session.result || session.notes" class="session-outcome-box mt-3 pt-2">
              <span class="outcome-label font-weight-black me-1">القرار / النتيجة:</span>
              <span class="outcome-text">{{ session.result || session.notes }}</span>
            </div>
          </div>
        </div>
      </v-card>

      <!-- Print Signature Footer -->
      <PrintSignaturePage />
    </div>

    <!-- Print Preview Modal Dialog (A4 Multi-page Preview) -->
    <v-dialog v-model="printPreviewDialog" width="90%" max-width="1024" scrollable>
      <v-card class="rounded-xl overflow-hidden preview-dialog-card">
        <v-toolbar color="primary" height="60" class="px-4">
          <LucideIcon name="printer" :size="20" class="me-2 text-gold-accent" />
          <v-toolbar-title class="text-white font-weight-black text-subtitle-1">
            معاينة تقرير جلسات القضية للطباعة الرسمية (A4)
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon variant="text" color="white" @click="printPreviewDialog = false">
            <LucideIcon name="x" />
          </v-btn>
        </v-toolbar>

        <v-card-text class="pa-0 preview-body-area">
          <div v-if="printPreviewLoading" class="pa-12 text-center">
            <v-progress-circular indeterminate color="primary" size="48" />
            <div class="mt-4 text-theme-title font-weight-bold">جاري تجهيز وثيقة الطباعة الرسمية A4...</div>
          </div>
          <iframe
            v-else-if="printPreviewHtml"
            class="print-preview-iframe"
            :srcdoc="printPreviewHtml"
          />
          <div v-else class="pa-8 text-center text-theme-subtitle">
            {{ printPreviewError || 'لا توجد معاينة متاحة.' }}
          </div>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-4 preview-dialog-actions d-flex justify-space-between">
          <v-btn variant="text" class="font-weight-bold text-theme-title" @click="printPreviewDialog = false">
            إغلاق المعاينة
          </v-btn>
          <div class="d-flex gap-2">
            <v-btn
              color="primary"
              variant="flat"
              class="font-weight-black px-6"
              :loading="printingReport"
              :disabled="printPreviewLoading || !printPreviewHtml"
              @click="printFromPreview"
            >
              <LucideIcon name="printer" :size="16" class="me-2" /> تنفيذ الطباعة الآن
            </v-btn>
          </div>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Global Notification Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      rounded="pill"
      elevation="8"
      timeout="4500"
    >
      <div class="d-flex align-center">
        <LucideIcon :name="snackbar.icon" :size="20" class="me-3" />
        <span class="font-weight-bold">{{ snackbar.text }}</span>
      </div>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { safeArray } from '../utils/safe'
import { convertToHijri } from '../utils/hijri'
import PrintReportFrame from '../components/common/PrintReportFrame.vue'
import PrintSignaturePage from '../components/common/PrintSignaturePage.vue'
import LucideIcon from '../components/common/LucideIcon.vue'

const route = useRoute()

const caseId = ref<string | null>(null)
const cases = ref<{ title: string; value: string }[]>([])
const selectedCase = ref<any | null>(null)
const sessionsList = ref<any[]>([])

const loading = ref(false)
const loadingCases = ref(false)
const exportingPdf = ref(false)
const printingReport = ref(false)
const error = ref('')

// Print preview dialog state
const printPreviewDialog = ref(false)
const printPreviewLoading = ref(false)
const printPreviewHtml = ref('')
const printPreviewError = ref('')

const snackbar = ref({
  show: false,
  text: '',
  color: 'success',
  icon: 'check-circle'
})

const showSnackbar = (text: string, type: 'success' | 'error' | 'info' = 'success'): void => {
  snackbar.value = {
    show: true,
    text,
    color: type === 'success' ? 'success' : type === 'error' ? 'error' : 'info',
    icon: type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'
  }
}

const reportTitle = computed(() => {
  if (selectedCase.value?.case_number) {
    return `تقرير جلسات القضية رقم: ${selectedCase.value.case_number}`
  }
  return 'تقرير جلسات القضية'
})

const printDate = computed(() => {
  return new Date().toLocaleDateString('ar-SA')
})

const printDateHijri = computed(() => {
  return convertToHijri(new Date())
})

const formatDayName = (dateStr: string): string => {
  if (!dateStr) return 'غير محدد'
  try {
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(d)
  } catch {
    return 'غير محدد'
  }
}

const formatGregorianAndHijri = (gDate: string, hDate?: string): string => {
  const gregorian = gDate ? `${gDate} مـ` : '---'
  if (hDate && hDate.trim()) {
    return `${gregorian} - ${hDate.trim()} هـ`
  }
  if (gDate) {
    try {
      const parsedDate = new Date(gDate)
      if (!isNaN(parsedDate.getTime())) {
        const hijriStr = convertToHijri(parsedDate)
        if (hijriStr) return `${gregorian} - ${hijriStr} هـ`
      }
    } catch {}
  }
  return gregorian
}

const getSessionStatusColor = (status: string | undefined): string => {
  if (!status) return 'grey'
  if (status.includes('منتهية') || status.includes('مكتملة')) return 'success'
  if (status.includes('قادمة') || status.includes('مجدولة')) return 'info'
  if (status.includes('مؤجلة')) return 'warning'
  return 'primary'
}

const loadCases = async (): Promise<void> => {
  loadingCases.value = true
  try {
    const rows = await (window as any).api?.reports?.listCases?.()
    cases.value = safeArray(rows).map((r: any) => ({
      value: r.id,
      title: `${r.case_number || r.id} — ${r.client_name || 'بدون اسم'}`
    }))
  } catch (e: any) {
    console.error('Failed to load cases:', e)
    error.value = 'تعذر تحميل قائمة القضايا'
  } finally {
    loadingCases.value = false
  }
}

const loadCaseData = async (): Promise<void> => {
  if (!caseId.value) {
    selectedCase.value = null
    sessionsList.value = []
    return
  }

  loading.value = true
  error.value = ''
  try {
    // 1. Fetch case details
    const caseData = await (window as any).api.cases.getById(caseId.value)
    if (!caseData) {
      throw new Error('لم يتم العثور على بيانات القضية المحددة')
    }
    selectedCase.value = caseData

    // 2. Fetch sessions linked to this case
    const sessions = await (window as any).api.sessions.getByCaseId(caseId.value)
    // Sort chronologically ascending
    sessionsList.value = safeArray(sessions).sort((a: any, b: any) => {
      const d1 = String(a.date || '').localeCompare(String(b.date || ''))
      if (d1 !== 0) return d1
      return String(a.time || '').localeCompare(String(b.time || ''))
    })
  } catch (e: any) {
    error.value = e?.message || 'حدث خطأ أثناء تحميل بيانات تقرير جلسات القضية'
    selectedCase.value = null
    sessionsList.value = []
  } finally {
    loading.value = false
  }
}

const onCaseChange = () => {
  if (caseId.value) {
    loadCaseData()
  } else {
    selectedCase.value = null
    sessionsList.value = []
  }
}

// Export PDF directly with native save dialog to folder
const exportPdfReport = async (): Promise<void> => {
  if (!caseId.value) return
  exportingPdf.value = true
  try {
    const api = (window as any).api
    if (api?.reports?.exportPdf) {
      const result = await api.reports.exportPdf({
        type: 'case-sessions',
        params: { caseId: caseId.value }
      })
      if (result?.saved) {
        showSnackbar(`تم حفظ تقرير PDF بنجاح في: ${result.path}`, 'success')
      } else {
        showSnackbar('تم إلغاء عملية حفظ التقرير', 'info')
      }
    } else {
      // Fallback for Web/Browser
      window.print()
      showSnackbar('تم فتح نافذة الطباعة / الحفظ كـ PDF', 'info')
    }
  } catch (e: any) {
    showSnackbar(e?.message || 'فشل تصدير ملف PDF', 'error')
  } finally {
    exportingPdf.value = false
  }
}

// Open Print Preview Modal
const openPrintPreview = async (): Promise<void> => {
  if (!caseId.value) return
  printPreviewDialog.value = true
  printPreviewLoading.value = true
  printPreviewError.value = ''
  printPreviewHtml.value = ''

  try {
    const api = (window as any).api
    if (api?.reports?.getPreviewHtml) {
      const html = await api.reports.getPreviewHtml({
        type: 'case-sessions',
        params: { caseId: caseId.value }
      })
      printPreviewHtml.value = typeof html === 'string' ? html : ''
    } else {
      printPreviewHtml.value = ''
    }

    if (!printPreviewHtml.value) {
      // If preview HTML is not returned, fallback to standard print
      printPreviewDialog.value = false
      window.print()
    }
  } catch (e: any) {
    printPreviewError.value = e?.message || 'تعذر فتح معاينة الطباعة'
    printPreviewDialog.value = false
    window.print()
  } finally {
    printPreviewLoading.value = false
  }
}

// Execute Print from preview
const printFromPreview = async (): Promise<void> => {
  if (!caseId.value || printingReport.value) return
  printingReport.value = true
  try {
    const api = (window as any).api
    if (api?.reports?.printReport) {
      const ok = await api.reports.printReport({
        type: 'case-sessions',
        params: { caseId: caseId.value }
      })
      if (ok) {
        showSnackbar('تم إرسال التقرير للطباعة بنجاح', 'success')
      }
    } else {
      window.print()
    }
    printPreviewDialog.value = false
  } catch (e: any) {
    showSnackbar(e?.message || 'فشل تنفيذ الطباعة', 'error')
  } finally {
    printingReport.value = false
  }
}

onMounted(async () => {
  await loadCases()
  if (route.query.caseId) {
    caseId.value = String(route.query.caseId)
    await loadCaseData()
  }
})
</script>

<style scoped>
.rtl {
  direction: rtl;
}

/* Base Typography & Theme Colors */
.text-theme-title {
  color: var(--text-primary, #0f172a) !important;
}

.text-theme-subtitle {
  color: var(--text-muted, #64748b) !important;
}

.text-primary-navy {
  color: #1a437d !important;
}

.text-gold-royal {
  color: #b45309 !important;
}

.text-gold-accent {
  color: #d4af37 !important;
}

.font-mono {
  font-family: 'Consolas', 'Monaco', monospace;
}

/* Header Icon Container */
.header-icon-box {
  background: rgba(26, 67, 125, 0.08);
  border: 1px solid rgba(26, 67, 125, 0.18);
}

/* Back Button */
.back-btn {
  border-color: rgba(26, 67, 125, 0.3) !important;
}

/* Controls Card */
.control-card {
  background: #ffffff !important;
  border: 1px solid rgba(226, 232, 240, 0.9) !important;
  box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.04) !important;
}

[data-theme='dark'] .control-card {
  background: rgba(30, 41, 59, 0.7) !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
}

/* Export PDF Button */
.export-pdf-btn {
  background: linear-gradient(135deg, #1a437d 0%, #153562 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(26, 67, 125, 0.25) !important;
}

/* Print Button */
.print-action-btn {
  background: #f1f5f9 !important;
  color: #1e293b !important;
  border: 1px solid #cbd5e1 !important;
}

[data-theme='dark'] .print-action-btn {
  background: rgba(255, 255, 255, 0.08) !important;
  color: #ffffff !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
}

/* State Cards */
.state-card {
  background: #ffffff !important;
  border: 1px dashed rgba(203, 213, 225, 0.8) !important;
}

[data-theme='dark'] .state-card {
  background: rgba(30, 41, 59, 0.5) !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
}

.empty-icon-wrapper {
  background: rgba(212, 175, 55, 0.1);
}

/* 1. Executive Summary Card (Light & Crisp, Matching App) */
.summary-banner-card {
  background: #ffffff !important;
  border: 1px solid rgba(226, 232, 240, 0.95) !important;
  border-right: 6px solid #d4af37 !important;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05) !important;
}

[data-theme='dark'] .summary-banner-card {
  background: rgba(30, 41, 59, 0.8) !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
  border-right-color: #d4af37 !important;
}

.summary-metric-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-client {
  background: rgba(26, 67, 125, 0.08);
  color: #1a437d;
}

.icon-case {
  background: rgba(212, 175, 55, 0.12);
  color: #b45309;
}

.metric-text-content {
  min-width: 0;
}

.metric-label {
  font-size: 0.82rem;
  color: var(--text-muted, #64748b);
  font-weight: 700;
  margin-bottom: 2px;
}

.metric-value-primary {
  font-size: 1.15rem;
  font-weight: 900;
  color: var(--text-primary, #0f172a);
  line-height: 1.3;
}

.metric-subtext {
  font-size: 0.82rem;
  color: var(--text-muted, #475569);
  margin-top: 2px;
}

/* Prominent Sessions Count Pill */
.sessions-count-pill {
  background: #fefce8 !important;
  border: 1.5px solid #fef08a !important;
  box-shadow: 0 2px 8px rgba(234, 179, 8, 0.12);
}

[data-theme='dark'] .sessions-count-pill {
  background: rgba(234, 179, 8, 0.15) !important;
  border-color: rgba(234, 179, 8, 0.3) !important;
}

.count-pill-label {
  font-size: 0.82rem;
  color: #92400e;
  font-weight: 800;
  margin-bottom: 2px;
}

[data-theme='dark'] .count-pill-label {
  color: #fde047;
}

.count-pill-value {
  font-size: 1.25rem;
  color: #1a437d;
  letter-spacing: -0.5px;
}

[data-theme='dark'] .count-pill-value {
  color: #ffffff;
}

/* 2. Sessions List Container */
.sessions-container-card {
  background: #ffffff !important;
  border: 1px solid rgba(226, 232, 240, 0.95) !important;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.04) !important;
}

[data-theme='dark'] .sessions-container-card {
  background: rgba(30, 41, 59, 0.8) !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
}

.section-bullet-bar {
  width: 4px;
  height: 22px;
  background: #1a437d;
  border-radius: 4px;
}

.border-b-subtle {
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
}

[data-theme='dark'] .border-b-subtle {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

/* Detailed Session Item */
.session-detail-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
  transition: all 0.2s ease-in-out;
}

[data-theme='dark'] .session-detail-card {
  background: rgba(15, 23, 42, 0.6);
  border-color: rgba(255, 255, 255, 0.08);
}

.session-detail-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

.session-ordinal-number {
  color: #b45309;
  font-size: 1.15rem;
}

.session-phrase-body {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
}

.session-day-name {
  color: #1a437d;
}

[data-theme='dark'] .session-day-name {
  color: #60a5fa;
}

.session-dates-badge {
  background: #f1f5f9;
  color: #0f172a;
  border: 1px solid #e2e8f0;
  font-weight: 800;
  display: inline-block;
  margin: 0 4px;
}

[data-theme='dark'] .session-dates-badge {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.15);
}

.meta-chip {
  font-size: 0.82rem;
  font-weight: 700;
  background: #f8fafc;
  color: #334155;
  border: 1px solid #e2e8f0;
  padding: 4px 10px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
}

[data-theme='dark'] .meta-chip {
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
  border-color: rgba(255, 255, 255, 0.1);
}

.status-chip {
  font-size: 0.82rem !important;
}

.session-outcome-box {
  background: #f8fafc;
  border-right: 3px solid #cbd5e1;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 0.9rem;
}

[data-theme='dark'] .session-outcome-box {
  background: rgba(255, 255, 255, 0.03);
  border-right-color: #64748b;
}

.outcome-label {
  color: #475569;
}

[data-theme='dark'] .outcome-label {
  color: #94a3b8;
}

.outcome-text {
  color: var(--text-primary, #1e293b);
}

/* Print Preview Frame */
.print-preview-iframe {
  width: 100%;
  height: 72vh;
  border: none;
  background: #ffffff;
}

.preview-body-area {
  background: #e2e8f0;
}

.preview-dialog-actions {
  background: #ffffff;
}

[data-theme='dark'] .preview-dialog-actions {
  background: #0f172a;
}

/* Print Media Styles */
@media print {
  .no-print {
    display: none !important;
  }
  .print-only {
    display: block !important;
  }
  .report-page {
    padding: 0 !important;
    background: #ffffff !important;
    color: #000000 !important;
  }
  .summary-banner-card,
  .sessions-container-card,
  .session-detail-card {
    background: #ffffff !important;
    border: 1px solid #cbd5e1 !important;
    box-shadow: none !important;
    color: #000000 !important;
  }
  .metric-value-primary,
  .session-phrase-body,
  .count-pill-value {
    color: #000000 !important;
  }
  .session-detail-card {
    page-break-inside: avoid !important;
    margin-bottom: 8px !important;
  }
}
</style>
