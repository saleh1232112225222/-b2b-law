<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <!-- Header -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="bg-white pa-4 rounded-xl me-5 border-gold-alpha">
            <LucideIcon name="building-2" :size="36" class="text-gold" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-pure-black mb-1">بيانات الهوية المؤسسية</h1>
            <p class="text-subtitle-1 text-pure-black font-weight-black opacity-60">
              إدارة معلومات المنشأة القانونية، الهوية الرسمية، ومعلومات التواصل الفني
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="auto">
        <v-btn
          color="accent"
          variant="flat"
          height="56"
          size="large"
          class="rounded-xl px-12 font-weight-black text-white premium-lift premium-btn-gold-gradient"
          :loading="saving"
          @click="handleSave"
        >
          <LucideIcon name="save" :size="20" class="me-3" /> حفظ التغييرات المؤسسية
        </v-btn>
      </v-col>
    </v-row>

    <v-row v-if="store.loading">
      <v-col cols="12" md="8">
        <v-skeleton-loader
          type="card, article"
          class="rounded-xl"
          color="transparent"
        ></v-skeleton-loader>
      </v-col>
      <v-col cols="12" md="4">
        <v-skeleton-loader
          type="avatar, article"
          class="rounded-xl mb-6"
          color="transparent"
        ></v-skeleton-loader>
        <v-skeleton-loader
          type="article"
          class="rounded-xl"
          color="transparent"
        ></v-skeleton-loader>
      </v-col>
    </v-row>

    <v-row v-else class="fill-height">
      <!-- Firm Information Card -->
      <v-col cols="12" md="8">
        <v-card
          elevation="0"
          class="bg-white rounded-2xl border-gold-alpha overflow-hidden mb-6 glass-card"
        >
          <div class="pa-6 border-b border-gold-alpha d-flex align-center bg-white">
            <LucideIcon name="building" :size="24" class="text-gold me-4" />
            <span class="text-h5 font-weight-black text-pure-black"
              >بيانات الهوية الرسمية للمكتب</span
            >
          </div>
          <v-card-text class="pa-8">
            <v-form ref="formRef" @submit.prevent="handleSave">
              <v-row>
                <v-col cols="12" md="6">
                  <label class="mb-2 font-weight-black text-gold"
                    >اسم المكتب / الكيان القانوني</label
                  >
                  <v-text-field
                    v-model="editItem.name"
                    variant="outlined"
                    class="h-large glass-input"
                    placeholder="مكتب المحامي..."
                    :rules="[(v) => !!v || 'الاسم مطلوب']"
                    hide-details="auto"
                  >
                    <template #prepend-inner>
                      <LucideIcon name="landmark" :size="20" class="text-gold me-2" />
                    </template>
                  </v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <label class="mb-2 font-weight-black text-gold"
                    >رقم الترخيص / السجل التجاري</label
                  >
                  <v-text-field
                    v-model="editItem.license_number"
                    variant="outlined"
                    class="h-large glass-input"
                    placeholder="رقم الترخيص..."
                    hide-details="auto"
                  >
                    <template #prepend-inner>
                      <LucideIcon name="file-text" :size="20" class="text-gold me-2" />
                    </template>
                  </v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <label class="mb-2 font-weight-black text-gold">العنوان الجغرافي</label>
                  <v-text-field
                    v-model="editItem.address"
                    variant="outlined"
                    class="h-large glass-input"
                    placeholder="المدينة، الحي، الشارع..."
                    hide-details="auto"
                  >
                    <template #prepend-inner>
                      <LucideIcon name="map-pin" :size="20" class="text-gold me-2" />
                    </template>
                  </v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <label class="mb-2 font-weight-black text-gold">رقم الهاتف / التواصل</label>
                  <v-text-field
                    v-model="editItem.phone"
                    variant="outlined"
                    class="h-large glass-input"
                    placeholder="05xxxxxxx"
                    hide-details="auto"
                  >
                    <template #prepend-inner>
                      <LucideIcon name="phone" :size="20" class="text-gold me-2" />
                    </template>
                  </v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <label class="mb-2 font-weight-black text-gold">البريد الإلكتروني الرسمي</label>
                  <v-text-field
                    v-model="editItem.email"
                    variant="outlined"
                    class="h-large glass-input"
                    placeholder="office@example.com"
                    hide-details="auto"
                  >
                    <template #prepend-inner>
                      <LucideIcon name="mail" :size="20" class="text-gold me-2" />
                    </template>
                  </v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <label class="mb-2 font-weight-black text-gold">الموقع الإلكتروني</label>
                  <v-text-field
                    v-model="editItem.website"
                    variant="outlined"
                    class="h-large glass-input"
                    placeholder="https://www.lawfirm.com"
                    hide-details="auto"
                  >
                    <template #prepend-inner>
                      <LucideIcon name="globe" :size="20" class="text-gold me-2" />
                    </template>
                  </v-text-field>
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Logo & Branding -->
      <v-col cols="12" md="4">
        <v-card
          elevation="0"
          class="bg-white rounded-2xl border-gold-alpha overflow-hidden mb-6 glass-card"
        >
          <div class="pa-6 border-b border-gold-alpha d-flex align-center bg-white">
            <LucideIcon name="palette" :size="24" class="text-gold me-4" />
            <span class="text-h5 font-weight-black text-pure-black">الهوية البصرية</span>
          </div>
          <v-card-text class="pa-8 text-center">
            <div class="mb-6 d-flex flex-column align-center">
              <v-avatar size="180" class="firm-logo-avatar mb-6">
                <LucideIcon
                  v-if="!logoPreviewSrc"
                  name="image-plus"
                  :size="80"
                  class="text-gold opacity-20"
                />
                <img
                  v-else
                  :src="logoPreviewSrc"
                  style="width: 100%; height: 100%; object-fit: contain; padding: 10px"
                  alt="شعار المكتب"
                />
              </v-avatar>
              <v-btn
                variant="outlined"
                color="gold"
                height="56"
                size="large"
                class="rounded-xl px-12 font-weight-black text-pure-black premium-button-highlight premium-btn-gold-gradient"
                @click="handlePickLogo"
              >
                <LucideIcon name="upload" :size="20" class="me-3" /> تغيير الشعار الملكي
              </v-btn>
              <div class="text-caption text-gold opacity-60 font-weight-black mt-4">
                المقاس الموصى به: 512×512 بكسل (PNG/SVG)
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Social Media Links -->
        <v-card
          elevation="0"
          class="bg-white rounded-2xl border-gold-alpha overflow-hidden glass-card"
        >
          <div class="pa-6 border-b border-gold-alpha d-flex align-center bg-white">
            <LucideIcon name="share-2" :size="24" class="text-gold me-4" />
            <span class="text-h5 font-weight-black text-pure-black">التواصل والمنصات</span>
          </div>
          <v-card-text class="pa-8">
            <v-row dense>
              <v-col cols="12">
                <v-text-field
                  v-model="editItem.twitter"
                  label="X (تويتر)"
                  variant="outlined"
                  density="comfortable"
                  class="mb-3 h-large glass-input"
                  hide-details
                >
                  <template #prepend-inner>
                    <LucideIcon name="twitter" :size="20" class="text-gold me-2" />
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="editItem.linkedin"
                  label="LinkedIn"
                  variant="outlined"
                  density="comfortable"
                  class="mb-3 h-large glass-input"
                  hide-details
                >
                  <template #prepend-inner>
                    <LucideIcon name="linkedin" :size="20" class="text-gold me-2" />
                  </template>
                </v-text-field>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Bottom Save Button -->
    <v-row v-if="!store.loading" class="mt-10">
      <v-col cols="12" class="d-flex justify-center">
        <v-btn
          color="accent"
          variant="flat"
          height="64"
          width="400"
          class="rounded-xl font-weight-black premium-lift text-ebony text-h6 premium-btn-gold-gradient"
          :loading="saving"
          @click="handleSave"
        >
          <LucideIcon name="check-circle" :size="24" class="me-4" /> اعتماد كافة البيانات
        </v-btn>
      </v-col>
    </v-row>

    <!-- Feedback Snackbar -->
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
        <v-btn
          variant="text"
          class="font-weight-black premium-btn-gold-gradient"
          @click="snackbar = false"
          >فهمت</v-btn
        >
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useFirmStore } from '../stores/firm'
import { Firm } from '../types'
import LucideIcon from '../components/common/LucideIcon.vue'

