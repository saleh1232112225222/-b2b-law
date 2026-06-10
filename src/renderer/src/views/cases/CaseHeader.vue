<template>
  <v-row dense class="mb-4 align-center">
    <v-col>
      <div class="d-flex align-center">
        <div class="header-icon-box pa-4 glass-card border-gold me-4">
          <LucideIcon name="gavel" :size="32" class="text-gold" />
        </div>
        <div>
          <h1 class="text-h5 font-weight-black text-white tracking-tight">مركز القضايا</h1>
          <p class="text-subtitle-1 text-gold opacity-80 font-weight-bold mt-1">
            إدارة ملفات الدعاوى القضائية في مختلف المحاكم
          </p>
        </div>
      </div>
    </v-col>
    <v-col cols="auto">
      <v-btn color="accent" variant="flat" size="large"
        class="font-weight-black rounded-lg px-8 premium-lift text-primary-dark" height="56" @click="$emit('add')">
        <LucideIcon name="folder-plus" :size="20" class="me-2" />
        قضية جديدة
      </v-btn>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'
defineEmits<{ add: [] }>()
</script>

<style scoped>
.header-icon-box { width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; background: var(--glass-bg); }
</style>
