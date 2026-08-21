<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <!-- Header -->
    <v-row dense class="mb-6 align-center">
      <v-col cols="12" sm="8">
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-2 rounded-lg me-4 border-gold border-opacity-20">
            <LucideIcon name="clock" :size="24" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h6 font-weight-black text-primary mb-0">تتبع الوقت وساعات العمل</h1>
            <p class="text-caption text-primary font-weight-black opacity-70">
              تسجيل ومراقبة الوقت المستغرق في إنجاز المهام والقضايا للفوترة وحساب التكاليف
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="12" sm="4" class="text-sm-left">
        <v-btn
          color="gold"
          variant="flat"
          class="font-weight-black premium-btn-gold-gradient"
          @click="showManualDialog = true"
        >
          <LucideIcon name="plus" :size="18" class="me-2" /> تسجيل يدوي لوقت سابق
        </v-btn>
      </v-col>
    </v-row>

    <!-- Active Timer Panel -->
    <v-row dense class="mb-6">
      <v-col cols="12">
        <v-card
          elevation="0"
          class="glass-card border border-gold border-opacity-20 relative overflow-hidden"
        >
          <div class="corner-glow top-left"></div>
          <div class="corner-glow bottom-right"></div>

          <v-card-text class="pa-6">
            <v-row dense align="center">
              <v-col cols="12" md="7">
                <div class="text-subtitle-1 font-weight-black text-gold mb-3">
                  مؤقت تسجيل الوقت الحالي
                </div>

                <v-row dense>
                  <v-col cols="12" sm="6">
                    <v-autocomplete
                      v-model="activeTimer.caseId"
                      :items="cases"
                      item-title="caseNumber"
                      item-value="id"
                      label="ربط بقضية (اختياري)"
                      variant="outlined"
                      density="compact"
                      class="glass-input mb-3"
                      hide-details
                      :disabled="timerRunning"
                    >
                      <template #item="{ props, item }">
                        <v-list-item v-bind="props" :subtitle="item.raw.subject"></v-list-item>
                      </template>
                    </v-autocomplete>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-autocomplete
                      v-model="activeTimer.taskId"
                      :items="tasks"
                      item-title="title"
                      item-value="id"
                      label="ربط بمهمة (اختياري)"
                      variant="outlined"
                      density="compact"
                      class="glass-input mb-3"
                      hide-details
                      :disabled="timerRunning"
                    ></v-autocomplete>
                  </v-col>
                </v-row>

                <v-text-field
                  v-model="activeTimer.description"
                  label="وصف تفصيلي للنشاط أو العمل الجاري"
                  variant="outlined"
                  density="compact"
                  class="glass-input mb-3"
                  hide-details
                  :disabled="timerRunning"
                  placeholder="مثال: كتابة مذكرة الجواب، مراجعة المستندات مع العميل..."
                ></v-text-field>
              </v-col>

              <v-col
                cols="12"
                md="5"
                class="d-flex flex-column align-center justify-center py-4 border-r-md"
              >
                <!-- Clock Display -->
                <div class="timer-display mb-4 font-weight-bold text-h3 text-gold text-mono">
                  {{ formattedElapsedTime }}
                </div>

                <v-btn
                  v-if="!timerRunning"
                  color="success"
                  height="48"
                  min-width="180"
                  class="font-weight-black premium-lift rounded-xl"
                  @click="startTimer"
                >
                  <LucideIcon name="play" :size="18" class="me-2" /> بدء المؤقت الآن
                </v-btn>
                <v-btn
                  v-else
                  color="error"
                  height="48"
                  min-width="180"
                  class="font-weight-black premium-lift rounded-xl"
                  @click="stopTimer"
                >
                  <LucideIcon name="square" :size="18" class="me-2" /> إيقاف وحفظ المدة
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- History / Logs Table -->
    <v-row dense>
      <v-col cols="12">
        <v-card elevation="0" class="glass-card border border-gold border-opacity-20">
          <div
            class="pa-4 d-flex align-center border-b border-gold border-opacity-10 justify-space-between flex-wrap gap-2"
          >
            <div class="d-flex align-center">
              <LucideIcon name="history" :size="20" class="text-gold me-3" />
              <span class="text-subtitle-1 font-weight-black text-primary"
                >سجل أوقات العمل السابقة</span
              >
            </div>
            <div class="d-flex align-center gap-2">
              <v-btn
                icon
                density="comfortable"
                variant="text"
                color="primary"
                :loading="loadingLogs"
                @click="fetchLogs"
              >
                <LucideIcon name="refresh-cw" :size="16" />
              </v-btn>
            </div>
          </div>

          <v-data-table
            :headers="headers"
            :items="logs"
            :loading="loadingLogs"
            loading-text="جاري تحميل سجلات الوقت..."
            no-data-text="لا توجد سجلات وقت محفوظة"
            class="glass-table text-right"
            density="compact"
          >
            <template #item.startTime="{ item }">
              {{ formatDate(item.startTime) }}
            </template>
            <template #item.endTime="{ item }">
              {{ item.endTime ? formatDate(item.endTime) : 'قيد التشغيل' }}
            </template>
            <template #item.durationMinutes="{ item }">
              <span class="font-weight-bold text-gold">{{
                formatMinutes(item.durationMinutes)
              }}</span>
            </template>
            <template #item.caseNumber="{ item }">
              <span v-if="item.caseNumber" class="text-caption text-primary"
                >قضية رقم: {{ item.caseNumber }}</span
              >
              <span v-else class="text-caption text-grey">—</span>
            </template>
            <template #item.isBilled="{ item }">
              <v-chip
                :color="item.isBilled ? 'success' : 'warning'"
                size="x-small"
                class="font-weight-black"
              >
                {{ item.isBilled ? 'تمت الفوترة' : 'مستحق للفوترة' }}
              </v-chip>
            </template>
            <template #item.actions="{ item }">
              <v-btn
                v-if="!item.isBilled"
                icon
                density="comfortable"
                variant="text"
                color="error"
                @click="deleteLog(item.id)"
              >
                <LucideIcon name="trash-2" :size="16" />
              </v-btn>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Manual Log Dialog -->
    <v-dialog v-model="showManualDialog" max-width="600" persistent>
      <v-card
        class="premium-glass-card border-gold border-2 rounded-2xl overflow-hidden glass-card"
      >
        <div class="pa-6 bg-gold-gradient text-ebony d-flex align-center">
          <LucideIcon name="clock-alert" :size="24" class="me-3" />
          <span class="text-h6 font-weight-black">تسجيل وقت عمل يدوي سابق</span>
          <v-spacer />
          <v-btn icon variant="text" color="ebony" @click="showManualDialog = false">
            <LucideIcon name="x" :size="24" />
          </v-btn>
        </div>

        <v-card-text class="pa-6 rtl">
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-autocomplete
                v-model="manualForm.caseId"
                :items="cases"
                item-title="caseNumber"
                item-value="id"
                label="ربط بقضية (اختياري)"
                variant="outlined"
                density="compact"
                class="glass-input mb-3"
                hide-details
              ></v-autocomplete>
            </v-col>
            <v-col cols="12" sm="6">
              <v-autocomplete
                v-model="manualForm.taskId"
                :items="tasks"
                item-title="title"
                item-value="id"
                label="ربط بمهمة (اختياري)"
                variant="outlined"
                density="compact"
                class="glass-input mb-3"
                hide-details
              ></v-autocomplete>
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model="manualForm.description"
                label="تفاصيل العمل الجاري"
                variant="outlined"
                density="compact"
                class="glass-input mb-3"
                hide-details
                placeholder="مثال: مراجعة اللائحة الاعتراضية..."
              ></v-text-field>
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="manualForm.startTime"
                label="وقت البدء"
                type="datetime-local"
                variant="outlined"
                density="compact"
                class="glass-input mb-3"
                hide-details
              ></v-text-field>
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="manualForm.endTime"
                label="وقت الانتهاء"
                type="datetime-local"
                variant="outlined"
                density="compact"
                class="glass-input mb-3"
                hide-details
              ></v-text-field>
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model.number="manualForm.durationMinutes"
                label="المدة الإجمالية (بالدقائق - اختياري)"
                type="number"
                variant="outlined"
                density="compact"
                class="glass-input mb-3"
                hide-details
                placeholder="اتركها فارغة ليتم حسابها تلقائياً من وقت البدء والانتهاء"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-alert v-if="manualError" type="error" variant="tonal" density="compact" class="mt-3">
            {{ manualError }}
          </v-alert>
        </v-card-text>

        <v-card-actions class="pa-6 pt-0">
          <v-btn variant="text" color="gold" @click="showManualDialog = false">إلغاء</v-btn>
          <v-spacer />
          <v-btn
            color="gold"
            variant="flat"
            class="px-6 font-weight-black premium-btn-gold-gradient"
            :loading="savingManual"
            @click="submitManualLog"
          >
            حفظ السجل
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import LucideIcon from '../components/common/LucideIcon.vue'
import { unwrapArrayResponse } from '../api/ApiAdapter'

