<template>
  <v-app
    dir="rtl"
    :theme="isDark ? 'dark' : 'light'"
    :class="{ 'dark-mode': isDark, 'juris-crystal-canvas': isDark, 'the-jurist-canvas': !isDark }"
    class="app-root-fix"
  >
    <v-layout full-height>
      <!-- Navigation Drawer - Redesigned as Floating Glass -->
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
          <!-- Close button for mobile -->
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
          <!-- Sidebar Header: Identity Section -->
          <div
            class="sidebar-identity rounded-xl elite-glass text-center border-gold-thin"
            :class="{ 'px-2': rail }"
          >
            <div class="logo-shine-container mx-auto mb-5">
              <v-avatar
                :size="isMobile ? 50 : (rail ? 40 : 80)"
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

          <!-- Navigation Menu -->
          <v-list
            v-model:opened="openedGroups"
            density="compact"
            nav
            class="sidebar-nav-list flex-grow-1 pa-0"
          >
            <template v-for="item in categorizedMenu" :key="item.title">
              <!-- Grouped Items -->
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

              <!-- Standalone Item -->
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

          <!-- Sidebar Footer -->
          <div class="sidebar-footer-action mt-auto d-flex flex-column gap-2">
            <v-btn
              block
              color="white"
              variant="tonal"
              size="large"
              class="logout-btn-modern rounded-xl font-weight-black"
              @click="handleLogout"
            >
              <LucideIcon name="log-out" :size="18" :class="rail ? '' : 'me-2'" />
              <span v-if="!rail">تسجيل الخروج</span>
            </v-btn>

            <!-- Technical Support Button for Mobile / Rail -->
            <v-btn
              v-if="isMobile || rail"
              block
              color="accent"
              variant="text"
              size="small"
              class="rounded-xl font-weight-bold"
              @click="showSupportDialog = true"
            >
              <LucideIcon name="info" :size="16" class="me-1" />
              <span>الدعم الفني</span>
            </v-btn>
          </div>
        </div>
      </v-navigation-drawer>

      <!-- Top App Bar - Clean Noir Design -->
      <v-app-bar
        v-if="!hideLayout"
        app
        flat
        :height="isMobile ? 56 : 80"
        class="glass-header"
        :style="{ right: appRightInset }"
      >
        <div class="d-flex align-center w-100 px-6">
          <v-btn v-if="isMobile" icon variant="text" class="me-4 header-action-btn" @click="drawer = !drawer">
            <LucideIcon name="menu" :size="22" />
          </v-btn>
          <v-btn v-else icon variant="text" class="me-4 header-action-btn" @click="rail = !rail">
            <LucideIcon :name="rail ? 'panel-right-open' : 'panel-right-close'" :size="22" />
          </v-btn>

          <v-toolbar-title class="font-weight-black text-h5 text-visible-high">
            <transition name="fade" mode="out-in">
              <span :key="currentRouteName">{{ currentRouteName }}</span>
            </transition>
          </v-toolbar-title>

          <v-spacer></v-spacer>

          <!-- System Status Bar -->
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

          <!-- Date & Time Floating Card -->
          <div class="header-clock pa-2 px-4 rounded-xl border glass-card me-4 hidden-md-and-down">
            <div class="text-subtitle-2 font-weight-black text-primary">{{ currentHijri }}</div>
            <div class="text-tiny text-text-muted font-weight-medium">{{ currentTime }}</div>
          </div>

          <v-btn
            icon
            variant="tonal"
            class="me-4 theme-toggle-btn border"
            @click="isDark = !isDark"
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

      <!-- Main View - Vuetify Layout Aware -->
      <v-main class="main-content-scroll">
        <div class="main-body-wrapper" :class="mainBodyPaddingClass">
          <!-- Premium Read-Only Banner when Trial is Expired -->
          <v-alert
            v-if="trialInfo && !trialInfo.isValid"
            type="warning"
            variant="flat"
            density="comfortable"
            icon="shield-alert"
            class="mb-6 rounded-xl border-warning-glow premium-shadow-sm font-weight-black text-caption"
            prominent
          >
            <div class="d-flex align-center justify-space-between w-100 flex-wrap gap-3">
              <div class="d-flex align-center">
                <LucideIcon name="shield-alert" :size="20" class="me-2" />
                <span
                  >انتهت الفترة التجريبية للبرنامج. تم تفعيل
                  <strong>وضع القراءة فقط</strong> للحفاظ على سلامة بياناتك وتصفحها. يرجى التواصل معنا للتفعيل لتتمكن من إضافة أو تعديل البيانات.</span
                >
              </div>
              <v-btn
                color="amber-darken-3"
                size="small"
                class="rounded-lg text-white font-weight-black"
                @click="router.push('/settings')"
              >
                تنشيط البرنامج الآن
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

      <!-- Clean Minimal Footer -->
      <v-footer
        v-if="!hideLayout && !isMobile"
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
            @click="showSupportDialog = true"
          >
            <div class="text-caption font-weight-bold text-white-50">
              كافة الحقوق محفوظة &copy; {{ new Date().getFullYear() }} — {{ developerInfo.name }}
            </div>
            <LucideIcon name="info" :size="14" class="ms-1" />
          </div>
        </div>
      </v-footer>
    </v-layout>

    <!-- Support & Disclaimer Dialog -->
    <v-dialog v-model="showSupportDialog" max-width="550">
      <v-card class="rounded-xl overflow-hidden border">
        <v-toolbar color="primary" height="80">
          <div class="px-6 d-flex align-center w-100">
            <v-avatar
              v-if="developerInfo?.logo"
              size="50"
              class="me-4 border-white-2 shadow-sm bg-white"
            >
              <v-img :src="developerInfo.logo" />
            </v-avatar>
            <div>
              <div class="text-h6 font-weight-black text-white leading-none mb-1">
                الدعم الفني والبرمجة
              </div>
              <div class="text-caption text-white opacity-80">{{ developerInfo?.name }}</div>
            </div>
            <v-spacer></v-spacer>
            <v-btn icon variant="text" color="white" @click="showSupportDialog = false">
              <LucideIcon name="x" :size="24" />
            </v-btn>
          </div>
        </v-toolbar>

        <v-card-text class="pa-6">
          <div class="text-subtitle-1 font-weight-bold text-primary mb-3">
            {{ developerInfo?.disclaimer?.title }}
          </div>

          <div
            class="text-body-2 text-grey-darken-3 mb-4 leading-normal bg-grey-lighten-4 pa-4 rounded-lg border-s-4 border-primary"
          >
            {{ developerInfo?.disclaimer?.development }}
          </div>

          <v-divider class="mb-4"></v-divider>

          <div class="text-body-2 text-grey-darken-2 mb-6 leading-relaxed">
            {{ developerInfo?.disclaimer?.legal }}
          </div>

          <v-card variant="tonal" color="primary" class="rounded-lg pa-4">
            <div class="text-subtitle-2 font-weight-black mb-3 d-flex align-center">
              <LucideIcon name="headset" :size="18" class="me-2" />
              قنوات التواصل المباشرة
            </div>

            <div class="d-flex flex-column gap-2">
              <v-btn
                v-if="developerInfo?.email"
                variant="text"
                class="justify-start text-none text-body-2"
                density="comfortable"
                :href="`mailto:${developerInfo.email}`"
              >
                <template #prepend>
                  <LucideIcon name="mail" :size="16" class="me-2" />
                </template>
                {{ developerInfo.email }}
              </v-btn>

              <v-btn
                v-if="developerInfo?.phone"
                variant="text"
                class="justify-start text-body-2"
                density="comfortable"
                :href="supportWhatsAppHref"
                target="_blank"
                rel="noreferrer"
              >
                <template #prepend>
                  <LucideIcon name="message-circle" :size="16" class="me-2" />
                </template>
                {{ developerInfo.phone }}
              </v-btn>
            </div>
          </v-card>
        </v-card-text>

        <v-card-actions class="pa-6 pt-0">
          <v-btn
            block
            color="primary"
            variant="elevated"
            height="50"
            class="rounded-lg font-weight-bold"
            @click="showSupportDialog = false"
          >
            إغلاق
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Smart Logout Confirmation Dialog -->
    <v-dialog v-model="showLogoutConfirm" max-width="500" persistent>
      <v-card class="rounded-xl border-gold-thin premium-shadow-lg">
        <v-card-text class="pa-8 text-center">
          <v-avatar color="amber-lighten-4" size="70" class="mb-6">
            <LucideIcon name="shield-alert" :size="36" class="text-amber-darken-3" />
          </v-avatar>
          <h2 class="text-h5 font-weight-black text-pure-black mb-3">تنبيه: تغييرات غير محفوظة</h2>
          <p class="text-body-1 text-grey-darken-3 mb-6">
            لقد قمت بإجراء تعديلات مؤخراً. هل تريد حفظ نسخة احتياطية كاملة من البيانات في **خزانة
            المكتب** قبل تسجيل الخروج؟
          </p>

          <v-alert
            type="info"
            variant="tonal"
            density="compact"
            class="text-caption text-start mb-6 rounded-lg"
          >
            سيتم حفظ الملف تلقائياً في مجلد Backups داخل الخزانة بنفس صيغة أدوات الصيانة.
          </v-alert>

          <div class="d-flex flex-column gap-3">
            <v-btn
              color="primary"
              variant="elevated"
              height="55"
              class="rounded-lg font-weight-bold"
              :loading="isSavingSnapshot"
              @click="handleSmartLogout"
            >
              <template #prepend>
                <LucideIcon name="save" :size="20" class="me-2" />
              </template>
              نعم، احفظ البيانات واخرج
            </v-btn>

            <v-btn
              color="grey-darken-1"
              variant="text"
              height="55"
              class="rounded-lg font-weight-bold"
              :disabled="isSavingSnapshot"
              @click="handleLogout(true)"
            >
              الخروج بدون حفظ التغييرات
            </v-btn>

            <v-btn
              variant="plain"
              height="40"
              class="rounded-lg font-weight-bold mt-2"
              :disabled="isSavingSnapshot"
              @click="showLogoutConfirm = false"
            >
              إلغاء، العودة للبرنامج
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Global Trial Expired / Read-Only Warning Dialog -->
    <v-dialog v-model="licensingStore.showWarningDialog" max-width="500" persistent>
      <v-card class="rounded-xl border-gold-thin premium-shadow-lg text-center pa-8">
        <v-avatar color="amber-lighten-4" size="80" class="mb-6">
          <LucideIcon name="shield-alert" :size="42" class="text-amber-darken-3" />
        </v-avatar>

        <h2 class="text-h5 font-weight-black text-pure-black mb-3">
          عذراً، انتهت الفترة التجريبية
        </h2>

        <p class="text-body-1 text-grey-darken-3 mb-6 leading-relaxed">
          عذراً، انتهت الفترة التجريبية المجانية لـ
          <strong>برنامج المحامي المحترف (30 يوماً)</strong>.
          <br />
          تم تفعيل <strong>"وضع الاطلاع والقراءة فقط"</strong> للحفاظ على سلامة بياناتك وتصفحها بشكل
          كامل. <br /><br />
          يمكنك مواصلة العمل بكامل الصلاحيات وتفعيل النسخة بالاتصال بنا مباشرة أو زيارة موقعنا
          الإلكتروني.
        </p>

        <!-- Action Channels -->
        <v-card variant="tonal" color="primary" class="rounded-xl pa-5 mb-6 text-start">
          <div class="text-subtitle-2 font-weight-black mb-3 d-flex align-center">
            <LucideIcon name="headset" :size="18" class="me-2 text-gold" />
            قنوات الدعم الفني والمبيعات المباشرة:
          </div>

          <div class="d-flex flex-column gap-3">
            <v-btn
              variant="elevated"
              color="success"
              class="justify-start text-body-2 font-weight-black rounded-lg text-white"
              href="https://wa.me/966567905696"
              target="_blank"
            >
              <template #prepend>
                <LucideIcon name="message-circle" :size="18" class="me-2" />
              </template>
              التواصل عبر الواتساب: 0567905696
            </v-btn>

            <v-btn
              variant="outlined"
              color="primary"
              class="justify-start text-body-2 font-weight-black rounded-lg"
              href="https://saleh-lawyer.com/"
              target="_blank"
            >
              <template #prepend>
                <LucideIcon name="globe" :size="18" class="me-2" />
              </template>
              زيارة موقعنا: saleh-lawyer.com
            </v-btn>
          </div>
        </v-card>

        <div class="d-flex gap-3">
          <v-btn
            block
            color="grey-darken-1"
            variant="text"
            height="50"
            class="rounded-lg font-weight-bold"
            @click="licensingStore.showWarningDialog = false"
          >
            متابعة التصفح (للاطلاع فقط)
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { useRoute, useRouter } from 'vue-router'
import { getTodayHijri } from './utils/hijri'
import { usePermissions } from './composables/usePermissions'
import { useLicensingStore } from './stores/licensing'
import { useAppStore } from './stores/app'
import LucideIcon from './components/common/LucideIcon.vue'
import appLogo from './assets/app-logo.png'

