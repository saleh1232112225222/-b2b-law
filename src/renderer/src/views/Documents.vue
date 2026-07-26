<template>
  <v-container fluid class="pa-6 rtl">
    <MobileDocuments
      v-if="isMobile"
      :items="safeArray(filteredDocuments)"
      :loading="loading"
      @add="openUploadDialog"
    />
    <template v-else>
      <!-- Header -->
      <v-row dense class="mb-8 align-center">
        <v-col>
          <div class="d-flex align-center">
            <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
              <LucideIcon name="library" :size="36" class="text-accent" />
            </div>
            <div>
              <h1 class="text-h5 font-weight-black text-gold mb-1">أرشيف المستندات الذكي</h1>
              <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
                الإدارة المركزية للمرفقات، البينات، والأوراق الثبوتية المؤرشفة سحابياً
              </p>
            </div>
          </div>
        </v-col>
        <v-col cols="12" md="auto">
          <v-btn
            color="accent"
            size="large"
            class="font-weight-black rounded-xl px-8 premium-lift h-56 premium-btn-gold-gradient"
            @click="openUploadDialog"
          >
            <LucideIcon name="cloud-upload" :size="20" class="me-2" /> رفع مستند جديد
          </v-btn>
        </v-col>
      </v-row>

      <!-- Search/Filter Bar -->
      <v-card elevation="0" class="glass-card mb-8 pa-6 border-gold-alpha glass-card">
        <v-row dense align="center">
          <v-col cols="12" md="6">
            <v-text-field
              v-model="searchQuery"
              placeholder="البحث عن مستند بالاسم، رقم القضية، أو الجهة المرتبطة..."
              variant="outlined"
              density="comfortable"
              hide-details
              class="glass-input"
              clearable
            >
              <template #prepend-inner>
                <LucideIcon name="search" :size="18" class="text-gold opacity-40" />
              </template>
            </v-text-field>
          </v-col>
          <v-spacer />
          <v-col cols="auto">
            <div
              class="d-flex align-center px-4 py-2 rounded-lg glass-panel-light border-gold-alpha"
            >
              <LucideIcon name="database" :size="16" class="text-gold me-2" />
              <span class="text-gold text-caption font-weight-black"
                >إجمالي الملفات: {{ safeLength(documents) }}</span
              >
            </div>
          </v-col>
        </v-row>
      </v-card>

      <!-- Documents Grid -->
      <v-row v-if="loading">
        <v-col v-for="n in 8" :key="n" cols="12" sm="6" md="4" lg="3">
          <v-skeleton-loader
            type="card"
            class="glass-card rounded-xl overflow-hidden"
          ></v-skeleton-loader>
        </v-col>
      </v-row>

      <v-row v-else class="ma-0 ga-0">
        <v-col
          v-for="doc in safeArray(filteredDocuments)"
          :key="doc.id"
          cols="12"
          sm="6"
          md="4"
          lg="3"
          class="pa-3"
        >
          <v-card
            elevation="0"
            class="glass-card premium-lift pa-5 border-gold-alpha position-relative h-100 glass-card"
            @click="openFile(doc.file_path)"
          >
            <div class="d-flex align-center mb-5">
              <div
                class="glass-panel-light pa-3 rounded-lg me-4 border-gold-alpha"
                :style="{ background: `rgba(var(--v-theme-${getFileColor(doc.file_type)}), 0.1)` }"
              >
                <LucideIcon
                  :name="getFileIcon(doc.file_type)"
                  :size="24"
                  :class="`text-${getFileColor(doc.file_type)}`"
                />
              </div>
              <div class="overflow-hidden">
                <div class="text-body-2 font-weight-black text-white text-truncate mb-1">
                  {{ valWithDefault(doc.name, 'مستند غير معرف') }}
                </div>
                <div class="text-tiny text-gold opacity-40 font-weight-black uppercase">
                  {{ doc.file_type ? doc.file_type.toUpperCase().replace('.', '') : 'FILE' }}
                </div>
              </div>
            </div>

            <v-chip
              size="x-small"
              color="accent"
              variant="tonal"
              class="mb-5 font-weight-black rounded-lg px-3 w-100 justify-start"
            >
              <LucideIcon name="link-2" :size="12" class="me-2" />
              <span class="text-truncate">{{
                valWithDefault(doc.context_label, 'مكتبة عامة')
              }}</span>
            </v-chip>

            <v-divider class="mb-4 border-gold opacity-10"></v-divider>

            <div class="d-flex justify-space-between align-center">
              <span class="text-tiny text-gold opacity-40 font-weight-black d-flex align-center">
                <LucideIcon name="calendar" :size="14" class="me-2" />
                {{ formatDate(doc.created_at) }}
              </span>
              <v-btn
                icon
                variant="text"
                size="small"
                color="error"
                class="rounded-lg opacity-40 hover-op-1 premium-btn-gold-gradient"
                @click.stop="confirmDelete(doc)"
              >
                <LucideIcon name="trash-2" :size="16" />
              </v-btn>
            </div>
          </v-card>
        </v-col>

        <v-col v-if="safeLength(filteredDocuments) === 0" cols="12" class="text-center py-20">
          <LucideIcon name="folder-search" :size="100" class="text-gold opacity-10 mb-6" />
          <div class="text-h5 font-weight-black text-gold opacity-30">
            لم يتم العثور على نتائج بحث
          </div>
          <p class="text-body-2 text-white opacity-20 font-weight-black mt-2">
            جرب البحث بكلمة مفتاحية أخرى أو تحقق من المجلدات العامة
          </p>
        </v-col>
      </v-row>
    </template>

    <!-- Upload Document Dialog -->
    <v-dialog v-model="showUploadDialog" width="90%" max-width="800" persistent scrollable>
      <v-card class="glass-card overflow-hidden glass-card">
        <v-card-title class="pa-6 border-b border-gold opacity-10 d-flex align-center">
          <div class="bg-accent-alpha pa-2 rounded-lg me-3">
            <LucideIcon name="file-up" :size="20" class="text-gold" />
          </div>
          <span class="text-h6 font-weight-black text-visible-high">أرشفة مستند جديد</span>
          <v-spacer />
          <v-btn
            icon
            variant="text"
            size="small"
            class="rounded-lg premium-btn-gold-gradient"
            @click="showUploadDialog = false"
          >
            <LucideIcon name="x" :size="20" class="text-visible-high" />
          </v-btn>
        </v-card-title>

        <v-card-text class="pa-8 bg-noir-surface">
          <div
            class="d-flex align-center mb-8 pa-6 glass-panel-light rounded-xl border-gold-alpha border-dashed"
          >
            <LucideIcon name="info" :size="24" class="text-accent me-4" />
            <div class="text-caption font-weight-black text-visible-high leading-relaxed">
              تحديد التصنيف الصحيح للمستند يضمن ظهوره التلقائي في ملفات القضايا والمهام والجلسات
              المرتبطة.
            </div>
          </div>

          <div
            class="text-tiny font-weight-black text-gold opacity-40 uppercase tracking-widest mb-3"
          >
            تصنيف المستند القانوني
          </div>
          <v-select
            v-model="uploadForm.linkType"
            :items="linkTypeOptions"
            item-title="title"
            item-value="value"
            variant="outlined"
            class="glass-input mb-6 glass-input"
            @update:model-value="uploadForm.parentId = null"
          >
            <template #prepend-inner>
              <LucideIcon name="layers" :size="18" class="text-gold opacity-40" />
            </template>
          </v-select>

          <!-- Conditional Selects -->
          <v-expand-transition>
            <div v-if="uploadForm.linkType === 'case'">
              <div
                class="text-tiny font-weight-black text-gold opacity-40 uppercase tracking-widest mb-3"
              >
                ملف القضية المستهدف
              </div>
              <v-autocomplete
                v-model="uploadForm.parentId"
                :items="safeArray(caseOptions)"
                item-title="display"
                item-value="id"
                placeholder="ابحث عن رقم القضية..."
                variant="outlined"
                class="glass-input"
                :custom-filter="arabicFilter"
              >
                <template #prepend-inner>
                  <LucideIcon name="gavel" :size="18" class="text-gold opacity-40" />
                </template>
              </v-autocomplete>
            </div>
            <div v-else-if="uploadForm.linkType === 'task'">
              <div
                class="text-tiny font-weight-black text-gold opacity-40 uppercase tracking-widest mb-3"
              >
                المهمة المرتبطة
              </div>
              <v-autocomplete
                v-model="uploadForm.parentId"
                :items="safeArray(taskOptions)"
                item-title="title"
                item-value="id"
                placeholder="اختر المهمة المعنية..."
                variant="outlined"
                class="glass-input"
                :custom-filter="arabicFilter"
              >
                <template #prepend-inner>
                  <LucideIcon name="check-square" :size="18" class="text-gold opacity-40" />
                </template>
              </v-autocomplete>
            </div>
            <div v-else-if="uploadForm.linkType === 'session'">
              <div
                class="text-tiny font-weight-black text-gold opacity-40 uppercase tracking-widest mb-3"
              >
                موعد الجلسة
              </div>
              <v-autocomplete
                v-model="uploadForm.parentId"
                :items="safeArray(sessionOptions)"
                item-title="display"
                item-value="id"
                placeholder="ابحث عن تاريخ أو رقم الجلسة..."
                variant="outlined"
                class="glass-input"
                :custom-filter="arabicFilter"
              >
                <template #prepend-inner>
                  <LucideIcon name="calendar-days" :size="18" class="text-gold opacity-40" />
                </template>
              </v-autocomplete>
            </div>
            <div v-else-if="uploadForm.linkType === 'none'">
              <div
                class="text-tiny font-weight-black text-gold opacity-40 uppercase tracking-widest mb-3"
              >
                وصف المستند / المجلد
              </div>
              <v-text-field
                v-model="uploadForm.linkedTitle"
                placeholder="مثال: مستندات تأسيس الشركة، ملفات عامة..."
                variant="outlined"
                class="glass-input"
              >
                <template #prepend-inner>
                  <LucideIcon name="tag" :size="18" class="text-gold opacity-40" />
                </template>
              </v-text-field>
            </div>
          </v-expand-transition>
        </v-card-text>

        <v-divider class="border-gold opacity-10" />
        <v-card-actions class="pa-8 glass-panel border-t border-gold-alpha">
          <v-btn
            variant="text"
            color="error"
            class="px-6 font-weight-black premium-btn-gold-gradient"
            @click="showUploadDialog = false"
            >إلغاء</v-btn
          >
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            class="px-10 rounded-lg font-weight-black h-48 premium-lift premium-btn-gold-gradient"
            :disabled="uploadForm.linkType !== 'none' && !uploadForm.parentId"
            :loading="uploading"
            @click="handleUpload"
          >
            بدء الأرشفة السحابية
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Feedback -->
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

    <ConfirmDialog
      v-model="confirmDialog.show"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :color="confirmDialog.color"
      :confirm-button-color="confirmDialog.confirmButtonColor"
      :icon="confirmDialog.icon"
      :confirm-text="confirmDialog.confirmText"
      :cancel-text="confirmDialog.cancelText"
      :loading="confirmDialog.loading"
      @confirm="confirmDialog.action"
    />
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { useCasesStore } from '../stores/cases'
import { useTasksStore } from '../stores/tasks'
import { useSessionsStore } from '../stores/sessions'
import { useSearch } from '../composables/useSearch'
import { safeArray, safeLength, isValidDate, valWithDefault } from '../utils/safe'
import { useMobileLayout } from '../composables/useMobileLayout'
import { setFabAction, clearFabAction } from '../composables/useFabAction'
import MobileDocuments from '../components/mobile/MobileDocuments.vue'
import LucideIcon from '../components/common/LucideIcon.vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import { useConfirmDialog } from '../composables/useConfirmDialog'

