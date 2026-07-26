<template>
  <div class="mobile-dashboard-wrapper" dir="rtl">
    <!-- TOP HEADER BAR -->
    <header class="dashboard-header d-flex align-center justify-space-between pa-4">
      <div class="d-flex align-center gap-3">
        <div class="header-avatar-circle">
          <span class="avatar-text">م</span>
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

    <!-- URGENT ALERT BANNER -->
    <div class="px-4 mb-4">
      <div class="urgent-alert-banner d-flex align-center gap-3 pa-3 rounded-xl">
        <span class="pulsing-dot-container shrink-0">
          <span class="pulsing-dot-ping"></span>
          <span class="pulsing-dot"></span>
        </span>
        <div class="alert-text-wrapper flex-grow-1">
          <span class="alert-tag font-weight-black">تنبيه عاجل:</span>
          <span class="alert-body ms-1">
            قضية العميل سلطان الشمري (رقم 4771886660) موعد الجلسة بعد ٢٤ ساعة ولم يُرفق التوكيل بعد
          </span>
        </div>
        <LucideIcon name="chevron-left" :size="16" class="text-error opacity-70 shrink-0" />
      </div>
    </div>

    <!-- STATS CARDS ROW (2x2 Grid for Mobile) -->
    <div class="px-4 mb-4">
      <v-row dense class="stats-cards-grid">
        <!-- Card 1: Active Cases -->
        <v-col cols="6">
          <div class="stat-card pa-3 rounded-xl d-flex flex-column justify-space-between h-100">
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="stat-label text-caption text-medium-emphasis font-weight-bold"
                >القضايا النشطة</span
              >
              <span class="stat-badge badge-green">+3 هذا الشهر</span>
            </div>
            <div class="stat-number text-blue font-weight-black text-h4 my-1">
              {{ casesStore.total || 48 }}
            </div>
            <div class="stat-subtext text-caption text-secondary">
              12 قيد المراجعة · 5 مواعيد نهائية
            </div>
          </div>
        </v-col>

        <!-- Card 2: Clients -->
        <v-col cols="6">
          <div class="stat-card pa-3 rounded-xl d-flex flex-column justify-space-between h-100">
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="stat-label text-caption text-medium-emphasis font-weight-bold"
                >العملاء</span
              >
              <span class="stat-badge badge-green">3 جدد</span>
            </div>
            <div class="stat-number text-red font-weight-black text-h4 my-1">
              {{ clientsStore.total || 36 }}
            </div>
            <div class="stat-subtext text-caption text-secondary">85% معدل الاحتفاظ</div>
          </div>
        </v-col>

        <!-- Card 3: Upcoming Sessions -->
        <v-col cols="6">
          <div class="stat-card pa-3 rounded-xl d-flex flex-column justify-space-between h-100">
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="stat-label text-caption text-medium-emphasis font-weight-bold"
                >الجلسات القادمة</span
              >
              <span class="stat-badge badge-green">7 خلال 48 ساعة</span>
            </div>
            <div class="stat-number text-green font-weight-black text-h4 my-1">
              {{ sessionsStore.totalSessions || 110 }}
            </div>
            <div class="stat-subtext text-caption text-secondary">3 هذا الأسبوع · 2 متعارضة</div>
          </div>
        </v-col>

        <!-- Card 4: Revenue -->
        <v-col cols="6">
          <div class="stat-card pa-3 rounded-xl d-flex flex-column justify-space-between h-100">
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="stat-label text-caption text-medium-emphasis font-weight-bold"
                >الإيرادات (ر.س)</span
              >
              <span class="stat-badge badge-green">+12%</span>
            </div>
            <div class="stat-number text-purple font-weight-black text-h4 my-1">
              {{ formattedRevenue }}
            </div>
            <div class="stat-subtext text-caption text-secondary">85% محصل · 1,425 مستحق</div>
          </div>
        </v-col>
      </v-row>
    </div>

    <!-- CASE PIPELINE (Horizontal Track) -->
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
          <div class="pipeline-stage-pill d-flex align-center gap-2 px-3 py-2 rounded-pill">
            <span class="stage-name font-weight-bold">الاستشارة</span>
            <span class="stage-count count-blue font-weight-black">8</span>
          </div>
          <span class="pipeline-arrow text-medium-emphasis">←</span>

          <div class="pipeline-stage-pill d-flex align-center gap-2 px-3 py-2 rounded-pill">
            <span class="stage-name font-weight-bold">التحضير</span>
            <span class="stage-count count-orange font-weight-black">15</span>
          </div>
          <span class="pipeline-arrow text-medium-emphasis">←</span>

          <div class="pipeline-stage-pill d-flex align-center gap-2 px-3 py-2 rounded-pill">
            <span class="stage-name font-weight-bold">المرافعة</span>
            <span class="stage-count count-green font-weight-black">18</span>
          </div>
          <span class="pipeline-arrow text-medium-emphasis">←</span>

          <div class="pipeline-stage-pill d-flex align-center gap-2 px-3 py-2 rounded-pill">
            <span class="stage-name font-weight-bold">الحكم</span>
            <span class="stage-count count-purple font-weight-black">5</span>
          </div>
          <span class="pipeline-arrow text-medium-emphasis">←</span>

          <div class="pipeline-stage-pill d-flex align-center gap-2 px-3 py-2 rounded-pill">
            <span class="stage-name font-weight-bold">التنفيذ</span>
            <span class="stage-count count-gray font-weight-black">2</span>
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN CONTENT SECTIONS -->
    <div class="px-4 pb-12 d-flex flex-column gap-4">
      <!-- 1. PRIORITY INBOX: يحتاج اهتمامك الآن -->
      <div class="section-card pa-4 rounded-xl">
        <div class="d-flex align-center justify-space-between mb-3">
          <div class="d-flex align-center gap-2">
            <LucideIcon name="alert-circle" :size="18" class="text-error" />
            <h3 class="section-title font-weight-bold text-subtitle-1">يحتاج اهتمامك الآن</h3>
          </div>
          <span class="badge-count-pill font-weight-black">4 عناصر</span>
        </div>

        <div class="priority-inbox-list d-flex flex-column gap-3">
          <!-- Item 1: Urgent Deadline -->
          <div
            class="priority-item border-start-red pa-3 rounded-lg d-flex align-center justify-space-between"
          >
            <div class="d-flex align-center gap-3">
              <div class="icon-circle icon-bg-red shrink-0">
                <LucideIcon name="clock" :size="16" class="text-error" />
              </div>
              <div>
                <div class="item-title font-weight-bold text-body-2">موعد نهائي لمذكرة جوابية</div>
                <div class="item-desc text-caption text-medium-emphasis">
                  قضية عبدالعزيز الزهراني · رقم 4772667707
                </div>
              </div>
            </div>
            <span class="time-badge badge-red font-weight-bold text-caption">بعد ٢ يوم</span>
          </div>

          <!-- Item 2: Warning Session -->
          <div
            class="priority-item border-start-orange pa-3 rounded-lg d-flex align-center justify-space-between"
          >
            <div class="d-flex align-center gap-3">
              <div class="icon-circle icon-bg-orange shrink-0">
                <LucideIcon name="calendar-days" :size="16" class="text-warning" />
              </div>
              <div>
                <div class="item-title font-weight-bold text-body-2">متابعة حجز جلسة</div>
                <div class="item-desc text-caption text-medium-emphasis">
                  قضية محمد إسماعيل · رقم 470000001
                </div>
              </div>
            </div>
            <span class="time-badge badge-orange font-weight-bold text-caption">بعد ٤ أيام</span>
          </div>

          <!-- Item 3: Info Unanswered Call -->
          <div
            class="priority-item border-start-blue pa-3 rounded-lg d-flex align-center justify-space-between"
          >
            <div class="d-flex align-center gap-3">
              <div class="icon-circle icon-bg-blue shrink-0">
                <LucideIcon name="phone-missed" :size="16" class="text-primary" />
              </div>
              <div>
                <div class="item-title font-weight-bold text-body-2">مكالمة لم يُرد عليها</div>
                <div class="item-desc text-caption text-medium-emphasis">
                  العميل: الشركة المتحدة لصناعة الألومنيوم
                </div>
              </div>
            </div>
            <span class="time-badge badge-blue font-weight-bold text-caption">اليوم ١٠:٣٠ ص</span>
          </div>

          <!-- Item 4: Warning Expired POA -->
          <div
            class="priority-item border-start-orange pa-3 rounded-lg d-flex align-center justify-space-between"
          >
            <div class="d-flex align-center gap-3">
              <div class="icon-circle icon-bg-orange shrink-0">
                <LucideIcon name="file-warning" :size="16" class="text-warning" />
              </div>
              <div>
                <div class="item-title font-weight-bold text-body-2">توكيل منتهي الصلاحية</div>
                <div class="item-desc text-caption text-medium-emphasis">
                  سلطان الحميدي الشمري · تجديد مطلوب
                </div>
              </div>
            </div>
            <span class="time-badge badge-orange font-weight-bold text-caption">مطلوب فوراً</span>
          </div>
        </div>
      </div>

      <!-- 2. UPCOMING SESSIONS: الجلسات القادمة -->
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

        <div class="sessions-cards-list d-flex flex-column gap-3">
          <!-- Session Card 1 -->
          <div class="session-card pa-3 rounded-xl border">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="status-pill pill-green font-weight-bold text-caption">مؤكدة</span>
              <div class="session-date-box text-center pa-2 rounded-lg bg-surface-variant">
                <div class="date-day font-weight-black text-h6 leading-none">٢٨</div>
                <div class="date-month text-caption">يوليو · ٩:٠٠ ص</div>
              </div>
            </div>
            <h4 class="session-title font-weight-bold text-body-1 mb-1">
              جلسة استماع · قضية رقم ١٢٣٤/١٤٤٥ (4772667707)
            </h4>
            <p class="session-meta text-caption text-medium-emphasis mb-1">
              <strong>العميل:</strong> عبدالعزيز علي الزهراني
            </p>
            <p class="session-meta text-caption text-medium-emphasis mb-3">
              <strong>المحكمة:</strong> المحكمة الجزائية بالرياض · الدائرة ١٢
            </p>
            <div class="action-buttons-row d-flex align-center gap-2 flex-wrap">
              <v-btn
                size="small"
                variant="outlined"
                color="primary"
                class="rounded-lg"
                @click="router.push('/sessions?id=1')"
              >
                تفاصيل
              </v-btn>
              <v-btn size="small" variant="outlined" color="success" class="rounded-lg">
                <LucideIcon name="phone" :size="14" class="me-1" /> اتصل بالعميل
              </v-btn>
              <v-btn size="small" variant="outlined" color="secondary" class="rounded-lg">
                <LucideIcon name="navigation" :size="14" class="me-1" /> اتجاهات
              </v-btn>
            </div>
          </div>

          <!-- Session Card 2 -->
          <div class="session-card pa-3 rounded-xl border">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="status-pill pill-yellow font-weight-bold text-caption"
                >بانتظار التوثيق</span
              >
              <div class="session-date-box text-center pa-2 rounded-lg bg-surface-variant">
                <div class="date-day font-weight-black text-h6 leading-none">٢٩</div>
                <div class="date-month text-caption">يوليو · ١١:٣٠ ص</div>
              </div>
            </div>
            <h4 class="session-title font-weight-bold text-body-1 mb-1">
              جلسة مرافعة · قضية رقم 4771886660
            </h4>
            <p class="session-meta text-caption text-medium-emphasis mb-1">
              <strong>العميل:</strong> سلطان الحميدي الشمري
            </p>
            <p class="session-meta text-caption text-medium-emphasis mb-3">
              <strong>المحكمة:</strong> المحكمة العامة · الدائرة ٥
            </p>
            <div class="action-buttons-row d-flex align-center gap-2 flex-wrap">
              <v-btn
                size="small"
                variant="outlined"
                color="primary"
                class="rounded-lg"
                @click="router.push('/sessions?id=2')"
              >
                تفاصيل
              </v-btn>
              <v-btn size="small" variant="outlined" color="warning" class="rounded-lg">
                <LucideIcon name="paperclip" :size="14" class="me-1" /> أرفق التوكيل
              </v-btn>
              <v-btn size="small" variant="outlined" color="success" class="rounded-lg">
                <LucideIcon name="phone" :size="14" class="me-1" /> اتصل بالعميل
              </v-btn>
            </div>
          </div>

          <!-- Session Card 3 -->
          <div class="session-card pa-3 rounded-xl border">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="status-pill pill-green font-weight-bold text-caption">مؤكدة</span>
              <div class="session-date-box text-center pa-2 rounded-lg bg-surface-variant">
                <div class="date-day font-weight-black text-h6 leading-none">٣٠</div>
                <div class="date-month text-caption">يوليو · ٢:٠٠ م</div>
              </div>
            </div>
            <h4 class="session-title font-weight-bold text-body-1 mb-1">
              جلسة صلح · قضية رقم 4771617838
            </h4>
            <p class="session-meta text-caption text-medium-emphasis mb-1">
              <strong>العميل:</strong> الشركة المتحدة لصناعة الألومنيوم
            </p>
            <p class="session-meta text-caption text-medium-emphasis mb-3">
              <strong>المحكمة:</strong> محكمة الاستئناف التجارية · الدائرة ٣
            </p>
            <div class="action-buttons-row d-flex align-center gap-2 flex-wrap">
              <v-btn
                size="small"
                variant="outlined"
                color="primary"
                class="rounded-lg"
                @click="router.push('/sessions?id=3')"
              >
                تفاصيل
              </v-btn>
              <v-btn size="small" variant="outlined" color="success" class="rounded-lg">
                <LucideIcon name="phone" :size="14" class="me-1" /> اتصل بالعميل
              </v-btn>
              <v-btn size="small" variant="outlined" color="secondary" class="rounded-lg">
                <LucideIcon name="navigation" :size="14" class="me-1" /> اتجاهات
              </v-btn>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. MINI CALENDAR WIDGET -->
      <div class="section-card pa-4 rounded-xl">
        <div class="d-flex align-center justify-space-between mb-3">
          <div class="d-flex align-center gap-2">
            <LucideIcon name="calendar" :size="18" class="text-primary" />
            <h3 class="section-title font-weight-bold text-subtitle-1">تقويم يوليو ٢٠٢٦</h3>
          </div>
          <span class="text-caption text-medium-emphasis font-weight-bold">اليوم ٢٦</span>
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
            v-for="day in [26, 27, 28, 29, 30, 31, 1]"
            :key="day"
            class="calendar-date-cell pa-2 rounded-lg"
            :class="{ 'cell-today': day === 26 }"
          >
            <span class="date-num font-weight-bold">{{ day }}</span>
            <div class="dots-indicator d-flex justify-center gap-1 mt-1">
              <span v-if="day === 26 || day === 28" class="dot dot-red"></span>
              <span v-if="day === 27 || day === 30" class="dot dot-blue"></span>
              <span v-if="day === 29" class="dot dot-yellow"></span>
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

      <!-- 4. REVENUE SUMMARY WIDGET: ملخص الإيرادات -->
      <div class="section-card pa-4 rounded-xl">
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="d-flex align-center gap-2">
            <LucideIcon name="wallet" :size="18" class="text-purple" />
            <h3 class="section-title font-weight-bold text-subtitle-1">ملخص الإيرادات</h3>
          </div>
          <span class="text-caption text-purple font-weight-bold">معدل التحصيل 85%</span>
        </div>

        <div class="text-h4 font-weight-black text-purple mb-3">
          ٩,٥٠٠ <span class="text-caption font-weight-bold">ر.س</span>
        </div>

        <!-- Progress Bar -->
        <div class="revenue-progress-track rounded-pill mb-3">
          <div class="revenue-progress-fill rounded-pill" style="width: 85%"></div>
        </div>

        <div class="d-flex align-center justify-space-between text-caption font-weight-bold">
          <div class="text-purple d-flex align-center gap-1">
            <LucideIcon name="check-circle-2" :size="14" />
            <span>٨,٠٧٥ محصل</span>
          </div>
          <div class="text-medium-emphasis">
            <span>١,٤٢٥ مستحق</span>
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
import LucideIcon from '../common/LucideIcon.vue'

const router = useRouter()
const clientsStore = useClientsStore()
const casesStore = useCasesStore()
const sessionsStore = useSessionsStore()
const financeStore = useFinanceStore()

const loading = ref(true)

const currentDateFormatted = computed(() => {
  return new Date().toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

const formattedRevenue = computed(() => {
  const inc = financeStore.stats?.income || 9500
  return inc.toLocaleString('ar-SA')
})

onMounted(async () => {
  try {
    await Promise.all([
      clientsStore.fetchAllClients(),
      casesStore.fetchAllCases(),
      sessionsStore.listSessions({}),
      financeStore.fetchFinanceData()
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
  align-center: center;
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
