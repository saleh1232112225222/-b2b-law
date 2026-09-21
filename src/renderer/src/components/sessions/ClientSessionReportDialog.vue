<template>
  <v-dialog
    :model-value="show"
    max-width="880"
    scrollable
    persistent
    :fullscreen="isMobile"
    @update:model-value="$emit('update:show', $event)"
  >
    <v-card class="client-report-dialog-card rounded-xl border-gold border-opacity-30">
      <!-- Modal Header -->
      <v-card-item class="dialog-header pa-4 pa-md-6 border-b border-gold border-opacity-20">
        <div class="d-flex justify-space-between align-center flex-wrap gap-2">
          <div class="d-flex align-center gap-3">
            <div class="report-icon-box pa-2 rounded-lg bg-gold-gradient">
              <LucideIcon name="file-text" :size="24" class="text-ebony" />
            </div>
            <div>
              <div class="text-h6 font-weight-black text-white">
                تقرير جلسة العميل المعتمد
              </div>
              <div class="text-caption font-weight-bold text-slate-300">
                إحاطة الموكل بوقائع الجلسة وقرار الدائرة والخطوة التنفيذية القادمة
              </div>
            </div>
          </div>

          <div class="d-flex align-center gap-2">
            <!-- Dispatch Status Badge -->
            <v-chip
              :color="statusChipColor"
              variant="flat"
              class="font-weight-black px-3"
              size="small"
            >
              <LucideIcon :name="statusChipIcon" :size="14" class="me-1" />
              {{ reportData?.dispatch?.statusLabel || 'مسودة' }}
            </v-chip>

            <v-btn
              icon
              variant="text"
              density="comfortable"
              color="gold"
              @click="$emit('update:show', false)"
            >
              <LucideIcon name="x" :size="20" />
            </v-btn>
          </div>
        </div>
      </v-card-item>
      <v-card-text class="dialog-body pa-4 pa-md-6">
        <div v-if="loading" class="text-center py-10">
          <v-progress-circular indeterminate color="gold" size="48" />
          <div class="text-caption text-gold mt-3 font-weight-bold">
            جاري تجهيز وتجميع بيانات تقرير الجلسة...
          </div>
        </div>

        <div v-else-if="loadError" class="text-center py-8">
          <v-alert type="error" variant="tonal" class="rounded-xl mb-4 border border-error">
            <div class="font-weight-black mb-1">تعذر جلب بيانات التقرير</div>
            <div class="text-caption">{{ loadError }}</div>
          </v-alert>
          <v-btn color="gold" variant="outlined" class="rounded-lg font-weight-bold" @click="loadReport">
            إعادة المحاولة
          </v-btn>
        </div>

        <div v-else-if="reportData" class="d-flex flex-column gap-4">
          <!-- Audit Trail Banner -->
          <div class="audit-trail-card pa-3 rounded-lg border border-gold border-opacity-20">
            <div class="d-flex align-center justify-space-between flex-wrap gap-2 text-caption">
              <div class="d-flex align-center gap-2">
                <LucideIcon name="shield-check" :size="16" class="text-accent" />
                <span class="text-gold font-weight-bold">حالة التوثيق الإداري:</span>
                <span class="font-weight-black">{{ reportData.dispatch.statusLabel }}</span>
              </div>
              <div v-if="reportData.dispatch.sentAt" class="text-accent font-weight-bold">
                تاريخ الإرسال: {{ reportData.dispatch.sentAt }}
                <span v-if="reportData.dispatch.sentViaLabel">({{ reportData.dispatch.sentViaLabel }})</span>
              </div>
              <div v-else-if="reportData.dispatch.approvedAt" class="text-success font-weight-bold">
                تم الاعتماد بتاريخ: {{ reportData.dispatch.approvedAt }}
              </div>
              <div v-else class="text-gold opacity-70 font-weight-bold">
                جاهز للمراجعة والاعتماد
              </div>
            </div>
          </div>

          <!-- Section 1: Auto-Assembled Case & Session Context -->
          <div class="context-card pa-4 rounded-xl border border-gold border-opacity-20">
            <div class="d-flex align-center justify-space-between mb-3">
              <span class="text-subtitle-2 font-weight-black text-gold">
                <LucideIcon name="briefcase" :size="16" class="me-1" />
                بيانات الدعوى والجلسة المنعقدة
              </span>
              <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold">
                الجلسة رقم ({{ reportData.sessionInfo.sessionNumber }})
              </v-chip>
            </div>

            <v-row dense class="text-caption">
              <v-col cols="12" sm="6" md="4">
                <div class="text-gold opacity-70 font-weight-bold">رقم القضية:</div>
                <div class="font-weight-black">{{ reportData.caseInfo.caseNumber }}</div>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <div class="text-gold opacity-70 font-weight-bold">المحكمة والدائرة:</div>
                <div class="font-weight-black">
                  {{ reportData.caseInfo.court }} / {{ reportData.caseInfo.circuit }}
                </div>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <div class="text-gold opacity-70 font-weight-bold">الموكل:</div>
                <div class="font-weight-black">
                  {{ reportData.clientName }} ({{ reportData.caseInfo.clientRole }})
                </div>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <div class="text-gold opacity-70 font-weight-bold">تاريخ الجلسة:</div>
                <div class="font-weight-black">
                  {{ reportData.sessionInfo.sessionDate }}
                  <span v-if="reportData.sessionInfo.sessionDateHijri">({{ reportData.sessionInfo.sessionDateHijri }})</span>
                </div>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <div class="text-gold opacity-70 font-weight-bold">وقت الجلسة والقاعة:</div>
                <div class="font-weight-black">
                  {{ reportData.sessionInfo.sessionTime }} | قاعة: {{ reportData.sessionInfo.courtRoom }}
                </div>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <div class="text-gold opacity-70 font-weight-bold">قرار النتيجة الصادر:</div>
                <div class="font-weight-black text-accent">
                  {{ reportData.sessionInfo.result }}
                </div>
              </v-col>
            </v-row>

            <div
              v-if="reportData.sessionInfo.isPostponed"
              class="mt-3 pt-2 border-t border-gold border-opacity-10 d-flex align-center gap-2"
            >
              <v-chip size="x-small" color="warning" variant="flat" class="font-weight-bold">
                تأجيل معتمد
              </v-chip>
              <span class="text-caption font-weight-bold text-gold">سبب التأجيل:</span>
              <span class="text-caption font-weight-black">
                {{ reportData.sessionInfo.postponementReason }}
              </span>
            </div>
          </div>

          <!-- Section 2: Next Session & Required Actions (if available) -->
          <div
            v-if="reportData.nextSessionInfo"
            class="next-session-card pa-4 rounded-xl border border-gold border-opacity-20"
          >
            <div class="text-subtitle-2 font-weight-black text-gold mb-2 d-flex align-center gap-1">
              <LucideIcon name="calendar-clock" :size="16" class="text-accent" />
              الجلسة القادمة والتكليفات الإجرائية
            </div>
            <v-row dense class="text-caption">
              <v-col cols="12" sm="6">
                <div class="text-gold opacity-70 font-weight-bold">تاريخ الجلسة القادمة:</div>
                <div class="font-weight-black">
                  {{ reportData.nextSessionInfo.date }}
                  <span v-if="reportData.nextSessionInfo.dateHijri">({{ reportData.nextSessionInfo.dateHijri }})</span>
                  <span v-if="reportData.nextSessionInfo.time"> | الساعة {{ reportData.nextSessionInfo.time }}</span>
                </div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="text-gold opacity-70 font-weight-bold">الطرف المكلف بالإجراء:</div>
                <div class="font-weight-black">
                  {{ reportData.nextSessionInfo.assignedParty || 'مكتب المحاماة' }}
                </div>
              </v-col>
              <v-col cols="12">
                <div class="text-gold opacity-70 font-weight-bold">المطلوب إنجازه:</div>
                <div class="font-weight-black text-accent">
                  {{ reportData.nextSessionInfo.actionRequired || 'متابعة سير الجلسة' }}
                </div>
              </v-col>
            </v-row>
          </div>

          <!-- Strict Separation Notice -->
          <v-alert
            type="info"
            variant="tonal"
            color="gold"
            density="compact"
            class="rounded-lg border-dashed py-2"
          >
            <template #prepend>
              <LucideIcon name="lock" :size="18" class="text-gold me-2" />
            </template>
            <div class="text-caption font-weight-bold">
              <strong>ضمان السرية المهنية:</strong> التقييم الداخلي ونقاط الضعف وسجلات المرافعة الداخلية محجوبة تلقائياً؛ ما يظهر للعميل حصراً هو ملخص الوقائع والخطوة التنفيذية المعتمدة أدناه.
            </div>
          </v-alert>

          <!-- Section 3: Editable Fields for the Lawyer -->
          <div class="lawyer-inputs-card pa-4 rounded-xl border border-gold border-opacity-30">
            <div class="text-subtitle-2 font-weight-black text-gold mb-3 d-flex align-center gap-1">
              <LucideIcon name="edit-3" :size="16" class="text-accent" />
              صياغة المحامي الموجهة للموكل (الحقلان المعتمدان قبل الإرسال)
            </div>

            <!-- Field 1: Client Summary -->
            <div class="mb-4">
              <label class="d-block mb-1 font-weight-black text-gold text-caption">
                ١- ملخص الجلسة للعميل (شرح ما دار في الجلسة بوضوح للموكل):
              </label>
              <v-textarea
                v-model="editForm.clientSummary"
                rows="3"
                variant="outlined"
                density="comfortable"
                class="glass-input rounded-xl text-body-2"
                placeholder="اكتب ملخص الجلسة الموجه للموكل هنا..."
                hide-details
              />
            </div>

            <!-- Field 2: Lawyer Note and Next Step -->
            <div class="mb-2">
              <label class="d-block mb-1 font-weight-black text-gold text-caption">
                ٢- توجيه المحامي والخطوة التنفيذية القادمة:
              </label>
              <v-textarea
                v-model="editForm.lawyerNoteAndNextStep"
                rows="3"
                variant="outlined"
                density="comfortable"
                class="glass-input rounded-xl text-body-2"
                placeholder="اكتب توجيه المحامي والمطلوب من الموكل والخطوة القادمة..."
                hide-details
              />
            </div>

            <!-- Optional Internal Notes (Confidential) -->
            <v-expansion-panels variant="accordion" class="mt-3">
              <v-expansion-panel class="bg-transparent border border-gold border-opacity-10 rounded-lg">
                <v-expansion-panel-title class="pa-2 text-caption font-weight-bold text-gold opacity-80">
                  <LucideIcon name="eye-off" :size="16" class="me-2 text-muted" />
                  ملاحظات داخلية للمكتب فقط (سرية ولا تظهر للموكل إطلاقاً)
                </v-expansion-panel-title>
                <v-expansion-panel-text class="pa-2">
                  <v-textarea
                    v-model="editForm.internalNotes"
                    rows="2"
                    variant="outlined"
                    density="compact"
                    class="glass-input rounded-lg text-caption"
                    placeholder="نقاط ضعف، تقييم الخبير، ملاحظات للمحامي المسؤول (محجوبة عن العميل)..."
                    hide-details
                  />
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </div>
        </div>
      </v-card-text>

      <v-divider class="border-gold border-opacity-20" />

      <!-- Action Footer -->
      <v-card-actions class="dialog-footer pa-4 pa-md-6 d-flex flex-wrap justify-space-between align-center gap-2">
        <div class="d-flex align-center gap-2 flex-wrap">
          <!-- Save Edits Button -->
          <v-btn
            variant="outlined"
            color="gold"
            height="42"
            class="rounded-lg font-weight-bold px-4"
            :loading="saving"
            :disabled="!canSend"
            @click="saveEdits"
          >
            <LucideIcon name="save" :size="16" class="me-1" />
            حفظ التعديلات
          </v-btn>

          <!-- Review Button (draft -> reviewed) -->
          <v-btn
            v-if="reportData?.dispatch?.status === 'draft'"
            variant="tonal"
            color="primary"
            height="42"
            class="rounded-lg font-weight-bold px-4"
            :loading="transitioning"
            @click="transitionTo('reviewed')"
          >
            <LucideIcon name="check" :size="16" class="me-1" />
            تمت المراجعة
          </v-btn>

          <!-- Approve Button (reviewed/draft -> approved) -->
          <v-btn
            v-if="reportData?.dispatch?.status !== 'approved' && reportData?.dispatch?.status !== 'sent'"
            variant="flat"
            color="accent"
            height="42"
            class="rounded-lg font-weight-black text-ebony px-4"
            :loading="transitioning"
            @click="transitionTo('approved')"
          >
            <LucideIcon name="check-circle" :size="16" class="me-1" />
            اعتماد التقرير
          </v-btn>
        </div>

        <div class="d-flex align-center gap-2 flex-wrap">
          <!-- Print / PDF Button -->
          <v-btn
            variant="tonal"
            color="white"
            height="42"
            class="rounded-lg font-weight-bold px-4"
            :loading="printing"
            :disabled="!canSend"
            @click="printReport"
          >
            <LucideIcon name="printer" :size="16" class="me-1" />
            طباعة رسمية A4
          </v-btn>

          <!-- Send via WhatsApp Menu / Button -->
          <v-btn
            variant="flat"
            color="success"
            height="42"
            class="rounded-lg font-weight-black text-white px-4"
            :disabled="!canSend"
            @click="sendViaWhatsapp"
          >
            <LucideIcon name="share-2" :size="16" class="me-1" />
            إرسال للموكل عبر واتساب
          </v-btn>

          <!-- Record Manual Send -->
          <v-btn
            v-if="reportData?.dispatch?.status !== 'sent'"
            variant="text"
            color="gold"
            size="small"
            class="text-caption font-weight-bold"
            @click="markSentManual"
          >
            توثيق التسليم يدوياً
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import api from '../../api/ApiAdapter'
import LucideIcon from '../common/LucideIcon.vue'
import type { ClientSessionReportData } from '../../../../shared/ClientSessionReportDesktopService'

