<template>
  <v-container fluid class="pa-6">
    <!-- Header with Action Button -->
    <v-row class="mb-8 align-center px-4">
      <v-col>
        <div class="d-flex align-center">
          <div
            class="header-icon-box pa-4 rounded-xl glass-card-noir border-accent me-4 shadow-premium"
          >
            <LucideIcon name="layout" :size="32" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-primary tracking-tight">{{ title }}</h1>
            <p class="text-subtitle-1 text-text-muted font-weight-bold mt-1">
              إدارة {{ title }} في نظام B2B الاحترافي الموحد
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="auto">
        <v-btn
          color="primary"
          variant="flat"
          size="large"
          class="font-weight-black rounded-xl px-8 shadow-premium premium-btn-glow premium-btn-gold-gradient"
          height="56"
        >
          <LucideIcon name="plus-circle" :size="20" class="me-2" />
          إضافة {{ titleSingle }} جديد
        </v-btn>
      </v-col>
    </v-row>

    <!-- Placeholder Table -->
    <v-card elevation="0" class="glass-card border shadow-premium overflow-hidden glass-card">
      <v-data-table :headers="headers" :items="placeholderItems" class="bg-transparent" hover>
        <template #item.actions>
          <div class="d-flex justify-end ga-2">
            <v-btn
              variant="tonal"
              color="primary"
              size="small"
              class="rounded-lg premium-btn-gold-gradient"
            >
              <LucideIcon name="pencil" :size="16" />
            </v-btn>
            <v-btn
              variant="tonal"
              color="error"
              size="small"
              class="rounded-lg premium-btn-gold-gradient"
            >
              <LucideIcon name="trash-2" :size="16" />
            </v-btn>
          </div>
        </template>

        <template #no-data>
          <div class="pa-10 text-center">
            <div class="bg-primary-alpha pa-6 rounded-circle d-inline-flex mb-4">
              <LucideIcon name="database-zap" :size="48" class="text-primary" />
            </div>
            <p class="text-h6 text-primary font-weight-black">لا توجد بيانات متاحة حالياً</p>
            <p class="text-body-2 text-text-muted">سيتم عرض السجلات هنا بمجرد إضافتها للنظام</p>
          </div>
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LucideIcon from '../components/common/LucideIcon.vue'

const props = defineProps<{
  title: string
}>()

const titleSingle = computed(() => {
  // Simple heuristic for Arabic singulization for the button
  if (props.title === 'الموكلين') return 'موكل'
  if (props.title === 'القضايا') return 'قضية'
  if (props.title === 'الوكالات') return 'وكالة'
  if (props.title === 'الجلسات') return 'جلسة'
  if (props.title === 'المهام') return 'مهمة'
  return 'سجل'
})

const headers = [
  { title: 'الرقم التسلسلي', key: 'id', align: 'start' as const },
  { title: 'العنوان/الاسم', key: 'name', align: 'start' as const },
  { title: 'التاريخ', key: 'date', align: 'start' as const },
  { title: 'الحالة', key: 'status', align: 'start' as const },
  { title: 'إجراءات', key: 'actions', sortable: false, align: 'end' as const }
]

const placeholderItems = [
  { id: '1001', name: 'مثال لسجل بيانات أول', date: '2026-02-27', status: 'نشط' },
  { id: '1002', name: 'مثال لسجل بيانات ثانِ', date: '2026-02-28', status: 'قيد الانتظار' },
  { id: '1003', name: 'مثال لسجل بيانات ثالث', date: '2026-03-01', status: 'مكتمل' }
] as any[]
</script>

<style scoped>
.primary--text {
  color: #1565c0 !important;
}
</style>
