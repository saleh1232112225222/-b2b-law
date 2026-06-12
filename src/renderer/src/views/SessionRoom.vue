<template>
  <v-container fluid class="pa-4 bg-noir-surface session-room" style="min-height: calc(100vh - 8px); overflow-y: auto">
    <SessionRoomHeader :is-new-window="isNewWindow" :has-active-session="!!activeSession" @open-new-window="openInNewWindow" @go-back="goBack" @open-picker="pickerDialog = true" @open-outcome="openOutcomeModal" />

    <CaseInfoHeaderCard :header="header" :has-client="!!caseItem?.client_id" @show-poa="showPoaPreview" @go-to-client="goToClient" @copy="copy" @open-external="openExternal" />

    <CaseSidePanels :docs="docs" :case-sessions="caseSessions" :memos="memos" :judgments="judgments" :case-item="caseItem" :selected="selected" @select-text="selectText" @select-pdf="selectPdf" @select-session-text="selectSessionText" @judgment-click="(j) => selectText('الحكم', j.judgment_type || j.type || 'حكم', judgmentText(j))" @copy="copy" @open-external="openExternal" />

    <v-row dense style="height: calc(72vh - 126px)">
      <ContentViewer :selected="selected" :pdf-src="pdfSrc" @copy="copy" @open-file="openFile" />

      <NotepadPanel v-model:note="note" :active-session-id="activeSession?.id || null" @save="saveNote" @clear="note = ''" @copy="copy" />
    </v-row>

    <SessionPickerDialog v-model:show="pickerDialog" :pick-options="pickOptions" @choose="chooseSession" />

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" rounded="pill" elevation="12">
      <div class="d-flex align-center">
        <LucideIcon :name="snackbar.color === 'success' ? 'check-circle' : 'alert-circle'" :size="20" class="me-2" />
        <span class="font-weight-black">{{ snackbar.text }}</span>
      </div>
    </v-snackbar>

    <PremiumModal v-model="outcomeModal.show" title="رصد نتيجة الجلسة الإجرائية" subtitle="سيتم تحديث حالة القضية بناءً على النتيجة المدخلة فوراً" icon="gavel" save-label="تثبيت النتيجة الآن" :loading="outcomeModal.loading" @save="submitOutcome">
      <v-row dense>
        <v-col cols="12">
          <v-label class="mb-3 font-weight-black text-primary d-flex align-center">
            <LucideIcon name="help-circle" :size="18" class="me-2" /> ما هي نتيجة الجلسة النهائية؟
          </v-label>
          <v-select v-model="outcomeModal.result" :items="SESSION_OUTCOMES" variant="outlined" placeholder="اختر النتيجة من القائمة..." density="comfortable" class="rounded-xl premium-select" hide-details />
        </v-col>
        <v-col v-if="outcomeModal.result === 'شطب الدعوى / انقطاع'" cols="12" class="mt-4">
          <v-label class="mb-3 font-weight-black text-primary d-flex align-center">
            <LucideIcon name="alert-triangle" :size="18" class="me-2" /> قرار الشطب / الانقطاع
          </v-label>
          <v-select v-model="outcomeModal.dismissalDecision" :items="['إعادة القيد', 'إغلاق نهائي']" variant="outlined" density="comfortable" class="rounded-xl premium-select" hide-details />
        </v-col>
        <v-col v-if="outcomeModal.result === 'تبليغ / إجراء إداري'" cols="12" class="mt-4">
          <v-label class="mb-3 font-weight-black text-primary d-flex align-center">
            <LucideIcon name="calendar" :size="18" class="me-2" /> بيانات التبليغ
          </v-label>
          <v-text-field v-model="outcomeModal.serviceDate" type="date" variant="outlined" density="comfortable" class="rounded-xl premium-select" hide-details />
        </v-col>
        <v-col v-if="outcomeModal.result === 'صدور حكم ابتدائي' || outcomeModal.result === 'صدور حكم قطعي'" cols="12" class="mt-4">
          <v-label class="mb-3 font-weight-black text-primary d-flex align-center">
            <LucideIcon name="file-text" :size="18" class="me-2" /> بيانات الحكم القضائي
          </v-label>
          <v-text-field v-model="outcomeModal.judgmentNumber" label="رقم الحكم" variant="outlined" density="comfortable" class="rounded-xl premium-select" hide-details />
        </v-col>
        <v-col cols="12" class="mt-4">
          <v-label class="mb-3 font-weight-black text-primary d-flex align-center">
            <LucideIcon name="message-square" :size="18" class="me-2" /> {{ outcomeModal.result === 'أخرى' ? 'سبب النتيجة (مطلوب)' : 'ملاحظات إضافية (اختياري)' }}
          </v-label>
          <v-textarea v-model="outcomeModal.notes" rows="3" variant="outlined" :placeholder="outcomeModal.result === 'أخرى' ? 'اكتب سبب النتيجة...' : 'اكتب أي ملاحظات فنية أو إجرائية هنا...'" class="rounded-xl premium-select" hide-details />
        </v-col>
      </v-row>
    </PremiumModal>

    <ConfirmDialog v-model="confirmDialog.show" :title="confirmDialog.title" :message="confirmDialog.message" :color="confirmDialog.color" :confirm-button-color="confirmDialog.confirmButtonColor" :icon="confirmDialog.icon" :confirm-text="confirmDialog.confirmText" :cancel-text="confirmDialog.cancelText" :loading="confirmDialog.loading" @confirm="confirmDialog.action" />

    <PoaPreviewDialog v-model:show="poaPreviewDialog" :data="poaPreviewData" />
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { safeArray } from '../utils/safe'
import { SESSION_OUTCOMES } from '../utils/legalConstants'
import PremiumModal from '../components/common/PremiumModal.vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import { useConfirmDialog } from '../composables/useConfirmDialog'
import { useAgenciesStore } from '../stores/agencies'
import LucideIcon from '../components/common/LucideIcon.vue'
import SessionRoomHeader from './session-room/SessionRoomHeader.vue'
import CaseInfoHeaderCard from './session-room/CaseInfoHeaderCard.vue'
import CaseSidePanels from './session-room/CaseSidePanels.vue'
import ContentViewer from './session-room/ContentViewer.vue'
import NotepadPanel from './session-room/NotepadPanel.vue'
import SessionPickerDialog from './session-room/SessionPickerDialog.vue'
import PoaPreviewDialog from './session-room/PoaPreviewDialog.vue'
import { formatDate, formatSessionDate, ordinal } from './session-room/helpers'