const props = defineProps<{
  show: boolean
  sessionId: string
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'updated'): void
}>()

const isMobile = computed(() => typeof window !== 'undefined' && window.innerWidth <= 768)

const loading = ref(false)
const loadError = ref('')
const saving = ref(false)
const transitioning = ref(false)
const printing = ref(false)
const reportData = ref<ClientSessionReportData | null>(null)

const editForm = ref({
  clientSummary: '',
  lawyerNoteAndNextStep: '',
  internalNotes: ''
})

const statusChipColor = computed(() => {
  const s = reportData.value?.dispatch?.status
  if (s === 'sent') return 'success'
  if (s === 'approved') return 'accent'
  if (s === 'reviewed') return 'primary'
  return 'gold'
})

const statusChipIcon = computed(() => {
  const s = reportData.value?.dispatch?.status
  if (s === 'sent') return 'check-check'
  if (s === 'approved') return 'check-circle'
  if (s === 'reviewed') return 'check'
  return 'file-edit'
})

const canSend = computed(() => {
  return reportData.value !== null
})

watch(
  [() => props.show, () => props.sessionId],
  ([show, sid]) => {
    if (show && sid) {
      loadReport()
    }
  },
  { immediate: true }
)

async function loadReport() {
  if (!props.sessionId) return
  loading.value = true
  loadError.value = ''
  try {
    const res = await (api as any).sessionOutcome.getClientReport(props.sessionId)
    const data = res?.data || res
    if (!data || typeof data !== 'object') {
      throw new Error('لم يتم استرجاع بيانات التقرير لهذه الجلسة')
    }
    reportData.value = data
    editForm.value.clientSummary = data.lawyerEdits?.clientSummary || ''
    editForm.value.lawyerNoteAndNextStep = data.lawyerEdits?.lawyerNoteAndNextStep || ''
    editForm.value.internalNotes = data.internalOnlyData?.internalNotes || ''
  } catch (err: any) {
    console.error('Failed to load client session report:', err)
    loadError.value = err?.message || 'تعذر تحميل بيانات تقرير الجلسة'
  } finally {
    loading.value = false
  }
}

