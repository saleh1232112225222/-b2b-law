<template>
  <v-container fluid class="pa-6 rtl">
    <MobileMemoranda
      v-if="isMobile"
      :items="safeArray(filteredMemos)"
      :loading="memorandaStore.loading"
      @add="openAddDialog"
    />
    <template v-else>
      <!-- Header -->
      <v-row dense class="mb-8 align-center">
        <v-col>
          <div class="d-flex align-center">
            <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
              <LucideIcon name="file-text" :size="36" class="text-accent" />
            </div>
            <div>
              <h1 class="text-h5 font-weight-black text-gold mb-1">المذكرات واللوائح القانونية</h1>
              <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
                إدارة وتحرير المذكرات القضائية والردود الجوابية المرتبطة بالقضايا
              </p>
            </div>
          </div>
        </v-col>
        <v-col cols="auto" class="d-flex ga-3">
          <!-- Main Export Menu -->
          <v-menu transition="scale-transition">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                color="gold"
                variant="tonal"
                size="large"
                class="font-weight-black rounded-lg px-6 h-100 premium-btn-gold-gradient"
              >
                <LucideIcon name="share-2" :size="18" class="me-2" /> تصدير
              </v-btn>
            </template>
            <v-list class="glass-card border-gold opacity-10 py-2">
              <v-list-item @click="exportAllPdf">
                <template #prepend>
                  <LucideIcon name="file-type-2" :size="18" class="text-error me-3" />
                </template>
                <v-list-item-title class="font-weight-black text-white"
                  >تصدير كـ PDF</v-list-item-title
                >
              </v-list-item>
              <v-list-item @click="exportCsv">
                <template #prepend>
                  <LucideIcon name="file-spreadsheet" :size="18" class="text-success me-3" />
                </template>
                <v-list-item-title class="font-weight-black text-white"
                  >تصدير كـ CSV</v-list-item-title
                >
              </v-list-item>
            </v-list>
          </v-menu>

          <v-btn
            color="accent"
            size="large"
            class="font-weight-black rounded-lg px-8 premium-lift h-100 premium-btn-gold-gradient"
            @click="openAddDialog"
          >
            <LucideIcon name="plus" :size="20" class="me-3" /> إنشاء مذكرة جديدة
          </v-btn>
        </v-col>
      </v-row>

      <!-- Search Bar -->
      <v-card elevation="0" class="glass-card mb-8 pa-5 glass-card">
        <v-row dense align="center">
          <v-col cols="12" md="6">
            <v-text-field
              v-model="searchQuery"
              placeholder="بحث في المذكرات، رقم القضية، أو المحتوى..."
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
          <v-spacer />
          <v-col cols="auto">
            <div
              class="glass-panel-light px-6 py-2 rounded-lg border-gold opacity-10 d-flex align-center"
            >
              <span class="text-gold opacity-50 font-weight-black me-3 text-tiny"
                >إجمالي المذكرات</span
              >
              <span class="text-h6 font-weight-black text-accent">{{ filteredMemos.length }}</span>
            </div>
          </v-col>
        </v-row>
      </v-card>

      <!-- Data Table -->
      <v-card elevation="0" class="glass-card overflow-hidden min-h-500 glass-card">
        <v-data-table
          :headers="headers"
          :items="filteredMemos"
          :loading="memorandaStore.loading"
          class="bg-transparent memoranda-table"
          hover
          density="comfortable"
          items-per-page-text="صفوف لكل صفحة:"
          no-data-text="لا يوجد مذكرات مسجلة حالياً"
          loading-text="جاري تحميل المذكرات واللوائح..."
        >
          <template #loading>
            <v-skeleton-loader type="table-row@10" class="bg-transparent"></v-skeleton-loader>
          </template>

          <template #[`header.memo_title`]="{ column }">
            <span class="font-weight-black text-gold opacity-70">{{ column.title }}</span>
          </template>
          <template #[`header.case_info`]="{ column }">
            <span class="font-weight-black text-gold opacity-70">{{ column.title }}</span>
          </template>
          <template #[`header.memo_date`]="{ column }">
            <span class="font-weight-black text-gold opacity-70">{{ column.title }}</span>
          </template>
          <template #[`header.memo_status`]="{ column }">
            <span class="font-weight-black text-gold opacity-70">{{ column.title }}</span>
          </template>

          <!-- Column: Memo Title/Label -->
          <template #[`item.memo_title`]="{ item }">
            <div class="d-flex align-center py-2">
              <div class="glass-panel-light pa-2 rounded-lg me-4 border-gold opacity-10">
                <LucideIcon :name="getMemoIcon(item.memo_type)" :size="24" class="text-accent" />
              </div>
              <div>
                <div
                  class="font-weight-black text-body-1 text-white hover-gold cursor-pointer"
                  @click="openPreviewDialog(item)"
                >
                  {{ item.memo_title }}
                </div>
                <div class="text-tiny text-gold opacity-50 font-weight-black">
                  {{ item.memo_label || item.memo_type }}
                </div>
              </div>
            </div>
          </template>

          <!-- Column: Case (Client vs Opponent) -->
          <template #[`item.case_info`]="{ item }">
            <div class="d-flex flex-column py-2">
              <div
                class="font-weight-black text-body-2 mb-1 d-flex align-center text-white opacity-80"
              >
                <LucideIcon name="briefcase" :size="14" class="me-2 text-gold opacity-50" />
                {{ item.case_number || 'مستقلة' }}
              </div>
              <div class="text-tiny d-flex align-center flex-wrap font-weight-black">
                <span class="text-accent">{{ item.client_name || '-' }}</span>
                <LucideIcon name="chevron-left" :size="12" class="mx-2 text-gold opacity-30" />
                <span class="text-error opacity-80">{{ item.opponent_name || '-' }}</span>
              </div>
            </div>
          </template>

          <!-- Column: Date -->
          <template #[`item.memo_date`]="{ item }">
            <div class="text-body-2 font-weight-black text-white opacity-70">
              {{ formatDate(item.memo_date) }} مـ
            </div>
          </template>

          <!-- Column: Status -->
          <template #[`item.memo_status`]="{ item }">
            <v-chip
              :color="getStatusColor(item.memo_status)"
              size="small"
              class="font-weight-black rounded-md"
              variant="flat"
            >
              {{ item.memo_status || 'مسودة' }}
            </v-chip>
          </template>

          <!-- Column: Actions -->
          <template #[`item.actions`]="{ item }">
            <div class="d-flex justify-end ga-2">
              <v-menu location="bottom end" transition="scale-transition">
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon
                    variant="text"
                    color="gold"
                    size="small"
                    class="opacity-50 hover-opacity-100 premium-btn-gold-gradient"
                  >
                    <LucideIcon name="more-vertical" :size="18" />
                  </v-btn>
                </template>
                <v-list class="glass-card border-gold opacity-10 py-2 min-w-180">
                  <v-list-item @click="openPreviewDialog(item)">
                    <template #prepend>
                      <LucideIcon name="eye" :size="18" class="text-accent me-3" />
                    </template>
                    <v-list-item-title class="font-weight-black text-white"
                      >معاينة رسمية</v-list-item-title
                    >
                  </v-list-item>
                  <v-list-item @click="openEditDialog(item)">
                    <template #prepend>
                      <LucideIcon name="edit-3" :size="18" class="text-gold me-3" />
                    </template>
                    <v-list-item-title class="font-weight-black text-white"
                      >تعديل المذكرة</v-list-item-title
                    >
                  </v-list-item>
                  <v-divider class="my-2 border-gold opacity-10"></v-divider>
                  <v-list-item @click="printSingle(item)">
                    <template #prepend>
                      <LucideIcon name="printer" :size="18" class="text-white opacity-60 me-3" />
                    </template>
                    <v-list-item-title class="font-weight-black text-white"
                      >طباعة فورية</v-list-item-title
                    >
                  </v-list-item>
                  <v-list-item @click="exportPdfSingle(item)">
                    <template #prepend>
                      <LucideIcon name="file-type-2" :size="18" class="text-error me-3" />
                    </template>
                    <v-list-item-title class="font-weight-black text-white"
                      >تصدير PDF</v-list-item-title
                    >
                  </v-list-item>
                  <v-divider class="my-2 border-gold opacity-10"></v-divider>
                  <v-list-item @click="confirmDelete(item)">
                    <template #prepend>
                      <LucideIcon name="trash-2" :size="18" class="text-error me-3" />
                    </template>
                    <v-list-item-title class="font-weight-black text-error"
                      >حذف المذكرة</v-list-item-title
                    >
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>
          </template>
        </v-data-table>
      </v-card>
    </template>

    <!-- Preview Dialog -->
    <v-dialog v-model="showPreviewDialog" width="95%" max-width="1100" scrollable>
      <v-card class="glass-card overflow-hidden glass-card">
        <div class="glass-panel d-flex align-center py-5 px-8 border-b">
          <div class="glass-panel-light pa-2 rounded-lg me-4">
            <LucideIcon name="eye" :size="24" class="text-accent" />
          </div>
          <span class="text-h5 font-weight-black text-gold">معاينة المسودة (قالب رسمي)</span>
          <v-spacer></v-spacer>
          <v-btn
            variant="tonal"
            color="gold"
            class="font-weight-black me-4 rounded-lg premium-btn-gold-gradient"
            @click="printSingle(previewItem)"
          >
            <LucideIcon name="printer" :size="18" class="me-2" /> طباعة
          </v-btn>
          <v-btn
            class="premium-btn-gold-gradient"
            variant="text"
            color="gold"
            icon
            @click="showPreviewDialog = false"
          >
            <LucideIcon name="x" :size="24" />
          </v-btn>
        </div>

        <v-card-text class="pa-0 bg-white" style="height: 80vh">
          <div
            v-if="previewLoading"
            class="d-flex flex-column align-center justify-center h-100 bg-primary-dark"
          >
            <v-progress-circular
              indeterminate
              color="accent"
              size="64"
              width="6"
              class="mb-4"
            ></v-progress-circular>
            <div class="text-h6 font-weight-black text-gold opacity-60">
              جاري بناء القالب الموحد...
            </div>
          </div>
          <iframe
            v-else
            :srcdoc="previewHtml"
            style="width: 100%; height: 100%; border: none"
          ></iframe>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="showDialog" width="98%" max-width="1400" persistent scrollable>
      <v-card class="glass-card overflow-hidden glass-card">
        <div class="glass-panel d-flex align-center py-5 px-8 border-b">
          <div class="glass-panel-light pa-2 rounded-lg me-4">
            <LucideIcon :name="isEditing ? 'edit-3' : 'plus'" :size="24" class="text-accent" />
          </div>
          <span class="text-h5 font-weight-black text-gold">
            {{ isEditing ? 'تعديل المذكرة القضائية' : 'تحرير مذكرة قانونية جديدة' }}
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

        <v-card-text class="pa-8 bg-primary-dark modal-scrollable">
          <v-form ref="formRef" lazy-validation>
            <v-row>
              <!-- Info Section -->
              <v-col cols="12" md="4">
                <v-card
                  elevation="0"
                  class="glass-panel-light pa-6 rounded-xl border-gold opacity-10 mb-6 glass-card"
                >
                  <div class="text-subtitle-1 font-weight-black text-gold mb-6 d-flex align-center">
                    <LucideIcon name="link" :size="18" class="me-3 text-accent" /> ارتباط القضية
                  </div>

                  <label class="mb-2 font-weight-black text-gold">رقم القضية*</label>
                  <v-autocomplete
                    v-model="editItem.case_id"
                    :items="safeArray(casesStore.cases)"
                    item-title="case_number"
                    item-value="id"
                    placeholder="ابحث برقم القضية أو اسم الموكل..."
                    variant="outlined"
                    class="glass-input mb-4 glass-input"
                    density="comfortable"
                    :rules="[(v) => !!v || 'القضية مطلوبة لربط المذكرة']"
                    clearable
                    @update:model-value="onCaseChange"
                  >
                    <template #item="{ props, item }">
                      <v-list-item v-bind="props" class="py-3">
                        <template #prepend>
                          <LucideIcon name="briefcase" :size="18" class="text-accent me-4" />
                        </template>
                        <v-list-item-title class="font-weight-black text-white">{{
                          (item.raw as any).case_number
                        }}</v-list-item-title>
                        <v-list-item-subtitle class="text-gold opacity-50 font-weight-black mt-1"
                          >الموكل: {{ (item.raw as any).client_name }}</v-list-item-subtitle
                        >
                      </v-list-item>
                    </template>
                  </v-autocomplete>

                  <label class="mb-2 font-weight-black text-gold">الموكل</label>
                  <v-text-field
                    v-model="displayData.client_name"
                    variant="outlined"
                    readonly
                    class="glass-input opacity-60 mb-4 glass-input"
                  >
                    <template #prepend-inner>
                      <LucideIcon name="user" :size="20" class="text-gold opacity-50" />
                    </template>
                  </v-text-field>

                  <label class="mb-2 font-weight-black text-gold">الخصم</label>
                  <v-text-field
                    v-if="displayData.opponent_name || showOpponentField"
                    v-model="editItem.opponent_name"
                    variant="outlined"
                    :readonly="!showOpponentField"
                    class="glass-input mb-2 glass-input"
                  >
                    <template #prepend-inner>
                      <LucideIcon name="user-x" :size="20" class="text-gold opacity-50" />
                    </template>
                  </v-text-field>
                </v-card>

                <v-card
                  elevation="0"
                  class="glass-panel-light pa-6 rounded-xl border-gold opacity-10 glass-card"
                >
                  <div class="text-subtitle-1 font-weight-black text-gold mb-6 d-flex align-center">
                    <LucideIcon name="tag" :size="18" class="me-3 text-accent" /> بيانات القيد
                    والتصنيف
                  </div>

                  <label class="mb-2 font-weight-black text-gold">عنوان المذكرة*</label>
                  <v-text-field
                    v-model="editItem.memo_title"
                    placeholder="مثال: مذكرة جوابية على دعوى..."
                    variant="outlined"
                    class="glass-input mb-4 glass-input"
                    :rules="[(v) => !!v || 'عنوان المذكرة مطلوب']"
                  ></v-text-field>

                  <label class="mb-2 font-weight-black text-gold">نوع المذكرة</label>
                  <v-select
                    v-model="editItem.memo_type"
                    :items="memoTypes"
                    variant="outlined"
                    class="glass-input mb-4 glass-input"
                  ></v-select>

                  <label class="mb-2 font-weight-black text-gold">تاريخ المذكرة</label>
                  <DualDatePicker v-model="editItem.memo_date" class="mb-4" />

                  <label class="mb-2 font-weight-black text-gold">حالة المذكرة</label>
                  <v-select
                    v-model="editItem.memo_status"
                    :items="['مسودة', 'تحت التحرير', 'مقدمة', 'معتمدة']"
                    variant="outlined"
                    class="glass-input"
                  ></v-select>
                </v-card>
              </v-col>

              <!-- Editor Section -->
              <v-col cols="12" md="8">
                <v-card
                  elevation="0"
                  class="glass-card d-flex flex-column h-100 overflow-hidden min-h-600 glass-card"
                >
                  <div
                    class="glass-panel px-6 py-4 border-b d-flex align-center justify-space-between"
                  >
                    <div class="d-flex align-center">
                      <LucideIcon name="file-edit" :size="18" class="text-accent me-3" />
                      <span class="text-body-1 font-weight-black text-gold opacity-80"
                        >تحرير نص المذكرة</span
                      >
                    </div>
                    <div class="d-flex ga-2">
                      <v-btn
                        variant="tonal"
                        color="gold"
                        size="small"
                        class="font-weight-black rounded-lg premium-btn-gold-gradient"
                        @click="copyToClipboard"
                      >
                        <LucideIcon name="copy" :size="16" class="me-2" /> نسخ النص
                      </v-btn>
                    </div>
                  </div>
                  <v-textarea
                    v-model="editItem.memo_text"
                    variant="plain"
                    placeholder="ابدأ كتابة نص المذكرة القانونية هنا..."
                    auto-grow
                    rows="25"
                    class="memo-editor pa-8 text-white leading-loose font-serif text-h6 glass-input"
                    hide-details
                  ></v-textarea>
                </v-card>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-divider class="border-gold opacity-10"></v-divider>
        <v-card-actions class="pa-8 glass-panel">
          <v-btn
            variant="text"
            color="gold"
            class="px-8 font-weight-black opacity-50 premium-btn-gold-gradient"
            @click="showDialog = false"
            >إلغاء</v-btn
          >
          <v-spacer></v-spacer>
          <v-btn
            color="accent"
            variant="flat"
            size="large"
            class="px-12 font-weight-black rounded-lg premium-lift h-100 premium-btn-gold-gradient"
            :loading="saving"
            @click="handleSave"
          >
            <LucideIcon name="save" :size="20" class="me-3" />
            {{ isEditing ? 'حفظ التغييرات' : 'اعتماد وحفظ المذكرة' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" rounded="lg" elevation="24">
      <div class="d-flex align-center">
        <LucideIcon
          :name="snackbar.color === 'success' ? 'check-circle' : 'alert-circle'"
          :size="18"
          class="me-3"
        />
        <span class="font-weight-black">{{ snackbar.text }}</span>
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
import { useRoute } from 'vue-router'
import { useMobileLayout } from '../composables/useMobileLayout'
import { setFabAction, clearFabAction } from '../composables/useFabAction'
import MobileMemoranda from '../components/mobile/MobileMemoranda.vue'
import { useMemorandaStore } from '../stores/memoranda'
import { useCasesStore } from '../stores/cases'
import DualDatePicker from '../components/DualDatePicker.vue'
import { safeArray, isValidDate } from '../utils/safe'
import { Memorandum } from '../types/memorandum'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import { useConfirmDialog } from '../composables/useConfirmDialog'
import { useSearch } from '../composables/useSearch'
import LucideIcon from '../components/common/LucideIcon.vue'

const memorandaStore = useMemorandaStore()
const casesStore = useCasesStore()
const { confirmDialog, openConfirm, closeConfirm } = useConfirmDialog()

const { isMobile } = useMobileLayout()
const route = useRoute()

onMounted(() => {
  setFabAction(
    'mdi-file-document-edit',
    () => {
      showDialog.value = true
    },
    route.path
  )
})

onUnmounted(() => {
  clearFabAction()
})

const { search: searchQuery } = useSearch((_val: string) => {
  // Logic handled by computed
})

const showDialog = ref(false)
const showPreviewDialog = ref(false)
const previewItem = ref<Memorandum | null>(null)
const previewHtml = ref('')
const previewLoading = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const formRef = ref<any>(null)
const snackbar = ref({ show: false, text: '', color: 'success' })

const displayData = ref({
  client_name: '',
  opponent_name: ''
})

const showOpponentField = ref(false)

const editItem = ref<Partial<Memorandum>>({
  id: undefined,
  memo_title: '',
  case_id: undefined,
  memo_date: new Date().toISOString().split('T')[0],
  memo_type: 'مذكرة جوابية',
  memo_label: '',
  najiz_number: '',
  memo_status: 'مسودة',
  opponent_name: '',
  memo_text: '',
  is_archived: 0
})

const memoTypes = [
  'مذكرة دعوى',
  'مذكرة جوابية',
  'مذكرة تعقيبية',
  'صحيفة دعوى',
  'مذكرة استئناف',
  'لائحة اعتراضية',
  'أخرى'
]

const headers = [
  { title: 'المذكرة / اللائحة', key: 'memo_title', align: 'start' as const },
  { title: 'القضية والأطراف', key: 'case_info', align: 'start' as const },
  { title: 'التاريخ', key: 'memo_date', align: 'start' as const, width: '130px' },
  { title: 'الحالة', key: 'memo_status', align: 'center' as const, width: '110px' },
  { title: 'إجراءات', key: 'actions', sortable: false, align: 'end' as const, width: '80px' }
]

const filteredMemos = computed(() => {
  const q = String(searchQuery.value || '')
    .toLowerCase()
    .trim()
  if (!q) return memorandaStore.memoranda
  return memorandaStore.memoranda.filter(
    (m) =>
      m.memo_title?.toLowerCase().includes(q) ||
      m.case_number?.toLowerCase().includes(q) ||
      m.memo_text?.toLowerCase().includes(q) ||
      m.client_name?.toLowerCase().includes(q) ||
      m.opponent_name?.toLowerCase().includes(q)
  )
})

onMounted(async () => {
  await Promise.all([memorandaStore.fetchAll(), casesStore.fetchAllCases()])
})

const onCaseChange = (caseId: any) => {
  if (!caseId) {
    displayData.value.client_name = ''
    displayData.value.opponent_name = ''
    editItem.value.opponent_name = ''
    showOpponentField.value = false
    return
  }

  const selectedCase = casesStore.cases.find((c) => c.id === caseId)
  if (selectedCase) {
    displayData.value.client_name = selectedCase.client_name || '-'
    displayData.value.opponent_name = selectedCase.opponent_name || ''
    editItem.value.opponent_name = selectedCase.opponent_name || ''
    showOpponentField.value = !selectedCase.opponent_name
  }
}

const openAddDialog = () => {
  isEditing.value = false
  editItem.value = {
    id: undefined,
    memo_title: '',
    case_id: undefined,
    memo_date: new Date().toISOString().split('T')[0],
    memo_type: 'مذكرة جوابية',
    memo_label: '',
    najiz_number: '',
    memo_status: 'مسودة',
    opponent_name: '',
    memo_text: '',
    is_archived: 0
  }
  displayData.value = { client_name: '', opponent_name: '' }
  showDialog.value = true
}

const openEditDialog = (item: Memorandum) => {
  isEditing.value = true
  editItem.value = { ...item }
  onCaseChange(item.case_id)
  showDialog.value = true
}

const openPreviewDialog = async (item: Memorandum) => {
  previewItem.value = item
  showPreviewDialog.value = true
  previewLoading.value = true
  try {
    previewHtml.value = await (window as any).api.reports.getPreviewHtml({
      type: 'memoranda',
      params: { id: item.id }
    })
  } catch (err) {
    showSnackbar('فشل تحميل المعاينة', 'error')
    showPreviewDialog.value = false
  } finally {
    previewLoading.value = false
  }
}

const printSingle = async (item: any) => {
  if (!item) return
  try {
    const success = await (window as any).api.reports.printReport({
      type: 'memoranda',
      params: { id: item.id }
    })
    if (success) showSnackbar('بدأت عملية الطباعة')
  } catch {
    showSnackbar('فشل الطباعة', 'error')
  }
}

const exportPdfSingle = async (item: any) => {
  if (!item) return
  try {
    showSnackbar('جاري تحويل المذكرة إلى PDF...')
    const res = await (window as any).api.reports.exportPdf({
      type: 'memoranda',
      params: { id: item.id }
    })
    if (res.saved) showSnackbar('تم حفظ ملف PDF بنجاح')
  } catch {
    showSnackbar('فشل تصدير PDF', 'error')
  }
}

const exportAllPdf = async () => {
  try {
    showSnackbar('جاري تصدير قائمة المذكرات (قالب تجميعي)...')
    const res = await (window as any).api.reports.exportPdf({
      type: 'memoranda_list',
      params: { q: searchQuery.value }
    })
    if (res.saved) showSnackbar('تم تصدير القائمة بنجاح')
  } catch {
    showSnackbar('فشل تصدير PDF', 'error')
  }
}

const exportCsv = async () => {
  try {
    const data = safeArray(filteredMemos.value)
    if (data.length === 0) {
      showSnackbar('لا يوجد بيانات للتصدير', 'warning')
      return
    }
    const res = await (window as any).api.reports.exportCsv({
      filename: 'memoranda_list.csv',
      rows: data.map((m) => ({
        العنوان: m.memo_title,
        القضية: m.case_number,
        الموكل: m.client_name,
        الخصم: m.opponent_name,
        التاريخ: m.memo_date,
        الحالة: m.memo_status
      }))
    })
    const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = res.filename
    link.click()
    URL.revokeObjectURL(url)
    showSnackbar('تم تصدير ملف CSV بنجاح')
  } catch {
    showSnackbar('فشل تصدير CSV', 'error')
  }
}

const handleSave = async () => {
  const { valid } = (await formRef.value?.validate()) || { valid: false }
  if (!valid) return

  saving.value = true
  try {
    if (isEditing.value && editItem.value.id) {
      await memorandaStore.update(String(editItem.value.id), editItem.value)
      showSnackbar('تم تحديث المذكرة بنجاح')
    } else {
      await memorandaStore.create(editItem.value)
      showSnackbar('تم حفظ المذكرة الجديدة بنجاح')
    }
    showDialog.value = false
  } catch (err: any) {
    showSnackbar(err.message, 'error')
  } finally {
    saving.value = false
  }
}

const confirmDelete = (item: Memorandum) => {
  openConfirm({
    title: 'حذف المذكرة',
    message: `هل أنت متأكد من رغبتك في حذف المذكرة "${item.memo_title}"؟ لا يمكن التراجع عن هذا الإجراء.`,
    color: 'error',
    icon: 'trash-2',
    confirmText: 'نعم، احذف',
    action: async () => {
      await memorandaStore.delete(String(item.id))
      showSnackbar('تم حذف المذكرة')
      closeConfirm()
    }
  })
}

const getMemoIcon = (type: string) => {
  switch (type) {
    case 'صحيفة دعوى':
      return 'file-plus'
    case 'مذكرة جوابية':
      return 'file-edit'
    case 'مذكرة استئناف':
      return 'file-up'
    default:
      return 'file-text'
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'مسودة':
      return 'gold'
    case 'تحت التحرير':
      return 'warning'
    case 'مقدمة':
      return 'indigo'
    case 'معتمدة':
      return 'success'
    default:
      return 'accent'
  }
}

const formatDate = (date: any) => {
  if (!date || !isValidDate(String(date))) return '-'
  return new Date(date).toLocaleDateString('ar-SA')
}

const copyToClipboard = () => {
  if (!editItem.value.memo_text) return
  navigator.clipboard.writeText(editItem.value.memo_text)
  showSnackbar('تم نسخ النص إلى الحافظة')
}

const showSnackbar = (text: string, color = 'success') => {
  snackbar.value = { show: true, text, color }
}
</script>

<style scoped>
.memoranda-table :deep(th) {
  background: rgba(233, 195, 73, 0.05) !important;
  color: #e9c349 !important;
  font-weight: 900 !important;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 0.75rem !important;
  border-bottom: 1px solid rgba(233, 195, 73, 0.2) !important;
}

.memoranda-table :deep(td) {
  border-bottom: 1px solid rgba(233, 195, 73, 0.05) !important;
}

.hover-gold:hover {
  color: #e9c349 !important;
}

.memo-editor :deep(textarea) {
  line-height: 2 !important;
  font-family: 'Amiri', serif !important;
}

.modal-scrollable {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.min-h-500 {
  min-height: 500px;
}

.min-h-600 {
  min-height: 600px;
}

.leading-loose {
  line-height: 2;
}

.min-w-180 {
  min-w: 180px;
}

/* ====================================================
   MOBILE STYLES — max-width: 1023px ONLY
   ==================================================== */
@media (max-width: 1023px) {
  /* Header: stack button below title */
  :deep(.v-row.mb-8.align-center > .v-col-auto) {
    flex: 0 0 100% !important;
    max-width: 100% !important;
    margin-top: 8px;
  }
  :deep(.v-row.mb-8.align-center > .v-col-auto .v-btn) {
    width: 100% !important;
  }

  /* Data table: horizontal scroll */
  :deep(.memoranda-table .v-table__wrapper) {
    overflow-x: auto !important;
  }
  .memoranda-table :deep(th) {
    white-space: nowrap !important;
    font-size: 0.65rem !important;
    padding: 8px 8px !important;
  }
  .memoranda-table :deep(td) {
    padding: 8px !important;
    font-size: 0.78rem !important;
  }

  /* Dialog form: stack columns */
  :deep(.v-dialog .v-row > .v-col-md-4) {
    flex: 0 0 100% !important;
    max-width: 100% !important;
  }
  :deep(.v-dialog .v-row > .v-col-md-8) {
    flex: 0 0 100% !important;
    max-width: 100% !important;
  }

  /* Modal padding */
  :deep(.v-card-text.pa-8) {
    padding: 12px !important;
  }
  .modal-scrollable {
    max-height: calc(100dvh - 160px) !important;
  }

  /* Card actions: wrap */
  :deep(.v-card-actions.pa-8) {
    padding: 12px !important;
    flex-wrap: wrap !important;
  }
  :deep(.v-card-actions.pa-8 .v-btn) {
    flex: 1 1 auto !important;
  }
  :deep(.v-card-actions.pa-8 .v-spacer) {
    display: none !important;
  }
}
</style>
