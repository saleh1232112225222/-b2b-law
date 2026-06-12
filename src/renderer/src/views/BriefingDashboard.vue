<template>
  <v-container fluid class="pa-4 briefing-container">
    <!-- Header: Premium & Contextual -->
    <v-row dense class="mb-6 align-center px-3">
      <v-col>
        <div class="d-flex align-center">
          <div
            class="header-icon-box pa-3 rounded-xl glass-card-noir border-accent me-4 shadow-premium"
          >
            <LucideIcon name="shield-check" :size="28" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold tracking-tight">المتابعة الشاملة</h1>
            <p class="text-caption text-pure-black font-weight-black mt-1 d-flex align-center">
              <LucideIcon :name="ICONS.SYSTEM.CALENDAR" :size="14" class="me-1" />
              {{ todayFormatted }}
            </p>
          </div>
        </div>
      </v-col>

      <v-col cols="auto" class="d-flex gap-3">
        <v-btn
          variant="flat"
          color="accent"
          class="rounded-lg font-weight-black px-6"
          elevation="4"
          :loading="printingReport"
          @click="generateBriefingPrint"
        >
          <LucideIcon name="printer" :size="18" class="me-2" />
          طباعة التقرير اليومي
        </v-btn>
      </v-col>
    </v-row>

    <!-- Navigation Tabs: Premium Noir Style -->
    <v-tabs
      v-model="activeTab"
      bg-color="transparent"
      color="accent"
      class="mb-6 modern-tabs px-3"
      density="comfortable"
      align-tabs="start"
    >
      <v-tab value="overview" class="font-weight-black text-pure-black">
        <LucideIcon name="layout-dashboard" :size="18" class="me-2" />
        نظرة عامة
      </v-tab>
      <v-tab value="urgent" class="font-weight-black text-pure-black">
        <LucideIcon name="alert-circle" :size="18" class="me-2" />
        إجراءات عاجلة ({{ actionRequired.length }})
      </v-tab>
      <v-tab value="followup" class="font-weight-black text-pure-black">
        <LucideIcon name="repeat" :size="18" class="me-2" />
        متابعات دورية
      </v-tab>
    </v-tabs>

    <v-window v-model="activeTab" class="px-3">
      <!-- 1. OPERATIONAL OVERVIEW -->
      <v-window-item value="overview">
        <!-- KPI Row -->
        <DashboardKpiCards
          :pending-sessions="pendingSessionsCount"
          :active-objections="safeArray(activeObjections).length"
          :enforcement-bonds="safeArray(awaitingEnforcement).length"
          :preparation-efficiency="totalSessionsPrepared"
          :total-sessions="safeArray(sessions).length"
          class="mb-6"
        />

        <v-row>
          <!-- Left: Agenda (Focus on Execution) -->
          <v-col cols="12" md="8">
            <div class="d-flex align-center justify-space-between mb-4">
              <h2 class="text-h6 font-weight-black text-pure-black d-flex align-center">
                <LucideIcon :name="ICONS.SYSTEM.CALENDAR" class="text-gold me-2" :size="24" />
                أجندة اليوم ({{ todaySessions.length }})
              </h2>
            </div>

            <div v-if="todaySessions.length > 0">
              <v-card
                v-for="session in todaySessions"
                :key="session.id"
                class="agenda-card rounded-xl mb-4 overflow-hidden premium-hover bg-white"
                elevation="2"
              >
                <v-row no-gutters class="fill-height">
                  <v-col
                    cols="auto"
                    class="time-side pa-4 d-flex flex-column align-center justify-center"
                  >
                    <div class="text-h5 font-weight-black text-pure-black">{{ session.time }}</div>
                    <v-chip
                      size="x-small"
                      color="primary"
                      variant="flat"
                      class="mt-2 font-weight-black"
                    >
                      {{ session.case_number?.split('/')[0] }}
                    </v-chip>
                  </v-col>

                  <v-divider vertical opacity="0.1" />

                  <v-col class="pa-5">
                    <div class="d-flex justify-space-between align-start">
                      <div>
                        <h3 class="text-h6 font-weight-black text-pure-black mb-1">
                          {{ session.client_name }}
                        </h3>
                        <div class="text-subtitle-2 font-weight-black text-accent mb-3">
                          {{ session.court_name }} | {{ session.chamber_name }}
                        </div>
                      </div>
                      <v-chip
                        v-if="session.status === 'منتهية'"
                        color="success"
                        variant="flat"
                        size="small"
                        class="font-weight-black"
                      >
                        مكتملة
                      </v-chip>
                    </div>

                    <div class="d-flex gap-4 mb-4">
                      <div
                        class="d-flex align-center text-pure-black font-weight-black text-caption"
                      >
                        <LucideIcon name="file-text" :size="14" class="me-1 text-accent" />
                        رقم القضية: {{ session.case_number }}
                      </div>
                      <div
                        class="d-flex align-center text-pure-black font-weight-black text-caption"
                      >
                        <LucideIcon name="scale" :size="14" class="me-1 text-accent" />
                        الموضوع: {{ session.case_subject || 'غير محدد' }}
                      </div>
                    </div>

                    <div
                      v-if="session.preparation_notes"
                      class="pa-4 bg-grey-lighten-5 rounded-lg border-s-lg border-accent mb-4"
                    >
                      <div class="text-caption font-weight-black text-pure-black mb-1">
                        ملاحظات التحضير:
                      </div>
                      <div class="text-body-2 font-weight-black text-pure-black leading-relaxed">
                        {{ session.preparation_notes }}
                      </div>
                    </div>

                    <div class="d-flex gap-3 justify-end mt-4">
                      <v-btn
                        variant="tonal"
                        color="primary"
                        class="font-weight-black rounded-lg"
                        prepend-icon="mdi-folder-open"
                        @click="prepareSession(session)"
                      >
                        تجهيز الملف
                      </v-btn>
                      <v-btn
                        variant="flat"
                        color="accent"
                        class="font-weight-black rounded-lg"
                        prepend-icon="mdi-check-circle"
                        @click="openOutcomeModal(session)"
                      >
                        رصد النتيجة
                      </v-btn>
                    </div>
                  </v-col>
                </v-row>
              </v-card>
            </div>

            <div v-else class="empty-premium text-center">
              <LucideIcon name="calendar-check" :size="64" class="text-accent opacity-20 mb-4" />
              <div class="text-h6 font-weight-black text-pure-black opacity-40">
                لا توجد جلسات مجدولة لهذا اليوم
              </div>
            </div>
          </v-col>

          <!-- Right Column -->
          <v-col cols="12" md="4">
            <!-- Daily Goal Card -->
            <DailyProgress :model-value="completionRate" class="mb-6" />

            <!-- Frozen Alert Card -->
            <v-card
              v-if="actionRequired.length > 0"
              class="rounded-xl border border-error bg-white shadow-premium pa-6 text-center"
              elevation="0"
            >
              <LucideIcon
                :name="ICONS.STATUS.URGENT"
                color="error"
                :size="48"
                class="mb-4 mx-auto"
              />
              <h3 class="text-h6 font-weight-black text-pure-black mb-2">
                تحذير الرقابة التشغيلية
              </h3>
              <p class="text-caption text-pure-black font-weight-black mb-6">
                توجد ملفات تم تجميدها بسبب فوات مواعيد إجرائية دون رصد نتيجة.
              </p>

              <div
                class="pa-6 bg-error-alpha rounded-xl border border-error text-error text-center"
              >
                <div class="text-h5 font-weight-black mb-1">{{ actionRequired.length }}</div>
                <div class="text-subtitle-1 font-weight-black">قضايا مجمدة</div>
              </div>
            </v-card>

            <!-- Quick Enforcement -->
            <v-card
              v-if="awaitingEnforcement.length > 0"
              class="mt-6 rounded-xl border-accent bg-white pa-4"
            >
              <div class="d-flex align-center mb-3">
                <LucideIcon name="gavel" class="text-accent me-2" :size="20" />
                <span class="font-weight-black text-pure-black">بانتظار طلب التنفيذ</span>
              </div>
              <v-list class="pa-0 bg-transparent">
                <v-list-item
                  v-for="enf in awaitingEnforcement.slice(0, 3)"
                  :key="enf.id"
                  class="rounded-lg mb-2 border-dashed"
                  @click="goToEnforcement(enf)"
                >
                  <v-list-item-title class="font-weight-black text-caption text-pure-black">{{
                    enf.client_name
                  }}</v-list-item-title>
                  <v-list-item-subtitle class="text-tiny font-weight-black text-pure-black"
                    >حكم رقم: {{ enf.judgment_number }}</v-list-item-subtitle
                  >
                  <template #append>
                    <LucideIcon name="chevron-left" :size="16" class="text-accent" />
                  </template>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- 2. URGENT ACTIONS (MANAGEMENT BY EXCEPTION) -->
      <v-window-item value="urgent">
        <UrgentSessionsTable
          :sessions="actionRequired"
          @close-result="openOutcomeModal"
          @bulk-close="confirmBulkClose"
        />

        <!-- Urgent Tasks Grid -->
        <div class="d-flex align-center justify-space-between mb-4 mt-8">
          <h2 class="text-h6 font-weight-black text-pure-black d-flex align-center">
            <LucideIcon :name="ICONS.STATUS.URGENT" color="error" class="me-2" :size="24" />
            مهام الإنجاز الفوري ({{ urgentTasks.length }})
          </h2>
          <v-btn
            variant="text"
            color="accent"
            size="small"
            class="font-weight-bold"
            @click="router.push('/tasks')"
          >
            عرض الكل
          </v-btn>
        </div>

        <v-row v-if="urgentTasks.length > 0" class="section-gap">
          <v-col v-for="task in urgentTasks" :key="task.id" cols="12" md="4">
            <v-card
              class="rounded-xl border-s-lg border-warning bg-white shadow-premium pa-5 h-100 premium-lift"
              elevation="0"
            >
              <div class="d-flex justify-space-between align-start mb-3">
                <span class="text-caption font-weight-black text-warning uppercase tracking-widest">
                  {{ task.context_label }}
                </span>
                <v-chip
                  size="x-small"
                  :color="task.urgency_level === 'CRITICAL' ? 'error' : 'warning'"
                  variant="flat"
                  class="font-weight-black"
                >
                  {{ task.urgency_level === 'CRITICAL' ? 'عاجل جداً' : 'هام' }}
                </v-chip>
              </div>
              <h4 class="font-weight-black text-pure-black text-body-2 mb-2 line-clamp-1">
                {{ task.title }}
              </h4>
              <p class="text-caption text-pure-black font-weight-black mb-4 line-clamp-2 min-h-32">
                {{ task.description || 'بدون وصف.' }}
              </p>
              <div class="d-flex justify-space-between align-center border-t border-dashed pt-3">
                <span class="text-caption font-weight-black text-error"
                  >مستحق: {{ task.due_date }}</span
                >
                <v-btn
                  size="x-small"
                  variant="text"
                  color="accent"
                  class="font-weight-bold"
                  :append-icon="ICONS.UI.CHEVRON_LEFT"
                  @click="router.push('/tasks')"
                  >التفاصيل</v-btn
                >
              </div>
            </v-card>
          </v-col>
          <v-col v-if="urgentTasks.length === 0" cols="12">
            <v-empty-state
              :icon="ICONS.STATUS.SUCCESS"
              title="لا يوجد مهام عاجلة"
              class="bg-white rounded-xl border"
            ></v-empty-state>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- 3. PERIODIC FOLLOW-UP -->
      <v-window-item value="followup">
        <v-row>
          <v-col cols="12" md="6">
            <v-card class="rounded-xl border bg-white shadow-sm overflow-hidden" elevation="0">
              <v-toolbar color="grey-lighten-4" flat height="48" class="px-4">
                <LucideIcon :name="ICONS.STATUS.PENDING" color="primary" class="me-2" :size="20" />
                <div class="text-subtitle-2 font-weight-black text-pure-black">
                  متابعة مدد الاعتراض النشطة
                </div>
              </v-toolbar>
              <v-list class="pa-0">
                <v-list-item
                  v-for="obj in activeObjections"
                  :key="obj.id"
                  class="px-4 py-3 border-b"
                >
                  <v-list-item-title class="font-weight-black text-pure-black text-body-2 mb-1">{{
                    obj.client_name
                  }}</v-list-item-title>
                  <v-list-item-subtitle class="text-caption font-weight-black text-pure-black"
                    >حكم رقم: {{ obj.judgment_number }}</v-list-item-subtitle
                  >
                  <template #append>
                    <v-chip
                      size="small"
                      :color="getObjectionColor(obj)"
                      variant="flat"
                      class="font-weight-black px-4"
                    >
                      متبقي {{ getRemainingDays(obj) }} يوم
                    </v-chip>
                  </template>
                </v-list-item>
                <v-list-item
                  v-if="activeObjections.length === 0"
                  class="text-center py-8 text-grey text-caption"
                  >لا توجد مواعيد اعتراض حالية.</v-list-item
                >
              </v-list>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <!-- Timeline or other follow-ups -->
            <EnforcementTimeline :items="awaitingEnforcement" />
          </v-col>
        </v-row>
      </v-window-item>
    </v-window>

    <!-- RECORD OUTCOME MODAL -->
    <PremiumModal
      v-model="outcomeModal.show"
      title="رصد نتيجة الجلسة الإجرائية"
      subtitle="سيتم تحديث حالة القضية بناءً على النتيجة المدخلة فوراً"
      :icon="ICONS.SYSTEM.GAVEL"
      save-label="تثبيت النتيجة الآن"
      :loading="loading"
      @save="submitOutcome"
    >
      <v-row dense>
        <v-col cols="12">
          <div class="text-subtitle-2 font-weight-black text-gold mb-3">
            ما هي نتيجة الجلسة النهائية؟
          </div>
          <v-select
            v-model="outcomeModal.result"
            :items="SESSION_OUTCOMES"
            variant="outlined"
            placeholder="اختر النتيجة من القائمة..."
            density="comfortable"
            class="rounded-xl premium-select"
            hide-details
          ></v-select>
        </v-col>

        <v-col v-if="outcomeModal.result === 'شطب الدعوى / انقطاع'" cols="12" class="mt-4">
          <div class="text-subtitle-2 font-weight-black text-gold mb-3">قرار الشطب / الانقطاع</div>
          <v-select
            v-model="outcomeModal.dismissalDecision"
            :items="['إعادة القيد', 'إغلاق نهائي']"
            variant="outlined"
            density="comfortable"
            class="rounded-xl"
            hide-details
          >
            <template #prepend-inner>
              <LucideIcon name="help-circle" :size="20" class="text-primary me-2" />
            </template>
          </v-select>
        </v-col>

        <v-col v-if="outcomeModal.result === 'تبليغ / إجراء إداري'" cols="12" class="mt-4">
          <div class="text-subtitle-2 font-weight-black text-gold mb-3">بيانات التبليغ</div>
          <v-text-field
            v-model="outcomeModal.serviceDate"
            type="date"
            variant="outlined"
            density="comfortable"
            class="rounded-xl"
            hide-details
          >
            <template #prepend-inner>
              <LucideIcon :name="ICONS.SYSTEM.CALENDAR" :size="20" class="text-primary me-2" />
            </template>
          </v-text-field>
        </v-col>

        <v-col
          v-if="
            outcomeModal.result === 'صدور حكم قطعي' || outcomeModal.result === 'صدور حكم ابتدائي'
          "
          cols="12"
          class="mt-4"
        >
          <div class="text-subtitle-2 font-weight-black text-primary mb-3">
            بيانات الحكم القضائي
          </div>
          <v-text-field
            v-model="outcomeModal.judgmentNumber"
            label="رقم الحكم"
            variant="outlined"
            density="comfortable"
            class="rounded-xl"
          >
            <template #prepend-inner>
              <LucideIcon :name="ICONS.ENTITY.DOCUMENT" :size="20" class="text-primary me-2" />
            </template>
          </v-text-field>
        </v-col>

        <v-col cols="12" class="mt-4">
          <div class="text-subtitle-2 font-weight-black text-primary mb-3">
            {{
              outcomeModal.result === 'أخرى' ? 'سبب النتيجة (مطلوب)' : 'ملاحظات إضافية (اختياري)'
            }}
          </div>
          <v-textarea
            v-model="outcomeModal.notes"
            rows="3"
            variant="outlined"
            :placeholder="
              outcomeModal.result === 'أخرى'
                ? 'اكتب سبب النتيجة...'
                : 'اكتب أي ملاحظات فنية أو إجرائية هنا...'
            "
            class="rounded-xl"
            hide-details
          ></v-textarea>
        </v-col>
      </v-row>
    </PremiumModal>

    <!-- UI Feedbacks -->
    <v-snackbar v-model="prepSnackbar" color="success" rounded="pill" elevation="12"
      ><LucideIcon :name="ICONS.STATUS.SUCCESS" class="me-2" :size="20" />تم تسجيل تحضير الجلسة
      بنجاح.</v-snackbar
    >
    <v-snackbar v-model="cleanSnackbar.show" :color="cleanSnackbar.color" rounded="pill">{{
      cleanSnackbar.text
    }}</v-snackbar>

    <ConfirmDialog
      v-model="confirmDialog.show"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :color="confirmDialog.color"
      :confirm-button-color="confirmDialog.confirmButtonColor"
      :icon="confirmDialog.icon"
      :confirm-text="confirmDialog.confirmText"
      :cancel-text="confirmDialog.cancelText"
      :loading="confirmDialog.loading"
      @confirm="confirmDialog.action"
    />

    <v-dialog v-model="enforcementConfirmDialog.show" max-width="450" persistent>
      <v-card class="rounded-xl pa-6 text-center">
        <LucideIcon name="badge-check" color="success" :size="64" class="mb-4 mx-auto" />
        <h3 class="text-h5 font-weight-black mb-2 text-primary">تم إصدار حكم قطعي</h3>
        <p class="text-body-2 text-grey-darken-1 mb-8">
          هل ترغب في فتح ملف **تنفيذ** لهذا السند الآن؟
        </p>
        <div class="d-flex gap-4">
          <v-btn
            variant="text"
            color="grey"
            class="flex-grow-1 font-weight-black"
            @click="handleEnforcementChoice(false)"
            >القضية منتهية</v-btn
          >
          <v-btn
            color="success"
            variant="flat"
            class="flex-grow-1 font-weight-black rounded-lg"
            @click="handleEnforcementChoice(true)"
            >نعم، اذهب للتنفيذ</v-btn
          >
        </div>
      </v-card>
    </v-dialog>

    <v-dialog v-model="printPreviewDialog" width="90%" max-width="980" scrollable>
      <v-card class="rounded-xl overflow-hidden">
        <v-toolbar color="primary" height="64" class="px-4">
          <LucideIcon name="printer" :size="18" class="me-2 text-white" />
          <v-toolbar-title class="text-white font-weight-black">معاينة التقرير</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon variant="text" color="white" @click="printPreviewDialog = false">
            <LucideIcon :name="ICONS.UI.CLOSE" />
          </v-btn>
        </v-toolbar>
        <v-card-text class="pa-0">
          <iframe v-if="printPreviewHtml" class="print-preview-frame" :srcdoc="printPreviewHtml" />
          <div v-else class="pa-8 text-center text-grey-darken-1">لا توجد معاينة متاحة.</div>
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
            @click="printFromPreview"
          >
            طباعة
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { safeArray } from '../utils/safe'
import { SESSION_OUTCOMES } from '../utils/legalConstants'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import { useConfirmDialog } from '../composables/useConfirmDialog'

