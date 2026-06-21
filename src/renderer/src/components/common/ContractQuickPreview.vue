<template>
  <div class="quick-preview-container">
    <div v-if="loading" class="text-center pa-10">
      <v-progress-circular indeterminate color="accent" size="50"></v-progress-circular>
      <div class="mt-4 text-gold opacity-50 font-weight-black">جاري استدعاء تفاصيل العقد...</div>
    </div>

    <div v-else-if="contract" class="pa-4">
      <!-- Title & Status Header -->
      <div
        class="d-flex align-center justify-space-between mb-6 bg-accent-alpha pa-4 rounded-xl border-gold-alpha"
      >
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-2 rounded-lg me-3">
            <LucideIcon name="file-signature" :size="24" class="text-accent" />
          </div>
          <div>
            <h4 class="text-subtitle-1 font-weight-black text-white mb-1">
              {{ contract.title || 'عقد بدون عنوان' }}
            </h4>
            <span class="text-caption text-gold opacity-60"
              >مرجع: {{ contract.contract_no || contract.id }}</span
            >
          </div>
        </div>
        <v-chip
          :color="contract.status === 'approved' ? 'green-darken-3' : 'gold'"
          variant="flat"
          class="font-weight-black rounded-lg px-4"
        >
          {{ contract.status === 'approved' ? 'معتمد' : 'مسودة' }}
        </v-chip>
      </div>

      <!-- Financial details -->
      <v-row class="mb-4">
        <v-col cols="6">
          <div class="text-tiny text-gold opacity-50 font-weight-bold mb-1">نوع العقد</div>
          <v-chip
            size="x-small"
            variant="tonal"
            :color="contract.contract_type === 'employment' ? 'gold' : 'accent'"
            class="font-weight-black"
          >
            {{ contract.contract_type === 'employment' ? 'عقد توظيف' : 'اتفاقية أتعاب' }}
          </v-chip>
        </v-col>
        <v-col cols="6">
          <div class="text-tiny text-gold opacity-50 font-weight-bold mb-1">القيمة المالية</div>
          <div class="text-body-2 font-weight-black text-accent">
            {{
              formatCurrency(
                contract.contract_type === 'employment'
                  ? contract.salary_amount
                  : contract.total_amount
              )
            }}
          </div>
        </v-col>
      </v-row>

      <v-divider class="border-gold opacity-10 mb-4"></v-divider>

      <!-- Associated Entity details -->
      <v-row class="mb-4">
        <v-col v-if="contract.contract_date || contract.start_date" cols="6">
          <div class="text-tiny text-gold opacity-50 font-weight-bold mb-1">تاريخ الاتفاقية</div>
          <div class="text-body-2 font-weight-black text-white">
            {{ contract.contract_date || contract.start_date }}
          </div>
        </v-col>
        <v-col v-if="contract.end_date" cols="6">
          <div class="text-tiny text-gold opacity-50 font-weight-bold mb-1">تاريخ الانتهاء</div>
          <div class="text-body-2 font-weight-black text-white">{{ contract.end_date }}</div>
        </v-col>
      </v-row>

      <!-- Judicial Text Content -->
      <div class="text-caption font-weight-black text-gold mb-2 d-flex align-center">
        <LucideIcon name="scroll" :size="16" class="me-2 opacity-50" /> بنود المتن القانوني الموثق
      </div>
      <div
        class="glass-panel-light pa-4 rounded-xl border border-gold-alpha text-content-scroll mb-4"
      >
        <div
          class="whitespace-pre-wrap font-judicial text-white opacity-80 leading-loose text-caption pre-wrap"
        >
          {{ contract.text_content }}
        </div>
      </div>
    </div>

    <div v-else class="text-center pa-10 text-error">العقد المطلوب غير موجود.</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import LucideIcon from './LucideIcon.vue'

const props = defineProps<{
  contractId: string | number
}>()

const loading = ref(true)
const contract = ref<any>(null)

const loadData = async () => {
  if (!props.contractId) return
  loading.value = true
  try {
    const data = await (window as any).api.contracts.getById(String(props.contractId))
    if (data && data.contract) {
      contract.value = data.contract
    }
  } catch (err) {
    console.error('Failed to load contract quick preview:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

watch(
  () => props.contractId,
  () => {
    loadData()
  }
)

const formatCurrency = (val?: number) => {
  if (val === undefined || val === null) return '0.00 ر.س'
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(val)
}
</script>

<style scoped>
.bg-accent-alpha {
  background: rgba(var(--v-theme-accent), 0.08) !important;
}
.border-gold-alpha {
  border: 1px solid rgba(233, 195, 73, 0.15) !important;
}
.text-tiny {
  font-size: 0.72rem;
}
.glass-panel-light {
  background: rgba(255, 255, 255, 0.02) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.text-content-scroll {
  max-height: 250px;
  overflow-y: auto;
}
.font-judicial {
  font-family: 'Courier New', Courier, monospace;
}
.pre-wrap {
  white-space: pre-wrap;
}
</style>
