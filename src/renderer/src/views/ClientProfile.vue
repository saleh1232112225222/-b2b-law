<template>
  <v-container fluid class="pa-6 rtl">
    <MobileClientProfile
      v-if="isMobile"
      :loading="loading"
      :client="client"
      :linked-cases="linkedCases"
      :linked-agencies="linkedAgencies"
      @edit="openEditDialog"
    />
    <template v-else>
      <!-- Navigation Buttons -->
      <div class="d-flex justify-space-between align-center mb-6">
        <v-btn
          variant="outlined"
          to="/clients"
          class="font-weight-black return-btn-gold premium-btn-gold-gradient"
        >
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
            <v-tab value="legal-services" class="font-weight-black text-gold py-6">
              <LucideIcon name="scale" :size="18" class="me-3" /> الخدمات القانونية
              <v-badge
                v-if="legalServicesSummary.total_services > 0"
                :content="legalServicesSummary.total_services"
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
                    <div
                      class="text-subtitle-1 font-weight-black text-gold mb-4 d-flex align-center"
                    >
                      <LucideIcon name="message-circle" :size="20" class="me-3 opacity-40" />
                      ملاحظات إضافية
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

              <v-row class="mt-6">
                <!-- Direct Contact Notes -->
                <v-col cols="12" md="6">
                  <v-card
                    elevation="0"
                    class="pa-8 glass-panel-light rounded-xl h-100 border-gold-alpha glass-card"
                  >
                    <div
                      class="text-subtitle-1 font-weight-black text-gold mb-4 d-flex align-center"
                    >
                      <LucideIcon name="notebook" :size="20" class="me-3 opacity-40" /> ملاحظات
                      التواصل المباشر
                    </div>
                    <v-textarea
                      v-model="directNotes"
                      rows="4"
                      variant="outlined"
                      class="glass-input mb-3 text-white"
                      placeholder="اكتب ملاحظات حول التواصل المباشر مع الموكل هنا..."
                      hide-details
                    ></v-textarea>
                    <v-btn
                      color="gold"
                      variant="flat"
                      block
                      class="font-weight-black premium-btn-gold-gradient mt-2"
                      :loading="savingDirectNotes"
                      @click="saveDirectNotes"
                    >
                      <LucideIcon name="save" :size="18" class="me-2" /> حفظ الملاحظات
                    </v-btn>
                  </v-card>
                </v-col>

                <!-- Interaction Timeline -->
                <v-col cols="12" md="6">
                  <v-card
                    elevation="0"
                    class="pa-8 glass-panel-light rounded-xl h-100 border-gold-alpha glass-card"
                  >
                    <div
                      class="text-subtitle-1 font-weight-black text-gold mb-4 d-flex align-center"
                    >
                      <LucideIcon name="history" :size="20" class="me-3 opacity-40" /> سجل تفاعلات
                      الموكل (Timeline)
                    </div>
                    <v-timeline density="compact" side="end" class="timeline-compact">
                      <v-timeline-item
                        v-for="(item, idx) in interactionTimeline"
                        :key="idx"
                        :dot-color="item.color"
                        size="small"
                      >
                        <template #opposite>
                          <span class="text-caption text-grey">{{ formatDate(item.date) }}</span>
                        </template>
                        <div class="d-flex flex-column text-right">
                          <span class="text-caption font-weight-bold text-white">{{
                            item.title
                          }}</span>
                          <span class="text-caption text-grey">{{ item.description }}</span>
                          <span class="text-tiny text-grey-darken-2 mt-1">{{
                            formatDate(item.date)
                          }}</span>
                        </div>
                      </v-timeline-item>
                      <v-timeline-item
                        v-if="interactionTimeline.length === 0"
                        dot-color="grey"
                        size="small"
                      >
                        <div class="text-caption text-grey text-right">لا توجد تفاعلات مسجلة</div>
                      </v-timeline-item>
                    </v-timeline>
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
                    {{ formatDateOnly(item.date) }} مـ
                  </div>
                </template>
              </v-data-table>
            </v-window-item>

            <!-- Legal Services Tab -->
            <v-window-item value="legal-services">
              <!-- Financial Summary Cards -->
              <v-row class="mb-6" dense>
                <v-col cols="12" sm="6" md="3">
                  <v-card
                    elevation="0"
                    class="pa-5 rounded-xl border border-gold border-opacity-20 glass-card text-center"
                  >
                    <div class="text-caption font-weight-black text-gold opacity-60 mb-2">
                      إجمالي الخدمات
                    </div>
                    <div class="text-h5 font-weight-black text-white">
                      {{ legalServicesSummary.total_services || 0 }}
                    </div>
                  </v-card>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <v-card
                    elevation="0"
                    class="pa-5 rounded-xl border border-success border-opacity-20 glass-card text-center"
                  >
                    <div class="text-caption font-weight-black text-gold opacity-60 mb-2">
                      المقابل المالي الكلي
                    </div>
                    <div class="text-h5 font-weight-black text-success">
                      {{ formatCurrency(legalServicesSummary.total_with_tax || 0) }}
                    </div>
                  </v-card>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <v-card
                    elevation="0"
                    class="pa-5 rounded-xl border border-accent border-opacity-20 glass-card text-center"
                  >
                    <div class="text-caption font-weight-black text-gold opacity-60 mb-2">
                      المحصل فعلياً
                    </div>
                    <div class="text-h5 font-weight-black text-accent">
                      {{ formatCurrency(legalServicesSummary.total_paid || 0) }}
                    </div>
                  </v-card>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <v-card
                    elevation="0"
                    class="pa-5 rounded-xl border border-error border-opacity-20 glass-card text-center"
                  >
                    <div class="text-caption font-weight-black text-gold opacity-60 mb-2">
                      المستحقات المتبقية
                    </div>
                    <div class="text-h5 font-weight-black text-error">
                      {{ formatCurrency(legalServicesSummary.total_remaining || 0) }}
                    </div>
                  </v-card>
                </v-col>
              </v-row>

              <!-- Legal Services Table -->
              <v-data-table
                :headers="legalServiceHeaders"
                :items="legalServicesList"
                class="bg-transparent premium-table"
                hover
                no-data-text="لا توجد خدمات قانونية مسجلة لهذا الموكل"
              >
                <template #[`item.engagement_number`]="{ item }">
                  <v-btn
                    variant="text"
                    color="accent"
                    class="px-0 font-weight-black text-decoration-underline ltr-text premium-btn-gold-gradient"
                    density="compact"
                    :to="'/legal-engagements/' + item.id"
                  >
                    {{ item.engagement_number }}
                  </v-btn>
                </template>
                <template #[`item.status_name`]="{ item }">
                  <v-chip
                    size="x-small"
                    :color="getLegalServiceStatusColor(item.status_id)"
                    variant="flat"
                    class="font-weight-black px-3 rounded-lg"
                  >
                    {{ item.status_name }}
                  </v-chip>
                </template>
                <template #[`item.financial_compensation`]="{ item }">
                  <div class="font-weight-black text-accent">
                    {{ formatCurrency(item.financial_compensation || 0) }}
                  </div>
                </template>
                <template #[`item.paid_amount`]="{ item }">
                  <div class="font-weight-black text-success">
                    {{ formatCurrency(item.paid_amount || 0) }}
                  </div>
                </template>
                <template #[`item.remaining_amount`]="{ item }">
                  <div class="font-weight-black text-error">
                    {{ formatCurrency(item.remaining_amount || 0) }}
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
          <v-card-title class="pa-6 border-b border-gold opacity-10 d-flex align-center">
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

          <v-card-text class="pa-8">
            <ClientForm v-model="editClientItem" v-model:valid="formValid" />
          </v-card-text>

          <v-divider class="border-gold opacity-10" />
          <v-card-actions class="pa-6 bg-black-alpha">
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
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Client, Case, Agency } from '../types'
import { safeArray, safeLength, formatDateOnly } from '../utils/safe'
import ClientForm from '../components/ClientForm.vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import LucideIcon from '../components/common/LucideIcon.vue'
import { useConfirmDialog } from '../composables/useConfirmDialog'
import { useClientsStore } from '../stores/clients'
import { useMobileLayout } from '../composables/useMobileLayout'
import MobileClientProfile from '../components/mobile/MobileClientProfile.vue'

