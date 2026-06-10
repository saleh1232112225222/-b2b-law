<template>
  <v-row dense class="mb-8 align-center">
    <v-col>
      <div class="d-flex align-center">
        <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
          <LucideIcon name="file-text" :size="36" class="text-accent" />
        </div>
        <div>
          <h1 class="text-h5 font-weight-black text-gold mb-1">مركز إدارة العقود</h1>
          <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">إدارة عقود التوظيف واتفاقيات الأتعاب القانونية الموثقة</p>
        </div>
      </div>
    </v-col>
    <v-col cols="auto">
      <v-btn color="accent" size="large" class="font-weight-black rounded-lg px-8 premium-lift h-100" :disabled="!can('create_contracts')" @click="$emit('create')">
        <LucideIcon name="plus" :size="20" class="me-3" /> إدراج عقد جديد
      </v-btn>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'
defineProps<{ can: (perm: string) => boolean }>()
defineEmits<{ create: [] }>()
</script>
