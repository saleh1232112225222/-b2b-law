<template>
  <v-container fluid class="pa-4 pa-md-6 pb-12 rtl report-page">
    <PrintReportFrame :title="reportTitle" />

    <!-- Print Only Header -->
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

    <!-- Header & Navigation -->
    <v-row dense class="mb-6 align-center no-print">
      <v-col cols="12" md="8">
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-3 pa-md-4 rounded-xl me-4 border-gold opacity-20">
            <LucideIcon name="calendar-check-2" :size="32" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">
              تقرير جلسات القضية
            </h1>
            <p class="text-caption text-md-subtitle-2 text-gold opacity-70 font-weight-bold mb-0">
              بيان ملخص وتفصيلي لكافة الجلسات المنعقدة وتواريخها بالميلادي والهجري
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="4" class="text-left mt-2 mt-md-0 d-flex justify-md-end gap-2">
        <v-btn
          variant="outlined"
          color="gold"
          class="rounded-lg px-4 font-weight-black"
          @click="$router.push('/reports')"
        >
          <LucideIcon name="arrow-right" :size="16" class="me-1" /> رجوع للمركز
        </v-btn>
      </v-col>
    </v-row>

    <!-- Selection & Actions Card -->
    <v-card elevation="0" class="glass-card pa-4 pa-md-6 border-gold border-opacity-20 rounded-xl mb-6 no-print">
      <v-row dense class="align-center">
        <v-col cols="12" md="7">
          <v-select
            v-model="caseId"
            :items="cases"
            :loading="loadingCases"
            item-title="title"
            item-value="value"
            label="اختر القضية من القائمة..."
            variant="outlined"
            class="glass-input"
            hide-details
            clearable
            @update:model-value="onCaseChange"
          >
            <template #prepend-inner>
              <LucideIcon name="briefcase" :size="20" class="text-gold me-2" />
            </template>
          </v-select>
        </v-col>

        <v-col cols="12" md="5" class="d-flex gap-2 justify-md-end mt-2 mt-md-0">
          <v-btn
            color="accent"
            variant="flat"
            height="46"
            class="rounded-lg font-weight-black text-ebony"
            :loading="loading"
            :disabled="!caseId"
            @click="loadCaseData"
          >
            <LucideIcon name="refresh-cw" :size="16" class="me-2" /> تحديث التقرير
          </v-btn>

          <v-btn
            variant="tonal"
            color="white"
            height="46"
            class="rounded-lg px-4 font-weight-black"
            :disabled="!selectedCase || sessionsList.length === 0"
            @click="printPage"
          >
            <LucideIcon name="printer" :size="16" class="me-2 text-gold" /> طباعة
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <!-- Error Alert -->
    <v-alert
      v-if="error"
      type="error"
      variant="flat"
      class="mb-6 rounded-xl font-weight-black border-2 border-error-darken-1 no-print"
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
      class="glass-card pa-12 text-center border-gold border-opacity-20 rounded-xl no-print"
    >
      <div class="glass-panel-light pa-4 rounded-circle d-inline-flex mb-4">
        <LucideIcon name="scale" :size="48" class="text-gold opacity-50" />
      </div>
      <div class="text-h6 font-weight-black text-white mb-2">يرجى اختيار قضية من القائمة المنسدلة أعلاه</div>
      <div class="text-body-2 text-gold opacity-70">
        سيتم عرض ملخص القضية واسم الموكل وإجمالي عدد الجلسات مع التفصيل المنعقد بالتاريخ الميلادي والهجري فور اختيار القضية
      </div>
    </v-card>

    <!-- Loading State -->
    <v-card
      v-else-if="loading"
      elevation="0"
      class="glass-card pa-12 text-center border-gold border-opacity-20 rounded-xl"
    >
      <v-progress-circular indeterminate color="accent" size="52" />
      <div class="text-subtitle-1 font-weight-black text-gold mt-4">جاري استخراج بيانات القضية وسجل الجلسات...</div>
    </v-card>

    <!-- Report Content (Printable & Screen) -->
    <div v-else-if="selectedCase" class="report-content-body">
      <!-- Summary Box (ملخص القضية والموكل وعدد الجلسات) -->
      <v-card elevation="0" class="glass-card pa-6 border-gold border-opacity-30 rounded-xl mb-6 report-summary-card">
        <v-row dense class="align-center">
          <!-- Client Name -->
          <v-col cols="12" sm="6" md="4" class="mb-3 mb-md-0">
            <div class="d-flex align-center">
              <div class="summary-icon pa-2 rounded-lg bg-gold-opacity me-3">
                <LucideIcon name="user-check" :size="22" class="text-accent" />
              </div>
              <div>
                <div class="text-caption text-gold opacity-70 font-weight-bold">اسم الموكل</div>
                <div class="text-h6 font-weight-black text-white text-truncate">
                  {{ selectedCase.client_name || 'غير محدد' }}
                </div>
              </div>
            </div>
          </v-col>

          <!-- Case Number -->
          <v-col cols="12" sm="6" md="4" class="mb-3 mb-md-0">
            <div class="d-flex align-center">
              <div class="summary-icon pa-2 rounded-lg bg-gold-opacity me-3">
                <LucideIcon name="file-text" :size="22" class="text-accent" />
              </div>
              <div>
                <div class="text-caption text-gold opacity-70 font-weight-bold">رقم وموضوع القضية</div>
                <div class="text-h6 font-weight-black text-white text-truncate font-mono">
                  {{ selectedCase.case_number || '-' }}
                </div>
                <div class="text-caption text-gold opacity-80 text-truncate">
                  {{ selectedCase.subject || 'بدون موضوع' }}
                </div>
              </div>
            </div>
          </v-col>

          <!-- Total Sessions Count -->
          <v-col cols="12" sm="12" md="4">
            <div class="d-flex align-center">
              <div class="summary-icon pa-2 rounded-lg bg-accent-opacity me-3">
                <LucideIcon name="gavel" :size="22" class="text-accent" />
              </div>
              <div>
                <div class="text-caption text-gold opacity-70 font-weight-bold">عدد الجلسات للقضية</div>
                <div class="text-h5 font-weight-black text-accent">
                  عدد الجلسات: ( {{ sessionsList.length }} )
                </div>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-card>

      <!-- Sessions List Table / Details (وهي: تحت يجي التفصيل فقط 1- المنعقدة بيوم ...) -->
      <v-card elevation="0" class="glass-card pa-6 border-gold border-opacity-30 rounded-xl mb-6">
        <div class="d-flex align-center justify-space-between mb-4 border-b border-gold border-opacity-20 pb-3">
          <div class="d-flex align-center">
            <LucideIcon name="list-ordered" :size="22" class="text-accent me-2" />
            <h2 class="text-h6 font-weight-black text-gold mb-0">
              بيان الجلسات:
            </h2>
          </div>
          <v-chip size="small" color="accent" variant="tonal" class="font-weight-black">
            إجمالي: {{ sessionsList.length }} جلسة
          </v-chip>
        </div>

        <div v-if="sessionsList.length === 0" class="text-center py-10 text-gold opacity-50">
          <LucideIcon name="calendar-x" :size="40" class="mb-2 opacity-50" />
          <div class="text-subtitle-2 font-weight-bold">لا توجد جلسات مسجلة لهذه القضية حتى الآن</div>
        </div>

        <!-- Detailed Sessions List as requested -->
        <div v-else class="sessions-details-list">
          <div
            v-for="(session, index) in sessionsList"
            :key="session.id || index"
            class="session-detail-item pa-4 mb-3 rounded-lg border-gold-thin"
          >
            <div class="d-flex align-start justify-space-between flex-wrap gap-2">
              <div class="session-text-line">
                <span class="session-number font-weight-black text-accent me-2">{{ index + 1 }}-</span>
                <span class="session-statement text-body-1 font-weight-bold text-white">
                  المنعقدة بيوم
                  <strong class="text-gold px-1 font-weight-black">{{ formatDayName(session.date) }}</strong>
                  الموافق
                  <span class="font-mono text-accent px-1 font-weight-black">({{ formatGregorianAndHijri(session.date, session.date_hijri) }})</span>
                </span>
              </div>

              <!-- Badges / Info (Time, Status, Room) -->
              <div class="d-flex align-center gap-2 flex-wrap text-caption">
                <v-chip
                  v-if="session.time"
                  size="x-small"
                  variant="outlined"
                  color="gold"
                  class="font-mono"
                >
                  <LucideIcon name="clock" :size="12" class="me-1" />
                  {{ session.time }}
                </v-chip>
                <v-chip
                  v-if="session.court_room"
                  size="x-small"
                  variant="outlined"
                  color="white"
                  class="opacity-80"
                >
                  القاعة: {{ session.court_room }}
                </v-chip>
                <v-chip
                  size="x-small"
                  :color="getSessionStatusColor(session.status)"
                  variant="flat"
                  class="font-weight-black text-ebony"
                >
                  {{ session.status || 'منعقدة' }}
                </v-chip>
              </div>
            </div>

            <!-- Optional Result / Notes line if recorded -->
            <div v-if="session.result || session.notes" class="session-notes-box mt-2 pt-2 border-t-gold-faint text-caption text-gold opacity-80">
              <span class="font-weight-black text-accent">القرار / النتيجة:</span>
              <span class="ms-1 text-white opacity-90">{{ session.result || session.notes }}</span>
            </div>
          </div>
        </div>
      </v-card>

      <!-- Print Signature Footer -->
      <PrintSignaturePage />
    </div>
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
const error = ref('')

