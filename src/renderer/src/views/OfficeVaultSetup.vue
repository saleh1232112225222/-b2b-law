<template>
  <v-container fluid class="pa-6 fill-height d-flex align-center justify-center rtl">
    <v-card elevation="0" class="glass-card pa-8 w-100 max-w-600">
      <div class="d-flex align-center mb-8">
        <div class="glass-panel-light pa-3 rounded-lg me-4">
          <LucideIcon name="folder-lock" :size="32" class="text-accent" />
        </div>
        <div>
          <h1 class="text-h5 font-weight-black text-gold">إعداد خزانة المكتب</h1>
          <p class="text-subtitle-2 text-gold opacity-60 font-weight-black mt-1">
            تكوين المسار الرقمي الآمن للأرشفة القضائية
          </p>
        </div>
      </div>

      <v-divider class="border-gold opacity-10 mb-8" />

      <div class="glass-panel-light pa-5 rounded-lg border-gold opacity-20 mb-8 d-flex align-start">
        <LucideIcon name="info" :size="20" class="text-accent me-3 mt-1 flex-shrink-0" />
        <span class="text-body-2 text-white font-weight-black leading-relaxed">
          يرجى تحديد مسار حفظ ملفات المكتب الأساسي على هذا الجهاز (مثال: D:\Office\خزانة_القضايا).
          سيتم تشفير وتأمين كافة المستندات القضائية في هذا المسار. يمكن تغيير الإعدادات لاحقاً من
          لوحة التحكم.
        </span>
      </div>

      <v-label class="mb-2 font-weight-black text-gold opacity-70">المسار الحالي للجهاز</v-label>
      <v-text-field
        :model-value="vaultRoot || 'لم يتم تحديد مسار بعد...'"
        variant="outlined"
        class="glass-input ltr-text mb-8"
        readonly
      >
        <template #prepend-inner>
          <LucideIcon name="hard-drive" :size="20" class="text-gold opacity-50" />
        </template>
      </v-text-field>

      <div class="d-flex ga-4 justify-end">
        <v-btn
          variant="text"
          color="gold"
          class="px-8 font-weight-black opacity-50 h-56"
          @click="skip"
        >
          تخطي الآن
        </v-btn>
        <v-btn
          color="accent"
          size="large"
          class="px-12 font-weight-black rounded-lg premium-lift h-56"
          @click="choose"
        >
          <LucideIcon name="folder-open" :size="20" class="me-2" /> اختيار المسار وتفعيل الخزانة
        </v-btn>
      </div>

      <v-fade-transition>
        <div v-if="error" class="mt-6 pa-4 rounded-lg bg-error-alpha d-flex align-center">
          <LucideIcon name="alert-triangle" :size="20" class="text-error me-3" />
          <span class="text-error text-caption font-weight-black">{{ error }}</span>
        </div>
      </v-fade-transition>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import LucideIcon from '../components/common/LucideIcon.vue'

const router = useRouter()
const vaultRoot = ref('')
const error = ref('')

const load = async () => {
  const r = await (window as any).api.vault.getRoot()
  vaultRoot.value = r.path
}

const choose = async () => {
  error.value = ''
  try {
    const res = await (window as any).api.vault.chooseRoot()
    if (res?.selected) {
      await load()
      router.push('/dashboard')
    }
  } catch (e: any) {
    error.value = e?.message || 'فشل اختيار المسار'
  }
}

const skip = async () => {
  try {
    await (window as any).api.vault.markSetupDone()
  } catch {
    // ignore
  }
  router.push('/dashboard')
}

load()
</script>

<style scoped>
.max-w-600 {
  max-width: 600px;
}

.h-56 {
  height: 56px !important;
}

.leading-relaxed {
  line-height: 1.6;
}

.ltr-text {
  direction: ltr;
}

.bg-error-alpha {
  background: rgba(var(--v-theme-error), 0.1);
  border: 1px solid rgba(var(--v-theme-error), 0.2);
}
</style>
