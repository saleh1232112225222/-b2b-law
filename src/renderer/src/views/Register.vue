<template>
  <v-container fluid class="fill-height login-container pa-0">
    <MockBanner />
    <!-- Premium Cinematic Background -->
    <div class="background-wrapper">
      <div class="background-overlay"></div>
    </div>

    <v-row no-gutters class="fill-height z-10" align="center" justify="center">
      <v-col cols="12" sm="9" md="6" lg="5" class="d-flex flex-column align-center px-4">
        <!-- Glassmorphism Card -->
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
            <h2 class="welcome-back">إنشاء حساب جديد</h2>
          </div>

          <!-- Desktop Mode Guard Alert -->
          <div v-if="isDesktop" class="text-center py-6">
            <v-alert
              type="warning"
              variant="tonal"
              density="comfortable"
              class="mb-6 border-gold border-1 text-right"
            >
              عذراً، هذا الإصدار المحلي لا يدعم إنشاء حسابات جديدة مباشرة. التسجيل التلقائي متاح فقط
              لنسخة الويب السحابية.
            </v-alert>
            <v-btn
              block
              height="50"
              class="premium-submit-btn premium-btn-gold-gradient"
              @click="router.push('/login')"
            >
              العودة لتسجيل الدخول
            </v-btn>
          </div>

          <!-- OTP Verification Form (Web Mode) -->
          <v-form
            v-else-if="isVerifying"
            v-model="verifyFormValid"
            class="login-form"
            @submit.prevent="handleVerify"
          >
            <div class="branding-header text-center mb-6">
              <h2 class="welcome-back text-subtitle-1 text-gold">تفعيل الحساب</h2>
              <p
                v-if="isMockMode || devOtp"
                class="text-white text-caption mt-2"
                style="font-size: 0.9rem !important; line-height: 1.6"
              >
                وضع التطوير: رمز التحقق هو
                <strong class="text-gold">{{ devOtp || '123456' }}</strong>
              </p>
              <p
                v-else
                class="text-white text-caption mt-2"
                style="font-size: 0.9rem !important; line-height: 1.6"
              >
                تم إرسال رمز التحقق المكون من 6 أرقام إلى البريد الإلكتروني ورقم الجوال. يرجى إدخاله
                لتفعيل الفترة التجريبية.
              </p>
            </div>

            <!-- OTP Code Field -->
            <div class="input-group mb-6">
              <label class="input-label">رمز التحقق (OTP)</label>
              <v-text-field
                v-model="otpCode"
                placeholder="أدخل الرمز المكون من 6 أرقام"
                variant="outlined"
                class="premium-input text-center glass-input"
                hide-details
                :rules="[
                  (v) => !!v || 'رمز التحقق مطلوب',
                  (v) => /^\d{6}$/.test(v) || 'رمز التحقق يجب أن يتكون من 6 أرقام'
                ]"
                required
                maxlength="6"
              >
                <template #prepend-inner>
                  <LucideIcon name="shield-check" :size="18" class="text-gold-muted me-2" />
                </template>
              </v-text-field>
            </div>

            <!-- Verify Button -->
            <v-btn
              type="submit"
              block
              height="56"
              class="premium-submit-btn mb-4 premium-btn-gold-gradient"
              :loading="verificationLoading"
              :disabled="!verifyFormValid"
            >
              تفعيل الحساب والبدء الآن
            </v-btn>

            <!-- Back to Register Link -->
            <div class="form-footer text-center">
              <a href="#" class="footer-link" @click.prevent="isVerifying = false"
                >تعديل بيانات التسجيل</a
              >
            </div>
          </v-form>

          <!-- Registration Form (Web Mode) -->
          <v-form v-else v-model="formValid" class="login-form" @submit.prevent="handleRegister">
            <!-- Company / Office Name Field -->
            <div class="input-group mb-4">
              <label class="input-label">اسم مكتب المحاماة / الشركة</label>
              <v-text-field
                v-model="companyName"
                placeholder="أدخل اسم المكتب أو الشركة"
                variant="outlined"
                class="premium-input glass-input"
                hide-details
                :rules="[(v) => !!v || 'اسم المكتب مطلوب']"
                required
              >
                <template #prepend-inner>
                  <LucideIcon name="building" :size="18" class="text-gold-muted me-2" />
                </template>
              </v-text-field>
            </div>

            <!-- Username Field -->
            <div class="input-group mb-4">
              <label class="input-label">اسم المستخدم (للدخول)</label>
              <v-text-field
                v-model="username"
                @update:model-value="debouncedCheckAvailability('username', username)"
                placeholder="اسم المستخدم بالأحرف الإنجليزية"
                variant="outlined"
                class="premium-input glass-input"
                hide-details="auto"
                :error-messages="usernameStatus === 'taken' ? 'اسم المستخدم مسجل مسبقاً ❌' : ''"
                :success-messages="usernameStatus === 'available' ? 'اسم المستخدم متاح ✅' : ''"
                :rules="[
                  (v) => !!v || 'اسم المستخدم مطلوب',
                  (v) =>
                    /^[a-zA-Z0-9_]{4,20}$/.test(v) ||
                    'اسم المستخدم يجب أن يكون إنجليزي فقط (4-20 حرف)'
                ]"
                required
              >
                <template #prepend-inner>
                  <LucideIcon name="user" :size="18" class="text-gold-muted me-2" />
                </template>
              </v-text-field>
            </div>

            <!-- Email Field -->
            <div class="input-group mb-4">
              <label class="input-label">البريد الإلكتروني</label>
              <v-text-field
                v-model="email"
                @update:model-value="debouncedCheckAvailability('email', email)"
                placeholder="example@email.com"
                variant="outlined"
                class="premium-input glass-input"
                hide-details="auto"
                :error-messages="emailStatus === 'taken' ? 'البريد الإلكتروني مسجل مسبقاً ❌' : ''"
                :success-messages="emailStatus === 'available' ? 'البريد الإلكتروني متاح ✅' : ''"
                :rules="[
                  (v) => !!v || 'البريد الإلكتروني مطلوب',
                  (v) => /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(v) || 'البريد الإلكتروني غير صحيح'
                ]"
                required
              >
                <template #prepend-inner>
                  <LucideIcon name="mail" :size="18" class="text-gold-muted me-2" />
                </template>
              </v-text-field>
            </div>

            <!-- Phone Field -->
            <div class="input-group mb-4">
              <label class="input-label">رقم الجوال (لالتفعيل عبر رسالة نصية)</label>
              <v-text-field
                v-model="phone"
                @update:model-value="debouncedCheckAvailability('phone', phone)"
                placeholder="05xxxxxxxx"
                variant="outlined"
                class="premium-input glass-input"
                hide-details="auto"
                :error-messages="phoneStatus === 'taken' ? 'رقم الجوال مسجل مسبقاً ❌' : ''"
                :success-messages="phoneStatus === 'available' ? 'رقم الجوال متاح ✅' : ''"
                :rules="[
                  (v) => !!v || 'رقم الجوال مطلوب',
                  (v) =>
                    /^05\d{8}$/.test(v) || 'يجب إدخال رقم جوال سعودي صحيح من 10 أرقام (مثال: 0512345678)'
                ]"
                required
              >
                <template #prepend-inner>
                  <LucideIcon name="phone" :size="18" class="text-gold-muted me-2" />
                </template>
              </v-text-field>
            </div>

            <!-- Password Field -->
            <div class="input-group mb-4">
              <label class="input-label">كلمة المرور</label>
              <v-text-field
                v-model="password"
                placeholder="أدخل كلمة المرور"
                type="password"
                variant="outlined"
                class="premium-input glass-input"
                hide-details="auto"
                :rules="[
                  (v) => !!v || 'كلمة المرور مطلوبة',
                  (v) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(v) || 'كلمة المرور ضعيفة! يجب أن تحتوي على: حرف كبير، حرف صغير، رقم، ورمز خاص (@$!%*?&)، وبحد أدنى 8 أحرف.'
                ]"
                required
              >
                <template #prepend-inner>
                  <LucideIcon name="key" :size="18" class="text-gold-muted me-2" />
                </template>
              </v-text-field>
            </div>

            <!-- Confirm Password Field -->
            <div class="input-group mb-6">
              <label class="input-label">تأكيد كلمة المرور</label>
              <v-text-field
                v-model="confirmPassword"
                placeholder="أعد إدخال كلمة المرور"
                type="password"
                variant="outlined"
                class="premium-input glass-input"
                hide-details="auto"
                :rules="[
                  (v) => !!v || 'تأكيد كلمة المرور مطلوب',
                  (v) => v === password || 'كلمتا المرور غير متطابقتين'
                ]"
                required
              >
                <template #prepend-inner>
                  <LucideIcon name="key-round" :size="18" class="text-gold-muted me-2" />
                </template>
              </v-text-field>
            </div>

            <!-- Submit Button -->
            <v-btn
              type="submit"
              block
              height="56"
              class="premium-submit-btn mb-6 premium-btn-gold-gradient"
              :loading="loading"
              :disabled="!formValid"
            >
              تسجيل الحساب وتفعيل 7 أيام تجريبية
            </v-btn>

            <!-- Bottom Links -->
            <div class="form-footer text-center">
              <a href="#" class="footer-link" @click.prevent="router.push('/login')"
                >لديك حساب بالفعل؟ تسجيل الدخول</a
              >
            </div>
          </v-form>

          <!-- Status Alert Overlay -->
          <v-fade-transition>
            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              density="compact"
              class="mt-4 error-alert text-right"
              closable
            >
              {{ error }}
            </v-alert>
          </v-fade-transition>

          <v-fade-transition>
            <v-alert
              v-if="success"
              type="success"
              variant="tonal"
              density="compact"
              class="mt-4 success-alert text-right"
            >
              تم إنشاء حسابك بنجاح! جاري تحويلك لصفحة تسجيل الدخول...
            </v-alert>
          </v-fade-transition>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import LucideIcon from '../components/common/LucideIcon.vue'
