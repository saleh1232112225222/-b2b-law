<template>
  <v-container fluid class="pa-6 rtl">
    <!-- Header -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="gavel" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">التنفيذ والتحصيل المالي</h1>
            <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
              إدارة طلبات التنفيذ القضائي وأوامر السداد والتحصيل التعاقدي
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="auto">
        <div
          class="d-flex align-center px-4 py-2 rounded-lg glass-panel-light border-gold opacity-10"
        >
          <LucideIcon name="shield-check" :size="18" class="text-gold me-2" />
          <span class="text-gold text-caption font-weight-black">مركز التحصيل الآمن</span>
        </div>
      </v-col>
    </v-row>

    <!-- Main Content Tabs -->
    <v-card elevation="0" class="glass-card overflow-hidden glass-card">
      <v-tabs v-model="tab" color="gold" grow height="64" class="glass-tabs">
        <v-tab value="enforcement" class="text-subtitle-1 font-weight-black">
          <LucideIcon name="scale" :size="20" class="me-3" /> ملفات التنفيذ القضائي
        </v-tab>
        <v-tab value="collections" class="text-subtitle-1 font-weight-black">
          <LucideIcon name="banknote" :size="20" class="me-3" /> إدارة التحصيل الميداني
        </v-tab>
      </v-tabs>

      <v-divider class="border-gold opacity-10" />

      <v-card-text class="pa-8">
        <v-window v-model="tab">
          <!-- Enforcement Tab -->
          <v-window-item value="enforcement">
            <v-row class="mb-8" dense align="center">
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="enfQ"
                  placeholder="البحث في رقم الصك أو الجهة..."
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  class="glass-input"
                  clearable
                  @update:model-value="loadEnforcement"
                >
                  <template #prepend-inner>
                    <LucideIcon name="search" :size="20" class="text-gold opacity-40" />
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="enfStatus"
                  :items="enfStatusOptions"
                  placeholder="تصفية حسب الحالة"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  class="glass-input"
                  @update:model-value="loadEnforcement"
                >
                  <template #prepend-inner>
                    <LucideIcon name="filter" :size="20" class="text-gold opacity-40" />
                  </template>
                </v-select>
              </v-col>
              <v-spacer />
              <v-col cols="auto" class="d-flex ga-3">
                <v-btn
                  variant="text"
                  color="gold"
                  class="rounded-lg font-weight-black opacity-50 h-56 premium-btn-gold-gradient"
                  :loading="loadingEnforcement"
                  @click="loadEnforcement"
                >
                  <LucideIcon name="refresh-cw" :size="18" class="me-2" /> تحديث
                </v-btn>

                <v-btn
                  color="accent"
                  class="rounded-lg font-weight-black px-8 premium-lift h-56 premium-btn-gold-gradient"
                  @click="
                    () => {
                      selectedRequestForEdit = null
                      showRequestStepper = true
                    }
                  "
                >
                  <LucideIcon name="plus-circle" :size="20" class="me-2" /> تقديم طلب تنفيذ
                </v-btn>
              </v-col>
            </v-row>

            <v-fade-transition>
              <v-alert
                v-if="enfError"
                type="error"
                variant="tonal"
                class="mb-8 rounded-lg border-gold-alpha"
              >
                <template #prepend>
                  <LucideIcon name="alert-triangle" :size="20" class="me-3" />
                </template>
                <span class="font-weight-black text-body-2">{{ enfError }}</span>
              </v-alert>
            </v-fade-transition>

            <v-card
              elevation="0"
              class="glass-panel-light rounded-xl overflow-hidden border-gold-alpha glass-card"
            >
              <v-table class="bg-transparent premium-table" hover>
                <thead>
                  <tr>
                    <th class="text-right font-weight-black text-gold opacity-70 pa-4">
                      رقم السند / الصك
                    </th>
                    <th class="text-right font-weight-black text-gold opacity-70 pa-4">
                      محكمة التنفيذ المعنية
                    </th>
                    <th class="text-right font-weight-black text-gold opacity-70 pa-4">
                      حالة الطلب
                    </th>
                    <th class="text-right font-weight-black text-gold opacity-70 pa-4">
                      آخر إجراء
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <template v-if="loadingEnforcement">
                    <tr v-for="i in 8" :key="i">
                      <td colspan="4" class="pa-0">
                        <v-skeleton-loader
                          type="table-row"
                          class="bg-transparent"
                        ></v-skeleton-loader>
                      </td>
                    </tr>
                  </template>
                  <template v-else>
                    <tr v-if="safeLength(enforcementRows) === 0">
                      <td colspan="4" class="text-center py-15">
                        <LucideIcon
                          name="file-search-2"
                          :size="48"
                          class="text-gold opacity-10 mb-4"
                        />
                        <div class="text-gold opacity-30 font-weight-black">
                          لا توجد ملفات تنفيذ مسجلة حالياً
                        </div>
                      </td>
                    </tr>
                    <tr
                      v-for="r in safeArray(enforcementRows)"
                      :key="(r as any).id"
                      class="hover-row"
                    >
                      <td class="pa-4">
                        <span
                          class="font-weight-black text-white text-decoration-underline cursor-pointer hover-gold"
                          @click="handleEditRequest((r as any).id)"
                        >
                          {{ (r as any).instrument_no || '-' }}
                        </span>
                      </td>
                      <td class="pa-4 text-white opacity-70 font-weight-black">
                        {{ (r as any).court_name || '-' }}
                      </td>
                      <td class="pa-4">
                        <v-chip
                          :color="getStatusColor(String((r as any).status))"
                          size="x-small"
                          variant="tonal"
                          class="font-weight-black px-3"
                        >
                          {{ translateStatus(String((r as any).status)) }}
                        </v-chip>
                      </td>
                      <td class="pa-4 text-tiny font-weight-black text-gold opacity-40">
                        {{ (r as any).last_action_at || (r as any).opened_at || '-' }}
                      </td>
                    </tr>
                  </template>
                </tbody>
              </v-table>
            </v-card>

            <EnforcementRequestStepper
              v-model="showRequestStepper"
              :initial-data="selectedRequestForEdit"
              @saved="
                () => {
                  loadEnforcement()
                  showSnackbar('تم حفظ طلب التنفيذ بنجاح')
                }
              "
              @error="(msg) => showSnackbar(msg, 'error')"
            />
          </v-window-item>

          <!-- Collections Tab -->
          <v-window-item value="collections">
            <v-row class="mb-8" dense align="center">
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="colQ"
                  placeholder="بحث في المطالبات والمستفيدين..."
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  class="glass-input"
                  clearable
                  @update:model-value="loadCollections"
                >
                  <template #prepend-inner>
                    <LucideIcon name="search" :size="20" class="text-gold opacity-40" />
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="colStatus"
                  :items="colStatusOptions"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  class="glass-input"
                  @update:model-value="loadCollections"
                >
                  <template #prepend-inner>
                    <LucideIcon name="filter" :size="20" class="text-gold opacity-40" />
                  </template>
                </v-select>
              </v-col>
              <v-spacer />
              <v-col cols="auto">
                <v-btn
                  variant="text"
                  color="gold"
                  class="rounded-lg font-weight-black opacity-50 h-56 premium-btn-gold-gradient"
                  :loading="loadingCollections"
                  @click="loadCollections"
                >
                  <LucideIcon name="refresh-cw" :size="18" class="me-2" /> تحديث البيانات
                </v-btn>
              </v-col>
            </v-row>

            <!-- Collections Summary -->
            <v-row class="mb-10 ga-0">
              <v-col cols="12" md="3">
                <v-card
                  elevation="0"
                  class="glass-panel-light pa-5 border-gold opacity-10 h-100 glass-card"
                >
                  <div class="d-flex align-center">
                    <div class="glass-panel-light pa-3 rounded-lg me-4 bg-accent-alpha">
                      <LucideIcon name="clipboard-list" :size="24" class="text-accent" />
                    </div>
                    <div>
                      <div class="text-tiny font-weight-black text-gold opacity-40 mb-1">
                        إجمالي المطالبات
                      </div>
                      <div class="text-h5 font-weight-black text-white">
                        {{ summary?.count || 0 }} طلب
                      </div>
                    </div>
                  </div>
                </v-card>
              </v-col>
              <v-col cols="12" md="3">
                <v-card
                  elevation="0"
                  class="glass-panel-light pa-5 border-gold opacity-10 h-100 glass-card"
                >
                  <div class="d-flex align-center">
                    <div class="glass-panel-light pa-3 rounded-lg me-4 bg-gold-alpha">
                      <LucideIcon name="wallet" :size="24" class="text-gold" />
                    </div>
                    <div>
                      <div class="text-tiny font-weight-black text-gold opacity-40 mb-1">
                        القيمة الإجمالية
                      </div>
                      <div class="text-h5 font-weight-black text-white">
                        {{ (summary?.total_amount || 0).toLocaleString('ar-SA') }}
                        <span class="text-caption">ر.س</span>
                      </div>
                    </div>
                  </div>
                </v-card>
              </v-col>
              <v-col cols="12" md="3">
                <v-card
                  elevation="0"
                  class="glass-panel-light pa-5 border-gold opacity-10 h-100 glass-card"
                >
                  <div class="d-flex align-center">
                    <div class="glass-panel-light pa-3 rounded-lg me-4 bg-success-alpha">
                      <LucideIcon name="check-circle-2" :size="24" class="text-success" />
                    </div>
                    <div>
                      <div class="text-tiny font-weight-black text-gold opacity-40 mb-1">
                        المبلغ المحصل
                      </div>
                      <div class="text-h5 font-weight-black text-success">
                        {{ (summary?.total_paid || 0).toLocaleString('ar-SA') }}
                        <span class="text-caption">ر.س</span>
                      </div>
                    </div>
                  </div>
                </v-card>
              </v-col>
              <v-col cols="12" md="3">
                <v-card
                  elevation="0"
                  class="glass-panel-light pa-5 border-gold opacity-10 h-100 glass-card"
                >
                  <div class="d-flex align-center">
                    <div class="glass-panel-light pa-3 rounded-lg me-4 bg-error-alpha">
                      <LucideIcon name="clock-alert" :size="24" class="text-error" />
                    </div>
                    <div>
                      <div class="text-tiny font-weight-black text-gold opacity-40 mb-1">
                        المتبقي / المتأخر
                      </div>
                      <div class="text-h5 font-weight-black text-error">
                        {{ (summary?.total_remaining || 0).toLocaleString('ar-SA') }}
                        <span class="text-caption">ر.س</span>
                      </div>
                    </div>
                  </div>
                </v-card>
              </v-col>
            </v-row>

            <v-card
              elevation="0"
              class="glass-panel-light rounded-xl overflow-hidden border-gold-alpha glass-card"
            >
              <v-table class="bg-transparent premium-table" hover>
                <thead>
                  <tr>
                    <th class="text-right font-weight-black text-gold opacity-70 pa-4">
                      عنوان المطالبة
                    </th>
                    <th class="text-right font-weight-black text-gold opacity-70 pa-4">
                      المبلغ الأصلي
                    </th>
                    <th class="text-right font-weight-black text-gold opacity-70 pa-4">المحصل</th>
                    <th class="text-right font-weight-black text-gold opacity-70 pa-4">الحالة</th>
                    <th class="text-right font-weight-black text-gold opacity-70 pa-4">
                      الاستحقاق
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <template v-if="loadingCollections">
                    <tr v-for="i in 8" :key="i">
                      <td colspan="5" class="pa-0">
                        <v-skeleton-loader
                          type="table-row"
                          class="bg-transparent"
                        ></v-skeleton-loader>
                      </td>
                    </tr>
                  </template>
                  <template v-else>
                    <tr v-if="safeLength(claimRows) === 0">
                      <td
                        colspan="5"
                        class="text-center py-15 text-gold opacity-30 font-weight-black"
                      >
                        لا توجد مطالبات تحصيل مسجلة
                      </td>
                    </tr>
                    <tr v-for="r in safeArray(claimRows)" :key="(r as any).id" class="hover-row">
                      <td class="pa-4 font-weight-black text-white">
                        {{ (r as any).title || '-' }}
                      </td>
                      <td class="pa-4 font-weight-black text-gold">
                        {{ ((r as any).amount || 0).toLocaleString('ar-SA') }}
                        <span class="text-tiny opacity-50">ر.س</span>
                      </td>
                      <td class="pa-4 font-weight-black text-success">
                        {{ ((r as any).paid_amount || 0).toLocaleString('ar-SA') }}
                        <span class="text-tiny opacity-50">ر.س</span>
                      </td>
                      <td class="pa-4">
                        <v-chip
                          :color="getStatusColor(String((r as any).status))"
                          size="x-small"
                          variant="tonal"
                          class="font-weight-black px-3"
                        >
                          {{ translateStatus(String((r as any).status)) }}
                        </v-chip>
                      </td>
                      <td class="pa-4 text-tiny font-weight-black text-gold opacity-40">
                        {{ (r as any).due_date || '-' }}
                      </td>
                    </tr>
                  </template>
                </tbody>
              </v-table>
            </v-card>
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>

    <!-- Feedback -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" rounded="lg" elevation="24">
      <div class="d-flex align-center">
        <LucideIcon :name="snackbar.icon" :size="18" class="me-3" />
        <span class="font-weight-black">{{ snackbar.text }}</span>
      </div>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { onMounted, ref, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { safeArray, safeLength } from '../utils/safe'
import LucideIcon from '../components/common/LucideIcon.vue'
import EnforcementRequestStepper from '../components/enforcement/EnforcementRequestStepper.vue'

const route = useRoute()
const router = useRouter()

const tab = ref<'enforcement' | 'collections'>('enforcement')
const showRequestStepper = ref(false)
const selectedRequestForEdit = ref<any>(null)

const enforcementRows = ref<any[]>([])
const loadingEnforcement = ref(false)
const enfError = ref('')
const enfQ = ref('')
const enfStatus = ref('الكل')

const claimRows = ref<any[]>([])
const summary = ref<any | null>(null)
const loadingCollections = ref(false)
const colError = ref('')
const colQ = ref('')
const colStatus = ref('الكل')

const snackbar = ref({
  show: false,
  text: '',
  color: 'success',
  icon: 'check-circle'
})

const showSnackbar = (text: string, type: 'success' | 'error' = 'success') => {
  snackbar.value = {
    show: true,
    text,
    color: type === 'success' ? 'success' : 'error',
    icon: type === 'success' ? 'check-circle' : 'alert-circle'
  }
}

const enfStatusOptions = [
  { title: 'عرض الكل', value: 'الكل' },
  { title: 'طلب جديد', value: 'new' },
  { title: 'قيد المتابعة', value: 'in_progress' },
  { title: 'إجراء أمر 34', value: 'order_34' },
  { title: 'تم التحصيل/السداد', value: 'paid' },
  { title: 'طلب موقوف', value: 'stopped' },
  { title: 'تم الإغلاق', value: 'closed' }
]

const colStatusOptions = [
  { title: 'عرض الكل', value: 'الكل' },
  { title: 'مطالبة مفتوحة', value: 'open' },
  { title: 'سداد جزئي', value: 'partial' },
  { title: 'تم سدادها', value: 'paid' },
  { title: 'تجاوزت الموعد', value: 'overdue' },
  { title: 'تم الإلغاء', value: 'canceled' }
]

const translateStatus = (s: string): string => {
  const map: Record<string, string> = {
    new: 'جديد',
    in_progress: 'متابعة',
    order_34: 'أمر 34',
    paid: 'سداد تام',
    stopped: 'موقوف',
    closed: 'مغلق',
    open: 'نشط',
    partial: 'جزئي',
    overdue: 'متأخر',
    canceled: 'ملغي'
  }
  return map[s] || s
}

const getStatusColor = (s: string): string => {
  if (s === 'paid' || s === 'closed') return 'success'
  if (s === 'in_progress' || s === 'partial' || s === 'open') return 'accent'
  if (s === 'order_34' || s === 'overdue') return 'gold'
  if (s === 'stopped' || s === 'canceled') return 'error'
  return 'gold'
}

const loadEnforcement = async (): Promise<void> => {
  enfError.value = ''
  loadingEnforcement.value = true
  try {
    const res = await (window as any).api.enforcement.request.list({
      page: 1,
      pageSize: 100,
      q: enfQ.value,
      status: enfStatus.value
    })
    enforcementRows.value = safeArray(res)
  } catch (e: unknown) {
    enfError.value = (e as Error)?.message || 'تعذر استرجاع ملفات التنفيذ القضائي'
    enforcementRows.value = []
  } finally {
    loadingEnforcement.value = false
  }
}

const loadCollections = async (): Promise<void> => {
  colError.value = ''
  loadingCollections.value = true
  try {
    const [sResult, lResult] = await Promise.all([
      (window as any).api.collections.summary({ status: colStatus.value }),
      (window as any).api.collections.listClaims({
        page: 1,
        pageSize: 100,
        q: colQ.value,
        status: colStatus.value
      })
    ])
    summary.value = sResult
    claimRows.value = safeArray(lResult)
  } catch (e: unknown) {
    colError.value = (e as Error)?.message || 'تعذر الوصول إلى نظام التحصيل المالي'
    claimRows.value = []
    summary.value = null
  } finally {
    loadingCollections.value = false
  }
}

const handleEditRequest = async (id: string) => {
  try {
    const fullData = await (window as any).api.enforcement.request.get(id)
    if (fullData) {
      selectedRequestForEdit.value = fullData
      showRequestStepper.value = true
    }
  } catch (e) {
    enfError.value = 'فشل في تحميل تفاصيل الطلب'
  }
}

onMounted(() => {
  loadEnforcement()
  loadCollections()
  if (route.query.new === '1') {
    selectedRequestForEdit.value = null
    showRequestStepper.value = true
    const q: any = { ...route.query }
    delete q.new
    router.replace({ path: route.path, query: q })
  }
})

onUnmounted(() => {
  enforcementRows.value = []
  claimRows.value = []
})
</script>

<style scoped>
.glass-tabs :deep(.v-tab) {
  border-bottom: 2px solid transparent !important;
  transition: all 0.3s ease;
  opacity: 0.5;
}

.glass-tabs :deep(.v-tab--selected) {
  border-bottom: 2px solid #e9c349 !important;
  opacity: 1;
}

.glass-tabs :deep(.v-slide-group__content) {
  border-bottom: none !important;
}

.glass-tabs :deep(.v-tabs__container),
.glass-tabs :deep(.v-tabs-items),
.glass-tabs :deep(.v-tabs__wrapper) {
  border-bottom: none !important;
  box-shadow: none !important;
}

.glass-tabs :deep(.v-tab__slider) {
  background: #e9c349 !important;
  box-shadow: none !important;
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

.hover-row:hover {
  background: rgba(255, 255, 255, 0.02) !important;
}

.bg-accent-alpha {
  background: rgba(var(--v-theme-accent), 0.1) !important;
}
.bg-gold-alpha {
  background: rgba(var(--v-theme-gold), 0.1) !important;
}
.bg-success-alpha {
  background: rgba(var(--v-theme-success), 0.1) !important;
}
.bg-error-alpha {
  background: rgba(var(--v-theme-error), 0.1) !important;
}

.h-56 {
  height: 56px !important;
}

.border-gold-alpha {
  border: 1px solid rgba(233, 195, 73, 0.2) !important;
}

.hover-gold:hover {
  color: #e9c349 !important;
}
</style>
