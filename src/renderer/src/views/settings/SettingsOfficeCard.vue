<template>
  <v-card elevation="0" class="glass-card mb-4 border border-gold border-opacity-20 glass-card">
    <div class="pa-4 d-flex align-center border-b border-gold border-opacity-10">
      <LucideIcon name="building-2" :size="20" class="text-primary me-3" />
      <span class="text-subtitle-1 font-weight-black text-primary">بيانات المكتب</span>
    </div>
    <v-card-text class="pa-4">
      <v-row dense>
        <v-col cols="12">
          <v-text-field
            :model-value="modelValue.officeName"
            label="اسم المكتب"
            placeholder="اكتب اسم المكتب هنا"
            variant="outlined"
            density="compact"
            class="mb-3 glass-input"
            hide-details="auto"
            @update:model-value="emitField('officeName', $event)"
          ></v-text-field>
        </v-col>
        <v-col cols="12">
          <v-text-field
            :model-value="modelValue.firmAddress"
            label="العنوان"
            variant="outlined"
            density="compact"
            class="mb-3 glass-input"
            hide-details="auto"
            @update:model-value="emitField('firmAddress', $event)"
          ></v-text-field>
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            :model-value="modelValue.firmPhone"
            label="الهاتف"
            variant="outlined"
            density="compact"
            class="mb-3 glass-input"
            hide-details="auto"
            @update:model-value="emitField('firmPhone', $event)"
          ></v-text-field>
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            :model-value="modelValue.firmEmail"
            label="البريد الإلكتروني"
            variant="outlined"
            density="compact"
            class="mb-3 glass-input"
            hide-details="auto"
            @update:model-value="emitField('firmEmail', $event)"
          ></v-text-field>
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            :model-value="modelValue.vatNumber"
            label="الرقم الضريبي للمكتب"
            variant="outlined"
            density="compact"
            class="mb-3 glass-input"
            hide-details="auto"
            @update:model-value="emitField('vatNumber', $event)"
          ></v-text-field>
        </v-col>
        <v-col cols="12">
          <v-select
            :model-value="modelValue.theme"
            :items="['light', 'dark']"
            label="المظهر"
            variant="outlined"
            density="compact"
            class="mb-3 glass-input"
            hide-details="auto"
            @update:model-value="emitField('theme', $event)"
          ></v-select>
        </v-col>
      </v-row>
      <v-btn
        color="gold"
        variant="flat"
        block
        size="large"
        class="font-weight-black premium-lift mt-2 premium-btn-gold-gradient"
        @click="$emit('save')"
      >
        <LucideIcon name="save" :size="18" class="me-2" /> حفظ بيانات المكتب
      </v-btn>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'

interface AppSettings {
  officeName: string
  firmAddress: string
  firmPhone: string
  firmEmail: string
  vatNumber?: string
  theme: string
  activityLogRetentionDays: number
  casesRootPath: string
  taskNotificationsEnabled: boolean
  taskNotificationLeadDays: number
}

const props = defineProps<{
  modelValue: AppSettings
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: AppSettings): void
  (e: 'save'): void
}>()

const emitField = (key: keyof AppSettings, value: any) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>
