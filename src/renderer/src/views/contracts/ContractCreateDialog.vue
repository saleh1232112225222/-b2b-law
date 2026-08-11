<template>
  <v-dialog
    :model-value="show"
    width="90%"
    max-width="1000"
    persistent
    scrollable
    @update:model-value="$emit('update:show', $event)"
  >
    <v-card class="b2b-modal-card overflow-hidden" style="background: #FFFFFF; border: 1px solid #E5E1D8; border-radius: 16px;">
      <div class="pa-4 px-6 d-flex align-center" style="background: #F7F3E8; border-bottom: 1px solid #E5E1D8;">
        <div class="icon-circle-gold me-3">
          <LucideIcon name="file-plus" :size="20" />
        </div>
        <div>
          <h3 class="text-h6 font-weight-black text-navy mb-0">تحرير عقد قانوني جديد</h3>
          <span class="text-caption text-muted-gray">صياغة اتفاقية أتعاب أو عقد توظيف مع الأطراف المعنية</span>
        </div>
        <v-spacer />
        <v-btn
          icon
          variant="text"
          class="rounded-circle close-btn"
          @click="$emit('update:show', false)"
          ><LucideIcon name="x" :size="20"
        /></v-btn>
      </div>

      <div class="px-8 pt-4 border-b bg-surface-variant">
        <v-tabs v-model="createType" color="accent" align-tabs="start">
          <v-tab value="employment" class="font-weight-black">عقد توظيف</v-tab>
          <v-tab value="fee_agreement" class="font-weight-black">اتفاقية أتعاب</v-tab>
        </v-tabs>
      </div>

      <v-card-text class="pa-8 bg-white modal-scrollable">
        <v-form ref="createForm" v-model="createValid">
          <v-row>
            <v-col cols="12" md="8">
              <label class="mb-2 font-weight-black text-gold">عنوان العقد*</label>
              <v-text-field
                v-model="draft.title"
                variant="outlined"
                placeholder="مثال: عقد توظيف محامي أول"
                :rules="[required]"
                hide-details="auto"
                class="premium-input-solid glass-input"
              />
            </v-col>
            <v-col cols="12" md="4">
              <label class="mb-2 font-weight-black text-gold">القالب</label>
              <v-select
                v-model="draft.template_id"
                :items="templateOptions"
                item-title="title"
                item-value="value"
                variant="outlined"
                class="premium-input-solid glass-input"
                clearable
                hide-details
                @update:model-value="applyTemplate"
              />
            </v-col>

            <template v-if="createType === 'employment'">
              <v-col cols="12">
                <label class="mb-2 font-weight-black text-gold">نوع العقد</label>
                <v-radio-group v-model="draft.is_fixed_term" inline hide-details>
                  <v-radio :label="'محدد المدة'" :value="true" color="accent" />
                  <v-radio :label="'غير محدد المدة'" :value="false" color="accent" />
                </v-radio-group>
              </v-col>
              <v-col cols="12" md="6">
                <label class="mb-2 font-weight-black text-gold">الموظف*</label>
                <v-select
                  v-model="draft.employee_user_id"
                  :items="employeeOptions"
                  item-title="title"
                  item-value="value"
                  variant="outlined"
                  class="premium-input-solid glass-input"
                  :rules="[required]"
                  hide-details="auto"
                />
              </v-col>
              <v-col cols="6" md="3">
                <label class="mb-2 font-weight-black text-gold">تاريخ البداية</label>
                <v-text-field
                  v-model="draft.start_date"
                  type="date"
                  variant="outlined"
                  class="premium-input-solid glass-input"
                  hide-details
                />
              </v-col>
              <v-col cols="6" md="2">
                <label class="mb-2 font-weight-black text-gold">المدة (سنوات)</label>
                <v-text-field
                  v-model="draft.term_years"
                  type="number"
                  min="1"
                  variant="outlined"
                  class="premium-input-solid glass-input"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="1" class="d-flex align-center pt-4">
                <v-btn
                  variant="text"
                  color="accent"
                  class="mt-4 premium-btn-gold-gradient"
                  @click="
                    draft.end_date = draft.start_date
                      ? new Date(
                          new Date(draft.start_date).setFullYear(
                            new Date(draft.start_date).getFullYear() + Number(draft.term_years || 1)
                          )
                        )
                          .toISOString()
                          .split('T')[0]
                      : ''
                  "
                >
                  <LucideIcon name="arrow-left-right" :size="16" />
                </v-btn>
              </v-col>
              <v-col cols="12" md="3">
                <label class="mb-2 font-weight-black text-gold">تاريخ النهاية</label>
                <v-text-field
                  v-model="draft.end_date"
                  type="date"
                  variant="outlined"
                  class="premium-input-solid glass-input"
                  :rules="[endAfterStart]"
                  hide-details="auto"
                />
              </v-col>
              <v-col cols="12" md="4">
                <label class="mb-2 font-weight-black text-gold">الراتب الشهري*</label>
                <v-text-field
                  v-model="draft.salary_amount"
                  type="number"
                  prefix="SAR"
                  variant="outlined"
                  class="premium-input-solid glass-input"
                  :rules="[positive]"
                  hide-details="auto"
                />
              </v-col>
              <v-col cols="12" md="3">
                <label class="mb-2 font-weight-black text-gold">اليوم المستحق</label>
                <v-text-field
                  v-model="draft.salary_due_day"
                  type="number"
                  min="1"
                  max="28"
                  variant="outlined"
                  class="premium-input-solid glass-input"
                  :rules="[dueDayRule]"
                  hide-details="auto"
                />
              </v-col>
              <v-col cols="12" md="3">
                <label class="mb-2 font-weight-black text-gold">تاريخ العقد*</label>
                <v-text-field
                  v-model="draft.contract_date"
                  type="date"
                  variant="outlined"
                  class="premium-input-solid glass-input"
                  :rules="[required]"
                  hide-details="auto"
                />
              </v-col>
            </template>

            <template v-else>
              <v-col cols="12">
                <label class="mb-2 font-weight-black text-gold">نوع العقد</label>
                <v-radio-group v-model="draft.is_fixed_term" inline hide-details>
                  <v-radio :label="'محدد المدة'" :value="true" color="accent" />
                  <v-radio :label="'غير محدد المدة'" :value="false" color="accent" />
                </v-radio-group>
              </v-col>
              <v-col cols="12" md="6">
                <label class="mb-2 font-weight-black text-gold">الموكل*</label>
                <v-select
                  v-model="draft.client_id"
                  :items="clientOptions"
                  item-title="title"
                  item-value="value"
                  variant="outlined"
                  class="premium-input-solid glass-input"
                  :rules="[required]"
                  hide-details="auto"
                />
              </v-col>
              <v-col cols="12" md="6">
                <label class="mb-2 font-weight-black text-gold">القضية (اختياري)</label>
                <v-combobox
                  v-model="draft.case_id"
                  :items="caseOptions"
                  item-title="title"
                  item-value="value"
                  variant="outlined"
                  class="premium-input-solid glass-input"
                  clearable
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6">
                <label class="mb-2 font-weight-black text-gold">المحامي الممثل*</label>
                <v-select
                  v-model="draft.representative_user_id"
                  :items="representativeOptions"
                  item-title="title"
                  item-value="value"
                  variant="outlined"
                  class="premium-input-solid glass-input"
                  :rules="[required]"
                  hide-details="auto"
                />
              </v-col>
              <v-col cols="12" md="6">
                <label class="mb-2 font-weight-black text-gold">إجمالي الأتعاب*</label>
                <v-text-field
                  v-model="draft.total_amount"
                  type="number"
                  prefix="SAR"
                  variant="outlined"
                  class="premium-input-solid glass-input"
                  :rules="[positive]"
                  hide-details="auto"
                />
              </v-col>
              <v-col cols="12" md="6">
                <label class="mb-2 font-weight-black text-gold">تاريخ الاتفاقية*</label>
                <v-text-field
                  v-model="draft.contract_date"
                  type="date"
                  variant="outlined"
                  class="premium-input-solid glass-input"
                  :rules="[required]"
                  hide-details="auto"
                />
              </v-col>
              <v-col cols="12" md="6">
                <label class="mb-2 font-weight-black text-gold">تاريخ بداية العمل</label>
                <v-text-field
                  v-model="draft.start_date"
                  type="date"
                  variant="outlined"
                  class="premium-input-solid glass-input"
                  hide-details
                />
              </v-col>

              <v-col cols="12" class="mt-4">
                <v-divider class="mb-4 border-gold opacity-20" />
                <div class="text-h6 font-weight-black text-pure-black mb-4">هيكل الدفعات</div>
                <v-alert
                  v-if="feeSumMismatch"
                  type="warning"
                  variant="outlined"
                  density="compact"
                  class="mb-4 rounded-lg font-weight-black border-dashed"
                >
                  مجموع الدفعات ({{ fee1.amount + fee2.amount }}) لا يساوي إجمالي الأتعاب ({{
                    draft.total_amount
                  }})
                </v-alert>
                <v-row>
                  <v-col cols="12" md="5">
                    <v-text-field
                      v-model="fee1.title"
                      label="عنوان الدفعة الأولى"
                      variant="outlined"
                      class="premium-input-solid glass-input"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-text-field
                      v-model="fee1.amount"
                      type="number"
                      label="المبلغ"
                      prefix="SAR"
                      variant="outlined"
                      class="premium-input-solid glass-input"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <label class="mb-2 font-weight-black text-gold"
                      >توضع تلقائياً في تاريخ البداية</label
                    >
                  </v-col>
                  <v-col cols="12" md="5">
                    <v-text-field
                      v-model="fee2.title"
                      label="عنوان الدفعة الثانية"
                      variant="outlined"
                      class="premium-input-solid glass-input"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-text-field
                      v-model="fee2.amount"
                      type="number"
                      label="المبلغ"
                      prefix="SAR"
                      variant="outlined"
                      class="premium-input-solid glass-input"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <label class="mb-2 font-weight-black text-gold"
                      >توضع تلقائياً في تاريخ النهاية</label
                    >
                  </v-col>
                </v-row>
              </v-col>
            </template>

            <v-col cols="12" class="mt-6">
              <v-divider class="mb-4 border-gold opacity-20" />
              <div class="text-h6 font-weight-black text-pure-black mb-4">
                الأطراف الإضافية / الشهود
              </div>
              <v-row dense align="center">
                <v-col cols="12" md="2">
                  <v-select
                    v-model="partyDraft.kind"
                    :items="partyKindOptions"
                    variant="outlined"
                    class="premium-input-solid glass-input"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" md="3">
                  <v-select
                    v-if="partyDraft.kind === 'user'"
                    v-model="partyDraft.user_id"
                    :items="employeeOptions"
                    item-title="title"
                    item-value="value"
                    variant="outlined"
                    class="premium-input-solid glass-input"
                    hide-details
                  />
                  <v-select
                    v-else-if="partyDraft.kind === 'client'"
                    v-model="partyDraft.client_id"
                    :items="clientOptions"
                    item-title="title"
                    item-value="value"
                    variant="outlined"
                    class="premium-input-solid glass-input"
                    hide-details
                  />
                  <v-select
                    v-else-if="partyDraft.kind === 'defendant'"
                    v-model="partyDraft.defendant_id"
                    :items="defendantOptions"
                    item-title="title"
                    item-value="value"
                    variant="outlined"
                    class="premium-input-solid glass-input"
                    hide-details
                  />
                  <v-text-field
                    v-else
                    v-model="partyDraft.display_name"
                    placeholder="الاسم الحر"
                    variant="outlined"
                    class="premium-input-solid glass-input"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" md="2">
                  <v-select
                    v-model="partyDraft.role_key"
                    :items="roleOptions"
                    item-title="title"
                    item-value="value"
                    variant="outlined"
                    class="premium-input-solid glass-input"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" md="2">
                  <v-btn
                    color="accent"
                    variant="flat"
                    class="font-weight-black text-ebony rounded-lg premium-btn-gold-gradient"
                    @click="addExtraParty"
                    >إضافة</v-btn
                  >
                </v-col>
              </v-row>
              <v-table
                v-if="draft.extraParties.length > 0"
                density="compact"
                class="mt-4 glass-table border rounded-lg overflow-hidden"
              >
                <thead>
                  <tr>
                    <th class="text-gold font-weight-black">الاسم</th>
                    <th class="text-gold font-weight-black">الدور</th>
                    <th class="text-gold font-weight-black" />
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(p, i) in draft.extraParties" :key="i">
                    <td class="font-weight-black">{{ p.display_name }}</td>
                    <td>{{ roleLabel(p.role_key) }}</td>
                    <td class="text-center">
                      <v-btn
                        class="premium-btn-gold-gradient"
                        icon
                        variant="tonal"
                        color="error"
                        size="x-small"
                        @click="removeExtraParty(Number(i))"
                        ><LucideIcon name="trash-2" :size="14"
                      /></v-btn>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-col>

            <v-col cols="12" class="mt-6">
              <label class="mb-2 font-weight-black text-gold">نص العقد*</label>
              <v-textarea
                v-model="draft.text_content"
                variant="outlined"
                rows="10"
                class="premium-input-solid font-judicial glass-input"
                :rules="[required]"
                hide-details="auto"
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4 px-6 modal-footer-sticky" style="background: #F7F3E8; border-top: 1px solid #E5E1D8;">
        <v-btn
          variant="outlined"
          class="pill-btn-cancel px-6"
          @click="$emit('update:show', false)"
          >إلغاء</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          class="pill-btn-gold-filled px-8"
          :disabled="!createValid"
          :loading="saving"
          @click="handleCreate"
          >{{ isFee ? 'اعتماد وحفظ العقد' : 'إنشاء العقد وحفظه' }}</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import LucideIcon from '../../components/common/LucideIcon.vue'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ 'update:show': [value: boolean]; done: [] }>()