const store = useFirmStore()
const saving = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')
const formRef = ref<any>(null)

const editItem = ref<Firm>({
  name: '',
  license_number: '',
  tax_number: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  logo_path: '',
  twitter: '',
  linkedin: '',
  instagram: '',
  facebook: ''
})

const logoPreviewSrc = ref('')

const updateLogoPreview = async (): Promise<void> => {
  // Always try to resolve the data URI for the renderer
  if (editItem.value.logo_path) {
    try {
      const resolved = await (window as any).api.firm.resolveLogoSrc(editItem.value.logo_path)
      if (resolved) {
        ;(editItem.value as any).logo_src = resolved
        logoPreviewSrc.value = resolved
        return
      }
    } catch (err) {
      console.error('Failed to resolve logo preview:', err)
    }
  }

  // Fallback (though renderer might block file://)
  logoPreviewSrc.value = normalizeLogoSrc(
    (editItem.value as any).logo_src || editItem.value.logo_path
  )
}

onMounted(async (): Promise<void> => {
  await store.fetchFirmData()
  if (store.firmData) {
    editItem.value = { ...store.firmData }
    await updateLogoPreview()
  }
})

watch(
  () => store.firmData,
  async (newVal) => {
    if (newVal) {
      editItem.value = { ...newVal }
      await updateLogoPreview()
    }
  },
  { deep: true }
)