const cases = ref<any[]>([])
const tasks = ref<any[]>([])
const logs = ref<any[]>([])
const loadingLogs = ref(false)
const showManualDialog = ref(false)

// Active Timer State
const timerRunning = ref(false)
const elapsedTime = ref(0) // in seconds
let intervalId: number | undefined
const activeTimer = ref({
  id: '',
  caseId: null as string | null,
  taskId: null as string | null,
  description: ''
})

// Manual Form State
const savingManual = ref(false)
const manualError = ref('')
const manualForm = ref({
  caseId: null as string | null,
  taskId: null as string | null,
  description: '',
  startTime: '',
  endTime: '',
  durationMinutes: null as number | null
})

// Table Headers
const headers = [
  { title: 'التاريخ/وقت البدء', key: 'startTime', align: 'start' as const },
  { title: 'وقت الانتهاء', key: 'endTime', align: 'start' as const },
  { title: 'الموظف', key: 'employeeName', align: 'start' as const },
  { title: 'الوصف والنشاط', key: 'description', align: 'start' as const },
  { title: 'القضية/الموضوع', key: 'caseNumber', align: 'start' as const },
  { title: 'المدة المستغرقة', key: 'durationMinutes', align: 'center' as const },
  { title: 'الحالة', key: 'isBilled', align: 'center' as const },
  { title: 'إجراءات', key: 'actions', sortable: false, align: 'center' as const }
]

