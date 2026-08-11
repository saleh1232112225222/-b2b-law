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
          class="font-weight-black rounded-lg px-8 premium-btn-gold-gradient h-100"
          @click="openAddDialog"
        >
          <LucideIcon name="plus" :size="20" class="me-3" /> تسجيل وكالة جديدة
        </v-btn>
      </v-col>
    </v-row>

    <!-- Search & Filter Controls -->
    <v-row dense class="mb-8 align-center">
      <!-- Search Input -->
      <v-col cols="12" md="7">
        <v-text-field
          v-model="searchQuery"
          placeholder="ابحث برقم الوكالة، اسم الموكل، أو مصدر الوكالة..."
          variant="solo"
          flat
          class="premium-search-field"
          hide-details
        >
          <template #prepend-inner>
            <LucideIcon name="search" :size="20" class="text-gold opacity-70" />
          </template>
        </v-text-field>
      </v-col>

      <!-- Filter Tabs -->
      <v-col cols="12" md="5" class="d-flex justify-md-end justify-center mt-4 mt-md-0">
        <v-btn-toggle
          v-model="statusFilter"
          mandatory
          class="premium-toggle-group rounded-xl overflow-hidden border border-gold border-opacity-10"
          density="comfortable"
          selected-class="active-toggle-btn"
        >
          <v-btn value="all" class="font-weight-black px-5 text-body-2">
            الكل ({{ totalCount }})
          </v-btn>
          <v-btn value="active" class="font-weight-black px-5 text-body-2 text-success">
            سارية ({{ activeCount }})
          </v-btn>
          <v-btn value="expired" class="font-weight-black px-5 text-body-2 text-error">
            منتهية ({{ expiredCount }})
          </v-btn>
        </v-btn-toggle>
      </v-col>
    </v-row>

    <!-- Agencies Table (Desktop) -->
    <v-card v-if="!isMobile" elevation="0" class="glass-card overflow-hidden min-h-500 glass-card">
      <v-data-table
        :headers="headers"
        :items="filteredAgencies"
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

        <!-- Headers removed to use standard table headers -->

        <template #[`item.agency_number`]="{ item }">
          <div class="d-flex align-center justify-center">
            <v-btn
              variant="text"
              color="accent"
              class="px-0 font-weight-black text-body-2 ltr-text"
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
            color="accent"
            class="px-0 font-weight-black text-body-2"
            :to="'/clients/' + item.client_id"
            density="compact"
          >
            {{ item.client_name || '-' }}
          </v-btn>
          <div v-else class="font-weight-black text-body-2 text-accent">
            {{ item.client_name || '-' }}
          </div>
        </template>

        <template #[`item.date`]="{ item }">
          <div v-if="isValidDate(String(item.date))" class="d-flex flex-column align-center">
            <div class="text-body-2 font-weight-black text-ebony">
              {{ formatDate(String(item.date)) }} مـ
            </div>
            <div class="text-caption font-weight-bold text-grey-darken-1 mt-1">
              {{ formatHijri(String(item.date)) }} هـ
            </div>
          </div>
          <span v-else class="text-body-2 text-grey-darken-1 opacity-50 italic">---</span>
        </template>

        <template #[`item.expiry_date`]="{ item }">
          <div v-if="isValidDate(String(item.expiry_date))" class="d-flex flex-column align-center">
            <div
              class="text-body-2 font-weight-black"
              :class="
                getAgencyStatus(item.expiry_date).color === 'error' ? 'text-error' : 'text-ebony'
              "
            >
              {{ formatDate(String(item.expiry_date)) }} مـ
            </div>
            <div
              class="text-caption font-weight-bold mt-1"
              :class="
                getAgencyStatus(item.expiry_date).color === 'error'
                  ? 'text-error'
                  : 'text-grey-darken-1'
              "
            >
              {{ formatHijri(String(item.expiry_date)) }} هـ
            </div>
          </div>
          <span v-else class="text-body-2 text-grey-darken-1 opacity-50 italic">---</span>
        </template>

        <template #[`item.court`]="{ item }">
          <div class="d-flex align-center justify-center text-body-2 font-weight-bold text-ebony">
            <LucideIcon name="landmark" :size="16" class="text-accent me-2" />
            {{ item.court || 'كتابة عدل عامة' }}
          </div>
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-center gap-2">
            <v-btn
              icon
              variant="text"
              color="accent"
              size="small"
              class="opacity-80"
              @click="openPreviewDialog(item)"
            >
              <LucideIcon name="eye" :size="18" />
              <v-tooltip activator="parent" location="top">معاينة الوكالة</v-tooltip>
            </v-btn>
            <v-btn
              icon
              variant="text"
              color="primary"
              size="small"
              class="opacity-80"
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
              class="opacity-80"
              @click="confirmDelete(item)"
            >
              <LucideIcon name="trash-2" :size="18" />
              <v-tooltip activator="parent" location="top">حذف سجل الوكالة</v-tooltip>
            </v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Agencies Mobile Cards View (Premium Redesign) -->
    <div v-else class="mobile-view-container">
      <div v-if="store.loading" class="d-flex flex-column gap-4 px-2">
        <v-skeleton-loader
          v-for="n in 3"
          :key="n"
          type="os-card"
          class="glass-card mb-4 rounded-xl bg-transparent"
        />
      </div>

      <div
        v-else-if="filteredAgencies.length === 0"
        class="text-center py-16 glass-card rounded-xl mx-2"
      >
        <div class="empty-state-icon mb-4">
          <LucideIcon name="file-question" :size="48" class="text-gold opacity-20" />
        </div>
        <div class="text-h6 text-gold opacity-40 font-weight-black">
          لا توجد وكالات مطابقة لخيارات الفرز
        </div>
      </div>

      <div v-else class="mobile-cards-container d-flex flex-column gap-5 px-2">
        <v-card
          v-for="item in filteredAgencies"
          :key="item.id"
          class="poa-mobile-card mb-2 rounded-xl border-gold border-opacity-10 overflow-hidden"
          elevation="12"
          @click="openPreviewDialog(item)"
        >
          <div class="pa-4">
            <!-- Card Header: Number & Status -->
            <div class="d-flex justify-space-between align-start mb-5">
              <div class="d-flex align-center">
                <div class="agency-icon-box pa-2 rounded-lg me-3">
                  <LucideIcon name="file-text" :size="22" class="text-gold" />
                </div>
                <div>
                  <div class="text-tiny text-visible-low font-weight-bold mb-0">رقم الوكالة</div>
                  <div class="text-h6 font-weight-black text-visible-high ltr-text ls-1">
                    {{ item.agency_number }}
                  </div>
                </div>
              </div>
              <v-chip
                :color="getAgencyStatus(item.expiry_date).color"
                variant="flat"
                size="small"
                class="font-weight-black rounded-lg px-3 shadow-sm status-chip"
              >
                <LucideIcon
                  :name="getAgencyStatus(item.expiry_date).icon"
                  :size="12"
                  class="me-1"
                />
                {{ getAgencyStatus(item.expiry_date).label }}
              </v-chip>
            </div>

            <!-- Client Info: Highlighted Section -->
            <div class="client-info-section pa-3 rounded-lg mb-5">
              <div class="text-tiny text-visible-low font-weight-bold mb-1">
                الموكل صاحب الصلاحية
              </div>
              <div class="text-body-1 font-weight-black text-visible-high d-flex align-center">
                <LucideIcon name="user" :size="16" class="me-2 text-gold opacity-60" />
                {{ item.client_name || 'غير محدد' }}
              </div>
            </div>

            <!-- Dates Section: Grid Layout -->
            <v-row dense class="mb-5">
              <v-col cols="6">
                <div class="poa-date-item pa-2 rounded-lg">
                  <div class="text-tiny text-visible-low font-weight-bold mb-1">تاريخ الاعتماد</div>
                  <div class="text-caption font-weight-black text-visible-high mb-1">
                    {{ formatDate(String(item.date)) }} مـ
                  </div>
                  <div class="text-tiny font-weight-bold text-accent">
                    {{ formatHijri(String(item.date)) }} هـ
                  </div>
                </div>
              </v-col>
              <v-col cols="6">
                <div class="poa-date-item pa-2 rounded-lg">
                  <div class="text-tiny text-visible-low font-weight-bold mb-1">تاريخ الانتهاء</div>
                  <div class="text-caption font-weight-black text-visible-high mb-1">
                    {{ item.expiry_date ? formatDate(String(item.expiry_date)) : '—' }} مـ
                  </div>
                  <div
                    class="text-tiny font-weight-bold"
                    :class="
                      getAgencyStatus(item.expiry_date).color === 'error'
                        ? 'text-error'
                        : 'text-warning'
                    "
                  >
                    {{ item.expiry_date ? formatHijri(String(item.expiry_date)) : '—' }} هـ
                  </div>
                </div>
              </v-col>
            </v-row>

            <!-- Bottom Actions and Source -->
            <div class="d-flex align-center pt-3 border-t border-gold border-opacity-10 mt-2">
              <div class="d-flex align-center opacity-60">
                <LucideIcon name="landmark" :size="14" class="text-gold me-2" />
                <span
                  class="text-tiny font-weight-black text-visible-high truncate-text"
                  style="max-width: 140px"
                >
                  {{ item.court || 'كتابة عدل عامة' }}
                </span>
              </div>
              <v-spacer />
              <div class="d-flex ga-1">
                <v-btn
                  icon
                  size="small"
                  variant="tonal"
                  color="gold"
                  class="rounded-lg action-btn-blur"
                  @click.stop="openEditDialog(item)"
                >
                  <LucideIcon name="edit-3" :size="16" />
                </v-btn>
                <v-btn
                  icon
                  size="small"
                  variant="tonal"
                  color="error"
                  class="rounded-lg action-btn-blur"
                  @click.stop="confirmDelete(item)"
                >
                  <LucideIcon name="trash-2" :size="16" />
                </v-btn>
              </div>
            </div>
          </div>
        </v-card>
      </div>
    </div>

    <!-- Preview Dialog -->
    <v-dialog
      v-model="previewDialog"
      width="90%"
      max-width="800"
      scrollable
      :fullscreen="isMobile"
      :transition="isMobile ? 'dialog-bottom-transition' : 'dialog-transition'"
    >
      <v-card class="poa-dialog-card overflow-hidden glass-card">
        <div class="poa-dialog-header d-flex align-center py-5 px-8">
          <div class="bg-accent-alpha pa-2 rounded-lg me-4">
            <LucideIcon name="eye" :size="24" class="text-accent" />
          </div>
          <span class="text-h5 font-weight-black text-gold">معاينة بيانات الوكالة</span>
          <v-spacer></v-spacer>
          <v-btn
            class="premium-btn-gold-gradient"
            variant="text"
            color="gold"
            icon
            @click="previewDialog = false"
          >
            <LucideIcon name="x" :size="24" />
          </v-btn>
        </div>

        <v-card-text class="pa-8 modal-scrollable poa-dialog-body">
          <v-row dense>
            <v-col cols="12" md="6">
              <div class="detail-row mb-6">
                <span class="poa-preview-label mb-1">الرقم المرجعي الرسمي</span>
                <span class="text-h6 font-weight-black poa-preview-text d-block ltr-text">{{
                  previewItem?.agency_number || '—'
                }}</span>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="detail-row mb-6">
                <span class="poa-preview-label mb-1">الموكل صاحب الوكالة</span>
                <span class="text-h6 font-weight-black poa-preview-text d-block">{{
                  previewItem?.client_name || '—'
                }}</span>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="detail-row mb-6">
                <span class="poa-preview-label mb-1">تاريخ الاعتماد</span>
                <div class="d-flex align-center">
                  <span class="text-body-1 poa-preview-text font-weight-black"
                    >{{ previewItem?.date || '—' }} مـ</span
                  >
                  <v-chip
                    v-if="previewItem?.date"
                    size="x-small"
                    color="accent"
                    variant="flat"
                    class="ms-3 font-weight-black"
                  >
                    {{ formatHijri(String(previewItem?.date)) }} هـ
                  </v-chip>
                </div>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="detail-row mb-6">
                <span class="poa-preview-label mb-1">تاريخ الانتهاء</span>
                <div class="d-flex align-center">
                  <span class="text-body-1 poa-preview-text font-weight-black"
                    >{{ previewItem?.expiry_date || '—' }} مـ</span
                  >
                  <v-chip
                    v-if="previewItem?.expiry_date"
                    size="x-small"
                    color="warning"
                    variant="flat"
                    class="ms-3 font-weight-black"
                  >
                    {{ formatHijri(String(previewItem?.expiry_date)) }} هـ
                  </v-chip>
                </div>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="detail-row mb-6">
                <span class="poa-preview-label mb-1">مصدر الوكالة / جهة الإصدار</span>
                <span class="text-body-1 poa-preview-text font-weight-black d-block">{{
                  previewItem?.court || '—'
                }}</span>
              </div>
            </v-col>
            <v-col cols="12">
              <div class="detail-row mb-2">
                <span class="poa-preview-label mb-2">نطاق الوكالة / الصلاحيات الممنوحة</span>
                <div class="poa-preview-box pa-4 rounded-lg leading-relaxed shadow-sm">
                  {{ previewItem?.notes || 'لا توجد ملاحظات مسجلة لنطاق هذه الوكالة' }}
                </div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider class="border-gold opacity-20"></v-divider>
        <v-card-actions class="pa-8 poa-dialog-footer">
          <v-btn
            variant="flat"
            color="grey-darken-3"
            class="px-8 font-weight-black text-white premium-btn-gold-gradient"
            @click="previewDialog = false"
            >إغلاق</v-btn
          >
          <v-spacer></v-spacer>
          <v-btn
            v-if="previewItem?.client_id"
            color="accent"
            variant="tonal"
            class="px-8 font-weight-black rounded-lg me-3 premium-btn-gold-gradient"
            :to="'/clients/' + String(previewItem?.client_id)"
          >
            <LucideIcon name="user" :size="18" class="me-2" /> ملف الموكل
          </v-btn>
          <v-btn
            color="accent"
            variant="flat"
            size="large"
            class="px-12 font-weight-black rounded-lg premium-btn-gold-gradient"
            @click="handleEditFromPreview"
          >
            <LucideIcon name="edit-3" :size="18" class="me-2" /> تعديل البيانات
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add/Edit Agency Dialog -->
    <v-dialog
      v-model="showDialog"
      width="92%"
      max-width="950"
      persistent
      scrollable
      :fullscreen="isMobile"
      :transition="isMobile ? 'dialog-bottom-transition' : 'dialog-transition'"
    >
      <v-card class="poa-dialog-card overflow-hidden glass-card">
        <div class="poa-dialog-header d-flex align-center py-5 px-8">
          <div class="glass-panel-light pa-2 rounded-lg me-4 border-gold border-opacity-20">
            <LucideIcon :name="isEditing ? 'edit-3' : 'card-plus'" :size="24" class="text-accent" />
          </div>
          <span class="text-h5 font-weight-black text-gold">
            {{ isEditing ? 'تعديل بيانات الوكالة الشرعية' : 'تسجيل وكالة شرعية جديدة' }}
          </span>
          <v-spacer></v-spacer>
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
          <v-form ref="formRef" v-model="formValid" lazy-validation>
            <v-row dense class="ga-y-3">
              <v-col cols="12" md="7">
                <label class="mb-2 font-weight-black text-gold">الموكل صاحب الوكالة*</label>
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
              <v-col cols="12" md="5">
                <label class="mb-2 font-weight-black text-gold">رقم الوكالة الرسمي*</label>
                <v-text-field
                  v-model="editItem.agency_number"
                  placeholder="مثال: 44123456"
                  variant="outlined"
                  class="glass-input"
                  :rules="[(v) => !!v || 'رقم الوكالة مطلوب للتحقق النظامي']"
                  required
                />
              </v-col>
              <v-col cols="12" md="6">
                <label class="mb-2 font-weight-black text-gold">تاريخ صدور الوكالة*</label>
                <DualDatePicker v-model="editItem.date" />
              </v-col>
              <v-col cols="12" md="6">
                <label class="mb-2 font-weight-black text-gold">تاريخ انتهاء الوكالة</label>
                <DualDatePicker v-model="editItem.expiry_date" />
              </v-col>
              <v-col cols="12">
                <label class="mb-2 font-weight-black text-gold"
                  >جهة الإصدار (كتابة عدل / منصة ناجز)</label
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
                <label class="mb-2 font-weight-black text-gold"
                  >نطاق الوكالة / الصلاحيات الممنوحة</label
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
        <v-card-actions class="pa-8 poa-dialog-footer">
          <v-btn
            variant="flat"
            size="large"
            class="px-8 font-weight-black premium-button-highlight action-btn-unified premium-btn-gold-gradient"
            @click="showDialog = false"
            >إلغاء</v-btn
          >
          <v-spacer></v-spacer>
          <v-btn
            variant="flat"
            size="large"
            class="px-12 font-weight-black premium-button-highlight action-btn-unified h-56 premium-btn-gold-gradient"
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
import { ref, onMounted, computed } from 'vue'
import { useDisplay } from 'vuetify'
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