const appStore = useAppStore()
console.log('[DEBUG] AppStore initialized:', appStore.hasUnsavedChanges)
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
const drawer = ref(!isMobile.value)

watch(isMobile, (newVal) => {
  drawer.value = !newVal
})

const route = useRoute()
const router = useRouter()

watch(() => route.path, () => {
  if (isMobile.value) {
    drawer.value = false
  }
})

const onMenuClick = () => {
  if (isMobile.value) {
    drawer.value = false
  }
}
const rail = ref(false)
const isDark = ref(localStorage.getItem('theme') === 'dark')
const { can, session } = usePermissions()

const isLoginPage = computed(() => route.path === '/login' || route.path === '/register' || route.name === 'Login' || route.name === 'Register')
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
const openedGroups = ref<string[]>([])

const currentTime = ref(new Date().toLocaleTimeString('ar-SA'))
const licensingStore = useLicensingStore()
const trialInfo = computed(() => licensingStore.trialInfo)
const developerInfo = ref<any>(null)
const showSupportDialog = ref(false)
const showLogoutConfirm = ref(false)
const isSavingSnapshot = ref(false)

const supportWhatsAppHref = computed(() => {
  const raw = String(developerInfo.value?.phone || '')
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  let intl = digits
  if (intl.startsWith('0')) intl = `966${intl.slice(1)}`
  if (!intl.startsWith('966') && intl.length === 9) intl = `966${intl}`
  return `https://wa.me/${intl}`
})

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
  // Explicitly depend on session so this re-computes on auth changes
  const _s = session.value
  const baseStructure = [
    { title: 'لوحة التحكم', icon: 'layout-dashboard', to: '/dashboard' },
    {
      title: 'المتابعة الشاملة',
      icon: 'shield-check',
      to: '/briefing',
      badge: 'جديد'
    },
    { title: 'القضايا', icon: 'gavel', to: '/cases', perm: 'view_cases' },
    {
      title: 'العمل القانوني',
      icon: 'briefcase',
      children: [
        {
          title: 'الجلسات',
          icon: 'calendar-clock',
          to: '/sessions',
          perm: 'view_sessions'
        },
        { title: 'المهام', icon: 'clipboard-list', to: '/tasks', perm: 'view_tasks' },
        {
          title: 'المذكرات واللوائح',
          icon: 'file-text',
          to: '/memoranda',
          perm: 'view_evidence'
        },
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
        {
          title: 'الموكلين',
          icon: 'users',
          to: '/clients',
          perm: 'view_clients'
        },
        {
          title: 'الخصوم',
          icon: 'user-x',
          to: '/defendants',
          perm: 'view_defendants'
        },
        { title: 'الوكالات', icon: 'file-signature', to: '/poa' },
        {
          title: 'المستندات',
          icon: 'folder-search',
          to: '/documents',
          perm: 'view_documents'
        },
        { title: 'الأرشيف', icon: 'archive', to: '/archive' }
      ]
    },
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
        { title: 'إدارة المستخدمين', icon: 'users-2', to: '/users', perm: 'manage_users' },
        { title: 'الإعدادات', icon: 'settings', to: '/settings', perm: 'manage_settings' },
        { title: 'مركز التقارير', icon: 'clipboard-check', to: '/reports', perm: 'export_reports' },
        { title: 'خزانة المكتب', icon: 'lock-keyhole', to: '/vault', perm: 'view_files' },
        {
          title: 'سجل النشاط',
          icon: 'activity',
          to: '/activity-log',
          perm: 'view_activity_logs'
        }
      ]
    }
  ]

  // Helper: check permission using current session
  const hasPermission = (perm?: string): boolean => {
    if (!perm) return true
    if (!_s) return false
    if (_s.roleKey === 'admin') return true
    return Array.isArray((_s as any).permissions) && ((_s as any).permissions as string[]).includes(perm)
  }

  return baseStructure
    .map((item: any) => {
      const newItem = { ...item }
      if (newItem.children) {
        newItem.children = newItem.children.filter(
          (c: any) => hasPermission(c.perm)
        )
      }
      return newItem
    })
    .filter((item: any) => {
      if (item.children) return item.children.length > 0
      return hasPermission(item.perm)
    })
})

