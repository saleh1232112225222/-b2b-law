<template>
  <v-container fluid class="pa-6 rtl">
    <!-- Navigation Buttons -->
    <div class="d-flex justify-space-between align-center mb-6">
      <v-btn variant="outlined" to="/clients" class="font-weight-black return-btn-gold premium-btn-gold-gradient">
        <LucideIcon name="arrow-right" :size="20" class="me-2" /> العودة للموكلين
      </v-btn>

      <v-btn
        v-if="nextClientId"
        variant="outlined"
        :to="'/clients/' + nextClientId"
        class="font-weight-black next-btn-gold premium-btn-gold-gradient"
      >
        الموكل التالي <LucideIcon name="arrow-left" :size="20" class="ms-2" />
      </v-btn>
    </div>

    <v-row v-if="loading">
      <v-col class="text-center pa-20">
        <v-progress-circular indeterminate color="accent" size="64"></v-progress-circular>
        <div class="mt-4 text-gold opacity-40 font-weight-black">
          جاري استدعاء السجل القانوني...
        </div>
      </v-col>
    </v-row>

    <div v-else-if="client">
      <!-- Client Header Card -->
      <v-card elevation="0" class="glass-card mb-8 overflow-hidden border-gold-alpha glass-card">
        <v-row no-gutters>
          <v-col cols="12" md="8" class="pa-8">
            <div class="d-flex align-center mb-4">
              <div class="glass-panel-light pa-1 rounded-xl me-6 border-gold opacity-40">
                <v-avatar color="accent" size="90" class="font-weight-black text-h5 text-black">
                  {{ client.name?.charAt(0) }}
                </v-avatar>
              </div>
              <div>
                <div class="d-flex align-center ga-3 mb-2">
                  <h1 class="text-h4 font-weight-black text-gold">{{ client.name }}</h1>
                  <v-chip
                    :color="getClientTypeColor(client.type)"
                    variant="flat"
                    size="small"
                    class="font-weight-black rounded-lg px-4"
                  >
                    {{ client.type || 'فرد' }}
                  </v-chip>
                </div>
                <div class="text-h6 text-gold opacity-60 font-weight-black d-flex align-center">
                  <LucideIcon name="id-card" :size="20" class="me-3 opacity-40" />
                  الهوية/السجل: {{ client.id_number || '---' }}
                </div>
              </div>
            </div>
          </v-col>
          <v-col
            cols="12"
            md="4"
            class="bg-accent-alpha pa-8 d-flex flex-column justify-center align-md-end ga-4"
          >
            <v-btn
              color="accent"
              variant="elevated"
              size="large"
              class="rounded-xl px-10 font-weight-black premium-lift h-56 premium-btn-gold-gradient"
              @click="openEditDialog"
            >
              <LucideIcon name="pencil" :size="18" class="me-3" /> تعديل الملف الشخصي
            </v-btn>
          </v-col>
        </v-row>
      </v-card>

      <!-- Main Content Tabs -->
      <v-card elevation="0" class="glass-card border-gold-alpha glass-card">
        <v-tabs v-model="tab" color="accent" class="border-b border-gold opacity-10" grow>
          <v-tab value="overview" class="font-weight-black text-gold py-6">
            <LucideIcon name="info" :size="18" class="me-3" /> المعلومات الأساسية
          </v-tab>
          <v-tab value="cases" class="font-weight-black text-gold py-6">
            <LucideIcon name="gavel" :size="18" class="me-3" /> القضايا المرتبطة
            <v-badge
              v-if="safeLength(linkedCases) > 0"
              :content="safeLength(linkedCases)"
              color="accent"
              class="ms-4"
              inline
            ></v-badge>
          </v-tab>
          <v-tab value="agencies" class="font-weight-black text-gold py-6">
            <LucideIcon name="file-text" :size="18" class="me-3" /> الوكالات المسجلة
            <v-badge
              v-if="safeLength(linkedAgencies) > 0"
              :content="safeLength(linkedAgencies)"
              color="accent"
              class="ms-4"
              inline
            ></v-badge>
          </v-tab>
        </v-tabs>

        <v-window v-model="tab" class="pa-8">
          <!-- Overview Tab -->
          <v-window-item value="overview">
            <v-row>
              <v-col cols="12" md="6">
                <v-list class="pa-0 bg-transparent">
                  <v-list-item class="px-0 mb-6">
                    <template #prepend>
                      <div class="glass-panel-light pa-3 rounded-lg me-5 bg-accent-alpha">
                        <LucideIcon name="phone" :size="24" class="text-accent" />
                      </div>
                    </template>
                    <v-list-item-title
                      class="text-caption text-gold opacity-50 font-weight-black mb-1"
                      >رقم الجوال</v-list-item-title
                    >
                    <v-list-item-subtitle class="text-h5 font-weight-black text-white ltr-text">{{
                      client.phone || '---'
                    }}</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item class="px-0 mb-6">
                    <template #prepend>
                      <div class="glass-panel-light pa-3 rounded-lg me-5 bg-accent-alpha">
                        <LucideIcon name="mail" :size="24" class="text-accent" />
                      </div>
                    </template>
                    <v-list-item-title
                      class="text-caption text-gold opacity-50 font-weight-black mb-1"
                      >البريد الإلكتروني</v-list-item-title
                    >
                    <v-list-item-subtitle class="text-h5 font-weight-black text-white">{{
                      client.email || '---'
                    }}</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item class="px-0">
                    <template #prepend>
                      <div class="glass-panel-light pa-3 rounded-lg me-5 bg-accent-alpha">
                        <LucideIcon name="map-pin" :size="24" class="text-accent" />
                      </div>
                    </template>
                    <v-list-item-title
                      class="text-caption text-gold opacity-50 font-weight-black mb-1"
                      >المدينة والعنوان</v-list-item-title
                    >
                    <v-list-item-subtitle class="text-h5 font-weight-black text-white">
                      {{ client.city }} - {{ client.address || '---' }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-col>

              <v-col cols="12" md="6">
                <v-card
                  elevation="0"
                  class="pa-8 glass-panel-light rounded-xl h-100 border-gold-alpha glass-card"
                >
                  <div class="text-subtitle-1 font-weight-black text-gold mb-4 d-flex align-center">
                    <LucideIcon name="message-circle" :size="20" class="me-3 opacity-40" /> ملاحظات
                    إضافية
                  </div>
                  <div
                    class="text-body-1 text-white opacity-60 leading-relaxed min-h-100 font-weight-black"
                  >
                    {{ client.notes || 'لا توجد ملاحظات مسجلة لهذا الموكل.' }}
                  </div>
                  <v-divider class="my-8 border-gold opacity-10"></v-divider>
                  <div class="d-flex justify-space-between align-center">
                    <div class="text-caption text-gold opacity-40 font-weight-black">
                      تاريخ الانضمام للنظام:
                    </div>
                    <div class="text-h6 font-weight-black text-accent">
                      {{ formatDate(client.created_at) }}
                    </div>
                  </div>
                </v-card>
              </v-col>
            </v-row>
          </v-window-item>

          <!-- Cases Tab -->
          <v-window-item value="cases">
            <v-data-table
              :headers="caseHeaders"
              :items="safeArray(linkedCases)"
              class="bg-transparent premium-table"
              hover
              no-data-text="لا توجد قضايا مرتبطة بهذا الموكل حالياً"
            >
              <template #[`item.case_number`]="{ item }">
                <v-btn
                  variant="text"
                  color="accent"
                  class="px-0 font-weight-black text-decoration-underline ltr-text premium-btn-gold-gradient"
                  density="compact"
                  :to="'/cases/' + item.id"
                >
                  {{ item.case_number }}
                </v-btn>
              </template>
              <template #[`item.status`]="{ item }">
                <v-chip
                  size="x-small"
                  :color="getStatusColor(item.status)"
                  variant="flat"
                  class="font-weight-black px-3 rounded-lg"
                >
                  {{ item.status }}
                </v-chip>
              </template>
            </v-data-table>
          </v-window-item>

          <!-- Agencies Tab -->
          <v-window-item value="agencies">
            <v-data-table
              :headers="agencyHeaders"
              :items="safeArray(linkedAgencies)"
              class="bg-transparent premium-table"
              hover
              no-data-text="لا توجد وكالات مسجلة لهذا الموكل"
            >
              <template #[`item.agency_number`]="{ item }">
                <div class="font-weight-black text-white ltr-text">
                  {{ item.agency_number }}
                </div>
              </template>
              <template #[`item.date`]="{ item }">
                <div class="text-caption font-weight-black text-gold opacity-60">
                  {{ item.date }} مـ
                </div>
              </template>
            </v-data-table>
          </v-window-item>
        </v-window>
      </v-card>
    </div>

    <div v-else class="text-center pa-20">
      <LucideIcon name="search-x" :size="80" class="text-gold opacity-10 mb-6" />
      <div class="text-h5 font-weight-black text-gold opacity-40 mb-6">الموكل غير موجود</div>
      <v-btn
        to="/clients"
        color="accent"
        size="large"
        class="rounded-xl px-10 font-weight-black premium-lift premium-btn-gold-gradient"
      >
        العودة لقائمة الموكلين
      </v-btn>
    </div>

    <!-- Edit Dialog -->
    <v-dialog v-model="showEditDialog" width="90%" max-width="850" persistent scrollable>
      <v-card class="glass-card overflow-hidden glass-card">
        <v-card-title class="pa-6 border-b border-gold opacity-10 d-flex align-center glass-card">
          <div class="bg-accent-alpha pa-2 rounded-lg me-3">
            <LucideIcon name="user-cog" :size="20" class="text-gold" />
          </div>
          <span class="text-h6 font-weight-black text-white">تعديل بيانات الموكل</span>
          <v-spacer />
          <v-btn
            icon
            variant="text"
            size="small"
            class="rounded-lg premium-btn-gold-gradient"
            @click="showEditDialog = false"
          >
            <LucideIcon name="x" :size="20" class="text-white" />
          </v-btn>
        </v-card-title>

        <v-card-text class="pa-8 glass-card">
          <ClientForm v-model="editClientItem" v-model:valid="formValid" />
        </v-card-text>

        <v-divider class="border-gold opacity-10" />
        <v-card-actions class="pa-6 bg-black-alpha glass-card">
          <v-btn
            variant="text"
            color="white"
            class="px-8 font-weight-black premium-btn-gold-gradient"
            @click="showEditDialog = false"
            >إلغاء</v-btn
          >
          <v-spacer />
          <v-btn
            color="accent"
            variant="elevated"
            class="px-12 rounded-lg font-weight-black premium-lift h-48 premium-btn-gold-gradient"
            :disabled="!formValid"
            :loading="saving"
            @click="handleSave"
          >
            حفظ التعديلات
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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

    <!-- Feedback -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" rounded="lg" elevation="24">
      <div class="d-flex align-center font-weight-black">
        <LucideIcon
          :name="snackbar.color === 'success' ? 'check-circle' : 'alert-circle'"
          :size="18"
          class="me-3"
        />
        {{ snackbar.text }}
      </div>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Client, Case, Agency } from '../types'
