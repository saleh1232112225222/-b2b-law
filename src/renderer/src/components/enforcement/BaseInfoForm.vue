<template>
  <v-card flat class="pa-4 bg-transparent border-0 overflow-visible">
    <div class="text-h6 font-weight-black mb-4 text-gold d-flex align-center px-2">
      <LucideIcon name="file-text" :size="24" class="text-gold me-2" />
      بيانات الطلب والسند الأساسية
    </div>

    <v-row dense>
      <!-- الربط بالقضية -->
      <v-col cols="12">
        <v-switch
          v-model="model.is_office_case"
          label="هل التنفيذ تابع لقضية في المكتب؟"
          color="primary"
          inset
          density="compact"
          hide-details
          class="mb-4"
        ></v-switch>
      </v-col>

      <v-col v-if="model.is_office_case" cols="12">
        <v-autocomplete
          v-model="model.related_case_id"
          :items="cases"
          :loading="loading"
          item-title="case_number"
          item-value="id"
          label="اختر القضية المرتبطة"
          variant="outlined"
          density="comfortable"
          :prepend-inner-icon="ICONS.LEGAL.CASE"
          class="mb-4 glass-input"
          clearable
          persistent-placeholder
          placeholder="ابحث برقم القضية أو اسم الموكل..."
          no-filter
          @update:model-value="onCaseSelected"
        >
          <template #append-inner>
            <v-fade-transition>
              <v-chip
                v-if="cases.length > 0"
                size="x-small"
                color="success"
                variant="flat"
                class="me-1"
              >
                {{ cases.length }} قضية
              </v-chip>
            </v-fade-transition>
            <v-btn
              :icon="ICONS.SYSTEM.SYNC"
              variant="text"
              size="small"
              :loading="loading"
              @click.stop="fetchData"
            ></v-btn>
          </template>

          <template #item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps" :subtitle="item.raw.client_name"></v-list-item>
          </template>

          <template #no-data>
            <div class="pa-4 text-center">
              <LucideIcon name="database-zap" :size="48" class="mb-2 opacity-20 mx-auto d-block" />
              <div v-if="error" class="text-error font-weight-bold mb-2">{{ error }}</div>
              <div v-else class="text-grey-darken-1">لا توجد قضايا مسجلة في المكتب حالياً</div>
              <v-btn
                size="small"
                variant="tonal"
                color="primary"
                class="mt-2"
                :prepend-icon="ICONS.SYSTEM.SYNC"
                @click="fetchData"
                >تحديث القائمة</v-btn
              >
            </div>
          </template>
        </v-autocomplete>
      </v-col>

      <!-- المحطة الأولى: نوع الطلب -->
      <v-col cols="12" md="6">
        <v-select
          v-model="model.request_type"
          label="نوع التنفيذ المطلوب"
          :items="requestTypes"
          variant="outlined"
          density="comfortable"
          required
          :prepend-inner-icon="ICONS.UI.SEARCH"
          class="mb-4 glass-input"
        ></v-select>
      </v-col>

      <!-- المحطة الثانية: بيانات السند والطلب -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model="model.instrument_no"
          class="glass-input"
          label="رقم السند"
          variant="outlined"
          density="comfortable"
          required
          :prepend-inner-icon="ICONS.ENTITY.DOCUMENT"
        ></v-text-field>
      </v-col>

      <v-col cols="12" md="6">
        <v-text-field
          v-model="model.najiz_request_no"
          class="glass-input"
          label="رقم الطلب في ناجز"
          variant="outlined"
          density="comfortable"
          :prepend-inner-icon="ICONS.UI.SEARCH"
        ></v-text-field>
      </v-col>

      <v-col cols="12" md="6">
        <DualDatePicker
          v-model="model.instrument_date"
          label="تاريخ السند"
          :icon="ICONS.LEGAL.SESSION"
        />
      </v-col>

      <v-col cols="12" md="6">
        <v-select
          v-model="model.instrument_type_main"
          class="glass-input"
          label="نوع السند (رئيسي)"
          :items="mainInstrumentTypes"
          variant="outlined"
          density="comfortable"
          required
        ></v-select>
      </v-col>

      <v-col cols="12" md="6">
        <v-select
          v-model="model.instrument_type_sub"
          class="glass-input"
          label="نوع السند (فرعي)"
          :items="subInstrumentTypes"
          variant="outlined"
          density="comfortable"
          required
        ></v-select>
      </v-col>

      <v-col cols="12" md="4">
        <v-select
          v-model="model.court_name"
          class="glass-input"
          label="اسم المحكمة"
          :items="courts"
          variant="outlined"
          density="comfortable"
        ></v-select>
      </v-col>

      <v-col cols="12" md="4">
        <v-text-field
          v-model="model.case_number"
          class="glass-input"
          label="رقم صك الحكم / القرار"
          variant="outlined"
          density="comfortable"
        ></v-text-field>
      </v-col>

      <v-col cols="12" md="4">
        <v-select
          v-model="model.request_classification"
          class="glass-input"
          label="تصنيف الطلب"
          :items="classifications"
          variant="outlined"
          density="comfortable"
        ></v-select>
      </v-col>

      <v-col v-if="showOther" cols="12">
        <v-textarea
          v-model="model.other_explanation"
          class="glass-input"
          label="توضيح الخيار (إلزامي)"
          variant="outlined"
          rows="2"
          persistent-hint
          hint="يرجى كتابة التفاصيل هنا لأنك اخترت 'أخرى'"
        ></v-textarea>
      </v-col>

      <!-- أطراف التنفيذ -->
      <v-col cols="12" class="mt-4 px-2">
        <div class="text-subtitle-1 font-weight-black mb-2 text-gold d-flex align-center">
          <LucideIcon name="users" :size="20" class="text-gold me-2" />
          أطراف التنفيذ
          <v-spacer></v-spacer>
          <v-btn
            color="accent"
            variant="text"
            size="small"
            :prepend-icon="ICONS.UI.PLUS"
            class="font-weight-black"
            @click="addParty"
          >
            إضافة طرف
          </v-btn>
        </div>

        <v-table density="compact" class="premium-table">
          <thead>
            <tr>
              <th class="text-right">الاسم</th>
              <th class="text-right">الصفة</th>
              <th class="text-right" width="120">من المكتب؟</th>
              <th class="text-center" width="80">حذف</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(party, index) in model.parties" :key="index">
              <td class="pa-1">
                <v-combobox
                  v-model="party.linked_key"
                  class="glass-input"
                  :items="partyOptions"
                  item-title="label"
                  item-value="key"
                  variant="plain"
                  density="compact"
                  placeholder="ابحث عن موكل أو خصم... أو اكتب الاسم"
                  hide-details
                  clearable
                  @update:model-value="(val) => onPartySelected(party, val)"
                ></v-combobox>
              </td>
              <td class="pa-1">
                <v-select
                  v-model="party.role"
                  class="glass-input"
                  :items="['منفذ (طالب)', 'منفذ ضده (مطلوب)']"
                  variant="plain"
                  density="compact"
                  hide-details
                ></v-select>
              </td>
              <td class="pa-1 text-center">
                <v-checkbox
                  v-model="party.is_client"
                  color="success"
                  density="compact"
                  hide-details
                  class="d-inline-flex"
                ></v-checkbox>
              </td>
              <td class="text-center">
                <v-btn
                  :icon="ICONS.ACTION.DELETE"
                  size="x-small"
                  variant="text"
                  color="error"
                  @click="removeParty(Number(index))"
                ></v-btn>
              </td>
            </tr>
            <tr v-if="!model.parties || model.parties.length === 0">
              <td colspan="4" class="text-center text-grey py-4">لا يوجد أطراف مضافة</td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import DualDatePicker from '../DualDatePicker.vue'
