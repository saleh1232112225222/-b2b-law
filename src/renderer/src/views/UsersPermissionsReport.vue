<template>
  <v-container fluid class="pa-6 pb-12 rtl report-page">
    <PrintReportFrame title="تقرير المستخدمين وهيكلية الصلاحيات" />

    <!-- Header -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="shield-check" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">تقرير الصلاحيات والهيكلية</h1>
            <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
              استعراض مصفوفة الوصول للمستخدمين وتوزيع الصلاحيات عبر وحدات النظام
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="auto">
        <v-btn
          variant="outlined"
          color="gold"
          class="rounded-lg px-6 font-weight-black premium-hover premium-btn-gold-gradient"
          @click="$router.push('/reports')"
        >
          <LucideIcon name="arrow-right" :size="18" class="me-2" /> رجوع للمركز
        </v-btn>
      </v-col>
    </v-row>

    <v-card
      elevation="0"
      class="glass-card pa-8 border-gold border-opacity-20 border-2 overflow-hidden glass-card"
    >
      <!-- Actions Row -->
      <div class="d-flex flex-wrap justify-end mb-8 gap-3 report-actions">
        <v-btn
          color="accent"
          variant="flat"
          height="48"
          class="rounded-xl px-8 font-weight-black premium-lift text-ebony premium-btn-gold-gradient"
          :loading="loading"
          @click="load"
        >
          <LucideIcon name="refresh-cw" :size="20" class="me-2" /> تحديث البيانات
        </v-btn>

        <v-divider vertical class="mx-2 border-gold opacity-10" />

        <v-btn
          variant="tonal"
          color="white"
          height="48"
          class="rounded-xl px-6 font-weight-black premium-btn-gold-gradient"
          @click="printPage"
        >
          <LucideIcon name="printer" :size="20" class="me-2 text-gold" /> طباعة
        </v-btn>
        <v-btn
          variant="tonal"
          color="white"
          height="48"
          class="rounded-xl px-6 font-weight-black premium-btn-gold-gradient"
          :disabled="!data"
          @click="exportPdf"
        >
          <LucideIcon name="file-text" :size="20" class="me-2 text-gold" /> تصدير PDF
        </v-btn>
        <v-btn
          variant="tonal"
          color="white"
          height="48"
          class="rounded-xl px-6 font-weight-black premium-btn-gold-gradient"
          :disabled="safeLength(data?.users) === 0"
          @click="exportCsv"
        >
          <LucideIcon name="file-spreadsheet" :size="20" class="me-2 text-gold" /> تصدير CSV
        </v-btn>
      </div>

      <v-alert
        v-if="error"
        type="error"
        variant="flat"
        class="mb-8 rounded-xl font-weight-black border-2 border-error-darken-1"
      >
        <template #prepend>
          <LucideIcon name="alert-triangle" :size="24" class="me-3" />
        </template>
        {{ error }}
      </v-alert>

      <template v-if="loading">
        <v-skeleton-loader
          type="table"
          class="glass-card mb-6"
          color="transparent"
        ></v-skeleton-loader>
        <v-skeleton-loader type="table" class="glass-card" color="transparent"></v-skeleton-loader>
      </template>

      <template v-else-if="data">
        <!-- Users Table -->
        <div class="d-flex align-center mb-4">
          <div class="glass-panel-light pa-2 rounded-lg me-3 border border-gold border-opacity-10">
            <LucideIcon name="users" :size="20" class="text-gold" />
          </div>
          <span class="text-h6 font-weight-black text-white">قائمة المستخدمين المسجلين</span>
        </div>

        <v-card
          elevation="0"
          class="glass-card border border-gold border-opacity-10 rounded-xl overflow-hidden mb-12 glass-card"
        >
          <v-table density="comfortable" class="premium-table">
            <thead>
              <tr>
                <th class="text-right text-gold font-weight-black">اسم المستخدم</th>
                <th class="text-right text-gold font-weight-black">الدور الوظيفي</th>
                <th class="text-right text-gold font-weight-black">حالة الحساب</th>
                <th class="text-right text-gold font-weight-black">تغيير كلمة المرور</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="safeLength((data as any).users) === 0">
                <td colspan="4" class="text-center py-12 text-gold opacity-20">
                  لا يوجد مستخدمون حالياً
                </td>
              </tr>
              <tr
                v-for="u in safeArray((data as any).users)"
                :key="(u as any).id"
                class="premium-hover-row"
              >
                <td class="font-weight-black text-accent text-h6">{{ (u as any).username }}</td>
                <td>
                  <v-chip
                    size="small"
                    variant="flat"
                    color="gold"
                    class="text-ebony font-weight-black px-4"
                  >
                    {{ (u as any).role_key }}
                  </v-chip>
                </td>
                <td>
                  <div class="d-flex align-center">
                    <div
                      :class="(u as any).is_active ? 'bg-success' : 'bg-grey'"
                      class="rounded-circle me-3"
                      style="width: 10px; height: 10px"
                    ></div>
                    <span class="text-white font-weight-bold">{{
                      (u as any).is_active ? 'نشط' : 'معطل'
                    }}</span>
                  </div>
                </td>
                <td>
                  <v-chip
                    size="x-small"
                    :color="(u as any).must_change_password ? 'error' : 'success'"
                    variant="tonal"
                    class="font-weight-black"
                  >
                    {{ (u as any).must_change_password ? 'مطلوب عند الدخول' : 'غير مطلوب' }}
                  </v-chip>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>

        <!-- Permissions Catalog -->
        <div class="d-flex align-center mb-4">
          <div class="glass-panel-light pa-2 rounded-lg me-3 border border-gold border-opacity-10">
            <LucideIcon name="key" :size="20" class="text-gold" />
          </div>
          <span class="text-h6 font-weight-black text-white"
            >دليل الصلاحيات المتاحة (Permissions Catalog)</span
          >
        </div>

        <v-card
          elevation="0"
          class="glass-card border border-gold border-opacity-10 rounded-xl overflow-hidden glass-card"
        >
          <v-table density="compact" class="glass-table">
            <thead>
              <tr>
                <th class="text-right text-gold font-weight-black" style="width: 200px">
                  الوحدة (Module)
                </th>
                <th class="text-right text-gold font-weight-black">مفتاح الصلاحية</th>
                <th class="text-right text-gold font-weight-black">الوصف والاسم الشائع</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="safeLength((data as any).permissions) === 0">
                <td colspan="3" class="text-center py-12 text-gold opacity-20">
                  لا توجد تعريفات للصلاحيات في النظام
                </td>
              </tr>
              <tr
                v-for="p in safeArray((data as any).permissions)"
                :key="(p as any).permission_key"
                class="premium-hover-row"
              >
                <td class="text-accent font-weight-black">{{ (p as any).module_key }}</td>
                <td class="text-gold opacity-60 font-mono text-caption">
                  {{ (p as any).permission_key }}
                </td>
                <td class="text-white font-weight-bold">{{ (p as any).permission_name }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </template>

      <div v-else-if="!loading" class="text-center py-24">
        <LucideIcon name="shield-alert" :size="100" class="text-gold opacity-10 mb-6 mx-auto" />
        <div class="text-h5 text-gold opacity-30 font-weight-black">
          الرجاء تحديث التقرير لعرض مصفوفة الصلاحيات
        </div>
      </div>
    </v-card>

    <PrintSignaturePage />
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { safeArray, safeLength } from '../utils/safe'
import PrintReportFrame from '../components/common/PrintReportFrame.vue'
import PrintSignaturePage from '../components/common/PrintSignaturePage.vue'
import LucideIcon from '../components/common/LucideIcon.vue'

const data = ref<any | null>(null)
const error = ref('')
const loading = ref(false)

const load = async (): Promise<void> => {
  loading.value = true
  error.value = ''
  try {
    data.value = await (window as any).api.reports.getUsersPermissionsReport()
  } catch (e: unknown) {
    error.value = (e as Error)?.message || 'فشل تحميل تقرير الصلاحيات'
    data.value = null
  } finally {
    loading.value = false
  }
}

const printPage = () => window.print()

const exportPdf = async (): Promise<void> => {
  try {
    await (window as any).api.reports.exportPdf({ type: 'users_permissions', params: {} })
  } catch {
    error.value = 'فشل تصدير PDF'
  }
}

const exportCsv = async (): Promise<void> => {
  if (!data.value || !data.value.users) return
  try {
    const rows = safeArray(data.value.users).map((u: any) => ({
      username: u.username,
      role_key: u.role_key,
      is_active: u.is_active,
      must_change_password: u.must_change_password
    }))
    await (window as any).api.reports.exportCsv('users-report.csv', rows)
  } catch {
    error.value = 'فشل تصدير ملف CSV'
  }
}

onMounted(() => {
  load()
})
</script>

<style scoped>
.rtl {
  direction: rtl;
}
.font-mono {
  font-family: 'Consolas', 'Monaco', monospace;
}
.gap-3 {
  gap: 0.75rem;
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