async function saveEdits() {
  if (!props.sessionId) return
  saving.value = true
  try {
    const res = await (api as any).sessionOutcome.updateClientReport(props.sessionId, {
      clientSummary: editForm.value.clientSummary,
      lawyerNoteAndNextStep: editForm.value.lawyerNoteAndNextStep,
      internalNotes: editForm.value.internalNotes,
      caseId: reportData.value?.caseId,
      clientId: reportData.value?.clientId
    })
    const data = res?.data || res
    reportData.value = data
    emit('updated')
  } catch (err) {
    console.error('Failed to save report edits:', err)
  } finally {
    saving.value = false
  }
}

async function transitionTo(toStatus: 'draft' | 'reviewed' | 'approved' | 'sent', sentVia?: string) {
  if (!props.sessionId) return
  transitioning.value = true
  try {
    // Save edits first if modified
    await (api as any).sessionOutcome.updateClientReport(props.sessionId, {
      clientSummary: editForm.value.clientSummary,
      lawyerNoteAndNextStep: editForm.value.lawyerNoteAndNextStep,
      internalNotes: editForm.value.internalNotes,
      caseId: reportData.value?.caseId,
      clientId: reportData.value?.clientId
    })

    const res = await (api as any).sessionOutcome.transitionClientReport(props.sessionId, toStatus, sentVia)
    const data = res?.data || res
    reportData.value = data
    emit('updated')
  } catch (err) {
    console.error('Failed to transition report status:', err)
  } finally {
    transitioning.value = false
  }
}

