<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <!-- Header -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="users" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">إدارة ملفات الموكلين</h1>
            <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
              القاعدة المركزية لبيانات الموكلين، الشركات، والجهات الحكومية
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="auto">
        <v-btn
          color="accent"
          size="large"
          class="font-weight-black rounded-lg px-8 premium-lift h-100 premium-btn-gold-gradient"
          @click="openAddDialog"
        >
          <LucideIcon name="user-plus" :size="20" class="me-3" /> إضافة موكل جديد
        </v-btn>
      </v-col>
    </v-row>

    <!-- Stats Summary -->
    <v-row class="mb-6" dense>
      <v-col cols="12" md="4">
        <v-card
          elevation="0"
          class="glass-card pa-6 position-relative overflow-hidden premium-hover border-gold border-opacity-10 rounded-xl"
        >
          <v-skeleton-loader
            v-if="store.loading"
            type="list-item-two-line"
            class="bg-transparent"
          ></v-skeleton-loader>
          <div v-else class="d-flex align-center">
            <div class="glass-panel-light pa-3 rounded-lg me-4 border-gold border-opacity-20">
              <LucideIcon name="users" :size="24" class="text-gold" />
            </div>
            <div>
              <div class="text-caption font-weight-black text-gold opacity-60 mb-1">
                إجمالي الموكلين المسجلين
              </div>
              <div class="text-h4 font-weight-black text-white">
                {{ valWithDefault(store.total, 0) }}
              </div>
            </div>
          </div>
          <LucideIcon
            name="users"
            :size="80"
            class="position-absolute text-gold opacity-5"
            style="bottom: -20px; left: -20px"
          />
        </v-card>
      </v-col>
    </v-row>

    <!-- Search & Filter Controls -->
    <v-row dense class="mb-6 align-center">
      <!-- Search Input -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model="searchQuery"
          placeholder="بحث بالاسم، رقم الهاتف، أو البريد الإلكتروني..."
          variant="outlined"
          density="comfortable"
          clearable
          class="glass-input search-input"
          hide-details
        >
          <template #prepend-inner>
            <LucideIcon name="search" :size="20" class="text-gold opacity-50" />
          </template>
        </v-text-field>
      </v-col>

      <!-- Client Type Filter -->
      <v-col cols="12" md="6">
        <v-select
          v-model="filterType"
          label="تصفية حسب نوع الموكل"
          :items="['الكل', 'فرد', 'شركة', 'مؤسسة', 'جهة حكومية', 'أخرى']"
          variant="outlined"
          density="comfortable"
          hide-details
          class="glass-input search-input"
        >
          <template #prepend-inner>
            <LucideIcon name="filter" :size="20" class="text-gold opacity-50" />
          </template>
        </v-select>
      </v-col>
    </v-row>

    <!-- Data Table (Desktop) -->
    <v-card v-if="!isMobile" elevation="0" class="glass-card overflow-hidden rounded-xl">
      <v-data-table-server
        :headers="headers"
        :items="filteredClients"
        :loading="store.loading"
        :items-length="store.total"
        class="bg-transparent clients-table-compact"
        fixed-header
        height="calc(100vh - 430px)"
        hover
        density="comfortable"
        :items-per-page-options="[10, 25, 50, 100]"
        items-per-page-text="عدد الموكلين لكل صفحة:"
        no-data-text="لا يوجد موكلين مطابقين للبحث"
        loading-text="جاري مزامنة بيانات الموكلين..."
        @update:options="onTableUpdate"
      >
        <template #[`header.name`]="{ column }">
          <span class="font-weight-black text-gold opacity-70">{{ column.title }}</span>
        </template>
        <template #[`header.type`]="{ column }">
          <span class="font-weight-black text-gold opacity-70">{{ column.title }}</span>
        </template>
        <template #[`header.phone`]="{ column }">
          <span class="font-weight-black text-gold opacity-70">{{ column.title }}</span>
        </template>
        <template #[`header.email`]="{ column }">
          <span class="font-weight-black text-gold opacity-70">{{ column.title }}</span>
        </template>
        <template #[`header.created_at`]="{ column }">
          <span class="font-weight-black text-gold opacity-70">{{ column.title }}</span>
        </template>
        <template #[`header.actions`]="{ column }">
          <span class="font-weight-black text-gold opacity-70">{{ column.title }}</span>
        </template>

        <template #[`item.name`]="{ item }">
          <div class="d-flex align-center py-1">
            <v-avatar color="accent" size="32" class="me-3 font-weight-black text-black">
              {{ item.name ? item.name.charAt(0) : '؟' }}
            </v-avatar>
            <v-btn
              variant="text"
              class="px-0 font-weight-black text-body-2 text-gold"
              :to="'/clients/' + item.id"
              density="compact"
            >
              {{ item.name }}
            </v-btn>
          </div>
        </template>

        <template #[`item.type`]="{ item }">
          <v-chip
            :color="getClientTypeColor(item.type)"
            variant="flat"
            size="x-small"
            class="font-weight-black px-3 rounded-lg text-black"
          >
            {{ valWithDefault(item.type, 'فرد') }}
          </v-chip>
        </template>

        <template #[`item.phone`]="{ item }">
          <span class="font-weight-black text-white ltr-text">{{ item.phone || '-' }}</span>
        </template>

        <template #[`item.email`]="{ item }">
          <span class="text-caption text-white opacity-80 font-weight-bold">{{
            item.email || '-'
          }}</span>
        </template>

        <template #[`item.created_at`]="{ item }">
          <span class="text-tiny font-weight-black text-white opacity-70">{{
            formatDate(item.created_at)
          }}</span>
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-center ga-2">
            <v-btn
              icon
              variant="text"
              size="small"
              class="premium-hover opacity-70"
              :to="'/clients/' + item.id"
            >
              <v-icon color="accent">mdi-eye</v-icon>
              <v-tooltip activator="parent" location="top">ملف الموكل</v-tooltip>
            </v-btn>
            <v-btn
              icon
              variant="text"
              size="small"
              class="premium-hover opacity-70"
              @click="openEditDialog(item)"
            >
              <v-icon color="accent">mdi-pencil</v-icon>
              <v-tooltip activator="parent" location="top">تعديل الموكل</v-tooltip>
            </v-btn>
            <v-btn
              icon
              variant="text"
              size="small"
              class="premium-hover opacity-70"
              @click="confirmDelete(item)"
            >
              <v-icon color="error">mdi-delete</v-icon>
              <v-tooltip activator="parent" location="top">حذف الموكل</v-tooltip>
            </v-btn>
          </div>
        </template>

        <template #loading>
          <v-skeleton-loader type="table-row-divider@10" class="bg-transparent"></v-skeleton-loader>
        </template>
      </v-data-table-server>
    </v-card>

    <!-- Clients Mobile Cards View (inline, matching POA.vue style) -->
    <div v-else>
      <div v-if="store.loading" class="d-flex flex-column gap-4">
        <v-skeleton-loader
          v-for="n in 4"
          :key="n"
          type="card"
          class="glass-card mb-4 rounded-xl bg-transparent"
        />
      </div>

      <div v-else-if="filteredClients.length === 0" class="text-center py-12 glass-card rounded-xl">
        <LucideIcon name="users" :size="48" class="text-gold opacity-30 mb-4" />
        <div class="text-h6 text-gold opacity-50 font-weight-black">
          لا يوجد موكلون مطابقون للبحث
        </div>
      </div>

      <div v-else class="mobile-cards-container d-flex flex-column gap-4">
        <v-card
          v-for="item in filteredClients"
          :key="item.id"
          class="glass-card mb-4 rounded-xl border-gold border-opacity-10 overflow-hidden premium-hover"
          elevation="0"
        >
          <!-- Card Header -->
          <div
            class="d-flex align-center justify-space-between pa-4 border-b border-gold border-opacity-10"
          >
            <div class="d-flex align-center">
              <v-avatar color="accent" size="36" class="me-3 font-weight-black text-black">
                {{ item.name ? item.name.charAt(0) : '؟' }}
              </v-avatar>
              <div>
                <v-btn
                  variant="text"
                  color="primary"
                  class="px-0 py-0 font-weight-black text-body-1 hover-gold h-auto min-width-0 text-visible-high"
                  :to="'/clients/' + item.id"
                >
                  {{ item.name }}
                </v-btn>
              </div>
            </div>

            <!-- Type Chip -->
            <v-chip
              :color="getClientTypeColor(item.type)"
              variant="flat"
              size="small"
              class="font-weight-black rounded-lg px-3 text-black"
            >
              {{ item.type || 'فرد' }}
            </v-chip>
          </div>

          <!-- Card Body -->
          <v-card-text class="pa-4 text-visible-high">
            <v-row dense class="mb-2">
              <v-col cols="6">
                <span class="text-caption text-visible-low d-block mb-1">رقم الجوال</span>
                <span class="text-caption font-weight-black text-visible-high ltr-text">
                  {{ item.phone || '-' }}
                </span>
              </v-col>
              <v-col cols="6">
                <span class="text-caption text-visible-low d-block mb-1">المدينة</span>
                <span class="text-caption font-weight-black text-visible-high">
                  {{ item.city || '-' }}
                </span>
              </v-col>
            </v-row>

            <v-row dense>
              <v-col cols="6">
                <span class="text-caption text-visible-low d-block mb-1"
                  >البريد الإلكتروني</span
                >
                <span
                  class="text-caption font-weight-black text-visible-high text-truncate d-block"
                  style="max-width: 150px"
                >
                  {{ item.email || '-' }}
                </span>
              </v-col>
              <v-col cols="6">
                <span class="text-caption text-visible-low d-block mb-1">الجنسية</span>
                <span class="text-caption font-weight-black text-visible-high">
                  {{ item.nationality || '-' }}
                </span>
              </v-col>
            </v-row>

            <!-- Card Actions -->
            <div class="d-flex align-center pt-3 border-t border-gold border-opacity-10 mt-3">
              <v-btn
                variant="text"
                color="primary"
                size="small"
                class="font-weight-black rounded-lg px-2"
                :to="'/clients/' + item.id"
              >
                <LucideIcon name="eye" :size="16" class="me-1" /> ملف الموكل
              </v-btn>
              <v-spacer />
              <div class="d-flex ga-2">
                <v-btn
                  icon
                  size="small"
                  variant="tonal"
                  color="primary"
                  class="rounded-lg"
                  @click.stop="openEditDialog(item)"
                >
                  <LucideIcon name="edit-3" :size="16" />
                </v-btn>
                <v-btn
                  icon
                  size="small"
                  variant="tonal"
                  color="error"
                  class="rounded-lg"
                  @click.stop="confirmDelete(item)"
                >
                  <LucideIcon name="trash-2" :size="16" />
                </v-btn>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </div>

    <!-- Dialogs -->
    <v-dialog
      v-model="showDialog"
      width="90%"
      max-width="850"
      persistent
      scrollable
      :fullscreen="isMobile"
      :transition="isMobile ? 'dialog-bottom-transition' : 'dialog-transition'"
    >
      <v-card class="poa-dialog-card overflow-hidden glass-card">
        <div class="poa-dialog-header d-flex align-center py-5 px-8">
          <div class="glass-panel-light pa-2 rounded-lg me-4 border-gold border-opacity-20">
            <LucideIcon
              :name="isEditing ? 'user-cog' : 'user-plus'"
              :size="24"
              class="text-accent"
            />
          </div>
          <span class="text-h5 font-weight-black text-gold">
            {{ isEditing ? 'تعديل بيانات الموكل' : 'تسجيل موكل جديد' }}
          </span>
          <v-spacer />
          <v-btn
            class="premium-btn-gold-gradient"
            variant="text"
            color="gold"
            icon
            @click="showDialog = false"
          >
            <LucideIcon name="x" :size="24" />
          </v-btn>
        </div>

        <v-card-text class="pa-8 modal-scrollable poa-form poa-dialog-body">
          <div class="poa-form">
            <ClientForm ref="clientFormRef" v-model="editItem" v-model:valid="formValid" />
          </div>
        </v-card-text>

        <v-divider class="border-gold opacity-10"></v-divider>
        <v-card-actions class="pa-8 poa-dialog-footer d-flex flex-column align-center gap-3">
          <v-btn
            variant="flat"
            size="large"
            class="w-100 font-weight-black premium-btn-gold-gradient h-56 premium-btn-gold-gradient"
            :disabled="!formValid"
            :loading="saving"
            @click="handleSave"
          >
            {{ isEditing ? 'حفظ التعديلات' : 'تأكيد التسجيل' }}
          </v-btn>
          <v-btn
            variant="text"
            color="white"
            class="text-body-1 font-weight-bold text-cancel-link mt-2 premium-btn-gold-gradient"
            @click="showDialog = false"
          >
            إلغاء
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Global Confirmation -->
    <PremiumConfirm
      v-model="confirmDialog.show"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :color="confirmDialog.color"
      :icon="confirmDialog.icon"
      :confirm-text="confirmDialog.confirmText"
      :loading="confirmDialog.loading"
      @confirm="confirmDialog.action"
    />
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useMobileLayout } from '../composables/useMobileLayout'
import { setFabAction, clearFabAction } from '../composables/useFabAction'
import { useRoute, useRouter } from 'vue-router'
import { useClientsStore } from '../stores/clients'
import { useSearch } from '../composables/useSearch'
import ClientForm from '../components/ClientForm.vue'
import PremiumConfirm from '../components/common/PremiumConfirm.vue'
import LucideIcon from '../components/common/LucideIcon.vue'
import { Client } from '../types'
import { safeArray, isValidDate, valWithDefault } from '../utils/safe'

