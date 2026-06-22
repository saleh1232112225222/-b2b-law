<template>
  <v-container fluid class="pa-4 pa-md-6 pb-12 rtl sessions-container">
    <v-fade-transition hide-on-leave>
      <div v-if="!pageLoading">
        <!-- Header -->
        <v-row dense class="mb-4 mb-md-8 align-center">
          <v-col cols="12" sm>
            <div class="d-flex align-center">
              <div
                class="glass-panel-light pa-3 pa-md-4 rounded-xl me-3 me-md-5 border-gold opacity-20"
              >
                <LucideIcon name="calendar-days" :size="isMobile ? 24 : 36" class="text-accent" />
              </div>
              <div>
                <h1 class="text-h5 text-md-h4 font-weight-black text-gold mb-1">
                  أجندة الجلسات الذكية
                </h1>
                <p v-if="!isMobile" class="text-subtitle-1 text-gold font-weight-black">
                  الجدولة الزمنية المتزامنة لكافة المواعيد والوقائع القضائية
                </p>
              </div>
            </div>
          </v-col>
          <v-col cols="12" sm="auto">
            <v-btn
              color="accent"
              :size="isMobile ? 'default' : 'large'"
              :block="isMobile"
              class="font-weight-black rounded-lg premium-lift premium-btn-gold-gradient"
              :class="isMobile ? '' : 'px-8 h-100'"
              @click="openAddDialog"
            >
              <LucideIcon name="calendar-plus" :size="18" class="me-2" /> جدولة جلسة جديدة
            </v-btn>
          </v-col>
        </v-row>

        <SessionStatsCards
          :today-count="safeLength(store.todaySessions)"
          :tomorrow-count="safeLength(store.tomorrowSessions)"
          :total-count="valWithDefault(store.totalSessions, 0)"
          :loading="store.loading"
        />

        <SessionFilters
          v-model:search="search"
          v-model:filter-type="filterType"
          :loading="store.loading"
          @reset="resetFilters"
        />

        <SessionTableDesktop
          v-if="!isMobile"
          :sessions="safeArray(store.sessions)"
          :total-sessions="store.totalSessions"
          :loading="store.loading"
          :search="search"
          :items-per-page="itemsPerPage"
          @update:options="loadItems"
          @edit="openEditDialog"
          @delete="confirmDelete"
          @open-session-room="openSessionRoom"
          @open-session-room-new-window="openSessionRoomInNewWindow"
          @open-najiz="openNajiz"
        />
        <MobileSessions
          v-else
          :items="safeArray(store.sessions)"
          :loading="store.loading"
          @edit="openEditDialog"
          @add="openAddDialog"
          @delete="confirmDelete"
        />
      </div>

      <div v-else>
        <v-row>
          <v-col v-for="i in 3" :key="i" cols="12" md="4">
            <v-skeleton-loader type="card" class="glass-card rounded-xl" />
          </v-col>
          <v-col cols="12">
            <v-skeleton-loader type="table" class="glass-card rounded-xl mt-6" />
          </v-col>
        </v-row>
      </div>
    </v-fade-transition>

    <SessionFormDialog
      :show="showDialog"
      :case-options="caseOptions"
      :is-editing="isEditing"
      :editing-item="editingItem"
      @update:show="showDialog = $event"
      @save="handleSave"
    />

    <v-snackbar v-model="snackbar" :color="snackbarColor" rounded="lg" elevation="24">
      <div class="d-flex align-center">
        <LucideIcon
          :name="snackbarColor === 'success' ? 'check-circle' : 'alert-circle'"
          :size="18"
          class="me-3"
        />
        <span class="font-weight-black">{{ snackbarText }}</span>
      </div>
    </v-snackbar>

    <ConfirmDialog
      v-model="confirmDialog.show"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :color="confirmDialog.color"
      :confirm-button-color="confirmDialog.confirmButtonColor"
      :icon="confirmDialog.icon"
      :confirm-text="confirmDialog.confirmText"
      :cancel-text="confirmDialog.cancelText"
      :loading="confirmDialog.loading"
      @confirm="confirmDialog.action"
    />
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionsStore } from '../stores/sessions'
import { useCasesStore } from '../stores/cases'
import { useSearch } from '../composables/useSearch'
import { safeArray, safeLength, valWithDefault } from '../utils/safe'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import { useConfirmDialog } from '../composables/useConfirmDialog'
import LucideIcon from '../components/common/LucideIcon.vue'
import { useMobileLayout } from '../composables/useMobileLayout'
import { setFabAction, clearFabAction } from '../composables/useFabAction'
import MobileSessions from '../components/mobile/MobileSessions.vue'
import SessionStatsCards from './sessions/SessionStatsCards.vue'
import SessionFilters from './sessions/SessionFilters.vue'
import SessionTableDesktop from './sessions/SessionTableDesktop.vue'
import SessionFormDialog from './sessions/SessionFormDialog.vue'

