<template>
  <v-dialog
    :model-value="show"
    width="90%"
    max-width="800"
    persistent
    scrollable
    @update:model-value="$emit('update:show', $event)"
  >
    <v-card class="session-dialog-card overflow-hidden glass-card">
      <div class="session-dialog-header d-flex align-center py-5 px-8">
        <div class="bg-accent-alpha pa-2 rounded-lg me-4">
          <LucideIcon
            :name="isEditing ? 'edit-3' : 'calendar-plus'"
            :size="24"
            class="text-accent"
          />
        </div>
        <span class="text-h5 font-weight-black text-gold">{{
          isEditing ? 'تعديل بيانات الجلسة المجدولة' : 'إدراج موعد جلسة قضائية جديد'
        }}</span>
        <v-spacer />
        <v-btn
          class="premium-btn-gold-gradient"
          variant="text"
          color="gold"
          icon
          @click="$emit('update:show', false)"
        >
          <LucideIcon name="x" :size="24" />
        </v-btn>
      </div>

      <v-card-text class="pa-8 modal-scrollable session-form">
        <v-form ref="formRef" v-model="formValid">
          <v-row>
            <v-col v-if="caseBlockStatus.is_blocked" cols="12">
              <v-alert type="error" variant="flat" class="rounded-lg mb-6 border-dashed">
                <template #prepend>
                  <LucideIcon name="shield-alert" :size="24" class="me-3" />
                </template>
                <div class="text-subtitle-1 font-weight-black mb-1">
                  حظر مهني نشط: {{ caseBlockStatus.reason }}
                </div>
                <div class="text-tiny opacity-90 font-weight-black leading-relaxed">
                  يجب استكمال إغلاق الجلسات السابقة لهذه القضية في لوحة القيادة أولاً لضمان دقة
                  الأرشيف.
                </div>
                <div class="mt-4">
                  <v-btn
                    color="white"
                    variant="flat"
                    size="small"
                    class="font-weight-black rounded-md text-error premium-lift premium-btn-gold-gradient"
                    @click="$router.push('/briefing')"
                    >توجه للوحة القيادة</v-btn
                  >
                </div>
              </v-alert>
            </v-col>

            <v-col cols="12">
              <label class="mb-2 font-weight-black text-gold">ملف القضية المستهدفة*</label>
              <v-autocomplete
                v-model="editItem.case_id"
                :items="safeArray(caseOptions)"
                item-title="display"
                item-value="id"
                placeholder="ابحث عن رقم القضية أو اسم العميل..."
                variant="outlined"
                class="premium-input-solid glass-input"
                :rules="[(v: any) => !!v || 'القضية مطلوبة لربط الموعد']"
                :custom-filter="arabicFilter"
                no-data-text="لا يوجد قضايا حالياً"
                required
              >
                <template #prepend-inner>
                  <LucideIcon name="gavel" :size="20" class="text-primary" />
                </template>
              </v-autocomplete>
            </v-col>

            <v-col cols="12" md="6">
              <label class="mb-2 font-weight-black text-gold">مسؤول الجلسة</label>
              <v-select
                v-model="editItem.responsible_user_id"
                :items="assignableUsers"
                :item-title="getUserDisplayName"
                item-value="id"
                variant="outlined"
                class="premium-input-solid glass-input"
                clearable
                :loading="assignableUsersLoading"
              >
                <template #prepend-inner>
                  <LucideIcon name="user-cog" :size="20" class="text-primary" />
                </template>
              </v-select>
            </v-col>

            <v-col cols="12" md="6">
              <label class="mb-2 font-weight-black text-gold">تاريخ الجلسة*</label>
              <DualDatePicker v-model="editItem.date" />
            </v-col>
            <v-col cols="12" md="6">
              <label class="mb-2 font-weight-black text-gold">وقت انعقاد الجلسة</label>
              <v-text-field
                v-model="editItem.time"
                type="time"
                variant="outlined"
                class="premium-input-solid glass-input"
              >
                <template #prepend-inner>
                  <LucideIcon name="clock" :size="20" class="text-primary" />
                </template>
              </v-text-field>
            </v-col>

            <v-col cols="12" md="6">
              <label class="mb-2 font-weight-black text-gold">القاعة / الدائرة القضائية</label>
              <v-text-field
                v-model="editItem.court_room"
                placeholder="مثال: القاعة الخامسة، الدائرة السادسة"
                variant="outlined"
                class="premium-input-solid glass-input"
              >
                <template #prepend-inner>
                  <LucideIcon name="landmark" :size="20" class="text-primary" />
                </template>
              </v-text-field>
            </v-col>

            <v-col cols="12" md="6">
              <label class="mb-2 font-weight-black text-gold">نوع الجلسة*</label>
              <v-select
                v-model="editItem.type"
                :items="SESSION_TYPES"
                variant="outlined"
                class="premium-input-solid glass-input"
                required
              >
                <template #prepend-inner>
                  <LucideIcon name="sliders" :size="20" class="text-primary" />
                </template>
              </v-select>
            </v-col>
            <v-col cols="12" md="6">
              <label class="mb-2 font-weight-black text-gold">حالة الموعد*</label>
              <v-select
                v-model="editItem.status"
                :items="SESSION_STATUSES"
                variant="outlined"
                class="premium-input-solid glass-input"
                required
              >
                <template #prepend-inner>
                  <LucideIcon name="activity" :size="20" class="text-primary" />
                </template>
              </v-select>
            </v-col>

            <v-col cols="12">
              <label class="mb-2 font-weight-black text-gold"
                >رابط الجلسة الرقمية (ناجز / تيمز)</label
              >
              <v-text-field
                v-model="editItem.meeting_link"
                placeholder="https://..."
                variant="outlined"
                class="premium-input-solid glass-input"
                hint="سيتم تفعيل زر 'الانضمام المباشر' في الأجندة عند إضافة الرابط"
                persistent-hint
              >
                <template #prepend-inner>
                  <LucideIcon name="link" :size="20" class="text-primary" />
                </template>
              </v-text-field>
            </v-col>

            <v-col cols="12">
              <label class="mb-2 font-weight-black text-gold">ملاحظات ووقائع الجلسة</label>
              <v-textarea
                v-model="editItem.notes"
                variant="outlined"
                rows="2"
                class="premium-input-solid glass-input"
              >
                <template #prepend-inner>
                  <LucideIcon name="sticky-note" :size="20" class="text-primary" />
                </template>
              </v-textarea>
            </v-col>

            <v-col v-if="editItem.status === 'تمت' || editItem.status === 'مؤجلة'" cols="12">
              <label class="mb-2 font-weight-black text-gold">قرار اللجنة / سبب التأجيل</label>
              <v-text-field
                v-model="editItem.result"
                variant="outlined"
                class="premium-input-solid glass-input"
                color="accent"
              >
                <template #prepend-inner>
                  <LucideIcon
                    name="message-square-check"
                    :size="20"
                    class="text-accent opacity-50"
                  />
                </template>
              </v-text-field>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-divider class="border-gold" style="opacity: 0.1" />
      <v-card-actions class="pa-8 session-dialog-footer">
        <v-btn
          variant="flat"
          size="large"
          class="px-8 font-weight-black premium-button-highlight action-btn-unified premium-btn-gold-gradient"
          @click="$emit('update:show', false)"
          >إلغاء</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="large"
          class="px-12 font-weight-black premium-button-highlight action-btn-unified h-56 premium-btn-gold-gradient"
          :disabled="!formValid || caseBlockStatus.is_blocked"
          :loading="saving"
          @click="handleSave"
          >{{ isEditing ? 'تحديث الموعد' : 'تأكيد الجدولة' }}</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import LucideIcon from '../../components/common/LucideIcon.vue'
