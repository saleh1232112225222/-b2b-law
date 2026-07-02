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
          
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="text-h6 font-weight-black text-gold">نص العقد الكامل</div>
            <v-btn
              v-if="selected.contract.status !== 'approved' && selected.contract.status !== 'archived' && !isEditingText"
              size="small"
              variant="tonal"
              color="accent"
              class="rounded-lg font-weight-black premium-btn-gold-gradient"
              @click="startEditingText"
            >
              <LucideIcon name="edit" :size="16" class="me-2" />تعديل النص
            </v-btn>
          </div>

          <div v-if="isEditingText">
            <v-textarea
              v-model="editedText"
              rows="12"
              variant="outlined"
              class="glass-input font-judicial mb-4 text-white"
              hide-details
            ></v-textarea>
            <div class="d-flex gap-2 justify-end mb-6">
              <v-btn color="grey" variant="flat" size="small" @click="isEditingText = false">إلغاء</v-btn>
              <v-btn color="success" variant="flat" size="small" :loading="savingText" @click="saveContractText">حفظ التغييرات</v-btn>
            </div>
          </div>
          <div
            v-else
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
                  <div class="d-flex align-center justify-center gap-2">
                    <v-select
                      v-model="signatureStatusByParticipant[p.id]"
                      :items="signatureStatusOptions"
                      density="compact"
                      variant="outlined"
                      class="glass-input-compact glass-input"
                      style="max-width: 130px;"
                      hide-details
                      @update:model-value="saveSignatureStatus(p.id)"
                    />
                    <v-btn
                      v-if="signatureStatusByParticipant[p.id] !== 'signed'"
                      size="small"
                      variant="tonal"
                      color="gold"
                      class="font-weight-black"
                      @click="openSignatureCanvas(p.id)"
                    >
                      رسم توقيع
                    </v-btn>
                    <div v-if="getSignatureImage(p.id)" class="pa-1 bg-white rounded border">
                      <img :src="getSignatureImage(p.id)" style="max-height: 32px; display: block;" />
                    </div>
                  </div>
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
          v-if="selected.contract"
          color="accent"
          variant="flat"
          size="large"
          class="px-8 font-weight-black premium-btn-gold-gradient action-btn-unified me-4"
          @click="exportContractPdf"
        >
          <LucideIcon name="file-down" :size="18" class="me-2" /> تصدير كـ PDF
        </v-btn>
        <v-spacer />
        <v-btn
          variant="flat"
          size="large"
          class="px-8 font-weight-black premium-button-highlight action-btn-unified"
          @click="$emit('update:show', false)"
          >إغلاق</v-btn
        >
      </v-card-actions>
    </v-card>

    <!-- Signature Draw Dialog -->
    <v-dialog v-model="showSignatureCanvasDialog" max-width="500" persistent>
      <v-card class="premium-glass-card border-gold border-2 rounded-2xl overflow-hidden glass-card">
        <div class="pa-6 bg-gold-gradient text-ebony d-flex align-center">
          <LucideIcon name="edit-3" :size="24" class="me-3" />
          <span class="text-h6 font-weight-black">رسم التوقيع اليدوي</span>
          <v-spacer />
          <v-btn icon variant="text" color="ebony" @click="showSignatureCanvasDialog = false">
            <LucideIcon name="x" :size="24" />
          </v-btn>
        </div>

        <v-card-text class="pa-6 d-flex flex-column align-center">
          <p class="text-body-2 mb-4 text-right w-100">ارسم توقيعك داخل الإطار أدناه:</p>
          
          <div class="border rounded-lg bg-white overflow-hidden" style="width: 100%; max-width: 400px; height: 200px; touch-action: none;">
            <canvas
              ref="canvasRef"
              width="400"
              height="200"
              @mousedown="startDrawing"
              @mousemove="draw"
              @mouseup="stopDrawing"
              @mouseleave="stopDrawing"
              @touchstart="startDrawing"
              @touchmove="draw"
              @touchend="stopDrawing"
            ></canvas>
          </div>

          <v-btn variant="text" color="error" class="mt-3 font-weight-black" @click="clearCanvas">
            <LucideIcon name="trash-2" :size="16" class="me-2" /> مسح اللوحة
          </v-btn>
        </v-card-text>

        <v-card-actions class="pa-6 pt-0">
          <v-btn variant="text" color="gold" @click="showSignatureCanvasDialog = false">إلغاء</v-btn>
          <v-spacer />
          <v-btn
            color="gold"
            variant="flat"
            class="px-6 font-weight-black premium-btn-gold-gradient"
            @click="saveSignatureDrawing"
          >
            تأكيد وحفظ التوقيع
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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

