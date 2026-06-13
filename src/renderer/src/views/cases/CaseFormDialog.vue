<template>
  <v-dialog :model-value="modelValue" width="90%" max-width="1100" persistent scrollable
    scrim="rgba(2, 6, 23, 0.65)" transition="dialog-bottom-transition"
    @update:model-value="$emit('update:modelValue', $event)">
    <v-card ref="cardEl" class="glass-panel overflow-hidden" :class="{ 'is-dragging': drag.active }" :style="dragStyle">
      <v-toolbar color="transparent" class="case-dialog-handle px-4 border-b"
        @pointerdown="onPointerDown" @mousedown="onPointerDown">
        <v-btn data-no-drag icon variant="tonal" color="error" class="rounded-lg" @click="$emit('cancel')">
          <LucideIcon name="x" :size="24" />
        </v-btn>
        <v-toolbar-title class="font-weight-black text-h5 ms-4 text-visible-high tracking-tight">
          {{ isEditing ? 'تعديل ملف القضية' : 'تسجيل ملف قضية جديد' }}
        </v-toolbar-title>
        <v-spacer />
        <v-btn data-no-drag color="accent" variant="flat" size="large"
          class="font-weight-black rounded-lg px-10 premium-lift text-primary-dark" height="50"
          :loading="saving" @click="$emit('save')">
          <LucideIcon name="save" :size="20" class="me-2" /> حفظ البيانات
        </v-btn>
      </v-toolbar>

      <v-card-text class="pa-8 bg-transparent">
        <v-form ref="formRef" v-model="localFormValid">
          <v-row>
            <v-col cols="12" md="4">
              <v-label class="mb-2 font-weight-bold text-primary">رقم القضية*</v-label>
              <v-text-field v-model="item.case_number" placeholder="مثال: 1445/78291" variant="outlined"
                class="premium-select" :loading="caseNumberChecking"
                :error-messages="caseNumberError ? [caseNumberError] : []"
                :rules="[(v: any) => !!v || 'رقم القضية مطلوب']" required>
                <template #prepend-inner><LucideIcon name="hash" :size="20" class="text-primary me-2" /></template>
              </v-text-field>
            </v-col>
            <v-col cols="12" md="4">
              <v-label class="mb-2 font-weight-bold text-primary">مسؤول القضية</v-label>
              <v-select v-model="item.responsible_user_id" :items="assignableUsers"
                :item-title="(u: any) => u?.full_name || u?.username || ''" item-value="id"
                variant="outlined" class="premium-select" clearable :loading="assignableLoading">
                <template #prepend-inner><LucideIcon name="user-check" :size="20" class="text-primary me-2" /></template>
              </v-select>
            </v-col>

            <v-col cols="12"><v-divider class="my-2 opacity-10" /></v-col>

            <v-col cols="12">
              <CasePartiesEditor
                :parties="parties"
                :clients="clients"
                :defendants="defendants"
                @update="onPartiesUpdate"
                @quick-add-defendant="$emit('addDefendant')"
              />
            </v-col>

            <v-col cols="12"><v-divider class="my-4 opacity-10" /></v-col>

            <v-col cols="12" md="4">
              <v-label class="mb-2 font-weight-bold text-primary">التصنيف الرئيسي*</v-label>
              <v-select v-model="item.main_classification" :items="mainClassifications" variant="outlined"
                class="premium-select" :rules="[(v: any) => !!v || 'التصنيف الرئيسي مطلوب']" required
                @update:model-value="onMainChange">
                <template #prepend-inner><LucideIcon name="folder-tree" :size="20" class="text-primary me-2" /></template>
              </v-select>
            </v-col>
            <v-col cols="12" md="4">
              <v-label class="mb-2 font-weight-bold text-primary">التصنيف الفرعي*</v-label>
              <v-select v-model="item.sub_classification" :items="subClassifications" variant="outlined"
                class="premium-select" :disabled="!item.main_classification"
                :rules="[(v: any) => !!v || 'التصنيف الفرعي مطلوب']" required @update:model-value="onSubChange">
                <template #prepend-inner><LucideIcon name="layers" :size="20" class="text-primary me-2" /></template>
              </v-select>
            </v-col>
            <v-col cols="12" md="4">
              <v-label class="mb-2 font-weight-bold text-primary">نوع الدعوى*</v-label>
              <v-select v-model="item.case_type" :items="caseTypeOptions" variant="outlined"
                class="premium-select" :disabled="!item.sub_classification"
                :rules="[(v: any) => !!v || 'نوع الدعوى مطلوب']" required>
                <template #prepend-inner><LucideIcon name="file-text" :size="20" class="text-primary me-2" /></template>
              </v-select>
            </v-col>

            <v-col cols="12" md="8">
              <v-label class="mb-2 font-weight-bold text-primary">موضوع الدعوى*</v-label>
              <v-text-field v-model="item.subject" variant="outlined" class="premium-select"
                :rules="[(v: any) => !!v || 'الموضوع مطلوب']" required>
                <template #prepend-inner><LucideIcon name="pencil" :size="20" class="text-primary me-2" /></template>
              </v-text-field>
            </v-col>
            <v-col cols="12" md="4">
              <v-label class="mb-2 font-weight-bold text-primary">طلب المدعي</v-label>
              <v-textarea v-model="item.plaintiff_requests" variant="outlined" rows="3" class="premium-select" placeholder="اكتب طلبات المدعي هنا...">
                <template #prepend-inner><LucideIcon name="message-square" :size="20" class="text-primary me-2" /></template>
              </v-textarea>
            </v-col>

            <v-col cols="12" md="4">
              <v-label class="mb-2 font-weight-bold text-primary">المحكمة المختصة*</v-label>
              <v-combobox v-model="item.court" :items="COURT_TYPES" variant="outlined" class="premium-select"
                :rules="[(v: any) => !!v || 'المحكمة مطلوبة']" required>
                <template #prepend-inner><LucideIcon name="landmark" :size="20" class="text-primary me-2" /></template>
              </v-combobox>
            </v-col>
            <v-col cols="12" md="4">
              <v-label class="mb-2 font-weight-bold text-primary">الدائرة القضائية</v-label>
              <v-text-field v-model="item.circuit" variant="outlined" class="premium-select" placeholder="مثال: الدائرة الأولى">
                <template #prepend-inner><LucideIcon name="git-merge" :size="20" class="text-primary me-2" /></template>
              </v-text-field>
            </v-col>

            <v-col cols="12"><v-divider class="my-4 opacity-10" /></v-col>

            <v-col cols="12">
              <div class="d-flex align-center justify-space-between mb-4">
                <div class="text-h6 font-weight-black text-primary">
                  <LucideIcon name="milestone" :size="24" class="text-primary me-2" /> مرحلة التقاضي والجلسات
                </div>
                <v-btn variant="tonal" color="accent" class="font-weight-black rounded-xl px-6"
                  :disabled="caseNumberChecking || !!caseNumberError" @click="$emit('addSession')">
                  <LucideIcon name="calendar-plus" :size="20" class="me-2" /> إضافة جلسة
                </v-btn>
              </div>
            </v-col>

            <v-col cols="12" md="4">
              <v-label class="mb-2 font-weight-bold text-primary">المرحلة التقاضية</v-label>
              <v-select v-model="item.phase" :items="CASE_PHASES" variant="outlined" class="premium-select">
                <template #prepend-inner><LucideIcon name="trending-up" :size="20" class="text-primary me-2" /></template>
              </v-select>
            </v-col>
            <v-col cols="12" md="8">
              <CaseSessionTable :sessions="caseSessions" :loading="sessionsLoading" />
            </v-col>

            <v-col cols="12" md="4">
              <v-label class="mb-2 font-weight-bold text-primary">الحالة التشغيلية*</v-label>
              <v-select v-model="item.status" :items="CASE_STATUSES" variant="outlined" class="premium-select" required>
                <template #prepend-inner><LucideIcon name="activity" :size="20" class="text-primary me-2" /></template>
              </v-select>
            </v-col>
            <v-col cols="12" md="4">
              <v-label class="mb-2 font-weight-bold text-primary">درجة الأولوية*</v-label>
              <v-select v-model="item.priority" :items="PRIORITIES" variant="outlined" class="premium-select" required>
                <template #prepend-inner><LucideIcon name="flag" :size="20" class="text-primary me-2" /></template>
              </v-select>
            </v-col>
            <v-col cols="12" md="4">
              <v-label class="mb-2 font-weight-bold text-primary">تاريخ القيد*</v-label>
              <DualDatePicker v-model="item.registration_date" />
            </v-col>

            <v-col cols="12"><v-divider class="my-4 opacity-10" /></v-col>
            <v-col cols="12">
              <div class="text-h6 font-weight-black text-primary">
                <LucideIcon name="clipboard-list" :size="24" class="text-primary me-2" /> تفاصيل إضافية
              </div>
            </v-col>
            <v-col cols="12" md="4">
              <v-label class="mb-2 font-weight-bold text-primary">صفة الموكل</v-label>
              <v-text-field v-model="item.client_role" variant="outlined" class="premium-select" placeholder="مثال: مدعي">
                <template #prepend-inner><LucideIcon name="badge-info" :size="20" class="text-primary me-2" /></template>
              </v-text-field>
            </v-col>
            <v-col cols="12" md="8">
              <v-label class="mb-2 font-weight-bold text-primary">التقييم الفني</v-label>
              <v-textarea v-model="item.assessment" variant="outlined" rows="2" class="premium-select" placeholder="تقييم فني لحالة القضية...">
                <template #prepend-inner><LucideIcon name="bar-chart-3" :size="20" class="text-primary me-2" /></template>
              </v-textarea>
            </v-col>
            <v-col cols="12">
              <v-label class="mb-2 font-weight-bold text-primary">ملاحظات عامة</v-label>
              <v-textarea v-model="item.notes" variant="outlined" rows="2" class="premium-select" placeholder="أي ملاحظات إضافية...">
                <template #prepend-inner><LucideIcon name="sticky-note" :size="20" class="text-primary me-2" /></template>
              </v-textarea>
            </v-col>

            <v-col cols="12"><v-divider class="my-4 opacity-10" /></v-col>
            <v-col cols="12">
              <div class="text-h6 font-weight-black text-primary">
                <LucideIcon name="link" :size="24" class="text-primary me-2" /> روابط وملفات القضية
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <v-label class="mb-2 font-weight-bold text-primary">رابط مجلد القضية</v-label>
              <v-text-field v-model="item.folder_link" variant="outlined" class="premium-select" placeholder="ضع رابط المجلد هنا للوصول السريع...">
                <template #prepend-inner><LucideIcon name="folder" :size="20" class="text-primary me-2" /></template>
              </v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-label class="mb-2 font-weight-bold text-primary">رابط القضية في ناجز</v-label>
              <v-text-field v-model="item.najiz_url" variant="outlined" class="premium-select" placeholder="https://najiz.sa/...">
                <template #prepend-inner><LucideIcon name="globe" :size="20" class="text-primary me-2" /></template>
              </v-text-field>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-divider />
      <v-card-actions class="pa-8 modal-footer-solid modal-footer-sticky">
        <v-btn variant="flat" size="large" class="px-8 font-weight-black premium-button-highlight" @click="$emit('cancel')">إلغاء</v-btn>
        <v-spacer />
        <v-btn variant="flat" size="large" class="px-12 font-weight-black premium-button-highlight h-56"
          :disabled="!canSubmit" :loading="saving" @click="$emit('save')">
          {{ isEditing ? 'تحديث ملف القضية' : 'تأكيد التسجيل والنشر' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDisplay } from 'vuetify'
import { COURT_TYPES, CASE_STATUSES, PRIORITIES, CASE_PHASES } from '../../utils/legalConstants'
import { safeArray } from '../../utils/safe'
import dropdowns from '../../../../../caseDropdowns.json'
import LucideIcon from '../../components/common/LucideIcon.vue'
import DualDatePicker from '../../components/DualDatePicker.vue'
import CasePartiesEditor from './CasePartiesEditor.vue'
import CaseSessionTable from './CaseSessionTable.vue'

const props = defineProps<{
  modelValue: boolean
  isEditing: boolean
  editItem: any
  caseSessions: any[]
  sessionsLoading: boolean
  saving: boolean
  caseNumberChecking: boolean
  caseNumberError: string
  canSubmit: boolean
  clients: any[]
  defendants: any[]
  assignableUsers: any[]
}>()

const localFormValid = ref(false)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:editItem': [value: any]
  addSession: []
  addDefendant: []
  save: []
  cancel: []
}>()

