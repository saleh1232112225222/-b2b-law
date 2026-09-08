<template>
  <v-container fluid class="pa-6 pb-12 rtl report-page">
    <PrintReportFrame title="تقرير نسب نجاح القضايا ومؤشرات الإنجاز القضائي" />

    <!-- Print Only Summary -->
    <section class="print-only reports-print-index mb-6">
      <h1 class="text-h6 font-weight-bold mb-2">تقرير نسب نجاح القضايا ومؤشرات الإنجاز القضائي</h1>
      <p class="text-caption mb-4">
        تاريخ الاستخراج: {{ new Date().toLocaleDateString('ar-SA') }} | النطاق: 
        {{ filters.from || 'البداية' }} إلى {{ filters.to || 'الآن' }}
      </p>
      <div v-if="stats" class="mb-4">
        <strong>معدل النجاح الوزني: {{ stats.successRate }}%</strong> | 
        <strong>نسبة الحسم التام: {{ stats.pureWinRate }}%</strong> | 
        <strong>إجمالي القضايا المغلقة: {{ stats.closedCases }}</strong> | 
        <strong>نسبة الاسترداد المالي: {{ stats.financialRecoveryRate }}%</strong>
      </div>
    </section>

    <!-- Header Section -->
    <v-row dense class="mb-6 align-center no-print">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-4 border-gold opacity-20">
            <LucideIcon name="award" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">
              تقرير نسب نجاح القضايا ومؤشرات الإنجاز
            </h1>
            <p class="text-subtitle-2 text-gold opacity-60 font-weight-medium">
              قياس معياري دقيق لمعدلات كسب الدعاوى وحسم النزاعات وفق دور العميل وتشريح أسباب الإخفاق
            </p>
          </div>
        </div>
      </v-col>

      <v-col cols="auto" class="d-flex gap-3 report-header-actions">
        <v-btn
          color="gold"
          variant="outlined"
          height="44"
          class="rounded-xl px-5 font-weight-black premium-hover premium-btn-gold-gradient"
          :loading="loading"
          @click="loadAll"
        >
          <LucideIcon name="refresh-cw" :size="18" class="me-2" /> تحديث البيانات
        </v-btn>

        <v-menu transition="scale-transition">
          <template #activator="{ props }">
            <v-btn
              color="accent"
              variant="flat"
              height="44"
              class="rounded-xl px-6 font-weight-black premium-lift text-ebony premium-btn-gold-gradient"
              v-bind="props"
            >
              <LucideIcon name="download" :size="18" class="me-2" /> تصدير التقرير
            </v-btn>
          </template>
          <v-list class="glass-card border border-gold border-opacity-20 mt-2">
            <v-list-item class="premium-hover-row" @click="exportPdf">
              <template #prepend>
                <LucideIcon name="file-text" :size="18" class="text-gold me-3" />
              </template>
              <v-list-item-title class="text-white font-weight-black">تقرير PDF تفصيلي</v-list-item-title>
            </v-list-item>
            <v-list-item class="premium-hover-row" @click="printPage">
              <template #prepend>
                <LucideIcon name="printer" :size="18" class="text-gold me-3" />
              </template>
              <v-list-item-title class="text-white font-weight-black">طباعة فورية</v-list-item-title>
            </v-list-item>
            <v-list-item class="premium-hover-row" @click="exportCsv">
              <template #prepend>
                <LucideIcon name="sheet" :size="18" class="text-gold me-3" />
              </template>
              <v-list-item-title class="text-white font-weight-black">تصدير جداول Excel/CSV</v-list-item-title>
            </v-list-item>
            <v-list-item class="premium-hover-row" @click="exportJson">
              <template #prepend>
                <LucideIcon name="code" :size="18" class="text-gold me-3" />
              </template>
              <v-list-item-title class="text-white font-weight-black">تصدير بيانات خام (JSON)</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-col>
    </v-row>

    <!-- Error Alert -->
    <v-alert
      v-if="error"
      type="error"
      variant="flat"
      class="mb-6 rounded-xl font-weight-black border-2 border-error-darken-1 no-print"
    >
      <template #prepend>
        <LucideIcon name="alert-triangle" :size="22" class="me-3" />
      </template>
      {{ error }}
    </v-alert>

    <!-- Filter Toolbar -->
    <v-card elevation="0" class="glass-card pa-5 rounded-xl border border-gold border-opacity-10 mb-6 no-print">
      <v-row dense class="align-center">
        <v-col cols="12" sm="6" md="3">
          <v-text-field
            v-model="filters.from"
            label="من تاريخ القيد"
            type="date"
            density="compact"
            variant="outlined"
            hide-details
            class="rounded-lg font-weight-medium"
            @change="loadAll"
          />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-text-field
            v-model="filters.to"
            label="إلى تاريخ القيد"
            type="date"
            density="compact"
            variant="outlined"
            hide-details
            class="rounded-lg font-weight-medium"
            @change="loadAll"
          />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-select
            v-model="filters.clientRole"
            :items="roleFilterOptions"
            label="دور العميل في الدعوى"
            density="compact"
            variant="outlined"
            hide-details
            class="rounded-lg font-weight-medium"
            @update:model-value="loadAll"
          />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-text-field
            v-model="filters.court"
            label="المحكمة / الجهة القضائية"
            density="compact"
            variant="outlined"
            placeholder="مثال: المحكمة التجارية"
            hide-details
            clearable
            class="rounded-lg font-weight-medium"
            @keyup.enter="loadAll"
            @click:clear="onClearCourt"
          />
        </v-col>
      </v-row>
    </v-card>

    <!-- Main Content -->
    <template v-if="stats">
      <!-- KPI Metric Cards -->
      <v-row dense class="mb-6">
        <!-- Weighted Success Rate -->
        <v-col cols="12" sm="6" md="3">
          <v-card
            elevation="0"
            class="glass-card pa-5 rounded-xl border border-gold border-opacity-20 premium-hover h-100"
          >
            <div class="d-flex justify-space-between align-start mb-3">
              <div>
                <div class="text-caption font-weight-black text-gold opacity-80 mb-1">
                  معدل النجاح الوزني
                </div>
                <div class="text-h4 font-weight-black text-success">
                  {{ stats.successRate }}%
                </div>
              </div>
              <div class="glass-panel-light pa-3 rounded-xl border border-success border-opacity-30">
                <LucideIcon name="check-circle-2" :size="24" class="text-success" />
              </div>
            </div>
            <v-progress-linear
              :model-value="stats.successRate"
              color="success"
              height="6"
              rounded
              class="mb-2"
            />
            <div class="text-tiny text-gold opacity-60 font-weight-medium">
              احتساب معياري: كسب/رد دعوى 100%، صلح 75%، جزئي 50%
            </div>
          </v-card>
        </v-col>

        <!-- Pure Win Rate -->
        <v-col cols="12" sm="6" md="3">
          <v-card
            elevation="0"
            class="glass-card pa-5 rounded-xl border border-gold border-opacity-20 premium-hover h-100"
          >
            <div class="d-flex justify-space-between align-start mb-3">
              <div>
                <div class="text-caption font-weight-black text-gold opacity-80 mb-1">
                  نسبة الحسم التام (كسب قطعي)
                </div>
                <div class="text-h4 font-weight-black text-accent">
                  {{ stats.pureWinRate }}%
                </div>
              </div>
              <div class="glass-panel-light pa-3 rounded-xl border border-accent border-opacity-30">
                <LucideIcon name="shield-check" :size="24" class="text-accent" />
              </div>
            </div>
            <v-progress-linear
              :model-value="stats.pureWinRate"
              color="accent"
              height="6"
              rounded
              class="mb-2"
            />
            <div class="text-tiny text-gold opacity-60 font-weight-medium">
              {{ stats.fullWinCases + stats.dismissedCases }} قضية بحكم كامل أو رد دعوى
            </div>
          </v-card>
        </v-col>

        <!-- Financial Recovery Rate -->
        <v-col cols="12" sm="6" md="3">
          <v-card
            elevation="0"
            class="glass-card pa-5 rounded-xl border border-gold border-opacity-20 premium-hover h-100"
          >
            <div class="d-flex justify-space-between align-start mb-3">
              <div>
                <div class="text-caption font-weight-black text-gold opacity-80 mb-1">
                  معدل الاسترداد المالي
                </div>
                <div class="text-h4 font-weight-black text-gold">
                  {{ stats.financialRecoveryRate }}%
                </div>
              </div>
              <div class="glass-panel-light pa-3 rounded-xl border border-gold border-opacity-30">
                <LucideIcon name="coins" :size="24" class="text-gold" />
              </div>
            </div>
            <div class="d-flex justify-space-between text-tiny font-weight-bold mb-1">
              <span class="text-success">المحكوم: {{ formatCurrency(stats.totalAwardedAmount) }}</span>
              <span class="text-gold opacity-60">المطالبة: {{ formatCurrency(stats.totalClaimedAmount) }}</span>
            </div>
            <v-progress-linear
              :model-value="stats.financialRecoveryRate"
              color="gold"
              height="6"
              rounded
            />
          </v-card>
        </v-col>

        <!-- Litigation Duration & Status -->
        <v-col cols="12" sm="6" md="3">
          <v-card
            elevation="0"
            class="glass-card pa-5 rounded-xl border border-gold border-opacity-20 premium-hover h-100"
          >
            <div class="d-flex justify-space-between align-start mb-3">
              <div>
                <div class="text-caption font-weight-black text-gold opacity-80 mb-1">
                  متوسط مدة التقاضي للحكم
                </div>
                <div class="text-h4 font-weight-black text-white">
                  {{ stats.avgDurationDays }} <span class="text-body-2 text-gold opacity-70">يوم</span>
                </div>
              </div>
              <div class="glass-panel-light pa-3 rounded-xl border border-white border-opacity-20">
                <LucideIcon name="clock" :size="24" class="text-white" />
              </div>
            </div>
            <div class="d-flex align-center justify-space-between text-tiny font-weight-bold text-gold opacity-80 mt-3">
              <span>قضايا مغلقة: {{ stats.closedCases }}</span>
              <span>قيد النظر: {{ stats.pendingCases }}</span>
              <span>الإجمالي: {{ stats.totalCases }}</span>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Outcome Distribution Summary Pills -->
      <v-card elevation="0" class="glass-card pa-4 rounded-xl border border-gold border-opacity-10 mb-6">
        <div class="text-caption font-weight-black text-gold mb-3 d-flex align-center">
          <LucideIcon name="pie-chart" :size="16" class="me-2 text-accent" />
          تفصيل أحكام القضايا المغلقة ({{ stats.closedCases }} قضية)
        </div>
        <v-row dense>
          <v-col cols="6" sm="4" md="2">
            <div class="pa-3 rounded-lg text-center border border-success border-opacity-30 bg-success-opacity-10">
              <div class="text-tiny font-weight-bold text-success mb-1">حكم بكامل الطلبات</div>
              <div class="text-h6 font-weight-black text-success">{{ stats.fullWinCases }}</div>
            </div>
          </v-col>
          <v-col cols="6" sm="4" md="2">
            <div class="pa-3 rounded-lg text-center border border-accent border-opacity-30 bg-accent-opacity-10">
              <div class="text-tiny font-weight-bold text-accent mb-1">رد الدعوى / صرف نظر</div>
              <div class="text-h6 font-weight-black text-accent">{{ stats.dismissedCases }}</div>
            </div>
          </v-col>
          <v-col cols="6" sm="4" md="2">
            <div class="pa-3 rounded-lg text-center border border-info border-opacity-30 bg-info-opacity-10">
              <div class="text-tiny font-weight-bold text-info mb-1">تسوية / صلح</div>
              <div class="text-h6 font-weight-black text-info">{{ stats.settledCases }}</div>
            </div>
          </v-col>
          <v-col cols="6" sm="4" md="2">
            <div class="pa-3 rounded-lg text-center border border-warning border-opacity-30 bg-warning-opacity-10">
              <div class="text-tiny font-weight-bold text-warning mb-1">كسب جزئي</div>
              <div class="text-h6 font-weight-black text-warning">{{ stats.partialWinCases }}</div>
            </div>
          </v-col>
          <v-col cols="6" sm="4" md="2">
            <div class="pa-3 rounded-lg text-center border border-error border-opacity-30 bg-error-opacity-10">
              <div class="text-tiny font-weight-bold text-error mb-1">حكم ضد الموكل (خاسرة)</div>
              <div class="text-h6 font-weight-black text-error">{{ stats.lostCases }}</div>
            </div>
          </v-col>
          <v-col cols="6" sm="4" md="2">
            <div class="pa-3 rounded-lg text-center border border-grey border-opacity-30 bg-grey-opacity-10">
              <div class="text-tiny font-weight-bold text-grey mb-1">قيد التداول / غير محكومة</div>
              <div class="text-h6 font-weight-black text-white">{{ stats.pendingCases }}</div>
            </div>
          </v-col>
        </v-row>
      </v-card>

      <!-- Analytics Tabs Section -->
      <v-card elevation="0" class="glass-card rounded-xl border border-gold border-opacity-10 mb-6">
        <v-tabs
          v-model="activeTab"
          color="accent"
          align-tabs="start"
          class="border-b border-gold border-opacity-10 px-4"
        >
          <v-tab value="roles" class="font-weight-black">
            <LucideIcon name="users" :size="18" class="me-2" /> نسب النجاح حسب دور العميل
          </v-tab>
          <v-tab value="types" class="font-weight-black">
            <LucideIcon name="briefcase" :size="18" class="me-2" /> النجاح حسب نوع القضية
          </v-tab>
          <v-tab value="lawyers" class="font-weight-black">
            <LucideIcon name="scale" :size="18" class="me-2" /> أداء المحامين والمستشارين
          </v-tab>
          <v-tab value="failures" class="font-weight-black">
            <LucideIcon name="alert-octagon" :size="18" class="me-2 text-error" /> تشريح أسباب الإخفاق
          </v-tab>
        </v-tabs>

        <v-window v-model="activeTab" class="pa-6">
          <!-- Tab 1: By Client Role -->
          <v-window-item value="roles">
            <v-row dense>
              <v-col
                v-for="r in (breakdown?.byClientRole || [])"
                :key="r.role"
                cols="12"
                md="6"
              >
                <v-card elevation="0" class="glass-panel-light pa-5 rounded-xl border border-gold border-opacity-10 mb-4">
                  <div class="d-flex justify-space-between align-center mb-4">
                    <div>
                      <div class="text-subtitle-1 font-weight-black text-white">
                        صفة الموكل: <span class="text-accent">{{ r.role }}</span>
                      </div>
                      <div class="text-caption text-gold opacity-60">
                        إجمالي القضايا: {{ r.total }} قضية
                      </div>
                    </div>
                    <div class="text-end">
                      <div class="text-h5 font-weight-black text-success">
                        {{ calcPercent(r.total_success, r.total) }}%
                      </div>
                      <div class="text-tiny text-gold opacity-70">معدل النجاح التراكمي</div>
                    </div>
                  </div>

                  <v-progress-linear
                    :model-value="calcPercent(r.total_success, r.total)"
                    color="success"
                    height="8"
                    rounded
                    class="mb-4"
                  />

                  <div class="d-flex justify-space-between text-caption font-weight-bold">
                    <span class="text-success">
                      {{ r.role === 'مدعى عليه' ? 'رد دعوى / حسم كامل' : 'كسب كامل' }}: {{ r.pure_win }}
                    </span>
                    <span class="text-accent">
                      إجمالي الأحكام الناجحة: {{ r.total_success }}
                    </span>
                    <span class="text-error">
                      خسارة: {{ r.lost }}
                    </span>
                  </div>
                </v-card>
              </v-col>
            </v-row>
          </v-window-item>

          <!-- Tab 2: By Case Type -->
          <v-window-item value="types">
            <v-table class="bg-transparent">
              <thead>
                <tr>
                  <th class="text-right text-gold font-weight-black">التصنيف القضائي</th>
                  <th class="text-center text-gold font-weight-black">إجمالي القضايا</th>
                  <th class="text-center text-gold font-weight-black">حسم قطعي</th>
                  <th class="text-center text-gold font-weight-black">إجمالي الناجحة</th>
                  <th class="text-center text-gold font-weight-black">خاسرة</th>
                  <th class="text-center text-gold font-weight-black" style="min-width: 140px;">مؤشر النجاح</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in (breakdown?.byCaseType || [])" :key="t.case_type" class="premium-hover-row">
                  <td class="font-weight-black text-white">{{ t.case_type }}</td>
                  <td class="text-center font-weight-bold">{{ t.total }}</td>
                  <td class="text-center text-success font-weight-bold">{{ t.pure_win }}</td>
                  <td class="text-center text-accent font-weight-bold">{{ t.total_success }}</td>
                  <td class="text-center text-error font-weight-bold">{{ t.lost }}</td>
                  <td class="text-center">
                    <div class="d-flex align-center gap-2">
                      <v-progress-linear
                        :model-value="calcPercent(t.total_success, t.total)"
                        :color="getSuccessColor(calcPercent(t.total_success, t.total))"
                        height="6"
                        rounded
                        class="flex-grow-1"
                      />
                      <span class="text-caption font-weight-black" style="min-width: 40px;">
                        {{ calcPercent(t.total_success, t.total) }}%
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-window-item>

          <!-- Tab 3: By Lawyer -->
          <v-window-item value="lawyers">
            <v-table class="bg-transparent">
              <thead>
                <tr>
                  <th class="text-right text-gold font-weight-black">المحامي / المستشار المسؤول</th>
                  <th class="text-center text-gold font-weight-black">إجمالي القضايا المسندة</th>
                  <th class="text-center text-gold font-weight-black">أحكام محسومة لصالحه</th>
                  <th class="text-center text-gold font-weight-black">خاسرة</th>
                  <th class="text-center text-gold font-weight-black" style="min-width: 160px;">معدل النجاح</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="l in (breakdown?.byLawyer || [])" :key="l.lawyer_id || l.lawyer_name" class="premium-hover-row">
                  <td class="font-weight-black text-white">
                    <div class="d-flex align-center">
                      <LucideIcon name="user-check" :size="16" class="text-accent me-2" />
                      {{ l.lawyer_name }}
                    </div>
                  </td>
                  <td class="text-center font-weight-bold">{{ l.total }}</td>
                  <td class="text-center text-success font-weight-bold">{{ l.total_success }}</td>
                  <td class="text-center text-error font-weight-bold">{{ l.lost }}</td>
                  <td class="text-center">
                    <div class="d-flex align-center gap-2">
                      <v-progress-linear
                        :model-value="calcPercent(l.total_success, l.total)"
                        :color="getSuccessColor(calcPercent(l.total_success, l.total))"
                        height="6"
                        rounded
                        class="flex-grow-1"
                      />
                      <span class="text-caption font-weight-black" style="min-width: 40px;">
                        {{ calcPercent(l.total_success, l.total) }}%
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-window-item>

          <!-- Tab 4: Failure Reasons Analysis -->
          <v-window-item value="failures">
            <div class="d-flex justify-space-between align-center mb-4">
              <div>
                <h3 class="text-subtitle-1 font-weight-black text-error mb-1">
                  تشريح وتحليل مسببات عدم كسب القضايا
                </h3>
                <p class="text-caption text-gold opacity-70">
                  حصر إجمالي القضايا الخاسرة ({{ failureData?.totalLostCases || 0 }} قضية) واستخلاص الدروس المعيارية لتفاديها
                </p>
              </div>
              <v-chip color="error" variant="outlined" class="font-weight-black">
                إجمالي الإخفاق: {{ failureData?.totalLostCases || 0 }}
              </v-chip>
            </div>

            <v-table v-if="(failureData?.reasons || []).length > 0" class="bg-transparent">
              <thead>
                <tr>
                  <th class="text-right text-gold font-weight-black">سبب الإخفاق / علة الحكم السلبي</th>
                  <th class="text-center text-gold font-weight-black">التكرار</th>
                  <th class="text-center text-gold font-weight-black">النسبة من إجمالي الخسارة</th>
                  <th class="text-right text-gold font-weight-black">الإجراء الوقائي المقترح</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="f in failureData.reasons" :key="f.reason" class="premium-hover-row">
                  <td class="font-weight-black text-white">
                    <div class="d-flex align-center">
                      <LucideIcon name="alert-circle" :size="16" class="text-error me-2" />
                      {{ f.reason }}
                    </div>
                  </td>
                  <td class="text-center font-weight-bold text-error">{{ f.count }}</td>
                  <td class="text-center font-weight-black text-warning">
                    {{ f.percentage }}%
                  </td>
                  <td class="text-caption text-gold opacity-90 font-weight-medium">
                    {{ getPreventiveMeasure(f.reason) }}
                  </td>
                </tr>
              </tbody>
            </v-table>

            <v-alert
              v-else
              type="success"
              variant="tonal"
              class="rounded-xl font-weight-bold"
            >
              لم تسجل أي قضايا خاسرة ضمن معايير البحث الحالية. سجل إنجاز متميز!
            </v-alert>
          </v-window-item>
        </v-window>
      </v-card>
    </template>

    <!-- Loading State -->
    <v-row v-else-if="loading">
      <v-col v-for="i in 4" :key="i" cols="12" md="3">
        <v-skeleton-loader type="card" class="rounded-xl glass-card" color="transparent" />
      </v-col>
      <v-col cols="12">
        <v-skeleton-loader type="table" class="rounded-xl glass-card" color="transparent" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import LucideIcon from '../components/common/LucideIcon.vue'
