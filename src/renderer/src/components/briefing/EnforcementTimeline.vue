<template>
  <v-card class="enforcement-card premium-lift glass-card" elevation="0">
    <div class="d-flex align-center mb-8 px-2">
      <div class="timeline-icon-box me-4 premium-lift">
        <LucideIcon name="gavel" :size="24" class="text-gold" />
      </div>
      <div>
        <h3 class="text-subtitle-1 font-weight-black text-pure-black tracking-tight">
          سندات التنفيذ (المواعيد القريبة)
        </h3>
        <div class="text-tiny font-weight-black text-pure-black">
          تتبع الملفات الجاهزة للتنفيذ القضائي
        </div>
      </div>
    </div>

    <v-timeline density="compact" align="start" class="timeline-custom px-2">
      <v-timeline-item
        v-for="(enf, i) in items.slice(0, 3)"
        :key="i"
        :dot-color="i === 0 ? 'amber-darken-2' : 'primary-lighten-4'"
        size="x-small"
      >
        <v-card
          class="enforcement-item-card glass-card pa-4 mb-2 premium-lift"
          elevation="0"
          @click="$emit('go-to-enforcement', enf)"
        >
          <div class="d-flex justify-space-between align-start mb-2">
            <div class="d-flex flex-column">
              <span
                class="font-weight-black text-body-2 text-pure-black truncate-text"
                style="max-width: 160px"
              >
                {{ enf.client_name }}
              </span>
              <span class="text-tiny font-weight-black text-pure-black"
                >حكم: {{ enf.judgment_number }}</span
              >
            </div>
            <v-chip
              size="x-small"
              color="amber-darken-4"
              variant="flat"
              class="font-weight-black rounded-lg"
            >
              جاهز
            </v-chip>
          </div>

          <v-divider class="my-3 opacity-10"></v-divider>

          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <LucideIcon name="calendar-clock" :size="14" class="text-gold me-1" />
              <span class="text-tiny font-weight-black text-pure-black">{{
                enf.date || 'فوري'
              }}</span>
            </div>
            <v-btn
              variant="text"
              color="primary"
              size="x-small"
              class="font-weight-black px-0"
              :append-icon="ICONS.UI.CHEVRON_LEFT"
            >
              فتح الملف
            </v-btn>
          </div>
        </v-card>
      </v-timeline-item>

      <v-timeline-item v-if="items.length === 0" dot-color="grey-lighten-3" size="x-small">
        <div
          class="text-caption text-pure-black font-weight-black pa-4 bg-grey-lighten-5 rounded-lg border-dashed border-2 text-center"
        >
          لا توجد سندات تنفيذ معلقة حالياً.
        </div>
      </v-timeline-item>
    </v-timeline>
  </v-card>
</template>

<script setup lang="ts">
interface EnforcementItem {
  client_name: string
  judgment_number: string
  date?: string
}

import LucideIcon from '../common/LucideIcon.vue'
import { ICONS } from '../../config/icons'

const props = defineProps<{
  items: EnforcementItem[]
}>()

defineEmits(['go-to-enforcement'])
</script>

<style scoped>
.enforcement-card {
  padding: 24px !important;
  border-radius: var(--radius-lg) !important;
  border: 1px solid var(--border) !important;
  background: var(--surface) !important;
}

.timeline-icon-box {
  background: linear-gradient(
    135deg,
    rgba(var(--v-theme-amber), 0.1) 0%,
    rgba(var(--v-theme-amber), 0.2) 100%
  );
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  border: 1px solid rgba(var(--v-theme-amber), 0.1);
}

.enforcement-item-card {
  background: white !important;
  border: 1px solid var(--border) !important;
  border-radius: 16px !important;
  cursor: pointer;
}

.timeline-custom :deep(.v-timeline-item__body) {
  padding-bottom: 16px;
}

.truncate-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.text-tiny {
  font-size: 0.7rem !important;
}
.tracking-tight {
  letter-spacing: -0.02em;
}
</style>