// Text Content Edit State
const isEditingText = ref(false)
const editedText = ref('')
const savingText = ref(false)

// Canvas Drawing State
const showSignatureCanvasDialog = ref(false)
const activeParticipantId = ref<string | null>(null)
const isDrawing = ref(false)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

const signatureStatusOptions = [
  { title: 'قيد الانتظار', value: 'pending' },
  { title: 'موقع', value: 'signed' },
  { title: 'مرفوض', value: 'rejected' }
]

const startEditingText = () => {
  editedText.value = selected.contract.text_content || ''
  isEditingText.value = true
}

const saveContractText = async () => {
  savingText.value = true
  try {
    await (window as any).api.contracts.update(selected.contract.id, {
      text_content: editedText.value
    })
    selected.contract.text_content = editedText.value
    isEditingText.value = false
  } catch (err) {
    console.error('Failed to update contract text:', err)
  } finally {
    savingText.value = false
  }
}

const startDrawing = (e: MouseEvent | TouchEvent) => {
  isDrawing.value = true
  ctx = canvasRef.value?.getContext('2d') || null
  if (ctx) {
    ctx.beginPath()
    const rect = canvasRef.value?.getBoundingClientRect()
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - (rect?.left || 0)
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - (rect?.top || 0)
    ctx.moveTo(x, y)
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#000000'
  }
}

const draw = (e: MouseEvent | TouchEvent) => {
  if (!isDrawing.value || !ctx) return
  const rect = canvasRef.value?.getBoundingClientRect()
  const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - (rect?.left || 0)
  const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - (rect?.top || 0)
  ctx.lineTo(x, y)
  ctx.stroke()
}

const stopDrawing = () => {
  isDrawing.value = false
}

const clearCanvas = () => {
  ctx = canvasRef.value?.getContext('2d') || null
  if (ctx && canvasRef.value) {
    ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  }
}

const openSignatureCanvas = (participantId: string) => {
  activeParticipantId.value = participantId
  showSignatureCanvasDialog.value = true
  setTimeout(() => {
    clearCanvas()
  }, 100)
}

const saveSignatureDrawing = async () => {
  if (!canvasRef.value || !activeParticipantId.value) return
  const dataUrl = canvasRef.value.toDataURL()
  const sig = (selected.signatures || []).find((s: any) => s.participant_id === activeParticipantId.value)
  if (!sig) return
  
  try {
    await (window as any).api.contracts.signatures.update(selected.contract.id, sig.id, {
      signature_status: 'signed',
      signature_payload_json: { image: dataUrl },
      signed_at: new Date().toISOString()
    })
    sig.signature_status = 'signed'
    sig.signature_payload_json = JSON.stringify({ image: dataUrl })
    signatureStatusByParticipant.value[activeParticipantId.value] = 'signed'
    showSignatureCanvasDialog.value = false
  } catch (err) {
    console.error('Failed to save signature drawing:', err)
  }
}

const getSignatureImage = (participantId: string) => {
  const sig = (selected.signatures || []).find((s: any) => s.participant_id === participantId)
  if (sig && sig.signature_payload_json) {
    try {
      const payload = typeof sig.signature_payload_json === 'string'
        ? JSON.parse(sig.signature_payload_json)
        : sig.signature_payload_json
      return payload.image || ''
    } catch {
      return ''
    }
  }
  return ''
}

const saveSignatureStatus = async (participantId: string) => {
  const status = signatureStatusByParticipant.value[participantId]
  const sig = (selected.signatures || []).find((s: any) => s.participant_id === participantId)
  if (!sig) return
  try {
    await (window as any).api.contracts.signatures.update(selected.contract.id, sig.id, {
      signature_status: status
    })
    sig.signature_status = status
  } catch (err) {
    console.error('Failed to update signature status:', err)
  }
}

const exportContractPdf = async () => {
  try {
    await (window as any).api.reports.exportPdf({
      type: 'contract',
      params: {
        contractId: selected.contract.id
      }
    })
  } catch (err) {
    console.error('Failed to export contract PDF:', err)
  }
}

const roleLabel = (key: string) => {
  const map: Record<string, string> = {
    witness: 'شاهد',
    guarantor: 'كفيل',
    beneficiary: 'مستفيد',
    third_party: 'طرف ثالث'
  }
  return map[key] || key
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
      isEditingText.value = false
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
