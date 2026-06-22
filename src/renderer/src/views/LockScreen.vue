<template>
  <v-container fluid class="fill-height pa-0 lock-bg">
    <v-row class="fill-height" no-gutters>
      <v-col cols="12" class="d-flex align-center justify-center">
        <v-card class="pa-6 glass-card" max-width="420" width="100%" elevation="10">
          <div class="text-h6 mb-2">التطبيق مقفل</div>
          <div class="text-body-2 mb-4">أدخل كلمة المرور للمتابعة</div>

          <v-form @submit.prevent="handleUnlock">
            <v-text-field class="glass-input"
              v-model="password"
              type="password"
              label="كلمة المرور"
              :disabled="loading"
              autocomplete="current-password"
              hide-details="auto"
            />
            <v-alert v-if="error" type="error" class="mt-3" density="compact">
              {{ error }}
            </v-alert>

            <div class="d-flex gap-2 mt-4">
              <v-btn class="premium-btn-gold-gradient" color="primary" type="submit" :loading="loading" block>فتح القفل</v-btn>
            </div>

            <div class="d-flex justify-end mt-3">
              <v-btn class="premium-btn-gold-gradient" variant="text" color="error" :disabled="loading" @click="handleLogout"
                >تسجيل خروج</v-btn
              >
            </div>
          </v-form>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleUnlock = async () => {
  error.value = ''
  loading.value = true
  try {
    await window.api.auth.unlock(password.value)
    const session = await window.api.auth.getSession()
    if (session) {
      localStorage.setItem('web_isLoggedIn', 'true')
      localStorage.setItem('web_currentUserSession', JSON.stringify(session))
      localStorage.setItem(
        'web_currentUser',
        JSON.stringify({ username: session.username, roleKey: session.roleKey })
      )
      window.dispatchEvent(new Event('auth-changed'))
    }
    router.replace('/dashboard')
  } catch (e: any) {
    error.value = e?.message || 'تعذر فتح القفل'
  } finally {
    loading.value = false
  }
}

const handleLogout = async () => {
  loading.value = true
  error.value = ''
  try {
    await window.api.auth.logout()
  } catch {
  } finally {
    localStorage.removeItem('web_isLoggedIn')
    localStorage.removeItem('web_currentUser')
    localStorage.removeItem('web_currentUserSession')
    window.dispatchEvent(new Event('auth-changed'))
    loading.value = false
    router.replace('/login')
  }
}
</script>

<style scoped>
.lock-bg {
  background: radial-gradient(circle at 20% 20%, #1e293b 0%, #0b1220 60%, #070b14 100%);
}
</style>
