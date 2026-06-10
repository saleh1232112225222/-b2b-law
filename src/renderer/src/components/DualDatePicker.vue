<template>
  <div class="dual-date-picker pa-3 border rounded-lg bg-surface mb-4 shadow-sm">
    <div v-if="label" class="d-flex align-center mb-3 px-1">
      <LucideIcon :name="icon" :size="16" class="me-2 text-primary" />
      <span class="text-subtitle-2 font-weight-black text-primary">{{ label }}</span>
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
          bg-color="surface"
          class="mb-3"
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
          class="hijri-field"
        ></v-text-field>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { ICONS } from '../config/icons'
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
  color: #1a73e8 !important;
  font-weight: bold;
}

.hijri-field :deep(.v-field) {
  background: transparent !important;
}
</style>