const route = useRoute()
const router = useRouter()

const isNewWindow = computed(() => route.query.window === 'new')

const openInNewWindow = () => {
  if (activeSession.value?.id) {
    if ((window as any).api?.system?.openSessionWindow) {
      (window as any).api.system.openSessionWindow(activeSession.value.id)
    } else {
      const routeUrl = router.resolve({ path: '/session-room', query: { session_id: activeSession.value.id, window: 'new' } })
      window.open(routeUrl.href, '_blank')
    }
    goBack()
  }
}

const pickerDialog = ref(false)
const snackbar = ref({ show: false, text: '', color: 'success' })
const showToast = (text: string, color: 'success' | 'error' | 'info' = 'success') => {
  snackbar.value = { show: true, text, color }
}

const { confirmDialog, openConfirm, closeConfirm } = useConfirmDialog()
const agenciesStore = useAgenciesStore()

const poaPreviewDialog = ref(false)
const poaPreviewData = ref<any>(null)

const showPoaPreview = async () => {
  if (!caseItem.value?.client_id) { showToast('لا يمكن جلب الوكالة بدون معرف الموكل', 'error'); return }
  await agenciesStore.fetchAgencies()
  let targetAgencyNumber = header.value.agencyNumber
  if (!targetAgencyNumber) {
    const clientAgs = agenciesStore.agencies.filter((a) => String(a.client_id) === String(caseItem.value.client_id))
    if (clientAgs.length > 0) targetAgencyNumber = clientAgs[0].agency_number
  }
  if (!targetAgencyNumber) { showToast('لا يوجد رقم وكالة مسجل لهذه القضية أو الموكل', 'error'); return }
  const poa = agenciesStore.agencies.find((a) => String(a.agency_number) === String(targetAgencyNumber))
  if (poa) { poaPreviewData.value = poa; poaPreviewDialog.value = true }
  else showToast('لم يتم العثور على تفاصيل الوكالة في النظام', 'error')
}