import PrintReportFrame from '../components/common/PrintReportFrame.vue'

const loading = ref(false)
const error = ref('')
const activeTab = ref('roles')

const filters = reactive({
  from: '',
  to: '',
  court: '',
  clientRole: 'الكل'
})

const roleFilterOptions = ['الكل', 'مدّعي', 'مدعى عليه']

const stats = ref<any>(null)
const breakdown = ref<any>(null)
const failureData = ref<any>(null)

const calcPercent = (part: number, total: number): number => {
  if (!total || total === 0) return 0
  return Math.round((part / total) * 1000) / 10
}

const getSuccessColor = (pct: number): string => {
  if (pct >= 80) return 'success'
  if (pct >= 60) return 'accent'
  if (pct >= 40) return 'warning'
  return 'error'
}

const formatCurrency = (val: number): string => {
  if (!val) return '0 ر.س'
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(val) + ' ر.س'
}

const getPreventiveMeasure = (reason: string): string => {
  const r = (reason || '').toLowerCase()
  if (r.includes('بينة') || r.includes('مستند') || r.includes('إثبات')) {
    return 'تشديد الفحص النافي للجهالة للأدلة وحصر البينات قبل قيد لائحة الدعوى.'
  }
  if (r.includes('ميعاد') || r.includes('تقادم') || r.includes('مدة')) {
    return 'تفعيل التنبيهات المؤتمتة لمدد التقادم ومواعيد الاعتراض والطعن النظامية.'
  }
  if (r.includes('صفة') || r.includes('اختصاص')) {
    return 'مراجعة قيود الاختصاص النوعي والمكاني والتحقق من صحة السجل التجاري للخصم.'
  }
  return 'إجراء دراسة قانونية معمقة قبل تبني الدعوى وتقييم المخاطر مسبقاً.'
}

