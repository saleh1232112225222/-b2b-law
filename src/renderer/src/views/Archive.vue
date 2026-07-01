<template>
  <v-container fluid class="pa-6 rtl">
    <!-- Header Section -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="archive" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-black mb-1">مركز الأرشيف السحابي</h1>
            <p class="text-subtitle-1 text-black font-weight-black">
              إدارة واستعادة العناصر المؤرشفة (قضايا، مهام، جلسات، مستندات، أدلة)
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field
          v-model="search"
          placeholder="بحث في السجلات المؤرشفة..."
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
    </v-row>

    <!-- Content Section -->
    <v-card elevation="0" class="glass-card border-gold-alpha overflow-hidden glass-card">
      <v-tabs v-model="tab" color="accent" grow class="border-b border-gold-alpha">
        <v-tab value="case" class="font-weight-black text-gold py-6">
          <LucideIcon name="briefcase" :size="18" class="me-3" /> القضايا
        </v-tab>
        <v-tab value="document" class="font-weight-black text-gold py-6">
          <LucideIcon name="file-text" :size="18" class="me-3" /> المستندات
        </v-tab>
        <v-tab value="session" class="font-weight-black text-gold py-6">
          <LucideIcon name="calendar" :size="18" class="me-3" /> الجلسات
        </v-tab>
        <v-tab value="evidence" class="font-weight-black text-gold py-6">
          <LucideIcon name="shield-check" :size="18" class="me-3" /> الأدلة
        </v-tab>
        <v-tab value="task" class="font-weight-black text-gold py-6">
          <LucideIcon name="clipboard-check" :size="18" class="me-3" /> المهام
        </v-tab>
        <v-tab value="legal-service" class="font-weight-black text-gold py-6">
          <LucideIcon name="scale" :size="18" class="me-3" /> الخدمات القانونية
        </v-tab>
      </v-tabs>

      <v-window v-model="tab">
        <v-window-item v-for="type in types" :key="type" :value="type">
          <v-data-table
            :headers="headers[type]"
            :items="safeArray(items)"
            :loading="loading"
            :items-per-page-text="itemsPerPageText[type]"
            class="bg-transparent premium-table"
            hover
            no-data-text="لا يوجد عناصر مؤرشفة في هذا القسم حالياً"
            loading-text="جاري استرجاع السجلات من الأرشيف..."
          >
            <template #loading>
              <v-skeleton-loader
                type="table-row-divider@10"
                class="bg-transparent"
              ></v-skeleton-loader>
            </template>

            <template #[`item.date`]="{ item }">
              <span class="text-caption font-weight-black text-white opacity-80">
                {{ formatDate((item as any).date) }}
              </span>
            </template>

            <template #[`item.archived_at`]="{ item }">
              <span class="text-caption text-gold opacity-40 font-weight-black">
                {{ formatDate((item as any).archived_at) }}
              </span>
            </template>

            <template #[`item.priority`]="{ item }">
              <v-chip
                :color="getPriorityColor((item as any).priority)"
                size="x-small"
                variant="flat"
                class="font-weight-black px-3 rounded-lg"
              >
                {{ (item as any).priority || 'عادي' }}
              </v-chip>
            </template>

            <template #[`item.actions`]="{ item }">
              <v-btn
                variant="elevated"
                color="accent"
                size="small"
                class="rounded-lg px-6 font-weight-black premium-lift premium-btn-gold-gradient"
                @click="restoreItem(item as any)"
              >
                <LucideIcon name="refresh-cw" :size="14" class="me-2" /> استعادة
              </v-btn>
            </template>

            <template #[`item.name`]="{ item }">
              <div class="font-weight-black text-body-2 text-white">
                {{ (item as any).name || '-' }}
              </div>
            </template>

            <template #[`item.case_number`]="{ item }">
              <div class="font-weight-black text-accent ltr-text">
                {{ (item as any).case_number || '-' }}
              </div>
            </template>
          </v-data-table>
        </v-window-item>
      </v-window>
    </v-card>

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
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useSearch } from '../composables/useSearch'
import { safeArray, isValidDate } from '../utils/safe'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import LucideIcon from '../components/common/LucideIcon.vue'
import { useConfirmDialog } from '../composables/useConfirmDialog'

interface ArchiveItem {
  id: string
  case_number?: string
  client_name?: string
  subject?: string
  priority?: string
  name?: string
  context_label?: string
  file_type?: string
  file_size?: string
  date?: string
  time?: string
  court_room?: string
  title?: string
  due_date?: string
  engagement_number?: string
  service_type_name?: string
  responsible_name?: string
  archived_at: string
}

const tab = ref<'case' | 'document' | 'session' | 'evidence' | 'task' | 'legal-service'>('case')
const { search } = useSearch(() => loadData())
const loading = ref(false)
const items = ref<ArchiveItem[]>([])
const types = ['case', 'document', 'session', 'evidence', 'task', 'legal-service']

const itemsPerPageText: Record<string, string> = {
  case: 'عدد القضايا لكل صفحة:',
  document: 'عدد المستندات لكل صفحة:',
  session: 'عدد الجلسات لكل صفحة:',
  evidence: 'عدد الأدلة لكل صفحة:',
  task: 'عدد المهام لكل صفحة:',
  'legal-service': 'عدد الخدمات لكل صفحة:'
}

const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
})

const { confirmDialog, openConfirm, closeConfirm } = useConfirmDialog()