async function printReport() {
  if (!props.sessionId) return
  printing.value = true
  try {
    const html = await (api as any).sessionOutcome.getClientReportHtml(props.sessionId)
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 300)
    }
  } catch (err) {
    console.error('Failed to print client session report:', err)
  } finally {
    printing.value = false
  }
}

async function sendViaWhatsapp() {
  if (!reportData.value) return
  const d = reportData.value

  const lines = [
    `السلام عليكم ورحمة الله وبركاته،`,
    `المكرم / ${d.clientName} المحترم،`,
    ``,
    `نفيدكم بوقائع ونتيجة جلسة القضية رقم: (${d.caseInfo.caseNumber})`,
    `لدى: ${d.caseInfo.court} - ${d.caseInfo.circuit}`,
    `تاريخ الجلسة: ${d.sessionInfo.sessionDate}`,
    `قرار النتيجة الصادر: ${d.sessionInfo.result}`,
    d.sessionInfo.isPostponed ? `سبب التأجيل: ${d.sessionInfo.postponementReason}` : '',
    ``,
    `📌 إيضاح مجريات الجلسة:`,
    editForm.value.clientSummary,
    ``,
    d.nextSessionInfo ? `📅 موعد الجلسة القادمة: ${d.nextSessionInfo.date} ${d.nextSessionInfo.time ? `الساعة ${d.nextSessionInfo.time}` : ''}` : '',
    d.nextSessionInfo?.actionRequired ? `المطلوب: ${d.nextSessionInfo.actionRequired}` : '',
    ``,
    `⚖️ توجيه المحامي والخطوة القادمة:`,
    editForm.value.lawyerNoteAndNextStep,
    ``,
    `شاكرين لكم ثقتكم الكريمة،`,
    `${d.caseInfo.responsibleLawyer || 'مكتب المحاماة'}`
  ].filter(Boolean)

  const text = encodeURIComponent(lines.join('\n'))
  let phone = String(d.clientPhone || '').replace(/\D/g, '')
  if (phone.startsWith('05')) {
    phone = '966' + phone.slice(1)
  }

  const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`
  window.open(url, '_blank')

  // Automatically record as sent via WhatsApp
  await transitionTo('sent', 'whatsapp')
}

async function markSentManual() {
  await transitionTo('sent', 'manual_print')
}
</script>

<style scoped>
.client-report-dialog-card {
  background: #0f172a !important;
  color: #ffffff !important;
}
.bg-gold-gradient {
  background: linear-gradient(135deg, #b89758 0%, #d4af37 100%) !important;
}
.text-ebony {
  color: #0b0f19 !important;
}
.text-gold {
  color: #f0c33a !important;
}
.text-accent {
  color: #d4af37 !important;
}
.text-slate-300 {
  color: #cbd5e1 !important;
}
.border-gold {
  border-color: #b89758 !important;
}
.audit-trail-card {
  background: rgba(184, 151, 88, 0.08) !important;
}
.context-card,
.next-session-card {
  background: rgba(30, 41, 59, 0.7) !important;
}
.lawyer-inputs-card {
  background: rgba(30, 41, 59, 0.9) !important;
}
.glass-input :deep(.v-field) {
  background: rgba(15, 23, 42, 0.6) !important;
  border-color: rgba(184, 151, 88, 0.3) !important;
}
.glass-input :deep(textarea),
.glass-input :deep(input) {
  color: #ffffff !important;
}
</style>