const handleLogout = async (force: boolean | any = false): Promise<void> => {
  console.log(
    '[DEBUG] handleLogout called. force:',
    force,
    'hasUnsavedChanges:',
    appStore.hasUnsavedChanges
  )
  if (force !== true && appStore.hasUnsavedChanges) {
    showLogoutConfirm.value = true
    return
  }

  localStorage.removeItem('web_isLoggedIn')
  router.push('/login')
  appStore.clearChanges()
}

const handleSmartLogout = async () => {
  isSavingSnapshot.value = true
  try {
    const res = await (window as any).api.system.exportAutoSnapshotToVault()
    if (res.success) {
      appStore.clearChanges()
      showLogoutConfirm.value = false
      handleLogout(true)
    } else {
      alert('فشل حفظ النسخة الاحتياطية: ' + res.message)
    }
  } catch (e: any) {
    console.error(e)
    alert('حدث خطأ أثناء الحفظ التلقائي: ' + (e.message || e))
  } finally {
    isSavingSnapshot.value = false
  }
}

watch(isDark, (val) => {
  const theme = val ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
})

// Global Intercept Gate for Read-Only Mode (Add / Delete / Print Blocks)
const handleGlobalClickGate = (e: MouseEvent) => {
  if (!licensingStore.isReadOnly) return

  const target = e.target as HTMLElement
  if (!target) return

  // Inspect if the click is on a button, link, list item, or general clickable item that performs write/print actions
  const clickable = target.closest('button, a, .v-btn, .v-list-item') as HTMLElement
  if (!clickable) return

  const text = clickable.textContent || ''
  const normalizedText = text.trim().toLowerCase()

  const blockKeywords = [
    'إضافة',
    'اضافة',
    'إنشاء',
    'انشاء',
    'جديد',
    'جديدة',
    'طباعة',
    'تصدير',
    'رفع',
    'حذف'
  ]

  const shouldBlock = blockKeywords.some((keyword) => normalizedText.includes(keyword))

  if (shouldBlock) {
    // Exclude settings/activation actions so they can still activate
    const isActivationAction =
      normalizedText.includes('تنشيط') ||
      normalizedText.includes('تفعيل') ||
      normalizedText.includes('إغلاق') ||
      normalizedText.includes('اغلاق')
    if (isActivationAction) return

    e.stopPropagation()
    e.preventDefault()
    licensingStore.triggerReadOnlyWarning()
  }
}

