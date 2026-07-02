<template>
  <v-card elevation="0" class="glass-card mb-4 border border-gold border-opacity-20 glass-card">
    <div class="pa-4 d-flex align-center border-b border-gold border-opacity-10">
      <LucideIcon name="shield-check" :size="20" class="text-primary me-3" />
      <span class="text-subtitle-1 font-weight-black text-primary">الأمان والمصادقة الثنائية (MFA)</span>
    </div>
    <v-card-text class="pa-4">
      <div class="d-flex align-center justify-space-between mb-4">
        <div>
          <div class="text-body-1 font-weight-black">المصادقة الثنائية (MFA)</div>
          <div class="text-caption text-grey">
            حماية حسابك برمز تحقق إضافي من تطبيق المصادقة (Google Authenticator) عند تسجيل الدخول
          </div>
        </div>
        <v-chip
          :color="isEnabled ? 'success' : 'grey'"
          size="small"
          class="font-weight-black"
        >
          {{ isEnabled ? 'نشط' : 'غير نشط' }}
        </v-chip>
      </div>

      <!-- Enable Button -->
      <v-btn
        v-if="!isEnabled"
        color="gold"
        variant="flat"
        block
        class="font-weight-black premium-btn-gold-gradient"
        @click="startMfaSetup"
      >
        <LucideIcon name="lock" :size="18" class="me-2" /> تفعيل المصادقة الثنائية
      </v-btn>

      <!-- Disable Button -->
      <v-btn
        v-else
        color="error"
        variant="outlined"
        block
        class="font-weight-black"
        @click="showDisableDialog = true"
      >
        <LucideIcon name="unlock" :size="18" class="me-2" /> إلغاء تفعيل المصادقة الثنائية
      </v-btn>

      <!-- Setup Dialog -->
      <v-dialog v-model="setupDialog" max-width="500" persistent>
        <v-card class="premium-glass-card border-gold border-2 rounded-2xl overflow-hidden glass-card">
          <div class="pa-6 bg-gold-gradient text-ebony d-flex align-center">
            <LucideIcon name="shield-check" :size="24" class="me-3" />
            <span class="text-h6 font-weight-black">إعداد المصادقة الثنائية</span>
            <v-spacer />
            <v-btn icon variant="text" color="ebony" @click="setupDialog = false">
              <LucideIcon name="x" :size="24" />
            </v-btn>
          </div>

          <v-card-text class="pa-6 rtl">
            <p class="text-body-2 mb-4">
              1. قم بمسح رمز الاستجابة السريعة (QR Code) أدناه باستخدام تطبيق المصادقة الخاص بك (Google Authenticator أو Microsoft Authenticator):
            </p>

            <div class="d-flex justify-center mb-6 pa-2 bg-white rounded-lg mx-auto" style="width: 216px; height: 216px;">
              <v-img :src="qrCodeUrl" width="200" height="200" />
            </div>

            <p class="text-body-2 mb-2 text-center font-weight-bold">أو أدخل المفتاح السري يدويًا:</p>
            <div class="pa-3 text-center rounded bg-grey-darken-4 text-mono text-gold mb-6 select-all font-weight-bold" style="letter-spacing: 1.5px;">
              {{ secret }}
            </div>

            <p class="text-body-2 mb-4">
              2. أدخل الرمز المكون من 6 أرقام لتأكيد التفعيل:
            </p>

            <v-text-field
              v-model="verificationCode"
              placeholder="000000"
              variant="outlined"
              density="compact"
              class="mb-4 text-center glass-input"
              hide-details="auto"
              maxlength="6"
            ></v-text-field>

            <v-alert v-if="errorMsg" type="error" variant="tonal" density="compact" class="mb-4">
              {{ errorMsg }}
            </v-alert>
          </v-card-text>

          <v-card-actions class="pa-6 pt-0">
            <v-btn variant="text" color="gold" @click="setupDialog = false">إلغاء</v-btn>
            <v-spacer />
            <v-btn
              color="gold"
              variant="flat"
              class="px-6 font-weight-black premium-btn-gold-gradient"
              :disabled="verificationCode.length !== 6"
              :loading="loading"
              @click="confirmMfaEnable"
            >
              تأكيد وتفعيل
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Disable Dialog -->
      <v-dialog v-model="showDisableDialog" max-width="450" persistent>
        <v-card class="premium-glass-card border-gold border-2 rounded-2xl overflow-hidden glass-card">
          <div class="pa-6 bg-gold-gradient text-ebony d-flex align-center">
            <LucideIcon name="unlock" :size="24" class="me-3" />
            <span class="text-h6 font-weight-black">إلغاء المصادقة الثنائية</span>
            <v-spacer />
            <v-btn icon variant="text" color="ebony" @click="showDisableDialog = false">
              <LucideIcon name="x" :size="24" />
            </v-btn>
          </div>

          <v-card-text class="pa-6 rtl">
            <p class="text-body-2 mb-4">
              يرجى إدخال رمز التحقق المكون من 6 أرقام من تطبيق المصادقة لتأكيد إلغاء التفعيل:
            </p>

            <v-text-field
              v-model="verificationCode"
              placeholder="000000"
              variant="outlined"
              density="compact"
              class="mb-4 text-center glass-input"
              hide-details="auto"
              maxlength="6"
            ></v-text-field>

            <v-alert v-if="errorMsg" type="error" variant="tonal" density="compact" class="mb-4">
              {{ errorMsg }}
            </v-alert>
          </v-card-text>

          <v-card-actions class="pa-6 pt-0">
            <v-btn variant="text" color="gold" @click="showDisableDialog = false">إلغاء</v-btn>
            <v-spacer />
            <v-btn
              color="error"
              variant="flat"
              class="px-6 font-weight-black"
              :disabled="verificationCode.length !== 6"
              :loading="loading"
              @click="confirmMfaDisable"
            >
              إلغاء التفعيل
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LucideIcon from '../../components/common/LucideIcon.vue'