import MockBanner from '../components/MockBanner.vue'
import { getApiMode } from '../api/ApiAdapter'

const router = useRouter()
const route = useRoute()
const companyName = ref('')
const username = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)
const formValid = ref(false)

const usernameStatus = ref<'idle' | 'checking' | 'available' | 'taken'>('idle')
const emailStatus = ref<'idle' | 'checking' | 'available' | 'taken'>('idle')
const phoneStatus = ref<'idle' | 'checking' | 'available' | 'taken'>('idle')

let availabilityTimeout: ReturnType<typeof setTimeout> | null = null

const debouncedCheckAvailability = (field: 'username' | 'email' | 'phone', value: string) => {
  if (availabilityTimeout) clearTimeout(availabilityTimeout)
  
  if (field === 'username') usernameStatus.value = 'idle'
  if (field === 'email') emailStatus.value = 'idle'
  if (field === 'phone') phoneStatus.value = 'idle'

  if (!value || value.length < 4) return

  availabilityTimeout = setTimeout(async () => {
    try {
      const api = (window as any).api
      if (!api?.auth?.checkAvailability) return
      
      const res = await api.auth.checkAvailability(field, value)
      if (field === 'username') usernameStatus.value = res.available ? 'available' : 'taken'
      if (field === 'email') emailStatus.value = res.available ? 'available' : 'taken'
      if (field === 'phone') phoneStatus.value = res.available ? 'available' : 'taken'
    } catch (e) {
      console.error('Availability check error', e)
    }
  }, 600)
}