const onClearCourt = () => {
  filters.court = ''
  loadAll()
}

const buildQueryParams = () => {
  const p: any = {}
  if (filters.from) p.from = filters.from
  if (filters.to) p.to = filters.to
  if (filters.court && filters.court.trim()) p.court = filters.court.trim()
  if (filters.clientRole && filters.clientRole !== 'الكل') p.clientRole = filters.clientRole
  return p
}

const loadAll = async () => {
  loading.value = true
  error.value = ''
  try {
    const params = buildQueryParams()
    const reportsApi = (window as any).api?.reports

    if (!reportsApi) {
      throw new Error('محرك التقارير غير متاح')
    }

    const [statsRes, breakdownRes, failureRes] = await Promise.all([
      reportsApi.getCaseSuccessStats(params),
      reportsApi.getCaseSuccessBreakdown(params),
      reportsApi.getCaseFailureAnalysis(params)
    ])

    stats.value = statsRes?.data || statsRes
    breakdown.value = breakdownRes?.data || breakdownRes
    failureData.value = failureRes?.data || failureRes
  } catch (err: any) {
    console.error('[CASE_SUCCESS_REPORT] load error:', err)
    error.value = err?.message || 'فشل تحميل بيانات تقرير نجاح القضايا'
  } finally {
    loading.value = false
  }
}

