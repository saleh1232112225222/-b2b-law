<template>
  <v-container fluid class="pa-6 rtl">
    <!-- Header -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="message-square" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">سجل المراسلات والتواصل</h1>
            <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
              التوثيق المركزي لجميع الاتصالات مع الموكلين والجهات القضائية
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field
          v-model="search"
          placeholder="بحث في أرشيف المراسلات..."
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
      <v-col cols="auto">
        <v-btn
          color="accent"
          size="large"
          class="font-weight-black rounded-xl px-8 premium-lift h-56 premium-btn-gold-gradient"
          @click="openAddDialog"
        >
          <LucideIcon name="plus-circle" :size="20" class="me-2" /> إضافة سجل تواصل
        </v-btn>
      </v-col>
    </v-row>

    <!-- Mobile Card View -->
    <MobileCardList
      v-if="isMobile"
      :items="communicationCards"
      :loading="store.loading"
      title-field="subject"
      subtitle-field="type"
      :info-fields="[
        { key: 'client_name', label: 'الموكل' },
        { key: 'case_number', label: 'القضية' },
        { key: 'dateLabel', label: 'التاريخ' }
      ]"
      default-icon="mdi-message-text"
      empty-text="لا توجد سجلات تواصل"
      can-add
      add-label="إضافة سجل تواصل"
      @item-click="openEditDialog"
      @add="openAddDialog"
    />

    <!-- Communications Table -->
    <v-card v-else elevation="0" class="glass-card border-gold-alpha overflow-hidden glass-card">
      <v-data-table
        :headers="headers"
        :items="safeArray(store.communications)"
        :loading="store.loading"
        :search="store.searchQuery"
        class="bg-transparent premium-table"
        hover
        :items-per-page="12"
        items-per-page-text="عدد المراسلات لكل صفحة:"
      >
        <template #loading>
          <v-skeleton-loader type="table-row-divider@10" class="bg-transparent"></v-skeleton-loader>
        </template>

        <template #[`item.type`]="{ item }">
          <v-chip
            :color="getTypeColor(String((item as any).type))"
            size="x-small"
            variant="flat"
            class="font-weight-black px-3"
          >
            <LucideIcon :name="getTypeIcon(String((item as any).type))" :size="12" class="me-2" />
            {{ (item as any).type || '-' }}
          </v-chip>
        </template>

        <template #[`item.date`]="{ item }">
          <div class="text-caption font-weight-black text-white opacity-80">
            {{ formatDate(String((item as any).date)) }}
          </div>
          <div class="text-tiny text-gold opacity-40 font-weight-black">
            {{ formatHijri(String((item as any).date)) }} هـ
          </div>
        </template>

        <template #[`item.subject`]="{ item }">
          <div
            class="font-weight-black text-body-2 text-white text-truncate"
            style="max-width: 300px"
          >
            {{ (item as any).subject || '-' }}
          </div>
        </template>

        <template #[`item.case_number`]="{ item }">
          <v-chip
            v-if="(item as any).case_number"
            size="x-small"
            color="accent"
            variant="tonal"
            class="font-weight-black border-gold-alpha"
          >
            {{ (item as any).case_number }}
          </v-chip>
          <span v-else class="text-tiny text-gold opacity-20 font-weight-black">غير مرتبط</span>
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-end ga-1">
            <v-btn
              icon
              variant="text"
              color="gold"
              size="small"
              class="rounded-lg opacity-40 hover-op-1 premium-btn-gold-gradient"
              @click="openEditDialog(item as any)"
            >
              <LucideIcon name="pencil" :size="16" />
            </v-btn>
            <v-btn
              icon
              variant="text"
              color="error"
              size="small"
              class="rounded-lg opacity-40 hover-op-1 premium-btn-gold-gradient"
              @click="confirmDelete(item as any)"
            >
              <LucideIcon name="trash-2" :size="16" />
            </v-btn>
          </div>
        </template>

        <template #no-data>
          <div class="text-center py-20">
            <LucideIcon name="message-square-off" :size="80" class="text-gold opacity-10 mb-4" />
            <div class="text-h6 font-weight-black text-gold opacity-30">لا توجد سجلات تواصل</div>
            <p class="text-body-2 text-white opacity-20 font-weight-black mt-2">
              ابدأ بتوثيق أول عملية تواصل مع الموكل لضمان سير القضية.
            </p>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Add/Edit Communication Dialog -->
    <v-dialog v-model="showDialog" width="90%" max-width="800" persistent scrollable>
      <v-card class="glass-card overflow-hidden glass-card">
        <v-card-title class="pa-6 border-b border-gold opacity-10 d-flex align-center">
          <div class="bg-accent-alpha pa-2 rounded-lg me-3">
            <LucideIcon
              :name="isEditing ? 'message-square' : 'plus-circle'"
              :size="20"
              class="text-gold"
            />
          </div>
          <span class="text-h6 font-weight-black text-white">
            {{ isEditing ? 'تعديل بروتوكول التواصل' : 'توثيق سجل تواصل جديد' }}
          </span>
          <v-spacer />
          <v-btn
            icon
            variant="text"
            size="small"
            class="rounded-lg premium-btn-gold-gradient"
            @click="showDialog = false"
          >
            <LucideIcon name="x" :size="20" class="text-white" />
          </v-btn>
        </v-card-title>

        <v-card-text class="pa-8">
          <v-form ref="formRef" v-model="formValid" lazy-validation>
            <v-row dense>
              <v-col cols="12" md="6">
                <v-select
                  v-model="editItem.type"
                  :items="[
                    'اتصال هاتفي',
                    'ايميل',
                    'خطاب رسمي',
                    'رسالة واتساب',
                    'اجتماع حضوري',
                    'مراجعة جهة حكومية'
                  ]"
                  label="وسيلة التواصل القانوني*"
                  variant="outlined"
                  class="glass-input"
                  placeholder="اختر وسيلة التواصل"
                  :rules="[(v) => !!v || 'نوع التواصل مطلوب للتوثيق']"
                  required
                >
                  <template #prepend-inner>
                    <LucideIcon name="network" :size="18" class="text-gold opacity-40" />
                  </template>
                </v-select>
              </v-col>
              <v-col cols="12" md="6">
                <DualDatePicker v-model="editItem.date" label="تاريخ الواقعة (هـ/م)*" />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="editItem.subject"
                  label="موضوع التواصل / خلاصة الغرض*"
                  variant="outlined"
                  class="glass-input"
                  placeholder="مثال: تبليغ بموعد جلسة، استلام مستندات..."
                  :rules="[(v) => !!v || 'الموضوع أساسي للبحث والفرز']"
                  required
                >
                  <template #prepend-inner>
                    <LucideIcon name="info" :size="18" class="text-gold opacity-40" />
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-autocomplete
                  v-model="editItem.client_id"
                  :items="safeArray(clientsStore.clients)"
                  item-title="name"
                  item-value="id"
                  label="الموكل المعني"
                  variant="outlined"
                  class="glass-input"
                  no-data-text="لا يوجد موكلون مسجلون"
                  placeholder="ابحث عن موكل..."
                  clearable
                >
                  <template #prepend-inner>
                    <LucideIcon name="user" :size="18" class="text-gold opacity-40" />
                  </template>
                </v-autocomplete>
              </v-col>
              <v-col cols="12" md="6">
                <v-autocomplete
                  v-model="editItem.case_id"
                  :items="safeArray(caseOptions)"
                  item-title="display"
                  item-value="id"
                  label="مرتبط بالقضية رقم"
                  variant="outlined"
                  class="glass-input"
                  no-data-text="لا توجد قضايا نشطة"
                  placeholder="ابحث عن قضية..."
                  clearable
                >
                  <template #prepend-inner>
                    <LucideIcon name="gavel" :size="18" class="text-gold opacity-40" />
                  </template>
                </v-autocomplete>
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="editItem.notes"
                  label="تفاصيل المحادثة / الإجراءات المتخذة"
                  variant="outlined"
                  rows="4"
                  class="glass-input"
                  placeholder="دون هنا تفاصيل المحادثة أو النتائج التي تم التوصل إليها..."
                >
                  <template #prepend-inner>
                    <LucideIcon name="text" :size="18" class="text-gold opacity-40" />
                  </template>
                </v-textarea>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-divider class="border-gold opacity-10" />
        <v-card-actions class="pa-6 bg-black-alpha">
          <v-btn
            variant="text"
            color="white"
            class="px-6 font-weight-black premium-btn-gold-gradient"
            @click="showDialog = false"
            >إلغاء</v-btn
          >
          <v-spacer />
          <v-btn
            color="accent"
            variant="elevated"
            class="px-10 rounded-lg font-weight-black premium-lift h-48 premium-btn-gold-gradient"
            :disabled="!formValid"
            :loading="saving"
            @click="handleSave"
          >
            {{ isEditing ? 'تحديث السجل' : 'اعتماد السجل' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Feedback -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" rounded="lg" elevation="24">
      <div class="d-flex align-center font-weight-black">
        <LucideIcon
          :name="snackbarColor === 'success' ? 'check-circle' : 'alert-circle'"
          :size="18"
          class="me-3"
        />
        {{ snackbarText }}
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
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useCommunicationsStore } from '../stores/communications'
import { useClientsStore } from '../stores/clients'
import { useCasesStore } from '../stores/cases'
import { useSearch } from '../composables/useSearch'
import DualDatePicker from '../components/DualDatePicker.vue'
import { safeArray, isValidDate } from '../utils/safe'
import { convertToHijri } from '../utils/hijri'
import LucideIcon from '../components/common/LucideIcon.vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import { useConfirmDialog } from '../composables/useConfirmDialog'
import { useMobileLayout } from '../composables/useMobileLayout'
import MobileCardList from '../components/mobile/MobileCardList.vue'

const store = useCommunicationsStore()
const clientsStore = useClientsStore()
const casesStore = useCasesStore()
const { isMobile } = useMobileLayout()

const communicationCards = computed(() =>
  safeArray(store.communications).map((c: any) => ({
    ...c,
    dateLabel: formatDate(String(c.date))
  }))
)

const caseOptions = computed((): any[] => {
  return safeArray(casesStore.cases).map((c) => ({
    ...c,
    display: `${c.case_number} - ${c.client_name || 'بدون موكل'}`
  }))
})

const showDialog = ref(false)
const isEditing = ref(false)
const formValid = ref(false)
const formRef = ref<any>(null)
const saving = ref(false)

const itemToDelete = ref<any>(null)

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
  { title: 'بروتوكول التواصل', key: 'type', align: 'start' as const, width: '180px' },
  { title: 'موضوع السجل', key: 'subject', align: 'start' as const },
  { title: 'الموكل المالي/القانوني', key: 'client_name', align: 'start' as const },
  { title: 'ملف القضية', key: 'case_number', align: 'center' as const },
  { title: 'توقيت السجل', key: 'date', align: 'center' as const },
  { title: 'تحكم', key: 'actions', sortable: false, align: 'end' as const }
]

