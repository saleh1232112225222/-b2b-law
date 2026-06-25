<template>
  <v-app dir="rtl" class="force-pw-change-app">
    <v-container fluid class="fill-height pa-0">
      <v-row no-gutters class="fill-height">
        <!-- Left side: form (matches HTML left section) -->
        <v-col cols="12" md="7" class="d-flex align-center justify-center pa-6 overflow-y-auto">
          <div class="w-100" style="max-width: 460px">
            <div class="glass-card rounded-2xl shadow-2xl pa-8 md-pa-10">
              <!-- Icon -->
              <div class="d-flex justify-center mb-6">
                <div class="form-icon-circle">
                  <v-icon icon="mdi-shield-lock" size="32" color="white" />
                </div>
              </div>

              <!-- Title -->
              <div class="text-center mb-6">
                <h1 class="text-h5 font-weight-bold mb-2">
                  أهلاً بك في <span class="text-gold">B2B-LAW</span>
                </h1>
                <p class="text-body-2 font-medium text-grey-darken-1">
                  خطوة أولى نحو بيئة عمل آمنة
                </p>
              </div>

              <!-- Description Box -->
              <div class="desc-box rounded-xl pa-4 mb-8 text-center">
                <p class="text-body-2 text-grey-darken-2" style="line-height: 1.8">
                  نظام إدارة المكاتب القانونية يعتمد على
                  <strong class="text-gold">سرية البيانات</strong>. لتأمين حسابك، يرجى تعيين كلمة
                  مرور شخصية خاصة بك قبل استكمال الدخول إلى النظام.
                </p>
              </div>

              <v-alert
                v-if="errorMsg"
                type="error"
                variant="tonal"
                density="compact"
                class="mb-5 rounded-lg"
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
                class="mb-5 rounded-lg"
              >
                {{ successMsg }}
              </v-alert>

              <!-- Form -->
              <v-form ref="formRef" @submit.prevent="handleChangePassword">
                <div class="mb-5">
                  <label class="mb-1 font-weight-medium text-body-2 text-grey-darken-2">
                    كلمة المرور الحالية
                  </label>
                  <v-text-field
                    v-model="passwords.oldPassword"
                    type="password"
                    variant="outlined"
                    density="comfortable"
                    class="custom-input"
                    placeholder="أدخل كلمة المرور الافتراضية"
                    :rules="[(v) => !!v || 'كلمة المرور الحالية مطلوبة']"
                    hide-details="auto"
                  />
                </div>

                <div class="mb-5">
                  <label class="mb-1 font-weight-medium text-body-2 text-grey-darken-2">
                    كلمة المرور الجديدة
                  </label>
                  <v-text-field
                    v-model="passwords.newPassword"
                    type="password"
                    variant="outlined"
                    density="comfortable"
                    class="custom-input"
                    placeholder="أدخل كلمة المرور الجديدة"
                    :rules="passwordRules"
                    hide-details="auto"
                  />
                  <!-- Strength Indicator -->
                  <div v-if="passwords.newPassword" class="mt-2">
                    <div class="d-flex gap-1 mb-1">
                      <div
                        v-for="i in 4"
                        :key="i"
                        class="strength-bar"
                        :class="i <= strengthLevel ? strengthColorClass : 'bg-grey-lighten-2'"
                      />
                    </div>
                    <p class="text-caption" :class="strengthTextClass">
                      {{ strengthText }}
                    </p>
                  </div>
                  <p v-else class="text-caption text-grey mt-1">
                    استخدم 8 أحرف على الأقل مع أرقام ورموز
                  </p>
                </div>

                <div class="mb-6">
                  <label class="mb-1 font-weight-medium text-body-2 text-grey-darken-2">
                    تأكيد كلمة المرور الجديدة
                  </label>
                  <v-text-field
                    v-model="passwords.confirmPassword"
                    type="password"
                    variant="outlined"
                    density="comfortable"
                    class="custom-input"
                    placeholder="أعد إدخال كلمة المرور الجديدة"
                    :rules="[
                      (v: string) => !!v || 'تأكيد كلمة المرور مطلوب',
                      (v: string) => v === passwords.newPassword || 'كلمتا المرور غير متطابقتين'
                    ]"
                    hide-details="auto"
                  />
                </div>

                <!-- Submit Button -->
                <v-btn
                  block
                  size="x-large"
                  type="submit"
                  class="submit-btn text-white font-weight-bold rounded-lg mb-5 text-body-2"
                  :loading="submitting"
                  :disabled="!isFormReady"
                >
                  <span>تأكيد وتفعيل الحساب</span>
                  <v-icon icon="mdi-check-circle" size="18" class="me-2" />
                </v-btn>
              </v-form>

              <!-- Footer Link -->
              <div class="text-center">
                <v-btn
                  variant="text"
                  size="small"
                  class="text-grey font-weight-medium"
                  @click="handleLogout"
                >
                  تسجيل الخروج
                  <v-icon icon="mdi-arrow-left" size="14" class="ms-1" />
                </v-btn>
              </div>
            </div>
          </div>
        </v-col>

        <!-- Right side: branding (matches HTML hero section) -->
        <v-col cols="12" md="5" class="d-none d-md-flex align-center justify-center hero-panel">
          <div class="hero-pattern" />
          <div class="hero-blob hero-blob-gold" />
          <div class="hero-blob hero-blob-blue" />
          <div class="hero-grid" />

          <div class="relative-z text-center" style="max-width: 380px">
            <!-- Large Logo -->
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

            <!-- Features Mini -->
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