const exportPdf = async () => {
  try {
    const reportsApi = (window as any).api?.reports
    if (reportsApi?.exportPdf) {
      await reportsApi.exportPdf({
        type: 'case-success',
        params: buildQueryParams(),
        filename: 'تقرير_نسب_نجاح_القضايا.pdf'
      })
    } else {
      window.print()
    }
  } catch (err) {
    console.error('PDF export failed:', err)
    window.print()
  }
}

const printPage = () => {
  window.print()
}

const exportCsv = async () => {
  try {
    const reportsApi = (window as any).api?.reports
    const rows = [
      { المؤشر: 'معدل النجاح الوزني', القيمة: `${stats.value?.successRate || 0}%` },
      { المؤشر: 'نسبة الحسم التام', القيمة: `${stats.value?.pureWinRate || 0}%` },
      { المؤشر: 'إجمالي القضايا المغلقة', القيمة: stats.value?.closedCases || 0 },
      { المؤشر: 'أحكام بكامل الطلبات', القيمة: stats.value?.fullWinCases || 0 },
      { المؤشر: 'رد الدعوى / صرف نظر', القيمة: stats.value?.dismissedCases || 0 },
      { المؤشر: 'تسوية / صلح', القيمة: stats.value?.settledCases || 0 },
      { المؤشر: 'كسب جزئي', القيمة: stats.value?.partialWinCases || 0 },
      { المؤشر: 'قضايا خاسرة', القيمة: stats.value?.lostCases || 0 },
      { المؤشر: 'معدل الاسترداد المالي', القيمة: `${stats.value?.financialRecoveryRate || 0}%` },
      { المؤشر: 'متوسط مدة التقاضي (يوم)', القيمة: stats.value?.avgDurationDays || 0 }
    ]
    if (reportsApi?.exportCsv) {
      await reportsApi.exportCsv({
        filename: 'مؤشرات_نجاح_القضايا.csv',
        rows
      })
    }
  } catch (err) {
    console.error('CSV export failed:', err)
  }
}

