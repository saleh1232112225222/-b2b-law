<template>
  <div class="print-signature-page">
    <div class="box">
      <div class="title">إعداد التقرير</div>
      <div class="row">
        <div class="label">المسؤول</div>
        <div class="value">{{ preparedBy }}</div>
      </div>
      <div class="row">
        <div class="label">التاريخ</div>
        <div class="value">{{ printedDate }}</div>
      </div>
      <div class="sig">
        <div class="label">التوقيع</div>
        <div class="space"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

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

const printedDate = computed(() => new Date().toLocaleDateString('ar-EG'))
</script>

<style scoped>
.print-signature-page {
  display: none;
}

@media print {
  .print-signature-page {
    display: block;
    margin-top: 8mm;
    break-inside: avoid;
  }

  .box {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 12px;
  }

  .title {
    font-size: 12pt;
    font-weight: 800;
    color: #1565c0;
    margin-bottom: 8px;
  }

  .row {
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid #f1f5f9;
    padding: 6px 0;
  }

  .label {
    font-weight: 700;
    color: #334155;
  }

  .value {
    color: #0f172a;
    font-weight: 700;
  }

  .sig {
    margin-top: 10px;
  }

  .space {
    height: 42px;
    border: 1px dashed #d1d9e6;
    border-radius: 10px;
    margin-top: 10px;
  }
}
</style>