interface Communication {
  id?: string
  type: string
  date: string
  subject: string
  client_id: string | null
  case_id: string | null
  notes: string
  client_name?: string
  case_number?: string
}

const defaultItem: Communication = {
  type: 'اتصال هاتفي',
  date: new Date().toISOString().split('T')[0],
  subject: '',
  client_id: null,
  case_id: null,
  notes: ''
}

const editItem = ref<Communication>({ ...defaultItem })

onMounted(async (): Promise<void> => {
  await Promise.all([
    store.fetchCommunications(),
    clientsStore.fetchClients(),
    casesStore.fetchCases()
  ])
})

const openAddDialog = (): void => {
  isEditing.value = false
  editItem.value = { ...defaultItem }
  showDialog.value = true
}

const openEditDialog = (item: Communication): void => {
  isEditing.value = true
  editItem.value = { ...item }
  showDialog.value = true
}

const executeSave = async (): Promise<void> => {
  if (!formRef.value) return
  const { valid } = await formRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    if (isEditing.value) {
      await store.updateCommunication(editItem.value.id!, { ...editItem.value })
      showSnackbar('تم تحديث بروتوكول التواصل بنجاح', 'success')
    } else {
      await store.addCommunication({ ...editItem.value })
      showSnackbar('تم توثيق سجل التواصل الجديد بنجاح', 'success')
    }
    showDialog.value = false
  } catch (e: unknown) {
    showSnackbar('فشل الحماية القانونية للسجل: ' + (e as Error).message, 'error')
  } finally {
    saving.value = false
  }
}

