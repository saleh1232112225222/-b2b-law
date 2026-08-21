<template>
  <v-container fluid class="pa-6 pb-12 rtl report-page">
    <!-- Print Frame Header (Visible only when printing) -->
    <PrintReportFrame title="تقرير قضايا المحكمة التفصيلي" />

    <!-- Screen Header (Hidden when printing) -->
    <v-row dense class="mb-8 align-center no-print">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="landmark" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">تقرير قضايا المحكمة</h1>
            <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
              استعراض وطباعة القضايا المنظورة في محكمة معينة مع الجلسة القادمة وإضافة الملاحظات
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

    <!-- Filters Section (Hidden when printing) -->
    <v-card
      elevation="0"
      class="glass-card pa-8 border-gold border-opacity-20 border-2 overflow-hidden mb-8 no-print glass-card"
    >
      <v-row dense class="align-center">
        <v-col cols="12" md="6">
          <v-autocomplete
            v-model="selectedCourt"
            :items="courtTypes"
            label="اختر المحكمة من القائمة"
            variant="outlined"
            class="glass-input"
            hide-details
            clearable
            :menu-props="{ maxHeight: 300, zIndex: 9999 }"
          >
            <template #prepend-inner>
              <LucideIcon name="landmark" :size="20" class="text-gold me-2" />
            </template>
          </v-autocomplete>
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field
            v-model="fromDate"
            label="من تاريخ القيد"
            type="date"
            variant="outlined"
            class="glass-input"
            hide-details
            clearable
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field
            v-model="toDate"
            label="إلى تاريخ القيد"
            type="date"
            variant="outlined"
            class="glass-input"
            hide-details
            clearable
          />
        </v-col>
        <v-col cols="12" class="report-actions d-flex justify-end gap-3 mt-6">
          <v-btn
            color="accent"
            variant="flat"
            width="160"
            height="56"
            class="rounded-xl font-weight-black premium-lift text-ebony premium-btn-gold-gradient"
            :loading="loading"
            @click="loadReport"
          >
            <LucideIcon name="refresh-cw" :size="18" class="me-2" /> توليد التقرير
          </v-btn>

          <v-divider vertical class="report-actions-divider mx-2 border-gold opacity-10" />

          <v-btn
            variant="tonal"
            color="white"
            height="56"
            class="rounded-xl px-6 font-weight-black premium-hover premium-btn-gold-gradient"
            :disabled="loading || reportCases.length === 0"
            @click="printReport"
          >
            <LucideIcon name="printer" :size="20" class="me-2 text-gold" /> طباعة التقرير
          </v-btn>

          <v-btn
            variant="tonal"
            color="white"
            height="56"
            class="rounded-xl px-6 font-weight-black premium-hover premium-btn-gold-gradient"
            :loading="loading"
            :disabled="loading || reportCases.length === 0"
            @click="showExportDialog = true"
          >
            <LucideIcon name="hard-drive-download" :size="20" class="me-2 text-gold" /> تصدير وحفظ
            التقرير
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <!-- Statistics KPI Section (Hidden when printing) -->
    <v-row v-if="reportCases.length > 0" class="mb-6 no-print" dense>
      <v-col cols="12" sm="4">
        <div
          class="glass-card pa-4 rounded-xl border border-gold border-opacity-10 d-flex align-center"
        >
          <div class="pa-3 rounded-lg bg-gold bg-opacity-10 text-gold me-4">
            <LucideIcon name="landmark" :size="24" class="text-accent" />
          </div>
          <div>
            <div class="text-caption text-gold opacity-60 font-weight-black">
              إجمالي القضايا بالتقرير
            </div>
            <div class="text-h6 font-weight-black text-white">{{ reportCases.length }}</div>
          </div>
        </div>
      </v-col>
      <v-col cols="12" sm="4">
        <div
          class="glass-card pa-4 rounded-xl border border-gold border-opacity-10 d-flex align-center"
        >
          <div class="pa-3 rounded-lg bg-gold bg-opacity-10 text-gold me-4">
            <LucideIcon name="file-text" :size="24" class="text-accent" />
          </div>
          <div>
            <div class="text-caption text-gold opacity-60 font-weight-black">
              ملاحظات مضافة للتقرير
            </div>
            <div class="text-h6 font-weight-black text-white">
              {{ Object.values(notes).filter(Boolean).length }}
            </div>
          </div>
        </div>
      </v-col>
      <v-col cols="12" sm="4">
        <div
          class="glass-card pa-4 rounded-xl border border-gold border-opacity-10 d-flex align-center"
        >
          <div class="pa-3 rounded-lg bg-gold bg-opacity-10 text-gold me-4">
            <LucideIcon name="edit-3" :size="24" class="text-accent" />
          </div>
          <div>
            <div class="text-caption text-gold opacity-60 font-weight-black">
              مربعات كتابة يدوية (فارغة)
            </div>
            <div class="text-h6 font-weight-black text-white">
              {{ reportCases.length - Object.values(notes).filter(Boolean).length }}
            </div>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Error Alert -->
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

    <!-- Date Range Context (Printed and Screen) -->
    <div
      v-if="reportCases.length > 0 && (fromDate || toDate || selectedCourt)"
      class="mb-6 d-flex align-center glass-panel-light pa-4 rounded-xl border border-gold border-opacity-10 print-context"
    >
      <LucideIcon name="calendar" :size="20" class="me-3 text-gold no-print" />
      <div class="text-subtitle-1 font-weight-black text-accent print-text-black">
        <span v-if="selectedCourt" class="me-4">المحكمة: {{ selectedCourt }}</span>
        <span>نطاق القيد: من {{ fromDate || 'البداية' }} حتى {{ toDate || 'الآن' }}</span>
      </div>
    </div>

    <!-- Table Section -->
    <v-card
      v-if="reportCases.length > 0"
      elevation="0"
      class="glass-card border border-gold border-opacity-10 rounded-xl overflow-hidden mb-8 print-table-card"
    >
      <v-table density="comfortable" class="premium-table">
        <thead>
          <tr>
            <th
              class="text-right text-gold font-weight-black print-header-cell"
              style="width: 60px"
            >
              #
            </th>
            <th
              class="text-right text-gold font-weight-black print-header-cell"
              style="width: 150px"
            >
              رقم القضية
            </th>
            <th
              class="text-right text-gold font-weight-black print-header-cell"
              style="width: 200px"
            >
              اسم الموكل
            </th>
            <th
              class="text-right text-gold font-weight-black print-header-cell"
              style="width: 150px"
            >
              الدائرة
            </th>
            <th
              class="text-right text-gold font-weight-black print-header-cell"
              style="width: 250px"
            >
              الجلسة القادمة
            </th>
            <th class="text-right text-gold font-weight-black print-header-cell notes-header">
              ملاحظات
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in reportCases" :key="item.id" class="premium-hover-row print-row">
            <td class="text-caption font-weight-black text-accent print-cell-text">
              {{ idx + 1 }}
            </td>
            <td class="font-weight-black text-white print-cell-text">{{ item.case_number }}</td>
            <td class="text-caption text-white opacity-80 print-cell-text">
              {{ item.client_name }}
            </td>
            <td class="text-caption text-white opacity-80 print-cell-text">{{ item.circuit }}</td>
            <td class="text-caption text-gold opacity-60 print-cell-text">
              {{ item.next_session }}
            </td>
            <td class="notes-column">
              <!-- On Screen Input -->
              <v-textarea
                v-model="notes[item.id]"
                placeholder="اكتب ملاحظة ليتم طباعتها أو اتركها فارغة للكتابة اليدوية بعد الطباعة..."
                variant="outlined"
                rows="1"
                auto-grow
                density="compact"
                hide-details
                class="no-print notes-input glass-input"
              />
              <!-- On Print Box -->
              <div class="print-notes-box">
                {{ notes[item.id] || ' ' }}
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Empty State -->
    <div v-else-if="!loading" class="mt-12 text-center no-print">
      <div
        class="glass-card pa-12 rounded-xl d-inline-block border-gold border-opacity-10 border-2"
      >
        <LucideIcon name="file-search-2" :size="80" class="text-gold opacity-20 mb-6 mx-auto" />
        <h2 class="text-h5 font-weight-black text-gold mb-2">بانتظار المعايير</h2>
        <p class="text-subtitle-1 text-gold opacity-60 font-weight-bold">
          يرجى اختيار المحكمة أو تحديد التواريخ، ثم اضغط على "توليد التقرير" لاستعراض قضايا المحكمة.
        </p>
      </div>
    </div>

    <!-- Skeleton Loader -->
    <div v-if="loading" class="mt-6 no-print">
      <v-skeleton-loader
        v-for="i in 3"
        :key="i"
        type="card"
        class="mb-6 rounded-xl glass-card border-gold border-opacity-10"
        color="transparent"
      />
    </div>

    <!-- Print Signature Section -->
    <PrintSignaturePage />

    <ExportReportDialog
      v-model="showExportDialog"
      report-title="تقرير قضايا المحكمة"
      default-filename="تقرير_قضايا_المحكمة"
      report-type="court-cases"
      :rows-data="reportCases"
      :export-params="{
        court: selectedCourt || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        notes: notes
      }"
    />
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { COURT_TYPES } from '../utils/legalConstants'
import { safeArray } from '../utils/safe'
import { convertToHijri } from '../utils/hijri'
import PrintReportFrame from '../components/common/PrintReportFrame.vue'
import PrintSignaturePage from '../components/common/PrintSignaturePage.vue'
import LucideIcon from '../components/common/LucideIcon.vue'
import ExportReportDialog from '../components/common/ExportReportDialog.vue'