// Clock Display Formatter
const formattedElapsedTime = computed(() => {
  const hrs = Math.floor(elapsedTime.value / 3600)
  const mins = Math.floor((elapsedTime.value % 3600) / 60)
  const secs = elapsedTime.value % 60
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
})

// Initialize Data
onMounted(async () => {
  await fetchCasesAndTasks()
  await fetchLogs()
  checkRunningTimer()
})

onUnmounted(() => {
  if (intervalId) window.clearInterval(intervalId)
})

const fetchCasesAndTasks = async () => {
  try {
    const casesData = await (window as any).api.cases.getAll()
    cases.value = unwrapArrayResponse(casesData)

    // Fetch active tasks
    const tasksData = await (window as any).api.tasks.list({ status: 'in_progress' })
    tasks.value = unwrapArrayResponse(tasksData)
  } catch (err) {
    console.error('Failed to fetch filter entities:', err)
  }
}

const fetchLogs = async () => {
  loadingLogs.value = true
  try {
    const data = await (window as any).api.timeTracking.list({})
    logs.value = unwrapArrayResponse(data)
  } catch (err) {
    console.error('Failed to load logs:', err)
  } finally {
    loadingLogs.value = false
  }
}

// Active Timer Logic
const checkRunningTimer = () => {
  const savedTimer = localStorage.getItem('running_timer_details')
  const savedStartTime = localStorage.getItem('running_timer_start')
  if (savedTimer && savedStartTime) {
    activeTimer.value = JSON.parse(savedTimer)
    const start = new Date(savedStartTime).getTime()
    const now = Date.now()
    elapsedTime.value = Math.floor((now - start) / 1000)
    timerRunning.value = true
    startClock()
  }
}