const { isMobile } = useMobileLayout()
const route = useRoute()
const casesStore = useCasesStore()
const tasksStore = useTasksStore()
const sessionsStore = useSessionsStore()

interface DocumentItem {
  id: string
  name: string
  file_path: string
  file_type: string
  context_type: string
  context_id: string
  context_label?: string
  created_at: string
}

const documents = ref<DocumentItem[]>([])
const loading = ref(true)

const { search: searchQuery } = useSearch((val) => {
  console.log('Searching docs for:', val)
}, '')

onUnmounted(() => {
  if (searchQuery) searchQuery.value = ''
})

const showUploadDialog = ref(false)
const uploading = ref(false)
const uploadForm = reactive({
  linkType: 'none',
  parentId: null as string | null,
  linkedTitle: ''
})

const linkTypeOptions = [
  { title: 'أرشفة عامة (مستند مستقل)', value: 'none' },
  { title: 'إضافة لمستندات قضية', value: 'case' },
  { title: 'إضافة لمرفقات مهمة', value: 'task' },
  { title: 'إضافة لوقائع جلسة', value: 'session' }
]

const deleting = ref(false)
const itemToDelete = ref<DocumentItem | null>(null)

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const { confirmDialog, openConfirm, closeConfirm } = useConfirmDialog()

