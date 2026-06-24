<template>
  <v-col cols="12" md="8" style="height: 100%">
    <v-card
      class="rounded-xl h-100 d-flex flex-column glass-card border shadow-premium overflow-hidden glass-card"
      elevation="0"
    >
      <div class="px-6 py-4 d-flex justify-space-between align-center glass-card-noir border-b">
        <div class="d-flex align-center ga-3" style="min-width: 0">
          <v-chip size="small" color="primary" variant="flat" class="font-weight-black shadow-sm">{{
            selected.category || '—'
          }}</v-chip>
          <div class="text-h6 font-weight-black text-primary text-truncate">
            {{ selected.title || 'اختر عنصرًا للعرض' }}
          </div>
        </div>
        <div class="d-flex align-center ga-3">
          <v-btn
            v-if="selected.type === 'pdf'"
            variant="flat"
            color="primary"
            class="rounded-xl font-weight-black shadow-premium session-room-btn-zr1 premium-btn-gold-gradient"
            :disabled="!selected.file_path"
            @click="$emit('open-file', selected.file_path)"
          >
            <LucideIcon name="external-link" :size="18" class="me-2" /> فتح
          </v-btn>
          <v-btn
            v-if="selected.type === 'text'"
            variant="flat"
            color="primary"
            class="rounded-xl font-weight-black shadow-premium session-room-btn-zr1 premium-btn-gold-gradient"
            :disabled="!selected.content"
            @click="$emit('copy', selected.content)"
          >
            <LucideIcon name="copy" :size="18" class="me-2" /> نسخ
          </v-btn>
        </div>
      </div>
      <div class="flex-grow-1 overflow-hidden position-relative bg-noir-surface">
        <div v-if="selected.type === 'pdf'" class="h-100 d-flex flex-column">
          <div class="px-4 py-2 d-flex align-center ga-3 glass-card-noir border-b">
            <v-btn
              class="premium-btn-gold-gradient"
              icon
              size="x-small"
              variant="text"
              color="white"
              ><LucideIcon name="minus-circle" :size="16"
            /></v-btn>
            <div class="text-caption font-weight-black text-white">صفحة 1 / 1</div>
            <v-btn
              class="premium-btn-gold-gradient"
              icon
              size="x-small"
              variant="text"
              color="white"
              ><LucideIcon name="plus-circle" :size="16"
            /></v-btn>
            <v-divider vertical class="mx-2" color="white" />
            <v-btn
              class="premium-btn-gold-gradient"
              icon
              size="x-small"
              variant="text"
              color="white"
              ><LucideIcon name="search" :size="16"
            /></v-btn>
            <v-btn
              class="premium-btn-gold-gradient"
              icon
              size="x-small"
              variant="text"
              color="white"
              :disabled="!selected.file_path"
              @click="$emit('open-file', selected.file_path)"
            >
              <LucideIcon name="download" :size="16" />
            </v-btn>
            <v-spacer />
            <div class="text-caption font-weight-bold text-white text-truncate">
              {{ selected.title }}
            </div>
          </div>
          <div class="flex-grow-1 pa-4">
            <div
              v-if="!pdfSrc"
              class="h-100 d-flex align-center justify-center text-text-muted text-caption"
            >
              لا يمكن عرض الملف داخل الصفحة حالياً. استخدم زر "فتح".
            </div>
            <iframe
              v-else
              class="w-100 h-100 rounded-xl"
              :src="pdfSrc"
              style="border: none; background: var(--color-white, #fff)"
            />
          </div>
        </div>
        <div
          v-else
          class="h-100 overflow-y-auto pa-8 glass-card border-gold-thin rounded-xl mx-4 my-4"
        >
          <pre class="session-text text-primary font-weight-bold leading-relaxed">{{
            selected.content || '—'
          }}</pre>
        </div>
      </div>
    </v-card>
  </v-col>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'

defineProps<{
  selected: any
  pdfSrc: string
}>()

defineEmits<{
  copy: [text: string]
  'open-file': [path: string]
}>()
</script>
