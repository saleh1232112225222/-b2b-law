<template>
  <v-form ref="formRef" v-model="internalFormValid">
    <v-row dense>
      <!-- Classification & Service Name (Dropdowns) -->
      <v-col cols="12" md="6">
        <v-select
          v-model="modelValue.category_id"
          :items="store.categories"
          item-title="name_ar"
          item-value="id"
          label="التصنيف الرئيسي للخدمة*"
          variant="outlined"
          density="comfortable"
          :prepend-inner-icon="ICONS.ENTITY.CASE"
          :rules="[(v) => !!v || 'التصنيف الرئيسي مطلوب']"
          required
          @update:model-value="onCategoryChange"
        ></v-select>
      </v-col>
      <v-col cols="12" md="6">
        <v-select
          v-model="modelValue.engagement_type_id"
          :items="filteredTypes"
          item-title="name_ar"
          item-value="id"
          label="اسم الخدمة (قائمة منسدلة)*"
          variant="outlined"
          density="comfortable"
          :prepend-inner-icon="ICONS.ENTITY.DOCUMENT"
          :rules="[(v) => !!v || 'اسم الخدمة مطلوب']"
          :disabled="!modelValue.category_id"
          required
        ></v-select>
      </v-col>

      <!-- Service Type -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model="modelValue.service_type"
          label="نوع الخدمة"
          variant="outlined"
          density="comfortable"
          placeholder="مثال: مكتوبة، حضورية، إلكترونية..."
          :prepend-inner-icon="ICONS.UI.TAG"
        ></v-text-field>
      </v-col>

      <!-- Client & Beneficiary -->
      <v-col cols="12" md="6">
        <v-autocomplete
          v-model="modelValue.client_id"
          :items="clients"
          item-title="name"
          item-value="id"
          label="العميل"
          variant="outlined"
          density="comfortable"
          :prepend-inner-icon="ICONS.ENTITY.CLIENT"
          clearable
        ></v-autocomplete>
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="modelValue.beneficiary"
          label="المستفيد (إن كان مختلفاً عن العميل)"
          variant="outlined"
          density="comfortable"
          :prepend-inner-icon="ICONS.ENTITY.USER"
        ></v-text-field>
      </v-col>

      <!-- Linked Parties -->
      <v-col cols="12">
        <v-text-field
          v-model="modelValue.linked_parties"
          label="الأطراف المرتبطون بالخدمة (إن وجدوا)"
          variant="outlined"
          density="comfortable"
          placeholder="أدخل أسماء الأطراف مفصولة بفاصلة"
          :prepend-inner-icon="ICONS.ENTITY.DEFENDANT"
        ></v-text-field>
      </v-col>

      <!-- Responsible Lawyer & assistant team -->
      <v-col cols="12" md="6">
        <v-autocomplete
          v-model="modelValue.responsible_lawyer_id"
          :items="lawyers"
          item-title="name"
          item-value="id"
          label="المحامي المسؤول"
          variant="outlined"
          density="comfortable"
          :prepend-inner-icon="ICONS.ENTITY.EXPERT"
          clearable
        ></v-autocomplete>
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="modelValue.assistant_team"
          label="الفريق المساعد"
          variant="outlined"
          density="comfortable"
          :prepend-inner-icon="ICONS.ENTITY.USER"
        ></v-text-field>
      </v-col>

      <!-- Description & Purpose -->
      <v-col cols="12" md="6">
        <v-textarea
          v-model="modelValue.description"
          label="وصف مختصر للخدمة"
          variant="outlined"
          density="comfortable"
          rows="2"
          :prepend-inner-icon="ICONS.UI.NOTE"
        ></v-textarea>
      </v-col>
      <v-col cols="12" md="6">
        <v-textarea
          v-model="modelValue.purpose"
          label="الغرض"
          variant="outlined"
          density="comfortable"
          rows="2"
          :prepend-inner-icon="ICONS.UI.NOTE"
        ></v-textarea>
      </v-col>

      <!-- Dates: Start, Expected End, Completion -->
      <v-col cols="12" md="4">
        <DualDatePicker
          v-model="modelValue.start_date"
          label="تاريخ بدء الخدمة"
          icon="calendar"
        />
      </v-col>
      <v-col cols="12" md="4">
        <DualDatePicker
          v-model="modelValue.expected_end_date"
          label="تاريخ الانتهاء المتوقع"
          icon="calendar-clock"
        />
      </v-col>
      <v-col cols="12" md="4">
        <DualDatePicker
          v-model="modelValue.completion_date"
          label="تاريخ الإنجاز"
          icon="calendar-check"
        />
      </v-col>

      <!-- Status & Priority -->
      <v-col cols="12" md="6">
        <v-select
          v-model="modelValue.status_id"
          :items="store.statuses"
          item-title="status_name_ar"
          item-value="id"
          label="الحالة*"
          variant="outlined"
          density="comfortable"
          :prepend-inner-icon="ICONS.STATUS.PENDING"
          :rules="[(v) => !!v || 'الحالة مطلوبة']"
          required
        ></v-select>
      </v-col>
      <v-col cols="12" md="6">
        <v-select
          v-model="modelValue.priority_id"
          :items="store.priorities"
          item-title="priority_name_ar"
          item-value="id"
          label="الأولوية*"
          variant="outlined"
          density="comfortable"
          :prepend-inner-icon="ICONS.STATUS.URGENT"
          :rules="[(v) => !!v || 'الأولوية مطلوبة']"
          required
        ></v-select>
      </v-col>

      <!-- Financial Fields: Compensation, Tax, Paid, Remaining -->
      <v-col cols="12" md="3">
        <v-text-field
          v-model.number="modelValue.financial_compensation"
          label="المقابل المالي*"
          type="number"
          variant="outlined"
          density="comfortable"
          :prepend-inner-icon="ICONS.NAV.FINANCE"
          :rules="[(v) => v !== undefined && v >= 0 || 'المبلغ مطلوب']"
          required
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="3">
        <v-text-field
          v-model.number="modelValue.tax"
          label="الضريبة"
          type="number"
          variant="outlined"
          density="comfortable"
          :prepend-inner-icon="ICONS.NAV.FINANCE"
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="3">
        <v-text-field
          v-model.number="modelValue.paid_amount"
          label="المسدد"
          type="number"
          variant="outlined"
          density="comfortable"
          :prepend-inner-icon="ICONS.NAV.FINANCE"
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="3">
        <v-text-field
          :model-value="computedRemaining"
          label="المتبقي (حساب تلقائي للواجهة)"
          type="number"
          variant="outlined"
          density="comfortable"
          :prepend-inner-icon="ICONS.NAV.FINANCE"
          readonly
          disabled
          class="bg-grey-lighten-4"
        ></v-text-field>
      </v-col>

      <!-- Payment Method -->
      <v-col cols="12">
        <v-text-field
          v-model="modelValue.payment_method"
          label="طريقة السداد"
          variant="outlined"
          density="comfortable"
          placeholder="مثال: تحويل بنكي، كاش، مدى..."
          :prepend-inner-icon="ICONS.NAV.FINANCE"
        ></v-text-field>
      </v-col>

      <!-- Linked Contract & Linked Case -->
      <v-col cols="12" md="6">
        <v-autocomplete
          v-model="modelValue.contract_id"
          :items="contracts"
          item-title="contract_no"
          item-value="id"
          label="العقد المرتبط (إن وجد)"
          variant="outlined"
          density="comfortable"
          :prepend-inner-icon="ICONS.NAV.CONTRACTS"
          clearable
        ></v-autocomplete>
      </v-col>
      <v-col cols="12" md="6">
        <v-autocomplete
          v-model="modelValue.case_id"
          :items="cases"
          item-title="case_number"
          item-value="id"
          label="القضية المرتبطة (إن وجدت)"
          variant="outlined"
          density="comfortable"
          :prepend-inner-icon="ICONS.ENTITY.CASE"
          clearable
        ></v-autocomplete>
      </v-col>
      <v-col cols="12" md="6">
        <v-autocomplete
          v-model="modelValue.invoice_id"
          :items="invoices"
          item-title="invoice_number"
          item-value="id"
          label="الفاتورة المرتبطة (إن وجدت)"
          variant="outlined"
          density="comfortable"
          :prepend-inner-icon="ICONS.NAV.FINANCE"
          clearable
        ></v-autocomplete>
      </v-col>

      <!-- Notes -->
      <v-col cols="12">
        <v-textarea
          v-model="modelValue.notes"
          label="الملاحظات العامة للخدمة"
          variant="outlined"
          density="comfortable"
          rows="3"
          :prepend-inner-icon="ICONS.UI.NOTE"
        ></v-textarea>
      </v-col>
    </v-row>
  </v-form>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useLegalStore } from '../stores/legal'