const caseOptions = computed(() => {
  return safeArray(casesStore.cases).map((c) => ({
    ...c,
    display: `${c.case_number} - ${c.client_name || 'بدون موكل'}`
  }))
})

const taskOptions = computed(() => safeArray(tasksStore.tasks))

const sessionOptions = computed(() => {
  return safeArray(sessionsStore.sessions).map((s) => ({
    ...s,
    display: `${s.date} - ${s.case_number || 'جلسة غير مرتبطة'}`
  }))
})

const filteredDocuments = computed(() => {
  if (!searchQuery.value) return documents.value || []
  const q = searchQuery.value.toLowerCase()
  return safeArray(documents.value).filter(
    (d: DocumentItem) =>
      d.name.toLowerCase().includes(q) ||
      (d.context_label && d.context_label.toLowerCase().includes(q))
  )
})

onMounted(async () => {
  await fetchDocs()
  await Promise.all([
    casesStore.fetchCases(),
    tasksStore.fetchTasks(),
    sessionsStore.fetchSessions()
  ])
  setFabAction('mdi-cloud-upload', openUploadDialog, route.path)
  if (route.query.search) {
    searchQuery.value = String(route.query.search)
  }
})

onUnmounted(() => {
  clearFabAction()
})

const fetchDocs = async (): Promise<void> => {
  loading.value = true
  try {
    const docs = await (window as any).api.documents.getAll()
    documents.value = safeArray(docs) as DocumentItem[]
  } catch (e: unknown) {
    showSnackbar('فشل مزامنة الأرشيف: ' + (e as Error).message, 'error')
  } finally {
    loading.value = false
  }
}

