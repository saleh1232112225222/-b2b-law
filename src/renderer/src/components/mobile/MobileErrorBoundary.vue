<template>
  <div v-if="hasError" class="mobile-error-boundary text-center pa-8">
    <v-icon icon="mdi-alert-circle-outline" :size="64" color="error" class="mb-4" />
    <div class="text-h6 font-weight-black mb-2">حدث خطأ غير متوقع</div>
    <div class="text-body-2 text-medium-emphasis mb-6">{{ errorMessage }}</div>
    <div class="d-flex justify-center gap-3">
      <v-btn color="primary" variant="elevated" class="rounded-lg font-weight-bold" @click="retry">
        <v-icon icon="mdi-refresh" class="me-2" />
        إعادة المحاولة
      </v-btn>
      <v-btn color="grey" variant="tonal" class="rounded-lg font-weight-bold" @click="goHome">
        <v-icon icon="mdi-home" class="me-2" />
        العودة للرئيسية
      </v-btn>
    </div>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const hasError = ref(false)
const errorMessage = ref('')

onErrorCaptured((err: Error) => {
  hasError.value = true
  errorMessage.value = err.message || 'حدث خطأ أثناء تحميل المكون'
  return false
})

const retry = () => {
  hasError.value = false
  errorMessage.value = ''
}

const goHome = () => {
  hasError.value = false
  errorMessage.value = ''
  router.push('/dashboard')
}
</script>