import DualDatePicker from '../../components/DualDatePicker.vue'
import { SESSION_TYPES, SESSION_STATUSES } from '../../utils/legalConstants'
import { convertToHijri } from '../../utils/hijri'
import { safeArray, isValidDate } from '../../utils/safe'
import type { Session } from '../../types/session'

const props = defineProps<{
  show: boolean
  caseOptions: any[]
  isEditing: boolean
  editingItem: Partial<Session> | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  save: [data: any]
}>()

const router = useRouter()

const formValid = ref(false)
const formRef = ref<any>(null)
const saving = ref(false)

const defaultItem: Partial<Session> = {
  case_id: '',
  responsible_user_id: '',
  date: new Date().toISOString().split('T')[0],
  time: '09:00',
  type: 'مرافعة',
  court_room: '',
  status: 'قادمة',
  notes: '',
  result: '',
  meeting_link: ''
}

const editItem = ref<Partial<Session>>({ ...defaultItem })
const caseBlockStatus = ref({ is_blocked: false, reason: '' })

const assignableUsers = ref<
  Array<{ id: string; username: string; full_name?: string; role_key: string }>
>([])
const assignableUsersLoading = ref(false)

const getUserDisplayName = (u: any) => String(u?.full_name || u?.username || '')

const loadAssignableUsers = async () => {
  if (assignableUsersLoading.value) return
  assignableUsersLoading.value = true
  try {
    assignableUsers.value = await (window as any).api.users.listAssignable()
  } catch {
    assignableUsers.value = []
  } finally {
    assignableUsersLoading.value = false
  }
}

