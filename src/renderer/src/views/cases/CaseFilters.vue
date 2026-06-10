<template>
  <v-card elevation="0" class="glass-card mb-4 pa-4">
    <v-row dense align="center">
      <v-col cols="12" md="4">
        <v-text-field
          v-model="localSearch"
          label="بحث برقم القضية، الموضوع، أو الموكل..."
          variant="outlined"
          density="comfortable"
          hide-details
          class="rounded-xl premium-select text-white"
          clearable
        >
          <template #prepend-inner>
            <LucideIcon name="search" :size="20" class="text-gold me-2" />
          </template>
        </v-text-field>
      </v-col>
      <v-col cols="12" md="2">
        <v-select
          :model-value="status"
          :items="['الكل', ...CASE_STATUSES]"
          label="الحالة"
          variant="outlined"
          density="comfortable"
          hide-details
          class="rounded-xl premium-select"
          @update:model-value="$emit('update:status', $event)"
        >
          <template #prepend-inner>
            <LucideIcon name="activity" :size="18" class="text-gold me-2" />
          </template>
        </v-select>
      </v-col>
      <v-col cols="12" md="2">
        <v-select
          :model-value="priority"
          :items="['الكل', ...PRIORITIES]"
          label="الأولوية"
          variant="outlined"
          density="comfortable"
          hide-details
          class="rounded-xl premium-select"
          @update:model-value="$emit('update:priority', $event)"
        >
          <template #prepend-inner>
            <LucideIcon name="flag" :size="18" class="text-gold me-2" />
          </template>
        </v-select>
      </v-col>
      <v-col cols="12" md="2">
        <v-select
          :model-value="responsibleUserId"
          :items="assignableUsers"
          :item-title="getUserDisplayName"
          item-value="id"
          label="المسؤول"
          variant="outlined"
          density="comfortable"
          hide-details
          class="rounded-xl premium-select"
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
          class="rounded-lg px-4 h-48 premium-lift"
          :loading="loading"
          @click="$emit('refresh')"
        >
          <LucideIcon name="refresh-cw" :size="20" class="me-2" />
          <span class="font-weight-black">مزامنة</span>
        </v-btn>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { CASE_STATUSES, PRIORITIES } from '../../utils/legalConstants'
import LucideIcon from '../../components/common/LucideIcon.vue'

const props = defineProps<{
  status: string
  priority: string
  responsibleUserId: string
  assignableUsers: any[]
  loading: boolean
  modelValue: string
}>()

const emit = defineEmits<{
  'update:status': [value: string]
  'update:priority': [value: string]
  'update:responsibleUserId': [value: string]
  'update:modelValue': [value: string]
  refresh: []
}>()

const localSearch = ref(props.modelValue)

watch(() => props.modelValue, (v) => { localSearch.value = v })

watch(localSearch, (v) => {
  emit('update:modelValue', v)
})

const getUserDisplayName = (u: any): string => String(u?.full_name || u?.username || '')
</script>
