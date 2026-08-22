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
    <div class="mt-3 pt-3 border-t border-white-10 d-flex align-center gap-2 overflow-x-auto pb-1">
      <span class="text-caption text-gold font-weight-black me-2 flex-shrink-0 d-flex align-center">
        <LucideIcon name="git-commit" :size="14" class="me-1" />
        مسار القضايا:
      </span>
      <v-chip
        v-for="s in PIPELINE_STAGES"
        :key="s.key"
        size="small"
        :color="(stage || 'الكل') === s.key ? 'accent' : 'grey'"
        :variant="(stage || 'الكل') === s.key ? 'flat' : 'tonal'"
        class="font-weight-black cursor-pointer px-3"
        @click="$emit('update:stage', s.key)"
      >
        {{ s.label }}
      </v-chip>
      <v-btn
        v-if="stage && stage !== 'الكل'"
        size="x-small"
        variant="text"
        color="error"
        class="font-weight-bold ms-auto"
        @click="$emit('update:stage', 'الكل')"
      >
        <LucideIcon name="x" :size="14" class="me-1" />
        إلغاء التصفية
      </v-btn>
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
