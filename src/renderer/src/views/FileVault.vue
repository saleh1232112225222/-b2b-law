<template>
  <v-container fluid class="pa-6 rtl">
    <v-alert
      v-if="!isDesktopRuntime"
      type="info"
      variant="tonal"
      class="mb-4 rounded-lg font-weight-bold"
    >
      خزانة الملفات المحلية متاحة عند تشغيل نسخة سطح المكتب.
    </v-alert>
    <MobileFileVault
      v-if="isMobile"
      :items="safeArray(assets)"
      :loading="loadingAssets"
      :uploading="uploading"
      :loading-lookups="loadingLookups"
      :entity-type="entityType"
      :entity-id="entityId"
      :entity-options="entityOptions"
      @add="upload"
      @upload="upload"
      @update:entity-type="entityType = $event as any"
      @update:entity-id="entityId = $event"
    />
    <template v-else>
      <!-- Header -->
      <v-row dense class="mb-8 align-center">
        <v-col>
          <div class="d-flex align-center">
            <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
              <LucideIcon name="folder-lock" :size="36" class="text-accent" />
            </div>
            <div>
              <h1 class="text-h5 font-weight-black text-gold mb-1">خزانة المكتب الرقمية</h1>
              <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
                إدارة الأصول الرقمية والمستندات المؤرشفة بأمان عالي
              </p>
            </div>
          </div>
        </v-col>
        <v-col cols="auto">
          <v-btn
            variant="text"
            color="gold"
            class="font-weight-black opacity-50 px-6 premium-btn-gold-gradient"
            @click="$router.push('/reports')"
          >
            <LucideIcon name="arrow-right" :size="18" class="me-2" /> العودة للتقارير
          </v-btn>
        </v-col>
      </v-row>

      <v-card elevation="0" class="glass-card pa-8 mb-10 glass-card">
        <div
          class="glass-panel-light pa-5 rounded-lg border-gold-thin mb-8 d-flex align-start bg-gold-light-alpha"
        >
          <LucideIcon name="info" :size="20" class="text-black me-3 mt-1 flex-shrink-0" />
          <span class="text-body-2 text-black font-weight-black leading-relaxed">
            يتم تشفير وحفظ كافة الملفات داخل مسار خزانة المكتب المحلي على هذا الجهاز. لضمان أمان
            البيانات القانونية، لا يمكن تغيير المسار إلا من خلال صلاحيات المسؤول النظامي.
          </span>
        </div>

        <v-row dense class="mb-2 align-end pb-1">
          <v-col cols="12" md="9">
            <label class="mb-2 font-weight-black text-gold">مسار التخزين النشط</label>
            <v-text-field
              :model-value="vaultRoot"
              variant="outlined"
              readonly
              class="glass-input ltr-text glass-input"
              density="comfortable"
              hide-details
            >
              <template #prepend-inner>
                <LucideIcon name="hard-drive" :size="20" class="text-gold opacity-50" />
              </template>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="3">
            <v-btn
              variant="flat"
              block
              height="48"
              :disabled="!isDesktopRuntime"
              class="rounded-lg font-weight-black premium-lift border-gold-button text-black bg-white premium-btn-gold-gradient"
              @click="chooseRoot"
            >
              <LucideIcon name="settings-2" :size="20" class="me-2" /> إدارة المسار
            </v-btn>
          </v-col>
        </v-row>
      </v-card>

      <v-row>
        <!-- Upload Section -->
        <v-col cols="12" lg="4">
          <v-card elevation="0" class="glass-card pa-6 h-100 glass-card">
            <div class="text-h6 font-weight-black text-gold mb-8 d-flex align-center">
              <div class="glass-panel-light pa-2 rounded-lg me-3">
                <LucideIcon name="upload-cloud" :size="20" class="text-accent" />
              </div>
              رفع وربط مستند جديد
            </div>

            <label class="mb-2 font-weight-black text-gold">نوع الارتباط القضائي</label>
            <v-select
              v-model="entityType"
              :items="entityTypes"
              variant="outlined"
              class="glass-input mb-4 glass-input"
            ></v-select>

            <label class="mb-2 font-weight-black text-gold">تحديد المرجع المستهدف</label>
            <v-select
              v-model="entityId"
              :items="entityOptions"
              :loading="loadingLookups"
              item-title="title"
              item-value="value"
              placeholder="اختر من القائمة..."
              variant="outlined"
              class="glass-input mb-4 glass-input"
              clearable
            >
              <template #loader>
                <v-progress-linear indeterminate color="accent" height="2"></v-progress-linear>
              </template>
            </v-select>

            <label class="mb-2 font-weight-black text-gold">تصنيف المستند (اختياري)</label>
            <v-text-field
              v-model="docType"
              placeholder="مثال: توكيل، لائحة، حكم"
              variant="outlined"
              class="glass-input mb-8 glass-input"
            ></v-text-field>

            <v-btn
              color="accent"
              block
              height="56"
              :disabled="!isDesktopRuntime"
              class="rounded-lg font-weight-black premium-lift premium-btn-gold-gradient"
              :loading="uploading"
              @click="upload"
            >
              <LucideIcon name="upload" :size="20" class="me-3" /> تنفيذ عملية الرفع
            </v-btn>
          </v-card>
        </v-col>

        <!-- Assets List Section -->
        <v-col cols="12" lg="8">
          <v-card elevation="0" class="glass-card overflow-hidden h-100 glass-card">
            <div class="glass-panel px-8 py-5 border-b d-flex align-center">
              <LucideIcon name="history" :size="20" class="text-accent me-3" />
              <span class="text-h6 font-weight-black text-gold">آخر الأصول الرقمية المرتبطة</span>
            </div>

            <v-data-table
              :items="safeArray(assets)"
              :loading="loadingAssets"
              class="bg-transparent file-table"
              density="comfortable"
              hover
              no-data-text="لا توجد ملفات مؤرشفة لهذا المرجع حالياً"
            >
              <template #loading>
                <v-skeleton-loader type="table-row@8" class="bg-transparent"></v-skeleton-loader>
              </template>

              <template #headers>
                <tr class="glass-panel-light">
                  <th class="text-right font-weight-black text-black pa-4">اسم الملف</th>
                  <th class="text-right font-weight-black text-black pa-4">التصنيف</th>
                  <th class="text-right font-weight-black text-black pa-4">بواسطة</th>
                  <th class="text-center font-weight-black text-black pa-4">الإجراءات</th>
                </tr>
              </template>

              <template #item="{ item }">
                <tr class="hover-row">
                  <td class="pa-4">
                    <div class="d-flex align-center">
                      <div class="glass-panel-light pa-2 rounded-lg me-3">
                        <LucideIcon name="file-text" :size="18" class="text-white opacity-40" />
                      </div>
                      <span
                        class="text-body-2 font-weight-black text-white text-truncate"
                        style="max-width: 300px"
                      >
                        {{ (item as any).original_name }}
                      </span>
                    </div>
                  </td>
                  <td class="pa-4">
                    <v-chip size="x-small" color="gold" variant="tonal" class="font-weight-black">
                      {{ (item as any).doc_type || 'غير محدد' }}
                    </v-chip>
                  </td>
                  <td class="pa-4">
                    <span class="text-tiny font-weight-black text-white opacity-40">
                      {{ (item as any).uploaded_by || '---' }}
                    </span>
                  </td>
                  <td class="pa-4 text-center">
                    <div class="d-flex justify-center ga-1">
                      <v-btn
                        icon
                        variant="text"
                        color="accent"
                        size="small"
                        class="opacity-50 hover-opacity-100 premium-btn-gold-gradient"
                        @click="openFile((item as any).id)"
                      >
                        <LucideIcon name="external-link" :size="16" />
                      </v-btn>
                      <v-btn
                        icon
                        variant="text"
                        color="error"
                        size="small"
                        class="opacity-50 hover-opacity-100 premium-btn-gold-gradient"
                        @click="deleteFile((item as any).id)"
                      >
                        <LucideIcon name="trash-2" :size="16" />
                      </v-btn>
                    </div>
                  </td>
                </tr>
              </template>
            </v-data-table>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <v-snackbar v-model="snackbar" :color="snackbarColor" rounded="lg" elevation="24">
      <div class="d-flex align-center">
        <LucideIcon
          :name="snackbarColor === 'success' ? 'check-circle' : 'alert-circle'"
          :size="18"
          class="me-3"
        />
        <span class="font-weight-black">{{ snackbarText }}</span>
      </div>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { safeArray } from '../utils/safe'
