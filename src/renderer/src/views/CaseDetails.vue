<template>
  <v-container fluid class="pa-6">
    <div class="d-flex justify-space-between align-center mb-4">
      <v-btn variant="outlined" to="/cases" class="font-weight-black return-btn-gold">
        <LucideIcon name="arrow-right" :size="18" class="me-2" /> العودة للقضايا
      </v-btn>
      <v-btn v-if="nextCaseId" variant="outlined" :to="'/cases/' + nextCaseId" class="font-weight-black next-btn-gold">
        القضية التالية <LucideIcon name="arrow-left" :size="18" class="ms-2" />
      </v-btn>
    </div>

    <v-row v-if="loading">
      <v-col class="text-center pa-10"><v-progress-circular indeterminate color="accent" /></v-col>
    </v-row>
    <v-alert v-else-if="loadError" type="error" variant="tonal" border="start" class="mb-6">{{ loadError }}</v-alert>

    <div v-else-if="caseItem">
      <CaseDetailHeader
        :case-item="caseItem"
        :client-name="clientName"
        :generating-report="generatingReport"
        :can-create-contracts="canCreateContracts"
        @generate-report="generateProfessionalReport"
        @edit="openEditDialog"
      />

      <v-card elevation="0" class="glass-panel overflow-hidden">
        <v-tabs v-model="tab" bg-color="transparent" class="border-b" grow color="accent">
          <v-tab value="overview" class="font-weight-black"><LucideIcon name="info" :size="18" class="me-2" /> نظرة عامة</v-tab>
          <v-tab value="journey" class="font-weight-black"><LucideIcon name="milestone" :size="18" class="me-2" /> مسار القضية</v-tab>
          <v-tab value="sessions" class="font-weight-black"><LucideIcon name="calendar-days" :size="18" class="me-2" /> الجلسات</v-tab>
          <v-tab value="judgments" class="font-weight-black"><LucideIcon name="gavel" :size="18" class="me-2" /> الاحكام</v-tab>
          <v-tab value="tasks" class="font-weight-black"><LucideIcon name="check-square" :size="18" class="me-2" /> المهام</v-tab>
          <v-tab value="documents" class="font-weight-black"><LucideIcon name="files" :size="18" class="me-2" /> المستندات</v-tab>
          <v-tab value="memoranda" class="font-weight-black"><LucideIcon name="scroll-text" :size="18" class="me-2" /> المذكرات</v-tab>
        </v-tabs>

        <v-window v-model="tab" class="pa-6">
          <v-window-item value="overview">
            <CaseOverviewTab :case-item="caseItem" :parties="caseItem.parties || []" />
          </v-window-item>
          <v-window-item value="journey">
            <CaseJourneyDiagram :events="journeyEvents" @select-event="onSelectJourneyEvent" />
          </v-window-item>
          <v-window-item value="sessions">
            <CaseSessionsTab :sessions="linkedSessions" :blocked="caseBlockStatus.is_blocked" :block-reason="caseBlockStatus.reason" @add="openAddSession" />
          </v-window-item>
          <v-window-item value="judgments">
            <CaseJudgmentsTab :judgments="linkedJudgments" @add="openAddJudgment" @amend="openJudgmentAmendment" />
          </v-window-item>
          <v-window-item value="tasks">
            <CaseTasksTab :tasks="linkedTasks" />
          </v-window-item>
          <v-window-item value="documents">
            <CaseDocumentsTab :documents="linkedDocuments" @upload="uploadDocument" @open="openDocument" @remove="removeDocument" />
          </v-window-item>
          <v-window-item value="memoranda">
            <CaseMemorandaTab :memoranda="linkedMemoranda" :case-id="caseId" />
          </v-window-item>
        </v-window>
      </v-card>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCasesStore } from '../stores/cases'
import { useSessionsStore } from '../stores/sessions'
import { safeArray } from '../utils/safe'
import { convertToHijri } from '../utils/hijri'
import LucideIcon from '../components/common/LucideIcon.vue'
import CaseJourneyDiagram from '../components/CaseJourneyDiagram.vue'
import CaseDetailHeader from './case-details/CaseDetailHeader.vue'
import CaseOverviewTab from './case-details/CaseOverviewTab.vue'
import CaseSessionsTab from './case-details/CaseSessionsTab.vue'
import CaseJudgmentsTab from './case-details/CaseJudgmentsTab.vue'
import CaseTasksTab from './case-details/CaseTasksTab.vue'
import CaseDocumentsTab from './case-details/CaseDocumentsTab.vue'
import CaseMemorandaTab from './case-details/CaseMemorandaTab.vue'