const route = useRoute()
const router = useRouter()
const store = useSessionsStore()
const casesStore = useCasesStore()

const { isMobile } = useMobileLayout()

const pageLoading = ref(true)

interface SortItem {
  key: string
  order?: 'asc' | 'desc'
}

const itemsPerPage = ref(10)
const serverOptions = ref<{ page: number; itemsPerPage: number; sortBy: SortItem[] }>({
  page: 1,
  itemsPerPage: 10,
  sortBy: []
})

async function loadItems(options: {
  page: number
  itemsPerPage: number
  sortBy: SortItem[]
}): Promise<void> {
  serverOptions.value = options
  const { page, itemsPerPage, sortBy } = options
  const params: Record<string, any> = {
    page,
    pageSize: itemsPerPage,
    sortDir: sortBy && sortBy.length > 0 && sortBy[0].order === 'desc' ? 'desc' : 'asc',
    q: search.value
  }
  if (startDate.value) params.from = startDate.value
  if (endDate.value) params.to = endDate.value
  const today = new Date().toLocaleDateString('en-CA')
  if (filterType.value === 'upcoming') {
    params.from = today
    params.sortDir = 'asc'
  } else if (filterType.value === 'recent') {
    params.to = today
    params.sortDir = 'desc'
  }
  try {
    await store.listSessions(params)
  } catch (e) {
    console.error('Failed to load sessions:', e)
  }
}

const caseOptions = computed(() => {
  return safeArray(casesStore.cases).map((c) => ({
    ...c,
    display: `${c.case_number} - ${c.client_name || 'بدون موكل'}`
  }))
})

const { search } = useSearch((val) => {
  store.setSearchQuery(val)
  serverOptions.value.page = 1
  loadItems(serverOptions.value)
}, store.searchQuery)

const filterType = ref('upcoming')
const startDate = ref('')
const endDate = ref('')

watch([filterType, startDate, endDate], () => {
  loadItems(serverOptions.value)
})

const resetFilters = (): void => {
  filterType.value = 'upcoming'
  startDate.value = ''
  endDate.value = ''
  search.value = ''
}

const showDialog = ref(false)
const isEditing = ref(false)
const editingItem = ref<any>(null)

const itemToDelete = ref<any>(null)

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const { confirmDialog, openConfirm, closeConfirm } = useConfirmDialog()

const openSessionRoom = (item: any): void => {
  const id = String(item?.id || '').trim()
  if (!id) return
  router.push({ path: '/session-room', query: { session_id: id } })
}