const normalizeLogoSrc = (raw: unknown): string => {
  const s = String(raw || '').trim()
  if (!s) return ''
  // If it's already a data URI, we are good
  if (s.startsWith('data:')) return s

  // If it's an absolute path, try to make it a file:// URL
  if (/^[a-zA-Z]:[\\/]/.test(s) || s.startsWith('\\\\') || s.startsWith('//')) {
    const asPosix = s.replace(/\\/g, '/')
    const cleanPath = asPosix.startsWith('/') ? asPosix : `/${asPosix}`
    return `file://${encodeURI(cleanPath)}`.replace('file:////', 'file:///')
  }

  // Otherwise it's likely a relative path from the app root or data dir
  // and we should rely on resolveLogoSrc to handle it.
  return s
}

const handlePickLogo = async (): Promise<void> => {
  try {
    const path = await (window as any).api.firm.pickLogo()
    if (path) {
      editItem.value.logo_path = path
      // Reset logo_src to force re-resolution
      ;(editItem.value as any).logo_src = ''
      await updateLogoPreview()
    }
  } catch (e: unknown) {
    showSnackbar('خطأ في اختيار الشعار: ' + (e as Error).message, 'error')
  }
}

const handleSave = async (): Promise<void> => {
  if (formRef.value) {
    const { valid } = await formRef.value.validate()
    if (!valid) return
  }

  saving.value = true
  try {
    await store.updateFirmData(editItem.value)
    showSnackbar('تم حفظ بيانات المكتب بنجاح تام', 'success')
  } catch (e: unknown) {
    showSnackbar('خطأ في حفظ البيانات: ' + (e as Error).message, 'error')
  } finally {
    saving.value = false
  }
}

const showSnackbar = (text: string, color: string): void => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}
</script>

<style scoped>
.rtl {
  direction: rtl;
}
.firm-logo-avatar {
  background: #ffffff; /* Changed to white for logo visibility */
  border: 4px solid #e9c349; /* Matching gold theme */
  box-shadow: 0 0 40px rgba(233, 195, 73, 0.25);
  overflow: hidden;
}

.firm-logo-avatar img {
  filter: drop-shadow(0 0 10px rgba(233, 195, 73, 0.2));
}

.h-large :deep(.v-field__input) {
  font-size: 1.25rem !important;
  font-weight: 900 !important;
}
</style>
