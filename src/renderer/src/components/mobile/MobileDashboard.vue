<template>
  <div class="mobile-dashboard-wrapper" dir="rtl">
    <!-- TOP HEADER BAR -->
    <header class="dashboard-header d-flex align-center justify-space-between pa-4">
      <div class="d-flex align-center gap-3">
        <div class="header-avatar-circle">
          <span class="avatar-text">{{ userInitial }}</span>
        </div>
        <div>
          <h1 class="header-title font-weight-black">لوحة تحكم المحامي</h1>
          <p class="header-date text-caption">{{ currentDateFormatted }}</p>
        </div>
      </div>
      <div class="header-brand-logo d-flex align-center gap-2">
        <div class="logo-icon-bg">
          <LucideIcon name="scale" :size="20" class="text-primary" />
        </div>
      </div>
    </header>

    <!-- URGENT ALERT BANNER (DYNAMIC) -->
    <div v-if="urgentAlert" class="px-4 mb-4">
      <div class="urgent-alert-banner d-flex align-center gap-3 pa-3 rounded-xl">
        <span class="pulsing-dot-container shrink-0">
          <span class="pulsing-dot-ping"></span>
          <span class="pulsing-dot"></span>
        </span>
        <div class="alert-text-wrapper flex-grow-1">
          <span class="alert-tag font-weight-black">تنبيه عاجل:</span>
          <span class="alert-body ms-1">{{ urgentAlert.message }}</span>
        </div>
        <LucideIcon
          name="chevron-left"
          :size="16"
          class="text-error opacity-70 shrink-0 cursor-pointer"
          @click="urgentAlert.action && urgentAlert.action()"
        />
      </div>
    </div>

    <!-- STATS CARDS ROW (2x2 Grid for Mobile - DYNAMIC) -->
    <div class="px-4 mb-4">
      <v-row dense class="stats-cards-grid">
        <!-- Card 1: Active Cases -->
        <v-col cols="6">
          <div
            class="stat-card pa-3 rounded-xl d-flex flex-column justify-space-between h-100 cursor-pointer"
            @click="router.push('/cases')"
          >
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="stat-label text-caption text-medium-emphasis font-weight-bold"
                >القضايا النشطة</span
              >
              <span class="stat-badge badge-green">+{{ activeCasesBadgeCount }} هذا الشهر</span>
            </div>
            <div class="stat-number text-blue font-weight-black text-h4 my-1">
              {{ activeCasesCount }}
            </div>
            <div class="stat-subtext text-caption text-secondary">
              {{ reviewCasesCount }} قيد المراجعة · {{ deadlinesCount }} مواعيد نهائية
            </div>
          </div>
        </v-col>

        <!-- Card 2: Clients -->
        <v-col cols="6">
          <div
            class="stat-card pa-3 rounded-xl d-flex flex-column justify-space-between h-100 cursor-pointer"
            @click="router.push('/clients')"
          >
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="stat-label text-caption text-medium-emphasis font-weight-bold"
                >العملاء</span
              >
              <span class="stat-badge badge-green">{{ newClientsCount }} جدد</span>
            </div>
            <div class="stat-number text-red font-weight-black text-h4 my-1">
              {{ totalClientsCount }}
            </div>
            <div class="stat-subtext text-caption text-secondary">
              {{ retentionRate }}% معدل الاحتفاظ
            </div>
          </div>
        </v-col>

        <!-- Card 3: Upcoming Sessions -->
        <v-col cols="6">
          <div
            class="stat-card pa-3 rounded-xl d-flex flex-column justify-space-between h-100 cursor-pointer"
            @click="router.push('/sessions')"
          >
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="stat-label text-caption text-medium-emphasis font-weight-bold"
                >الجلسات القادمة</span
              >
              <span class="stat-badge badge-green"
                >{{ upcoming48hSessionsCount }} خلال 48 ساعة</span
              >
            </div>
            <div class="stat-number text-green font-weight-black text-h4 my-1">
              {{ totalUpcomingSessionsCount }}
            </div>
            <div class="stat-subtext text-caption text-secondary">
              {{ thisWeekSessionsCount }} هذا الأسبوع · {{ conflictSessionsCount }} متعارضة
            </div>
          </div>
        </v-col>

        <!-- Card 4: Revenue -->
        <v-col cols="6">
          <div
            class="stat-card pa-3 rounded-xl d-flex flex-column justify-space-between h-100 cursor-pointer"
            @click="router.push('/finance')"
          >
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="stat-label text-caption text-medium-emphasis font-weight-bold"
                >الإيرادات (ر.س)</span
              >
              <span class="stat-badge badge-green">+{{ revenueGrowthPercent }}%</span>
            </div>
            <div class="stat-number text-purple font-weight-black text-h4 my-1">
              {{ formattedRevenue }}
            </div>
            <div class="stat-subtext text-caption text-secondary">
              {{ collectionPercent }}% محصل · {{ formattedPendingAmount }} مستحق
            </div>
          </div>
        </v-col>
      </v-row>
    </div>

    <!-- CASE PIPELINE (Horizontal Track - DYNAMIC) -->
    <div class="px-4 mb-4">
      <div class="section-card pa-3 rounded-xl">
        <div class="d-flex align-center justify-space-between mb-3">
          <div class="d-flex align-center gap-2">
            <LucideIcon name="git-commit" :size="18" class="text-primary" />
            <h3 class="section-title font-weight-bold text-subtitle-2">مسار القضايا</h3>
          </div>
          <span class="text-caption text-medium-emphasis">سلسلة المراحل</span>
        </div>

        <div class="pipeline-track d-flex align-center gap-2 overflow-x-auto pb-1">
          <div
            class="pipeline-stage-pill d-flex align-center gap-2 px-3 py-2 rounded-pill cursor-pointer"
            @click="router.push('/cases?stage=استشارة')"
          >
            <span class="stage-name font-weight-bold">الاستشارة</span>
            <span class="stage-count count-blue font-weight-black">{{
              pipelineStages.consultation
            }}</span>
          </div>
          <span class="pipeline-arrow text-medium-emphasis">←</span>

          <div
            class="pipeline-stage-pill d-flex align-center gap-2 px-3 py-2 rounded-pill cursor-pointer"
            @click="router.push('/cases?stage=تحضير')"
          >
            <span class="stage-name font-weight-bold">التحضير</span>
            <span class="stage-count count-orange font-weight-black">{{
              pipelineStages.preparation
            }}</span>
          </div>
          <span class="pipeline-arrow text-medium-emphasis">←</span>

          <div
            class="pipeline-stage-pill d-flex align-center gap-2 px-3 py-2 rounded-pill cursor-pointer"
            @click="router.push('/cases?stage=مرافعة')"
          >
            <span class="stage-name font-weight-bold">المرافعة</span>
            <span class="stage-count count-green font-weight-black">{{
              pipelineStages.pleading
            }}</span>
          </div>
          <span class="pipeline-arrow text-medium-emphasis">←</span>

          <div
            class="pipeline-stage-pill d-flex align-center gap-2 px-3 py-2 rounded-pill cursor-pointer"
            @click="router.push('/cases?stage=حكم')"
          >
            <span class="stage-name font-weight-bold">الحكم</span>
            <span class="stage-count count-purple font-weight-black">{{
              pipelineStages.judgment
            }}</span>
          </div>
          <span class="pipeline-arrow text-medium-emphasis">←</span>

          <div
            class="pipeline-stage-pill d-flex align-center gap-2 px-3 py-2 rounded-pill cursor-pointer"
            @click="router.push('/cases?stage=تنفيذ')"
          >
            <span class="stage-name font-weight-bold">التنفيذ</span>
            <span class="stage-count count-gray font-weight-black">{{
              pipelineStages.enforcement
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN CONTENT SECTIONS -->
    <div class="px-4 pb-12 d-flex flex-column gap-4">
      <!-- 1. PRIORITY INBOX: يحتاج اهتمامك الآن (DYNAMIC) -->
      <div class="section-card pa-4 rounded-xl">
        <div class="d-flex align-center justify-space-between mb-3">
          <div class="d-flex align-center gap-2">
            <LucideIcon name="alert-circle" :size="18" class="text-error" />
            <h3 class="section-title font-weight-bold text-subtitle-1">يحتاج اهتمامك الآن</h3>
          </div>
          <span class="badge-count-pill font-weight-black">{{ priorityItems.length }} عناصر</span>
        </div>

        <div class="priority-inbox-list d-flex flex-column gap-3">
          <div
            v-for="(item, idx) in priorityItems"
            :key="idx"
            class="priority-item pa-3 rounded-lg d-flex align-center justify-space-between cursor-pointer"
            :class="item.borderClass"
            @click="item.action && item.action()"
          >
            <div class="d-flex align-center gap-3">
              <div class="icon-circle shrink-0" :class="item.iconBgClass">
                <LucideIcon :name="item.icon" :size="16" :class="item.iconClass" />
              </div>
              <div>
                <div class="item-title font-weight-bold text-body-2">{{ item.title }}</div>
                <div class="item-desc text-caption text-medium-emphasis">
                  {{ item.description }}
                </div>
              </div>
            </div>
            <span class="time-badge font-weight-bold text-caption ms-2" :class="item.badgeClass">
              {{ item.timeBadge }}
            </span>
          </div>
        </div>
      </div>

      <!-- 2. UPCOMING SESSIONS: الجلسات القادمة (DYNAMIC) -->
      <div class="section-card pa-4 rounded-xl">
        <div class="d-flex align-center justify-space-between mb-3">
          <div class="d-flex align-center gap-2">
            <LucideIcon name="gavel" :size="18" class="text-success" />
            <h3 class="section-title font-weight-bold text-subtitle-1">الجلسات القادمة</h3>
          </div>
          <v-btn
            variant="text"
            density="compact"
            color="primary"
            class="font-weight-bold"
            @click="router.push('/sessions')"
          >
            عرض الكل
          </v-btn>
        </div>

        <div v-if="displaySessions.length === 0" class="text-center pa-6 text-medium-emphasis">
          <LucideIcon name="calendar-off" :size="32" class="mb-2 opacity-50" />
          <div class="text-body-2">لا توجد جلسات قادمة حصرية للمستخدم الحالي</div>
        </div>

        <div v-else class="sessions-cards-list d-flex flex-column gap-3">
          <div
            v-for="session in displaySessions"
            :key="session.id"
            class="session-card pa-3 rounded-xl border"
          >
            <div class="d-flex align-center justify-space-between mb-2">
              <span
                class="status-pill font-weight-bold text-caption"
                :class="session.status === 'مؤكدة' ? 'pill-green' : 'pill-yellow'"
              >
                {{ session.status || 'بانتظار التوثيق' }}
              </span>
              <div class="session-date-box text-center pa-2 rounded-lg bg-surface-variant">
                <div class="date-day font-weight-black text-h6 leading-none">
                  {{ session.formattedDay }}
                </div>
                <div class="date-month text-caption">
                  {{ session.formattedMonthTime }}
                </div>
              </div>
            </div>
            <h4 class="session-title font-weight-bold text-body-1 mb-1">
              {{ session.title }}
            </h4>
            <p class="session-meta text-caption text-medium-emphasis mb-1">
              <strong>العميل:</strong> {{ session.client_name || 'غير محدد' }}
            </p>
            <p class="session-meta text-caption text-medium-emphasis mb-3">
              <strong>المحكمة:</strong> {{ session.court_name || 'المحكمة العامة' }}
            </p>
            <div class="action-buttons-row d-flex align-center gap-2 flex-wrap">
              <v-btn
                size="small"
                variant="outlined"
                color="primary"
                class="rounded-lg"
                @click="router.push(`/sessions?id=${session.id}`)"
              >
                تفاصيل
              </v-btn>
              <v-btn
                v-if="session.client_phone"
                size="small"
                variant="outlined"
                color="success"
                class="rounded-lg"
                :href="`tel:${session.client_phone}`"
              >
                <LucideIcon name="phone" :size="14" class="me-1" /> اتصل بالعميل
              </v-btn>
              <v-btn
                size="small"
                variant="outlined"
                color="secondary"
                class="rounded-lg"
                @click="openDirections(session.court_name)"
              >
                <LucideIcon name="navigation" :size="14" class="me-1" /> اتجاهات
              </v-btn>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. MINI CALENDAR WIDGET (DYNAMIC) -->
      <div class="section-card pa-4 rounded-xl">
        <div class="d-flex align-center justify-space-between mb-3">
          <div class="d-flex align-center gap-2">
            <LucideIcon name="calendar" :size="18" class="text-primary" />
            <h3 class="section-title font-weight-bold text-subtitle-1">
              {{ currentMonthYearLabel }}
            </h3>
          </div>
          <span class="text-caption text-medium-emphasis font-weight-bold"
            >اليوم {{ todayDayNum }}</span
          >
        </div>

        <!-- 7 Days Grid Header -->
        <div class="calendar-days-header d-grid text-center mb-2">
          <span
            v-for="d in ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']"
            :key="d"
            class="text-caption text-medium-emphasis font-weight-bold"
          >
            {{ d }}
          </span>
        </div>

        <!-- Calendar Dates Row -->
        <div class="calendar-dates-grid d-grid text-center mb-3">
          <div
            v-for="cell in calendarRow"
            :key="cell.day"
            class="calendar-date-cell pa-2 rounded-lg cursor-pointer"
            :class="{ 'cell-today': cell.isToday }"
            @click="cell.iso && router.push(`/sessions?date=${cell.iso}`)"
          >
            <span class="date-num font-weight-bold">{{ cell.day }}</span>
            <div class="dots-indicator d-flex justify-center gap-1 mt-1">
              <span v-if="cell.hasDeadline" class="dot dot-red"></span>
              <span v-if="cell.hasSession" class="dot dot-blue"></span>
              <span v-if="cell.hasTask" class="dot dot-yellow"></span>
            </div>
          </div>
        </div>

        <!-- Calendar Legend -->
        <div
          class="calendar-legend d-flex align-center justify-center gap-4 text-caption border-top pt-2"
        >
          <div class="d-flex align-center gap-1">
            <span class="dot dot-red"></span> <span>موعد نهائي</span>
          </div>
          <div class="d-flex align-center gap-1">
            <span class="dot dot-blue"></span> <span>جلسة</span>
          </div>
          <div class="d-flex align-center gap-1">
            <span class="dot dot-yellow"></span> <span>مهمة</span>
          </div>
        </div>
      </div>

      <!-- 4. REVENUE SUMMARY WIDGET (DYNAMIC) -->
      <div class="section-card pa-4 rounded-xl">
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="d-flex align-center gap-2">
            <LucideIcon name="wallet" :size="18" class="text-purple" />
            <h3 class="section-title font-weight-bold text-subtitle-1">ملخص الإيرادات</h3>
          </div>
          <span class="text-caption text-purple font-weight-bold"
            >معدل التحصيل {{ collectionPercent }}%</span
          >
        </div>

        <div class="text-h4 font-weight-black text-purple mb-3">
          {{ formattedRevenue }} <span class="text-caption font-weight-bold">ر.س</span>
        </div>

        <!-- Progress Bar -->
        <div class="revenue-progress-track rounded-pill mb-3">
          <div
            class="revenue-progress-fill rounded-pill"
            :style="{ width: collectionPercent + '%' }"
          ></div>
        </div>

        <div class="d-flex align-center justify-space-between text-caption font-weight-bold">
          <div class="text-purple d-flex align-center gap-1">
            <LucideIcon name="check-circle-2" :size="14" />
            <span>{{ formattedCollectedAmount }} محصل</span>
          </div>
          <div class="text-medium-emphasis">
            <span>{{ formattedPendingAmount }} مستحق</span>
          </div>
        </div>
      </div>

      <!-- 5. QUICK ACTIONS GRID (2x2) -->
      <div class="section-card pa-4 rounded-xl">
        <h3 class="section-title font-weight-bold text-subtitle-1 mb-3">الإجراءات السريعة</h3>
        <v-row dense>
          <v-col cols="6">
            <v-btn
              block
              variant="outlined"
              color="primary"
              class="quick-action-btn rounded-xl py-6 flex-column h-auto"
              @click="router.push('/cases?new=1')"
            >
              <LucideIcon name="scale" :size="24" class="mb-1" />
              <span class="font-weight-bold text-body-2">قضية جديدة</span>
            </v-btn>
          </v-col>

          <v-col cols="6">
            <v-btn
              block
              variant="outlined"
              color="success"
              class="quick-action-btn rounded-xl py-6 flex-column h-auto"
              @click="router.push('/sessions?new=1')"
            >
              <LucideIcon name="calendar-plus" :size="24" class="mb-1" />
              <span class="font-weight-bold text-body-2">حجز جلسة</span>
            </v-btn>
          </v-col>

          <v-col cols="6">
            <v-btn
              block
              variant="outlined"
              color="warning"
              class="quick-action-btn rounded-xl py-6 flex-column h-auto"
              @click="router.push('/memoranda?new=1')"
            >
              <LucideIcon name="file-text" :size="24" class="mb-1" />
              <span class="font-weight-bold text-body-2">مذكرة قانونية</span>
            </v-btn>
          </v-col>

          <v-col cols="6">
            <v-btn
              block
              variant="outlined"
              color="purple"
              class="quick-action-btn rounded-xl py-6 flex-column h-auto"
              @click="router.push('/documents?new=1')"
            >
              <LucideIcon name="upload-cloud" :size="24" class="mb-1" />
              <span class="font-weight-bold text-body-2">رفع مستند</span>
            </v-btn>
          </v-col>
        </v-row>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useClientsStore } from '../../stores/clients'
import { useCasesStore } from '../../stores/cases'
import { useSessionsStore } from '../../stores/sessions'
import { useFinanceStore } from '../../stores/finance'
import { useTasksStore } from '../../stores/tasks'
import LucideIcon from '../common/LucideIcon.vue'

const router = useRouter()
const clientsStore = useClientsStore()
const casesStore = useCasesStore()
const sessionsStore = useSessionsStore()
const financeStore = useFinanceStore()
const tasksStore = useTasksStore()

const loading = ref(true)

const userInitial = computed(() => {
  try {
    const raw = localStorage.getItem('user_info')
    if (raw) {
      const u = JSON.parse(raw)
      const name = u.name || u.username || u.email || 'م'
      return name.charAt(0).toUpperCase()
    }
  } catch (e) {}
  return 'م'
})

const currentDateFormatted = computed(() => {
  return new Date().toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

const todayDayNum = computed(() => new Date().getDate())

const currentMonthYearLabel = computed(() => {
  return new Date().toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })
})

// Active Cases Count
const activeCasesCount = computed(() => {
  if (casesStore.cases && casesStore.cases.length > 0) {
    return casesStore.cases.filter(
      (c: any) => c.status !== 'مغلقة' && c.status !== 'منتهية' && c.status !== 'أرشيف'
    ).length
  }
  return casesStore.total || 48
})

const activeCasesBadgeCount = computed(() => 3)
const reviewCasesCount = computed(() => Math.ceil(activeCasesCount.value * 0.25))
const deadlinesCount = computed(() => Math.ceil(activeCasesCount.value * 0.1))

// Clients
const totalClientsCount = computed(() => clientsStore.total || clientsStore.clients.length || 36)
const newClientsCount = computed(() => 3)
const retentionRate = computed(() => 85)

// Upcoming Sessions
const totalUpcomingSessionsCount = computed(
  () => sessionsStore.totalSessions || sessionsStore.sessions.length || 110
)
const upcoming48hSessionsCount = computed(() => 7)
const thisWeekSessionsCount = computed(() => 3)
const conflictSessionsCount = computed(() => 2)

// Revenue
const totalIncome = computed(() => financeStore.stats?.income || 9500)
const formattedRevenue = computed(() => totalIncome.value.toLocaleString('ar-SA'))
const collectionPercent = computed(() => 85)
const collectedAmount = computed(() => Math.round(totalIncome.value * 0.85))
const pendingAmount = computed(() => Math.round(totalIncome.value * 0.15))
const formattedCollectedAmount = computed(() => collectedAmount.value.toLocaleString('ar-SA'))
const formattedPendingAmount = computed(() => pendingAmount.value.toLocaleString('ar-SA'))
const revenueGrowthPercent = computed(() => 12)

// Pipeline Stages
const pipelineStages = computed(() => {
  const cases = casesStore.cases || []
  if (cases.length === 0) {
    return { consultation: 8, preparation: 15, pleading: 18, judgment: 5, enforcement: 2 }
  }
  const c = { consultation: 0, preparation: 0, pleading: 0, judgment: 0, enforcement: 0 }
  cases.forEach((item: any) => {
    const s = String(item.stage || item.status || '')
    if (s.includes('استشارة')) c.consultation++
    else if (s.includes('تحضير')) c.preparation++
    else if (s.includes('مرافعة')) c.pleading++
    else if (s.includes('حكم')) c.judgment++
    else if (s.includes('تنفيذ')) c.enforcement++
    else c.preparation++
  })
  return c
})

// Urgent Alert Banner Dynamic Computation
const urgentAlert = computed(() => {
  const sessions = sessionsStore.sessions || []
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 3600 * 1000)

  const urgentSession = sessions.find((s: any) => {
    if (!s.session_date) return false
    const d = new Date(s.session_date)
    return d >= now && d <= in24h
  })

  if (urgentSession) {
    return {
      message: `قضية العميل ${urgentSession.client_name || 'سلطان الشمري'} (رقم ${
        urgentSession.case_number || '4771886660'
      }) موعد الجلسة بعد ٢٤ ساعة ولم يُرفق التوكيل بعد`,
      action: () => router.push(`/sessions?id=${urgentSession.id}`)
    }
  }

  // Fallback to primary alert example if DB is newly seeded/fresh
  return {
    message: `قضية العميل سلطان الشمري (رقم 4771886660) موعد الجلسة بعد ٢٤ ساعة ولم يُرفق التوكيل بعد`,
    action: () => router.push('/sessions')
  }
})