const item = computed({
  get: () => props.editItem,
  set: (val) => emit('update:editItem', val)
})

const parties = computed(() => Array.isArray(item.value?.parties) ? item.value.parties : [])

const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)

const formRef = ref<any>(null)
const cardEl = ref<HTMLElement | null>(null)
const assignableLoading = computed(() => false)

const drag = ref({ active: false, startX: 0, startY: 0, startLeft: 0, startTop: 0, offsetX: 0, offsetY: 0 })
const dragStyle = computed(() => ({ transform: `translate(${drag.value.offsetX}px, ${drag.value.offsetY}px)` }))

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

const onPointerDown = (e: PointerEvent | MouseEvent) => {
  if (isMobile.value) return
  const target = e.target as HTMLElement | null
  if (target?.closest?.('[data-no-drag]')) return
  const card = cardEl.value
  if (!card) return
  drag.value.active = true
  drag.value.startX = (e as PointerEvent).clientX
  drag.value.startY = (e as PointerEvent).clientY
  drag.value.startLeft = card.getBoundingClientRect().left
  drag.value.startTop = card.getBoundingClientRect().top

  const onMove = (ev: PointerEvent | MouseEvent) => {
    if (!drag.value.active) return
    const dx = (ev as PointerEvent).clientX - drag.value.startX
    const dy = (ev as PointerEvent).clientY - drag.value.startY
    const rect = card.getBoundingClientRect()
    const M = 16
    const clampedLeft = clamp(drag.value.startLeft + dx, M, window.innerWidth - rect.width - M)
    const clampedTop = clamp(drag.value.startTop + dy, M, window.innerHeight - rect.height - M)
    drag.value.offsetX = clampedLeft - drag.value.startLeft
    drag.value.offsetY = clampedTop - drag.value.startTop
  }
  const onUp = () => {
    drag.value.active = false
    window.removeEventListener('pointermove', onMove, true)
    window.removeEventListener('pointerup', onUp, true)
  }
  window.addEventListener('pointermove', onMove, true)
  window.addEventListener('pointerup', onUp, true)
}

