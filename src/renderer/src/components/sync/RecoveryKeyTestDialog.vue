<template>
  <v-dialog v-model="isOpen" max-width="520px">
    <v-card class="rounded-xl pa-2">
      <v-card-title class="d-flex align-center justify-space-between pb-2">
        <div class="d-flex align-center">
          <v-icon color="secondary" class="me-2">mdi-shield-key</v-icon>
          <span class="text-h6 font-weight-bold">فحص واختبار مفتاح الاسترداد</span>
        </div>
        <v-btn icon="mdi-close" variant="text" density="compact" @click="close" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pt-4">
        <p class="text-body-2 text-medium-emphasis mb-3">
          تحقق من صحة كلمة مرور استرداد المكتب أو مفتاح الأتمتة المشفر دون الحاجة لإجراء استعادة فعلية للبيانات.
        </p>

        <v-tabs v-model="keyType" color="primary" density="compact" class="mb-4">
          <v-tab value="passphrase">عبارة مرور الاسترداد</v-tab>
          <v-tab value="automation">مفتاح الأتمتة (Hex Key)</v-tab>
        </v-tabs>

        <v-window v-model="keyType">
          <v-window-item value="passphrase">
            <v-text-field
              v-model="passphrase"
              label="عبارة مرور الاسترداد (Recovery Passphrase)"
              placeholder="أدخل عبارة المرور السرية..."
              type="password"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-lock-outline"
              class="mb-2"
            />
          </v-window-item>

          <v-window-item value="automation">
            <v-text-field
              v-model="automationKey"
              label="مفتاح الأتمتة السداسي (64 Hex Characters)"
              placeholder="e.g. 4f9b2a..."
              type="password"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-robot"
              class="mb-2"
            />
          </v-window-item>
        </v-window>

        <v-alert
          v-if="validationStatus === 'valid'"
          type="success"
          variant="tonal"
          density="compact"
          class="mb-3"
        >
          <div class="font-weight-bold">المفتاح سليم وصالح تماماً!</div>
          <div class="text-caption">تم التحقق من مطابقة تشفير الغلاف الثنائي (v3) بنجاح.</div>
        </v-alert>

        <v-alert
          v-if="validationStatus === 'invalid'"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-3"
        >
          <div class="font-weight-bold">المفتاح غير صحيح!</div>
          <div class="text-caption">{{ errorMessage || 'فشل فك تشفير الغلاف التجريبي. تأكد من صحة الرمز المدخل.' }}</div>
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="plain" @click="close">إغلاق</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="validating"
          prepend-icon="mdi-shield-check"
          @click="testKey"
        >
          فحص وتدقيق المفتاح
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const keyType = ref<'passphrase' | 'automation'>('passphrase')
const passphrase = ref('')
const automationKey = ref('')
const validating = ref(false)
const validationStatus = ref<'idle' | 'valid' | 'invalid'>('idle')
const errorMessage = ref<string | null>(null)

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const close = () => {
  isOpen.value = false
  validationStatus.value = 'idle'
  errorMessage.value = null
}

const testKey = async () => {
  validating.value = true
  validationStatus.value = 'idle'
  errorMessage.value = null

  try {
    const api = (window as any).api?.recovery
    if (api && typeof api.verifyKey === 'function') {
      const payload = keyType.value === 'passphrase'
        ? { recoveryPassphrase: passphrase.value }
        : { automationKey: automationKey.value }
      const res = await api.verifyKey(payload)
      if (res && res.valid) {
        validationStatus.value = 'valid'
      } else {
        validationStatus.value = 'invalid'
        errorMessage.value = res?.error || 'المفتاح لا يطابق أي منفذ استرداد متاح'
      }
    } else {
      throw new Error('لا تتوفر حزمة اختبار مشفرة موثقة؛ لا يمكن إثبات صلاحية المفتاح شكلياً.')
    }
  } catch (err: any) {
    validationStatus.value = 'invalid'
    errorMessage.value = err.message || 'حدث خطأ أثناء فحص المفتاح'
  } finally {
    validating.value = false
  }
}
</script>