const showExportDialog = ref(false)
const selectedCourt = ref<string | null>(null)
const fromDate = ref('')
const toDate = ref('')
const loading = ref(false)
const error = ref('')
const reportCases = ref<any[]>([])
const notes = ref<Record<string, string>>({})

const courtTypes = COURT_TYPES

const loadReport = async () => {
  loading.value = true
  error.value = ''
  try {
    const [allCases, allClients, allSessions] = await Promise.all([
      window.api.cases.getAll(),
      window.api.clients.getAll(),
      window.api.sessions.getAll()
    ])

    const todayStr = new Date().toISOString().split('T')[0]

    // 1. Filter cases
    let filteredCases = safeArray(allCases)

    if (selectedCourt.value) {
      filteredCases = filteredCases.filter(
        (c) => String(c.court || '').trim() === String(selectedCourt.value).trim()
      )
    }

    if (fromDate.value) {
      filteredCases = filteredCases.filter(
        (c) => c.registration_date && c.registration_date >= fromDate.value
      )
    }

    if (toDate.value) {
      filteredCases = filteredCases.filter(
        (c) => c.registration_date && c.registration_date <= toDate.value
      )
    }

    // 2. Map cases to include client name and next session
    const mapped = filteredCases.map((c) => {
      // Find client name
      const client = safeArray(allClients).find((cl) => String(cl.id) === String(c.client_id))
      const clientName = client?.name || c.opponent_name || 'غير محدد'

      // Find next session
      const caseSessions = safeArray(allSessions).filter(
        (s) =>
          String(s.case_id) === String(c.id) && s.date && s.date >= todayStr && s.status !== 'ملغاة'
      )
      // Sort sessions by date and time
      caseSessions.sort((a, b) => {
        const dateCompare = String(a.date).localeCompare(String(b.date))
        if (dateCompare !== 0) return dateCompare
        return String(a.time || '').localeCompare(String(b.time || ''))
      })
      const nextSession = caseSessions[0]
      let nextSessionText = 'لا يوجد'
      if (nextSession) {
        let hijriText = ''
        if (nextSession.date_hijri) {
          hijriText = nextSession.date_hijri
        } else {
          try {
            const [y, m, d] = nextSession.date.split('-').map(Number)
            hijriText = convertToHijri(new Date(y, m - 1, d))
          } catch {}
        }
        nextSessionText = `${nextSession.date} م`
        if (hijriText) {
          nextSessionText += ` / ${hijriText} هـ`
        }
        if (nextSession.time) {
          nextSessionText += ` الساعة ${nextSession.time}`
        }
      }

      return {
        id: c.id,
        case_number: c.case_number,
        subject: c.subject,
        client_name: clientName,
        circuit: c.circuit || 'غير محدد',
        court: c.court || 'غير محدد',
        next_session: nextSessionText,
        _next_session_date: nextSession ? nextSession.date : '9999-12-31',
        _next_session_time: nextSession ? nextSession.time || '23:59' : '23:59',
        _registration_date: c.registration_date || ''
      }
    })

    // Sort cases by next session date ascending (closest to farthest)
    mapped.sort((a, b) => {
      const dateA = a._next_session_date
      const dateB = b._next_session_date
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB)
      }
      const timeA = a._next_session_time
      const timeB = b._next_session_time
      if (timeA !== timeB) {
        return timeA.localeCompare(timeB)
      }
      const regA = a._registration_date
      const regB = b._registration_date
      return regB.localeCompare(regA)
    })

    reportCases.value = mapped
  } catch (e) {
    console.error('Failed to load report data:', e)
    error.value = 'حدث خطأ أثناء تحميل بيانات التقرير: ' + (e as Error).message
  } finally {
    loading.value = false
  }
}

