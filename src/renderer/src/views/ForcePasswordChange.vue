<template>
  <v-app dir="rtl" class="force-pw-change-app">
    <v-container fluid class="fill-height pa-0">
      <v-row no-gutters class="fill-height">
        <!-- Left side: branding (matches HTML hero) -->
        <v-col cols="12" md="5" class="d-none d-md-flex align-center justify-center hero-panel">
          <div class="hero-pattern" />
          <div class="hero-blob hero-blob-gold" />
          <div class="hero-blob hero-blob-blue" />
          <div class="hero-grid" />

          <div class="relative-z text-center" style="max-width: 380px">
            <div class="logo-ring mx-auto mb-8">
              <div class="logo-ring-inner">
                <div class="text-center">
                  <div class="logo-text-b2b">B2B</div>
                  <div class="logo-text-law">LAW</div>
                </div>
              </div>
            </div>

            <h2 class="text-h4 font-weight-black text-white mb-3 tracking-wide">B2B-LAW</h2>
            <p class="text-gold-sub mb-4">نظام إدارة المكاتب القانونية</p>
            <div class="gold-divider mx-auto mb-6" />
            <p class="text-body-2 text-grey-lighten-1 mb-8" style="line-height: 1.8">
              منصة متكاملة لإدارة القضايا والموكلين والمواعيد،<br />
              تصمّم خصيصاً لبيئة العمل القانوني العربي.
            </p>

            <v-row dense>
              <v-col v-for="f in heroFeatures" :key="f.label" cols="4">
                <div class="hero-feature-card">
                  <v-icon :icon="f.icon" size="22" color="#d4af37" class="mb-1" />
                  <div class="text-caption text-grey-lighten-1">{{ f.label }}</div>
                </div>
              </v-col>
            </v-row>
          </div>
        </v-col>

        <!-- Right side: password form -->
        <v-col cols="12" md="7" class="d-flex align-center justify-center pa-6">
          <div style="max-width: 440px; width: 100%">
            <v-card elevation="0" class="rounded-2xl glass-card pa-2">
              <v-card-text class="pa-8">
                <div class="text-center mb-6">
                  <v-avatar color="warning" size="72" class="mb-4">
                    <v-icon icon="mdi-shield-lock" :size="36" color="white" />
                  </v-avatar>
                  <h2 class="text-h5 font-weight-black text-ebony mb-2">
                    تغيير كلمة المرور اضطرارياً
                  </h2>
                  <p class="text-body-2 text-grey-darken-1">
                    كلمة المرور الحالية هي التي حددها المسؤول عند إنشاء حسابك.<br />
                    يرجى تغييرها بكلمة مرور جديدة для حماية حسابك.
                  </p>
                </div>

                <v-alert
                  v-if="errorMsg"
                  type="error"
                  variant="tonal"
                  density="compact"
                  class="mb-4 rounded-lg"
                  closable
                  @click:close="errorMsg = ''"
                >
                  {{ errorMsg }}
                </v-alert>

                <v-alert
                  v-if="successMsg"
                  type="success"
                  variant="tonal"
                  density="compact"
                  class="mb-4 rounded-lg"
                >
                  {{ successMsg }}
                </v-alert>

                <v-form ref="formRef" @submit.prevent="handleChangePassword">
                  <div class="mb-4">
                    <label class="mb-1 font-weight-bold text-grey-darken-3 text-body-2">
                      كلمة المرور المؤقتة (الحالية)
                    </label>
                    <v-text-field
                      v-model="passwords.oldPassword"
                      type="password"
                      variant="outlined"
                      color="gold"
                      density="comfortable"
                      prepend-inner-icon="mdi-key-outline"
                      placeholder="الكلمة التي أعطاها لك المسؤول"
                      :rules="[(v) => !!v || 'كلمة المرور الحالية مطلوبة']"
                      hide-details="auto"
                    />
                  </div>

                  <div class="mb-4">
                    <label class="mb-1 font-weight-bold text-grey-darken-3 text-body-2">
                      كلمة المرور الجديدة
                    </label>
                    <v-text-field
                      v-model="passwords.newPassword"
                      type="password"
                      variant="outlined"
                      color="gold"
                      density="comfortable"
                      prepend-inner-icon="mdi-lock-plus"
                      :rules="passwordRules"
                      hide-details="auto"
                    />
                    <div class="text-caption text-grey mt-1">
                      8 أحرف على الأقل، حرف كبير وصغير، رقم، ورمز خاص (@$!%*?&)
                    </div>
                  </div>

                  <div class="mb-4">
                    <label class="mb-1 font-weight-bold text-grey-darken-3 text-body-2">
                      تأكيد كلمة المرور الجديدة
                    </label>
                    <v-text-field
                      v-model="passwords.confirmPassword"
                      type="password"
                      variant="outlined"
                      color="gold"
                      density="comfortable"
                      prepend-inner-icon="mdi-lock-check"
                      :rules="[
                        (v) => !!v || 'تأكيد كلمة المرور مطلوب',
                        (v) => v === passwords.newPassword || 'كلمتا المرور غير متطابقتين'
                      ]"
                      hide-details="auto"
                    />
                  </div>

                  <!-- Password strength indicator -->
                  <div v-if="passwords.newPassword" class="mb-5">
                    <div class="d-flex align-center justify-space-between mb-1">
                      <span class="text-caption font-weight-bold text-grey-darken-1"
                        >قوة كلمة المرور</span
                      >
                      <span class="text-caption font-weight-black" :class="strengthInfo.textClass">
                        {{ strengthInfo.label }}
                      </span>
                    </div>
                    <v-progress-linear
                      :model-value="strengthInfo.score"
                      :color="strengthInfo.color"
                      height="6"
                      rounded
                    />
                  </div>

                  <v-btn
                    block
                    color="accent"
                    size="x-large"
                    type="submit"
                    class="font-weight-black rounded-xl mb-4 premium-btn-gold-gradient text-white"
                    :loading="submitting"
                    :disabled="!isFormReady"
                  >
                    <v-icon icon="mdi-check-circle" :size="20" class="me-2" />
                    تغيير كلمة المرور والدخول
                  </v-btn>

                  <div class="text-center">
                    <v-btn
                      variant="text"
                      color="grey"
                      size="small"
                      class="font-weight-bold"
                      @click="handleLogout"
                    >
                      <v-icon icon="mdi-logout" :size="16" class="me-1" />
                      رجوع لصفحة تسجيل الدخول
                    </v-btn>
                  </div>
                </v-form>
              </v-card-text>
            </v-card>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const formRef = ref<any>(null)