const { mobile, width } = useDisplay()
const isMobile = computed(() => mobile.value || width.value <= 1023)

const searchQuery = ref('')
const statusFilter = ref<'all' | 'active' | 'expired'>('all')

const getAgencyStatus = (expiryDateStr: string | undefined) => {
  if (!expiryDateStr || !isValidDate(expiryDateStr)) {
    return { label: 'سارية', color: 'success', icon: 'check-circle' }
  }
  const expiryDate = new Date(expiryDateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiryDate.setHours(0, 0, 0, 0)

  const diffTime = expiryDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return { label: 'منتهية', color: 'error', icon: 'alert-octagon' }
  if (diffDays <= 30) return { label: 'تنتهي قريباً', color: 'warning', icon: 'alert-triangle' }
  return { label: 'سارية', color: 'success', icon: 'check-circle' }
}

const filteredAgencies = computed(() => {
  let list = safeArray(store.agencies)

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    list = list.filter((item: Agency) => {
      const agencyNum = String(item.agency_number || '').toLowerCase()
      const clientName = String(item.client_name || '').toLowerCase()
      const courtName = String(item.court || '').toLowerCase()
      return agencyNum.includes(query) || clientName.includes(query) || courtName.includes(query)
    })
  }

  if (statusFilter.value === 'active') {
    list = list.filter((item: Agency) => getAgencyStatus(item.expiry_date).color !== 'error')
  } else if (statusFilter.value === 'expired') {
    list = list.filter((item: Agency) => getAgencyStatus(item.expiry_date).color === 'error')
  }

  return list
})

