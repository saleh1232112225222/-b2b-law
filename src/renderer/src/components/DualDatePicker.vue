<template>
  <div class="dual-date-picker pa-3 border rounded-xl glass-date-container mb-2">
    <div v-if="label" class="d-flex align-center mb-3 px-1">
      <LucideIcon :name="icon" :size="16" class="me-2 text-gold" />
      <span class="text-subtitle-2 font-weight-black text-gold">{{ label }}</span>
    </div>
    <v-row dense>
      <v-col cols="12">
        <v-text-field
          v-model="gDateStr"
          label="ميلادي"
          type="date"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
          bg-color="transparent"
          class="mb-3 glass-input"
          @update:model-value="onGDateUpdate"
        ></v-text-field>
      </v-col>
      <v-col cols="12">
        <v-text-field
          v-model="hDateStr"
          label="هجري"
          variant="outlined"
          readonly
          density="comfortable"
          hide-details="auto"
          bg-color="transparent"
          :prepend-inner-icon="ICONS.NAV.SESSIONS"
          class="hijri-field glass-input"
        ></v-text-field>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { ICONS } from '../config/icons'
import LucideIcon from './common/LucideIcon.vue'
import { convertToHijri } from '../utils/hijri'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'التاريخ' },
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
    hDateStr.value = 'خطأ في التاريخ'
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
  color: #e9c349 !important;
  font-weight: bold;
}

.glass-date-container {
  background: rgba(15, 23, 42, 0.45) !important;
  border: 1px solid rgba(233, 195, 73, 0.25) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.dual-date-picker :deep(.v-field) {
  background: rgba(15, 23, 42, 0.5) !important;
  border-radius: 10px !important;
  border: 1px solid rgba(233, 195, 73, 0.2) !important;
}

.dual-date-picker :deep(input),
.dual-date-picker :deep(.v-field__input) {
  color: #ffffff !important;
  font-weight: 700 !important;
}

.dual-date-picker :deep(.v-label) {
  color: #e9c349 !important;
  font-weight: 700 !important;
}

.hijri-field :deep(.v-field) {
  background: transparent !important;
}
</style>