import { useMobileLayout } from '../composables/useMobileLayout'
import { setFabAction, clearFabAction } from '../composables/useFabAction'
import MobileFileVault from '../components/mobile/MobileFileVault.vue'
import LucideIcon from '../components/common/LucideIcon.vue'

const { isMobile } = useMobileLayout()
const route = useRoute()

interface VaultAsset {
  id: string
  original_name: string
  doc_type?: string
  uploaded_by?: string
}

interface LookupOption {
  title: string
  value: string
}

const vaultRoot = ref('')
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const assets = ref<VaultAsset[]>([])
const loadingAssets = ref(false)
const loadingLookups = ref(false)
const uploading = ref(false)
const isDesktopRuntime = Boolean((window as any).ipcRenderer)

const entityType = ref<'case' | 'client' | 'session' | 'task' | 'none'>('case')
const entityId = ref<string | null>(null)
const docType = ref('')

const entityTypes = [
  { title: 'ارتباط بقضية', value: 'case' },
  { title: 'ارتباط بموكل', value: 'client' },
  { title: 'ارتباط بجلسة', value: 'session' },
  { title: 'ارتباط بمهمة', value: 'task' },
  { title: 'بدون ارتباط مباشر', value: 'none' }
]

const cases = ref<LookupOption[]>([])
const clients = ref<LookupOption[]>([])
const sessions = ref<LookupOption[]>([])
const tasks = ref<LookupOption[]>([])