const store = useClientsStore()
const route = useRoute()
const router = useRouter()
const filterType = ref('الكل')

const { isMobile } = useMobileLayout()

const showDialog = ref(false)
const isEditing = ref(false)
const formValid = ref(false)
const clientFormRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const saving = ref(false)

const deleting = ref(false)
const itemToDelete = ref<Client | null>(null)

// --- Confirmation Dialog State ---
const confirmDialog = ref({
  show: false,
  title: '',
  message: '',
  color: 'primary',
  icon: 'alert-circle',
  confirmText: 'تأكيد',
  loading: false,
  action: () => {}
})

const openConfirm = (options: {
  title: string
  message: string
  color?: string
  icon?: string
  confirmText?: string
  action: () => void
}) => {
  confirmDialog.value = {
    show: true,
    title: options.title,
    message: options.message,
    color: options.color || 'primary',
    icon: options.icon || 'alert-circle',
    confirmText: options.confirmText || 'تأكيد',
    loading: false,
    action: options.action
  }
}

const headers = [
  { title: 'اسم الموكل الكامل', key: 'name', align: 'start' as const },
  { title: 'نوع النشاط', key: 'type', align: 'center' as const, width: '100px' },
  { title: 'رقم الجوال', key: 'phone', align: 'center' as const, width: '130px' },
  { title: 'البريد الإلكتروني', key: 'email', align: 'center' as const, width: '220px' },
  { title: 'تاريخ الانضمام', key: 'created_at', align: 'center' as const, width: '120px' },
  {
    title: 'إجراءات السجل',
    key: 'actions',
    sortable: false,
    align: 'center' as const,
    width: '140px'
  }
]