const goToClient = () => {
  if (caseItem.value?.client_id) router.push({ path: `/clients/${caseItem.value.client_id}` })
  else showToast('بيانات الموكل غير متوفرة لهذه الجلسة', 'error')
}

const outcomeModal = ref({
  show: false, loading: false, result: '', notes: '', dismissalDecision: '',
  serviceDate: '', judgmentNumber: '', judgmentDate: new Date().toLocaleDateString('en-CA'), objectionDays: 30
})

const todaySessions = ref<any[]>([])
const tomorrowSessions = ref<any[]>([])
const pickOptions = computed(() => [...safeArray(todaySessions.value), ...safeArray(tomorrowSessions.value)])

const activeSession = ref<any | null>(null)
const caseItem = ref<any | null>(null)
const caseSessions = ref<any[]>([])
const judgments = ref<any[]>([])
const docs = ref<any[]>([])
const memos = ref<any[]>([])

const header = computed(() => {
  const c = caseItem.value || {}
  const parties = safeArray(c.parties)
  const opponents = parties.filter((p: any) => p.party_type === 'opponent')
  const opponentName = String(opponents[0]?.name || opponents[0]?.defendant_linked_name || c.opponent_name || '').trim()
  return {
    clientName: String(c.client_name || c.client?.name || '').trim(),
    opponentName, caseNumber: String(c.case_number || '').trim(),
    najizUrl: String(c.najiz_url || '').trim(),
    agencyNumber: String((c as any).__agency_number || '').trim(),
    agencyExpiry: String((c as any).__agency_expiry || '').trim()
  }
})

const note = ref('')
const selected = ref<any>({ type: 'text', category: '', title: '', content: '', file_path: '', session_id: '' })

