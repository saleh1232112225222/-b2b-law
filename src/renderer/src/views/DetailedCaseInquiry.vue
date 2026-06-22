<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <!-- Search Header -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="search-code" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">الاستعلام التفصيلي عن قضية</h1>
            <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
              استعراض شامل لبيانات القضية، الجلسات، الأطراف، والوضع المالي
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

    <v-card elevation="0" class="glass-card pa-8 mb-8 border-gold border-opacity-30 border-2 glass-card">
      <v-row dense class="align-center">
        <v-col cols="12" md="8">
          <v-autocomplete
            v-model="caseId"
            :items="caseOptions"
            :loading="loadingCases"
            label="ابحث برقم القضية أو اسم الموكل..."
            variant="outlined"
            class="glass-input glass-input"
            hide-details
            clearable
            :menu-props="{ maxHeight: 420, zIndex: 9999 }"
            item-title="title"
            item-value="id"
          >
            <template #prepend-inner>
              <LucideIcon name="search" :size="20" class="text-accent me-2" />
            </template>
          </v-autocomplete>
        </v-col>
        <v-col cols="12" md="4">
          <v-btn
            block
            height="56"
            color="accent"
            variant="flat"
            class="rounded-xl font-weight-black premium-lift text-ebony premium-btn-gold-gradient"
            :loading="loading"
            :disabled="!caseId"
            @click="loadInquiry"
          >
            <LucideIcon name="database" :size="20" class="me-2" /> استعلام شامل وموسع
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <!-- Inquiry Content -->
    <template v-if="report">
      <!-- 1. Basic Data -->
      <v-card
        elevation="0"
        class="glass-card overflow-hidden mb-6 border-gold border-opacity-20 border-2 glass-card"
      >
        <div class="bg-gold-gradient pa-4 text-center font-weight-black text-ebony text-h6">
          بيانات الدعوى الأساسية
        </div>
        <v-card-text class="pa-0 glass-card">
          <v-table density="comfortable" class="glass-table">
            <tbody>
              <tr>
                <td class="text-visible-high font-weight-black">{{ report.case.case_number }}</td>
                <td class="cell-label-noir w-25">تاريخ القيد</td>
                <td class="text-visible-medium font-weight-black">
                  {{ report.case.registration_date || '-' }}
                </td>
              </tr>
              <tr>
                <td class="cell-label-noir">نوع القضية</td>
                <td class="text-visible-medium font-weight-black">
                  {{ report.case.case_type || '-' }}
                </td>
                <td class="cell-label-noir">حالة الدعوى</td>
                <td>
                  <v-chip
                    size="small"
                    color="accent"
                    variant="flat"
                    class="font-weight-black text-ebony px-4"
                  >
                    {{ report.case.status }}
                  </v-chip>
                </td>
              </tr>
              <tr>
                <td class="cell-label-noir">المحكمة</td>
                <td class="text-visible-medium font-weight-black">
                  {{ report.case.court || '-' }}
                </td>
                <td class="cell-label-noir">الدائرة</td>
                <td class="text-visible-medium font-weight-black">
                  {{ report.case.circuit || '-' }}
                </td>
              </tr>
              <tr>
                <td class="cell-label-noir">التصنيف الرئيسي</td>
                <td class="text-visible-medium font-weight-black">
                  {{ report.case.main_classification || '-' }}
                </td>
                <td class="cell-label-noir">التصنيف الفرعي</td>
                <td class="text-visible-medium font-weight-black">
                  {{ report.case.sub_classification || '-' }}
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>

      <!-- Expandable Sections -->
      <div v-for="section in expandableSections" :key="section.key" class="mb-4">
        <v-card
          elevation="0"
          class="glass-card overflow-hidden border-gold border-opacity-10 border-1 transition-all glass-card"
          :class="{ 'border-opacity-40': section.open }"
        >
          <!-- Trigger Bar -->
          <div
            class="pa-5 d-flex align-center cursor-pointer hover-accent"
            :class="{ 'glass-panel-light': section.open }"
            @click="section.open = !section.open"
          >
            <LucideIcon :name="getSectionIcon(section.key)" :size="20" class="text-accent me-4" />
            <span class="text-h6 font-weight-black text-visible-high">{{ section.title }}</span>
            <v-spacer />
            <div class="glass-panel-light pa-1 rounded-circle">
              <LucideIcon
                :name="section.open ? 'chevron-up' : 'chevron-down'"
                :size="20"
                class="text-gold"
              />
            </div>
          </div>

          <v-expand-transition>
            <div v-show="section.open">
              <v-divider class="border-gold opacity-10" />
              <v-card-text class="pa-8 glass-card">
                <!-- Topic -->
                <div
                  v-if="section.key === 'subject'"
                  class="text-body-1 line-height-relaxed text-gold opacity-80 text-justify font-weight-medium"
                >
                  {{ report.case.subject || 'لم يتم تدوين موضوع الدعوى.' }}
                </div>

                <!-- Parties -->
                <div v-if="section.key === 'parties'">
                  <v-table
                    density="comfortable"
                    class="glass-table border border-gold border-opacity-10 rounded-xl overflow-hidden"
                  >
                    <thead>
                      <tr>
                        <th class="text-right text-gold font-weight-black">الاسم</th>
                        <th class="text-right text-gold font-weight-black">الصفة</th>
                        <th class="text-right text-gold font-weight-black">الرقم المدني</th>
                        <th class="text-right text-gold font-weight-black">الجنسية</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr class="premium-hover-row">
                        <td class="font-weight-black text-accent">{{ report.case.client_name }}</td>
                        <td class="text-white">{{ report.case.client_role || 'موكل' }}</td>
                        <td class="text-white font-mono">{{ report.case.id_number || '-' }}</td>
                        <td class="text-white">{{ report.case.nationality || 'سعودي' }}</td>
                      </tr>
                      <tr class="premium-hover-row">
                        <td class="font-weight-black text-error">
                          {{ report.case.opponent_name || '-' }}
                        </td>
                        <td class="text-white">خصم</td>
                        <td class="text-white font-mono">{{ report.case.opponent_id || '-' }}</td>
                        <td class="text-white">{{ report.case.opponent_nationality || '-' }}</td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>

                <!-- Sessions -->
                <div v-if="section.key === 'sessions'">
                  <v-table
                    density="comfortable"
                    class="glass-table border border-gold border-opacity-10 rounded-xl overflow-hidden"
                  >
                    <thead>
                      <tr>
                        <th class="text-right text-gold font-weight-black">التاريخ</th>
                        <th class="text-right text-gold font-weight-black">الوقت</th>
                        <th class="text-right text-gold font-weight-black">القاعة</th>
                        <th class="text-right text-gold font-weight-black">الحالة</th>
                        <th class="text-right text-gold font-weight-black">القرار</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="safeLength(report.sessions.rows) === 0">
                        <td colspan="5" class="text-center py-8 text-gold opacity-50">
                          لا توجد جلسات مسجلة
                        </td>
                      </tr>
                      <tr
                        v-for="s in safeArray(report.sessions.rows)"
                        :key="s.id"
                        class="premium-hover-row"
                      >
                        <td class="font-weight-black text-white">{{ s.date }}</td>
                        <td class="text-white">{{ s.time || '-' }}</td>
                        <td class="text-white">{{ s.court_room || '-' }}</td>
                        <td>
                          <v-chip
                            size="x-small"
                            :color="getSessionColor(s.status)"
                            variant="flat"
                            class="font-weight-black"
                          >
                            {{ s.status }}
                          </v-chip>
                        </td>
                        <td class="text-caption text-gold opacity-80">{{ s.result || '-' }}</td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>

                <!-- Judgments -->
                <div v-if="section.key === 'judgments'">
                  <v-table
                    density="comfortable"
                    class="glass-table border border-gold border-opacity-10 rounded-xl overflow-hidden"
                  >
                    <thead>
                      <tr>
                        <th class="text-right text-gold font-weight-black">الحكم</th>
                        <th class="text-right text-gold font-weight-black">تاريخ الحكم</th>
                        <th class="text-right text-gold font-weight-black">الحالة</th>
                        <th class="text-right text-gold font-weight-black">آخر موعد للاعتراض</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="!report.judgments || safeLength(report.judgments.rows) === 0">
                        <td colspan="4" class="text-center py-8 text-gold opacity-50">
                          لا توجد أحكام مسجلة
                        </td>
                      </tr>
                      <tr
                        v-for="j in safeArray(report.judgments?.rows)"
                        :key="j.id"
                        class="premium-hover-row"
                      >
                        <td class="font-weight-black">
                          <v-chip
                            size="small"
                            color="accent"
                            variant="flat"
                            class="font-weight-black text-ebony px-4"
                          >
                            {{ j.type || j.judgment_type || 'حكم' }}
                          </v-chip>
                        </td>
                        <td class="font-weight-black text-white">
                          {{ j.judgment_date || j.created_at?.split('T')[0] || '-' }}
                        </td>
                        <td class="text-white font-weight-bold">{{ j.favor || '-' }}</td>
                        <td class="text-caption text-gold opacity-80">
                          {{ j.objection_deadline || '-' }}
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>

                <!-- Tasks -->
                <div v-if="section.key === 'tasks'">
                  <v-table
                    density="comfortable"
                    class="glass-table border border-gold border-opacity-10 rounded-xl overflow-hidden"
                  >
                    <thead>
                      <tr>
                        <th class="text-right text-gold font-weight-black" style="width: 40%">
                          المهمة / المذكرة
                        </th>
                        <th class="text-right text-gold font-weight-black">تاريخ الاستحقاق</th>
                        <th class="text-right text-gold font-weight-black">الأهمية</th>
                        <th class="text-right text-gold font-weight-black">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="!report.tasks || safeLength(report.tasks.rows) === 0">
                        <td colspan="4" class="text-center py-8 text-gold opacity-50">
                          لا توجد مهام أو مذكرات
                        </td>
                      </tr>
                      <tr
                        v-for="t in safeArray(report.tasks?.rows)"
                        :key="t.id"
                        class="premium-hover-row"
                      >
                        <td class="font-weight-black text-white">
                          <LucideIcon name="calendar-check" :size="16" class="text-accent me-2" />
                          {{ t.title }}
                        </td>
                        <td class="text-white opacity-80 font-weight-medium">
                          {{ t.due_date || '-' }}
                        </td>
                        <td>
                          <v-chip
                            size="x-small"
                            :color="getTaskPriorityColor(t.priority)"
                            variant="flat"
                            class="font-weight-black text-white"
                          >
                            {{ t.priority || 'متوسطة' }}
                          </v-chip>
                        </td>
                        <td>
                          <v-chip
                            size="x-small"
                            :color="getTaskStatusColor(t.status)"
                            variant="flat"
                            class="font-weight-black"
                          >
                            {{ t.status === 'completed' ? 'مكتملة' : 'قيد التنفيذ' }}
                          </v-chip>
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>

                <!-- Memoranda -->
                <div v-if="section.key === 'memoranda'">
                  <v-table
                    density="comfortable"
                    class="glass-table border border-gold border-opacity-10 rounded-xl overflow-hidden"
                  >
                    <thead>
                      <tr>
                        <th class="text-right text-gold font-weight-black">المذكرة</th>
                        <th class="text-right text-gold font-weight-black">التاريخ</th>
                        <th class="text-right text-gold font-weight-black">النوع</th>
                        <th class="text-right text-gold font-weight-black">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="!report.memoranda || safeLength(report.memoranda.rows) === 0">
                        <td colspan="4" class="text-center py-8 text-gold opacity-50">
                          لا توجد مذكرات مسجلة
                        </td>
                      </tr>
                      <tr
                        v-for="m in safeArray(report.memoranda?.rows)"
                        :key="m.id"
                        class="premium-hover-row"
                      >
                        <td class="font-weight-black text-white">{{ m.memo_title }}</td>
                        <td class="text-caption text-gold opacity-80">{{ m.memo_date || '-' }}</td>
                        <td>
                          <v-chip
                            size="x-small"
                            variant="flat"
                            color="accent"
                            class="font-weight-black text-ebony"
                          >
                            {{ m.memo_type || '-' }}
                          </v-chip>
                        </td>
                        <td>
                          <v-chip
                            size="x-small"
                            color="gold"
                            variant="flat"
                            class="font-weight-black text-ebony"
                          >
                            {{ m.memo_status || 'مسودة' }}
                          </v-chip>
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>

                <!-- Procedures -->
                <div v-if="section.key === 'procedures'">
                  <v-table
                    density="comfortable"
                    class="glass-table border border-gold border-opacity-10 rounded-xl overflow-hidden"
                  >
                    <thead>
                      <tr>
                        <th class="text-right text-gold font-weight-black">تاريخ الإجراء</th>
                        <th class="text-right text-gold font-weight-black">الخطوة</th>
                        <th class="text-right text-gold font-weight-black">تمت بواسطة</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="safeLength(report.activity.rows) === 0">
                        <td colspan="3" class="text-center py-8 text-gold opacity-50">
                          لا توجد سجلات إجراءات
                        </td>
                      </tr>
                      <tr
                        v-for="a in safeArray(report.activity.rows)"
                        :key="a.id"
                        class="premium-hover-row"
                      >
                        <td class="text-caption text-gold font-mono">
                          {{ formatDate(a.timestamp) }}
                        </td>
                        <td class="font-weight-black text-white">{{ a.details }}</td>
                        <td class="text-caption font-weight-black text-accent">{{ a.actor }}</td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>

                <!-- Financial -->
                <div v-if="section.key === 'finance'">
                  <v-row dense>
                    <v-col cols="12" md="4">
                      <div
                        class="pa-6 rounded-xl glass-panel-light border border-gold border-opacity-20 text-center"
                      >
                        <div class="text-subtitle-2 font-weight-black text-gold opacity-60 mb-2">
                          إجمالي الإيرادات
                        </div>
                        <div class="text-h5 font-weight-black text-accent">
                          {{ report.kpis.totalIn }} <span class="text-caption">ر.س</span>
                        </div>
                      </div>
                    </v-col>
                    <v-col cols="12" md="4">
                      <div
                        class="pa-6 rounded-xl glass-panel-light border border-gold border-opacity-20 text-center"
                      >
                        <div class="text-subtitle-2 font-weight-black text-gold opacity-60 mb-2">
                          إجمالي المصاريف
                        </div>
                        <div class="text-h5 font-weight-black text-error">
                          {{ report.kpis.totalOut }} <span class="text-caption">ر.س</span>
                        </div>
                      </div>
                    </v-col>
                    <v-col cols="12" md="4">
                      <div
                        class="pa-6 rounded-xl glass-panel-light border border-gold border-opacity-20 text-center"
                      >
                        <div class="text-subtitle-2 font-weight-black text-gold opacity-60 mb-2">
                          صافي الرصيد
                        </div>
                        <div class="text-h5 font-weight-black text-white">
                          {{ report.kpis.balance }} <span class="text-caption">ر.س</span>
                        </div>
                      </div>
                    </v-col>
                  </v-row>
                </div>
              </v-card-text>
            </div>
          </v-expand-transition>
        </v-card>
      </div>

      <!-- Action Button -->
      <div class="d-flex justify-center mt-12 pb-12">
        <v-btn
          color="accent"
          size="x-large"
          class="rounded-xl px-12 font-weight-black premium-lift text-ebony premium-btn-gold-gradient"
          @click="$router.push('/reports')"
        >
          <LucideIcon name="check-circle" :size="24" class="me-2" /> إنهاء العرض والمراجعة
        </v-btn>
      </div>
    </template>

    <!-- Empty State -->
    <div v-else-if="!loading" class="mt-12 text-center">
      <div
        class="glass-card pa-12 rounded-xl d-inline-block border-gold border-opacity-10 border-2"
      >
        <LucideIcon name="search-code" :size="80" class="text-gold opacity-20 mb-6 mx-auto" />
        <h2 class="text-h5 font-weight-black text-gold mb-2">بانتظار رقم الاستعلام</h2>
        <p class="text-subtitle-1 text-gold opacity-60 font-weight-bold">
          يرجى اختيار قضية من القائمة العلوية لعرض ملف الاستعلام التفصيلي.
        </p>
      </div>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="mt-6">
      <v-skeleton-loader
        v-for="i in 3"
        :key="i"
        type="card"
        class="mb-6 rounded-xl glass-card border-gold border-opacity-10"
        color="transparent"
      />
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { safeArray, safeLength } from '../utils/safe'
import LucideIcon from '../components/common/LucideIcon.vue'