const snackbarText = ref('')
const snackbarColor = ref('success')

const createType = ref('employment')
const createValid = ref(false)
const createForm = ref<any>(null)
const saving = ref(false)

const draft = reactive<any>({
  title: '',
  template_id: null,
  contract_type: 'employment',
  is_fixed_term: true,
  employee_user_id: null,
  client_id: null,
  case_id: null,
  representative_user_id: null,
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  term_years: 1,
  salary_amount: 0,
  salary_due_day: 25,
  total_amount: 0,
  contract_date: new Date().toISOString().split('T')[0],
  text_content: '',
  extraParties: []
})

const fee1 = reactive({ title: 'الدفعة الأولى', amount: 0 })
const fee2 = reactive({ title: 'الدفعة الثانية', amount: 0 })

const isFee = computed(() => createType.value === 'fee_agreement')
const feeSumMismatch = computed(
  () => isFee.value && fee1.amount + fee2.amount !== draft.total_amount
)

const templateOptions = ref<any[]>([])
const employeeOptions = ref<any[]>([])
const clientOptions = ref<any[]>([])
const caseOptions = ref<any[]>([])
const representativeOptions = ref<any[]>([])
const defendantOptions = ref<any[]>([])

watch(createType, (val) => {
  draft.contract_type = val
  loadTemplates(val)
})