// New Components
import UrgentSessionsTable from '../components/briefing/UrgentSessionsTable.vue'
import EnforcementTimeline from '../components/briefing/EnforcementTimeline.vue'
import PremiumModal from '../components/common/PremiumModal.vue'
import DailyProgress from '../components/briefing/DailyProgress.vue'
import DashboardKpiCards from '../components/briefing/DashboardKpiCards.vue'
import LucideIcon from '../components/common/LucideIcon.vue'
import { ICONS } from '../config/icons'

const router = useRouter()
const activeTab = ref('overview')
const loading = ref(true)

// Data state
const actionRequired = ref<any[]>([])
const todaySessions = ref<any[]>([])
const urgentTasks = ref<any[]>([])
const activeObjections = ref<any[]>([])
const awaitingEnforcement = ref<any[]>([])
const totalSessionsPrepared = ref(0)
const preparedIds = new Set()

const prepSnackbar = ref(false)
const bulkCleaning = ref(false)
const cleanSnackbar = ref({ show: false, text: '', color: 'success' })
const enforcementConfirmDialog = ref({ show: false, caseId: null as string | null })
const printPreviewDialog = ref(false)
const printPreviewHtml = ref('')
const printingReport = ref(false)

const { confirmDialog, openConfirm, closeConfirm } = useConfirmDialog()

