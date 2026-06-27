<template>
  <v-navigation-drawer
    v-if="!hideLayout"
    v-model="drawer"
    :rail="rail && !isMobile"
    :permanent="!isMobile"
    :temporary="isMobile"
    :class="{ 'mobile-drawer': isMobile }"
    location="right"
    elevation="0"
    class="premium-sidebar-modern"
    :width="isMobile ? 300 : 320"
    :scrim="isMobile"
  >
    <div class="sidebar-wrapper d-flex flex-column h-100 pa-4">
      <v-btn
        v-if="isMobile"
        icon
        variant="text"
        size="small"
        class="align-self-start mb-2"
        color="white"
        @click="drawer = false"
      >
        <LucideIcon name="x" :size="20" />
      </v-btn>
      <div
        class="sidebar-identity rounded-xl elite-glass text-center border-gold-thin"
        :class="{ 'px-2': rail }"
      >
        <div class="logo-shine-container mx-auto mb-5">
          <v-avatar
            :size="isMobile ? 50 : rail ? 40 : 80"
            class="mx-auto border-accent-glow premium-hover position-relative overflow-hidden"
            elevation="24"
          >
            <v-img :src="appLogo" alt="B2B Lawyer Pro" cover />
            <div class="logo-shimmer"></div>
          </v-avatar>
        </div>
        <transition name="fade">
          <div v-if="!rail" class="text-center w-100">
            <h1
              class="text-h6 font-weight-black text-gold mb-1 mt-2 tracking-tight line-height-tight"
            >
              B2B-LAW
            </h1>
            <p
              class="text-tiny text-white font-weight-black tracking-widest uppercase mb-0"
              style="opacity: 0.7"
            >
              برنامج المحامي
            </p>
          </div>
        </transition>
      </div>

      <v-list
        v-model:opened="openedGroups"
        density="compact"
        nav
        class="sidebar-nav-list flex-grow-1 pa-0"
      >
        <template v-for="item in categorizedMenu" :key="item.title">
          <v-list-group v-if="item.children" :value="item.title" class="mb-3">
            <template #activator="{ props: groupProps }">
              <v-list-item v-bind="groupProps" class="menu-item-modern rounded-lg">
                <template #prepend>
                  <LucideIcon :name="item.icon" :size="20" class="me-4" />
                </template>
                <v-list-item-title class="font-weight-black text-body-2">{{
                  item.title
                }}</v-list-item-title>
              </v-list-item>
            </template>

            <v-list-item
              v-for="child in item.children"
              :key="child.title"
              :to="child.to"
              link
              active-color="accent"
              class="menu-item-child rounded-lg mb-1"
              @click="onMenuClick"
            >
              <template #prepend>
                <LucideIcon :name="child.icon" :size="16" class="me-4" />
              </template>
              <v-list-item-title class="font-weight-bold text-caption">{{
                child.title
              }}</v-list-item-title>
            </v-list-item>
          </v-list-group>

          <v-list-item
            v-else
            :to="item.to"
            link
            active-color="accent"
            class="menu-item-modern mb-2 rounded-lg py-3 px-4"
            @click="onMenuClick"
          >
            <template #prepend>
              <LucideIcon :name="item.icon" :size="22" class="me-5 text-gold" />
            </template>
            <v-list-item-title class="font-weight-black text-body-2 tracking-wide">{{
              item.title
            }}</v-list-item-title>
            <template v-if="item.badge && !rail" #append>
              <v-chip
                color="accent"
                size="x-small"
                class="font-weight-black text-noir px-3 rounded-lg"
                >{{ item.badge }}</v-chip
              >
            </template>
          </v-list-item>
        </template>
      </v-list>

      <div class="sidebar-footer-action mt-auto">
        <v-btn
          block
          color="white"
          variant="tonal"
          size="large"
          class="logout-btn-modern rounded-xl font-weight-black"
          @click="emit('logout')"
        >
          <LucideIcon name="log-out" :size="18" :class="rail ? '' : 'me-2'" />
          <span v-if="!rail">تسجيل الخروج</span>
        </v-btn>
      </div>
    </div>
  </v-navigation-drawer>

  <v-app-bar
    v-if="!hideLayout"
    app
    flat
    :height="isMobile ? 56 : 80"
    class="glass-header"
    :style="{ right: appRightInset }"
  >
    <div class="d-flex align-center w-100 px-6">
      <v-btn
        v-if="isMobile"
        icon
        variant="text"
        class="me-4 header-action-btn"
        @click="drawer = !drawer"
      >
        <LucideIcon name="menu" :size="22" />
      </v-btn>
      <v-btn v-else icon variant="text" class="me-4 header-action-btn" @click="rail = !rail">
        <LucideIcon :name="rail ? 'layout-dashboard' : 'layout-dashboard'" :size="22" />
      </v-btn>

      <v-toolbar-title class="font-weight-black text-h5 text-visible-high">
        <transition name="fade" mode="out-in">
          <span :key="currentRouteName">{{ currentRouteName }}</span>
        </transition>
      </v-toolbar-title>

      <v-spacer></v-spacer>

      <div
        class="status-container d-flex align-center gap-3 me-6 hidden-sm-and-down pa-2 rounded-pill glass-card border-gold"
      >
        <v-tooltip text="حالة الأمان" location="bottom">
          <template #activator="{ props }">
            <div v-bind="props" class="status-indicator">
              <div class="dot green"></div>
              <span class="text-caption font-weight-black text-success">آمن</span>
            </div>
          </template>
        </v-tooltip>

        <v-divider vertical class="mx-1"></v-divider>

        <v-tooltip text="حالة الترخيص" location="bottom">
          <template #activator="{ props }">
            <v-chip
              v-if="trialInfo"
              v-bind="props"
              size="small"
              :color="trialInfo.isActivated ? 'success' : 'warning'"
              variant="flat"
              class="status-chip rounded-pill font-weight-black"
            >
              <LucideIcon
                :name="trialInfo.isActivated ? 'shield-check' : 'clock'"
                :size="14"
                class="me-1"
              />
              {{ trialInfo.isActivated ? 'مرخص' : 'تجريبي' }}
            </v-chip>
          </template>
        </v-tooltip>
      </div>

      <div class="header-clock pa-2 px-4 rounded-xl border glass-card me-4 hidden-md-and-down">
        <div class="text-subtitle-2 font-weight-black text-primary">{{ currentHijri }}</div>
        <div class="text-tiny text-text-muted font-weight-medium">{{ currentTime }}</div>
      </div>

      <v-btn
        icon
        variant="tonal"
        class="me-4 theme-toggle-btn border"
        @click="emit('toggle-theme')"
      >
        <LucideIcon :name="isDark ? 'sun' : 'moon'" :size="20" />
      </v-btn>

      <div
        class="user-profile-modern d-flex align-center pa-1 ps-5 rounded-pill border-gold elite-glass"
        style="cursor: pointer"
        @click="router.push('/profile')"
      >
        <div class="text-right me-4 hidden-sm-and-down">
          <div class="text-subtitle-2 font-weight-black text-white leading-none">
            {{ currentUser?.username || 'المحامي العام' }}
          </div>
          <div class="text-tiny text-gold font-weight-black mt-1 uppercase tracking-tighter">
            {{ currentUser?.roleKey || 'Admin' }} — SECURED
          </div>
        </div>
        <v-avatar size="44" class="border-gold-thin">
          <v-img
            :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.username || 'Lawyer')}&background=050A15&color=3B82F6&bold=true`"
          />
        </v-avatar>
      </div>
    </div>
  </v-app-bar>

  <v-banner
    v-if="isApproachingExpiration && !isLoginPage && daysRemaining > 0"
    color="warning"
    icon="mdi-clock-alert-outline"
    class="countdown-banner"
    stacked
    dense
  >
    <template #text>
      <div class="d-flex align-center justify-space-between w-100">
        <div>
          <strong v-if="daysRemaining > 1"
            >فترة تجربتك تنتهي خلال {{ countdownDetail.days }} أيام</strong
          >
          <strong v-else-if="countdownDetail.hours > 0"
            >فترة تجربتك تنتهي خلال {{ countdownDetail.hours }} ساعة و
            {{ countdownDetail.minutes }} دقيقة</strong
          >
          <strong v-else>فترة تجربتك تنتهي خلال {{ countdownDetail.minutes }} دقيقة</strong>
          <span class="ms-2">— اشترك الآن لضمان عدم توقف الخدمة</span>
        </div>
        <v-btn
          color="warning"
          variant="flat"
          size="small"
          class="ms-3 font-weight-bold"
          @click="router.push('/subscription')"
        >
          اشترك الآن
        </v-btn>
      </div>
    </template>
  </v-banner>

  <v-banner
    v-if="isTrialExpired && !isLoginPage"
    color="warning"
    icon="mdi-crown"
    class="readonly-banner"
    stacked
    dense
  >
    <template #text>
      <div class="d-flex align-center justify-space-between w-100">
        <div>
          <strong> بياناتك محفوظة — فعّل الاشتراك للاستمرار </strong>
          <span class="ms-2">— يمكنك التصفح الآن، والاشتراك يمنحك صلاحيات كاملة. </span>
          <router-link
            to="/subscription"
            class="text-decoration-underline font-weight-bold"
            >تفعيل الاشتراك</router-link
          >
        </div>
      </div>
    </template>
  </v-banner>

  <v-main class="main-content-scroll">
    <div class="main-body-wrapper" :class="mainBodyPaddingClass">
      <v-alert
        v-if="trialInfo && !trialInfo.isValid && !trialInfo.isActivated && !isTrialExpired"
        type="warning"
        variant="tonal"
        density="comfortable"
        icon="mdi-crown"
        class="mb-6 rounded-xl"
        prominent
      >
        <div class="d-flex align-center justify-space-between w-100 flex-wrap gap-3">
          <div class="d-flex align-center">
            <LucideIcon name="crown" :size="20" class="me-2 text-gold" />
            <span>لقد استكشفت B2B-LAW! بياناتك محفوظة — فعّل الاشتراك للوصول الكامل.</span>
          </div>
          <v-btn
            color="accent"
            size="small"
            class="rounded-lg text-white font-weight-bold premium-btn-gold-gradient"
            @click="router.push('/subscription')"
          >
            تفعيل الاشتراك
          </v-btn>
        </div>
      </v-alert>

      <router-view v-slot="{ Component }">
        <transition name="premium-fade" mode="out-in">
          <component :is="Component" :key="$route.path" />
        </transition>
      </router-view>
    </div>
  </v-main>

  <v-footer
    v-if="!hideLayout"
    app
    flat
    border
    class="glass-footer px-6 py-1"
    height="36"
    :style="{ zIndex: 2000, right: appRightInset }"
  >
    <div class="d-flex align-center w-100 justify-space-between">
      <div class="text-caption font-weight-medium text-white-50">
        B2B Legal System
        <span class="text-gold font-weight-black ms-1">v2.14.0 Redesigned</span>
      </div>

      <div
        v-if="developerInfo"
        class="dev-credit d-flex align-center cursor-pointer px-3 rounded-pill"
        @click="emit('open-support')"
      >
        <div class="text-caption font-weight-bold text-white-50">
          كافة الحقوق محفوظة &copy; {{ new Date().getFullYear() }} — {{ developerInfo.name }}
        </div>
        <LucideIcon name="info" :size="14" class="ms-1" />
      </div>
    </div>
  </v-footer>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useDisplay } from 'vuetify'
import { useRoute, useRouter } from 'vue-router'
import { getTodayHijri } from '../utils/hijri'
import { usePermissions } from '../composables/usePermissions'
import { useLicensingStore } from '../stores/licensing'
import { useAppStore } from '../stores/app'
import { useMobileLayout } from '../composables/useMobileLayout'
import LucideIcon from '../components/common/LucideIcon.vue'
import appLogo from '../assets/app-logo.png'

const emit = defineEmits<{
  logout: []
  'toggle-theme': []
  'open-support': []
}>()

defineProps<{
  isDark: boolean
  developerInfo: any
}>()

const { mobile } = useDisplay()
const { isMobile } = useMobileLayout()
const drawer = ref(!isMobile.value)
const rail = ref(false)
const route = useRoute()
const router = useRouter()
const { can, session } = usePermissions()
const licensingStore = useLicensingStore()
const appStore = useAppStore()

const isLoginPage = computed(
  () =>
    route.path === '/login' ||
    route.path === '/register' ||
    route.name === 'Login' ||
    route.name === 'Register'
)
const hideLayout = computed(() => isLoginPage.value || route.query.window === 'new')

const mainBodyPaddingClass = computed(() => {
  if (hideLayout.value) return 'pa-0'
  if (route.name === 'Dashboard') return 'pa-0'
  return isMobile.value ? 'pa-4' : 'pa-8'
})

const appRightInset = computed(() => {
  if (hideLayout.value || isMobile.value) return '0px'
  if (rail.value) return '80px'
  return '320px'
})

const currentHijri = computed(() => getTodayHijri())
const currentUser = computed(() => session.value)
const currentTime = ref(new Date().toLocaleTimeString('ar-SA'))

const trialInfo = computed(() => licensingStore.trialInfo)
const isTrialExpired = computed(() => licensingStore.isTrialExpired)
const isApproachingExpiration = computed(() => licensingStore.isApproachingExpiration)
const daysRemaining = computed(() => licensingStore.daysRemaining)
const trialEnd = computed(() => licensingStore.trialEnd)

const now = ref(Date.now())
let countdownInterval: ReturnType<typeof setInterval> | null = null
const countdownDetail = computed(() => {
  if (!trialEnd.value) return { days: 0, hours: 0, minutes: 0 }
  const endMs = new Date(trialEnd.value).getTime()
  const diff = Math.max(0, endMs - now.value)
  const totalMinutes = Math.floor(diff / 60000)
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60
  }
})

const openedGroups = ref<string[]>([])

const currentRouteName = computed(() => {
  const nameMap: Record<string, string> = {
    Dashboard: 'لوحة التحكم',
    Clients: 'إدارة الموكلين',
    Defendants: 'إدارة الخصوم',
    POA: 'الوكالات والتفويضات',
    Cases: 'القضايا والملفات',
    Employees: 'شؤون الموظفين',
    Sessions: 'الجلسات والتقويم',
    Tasks: 'المهام والتذكيرات',
    Documents: 'الأرشفة والمستندات',
    Drafting: 'المذكرات واللوائح',
    Memoranda: 'المذكرات واللوائح',
    Experts: 'تقارير الخبراء',
    Finance: 'المالية والمحاسبة',
    Contracts: 'العقود',
    Enforcement: 'التنفيذ والتحصيل',
    Communications: 'إدارة المراسلات',
    Firm: 'إدارة المكتب',
    Search: 'البحث الشامل',
    Archive: 'الأرشيف القانوني',
    Settings: 'إعدادات النظام',
    ActivityLog: 'سجل النشاط',
    Vault: 'خزانة المكتب',
    FileVault: 'خزانة المكتب',
    Reports: 'مركز التقارير',
    ReportsDashboard: 'مركز التقارير',
    CaseReport: 'تقرير القضية',
    CourtCasesReport: 'تقرير قضايا المحكمة',
    SessionsReport: 'تقرير الجلسات',
    FinancialReport: 'التقرير المالي',
    UserActivityReport: 'تقرير نشاط المستخدم',
    EvidenceReport: 'سجل المذكرات واللوائح',
    MemorandaReport: 'سجل المذكرات واللوائح',
    DocumentsReport: 'تقرير المستندات',
    OperationsReport: 'تقرير الأداء والإنتاجية',
    UsersPermissionsReport: 'تقرير صلاحيات المستخدمين',
    DetailedCaseInquiry: 'الاستعلام التفصيلي عن قضية',
    Users: 'إدارة المستخدمين',
    UsersManagement: 'إدارة المستخدمين',
    Briefing: 'المتابعة الشاملة',
    SessionRoom: 'غرفة عمليات الجلسة',
    CaseDetails: 'تفاصيل القضية',
    ClientProfile: 'ملف الموكل',
    Profile: 'الملف الشخصي'
  }
  const routeName = (route.name as string) || ''
  return nameMap[routeName] || routeName || 'الرئيسية'
})

const categorizedMenu = computed(() => {
  const baseStructure = [
    { title: 'لوحة التحكم', icon: 'layout-dashboard', to: '/dashboard' },
    { title: 'المتابعة الشاملة', icon: 'shield-check', to: '/briefing', badge: 'جديد' },
    { title: 'القضايا', icon: 'gavel', to: '/cases', perm: 'view_cases' },
    {
      title: 'العمل القانوني',
      icon: 'briefcase',
      children: [
        { title: 'الجلسات', icon: 'calendar-clock', to: '/sessions', perm: 'view_sessions' },
        { title: 'المهام', icon: 'clipboard-list', to: '/tasks', perm: 'view_tasks' },
        { title: 'المذكرات واللوائح', icon: 'file-text', to: '/memoranda', perm: 'view_evidence' },
        { title: 'البحث الشامل', icon: 'search-code', to: '/search' },
        {
          title: 'التنفيذ والتحصيل',
          icon: 'hand-coins',
          to: '/enforcement',
          perm: 'view_enforcement'
        }
      ]
    },
    {
      title: 'الموكلين والملفات',
      icon: 'users-round',
      children: [
        { title: 'الموكلين', icon: 'users', to: '/clients', perm: 'view_clients' },
        { title: 'الخصوم', icon: 'user-x', to: '/defendants', perm: 'view_defendants' },
        { title: 'الوكالات', icon: 'file-signature', to: '/poa' },
        { title: 'المستندات', icon: 'folder-search', to: '/documents', perm: 'view_documents' },
        { title: 'الأرشيف', icon: 'archive', to: '/archive' }
      ]
    },
    { title: 'الخدمات القانونية', icon: 'scale', to: '/legal-services', perm: 'view_legal_services' },
    {
      title: 'الإدارة والمالية',
      icon: 'bar-chart-3',
      children: [
        { title: 'المالية', icon: 'banknote', to: '/finance', perm: 'view_finances' },
        { title: 'العقود', icon: 'file-check-2', to: '/contracts', perm: 'view_contracts' },
        { title: 'شؤون الموظفين', icon: 'user-cog', to: '/employees', perm: 'view_employees' },
        { title: 'الخبراء', icon: 'graduation-cap', to: '/experts' },
        { title: 'المراسلات', icon: 'mail-search', to: '/communications' },
        { title: 'إدارة المكتب', icon: 'building-2', to: '/firm' }
      ]
    },
    {
      title: 'الإعدادات والأدوات',
      icon: 'settings-2',
      children: [
        ...(session.value?.companyId === '00000000-0000-0000-0000-000000000000'
          ? [{ title: 'إدارة الاشتراكات', icon: 'crown', to: '/admin/subscriptions' }]
          : []),
        { title: 'إدارة المستخدمين', icon: 'users-2', to: '/users', perm: 'manage_users' },
        { title: 'الإعدادات', icon: 'settings', to: '/settings', perm: 'manage_settings' },
        { title: 'مركز التقارير', icon: 'clipboard-check', to: '/reports', perm: 'export_reports' },
        { title: 'خزانة المكتب', icon: 'lock-keyhole', to: '/vault', perm: 'view_files' },
        { title: 'سجل النشاط', icon: 'activity', to: '/activity-log', perm: 'view_activity_logs' }
      ]
    }
  ]

  return baseStructure
    .map((item) => {
      const newItem = { ...item }
      if (newItem.children) {
        newItem.children = newItem.children.filter(
          (c: any) => !c.perm || (typeof can === 'function' && can(c.perm))
        )
      }
      return newItem
    })
    .filter((item: any) => {
      if (item.children) return item.children.length > 0
      return !item.perm || (typeof can === 'function' && can(item.perm))
    })
})

const onMenuClick = () => {
  if (isMobile.value) drawer.value = false
}

watch(isMobile, (newVal) => {
  drawer.value = !newVal
})

watch(
  () => route.path,
  () => {
    if (isMobile.value) drawer.value = false
  }
)

onMounted(() => {
  countdownInterval = setInterval(() => {
    now.value = Date.now()
  }, 60000)
  now.value = Date.now()
})

onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval)
})
</script>

<style>
.app-root-fix {
  background: transparent;
}

.premium-sidebar-modern {
  background: transparent !important;
  border-left: none !important;
  z-index: 900 !important;
  box-shadow: none !important;
}

.premium-sidebar-modern:not(.mobile-drawer) {
  width: 320px !important;
  max-width: 320px !important;
  min-width: 320px !important;
}

.premium-sidebar-modern:not(.mobile-drawer).v-navigation-drawer--rail {
  width: 80px !important;
  max-width: 80px !important;
  min-width: 80px !important;
}

.premium-sidebar-modern.mobile-drawer {
  width: 300px !important;
  max-width: 300px !important;
  min-width: 300px !important;
}

.sidebar-wrapper {
  margin: 12px;
  height: calc(100vh - 24px) !important;
  border-radius: var(--radius-lg) !important;
  background: #1a4b84 !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  box-shadow: 0 28px 80px -40px rgba(0, 0, 0, 0.9) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  overflow: hidden;
}

.sidebar-identity {
  margin-bottom: 40px;
  padding: 24px;
}

.sidebar-nav-list {
  overflow-y: auto;
  scrollbar-width: none;
}
.sidebar-nav-list::-webkit-scrollbar {
  display: none;
}

.menu-item-modern {
  color: #ffffff !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1.5px solid rgba(255, 255, 255, 0.6) !important;
  background: rgba(255, 255, 255, 0.05) !important;
}

.menu-item-modern .v-list-item-title {
  color: inherit !important;
}

.menu-item-modern :deep(.lucide-icon) {
  stroke: #ffffff !important;
}

.menu-item-modern:hover {
  background: #e9c349 !important;
  border-color: #e9c349 !important;
  color: #1a4b84 !important;
  transform: translateX(-4px) scale(1.02);
}

.menu-item-modern:hover :deep(.lucide-icon) {
  stroke: #1a4b84 !important;
}

.v-list-item--active.menu-item-modern {
  background: rgba(233, 195, 73, 0.15) !important;
  color: #e9c349 !important;
  border-color: #e9c349 !important;
  box-shadow: 0 0 20px rgba(233, 195, 73, 0.2) !important;
}

.v-list-item--active.menu-item-modern :deep(.lucide-icon) {
  stroke: #e9c349 !important;
}

.menu-item-child {
  color: rgba(255, 255, 255, 0.7) !important;
  padding-right: 36px !important;
  transition: all 0.3s ease;
  border: 0.5px solid rgba(255, 255, 255, 0.1) !important;
  background: rgba(255, 255, 255, 0.01) !important;
  margin-bottom: 3px !important;
  margin-left: 24px !important;
  min-height: 28px !important;
}

.menu-item-child .v-list-item-title {
  color: inherit !important;
  font-weight: 700 !important;
  font-size: 0.75rem !important;
}

.menu-item-child :deep(.lucide-icon) {
  stroke: rgba(255, 255, 255, 0.7) !important;
  width: 14px !important;
  height: 14px !important;
}

.menu-item-child:hover {
  background: #e9c349 !important;
  color: #1a4b84 !important;
  border-color: #e9c349 !important;
}

.menu-item-child:hover :deep(.lucide-icon) {
  stroke: #1a4b84 !important;
}

.menu-item-child.v-list-item--active {
  color: #e9c349 !important;
  background: rgba(233, 195, 73, 0.1) !important;
  border-color: #e9c349 !important;
}

.glass-header {
  z-index: 1100 !important;
  top: 0 !important;
  left: 0 !important;
  background: var(--glass-bg) !important;
  border-bottom: 1px solid var(--divider) !important;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg) !important;
  box-shadow: 0 18px 50px -34px rgba(15, 23, 42, 0.18) !important;
  backdrop-filter: var(--glass-blur) !important;
  -webkit-backdrop-filter: var(--glass-blur) !important;
  transition: var(--transition-premium);
}

.header-action-btn {
  background: var(--glass-bg) !important;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transition: var(--transition-premium);
}

.header-action-btn:hover {
  border-color: rgba(26, 75, 132, 0.35);
  color: var(--accent);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.dot.green {
  background: var(--success);
  box-shadow: 0 0 8px var(--success);
}

.user-profile-modern {
  cursor: pointer;
  transition: var(--transition-premium);
}
.user-profile-modern:hover {
  background: var(--surface-hover) !important;
  border-color: var(--accent) !important;
}

.border-accent-glow {
  border: 2px solid var(--accent);
  box-shadow: 0 0 15px var(--accent-glow);
}

.glass-card-noir {
  background: var(--glass-noir-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-noir-border);
}

.glass-footer {
  background: var(--glass-bg) !important;
  border-top: 1px solid var(--divider) !important;
  backdrop-filter: var(--glass-blur) !important;
  -webkit-backdrop-filter: var(--glass-blur) !important;
}

.logout-btn-modern {
  border: 1.5px solid rgba(255, 255, 255, 0.4) !important;
  color: white !important;
  transition: all 0.3s ease !important;
}

.logout-btn-modern:hover {
  background: #e9c349 !important;
  color: #1a4b84 !important;
  border-color: #e9c349 !important;
}

.logo-shine-container {
  position: relative;
  width: fit-content;
}

.logo-shimmer {
  position: absolute;
  top: 0;
  left: -150%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.4),
    rgba(233, 195, 73, 0.3),
    transparent
  );
  transform: skewX(-25deg);
  animation: shimmer-swipe 4s infinite cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 2;
}

@keyframes shimmer-swipe {
  0% {
    left: -150%;
  }
  20% {
    left: 150%;
  }
  100% {
    left: 150%;
  }
}

.border-accent-glow {
  border: 2.5px solid #e9c349 !important;
  box-shadow: 0 0 20px rgba(233, 195, 73, 0.25) !important;
}

.premium-fade-enter-active,
.premium-fade-leave-active {
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}
.premium-fade-enter-from,
.premium-fade-leave-to {
  opacity: 0;
  transform: translateY(5px) scale(0.99);
}

@media (max-width: 768px) {
  .glass-header :deep(.v-toolbar-title) {
    font-size: 1rem !important;
  }
}
</style>