import { ICONS } from '../config/icons'
import DualDatePicker from './DualDatePicker.vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'update:valid'])

const store = useLegalStore()
const internalFormValid = ref(false)
const formRef = ref<any>(null)

// Local data fetched on mount
const clients = ref<any[]>([])
const lawyers = ref<any[]>([])
const contracts = ref<any[]>([])
const cases = ref<any[]>([])
const invoices = ref<any[]>([])

// Reactive filtered service names based on classification category selection
const filteredTypes = computed(() => {
  if (!props.modelValue.category_id) return []
  return store.types.filter((t) => t.category_id === props.modelValue.category_id)
})

// Readonly UI display computed remaining amount. Server calculates this strictly too.
const computedRemaining = computed(() => {
  const comp = Number(props.modelValue.financial_compensation || 0)
  const tax = Number(props.modelValue.tax || 0)
  const paid = Number(props.modelValue.paid_amount || 0)
  return (comp + tax) - paid
})

// Reset type selection on category change to prevent invalid hardcoded values
const onCategoryChange = () => {
  props.modelValue.engagement_type_id = ''
}

watch(internalFormValid, (newVal) => {
  emit('update:valid', newVal)
})

const loadReferenceData = async () => {
  try {
    await store.fetchMetadata()
    
    // Fetch clients
    clients.value = await window.api.clients.getAll()
    
    // Fetch employees/lawyers
    lawyers.value = await window.api.employees.list()
    
    // Fetch contracts
    contracts.value = await window.api.contracts.list()
    
    // Fetch cases
    cases.value = await window.api.cases.getAll()

    // Fetch invoices
    invoices.value = await window.api.invoices.getAll()
  } catch (e) {
    console.error('Failed to load form reference datasets:', e)
  }
}

onMounted(() => {
  loadReferenceData()
})

const validate = async () => {
  if (!formRef.value) return { valid: false }
  return await formRef.value.validate()
}

defineExpose({
  validate
})
</script>
