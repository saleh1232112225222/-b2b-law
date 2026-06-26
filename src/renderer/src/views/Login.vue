<template>
  <v-container fluid class="fill-height login-container pa-0">
    <MockBanner />
    <!-- Premium Cinematic Background -->
    <div class="background-wrapper">
      <div class="background-overlay"></div>
    </div>

    <v-row no-gutters class="fill-height z-10" align="center" justify="center">
      <v-col cols="12" sm="9" md="6" lg="4" class="d-flex flex-column align-center px-4">
        <!-- Glassmorphism Login Card -->
        <v-card class="premium-glass-card pa-10 w-100 rtl glass-card" elevation="0">
          <!-- Card Glow Effect Corners -->
          <div class="corner-glow top-left"></div>
          <div class="corner-glow bottom-right"></div>

          <!-- Logo & Branding -->
          <div class="branding-header text-center mb-6">
            <div class="logo-stack mb-2">
              <div class="logo-shield">
                <LucideIcon name="shield" :size="48" class="text-gold main-shield" />
                <LucideIcon name="scale" :size="24" class="text-gold inner-scales" />
              </div>
              <h1 class="brand-title">B2B Lawyer Pro</h1>
            </div>
            <h2 class="welcome-back">مرحباً بعودتك</h2>
          </div>

          <v-form v-model="formValid" class="login-form" @submit.prevent="handleLogin">
            <!-- Username/Email Field -->
            <div class="input-group mb-6">
              <label class="input-label">اسم المستخدم</label>
              <v-text-field
                id="username-input"
                v-model="username"
                placeholder="عنوان البريد الإلكتروني"
                variant="outlined"
                class="premium-input glass-input"
                hide-details
                :rules="[(v) => !!v || 'اسم المستخدم مطلوب']"
                required
              ></v-text-field>
            </div>

            <!-- Password Field -->
            <div class="input-group mb-8">
              <label class="input-label">كلمة المرور</label>
              <v-text-field
                id="password-input"
                v-model="password"
                placeholder="أدخل كلمة المرور"
                type="password"
                variant="outlined"
                class="premium-input glass-input"
                hide-details
                :rules="[(v) => !!v || 'كلمة المرور مطلوبة']"
                required
              >
                <template #prepend-inner>
                  <LucideIcon name="key" :size="18" class="text-gold-muted me-2" />
                </template>
              </v-text-field>
            </div>

            <!-- Submit Button -->
            <v-btn
              id="login-submit-btn"
              type="submit"
              block
              height="56"
              class="premium-submit-btn mb-4 premium-btn-gold-gradient"
              :loading="loading"
              :disabled="!formValid"
            >
              تسجيل الدخول
            </v-btn>

            <template v-if="!isDesktop">
              <!-- Google Sign-in Divider -->
              <div class="divider-with-text mb-4">
                <span class="divider-text">أو</span>
              </div>

              <!-- Google Sign-in Button -->
              <v-btn
                block
                height="50"
                class="google-signin-btn mb-6 premium-btn-gold-gradient"
                @click="handleGoogleLogin"
              >
                <template #prepend>
                  <svg width="20" height="20" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.54 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.77.87 7.35 2.56 10.56l7.98-5.97z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.97C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                </template>
                تسجيل الدخول عبر Google
              </v-btn>
            </template>

            <!-- Bottom Links -->
            <div class="form-footer text-center">
              <a href="#" class="footer-link" @click.prevent="openRecovery">نسيت كلمة المرور؟</a>
              <template v-if="!isDesktop">
                <span class="footer-divider">|</span>
                <a href="#" class="footer-link" @click.prevent="router.push('/register')"
                  >إنشاء حساب جديد</a
                >
              </template>
            </div>
          </v-form>

          <!-- Suspended Account Alert -->
          <v-fade-transition>
            <div v-if="accountSuspended" class="suspended-alert mt-4">
              <div class="suspended-alert-inner">
                <div class="suspended-header">
                  <v-icon icon="mdi-information" size="24" class="me-2" color="#b45309" />
                  <span class="suspended-title">الوصول إلى حسابك موقوف مؤقتاً</span>
                </div>
                <p class="suspended-desc">
                  فريق الدعم جاهز لإعادة تفعيله خلال دقائق. اضغط للتواصل مباشرة.
                </p>
                <a
                  href="https://wa.me/966567905696"
                  target="_blank"
                  rel="noopener"
                  class="suspended-btn"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white" class="me-2">
                    <path
                      d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
                    />
                  </svg>
                  تواصل عبر واتساب
                </a>
                <div class="suspended-footer">
                  <span>أو زر</span>
                  <a
                    href="https://saleh-lawyer.com"
                    target="_blank"
                    rel="noopener"
                    class="suspended-link"
                  >
                    saleh-lawyer.com
                  </a>
                </div>
                <div class="suspended-brand">— فريق B2B-LAW</div>
              </div>
            </div>
          </v-fade-transition>

          <!-- Generic Error Alert -->
          <v-fade-transition>
            <v-alert
              v-if="error && !accountSuspended"
              type="error"
              variant="tonal"
              density="compact"
              class="mt-4 error-alert"
              closable
            >
              {{ error }}
            </v-alert>
          </v-fade-transition>
        </v-card>

        <!-- Recovery Modal -->
        <v-dialog v-model="recoveryDialog" max-width="500" persistent>
          <v-card
            class="premium-glass-card border-gold border-2 overflow-hidden rounded-2xl ga-4 glass-card"
          >
            <div class="pa-6 bg-gold-gradient text-ebony d-flex align-center">
              <LucideIcon name="shield-key" :size="24" class="me-3" />
              <span class="text-h6 font-weight-black">استعادة كلمة المرور</span>
              <v-spacer />
              <v-btn
                class="premium-btn-gold-gradient"
                icon
                variant="text"
                color="ebony"
                :disabled="recoveryLoading"
                @click="recoveryDialog = false"
              >
                <LucideIcon name="x" :size="24" />
              </v-btn>
            </div>

            <v-card-text class="pa-8 rtl">
              <div v-if="recoveryStep === 1">
                <div class="text-subtitle-1 text-gold mb-6 font-weight-bold">
                  الخطوة 1: التحقق من الهوية
                </div>

                <div class="input-group mb-6">
                  <label class="input-label">اسم المستخدم</label>
                  <v-text-field
                    v-model="recoveryForm.username"
                    variant="outlined"
                    class="premium-input glass-input"
                    placeholder="أدخل اسم المستخدم"
                    hide-details
                  />
                </div>

                <div class="input-group mb-6">
                  <label class="input-label">البريد الإلكتروني المسجل</label>
                  <v-text-field
                    v-model="recoveryForm.email"
                    variant="outlined"
                    class="premium-input glass-input"
                    placeholder="example@email.com"
                    hide-details
                  />
                </div>
              </div>

              <div v-if="recoveryStep === 2">
                <div class="text-subtitle-1 text-gold mb-6 font-weight-bold">
                  الخطوة 2: سؤال الأمان
                </div>

                <v-alert variant="tonal" color="gold" class="mb-6 py-4">
                  <div class="text-caption text-gold opacity-60 mb-1">السؤال السري:</div>
                  <div class="text-h6 font-weight-black text-white">
                    {{ recoveryForm.question }}
                  </div>
                </v-alert>

                <div class="input-group mb-6">
                  <label class="input-label">الإجابة</label>
                  <v-text-field
                    v-model="recoveryForm.answer"
                    variant="outlined"
                    class="premium-input glass-input"
                    placeholder="اكتب الإجابة هنا..."
                    hide-details
                  />
                </div>

                <div class="input-group mb-6">
                  <label class="input-label">كلمة المرور الجديدة</label>
                  <v-text-field
                    v-model="recoveryForm.newPassword"
                    variant="outlined"
                    class="premium-input glass-input"
                    type="password"
                    placeholder="أدخل كلمة المرور الجديدة"
                    hide-details
                  />
                </div>
              </div>

              <div v-if="recoveryStep === 3" class="text-center py-8">
                <div class="success-icon-wrapper mb-6">
                  <LucideIcon name="check-circle" :size="80" class="text-success" />
                </div>
                <div class="text-h5 font-weight-black text-white mb-2">
                  تم تغيير كلمة المرور بنجاح!
                </div>
                <div class="text-subtitle-1 text-gold opacity-60">
                  يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.
                </div>
              </div>

              <v-fade-transition>
                <v-alert
                  v-if="recoveryError"
                  type="error"
                  variant="tonal"
                  density="compact"
                  class="mt-4"
                >
                  {{ recoveryError }}
                </v-alert>
              </v-fade-transition>
            </v-card-text>

            <v-card-actions v-if="recoveryStep !== 3" class="pa-8 pt-0 ga-3">
              <v-btn
                variant="text"
                color="gold"
                class="font-weight-black premium-btn-gold-gradient"
                :disabled="recoveryLoading"
                @click="recoveryDialog = false"
                >إلغاء</v-btn
              >
              <v-spacer />
              <v-btn
                v-if="recoveryStep === 1"
                color="gold"
                variant="flat"
                class="px-8 font-weight-black premium-lift premium-btn-gold-gradient"
                :loading="recoveryLoading"
                :disabled="!recoveryForm.username || !recoveryForm.email"
                @click="handleGetQuestion"
              >
                التحقق والمتابعة
              </v-btn>
              <v-btn
                v-if="recoveryStep === 2"
                color="gold"
                variant="flat"
                class="px-8 font-weight-black premium-lift premium-btn-gold-gradient"
                :loading="recoveryLoading"
                :disabled="!recoveryForm.answer || !recoveryForm.newPassword"
                @click="handleVerifyAndReset"
              >
                تغيير كلمة المرور
              </v-btn>
            </v-card-actions>

            <v-card-actions v-else class="pa-8 pt-0 justify-center">
              <v-btn
                color="gold"
                variant="flat"
                class="px-12 font-weight-black premium-lift premium-btn-gold-gradient"
                @click="recoveryDialog = false"
                >إغلاق والعودة للدخول</v-btn
              >
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Version Info -->
        <div class="version-tag mt-8 opacity-40">
          <span class="text-white text-tiny font-weight-bold">B2B LAWYER PRO v5.0</span>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import LucideIcon from '../components/common/LucideIcon.vue'