const pdfSrc = computed(() => {
  if (selected.value.type !== 'pdf') return ''
  const p = String(selected.value.file_path || '').trim()
  if (!p) return ''
  const normalized = p.replace(/\\/g, '/')
  if (/^[a-zA-Z]:\//.test(normalized)) return encodeURI('file:///' + normalized)
  if (/^file:\/\//i.test(normalized)) return normalized
  return ''
})

const goBack = () => router.push('/dashboard')

const copy = async (text: string) => {
  const t = String(text || '').trim()
  if (!t) return
  try { await navigator.clipboard.writeText(t); showToast('تم النسخ', 'success') }
  catch { showToast('تعذر النسخ', 'error') }
}

const openExternal = async (url: string) => {
  const u = String(url || '').trim()
  if (!u) return
  try { await (window as any).api.system.openExternal(u) }
  catch (e: unknown) { showToast('تعذر فتح الرابط: ' + (e as Error).message, 'error') }
}

const openFile = (path: string) => {
  const p = String(path || '').trim()
  if (!p) return
  ;(window as any).api.documents.open(p)
}

const selectText = (category: string, title: string, content: string) => {
  selected.value = { type: 'text', category, title, content: String(content || '').trim(), file_path: '', session_id: selected.value.session_id || '' }
}

const selectPdf = (category: string, title: string, file_path: string) => {
  selected.value = { type: 'pdf', category, title, content: '', file_path: String(file_path || '').trim(), session_id: selected.value.session_id || '' }
}

const selectSessionText = (s: any, idx: number) => {
  const lines: string[] = []
  lines.push(`التاريخ: ${formatSessionDate(s)}`)
  if (s.court_room) lines.push(`الدائرة/القاعة: ${String(s.court_room)}`)
  if (s.status) lines.push(`الحالة: ${String(s.status)}`)
  if (s.result) lines.push(`النتيجة: ${String(s.result)}`)
  if (s.notes) lines.push(`الملاحظات: ${String(s.notes)}`)
  selected.value = { type: 'text', category: `الجلسة ${ordinal(idx)}`, title: `محضر الجلسة ${ordinal(idx)}`, content: lines.join('\n'), file_path: '', session_id: String(s.id || '') }
  activeSession.value = s
}

const judgmentText = (j: any) => {
  const lines: string[] = []
  lines.push(`النوع: ${String(j.judgment_type || j.type || '')}`)
  if (j.judgment_number) lines.push(`رقم الحكم: ${String(j.judgment_number)}`)
  if (j.favor) lines.push(`الوضع: ${String(j.favor)}`)
  if (j.judgment_date) lines.push(`تاريخ الحكم: ${formatDate(j.judgment_date)}`)
  if (j.notes) lines.push(`ملاحظات: ${String(j.notes)}`)
  return lines.join('\n')
}

const chooseSession = async (s: any) => { await loadForSessionId(String(s.id || '')) }

const loadLookups = async () => {
  try { todaySessions.value = safeArray(await (window as any).api.sessions.getToday()) } catch { todaySessions.value = [] }
  try { tomorrowSessions.value = safeArray(await (window as any).api.sessions.getTomorrow()) } catch { tomorrowSessions.value = [] }
}

const splitDocs = (allDocs: any[]) => {
  const pdfs = safeArray(allDocs).filter((d: any) => String(d?.file_path || '').toLowerCase().endsWith('.pdf'))
  const isMemo = (name: string) => { const n = String(name || '').toLowerCase(); return n.includes('مذكرة') || n.includes('لائحة') || n.includes('اعتراضية') || n.includes('رد') }
  memos.value = pdfs.filter((d: any) => isMemo(d?.name))
  docs.value = pdfs.filter((d: any) => !isMemo(d?.name))
}

const loadCaseBundles = async (caseId: string) => {
  caseItem.value = await (window as any).api.cases.getById(caseId)
  caseSessions.value = safeArray(await (window as any).api.sessions.getByCaseId(caseId)).sort((a: any, b: any) => {
    const da = String(a?.date || '').localeCompare(String(b?.date || ''))
    if (da !== 0) return da
    return String(a?.time || '').localeCompare(String(b?.time || ''))
  })
  judgments.value = safeArray(await (window as any).api.judgments.getByCaseId(caseId)).sort((a: any, b: any) =>
    String(b?.judgment_date || '').localeCompare(String(a?.judgment_date || ''))
  )
  const allDocs = safeArray(await (window as any).api.documents.getByCaseId(caseId))
  splitDocs(allDocs)
  try {
    const clientId = String(caseItem.value?.client_id || '').trim()
    if (clientId) {
      const ags = safeArray(await (window as any).api.agencies.getByClientId(clientId)).sort((a: any, b: any) =>
        String(b?.date || '').localeCompare(String(a?.date || ''))
      )
      const top = ags[0]
      ;(caseItem.value as any).__agency_number = String(top?.agency_number || '').trim()
      ;(caseItem.value as any).__agency_expiry = String(top?.expiry_date || '').trim()
    }
  } catch {}
}

const loadForSessionId = async (sessionId: string) => {
  const all = pickOptions.value
  const fromList = all.find((x: any) => String(x?.id || '') === sessionId)
  if (fromList) activeSession.value = fromList
  if (!activeSession.value) {
    try {
      const allSessions = safeArray(await (window as any).api.sessions.getAll())
      activeSession.value = allSessions.find((x: any) => String(x?.id || '') === sessionId) || null
    } catch { activeSession.value = null }
  }
  const caseId = String(activeSession.value?.case_id || '').trim()
  if (!caseId) { showToast('هذه الجلسة غير مرتبطة بقضية', 'error'); return }
  await loadCaseBundles(caseId)
  if (caseSessions.value.length > 0) selectSessionText(caseSessions.value[0], 0)
  else selectText('الموضوع', 'موضوع الدعوى', caseItem.value?.subject || '—')
}

const saveNote = async () => {
  if (!activeSession.value?.id) return
  try {
    await (window as any).api.sessions.update(activeSession.value.id, { notes: note.value })
    showToast('تم حفظ الملاحظات', 'success')
  } catch (e: unknown) { showToast('تعذر حفظ الملاحظات: ' + (e as Error).message, 'error') }
}

const openOutcomeModal = () => {
  outcomeModal.value = { ...outcomeModal.value, show: true, loading: false, result: '', notes: note.value || activeSession.value?.notes || '', serviceDate: new Date().toLocaleDateString('en-CA'), judgmentDate: new Date().toLocaleDateString('en-CA') }
}

const translateOutcomeItem = (k: string): string => {
  const map: Record<string, string> = { session: 'الجلسة الحالية', next_session: 'جلسة جديدة', task_reminder: 'مهمة تذكير', task_schedule_next_session: 'مهمة: تحديد موعد الجلسة القادمة', judgment_final: 'تسجيل حكم قطعي', judgment_preliminary: 'تسجيل حكم ابتدائي' }
  return map[k] || k
}

const submitOutcome = async () => {
  const result = outcomeModal.value.result
  if (!result || !activeSession.value) return
  outcomeModal.value.loading = true
  try {
    const api = (window as any).api
    const payload: Record<string, any> = { session_id: activeSession.value.id, result, notes: outcomeModal.value.notes }
    if (result === 'صدور حكم قطعي' || result === 'صدور حكم ابتدائي') {
      payload.judgmentData = {
        judgment_number: outcomeModal.value.judgmentNumber,
        judgment_type: result === 'صدور حكم قطعي' ? 'قطعي' : 'ابتدائي',
        is_executable: result === 'صدور حكم قطعي',
        objection_period_days: outcomeModal.value.objectionDays,
        judgment_date: outcomeModal.value.judgmentDate,
        service_date: outcomeModal.value.serviceDate,
        is_for_client: true,
        has_appeal_grounds: false,
        needs_execution: result === 'صدور حكم قطعي'
      }
    }
    if (result === 'شطب الدعوى / انقطاع') payload.dismissalDecision = outcomeModal.value.dismissalDecision
    if (result === 'تبليغ / إجراء إداري') payload.serviceData = { date: outcomeModal.value.serviceDate, notes: outcomeModal.value.notes }

    // Preview analysis via smart engine (cloud) or workflow (desktop)
    if (api.sessionOutcome?.preview) {
      const previewRes = await api.sessionOutcome.preview({ result, judgmentData: payload.judgmentData, notes: outcomeModal.value.notes })
      const analysis = previewRes?.analysis
      const taskList = safeArray(analysis?.tasks)
      const priorityLabel = (p: string) => p === 'عاجلة' ? '[عاجلة]' : p === 'مهمة' ? '[مهمة]' : '[عادية]'
      const lines: string[] = ['══════════════════════════════', '  التحليل الذكي للنتيجة', '══════════════════════════════', '']
      lines.push(`• نوع النتيجة: ${analysis?.outcomeType || '—'}`)
      if (analysis?.degree) lines.push(`• درجة الحكم: ${analysis.degree}`)
      if (analysis?.favors) lines.push(`• لصالح: ${analysis.favors}`)
      if (analysis?.needsExecution) lines.push('• يحتاج تنفيذ: نعم')
      if (analysis?.hasAppealGrounds) lines.push('• يوجد أسباب اعتراض: نعم')
      if (analysis?.deadlines?.appealEndDate) {
        lines.push(`• مدة الاعتراض: ${analysis.deadlines.appealDeadlineDays} يوم`)
        lines.push(`• آخر موعد للاعتراض: ${analysis.deadlines.appealEndDate}`)
      }
      lines.push('')
      if (taskList.length) {
        lines.push('──────────────────────────────')
        lines.push('  المهام التي سيتم إنشاؤها:')
        lines.push('──────────────────────────────')
        taskList.forEach((t: any, i: number) => {
          const pri = priorityLabel(t.priority || 'عادية')
          lines.push(`${i + 1}. ${pri} ${t.title}`)
          if (t.description) lines.push(`   ${t.description}`)
          if (t.dueDate) lines.push(`   تاريخ الاستحقاق: ${t.dueDate}`)
          lines.push('')
        })
      }
      lines.push('══════════════════════════════')
      lines.push('هل تريد المتابعة في تسجيل النتيجة؟')

      const msg = lines.join('\n')

      openConfirm({
        title: 'تأكيد تسجيل النتيجة مع التحليل الذكي', message: msg, color: 'primary', icon: 'brain',
        confirmText: 'نعم، سجل النتيجة', cancelText: 'إلغاء',
        action: async () => {
          confirmDialog.value.loading = true
          try {
            const applied = await api.sessionOutcome.apply({ session_id: activeSession.value.id, result, notes: outcomeModal.value.notes, judgmentData: payload.judgmentData })
            outcomeModal.value.show = false
            showToast('تم تسجيل النتيجة بنجاح مع التحليل الذكي', 'success')
            router.push('/sessions')
          } catch (e: unknown) { showToast('فشل تسجيل النتيجة: ' + (e as Error).message, 'error') }
          finally { confirmDialog.value.loading = false; closeConfirm() }
        }
      })
    } else {
      // Fallback to desktop workflow
      const previewRes = await api.workflow.previewDecision({ sessionId: activeSession.value.id, resultLabel: result, inputs: payload })
      const missing = safeArray(previewRes?.missing)
      if (missing.length > 0) { showToast('بيانات مطلوبة: ' + missing.map((m: any) => m?.label).join('، '), 'error'); return }
      const p = previewRes?.preview?.preview || {}
      const closeList = safeArray(p.closes).map((x: any) => translateOutcomeItem(String(x)))
      const createList = safeArray(p.creates).map((x: any) => translateOutcomeItem(String(x)))
      const msg = `سيتم تنفيذ التالي عند تثبيت النتيجة:\n\n${closeList.length ? `- إغلاق: ${closeList.join('، ')}\n` : ''}${createList.length ? `- إنشاء: ${createList.join('، ')}\n` : ''}\nهل تريد المتابعة؟`
      openConfirm({
        title: 'تأكيد مسار الإجراء', message: msg, color: 'primary', icon: 'git-branch',
        confirmText: 'نعم، ثبت النتيجة', cancelText: 'إلغاء',
        action: async () => {
          confirmDialog.value.loading = true
          try {
            const applied = await api.workflow.applyDecision({ sessionId: activeSession.value.id, resultLabel: result, inputs: payload })
            outcomeModal.value.show = false
            showToast('تم إغلاق الجلسة ورصد النتيجة بنجاح', 'success')
            const next = applied?.next
            if (next?.type === 'ui' && next?.route) router.push({ path: next.route, query: next.query || {} })
            else router.push('/sessions')
          } catch (e: unknown) { showToast('فشل تثبيت النتيجة: ' + (e as Error).message, 'error') }
          finally { confirmDialog.value.loading = false; closeConfirm() }
        }
      })
    }
  } finally { outcomeModal.value.loading = false }
}

watch(() => note.value, () => {
  if (!activeSession.value?.id) return
  try { localStorage.setItem(`session_room_note:${activeSession.value.id}`, note.value) } catch {}
})

watch(() => activeSession.value?.id, (id) => {
  if (!id) return
  try { note.value = localStorage.getItem(`session_room_note:${id}`) || String(activeSession.value?.notes || '') }
  catch { note.value = String(activeSession.value?.notes || '') }
}, { immediate: true })

onMounted(async () => {
  await loadLookups()
  const q = String(route.query.session_id || '').trim()
  if (q) { await loadForSessionId(q); return }
  const first = pickOptions.value[0]
  if (first?.id) { await loadForSessionId(String(first.id)); return }
  pickerDialog.value = true
})
</script>

<style scoped>
.session-text { white-space: pre-wrap; font-family: 'Consolas', 'Courier New', monospace; font-size: 0.95rem; line-height: 1.7; }
.recording-dot { width: 10px; height: 10px; border-radius: 50%; background: #ef4444; animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
.note-textarea :deep(textarea) { background: repeating-linear-gradient(transparent, transparent 31px, rgba(197, 160, 40, 0.08) 31px, rgba(197, 160, 40, 0.08) 32px) !important; line-height: 32px !important; padding: 0 !important; font-size: 0.95rem; min-height: 400px; }
.session-room-btn-zr1 { height: 56px; }
@media (max-width: 1023px) {
  .session-room-btn-zr1 { height: 48px; font-size: 0.8rem !important; padding: 0 12px !important; }
  :deep(.v-row .v-col-md-2), :deep(.v-row .v-col-md-3) { flex: 0 0 100% !important; max-width: 100% !important; margin-bottom: 8px; }
  :deep(.v-row[style*="30vh"]) { height: auto !important; }
  :deep(.v-row[style*="72vh"]) { height: auto !important; }
}
</style>
