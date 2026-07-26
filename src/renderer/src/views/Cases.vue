<template>
  <v-container fluid class="pa-4 pt-1 pb-6 cases-container">
    <v-fade-transition hide-on-leave>
      <div v-if="!pageLoading">
        <CaseHeader @add="openAddDialog" />

        <CaseStatsCards
          :total="valWithDefault(store.total, 0)"
          :completion-rate="completionRateDisplay"
          :loading="store.loading"
        />

        <CaseFilters
          v-model="search"
          :status="store.status"
          :priority="store.priority"
          :responsible-user-id="store.responsibleUserId"
          :assignable-users="safeArray(assignableUsers)"
          :loading="store.loading"
          @update:status="onStatusChange"
          @update:priority="onPriorityChange"
          @update:responsible-user-id="onResponsibleChange"
          @refresh="store.fetchCases"
        />

        <v-card
          elevation="0"
          class="glass-panel overflow-hidden min-h-500 table-to-cards glass-card"
        >
          <MobileCases
            v-if="isMobile"
            :items="safeArray(store.cases)"
            :loading="store.loading"
            @edit="openEditDialog"
            @add="openAddDialog"
            @delete="confirmDelete"
          />
          <CaseDesktopTable
            v-else
            :items="safeArray(store.cases)"
            :loading="store.loading"
            :total="store.total"
            :page-size="store.pageSize"
            @edit="openEditDialog"
            @delete="confirmDelete"
            @update-options="onTableUpdate"
          />
        </v-card>

        <CaseFormDialog
          v-model="showDialog"
          :is-editing="isEditing"
          :edit-item="editItem"
          :case-sessions="caseSessions"
          :sessions-loading="sessionsLoading"
          :saving="saving"
          :case-number-checking="caseNumberChecking"
          :case-number-error="caseNumberError"
          :can-submit="canSubmit"
          :clients="safeArray(clientsStore.clients)"
          :defendants="safeArray(defendantsStore.defendants)"
          :assignable-users="safeArray(assignableUsers)"
          @update:edit-item="editItem = $event"
          @add-session="openAddSessionFromCaseForm"
          @save="handleSave"
          @cancel="showDialog = false"
        />

        <CaseDeleteDialog
          v-model="showDeleteDialog"
          :case-number="itemToDelete?.case_number || ''"
          :deleting="deleting"
          @confirm="handleDelete"
        />

        <CaseAddSessionDialog
          v-model="showSessionDialog"
          :session="newSession"
          :saving="savingSession"
          @save="saveSessionFromCaseForm"
        />

        <CaseDefendantDialog
          v-model="showDefendantDialog"
          :saving="addingDefendant"
          @save="saveQuickDefendant"
        />

        <v-snackbar
          v-model="snackbar"
          :color="snackbarColor"
          rounded="pill"
          elevation="12"
          timeout="4000"
        >
          <div class="d-flex align-center">
            <LucideIcon
              :name="snackbarColor === 'success' ? 'check-circle' : 'alert-circle'"
              :size="20"
              class="me-3"
            />
            <span class="font-weight-black">{{ snackbarText }}</span>
          </div>
        </v-snackbar>

        <PremiumConfirm
          v-model="confirmDialog.show"
          :title="confirmDialog.title"
          :message="confirmDialog.message"
          :color="confirmDialog.color"
          :icon="confirmDialog.icon"
          :confirm-text="confirmDialog.confirmText"
          :loading="confirmDialog.loading"
          @confirm="confirmDialog.action"
        />
      </div>
    </v-fade-transition>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCasesStore } from '../stores/cases'
import { useClientsStore } from '../stores/clients'
import { useDefendantsStore } from '../stores/defendants'
import { useSearch } from '../composables/useSearch'
import { convertToHijri } from '../utils/hijri'
import { safeArray, valWithDefault } from '../utils/safe'
import { Case, Defendant, Session } from '../types'
import { ICONS } from '../config/icons'
import LucideIcon from '../components/common/LucideIcon.vue'
import PremiumConfirm from '../components/common/PremiumConfirm.vue'
import CaseHeader from './cases/CaseHeader.vue'
import CaseStatsCards from './cases/CaseStatsCards.vue'
import CaseFilters from './cases/CaseFilters.vue'
import CaseDesktopTable from './cases/CaseDesktopTable.vue'
import CaseFormDialog from './cases/CaseFormDialog.vue'
import CaseDeleteDialog from './cases/CaseDeleteDialog.vue'
import CaseAddSessionDialog from './cases/CaseAddSessionDialog.vue'
import CaseDefendantDialog from './cases/CaseDefendantDialog.vue'
import { useMobileLayout } from '../composables/useMobileLayout'
import { setFabAction, clearFabAction } from '../composables/useFabAction'
import MobileCases from '../components/mobile/MobileCases.vue'