import MockBanner from '../components/MockBanner.vue'
import { getApiMode } from '../api/ApiAdapter'

const router = useRouter()
const route = useRoute()
const username = ref('admin')
const password = ref('')
const loading = ref(false)
const error = ref('')
const accountSuspended = ref(false)
const formValid = ref(false)

const isDesktop = computed(() => getApiMode() === 'desktop')

// Recovery Flow
const recoveryDialog = ref(false)
const recoveryStep = ref(1) // 1: Info, 2: Question, 3: Success
const recoveryLoading = ref(false)
const recoveryError = ref('')
const recoveryForm = ref({
  username: '',
  email: '',
  question: '',
  answer: '',
  newPassword: ''
})

const openRecovery = () => {
  recoveryForm.value = { username: '', email: '', question: '', answer: '', newPassword: '' }
  recoveryStep.value = 1
  recoveryError.value = ''
  recoveryDialog.value = true
}

const handleGetQuestion = async () => {
  if (!recoveryForm.value.username || !recoveryForm.value.email) return
  recoveryLoading.value = true
  recoveryError.value = ''
  try {
    const question = await (window as any).api.auth.getRecoveryQuestion(
      recoveryForm.value.username,
      recoveryForm.value.email
    )
    recoveryForm.value.question = question
    recoveryStep.value = 2
  } catch (e: any) {
    recoveryError.value = e.message || 'لم يتم العثور على بيانات مطابقة'
  } finally {
    recoveryLoading.value = false
  }
}