const exportJson = () => {
  const exportPayload = {
    generatedAt: new Date().toISOString(),
    filters,
    stats: stats.value,
    breakdown: breakdown.value,
    failureAnalysis: failureData.value
  }
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2))
  const a = document.createElement('a')
  a.setAttribute('href', dataStr)
  a.setAttribute('download', 'case_success_metrics.json')
  document.body.appendChild(a)
  a.click()
  a.remove()
}

onMounted(() => {
  loadAll()
})
</script>

<style scoped>
.rtl {
  direction: rtl;
}
.gap-2 {
  gap: 0.5rem;
}
.gap-3 {
  gap: 0.75rem;
}
.text-tiny {
  font-size: 0.75rem !important;
}
.bg-success-opacity-10 {
  background: rgba(34, 197, 94, 0.08);
}
.bg-accent-opacity-10 {
  background: rgba(212, 175, 55, 0.08);
}
.bg-info-opacity-10 {
  background: rgba(59, 130, 246, 0.08);
}
.bg-warning-opacity-10 {
  background: rgba(245, 158, 11, 0.08);
}
.bg-error-opacity-10 {
  background: rgba(239, 68, 68, 0.08);
}
.bg-grey-opacity-10 {
  background: rgba(156, 163, 175, 0.08);
}

@media print {
  .no-print {
    display: none !important;
  }
  .print-only {
    display: block !important;
  }
}

@media screen {
  .print-only {
    display: none !important;
  }
}

/* Mobile responsive */
@media (max-width: 1023px) {
  .report-header-actions {
    flex: 0 0 100% !important;
    max-width: 100% !important;
    width: 100% !important;
    flex-direction: column !important;
    align-items: stretch !important;
    margin-top: 8px;
  }
  .report-header-actions :deep(.v-btn) {
    width: 100% !important;
  }
}
</style>