const totalCount = computed(() => safeArray(store.agencies).length)
const activeCount = computed(
  () =>
    safeArray(store.agencies).filter(
      (item: Agency) => getAgencyStatus(item.expiry_date).color !== 'error'
    ).length
)
const expiredCount = computed(
  () =>
    safeArray(store.agencies).filter(
      (item: Agency) => getAgencyStatus(item.expiry_date).color === 'error'
    ).length
)

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
:root {
  --glass-bg-soft: rgba(15, 23, 42, 0.4);
  --glass-border: rgba(233, 195, 73, 0.15);
  --color-background: #020617;
}

.premium-search-field :deep(.v-field) {
  background: rgba(255, 255, 255, 0.03) !important;
  border-radius: 18px !important;
  border: 1px solid rgba(233, 195, 73, 0.1) !important;
  transition: all 0.3s ease;
}
.premium-search-field :deep(.v-field--focused) {
  border-color: rgba(233, 195, 73, 0.4) !important;
  background: rgba(255, 255, 255, 0.06) !important;
}

.premium-toggle-group {
  background: rgba(255, 255, 255, 0.02) !important;
  backdrop-filter: blur(10px);
}
.active-toggle-btn {
  background: linear-gradient(135deg, #e9c349 0%, #c49a21 100%) !important;
  color: #020617 !important;
  font-weight: 900 !important;
}

.poa-mobile-card {
  background: rgba(30, 41, 59, 0.45) !important;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(233, 195, 73, 0.12) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.agency-icon-box {
  background: rgba(233, 195, 73, 0.1);
  border: 1px solid rgba(233, 195, 73, 0.2);
}

.client-info-section {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(233, 195, 73, 0.05);
}

.poa-date-item {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.action-btn-blur {
  background: rgba(255, 255, 255, 0.05) !important;
  backdrop-filter: blur(5px);
}

.poa-table :deep(th) {
  background: rgba(233, 195, 73, 0.05) !important;
  color: #e9c349 !important;
  font-weight: 900 !important;
  font-size: 0.75rem !important;
  border-bottom: 1px solid rgba(233, 195, 73, 0.2) !important;
}

.poa-dialog-card {
  background: rgba(15, 23, 42, 0.98) !important;
  backdrop-filter: blur(30px);
  border: 1px solid rgba(233, 195, 73, 0.2) !important;
}

.ls-1 {
  letter-spacing: 1px;
}

/* Mobile Bottom Sheet Styles */
@media (max-width: 1023px) {
  :deep(.v-dialog > .v-overlay__content) {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    position: fixed !important;
    bottom: 0 !important;
    border-radius: 28px 28px 0 0 !important;
    height: auto !important;
    max-height: 92vh !important;
    overflow-y: auto !important;
  }

  .poa-dialog-header {
    border-radius: 28px 28px 0 0 !important;
    position: sticky;
    top: 0;
    z-index: 2;
  }
}
</style>