const handleVerifyAndReset = async () => {
  if (!recoveryForm.value.answer || !recoveryForm.value.newPassword) return
  recoveryLoading.value = true
  recoveryError.value = ''
  try {
    await (window as any).api.auth.verifyAndReset(
      recoveryForm.value.username,
      recoveryForm.value.answer,
      recoveryForm.value.newPassword
    )
    recoveryStep.value = 3
  } catch (e: any) {
    recoveryError.value = e.message || 'الإجابة غير صحيحة أو حدث خطأ'
  } finally {
    recoveryLoading.value = false
  }
}

const handleGoogleLogin = () => {
  localStorage.removeItem('mock_active')
  const baseUrl =
    typeof (window as any).__API_BASE_URL__ !== 'undefined'
      ? (window as any).__API_BASE_URL__
      : '/api'
  window.location.href = `${baseUrl}/auth/google`
}

onMounted(async () => {
  // Handle error redirects from Google OAuth (e.g. AccountSuspended, google_failed)
  const queryError = route.query.error as string
  const queryMessage = route.query.message as string
  if (queryError) {
    if (queryError === 'AccountSuspended') {
      accountSuspended.value = true
      error.value = queryMessage || 'تم إيقاف هذا الحساب مؤقتاً. يرجى التواصل مع الدعم الفني.'
    } else if (queryError === 'google_failed') {
      error.value = 'فشل تسجيل الدخول عبر Google. يرجى المحاولة مرة أخرى.'
    } else {
      error.value = queryMessage || 'حدث خطأ. يرجى المحاولة مرة أخرى.'
    }
    // Clean up query params without reloading
    router.replace({ query: {} })
    return
  }

  const googleToken = route.query.google_token as string
  if (googleToken) {
    localStorage.setItem('b2b_cloud_token', googleToken)
    localStorage.setItem('web_isLoggedIn', 'true')

    // Clear mock mode and legacy desktop storage keys to avoid conflicts
    localStorage.removeItem('mock_active')
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('currentUser')
    localStorage.removeItem('currentUserSession')

    try {
      const session = await (window as any).api.auth.getSession()
      if (session) {
        localStorage.setItem(
          'web_currentUser',
          JSON.stringify({ username: session.username, roleKey: session.roleKey })
        )
        localStorage.setItem('web_currentUserSession', JSON.stringify(session))
      }
    } catch (e) {
      console.error('[AUTH] Failed to fetch session after Google login:', e)
    }

    window.dispatchEvent(new Event('auth-changed'))
    router.replace('/dashboard')
  }
})