onMounted(async () => {
  const theme = isDark.value ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', theme)

  // Attach global read-only click capture gate
  window.addEventListener('click', handleGlobalClickGate, { capture: true })

  // Restore session if logged in to guarantee permissions are loaded
  const isLoggedIn = localStorage.getItem('web_isLoggedIn') === 'true'
  if (isLoggedIn) {
    try {
      const s = await (window as any).api.auth.getSession()
      if (s) {
        localStorage.setItem('web_currentUserSession', JSON.stringify(s))
        localStorage.setItem(
          'web_currentUser',
          JSON.stringify({ username: s.username, roleKey: s.roleKey })
        )
        window.dispatchEvent(new Event('auth-changed'))
      }
    } catch (e) {
      console.error('[AUTH] Failed to restore session on mount:', e)
    }
  }

  // Fetch Trial Info via Store
  licensingStore.refreshStatus()

  // Fetch Developer Info
  try {
    const info = await (window as any).api.system.getDeveloperInfo()
    developerInfo.value = info
  } catch (e) {
    console.error('Failed to fetch dev info', e)
  }

  // --- Inactivity Tracking (Auto-Lock) ---
  let lastTouchTime = 0
  const TOUCH_THROTTLE_MS = 30000 // 30 seconds

  const handleUserActivity = (): void => {
    if (isLoginPage.value || route.path === '/lock') return

    const now = Date.now()
    if (now - lastTouchTime > TOUCH_THROTTLE_MS) {
      lastTouchTime = now
      ;(window as any).api?.auth?.touch?.()
    }
  }

  // Handle sudden lock triggers from main process (idle timeout)
  const unbindLockListener =
    typeof (window as any).api?.auth?.onLockTriggered === 'function'
      ? (window as any).api.auth.onLockTriggered(() => {
          if (route.path !== '/lock') {
            router.replace('/lock')
          }
        })
      : () => {}

  // Listeners for user activity
  const activityEvents = ['mousemove', 'keydown', 'mousedown', 'wheel', 'touchstart']
  activityEvents.forEach((event) => {
    window.addEventListener(event, handleUserActivity, { passive: true })
  })

  // Listen for theme changes from settings
  const handleThemeChange = (e: any) => {
    isDark.value = e.detail === 'dark'
  }
  window.addEventListener('theme-changed', handleThemeChange)

  // Cleanup on unmount
  onUnmounted(() => {
    unbindLockListener()
    window.removeEventListener('click', handleGlobalClickGate, { capture: true })
    window.removeEventListener('theme-changed', handleThemeChange)
    activityEvents.forEach((event) => {
      window.removeEventListener(event, handleUserActivity)
    })
  })
})
</script>

