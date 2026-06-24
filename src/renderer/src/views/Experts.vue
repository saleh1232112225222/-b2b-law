<template>
  <v-container fluid class="pa-6 rtl">
    <!-- Header -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="contact" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">سجل الخبراء والمستشارين</h1>
            <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
              إدارة بيانات الخبراء الفنيين، المحاسبين القانونيين، والشركاء الهندسيين
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="4" lg="3">
        <v-text-field
          v-model="search"
          placeholder="بحث سريع في السجل..."
          variant="outlined"
          density="comfortable"
          hide-details
          class="glass-input"
          clearable
        >
          <template #prepend-inner>
            <LucideIcon name="search" :size="20" class="text-gold opacity-50" />
          </template>
        </v-text-field>
      </v-col>
      <v-col cols="auto">
        <v-btn
          color="accent"
          size="large"
          class="font-weight-black rounded-lg px-8 premium-lift h-56 premium-btn-gold-gradient"
          @click="openAddDialog"
        >
          <LucideIcon name="user-plus" :size="20" class="me-2" /> إضافة خبير جديد
        </v-btn>
      </v-col>
    </v-row>

    <!-- Experts Table Card -->
    <v-card elevation="0" class="glass-card overflow-hidden glass-card">
      <v-data-table
        :headers="headers"
        :items="safeArray(store.experts)"
        :loading="store.loading"
        :search="store.searchQuery"
        class="bg-transparent premium-table"
        hover
        :items-per-page="12"
      >
        <template #loading>
          <v-skeleton-loader type="table-row@12" class="bg-transparent"></v-skeleton-loader>
        </template>

        <template #[`item.name`]="{ item }">
          <div class="d-flex align-center py-3">
            <div class="glass-panel-light pa-2 rounded-lg me-4 border-gold opacity-10">
              <LucideIcon name="user" :size="18" class="text-accent" />
            </div>
            <span class="font-weight-black text-white text-body-1">{{
              (item as any).name || '-'
            }}</span>
          </div>
        </template>

        <template #[`item.specialty`]="{ item }">
          <v-chip size="small" color="gold" variant="tonal" class="font-weight-black px-3">
            {{ (item as any).specialty || 'تخصص عام' }}
          </v-chip>
        </template>

        <template #[`item.phone`]="{ item }">
          <div class="d-flex align-center">
            <LucideIcon name="phone" :size="14" class="text-gold opacity-40 me-2" />
            <span class="text-body-2 font-weight-black text-white opacity-70 ltr-text">{{
              (item as any).phone || '-'
            }}</span>
          </div>
        </template>

        <template #[`item.case_number`]="{ item }">
          <div v-if="(item as any).case_number" class="d-flex align-center">
            <LucideIcon name="gavel" :size="14" class="text-accent me-2" />
            <span class="text-body-2 font-weight-black text-white">{{
              (item as any).case_number
            }}</span>
          </div>
          <span v-else class="text-caption text-gold opacity-30 font-weight-black"
            >غير مرتبط حالياً</span
          >
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-end ga-2">
            <v-btn
              icon
              variant="text"
              color="accent"
              size="small"
              class="opacity-60 hover-opacity-100 premium-btn-gold-gradient"
              @click="openEditDialog(item as any)"
            >
              <LucideIcon name="pencil" :size="18" />
              <v-tooltip activator="parent" location="top">تعديل ملف الخبير</v-tooltip>
            </v-btn>
            <v-btn
              icon
              variant="text"
              color="error"
              size="small"
              class="opacity-60 hover-opacity-100 premium-btn-gold-gradient"
              @click="confirmDelete(item as any)"
            >
              <LucideIcon name="trash-2" :size="18" />
              <v-tooltip activator="parent" location="top">حذف من السجل</v-tooltip>
            </v-btn>
          </div>
        </template>

        <template #no-data>
          <div class="text-center pa-15">
            <LucideIcon name="users-round" :size="64" class="text-gold opacity-10 mb-4" />
            <div class="text-h6 font-weight-black text-gold opacity-40">لا يوجد خبراء مسجلين</div>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Add/Edit Expert Dialog -->
    <v-dialog
      v-model="showDialog"
      width="90%"
      max-width="800"
      persistent
      scrollable
      transition="dialog-bottom-transition"
    >
      <v-card class="glass-card overflow-hidden rtl glass-card">
        <div class="decorative-top-gold"></div>

        <v-card-title class="pa-8 d-flex align-center">
          <div class="glass-panel-light pa-3 rounded-xl me-4">
            <LucideIcon
              :name="isEditing ? 'user-cog' : 'user-plus'"
              :size="32"
              class="text-accent"
            />
          </div>
          <div>
            <div class="text-h5 font-weight-black text-white">
              {{ isEditing ? 'تعديل ملف الخبير' : 'تسجيل خبير فني جديد' }}
            </div>
            <div class="text-caption text-gold opacity-50 font-weight-black mt-1">
              يرجى ملء كافة البيانات الفنية والمهنية المطلوبة
            </div>
          </div>
          <v-spacer></v-spacer>
          <v-btn
            class="premium-btn-gold-gradient"
            icon
            variant="text"
            color="gold"
            @click="showDialog = false"
          >
            <LucideIcon name="x" :size="24" />
          </v-btn>
        </v-card-title>

        <v-divider class="border-gold opacity-10" />

        <v-card-text class="pa-8">
          <v-form ref="formRef" v-model="formValid" lazy-validation>
            <v-row>
              <v-col cols="12" md="6">
                <label class="mb-2 font-weight-black text-gold">الاسم الكامل للخبير*</label>
                <v-text-field
                  v-model="editItem.name"
                  variant="outlined"
                  class="glass-input"
                  placeholder="د. أحمد المحمدي"
                  :rules="[(v) => !!v || 'الاسم الكامل مطلوب']"
                >
                  <template #prepend-inner>
                    <LucideIcon name="user" :size="20" class="text-gold opacity-40" />
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <label class="mb-2 font-weight-black text-gold">التخصص المهني*</label>
                <v-text-field
                  v-model="editItem.specialty"
                  variant="outlined"
                  class="glass-input"
                  placeholder="محاسب قانوني، خبير هندسي..."
                  :rules="[(v) => !!v || 'التخصص مطلوب للتصنيف']"
                >
                  <template #prepend-inner>
                    <LucideIcon name="award" :size="20" class="text-gold opacity-40" />
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <label class="mb-2 font-weight-black text-gold">رقم التواصل (جوال)*</label>
                <v-text-field
                  v-model="editItem.phone"
                  variant="outlined"
                  class="glass-input"
                  placeholder="05xxxxxxxx"
                  :rules="[(v) => !!v || 'رقم الجوال ضروري للتواصل']"
                >
                  <template #prepend-inner>
                    <LucideIcon name="phone" :size="20" class="text-gold opacity-40" />
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <label class="mb-2 font-weight-black text-gold">البريد الإلكتروني</label>
                <v-text-field
                  v-model="editItem.email"
                  variant="outlined"
                  class="glass-input"
                  placeholder="example@domain.com"
                >
                  <template #prepend-inner>
                    <LucideIcon name="mail" :size="20" class="text-gold opacity-40" />
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="12">
                <label class="mb-2 font-weight-black text-gold">الارتباط بملف قضية حالي</label>
                <v-autocomplete
                  v-model="editItem.case_id"
                  :items="safeArray(casesStore.cases)"
                  item-title="case_number"
                  item-value="id"
                  variant="outlined"
                  class="glass-input"
                  placeholder="ابحث عن رقم القضية..."
                  :custom-filter="arabicFilter"
                  clearable
                >
                  <template #prepend-inner>
                    <LucideIcon name="link" :size="20" class="text-gold opacity-40" />
                  </template>
                </v-autocomplete>
              </v-col>
              <v-col cols="12">
                <label class="mb-2 font-weight-black text-gold">ملاحظات وتقييم أداء</label>
                <v-textarea
                  v-model="editItem.notes"
                  variant="outlined"
                  rows="4"
                  class="glass-input"
                  placeholder="دون هنا انطباعك الفني عن دقة التقارير أو سرعة الإنجاز..."
                >
                  <template #prepend-inner>
                    <LucideIcon name="sticky-note" :size="20" class="text-gold opacity-40" />
                  </template>
                </v-textarea>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-divider class="border-gold opacity-10" />

        <v-card-actions class="pa-8 modal-footer-solid modal-footer-sticky">
          <v-btn
            variant="flat"
            size="large"
            class="px-8 font-weight-black premium-button-highlight action-btn-unified premium-btn-gold-gradient"
            @click="showDialog = false"
          >
            إلغاء الأمر
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
            variant="flat"
            size="large"
            class="px-12 font-weight-black premium-button-highlight action-btn-unified h-56 premium-btn-gold-gradient"
            :disabled="!formValid"
            :loading="saving"
            @click="handleSave"
          >
            {{ isEditing ? 'تحديث البيانات' : 'اعتماد وحفظ السجل' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Notifications -->
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
import { ref, onMounted, onUnmounted } from 'vue'
import { useExpertsStore } from '../stores/experts'
import { useCasesStore } from '../stores/cases'
import { useSearch } from '../composables/useSearch'
import { safeArray } from '../utils/safe'
import LucideIcon from '../components/common/LucideIcon.vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import { useConfirmDialog } from '../composables/useConfirmDialog'

const store = useExpertsStore()
const casesStore = useCasesStore()

const showDialog = ref(false)
const isEditing = ref(false)
const formValid = ref(false)
const formRef = ref<any>(null)
const saving = ref(false)

const deleting = ref(false)
const itemToDelete = ref<Expert | null>(null)

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const { confirmDialog, openConfirm, closeConfirm } = useConfirmDialog()

const { search } = useSearch((val) => {
  store.searchQuery = val || ''
}, store.searchQuery)

onUnmounted(() => {
  store.searchQuery = ''
  if (search) search.value = ''
})

const headers = [
  { title: 'الخبير المختص', key: 'name', align: 'start' as const },
  { title: 'التخصص الفني', key: 'specialty', align: 'start' as const, width: '180px' },
  { title: 'التواصل', key: 'phone', align: 'start' as const, width: '180px' },
  { title: 'القضية المرتبطة', key: 'case_number', align: 'start' as const, width: '200px' },
  { title: 'الإجراءات', key: 'actions', sortable: false, align: 'end' as const, width: '120px' }
]

interface Expert {
  id?: string
  name: string
  specialty: string
  phone: string
  email: string
  case_id: string | null
  notes: string
}

const defaultItem: Expert = {
  name: '',
  specialty: '',
  phone: '',
  email: '',
  case_id: null,
  notes: ''
}

const editItem = ref<Expert>({ ...defaultItem })

onMounted(async (): Promise<void> => {
  await Promise.all([store.fetchExperts(), casesStore.fetchAllCases()])
})

const openAddDialog = (): void => {
  isEditing.value = false
  editItem.value = { ...defaultItem }
  showDialog.value = true
}

const openEditDialog = (item: Expert): void => {
  isEditing.value = true
  editItem.value = { ...item }
  showDialog.value = true
}

const arabicFilter = (itemTitle: string, queryText: string): boolean => {
  const normalize = (s: string): string =>
    s.replace(/[أإآ]/g, 'ا').replace(/[ة]/g, 'ه').replace(/[ى]/g, 'ي').toLowerCase()
  return normalize(itemTitle || '').includes(normalize(queryText || ''))
}

const executeSave = async (): Promise<void> => {
  if (!formRef.value) return
  const { valid } = await formRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    if (isEditing.value) {
      await store.updateExpert(editItem.value.id!, { ...editItem.value })
      showSnackbar('تم تحديث بيانات المعالج بنجاح', 'success')
    } else {
      await store.addExpert({ ...editItem.value })
      showSnackbar('تم تسجيل بيانات الخبير بنجاح', 'success')
    }
    showDialog.value = false
  } catch (e: unknown) {
    showSnackbar('خطأ في أرشفة البيانات: ' + (e as Error).message, 'error')
  } finally {
    saving.value = false
  }
}

const handleSave = async (): Promise<void> => {
  openConfirm({
    title: isEditing.value ? 'تأكيد تحديث بيانات الخبير' : 'تأكيد إضافة خبير جديد',
    message: isEditing.value
      ? 'هل أنت متأكد من رغبتك في حفظ التعديلات على ملف الخبير؟'
      : 'هل أنت متأكد من رغبتك في اعتماد وإضافة هذا الخبير إلى النظام؟',
    color: 'success',
    confirmButtonColor: 'accent',
    icon: 'check-circle',
    confirmText: 'نعم، احفظ',
    cancelText: 'تراجع',
    action: async () => {
      confirmDialog.value.loading = true
      try {
        await executeSave()
        closeConfirm()
      } finally {
        confirmDialog.value.loading = false
      }
    }
  })
}

const confirmDelete = (item: Expert): void => {
  itemToDelete.value = item
  openConfirm({
    title: 'تأكيد حذف الخبير نهائياً',
    message: `هل أنت متأكد من حذف سجل الخبير التالي نهائياً؟\n${item?.name || ''}\n\nتحذير: لا يمكن التراجع عن هذا الإجراء.`,
    color: 'error',
    confirmButtonColor: 'error',
    icon: 'alert-triangle',
    confirmText: 'نعم، احذف نهائياً',
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
  if (!itemToDelete.value || !itemToDelete.value.id) return
  deleting.value = true
  try {
    await store.deleteExpert(itemToDelete.value.id)
    showSnackbar('تم إزالة بيانات الخبير من السجل النشط', 'success')
  } catch (e: unknown) {
    showSnackbar('خطأ في عملية الإزالة: ' + (e as Error).message, 'error')
  } finally {
    deleting.value = false
    itemToDelete.value = null
  }
}

const showSnackbar = (text: string, color: string): void => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}
</script>

<style scoped>
.premium-table :deep(th) {
  background: rgba(233, 195, 73, 0.05) !important;
  color: #e9c349 !important;
  font-weight: 900 !important;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 0.75rem !important;
  border-bottom: 1px solid rgba(233, 195, 73, 0.2) !important;
}

.premium-table :deep(td) {
  border-bottom: 1px solid rgba(233, 195, 73, 0.05) !important;
}

.decorative-top-gold {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(to right, transparent, #e9c349, transparent);
  opacity: 0.5;
}

.h-56 {
  height: 56px !important;
}

.ltr-text {
  direction: ltr;
}

.hover-opacity-100:hover {
  opacity: 1 !important;
}

.premium-button-highlight {
  background: #ffffff !important;
  color: #000000 !important;
  border: 1px solid rgba(233, 195, 73, 0.6) !important;
  border-radius: 12px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
  transition: all 0.3s ease !important;
}

.premium-button-highlight:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15) !important;
  border-color: rgba(233, 195, 73, 0.8) !important;
}

.premium-button-highlight.v-btn--disabled {
  background: #f5f5f5 !important;
  color: #9e9e9e !important;
  border-color: #e0e0e0 !important;
  opacity: 1 !important;
}

.action-btn-unified {
  min-width: 180px !important;
}

.modal-footer-solid {
  background: #ffffff !important;
  opacity: 1 !important;
  border-top: 1px solid rgba(233, 195, 73, 0.2) !important;
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
