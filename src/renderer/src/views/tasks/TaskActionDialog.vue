<template>
  <v-dialog
    :model-value="modelValue"
    max-width="520"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card elevation="0" class="rounded-xl glass-card border shadow-premium">
      <v-card-title class="font-weight-black">{{ title }}</v-card-title>
      <v-card-text class="pt-2">
        <v-textarea
          v-model="reason"
          :label="label"
          variant="outlined"
          density="comfortable"
          rows="3"
          auto-grow
          hide-details
          class="rounded-xl premium-select"
        />
      </v-card-text>
      <v-card-actions class="px-4 pb-4">
        <v-spacer />
        <v-btn variant="text" class="font-weight-black" @click="$emit('update:modelValue', false)">
          تراجع
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          class="font-weight-black rounded-xl px-6 shadow-premium"
          :loading="loading"
          @click="$emit('confirm', reason)"
        >
          تأكيد
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import LucideIcon from '../../components/common/LucideIcon.vue'

const props = defineProps<{
  modelValue: boolean
  title: string
  label: string
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'confirm', text: string): void
}>()

const reason = ref('')

watch(
  () => props.modelValue,
  (val) => {
    if (val) reason.value = ''
  }
)
</script>