const handleLogin = async () => {
  if (!username.value || !password.value) return

  loading.value = true
  error.value = ''
  accountSuspended.value = false

  try {
    let session: any
    // Always use real API login - no mock bypass
    localStorage.removeItem('mock_active')
    session = await (window as any).api.auth.login(username.value, password.value)

    // Clear any legacy desktop storage keys to avoid conflicts
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('currentUser')
    localStorage.removeItem('currentUserSession')
    // Store session data under a web-specific namespace
    localStorage.setItem('web_isLoggedIn', 'true')

    // Build the session object — for admin/admin bypass we must include roleKey
    const sessionToStore = {
      userId: session.id || 'admin-bypass',
      username: session.username,
      roleKey: session.roleKey,
      companyId: session.companyId || null,
      permissions: session.permissions || [],
      trialExpired: session.trialExpired || false,
      subscriptionStatus: session.subscriptionStatus || 'trial',
      mustChangePassword: session.mustChangePassword || false
    }
    localStorage.setItem(
      'web_currentUser',
      JSON.stringify({ username: session.username, roleKey: session.roleKey })
    )
    localStorage.setItem('web_currentUserSession', JSON.stringify(sessionToStore))
    window.dispatchEvent(new Event('auth-changed'))

    if (session.mustChangePassword) {
      router.push('/force-password-change')
      return
    }

    router.replace('/dashboard')
  } catch (e: any) {
    const errData = e?.response?.data?.error || e?.message || ''
    if (
      errData === 'TrialExpired' ||
      e?.response?.data?.message === 'TrialExpired' ||
      errData === 'TrialExpiredWriteForbidden'
    ) {
      error.value = 'مرحباً بعودتك! بياناتك محفوظة — جاري تحويلك لتفعيل الاشتراك.'
      setTimeout(() => {
        router.push('/subscription')
      }, 2000)
    } else if (
      errData === 'AccountNotVerified' ||
      e?.response?.data?.message === 'AccountNotVerified'
    ) {
      error.value = 'هذا الحساب لم يتم تفعيله بعد! جاري تحويلك لصفحة إدخال رمز التفعيل...'
      setTimeout(() => {
        router.push({ path: '/register', query: { verify: '1', username: username.value } })
      }, 2000)
    } else if (errData === 'AccountSuspended' || e?.response?.data?.error === 'AccountSuspended') {
      accountSuspended.value = true
      error.value = 'suspended'
    } else {
      error.value =
        e?.response?.data?.error || e?.message || 'خطأ! اسم المستخدم أو كلمة المرور غير صحيحة'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');

.login-container {
  background-color: #040810;
  position: relative;
  overflow: hidden;
  font-family: 'Cairo', 'Almarai', sans-serif !important;
}

.background-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('../assets/login-bg-premium.png');
  background-size: cover;
  background-position: center;
}

.background-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.9) 100%);
}

.z-10 {
  position: relative;
  z-index: 10;
}

.premium-glass-card {
  background: rgba(255, 255, 255, 0.03) !important;
  backdrop-filter: blur(25px) saturate(150%);
  -webkit-backdrop-filter: blur(25px) saturate(150%);
  border: 1px solid rgba(233, 195, 73, 0.25) !important;
  border-radius: 24px !important;
  position: relative;
  overflow: visible;
}

.corner-glow {
  position: absolute;
  width: 60px;
  height: 60px;
  background: radial-gradient(circle, rgba(233, 195, 73, 0.3) 0%, transparent 70%);
  filter: blur(10px);
  z-index: -1;
}