const defaultItem: Partial<Client> = {
  name: '',
  type: 'فرد' as const,
  id_number: '',
  phone: '',
  email: '',
  nationality: 'سعودي',
  city: 'الرياض',
  address: '',
  birth_date: '',
  notes: ''
}

const editItem = ref<Partial<Client>>({ ...defaultItem })

const filteredClients = computed(() => {
  const list = safeArray(store.clients)
  if (!filterType.value || filterType.value === 'الكل') return list
  return list.filter((item: Client) => item.type === filterType.value)
})

const onTableUpdate = (options: { page: number; itemsPerPage: number }): void => {
  store.page = options.page
  store.pageSize = options.itemsPerPage
  store.fetchClients()
}

const { search: searchQuery } = useSearch((val) => {
  store.q = val || ''
  store.page = 1
  store.fetchClients()
}, store.q)

onMounted(() => {
  store.fetchClients()
  if (route.query.new === '1') {
    openAddDialog()
    router.replace({ path: route.path, query: {} })
  }
  setFabAction('mdi-account-plus', openAddDialog, route.path)
})

onUnmounted(() => {
  store.q = ''
  if (searchQuery) searchQuery.value = ''
  clearFabAction()
})

const openAddDialog = (): void => {
  isEditing.value = false
  editItem.value = { ...defaultItem }
  showDialog.value = true
}