import LucideIcon from '../common/LucideIcon.vue'
import { ICONS } from '../../config/icons'

const props = defineProps({
  modelValue: { type: Object, required: true }
})

const emit = defineEmits(['update:modelValue'])

const model = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const cases = ref<any[]>([])
const allClients = ref<any[]>([])
const allDefendants = ref<any[]>([])
const loading = ref(false)
const error = ref('')

const partyOptions = computed(() => {
  const clients = (allClients.value || []).map((c: any) => ({
    key: `client:${c.id}`,
    type: 'client',
    name: c.name,
    label: `موكل: ${c.name}`
  }))
  const defendants = (allDefendants.value || []).map((d: any) => ({
    key: `defendant:${d.id}`,
    type: 'defendant',
    name: d.name,
    label: `خصم: ${d.name}`
  }))
  return [...clients, ...defendants]
})

const fetchData = async (): Promise<void> => {
  loading.value = true
  error.value = ''
  try {
    const [casesRes, clientsRes, defendantsRes] = await Promise.all([
      (window as any).api.cases.getAll(),
      (window as any).api.clients.getAll(),
      (window as any).api.defendants.getAll()
    ])
    cases.value = casesRes || []
    allClients.value = clientsRes || []
    allDefendants.value = defendantsRes || []
  } catch (e: any) {
    console.error('Failed to fetch data for BaseInfoForm:', e)
    error.value = 'فشل جلب البيانات: ' + (e.message || 'خطأ غير معروف')
  } finally {
    loading.value = false
  }
}

