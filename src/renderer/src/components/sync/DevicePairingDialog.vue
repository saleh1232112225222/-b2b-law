<template>
  <v-dialog v-model="isOpen" max-width="560px" persistent>
    <v-card class="rounded-xl pa-2">
      <v-card-title class="d-flex align-center justify-space-between pb-2">
        <div class="d-flex align-center">
          <v-icon color="primary" class="me-2">mdi-devices</v-icon>
          <span class="text-h6 font-weight-bold">إقران جهاز سطح المكتب بالسحابة</span>
        </div>
        <v-btn icon="mdi-close" variant="text" density="compact" @click="close" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pt-4">
        <p class="text-body-2 text-medium-emphasis mb-4">
          قم بربط هذا الجهاز بخادم المكتب لمزامنة القضايا والجلسات والمستندات المشفرة تلقائياً عبر قناة اتصال موثقة وآمنة.
        </p>

        <v-form ref="formRef" @submit.prevent="submitPairing">
          <v-text-field
            v-model="baseUrl"
            label="عنوان خادم المزامنة (Sync Base URL)"
            placeholder="https://cloud.b2blaw.app/api"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-web"
            :rules="[rules.required, rules.validUrl]"
            class="mb-3"
          />

          <v-text-field
            v-model="deviceName"
            label="اسم هذا الجهاز (Device Name)"
            placeholder="جهاز المكتب الرئيسي - الاستقبال"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-laptop"
            :rules="[rules.required]"
            class="mb-3"
          />

          <v-text-field
            v-model="accessToken"
            label="رمز الإقران أو المفتاح السري (Access Token)"
            placeholder="Bearer Token..."
            type="password"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-key"
            :rules="[rules.required]"
            class="mb-2"
          />

          <v-switch
            v-model="enableAutoSync"
            color="primary"
            label="تفعيل المزامنة التلقائية فور نجاح الإقران"
            hide-details
            class="mb-2"
          />

          <v-alert
            v-if="errorMessage"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-3"
            closable
            @click:close="errorMessage = null"
          >
            {{ errorMessage }}
          </v-alert>

          <v-alert
            v-if="successMessage"
            type="success"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            {{ successMessage }}
          </v-alert>
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="plain" @click="close" :disabled="loading">إلغاء</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="loading"
          prepend-icon="mdi-check-circle"
          @click="submitPairing"
        >
          تأكيد الإقران
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSyncStore } from '../../stores/sync'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'paired', result: { deviceId: string }): void
}>()

const syncStore = useSyncStore()
const baseUrl = ref('')
const deviceName = ref('')
const accessToken = ref('')
const enableAutoSync = ref(true)
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const rules = {
  required: (v: string) => !!v?.trim() || 'هذا الحقل مطلوب',
  validUrl: (v: string) => {
    try {
      const u = new URL(v)
      return ['http:', 'https:'].includes(u.protocol) || 'يجب إدخال عنوان URL صالح يبدأ بـ http أو https'
    } catch {
      return 'صيغة الرابط غير صحيحة'
    }
  }
}

const close = () => {
  isOpen.value = false
  errorMessage.value = null
  successMessage.value = null
}

const submitPairing = async () => {
  if (!baseUrl.value || !deviceName.value || !accessToken.value) return
  loading.value = true
  errorMessage.value = null
  successMessage.value = null

  try {
    const api = (window as any).api?.sync
    if (api && typeof api.pairDevice === 'function') {
      const res = await api.pairDevice({
        baseUrl: baseUrl.value.trim(),
        name: deviceName.value.trim(),
        accessToken: accessToken.value.trim(),
        autoSync: enableAutoSync.value
      })
      successMessage.value = `تم إقران الجهاز بنجاح! معرّف الجهاز: ${res.deviceId}`
      emit('paired', res)
      setTimeout(() => close(), 1500)
    } else {
      throw new Error('واجهة الإقران الآمنة غير متاحة في هذا التطبيق؛ استخدم تطبيق سطح المكتب الموثوق.')
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'تعذر إقران الجهاز بالسيرفر. تحقق من العنوان وصلاحية الرمز.'
  } finally {
    loading.value = false
  }
}
</script>