import { safeArray, safeLength } from '../utils/safe'
import ClientForm from '../components/ClientForm.vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import LucideIcon from '../components/common/LucideIcon.vue'
import { useConfirmDialog } from '../composables/useConfirmDialog'
import { useClientsStore } from '../stores/clients'

const route = useRoute()
const clientId = computed(() => route.params.id as string)
const nextClientId = ref<string | null>(null)
const clientsStore = useClientsStore()

const loading = ref(true)
const tab = ref('overview')
const client = ref<Client | null>(null)
const linkedCases = ref<Case[]>([])
const linkedAgencies = ref<Agency[]>([])

const showEditDialog = ref(false)
const formValid = ref(false)
const saving = ref(false)
const editClientItem = ref<Partial<Client>>({})

const snackbar = ref({ show: false, text: '', color: 'success' as 'success' | 'error' })
const showSnackbar = (text: string, color: 'success' | 'error' = 'success') => {
  snackbar.value = { show: true, text, color }
}

const { confirmDialog, openConfirm, closeConfirm } = useConfirmDialog()

const calculateNextClientId = async (): Promise<void> => {
  try {
    if (!clientsStore.clients.length) {
      await clientsStore.fetchAllClients()
    }
    const all = clientsStore.clients
    if (all && all.length > 0) {
      const currentIndex = all.findIndex((c) => String(c.id) === String(clientId.value))
      if (currentIndex !== -1) {
        if (all.length > 1) {
          nextClientId.value = String(all[(currentIndex + 1) % all.length].id)
        } else {
          nextClientId.value = null
        }
      } else {
        const firstOther = all.find((c) => String(c.id) !== String(clientId.value))
        nextClientId.value = firstOther ? String(firstOther.id) : null
      }
    } else {
      nextClientId.value = null
    }
  } catch (err) {
    console.error('Error calculating next client:', err)
    nextClientId.value = null
  }
}

