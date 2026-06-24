<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <!-- Force Password Change Banner -->
        <v-alert
          v-if="user?.mustChangePassword"
          type="warning"
          variant="tonal"
          color="warning"
          prominent
          class="mb-6 rounded-xl"
          icon="mdi-shield-lock"
        >
          <div class="text-h6 font-weight-black mb-1">يجب تغيير كلمة المرور</div>
          <div class="text-body-2 mb-3">
            يرجى تغيير كلمة المرور المخصصة من المسؤول قبل استخدام النظام.
          </div>
        </v-alert>

        <!-- Header -->
        <div class="d-flex align-center justify-space-between mb-8">
          <div>
            <h1 class="text-h5 font-weight-black text-ebony mb-1">الملف الشخصي</h1>
            <p class="text-subtitle-1 text-ebony opacity-70 font-weight-black">
              إدارة الهوية الرقمية وصلاحيات الوصول
            </p>
          </div>
          <div class="glass-panel-light pa-4 rounded-xl border-gold opacity-20">
            <LucideIcon name="user-cog" :size="36" class="text-accent" />
          </div>
        </div>

        <!-- User Info Card -->
        <v-card
          elevation="0"
          class="glass-card rounded-2xl mb-8 overflow-hidden border border-gold border-opacity-20 premium-lift glass-card"
        >
          <div class="profile-hero-banner"></div>
          <div class="profile-hero-body pa-8">
            <div class="d-flex align-start justify-space-between flex-wrap gap-6 mb-8">
              <div class="profile-hero-meta">
                <div class="d-flex align-center gap-2 mb-2">
                  <div class="text-h5 font-weight-black text-ebony">{{ user?.username }}</div>
                  <v-btn
                    v-if="user?.roleKey === 'admin'"
                    class="premium-btn-gold-gradient"
                    icon
                    variant="text"
                    size="small"
                    color="gold"
                    @click="openUsernameDialog"
                  >
                    <LucideIcon name="pencil" :size="18" />
                  </v-btn>
                </div>
                <v-chip color="gold" variant="flat" class="text-ebony font-weight-black px-6">
                  {{ getRoleLabel(user?.roleKey) }}
                </v-chip>
              </div>

              <v-avatar size="100" class="profile-avatar-premium">
                <v-img
                  :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'User')}&background=D4AF37&color=0A0A0A&size=128&bold=true`"
                />
              </v-avatar>
            </div>

            <v-row dense class="mt-4">
              <v-col cols="12" sm="6">
                <div
                  class="glass-panel-light pa-5 rounded-xl border border-gold border-opacity-10 h-100"
                >
                  <div class="text-caption text-gold font-weight-black mb-1">
                    اسم المستخدم المعرف
                  </div>
                  <div class="text-h6 font-weight-black text-ebony">{{ user?.username }}</div>
                </div>
              </v-col>
              <v-col cols="12" sm="6">
                <div
                  class="glass-panel-light pa-5 rounded-xl border border-gold border-opacity-10 h-100"
                >
                  <div class="text-caption text-gold font-weight-black mb-1">نطاق الصلاحيات</div>
                  <div class="text-h6 font-weight-black text-ebony">
                    {{ getRoleLabel(user?.roleKey) }}
                  </div>
                </div>
              </v-col>
            </v-row>
          </div>
        </v-card>

        <!-- Change Password Card -->
        <v-card
          elevation="0"
          class="glass-card rounded-2xl border border-gold border-opacity-20 glass-card"
        >
          <div
            class="glass-panel-light pa-6 border-b border-gold border-opacity-10 d-flex align-center"
          >
            <div
              class="glass-panel-light pa-3 rounded-xl me-4 border border-gold border-opacity-10"
            >
              <LucideIcon name="shield-check" :size="24" class="text-gold" />
            </div>
            <span class="text-h5 font-weight-black text-ebony"
              >تأمين الحساب وتغيير كلمة المرور</span
            >
          </div>

          <v-card-text class="pa-8 glass-card">
            <v-form ref="passwordForm" v-model="isFormValid" @submit.prevent="handleUpdatePassword">
              <div class="mb-6">
                <label class="mb-2 font-weight-black text-gold">كلمة المرور الحالية</label>
                <v-text-field
                  v-model="passwordData.oldPassword"
                  type="password"
                  variant="outlined"
                  class="glass-input glass-input"
                  :rules="[rules.required]"
                  placeholder="أدخل كلمة المرور الحالية للتحقق"
                  hide-details="auto"
                >
                  <template #prepend-inner>
                    <LucideIcon name="lock" :size="20" class="text-gold me-2" />
                  </template>
                </v-text-field>
              </div>

              <div class="mb-4">
                <label class="mb-2 font-weight-black text-gold">كلمة المرور الجديدة</label>
                <v-text-field
                  v-model="passwordData.newPassword"
                  type="password"
                  variant="outlined"
                  class="glass-input glass-input"
                  :rules="[rules.required, rules.min]"
                  placeholder="أدخل كلمة المرور الجديدة المعقدة"
                  hide-details="auto"
                >
                  <template #prepend-inner>
                    <LucideIcon name="key" :size="20" class="text-gold me-2" />
                  </template>
                </v-text-field>
              </div>

              <div class="mb-6">
                <v-progress-linear
                  :model-value="passwordStrength.score"
                  :color="passwordStrength.color"
                  height="8"
                  rounded
                  class="mb-3"
                />
                <div
                  class="d-flex align-center justify-space-between text-caption font-weight-black"
                >
                  <span class="text-grey-darken-1">مستوى تعقيد كلمة المرور</span>
                  <span :class="passwordStrength.textClass" class="text-h6">{{
                    passwordStrength.label
                  }}</span>
                </div>
              </div>

              <div class="mb-10">
                <label class="mb-2 font-weight-black text-gold">تأكيد كلمة المرور الجديدة</label>
                <v-text-field
                  v-model="passwordData.confirmPassword"
                  type="password"
                  variant="outlined"
                  class="glass-input glass-input"
                  :rules="[rules.required, rules.match]"
                  placeholder="أعد إدخال كلمة المرور الجديدة للتأكيد"
                  hide-details="auto"
                >
                  <template #prepend-inner>
                    <LucideIcon name="shield-check" :size="20" class="text-gold me-2" />
                  </template>
                </v-text-field>
              </div>

              <div class="d-flex justify-center">
                <v-btn
                  color="accent"
                  variant="flat"
                  size="x-large"
                  type="submit"
                  height="64"
                  block
                  :loading="submitting"
                  :disabled="!isFormValid"
                  class="rounded-xl font-weight-black premium-lift text-ebony premium-btn-gold-gradient"
                >
                  <LucideIcon name="refresh-cw" :size="20" class="me-3" /> تحديث كلمة المرور
                </v-btn>
              </div>
            </v-form>
          </v-card-text>
        </v-card>

        <!-- Recovery Settings Card -->
        <v-card
          elevation="0"
          class="glass-card rounded-2xl border border-gold border-opacity-20 mt-8 glass-card"
        >
          <div
            class="glass-panel-light pa-6 border-b border-gold border-opacity-10 d-flex align-center"
          >
            <div
              class="glass-panel-light pa-3 rounded-xl me-4 border border-gold border-opacity-10"
            >
              <LucideIcon name="shield-alert" :size="24" class="text-gold" />
            </div>
            <span class="text-h5 font-weight-black text-ebony"
              >إعدادات استعادة الحساب (Self-Recovery)</span
            >
          </div>

          <v-card-text class="pa-8 glass-card">
            <div class="text-body-2 text-gold opacity-80 mb-8 font-weight-bold">
              قم بتعيين سؤال سري وبريد إلكتروني احتياطي لتتمكن من استعادة حسابك ذاتياً في حال فقدان
              كلمة المرور.
            </div>

            <div class="mb-6">
              <label class="mb-2 font-weight-black text-gold">البريد الإلكتروني للاستعادة</label>
              <v-text-field
                v-model="recoveryData.email"
                variant="outlined"
                class="glass-input glass-input"
                placeholder="example@email.com"
                hide-details
              >
                <template #prepend-inner>
                  <LucideIcon name="mail" :size="20" class="text-gold me-2" />
                </template>
              </v-text-field>
            </div>

            <v-row dense>
              <v-col cols="12" sm="6">
                <div class="mb-6">
                  <label class="mb-2 font-weight-black text-gold">سؤال الأمان المخصص</label>
                  <v-text-field
                    v-model="recoveryData.question"
                    variant="outlined"
                    class="glass-input glass-input"
                    placeholder="ما هو اسم مدرستك الأولى؟"
                    hide-details
                  >
                    <template #prepend-inner>
                      <LucideIcon name="help-circle" :size="20" class="text-gold me-2" />
                    </template>
                  </v-text-field>
                </div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="mb-6">
                  <label class="mb-2 font-weight-black text-gold">إجابة السؤال (تشفير آمن)</label>
                  <v-text-field
                    v-model="recoveryData.answer"
                    type="password"
                    variant="outlined"
                    class="glass-input glass-input"
                    placeholder="أدخل الإجابة هنا..."
                    hide-details
                  >
                    <template #prepend-inner>
                      <LucideIcon name="key-round" :size="20" class="text-gold me-2" />
                    </template>
                  </v-text-field>
                </div>
              </v-col>
            </v-row>

            <div class="d-flex justify-center mt-4">
              <v-btn
                color="gold"
                variant="tonal"
                size="large"
                height="56"
                block
                :loading="updatingRecovery"
                class="rounded-xl font-weight-black premium-lift premium-btn-gold-gradient"
                @click="handleUpdateRecovery"
              >
                <LucideIcon name="save" :size="20" class="me-3" /> حفظ بيانات الاستعادة
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Edit Username Dialog -->
    <v-dialog v-model="showUsernameDialog" max-width="500">
      <v-card class="glass-card border-gold border-2 overflow-hidden rounded-2xl glass-card">
        <div class="pa-6 bg-gold-gradient text-ebony d-flex align-center">
          <LucideIcon name="user-edit" :size="24" class="me-3" />
          <span class="text-h6 font-weight-black">تعديل اسم المستخدم</span>
          <v-spacer />
          <v-btn
            class="premium-btn-gold-gradient"
            icon
            variant="text"
            color="ebony"
            @click="showUsernameDialog = false"
          >
            <LucideIcon name="x" :size="24" />
          </v-btn>
        </div>
        <v-card-text class="pa-8 glass-card">
          <label class="mb-2 font-weight-black text-gold">اسم المستخدم الجديد</label>
          <v-text-field
            v-model="newUsername"
            variant="outlined"
            class="glass-input glass-input"
            :rules="[rules.required, rules.usernameMin]"
            placeholder="أدخل اسم المستخدم الجديد"
            hide-details="auto"
            autofocus
          >
            <template #prepend-inner>
              <LucideIcon name="user" :size="20" class="text-gold me-2" />
            </template>
          </v-text-field>
          <v-alert
            type="warning"
            variant="tonal"
            density="compact"
            class="mt-4 text-caption font-weight-bold border-gold border-opacity-20"
          >
            سيتم استخدامه في تسجيل الدخول القادم.
          </v-alert>
        </v-card-text>
        <v-card-actions class="pa-8 pt-0 ga-3 glass-card">
          <v-btn
            variant="text"
            color="gold"
            class="font-weight-black premium-btn-gold-gradient"
            @click="showUsernameDialog = false"
            >إلغاء</v-btn
          >
          <v-spacer />
          <v-btn
            color="gold"
            variant="flat"
            class="px-8 font-weight-black premium-lift premium-btn-gold-gradient"
            :loading="updatingUsername"
            :disabled="!newUsername || newUsername.length < 3 || newUsername === user?.username"
            @click="handleUpdateUsername"
          >
            حفظ التغيير
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Success/Error Feedback -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" rounded="xl" elevation="24">
      <div class="d-flex align-center pa-2">
        <LucideIcon
          :name="snackbarColor === 'success' ? 'check-circle' : 'alert-circle'"
          :size="24"
          class="me-4"
        />
        <span class="font-weight-black">{{ snackbarText }}</span>
      </div>
      <template #actions>
        <v-btn color="white" variant="text" class="font-weight-black" @click="snackbar = false"
          >فهمت</v-btn
        >
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePermissions } from '../composables/usePermissions'
import { useAppStore } from '../stores/app'
import LucideIcon from '../components/common/LucideIcon.vue'

const appStore = useAppStore()

const { session, reload } = usePermissions()
const user = computed(() => session.value)

const passwordForm = ref<any>(null)
const isFormValid = ref(false)
const submitting = ref(false)

const updatingUsername = ref(false)
const showUsernameDialog = ref(false)
const newUsername = ref('')

// Recovery Settings
const fetchingRecovery = ref(false)
const updatingRecovery = ref(false)
const recoveryData = ref({
  email: '',
  question: '',
  answer: ''
})

const loadRecoveryInfo = async () => {
  fetchingRecovery.value = true
  try {
    const info = await (window as any).api.users.getSelfRecoveryInfo()
    if (info) {
      recoveryData.value.email = info.recovery_email || ''
      recoveryData.value.question = info.security_question || ''
    }
  } catch (err) {
    console.error('Failed to load recovery info:', err)
  } finally {
    fetchingRecovery.value = false
  }
}

const handleUpdateRecovery = async () => {
  updatingRecovery.value = true
  try {
    const success = await (window as any).api.users.updateRecoveryInfo(
      recoveryData.value.email || null,
      recoveryData.value.question || null,
      recoveryData.value.answer || null
    )
    if (success) {
      showSnackbar('تم تحديث بيانات استعادة الحساب بنجاح', 'success')
      recoveryData.value.answer = '' // Clear answer field
    }
  } catch (err: any) {
    showSnackbar(err.message || 'فشل تحديث بيانات الاستعادة', 'error')
  } finally {
    updatingRecovery.value = false
  }
}

const passwordData = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const rules = {
  required: (v: string) => !!v || 'هذا الحقل إلزامي',
  min: (v: string) => (v && v.length >= 4) || 'كلمة المرور يجب أن تكون 4 رموز على الأقل',
  usernameMin: (v: string) => (v && v.length >= 3) || 'اسم المستخدم يجب أن يكون 3 رموز على الأقل',
  match: (v: string) => v === passwordData.value.newPassword || 'كلمة المرور غير متطابقة'
}

const passwordStrength = computed(() => {
  const p = String(passwordData.value.newPassword || '')
  let score = 0
  if (p.length >= 4) score += 20
  if (p.length >= 8) score += 25
  if (/[a-zA-Z]/.test(p)) score += 15
  if (/\d/.test(p)) score += 20
  if (/[^a-zA-Z0-9]/.test(p)) score += 20
  score = Math.max(0, Math.min(100, score))

  if (!p) {
    return { score: 0, label: 'قيد الإدخال', color: 'grey', textClass: 'text-grey' }
  }
  if (score < 45) {
    return { score, label: 'ضعيفة جداً', color: 'error', textClass: 'text-error' }
  }
  if (score < 75) {
    return { score, label: 'مقبولة تقنياً', color: 'warning', textClass: 'text-warning' }
  }
  return { score, label: 'حصينة وقوية', color: 'success', textClass: 'text-success' }
})

const getRoleLabel = (role?: string) => {
  const roles: Record<string, string> = {
    admin: 'مدير النظام',
    licensed_lawyer: 'محامي ممارس ومجاز',
    trainee_lawyer: 'محامي متدرب',
    secretary: 'أمين سر / سكرتير'
  }
  return role ? roles[role] || role : 'بانتظار الصلاحيات'
}

const openUsernameDialog = () => {
  newUsername.value = user.value?.username || ''
  showUsernameDialog.value = true
}

const handleUpdateUsername = async () => {
  if (!newUsername.value || !user.value) return
  updatingUsername.value = true
  try {
    const success = await (window as any).api.users.updateUsername(
      (user.value as any).userId,
      newUsername.value
    )
    if (success) {
      appStore.markChanges()
      // Update local storage session
      const sRaw = localStorage.getItem('web_currentUserSession')
      if (sRaw) {
        const s = JSON.parse(sRaw)
        s.username = newUsername.value
        localStorage.setItem('web_currentUserSession', JSON.stringify(s))
      }

      const cuRaw = localStorage.getItem('web_currentUser')
      if (cuRaw) {
        const cu = JSON.parse(cuRaw)
        cu.username = newUsername.value
        localStorage.setItem('web_currentUser', JSON.stringify(cu))
      }

      window.dispatchEvent(new Event('auth-changed'))
      reload()

      showSnackbar('تم تحديث اسم المستخدم بنجاح', 'success')
      showUsernameDialog.value = false
    }
  } catch (err: any) {
    showSnackbar(err.message || 'فشل تحديث اسم المستخدم', 'error')
  } finally {
    updatingUsername.value = false
  }
}

const handleUpdatePassword = async () => {
  const { valid } = await passwordForm.value.validate()
  if (!valid) return

  submitting.value = true
  try {
    const success = await (window as any).api.auth.changePassword(
      passwordData.value.oldPassword,
      passwordData.value.newPassword
    )

    if (success) {
      showSnackbar('تم تحديث كلمة المرور بنجاح تام', 'success')

      // Clear mustChangePassword from session
      try {
        const raw = localStorage.getItem('web_currentUserSession')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed.mustChangePassword) {
            parsed.mustChangePassword = false
            localStorage.setItem('web_currentUserSession', JSON.stringify(parsed))
          }
        }
      } catch {}

      passwordData.value = {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
      passwordForm.value.resetValidation()
    }
  } catch (err: any) {
    console.error('Password change error:', err)
    showSnackbar(err.message || 'فشل تحديث كلمة المرور. تحقق من كلمة المرور الحالية.', 'error')
  } finally {
    submitting.value = false
  }
}

const showSnackbar = (text: string, color: string) => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

onMounted(() => {
  loadRecoveryInfo()
})
</script>

<style scoped>
.rtl {
  direction: rtl;
}
.gap-6 {
  gap: 1.5rem;
}

.profile-hero-banner {
  height: 140px;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
  position: relative;
  border-bottom: 1px solid rgba(233, 195, 73, 0.1);
}

.profile-hero-banner::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 10% 20%, rgba(233, 195, 73, 0.05) 0%, transparent 50%),
    url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 30L30 0M30 30L60 30M30 30L30 60M30 30L0 30' stroke='%23D4AF37' stroke-opacity='0.03' stroke-width='1'/%3E%3C/svg%3E");
}

.profile-hero-body {
  margin-top: -60px;
  position: relative;
  z-index: 1;
}

.profile-avatar-premium {
  border: 4px solid #0a0a0a;
  box-shadow: 0 0 30px rgba(233, 195, 73, 0.2);
  background: #1a1a1a;
}

.font-mono {
  font-family: 'Consolas', 'Monaco', monospace;
}

.bg-gold-gradient {
  background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%);
}
.text-ebony {
  color: #0a0a0a;
}

/* Mobile (<=1023px only) */
@media (max-width: 1023px) {
  :deep(.v-row.mb-8.align-center > .v-col-auto) {
    flex: 0 0 100% !important;
    max-width: 100% !important;
    margin-top: 8px;
  }
  :deep(.v-row.mb-8.align-center > .v-col-auto .v-btn) {
    width: 100% !important;
  }
  :deep(.v-table) {
    overflow-x: auto !important;
    display: block !important;
  }
  :deep(.v-table thead th) {
    white-space: nowrap !important;
    font-size: 0.7rem !important;
    padding: 8px !important;
  }
  :deep(.v-table tbody td) {
    padding: 8px !important;
    font-size: 0.78rem !important;
  }
  :deep(.v-data-table .v-table__wrapper) {
    overflow-x: auto !important;
  }
  :deep(.v-dialog > .v-overlay__content) {
    width: 95vw !important;
    max-width: 95vw !important;
    margin: 8px !important;
  }
  :deep(.v-card-text.pa-8) {
    padding: 12px !important;
  }
  :deep(.v-card-actions.pa-8) {
    padding: 12px !important;
    flex-wrap: wrap !important;
    gap: 8px !important;
  }
  :deep(.v-card-actions .v-spacer) {
    display: none !important;
  }
  :deep(.v-card-actions .v-btn) {
    flex: 1 1 auto !important;
    min-width: 100px !important;
  }
}
</style>