// OTP verification states
const isVerifying = ref(false)
const otpCode = ref('')
const verifyFormValid = ref(false)
const verificationLoading = ref(false)

onMounted(() => {
  if (route.query.verify === '1' && route.query.username) {
    username.value = route.query.username as string
    isVerifying.value = true
  }
})

// Check if app is in desktop/Electron mode
const isDesktop = computed(() => {
  return getApiMode() === 'desktop'
})

const isMockMode = computed(() => import.meta.env.VITE_USE_MOCK_OTP === 'true')
const devOtp = ref('')

const handleRegister = async () => {
  if (!formValid.value) return

  loading.value = true
  error.value = ''
  success.value = false
  devOtp.value = ''

  try {
    if (isMockMode.value) {
      devOtp.value = '123456'
      await new Promise((r) => setTimeout(r, 1000))
    } else {
      const api = (window as any).api
      if (!api?.auth?.register) {
        throw new Error('خدمة التسجيل غير متوفرة')
      }

      const result = await api.auth.register(
        companyName.value,
        username.value,
        email.value,
        phone.value,
        password.value
      )
      if (result?.devOtp) {
        devOtp.value = result.devOtp
      }
    }

    success.value = true
    setTimeout(() => {
      isVerifying.value = true
      otpCode.value = ''
      success.value = false
    }, 1500)
  } catch (e: any) {
    const errMsg = e?.response?.data?.error || e?.message || ''
    if (errMsg === 'UsernameAlreadyExists') {
      error.value = 'خطأ! اسم المستخدم هذا مسجل بالفعل في النظام.'
    } else if (errMsg === 'EmailAlreadyExists') {
      error.value = 'خطأ! البريد الإلكتروني مسجل بالفعل.'
    } else if (errMsg === 'PhoneAlreadyExists') {
      error.value = 'خطأ! رقم الجوال مسجل بالفعل.'
    } else {
      error.value = e?.response?.data?.error || e?.message || 'فشل التسجيل، يرجى المحاولة لاحقاً.'
    }
  } finally {
    loading.value = false
  }
}

