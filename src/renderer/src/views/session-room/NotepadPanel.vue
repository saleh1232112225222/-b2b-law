<template>
  <v-col cols="12" md="4" style="height: 100%">
    <v-card
      class="rounded-xl h-100 d-flex flex-column glass-card border shadow-premium overflow-hidden glass-card"
      elevation="0"
    >
      <div class="px-6 py-4 d-flex justify-space-between align-center glass-card-noir border-b">
        <div class="d-flex align-center ga-3">
          <v-btn
            variant="flat"
            color="error"
            size="small"
            class="rounded-xl font-weight-black px-4 shadow-sm premium-btn-gold-gradient"
            height="32"
            @click="$emit('clear')"
          >
            <LucideIcon name="trash-2" :size="16" class="me-2" /> مسح المفكرة
          </v-btn>
          <div class="recording-dot shadow-premium ms-2" />
          <div class="text-subtitle-2 font-weight-black text-accent">مفكرة التحرير الفوري</div>
        </div>
        <v-btn
          icon
          variant="tonal"
          color="accent"
          size="small"
          class="rounded-lg shadow-sm premium-btn-gold-gradient"
          :disabled="!note"
          @click="$emit('copy', note)"
        >
          <LucideIcon name="copy" :size="16" />
        </v-btn>
      </div>
      <div class="flex-grow-1 pa-4 bg-noir-surface">
        <v-textarea
          v-model="note"
          class="note-textarea premium-textarea font-weight-bold glass-input"
          variant="plain"
          auto-grow
          hide-details
          rows="16"
          placeholder="اكتب ملاحظات الجلسة هنا... يتم الحفظ تلقائياً كمسودة."
        />
      </div>
      <div class="pa-4 d-flex align-center ga-3 glass-card-noir border-t">
        <v-btn
          color="success"
          variant="flat"
          class="rounded-xl font-weight-black flex-grow-1 shadow-premium premium-btn-gold-gradient"
          height="48"
          :disabled="!activeSessionId"
          @click="$emit('save')"
        >
          <LucideIcon name="save" :size="18" class="me-2" /> اعتماد وحفظ في ملف القضية
        </v-btn>
        <v-btn
          variant="tonal"
          color="error"
          class="rounded-xl shadow-premium px-8 font-weight-black premium-btn-gold-gradient"
          height="48"
          @click="$emit('clear')"
        >
          <LucideIcon name="eraser" :size="20" class="me-2" /> مسح المفكرة
        </v-btn>
      </div>
    </v-card>
  </v-col>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'

const note = defineModel<string>('note', { required: true })
defineProps<{ activeSessionId: string | null }>()
defineEmits<{ save: []; clear: []; copy: [text: string] }>()
</script>