const caseHeaders = [
  { title: 'رقم القضية', key: 'case_number', align: 'start' as const },
  { title: 'موضوع القضية', key: 'subject', align: 'start' as const },
  { title: 'المحكمة', key: 'court', align: 'start' as const },
  { title: 'الحالة', key: 'status', align: 'center' as const, width: '120px' }
]

const agencyHeaders = [
  { title: 'رقم الوكالة', key: 'agency_number', align: 'start' as const },
  { title: 'تاريخ الصدور', key: 'date', align: 'center' as const },
  { title: 'جهة الإصدار', key: 'court', align: 'start' as const },
  { title: 'تاريخ الانتهاء', key: 'expiry_date', align: 'center' as const }
]

const loadAllData = async (): Promise<void> => {
  loading.value = true
  try {
    const data = await window.api.clients.getById(clientId.value)
    if (data) {
      client.value = data
      // Fetch cases
      const cases = await window.api.cases.getByClientId(clientId.value)
      linkedCases.value = safeArray(cases)
      // Fetch agencies
      const agencies = await window.api.agencies.getByClientId(clientId.value)
      linkedAgencies.value = safeArray(agencies)

      // Calculate next client
      await calculateNextClientId()
    }
  } catch (err) {
    console.error('Failed to load client details:', err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadAllData()
})

watch(clientId, async (newId) => {
  if (newId) {
    await loadAllData()
  }
})

const openEditDialog = (): void => {
  if (!client.value) return
  editClientItem.value = JSON.parse(JSON.stringify(client.value))
  showEditDialog.value = true
}

const executeSave = async (): Promise<void> => {
  if (!client.value) return
  saving.value = true
  try {
    const dataToSave = JSON.parse(JSON.stringify(editClientItem.value))
    await window.api.clients.update(clientId.value, dataToSave)
    client.value = await window.api.clients.getById(clientId.value)
    showSnackbar('تم تحديث بيانات الموكل بنجاح', 'success')
    showEditDialog.value = false
  } catch (e: unknown) {
    showSnackbar('فشل تحديث بيانات الموكل: ' + (e as Error).message, 'error')
  } finally {
    saving.value = false
  }
}

const handleSave = async (): Promise<void> => {
  openConfirm({
    title: 'تأكيد حفظ تعديلات الموكل',
    message: 'هل أنت متأكد من رغبتك في حفظ التعديلات على ملف الموكل؟',
    color: 'success',
    confirmButtonColor: 'accent',
    icon: 'user-check',
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

const getClientTypeColor = (type?: string) => {
  const map: Record<string, string> = {
    فرد: 'accent',
    شركة: 'indigo',
    مؤسسة: 'blue-grey',
    'جهة حكومية': 'brown'
  }
  return map[type || ''] || 'accent'
}

const getStatusColor = (status?: string) => {
  const map: Record<string, string> = {
    'قيد النظر': 'success',
    مغلقة: 'error',
    'جاري العمل': 'indigo'
  }
  return map[status || ''] || 'grey'
}

const formatDate = (date?: string) => {
  if (!date) return '---'
  return new Date(date).toLocaleDateString('ar-SA')
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

.ltr-text {
  direction: ltr;
  display: inline-block;
}

.leading-relaxed {
  line-height: 1.8 !important;
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

.min-h-100 {
  min-height: 100px;
}

.return-btn-gold {
  border: 1px solid #e9c349 !important;
  color: var(--gold-royal) !important;
  box-shadow: 0 4px 12px 0 rgba(233, 195, 73, 0.2) !important;
  background-color: transparent !important;
  transition: var(--transition-smooth) !important;
}

[data-theme='dark'] .return-btn-gold {
  color: #e9c349 !important;
  box-shadow: 0 4px 15px 0 rgba(233, 195, 73, 0.15) !important;
}

.return-btn-gold:hover {
  background-color: rgba(233, 195, 73, 0.08) !important;
  transform: translateY(-1px);
}

.next-btn-gold {
  border: 1px solid #e9c349 !important;
  color: var(--gold-royal) !important;
  box-shadow: 0 4px 12px 0 rgba(233, 195, 73, 0.2) !important;
  background-color: transparent !important;
  transition: var(--transition-smooth) !important;
}

[data-theme='dark'] .next-btn-gold {
  color: #e9c349 !important;
  box-shadow: 0 4px 15px 0 rgba(233, 195, 73, 0.15) !important;
}

.next-btn-gold:hover {
  background-color: rgba(233, 195, 73, 0.08) !important;
  transform: translateY(-1px);
}
</style>
