<template>
  <v-container fluid class="pa-6 rtl">
    <!-- Header -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="user-x" :size="36" class="text-error" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-primary mb-1">إدارة ملفات الخصوم</h1>
            <p class="text-subtitle-1 text-primary font-weight-black">
              القاعدة المركزية لبيانات الخصوم وربطهم بالقضايا المتداولة
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="auto">
        <v-btn
          color="accent"
          size="large"
          class="font-weight-black rounded-xl px-8 premium-lift h-56"
          @click="openAddDialog"
        >
          <LucideIcon name="user-plus" :size="20" class="me-2" /> إضافة خصم جديد
        </v-btn>
      </v-col>
    </v-row>

    <!-- Stats Section -->
    <v-row class="mb-8" dense>
      <v-col cols="12" md="3">
        <v-card
          elevation="0"
          class="glass-card pa-6 border-gold-alpha position-relative overflow-hidden"
        >
          <v-skeleton-loader
            v-if="store.loading"
            type="list-item-two-line"
            class="bg-transparent"
          ></v-skeleton-loader>
          <div v-else class="d-flex align-center">
            <div class="glass-panel-light pa-3 rounded-lg me-4 bg-accent-alpha">
              <LucideIcon name="users" :size="24" class="text-accent" />
            </div>
            <div>
              <div class="text-tiny font-weight-black text-primary mb-1">
                إجمالي الخصوم المسجلين
              </div>
              <div class="text-h5 font-weight-black text-visible-high">
                {{ valWithDefault(store.total, 0) }}
              </div>
            </div>
          </div>
          <LucideIcon
            name="users"
            :size="80"
            class="position-absolute text-accent opacity-5"
            style="bottom: -20px; left: -20px"
          />
        </v-card>
      </v-col>
    </v-row>

    <!-- Filters Bar -->
    <v-card elevation="0" class="glass-card mb-8 pa-6 border-gold-alpha">
      <v-row dense align="center">
        <v-col cols="12" md="4">
          <v-text-field
            v-model="searchQuery"
            placeholder="بحث بالاسم، رقم الجوال، أو رقم الهوية..."
            variant="outlined"
            density="comfortable"
            hide-details
            class="glass-input"
            clearable
          >
            <template #prepend-inner>
              <LucideIcon name="search" :size="18" class="text-primary" />
            </template>
          </v-text-field>
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            v-model="filterType"
            label="تصفية حسب نوع الخصم"
            :items="['الكل', 'فرد', 'شركة', 'مؤسسة', 'جهة حكومية', 'أخرى']"
            variant="outlined"
            density="comfortable"
            hide-details
            class="glass-input"
          >
            <template #prepend-inner>
              <LucideIcon name="filter" :size="18" class="text-primary" />
            </template>
          </v-select>
        </v-col>
        <v-col cols="12" md="3">
          <div class="d-flex align-center glass-panel-light px-4 rounded-lg border-gold-alpha">
            <v-switch
              v-model="store.includeDeleted"
              color="error"
              hide-details
              inset
              class="mt-0"
              @update:model-value="store.fetchDefendants()"
            >
              <template #label>
                <span class="text-caption font-weight-black text-primary">عرض المحذوفين</span>
              </template>
            </v-switch>
          </div>
        </v-col>
        <v-spacer />
        <v-col cols="auto">
          <v-btn
            icon
            variant="text"
            color="gold"
            class="rounded-lg hover-gold opacity-60"
            @click="store.fetchDefendants()"
          >
            <LucideIcon name="refresh-cw" :size="20" />
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <!-- Data Table -->
    <v-card elevation="0" class="glass-card border-gold-alpha overflow-hidden">
      <v-data-table-server
        :headers="headers"
        :items="safeArray(filteredDefendants)"
        :items-length="valWithDefault(store.total, 0)"
        :loading="store.loading"
        :items-per-page="store.pageSize"
        :page="store.page"
        class="bg-transparent premium-table"
        fixed-header
        height="calc(100vh - 430px)"
        @update:options="onTableUpdate"
      >
        <template #item.name="{ item }">
          <span class="font-weight-black text-visible-high text-h6">{{ item.name }}</span>
        </template>
        <template #item.type="{ item }">
          <v-chip
            size="x-small"
            variant="tonal"
            class="font-weight-black px-3"
            :color="getTypeColor(item.type)"
          >
            {{ item.type || 'فرد' }}
          </v-chip>
        </template>
        <template #item.id_number="{ item }">
          <span class="font-weight-black text-visible-high ltr-text">{{
            item.id_number || '-'
          }}</span>
        </template>
        <template #item.phone="{ item }">
          <span class="font-weight-black text-visible-high ltr-text">{{ item.phone || '-' }}</span>
        </template>
        <template #item.created_at="{ item }">
          <span class="text-caption font-weight-black text-primary">{{
            formatDate(item.created_at)
          }}</span>
        </template>
        <template #item.actions="{ item }">
          <div class="d-flex ga-1 justify-center">
            <v-btn
              icon
              size="small"
              variant="text"
              color="accent"
              class="rounded-lg"
              @click="openPreviewDialog(item)"
            >
              <LucideIcon name="eye" :size="16" />
            </v-btn>
            <v-btn
              icon
              size="small"
              variant="text"
              color="gold"
              class="rounded-lg"
              @click="openEditDialog(item)"
            >
              <LucideIcon name="pencil" :size="16" />
            </v-btn>
            <v-btn
              v-if="item.is_deleted"
              icon
              size="small"
              variant="text"
              color="success"
              class="rounded-lg"
              @click="confirmRestore(item)"
            >
              <LucideIcon name="rotate-ccw" :size="16" />
            </v-btn>
            <v-btn
              v-else
              icon
              size="small"
              variant="text"
              color="error"
              class="rounded-lg"
              @click="confirmDelete(item)"
            >
              <LucideIcon name="trash-2" :size="16" />
            </v-btn>
          </div>
        </template>

        <template #loading>
          <v-skeleton-loader type="table-row-divider@10" class="bg-transparent"></v-skeleton-loader>
        </template>

        <template #no-data>
          <div class="text-center py-20">
            <LucideIcon name="user-x-2" :size="80" class="text-gold opacity-10 mb-4" />
            <div class="text-h6 font-weight-black text-gold opacity-30">لا يوجد خصوم مسجلين</div>
            <v-btn
              color="accent"
              variant="outlined"
              class="mt-4 px-8 font-weight-black rounded-lg"
              @click="openAddDialog"
            >
              تسجيل أول خصم
            </v-btn>
          </div>
        </template>
      </v-data-table-server>
    </v-card>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="showDialog" width="90%" max-width="850" persistent scrollable>
      <v-card class="glass-card overflow-hidden">
        <v-card-title class="pa-6 border-b border-primary d-flex align-center">
          <div class="bg-accent-alpha pa-2 rounded-lg me-3">
            <LucideIcon
              :name="isEditing ? 'user-cog' : 'user-plus'"
              :size="20"
              class="text-primary"
            />
          </div>
          <span class="text-h6 font-weight-black text-visible-high">
            {{ isEditing ? 'تعديل ملف الخصم' : 'تسجيل خصم جديد' }}
          </span>
          <v-spacer />
          <v-btn icon variant="text" size="small" class="rounded-lg" @click="showDialog = false">
            <LucideIcon name="x" :size="20" class="text-primary" />
          </v-btn>
        </v-card-title>

        <v-card-text class="pa-8">
          <DefendantForm ref="defendantFormRef" v-model="editItem" />
        </v-card-text>

        <v-divider class="border-gold" />
        <v-card-actions class="pa-8 modal-footer-solid modal-footer-sticky">
          <v-btn
            variant="flat"
            size="large"
            class="px-8 font-weight-black premium-button-highlight action-btn-unified"
            @click="showDialog = false"
            >إلغاء</v-btn
          >
          <v-spacer />
          <v-btn
            variant="flat"
            size="large"
            class="px-12 font-weight-black premium-button-highlight action-btn-unified h-56"
            :loading="saving"
            @click="handleSave"
          >
            {{ isEditing ? 'حفظ التغييرات' : 'تأكيد التسجيل' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Preview Dialog -->
    <v-dialog v-model="previewDialog" width="90%" max-width="800" scrollable>
      <v-card class="glass-card overflow-hidden">
        <v-card-title class="pa-6 border-b border-gold d-flex align-center">
          <div class="bg-accent-alpha pa-2 rounded-lg me-3">
            <LucideIcon name="eye" :size="20" class="text-gold" />
          </div>
          <span class="text-h6 font-weight-black text-primary text-visible-high"
            >معاينة تفصيلية لملف الخصم</span
          >
          <v-spacer />
          <v-btn icon variant="text" size="small" class="rounded-lg" @click="previewDialog = false">
            <LucideIcon name="x" :size="20" class="text-primary" />
          </v-btn>
        </v-card-title>

        <v-card-text class="pa-10">
          <v-row class="ga-y-8">
            <v-col cols="12" md="6">
              <div
                class="text-tiny font-weight-black text-gold opacity-40 uppercase tracking-widest mb-2"
              >
                الاسم الكامل
              </div>
              <div class="text-h6 font-weight-black text-visible-high">
                {{ previewItem?.name || '—' }}
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div
                class="text-tiny font-weight-black text-gold opacity-40 uppercase tracking-widest mb-2"
              >
                تصنيف الخصم
              </div>
              <v-chip
                size="small"
                class="font-weight-black px-4"
                variant="flat"
                :color="getTypeColor(previewItem?.type)"
              >
                {{ previewItem?.type || 'فرد' }}
              </v-chip>
            </v-col>

            <v-col cols="12" md="4">
              <div class="text-tiny font-weight-black text-primary uppercase tracking-widest mb-2">
                رقم الهوية / السجل
              </div>
              <div class="text-body-1 font-weight-black text-primary ltr-text">
                {{ previewItem?.id_number || '—' }}
              </div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-tiny font-weight-black text-primary uppercase tracking-widest mb-2">
                رقم الجوال
              </div>
              <div class="text-body-1 font-weight-black text-primary ltr-text">
                {{ previewItem?.phone || '—' }}
              </div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-tiny font-weight-black text-primary uppercase tracking-widest mb-2">
                الجنسية
              </div>
              <div class="text-body-1 font-weight-black text-primary">
                {{ previewItem?.nationality || '—' }}
              </div>
            </v-col>

            <v-col cols="12" md="4">
              <div class="text-tiny font-weight-black text-primary uppercase tracking-widest mb-2">
                المدينة
              </div>
              <div class="text-body-1 font-weight-black text-primary">
                {{ previewItem?.city || '—' }}
              </div>
            </v-col>
            <v-col cols="12" md="8">
              <div class="text-tiny font-weight-black text-primary uppercase tracking-widest mb-2">
                البريد الإلكتروني
              </div>
              <div class="text-body-1 font-weight-black text-primary">
                {{ previewItem?.email || '—' }}
              </div>
            </v-col>

            <v-col cols="12">
              <div class="text-tiny font-weight-black text-primary uppercase tracking-widest mb-2">
                العنوان الوطني / التفصيلي
              </div>
              <div
                class="glass-panel-light pa-4 rounded-lg border-gold-alpha text-body-2 font-weight-black text-primary"
              >
                {{ previewItem?.address || 'لم يتم تسجيل عنوان تفصيلي' }}
              </div>
            </v-col>

            <v-col cols="12">
              <div class="text-tiny font-weight-black text-primary uppercase tracking-widest mb-2">
                ملاحظات إضافية
              </div>
              <div
                class="glass-panel-light pa-4 rounded-lg border-gold-alpha text-body-2 font-weight-black text-primary italic"
              >
                {{ previewItem?.notes || 'لا توجد ملاحظات مسجلة' }}
              </div>
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider class="border-gold opacity-10" />
        <v-card-actions class="pa-6 bg-black-alpha ga-3">
          <v-btn
            variant="text"
            color="white"
            class="px-6 font-weight-black"
            @click="previewDialog = false"
            >إغلاق</v-btn
          >
          <v-spacer />
          <v-btn
            color="accent"
            variant="elevated"
            class="px-10 rounded-lg font-weight-black premium-lift h-48"
            @click="handleEditFromPreview"
          >
            <LucideIcon name="pencil" :size="16" class="me-2" /> تعديل البيانات
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
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Defendant } from '../types'
import { useDefendantsStore } from '../stores/defendants'
import { isValidDate, safeArray, valWithDefault } from '../utils/safe'
import { useSearch } from '../composables/useSearch'
import LucideIcon from '../components/common/LucideIcon.vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import { useConfirmDialog } from '../composables/useConfirmDialog'
import DefendantForm from '../components/DefendantForm.vue'

const store = useDefendantsStore()
const route = useRoute()
const router = useRouter()

const showDialog = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const filterType = ref('الكل')

const previewDialog = ref(false)
const previewItem = ref<Defendant | null>(null)

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const defendantFormRef = ref<any>(null)

const { confirmDialog, openConfirm, closeConfirm } = useConfirmDialog()

const headers = [
  { title: 'الاسم الكامل للخصم', key: 'name', align: 'start' as const, width: '260px' },
  { title: 'النوع', key: 'type', align: 'center' as const, width: '100px' },
  { title: 'الهوية / السجل', key: 'id_number', align: 'center' as const, width: '140px' },
  { title: 'رقم الجوال', key: 'phone', align: 'center' as const, width: '140px' },
  { title: 'تاريخ الإضافة', key: 'created_at', align: 'center' as const, width: '150px' },
  { title: 'الإجراءات', key: 'actions', sortable: false, align: 'center' as const, width: '150px' }
]

const defaultItem: Partial<Defendant> = {
  name: '',
  type: 'فرد',
  id_number: '',
  phone: '',
  nationality: 'سعودي',
  city: '',
  email: '',
  address: '',
  birth_date: '',
  notes: ''
}

const editItem = ref<Partial<Defendant>>({ ...defaultItem })
const itemToDelete = ref<Defendant | null>(null)
const itemToRestore = ref<Defendant | null>(null)

const onTableUpdate = (options: { page: number; itemsPerPage: number }): void => {
  store.page = options.page
  store.pageSize = options.itemsPerPage
  store.fetchDefendants()
}

const { search: searchQuery } = useSearch((val) => {
  store.q = val || ''
  store.page = 1
  store.fetchDefendants()
}, store.q)

const filteredDefendants = computed(() => {
  if (filterType.value === 'الكل') return store.defendants
  return store.defendants.filter((d) => d.type === filterType.value)
})

onMounted(() => {
  store.fetchDefendants()
  if (route.query.new === '1') {
    openAddDialog()
    router.replace({ path: route.path, query: {} })
  }
})

onUnmounted(() => {
  store.q = ''
  if (searchQuery) searchQuery.value = ''
})

const openAddDialog = (): void => {
  isEditing.value = false
  editItem.value = { ...defaultItem }
  showDialog.value = true
}

const openEditDialog = (item: Defendant): void => {
  isEditing.value = true
  editItem.value = { ...item }
  showDialog.value = true
}

const openPreviewDialog = (item: Defendant): void => {
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

const handleSave = async (): Promise<void> => {
  if (!defendantFormRef.value) return
  const { valid } = await defendantFormRef.value.validate()
  if (!valid) {
    showSnackbar('يرجى التأكد من صحة بيانات الخصم قبل الحفظ', 'warning')
    return
  }

  openConfirm({
    title: isEditing.value ? 'تأكيد تعديل الخصم' : 'تأكيد تسجيل الخصم',
    message: isEditing.value
      ? `هل أنت متأكد من حفظ التغييرات على ملف الخصم (${editItem.value.name})؟`
      : `هل أنت متأكد من تسجيل الخصم الجديد (${editItem.value.name}) في النظام؟`,
    color: 'success',
    confirmButtonColor: 'accent',
    icon: 'user-check',
    confirmText: 'نعم، احفظ',
    action: async () => {
      confirmDialog.value.loading = true
      saving.value = true
      try {
        const dataToSave = JSON.parse(JSON.stringify(editItem.value))
        if (isEditing.value) {
          await store.updateDefendant(dataToSave)
          showSnackbar('تم تحديث ملف الخصم بنجاح', 'success')
        } else {
          await store.addDefendant(dataToSave)
          showSnackbar('تم تسجيل الخصم بنجاح في النظام', 'success')
        }
        showDialog.value = false
        closeConfirm()
      } catch (e: unknown) {
        showSnackbar((e as Error).message, 'error')
      } finally {
        saving.value = false
        confirmDialog.value.loading = false
      }
    }
  })
}

const confirmDelete = (item: Defendant): void => {
  itemToDelete.value = item
  openConfirm({
    title: 'تأكيد الحذف',
    message: `هل أنت متأكد من حذف الخصم (${item.name})؟ يمكن استرجاعه لاحقاً من خيار (عرض المحذوفين).`,
    color: 'error',
    confirmButtonColor: 'error',
    icon: 'user-minus',
    confirmText: 'نعم، احذف',
    action: handleDelete
  })
}

const handleDelete = async (): Promise<void> => {
  if (!itemToDelete.value) return
  confirmDialog.value.loading = true
  try {
    await store.deleteDefendant(itemToDelete.value.id)
    showSnackbar('تم حذف الخصم بنجاح', 'success')
    closeConfirm()
  } catch (e: unknown) {
    showSnackbar((e as Error).message, 'error')
  } finally {
    confirmDialog.value.loading = false
  }
}

const confirmRestore = (item: Defendant): void => {
  itemToRestore.value = item
  openConfirm({
    title: 'تأكيد الاسترجاع',
    message: `هل أنت متأكد من استرجاع الخصم (${item.name})؟`,
    color: 'success',
    confirmButtonColor: 'success',
    icon: 'rotate-ccw',
    confirmText: 'نعم، استرجع',
    action: handleRestore
  })
}

const handleRestore = async (): Promise<void> => {
  if (!itemToRestore.value) return
  confirmDialog.value.loading = true
  try {
    await store.restoreDefendant(itemToRestore.value.id)
    showSnackbar('تم استرجاع الخصم بنجاح', 'success')
    closeConfirm()
  } catch (e: unknown) {
    showSnackbar((e as Error).message, 'error')
  } finally {
    confirmDialog.value.loading = false
  }
}

const getTypeColor = (type: string | undefined): string => {
  const map: Record<string, string> = {
    فرد: 'accent',
    شركة: 'indigo',
    مؤسسة: 'blue-grey',
    'جهة حكومية': 'brown',
    أخرى: 'grey'
  }
  return map[type || ''] || 'accent'
}

const formatDate = (dateString: string | undefined): string => {
  if (!isValidDate(dateString)) return '-'
  return new Date(dateString as string).toLocaleDateString('ar-SA')
}

const showSnackbar = (text: string, color: string = 'success'): void => {
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

.ltr-text {
  direction: ltr;
  display: inline-block;
}

.bg-accent-alpha {
  background: rgba(var(--v-theme-accent), 0.1) !important;
}
.bg-error-alpha {
  background: rgba(var(--v-theme-error), 0.1) !important;
}
.bg-black-alpha {
  background: rgba(0, 0, 0, 0.2) !important;
}

.border-gold-alpha {
  border: 1px solid rgba(233, 195, 73, 0.2) !important;
}

.hover-gold:hover {
  color: #e9c349 !important;
}
.hover-op-1:hover {
  opacity: 1 !important;
}

.premium-table :deep(th) {
  background: rgba(233, 195, 73, 0.05) !important;
  color: #e9c349 !important;
  font-weight: 900 !important;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 0.95rem !important;
  border-bottom: 1px solid rgba(233, 195, 73, 0.2) !important;
}

.premium-table :deep(td) {
  border-bottom: 1px solid rgba(233, 195, 73, 0.05) !important;
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