const route = useRoute()
const clientId = computed(() => route.params.id as string)
const nextClientId = ref<string | null>(null)
const clientsStore = useClientsStore()
const { isMobile } = useMobileLayout()

const loading = ref(true)
const tab = ref('overview')
const client = ref<Client | null>(null)
const linkedCases = ref<Case[]>([])
const linkedAgencies = ref<Agency[]>([])
const legalServicesList = ref<any[]>([])
const legalServicesSummary = ref<any>({
  total_services: 0,
  total_compensation: 0,
  total_tax: 0,
  total_with_tax: 0,
  total_paid: 0,
  total_remaining: 0,
  completed_count: 0,
  in_progress_count: 0,
  pending_count: 0
})
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

const legalServiceHeaders = [
  { title: 'رقم الخدمة', key: 'engagement_number', align: 'start' as const },
  { title: 'الخدمة', key: 'service_type_name', align: 'start' as const },
  { title: 'التصنيف', key: 'category_name', align: 'start' as const },
  { title: 'الحالة', key: 'status_name', align: 'center' as const, width: '120px' },
  { title: 'المقابل المالي', key: 'financial_compensation', align: 'end' as const },
  { title: 'المحصل', key: 'paid_amount', align: 'end' as const },
  { title: 'المتبقي', key: 'remaining_amount', align: 'end' as const }
]

