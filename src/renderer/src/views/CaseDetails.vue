<template>
  <v-container fluid class="pa-6">
    <div class="d-flex justify-space-between align-center mb-4">
      <v-btn
        variant="outlined"
        to="/cases"
        class="font-weight-black return-btn-gold premium-btn-gold-gradient"
      >
        <LucideIcon name="arrow-right" :size="18" class="me-2" /> العودة للقضايا
      </v-btn>
      <v-btn
        v-if="nextCaseId"
        variant="outlined"
        :to="'/cases/' + nextCaseId"
        class="font-weight-black next-btn-gold premium-btn-gold-gradient"
      >
        القضية التالية <LucideIcon name="arrow-left" :size="18" class="ms-2" />
      </v-btn>
    </div>

    <v-row v-if="loading">
      <v-col class="text-center pa-10"><v-progress-circular indeterminate color="accent" /></v-col>
    </v-row>
    <v-alert v-else-if="loadError" type="error" variant="tonal" border="start" class="mb-6">{{
      loadError
    }}</v-alert>

    <div v-else-if="caseItem">
      <CaseDetailHeader
        :case-item="caseItem"
        :client-name="clientName"
        :generating-report="generatingReport"
        :can-create-contracts="canCreateContracts"
        @generate-report="generateProfessionalReport"
        @edit="openEditDialog"
      />

      <v-card elevation="0" class="glass-panel overflow-hidden glass-card">
        <v-tabs v-model="tab" bg-color="transparent" class="border-b" grow color="accent">
          <v-tab value="overview" class="font-weight-black"
            ><LucideIcon name="info" :size="18" class="me-2" /> نظرة عامة</v-tab
          >
          <v-tab value="journey" class="font-weight-black"
            ><LucideIcon name="milestone" :size="18" class="me-2" /> مسار القضية</v-tab
          >
          <v-tab value="sessions" class="font-weight-black"
            ><LucideIcon name="calendar-days" :size="18" class="me-2" /> الجلسات</v-tab
          >
          <v-tab value="judgments" class="font-weight-black"
            ><LucideIcon name="gavel" :size="18" class="me-2" /> الاحكام</v-tab
          >
          <v-tab value="tasks" class="font-weight-black"
            ><LucideIcon name="check-square" :size="18" class="me-2" /> المهام</v-tab
          >
          <v-tab value="documents" class="font-weight-black"
            ><LucideIcon name="files" :size="18" class="me-2" /> المستندات</v-tab
          >
          <v-tab value="memoranda" class="font-weight-black"
            ><LucideIcon name="scroll-text" :size="18" class="me-2" /> المذكرات</v-tab
          >
          <v-tab value="legal-services" class="font-weight-black"
            ><LucideIcon name="briefcase" :size="18" class="me-2" /> الخدمات القانونية</v-tab
          >
        </v-tabs>

        <v-window v-model="tab" class="pa-6">
          <v-window-item value="overview">
            <CaseOverviewTab :case-item="caseItem" :parties="caseItem.parties || []" />
          </v-window-item>
          <v-window-item value="journey">
            <CaseJourneyDiagram :events="journeyEvents" @select-event="onSelectJourneyEvent" />
          </v-window-item>
          <v-window-item value="sessions">
            <CaseSessionsTab
              :sessions="linkedSessions"
              :blocked="caseBlockStatus.is_blocked"
              :block-reason="caseBlockStatus.reason"
              @add="openAddSession"
            />
          </v-window-item>
          <v-window-item value="judgments">
            <CaseJudgmentsTab
              :judgments="linkedJudgments"
              @add="openAddJudgment"
              @amend="openJudgmentAmendment"
            />
          </v-window-item>
          <v-window-item value="tasks">
            <CaseTasksTab :tasks="linkedTasks" />
          </v-window-item>
          <v-window-item value="documents">
            <CaseDocumentsTab
              :documents="linkedDocuments"
              @upload="uploadDocument"
              @open="openDocument"
              @remove="removeDocument"
            />
          </v-window-item>
          <v-window-item value="memoranda">
            <CaseMemorandaTab :memoranda="linkedMemoranda" :case-id="caseId" />
          </v-window-item>
          <v-window-item value="legal-services">
            <CaseLegalServicesTab :case-id="caseId" />
          </v-window-item>
        </v-window>
      </v-card>
    </div>

    <!-- Judgment Dialog -->
    <v-dialog v-model="showJudgmentDialog" max-width="500px" persistent>
      <v-card class="premium-glass-card border-gold border-2 rounded-2xl overflow-hidden glass-card">
        <div class="pa-6 bg-gold-gradient text-ebony d-flex align-center">
          <LucideIcon name="gavel" :size="24" class="me-3" />
          <span class="text-h6 font-weight-black">{{ editingJudgmentId ? 'تعديل الحكم' : 'تسجيل حكم جديد' }}</span>
          <v-spacer />
          <v-btn icon variant="text" color="ebony" @click="showJudgmentDialog = false">
            <LucideIcon name="x" :size="24" />
          </v-btn>
        </div>

        <v-card-text class="pa-6">
          <v-form ref="judgmentFormRef">
            <v-select
              v-model="judgmentForm.type"
              :items="['ابتدائي', 'استئناف', 'نقض', 'أخرى']"
              label="درجة الحكم"
              variant="outlined"
              class="glass-input mb-4 text-white"
              :rules="[v => !!v || 'الدرجة مطلوبة']"
            ></v-select>

            <v-text-field
              v-model="judgmentForm.judgment_date"
              type="date"
              label="تاريخ الحكم ميلادي"
              variant="outlined"
              class="glass-input mb-4 text-white"
              :rules="[v => !!v || 'التاريخ مطلوب']"
            ></v-text-field>

            <v-select
              v-model="judgmentForm.favor"
              :items="['لصالح الموكل', 'لصالح الخصم', 'جزئي']"
              label="صيغة الحكم"
              variant="outlined"
              class="glass-input mb-4 text-white"
              :rules="[v => !!v || 'الصيغة مطلوبة']"
            ></v-select>

            <v-text-field
              v-model="judgmentForm.objection_deadline"
              type="date"
              label="موعد الاعتراض (الاستئناف)"
              variant="outlined"
              class="glass-input mb-4 text-white"
            ></v-text-field>

            <v-textarea
              v-model="judgmentForm.notes"
              label="ملاحظات وتفاصيل الحكم"
              variant="outlined"
              class="glass-input mb-4 text-white"
              rows="3"
            ></v-textarea>
          </v-form>
        </v-card-text>

        <v-card-actions class="pa-6 pt-0">
          <v-btn variant="outlined" class="px-6 rounded-lg text-white" @click="showJudgmentDialog = false">إلغاء</v-btn>
          <v-spacer />
          <v-btn
            color="gold"
            variant="flat"
            class="px-6 font-weight-black premium-btn-gold-gradient"
            :loading="savingJudgment"
            @click="saveJudgment"
          >
            حفظ الحكم
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
import CaseLegalServicesTab from './case-details/CaseLegalServicesTab.vue'

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
  if (!caseId.value) {
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = ''
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
  } catch (e: any) {
    loadError.value = e?.message || 'فشل تحميل القضية'
  } finally {
    loading.value = false
  }
}