const reportTitle = computed(() => {
  if (selectedCase.value?.case_number) {
    return `تقرير جلسات القضية رقم: ${selectedCase.value.case_number}`
  }
  return 'تقرير جلسات القضية'
})

const printDate = computed(() => {
  return new Date().toISOString().slice(0, 10)
})

const printDateHijri = computed(() => {
  return convertToHijri(new Date())
})

const formatDayName = (dateStr: string): string => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(d)
}

const formatGregorianAndHijri = (dateStr: string, hijriStr?: string): string => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const gregorianPart = `${dateStr} مـ`
  const hijriPart = (hijriStr && hijriStr.trim()) ? `${hijriStr} هـ` : (!isNaN(d.getTime()) ? `${convertToHijri(d)} هـ` : '')
  return hijriPart ? `${gregorianPart} - ${hijriPart}` : gregorianPart
}

const getSessionStatusColor = (status: string | undefined): string => {
  if (!status) return 'grey'
  if (status.includes('منتهية') || status.includes('تمت')) return 'success'
  if (status.includes('قادمة')) return 'accent'
  if (status.includes('مؤجلة')) return 'warning'
  if (status.includes('ملغاة')) return 'error'
  return 'gold'
}

const loadCases = async (): Promise<void> => {
  loadingCases.value = true
  try {
    const data = await (window as any).api.reports.listCases()
    cases.value = safeArray(data).map((r: any) => ({
      value: String(r.id),
      title: `${r.case_number || r.id} — ${r.client_name || 'بدون موكل'} (${r.court || 'المحكمة'})`
    }))
  } catch (e: any) {
    cases.value = []
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

const printPage = () => {
  window.print()
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

.report-summary-card {
  background: rgba(18, 22, 34, 0.75) !important;
  backdrop-filter: blur(12px);
}

.bg-gold-opacity {
  background: rgba(212, 175, 55, 0.15);
}

.bg-accent-opacity {
  background: rgba(230, 185, 44, 0.2);
}

.border-gold-thin {
  border: 1px solid rgba(212, 175, 55, 0.25);
  background: rgba(255, 255, 255, 0.03);
}

.border-t-gold-faint {
  border-top: 1px dashed rgba(212, 175, 55, 0.2);
}

.session-detail-item {
  transition: all 0.2s ease;
}

.session-detail-item:hover {
  background: rgba(212, 175, 55, 0.06);
  border-color: rgba(212, 175, 55, 0.45);
}

.font-mono {
  font-family: 'Consolas', 'Monaco', monospace;
}

/* Print Specific Optimizations */
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
  .glass-card,
  .report-summary-card,
  .session-detail-item {
    background: #ffffff !important;
    border: 1px solid #ddd !important;
    color: #000000 !important;
    box-shadow: none !important;
  }
  .text-white,
  .session-statement {
    color: #000000 !important;
  }
  .text-gold,
  .text-accent,
  .session-number {
    color: #1a1a1a !important;
  }
  .session-detail-item {
    page-break-inside: avoid;
    border-bottom: 1px solid #ccc !important;
  }
}
</style>
