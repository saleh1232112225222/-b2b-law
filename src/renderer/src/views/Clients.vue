<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <!-- Header -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="bg-white pa-4 rounded-xl me-5 border-gold-alpha">
            <LucideIcon name="users" :size="36" class="text-gold" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-pure-black mb-1">إدارة ملفات الموكلين</h1>
            <p class="text-subtitle-1 text-pure-black font-weight-black">
              القاعدة المركزية لبيانات الموكلين، الشركات، والجهات الحكومية
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="auto" class="d-flex justify-md-end">
        <v-btn
          color="accent"
          size="large"
          height="56"
          class="font-weight-black rounded-xl px-12 premium-lift"
          @click="openAddDialog"
        >
          <LucideIcon name="user-plus" :size="20" class="me-3" /> إضافة موكل جديد
        </v-btn>
      </v-col>
    </v-row>

    <!-- Stats Summary -->
    <v-row class="mb-8" dense>
      <v-col cols="12" md="3">
        <v-card
          elevation="0"
          class="bg-white pa-6 position-relative overflow-hidden premium-lift border-gold-alpha rounded-2xl"
        >
          <v-skeleton-loader
            v-if="store.loading"
            type="list-item-two-line"
            class="bg-transparent"
          ></v-skeleton-loader>
          <div v-else class="d-flex align-center">
            <div class="bg-white pa-3 rounded-lg me-4 border-gold-alpha">
              <LucideIcon name="users" :size="24" class="text-gold" />
            </div>
            <div>
              <div class="text-tiny font-weight-black text-pure-black mb-1">
                إجمالي الموكلين المسجلين
              </div>
              <div class="text-h5 font-weight-black text-pure-black">
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

    <!-- Search & Filters -->
    <v-card elevation="0" class="bg-white mb-8 pa-6 border-gold-alpha rounded-2xl">
      <v-row dense align="center">
        <v-col cols="12" md="5">
          <v-text-field
            v-model="searchQuery"
            placeholder="بحث بالاسم، رقم الهاتف، أو البريد الإلكتروني..."
            variant="outlined"
            density="comfortable"
            hide-details
            class="h-large"
            clearable
          >
            <template #prepend-inner>
              <LucideIcon name="search" :size="20" class="text-gold me-2" />
            </template>
          </v-text-field>
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            v-model="filterType"
            label="تصفية حسب نوع الموكل"
            :items="['الكل', 'فرد', 'شركة', 'مؤسسة', 'جهة حكومية', 'أخرى']"
            variant="outlined"
            density="comfortable"
            hide-details
            class="h-large"
          >
            <template #prepend-inner>
              <LucideIcon name="filter" :size="20" class="text-gold me-2" />
            </template>
          </v-select>
        </v-col>
        <v-spacer />
        <v-col cols="auto">
          <v-btn
            variant="outlined"
            color="gold"
            height="48"
            class="rounded-lg premium-button-highlight"
            @click="store.fetchClients()"
          >
            <LucideIcon name="refresh-cw" :size="20" class="text-pure-black" />
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <!-- Data Table -->
    <!-- Data Table / Cards -->
    <v-card elevation="0" class="bg-white border-gold-alpha overflow-hidden rounded-2xl table-to-cards">
      <div v-if="isMobile" class="mobile-cards-list pa-4 bg-transparent overflow-y-auto" style="height: calc(100vh - 430px)">
        <v-skeleton-loader
          v-if="store.loading"
          type="card@3"
          class="bg-transparent"
        ></v-skeleton-loader>
        <div v-else-if="safeArray(store.clients).length === 0" class="text-center py-8 opacity-50 text-black">
          لا يوجد موكلين مطابقين للبحث
        </div>
        <div v-else class="d-flex flex-column ga-4">
          <v-card
            v-for="item in safeArray(store.clients)"
            :key="item.id"
            elevation="0"
            class="bg-grey-lighten-4 pa-4 rounded-xl border border-gold-alpha premium-lift position-relative"
          >
            <!-- Card Header -->
            <div class="d-flex justify-space-between align-center mb-3">
              <div class="d-flex align-center py-1">
                <v-avatar color="accent" size="32" class="me-3 font-weight-black text-black">
                  {{ item.name ? item.name.charAt(0) : '؟' }}
                </v-avatar>
                <v-btn
                  variant="text"
                  color="primary"
                  class="px-0 font-weight-black text-subtitle-1 hover-gold"
                  :to="'/clients/' + item.id"
                  density="compact"
                >
                  {{ item.name }}
                </v-btn>
              </div>

              <div class="d-flex align-center ga-2">
                <v-chip
                  :color="getClientTypeColor(item.type)"
                  variant="flat"
                  size="x-small"
                  class="font-weight-black px-3 rounded-lg"
                >
                  {{ valWithDefault(item.type, 'فرد') }}
                </v-chip>

                <!-- Actions -->
                <div class="d-flex ga-1">
                  <v-btn
                    icon
                    variant="text"
                    color="accent"
                    size="x-small"
                    class="rounded-lg"
                    :to="'/clients/' + item.id"
                  >
                    <LucideIcon name="eye" :size="16" />
                  </v-btn>
                  <v-btn
                    icon
                    variant="text"
                    color="gold"
                    size="x-small"
                    class="rounded-lg"
                    @click="openEditDialog(item)"
                  >
                    <LucideIcon name="pencil" :size="16" />
                  </v-btn>
                  <v-btn
                    icon
                    variant="text"
                    color="error"
                    size="x-small"
                    class="rounded-lg"
                    @click="confirmDelete(item)"
                  >
                    <LucideIcon name="trash-2" :size="16" />
                  </v-btn>
                </div>
              </div>
            </div>

            <!-- Client Info -->
            <div class="d-flex flex-wrap ga-x-4 ga-y-2 border-t pt-3 border-gold-alpha">
              <div class="d-flex align-center ga-1 text-caption">
                <LucideIcon name="phone" :size="14" class="text-gold" />
                <span class="text-text-muted">رقم الجوال:</span>
                <span class="text-pure-black font-weight-black ltr-text">{{ item.phone || '-' }}</span>
              </div>
              <div class="d-flex align-center ga-1 text-caption">
                <LucideIcon name="mail" :size="14" class="text-gold" />
                <span class="text-text-muted">البريد:</span>
                <span class="text-primary font-weight-bold" style="word-break: break-all;">{{ item.email || '-' }}</span>
              </div>
              <div class="d-flex align-center ga-1 text-caption">
                <LucideIcon name="calendar" :size="14" class="text-gold" />
                <span class="text-text-muted">تاريخ الانضمام:</span>
                <span class="text-pure-black font-weight-black">{{ formatDate(item.created_at) }}</span>
              </div>
            </div>
          </v-card>
        </div>

        <!-- Mobile Pagination Controls -->
        <div class="d-flex align-center justify-space-between mt-4">
          <v-btn
            variant="tonal"
            color="primary"
            size="small"
            class="rounded-lg px-4 font-weight-black"
            :disabled="store.page <= 1"
            @click="onMobilePagePrev"
          >
            السابق
          </v-btn>
          <span class="text-caption text-text-muted">
            صفحة {{ store.page }} من {{ Math.ceil(store.total / store.pageSize) }}
          </span>
          <v-btn
            variant="tonal"
            color="primary"
            size="small"
            class="rounded-lg px-4 font-weight-black"
            :disabled="store.page >= Math.ceil(store.total / store.pageSize)"
            @click="onMobilePageNext"
          >
            التالي
          </v-btn>
        </div>
      </div>

      <v-data-table-server
        v-else
        :headers="headers"
        :items="safeArray(store.clients)"
        :loading="store.loading"
        :items-length="store.total"
        class="bg-transparent premium-table clients-table-compact"
        fixed-header
        height="calc(100vh - 430px)"
        hover
        density="compact"
        :items-per-page-options="[10, 25, 50, 100]"
        items-per-page-text="عدد الموكلين لكل صفحة:"
        no-data-text="لا يوجد موكلين مطابقين للبحث"
        loading-text="جاري مزامنة بيانات الموكلين..."
        @update:options="onTableUpdate"
      >
        <template #[`item.name`]="{ item }">
          <div class="d-flex align-center py-1">
            <v-avatar color="accent" size="32" class="me-3 font-weight-black text-black">
              {{ item.name ? item.name.charAt(0) : '؟' }}
            </v-avatar>
            <v-btn
              variant="text"
              color="primary"
              class="px-0 font-weight-black text-h6 hover-gold"
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
            class="font-weight-black px-3 rounded-lg"
          >
            {{ valWithDefault(item.type, 'فرد') }}
          </v-chip>
        </template>

        <template #[`item.phone`]="{ item }">
          <span class="font-weight-black text-visible-high ltr-text">{{ item.phone || '-' }}</span>
        </template>

        <template #[`item.email`]="{ item }">
          <span class="text-caption text-primary font-weight-bold">{{ item.email || '-' }}</span>
        </template>

        <template #[`item.created_at`]="{ item }">
          <span class="text-tiny font-weight-black text-primary">{{
            formatDate(item.created_at)
          }}</span>
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-center ga-1">
            <v-btn
              icon
              variant="text"
              color="accent"
              size="small"
              class="rounded-lg hover-op-1"
              :to="'/clients/' + item.id"
            >
              <LucideIcon name="eye" :size="16" />
            </v-btn>
            <v-btn
              icon
              variant="text"
              color="gold"
              size="small"
              class="rounded-lg hover-op-1"
              @click="openEditDialog(item)"
            >
              <LucideIcon name="pencil" :size="16" />
            </v-btn>
            <v-btn
              icon
              variant="text"
              color="error"
              size="small"
              class="rounded-lg hover-op-1"
              @click="confirmDelete(item)"
            >
              <LucideIcon name="trash-2" :size="16" />
            </v-btn>
          </div>
        </template>

        <template #loading>
          <v-skeleton-loader type="table-row-divider@10" class="bg-transparent"></v-skeleton-loader>
        </template>
      </v-data-table-server>
    </v-card>

    <!-- Dialogs -->
    <v-dialog v-model="showDialog" max-width="850" persistent scrollable>
      <v-card class="modal-card overflow-hidden">
        <v-card-title class="pa-6 modal-header-solid d-flex align-center">
          <div class="bg-accent-alpha pa-2 rounded-lg me-3">
            <LucideIcon
              :name="isEditing ? 'user-cog' : 'user-plus'"
              :size="20"
              class="text-primary"
            />
          </div>
          <span class="text-h6 font-weight-black text-pure-black">
            {{ isEditing ? 'تعديل بيانات الموكل' : 'تسجيل موكل جديد' }}
          </span>
          <v-spacer />
          <v-btn icon variant="text" size="small" class="rounded-lg" @click="showDialog = false">
            <LucideIcon name="x" :size="20" class="text-primary" />
          </v-btn>
        </v-card-title>

        <v-card-text class="pa-8 bg-white">
          <ClientForm ref="clientFormRef" v-model="editItem" v-model:valid="formValid" />
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
            :disabled="!formValid"
            :loading="saving"
            @click="handleSave"
          >
            {{ isEditing ? 'حفظ التعديلات' : 'تأكيد التسجيل' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="showDeleteDialog" max-width="500" persistent>
      <v-card class="modal-card overflow-hidden">
        <v-card-title class="pa-6 modal-header-solid d-flex align-center">
          <LucideIcon name="alert-triangle" :size="24" class="me-3 text-error" />
          <span class="text-h6 font-weight-black text-pure-black">تأكيد الحذف النهائي</span>
          <v-spacer />
          <v-btn icon variant="text" size="small" @click="showDeleteDialog = false">
            <LucideIcon name="x" :size="20" class="text-primary" />
          </v-btn>
        </v-card-title>

        <v-card-text class="pa-8 bg-white text-center">
          <div class="text-body-1 mb-6 text-pure-black font-weight-black leading-relaxed">
            هل أنت متأكد من حذف الموكل وجميع السجلات المرتبطة به؟ لا يمكن التراجع عن هذا الإجراء.
          </div>
          <div
            class="pa-4 rounded-lg font-weight-black text-h6 bg-grey-lighten-4 border-gold-alpha text-error mb-6"
          >
            {{ itemToDelete?.name }}
          </div>
          <div class="text-tiny text-error opacity-70 font-weight-black italic">
            تحذير: سيتم مسح كافة ملفات القضية والمستندات المرتبطة بهذا الموكل.
          </div>
        </v-card-text>

        <v-card-actions class="pa-8 modal-footer-solid ga-3">
          <v-btn
            variant="flat"
            size="large"
            class="px-8 font-weight-black premium-button-highlight action-btn-unified"
            @click="showDeleteDialog = false"
            >تراجع</v-btn
          >
          <v-spacer />
          <v-btn
            color="error"
            variant="elevated"
            size="large"
            class="px-12 font-weight-black rounded-xl premium-lift h-56"
            :loading="deleting"
            @click="handleDelete"
          >
            حذف شامل
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
import { useDisplay } from 'vuetify'
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

const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value || (typeof window !== 'undefined' && window.innerWidth <= 768))

const onMobilePagePrev = (): void => {
  if (store.page > 1) {
    store.page--
    store.fetchClients()
  }
}

const onMobilePageNext = (): void => {
  if (store.page < Math.ceil(store.total / store.pageSize)) {
    store.page++
    store.fetchClients()
  }
}

const showDialog = ref(false)
const isEditing = ref(false)
const formValid = ref(false)
const clientFormRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const saving = ref(false)

const showDeleteDialog = ref(false)
const deleting = ref(false)
const itemToDelete = ref<Client | null>(null)

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

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
</script>

<style scoped>
.h-56 {
  height: 56px !important;
}
.h-48 {
  height: 48px !important;
}

.hover-gold:hover {
  color: #e9c349 !important;
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

.ltr-text {
  direction: ltr;
  display: inline-block;
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

.clients-table-compact :deep(.v-data-table__td),
.clients-table-compact :deep(.v-data-table__th) {
  padding: 6px 10px !important;
}

.clients-table-compact :deep(.v-data-table__td) {
  font-size: 0.9rem !important;
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

/* ---- Mobile responsive ---- */
@media (max-width: 768px) {
  .v-container.pa-6.pb-12.rtl {
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
    justify-content: center;
  }

  .bg-white.pa-4.rounded-xl {
    width: 48px !important;
    height: 48px !important;
    padding: 12px !important;
  }

  .bg-white.pa-4.rounded-xl :deep(.lucide-icon) {
    width: 24px !important;
    height: 24px !important;
  }

  .text-h5 {
    font-size: 1.1rem !important;
  }

  .text-subtitle-1 {
    font-size: 0.85rem !important;
  }

  .bg-white.mb-8.pa-6 {
    padding: 12px !important;
  }

  .bg-white.mb-8.pa-6 .v-row .v-col {
    flex: 0 0 100% !important;
    max-width: 100% !important;
  }

  .bg-white.mb-8.pa-6 .v-row .v-col-auto {
    flex: 0 0 auto;
    margin-top: 8px;
  }

  .clients-table-compact {
    height: auto !important;
    max-height: none !important;
  }
}
</style>
