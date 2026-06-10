<template>
  <div class="root">
    <div class="bar">
      <div class="title">سجل التطوير</div>
      <div class="actions">
        <button class="btn" type="button" @click="refresh">تحديث</button>
        <label class="toggle">
          <input v-model="auto" type="checkbox" />
          تحديث تلقائي
        </label>
        <button class="btn" type="button" @click="copy">نسخ</button>
        <span class="meta">{{ meta }}</span>
      </div>
    </div>
    <pre class="log">{{ text }}</pre>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const text = ref('')
const meta = ref('')
const auto = ref(false)
let timer: number | undefined

const refresh = async (): Promise<void> => {
  try {
    const s = await window.api.system.tailLog(200_000)
    text.value = s || ''
    meta.value = `آخر تحديث: ${new Date().toLocaleTimeString('ar-SA')}`
  } catch (e: unknown) {
    meta.value = e instanceof Error ? e.message : 'فشل قراءة السجل'
  }
}

const copy = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text.value || '')
    meta.value = 'تم النسخ'
  } catch {
    meta.value = 'تعذر النسخ'
  }
}

const startAuto = (): void => {
  stopAuto()
  timer = window.setInterval(refresh, 2500)
}

const stopAuto = (): void => {
  if (timer) window.clearInterval(timer)
  timer = undefined
}

onMounted(() => {
  refresh()
  if (auto.value) startAuto()
})

watch(auto, (v) => {
  if (v) startAuto()
  else stopAuto()
})

onBeforeUnmount(() => {
  stopAuto()
})
</script>

<style scoped>
.root {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0b0f14;
  color: #e6edf3;
}
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: #0b0f14;
}
.title {
  font-weight: 700;
}
.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  opacity: 0.9;
  user-select: none;
}
.toggle input {
  accent-color: #2f81f7;
}
.btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e6edf3;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
.meta {
  opacity: 0.8;
  font-size: 12px;
}
.log {
  flex: 1;
  margin: 0;
  padding: 12px;
  overflow: auto;
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
  font-size: 12px;
  line-height: 1.55;
  direction: ltr;
  text-align: left;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