const required = (v: any) => !!v || 'هذا الحقل مطلوب'
const positive = (v: any) => Number(v) >= 0 || 'يجب أن يكون الرقم موجباً'
const dueDayRule = (v: any) => (Number(v) >= 1 && Number(v) <= 28) || 'من 1 إلى 28 فقط'
const endAfterStart = (v: any) => {
  if (!v || !draft.start_date) return true
  return new Date(v) >= new Date(draft.start_date) || 'يجب أن يكون بعد تاريخ البداية'
}

const mapOption = (value: any, title: any, extra?: Record<string, any>) => ({
  value: String(value),
  title: String(title || value || ''),
  ...(extra || {})
})

const loadTemplates = async (contractType?: string) => {
  try {
    const rows = await (window as any).api.contracts.templates.list(contractType)
    templateOptions.value = (Array.isArray(rows) ? rows : [])
      .filter((t: any) => Number(t?.is_active ?? 1) === 1)
      .map((t: any) => mapOption(t.id, t.name, { body: t.body, contract_type: t.contract_type }))
  } catch {
    templateOptions.value = []
  }
}

const loadOptions = async () => {
  await Promise.allSettled([
    loadTemplates(createType.value),
    (async () => {
      const rows = await (window as any).api.users.listAssignable()
      employeeOptions.value = (Array.isArray(rows) ? rows : []).map((u: any) =>
        mapOption(u.id, u.full_name || u.username, { role_key: u.role_key })
      )
      representativeOptions.value = employeeOptions.value
    })(),
    (async () => {
      const rows = await (window as any).api.clients.getAll()
      clientOptions.value = (Array.isArray(rows) ? rows : []).map((c: any) =>
        mapOption(c.id, c.name)
      )
    })(),
    (async () => {
      const rows = await (window as any).api.cases.getAll()
      caseOptions.value = (Array.isArray(rows) ? rows : []).map((c: any) =>
        mapOption(
          c.id,
          [
            c.case_number || c.title || c.id,
            c.client_name ||
              clientOptions.value.find((x) => x.value === String(c.client_id || ''))?.title
          ]
            .filter(Boolean)
            .join(' - ')
        )
      )
    })(),
    (async () => {
      const rows = await (window as any).api.defendants.getAll()
      defendantOptions.value = (Array.isArray(rows) ? rows : []).map((d: any) =>
        mapOption(d.id, d.name)
      )
    })()
  ])
}

