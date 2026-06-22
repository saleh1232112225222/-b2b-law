<template>
  <v-row dense class="mb-8 align-center">
    <v-col>
      <div class="d-flex align-center">
        <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
          <LucideIcon name="user-cog" :size="36" class="text-accent" />
        </div>
        <div>
          <h1 class="text-h5 font-weight-black text-gold mb-1">إدارة المستخدمين</h1>
          <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
            إدارة صلاحيات الوصول، الأدوار، ونطاق العمل للموظفين والمحامين
          </p>
        </div>
      </div>
    </v-col>
    <v-col cols="auto">
      <v-btn
        color="accent"
        variant="flat"
        class="rounded-lg px-6 font-weight-black premium-lift text-ebony premium-btn-gold-gradient"
        height="56"
        @click="$emit('create')"
      >
        <LucideIcon name="user-plus" :size="20" class="me-2" /> إضافة مستخدم جديد
      </v-btn>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'
defineEmits<{ create: [] }>()
</script>