const handleVerify = async () => {
  if (!verifyFormValid.value) return

  verificationLoading.value = true
  error.value = ''
  success.value = false

  try {
    if (isMockMode.value || devOtp.value) {
      if (otpCode.value !== (devOtp.value || '123456')) {
        throw new Error('InvalidCode')
      }
      await new Promise((r) => setTimeout(r, 1000))
    } else {
      const api = (window as any).api
      if (!api?.auth?.verifyAccount) {
        throw new Error('خدمة التفعيل غير متوفرة')
      }

      await api.auth.verifyAccount(username.value, otpCode.value)
    }

    success.value = true
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } catch (e: any) {
    const errMsg = e?.response?.data?.error || e?.message || ''
    if (errMsg === 'InvalidCode') {
      error.value = 'خطأ! رمز التحقق غير صحيح.'
    } else if (errMsg === 'UserNotFound') {
      error.value = 'خطأ! المستخدم غير موجود.'
    } else {
      error.value = e?.response?.data?.error || e?.message || 'فشل التفعيل، يرجى المحاولة لاحقاً.'
    }
  } finally {
    verificationLoading.value = false
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap');

.login-container {
  background-color: #050505;
  position: relative;
  overflow: hidden;
  font-family: 'Almarai', sans-serif !important;
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
  font-size: 1.8rem;
  font-weight: 800;
  margin-top: 8px;
  text-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}

.input-label {
  display: block;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  font-weight: 700;
  margin-bottom: 6px;
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

.error-alert {
  border: 1px solid rgba(255, 82, 82, 0.3);
  border-radius: 12px;
  font-size: 0.85rem;
}

.success-alert {
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 12px;
  font-size: 0.85rem;
}

@media (max-width: 768px) {
  .premium-glass-card {
    padding: 20px !important;
  }
  .welcome-back {
    font-size: 1.2rem;
  }
  .brand-title {
    font-size: 1.2rem;
  }
  .input-group.mb-4 {
    margin-bottom: 12px !important;
  }
  .input-group.mb-6 {
    margin-bottom: 16px !important;
  }
  .premium-submit-btn {
    font-size: 1rem !important;
    height: 50px !important;
  }
  .premium-input :deep(input) {
    font-size: 16px !important;
  }
  .v-card.pa-10 {
    padding: 16px !important;
  }
  .login-container .v-row.px-4 {
    padding-left: 8px !important;
    padding-right: 8px !important;
  }
}

@media (max-width: 600px) {
  .premium-glass-card {
    padding: 16px !important;
  }
  .welcome-back {
    font-size: 1.1rem;
  }
}
</style>