const startClock = () => {
  if (intervalId) window.clearInterval(intervalId)
  intervalId = window.setInterval(() => {
    elapsedTime.value += 1
  }, 1000) as unknown as number
}

const startTimer = async () => {
  try {
    const payload = {
      caseId: activeTimer.value.caseId,
      taskId: activeTimer.value.taskId,
      description: activeTimer.value.description || 'عمل عام'
    }
    const res = await (window as any).api.timeTracking.start(payload)
    if (res.success) {
      activeTimer.value.id = res.id
      timerRunning.value = true
      elapsedTime.value = 0
      localStorage.setItem('running_timer_details', JSON.stringify(activeTimer.value))
      localStorage.setItem('running_timer_start', new Date().toISOString())
      startClock()
    }
  } catch (err: any) {
    alert(err.message || 'فشل تشغيل المؤقت')
  }
}

const stopTimer = async () => {
  try {
    const res = await (window as any).api.timeTracking.stop()
    if (res.success) {
      timerRunning.value = false
      if (intervalId) {
        window.clearInterval(intervalId)
        intervalId = undefined
      }
      elapsedTime.value = 0
      activeTimer.value = { id: '', caseId: null, taskId: null, description: '' }
      localStorage.removeItem('running_timer_details')
      localStorage.removeItem('running_timer_start')
      await fetchLogs()
    }
  } catch (err: any) {
    alert(err.message || 'فشل إيقاف المؤقت')
  }
}

// Manual Logging Logic
const submitManualLog = async () => {
  if (!manualForm.value.description || !manualForm.value.startTime || !manualForm.value.endTime) {
    manualError.value = 'يرجى إدخال الوصف ووقت البدء والانتهاء'
    return
  }
  savingManual.value = true
  manualError.value = ''
  try {
    const res = await (window as any).api.timeTracking.manual({
      caseId: manualForm.value.caseId,
      taskId: manualForm.value.taskId,
      description: manualForm.value.description,
      startTime: manualForm.value.startTime,
      endTime: manualForm.value.endTime,
      durationMinutes: manualForm.value.durationMinutes
    })
    if (res.success) {
      showManualDialog.value = false
      // Reset form
      manualForm.value = {
        caseId: null,
        taskId: null,
        description: '',
        startTime: '',
        endTime: '',
        durationMinutes: null
      }
      await fetchLogs()
    }
  } catch (err: any) {
    manualError.value = err.message || 'فشل حفظ سجل الوقت'
  } finally {
    savingManual.value = false
  }
}

const deleteLog = async (id: string) => {
  if (!confirm('هل أنت متأكد من حذف سجل الوقت هذا؟')) return
  try {
    const res = await (window as any).api.timeTracking.delete(id)
    if (res.success) {
      await fetchLogs()
    }
  } catch (err: any) {
    alert(err.message || 'فشل حذف السجل')
  }
}

// Formatters
const formatDate = (isoString: string) => {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatMinutes = (mins: number) => {
  const m = Number(mins || 0)
  if (m < 60) return `${m} دقيقة`
  const hrs = Math.floor(m / 60)
  const remaining = m % 60
  return remaining > 0 ? `${hrs} ساعة و ${remaining} دقيقة` : `${hrs} ساعة`
}
</script>

<style scoped>
.timer-display {
  letter-spacing: 2px;
  background: rgba(233, 195, 73, 0.05);
  padding: 10px 24px;
  border-radius: 12px;
  border: 1px solid rgba(233, 195, 73, 0.2);
}
.border-r-md {
  border-right: 1px solid rgba(233, 195, 73, 0.15);
}
@media (max-width: 959px) {
  .border-r-md {
    border-right: none !important;
    border-top: 1px solid rgba(233, 195, 73, 0.15);
    margin-top: 15px;
  }
}
</style>