const route = useRoute()
const router = useRouter()
const caseStore = useCasesStore()
const sessionsStore = useSessionsStore()

const caseId = computed(() => String(route.params.id || ''))
const tab = ref('overview')
const caseItem = ref<any>(null)
const loading = ref(true)
const loadError = ref('')
const nextCaseId = ref('')
const generatingReport = ref(false)
const journeysStore: any = { events: computed(() => []) }
const journeyEvents = computed(() => safeArray(journeysStore?.events || []))
const linkedSessions = ref<any[]>([])
const linkedJudgments = ref<any[]>([])
const linkedTasks = ref<any[]>([])
const linkedDocuments = ref<any[]>([])
const linkedMemoranda = ref<any[]>([])
const caseBlockStatus = ref({ is_blocked: false, reason: '' })
const clientName = ref('')
const canCreateContracts = computed(() => true)

const loadCase = async (): Promise<void> => {
  if (!caseId.value) { loading.value = false; return }
  loading.value = true; loadError.value = ''
  try {
    const data = await window.api.cases.getById(caseId.value)
    caseItem.value = data
    clientName.value = data?.client_name || 'غير محدد'

    const [sessions, judgments, tasks, documents, memoranda] = await Promise.all([
      window.api.sessions.getByCaseId(caseId.value).catch(() => []),
      window.api.judgments?.getByCaseId?.(caseId.value).catch(() => []) || [],
      window.api.tasks?.getByCaseId?.(caseId.value).catch(() => []) || [],
      window.api.documents?.getByCaseId?.(caseId.value).catch(() => []) || [],
      window.api.memoranda?.getByCaseId?.(caseId.value).catch(() => []) || []
    ])
    linkedSessions.value = sessions
    linkedJudgments.value = judgments
    linkedTasks.value = tasks
    linkedDocuments.value = documents
    linkedMemoranda.value = memoranda

    checkBlocked()
    await findNextCase()
  } catch (e: any) { loadError.value = e?.message || 'فشل تحميل القضية' }
  finally { loading.value = false }
}

const checkBlocked = (): void => {
  const recent = safeArray(linkedSessions.value).filter((s: any) => s.status === 'قادمة' || s.status === 'مؤجلة')
  caseBlockStatus.value = {
    is_blocked: recent.length >= 3,
    reason: recent.length >= 3 ? `توجد ${recent.length} جلسات غير محسومة` : ''
  }
}

const findNextCase = async (): Promise<void> => {
  try {
    const cases = await window.api.cases.getAll()
    const sorted = safeArray(cases).sort((a: any, b: any) => String(a.case_number || '').localeCompare(String(b.case_number || ''), 'ar'))
    const idx = sorted.findIndex((c: any) => c.id === caseId.value)
    if (idx >= 0 && idx < sorted.length - 1) nextCaseId.value = sorted[idx + 1].id
    else nextCaseId.value = ''
  } catch { nextCaseId.value = '' }
}

const onSelectJourneyEvent = (event: any): void => { /* navigate to relevant tab */ }
const openAddSession = (): void => { router.push('/sessions?case_id=' + caseId.value) }
const openAddJudgment = (): void => { router.push('/judgments?case_id=' + caseId.value) }
const openJudgmentAmendment = (id: string): void => { router.push('/judgments?amend=' + id) }
const uploadDocument = (): void => { router.push('/documents?case_id=' + caseId.value + '&upload=1') }
const openDocument = (path: string): void => { window.open(path, '_blank') }
const removeDocument = async (doc: any): Promise<void> => {
  try { await window.api.documents.delete(doc.id); linkedDocuments.value = linkedDocuments.value.filter((d: any) => d.id !== doc.id) }
  catch { }
}

const generateProfessionalReport = async (): Promise<void> => {
  generatingReport.value = true
  try { await window.api.reports.generateCaseReport(caseId.value); window.open('/reports/case?case_id=' + caseId.value, '_blank') }
  catch { }
  finally { generatingReport.value = false }
}

const openEditDialog = (): void => { router.push('/cases?edit=' + caseId.value) }

onMounted(() => { loadCase() })
onUnmounted(() => { caseStore.q = '' })
</script>

<style scoped>
.return-btn-gold, .next-btn-gold { border-color: var(--royal-gold) !important; color: var(--royal-gold) !important; font-weight: 900; }
</style>
