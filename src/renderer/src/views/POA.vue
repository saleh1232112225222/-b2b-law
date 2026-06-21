<template>
  <v-container fluid class="pa-6 rtl">
    <!-- Header -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="book-user" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">إدارة الوكالات الشرعية</h1>
            <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
              التوثيق الرقمي للوكالات الصادرة من كتابة العدل والمنصات المعتمدة
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="auto">
        <v-btn
          color="accent"
          size="large"
          class="font-weight-black rounded-lg px-8 premium-lift h-100"
          @click="openAddDialog"
        >
          <LucideIcon name="plus" :size="20" class="me-3" /> تسجيل وكالة جديدة
        </v-btn>
      </v-col>
    </v-row>

    <!-- Agencies Table -->
    <v-card elevation="0" class="glass-card overflow-hidden min-h-500">
      <v-data-table
        :headers="headers"
        :items="safeArray(store.agencies)"
        :loading="store.loading"
        class="bg-transparent poa-table"
        fixed-header
        height="calc(100vh - 300px)"
        hover
        density="comfortable"
        :items-per-page="12"
        items-per-page-text="عدد الوكالات لكل صفحة:"
        no-data-text="لا توجد وكالات مسجلة حالياً"
      >
        <!-- Skeleton Loader -->
        <template #loading>
          <v-skeleton-loader type="table-row@12" class="bg-transparent"></v-skeleton-loader>
        </template>

        <template #[`header.agency_number`]="{ column }">
          <span class="font-weight-black text-gold opacity-70">{{ column.title }}</span>
        </template>
        <template #[`header.client_name`]="{ column }">
          <span class="font-weight-black text-gold opacity-70">{{ column.title }}</span>
        </template>
        <template #[`header.date`]="{ column }">
          <span class="font-weight-black text-gold opacity-70">{{ column.title }}</span>
        </template>
        <template #[`header.expiry_date`]="{ column }">
          <span class="font-weight-black text-gold opacity-70">{{ column.title }}</span>
        </template>
        <template #[`header.court`]="{ column }">
          <span class="font-weight-black text-gold opacity-70">{{ column.title }}</span>
        </template>
        <template #[`header.actions`]="{ column }">
          <span class="font-weight-black text-gold opacity-70">{{ column.title }}</span>
        </template>

        <template #[`item.agency_number`]="{ item }">
          <div class="d-flex align-center justify-center">
            <v-btn
              variant="text"
              color="white"
              class="px-0 font-weight-black text-body-2 ltr-text hover-gold"
              @click="openEditDialog(item)"
            >
              {{ item.agency_number }}
            </v-btn>
          </div>
        </template>

        <template #[`item.client_name`]="{ item }">
          <v-btn
            v-if="item.client_id"
            variant="text"
            color="white"
            class="px-0 font-weight-black text-body-2 opacity-80 hover-gold"
            :to="'/clients/' + item.client_id"
            density="compact"
          >
            {{ item.client_name || '-' }}
          </v-btn>
          <div v-else class="font-weight-bold text-white opacity-40">
            {{ item.client_name || '-' }}
          </div>
        </template>

        <template #[`item.date`]="{ item }">
          <div v-if="isValidDate(String(item.date))" class="d-flex flex-column align-center">
            <div class="text-caption font-weight-black text-white">
              {{ formatDate(String(item.date)) }} مـ
            </div>
            <v-chip
              size="x-small"
              color="accent"
              variant="flat"
              class="mt-1 font-weight-black rounded-md"
            >
              {{ formatHijri(String(item.date)) }} هـ
            </v-chip>
          </div>
          <span v-else class="text-caption text-gold opacity-30 italic">---</span>
        </template>

        <template #[`item.expiry_date`]="{ item }">
          <div v-if="isValidDate(String(item.expiry_date))" class="d-flex flex-column align-center">
            <div class="text-caption font-weight-black text-white">
              {{ formatDate(String(item.expiry_date)) }} مـ
            </div>
            <v-chip
              size="x-small"
              color="warning"
              variant="flat"
              class="mt-1 font-weight-black rounded-md"
            >
              {{ formatHijri(String(item.expiry_date)) }} هـ
            </v-chip>
          </div>
          <span v-else class="text-caption text-gold opacity-30 italic">---</span>
        </template>

        <template #[`item.court`]="{ item }">
          <div class="d-flex align-center justify-center">
            <LucideIcon name="landmark" :size="14" class="text-gold opacity-50 me-2" />
            <span class="text-caption font-weight-bold text-white opacity-70">{{
              item.court || 'كتابة عدل عامة'
            }}</span>
          </div>
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-center gap-2">
            <v-btn
              icon
              variant="text"
              color="accent"
              size="small"
              class="premium-hover opacity-70"
              @click="openPreviewDialog(item)"
            >
              <LucideIcon name="eye" :size="18" />
              <v-tooltip activator="parent" location="top">معاينة الوكالة</v-tooltip>
            </v-btn>
            <v-btn
              icon
              variant="text"
              color="gold"
              size="small"
              class="premium-hover opacity-70"
              @click="openEditDialog(item)"
            >
              <LucideIcon name="edit-3" :size="18" />
              <v-tooltip activator="parent" location="top">تعديل الوكالة</v-tooltip>
            </v-btn>
            <v-btn
              icon
              variant="text"
              color="error"
              size="small"
              class="premium-hover opacity-70"
              @click="confirmDelete(item)"
            >
              <LucideIcon name="trash-2" :size="18" />
              <v-tooltip activator="parent" location="top">حذف سجل الوكالة</v-tooltip>
            </v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Preview Dialog -->
    <v-dialog v-model="previewDialog" width="90%" max-width="800" scrollable>
      <v-card class="bg-grey-lighten-4 overflow-hidden">
        <div class="bg-white d-flex align-center py-5 px-8 border-b">
          <div class="bg-grey-lighten-2 pa-2 rounded-lg me-4">
            <LucideIcon name="eye" :size="24" class="text-grey-darken-3" />
          </div>
          <span class="text-h5 font-weight-black text-grey-darken-4">معاينة بيانات الوكالة</span>
          <v-spacer></v-spacer>
          <v-btn variant="text" color="grey-darken-3" icon @click="previewDialog = false">
            <LucideIcon name="x" :size="24" />
          </v-btn>
        </div>

        <v-card-text class="pa-8 bg-grey-lighten-4 modal-scrollable">
          <v-row dense>
            <v-col cols="12" md="6">
              <div class="detail-row mb-6">
                <span class="text-tiny text-grey-darken-1 mb-1">الرقم المرجعي الرسمي</span>
                <span class="text-h6 font-weight-black text-black d-block ltr-text">{{
                  previewItem?.agency_number || '—'
                }}</span>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="detail-row mb-6">
                <span class="text-tiny text-grey-darken-1 mb-1">الموكل صاحب الوكالة</span>
                <span class="text-h6 font-weight-black text-black d-block">{{
                  previewItem?.client_name || '—'
                }}</span>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="detail-row mb-6">
                <span class="text-tiny text-grey-darken-1 mb-1">تاريخ الاعتماد</span>
                <div class="d-flex align-center">
                  <span class="text-body-1 text-black font-weight-black"
                    >{{ previewItem?.date || '—' }} مـ</span
                  >
                  <v-chip
                    v-if="previewItem?.date"
                    size="x-small"
                    color="grey"
                    variant="tonal"
                    class="ms-3 font-weight-black"
                  >
                    {{ formatHijri(String(previewItem?.date)) }} هـ
                  </v-chip>
                </div>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="detail-row mb-6">
                <span class="text-tiny text-grey-darken-1 mb-1">تاريخ الانتهاء</span>
                <div class="d-flex align-center">
                  <span class="text-body-1 text-black font-weight-black"
                    >{{ previewItem?.expiry_date || '—' }} مـ</span
                  >
                  <v-chip
                    v-if="previewItem?.expiry_date"
                    size="x-small"
                    color="warning"
                    variant="tonal"
                    class="ms-3 font-weight-black"
                  >
                    {{ formatHijri(String(previewItem?.expiry_date)) }} هـ
                  </v-chip>
                </div>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="detail-row mb-6">
                <span class="text-tiny text-grey-darken-1 mb-1">مصدر الوكالة / جهة الإصدار</span>
                <span class="text-body-1 text-black font-weight-black d-block">{{
                  previewItem?.court || '—'
                }}</span>
              </div>
            </v-col>
            <v-col cols="12">
              <div class="detail-row mb-2">
                <span class="text-tiny text-grey-darken-1 mb-2"
                  >نطاق الوكالة / الصلاحيات الممنوحة</span
                >
                <div class="bg-white pa-4 rounded-lg text-black leading-relaxed shadow-sm">
                  {{ previewItem?.notes || 'لا توجد ملاحظات مسجلة لنطاق هذه الوكالة' }}
                </div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider class="border-grey-lighten-2"></v-divider>
        <v-card-actions class="pa-8 bg-grey-lighten-3">
          <v-btn
            variant="text"
            color="grey-darken-3"
            class="px-8 font-weight-black"
            @click="previewDialog = false"
            >إغلاق</v-btn
          >
          <v-spacer></v-spacer>
          <v-btn
            v-if="previewItem?.client_id"
            color="grey-darken-3"
            variant="tonal"
            class="px-8 font-weight-black rounded-lg me-3"
            :to="'/clients/' + String(previewItem?.client_id)"
          >
            <LucideIcon name="user" :size="18" class="me-2" /> ملف الموكل
          </v-btn>
          <v-btn
            color="accent"
            variant="flat"
            size="large"
            class="px-12 font-weight-black rounded-lg"
            @click="handleEditFromPreview"
          >
            <LucideIcon name="edit-3" :size="18" class="me-2" /> تعديل البيانات
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add/Edit Agency Dialog -->
    <v-dialog v-model="showDialog" width="90%" max-width="800" persistent scrollable>
      <v-card class="glass-card overflow-hidden">
        <div class="glass-panel d-flex align-center py-5 px-8 border-b">
          <div class="glass-panel-light pa-2 rounded-lg me-4">
            <LucideIcon :name="isEditing ? 'edit-3' : 'card-plus'" :size="24" class="text-accent" />
          </div>
          <span class="text-h5 font-weight-black text-gold">
            {{ isEditing ? 'تعديل بيانات الوكالة الشرعية' : 'تسجيل وكالة شرعية جديدة' }}
          </span>
          <v-spacer></v-spacer>
          <v-btn variant="text" color="gold" icon @click="showDialog = false">
            <LucideIcon name="x" :size="24" />
          </v-btn>
        </div>

        <v-card-text class="pa-8 bg-white modal-scrollable poa-form">
          <v-form ref="formRef" v-model="formValid" lazy-validation>
            <v-row dense>
              <v-col cols="12">
                <v-label class="mb-2 font-weight-black text-grey-darken-3"
                  >الموكل صاحب الوكالة*</v-label
                >
                <v-autocomplete
                  v-model="editItem.client_id"
                  :items="safeArray(clientsStore.clients)"
                  item-title="name"
                  item-value="id"
                  placeholder="ابحث عن اسم الموكل..."
                  variant="outlined"
                  class="glass-input"
                  :rules="[(v) => !!v || 'تعيين الموكل ضروري لإتمام التسجيل']"
                  no-data-text="لا يوجد موكلون مسجلون"
                  required
                >
                  <template #prepend-inner>
                    <LucideIcon name="user-cog" :size="20" class="text-gold opacity-50" />
                  </template>
                </v-autocomplete>
              </v-col>
              <v-col cols="12" md="4">
                <v-label class="mb-2 font-weight-black text-grey-darken-3"
                  >رقم الوكالة الرسمي*</v-label
                >
                <v-text-field
                  v-model="editItem.agency_number"
                  placeholder="مثال: 44123456"
                  variant="outlined"
                  class="glass-input"
                  :rules="[(v) => !!v || 'رقم الوكالة مطلوب للتحقق النظامي']"
                  required
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-label class="mb-2 font-weight-black text-grey-darken-3"
                  >تاريخ صدور الوكالة*</v-label
                >
                <DualDatePicker v-model="editItem.date" />
              </v-col>
              <v-col cols="12" md="4">
                <v-label class="mb-2 font-weight-black text-grey-darken-3"
                  >تاريخ انتهاء الوكالة</v-label
                >
                <DualDatePicker v-model="editItem.expiry_date" />
              </v-col>
              <v-col cols="12">
                <v-label class="mb-2 font-weight-black text-grey-darken-3"
                  >جهة الإصدار (كتابة عدل / منصة ناجز)</v-label
                >
                <v-text-field
                  v-model="editItem.court"
                  placeholder="مثال: كتابة العدل الأولى بالرياض"
                  variant="outlined"
                  class="glass-input"
                >
                  <template #prepend-inner>
                    <LucideIcon name="landmark" :size="20" class="text-gold opacity-50" />
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="12">
                <v-label class="mb-2 font-weight-black text-grey-darken-3"
                  >نطاق الوكالة / الصلاحيات الممنوحة</v-label
                >
                <v-textarea
                  v-model="editItem.notes"
                  placeholder="دون هنا الصلاحيات الأساسية (المرافعة، الحجز، قبض الثمن...)"
                  variant="outlined"
                  rows="3"
                  class="glass-input"
                >
                  <template #prepend-inner>
                    <LucideIcon name="sticky-note" :size="20" class="text-gold opacity-50" />
                  </template>
                </v-textarea>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-divider class="border-gold opacity-10"></v-divider>
        <v-card-actions class="pa-8 modal-footer-solid modal-footer-sticky">
          <v-btn
            variant="flat"
            size="large"
            class="px-8 font-weight-black premium-button-highlight action-btn-unified"
            @click="showDialog = false"
            >إلغاء</v-btn
          >
          <v-spacer></v-spacer>
          <v-btn
            variant="flat"
            size="large"
            class="px-12 font-weight-black premium-button-highlight action-btn-unified h-56"
            :disabled="!formValid"
            :loading="saving"
            @click="handleSave"
          >
            {{ isEditing ? 'تحديث السجل' : 'اعتماد الوكالة' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
import { ref, onMounted } from 'vue'
import { useAgenciesStore } from '../stores/agencies'
import { useClientsStore } from '../stores/clients'
import { Agency } from '../types'
import DualDatePicker from '../components/DualDatePicker.vue'
import { safeArray, isValidDate, safeLength } from '../utils/safe'
import { convertToHijri } from '../utils/hijri'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import { useConfirmDialog } from '../composables/useConfirmDialog'
import LucideIcon from '../components/common/LucideIcon.vue'

const store = useAgenciesStore()
const clientsStore = useClientsStore()

const showDialog = ref(false)
const isEditing = ref(false)
const formValid = ref(false)
const formRef = ref<any>(null)
const saving = ref(false)

const deleting = ref(false)
const itemToDelete = ref<Agency | null>(null)

const previewDialog = ref(false)
const previewItem = ref<Agency | null>(null)

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const { confirmDialog, openConfirm, closeConfirm } = useConfirmDialog()

const headers = [
  { title: 'الرقم المرجعي للوكالة', key: 'agency_number', align: 'center' as const },
  { title: 'اسم الموكل (الموكِّل)', key: 'client_name', align: 'center' as const },
  { title: 'تاريخ الاعتماد', key: 'date', align: 'center' as const, width: '150px' },
  { title: 'تاريخ الانتهاء', key: 'expiry_date', align: 'center' as const, width: '150px' },
  { title: 'مصدر الوكالة', key: 'court', align: 'center' as const, width: '180px' },
  { title: 'إجراءات', key: 'actions', sortable: false, align: 'center' as const, width: '160px' }
]

const defaultItem: Partial<Agency> = {
  client_id: '',
  agency_number: '',
  date: new Date().toISOString().split('T')[0],
  expiry_date: '',
  court: '',
  notes: ''
}

const editItem = ref<Partial<Agency>>({ ...defaultItem })

onMounted(async (): Promise<void> => {
  await Promise.all([store.fetchAgencies(), clientsStore.fetchClients()])
})

const openAddDialog = (): void => {
  if (safeLength(clientsStore.clients) === 0) {
    showSnackbar('يرجى تسجيل موكل واحد على الأقل قبل إضافة وكالة قانونية', 'error')
    return
  }
  isEditing.value = false
  editItem.value = { ...defaultItem }
  showDialog.value = true
}

const openEditDialog = (item: Agency): void => {
  isEditing.value = true
  editItem.value = { ...item }
  showDialog.value = true
}

const openPreviewDialog = (item: Agency): void => {
  previewItem.value = item
  previewDialog.value = true
}

const handleEditFromPreview = (): void => {
  if (previewItem.value) {
    const item = { ...previewItem.value }
    previewDialog.value = false
    openEditDialog(item)
  }
}

const executeSave = async (): Promise<void> => {
  if (!formRef.value) return
  const { valid } = await formRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const dataToSave = JSON.parse(JSON.stringify(editItem.value))
    dataToSave.expiry_date = dataToSave.expiry_date || ''
    if (isEditing.value && dataToSave.id) {
      await store.updateAgency(dataToSave.id, dataToSave)
      showSnackbar('تم تحديث بيانات الوكالة بنجاح', 'success')
    } else {
      await store.addAgency(dataToSave)
      showSnackbar('تم توثيق الوكالة الجديدة بملف الموكل', 'success')
    }
    showDialog.value = false
  } catch (e: unknown) {
    showSnackbar('تعذر أرشفة الوكالة: ' + (e as Error).message, 'error')
  } finally {
    saving.value = false
  }
}

const handleSave = async (): Promise<void> => {
  openConfirm({
    title: isEditing.value ? 'تأكيد تحديث الوكالة' : 'تأكيد توثيق الوكالة',
    message: isEditing.value
      ? 'هل أنت متأكد من رغبتك في حفظ التعديلات على سجل الوكالة؟'
      : 'هل أنت متأكد من رغبتك في اعتماد وتوثيق هذه الوكالة ضمن ملف الموكل؟',
    color: 'success',
    confirmButtonColor: 'success',
    icon: 'check',
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

const confirmDelete = (item: Agency): void => {
  itemToDelete.value = item
  openConfirm({
    title: 'تأكيد حذف الوكالة نهائياً',
    message: `هل أنت متأكد من إبطال وحذف الوكالة رقم:\n${item.agency_number || ''}\n\nتحذير: لا يمكن التراجع عن هذا الإجراء.`,
    color: 'error',
    confirmButtonColor: 'error',
    icon: 'trash-2',
    confirmText: 'موافق',
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
    await store.deleteAgency(itemToDelete.value.id)
    showSnackbar('تم إبطال وإزالة الوكالة من سجل الحماية بنجاح', 'success')
  } catch (e: unknown) {
    showSnackbar('فشل في إزالة السجل: ' + (e as Error).message, 'error')
  } finally {
    deleting.value = false
    itemToDelete.value = null
  }
}

const formatDate = (dateString: string | undefined): string => {
  if (!isValidDate(dateString)) return '-'
  return new Date(dateString as string).toLocaleDateString('ar-SA')
}

const formatHijri = (date: string): string => {
  if (!isValidDate(date)) return '-'
  return convertToHijri(new Date(date))
}

const showSnackbar = (text: string, color: string = 'success'): void => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}
</script>

<style scoped>
.poa-table :deep(th) {
  background: rgba(233, 195, 73, 0.05) !important;
  color: #e9c349 !important;
  font-weight: 900 !important;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 0.75rem !important;
  border-bottom: 1px solid rgba(233, 195, 73, 0.2) !important;
}

.poa-table :deep(td) {
  border-bottom: 1px solid rgba(233, 195, 73, 0.05) !important;
}

.hover-gold:hover {
  color: #e9c349 !important;
}

.modal-scrollable {
  max-height: calc(100vh - 280px);
  overflow-y: auto;
}

.min-h-500 {
  min-height: 500px;
}

.leading-relaxed {
  line-height: 1.6;
}

.ltr-text {
  direction: ltr;
  display: inline-block;
}

.detail-row {
  display: flex;
  flex-direction: column;
}

.poa-form :deep(.glass-input .v-field__outline) {
  --v-field-border-opacity: 1 !important;
  color: #000000 !important;
}

.poa-form :deep(.glass-input .v-field__outline__start),
.poa-form :deep(.glass-input .v-field__outline__notch),
.poa-form :deep(.glass-input .v-field__outline__end) {
  border-color: #000000 !important;
}

.poa-form :deep(.glass-input input),
.poa-form :deep(.glass-input .v-field__input),
.poa-form :deep(.glass-input .v-select__selection-text) {
  color: #000000 !important;
  font-weight: 800;
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

.modal-footer-solid {
  background: #ffffff !important;
  opacity: 1 !important;
  border-top: 1px solid rgba(233, 195, 73, 0.2) !important;
}

.action-btn-unified {
  min-width: 180px !important;
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
