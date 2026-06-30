<template>
  <v-app
    dir="rtl"
    :theme="isDark ? 'dark' : 'light'"
    :class="{ 'dark-mode': isDark, 'juris-crystal-canvas': isDark, 'the-jurist-canvas': !isDark }"
    class="app-root-fix"
  >
    <v-layout full-height :class="{ 'mobile-layout': isMobile }">
      <component
        :is="layoutComponent"
        v-if="layoutComponent"
        v-bind="layoutProps"
        @logout="handleLogout"
        @toggle-theme="toggleTheme"
        @open-support="showSupportDialog = true"
      />
      <router-view v-else />
    </v-layout>

    <!-- Support & Disclaimer Dialog -->
    <v-dialog v-model="showSupportDialog" max-width="550">
      <v-card class="rounded-xl overflow-hidden border glass-card">
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
              <v-icon icon="mdi-close" :size="24" />
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

          <v-card variant="tonal" color="primary" class="rounded-lg pa-4 glass-card">
            <div class="text-subtitle-2 font-weight-black mb-3 d-flex align-center">
              <v-icon icon="mdi-headset" :size="18" class="me-2" />
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
                  <v-icon icon="mdi-email" :size="16" class="me-2" />
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
                  <v-icon icon="mdi-message-text" :size="16" class="me-2" />
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
      <v-card class="rounded-xl border-gold-thin premium-shadow-lg glass-card">
        <v-card-text class="pa-8 text-center">
          <v-avatar color="amber-lighten-4" size="70" class="mb-6">
            <v-icon icon="mdi-shield-alert" :size="36" color="amber-darken-3" />
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
              <v-icon icon="mdi-content-save" :size="20" class="me-2" />
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
    <v-dialog v-model="licensingStore.showWarningDialog" max-width="520" persistent>
      <v-card class="rounded-2xl overflow-hidden glass-card">
        <!-- Header gradient -->
        <div class="pa-8 text-center bg-gold-gradient">
          <v-avatar color="white" size="72" class="mb-4 shadow-lg">
            <v-icon icon="mdi-party-popper" :size="38" color="amber-darken-3" />
          </v-avatar>
          <h2 class="text-h5 font-weight-black text-ebony mb-1">
            شكراً لاستخدام B2B-LAW
          </h2>
          <div class="text-body-2 text-ebony opacity-80">
            تجربتك المجانية انتهت، لكن رحلتك معنا تبدأ الآن!
          </div>
        </div>

        <v-card-text class="pa-6">
          <v-alert
            type="info"
            variant="tonal"
            color="primary"
            class="mb-5 rounded-xl"
            prominent
          >
            <div class="text-body-2">
              بياناتك <strong>محفوظة ومؤمنة</strong> — استأنف العمل فوراً بالاشتراك في الخطة المناسبة.
            </div>
          </v-alert>

          <!-- CTA Buttons -->
          <v-btn
            block
            color="accent"
            size="x-large"
            class="font-weight-black rounded-xl mb-3 premium-btn-gold-gradient text-white"
            @click="goToSubscription"
          >
            <v-icon icon="mdi-crown" :size="22" class="me-2" />
            تفعيل الاشتراك الآن
          </v-btn>

          <v-btn
            block
            variant="outlined"
            color="primary"
            size="large"
            class="font-weight-bold rounded-xl mb-4"
            href="https://wa.me/966567905696"
            target="_blank"
          >
            <v-icon icon="mdi-whatsapp" :size="18" class="me-2" />
            التواصل مع المبيعات
          </v-btn>

          <div class="text-center">
            <v-btn
              variant="text"
              color="grey"
              size="small"
              class="font-weight-bold"
              @click="goToSubscription"
            >
              <v-icon icon="mdi-compare" :size="16" class="me-1" />
              مقارنة الباقات
            </v-btn>
          </div>

          <v-divider class="my-4" />

          <div class="text-center">
            <v-btn
              variant="text"
              color="grey-darken-1"
              class="font-weight-bold"
              @click="licensingStore.showWarningDialog = false"
            >
              متابعة التصفح المجاني
              <v-icon icon="mdi-arrow-left" :size="16" class="me-1" />
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Global Quick View Drawer -->
    <QuickViewDrawer />
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePermissions } from './composables/usePermissions'
import { useLicensingStore } from './stores/licensing'
import { useAppStore } from './stores/app'
import { useMobileLayout } from './composables/useMobileLayout'
import QuickViewDrawer from './components/common/QuickViewDrawer.vue'
import appLogo from './assets/app-logo.png'

const route = useRoute()
const router = useRouter()
const { can, session } = usePermissions()
const licensingStore = useLicensingStore()
const appStore = useAppStore()
const { isMobile } = useMobileLayout()

const isDark = ref(localStorage.getItem('theme') === 'dark')

const isLoginPage = computed(
  () =>
    route.path === '/login' ||
    route.path === '/register' ||
    route.name === 'Login' ||
    route.name === 'Register'
)
const hideLayout = computed(() => isLoginPage.value || route.query.window === 'new')

const currentUser = computed(() => session.value)