const submitting = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const passwords = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const heroFeatures = [
  { icon: 'mdi-scale-balance', label: 'إدارة القضايا' },
  { icon: 'mdi-account-group', label: 'الموكلين' },
  { icon: 'mdi-calendar-check', label: 'المواعيد' }
]

const passwordRules = [
  (v: string) => !!v || 'كلمة المرور الجديدة مطلوبة',
  (v: string) => v.length >= 8 || 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
  (v: string) => /[a-z]/.test(v) || 'يجب أن تحتوي على حرف صغير',
  (v: string) => /[A-Z]/.test(v) || 'يجب أن تحتوي على حرف كبير',
  (v: string) => /\d/.test(v) || 'يجب أن تحتوي على رقم',
  (v: string) => /[@$!%*?&]/.test(v) || 'يجب أن تحتوي على رمز خاص (@$!%*?&)'
]

const strengthInfo = computed(() => {
  const p = passwords.value.newPassword
  let score = 0
  if (p.length >= 4) score += 20
  if (p.length >= 8) score += 25
  if (/[a-zA-Z]/.test(p)) score += 15
  if (/\d/.test(p)) score += 20
  if (/[^a-zA-Z0-9]/.test(p)) score += 20
  score = Math.max(0, Math.min(100, score))

  if (!p) return { score: 0, label: '', color: 'grey', textClass: 'text-grey' }
  if (score < 45) return { score, label: 'ضعيفة', color: 'error', textClass: 'text-error' }
  if (score < 75) return { score, label: 'مقبولة', color: 'warning', textClass: 'text-warning' }
  return { score, label: 'قوية', color: 'success', textClass: 'text-success' }
})