import { usePermissions } from '../composables/usePermissions'

const store = useCasesStore()
const clientsStore = useClientsStore()
const defendantsStore = useDefendantsStore()
const route = useRoute()
const router = useRouter()
const { isMobile } = useMobileLayout()
const { session } = usePermissions()

const pageLoading = ref(false)
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const showDefendantDialog = ref(false)
const showSessionDialog = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const deleting = ref(false)
const formValid = ref(false)
const itemToDelete = ref<Case | null>(null)
const completionRate = ref<number | null>(null)
const savingSession = ref(false)
const addingDefendant = ref(false)
const caseSessions = ref<Session[]>([])
const sessionsLoading = ref(false)
const caseNumberChecking = ref(false)
const caseNumberError = ref('')
let caseNumberCheckTimer: any = null

const assignableUsersLoading = ref(false)
const assignableUsers = ref<
  Array<{ id: string; username: string; full_name?: string; role_key: string }>
>([])

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const confirmDialog = ref({
  show: false,
  title: '',
  message: '',
  color: 'primary',
  icon: ICONS.STATUS.INFO as string,
  confirmText: 'تأكيد',
  loading: false,
  action: () => {}
})

const openConfirm = (options: {
  title: string
  message: string
  color?: string
  icon?: string
  confirmText?: string
  action: () => void
}) => {
  confirmDialog.value = {
    ...confirmDialog.value,
    show: true,
    title: options.title,
    message: options.message,
    color: options.color || 'primary',
    icon: options.icon || 'alert-circle',
    confirmText: options.confirmText || 'تأكيد',
    loading: false,
    action: options.action
  }
}

const defaultItem: Case = {
  case_number: '',
  client_id: '',
  case_type: '',
  subject: '',
  client_requirement: '',
  plaintiff_requests: '',
  court: '',
  circuit: '',
  opponent_name: '',
  opponent_id: '',
  opponent_nationality: 'سعودي',
  opponent_city: 'الرياض',
  phase: 'ابتدائية',
  status: 'قيد النظر',
  priority: 'متوسطة',
  registration_date: new Date().toISOString().split('T')[0],
  registration_date_hijri: '',
  main_classification: '',
  sub_classification: '',
  folder_link: '',
  najiz_url: '',
  parties: [],
  notes: '',
  client_role: '',
  assessment: ''
}

const editItem = ref<Case>({ ...defaultItem })

const newSession = ref<Partial<Session>>({
  date: new Date().toISOString().split('T')[0],
  time: '10:00',
  court_room: '',
  status: 'قادمة',
  meeting_link: '',
  notes: ''
})

const completionRateDisplay = computed(() =>
  completionRate.value === null ? '--' : `${completionRate.value}%`
)

const canSubmit = computed(() => {
  if (caseNumberChecking.value) return false
  if (caseNumberError.value) return false
  return formValid.value
})

const { search } = useSearch((val) => {
  store.q = val || ''
  store.page = 1
  store.fetchCases()
}, store.q)

const onMobilePagePrev = (): void => {
  if (store.page > 1) {
    store.page--
    store.fetchCases()
  }
}
const onMobilePageNext = (): void => {
  if (store.page < Math.ceil(store.total / store.pageSize)) {
    store.page++
    store.fetchCases()
  }
}
const onStatusChange = (val: string): void => {
  store.status = val
  store.page = 1
  store.fetchCases()
  refreshCompletionRate()
}
const onPriorityChange = (val: string): void => {
  store.priority = val
  store.page = 1
  store.fetchCases()
  refreshCompletionRate()
}
const onResponsibleChange = (val: string): void => {
  store.responsibleUserId = val
  store.page = 1
  store.fetchCases()
  refreshCompletionRate()
}
const onTableUpdate = (options: { page: number; itemsPerPage: number }): void => {
  store.page = options.page
  store.pageSize = options.itemsPerPage
  store.fetchCases()
}

