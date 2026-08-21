<template>
  <v-container fluid class="pa-6 pb-12 rtl report-page">
    <PrintReportFrame title="فهرس مركز التقارير" />

    <section class="print-only reports-print-index">
      <h1>فهرس التقارير المتاحة</h1>
      <ol>
        <li v-for="report in reportCards" :key="`print-${report.path}`">
          <strong>{{ report.title }}</strong>
          <span>{{ report.subtitle }}</span>
        </li>
      </ol>
    </section>

    <!-- Header -->
    <v-row dense class="mb-8 align-center no-print">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="pie-chart" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-bold text-accent mb-1">مركز التقارير والرقابة</h1>
            <p class="text-body-2 text-ebony opacity-80 font-weight-bold">
              تحليل البيانات والمؤشرات القانونية والتشغيلية للمكتب
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="auto" class="d-flex gap-3">
        <v-btn
          variant="outlined"
          color="gold"
          class="rounded-lg px-6 font-weight-black premium-hover h-100 premium-btn-gold-gradient"
          @click="printPage"
        >
          <LucideIcon name="printer" :size="18" class="me-2" /> طباعة
        </v-btn>
        <v-btn
          color="accent"
          variant="flat"
          class="rounded-lg px-6 font-weight-black premium-lift h-100 premium-btn-gold-gradient"
          @click="exportPdf"
        >
          <LucideIcon name="file-text" :size="18" class="me-2" /> تصدير تقرير العمليات PDF
        </v-btn>
      </v-col>
    </v-row>

    <!-- Main Grid -->
    <v-alert v-if="error" type="error" variant="tonal" class="mb-6 no-print">
      {{ error }}
    </v-alert>

    <v-card elevation="0" class="glass-card pa-8 glass-card no-print">
      <v-row dense>
        <v-col v-for="report in reportCards" :key="report.path" cols="12" sm="6" md="4" lg="3">
          <v-card
            elevation="0"
            class="glass-panel-light premium-hover pa-6 rounded-xl border border-gold opacity-10 cursor-pointer h-100 d-flex flex-column glass-card"
            @click="$router.push(report.path)"
          >
            <div class="d-flex align-center mb-5">
              <div class="glass-panel pa-3 rounded-lg me-4 border">
                <LucideIcon :name="report.icon" :size="24" class="text-accent" />
              </div>
              <div>
                <div class="font-weight-black text-ebony text-subtitle-1 mb-1">
                  {{ report.title }}
                </div>
                <div class="text-tiny font-weight-black text-accent opacity-80">
                  {{ report.subtitle }}
                </div>
              </div>
            </div>
            <v-spacer></v-spacer>
            <div class="d-flex justify-end mt-4">
              <div class="glass-panel-light pa-1 rounded-circle opacity-30">
                <LucideIcon name="chevron-left" :size="16" class="text-gold" />
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import LucideIcon from '../components/common/LucideIcon.vue'
import PrintReportFrame from '../components/common/PrintReportFrame.vue'

const error = ref('')

const reportCards = [
  {
    title: 'الخدمات والارتباطات القانونية',
    subtitle: 'تحليل شامل للخدمات القانونية والتعاقدات والمستحقات',
    icon: 'scale',
    path: '/reports/legal-services'
  },
  {
    title: 'تقرير القضية',
    subtitle: 'تحليل شامل للقضية',
    icon: 'briefcase',
    path: '/reports/case'
  },
  {
    title: 'تقرير قضايا المحاكم',
    subtitle: 'بيان قضايا محكمة محددة بجلستها وملاحظاتها',
    icon: 'landmark',
    path: '/reports/court-cases'
  },
  {
    title: 'تقرير الجلسات',
    subtitle: 'مواعيد الجلسات والمرافعة',
    icon: 'calendar',
    path: '/reports/sessions'
  },
  {
    title: 'التقرير المالي',
    subtitle: 'القوائم والبيانات المالية',
    icon: 'banknote',
    path: '/reports/finance'
  },
  {
    title: 'سجل النشاط',
    subtitle: 'سجلات تدقيق النظام',
    icon: 'history',
    path: '/activity-log'
  },
  {
    title: 'نشاط المستخدم',
    subtitle: 'تتبع عمليات المستخدمين',
    icon: 'user-check',
    path: '/reports/user-activity'
  },
  {
    title: 'سجل المذكرات واللوائح',
    subtitle: 'أرشيف المذكرات واللوائح',
    icon: 'file-edit',
    path: '/reports/memoranda'
  },
  {
    title: 'تقرير المستندات',
    subtitle: 'أرشيف المستندات العام',
    icon: 'folder-open',
    path: '/reports/documents'
  },
  {
    title: 'تقرير الأداء',
    subtitle: 'مؤشرات الأداء والتشغيل',
    icon: 'trending-up',
    path: '/reports/operations'
  },
  {
    title: 'الاستعلام التفصيلي عن قضية',
    subtitle: 'التحقق العميق من البيانات',
    icon: 'zoom-in',
    path: '/reports/detailed-inquiry'
  },
  {
    title: 'تقرير الصلاحيات',
    subtitle: 'تدقيق الصلاحيات والوصول',
    icon: 'shield-check',
    path: '/reports/users'
  }
]

const printPage = () => {
  window.print()
}

const exportPdf = async () => {
  error.value = ''
  try {
    const result = await (window as any).api.reports.exportPdf({
      type: 'operations',
      filename: 'تقرير_العمليات.pdf',
      params: {}
    })
    if (result?.saved === false) error.value = 'تم إلغاء تصدير التقرير'
  } catch (e: unknown) {
    error.value = (e as Error)?.message || 'فشل تصدير تقرير العمليات'
  }
}
</script>

<style scoped>
.rtl {
  direction: rtl;
}

.gap-3 {
  gap: 0.75rem;
}

.opacity-10 {
  opacity: 1 !important; /* Overriding my own class to keep border visible but subtle via rgba if needed, but the border-gold class has its own alpha usually */
}

/* Ensure glass-panel-light has a subtle border */
.glass-panel-light {
  border: 1px solid rgba(212, 175, 55, 0.1) !important;
}

.glass-panel-light:hover {
  border-color: rgba(212, 175, 55, 0.4) !important;
  background: rgba(212, 175, 55, 0.05) !important;
}

@media print {
  .reports-print-index h1 {
    margin: 0 0 3mm;
    font-size: 15pt;
  }

  .reports-print-index ol {
    margin: 0;
    padding-inline-start: 8mm;
  }

  .reports-print-index li {
    margin-bottom: 1mm;
    padding-bottom: 1.5mm;
    border-bottom: 1px solid #ddd;
    break-inside: avoid;
    font-size: 9pt;
    line-height: 1.25;
  }

  .reports-print-index span {
    display: block;
    margin-top: 0.5mm;
    color: #555;
    font-size: 7.5pt;
    line-height: 1.2;
  }
}
</style>