const caseId = ref<string | null>(null)
const loading = ref(false)
const loadingCases = ref(false)
const caseOptions = ref<any[]>([])
const report = ref<any>(null)

const expandableSections = ref([
  { key: 'subject', title: 'موضوع الدعوى', open: false },
  { key: 'parties', title: 'بيانات أطراف الدعوى', open: false },
  { key: 'judgments', title: 'أحكام القضية', open: false },
  { key: 'sessions', title: 'الجلسات والمواعيد', open: false },
  { key: 'tasks', title: 'متابعة المذكرات والمهام', open: false },
  { key: 'memoranda', title: 'سجل المذكرات واللوائح المودعة', open: false },
  { key: 'procedures', title: 'سجل إجراءات الدعوى', open: false },
  { key: 'finance', title: 'التقرير المالي للقضية', open: false }
])

const getSectionIcon = (key: string) => {
  switch (key) {
    case 'subject':
      return 'file-text'
    case 'parties':
      return 'users'
    case 'judgments':
      return 'gavel'
    case 'sessions':
      return 'calendar'
    case 'tasks':
      return 'check-square'
    case 'memoranda':
      return 'file-edit'
    case 'procedures':
      return 'list'
    case 'finance':
      return 'banknote'
    default:
      return 'info'
  }
}