const getLegalServiceStatusColor = (statusId: string) => {
  if (statusId === 'status_completed') return 'success'
  if (statusId === 'status_in_progress') return 'info'
  if (statusId === 'status_cancelled') return 'error'
  return 'warning'
}

const directNotes = ref('')
const savingDirectNotes = ref(false)

const interactionTimeline = computed(() => {
  const events: Array<{ date: string; title: string; description: string; color: string }> = []
  if (client.value?.created_at) {
    events.push({
      date: client.value.created_at,
      title: 'انضمام الموكل',
      description: 'تم إنشاء ملف الموكل في النظام',
      color: 'info'
    })
  }
  safeArray(linkedCases.value).forEach((c: any) => {
    if (c.created_at) {
      events.push({
        date: c.created_at,
        title: 'قضية مرتبطة',
        description: `ربط القضية رقم: ${c.case_number}`,
        color: 'success'
      })
    }
  })
  safeArray(linkedAgencies.value).forEach((a: any) => {
    if (a.created_at) {
      events.push({
        date: a.created_at,
        title: 'وكالة مسجلة',
        description: `ربط الوكالة رقم: ${a.agency_number || a.id}`,
        color: 'warning'
      })
    }
  })
  safeArray(legalServicesList.value).forEach((s: any) => {
    if (s.created_at) {
      events.push({
        date: s.created_at,
        title: 'خدمة قانونية',
        description: `بدء الخدمة: ${s.description || s.engagement_number}`,
        color: 'accent'
      })
    }
  })
  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

const saveDirectNotes = async () => {
  if (!client.value) return
  savingDirectNotes.value = true
  try {
    await window.api.clients.update(clientId.value, {
      ...(client.value as any),
      direct_notes: directNotes.value
    })
    ;(client.value as any).direct_notes = directNotes.value
    showSnackbar('تم حفظ ملاحظات التواصل بنجاح', 'success')
  } catch (err: any) {
    showSnackbar('فشل حفظ الملاحظات: ' + err.message, 'error')
  } finally {
    savingDirectNotes.value = false
  }
}

const loadAllData = async (): Promise<void> => {
  loading.value = true
  try {
    const data = await window.api.clients.getById(clientId.value)
    if (data) {
      client.value = data
      directNotes.value = (data as any).direct_notes || ''
      // Fetch cases
      const cases = await window.api.cases.getByClientId(clientId.value)
      linkedCases.value = safeArray(cases)
      // Fetch agencies
      const agencies = await window.api.agencies.getByClientId(clientId.value)
      linkedAgencies.value = safeArray(agencies)

      // Fetch legal services summary for this client
      try {
        const legalData = await window.api.legalServices.getClientSummary(clientId.value)
        if (legalData) {
          legalServicesSummary.value = legalData.summary || legalServicesSummary.value
          legalServicesList.value = legalData.services || []
        }
      } catch (e) {
        console.warn('Failed to load legal services for client:', e)
      }

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

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0
  }).format(val)
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
