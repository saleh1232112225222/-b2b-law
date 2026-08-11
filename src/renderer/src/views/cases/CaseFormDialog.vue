<template>
  <v-dialog
    :model-value="modelValue"
    width="92%"
    max-width="1100"
    persistent
    scrollable
    scrim="rgba(2, 6, 23, 0.65)"
    transition="dialog-bottom-transition"
    class="case-form-modal-dialog"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card
      ref="cardEl"
      class="glass-panel overflow-hidden glass-card case-dialog-card rounded-xl"
      :class="{ 'is-dragging': drag.active }"
      :style="dragStyle"
    >
      <!-- Header (Fixed Sticky) -->
      <div
        class="modal-header case-modal-header pa-4 pa-sm-5 d-flex align-center justify-space-between flex-shrink-0"
        @pointerdown="onPointerDown"
        @mousedown="onPointerDown"
      >
        <div class="d-flex align-center">
          <div class="header-icon-circle me-3">
            <LucideIcon name="scale" :size="24" class="text-gold-accent" />
          </div>
          <div>
            <h3 class="text-h6 text-sm-h5 font-weight-black header-title tracking-tight mb-0">
              {{ isEditing ? 'تعديل ملف القضية' : 'تسجيل ملف قضية جديد' }}
            </h3>
            <div class="text-caption header-subtitle font-weight-bold d-none d-sm-block mt-1">
              أدخل بيانات القضية ومعلومات الأطراف والتصنيفات
            </div>
          </div>
        </div>

        <v-btn
          data-no-drag
          icon
          variant="tonal"
          color="error"
          class="rounded-lg close-btn"
          size="small"
          @click="$emit('cancel')"
        >
          <LucideIcon name="x" :size="20" />
        </v-btn>
      </div>

      <!-- Scrollable Body -->
      <v-card-text class="pa-4 pa-sm-6 modal-body-scroll bg-app">
        <v-form ref="formRef" v-model="localFormValid">
          <!-- 1. بيانات القضية -->
          <div class="section-card-wrapper">
            <div class="section-card-header mb-4 pb-2 border-b-light">
              <div class="d-flex align-center">
                <div class="icon-circle-gold me-3">
                  <LucideIcon name="info" :size="18" />
                </div>
                <div>
                  <h4 class="text-h6 font-weight-black text-navy mb-0">بيانات القضية</h4>
                  <span class="text-caption text-muted-gray">معلومات أساسية عن القضية والمسؤول</span>
                </div>
              </div>
            </div>

            <v-row dense>
              <v-col cols="12" md="6">
                <label class="mb-1 font-weight-bold text-navy text-caption d-block">رقم القضية *</label>
                <v-text-field
                  v-model="item.case_number"
                  placeholder="مثال: 1445/78291"
                  variant="outlined"
                  density="comfortable"
                  class="premium-select glass-input"
                  :loading="caseNumberChecking"
                  :error-messages="caseNumberError ? [caseNumberError] : []"
                  :rules="[(v: any) => !!v || 'رقم القضية مطلوب']"
                  required
                >
                  <template #prepend-inner>
                    <LucideIcon name="hash" :size="18" class="text-gold-accent me-2" />
                  </template>
                </v-text-field>
              </v-col>

              <v-col cols="12" md="6">
                <label class="mb-1 font-weight-bold text-navy text-caption d-block">مسؤول القضية *</label>
                <v-select
                  v-model="item.responsible_user_id"
                  :items="assignableUsers"
                  :item-title="(u: any) => u?.full_name || u?.username || ''"
                  item-value="id"
                  placeholder="اختر مسؤول القضية..."
                  variant="outlined"
                  density="comfortable"
                  class="glass-input premium-select"
                  :rules="[(v: any) => !!v || 'مسؤول القضية مطلوب']"
                  required
                  :loading="assignableLoading"
                >
                  <template #prepend-inner>
                    <LucideIcon name="user-check" :size="18" class="text-gold-accent me-2" />
                  </template>
                </v-select>
              </v-col>
            </v-row>
          </div>

          <!-- 2. أطراف القضية -->
          <div class="section-card-wrapper">
            <CasePartiesEditor
              :parties="parties"
              :clients="clients"
              :defendants="defendants"
              @update="onPartiesUpdate"
              @quick-add-defendant="$emit('addDefendant')"
            />
          </div>

          <!-- 3. تصنيف القضية -->
          <div class="section-card-wrapper">
            <div class="section-card-header mb-4 pb-2 border-b-light">
              <div class="d-flex align-center">
                <div class="icon-circle-gold me-3">
                  <LucideIcon name="folder-tree" :size="18" />
                </div>
                <div>
                  <h4 class="text-h6 font-weight-black text-navy mb-0">تصنيف القضية</h4>
                  <span class="text-caption text-muted-gray">التصنيف الرئيسي والفرعي ونوع الدعوى</span>
                </div>
              </div>
            </div>

            <v-row dense>
              <v-col cols="12" md="4">
                <label class="mb-1 font-weight-bold text-navy text-caption d-block">التصنيف الرئيسي *</label>
                <v-select
                  v-model="item.main_classification"
                  :items="mainClassifications"
                  placeholder="اختر التصنيف الرئيسي..."
                  variant="outlined"
                  density="comfortable"
                  class="premium-select glass-input"
                  :rules="[(v: any) => !!v || 'التصنيف الرئيسي مطلوب']"
                  required
                  @update:model-value="onMainChange"
                >
                  <template #prepend-inner>
                    <LucideIcon name="folder-tree" :size="18" class="text-gold-accent me-2" />
                  </template>
                </v-select>
              </v-col>

              <v-col cols="12" md="4">
                <label class="mb-1 font-weight-bold text-navy text-caption d-block">التصنيف الفرعي *</label>
                <v-select
                  v-model="item.sub_classification"
                  :items="subClassifications"
                  placeholder="اختر التصنيف الفرعي..."
                  variant="outlined"
                  density="comfortable"
                  class="premium-select glass-input"
                  :disabled="!item.main_classification"
                  :rules="[(v: any) => !!v || 'التصنيف الفرعي مطلوب']"
                  required
                  @update:model-value="onSubChange"
                >
                  <template #prepend-inner>
                    <LucideIcon name="layers" :size="18" class="text-gold-accent me-2" />
                  </template>
                </v-select>
              </v-col>

              <v-col cols="12" md="4">
                <label class="mb-1 font-weight-bold text-navy text-caption d-block">نوع الدعوى *</label>
                <v-select
                  v-model="item.case_type"
                  :items="caseTypeOptions"
                  placeholder="اختر نوع الدعوى..."
                  variant="outlined"
                  density="comfortable"
                  class="premium-select glass-input"
                  :disabled="!item.sub_classification"
                  :rules="[(v: any) => !!v || 'نوع الدعوى مطلوب']"
                  required
                >
                  <template #prepend-inner>
                    <LucideIcon name="file-text" :size="18" class="text-gold-accent me-2" />
                  </template>
                </v-select>
              </v-col>
            </v-row>
          </div>

          <!-- 4. تفاصيل الدعوى -->
          <div class="section-card-wrapper">
            <div class="section-card-header mb-4 pb-2 border-b-light">
              <div class="d-flex align-center">
                <div class="icon-circle-gold me-3">
                  <LucideIcon name="file-search" :size="18" />
                </div>
                <div>
                  <h4 class="text-h6 font-weight-black text-navy mb-0">تفاصيل الدعوى</h4>
                  <span class="text-caption text-muted-gray">موضوع الدعوى وطلبات المدعي</span>
                </div>
              </div>
            </div>

            <v-row dense>
              <v-col cols="12" md="6">
                <label class="mb-1 font-weight-bold text-navy text-caption d-block">موضوع الدعوى *</label>
                <v-text-field
                  v-model="item.subject"
                  placeholder="اكتب موضوع الدعوى..."
                  variant="outlined"
                  density="comfortable"
                  class="premium-select glass-input"
                  :rules="[(v: any) => !!v || 'الموضوع مطلوب']"
                  required
                >
                  <template #prepend-inner>
                    <LucideIcon name="pencil" :size="18" class="text-gold-accent me-2" />
                  </template>
                </v-text-field>
              </v-col>

              <v-col cols="12" md="6">
                <label class="mb-1 font-weight-bold text-navy text-caption d-block">طلب المدعي</label>
                <v-textarea
                  v-model="item.plaintiff_requests"
                  variant="outlined"
                  rows="3"
                  density="comfortable"
                  class="premium-select glass-input"
                  placeholder="اكتب طلبات المدعي هنا..."
                >
                  <template #prepend-inner>
                    <LucideIcon name="message-square" :size="18" class="text-gold-accent me-2" />
                  </template>
                </v-textarea>
              </v-col>
            </v-row>
          </div>

          <!-- 5. المحكمة ومراحل التقاضي والجلسات -->
          <div class="section-card-wrapper">
            <div class="d-flex align-center justify-space-between mb-4 pb-2 border-b-light flex-wrap ga-2">
              <div class="d-flex align-center">
                <div class="icon-circle-gold me-3">
                  <LucideIcon name="calendar" :size="18" />
                </div>
                <div>
                  <h4 class="text-h6 font-weight-black text-navy mb-0">المواعيد والجلسات</h4>
                  <span class="text-caption text-muted-gray">المحكمة والدائرة والمرحلة التقاضية والجلسات</span>
                </div>
              </div>

              <v-btn
                variant="outlined"
                class="pill-btn-gold px-4"
                size="small"
                :disabled="caseNumberChecking || !!caseNumberError"
                @click="$emit('addSession')"
              >
                <LucideIcon name="calendar-plus" :size="16" class="me-2" /> إضافة جلسة
              </v-btn>
            </div>

            <v-row dense>
              <v-col cols="12" md="4">
                <label class="mb-1 font-weight-bold text-navy text-caption d-block">المحكمة المختصة *</label>
                <v-combobox
                  v-model="item.court"
                  :items="COURT_TYPES"
                  placeholder="اختر المحكمة..."
                  variant="outlined"
                  density="comfortable"
                  class="premium-select glass-input"
                  :rules="[(v: any) => !!v || 'المحكمة مطلوبة']"
                  required
                >
                  <template #prepend-inner>
                    <LucideIcon name="landmark" :size="18" class="text-gold-accent me-2" />
                  </template>
                </v-combobox>
              </v-col>

              <v-col cols="12" md="4">
                <label class="mb-1 font-weight-bold text-navy text-caption d-block">الدائرة القضائية</label>
                <v-text-field
                  v-model="item.circuit"
                  variant="outlined"
                  density="comfortable"
                  class="premium-select glass-input"
                  placeholder="مثال: الدائرة الأولى"
                >
                  <template #prepend-inner>
                    <LucideIcon name="git-merge" :size="18" class="text-gold-accent me-2" />
                  </template>
                </v-text-field>
              </v-col>

              <v-col cols="12" md="4">
                <label class="mb-1 font-weight-bold text-navy text-caption d-block">المرحلة التقاضية</label>
                <v-select
                  v-model="item.phase"
                  :items="CASE_PHASES"
                  placeholder="اختر المرحلة..."
                  variant="outlined"
                  density="comfortable"
                  class="premium-select glass-input"
                >
                  <template #prepend-inner>
                    <LucideIcon name="trending-up" :size="18" class="text-gold-accent me-2" />
                  </template>
                </v-select>
              </v-col>

              <v-col cols="12" class="mt-3">
                <CaseSessionTable :sessions="caseSessions" :loading="sessionsLoading" />
              </v-col>
            </v-row>
          </div>

          <!-- 6. البيانات الإضافية -->
          <div class="section-card-wrapper mb-0">
            <div class="section-card-header mb-4 pb-2 border-b-light">
              <div class="d-flex align-center">
                <div class="icon-circle-gold me-3">
                  <LucideIcon name="clipboard-list" :size="18" />
                </div>
                <div>
                  <h4 class="text-h6 font-weight-black text-navy mb-0">البيانات الإضافية</h4>
                  <span class="text-caption text-muted-gray">التصنيف التشغيلي والروابط الهامة</span>
                </div>
              </div>
            </div>

            <v-row dense>
              <v-col cols="12" sm="6" md="3">
                <label class="mb-1 font-weight-bold text-navy text-caption d-block">الحالة التشغيلية *</label>
                <v-select
                  v-model="item.status"
                  :items="CASE_STATUSES"
                  variant="outlined"
                  density="comfortable"
                  class="premium-select glass-input"
                  required
                >
                  <template #prepend-inner>
                    <LucideIcon name="activity" :size="18" class="text-gold-accent me-2" />
                  </template>
                </v-select>
              </v-col>

              <v-col cols="12" sm="6" md="3">
                <label class="mb-1 font-weight-bold text-navy text-caption d-block">درجة الأولوية *</label>
                <v-select
                  v-model="item.priority"
                  :items="PRIORITIES"
                  variant="outlined"
                  density="comfortable"
                  class="premium-select glass-input"
                  required
                >
                  <template #prepend-inner>
                    <LucideIcon name="flag" :size="18" class="text-gold-accent me-2" />
                  </template>
                </v-select>
              </v-col>

              <v-col cols="12" sm="6" md="3">
                <label class="mb-1 font-weight-bold text-navy text-caption d-block">تاريخ القيد *</label>
                <DualDatePicker v-model="item.registration_date" />
              </v-col>

              <v-col cols="12" sm="6" md="3">
                <label class="mb-1 font-weight-bold text-navy text-caption d-block">صفة الموكل</label>
                <v-text-field
                  v-model="item.client_role"
                  variant="outlined"
                  density="comfortable"
                  class="premium-select glass-input"
                  placeholder="مثال: مدعي"
                >
                  <template #prepend-inner>
                    <LucideIcon name="badge-info" :size="18" class="text-gold-accent me-2" />
                  </template>
                </v-text-field>
              </v-col>

              <v-col cols="12" md="6">
                <label class="mb-1 font-weight-bold text-navy text-caption d-block">التقييم الفني</label>
                <v-textarea
                  v-model="item.assessment"
                  variant="outlined"
                  rows="2"
                  density="comfortable"
                  class="premium-select glass-input"
                  placeholder="تقييم فني لحالة القضية..."
                >
                  <template #prepend-inner>
                    <LucideIcon name="bar-chart-3" :size="18" class="text-gold-accent me-2" />
                  </template>
                </v-textarea>
              </v-col>

              <v-col cols="12" md="6">
                <label class="mb-1 font-weight-bold text-navy text-caption d-block">ملاحظات عامة</label>
                <v-textarea
                  v-model="item.notes"
                  variant="outlined"
                  rows="2"
                  density="comfortable"
                  class="premium-select glass-input"
                  placeholder="أي ملاحظات إضافية..."
                >
                  <template #prepend-inner>
                    <LucideIcon name="sticky-note" :size="18" class="text-gold-accent me-2" />
                  </template>
                </v-textarea>
              </v-col>

              <v-col cols="12" md="6">
                <label class="mb-1 font-weight-bold text-navy text-caption d-block">رابط مجلد القضية</label>
                <v-text-field
                  v-model="item.folder_link"
                  variant="outlined"
                  density="comfortable"
                  class="premium-select glass-input"
                  placeholder="ضع رابط المجلد للوصول السريع..."
                >
                  <template #prepend-inner>
                    <LucideIcon name="folder" :size="18" class="text-gold-accent me-2" />
                  </template>
                </v-text-field>
              </v-col>

              <v-col cols="12" md="6">
                <label class="mb-1 font-weight-bold text-navy text-caption d-block">رابط القضية في ناجز</label>
                <v-text-field
                  v-model="item.najiz_url"
                  variant="outlined"
                  density="comfortable"
                  class="premium-select glass-input"
                  placeholder="https://najiz.sa/..."
                >
                  <template #prepend-inner>
                    <LucideIcon name="globe" :size="18" class="text-gold-accent me-2" />
                  </template>
                </v-text-field>
              </v-col>
            </v-row>
          </div>
        </v-form>
      </v-card-text>

      <!-- Footer (Fixed Sticky) -->
      <v-divider class="flex-shrink-0" />
      <v-card-actions
        class="pa-4 pa-sm-6 modal-footer-solid modal-footer-sticky flex-shrink-0 d-flex align-center flex-wrap ga-3"
      >
        <span class="text-caption text-gold opacity-80 font-weight-bold d-none d-sm-inline me-auto">
          * الحقول المطلوبة
        </span>

        <div class="d-flex align-center ga-3 w-100 w-sm-auto ms-sm-auto flex-column-reverse flex-sm-row">
          <v-btn
            variant="outlined"
            size="large"
            class="pill-btn-cancel px-6 w-100 w-sm-auto"
            @click="$emit('cancel')"
          >
            <LucideIcon name="x" :size="18" class="me-1" /> إلغاء
          </v-btn>

          <v-btn
            variant="flat"
            size="large"
            class="pill-btn-gold-filled px-10 w-100 w-sm-auto"
            :disabled="!canSubmit"
            :loading="saving"
            @click="$emit('save')"
          >
            <LucideIcon name="file-check" :size="18" class="me-2" />
            {{ isEditing ? 'تحديث ملف القضية' : 'تأكيد التسجيل والنشر' }}
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { usePermissions } from '../../composables/usePermissions'
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

