<template>
  <v-row dense class="mb-6 align-center">
    <v-col>
      <div class="d-flex align-center">
        <div class="icon-circle-gold me-4" style="width: 56px; height: 56px;">
          <LucideIcon name="user-cog" :size="28" class="text-gold-accent" />
        </div>
        <div>
          <h1 class="text-h5 font-weight-black text-navy mb-1">إدارة المستخدمين</h1>
          <p class="text-subtitle-1 text-muted-gray font-weight-bold mb-0">
            إدارة صلاحيات الوصول، الأدوار، ونطاق العمل للموظفين والمحامين
          </p>
        </div>
      </div>
    </v-col>
    <v-col cols="auto">
      <v-btn
        variant="flat"
        class="pill-btn-gold-filled px-6"
        height="48"
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