<style>
.app-root-fix {
  background: transparent;
}

/* ============================================================
   APP SHELL — SIDEBAR, HEADER, FOOTER
   Premium Enterprise Law SaaS Styling
   ============================================================ */

/* ---- Sidebar Drawer ---- */
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
  z-index: 2500 !important;
}

/* ---- Sidebar Inner Wrapper ---- */
.sidebar-wrapper {
  margin: 10px;
  height: calc(100vh - 20px) !important;
  border-radius: 16px !important;
  background: var(--sidebar-bg) !important;
  border: 1px solid rgba(233, 195, 73, 0.12) !important;
  box-shadow: 0 24px 80px -32px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;
  overflow: hidden;
}

/* ---- Sidebar Identity Section ---- */
.sidebar-identity {
  margin-bottom: 20px;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(233, 195, 73, 0.12);
}

.sidebar-identity .v-avatar {
  border: 2px solid rgba(233, 195, 73, 0.3);
  box-shadow: 0 0 20px rgba(233, 195, 73, 0.15);
  transition: var(--transition-smooth);
}

.sidebar-identity .v-avatar:hover {
  border-color: var(--accent);
  box-shadow: 0 0 30px rgba(233, 195, 73, 0.25);
}

/* ---- Sidebar Navigation List ---- */
.sidebar-nav-list {
  overflow-y: auto !important;
  scrollbar-width: none;
  padding: 0 8px !important;
  min-height: 0 !important;
  flex: 1 1 0% !important;
  margin-bottom: 12px !important;
}
.sidebar-nav-list::-webkit-scrollbar {
  display: none;
}

