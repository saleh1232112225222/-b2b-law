<template>
  <v-dialog
    :model-value="show"
    width="90%"
    max-width="800"
    persistent
    scrollable
    @update:model-value="$emit('update:show', $event)"
  >
    <v-card class="session-dialog-card overflow-hidden">
      <div class="session-dialog-header d-flex align-center py-4 px-6">
        <div class="icon-circle-gold me-3">
          <LucideIcon
            :name="isEditing ? 'edit-3' : 'calendar-plus'"
            :size="20"
          />
        </div>
        <div>
          <h3 class="text-h6 font-weight-black text-navy mb-0">{{
            isEditing ? 'تعديل بيانات الجلسة المجدولة' : 'إدراج موعد جلسة قضائية جديد'
          }}</h3>
          <span class="text-caption text-muted-gray">حدد القضية، الموعد، والقاعة لعرضها في التقويم</span>
        </div>
        <v-spacer />
        <v-btn
          icon
          variant="text"
          class="rounded-circle close-btn"
          @click="$emit('update:show', false)"
        >
          <LucideIcon name="x" :size="20" />
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
              <label class="mb-2 font-weight-black text-gold">مسؤول الجلسة*</label>
              <v-select
                v-model="editItem.responsible_user_id"
                :items="assignableUsers"
                :item-title="getUserDisplayName"
                item-value="id"
                variant="outlined"
                class="premium-input-solid glass-input"
                :rules="[(v: any) => !!v || 'مسؤول الجلسة مطلوب']"
                required
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

            <v-col cols="12" class="mt-2">
              <v-alert
                type="info"
                variant="tonal"
                color="gold"
                class="rounded-xl border-dashed py-3"
              >
                <template #prepend>
                  <LucideIcon name="calendar-check" :size="22" class="text-gold me-2" />
                </template>
                <div class="text-caption font-weight-bold text-white">
                  <strong>المزامنة السحابية مفعّلة 🟢:</strong> عند حفظ هذه الجلسة، سيتم إدراجها وتحديثها تلقائياً في <strong>Google Calendar</strong> الخاص بالمكتب.
                </div>
              </v-alert>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4 session-dialog-footer">
        <v-btn
          variant="outlined"
          size="large"
          class="pill-btn-cancel px-6"
          @click="$emit('update:show', false)"
          >إلغاء</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="large"
          class="pill-btn-gold-filled px-8"
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
import { usePermissions } from '../../composables/usePermissions'
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

const { session } = usePermissions()

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
  meeting_link: '',
  result: ''
}

const editItem = ref<Partial<Session>>({ ...defaultItem })

watch(
  () => props.show,
  (val) => {
    if (val) {
      if (props.isEditing && props.editingItem) {
        editItem.value = { ...props.editingItem }
      } else {
        editItem.value = { ...defaultItem }
        if (!editItem.value.responsible_user_id && session.value?.userId) {
          editItem.value.responsible_user_id = session.value.userId
        }
      }
      caseBlockStatus.value = { is_blocked: false, reason: '' }
      loadAssignableUsers()
    }
  }
)

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
  if (!item) return false
  const q = query.toLowerCase().trim()
  const display = item.display || ''
  return (
    display.toLowerCase().includes(q) ||
    (item.case_number || '').toLowerCase().includes(q) ||
    (item.client_name || '').toLowerCase().includes(q)
  )
}
</script>

<style scoped>
.session-dialog-card {
  background: #ffffff !important;
  border: 1px solid #E5E1D8 !important;
  border-radius: 16px !important;
  box-shadow: 0 20px 50px rgba(31, 42, 68, 0.12) !important;
}

.session-dialog-header {
  background: #F7F3E8 !important;
  border-bottom: 1px solid #E5E1D8 !important;
}

.session-dialog-footer {
  background: #F7F3E8 !important;
  border-top: 1px solid #E5E1D8 !important;
}

.close-btn:hover {
  background: #FFEBEE !important;
  color: #C94A4A !important;
}
</style>