const printReport = () => {
  window.print()
}

const exportPdf = async (): Promise<void> => {
  if (reportCases.value.length === 0) return
  loading.value = true
  error.value = ''
  try {
    const notesToExport: Record<string, string> = {}
    reportCases.value.forEach((c) => {
      if (notes.value[c.id]) {
        notesToExport[c.id] = notes.value[c.id]
      }
    })

    await (window as any).api.reports.exportPdf({
      type: 'court-cases',
      params: {
        court: selectedCourt.value || undefined,
        from: fromDate.value || undefined,
        to: toDate.value || undefined,
        notes: notesToExport
      }
    })
  } catch (e: unknown) {
    console.error('Failed to export PDF:', e)
    error.value = 'حدث خطأ أثناء تصدير ملف الـ PDF: ' + ((e as Error).message || String(e))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // Option: load all data initially with no filters if they click directly,
  // but let them load intentionally to prevent long initial loads.
})
</script>

<style scoped>
.rtl {
  direction: rtl;
}

.notes-column {
  min-width: 250px;
  position: relative;
  vertical-align: middle;
}

.notes-input :deep(.v-field__input) {
  font-size: 0.9rem !important;
}

.print-notes-box {
  display: none;
}

.gap-3 {
  gap: 0.75rem;
}

@media print {
  .no-print {
    display: none !important;
  }

  .print-text-black {
    color: #000000 !important;
    font-size: 11pt !important;
  }

  .print-context {
    border: 1px solid #000000 !important;
    background: transparent !important;
    padding: 4mm !important;
    margin-bottom: 6mm !important;
  }

  .print-table-card {
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
  }

  .print-header-cell {
    color: #000000 !important;
    font-weight: bold !important;
    border-bottom: 2px solid #000000 !important;
    font-size: 10pt !important;
    background: #f5f5f5 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-cell-text {
    color: #000000 !important;
    opacity: 1 !important;
    font-size: 9.5pt !important;
    border-bottom: 1px solid #e0e0e0 !important;
  }

  .print-row {
    background: transparent !important;
  }

  .print-notes-box {
    display: block !important;
    min-height: 50px;
    border: 1px dashed #777777 !important;
    padding: 6px;
    font-size: 9pt;
    color: #000000 !important;
    white-space: pre-wrap;
    background: transparent !important;
    box-sizing: border-box;
  }

  .notes-header {
    width: 250px !important;
  }
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

@media (max-width: 600px) {
  .report-page {
    padding-inline: 12px !important;
  }

  .report-page > :deep(.v-card.pa-8) {
    padding: 14px !important;
  }

  .report-actions {
    align-items: stretch !important;
    flex-direction: column !important;
  }

  .report-actions :deep(.v-btn) {
    width: 100% !important;
    max-width: 100% !important;
    margin-inline: 0 !important;
  }

  .report-actions-divider {
    display: none !important;
  }
}
</style>