const outcomeModal = ref({
  show: false,
  session: null as any,
  result: '',
  notes: '',
  dismissalDecision: '',
  serviceDate: '',
  judgmentType: 'ابتدائي',
  isExecutable: false,
  judgmentNumber: '',
  judgmentDate: new Date().toLocaleDateString('en-CA'),
  objectionDays: 30
})

const translatePlanItem = (k: string): string => {
  const key = String(k || '').trim()
  const map: Record<string, string> = {
    session: 'الجلسة الحالية',
    next_session: 'جلسة جديدة',
    task_reminder: 'مهمة تذكير',
    task_schedule_next_session: 'مهمة: تحديد موعد الجلسة القادمة',
    task_followup: 'مهمة متابعة',
    task_enforcement: 'مهمة تنفيذ',
    task_decision: 'مهمة قرار مطلوب',
    task_service_followup: 'مهمة متابعة تبليغ',
    judgment_final: 'تسجيل حكم قطعي',
    followup_action: 'إجراء متابعة'
  }
  return map[key] || key
}

const todayFormatted = computed(() => {
  return new Intl.DateTimeFormat('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date())
})

const pendingSessionsCount = computed(() => {
  return (
    safeArray(todaySessions.value).filter((s: any) => s.status !== 'منتهية').length +
    actionRequired.value.length
  )
})

const completionRate = computed((): number => {
  const tArr = safeArray(todaySessions.value)
  const aArr = safeArray(actionRequired.value)
  const total = tArr.length + aArr.length
  if (total === 0) return 100
  const done = tArr.filter((s: any) => s && s.status === 'منتهية').length
  return Math.round((done / total) * 100)
})

const sessions = computed(() => [
  ...safeArray(todaySessions.value),
  ...safeArray(actionRequired.value)
])

async function loadSummary(): Promise<void> {
  loading.value = true
  try {
    const summary = await (window as any).api.briefing.getSummary()
    if (summary) {
      actionRequired.value = safeArray(summary.actionRequired)
      todaySessions.value = safeArray(summary.todaySessions)
      urgentTasks.value = safeArray(summary.urgentTasks)
      activeObjections.value = safeArray(summary.activeObjections)
      awaitingEnforcement.value = safeArray(summary.awaitingEnforcement)
    }
  } finally {
    loading.value = false
  }
}

function prepareSession(session: Record<string, any>): void {
  if (session.najiz_url) (window as any).api.cases.openNajizUrl(session.najiz_url)
  if (session.folder_link) (window as any).api.cases.openFolder(session.folder_link)
  if (!preparedIds.has(session.id)) {
    preparedIds.add(session.id)
    totalSessionsPrepared.value++
    prepSnackbar.value = true
  }
}

function openOutcomeModal(session: Record<string, any>): void {
  outcomeModal.value = {
    show: true,
    session,
    result: '',
    notes: '',
    dismissalDecision: '',
    serviceDate: '',
    judgmentType: 'ابتدائي',
    isExecutable: false,
    judgmentNumber: '',
    judgmentDate: new Date().toLocaleDateString('en-CA'),
    objectionDays: 30
  }
}

const toFriendlyError = (msg: string): string => {
  const s = String(msg || '')
  if (s.includes('Error invoking remote method'))
    return 'حدث خطأ أثناء تنفيذ العملية. يرجى المحاولة مرة أخرى.'
  if (s.includes('SqliteError')) return 'حدث خطأ في قاعدة البيانات أثناء تثبيت النتيجة.'
  return s
}

async function submitOutcome(): Promise<void> {
  const result = outcomeModal.value.result
  if (!result || !outcomeModal.value.session) return

  loading.value = true
  try {
    const payload: Record<string, any> = {
      session_id: outcomeModal.value.session.id,
      result,
      notes: outcomeModal.value.notes
    }
    if (result === 'صدور حكم قطعي' || result === 'صدور حكم ابتدائي') {
      const isFinal = result === 'صدور حكم قطعي'
      payload.judgmentData = {
        judgment_number: outcomeModal.value.judgmentNumber,
        judgment_type: isFinal ? 'قطعي' : 'ابتدائي',
        is_executable: outcomeModal.value.isExecutable || isFinal,
        objection_period_days: outcomeModal.value.objectionDays,
        judgment_date: outcomeModal.value.judgmentDate
      }
    }
    if (result === 'شطب الدعوى / انقطاع') {
      payload.dismissalDecision = outcomeModal.value.dismissalDecision
    }
    if (result === 'تبليغ / إجراء إداري') {
      payload.serviceData = {
        date: outcomeModal.value.serviceDate,
        notes: outcomeModal.value.notes || ''
      }
    }

    const api = (window as any).api

    // Use smart analysis engine (cloud) or desktop workflow
    if (api.sessionOutcome?.preview) {
      const previewRes = await api.sessionOutcome.preview({
        result,
        judgmentData: payload.judgmentData,
        notes: outcomeModal.value.notes,
        caseType: ''
      })
      const analysis = previewRes?.analysis
      const taskList = safeArray(analysis?.tasks).map((t: any) => t.title)
      const msg = `التحليل الذكي:\n${analysis?.summary || ''}\n\nسيتم إنشاء المهام التالية:\n${taskList.length ? taskList.map((t: string) => `• ${t}`).join('\n') : '(لا توجد مهام)'}\n\nهل تريد المتابعة؟`

      openConfirm({
        title: 'تأكيد مسار الإجراء',
        message: msg,
        color: 'primary',
        confirmButtonColor: 'primary',
        icon: ICONS.SYSTEM.BRAIN,
        confirmText: 'موافق',
        cancelText: 'إلغاء',
        action: async () => {
          confirmDialog.value.loading = true
          try {
            const applied = await api.sessionOutcome.apply({
              session_id: outcomeModal.value.session.id,
              result,
              notes: outcomeModal.value.notes,
              judgmentData: payload.judgmentData
            })
            outcomeModal.value.show = false
            await loadSummary()
            const tasks = applied?.analysis?.tasks || []
            const taskCount = tasks.length
            cleanSnackbar.value = {
              show: true,
              text: taskCount > 0 ? `تم تسجيل النتيجة وإنشاء ${taskCount} مهام ذكية.` : 'تم تسجيل النتيجة بنجاح.',
              color: 'success'
            }
            closeConfirm()
          } catch (e: unknown) {
            cleanSnackbar.value = { show: true, text: 'فشل تثبيت النتيجة: ' + toFriendlyError((e as Error).message), color: 'error' }
          } finally {
            confirmDialog.value.loading = false
          }
        }
      })
    } else {
      // Desktop workflow fallback
      const previewRes = await api.workflow.previewDecision({ sessionId: outcomeModal.value.session.id, resultLabel: result, inputs: payload })
      const missing = safeArray(previewRes?.missing)
      if (missing.length > 0) {
        cleanSnackbar.value = { show: true, text: 'بيانات مطلوبة: ' + missing.map((m: any) => m?.label).filter(Boolean).join('، '), color: 'error' }
        return
      }
      const p = previewRes?.preview || null
      const closeList = safeArray(p?.preview?.closes).map((x: any) => translatePlanItem(String(x)))
      const createList = safeArray(p?.preview?.creates).map((x: any) => translatePlanItem(String(x)))
      const msg = `سيتم تنفيذ التالي عند تثبيت النتيجة:\n\n${closeList.length ? `- إغلاق: ${closeList.join('، ')}\n` : ''}${createList.length ? `- إنشاء: ${createList.join('، ')}\n` : ''}\nهل تريد المتابعة?`

      openConfirm({
        title: 'تأكيد مسار الإجراء',
        message: msg,
        color: 'primary',
        confirmButtonColor: 'primary',
        icon: ICONS.SYSTEM.TIMELINE,
        confirmText: 'موافق',
        cancelText: 'إلغاء',
        action: async () => {
          confirmDialog.value.loading = true
          try {
            const applied = await api.workflow.applyDecision({ sessionId: outcomeModal.value.session.id, resultLabel: result, inputs: payload })
            outcomeModal.value.show = false
            await loadSummary()
            const next = applied?.next
            if (next?.type === 'ui' && next?.route) router.push({ path: next.route, query: next.query || {} })
            cleanSnackbar.value = { show: true, text: 'تم تحديث ملف القضية بنجاح.', color: 'success' }
            closeConfirm()
          } catch (e: unknown) {
            cleanSnackbar.value = { show: true, text: 'فشل تثبيت النتيجة: ' + toFriendlyError((e as Error).message), color: 'error' }
          } finally {
            confirmDialog.value.loading = false
          }
        }
      })
    }
  } finally {
    loading.value = false
  }
}

async function confirmBulkClose(): Promise<void> {
  const thresholdDays = 15
  try {
    const preview = await (window as any).api.admin.maintenance.bulkClosePreview(thresholdDays)
    const sessions = preview?.sessions || {
      totalOverdue: 0,
      overdueGEThreshold: 0,
      overdueLTThreshold: 0
    }
    const tasks = preview?.tasks || {
      totalOverdue: 0,
      overdueGEThreshold: 0,
      overdueLTThreshold: 0,
      staleNoDueDateGEThreshold: 0
    }

    openConfirm({
      title: 'إغلاق إجباري للمهام المتأخرة في الأرشيف',
      message:
        `سيتم إغلاق وأرشفة العناصر المتأخرة التالية بشكل إجباري:\n\n` +
        `- الجلسات المتأخرة: ${sessions.totalOverdue} (≥ ${thresholdDays} يوم: ${sessions.overdueGEThreshold}، < ${thresholdDays} يوم: ${sessions.overdueLTThreshold})\n` +
        `- المهام المتأخرة: ${tasks.totalOverdue} (≥ ${thresholdDays} يوم: ${tasks.overdueGEThreshold}، < ${thresholdDays} يوم: ${tasks.overdueLTThreshold})\n` +
        (tasks.staleNoDueDateGEThreshold
          ? `- مهام بدون تاريخ استحقاق (قديمة): ${tasks.staleNoDueDateGEThreshold}\n`
          : '') +
        `\nتحذير: لا يمكن التراجع عن هذا الإجراء.`,
      color: 'warning',
      confirmButtonColor: 'primary',
      icon: ICONS.STATUS.WARNING,
      confirmText: 'موافق',
      cancelText: 'إلغاء الأمر',
      action: async () => {
        confirmDialog.value.loading = true
        bulkCleaning.value = true
        try {
          const res = await (window as any).api.admin.maintenance.bulkClose(thresholdDays)
          await loadSummary()
          cleanSnackbar.value = {
            show: true,
            text: `تم تنفيذ الإغلاق الإجباري بنجاح (الإجمالي: ${res?.total ?? 0}).`,
            color: 'success'
          }
          closeConfirm()
        } catch (e: unknown) {
          cleanSnackbar.value = {
            show: true,
            text: 'فشلت عملية الإغلاق الإجباري: ' + (e as Error).message,
            color: 'error'
          }
        } finally {
          bulkCleaning.value = false
          confirmDialog.value.loading = false
        }
      }
    })
  } catch (e: unknown) {
    cleanSnackbar.value = {
      show: true,
      text: 'تعذر قراءة معاينة الإغلاق: ' + (e as Error).message,
      color: 'error'
    }
  }
}

function handleEnforcementChoice(goNow: boolean): void {
  const caseId = enforcementConfirmDialog.value.caseId
  enforcementConfirmDialog.value.show = false
  if (goNow && caseId) router.push({ path: '/enforcement', query: { case_id: caseId } })
}

function goToEnforcement(enf: Record<string, any>): void {
  router.push({ path: '/enforcement', query: { case_id: enf.case_id } })
}

function getRemainingDays(obj: Record<string, any>): number {
  const diff = new Date(obj.objection_deadline).getTime() - new Date().getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function getObjectionColor(obj: Record<string, any>): string {
  const days = getRemainingDays(obj)
  if (days <= 3) return 'error'
  if (days <= 7) return 'warning'
  return 'primary'
}

async function generateBriefingPrint(): Promise<void> {
  try {
    printPreviewHtml.value = ''
    printPreviewDialog.value = true
    printPreviewHtml.value = await (window as any).api.reports.getPreviewHtml({
      type: 'operations',
      params: {}
    })
  } catch (e: unknown) {
    cleanSnackbar.value = {
      show: true,
      text: 'تعذر فتح معاينة التقرير: ' + (e as Error).message,
      color: 'error'
    }
    printPreviewDialog.value = false
  }
}

async function printFromPreview(): Promise<void> {
  if (printingReport.value) return
  printingReport.value = true
  try {
    const ok = await (window as any).api.reports.printReport({ type: 'operations', params: {} })
    cleanSnackbar.value = ok
      ? { show: true, text: 'تم إرسال التقرير للطباعة', color: 'success' }
      : { show: true, text: 'فشلت الطباعة أو تم إلغاؤها', color: 'error' }
  } catch (e: unknown) {
    cleanSnackbar.value = {
      show: true,
      text: 'تعذر الطباعة: ' + (e as Error).message,
      color: 'error'
    }
  } finally {
    printingReport.value = false
  }
}

onMounted(() => {
  loadSummary().catch((e) => console.error('Failed to load summary:', e))
})
</script>

<style scoped>
.briefing-container {
  min-height: 100vh;
  background: transparent !important;
}

.print-preview-frame {
  width: 100%;
  height: 72vh;
  border: 0;
  display: block;
  background: #ffffff;
}

.header-icon-box {
  transition: var(--transition-premium);
}

.modern-tabs {
  border-bottom: 0 !important;
}

.modern-tabs :deep(.v-tab) {
  text-transform: none;
  transition: var(--transition-premium);
}

.modern-tabs :deep(.v-tab--selected) {
  background: var(--accent-alpha) !important;
  color: var(--accent) !important;
}

.glass-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border) !important;
}