const onCaseSelected = (caseId: string): void => {
  if (!caseId) return
  const selectedCase = cases.value.find((c) => c.id === caseId)
  if (selectedCase) {
    // Populate parties from the case
    model.value.parties = [
      {
        name: selectedCase.client_name,
        role: 'منفذ (طالب)',
        is_client: true,
        linked_key: selectedCase.client_name
      },
      {
        name: selectedCase.opponent_name || 'خصم غير محدد',
        role: 'منفذ ضده (مطلوب)',
        is_client: false,
        linked_key: selectedCase.opponent_name || 'خصم غير محدد'
      }
    ]

    // Auto populate other case info if missing
    if (!model.value.case_number) {
      model.value.case_number = selectedCase.case_number
    }
    if (!model.value.court_name && selectedCase.court) {
      model.value.court_name = selectedCase.court
    }
  }
}

const addParty = (): void => {
  if (!model.value.parties) model.value.parties = []
  model.value.parties.push({ name: '', role: 'منفذ ضده (مطلوب)', is_client: false, linked_key: '' })
}

const removeParty = (index: number): void => {
  model.value.parties.splice(index, 1)
}

onMounted(() => {
  fetchData()
  if (!model.value.parties) model.value.parties = []
  model.value.parties = model.value.parties.map((p: any) => ({
    ...p,
    linked_key: p.linked_key || p.name || ''
  }))
})

const onPartySelected = (party: any, val: any): void => {
  const s = String(val || '').trim()
  if (!s) {
    party.name = ''
    party.is_client = false
    party.linked_key = ''
    return
  }

  if (s.startsWith('client:')) {
    const id = s.slice('client:'.length)
    const found = (allClients.value || []).find((c: any) => String(c.id) === id)
    party.name = found?.name || party.name || ''
    party.is_client = true
    party.linked_key = s
    return
  }

  if (s.startsWith('defendant:')) {
    const id = s.slice('defendant:'.length)
    const found = (allDefendants.value || []).find((d: any) => String(d.id) === id)
    party.name = found?.name || party.name || ''
    party.is_client = false
    party.linked_key = s
    return
  }

  // Manual entry: keep as plain name
  party.name = s
  party.linked_key = s
}

const requestTypes = [
  { title: 'تنفيذ مالي', value: 'financial' },
  { title: 'تنفيذ أحوال شخصية', value: 'personal' },
  { title: 'تنفيذ مباشر', value: 'direct' }
]

const mainInstrumentTypes = [
  'أحكام وقرارات وأوامر',
  'أحكام أجنبية',
  'أوراق تجارية',
  'عقود ومحررات موثقة',
  'أخرى'
]

const subInstrumentTypes = [
  'حكم نهائي',
  'حكم ابتدائي مشمول بالنفاذ المعجل',
  'قرار صادر من لجان قضائية',
  'أمر أداء',
  'أخرى'
]

const courts = ['محكمة التنفيذ بالرياض', 'محكمة التنفيذ بجدة', 'محكمة التنفيذ بالدمام', 'أخرى']

const classifications = ['مطالبة بمبلع مالي', 'تسليم طفل', 'إخلاء عقار', 'أخرى']

const showOther = computed(() => {
  return (
    model.value.instrument_type_main === 'أخرى' ||
    model.value.instrument_type_sub === 'أخرى' ||
    model.value.court_name === 'أخرى' ||
    model.value.request_classification === 'أخرى'
  )
})
</script>