const openSessionRoomInNewWindow = (item: any): void => {
  const id = String(item?.id || '').trim()
  if (!id) return
  if ((window as any).api?.system?.openSessionWindow) {
    ;(window as any).api.system.openSessionWindow(id)
  } else {
    const routeUrl = router.resolve({
      path: '/session-room',
      query: { session_id: id, window: 'new' }
    })
    window.open(routeUrl.href, '_blank')
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      casesStore.fetchAllCases?.() || Promise.resolve(),
      loadAssignableUsers(),
      store.fetchTodaySessions?.() || Promise.resolve(),
      store.fetchTomorrowSessions?.() || Promise.resolve(),
      loadItems(serverOptions.value)
    ])
    if (route.query.new === '1') {
      setTimeout(() => {
        openAddDialog()
      }, 200)
      const q: any = { ...route.query }
      delete q.new
      router.replace({ path: route.path, query: q })
    }
    if (route.query.add_for) {
      setTimeout(() => {
        openAddDialog()
        editingItem.value = {
          case_id: route.query.add_for as string,
          type: 'مرافعة',
          status: 'قادمة'
        }
      }, 500)
    }
  } catch (error) {
    console.error('Initialization failed:', error)
  } finally {
    pageLoading.value = false
  }
  setFabAction('mdi-calendar-plus', openAddDialog, route.path)
})

onUnmounted(() => {
  clearFabAction()
})

const assignableUsers = ref<any[]>([])
const assignableUsersLoading = ref(false)
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

const openAddDialog = (): void => {
  if (safeLength(casesStore.cases) === 0) {
    showSnackbar('يرجى تسجيل قضية واحدة على الأقل قبل جدولة جلسة', 'error')
    return
  }
  isEditing.value = false
  editingItem.value = null
  showDialog.value = true
}

const openEditDialog = (item: any): void => {
  isEditing.value = true
  editingItem.value = { ...item }
  showDialog.value = true
}

const handleSave = async (data: any): Promise<void> => {
  try {
    if (isEditing.value) {
      await store.updateSession(data)
      showSnackbar('تم تحديث موعد الجلسة بنجاح')
    } else {
      await store.addSession(data)
      showSnackbar('تمت جدولة الجلسة بنجاح')
    }
    showDialog.value = false
    loadItems(serverOptions.value)
  } catch (error: any) {
    showSnackbar('فشل في حفظ البيانات: ' + error.message, 'error')
  }
}

const confirmDelete = (item: any): void => {
  itemToDelete.value = item
  openConfirm({
    title: 'شطب موعد الجلسة',
    message: `هل أنت متأكد من حذف الجلسة المجدولة بتاريخ ${item.date}؟ لا يمكن التراجع عن هذا الإجراء.`,
    color: 'error',
    confirmButtonColor: 'error',
    icon: 'trash-2',
    confirmText: 'تأكيد الحذف',
    cancelText: 'تراجع',
    action: async () => {
      if (!itemToDelete.value) return
      try {
        await store.deleteSession(itemToDelete.value.id)
        showSnackbar('تم شطب موعد الجلسة من السجلات')
        loadItems(serverOptions.value)
      } catch (error: any) {
        showSnackbar('فشل في الحذف: ' + error.message, 'error')
      } finally {
        closeConfirm()
      }
    }
  })
}

const showSnackbar = (text: string, color: string = 'success'): void => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

function openNajiz(link: string): void {
  if (link) window.open(link, '_blank')
}
</script>

<style scoped>
.sessions-table :deep(th) {
  background: rgba(197, 160, 40, 0.08) !important;
  color: var(--gold-royal) !important;
  font-weight: 950 !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 1.1rem !important;
  padding: 20px 16px !important;
  border-bottom: 2px solid var(--gold-royal) !important;
}

.sessions-table :deep(td) {
  padding: 16px !important;
  border-bottom: 1px solid rgba(197, 160, 40, 0.1) !important;
}

.hover-gold:hover {
  color: #e9c349 !important;
}

.modal-scrollable {
  max-height: calc(100vh - 280px);
  overflow-y: auto;
}

.min-h-500 {
  min-height: 500px;
}

.leading-relaxed {
  line-height: 1.6;
}

@media (max-width: 1023px) {
  .sessions-container {
    padding: 12px !important;
  }
  :deep(.v-btn-toggle) {
    flex-wrap: wrap !important;
    height: auto !important;
  }
  :deep(.v-btn-toggle .v-btn) {
    flex: 1 1 auto !important;
    min-width: 60px !important;
    font-size: 0.78rem !important;
  }
  :deep(.glass-card.mb-8.pa-6) {
    padding: 12px !important;
  }
}
</style>