const entityOptions = computed(() => {
  if (entityType.value === 'case') return cases.value
  if (entityType.value === 'client') return clients.value
  if (entityType.value === 'session') return sessions.value
  if (entityType.value === 'task') return tasks.value
  return []
})

const showStatus = (text: string, color = 'success'): void => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

const loadRoot = async (): Promise<void> => {
  if (!isDesktopRuntime) {
    vaultRoot.value = 'متاح في نسخة سطح المكتب فقط'
    return
  }
  try {
    const res = await (window as any).api.vault.getRoot()
    vaultRoot.value = res?.path || ''
  } catch (e: unknown) {
    console.error('Failed to load vault root:', e)
  }
}

const chooseRoot = async (): Promise<void> => {
  if (!isDesktopRuntime) {
    showStatus('خزانة الملفات المحلية متاحة في نسخة سطح المكتب فقط', 'info')
    return
  }
  try {
    const res = await (window as any).api.vault.chooseRoot()
    if (res?.selected) {
      vaultRoot.value = res.path
      showStatus('تم تحديث مسار خزانة المكتب')
    }
  } catch (e: unknown) {
    showStatus((e as Error)?.message || 'فشل اختيار المسار', 'error')
  }
}

const loadLookups = async (): Promise<void> => {
  loadingLookups.value = true
  try {
    const [cRows, clRows, sRows, tRows] = await Promise.all([
      (window as any).api.reports.listCases(),
      (window as any).api.reports.listClients(),
      (window as any).api.reports.listSessions(),
      (window as any).api.reports.listTasks()
    ])

    cases.value = safeArray(cRows).map((r: any) => ({
      value: r.id,
      title: `${r.case_number || r.id} — ${r.client_name || ''}`
    }))
    clients.value = safeArray(clRows).map((r: any) => ({
      value: r.id,
      title: r.name || r.id
    }))
    sessions.value = safeArray(sRows).map((r: any) => ({
      value: r.id,
      title: `${r.date || ''} — ${r.status || ''}`
    }))
    tasks.value = safeArray(tRows).map((r: any) => ({
      value: r.id,
      title: r.title || r.id
    }))
  } catch (e: unknown) {
    console.error('Failed to load lookups:', e)
  } finally {
    loadingLookups.value = false
  }
}