const strengthLevel = computed(() => {
  const p = passwords.value.newPassword
  if (!p) return 0
  let s = 0
  if (p.length >= 8) s++
  if (/[A-Z]/.test(p) || /[a-z]/.test(p)) s++
  if (/[0-9]/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s
})

const strengthColorClass = computed(() => {
  const lvl = strengthLevel.value
  if (lvl <= 1) return 'bg-red'
  if (lvl === 2) return 'bg-orange'
  if (lvl === 3) return 'bg-yellow-darken-1'
  return 'bg-green'
})

const strengthText = computed(() => {
  const msgs = ['ضعيفة جداً', 'ضعيفة', 'متوسطة', 'جيدة', 'قوية']
  return msgs[strengthLevel.value] || ''
})

const strengthTextClass = computed(() => {
  const lvl = strengthLevel.value
  if (lvl <= 1) return 'text-red font-medium'
  if (lvl === 2) return 'text-orange font-medium'
  if (lvl === 3) return 'text-yellow-darken-1 font-medium'
  return 'text-green font-medium'
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
  background: #f8fafc;
}

/* Form Icon */
.form-icon-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f59e0b, #ea580c);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(245, 158, 11, 0.3);
}

.text-gold {
  color: #d4af37;
}

.desc-box {
  background: #fffbeb;
  border: 1px solid #fde68a;
}

/* Submit Button - Olive gradient */
.submit-btn {
  background: linear-gradient(135deg, #5c5c1f, #4a4a18) !important;
  box-shadow: 0 4px 16px rgba(92, 92, 31, 0.3);
  transition: all 0.2s ease;
}

.submit-btn:hover {
  background: linear-gradient(135deg, #4a4a18, #3d3d14) !important;
  box-shadow: 0 6px 20px rgba(92, 92, 31, 0.4);
  transform: translateY(-1px);
}

/* Custom input focus */
:deep(.custom-input .v-field--focused) {
  border-color: #d4af37 !important;
  box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.15);
}

/* Strength bars */
.strength-bar {
  height: 4px;
  flex: 1;
  border-radius: 2px;
  transition: background-color 0.3s;
}

/* Glass card */
.glass-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e2e8f0;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.08);
}

/* Hero panel */
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
</style>
