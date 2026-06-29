<template>
  <div>
    <v-row v-if="loading" class="py-6">
      <v-col class="text-center"><v-progress-circular indeterminate color="accent" /></v-col>
    </v-row>
    <template v-else>
      <v-btn
        v-if="services.length > 0"
        variant="outlined"
        color="accent"
        size="small"
        class="font-weight-black mb-4"
        :to="'/legal-services?case_id=' + caseId"
      >
        <LucideIcon name="external-link" :size="14" class="me-1" /> فتح في الخدمات القانونية
      </v-btn>
      <v-list class="bg-transparent pa-0">
        <v-list-item
          v-for="s in services"
          :key="s.id"
          class="mb-2 glass-card border-0 premium-hover"
        >
          <template #prepend>
            <div class="bg-accent-alpha pa-2 rounded-lg me-3">
              <LucideIcon name="briefcase" :size="18" class="text-accent" />
            </div>
          </template>
          <v-list-item-title class="font-weight-black text-visible-high text-body-2 d-flex align-center ga-2">
            <span>{{ s.engagement_number }}</span>
            <v-chip size="x-small" :color="getStatusColor(s.status_name)" variant="flat" class="font-weight-bold">{{ s.status_name }}</v-chip>
          </v-list-item-title>
          <v-list-item-subtitle class="text-primary mt-1">
            <div>{{ s.description || s.purpose || '—' }}</div>
            <div class="d-flex flex-wrap ga-3 mt-1 text-caption">
              <span v-if="s.client_name">العميل: {{ s.client_name }}</span>
              <span v-if="s.responsible_name">المحامي: {{ s.responsible_name }}</span>
              <span v-if="s.category_name">التصنيف: {{ s.category_name }}</span>
              <span v-if="s.financial_compensation">المقابل: {{ Number(s.financial_compensation).toLocaleString() }} ر.س</span>
              <span v-if="s.paid_amount > 0" class="text-success">مدفوع: {{ Number(s.paid_amount).toLocaleString() }} ر.س</span>
            </div>
          </v-list-item-subtitle>
          <template #append>
            <v-btn
              icon="mdi-chevron-left"
              variant="text"
              size="small"
              color="accent"
              :to="'/legal-services/' + s.id"
            />
          </template>
        </v-list-item>
        <div v-if="services.length === 0" class="pa-10 text-center text-primary italic font-weight-bold">
          <LucideIcon name="briefcase" :size="32" class="mb-2 opacity-50 d-block mx-auto" />
          <div>لا توجد خدمات قانونية مرتبطة بهذه القضية</div>
          <v-btn
            variant="outlined"
            color="accent"
            size="small"
            class="font-weight-black mt-3"
            to="/legal-services"
          >
            إنشاء خدمة قانونية جديدة
          </v-btn>
        </div>
      </v-list>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import LucideIcon from '../../components/common/LucideIcon.vue'

const props = defineProps<{ caseId: string }>()

const services = ref<any[]>([])
const loading = ref(true)

const getStatusColor = (status: string): string => {
  const map: Record<string, string> = {
    'قيد التنفيذ': 'info',
    'معلق': 'warning',
    'مكتمل': 'success',
    'ملغي': 'error'
  }
  return map[status || ''] || 'grey'
}

const loadServices = async () => {
  loading.value = true
  try {
    const data = await window.api.legalServices.getByCaseId(props.caseId)
    services.value = Array.isArray(data) ? data : data?.data || []
  } catch {
    services.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadServices)
watch(() => props.caseId, loadServices)
</script>
