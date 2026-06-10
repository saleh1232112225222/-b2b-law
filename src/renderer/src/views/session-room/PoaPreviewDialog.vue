<template>
  <v-dialog v-model="showVal" width="90%" max-width="800" scrollable>
    <v-card class="bg-grey-lighten-4 overflow-hidden rounded-xl border-accent">
      <div class="bg-white d-flex align-center py-5 px-8 border-b">
        <div class="bg-primary-alpha pa-2 rounded-lg me-4"><LucideIcon name="book-user" :size="24" class="text-primary" /></div>
        <span class="text-h5 font-weight-black text-grey-darken-4">معاينة بيانات الوكالة</span>
        <v-spacer />
        <v-btn variant="text" color="grey-darken-3" icon @click="showVal = false"><LucideIcon name="x" :size="24" /></v-btn>
      </div>
      <v-card-text class="pa-8 bg-grey-lighten-4">
        <v-row dense>
          <v-col cols="12" md="6">
            <div class="detail-row mb-6">
              <span class="text-caption text-grey-darken-1 mb-1 d-block font-weight-black">الرقم المرجعي الرسمي</span>
              <span class="text-h6 font-weight-black text-black d-block ltr-text">{{ data?.agency_number || '—' }}</span>
            </div>
          </v-col>
          <v-col cols="12" md="6">
            <div class="detail-row mb-6">
              <span class="text-caption text-grey-darken-1 mb-1 d-block font-weight-black">الموكل صاحب الوكالة</span>
              <span class="text-h6 font-weight-black text-black d-block">{{ data?.client_name || '—' }}</span>
            </div>
          </v-col>
          <v-col cols="12" md="6">
            <div class="detail-row mb-6">
              <span class="text-caption text-grey-darken-1 mb-1 d-block font-weight-black">تاريخ الاعتماد</span>
              <div class="d-flex align-center">
                <span class="text-body-1 text-black font-weight-black">{{ data?.date || '—' }} مـ</span>
                <v-chip v-if="data?.date" size="x-small" color="primary" variant="tonal" class="ms-3 font-weight-black">{{ convertHijri(data.date) }} هـ</v-chip>
              </div>
            </div>
          </v-col>
          <v-col cols="12" md="6">
            <div class="detail-row mb-6">
              <span class="text-caption text-grey-darken-1 mb-1 d-block font-weight-black">تاريخ الانتهاء</span>
              <div class="d-flex align-center">
                <span class="text-body-1 text-black font-weight-black">{{ data?.expiry_date || '—' }} مـ</span>
                <v-chip v-if="data?.expiry_date" size="x-small" color="warning" variant="tonal" class="ms-3 font-weight-black">{{ convertHijri(data.expiry_date) }} هـ</v-chip>
              </div>
            </div>
          </v-col>
          <v-col cols="12">
            <div class="detail-row mb-6">
              <span class="text-caption text-grey-darken-1 mb-1 d-block font-weight-black">مصدر الوكالة / جهة الإصدار</span>
              <span class="text-body-1 text-black font-weight-black d-block">{{ data?.court || '—' }}</span>
            </div>
          </v-col>
          <v-col cols="12">
            <div class="detail-row mb-2">
              <span class="text-caption text-grey-darken-1 mb-2 d-block font-weight-black">نطاق الوكالة / الصلاحيات الممنوحة</span>
              <div class="bg-white pa-4 rounded-lg text-black leading-relaxed shadow-sm border">{{ data?.notes || 'لا توجد ملاحظات مسجلة لنطاق هذه الوكالة' }}</div>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
      <v-divider class="border-grey-lighten-2" />
      <v-card-actions class="pa-6 bg-grey-lighten-3">
        <v-spacer />
        <v-btn color="primary" variant="flat" size="large" class="px-12 font-weight-black rounded-xl shadow-premium" @click="showVal = false">إغلاق المعاينة</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'
import { convertToHijri } from '../../utils/hijri'

const showVal = defineModel<boolean>('show', { required: true })
defineProps<{ data: any }>()

const convertHijri = (date: string) => {
  try { return convertToHijri(new Date(date)) } catch { return '—' }
}
</script>