.top-left {
  top: -10px;
  left: -10px;
}

.bottom-right {
  bottom: -10px;
  right: -10px;
}

.logo-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.logo-shield {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.main-shield {
  opacity: 0.9;
  filter: drop-shadow(0 0 10px rgba(233, 195, 73, 0.4));
}

.inner-scales {
  position: absolute;
  top: 55%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.brand-title {
  color: #e9c349;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 1px;
  margin: 0;
}

.welcome-back {
  color: #e9c349;
  font-size: 2rem;
  font-weight: 800;
  margin-top: 8px;
  text-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}

.input-label {
  display: block;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  font-weight: 700;
  margin-bottom: 8px;
  text-align: right;
}

.premium-input :deep(.v-field) {
  background: rgba(0, 0, 0, 0.4) !important;
  border-radius: 12px !important;
  border: 1px solid rgba(233, 195, 73, 0.2) !important;
  transition: all 0.3s ease;
}

.premium-input :deep(.v-field--focused) {
  border-color: rgba(233, 195, 73, 0.8) !important;
  box-shadow: 0 0 15px rgba(233, 195, 73, 0.15);
}

.premium-input :deep(input) {
  color: white !important;
  font-weight: 400;
  padding-top: 12px !important;
  padding-bottom: 12px !important;
}

.premium-input :deep(.v-field__outline) {
  display: none;
}

.text-gold-muted {
  color: rgba(233, 195, 73, 0.6);
}

.premium-submit-btn {
  background: linear-gradient(135deg, #e9c349 0%, #b88a14 100%) !important;
  color: #0c0e14 !important;
  font-weight: 800 !important;
  font-size: 1.1rem !important;
  border-radius: 12px !important;
  text-transform: none !important;
  box-shadow: 0 8px 20px rgba(184, 138, 20, 0.3) !important;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.premium-submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 25px rgba(184, 138, 20, 0.5) !important;
}

.form-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
}

.footer-link {
  color: #e9c349;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 700;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.footer-link:hover {
  opacity: 1;
}

.footer-divider {
  color: rgba(255, 255, 255, 0.3);
}

.error-alert {
  border: 1px solid rgba(255, 82, 82, 0.3);
  border-radius: 12px;
  font-size: 0.8rem;
}

.text-tiny {
  font-size: 0.65rem;
}

.divider-with-text {
  display: flex;
  align-items: center;
  gap: 12px;
}

.divider-with-text::before,
.divider-with-text::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(233, 195, 73, 0.2);
}

.divider-text {
  color: rgba(233, 195, 73, 0.5);
  font-size: 0.85rem;
  font-weight: 700;
}

.google-signin-btn {
  background: rgba(255, 255, 255, 0.08) !important;
  color: #fff !important;
  font-weight: 700 !important;
  font-size: 1rem !important;
  border-radius: 12px !important;
  text-transform: none !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  transition: all 0.2s;
}

.google-signin-btn:hover {
  background: rgba(255, 255, 255, 0.14) !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
}

@media (max-width: 600px) {
  .premium-glass-card {
    padding: 24px !important;
  }
  .welcome-back {
    font-size: 1.5rem;
  }
  .suspended-alert-inner {
    padding: 16px !important;
  }
  .suspended-title {
    font-size: 0.95rem !important;
  }
}

/* Suspended Account Alert */
.suspended-alert {
  background: #fffbeb;
  border: 1px solid #fbbf24;
  border-radius: 16px;
  overflow: hidden;
}

.suspended-alert-inner {
  padding: 20px;
  text-align: center;
}

.suspended-header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.suspended-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #92400e;
}

.suspended-desc {
  font-size: 0.85rem;
  color: #78716c;
  margin-bottom: 14px;
  line-height: 1.6;
}

.suspended-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #25d366;
  color: #fff;
  font-weight: 700;
  font-size: 0.95rem;
  padding: 10px 28px;
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.2s;
  margin-bottom: 10px;
  width: 100%;
  max-width: 280px;
}

.suspended-btn:hover {
  background: #1da851;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);
}

.suspended-footer {
  font-size: 0.8rem;
  color: #a8a29e;
  margin-top: 6px;
}

.suspended-link {
  color: #b45309;
  text-decoration: none;
  font-weight: 600;
  margin: 0 2px;
}

.suspended-link:hover {
  text-decoration: underline;
}

.suspended-brand {
  font-size: 0.75rem;
  color: #d6d3d1;
  margin-top: 10px;
  font-style: italic;
}
</style>
