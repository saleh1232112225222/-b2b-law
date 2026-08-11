<template>
  <v-row dense class="mb-4 align-center">
    <v-col>
      <div class="d-flex align-center">
        <div class="icon-circle-gold me-4" style="width: 56px; height: 56px;">
          <LucideIcon name="gavel" :size="28" class="text-gold-accent" />
        </div>
        <div>
          <h1 class="text-h5 font-weight-black text-navy tracking-tight">مركز القضايا</h1>
          <p class="text-subtitle-1 text-muted-gray font-weight-bold mt-1 mb-0">
            إدارة ملفات الدعاوى القضائية في مختلف المحاكم
          </p>
        </div>
      </div>
    </v-col>
    <v-col cols="auto">
      <v-btn
        variant="flat"
        size="large"
        class="pill-btn-gold-filled px-8"
        height="48"
        @click="$emit('add')"
      >
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
.header-icon-box {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass-bg);
}
</style>
