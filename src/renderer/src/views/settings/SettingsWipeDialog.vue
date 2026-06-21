<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card
      class="pa-0 border-error border-4 rounded-xl shadow-2xl overflow-hidden"
      style="background: #ffffff !important"
    >
      <div class="pa-6 bg-error text-white d-flex align-center font-weight-black">
        <LucideIcon name="alert-octagon" :size="28" class="me-3" /> تأكيد المسح الشامل
      </div>
      <v-card-text class="pa-8 bg-white">
        <p class="text-h6 mb-4 font-weight-black text-black">
          تحذير: سيتم حذف بيانات القضايا والمعاملات نهائياً.
        </p>
        <p class="text-body-2 text-grey-darken-3 mb-6 font-weight-bold">
          لا يشمل هذا المسح حذف: المستخدمين، الإعدادات، بيانات المؤسسة، الصلاحيات والأدوار. لتأكيد
          هذه العملية، يرجى كتابة كلمة
          <span class="text-error font-weight-black underline">مسح</span>:
        </p>
        <v-text-field
          v-model="wipeConfirmInput"
          label="اكتب 'مسح' هنا"
          variant="outlined"
          hide-details
          color="error"
          class="mb-4"
          style="--v-field-label-color: #000000; color: #000000"
          autocomplete="off"
        ></v-text-field>
      </v-card-text>
      <v-card-actions class="pa-6 pt-0 gap-3">
        <v-btn variant="text" color="gold" class="font-weight-black" @click="handleCancel"
          >تراجع</v-btn
        >
        <v-spacer></v-spacer>
        <v-btn
          color="error"
          variant="flat"
          class="px-8 font-weight-black premium-lift"
          :disabled="wipeConfirmInput !== 'مسح' && wipeConfirmInput !== 'DELETE'"
          :loading="clearing"
          @click="handleConfirm"
        >
          تأكيد الحذف النهائي
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import LucideIcon from '../../components/common/LucideIcon.vue'

const props = defineProps<{
  modelValue: boolean
  clearing: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'confirm', v: string): void
}>()

const wipeConfirmInput = ref('')

watch(
  () => props.modelValue,
  (val) => {
    if (!val) {
      wipeConfirmInput.value = ''
    }
  }
)

const handleCancel = (): void => {
  wipeConfirmInput.value = ''
  emit('update:modelValue', false)
}

const handleConfirm = (): void => {
  emit('confirm', wipeConfirmInput.value)
}
</script>
