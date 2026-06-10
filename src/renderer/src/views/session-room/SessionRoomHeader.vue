<template>
  <v-row class="mb-4 align-center px-2">
    <v-col>
      <div class="d-flex align-center">
        <div class="header-icon-box pa-3 rounded-xl glass-card-noir border-accent me-4 shadow-premium">
          <LucideIcon name="shield-alert" :size="28" class="text-accent" />
        </div>
        <div>
          <div class="text-h5 font-weight-black text-primary tracking-tight">غرفة عمليات الجلسة الفورية</div>
          <div class="text-caption text-text-muted font-weight-bold">مراجعة ملف القضية خلال ثوانٍ قبل الدخول للجلسة</div>
        </div>
      </div>
    </v-col>
    <v-col cols="auto" class="d-flex align-center ga-3">
      <v-btn v-if="!isNewWindow" variant="tonal" color="accent" class="rounded-xl font-weight-black shadow-premium glass-card session-room-btn-zr1" height="56" @click="$emit('open-new-window')">
        <LucideIcon name="external-link" :size="20" class="me-2" /> فتح في نافذة جديدة
      </v-btn>
      <v-btn variant="tonal" color="primary" class="rounded-xl font-weight-black shadow-premium glass-card session-room-btn-zr1" height="56" @click="$emit('go-back')">
        <LucideIcon name="arrow-right" :size="20" class="me-2" /> رجوع
      </v-btn>
      <v-btn variant="flat" color="primary" class="rounded-xl font-weight-black shadow-premium premium-btn-glow session-room-btn-zr1" height="56" @click="$emit('open-picker')">
        <LucideIcon name="calendar-search" :size="20" class="me-2" /> اختيار جلسة
      </v-btn>
      <v-btn v-if="hasActiveSession" variant="flat" color="error" class="rounded-xl font-weight-black px-8 shadow-premium session-room-btn-zr1" height="56" @click="$emit('open-outcome')">
        <LucideIcon name="badge-check" :size="20" class="me-2" /> إنهاء الجلسة ورصد النتيجة
      </v-btn>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'
defineProps<{ isNewWindow: boolean; hasActiveSession: boolean }>()
defineEmits<{ 'open-new-window': []; 'go-back': []; 'open-picker': []; 'open-outcome': [] }>()
</script>
