<template>
  <v-app dir="rtl" class="force-pw-change-app">
    <v-container fluid class="fill-height pa-0">
      <v-row no-gutters class="fill-height">
        <!-- Left side: branding -->
        <v-col cols="12" md="5" class="d-none d-md-flex align-center justify-center gradient-panel">
          <div class="text-center pa-8">
            <v-avatar size="100" class="mb-6 elevation-8">
              <v-img :src="appLogo" />
            </v-avatar>
            <h1 class="text-h4 font-weight-black text-white mb-3">B2B-LAW</h1>
            <p class="text-body-1 text-white opacity-80">نظام إدارة المكاتب القانونية</p>
          </div>
        </v-col>

        <!-- Right side: password form -->
        <v-col cols="12" md="7" class="d-flex align-center justify-center pa-6">
          <div style="max-width: 440px; width: 100%">
            <v-card elevation="0" class="rounded-2xl glass-card pa-2">
              <v-card-text class="pa-8">
                <div class="text-center mb-8">
                  <v-avatar color="warning" size="72" class="mb-4">
                    <v-icon icon="mdi-shield-lock" :size="36" color="white" />
                  </v-avatar>
                  <h2 class="text-h5 font-weight-black text-ebony mb-2">
                    تغيير كلمة المرور إجبارياً
                  </h2>
                  <p class="text-body-2 text-grey-darken-1">
                    يرجى تغيير كلمة المرور المخصصة من المسؤول قبل استخدام النظام.
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
                      كلمة المرور الحالية
                    </label>
                    <v-text-field
                      v-model="passwords.oldPassword"
                      type="password"
                      variant="outlined"
                      color="gold"
                      density="comfortable"
                      prepend-inner-icon="mdi-lock-outline"
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
                  </div>

                  <div class="mb-6">
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
                      <span class="text-caption font-weight-bold text-grey-darken-1">قوة كلمة المرور</span>
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
                    تغيير كلمة المرور
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
                      تسجيل الخروج
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
import appLogo from '../assets/app-logo.png'

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

.gradient-panel {
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%);
  position: relative;
  overflow: hidden;
}

.gradient-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 30% 40%, rgba(212, 175, 55, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 70% 60%, rgba(212, 175, 55, 0.05) 0%, transparent 40%);
}

.glass-card {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid rgba(212, 175, 55, 0.15);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.08);
}
</style>