const openEditDialog = (item: Client): void => {
  isEditing.value = true
  editItem.value = { ...item }
  showDialog.value = true
}

const handleSave = async (): Promise<void> => {
  if (!clientFormRef.value) return
  const { valid } = await clientFormRef.value.validate()
  if (!valid) {
    showSnackbar('يرجى التأكد من صحة بيانات الموكل قبل الحفظ', 'warning')
    return
  }

  openConfirm({
    title: isEditing.value ? 'تأكيد تعديل الموكل' : 'تأكيد تسجيل الموكل',
    message: isEditing.value
      ? `هل أنت متأكد من حفظ التغييرات على ملف الموكل (${editItem.value.name})؟`
      : `هل أنت متأكد من تسجيل الموكل الجديد (${editItem.value.name}) في النظام؟`,
    color: 'success',
    icon: 'user-check',
    confirmText: 'نعم، احفظ',
    action: async () => {
      confirmDialog.value.loading = true
      saving.value = true
      try {
        const dataToSave = JSON.parse(JSON.stringify(editItem.value))
        if (isEditing.value) {
          await store.updateClient(dataToSave)
          showSnackbar('تم تحديث بروفايل الموكل بنجاح', 'success')
        } else {
          await store.addClient(dataToSave)
          showSnackbar('تم تسجيل الموكل بنجاح في النظام', 'success')
        }
        showDialog.value = false
        confirmDialog.value.show = false
      } catch (e: unknown) {
        showSnackbar('فشل في مزامنة البيانات السحابية: ' + (e as Error).message, 'error')
      } finally {
        saving.value = false
        confirmDialog.value.loading = false
      }
    }
  })
}