const isFormReady = computed(() => {
  return (
    passwords.value.oldPassword &&
    passwords.value.newPassword &&
    passwords.value.confirmPassword &&
    passwords.value.newPassword === passwords.value.confirmPassword &&
    passwords.value.newPassword.length >= 8
  )
})

const handleChangePassword = async () => {
  errorMsg.value = ''
  successMsg.value = ''

  if (!passwords.value.oldPassword || !passwords.value.newPassword) {
    errorMsg.value = 'يرجى ملء جميع الحقول'
    return
  }

  if (passwords.value.newPassword !== passwords.value.confirmPassword) {
    errorMsg.value = 'كلمتا المرور غير متطابقتين'
    return
  }

  submitting.value = true
  try {
    const success = await (window as any).api.auth.changePassword(
      passwords.value.oldPassword,
      passwords.value.newPassword
    )

    if (success) {
      successMsg.value = 'تم تغيير كلمة المرور بنجاح! جاري التحويل...'

      // Clear mustChangePassword from session
      try {
        const raw = localStorage.getItem('web_currentUserSession')
        if (raw) {
          const parsed = JSON.parse(raw)
          parsed.mustChangePassword = false
          localStorage.setItem('web_currentUserSession', JSON.stringify(parsed))
        }
      } catch {}

      setTimeout(() => {
        router.replace('/dashboard')
      }, 1500)
    }
  } catch (err: any) {
    errorMsg.value = err.message || 'فشل تغيير كلمة المرور. تحقق من كلمة المرور الحالية.'
  } finally {
    submitting.value = false
  }
}

const handleLogout = () => {
  localStorage.removeItem('web_isLoggedIn')
  localStorage.removeItem('web_currentUserSession')
  localStorage.removeItem('web_currentUser')
  localStorage.removeItem('b2b_cloud_token')
  window.dispatchEvent(new Event('auth-changed'))
  router.replace('/login')
}
</script>

<style scoped>
.force-pw-change-app {
  background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%);
}

/* Hero panel — matches HTML right section */
.hero-panel {
  background: linear-gradient(135deg, #0f172a 0%, #1a1a2e 50%, #16213e 100%);
  position: relative;
  overflow: hidden;
}

.hero-pattern {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 50%, rgba(212, 175, 55, 0.1) 0%, transparent 60%);
  pointer-events: none;
}

.hero-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}

.hero-blob-gold {
  width: 260px;
  height: 260px;
  top: 80px;
  right: 80px;
  background: rgba(212, 175, 55, 0.05);
}

.hero-blob-blue {
  width: 320px;
  height: 320px;
  bottom: 80px;
  left: 80px;
  background: rgba(59, 130, 246, 0.05);
}

.hero-grid {
  position: absolute;
  inset: 0;
  opacity: 0.03;
  background-image:
    linear-gradient(rgba(212, 175, 55, 0.3) 1px, transparent 1px),
    linear-gradient(90deg, rgba(212, 175, 55, 0.3) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}

.relative-z {
  position: relative;
  z-index: 1;
}

/* Logo ring */
.logo-ring {
  width: 128px;
  height: 128px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d4af37, #e6c84a);
  padding: 4px;
  box-shadow: 0 25px 50px rgba(212, 175, 55, 0.3);
}

.logo-ring-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, #0f172a, #1a1a2e);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(212, 175, 55, 0.5);
}

.logo-text-b2b {
  font-size: 2.25rem;
  font-weight: 900;
  color: #d4af37;
  line-height: 1;
  letter-spacing: -0.05em;
}

.logo-text-law {
  font-size: 0.65rem;
  color: #ffffff;
  letter-spacing: 0.3em;
  font-weight: 300;
}

.text-gold-sub {
  color: rgba(212, 175, 55, 0.8);
  font-size: 1.1rem;
  font-weight: 500;
}

.gold-divider {
  width: 64px;
  height: 2px;
  background: linear-gradient(to right, transparent, #d4af37, transparent);
}

.hero-feature-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px 4px;
  text-align: center;
  backdrop-filter: blur(4px);
}

/* Glass card (right side form) */
.glass-card {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid rgba(212, 175, 55, 0.15);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.08);
}
</style>