const currentRouteName = computed(() => {
  const nameMap: Record<string, string> = {
    Dashboard: 'لوحة التحكم',
    Clients: 'إدارة الموكلين',
    ClientProfile: 'ملف الموكل',
    Cases: 'القضايا والملفات',
    Sessions: 'الجلسات والتقويم',
    Tasks: 'المهام والتذكيرات',
    Finance: 'المالية والمحاسبة',
    Documents: 'الأرشفة والمستندات',
    Memoranda: 'المذكرات واللوائح',
    Contracts: 'العقود',
    Enforcement: 'التنفيذ والتحصيل',
    Profile: 'الملف الشخصي'
  }
  const routeName = (route.name as string) || ''
  return nameMap[routeName] || routeName || 'الرئيسية'
})

const DesktopLayout = computed(() => {
  if (hideLayout.value) return null
  return isMobile.value ? MobileAppShellComponent : DesktopLayoutComponent
})

import { defineAsyncComponent } from 'vue'

const DesktopLayoutComponent = defineAsyncComponent(() => import('./layouts/DesktopLayout.vue'))
const MobileAppShellComponent = defineAsyncComponent(
  () => import('./components/mobile/MobileAppShell.vue')
)

const layoutComponent = computed(() => {
  if (hideLayout.value) return null
  return isMobile.value ? MobileAppShellComponent : DesktopLayoutComponent
})

const layoutProps = computed(() => ({
  isDark: isDark.value,
  developerInfo: developerInfo.value,
  currentUser: currentUser.value,
  currentRouteName: currentRouteName.value,
  isMobile: isMobile.value
}))

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

const goToSubscription = () => {
  licensingStore.showWarningDialog = false
  router.push('/subscription')
}

const toggleTheme = () => {
  isDark.value = !isDark.value
}

const handleLogout = async (force: boolean | any = false): Promise<void> => {
  if (force !== true && appStore.hasUnsavedChanges) {
    showLogoutConfirm.value = true
    return
  }

  localStorage.removeItem('web_isLoggedIn')
  localStorage.removeItem('web_currentUserSession')
  localStorage.removeItem('web_currentUser')
  window.dispatchEvent(new Event('auth-changed'))
  router.replace('/login')
  appStore.clearChanges()
}

const handleSmartLogout = async () => {
  if (typeof __IS_WEB__ !== 'undefined' && __IS_WEB__) {
    appStore.clearChanges()
    showLogoutConfirm.value = false
    handleLogout(true)
    return
  }

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

const handleGlobalClickGate = (e: MouseEvent) => {
  if (!licensingStore.isReadOnly) return
  const target = e.target as HTMLElement
  if (!target) return
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
  window.addEventListener('click', handleGlobalClickGate, { capture: true })

  watch(
    isLoginPage,
    (newVal) => {
      if (!newVal) licensingStore.refreshStatus()
    },
    { immediate: true }
  )

  try {
    if (typeof __IS_WEB__ !== 'undefined' && __IS_WEB__) {
      developerInfo.value = {
        name: 'B2B Legal System',
        logo: appLogo,
        phone: '0567905696',
        email: 'info@saleh-lawyer.com',
        disclaimer: {
          title: 'تنبيه قانوني',
          development:
            'تم تطوير هذا البرنامج لمساعدة المحامين في إدارة مكتباتهم والمحافظة على بياناتهم.',
          legal:
            'هذا البرنامج يعتبر أداة مساعدة فقط ولا يعتبر بديلاً عن الاستشارة القانونية المتخصصة.'
        }
      }
    } else {
      const info = await (window as any).api.system.getDeveloperInfo()
      developerInfo.value = info
    }
  } catch (e) {
    console.error('Failed to fetch dev info', e)
  }

  if (typeof __IS_WEB__ === 'undefined' || !__IS_WEB__) {
    let lastTouchTime = 0
    const TOUCH_THROTTLE_MS = 30000

    const handleUserActivity = (): void => {
      if (isLoginPage.value || route.path === '/lock') return
      const now = Date.now()
      if (now - lastTouchTime > TOUCH_THROTTLE_MS) {
        lastTouchTime = now
        ;(window as any).api?.auth?.touch?.()
      }
    }

    const unbindLockListener =
      typeof (window as any).api?.auth?.onLockTriggered === 'function'
        ? (window as any).api.auth.onLockTriggered(() => {
            if (route.path !== '/lock') router.replace('/lock')
          })
        : () => {}

    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'wheel', 'touchstart']
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true })
    })

    const handleThemeChange = (e: any) => {
      isDark.value = e.detail === 'dark'
    }
    window.addEventListener('theme-changed', handleThemeChange)

    onUnmounted(() => {
      unbindLockListener()
      window.removeEventListener('click', handleGlobalClickGate, { capture: true })
      window.removeEventListener('theme-changed', handleThemeChange)
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity)
      })
    })
  } else {
    onUnmounted(() => {
      window.removeEventListener('click', handleGlobalClickGate, { capture: true })
    })
  }
})
</script>

<style>
.app-root-fix {
  background: transparent;
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

.border-accent-glow {
  border: 2.5px solid #e9c349 !important;
  box-shadow: 0 0 20px rgba(233, 195, 73, 0.25) !important;
}
</style>