const refreshCompletionRate = async (): Promise<void> => {
  try {
    const api = (window as any).api
    if (!api?.cases?.count) {
      completionRate.value = null
      return
    }
    const baseParams: any = {
      q: store.q || undefined,
      priority: store.priority && store.priority !== 'الكل' ? store.priority : undefined,
      responsible_user_id: store.responsibleUserId || undefined
    }
    const [total, closed, archived, finished, finalJudgment, asIfNever] = await Promise.all([
      api.cases.count({ ...baseParams, status: 'الكل' }),
      api.cases.count({ ...baseParams, status: 'مغلقة' }),
      api.cases.count({ ...baseParams, status: 'مؤرشفة' }),
      api.cases.count({ ...baseParams, status: 'منتهية' }),
      api.cases.count({ ...baseParams, status: 'محكومة بحكم نهائي' }),
      api.cases.count({ ...baseParams, status: 'كأن لم تكن' })
    ])
    const totalNum = Number(total || 0)
    const doneNum =
      Number(closed || 0) +
      Number(archived || 0) +
      Number(finished || 0) +
      Number(finalJudgment || 0) +
      Number(asIfNever || 0)
    completionRate.value = totalNum > 0 ? Math.round((doneNum / totalNum) * 100) : 0
  } catch {
    completionRate.value = null
  }
}