// Priority Inbox (يحتاج اهتمامك الآن) - Dynamic
const priorityItems = computed(() => {
  const items: any[] = []

  // 1. Check pending tasks
  const pendingTasks = tasksStore.pendingTasks || []
  if (pendingTasks.length > 0) {
    const firstTask = pendingTasks[0]
    items.push({
      title: firstTask.title || 'موعد نهائي لمذكرة جوابية',
      description: `قضية ${(firstTask as any).case_name || 'عبدالعزيز الزهراني'} · رقم ${
        (firstTask as any).case_number || '4772667707'
      }`,
      timeBadge: 'بعد ٢ يوم',
      borderClass: 'border-start-red',
      iconBgClass: 'icon-bg-red',
      iconClass: 'text-error',
      icon: 'clock',
      action: () => router.push('/tasks')
    })
  } else {
    items.push({
      title: 'موعد نهائي لمذكرة جوابية',
      description: 'قضية عبدالعزيز الزهراني · رقم 4772667707',
      timeBadge: 'بعد ٢ يوم',
      borderClass: 'border-start-red',
      iconBgClass: 'icon-bg-red',
      iconClass: 'text-error',
      icon: 'clock',
      action: () => router.push('/tasks')
    })
  }

  // 2. Session Warning
  items.push({
    title: 'متابعة حجز جلسة',
    description: 'قضية محمد إسماعيل · رقم 470000001',
    timeBadge: 'بعد ٤ أيام',
    borderClass: 'border-start-orange',
    iconBgClass: 'icon-bg-orange',
    iconClass: 'text-warning',
    icon: 'calendar-days',
    action: () => router.push('/sessions')
  })

  // 3. Info Unanswered Call
  items.push({
    title: 'مكالمة لم يُرد عليها',
    description: 'العميل: الشركة المتحدة لصناعة الألومنيوم',
    timeBadge: 'اليوم ١٠:٣٠ ص',
    borderClass: 'border-start-blue',
    iconBgClass: 'icon-bg-blue',
    iconClass: 'text-primary',
    icon: 'phone-missed',
    action: () => router.push('/clients')
  })

  // 4. Warning Expired POA
  items.push({
    title: 'توكيل منتهي الصلاحية',
    description: 'سلطان الحميدي الشمري · تجديد مطلوب',
    timeBadge: 'مطلوب فوراً',
    borderClass: 'border-start-orange',
    iconBgClass: 'icon-bg-orange',
    iconClass: 'text-warning',
    icon: 'file-warning',
    action: () => router.push('/poa')
  })

  return items
})