const confirmDelete = (item: Client): void => {
  itemToDelete.value = item
  openConfirm({
    title: 'تأكيد الحذف الشامل',
    message: `تحذير: أنت على وشك حذف الموكل (${item.name}) نهائياً. سيؤدي هذا لمسح كافة القضايا والمستندات المرتبطة به. هل تود الاستمرار؟`,
    color: 'error',
    icon: 'alert-triangle',
    confirmText: 'نعم، احذف الموكل',
    action: handleDelete
  })
}

const handleDelete = async (): Promise<void> => {
  if (!itemToDelete.value) return
  confirmDialog.value.loading = true
  deleting.value = true
  try {
    await store.deleteClient(itemToDelete.value.id)
    showSnackbar('تم حذف الموكل وإلغاء كافة السجلات المرتبطة', 'success')
    confirmDialog.value.show = false
  } catch (e: unknown) {
    showSnackbar('خطأ أمني في الحذف: ' + (e as Error).message, 'error')
  } finally {
    deleting.value = false
    confirmDialog.value.loading = false
  }
}

const getClientTypeColor = (type: string | undefined): string => {
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

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')
</script>

<style scoped>
.h-56 {
  height: 56px !important;
}

.hover-gold:hover {
  color: #e9c349 !important;
}

.bg-accent-alpha {
  background: rgba(var(--v-theme-accent), 0.1) !important;
}

.ltr-text {
  direction: ltr;
  display: inline-block;
}

.clients-table-compact :deep(th) {
  background: rgba(233, 195, 73, 0.05) !important;
  color: #e9c349 !important;
  font-weight: 900 !important;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 0.75rem !important;
  border-bottom: 1px solid rgba(233, 195, 73, 0.2) !important;
}

.clients-table-compact :deep(td) {
  border-bottom: 1px solid rgba(233, 195, 73, 0.05) !important;
  color: #ffffff !important;
}

.clients-table-compact :deep(.v-data-table__td),
.clients-table-compact :deep(.v-data-table__th) {
  padding: 6px 10px !important;
}

.clients-table-compact :deep(.v-data-table__td) {
  font-size: 0.9rem !important;
}

.modal-scrollable {
  max-height: calc(100vh - 280px);
  overflow-y: auto;
}

/* Styled scrollbar for dialog content */
.modal-scrollable::-webkit-scrollbar {
  width: 6px;
}
.modal-scrollable::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}
.modal-scrollable::-webkit-scrollbar-thumb {
  background: rgba(233, 195, 73, 0.3);
  border-radius: 3px;
}
.modal-scrollable::-webkit-scrollbar-thumb:hover {
  background: rgba(233, 195, 73, 0.6);
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

.search-input :deep(.v-field) {
  border-radius: 16px !important;
  background: rgba(255, 255, 255, 0.03) !important;
  border: 1px solid rgba(233, 195, 73, 0.15) !important;
  transition: all 0.3s ease;
}

.search-input :deep(.v-field--focused) {
  border-color: rgba(233, 195, 73, 0.6) !important;
  background: rgba(255, 255, 255, 0.06) !important;
}

.search-input :deep(input),
.search-input :deep(.v-select__selection-text) {
  color: #ffffff !important;
  font-weight: 800;
}

.glass-toggle {
  background: rgba(255, 255, 255, 0.02) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(233, 195, 73, 0.15) !important;
}

.border-accent {
  border-color: var(--v-theme-accent) !important;
}

.text-gold {
  color: #e9c349 !important;
}

.text-accent {
  color: var(--v-theme-accent) !important;
}

.gap-2 {
  gap: 8px;
}

.gap-4 {
  gap: 16px;
}

/* Glass Dialog Styling matching Figma mockups */
.poa-dialog-card {
  background: rgba(15, 23, 42, 0.95) !important;
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border: 1px solid rgba(233, 195, 73, 0.25) !important;
  border-radius: 24px !important;
}

.poa-dialog-header {
  background: rgba(0, 0, 0, 0.2) !important;
  border-bottom: 1px solid rgba(233, 195, 73, 0.15) !important;
}

.poa-dialog-footer {
  background: rgba(0, 0, 0, 0.2) !important;
  border-top: 1px solid rgba(233, 195, 73, 0.15) !important;
}

.poa-form :deep(.v-label) {
  color: #e9c349 !important;
  font-weight: 800 !important;
  font-size: 0.95rem !important;
  margin-bottom: 6px !important;
}

.poa-form :deep(.v-field) {
  background: rgba(0, 0, 0, 0.4) !important;
  border-radius: 14px !important;
  border: 1px solid rgba(233, 195, 73, 0.25) !important;
  transition: all 0.3s ease;
}

.poa-form :deep(.v-field__outline) {
  display: none !important;
}

.poa-form :deep(.v-field--focused) {
  border-color: #e9c349 !important;
  box-shadow: 0 0 12px rgba(233, 195, 73, 0.2) !important;
}

.poa-form :deep(input),
.poa-form :deep(textarea),
.poa-form :deep(.v-select__selection-text) {
  color: #ffffff !important;
  font-weight: 600 !important;
}

.poa-form :deep(.v-field__prepend-inner .v-icon),
.poa-form :deep(.v-field__append-inner .v-icon) {
  color: #e9c349 !important;
  opacity: 1 !important;
}

.mobile-cards-container {
  padding-bottom: 24px;
}

.premium-btn-gold-gradient {
  background: linear-gradient(135deg, #e9c349 0%, #c49a21 100%) !important;
  color: #0d1527 !important;
  font-weight: 900 !important;
  border-radius: 16px !important;
  box-shadow: 0 6px 20px rgba(233, 195, 73, 0.25) !important;
  transition: all 0.3s ease !important;
}

.premium-btn-gold-gradient:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 8px 24px rgba(233, 195, 73, 0.4) !important;
}

.premium-btn-gold-gradient.v-btn--disabled {
  background: rgba(233, 195, 73, 0.3) !important;
  color: rgba(255, 255, 255, 0.3) !important;
  box-shadow: none !important;
  opacity: 1 !important;
}

.text-cancel-link {
  color: rgba(255, 255, 255, 0.6) !important;
  text-decoration: none;
  text-transform: none;
}

.text-cancel-link:hover {
  color: #e9c349 !important;
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
