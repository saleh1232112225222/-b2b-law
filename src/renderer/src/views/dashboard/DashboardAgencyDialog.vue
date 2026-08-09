<template>
  <v-dialog v-model="agencyEditDialog.show" width="90%" max-width="800" persistent scrollable>
    <v-card class="glass-card overflow-hidden glass-card">
      <div class="glass-panel d-flex align-center py-5 px-8 border-b">
        <div class="glass-panel-light pa-2 rounded-lg me-4">
          <LucideIcon name="edit-3" :size="24" class="text-accent" />
        </div>
        <span class="text-h5 font-weight-black text-gold">تعديل بيانات الوكالة الشرعية</span>
        <v-spacer></v-spacer>
        <v-btn
          class="premium-btn-gold-gradient"
          variant="text"
          color="gold"
          icon
          @click="$emit('close')"
        >
          <LucideIcon name="x" :size="24" />
        </v-btn>
      </div>

      <v-card-text class="pa-8 bg-white modal-scrollable poa-form">
        <v-form ref="agencyFormRef" v-model="agencyEditDialog.valid" lazy-validation>
          <v-row dense>
            <v-col cols="12">
              <label class="mb-2 font-weight-black text-gold">الموكل صاحب الوكالة*</label>
              <v-autocomplete
                v-model="agencyEditDialog.data.client_id"
                :items="clients"
                item-title="name"
                item-value="id"
                placeholder="ابحث عن اسم الموكل..."
                variant="outlined"
                class="glass-input"
                :rules="[(v) => !!v || 'تعيين الموكل ضروري لإتمام التسجيل']"
                no-data-text="لا يوجد موكلون مسجلون"
                required
              >
                <template #prepend-inner>
                  <LucideIcon name="user-cog" :size="20" class="text-gold opacity-50" />
                </template>
              </v-autocomplete>
            </v-col>
            <v-col cols="12" md="4">
              <label class="mb-2 font-weight-black text-gold">رقم الوكالة الرسمي*</label>
              <v-text-field
                v-model="agencyEditDialog.data.agency_number"
                placeholder="مثال: 44123456"
                variant="outlined"
                class="glass-input"
                :rules="[(v) => !!v || 'رقم الوكالة مطلوب للتحقق النظامي']"
                required
              />
            </v-col>
            <v-col cols="12" md="4">
              <label class="mb-2 font-weight-black text-gold">تاريخ صدور الوكالة*</label>
              <DualDatePicker v-model="agencyEditDialog.data.date" />
            </v-col>
            <v-col cols="12" md="4">
              <label class="mb-2 font-weight-black text-gold">تاريخ انتهاء الوكالة</label>
              <DualDatePicker v-model="agencyEditDialog.data.expiry_date" />
            </v-col>
            <v-col cols="12">
              <label class="mb-2 font-weight-black text-gold"
                >جهة الإصدار (كتابة عدل / منصة ناجز)</label
              >
              <v-text-field
                v-model="agencyEditDialog.data.court"
                placeholder="مثال: كتابة العدل الأولى بالرياض"
                variant="outlined"
                class="glass-input"
              >
                <template #prepend-inner>
                  <LucideIcon name="landmark" :size="20" class="text-gold opacity-50" />
                </template>
              </v-text-field>
            </v-col>
            <v-col cols="12">
              <label class="mb-2 font-weight-black text-gold"
                >نطاق الوكالة / الصلاحيات الممنوحة</label
              >
              <v-textarea
                v-model="agencyEditDialog.data.notes"
                placeholder="دون هنا الصلاحيات الأساسية (المرافعة، الحجز، قبض الثمن...)"
                variant="outlined"
                rows="3"
                class="glass-input"
              >
                <template #prepend-inner>
                  <LucideIcon name="sticky-note" :size="20" class="text-gold opacity-50" />
                </template>
              </v-textarea>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-divider class="border-gold opacity-10"></v-divider>
      <v-card-actions class="pa-8 modal-footer-solid">
        <v-btn
          variant="outlined"
          size="large"
          class="px-8 font-weight-black rounded-lg text-white btn-secondary action-btn-unified"
          @click="$emit('close')"
          >إلغاء</v-btn
        >
        <v-spacer></v-spacer>
        <v-btn
          variant="flat"
          size="large"
          class="px-12 font-weight-black premium-button-highlight action-btn-unified h-56 premium-btn-gold-gradient"
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
  max-height: calc(100vh - 280px);
  overflow-y: auto;
}

.modal-footer-solid {
  background: var(--surface-variant, #fbf3e5) !important;
  border-top: 1px solid var(--border, rgba(208, 198, 175, 0.4)) !important;
}

.action-btn-unified {
  min-width: 180px !important;
}
</style>