const { session } = usePermissions()

watch(
  () => props.modelValue,
  (open) => {
    if (open && !props.isEditing) {
      if (item.value && !item.value.responsible_user_id && session.value?.userId) {
        item.value.responsible_user_id = session.value.userId
      }
    }
  },
  { immediate: true }
)

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

const parties = computed(() => (Array.isArray(item.value?.parties) ? item.value.parties : []))

const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)

const formRef = ref<any>(null)
const cardEl = ref<HTMLElement | null>(null)
const assignableLoading = computed(() => false)

const drag = ref({
  active: false,
  startX: 0,
  startY: 0,
  startLeft: 0,
  startTop: 0,
  offsetX: 0,
  offsetY: 0
})
const dragStyle = computed(() => ({
  transform: `translate(${drag.value.offsetX}px, ${drag.value.offsetY}px)`
}))

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
  safeArray(dropdowns.classifications)
    .slice()
    .sort((a: any, b: any) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .map((c: any) => c.name)
)

const subClassifications = computed(() => {
  const main = safeArray(dropdowns.classifications).find(
    (c: any) => c.name === item.value?.main_classification
  )
  return main ? safeArray(main.subClassifications).map((s: any) => s.name) : []
})

const caseTypeOptions = computed(() => {
  const main = safeArray(dropdowns.classifications).find(
    (c: any) => c.name === item.value?.main_classification
  )
  if (!main) return []
  const sub = safeArray(main.subClassifications).find(
    (s: any) => s.name === item.value?.sub_classification
  )
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
.section-header-gold {
  border-right: 4px solid #d4af37;
  padding-right: 12px;
  display: flex;
  align-items: center;
}

.case-dialog-handle {
  cursor: move;
  user-select: none;
}

.is-dragging {
  transition: none !important;
}

.case-dialog-card {
  border: 1px solid #E5E1D8 !important;
  background: #FFFFFF !important;
  display: flex !important;
  flex-direction: column !important;
  max-height: 92vh !important;
  border-radius: 16px !important;
  box-shadow: 0 20px 50px rgba(31, 42, 68, 0.12) !important;
}

.case-modal-header {
  background: #F7F3E8 !important;
  border-bottom: 1px solid #E5E1D8 !important;
  transition: all 0.2s ease;
}

.header-title {
  color: #1F2A44 !important;
}

.header-subtitle {
  color: #73777D !important;
}

.header-icon-circle {
  width: 44px;
  height: 44px;
  background: #F3E8C8;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #E5E1D8;
}

.close-btn:hover {
  background: #FFEBEE !important;
  color: #C94A4A !important;
}

.modal-body-scroll {
  flex: 1 1 auto !important;
  overflow-y: auto !important;
  max-height: calc(92vh - 140px) !important;
  padding-bottom: 3rem !important;
  background: #F8F7F3 !important;
}

.modal-footer-sticky {
  position: sticky !important;
  bottom: 0 !important;
  z-index: 10 !important;
  background: #F8F7F3 !important;
  border-top: 1px solid #E5E1D8 !important;
}

.tracking-tight {
  letter-spacing: -0.02em;
}

@media (max-width: 767px) {
  .case-form-modal-dialog :deep(.v-overlay__content) {
    margin: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    height: 100% !important;
  }

  .case-dialog-card {
    max-height: 100vh !important;
    height: 100vh !important;
    border-radius: 0 !important;
  }

  .case-modal-header {
    background: #1F2A44 !important;
    border-bottom: 1px solid #2A3B5F !important;
  }

  .header-title {
    color: #FFFFFF !important;
  }

  .header-subtitle {
    color: #F3E8C8 !important;
    opacity: 0.9 !important;
  }

  .header-icon-circle {
    background: #B08A2E !important;
    border-color: #C79A32 !important;
  }

  .header-icon-circle :deep(.lucide-icon) {
    color: #FFFFFF !important;
  }

  .modal-body-scroll {
    max-height: calc(100vh - 130px) !important;
    padding-bottom: 5rem !important;
  }
}
</style>