const openUploadDialog = (): void => {
  uploadForm.linkType = 'none'
  uploadForm.parentId = null
  uploadForm.linkedTitle = ''
  showUploadDialog.value = true
}

const executeUpload = async (): Promise<void> => {
  if (uploadForm.linkType !== 'none' && !uploadForm.parentId) return
  uploading.value = true
  try {
    const result = await (window as any).api.documents.upload({
      linkType: uploadForm.linkType as 'case' | 'task' | 'session' | 'none',
      parentId: uploadForm.parentId || undefined,
      linkedTitle: uploadForm.linkedTitle || undefined
    })
    if (result) {
      showSnackbar('تمت الأرشفة السحابية بنجاح', 'success')
      showUploadDialog.value = false
      documents.value = safeArray(result) as DocumentItem[]
    }
  } catch (e: unknown) {
    showSnackbar('فشل في رفع المستند: ' + (e as Error).message, 'error')
  } finally {
    uploading.value = false
  }
}

const handleUpload = async (): Promise<void> => {
  openConfirm({
    title: 'تأكيد أرشفة المستند',
    message: 'هل أنت متأكد من اختيار الملف وبدء عملية الأرشفة؟',
    color: 'success',
    confirmButtonColor: 'accent',
    icon: 'cloud-upload',
    confirmText: 'نعم، ارفع',
    cancelText: 'تراجع',
    action: async () => {
      confirmDialog.value.loading = true
      try {
        await executeUpload()
        closeConfirm()
      } finally {
        confirmDialog.value.loading = false
      }
    }
  })
}

const getFileIcon = (type: string): string => {
  const t = (type || '').toLowerCase()
  if (t === '.pdf') return 'file-text'
  if (['.jpg', '.png', '.jpeg', '.gif', '.svg'].includes(t)) return 'image'
  if (['.doc', '.docx'].includes(t)) return 'file-type-2'
  if (['.xls', '.xlsx'].includes(t)) return 'file-spreadsheet'
  if (['.ppt', '.pptx'].includes(t)) return 'presentation'
  return 'file'
}

const getFileColor = (type: string): string => {
  const t = (type || '').toLowerCase()
  if (t === '.pdf') return 'error'
  if (['.jpg', '.png', '.jpeg', '.gif', '.svg'].includes(t)) return 'success'
  if (['.doc', '.docx'].includes(t)) return 'accent'
  if (['.xls', '.xlsx'].includes(t)) return 'success'
  if (['.ppt', '.pptx'].includes(t)) return 'warning'
  return 'gold'
}

const openFile = (path: string): void => {
  ;(window as any).api.documents.open(path)
}