/* ---- Sidebar Menu Items (Top-level / Standalone) ---- */
.menu-item-modern {
  color: var(--sidebar-text) !important;
  transition: var(--transition-smooth);
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  background: rgba(255, 255, 255, 0.03) !important;
  border-radius: 10px !important;
  margin-bottom: 4px !important;
  min-height: 44px !important;
}

.menu-item-modern .v-list-item-title {
  color: inherit !important;
  font-size: 0.85rem !important;
}

.menu-item-modern :deep(.lucide-icon) {
  stroke: var(--sidebar-text) !important;
  transition: var(--transition-fast);
}

.menu-item-modern:hover {
  background: rgba(233, 195, 73, 0.12) !important;
  border-color: rgba(233, 195, 73, 0.3) !important;
  color: #FFFFFF !important;
  transform: translateX(-2px);
}

.menu-item-modern:hover :deep(.lucide-icon) {
  stroke: var(--accent) !important;
}

.v-list-item--active.menu-item-modern {
  background: rgba(233, 195, 73, 0.14) !important;
  color: var(--accent) !important;
  border-color: rgba(233, 195, 73, 0.4) !important;
  box-shadow: 0 0 16px rgba(233, 195, 73, 0.10) !important;
}

.v-list-item--active.menu-item-modern :deep(.lucide-icon) {
  stroke: var(--accent) !important;
}

