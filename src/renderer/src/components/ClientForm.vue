<template>
  <v-form ref="formRef" v-model="internalFormValid">
    <v-row>
      <v-col cols="12">
        <v-text-field
          v-model="modelValue.name"
          label="اسم الموكل بالكامل*"
          variant="outlined"
          :prepend-inner-icon="ICONS.ENTITY.CLIENT"
          :rules="[
            (v) => !!v || 'الاسم مطلوب',
            (v) => v.length >= 3 || 'الاسم يجب أن يكون 3 حروف على الأقل'
          ]"
          required
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="6">
        <v-select
          v-model="modelValue.type"
          :items="['فرد', 'شركة', 'مؤسسة', 'جهة حكومية', 'أخرى']"
          label="نوع الموكل*"
          variant="outlined"
          :prepend-inner-icon="ICONS.ENTITY.USER"
          :rules="[(v) => !!v || 'نوع الموكل مطلوب']"
          required
        ></v-select>
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="modelValue.id_number"
          label="رقم الهوية / السجل التجاري"
          variant="outlined"
          :prepend-inner-icon="ICONS.UI.ID_CARD"
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="modelValue.phone"
          label="رقم الهاتف"
          variant="outlined"
          :prepend-inner-icon="ICONS.UI.PHONE"
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="6">
        <v-combobox
          v-model="modelValue.nationality"
          :items="['سعودي', 'مصري', 'سوري', 'أردني', 'يمني', 'سوداني', 'باكستاني', 'هندي', 'أخرى']"
          label="الجنسية"
          variant="outlined"
          :prepend-inner-icon="ICONS.ENTITY.USER"
        ></v-combobox>
      </v-col>
      <v-col cols="12" md="6">
        <v-combobox
          v-model="modelValue.city"
          :items="[
            'الرياض',
            'جدة',
            'الدمام',
            'مكة المكرمة',
            'المدينة المنورة',
            'الخبر',
            'نيوم',
            'أخرى'
          ]"
          label="المدينة"
          variant="outlined"
          :prepend-inner-icon="ICONS.UI.MAP_PIN"
        ></v-combobox>
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="modelValue.email"
          label="البريد الإلكتروني"
          variant="outlined"
          :prepend-inner-icon="ICONS.UI.EMAIL"
          :rules="[(v) => !v || /.+@.+\..+/.test(v) || 'البريد غير صالح']"
        ></v-text-field>
      </v-col>
      <v-col cols="12">
        <v-textarea
          v-model="modelValue.address"
          label="العنوان"
          variant="outlined"
          rows="2"
          :prepend-inner-icon="ICONS.UI.MAP_PIN"
        ></v-textarea>
      </v-col>
      <v-col cols="12">
        <DualDatePicker
          v-model="modelValue.birth_date"
          label="تاريخ الميلاد (هجري/ميلادي)"
          :icon="ICONS.UI.BIRTHDAY"
        />
      </v-col>
      <v-col cols="12">
        <v-text-field
          v-model="modelValue.notes"
          label="ملاحظات"
          variant="outlined"
          :prepend-inner-icon="ICONS.UI.NOTE"
        ></v-text-field>
      </v-col>
    </v-row>
  </v-form>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ICONS } from '../config/icons'
import DualDatePicker from './DualDatePicker.vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'update:valid'])

const internalFormValid = ref(false)
const formRef = ref<any>(null)

watch(internalFormValid, (newVal) => {
  emit('update:valid', newVal)
})

const validate = async () => {
  if (!formRef.value) return { valid: false }
  return await formRef.value.validate()
}

defineExpose({
  validate
})
</script>
