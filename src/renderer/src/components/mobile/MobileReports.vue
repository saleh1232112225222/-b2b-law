<template>
  <div class="pa-3">
    <v-card class="rounded-xl pa-4 mb-3 text-center" variant="outlined">
      <v-icon icon="mdi-file-report" :size="48" color="primary" class="mb-2" />
      <div class="text-body-1 font-weight-bold mb-2">التقارير</div>
      <div class="text-caption text-medium-emphasis mb-4">
        افتح التقرير ثم اختر الطباعة أو التصدير بالصيغة المناسبة لجهازك
      </div>

      <v-list nav density="compact">
        <v-list-item
          v-for="report in reports"
          :key="report.title"
          :title="report.title"
          :prepend-icon="report.icon"
          class="rounded-lg mb-1"
          @click="openReport(report)"
        >
          <template #append>
            <v-btn
              icon="mdi-chevron-left"
              variant="text"
              size="small"
              :aria-label="`فتح ${report.title}`"
              @click.stop="openReport(report)"
            />
          </template>
        </v-list-item>
      </v-list>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const reports = [
  { title: 'تقرير القضايا', icon: 'mdi-gavel', path: '/reports/case' },
  { title: 'التقرير المالي', icon: 'mdi-bank', path: '/reports/finance' },
  { title: 'تقرير الجلسات', icon: 'mdi-calendar', path: '/reports/sessions' },
  { title: 'تقرير المستندات', icon: 'mdi-file-document', path: '/reports/documents' },
  { title: 'تقرير المذكرات', icon: 'mdi-file-document-edit', path: '/reports/memoranda' }
]

const openReport = (report: any) => router.push(report.path)
</script>