const loadAssignableUsers = async (): Promise<void> => {
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

const loadCaseSessions = async (): Promise<void> => {
  if (!editItem.value.id) {
    caseSessions.value = []
    return
  }
  sessionsLoading.value = true
  try {
    caseSessions.value = await window.api.sessions.getByCaseId(editItem.value.id)
  } catch {
    caseSessions.value = []
  } finally {
    sessionsLoading.value = false
  }
}

const openAddDialog = (): void => {
  isEditing.value = false
  const currentUserId = session.value?.userId || ''
  editItem.value = {
    ...defaultItem,
    responsible_user_id: currentUserId,
    parties: [{ party_type: 'client', name: '', client_id: '' }]
  }
  caseSessions.value = []
  caseNumberError.value = ''
  loadAssignableUsers()
  showDialog.value = true
}

const openEditDialog = (item: Case): void => {
  isEditing.value = true
  editItem.value = { ...item, parties: item.parties ? [...item.parties] : [] }
  caseNumberError.value = ''
  loadAssignableUsers()
  showDialog.value = true
}

watch(
  () => showDialog.value,
  async (open) => {
    if (open) {
      loadCaseSessions()
    } else {
      editItem.value = { ...defaultItem }
    }
  }
)

watch(
  () => editItem.value.case_number,
  (val) => {
    const num = String(val || '').trim()
    caseNumberError.value = ''
    if (caseNumberCheckTimer) clearTimeout(caseNumberCheckTimer)
    if (!num) return
    caseNumberCheckTimer = setTimeout(async () => {
      caseNumberChecking.value = true
      try {
        const ok = await window.api.cases.isUnique(num, editItem.value.id)
        if (!ok) caseNumberError.value = 'رقم القضية مسجل مسبقًا'
      } catch {
        caseNumberError.value = ''
      } finally {
        caseNumberChecking.value = false
      }
    }, 350)
  },
  { immediate: false }
)

const ensureCaseExistsForSessions = async (): Promise<string | null> => {
  if (editItem.value.id) return editItem.value.id
  const num = String(editItem.value.case_number || '').trim()
  if (num) {
    const ok = await window.api.cases.isUnique(num)
    if (!ok) {
      caseNumberError.value = 'رقم القضية مسجل مسبقًا'
      return null
    }
  }
  const data = JSON.parse(JSON.stringify(editItem.value))
  if (data.parties && data.parties.length > 0) {
    const firstClient = data.parties.find((p: any) => p.party_type === 'client')
    const firstOpponent = data.parties.find((p: any) => p.party_type === 'opponent')
    if (firstClient?.client_id) data.client_id = firstClient.client_id
    if (firstOpponent?.name) data.opponent_name = firstOpponent.name
  }
  if (data.registration_date)
    data.registration_date_hijri = convertToHijri(new Date(data.registration_date))
  const id = await window.api.cases.create(data)
  editItem.value.id = id
  isEditing.value = true
  await store.fetchCases()
  return id
}

const openAddSessionFromCaseForm = async (): Promise<void> => {
  const id = await ensureCaseExistsForSessions()
  if (!id) {
    showSnackbar('يرجى استكمال بيانات القضية أولاً قبل إضافة جلسة', 'warning')
    return
  }
  newSession.value = {
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    court_room: editItem.value.circuit || '',
    status: 'قادمة',
    notes: '',
    meeting_link: ''
  }
  showSessionDialog.value = true
}

const saveSessionFromCaseForm = async (): Promise<void> => {
  const id = editItem.value.id
  if (!id) return
  savingSession.value = true
  try {
    const payload = JSON.parse(JSON.stringify(newSession.value))
    if (payload.date) payload.date_hijri = convertToHijri(new Date(payload.date))
    await window.api.sessions.create({ case_id: id, ...payload })
    showSessionDialog.value = false
    await loadCaseSessions()
    showSnackbar('تمت إضافة الجلسة بنجاح', 'success')
  } catch (e: unknown) {
    showSnackbar('تعذر إضافة الجلسة: ' + (e as Error).message, 'error')
  } finally {
    savingSession.value = false
  }
}

const saveQuickDefendant = async (): Promise<void> => {
  addingDefendant.value = true
  try {
    await defendantsStore.fetchAllDefendants()
    showDefendantDialog.value = false
    showSnackbar('تمت إضافة الخصم بنجاح', 'success')
  } catch (e: unknown) {
    showSnackbar((e as Error).message, 'error')
  } finally {
    addingDefendant.value = false
  }
}

const handleSave = async (): Promise<void> => {
  if (caseNumberChecking.value) {
    showSnackbar('جاري التحقق من رقم القضية...', 'warning')
    return
  }
  if (caseNumberError.value) {
    showSnackbar(caseNumberError.value, 'error')
    return
  }

  openConfirm({
    title: isEditing.value ? 'تأكيد التعديل' : 'تأكيد التسجيل',
    message: isEditing.value
      ? 'هل أنت متأكد من رغبتك في حفظ التعديلات على ملف القضية؟'
      : 'هل أنت متأكد من رغبتك في تسجيل ونشر ملف القضية الجديد؟',
    color: 'success',
    icon: 'badge-check',
    confirmText: 'نعم، احفظ',
    action: async () => {
      confirmDialog.value.loading = true
      saving.value = true
      try {
        const data: Case = JSON.parse(JSON.stringify(editItem.value))
        if (data.parties && data.parties.length > 0) {
          const firstClient = data.parties.find((p) => p.party_type === 'client')
          const firstOpponent = data.parties.find((p) => p.party_type === 'opponent')
          if (firstClient?.client_id) data.client_id = firstClient.client_id
          if (firstOpponent?.name) data.opponent_name = firstOpponent.name
        }
        if (data.registration_date)
          data.registration_date_hijri = convertToHijri(new Date(data.registration_date))
        if (isEditing.value) {
          await store.updateCase(data)
          showSnackbar('تم تحديث ملف القضية بنجاح')
        } else {
          await store.addCase(data)
          showSnackbar('تم تسجيل ملف القضية الجديد بنجاح')
        }
        showDialog.value = false
        confirmDialog.value.show = false
      } catch (e: unknown) {
        showSnackbar('خطأ في المزامنة: ' + (e as Error).message, 'error')
      } finally {
        saving.value = false
        confirmDialog.value.loading = false
      }
    }
  })
}

const confirmDelete = (item: Case): void => {
  itemToDelete.value = item
  openConfirm({
    title: 'تأكيد الحذف النهائي',
    message: `تحذير: هل أنت متأكد من رغبتك في حذف القضية رقم (${item.case_number})؟ هذا الإجراء سيقوم بحذف جميع (الجلسات، المهام، والأحكام) المرتبطة بهذه القضية نهائياً ولا يمكن التراجع عنه.`,
    color: 'error',
    icon: 'trash-2',
    confirmText: 'نعم، احذف القضية وملحقاتها',
    action: handleDelete
  })
}

const handleDelete = async (): Promise<void> => {
  if (!itemToDelete.value?.id) return
  confirmDialog.value.loading = true
  deleting.value = true
  try {
    await store.deleteCase(itemToDelete.value.id)
    showSnackbar('تم إسقاط ملف القضية نهائياً')
    confirmDialog.value.show = false
  } catch (e: unknown) {
    showSnackbar('فشل في عملية الحذف: ' + (e as Error).message, 'error')
  } finally {
    deleting.value = false
    confirmDialog.value.loading = false
  }
}

const showSnackbar = (text: string, color = 'success'): void => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

onMounted((): void => {
  clientsStore.fetchAllClients()
  defendantsStore.fetchAllDefendants()
  loadAssignableUsers()
  refreshCompletionRate()
  if (route.query.new === '1') {
    openAddDialog()
    router.replace({ path: route.path, query: {} })
  }
  if (route.query.edit) {
    window.api.cases
      .getById(route.query.edit)
      .then((data: any) => {
        if (data) {
          openEditDialog(data)
          router.replace({ path: route.path, query: {} })
        }
      })
      .catch(() => {
        router.replace({ path: route.path, query: {} })
      })
  }
  setFabAction('mdi-file-plus', openAddDialog, route.path)
})

onUnmounted(() => {
  store.q = ''
  if (search) search.value = ''
  clearFabAction()
})
</script>

<style scoped>
.cases-container {
  min-height: 100vh;
  max-width: 1600px;
  margin-inline: auto;
}
.min-h-500 {
  min-height: 500px;
}
.table-to-cards :deep(.v-data-table) {
  background: transparent;
}
</style>