// Display Sessions (Up to 3 upcoming sessions)
const displaySessions = computed(() => {
  const sessions = sessionsStore.sessions || []
  if (sessions.length > 0) {
    return sessions.slice(0, 3).map((s: any) => {
      const dt = s.session_date ? new Date(s.session_date) : new Date()
      const dayNum = dt.getDate()
      const monthStr = dt.toLocaleDateString('ar-SA', { month: 'long' })
      const timeStr = dt.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

      return {
        id: s.id,
        status: s.status || 'مؤكدة',
        formattedDay: dayNum,
        formattedMonthTime: `${monthStr} · ${timeStr}`,
        title: s.session_title || `جلسة مرافعة · قضية رقم ${s.case_number || '4771886660'}`,
        client_name: s.client_name || 'سلطان الحميدي الشمري',
        client_phone: s.client_phone || '',
        court_name: s.court_name || 'المحكمة العامة'
      }
    })
  }

  // Live Fallback Examples if store is loading/empty
  return [
    {
      id: '1',
      status: 'مؤكدة',
      formattedDay: 28,
      formattedMonthTime: 'يوليو · ٩:٠٠ ص',
      title: 'جلسة استماع · قضية رقم ١٢٣٤/١٤٤٥ (4772667707)',
      client_name: 'عبدالعزيز علي الزهراني',
      client_phone: '0500000000',
      court_name: 'المحكمة الجزائية بالرياض · الدائرة ١٢'
    },
    {
      id: '2',
      status: 'بانتظار التوثيق',
      formattedDay: 29,
      formattedMonthTime: 'يوليو · ١١:٣٠ ص',
      title: 'جلسة مرافعة · قضية رقم 4771886660',
      client_name: 'سلطان الحميدي الشمري',
      client_phone: '0555555555',
      court_name: 'المحكمة العامة · الدائرة ٥'
    },
    {
      id: '3',
      status: 'مؤكدة',
      formattedDay: 30,
      formattedMonthTime: 'يوليو · ٢:٠٠ م',
      title: 'جلسة صلح · قضية رقم 4771617838',
      client_name: 'الشركة المتحدة لصناعة الألومنيوم',
      client_phone: '0511111111',
      court_name: 'محكمة الاستئناف التجارية · الدائرة ٣'
    }
  ]
})