const checkBlocked = (): void => {
  const recent = safeArray(linkedSessions.value).filter(
    (s: any) => s.status === 'قادمة' || s.status === 'مؤجلة'
  )
  caseBlockStatus.value = {
    is_blocked: recent.length >= 3,
    reason: recent.length >= 3 ? `توجد ${recent.length} جلسات غير محسومة` : ''
  }
}

const findNextCase = async (): Promise<void> => {
  try {
    const cases = await window.api.cases.getAll()
    const sorted = safeArray(cases).sort((a: any, b: any) =>
      String(a.case_number || '').localeCompare(String(b.case_number || ''), 'ar')
    )
    const idx = sorted.findIndex((c: any) => c.id === caseId.value)
    if (idx >= 0 && idx < sorted.length - 1) nextCaseId.value = sorted[idx + 1].id
    else nextCaseId.value = ''
  } catch {
    nextCaseId.value = ''
  }
}

const onSelectJourneyEvent = (event: any): void => {
  /* navigate to relevant tab */
}
const openAddSession = (): void => {
  router.push('/sessions?case_id=' + caseId.value)
}
// Judgment dialog state and functions
const showJudgmentDialog = ref(false)
const editingJudgmentId = ref<string | null>(null)
const savingJudgment = ref(false)
const judgmentFormRef = ref<any>(null)
const judgmentForm = ref({
  type: '',
  judgment_date: '',
  favor: '',
  objection_deadline: '',
  notes: ''
})

const openAddJudgment = (): void => {
  editingJudgmentId.value = null
  judgmentForm.value = {
    type: 'ابتدائي',
    judgment_date: new Date().toLocaleDateString('en-CA'),
    favor: 'لصالح الموكل',
    objection_deadline: '',
    notes: ''
  }
  showJudgmentDialog.value = true
}

const openJudgmentAmendment = (id: string): void => {
  const j = linkedJudgments.value.find((x: any) => x.id === id)
  if (j) {
    editingJudgmentId.value = id
    judgmentForm.value = {
      type: j.type || '',
      judgment_date: j.judgment_date || '',
      favor: j.favor || '',
      objection_deadline: j.objection_deadline || '',
      notes: j.notes || ''
    }
    showJudgmentDialog.value = true
  }
}

const saveJudgment = async () => {
  if (judgmentFormRef.value) {
    const valid = await judgmentFormRef.value.validate()
    if (!valid.valid) return
  }
  
  savingJudgment.value = true
  try {
    const payload = {
      ...judgmentForm.value,
      case_id: caseId.value
    }
    if (editingJudgmentId.value) {
      await (window as any).api.judgments.update(editingJudgmentId.value, payload)
    } else {
      await (window as any).api.judgments.create(payload)
    }
    
    // Refresh judgments
    const res = await window.api.judgments.getByCaseId(caseId.value)
    linkedJudgments.value = safeArray(res)
    showJudgmentDialog.value = false
  } catch (err) {
    console.error('Failed to save judgment:', err)
  } finally {
    savingJudgment.value = false
  }
}
const uploadDocument = (): void => {
  router.push('/documents?case_id=' + caseId.value + '&upload=1')
}
const openDocument = (path: string): void => {
  window.open(path, '_blank')
}
const removeDocument = async (doc: any): Promise<void> => {
  try {
    await window.api.documents.delete(doc.id)
    linkedDocuments.value = linkedDocuments.value.filter((d: any) => d.id !== doc.id)
  } catch {}
}

const generateProfessionalReport = async (): Promise<void> => {
  generatingReport.value = true
  try {
    await window.api.reports.generateCaseReport(caseId.value)
    window.open('/#/reports/case?case_id=' + caseId.value, '_blank')
  } catch {
  } finally {
    generatingReport.value = false
  }
}

const openEditDialog = (): void => {
  router.push('/cases?edit=' + caseId.value)
}

onMounted(() => {
  loadCase()
})
onUnmounted(() => {
  caseStore.q = ''
})
</script>

<style scoped>
.return-btn-gold,
.next-btn-gold {
  border-color: var(--royal-gold) !important;
  color: var(--royal-gold) !important;
  font-weight: 900;
}
</style>