/* ---- Sidebar Sub-menu Items (Children) ---- */
.menu-item-child {
  color: var(--sidebar-text) !important;
  padding-right: 32px !important;
  transition: var(--transition-smooth);
  border: none !important;
  background: transparent !important;
  margin-bottom: 2px !important;
  margin-left: 16px !important;
  margin-right: 8px !important;
  min-height: 34px !important;
  border-radius: 8px !important;
}

.menu-item-child .v-list-item-title {
  color: inherit !important;
  font-weight: 600 !important;
  font-size: 0.78rem !important;
}

.menu-item-child :deep(.lucide-icon) {
  stroke: var(--sidebar-text) !important;
  width: 16px !important;
  height: 16px !important;
  opacity: 0.7;
}

.menu-item-child:hover {
  background: rgba(233, 195, 73, 0.08) !important;
  color: #FFFFFF !important;
}

.menu-item-child:hover :deep(.lucide-icon) {
  stroke: var(--accent) !important;
  opacity: 1;
}

.menu-item-child.v-list-item--active {
  color: var(--accent) !important;
  background: rgba(233, 195, 73, 0.10) !important;
}

.menu-item-child.v-list-item--active :deep(.lucide-icon) {
  stroke: var(--accent) !important;
  opacity: 1;
}

/* ---- v-list-group activator caret ---- */
.v-list-group :deep(.v-list-group__header .v-list-item__append .v-icon) {
  color: var(--sidebar-text) !important;
  opacity: 0.6;
}

/* ---- Glass Header (Top App Bar) ---- */
.glass-header {
  z-index: 1100 !important;
  top: 0 !important;
  left: 0 !important;
  background: var(--glass-bg) !important;
  border-bottom: 1px solid var(--divider) !important;
  border-radius: 0 !important;
  box-shadow: 0 1px 0 var(--divider), 0 4px 20px -8px rgba(0, 0, 0, 0.06) !important;
  backdrop-filter: var(--glass-blur) !important;
  -webkit-backdrop-filter: var(--glass-blur) !important;
  transition: var(--transition-premium);
}

[data-theme='dark'] .glass-header {
  border-bottom: 1px solid rgba(233, 195, 73, 0.08) !important;
  box-shadow: 0 1px 0 rgba(233, 195, 73, 0.06), 0 4px 24px -8px rgba(0, 0, 0, 0.3) !important;
}

