<template>
  <div class="dual-date-picker">
    <div v-if="label" class="d-flex align-center mb-2">
      <LucideIcon :name="icon" :size="16" class="me-2 text-gold" />
      <span class="text-caption font-weight-bold text-gold">{{ label }}</span>
    </div>
    <v-row dense class="ga-y-2">
      <v-col cols="6">
        <v-text-field
          ref="gInputRef"
          v-model="gDateStr"
          label="ميلادي"
          type="date"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
          bg-color="transparent"
          class="glass-input date-input-field"
          @update:model-value="onGDateUpdate"
          @click="openPicker"
        >
          <template #prepend-inner>
            <LucideIcon name="calendar" :size="16" class="text-gold me-1 cursor-pointer" @click.stop="openPicker" />
          </template>
        </v-text-field>
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

const gInputRef = ref<any>(null)

const openPicker = () => {
  const rootEl = gInputRef.value?.$el
  if (!rootEl) return
  const inputEl = rootEl.querySelector('input[type="date"]') || rootEl.querySelector('input')
  if (inputEl && typeof inputEl.showPicker === 'function') {
    try {
      inputEl.showPicker()
    } catch (e) {
      inputEl.focus()
      inputEl.click()
    }
  }
}

/**
 * Normalizes any date input (ISO, DD/MM/YYYY, YYYY/MM/DD, timestamp) into standard YYYY-MM-DD
 */
const toYYYYMMDD = (val: any): string => {
  if (!val) return ''
  const str = String(val).trim()
  if (!str) return ''

  // ISO string with T or space (e.g. 2026-08-06T00:00:00.000Z or 2026-08-06 00:00:00)
  if (str.includes('T') || (str.includes(' ') && str.includes('-'))) {
    const firstPart = str.split(/[T ]/)[0]
    if (/^\d{4}-\d{2}-\d{2}$/.test(firstPart)) {
      return firstPart
    }
  }

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str
  }

  // YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) {
    return str.replace(/\//g, '-')
  }

  // DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(str)) {
    const parts = str.split(/[\/-]/)
    const p1 = parseInt(parts[0], 10)
    const p2 = parseInt(parts[1], 10)
    const year = parts[2]
    if (p1 > 12) {
      // p1 is day, p2 is month
      const day = String(p1).padStart(2, '0')
      const month = String(p2).padStart(2, '0')
      return `${year}-${month}-${day}`
    } else {
      // Assuming DD/MM/YYYY for Arabic locale
      const day = String(p1).padStart(2, '0')
      const month = String(p2).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }

  const d = new Date(str)
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  return ''
}

const gDateStr = ref(toYYYYMMDD(props.modelValue))
const hDateStr = ref('')

const syncHijri = (val: string) => {
  const normalized = toYYYYMMDD(val)
  if (!normalized) {
    hDateStr.value = ''
    return
  }
  try {
    const parts = normalized.split('-')
    const year = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const day = parseInt(parts[2], 10)
    const localDate = new Date(year, month, day)
    hDateStr.value = convertToHijri(localDate)
  } catch (e) {
    hDateStr.value = ''
  }
}

const onGDateUpdate = (val: string) => {
  const normalized = toYYYYMMDD(val)
  gDateStr.value = normalized || val
  emit('update:modelValue', normalized || val)
  syncHijri(normalized || val)
}

watch(
  () => props.modelValue,
  (newVal) => {
    const normalized = toYYYYMMDD(newVal)
    if (normalized !== gDateStr.value) {
      gDateStr.value = normalized
      syncHijri(normalized)
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

.cursor-pointer {
  cursor: pointer;
}

:deep(input[type="date"]::-webkit-calendar-picker-indicator) {
  cursor: pointer;
  filter: invert(45%) sepia(80%) saturate(450%) hue-rotate(5deg) brightness(90%) contrast(85%);
  opacity: 0.95;
  padding: 4px;
}

:deep(input[type="date"]::-webkit-calendar-picker-indicator:hover) {
  opacity: 1;
  transform: scale(1.15);
}
</style>