const mainClassifications = computed(() =>
  safeArray(dropdowns.classifications).slice().sort((a: any, b: any) => (Number(a.order) || 0) - (Number(b.order) || 0)).map((c: any) => c.name)
)

const subClassifications = computed(() => {
  const main = safeArray(dropdowns.classifications).find((c: any) => c.name === item.value?.main_classification)
  return main ? safeArray(main.subClassifications).map((s: any) => s.name) : []
})

const caseTypeOptions = computed(() => {
  const main = safeArray(dropdowns.classifications).find((c: any) => c.name === item.value?.main_classification)
  if (!main) return []
  const sub = safeArray(main.subClassifications).find((s: any) => s.name === item.value?.sub_classification)
  return sub ? safeArray(sub.caseTypes).map((t: any) => t.name) : []
})

const onMainChange = (): void => {
  item.value.sub_classification = ''
  item.value.case_type = ''
}

const onSubChange = (): void => {
  item.value.case_type = ''
}

const onPartiesUpdate = (updated: any[]): void => {
  item.value = { ...item.value, parties: updated }
}
</script>

<style scoped>
.case-dialog-handle { cursor: move; user-select: none; }
.is-dragging { transition: none !important; }
.modal-footer-sticky { position: sticky; bottom: 0; z-index: 10; }
.premium-button-highlight { background: #ffffff !important; color: #000000 !important; border: 1px solid rgba(233, 195, 73, 0.6) !important; border-radius: 12px !important; }
.modal-footer-solid { background: #ffffff !important; border-top: 1px solid rgba(233, 195, 73, 0.2) !important; }
</style>