const loadOptions = async () => {
  loadingCases.value = true
  try {
    const rows = await (window as any).api.reports.listCases()
    caseOptions.value = safeArray(rows).map((r: any) => ({
      id: r.id,
      title: `${r.case_number} — ${r.client_name || ''}`
    }))
  } catch (e) {
    console.error('Failed to load case options:', e)
  } finally {
    loadingCases.value = false
  }
}

const loadInquiry = async () => {
  if (!caseId.value) return
  loading.value = true
  try {
    const data = await (window as any).api.reports.getCaseReport({
      caseId: caseId.value,
      sections: {
        sessionsPageSize: 50,
        activityPageSize: 50,
        timelinePageSize: 50
      }
    })
    report.value = data
    expandableSections.value[0].open = true
  } catch (e) {
    console.error('Inquiry failed:', e)
  } finally {
    loading.value = false
  }
}

const getSessionColor = (status: string) => {
  if (status?.includes('منتهية')) return 'success'
  if (status?.includes('قادمة')) return 'accent'
  return 'warning'
}

const getTaskPriorityColor = (p: string) => {
  switch (p) {
    case 'عالية':
      return 'error'
    case 'متوسطة':
      return 'warning'
    case 'منخفضة':
      return 'accent'
    default:
      return 'accent'
  }
}

const getTaskStatusColor = (status: string) => {
  if (status === 'completed') return 'success'
  return 'warning'
}

const formatDate = (ts: string) => {
  if (!ts) return '-'
  return ts.split('T')[0]
}

onMounted(() => {
  loadOptions()
})
</script>

<style scoped>
.rtl {
  direction: rtl;
}
.font-mono {
  font-family: 'Consolas', 'Monaco', monospace;
}
.line-height-relaxed {
  line-height: 1.8;
}

.cell-label-noir {
  background: rgba(212, 175, 55, 0.05) !important;
  color: var(--v-theme-gold) !important;
  font-weight: 900 !important;
  width: 20%;
}

.hover-accent:hover {
  background: rgba(212, 175, 55, 0.05) !important;
}

.glass-table {
  background: transparent !important;
}

:deep(.glass-table th) {
  background: rgba(212, 175, 55, 0.05) !important;
  border-bottom: 1px solid rgba(212, 175, 55, 0.1) !important;
}

:deep(.glass-table td) {
  border-bottom: 1px solid rgba(212, 175, 55, 0.05) !important;
}

.w-25 {
  width: 25%;
}
</style>
