<template>
  <v-dialog v-model="agencyEditDialog.show" width="92%" max-width="950" persistent scrollable>
    <v-card class="b2b-modal-card overflow-hidden" style="background: #FFFFFF; border: 1px solid #E5E1D8; border-radius: 16px;">
      <div class="pa-4 px-6 d-flex align-center" style="background: #F7F3E8; border-bottom: 1px solid #E5E1D8;">
        <div class="icon-circle-gold me-3">
          <LucideIcon name="edit-3" :size="20" />
        </div>
        <div>
          <h3 class="text-h6 font-weight-black text-navy mb-0">تعديل بيانات الوكالة الشرعية</h3>
          <span class="text-caption text-muted-gray">أدخل بيانات الموكل ورقم الوكالة ونطاق الصلاحيات الممنوحة</span>
        </div>
        <v-spacer></v-spacer>
        <v-btn
          icon
          variant="text"
          class="rounded-circle close-btn"
          @click="$emit('close')"
        >
          <LucideIcon name="x" :size="20" />
        </v-btn>
      </div>

      <v-card-text class="pa-6 modal-scrollable poa-form" style="background: #F8F7F3;">
        <div class="section-card-wrapper mb-0 pa-6">
          <v-form ref="agencyFormRef" v-model="agencyEditDialog.valid" lazy-validation>
            <v-row dense class="ga-y-3">
              <v-col cols="12" md="7">
                <label class="text-caption font-weight-bold text-navy mb-1 d-block">الموكل صاحب الوكالة *</label>
                <v-autocomplete
                  v-model="agencyEditDialog.data.client_id"
                  :items="clients"
                  item-title="name"
                  item-value="id"
                  placeholder="ابحث عن اسم الموكل..."
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                  :rules="[(v) => !!v || 'تعيين الموكل ضروري لإتمام التسجيل']"
                  no-data-text="لا يوجد موكلون مسجلون"
                  required
                >
                  <template #prepend-inner>
                    <LucideIcon name="user-cog" :size="18" class="text-gold-accent me-2" />
                  </template>
                </v-autocomplete>
              </v-col>
              <v-col cols="12" md="5">
                <label class="text-caption font-weight-bold text-navy mb-1 d-block">رقم الوكالة الرسمي *</label>
                <v-text-field
                  v-model="agencyEditDialog.data.agency_number"
                  placeholder="مثال: 44123456"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                  :rules="[(v) => !!v || 'رقم الوكالة مطلوب للتحقق النظامي']"
                  required
                />
              </v-col>
              <v-col cols="12" md="6">
                <label class="text-caption font-weight-bold text-navy mb-1 d-block">تاريخ صدور الوكالة *</label>
                <DualDatePicker v-model="agencyEditDialog.data.date" />
              </v-col>
              <v-col cols="12" md="6">
                <label class="text-caption font-weight-bold text-navy mb-1 d-block">تاريخ انتهاء الوكالة</label>
                <DualDatePicker v-model="agencyEditDialog.data.expiry_date" />
              </v-col>
              <v-col cols="12">
                <label class="text-caption font-weight-bold text-navy mb-1 d-block">جهة الإصدار (كتابة عدل / منصة ناجز)</label>
                <v-text-field
                  v-model="agencyEditDialog.data.court"
                  placeholder="مثال: كتابة العدل الأولى بالرياض"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                >
                  <template #prepend-inner>
                    <LucideIcon name="landmark" :size="18" class="text-gold-accent me-2" />
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="12">
                <label class="text-caption font-weight-bold text-navy mb-1 d-block">نطاق الوكالة / الصلاحيات الممنوحة</label>
                <v-textarea
                  v-model="agencyEditDialog.data.notes"
                  placeholder="دون هنا الصلاحيات الأساسية (المرافعة، الحجز، قبض الثمن...)"
                  variant="outlined"
                  rows="4"
                  density="comfortable"
                  hide-details
                >
                  <template #prepend-inner>
                    <LucideIcon name="sticky-note" :size="18" class="text-gold-accent me-2" />
                  </template>
                </v-textarea>
              </v-col>
            </v-row>
          </v-form>
        </div>
      </v-card-text>

      <v-divider />
      <v-card-actions class="pa-4 px-6" style="background: #F7F3E8; border-top: 1px solid #E5E1D8;">
        <v-btn
          variant="outlined"
          class="pill-btn-cancel px-6"
          @click="$emit('close')"
          >إلغاء</v-btn
        >
        <v-spacer></v-spacer>
        <v-btn
          variant="flat"
          class="pill-btn-gold-filled px-8"
          :disabled="!agencyEditDialog.valid"
          :loading="agencyEditDialog.saving"
          @click="$emit('save', agencyEditDialog.data)"
          >تحديث السجل</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'
import DualDatePicker from '../../components/DualDatePicker.vue'

defineProps<{
  agencyEditDialog: { show: boolean; saving: boolean; valid: boolean; data: any }
  clients: any[]
  isMobile: boolean
}>()

defineEmits<{
  save: [data: any]
  close: []
}>()
</script>

<style scoped>
.poa-form :deep(.glass-input .v-field__outline) {
  --v-field-border-opacity: 1 !important;
  color: var(--border, rgba(208, 198, 175, 0.6)) !important;
}

.poa-form :deep(.glass-input input),
.poa-form :deep(.glass-input .v-field__input),
.poa-form :deep(.glass-input .v-select__selection-text) {
  color: var(--text-primary, #1f1b13) !important;
  font-weight: 700;
}

.modal-scrollable {
  max-height: calc(100vh - 240px);
  overflow-y: auto;
}

.modal-footer-solid {
  background: var(--surface-variant, #fbf3e5) !important;
  border-top: 1px solid var(--border, rgba(208, 198, 175, 0.4)) !important;
}
</style>