const handleSave = async (): Promise<void> => {
  openConfirm({
    title: isEditing.value ? 'تأكيد تحديث سجل التواصل' : 'تأكيد توثيق سجل التواصل',
    message: isEditing.value
      ? 'هل أنت متأكد من رغبتك في حفظ التعديلات على سجل التواصل؟'
      : 'هل أنت متأكد من رغبتك في اعتماد وحفظ سجل التواصل الجديد؟',
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

const confirmDelete = (item: Communication): void => {
  itemToDelete.value = item
  openConfirm({
    title: 'تأكيد حذف السجل نهائياً',
    message: `أنت على وشك حذف سجل التواصل التالي نهائياً:\n${item.subject || ''}\n\nتحذير: لا يمكن التراجع عن هذا الإجراء.`,
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
  if (!itemToDelete.value || !itemToDelete.value.id) return
  try {
    await store.deleteCommunication(itemToDelete.value.id)
    showSnackbar('تم إزالة السجل من المحفوظات بنجاح', 'success')
  } catch (e: unknown) {
    showSnackbar('فشل في عملية الإزالة: ' + (e as Error).message, 'error')
  } finally {
    itemToDelete.value = null
  }
}

const getTypeColor = (type: string): string => {
  const map: Record<string, string> = {
    'اتصال هاتفي': 'blue',
    ايميل: 'teal',
    'خطاب رسمي': 'orange',
    'رسالة واتساب': 'success',
    'اجتماع حضوري': 'purple',
    'مراجعة جهة حكومية': 'error'
  }
  return map[type] || 'grey'
}

const getTypeIcon = (type: string): string => {
  const map: Record<string, string> = {
    'اتصال هاتفي': 'phone',
    ايميل: 'mail',
    'خطاب رسمي': 'file-text',
    'رسالة واتساب': 'message-circle',
    'اجتماع حضوري': 'users',
    'مراجعة جهة حكومية': 'landmark'
  }
  return map[type] || 'message-square'
}

const formatDate = (dateString: string): string => {
  if (!dateString || !isValidDate(dateString)) return '-'
  return new Date(dateString).toLocaleDateString('ar-SA')
}

const formatHijri = (dateString: string): string => {
  if (!dateString || !isValidDate(dateString)) return '-'
  return convertToHijri(new Date(dateString))
}

const showSnackbar = (text: string, color: string): void => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}
</script>

<style scoped>
.h-56 {
  height: 56px !important;
}
.h-48 {
  height: 48px !important;
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

.border-gold-alpha {
  border: 1px solid rgba(233, 195, 73, 0.2) !important;
}

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