const headers: Record<string, any[]> = {
  case: [
    { title: 'رقم القضية', key: 'case_number', align: 'start' as const },
    { title: 'الموكل', key: 'client_name', align: 'start' as const },
    { title: 'الموضوع', key: 'subject', align: 'start' as const },
    { title: 'الأولوية', key: 'priority', align: 'center' as const, width: '120px' },
    { title: 'تاريخ الأرشفة', key: 'archived_at', align: 'center' as const, width: '150px' },
    { title: 'تحكم', key: 'actions', sortable: false, align: 'end' as const, width: '150px' }
  ],
  document: [
    { title: 'اسم المستند', key: 'name', align: 'start' as const },
    { title: 'مرتبط بـ', key: 'context_label', align: 'start' as const },
    { title: 'النوع', key: 'file_type', align: 'center' as const, width: '120px' },
    { title: 'تاريخ الأرشفة', key: 'archived_at', align: 'center' as const, width: '150px' },
    { title: 'تحكم', key: 'actions', sortable: false, align: 'end' as const, width: '150px' }
  ],
  session: [
    { title: 'القضية', key: 'case_number', align: 'start' as const },
    { title: 'تاريخ الجلسة', key: 'date', align: 'center' as const, width: '150px' },
    { title: 'القاعة', key: 'court_room', align: 'start' as const },
    { title: 'تاريخ الأرشفة', key: 'archived_at', align: 'center' as const, width: '150px' },
    { title: 'تحكم', key: 'actions', sortable: false, align: 'end' as const, width: '150px' }
  ],
  evidence: [
    { title: 'عنوان الدليل', key: 'title', align: 'start' as const },
    { title: 'رقم القضية', key: 'case_number', align: 'start' as const },
    { title: 'تاريخ الأرشفة', key: 'archived_at', align: 'center' as const, width: '150px' },
    { title: 'تحكم', key: 'actions', sortable: false, align: 'end' as const, width: '150px' }
  ],
  task: [
    { title: 'اسم المهمة', key: 'title', align: 'start' as const },
    { title: 'المرجع', key: 'context_label', align: 'start' as const },
    { title: 'تاريخ الاستحقاق', key: 'due_date', align: 'center' as const, width: '150px' },
    { title: 'تاريخ الأرشفة', key: 'archived_at', align: 'center' as const, width: '150px' },
    { title: 'تحكم', key: 'actions', sortable: false, align: 'end' as const, width: '150px' }
  ],
  'legal-service': [
    { title: 'الرقم المرجعي', key: 'engagement_number', align: 'start' as const },
    { title: 'نوع الخدمة', key: 'service_type_name', align: 'start' as const },
    { title: 'العميل', key: 'client_name', align: 'start' as const },
    { title: 'المسؤول', key: 'responsible_name', align: 'start' as const },
    { title: 'تاريخ الأرشفة', key: 'archived_at', align: 'center' as const, width: '150px' },
    { title: 'تحكم', key: 'actions', sortable: false, align: 'end' as const, width: '150px' }
  ]
}

const loadData = async (): Promise<void> => {
  loading.value = true
  try {
    const res = await (window as any).api.archive.list(tab.value, {
      page: 1,
      pageSize: 200,
      q: search.value,
      status: 'archived'
    })
    items.value = safeArray(res) as ArchiveItem[]
  } catch (err: unknown) {
    showSnackbar('فشل في استرداد بيانات الأرشيف حالياً', 'error')
  } finally {
    loading.value = false
  }
}

const restoreItem = async (item: ArchiveItem): Promise<void> => {
  openConfirm({
    title: 'تأكيد الاستعادة من الأرشيف',
    message: 'هل أنت متأكد من رغبتك في استعادة هذا العنصر إلى السجلات النشطة؟',
    color: 'warning',
    confirmButtonColor: 'accent',
    icon: 'refresh-cw',
    confirmText: 'موافق، استعد',
    cancelText: 'إلغاء الأمر',
    action: async () => {
      confirmDialog.value.loading = true
      try {
        const success = await (window as any).api.archive.toggle(tab.value, item.id, false)
        if (success) {
          showSnackbar('تمت استعادة العنصر إلى السجلات النشطة بنجاح')
          await loadData()
          closeConfirm()
        }
      } catch (err: unknown) {
        showSnackbar('فشل في عملية الاستعادة، يرجى المحاولة لاحقاً', 'error')
      } finally {
        confirmDialog.value.loading = false
      }
    }
  })
}

const showSnackbar = (text: string, color: string = 'success'): void => {
  snackbar.value.text = text
  snackbar.value.color = color
  snackbar.value.show = true
}

const getPriorityColor = (priority: string | undefined): string => {
  if (!priority) return 'grey'
  if (priority.includes('عالية')) return 'error'
  if (priority.includes('متوسطة')) return 'orange'
  return 'accent'
}

const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr || !isValidDate(dateStr)) return '-'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  } catch {
    return dateStr || '-'
  }
}

watch(tab, () => {
  search.value = ''
  loadData()
})

onMounted(() => {
  loadData()
})

onUnmounted(() => {
  search.value = ''
  items.value = []
})
</script>

<style scoped>
.border-gold-alpha {
  border: 1px solid rgba(233, 195, 73, 0.2) !important;
}

.ltr-text {
  direction: ltr;
  display: inline-block;
}

.premium-table :deep(th) {
  background: rgba(233, 195, 73, 0.05) !important;
  color: #000000 !important;
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
