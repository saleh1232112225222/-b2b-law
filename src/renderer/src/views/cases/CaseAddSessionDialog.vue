<template>
  <v-dialog
    :model-value="modelValue"
    width="90%"
    max-width="800"
    persistent
    scrollable
    transition="dialog-bottom-transition"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="glass-card-noir border rounded-xl shadow-premium overflow-hidden glass-card">
      <v-toolbar color="transparent" class="px-6 border-b" height="72">
        <div class="pa-3 rounded-xl glass-card border-primary me-4">
          <LucideIcon name="calendar-plus" :size="24" class="text-primary" />
        </div>
        <v-toolbar-title class="font-weight-black text-primary">جدولة جلسة قضائية</v-toolbar-title>
        <v-spacer />
        <v-btn
          icon
          variant="tonal"
          class="rounded-lg premium-btn-gold-gradient"
          @click="$emit('update:modelValue', false)"
        >
          <LucideIcon name="x" :size="20" />
        </v-btn>
      </v-toolbar>
      <v-card-text class="pa-8 bg-transparent">
        <v-form ref="formRef" v-model="valid">
          <v-row>
            <v-col cols="12">
              <label class="mb-2 font-weight-black text-gold">تاريخ الجلسة (هجري/ميلادي)*</label>
              <DualDatePicker v-model="session.date" />
            </v-col>
            <v-col cols="12" md="6">
              <label class="mb-2 font-weight-black text-gold">الوقت</label>
              <v-text-field
                v-model="session.time"
                type="time"
                variant="outlined"
                class="premium-select glass-input"
              >
                <template #prepend-inner
                  ><LucideIcon name="clock" :size="20" class="text-primary me-2"
                /></template>
              </v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <label class="mb-2 font-weight-black text-gold">القاعة / الدائرة</label>
              <v-text-field
                v-model="session.court_room"
                variant="outlined"
                class="premium-select glass-input"
                placeholder="مثال: القاعة 5 - الدائرة الثالثة"
              >
                <template #prepend-inner
                  ><LucideIcon name="landmark" :size="20" class="text-primary me-2"
                /></template>
              </v-text-field>
            </v-col>
            <v-col cols="12">
              <label class="mb-2 font-weight-black text-gold">حالة الجلسة</label>
              <v-select
                v-model="session.status"
                :items="SESSION_STATUSES"
                variant="outlined"
                class="premium-select glass-input"
              >
                <template #prepend-inner
                  ><LucideIcon name="activity" :size="20" class="text-primary me-2"
                /></template>
              </v-select>
            </v-col>
            <v-col cols="12">
              <label class="mb-2 font-weight-black text-gold"
                >رابط الجلسة الرقمية (ناجز / تيمز / زووم)</label
              >
              <v-text-field
                v-model="session.meeting_link"
                variant="outlined"
                class="premium-select glass-input"
                placeholder="https://..."
              >
                <template #prepend-inner
                  ><LucideIcon name="video" :size="20" class="text-primary me-2"
                /></template>
              </v-text-field>
            </v-col>
            <v-col cols="12">
              <label class="mb-2 font-weight-black text-gold">محاضر وملاحظات الجلسة</label>
              <v-textarea
                v-model="session.notes"
                variant="outlined"
                rows="3"
                class="premium-select glass-input"
                placeholder="سجل هنا أهم ما دار في الجلسة أو القرارات الصادرة..."
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-divider class="opacity-10" />
      <v-card-actions class="pa-6 bg-transparent">
        <v-btn
          variant="tonal"
          class="px-6 font-weight-black rounded-xl premium-btn-gold-gradient"
          @click="$emit('update:modelValue', false)"
          >إلغاء</v-btn
        >
        <v-spacer />
        <v-btn
          color="primary"
          variant="flat"
          class="px-10 font-weight-black rounded-xl shadow-premium premium-btn-gold-gradient"
          :loading="saving"
          @click="$emit('save', session)"
        >
          تأكيد الجدولة
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DualDatePicker from '../../components/DualDatePicker.vue'
import LucideIcon from '../../components/common/LucideIcon.vue'
import { SESSION_STATUSES } from '../../utils/legalConstants'

defineProps<{
  modelValue: boolean
  session: any
  saving: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
  save: [session: any]
}>()

const valid = ref(false)
const formRef = ref<any>(null)
</script>
