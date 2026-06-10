<template>
  <div class="print-frame">
    <div class="print-header">
      <div class="print-header-center">
        <img v-if="logoSrc" class="print-logo" :src="logoSrc" alt="شعار المكتب" />
        <div class="print-firm-name">{{ firmName }}</div>
        <div class="print-firm-details">{{ firmDetails }}</div>
      </div>
      <div class="print-title">{{ title }}</div>
    </div>

    <div class="print-footer">
      <div>طبع في: {{ printedAt }}</div>
      <div>أعد التقرير: {{ preparedBy }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useFirmStore } from '../../stores/firm'
import { safeArray } from '../../utils/safe'

defineProps<{ title: string }>()

const firmStore = useFirmStore()

onMounted(async () => {
  if (!firmStore.firmData) await firmStore.fetchFirmData()
})

const session = computed(() => {
  try {
    const raw = localStorage.getItem('web_currentUserSession')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
})

const preparedBy = computed(() => {
  return (
    session.value?.fullName ||
    session.value?.username ||
    session.value?.userId ||
    session.value?.id ||
    'desktop-user'
  )
})

const logoSrc = computed(() => {
  const d: any = firmStore.firmData || {}
  return String(d.logo_src || d.logo_path || '').trim()
})

const firmName = computed(() => {
  const d: any = firmStore.firmData || {}
  return String(d.name || 'مكتب المحاماة')
})

const firmDetails = computed(() => {
  const d: any = firmStore.firmData || {}
  const parts = safeArray([d.address, d.phone, d.email]).filter((v: any) => String(v || '').trim())
  return parts.join(' | ')
})

const printedAt = computed(() => new Date().toLocaleString('ar-EG'))
</script>

<style scoped>
.print-frame {
  display: none;
}

@media print {
  .print-frame {
    display: block;
  }

  .print-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    padding: 10mm 12mm 6mm;
    border-bottom: 2px solid #d4af37;
    background: #ffffff;
    text-align: center;
  }

  .print-header-center {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .print-logo {
    width: 64px;
    height: 64px;
    object-fit: contain;
    margin-bottom: 6px;
  }

  .print-firm-name {
    font-size: 16pt;
    font-weight: 800;
    color: #a1843b;
  }

  .print-firm-details {
    font-size: 9pt;
    color: #6b7280;
    margin-top: 4px;
  }

  .print-title {
    margin-top: 10px;
    display: inline-block;
    font-size: 14pt;
    font-weight: 800;
    background: #fbf6e6;
    color: #a1843b;
    padding: 6px 18px;
    border-radius: 9999px;
    border: 1px solid rgba(161, 132, 59, 0.35);
  }

  .print-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 6mm 12mm 8mm;
    border-top: 1px solid #e5e7eb;
    background: #ffffff;
    text-align: center;
    font-size: 9pt;
    color: #6b7280;
  }

  :global(body) {
    margin-top: 42mm;
    margin-bottom: 22mm;
    font-size: 10pt;
  }
}
</style>
