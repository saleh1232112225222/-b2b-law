<template>
  <v-dialog
    :model-value="show"
    width="90%"
    max-width="1000"
    persistent
    scrollable
    @update:model-value="$emit('update:show', $event)"
  >
    <v-card class="modal-card overflow-hidden glass-card">
      <div class="modal-header-solid d-flex align-center py-5 px-8 bg-white border-b">
        <div class="bg-accent-alpha pa-2 rounded-lg me-4">
          <LucideIcon name="file-text" :size="24" class="text-accent" />
        </div>
        <span class="text-h5 font-weight-black text-pure-black">استعراض وتدقيق العقد</span>
        <v-spacer />
        <v-btn
          class="premium-btn-gold-gradient"
          variant="text"
          color="primary"
          icon
          @click="$emit('update:show', false)"
          ><LucideIcon name="x" :size="24"
        /></v-btn>
      </div>

      <v-card-text class="pa-8 bg-white modal-scrollable">
        <div v-if="viewLoading" class="text-center py-12">
          <v-progress-circular indeterminate color="accent" />
          <div class="mt-4 font-weight-black text-gold">جاري تحميل بيانات العقد...</div>
        </div>
        <div v-else-if="selected.contract">
          <v-row>
            <v-col cols="12" md="8">
              <div class="glass-panel-light pa-4 rounded-xl mb-4">
                <div class="text-caption text-gold opacity-60 mb-1 font-weight-black">
                  عنوان العقد
                </div>
                <div class="text-h6 font-weight-black text-white">
                  {{ selected.contract.title || 'بدون عنوان' }}
                </div>
              </div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="glass-panel-light pa-4 rounded-xl mb-4">
                <div class="text-caption text-gold opacity-60 mb-1 font-weight-black">المرجع</div>
                <div class="text-h6 font-weight-black text-accent">
                  {{ selected.contract.contract_no || '—' }}
                </div>
              </div>
            </v-col>
          </v-row>
          <v-chip
            :color="
              selected.contract.status === 'approved'
                ? 'success'
                : selected.contract.status === 'archived'
                  ? 'grey'
                  : 'warning'
            "
            variant="flat"
            class="font-weight-black rounded-md mb-6"
          >
            {{
              selected.contract.status === 'approved'
                ? 'معتمد'
                : selected.contract.status === 'archived'
                  ? 'مؤرشف'
                  : 'قيد الانتظار'
            }}
          </v-chip>

          <v-divider class="my-6 border-gold opacity-20" />
          <div class="text-h6 font-weight-black text-gold mb-4">نص العقد الكامل</div>
          <div
            class="glass-panel-light pa-6 rounded-xl mb-6 font-judicial whitespace-pre-wrap leading-relaxed"
          >
            {{ selected.contract.text_content || '—' }}
          </div>

          <template v-if="selected.contract.contract_type === 'fee_agreement'">
            <v-divider class="my-6 border-gold opacity-20" />
            <div class="d-flex align-center justify-space-between mb-4">
              <div class="text-h6 font-weight-black text-gold">ربط القضية</div>
            </div>
            <v-row dense class="mb-6 align-center">
              <v-col cols="12" md="8">
                <v-combobox
                  v-model="linkCaseId"
                  :items="caseOptions"
                  item-title="title"
                  item-value="value"
                  variant="outlined"
                  class="premium-input-solid glass-input"
                  clearable
                  hide-details
                  placeholder="اختر القضية المرتبطة..."
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-btn
                  color="accent"
                  variant="flat"
                  class="font-weight-black text-ebony premium-btn-gold-gradient"
                  :loading="linkCaseSaving"
                  @click="saveLinkCase"
                  >حفظ الربط</v-btn
                >
              </v-col>
            </v-row>
          </template>

          <v-divider class="my-6 border-gold opacity-20" />
          <div class="text-h6 font-weight-black text-gold mb-4">جدول الدفعات المالية</div>
          <v-table density="compact" class="glass-table border rounded-lg overflow-hidden mb-6">
            <thead>
              <tr>
                <th class="text-right text-gold font-weight-black">العنوان</th>
                <th class="text-right text-gold font-weight-black">المبلغ</th>
                <th class="text-right text-gold font-weight-black">تاريخ الاستحقاق</th>
                <th class="text-center text-gold font-weight-black">الحالة</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="safeLength(selected.schedules) === 0">
                <td colspan="4" class="text-center py-6 text-gold opacity-20">
                  لا توجد دفعات مالية
                </td>
              </tr>
              <tr v-for="s in safeArray(selected.schedules)" :key="s.id">
                <td class="font-weight-black">{{ s.title }}</td>
                <td class="font-weight-black text-white">{{ formatCurrency(s.amount) }}</td>
                <td>{{ s.due_date || '—' }}</td>
                <td class="text-center">
                  <v-chip
                    size="x-small"
                    :color="s.status === 'paid' ? 'success' : 'warning'"
                    variant="flat"
                    class="font-weight-black"
                    >{{ s.status === 'paid' ? 'مدفوع' : 'معلق' }}</v-chip
                  >
                </td>
              </tr>
            </tbody>
          </v-table>

          <v-divider class="my-6 border-gold opacity-20" />
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="text-h6 font-weight-black text-gold">المشاركون / التوقيعات</div>
            <div>
              <v-btn
                size="small"
                variant="tonal"
                color="accent"
                class="rounded-lg font-weight-black premium-btn-gold-gradient"
                @click="$emit('add-participant')"
                ><LucideIcon name="user-plus" :size="16" class="me-2" />إضافة طرف</v-btn
              >
            </div>
          </div>
          <v-table density="compact" class="glass-table border rounded-lg overflow-hidden mb-6">
            <thead>
              <tr>
                <th class="text-right text-gold font-weight-black">الاسم</th>
                <th class="text-right text-gold font-weight-black">الدور</th>
                <th class="text-center text-gold font-weight-black">حالة التوقيع</th>
                <th class="text-center text-gold font-weight-black">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="safeLength(selected.participants) === 0">
                <td colspan="4" class="text-center py-6 text-gold opacity-20">لا يوجد مشاركون</td>
              </tr>
              <tr v-for="p in safeArray(selected.participants)" :key="p.id">
                <td class="font-weight-black">
                  {{ selected.partiesById[p.party_id]?.display_name || p.party_id }}
                </td>
                <td>{{ roleLabel(p.role_key) }}</td>
                <td class="text-center">
                  <v-select
                    v-model="signatureStatusByParticipant[p.id]"
                    :items="signatureStatusOptions"
                    density="compact"
                    variant="outlined"
                    class="glass-input-compact glass-input"
                    hide-details
                    @update:model-value="$emit('save-signature', p.id)"
                  />
                </td>
                <td class="text-center">
                  <v-btn
                    class="premium-btn-gold-gradient"
                    icon
                    variant="tonal"
                    color="error"
                    size="x-small"
                    @click="$emit('remove-participant', p.id)"
                    ><LucideIcon name="trash-2" :size="14"
                  /></v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>

          <v-divider class="my-6 border-gold opacity-20" />
          <div class="text-h6 font-weight-black text-gold mb-4">سجل التدقيق (Audit Trail)</div>
          <v-table density="compact" class="glass-table border rounded-lg overflow-hidden mb-6">
            <thead>
              <tr>
                <th class="text-right text-gold font-weight-black">الإجراء</th>
                <th class="text-right text-gold font-weight-black">الطرف</th>
                <th class="text-right text-gold font-weight-black">المستخدم</th>
                <th class="text-right text-gold font-weight-black">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="safeLength(selected.partyAudits) === 0">
                <td colspan="4" class="text-center py-6 text-gold opacity-20">
                  لا توجد إجراءات تدقيق
                </td>
              </tr>
              <tr v-for="a in safeArray(selected.partyAudits)" :key="a.id">
                <td class="font-weight-black text-accent">{{ a.action_key }}</td>
                <td>{{ auditParticipantLabel(a.participant_id) }}</td>
                <td>{{ a.actor_name || '—' }}</td>
                <td>{{ a.created_at || '—' }}</td>
              </tr>
            </tbody>
          </v-table>

          <v-divider class="my-6 border-gold opacity-20" />
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="text-h6 font-weight-black text-gold">الملاحق (Amendments)</div>
            <v-btn
              size="small"
              variant="tonal"
              color="accent"
              class="rounded-lg font-weight-black premium-btn-gold-gradient"
              @click="$emit('add-amendment')"
              ><LucideIcon name="file-plus" :size="16" class="me-2" />إدراج ملحق</v-btn
            >
          </div>
          <v-table density="compact" class="glass-table border rounded-lg overflow-hidden">
            <thead>
              <tr>
                <th class="text-right text-gold font-weight-black">السبب</th>
                <th class="text-right text-gold font-weight-black">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="safeLength(selected.amendments) === 0">
                <td colspan="2" class="text-center py-6 text-gold opacity-20">لا توجد ملاحق</td>
              </tr>
              <tr v-for="am in safeArray(selected.amendments)" :key="am.id">
                <td class="font-weight-black">{{ am.reason }}</td>
                <td>{{ am.created_at || '—' }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card-text>

      <v-divider class="border-gold opacity-20" />
      <v-card-actions class="pa-8 modal-footer-solid modal-footer-sticky">
        <v-btn
          variant="flat"
          size="large"
          class="px-8 font-weight-black premium-button-highlight action-btn-unified premium-btn-gold-gradient"
          @click="$emit('update:show', false)"
          >إغلاق</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import LucideIcon from '../../components/common/LucideIcon.vue'
import { safeArray, safeLength } from '../../utils/safe'

const props = defineProps<{
  show: boolean
  contractId: string | null
  caseOptions: any[]
  formatCurrency: (val: any) => string
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'add-participant': []
  'save-signature': [participantId: string]
  'remove-participant': [participantId: string]
  'add-amendment': []
}>()

const viewLoading = ref(false)
const selected = reactive<any>({
  contract: null,
  schedules: [],
  signatures: [],
  participants: [],
  amendments: [],
  partyAudits: [],
  partiesById: {}
})
const linkCaseId = ref<string | null>(null)
const linkCaseSaving = ref(false)
const signatureStatusByParticipant = ref<Record<string, string>>({})

const signatureStatusOptions = [
  { title: 'قيد الانتظار', value: 'pending' },
  { title: 'موقع', value: 'signed' },
  { title: 'مرفوض', value: 'rejected' }
]

const roleLabel = (key: string) => {
  const map: Record<string, string> = {
    witness: 'شاهد',
    guarantor: 'كفيل',
    beneficiary: 'مستفيد',
    third_party: 'طرف ثالث'
  }
  return map[key] || key
}

const auditParticipantLabel = (pid: string) => {
  const p = selected.participants.find((x: any) => x.id === pid)
  if (!p) return pid
  return selected.partiesById[p.party_id]?.display_name || p.party_id
}

const saveLinkCase = async () => {
  linkCaseSaving.value = true
  try {
    await (window as any).api.contracts.update(selected.contract.id, {
      case_id: linkCaseId.value || null
    })
  } catch {
    /* silent */
  } finally {
    linkCaseSaving.value = false
  }
}

watch(
  () => props.show,
  async (val) => {
    if (val) {
      viewLoading.value = true
      try {
        const res = await (window as any).api.contracts.getById(props.contractId)
        Object.assign(selected, res)
        selected.partyAudits = await (window as any).api.contracts.partyAudits.list(
          props.contractId
        )
        linkCaseId.value = selected.contract.case_id
        signatureStatusByParticipant.value = {}
        ;(selected.signatures || []).forEach((s: any) => {
          signatureStatusByParticipant.value[s.participant_id] = s.signature_status || 'pending'
        })
      } catch {
        console.error('Failed to load contract details')
      } finally {
        viewLoading.value = false
      }
    }
  }
)
</script>