const confirmDelete = (doc: any): void => {
  itemToDelete.value = doc
  openConfirm({
    title: 'تأكيد إتلاف المستند نهائياً',
    message: `أنت على وشك حذف المستند التالي نهائياً:\n${doc?.name || ''}\n\nتحذير: سيتم حذف الملف الفعلي ولا يمكن التراجع.`,
    color: 'error',
    confirmButtonColor: 'error',
    icon: 'trash-2',
    confirmText: 'موافق، احذف',
    cancelText: 'إلغاء الأمر',
    action: async () => {
      confirmDialog.value.loading = true
      try {
        await handleDelete()
        closeConfirm()
      } finally {
        confirmDialog.value.loading = false
      }
    }
  })
}

const handleDelete = async (): Promise<void> => {
  if (!itemToDelete.value) return
  deleting.value = true
  try {
    await (window as any).api.documents.delete(itemToDelete.value.id)
    showSnackbar('تم إتلاف المستند وإزالته من الأرشيف', 'success')
    await fetchDocs()
  } catch (e: unknown) {
    showSnackbar('فشل في عملية الإتلاف: ' + (e as Error).message, 'error')
  } finally {
    deleting.value = false
    itemToDelete.value = null
  }
}

const formatDate = (dateString: string | undefined): string => {
  if (!isValidDate(dateString)) return '-'
  return new Date(dateString as string).toLocaleDateString('ar-SA')
}

const arabicFilter = (itemTitle: string, queryText: string): boolean => {
  const normalize = (s: string): string =>
    s.replace(/[أإآ]/g, 'ا').replace(/[ة]/g, 'ه').replace(/[ى]/g, 'ي').toLowerCase()
  return normalize(itemTitle || '').includes(normalize(queryText || ''))
}

const showSnackbar = (text: string, color: string): void => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}
</script>

<style scoped>
.leading-relaxed {
  line-height: 1.8;
}
.h-56 {
  height: 56px !important;
}
.h-48 {
  height: 48px !important;
}

.border-gold-alpha {
  border: 1px solid rgba(233, 195, 73, 0.2) !important;
}

.border-dashed {
  border-style: dashed !important;
}

.hover-op-1:hover {
  opacity: 1 !important;
}

.bg-accent-alpha {
  background: rgba(var(--v-theme-accent), 0.1) !important;
}
.bg-black-alpha {
  background: rgba(0, 0, 0, 0.2) !important;
}

/* ---- Mobile responsive ---- */
@media (max-width: 768px) {
  .v-container.pa-6.rtl {
    padding: 12px !important;
  }

  .v-row.mb-8.align-center .v-col:first-child {
    flex: 1 1 auto;
  }

  .v-row.mb-8.align-center .v-col-md-auto {
    flex: 0 0 100%;
    margin-top: 12px;
  }

  .v-row.mb-8.align-center .v-col-md-auto .v-btn {
    width: 100%;
  }

  :deep(.glass-panel-light.pa-4.rounded-xl) {
    width: 48px !important;
    height: 48px !important;
    padding: 12px !important;
  }

  :deep(.glass-panel-light.pa-4.rounded-xl .lucide-icon) {
    width: 24px !important;
    height: 24px !important;
  }

  :deep(.text-h5) {
    font-size: 1.1rem !important;
  }

  :deep(.text-subtitle-1) {
    font-size: 0.85rem !important;
  }

  :deep(.glass-card.mb-8.pa-6) {
    padding: 12px !important;
  }

  :deep(.glass-card.mb-8.pa-6 .v-row .v-col-md-6) {
    flex: 0 0 100% !important;
    max-width: 100% !important;
  }

  :deep(.glass-card.mb-8.pa-6 .v-row .v-col-auto) {
    flex: 0 0 100%;
    margin-top: 8px;
  }

  :deep(.v-row.ma-0.ga-0 .v-col-sm-6) {
    flex: 0 0 50% !important;
    max-width: 50% !important;
  }

  :deep(.v-row.ma-0.ga-0 .pa-3) {
    padding: 6px !important;
  }

  :deep(.v-card.pa-5) {
    padding: 12px !important;
  }

  :deep(.v-card.pa-5 .text-body-2) {
    font-size: 0.8rem !important;
  }

  :deep(.v-card.pa-5 .v-chip) {
    font-size: 0.65rem !important;
  }

  :deep(.v-card.pa-5 .glass-panel-light.pa-3) {
    padding: 8px !important;
  }

  :deep(.v-card.pa-5 .d-flex.align-center.mb-5) {
    margin-bottom: 12px !important;
  }
}
</style>