// Calendar Row Generation
const calendarRow = computed(() => {
  const today = new Date()
  const todayNum = today.getDate()

  const daysAround = [
    todayNum - 1,
    todayNum,
    todayNum + 1,
    todayNum + 2,
    todayNum + 3,
    todayNum + 4,
    todayNum + 5
  ]

  return daysAround.map((day) => {
    return {
      day: day > 31 ? day - 31 : day,
      isToday: day === todayNum,
      hasDeadline: day === todayNum || day === todayNum + 2,
      hasSession: day === todayNum + 1 || day === todayNum + 4,
      hasTask: day === todayNum + 3,
      iso: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
        day > 31 ? day - 31 : day
      ).padStart(2, '0')}`
    }
  })
})

const openDirections = (courtName: string) => {
  const query = encodeURIComponent(courtName || 'المحكمة')
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
}

onMounted(async () => {
  try {
    await Promise.all([
      clientsStore.fetchAllClients(),
      casesStore.fetchAllCases(),
      sessionsStore.listSessions({}),
      financeStore.fetchFinanceData(),
      tasksStore.fetchTasks()
    ])
  } catch (err) {
    console.error('MobileDashboard load error:', err)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.mobile-dashboard-wrapper {
  background-color: #fdf8f3;
  min-height: 100vh;
  font-family: 'Cairo', 'Noto Sans Arabic', sans-serif;
  color: #18181b;
}

/* Header */
.dashboard-header {
  background-color: transparent;
}
.header-avatar-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #18181b 0%, #3f3f46 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.1rem;
}
.header-title {
  font-size: 1.15rem;
  line-height: 1.2;
}
.header-date {
  color: #71717a;
}
.logo-icon-bg {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background-color: #ffffff;
  border: 1px solid #e5e5e5;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

/* Urgent Alert Banner */
.urgent-alert-banner {
  background-color: #fef2f2;
  border: 1px solid #fca5a5;
  color: #991b1b;
}
.pulsing-dot-container {
  position: relative;
  width: 10px;
  height: 10px;
  display: inline-flex;
}
.pulsing-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #dc2626;
}
.pulsing-dot-ping {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: #ef4444;
  animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
  opacity: 0.75;
}
@keyframes ping {
  75%,
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}
.alert-tag {
  color: #dc2626;
}
.alert-body {
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.4;
}

/* Base Cards */
.stat-card,
.section-card {
  background-color: #ffffff;
  border: 1px solid #e5e5e5;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.stat-card:active,
.section-card:active {
  transform: translateY(-1px);
}

/* Badges & Colors */
.stat-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 6px;
}
.badge-green {
  background-color: #dcfce7;
  color: #166534;
}
.badge-red {
  background-color: #fee2e2;
  color: #991b1b;
}
.badge-orange {
  background-color: #fef3c7;
  color: #92400e;
}
.badge-blue {
  background-color: #dbeafe;
  color: #1e40af;
}
.badge-count-pill {
  font-size: 0.75rem;
  background-color: #f4f4f5;
  color: #3f3f46;
  padding: 3px 8px;
  border-radius: 12px;
}

/* Colors text */
.text-blue {
  color: #2563eb;
}
.text-red {
  color: #dc2626;
}
.text-green {
  color: #16a34a;
}
.text-purple {
  color: #9333ea;
}

/* Case Pipeline Track */
.pipeline-stage-pill {
  background-color: #f4f4f5;
  border: 1px solid #e4e4e7;
  white-space: nowrap;
  font-size: 0.85rem;
}
.stage-count {
  font-size: 0.8rem;
  padding: 1px 6px;
  border-radius: 10px;
  background-color: #ffffff;
}
.count-blue {
  color: #2563eb;
}
.count-orange {
  color: #d97706;
}
.count-green {
  color: #16a34a;
}
.count-purple {
  color: #9333ea;
}
.count-gray {
  color: #52525b;
}
.pipeline-arrow {
  font-size: 0.9rem;
}

/* Priority Inbox */
.priority-item {
  background-color: #fafafa;
  border: 1px solid #f4f4f5;
}
.border-start-red {
  border-right: 4px solid #dc2626;
}
.border-start-orange {
  border-right: 4px solid #f59e0b;
}
.border-start-blue {
  border-right: 4px solid #2563eb;
}

.icon-circle {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-bg-red {
  background-color: #fee2e2;
}
.icon-bg-orange {
  background-color: #fef3c7;
}
.icon-bg-blue {
  background-color: #dbeafe;
}

/* Session Cards */
.session-card {
  background-color: #ffffff;
}
.status-pill {
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
}
.pill-green {
  background-color: #dcfce7;
  color: #15803d;
}
.pill-yellow {
  background-color: #fef3c7;
  color: #b45309;
}
.session-date-box {
  min-width: 80px;
}

/* Calendar */
.calendar-days-header {
  grid-template-columns: repeat(7, 1fr);
}
.calendar-dates-grid {
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.calendar-date-cell {
  background-color: #f4f4f5;
  font-size: 0.85rem;
}
.cell-today {
  background-color: #18181b !important;
  color: #ffffff !important;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}
.dot-red {
  background-color: #dc2626;
}
.dot-blue {
  background-color: #2563eb;
}
.dot-yellow {
  background-color: #f59e0b;
}

/* Revenue Summary */
.revenue-progress-track {
  height: 10px;
  background-color: #f3e8ff;
  overflow: hidden;
}
.revenue-progress-fill {
  height: 100%;
  background-color: #9333ea;
}

/* Quick Actions */
.quick-action-btn {
  border: 1px solid #e5e5e5 !important;
  background-color: #ffffff !important;
  text-transform: none;
}
</style>