const isEnabled = ref(false)
const setupDialog = ref(false)
const showDisableDialog = ref(false)
const loading = ref(false)
const secret = ref('')
const qrCodeUrl = ref('')
const verificationCode = ref('')
const errorMsg = ref('')

const fetchMfaStatus = async () => {
  try {
    const session = await (window as any).api.auth.getSession()
    isEnabled.value = session.twoFactorEnabled || false
  } catch (err) {
    console.error('Failed to fetch MFA status:', err)
  }
}

onMounted(() => {
  fetchMfaStatus()
})

const startMfaSetup = async () => {
  errorMsg.value = ''
  verificationCode.value = ''
  try {
    const data = await (window as any).api.auth.mfaSetup()
    secret.value = data.secret
    // Render QR Code via Google Charts API
    qrCodeUrl.value = `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(data.qrCodeUrl)}`
    setupDialog.value = true
  } catch (err: any) {
    errorMsg.value = err.message || 'فشلت تهيئة المصادقة الثنائية'
  }
}

const confirmMfaEnable = async () => {
  if (verificationCode.value.length !== 6) return
  loading.value = true
  errorMsg.value = ''
  try {
    await (window as any).api.auth.mfaEnable(secret.value, verificationCode.value)
    setupDialog.value = false
    isEnabled.value = true
    verificationCode.value = ''
  } catch (err: any) {
    errorMsg.value = err?.response?.data?.error || err.message || 'فشل التفعيل، تأكد من الرمز المدخل'
  } finally {
    loading.value = false
  }
}

const confirmMfaDisable = async () => {
  if (verificationCode.value.length !== 6) return
  loading.value = true
  errorMsg.value = ''
  try {
    await (window as any).api.auth.mfaDisable(verificationCode.value)
    showDisableDialog.value = false
    isEnabled.value = false
    verificationCode.value = ''
  } catch (err: any) {
    errorMsg.value = err?.response?.data?.error || err.message || 'رمز التحقق غير صحيح'
  } finally {
    loading.value = false
  }
}
</script>