watch(
  () => props.show,
  (val) => {
    if (val) {
      if (props.isEditing && props.editingItem) {
        editItem.value = { ...props.editingItem }
      } else {
        editItem.value = { ...defaultItem }
      }
      caseBlockStatus.value = { is_blocked: false, reason: '' }
      loadAssignableUsers()
    }
  }
)

watch(
  () => editItem.value.case_id,
  async (newVal) => {
    if (newVal && !props.isEditing) {
      try {
        const selected = safeArray(props.caseOptions).find((c: any) => c.id === newVal) as any
        if (selected?.responsible_user_id && !editItem.value.responsible_user_id) {
          editItem.value.responsible_user_id = selected.responsible_user_id
        }
        if ((window as any).api?.sessions?.checkBlock) {
          const status = await (window as any).api.sessions.checkBlock(newVal)
          caseBlockStatus.value = status
        }
      } catch (error) {
        console.error('Block check failed:', error)
        caseBlockStatus.value = { is_blocked: false, reason: '' }
      }
    } else {
      caseBlockStatus.value = { is_blocked: false, reason: '' }
    }
  }
)

const handleSave = async () => {
  if (!formRef.value) return
  const { valid } = await formRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const dataToSave = JSON.parse(JSON.stringify(editItem.value))
    if (isValidDate(dataToSave.date)) {
      dataToSave.date_hijri = convertToHijri(new Date(dataToSave.date))
    }
    emit('save', dataToSave)
  } catch (error: any) {
    console.error('Save preparation failed:', error)
  } finally {
    saving.value = false
  }
}

const arabicFilter = (item: any, query: string): boolean => {
  if (!query) return true
  const q = query.toLowerCase().trim()
  return (
    item.display.toLowerCase().includes(q) ||
    item.case_number?.toLowerCase().includes(q) ||
    item.client_name?.toLowerCase().includes(q)
  )
}
</script>

<style scoped>
.session-dialog-card {
  background: rgba(15, 23, 42, 0.95) !important;
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border: 1px solid rgba(233, 195, 73, 0.25) !important;
  border-radius: 24px !important;
}

.session-dialog-header {
  background: rgba(0, 0, 0, 0.2) !important;
  border-bottom: 1px solid rgba(233, 195, 73, 0.15) !important;
}

.session-dialog-footer {
  background: rgba(0, 0, 0, 0.2) !important;
  border-top: 1px solid rgba(233, 195, 73, 0.15) !important;
}

.session-form :deep(.v-label) {
  color: #e9c349 !important;
  font-weight: 800 !important;
  font-size: 0.95rem !important;
  margin-bottom: 6px !important;
}

.session-form :deep(.v-field) {
  background: rgba(0, 0, 0, 0.4) !important;
  border-radius: 14px !important;
  border: 1px solid rgba(233, 195, 73, 0.25) !important;
  transition: all 0.3s ease;
}

.session-form :deep(.v-field--focused) {
  border-color: #e9c349 !important;
  box-shadow: 0 0 12px rgba(233, 195, 73, 0.2) !important;
}

.session-form :deep(input),
.session-form :deep(textarea),
.session-form :deep(.v-select__selection-text) {
  color: #ffffff !important;
  font-weight: 600 !important;
}

.premium-button-highlight {
  background: #ffffff !important;
  color: #000000 !important;
  border: 1px solid rgba(233, 195, 73, 0.6) !important;
  border-radius: 12px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
  transition: all 0.3s ease !important;
}

.premium-button-highlight:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15) !important;
  border-color: rgba(233, 195, 73, 0.8) !important;
}

.premium-button-highlight.v-btn--disabled {
  background: #f5f5f5 !important;
  color: #9e9e9e !important;
  border-color: #e0e0e0 !important;
  opacity: 1 !important;
}

.action-btn-unified {
  min-width: 180px !important;
}
</style>
