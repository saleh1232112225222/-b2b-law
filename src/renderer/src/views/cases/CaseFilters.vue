<template>
  <v-card elevation="0" class="glass-card mb-4 pa-4 glass-card">
    <v-row dense align="center">
      <v-col cols="12" md="3">
        <v-text-field
          v-model="localSearch"
          label="بحث برقم القضية، الموضوع، أو الموكل..."
          variant="outlined"
          density="comfortable"
          hide-details
          class="rounded-xl premium-select text-white glass-input"
          clearable
        >
          <template #prepend-inner>
            <LucideIcon name="search" :size="20" class="text-gold me-2" />
          </template>
        </v-text-field>
      </v-col>
      <v-col cols="12" sm="6" md="2">
        <v-select
          :model-value="stage || 'الكل'"
          :items="stageOptions"
          item-title="label"
          item-value="key"
          label="المسار / المرحلة"
          variant="outlined"
          density="comfortable"
          hide-details
          class="rounded-xl premium-select glass-input"
          @update:model-value="$emit('update:stage', $event)"
        >
          <template #prepend-inner>
            <LucideIcon name="git-commit" :size="18" class="text-gold me-2" />
          </template>
        </v-select>
      </v-col>
      <v-col cols="12" sm="6" md="2">
        <v-select
          :model-value="status"
          :items="['الكل', ...CASE_STATUSES]"
          label="الحالة"
          variant="outlined"
          density="comfortable"
          hide-details
          class="rounded-xl premium-select glass-input"
          @update:model-value="$emit('update:status', $event)"
        >
          <template #prepend-inner>
            <LucideIcon name="activity" :size="18" class="text-gold me-2" />
          </template>
        </v-select>
      </v-col>
      <v-col cols="12" sm="6" md="2">
        <v-select
          :model-value="priority"
          :items="['الكل', ...PRIORITIES]"
          label="الأولوية"
          variant="outlined"
          density="comfortable"
          hide-details
          class="rounded-xl premium-select glass-input"
          @update:model-value="$emit('update:priority', $event)"
        >
          <template #prepend-inner>
            <LucideIcon name="flag" :size="18" class="text-gold me-2" />
          </template>
        </v-select>
      </v-col>
      <v-col cols="12" sm="6" md="2">
        <v-select
          :model-value="responsibleUserId"
          :items="assignableUsers"
          :item-title="getUserDisplayName"
          item-value="id"
          label="المسؤول"
          variant="outlined"
          density="comfortable"
          hide-details
          class="rounded-xl premium-select glass-input"
          clearable
          :loading="loading"
          @update:model-value="$emit('update:responsibleUserId', $event)"
        >
          <template #prepend-inner>
            <LucideIcon name="user" :size="18" class="text-gold me-2" />
          </template>
        </v-select>
      </v-col>
      <v-spacer />
      <v-col cols="auto">
        <v-btn
          variant="tonal"
          color="accent"
          class="rounded-lg px-4 h-48 premium-lift premium-btn-gold-gradient"
          :loading="loading"
          @click="$emit('refresh')"
        >
          <LucideIcon name="refresh-cw" :size="20" class="me-2" />
          <span class="font-weight-black">مزامنة</span>
        </v-btn>
      </v-col>
    </v-row>

    <!-- Pipeline Stages Quick Filter Pills -->
    <div class="mt-3 pt-3 border-t border-white-10 pipeline-stages-container">
      <div class="d-flex align-center justify-space-between mb-2">
        <span class="text-caption text-gold font-weight-black d-flex align-center">
          <LucideIcon name="git-commit" :size="15" class="me-1 text-accent" />
          مسار القضايا:
        </span>
        <v-btn
          v-if="stage && stage !== 'الكل'"
          size="x-small"
          variant="text"
          color="error"
          class="font-weight-bold px-1"
          @click="$emit('update:stage', 'الكل')"
        >
          <LucideIcon name="x" :size="13" class="me-1" />
          إلغاء التصفية
        </v-btn>
      </div>

      <div class="d-flex align-center gap-2 overflow-x-auto pb-1 px-0.5 pipeline-chips-scroll">
        <v-chip
          v-for="s in PIPELINE_STAGES"
          :key="s.key"
          size="small"
          :color="(stage || 'الكل') === s.key ? 'accent' : undefined"
          :variant="(stage || 'الكل') === s.key ? 'flat' : 'outlined'"
          class="pipeline-chip font-weight-black cursor-pointer px-3 flex-shrink-0"
          :class="{
            'active-stage-chip': (stage || 'الكل') === s.key,
            'inactive-stage-chip': (stage || 'الكل') !== s.key
          }"
          @click="$emit('update:stage', s.key)"
        >
          {{ s.label }}
        </v-chip>
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { CASE_STATUSES, PRIORITIES, PIPELINE_STAGES } from '../../utils/legalConstants'
import LucideIcon from '../../components/common/LucideIcon.vue'

const props = defineProps<{
  status: string
  priority: string
  responsibleUserId: string
  stage?: string
  assignableUsers: any[]
  loading: boolean
  modelValue: string
}>()

const emit = defineEmits<{
  'update:status': [value: string]
  'update:priority': [value: string]
  'update:responsibleUserId': [value: string]
  'update:stage': [value: string]
  'update:modelValue': [value: string]
  refresh: []
}>()

const stageOptions = PIPELINE_STAGES

const localSearch = ref(props.modelValue)

watch(
  () => props.modelValue,
  (v) => {
    localSearch.value = v
  }
)

watch(localSearch, (v) => {
  emit('update:modelValue', v)
})

const getUserDisplayName = (u: any): string => String(u?.full_name || u?.username || '')
</script>

<style scoped>
.pipeline-stages-container {
  width: 100%;
  max-width: 100%;
}

.pipeline-chips-scroll {
  overflow-x: auto !important;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  display: flex;
  flex-wrap: nowrap;
}

.pipeline-chips-scroll::-webkit-scrollbar {
  height: 4px;
}

.pipeline-chips-scroll::-webkit-scrollbar-thumb {
  background: rgba(233, 195, 73, 0.2);
  border-radius: 4px;
}

.pipeline-chip {
  flex-shrink: 0 !important;
  white-space: nowrap !important;
  font-size: 0.8rem !important;
  height: 28px !important;
  transition: all 0.2s ease !important;
}

.active-stage-chip {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%) !important;
  color: #e9c349 !important;
  border: 1px solid rgba(233, 195, 73, 0.6) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25) !important;
}

:global([data-theme='dark']) .active-stage-chip {
  background: linear-gradient(135deg, #e9c349 0%, #d4a928 100%) !important;
  color: #0f172a !important;
  border: 1px solid #e9c349 !important;
}

.inactive-stage-chip {
  background: rgba(0, 0, 0, 0.04) !important;
  color: #1e293b !important;
  border: 1px solid rgba(0, 0, 0, 0.15) !important;
  opacity: 0.9 !important;
}

:global([data-theme='dark']) .inactive-stage-chip {
  background: rgba(255, 255, 255, 0.05) !important;
  color: #e2e8f0 !important;
  border: 1px solid rgba(233, 195, 73, 0.2) !important;
  opacity: 0.9 !important;
}

.inactive-stage-chip:hover {
  background: rgba(233, 195, 73, 0.1) !important;
  border-color: rgba(233, 195, 73, 0.4) !important;
  opacity: 1 !important;
}
</style>
