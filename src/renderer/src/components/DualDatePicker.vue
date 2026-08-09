<template>
  <div class="dual-date-picker">
    <div v-if="label" class="d-flex align-center mb-2">
      <LucideIcon :name="icon" :size="16" class="me-2 text-gold" />
      <span class="text-caption font-weight-bold text-gold">{{ label }}</span>
    </div>
    <v-row dense class="ga-y-2">
      <v-col cols="6">
        <v-text-field
          v-model="gDateStr"
          label="ميلادي"
          type="date"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
          bg-color="transparent"
          class="glass-input"
          @update:model-value="onGDateUpdate"
        ></v-text-field>
      </v-col>
      <v-col cols="6">
        <v-text-field
          v-model="hDateStr"
          label="هجري"
          variant="outlined"
          readonly
          density="comfortable"
          hide-details="auto"
          bg-color="transparent"
          class="hijri-field glass-input"
        ></v-text-field>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import LucideIcon from './common/LucideIcon.vue'
import { convertToHijri } from '../utils/hijri'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  icon: { type: String, default: 'calendar' }
})

const emit = defineEmits(['update:modelValue'])

const gDateStr = ref(props.modelValue || '')
const hDateStr = ref('')

const syncHijri = (val: string) => {
  if (!val) {
    hDateStr.value = ''
    return
  }
  try {
    hDateStr.value = convertToHijri(new Date(val))
  } catch (e) {
    hDateStr.value = 'خطأ'
  }
}

const onGDateUpdate = (val: string) => {
  emit('update:modelValue', val)
  syncHijri(val)
}

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal !== gDateStr.value) {
      gDateStr.value = newVal || ''
      syncHijri(newVal || '')
    }
  }
)

onMounted(() => {
  if (gDateStr.value) {
    syncHijri(gDateStr.value)
  }
})
</script>

<style scoped>
:deep(.v-messages__message) {
  color: #735c00 !important;
  font-weight: bold;
}

.dual-date-picker :deep(input),
.dual-date-picker :deep(.v-field__input) {
  color: #1f1b13 !important;
  font-weight: 700 !important;
}

.dual-date-picker :deep(.v-label) {
  color: #735c00 !important;
  font-weight: 800 !important;
}
</style>
