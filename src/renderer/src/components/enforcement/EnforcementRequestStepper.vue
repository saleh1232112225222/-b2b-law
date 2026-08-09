<template>
  <v-dialog
    v-model="dialog"
    max-width="1000"
    persistent
    scrollable
    transition="dialog-bottom-transition"
  >
    <v-card class="rounded-xl shadow-2xl elevation-24 glass-card">
      <!-- Header -->
      <v-toolbar color="surface-variant" flat height="72" class="px-4 modal-header border-b">
        <v-btn :icon="ICONS.UI.CLOSE" variant="tonal" color="error" class="rounded-lg me-2" @click="close"></v-btn>
        <v-toolbar-title class="font-weight-black text-gold">
          {{ isEdit ? 'تعديل طلب تنفيذ' : 'تقديم طلب تنفيذ جديد' }}
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-chip
          v-if="form.request_type"
          color="accent"
          variant="tonal"
          class="me-4 font-weight-black"
        >
          {{ getTypeName(form.request_type) }}
        </v-chip>
      </v-toolbar>

      <v-card-text class="pa-6 modal-body-bg" style="min-height: 500px">
        <v-stepper v-model="step" flat class="bg-transparent" hide-actions>
          <v-stepper-header class="elevation-0 bg-white border-b rounded-xl mb-4">
            <v-stepper-item
              :value="1"
              title="البيانات الأساسية"
              subtitle="السند والأطراف"
              :complete="step > 1"
            ></v-stepper-item>

            <v-divider></v-divider>

            <v-stepper-item
              :value="2"
              title="الإجراءات والمسار"
              subtitle="القرارات والتفاصيل"
              :complete="step > 2"
              :disabled="!form.request_type"
            ></v-stepper-item>

            <v-divider></v-divider>

            <v-stepper-item
              :value="3"
              title="المرفقات والتأكيد"
              subtitle="رفع المستندات"
              :disabled="!form.request_type || !form.instrument_no"
            ></v-stepper-item>
          </v-stepper-header>

          <v-stepper-window v-model="step" class="pa-4">
            <!-- Step 1: Base Info -->
            <v-stepper-window-item :value="1">
              <BaseInfoForm v-model="form" />
            </v-stepper-window-item>

            <!-- Step 2: Path Specific details & Decisions -->
            <v-stepper-window-item :value="2">
              <v-fade-transition mode="out-in">
                <div v-if="form.request_type">
                  <component :is="detailComponent" v-model="form.details" />

                  <v-divider class="my-6"></v-divider>

                  <DecisionsManager v-model="form.decisions" />
                </div>
                <v-alert
                  v-else
                  type="warning"
                  variant="tonal"
                  text="يرجى اختيار نوع الطلب أولاً في الخطوة السابقة."
                ></v-alert>
              </v-fade-transition>
            </v-stepper-window-item>

            <!-- Step 3: Attachments -->
            <v-stepper-window-item :value="3">
              <AttachmentsManager v-model="form.attachments" />

              <v-divider class="my-6"></v-divider>

              <div class="summary pa-4 border rounded-lg bg-white">
                <div class="text-subtitle-1 font-weight-bold mb-2">مراجعة نهائية قبل التقديم:</div>
                <v-row dense>
                  <v-col cols="12" md="4">
                    <strong>نوع الطلب:</strong> {{ getTypeName(form.request_type) }}
                  </v-col>
                  <v-col cols="12" md="4">
                    <strong>رقم السند:</strong> {{ form.instrument_no }}
                  </v-col>
                  <v-col cols="12" md="4">
                    <strong>رقم ناجز:</strong> {{ form.najiz_request_no || 'غير متوفر' }}
                  </v-col>
                  <v-col cols="12" md="4">
                    <strong>عدد الأطراف:</strong> {{ form.parties.length }}
                  </v-col>
                  <v-col cols="12" md="4">
                    <strong>عدد القرارات:</strong> {{ form.decisions.length }}
                  </v-col>
                  <v-col cols="12" md="4">
                    <strong>المرفقات:</strong> {{ form.attachments.length }} ملف
                  </v-col>
                </v-row>
              </div>
            </v-stepper-window-item>
          </v-stepper-window>
        </v-stepper>
      </v-card-text>

      <v-divider></v-divider>

      <!-- Actions -->
      <v-card-actions class="pa-6 modal-footer-solid border-t d-flex align-center gap-3">
        <v-btn
          variant="outlined"
          class="btn-secondary px-6 font-weight-black"
          @click="close"
        >
          إلغاء وتراجع
        </v-btn>

        <v-btn
          v-if="step > 1"
          variant="outlined"
          class="btn-secondary px-6 font-weight-black"
          :prepend-icon="ICONS.UI.CHEVRON_RIGHT"
          @click="step--"
        >
          السابق
        </v-btn>

        <v-spacer></v-spacer>

        <v-btn
          v-if="step < 3"
          variant="flat"
          class="btn-gold-outline px-8 font-weight-black"
          :append-icon="ICONS.UI.CHEVRON_LEFT"
          :disabled="!canProceed"
          @click="step++"
        >
          التالي
        </v-btn>

        <v-btn
          v-else
          variant="flat"
          class="btn-gold-outline px-10 font-weight-black"
          :prepend-icon="ICONS.SYSTEM.SAVE_CHECK"
          :loading="saving"
          @click="confirmSave"
        >
          {{ isEdit ? 'حفظ التعديلات' : 'تقديم الطلب النهائي' }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Confirmation Dialog -->
    <v-dialog v-model="showConfirm" max-width="400">
      <v-card class="rounded-xl pa-4 glass-card">
        <v-card-title class="text-h6 font-weight-bold text-center"> تأكيد الحفظ </v-card-title>
        <v-card-text class="text-center py-4">
          هل أنت متأكد من رغبتك في {{ isEdit ? 'تعديل' : 'حفظ' }} بيانات طلب التنفيذ؟
        </v-card-text>
        <v-card-actions class="justify-center gap-4">
          <v-btn
            color="grey-darken-1"
            variant="tonal"
            class="rounded-lg px-6"
            @click="showConfirm = false"
          >
            تراجع
          </v-btn>
          <v-btn
            color="success"
            variant="flat"
            class="rounded-lg px-8 font-weight-bold"
            @click="executeSave"
          >
            نعم، احفظ
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import BaseInfoForm from './BaseInfoForm.vue'
import FinancialFields from './FinancialFields.vue'
import PersonalFields from './PersonalFields.vue'
import DirectFields from './DirectFields.vue'
import AttachmentsManager from './AttachmentsManager.vue'
import DecisionsManager from './DecisionsManager.vue'
import { ICONS } from '../../config/icons'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  enforcementId: { type: String, default: null },
  initialData: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:modelValue', 'saved', 'error'])

// UI State
const step = ref(1)
const saving = ref(false)
const showConfirm = ref(false)
const isEdit = computed(() => !!props.initialData?.id)

const dialog = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// Form State
const form = ref({
  request_type: '',
  instrument_no: '',
  instrument_date: '',
  instrument_type_main: '',
  instrument_type_sub: '',
  court_name: '',
  case_number: '',
  request_classification: '',
  other_explanation: '',
  is_office_case: false,
  related_case_id: null,
  najiz_request_no: '',
  parties: [] as any[],
  decisions: [] as any[],
  details: {
    amount_instrument: 0,
    amount_collected_for_client: 0,
    currency: 'ريال سعودي',
    alimony_amount: 0,
    execution_frequency: '',
    beneficiary_name: '',
    visit_custody_details: '',
    execution_location: '',
    action_type: '',
    work_description: ''
  },
  attachments: []
})

// Sync initial data
watch(
  () => props.modelValue,
  async (val) => {
    if (val && props.initialData?.id) {
      // Map initial data to form structure
      const d = props.initialData
      form.value = {
        request_type: d.request_type || '',
        instrument_no: d.instrument_no || '',
        instrument_date: d.instrument_date || '',
        instrument_type_main: d.instrument_type_main || '',
        instrument_type_sub: d.instrument_type_sub || '',
        court_name: d.court_name || '',
        case_number: d.case_number || '',
        request_classification: d.request_classification || '',
        other_explanation: d.other_explanation || '',
        is_office_case: !!d.is_office_case,
        related_case_id: d.case_id || null,
        najiz_request_no: d.najiz_request_no || '',
        parties: (d.parties || []).map((p: any) => ({
          name: p.party_name,
          role: p.party_role === 'executor' ? 'منفذ (طالب)' : 'منفذ ضده (مطلوب)',
          is_client: !!p.is_client,
          linked_key: p.linked_entity_id
            ? `${p.is_client ? 'client' : 'defendant'}:${p.linked_entity_id}`
            : p.party_name
        })),
        decisions: d.decisions || [],
        details: {
          amount_instrument: d.details?.amount_instrument || 0,
          amount_collected_for_client: d.details?.amount_collected_for_client || 0,
          currency: d.details?.currency || 'ريال سعودي',
          alimony_amount: d.details?.alimony_amount || 0,
          execution_frequency: d.details?.execution_frequency || '',
          beneficiary_name: d.details?.beneficiary_name || '',
          visit_custody_details: d.details?.visit_custody_details || '',
          execution_location: d.details?.execution_location || '',
          action_type: d.details?.action_type || '',
          work_description: d.details?.work_description || ''
        },
        attachments: [] // Attachments are handled separately or fetched on demand
      }

      // Load attachments if needed
      try {
        const atts = await (window as any).api.enforcement.request.getAttachments(d.id)
        if (atts) {
          form.value.attachments = atts.map((a: any) => a.asset_id)
        }
      } catch (e) {
        console.error('Failed to load attachments:', e)
      }
    } else if (val) {
      // Reset for new creation
      form.value = {
        request_type: '',
        instrument_no: '',
        instrument_date: '',
        instrument_type_main: '',
        instrument_type_sub: '',
        court_name: '',
        case_number: '',
        request_classification: '',
        other_explanation: '',
        is_office_case: false,
        related_case_id: null,
        najiz_request_no: '',
        parties: [],
        decisions: [],
        details: {
          amount_instrument: 0,
          amount_collected_for_client: 0,
          currency: 'ريال سعودي',
          alimony_amount: 0,
          execution_frequency: '',
          beneficiary_name: '',
          visit_custody_details: '',
          execution_location: '',
          action_type: '',
          work_description: ''
        },
        attachments: []
      }
    }
  },
  { immediate: true }
)

// Component Management
const detailComponent = computed(() => {
  switch (form.value.request_type) {
    case 'financial':
      return FinancialFields
    case 'personal':
      return PersonalFields
    case 'direct':
      return DirectFields
    default:
      return null
  }
})

const getTypeName = (type: string) => {
  const types: Record<string, string> = {
    financial: 'تنفيذ مالي',
    personal: 'أحوال شخصية',
    direct: 'تنفيذ مباشر'
  }
  return types[type] || ''
}

const canProceed = computed(() => {
  if (step.value === 1) {
    return form.value.request_type && form.value.instrument_no
  }
  return true
})

// Confirmation Handlers
const confirmSave = () => {
  showConfirm.value = true
}

const executeSave = async () => {
  showConfirm.value = false
  await saveRequest()
}

// IPC Logic
const saveRequest = async () => {
  saving.value = true
  try {
    // Clone and sanitize data to avoid "An object could not be cloned" error
    const rawForm = JSON.parse(JSON.stringify(form.value))

    const parseLinkedKey = (party: any) => {
      const s = String(party?.linked_key || '').trim()
      if (s.startsWith('client:'))
        return { is_client: 1, linked_entity_id: s.slice('client:'.length) }
      if (s.startsWith('defendant:'))
        return { is_client: 0, linked_entity_id: s.slice('defendant:'.length) }
      return { is_client: party?.is_client ? 1 : 0, linked_entity_id: null }
    }

    const payload = {
      base: {
        request_type: rawForm.request_type,
        instrument_no: rawForm.instrument_no,
        instrument_date: rawForm.instrument_date,
        instrument_type_main: rawForm.instrument_type_main,
        instrument_type_sub: rawForm.instrument_type_sub,
        court_name: rawForm.court_name,
        case_number: rawForm.case_number,
        request_classification: rawForm.request_classification,
        other_explanation: rawForm.other_explanation,
        is_office_case: rawForm.is_office_case ? 1 : 0,
        case_id: rawForm.related_case_id,
        najiz_request_no: rawForm.najiz_request_no,
        status: 'تحت التنفيذ'
      },
      details: rawForm.details,
      parties: (rawForm.parties || []).map((p: any) => ({
        party_name: p.name,
        party_role: p.role?.includes('منفذ (طالب)') ? 'executor' : 'executed_against',
        ...parseLinkedKey(p)
      })),
      decisions: rawForm.decisions || []
    }

    let resultId: string
    if (isEdit.value) {
      await (window as any).api.enforcement.request.update(props.initialData.id, payload)
      resultId = props.initialData.id
    } else {
      resultId = await (window as any).api.enforcement.request.create(payload)
    }

    // 2. Link attachments (if any)
    if (rawForm.attachments.length > 0) {
      await (window as any).api.enforcement.request.addAttachments(
        resultId,
        rawForm.attachments,
        'سند التنفيذ'
      )
    }

    emit('saved', { id: resultId, ...payload.base })
    close()
  } catch (e: any) {
    console.error('Failed to save enforcement request:', e)
    emit('error', e.message || 'فشل في حفظ الطلب')
  } finally {
    saving.value = false
  }
}

const close = () => {
  dialog.value = false
  step.value = 1
}
</script>

<style scoped>
.gap-4 {
  gap: 1rem;
}
.shadow-2xl {
  filter: drop-shadow(0 25px 25px rgb(0 0 0 / 0.15));
}
</style>
