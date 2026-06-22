<template>
  <v-card elevation="0" class="glass-card border border-gold border-opacity-20 glass-card">
    <div class="pa-4 d-flex align-center border-b border-gold border-opacity-10">
      <LucideIcon name="file-key" :size="20" class="text-primary me-3" />
      <span class="text-subtitle-1 font-weight-black text-primary">تراخيص النظام</span>
    </div>
    <v-card-text class="pa-4 glass-card">
      <div
        v-if="trialInfo"
        class="mb-4 glass-panel-light pa-3 rounded-lg border border-gold border-opacity-20"
      >
        <div class="d-flex align-center justify-space-between">
          <span class="text-subtitle-2 font-weight-black text-white">حالة النسخة:</span>
          <v-chip
            :color="trialInfo.isActivated ? 'success' : trialInfo.isValid ? 'gold' : 'error'"
            size="small"
            variant="flat"
            class="font-weight-black"
          >
            {{ trialInfo.isActivated ? 'مفعلة' : trialInfo.isValid ? 'تجريبية' : 'منتهية' }}
          </v-chip>
        </div>
        <div v-if="!trialInfo.isActivated" class="mt-2">
          <v-progress-linear
            :model-value="(trialInfo.daysLeft / 30) * 100"
            color="gold"
            height="6"
            rounded
          />
          <div class="text-caption text-gold mt-1 font-weight-bold">
            {{ trialInfo.daysLeft }} يوم متبقي
          </div>
        </div>
      </div>
      <v-text-field
        :model-value="requestCode"
        label="رمز طلب التنشيط"
        readonly
        variant="filled"
        density="compact"
        class="mb-3 glass-input font-mono glass-input"
        hide-details="auto"
      >
        <template #append-inner>
          <v-btn class="premium-btn-gold-gradient"
            icon
            variant="text"
            color="gold"
            density="compact"
            @click="$emit('copy-request-code')"
          >
            <LucideIcon name="copy" :size="16" />
          </v-btn>
        </template>
      </v-text-field>
      <template v-if="!trialInfo?.isActivated">
        <v-text-field
          :model-value="modelValue"
          label="مفتاح التنشيط"
          variant="outlined"
          density="compact"
          class="mb-4 glass-input font-mono text-center glass-input"
          hide-details="auto"
          @update:model-value="$emit('update:modelValue', $event)"
        ></v-text-field>
        <v-btn
          color="gold"
          variant="flat"
          block
          size="large"
          class="font-weight-black premium-lift premium-btn-gold-gradient"
          :loading="activating"
          @click="$emit('activate')"
        >
          تفعيل النسخة الكاملة
        </v-btn>
      </template>
      <div
        v-else
        class="pa-4 text-center glass-panel-light rounded-lg border border-success border-opacity-30"
      >
        <LucideIcon name="shield-check" :size="32" class="text-success mb-2" />
        <div class="text-subtitle-1 font-weight-black text-success">النظام مفعل بالكامل</div>
        <div class="text-caption text-white opacity-70">شكراً لاستخدامك النسخة الأصلية من B2B</div>
      </div>
      <v-btn
        v-if="trialInfo?.isActivated"
        variant="text"
        color="error"
        size="x-small"
        block
        class="mt-1 font-weight-bold premium-btn-gold-gradient"
        @click="$emit('reset-activation')"
        >إلغاء التنشيط (للاختبار)</v-btn
      >
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'

defineProps<{
  trialInfo: Record<string, any> | null
  requestCode: string
  modelValue: string
  activating: boolean
}>()

defineEmits<{
  'update:modelValue': [value: string]
  'copy-request-code': []
  activate: []
  'reset-activation': []
}>()
</script>
