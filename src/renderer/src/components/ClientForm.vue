<template>
  <v-form ref="formRef" v-model="internalFormValid">
    <v-row>
      <!-- Name -->
      <v-col cols="12">
        <v-label class="mb-2 font-weight-black">اسم الموكل بالكامل*</v-label>
        <v-text-field
          v-model="modelValue.name"
          placeholder="مثال: أحمد محمد علي"
          variant="outlined"
          class="glass-input"
          :prepend-inner-icon="ICONS.ENTITY.CLIENT"
          :rules="[
            (v) => !!v || 'الاسم مطلوب',
            (v) => v.length >= 3 || 'الاسم يجب أن يكون 3 حروف على الأقل'
          ]"
          required
        ></v-text-field>
      </v-col>

      <!-- Type -->
      <v-col cols="12" md="6">
        <v-label class="mb-2 font-weight-black">نوع الموكل*</v-label>
        <v-select
          v-model="modelValue.type"
          :items="['فرد', 'شركة', 'مؤسسة', 'جهة حكومية', 'أخرى']"
          placeholder="اختر نوع الموكل..."
          variant="outlined"
          class="glass-input"
          :prepend-inner-icon="ICONS.ENTITY.USER"
          :rules="[(v) => !!v || 'نوع الموكل مطلوب']"
          required
        ></v-select>
      </v-col>

      <!-- ID Number -->
      <v-col cols="12" md="6">
        <v-label class="mb-2 font-weight-black">رقم الهوية / السجل التجاري</v-label>
        <v-text-field
          v-model="modelValue.id_number"
          placeholder="مثال: 1023456789"
          variant="outlined"
          class="glass-input"
          :prepend-inner-icon="ICONS.UI.ID_CARD"
        ></v-text-field>
      </v-col>

      <!-- Phone -->
      <v-col cols="12" md="6">
        <v-label class="mb-2 font-weight-black">رقم الهاتف</v-label>
        <v-text-field
          v-model="modelValue.phone"
          placeholder="مثال: 0501234567"
          variant="outlined"
          class="glass-input"
          :prepend-inner-icon="ICONS.UI.PHONE"
          :rules="[
            (v) => !v || /^05\d{8}$/.test(v) || 'يجب إدخال رقم جوال سعودي صحيح (مثال: 0512345678)'
          ]"
        ></v-text-field>
      </v-col>

      <!-- Nationality -->
      <v-col cols="12" md="6">
        <v-label class="mb-2 font-weight-black">الجنسية</v-label>
        <v-combobox
          v-model="modelValue.nationality"
          :items="['سعودي', 'مصري', 'سوري', 'أردني', 'يمني', 'سوداني', 'باكستاني', 'هندي', 'أخرى']"
          placeholder="اختر الجنسية أو اكتب..."
          variant="outlined"
          class="glass-input"
          :prepend-inner-icon="ICONS.ENTITY.USER"
        ></v-combobox>
      </v-col>

      <!-- City -->
      <v-col cols="12" md="6">
        <v-label class="mb-2 font-weight-black">المدينة</v-label>
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
          placeholder="اختر المدينة أو اكتب..."
          variant="outlined"
          class="glass-input"
          :prepend-inner-icon="ICONS.UI.MAP_PIN"
        ></v-combobox>
      </v-col>

      <!-- Email -->
      <v-col cols="12" md="6">
        <v-label class="mb-2 font-weight-black">البريد الإلكتروني</v-label>
        <v-text-field
          v-model="modelValue.email"
          placeholder="مثال: client@example.com"
          variant="outlined"
          class="glass-input"
          :prepend-inner-icon="ICONS.UI.EMAIL"
          :rules="[
            (v) =>
              !v ||
              /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(v) ||
              'البريد الإلكتروني غير صحيح'
          ]"
        ></v-text-field>
      </v-col>

      <!-- Address -->
      <v-col cols="12">
        <v-label class="mb-2 font-weight-black">العنوان</v-label>
        <v-textarea
          v-model="modelValue.address"
          placeholder="العنوان التفصيلي (الشارع، الحي، الرمز البريدي)"
          variant="outlined"
          rows="2"
          class="glass-input"
          :prepend-inner-icon="ICONS.UI.MAP_PIN"
        ></v-textarea>
      </v-col>

      <!-- Birth Date -->
      <v-col cols="12">
        <v-label class="mb-2 font-weight-black">تاريخ الميلاد (هجري/ميلادي)</v-label>
        <DualDatePicker v-model="modelValue.birth_date" :icon="ICONS.UI.BIRTHDAY" />
      </v-col>

      <!-- Notes -->
      <v-col cols="12">
        <v-label class="mb-2 font-weight-black">ملاحظات</v-label>
        <v-text-field
          v-model="modelValue.notes"
          placeholder="أي ملاحظات إضافية حول الموكل..."
          variant="outlined"
          class="glass-input"
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