watch(entityType, () => {
  entityId.value = null
  loadAssets()
})

watch(entityId, () => {
  loadAssets()
})

const upload = async (): Promise<void> => {
  if (!isDesktopRuntime) {
    showStatus('رفع الملفات إلى الخزانة المحلية متاح في نسخة سطح المكتب فقط', 'info')
    return
  }
  if (entityType.value !== 'none' && !entityId.value) {
    showStatus('يرجى اختيار المرجع أولاً', 'error')
    return
  }
  uploading.value = true
  try {
    const res = await (window as any).api.files.upload({
      linked_entity_type: entityType.value,
      linked_entity_id: entityId.value,
      doc_type: docType.value || undefined
    })
    if (res?.uploaded) {
      showStatus('تم رفع الملف وحفظه داخل خزانة المكتب')
      docType.value = ''
    }
    await loadAssets()
  } catch (e: unknown) {
    showStatus((e as Error)?.message || 'فشل رفع الملف', 'error')
  } finally {
    uploading.value = false
  }
}

const loadAssets = async (): Promise<void> => {
  if (!isDesktopRuntime) {
    assets.value = []
    return
  }
  loadingAssets.value = true
  try {
    const data = await (window as any).api.files.listByEntity({
      linked_entity_type: entityType.value,
      linked_entity_id: entityId.value
    })
    assets.value = safeArray(data)
  } catch (e: unknown) {
    console.error('Failed to load assets:', e)
    assets.value = []
  } finally {
    loadingAssets.value = false
  }
}

const openFile = async (id: string): Promise<void> => {
  try {
    await (window as any).api.files.open(id)
  } catch (e: unknown) {
    showStatus((e as Error)?.message || 'فشل فتح الملف', 'error')
  }
}

const deleteFile = async (id: string): Promise<void> => {
  if (!confirm('هل أنت متأكد من حذف هذا الملف نهائياً من الخزانة؟')) return
  try {
    await (window as any).api.files.delete(id)
    showStatus('تم الحذف بنجاح')
    await loadAssets()
  } catch (e: unknown) {
    showStatus((e as Error)?.message || 'فشل حذف الملف', 'error')
  }
}

onMounted(() => {
  loadRoot()
  loadLookups()
  loadAssets()
  setFabAction('mdi-upload', upload, route.path)
})

onUnmounted(() => {
  clearFabAction()
})
</script>

<style scoped>
.file-table :deep(th) {
  background: linear-gradient(135deg, #fff9e6 0%, #ffefb3 100%) !important;
  color: #000000 !important;
  font-weight: 900 !important;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 0.9rem !important;
  border-top: 1px solid #e9c349 !important;
  border-bottom: 1px solid #e9c349 !important;
}

.file-table :deep(td) {
  border-bottom: 1px solid rgba(233, 195, 73, 0.05) !important;
}

.hover-row:hover {
  background: rgba(255, 255, 255, 0.02) !important;
}

.ltr-text {
  direction: ltr;
}

.leading-relaxed {
  line-height: 1.6;
}

.hover-opacity-100:hover {
  opacity: 1 !important;
}

.border-gold-button {
  border: 1px solid #e9c349 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05) !important;
}

.bg-gold-light-alpha {
  background: rgba(233, 195, 73, 0.1) !important;
}

.border-gold-thin {
  border: 1px solid rgba(233, 195, 73, 0.3) !important;
}
</style>