.glass-card-noir {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.agenda-card {
  border: 1px solid var(--glass-border) !important;
  transition: var(--transition-premium);
}

.premium-hover:hover {
  transform: translateY(-4px);
  border-color: var(--accent) !important;
  box-shadow: var(--shadow-premium);
}

.time-side {
  width: 120px;
  background: rgba(0, 0, 0, 0.02);
}

.bg-error-alpha {
  background: rgba(220, 38, 38, 0.05);
}

.tracking-tight {
  letter-spacing: -0.025em;
}

.tracking-widest {
  letter-spacing: 0.1em;
}

.leading-relaxed {
  line-height: 1.625;
}

.empty-premium {
  padding: 80px 0;
  border: 2px dashed rgba(0, 0, 0, 0.05);
  border-radius: 24px;
}

.border-accent {
  border: 1px solid var(--accent) !important;
}

.shadow-premium {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08) !important;
}

/* ====================================================
   MOBILE STYLES — max-width: 1023px ONLY
   Desktop (≥1024px) is completely untouched
   ==================================================== */
@media (max-width: 1023px) {
  /* Header: stack button below title */
  :deep(.v-row.mb-6.align-center.px-3) {
    flex-wrap: wrap !important;
  }
  :deep(.v-row.mb-6.align-center.px-3 > .v-col-auto) {
    flex: 0 0 100% !important;
    max-width: 100% !important;
    padding-top: 0 !important;
  }
  :deep(.v-row.mb-6.align-center.px-3 > .v-col-auto .v-btn) {
    width: 100% !important;
  }

  /* Tabs: horizontal scroll */
  :deep(.modern-tabs .v-tabs__content) {
    overflow-x: auto !important;
    flex-wrap: nowrap !important;
  }
  :deep(.v-tab) {
    white-space: nowrap !important;
    min-width: auto !important;
  }

  /* Agenda card on mobile: stack time + content vertically */
  :deep(.agenda-card .v-row.no-gutters) {
    flex-direction: column !important;
  }
  :deep(.agenda-card .time-side) {
    border-radius: 0 !important;
    padding: 12px 16px !important;
    flex-direction: row !important;
    justify-content: flex-start !important;
    gap: 12px !important;
  }

  /* Urgent tasks: 1 per row */
  :deep(.section-gap > .v-col-md-4) {
    flex: 0 0 100% !important;
    max-width: 100% !important;
  }

  /* Follow-up columns: full width */
  :deep(.v-window-item .v-row > .v-col-md-6) {
    flex: 0 0 100% !important;
    max-width: 100% !important;
  }

  /* Action buttons in session card: wrap */
  :deep(.d-flex.gap-3.justify-end) {
    flex-wrap: wrap !important;
  }
  :deep(.d-flex.gap-3.justify-end .v-btn) {
    flex: 1 1 auto !important;
    min-width: 120px !important;
  }

  /* Print preview dialog: full screen */
  :deep(.print-preview-frame) {
    width: 100% !important;
    height: 60vh !important;
  }

  /* Container padding */
  .briefing-container {
    padding: 8px !important;
  }
}
</style>
