<script setup lang="ts">
import { onMounted, reactive } from 'vue'

const versions = reactive({ electron: '', chrome: '', node: '' })

onMounted(async () => {
  const v = await window.api.system.getVersions()
  Object.assign(versions, v)
})
</script>

<template>
  <ul class="versions">
    <li class="electron-version">Electron v{{ versions.electron }}</li>
    <li class="chrome-version">Chromium v{{ versions.chrome }}</li>
    <li class="node-version">Node v{{ versions.node }}</li>
  </ul>
</template>