.header-action-btn {
  background: var(--glass-bg) !important;
  border: 1px solid var(--border);
  border-radius: 8px;
  transition: var(--transition-smooth);
}

.header-action-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-alpha) !important;
}

/* ---- Status Indicators ---- */
.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.dot.green {
  background: var(--success);
  box-shadow: 0 0 6px var(--success);
}

.status-chip {
  font-size: 0.7rem !important;
  height: 24px !important;
}

/* ---- User Profile ---- */
.user-profile-modern {
  cursor: pointer;
  transition: var(--transition-smooth);
}
.user-profile-modern:hover {
  background: var(--surface-hover) !important;
  border-color: var(--accent) !important;
}

/* ---- Accent Glow Border ---- */
.border-accent-glow {
  border: 2px solid var(--accent);
  box-shadow: 0 0 15px var(--accent-glow);
}

/* ---- Glass Footer ---- */
.glass-footer {
  background: var(--glass-bg) !important;
  border-top: 1px solid var(--divider) !important;
  backdrop-filter: var(--glass-blur) !important;
  -webkit-backdrop-filter: var(--glass-blur) !important;
}

/* ---- Logout Button ---- */
.logout-btn-modern {
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  color: var(--sidebar-text) !important;
  transition: var(--transition-smooth) !important;
  background: rgba(255, 255, 255, 0.04) !important;
}

.logout-btn-modern:hover {
  background: rgba(233, 195, 73, 0.12) !important;
  color: var(--accent) !important;
  border-color: rgba(233, 195, 73, 0.3) !important;
}

/* ---- Logo Shine Animation ---- */
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
    rgba(255, 255, 255, 0.3),
    rgba(233, 195, 73, 0.2),
    transparent
  );
  transform: skewX(-25deg);
  animation: shimmer-swipe 4s infinite cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 2;
}

@keyframes shimmer-swipe {
  0% { left: -150%; }
  20% { left: 150%; }
  100% { left: 150%; }
}

/* ---- Page Transitions ---- */
.premium-fade-enter-active,
.premium-fade-leave-active {
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.premium-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.premium-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ---- Mobile Responsive ---- */
@media (max-width: 768px) {
  .glass-header :deep(.v-toolbar-title) {
    font-size: 1rem !important;
  }

  .glass-header :deep(.v-btn.me-4.header-action-btn) {
    min-height: 40px;
    min-width: 40px;
  }

  .glass-header :deep(.status-container) {
    display: none !important;
  }

  .glass-header :deep(.header-clock) {
    display: none !important;
  }

  .glass-header :deep(.user-profile-modern .text-right.me-4) {
    display: none !important;
  }

  .glass-header :deep(.user-profile-modern) {
    padding: 4px !important;
  }

  .glass-header :deep(.user-profile-modern .v-avatar) {
    width: 36px !important;
    height: 36px !important;
  }

  .glass-header :deep(.theme-toggle-btn) {
    min-width: 40px;
    min-height: 40px;
    margin-right: 4px !important;
    flex-shrink: 0;
    border: 1px solid var(--border) !important;
    background: var(--glass-bg) !important;
    border-radius: 10px !important;
  }

  .glass-header :deep(.theme-toggle-btn:hover) {
    border-color: var(--accent) !important;
    background: var(--accent-alpha) !important;
  }

  .glass-header :deep(.theme-toggle-btn .lucide-icon) {
    stroke: var(--gold, #E9C349) !important;
  }

  .dark-mode .glass-header :deep(.theme-toggle-btn .lucide-icon) {
    stroke: var(--gold, #E9C349) !important;
  }

  .the-jurist-canvas .glass-header :deep(.theme-toggle-btn .lucide-icon) {
    stroke: var(--primary-dark, #1A437D) !important;
  }

  .glass-footer {
    height: 28px !important;
  }

  .glass-footer :deep(.text-caption) {
    font-size: 0.65rem !important;
  }

  .glass-footer :deep(.dev-credit .text-caption) {
    display: none;
  }
}
</style>