watch(
  () => props.show,
  async (val) => {
    if (val) {
      Object.assign(draft, {
        title: '',
        template_id: null,
        is_fixed_term: true,
        employee_user_id: null,
        client_id: null,
        case_id: null,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        term_years: 1,
        salary_amount: 0,
        salary_due_day: 25,
        total_amount: 0,
        contract_date: new Date().toISOString().split('T')[0],
        text_content: '',
        extraParties: []
      })
      createType.value = 'employment'
      fee1.amount = 0
      fee2.amount = 0
      await loadOptions()
    }
  }
)

const applyTemplate = (id: string) => {
  const t = templateOptions.value.find((x) => x.value === id)
  if (t) draft.text_content = t.body
}

const partyKindOptions = [
  { title: 'موظف', value: 'user' },
  { title: 'موكل', value: 'client' },
  { title: 'خصم', value: 'defendant' },
  { title: 'اسم حر', value: 'free' }
]

const roleOptions = [
  { title: 'شاهد', value: 'witness' },
  { title: 'كفيل', value: 'guarantor' },
  { title: 'مستفيد', value: 'beneficiary' },
  { title: 'طرف ثالث', value: 'third_party' }
]

const roleLabel = (key: string) => roleOptions.find((x) => x.value === key)?.title || key
let partyDraft = reactive<any>({
  kind: 'user',
  user_id: null,
  client_id: null,
  defendant_id: null,
  display_name: '',
  role_key: 'witness'
})

