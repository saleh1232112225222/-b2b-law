<template>
  <v-card elevation="0" class="glass-card mb-6 pa-6 premium-lift">
    <v-row align="center">
      <v-col>
        <div class="d-flex align-center mb-2">
          <v-chip color="accent" variant="flat" class="me-3 font-weight-black text-primary-dark">{{ caseItem.case_number }}</v-chip>
          <v-chip :color="getPriorityColor(caseItem.priority)" size="small" variant="tonal" class="font-weight-black">{{ caseItem.priority }}</v-chip>
        </div>
        <div class="text-h6 font-weight-black text-visible-high text-wrap-dynamic">{{ caseItem.subject || 'بدون موضوع' }}</div>
        <div class="d-flex align-center text-caption mt-2 font-weight-black text-visible-high">
          <LucideIcon name="folder" :size="14" class="me-2" />
          {{ caseItem.main_classification || 'تصنيف رئيسي' }}
          <LucideIcon name="chevron-left" :size="12" class="mx-2" />
          {{ caseItem.sub_classification || 'تصنيف فرعي' }}
          <LucideIcon name="chevron-left" :size="12" class="mx-2" />
          {{ caseItem.case_type || 'نوع الدعوى' }}
        </div>
        <div class="text-body-2 text-visible-high mt-3">
          الموكل:
          <v-btn v-if="caseItem.client_id" variant="text" color="accent" class="px-0 font-weight-black text-body-2" :to="'/clients/' + caseItem.client_id" density="compact">
            {{ clientName }}
          </v-btn>
          <span v-else class="text-gold">{{ clientName }}</span>
        </div>
      </v-col>
      <v-col cols="auto" class="d-flex ga-3">
        <v-btn v-if="caseItem.folder_link" :href="caseItem.folder_link" target="_blank" variant="tonal" color="primary" class="rounded-lg font-weight-black" size="small">
          <LucideIcon name="folder" :size="16" class="me-1" /> مجلد القضية
        </v-btn>
        <v-btn v-if="caseItem.najiz_url" :href="caseItem.najiz_url" target="_blank" variant="tonal" color="primary" class="rounded-lg font-weight-black" size="small">
          <LucideIcon name="external-link" :size="16" class="me-1" /> ناجز
        </v-btn>
        <v-btn color="gold" variant="tonal" class="rounded-lg font-weight-black" :loading="generatingReport" @click="$emit('generateReport')">
          <LucideIcon name="file-text" :size="18" class="me-2" /> تقرير العميل
        </v-btn>
        <v-btn v-if="canCreateContracts" color="gold" variant="tonal" class="rounded-lg font-weight-black" :to="{ path: '/contracts', query: { case_id: caseItem.id, new_contract: '1' } }">
          <LucideIcon name="file-signature" :size="18" class="me-2" /> عقد الأتعاب
        </v-btn>
        <v-btn color="accent" variant="flat" class="rounded-lg font-weight-black text-primary-dark premium-lift" @click="$emit('edit')">
          <LucideIcon name="pencil" :size="18" class="me-2" /> تعديل الملف
        </v-btn>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'

defineProps<{
  caseItem: any
  clientName: string
  generatingReport: boolean
  canCreateContracts: boolean
}>()

defineEmits<{ generateReport: []; edit: [] }>()

const getPriorityColor = (priority: string): string => {
  const map: Record<string, string> = { عالية: 'var(--status-error)', متوسط: 'var(--status-warning)', منخفض: 'var(--status-success)', حرجة: 'var(--status-error-dark)' }
  return map[priority] || 'var(--text-muted)'
}
</script>