const addExtraParty = () => {
  let name = ''
  let id = ''
  if (partyDraft.kind === 'user') {
    const u = employeeOptions.value.find((x) => x.value === partyDraft.user_id)
    name = u?.title || 'موظف'
    id = partyDraft.user_id
  } else if (partyDraft.kind === 'client') {
    const c = clientOptions.value.find((x) => x.value === partyDraft.client_id)
    name = c?.title || 'موكل'
    id = partyDraft.client_id
  } else if (partyDraft.kind === 'defendant') {
    const d = defendantOptions.value.find((x) => x.value === partyDraft.defendant_id)
    name = d?.title || 'خصم'
    id = partyDraft.defendant_id
  } else name = partyDraft.display_name
  draft.extraParties.push({
    display_name: name,
    party_id: id,
    kind: partyDraft.kind,
    role_key: partyDraft.role_key
  })
}

const removeExtraParty = (idx: number) => draft.extraParties.splice(idx, 1)

const handleCreate = async () => {
  const { valid } = await createForm.value.validate()
  if (!valid) return
  saving.value = true
  try {
    const normalizeCaseId = (raw: any) => {
      const v = String(raw || '').trim()
      if (!v) return null
      return caseOptions.value.some((x) => String(x.value) === v) ? v : null
    }
    const payload: any = {
      contract_type: createType.value,
      title: draft.title,
      template_id: draft.template_id,
      case_id: normalizeCaseId(draft.case_id),
      client_id: draft.client_id,
      employee_user_id: draft.employee_user_id,
      representative_user_id: draft.representative_user_id,
      contract_date: draft.contract_date,
      start_date: draft.start_date,
      end_date: draft.end_date,
      is_fixed_term: draft.is_fixed_term,
      term_years: draft.term_years,
      total_amount: draft.total_amount,
      salary_amount: draft.salary_amount,
      salary_due_day: draft.salary_due_day,
      text_content: draft.text_content,
      extraParties: draft.extraParties
    }
    if (isFee.value)
      payload.feeSchedules = [
        { title: fee1.title, amount: fee1.amount, due_date: draft.start_date },
        { title: fee2.title, amount: fee2.amount, due_date: draft.end_date || draft.start_date }
      ]
    await (window as any).api.contracts.create(payload)
    emit('done')
    emit('update:show', false)
  } catch (e) {
    console.error('Create contract failed:', e)
  } finally {
    saving.value = false
  }
}
</script>
