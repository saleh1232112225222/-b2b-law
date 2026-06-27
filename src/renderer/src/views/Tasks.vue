<template>
  <v-container fluid class="pa-6 pb-12 tasks-container">
    <MobileTasks
      v-if="isMobile"
      :items="mobileTasks"
      :loading="store.loading"
      @edit="openEditDialog"
      @add="openAddDialog"
    />
    <template v-else>
      <v-fade-transition hide-on-leave>
        <div v-if="!pageLoading">
          <!-- Header -->
          <v-row dense class="mb-8 align-center px-4">
            <v-col>
              <div class="d-flex align-center">
                <div
                  class="header-icon-box pa-4 rounded-xl glass-card-noir border-accent me-4 shadow-premium"
                >
                  <LucideIcon name="clipboard-check" :size="32" class="text-accent" />
                </div>
                <div>
                  <h1 class="text-h5 font-weight-black text-gold tracking-tight">
                    نظام المهام التنفيذية
                  </h1>
                  <p class="text-subtitle-1 text-gold opacity-60 font-weight-bold mt-1">
                    تتبع، إسناد، ومراقبة سير العمليات القانونية والإدارية اليومية
                  </p>
                </div>
              </div>
            </v-col>
            <v-col cols="12" md="auto" class="d-flex justify-md-end">
              <v-btn
                color="primary"
                variant="flat"
                size="large"
                class="font-weight-black rounded-xl px-8 shadow-premium premium-btn-glow w-100 w-md-auto premium-btn-gold-gradient"
                height="56"
                @click="openAddDialog"
              >
                <LucideIcon name="plus-circle" :size="20" class="me-2" />
                إضافة مهمة تشغيلية
              </v-btn>
            </v-col>
          </v-row>

          <TaskStatsCards :stats="store.stats" :loading="store.loading" />

          <!-- Search & Filters -->
          <TaskFilterBar
            v-model:search="search"
            v-model:filter-status="filterStatus"
            v-model:responsible-user-id="store.responsibleUserId"
            :status-items="statusItems"
            :assignable-users="safeArray(assignableUsers)"
            :assignable-users-loading="assignableUsersLoading"
            :loading="store.loading"
            @refresh="store.refresh"
          />

          <!-- Priority Kanban-ish View -->
          <v-row class="transition-all min-h-500">
            <v-col v-for="priority in store.PRIORITIES" :key="priority" cols="12" md="4">
              <v-card
                elevation="0"
                class="rounded-xl glass-card-noir border shadow-premium overflow-hidden h-100 d-flex flex-column border-top-accent glass-card"
              >
                <div
                  class="kanban-header pa-4 d-flex align-center justify-space-between"
                  :class="getHeaderBgClass(priority)"
                >
                  <div class="d-flex align-center">
                    <LucideIcon name="flame" :size="20" class="me-2 text-pure-black" />
                    <span class="text-pure-black text-subtitle-2 font-weight-black"
                      >أولوية {{ priority }}</span
                    >
                  </div>
                  <v-chip
                    size="x-small"
                    color="white"
                    class="font-weight-black text-pure-black px-3 rounded-lg"
                    variant="flat"
                  >
                    {{ safeLength(getTasksByPriority(priority)) }} /
                    {{ store.totalByPriority[priority] }} مهمة
                  </v-chip>
                </div>

                <v-card-text class="pa-4 flex-grow-1 bg-noir-surface overflow-y-auto glass-card">
                  <v-skeleton-loader
                    v-for="n in 3"
                    v-if="store.loadingByPriority[priority]"
                    :key="n"
                    type="list-item-three-line"
                    class="rounded-xl mb-3 border"
                  ></v-skeleton-loader>

                  <div
                    v-else-if="safeLength(getTasksByPriority(priority)) === 0"
                    class="text-center pa-10 text-grey-lighten-1 d-flex flex-column align-center"
                  >
                    <v-avatar
                      color="white"
                      size="80"
                      class="mb-4 shadow-sm border bg-primary-alpha"
                    >
                      <LucideIcon name="clipboard-check" :size="40" class="text-primary" />
                    </v-avatar>
                    <div class="text-caption font-weight-black text-primary">
                      أنجزت جميع المهام لهذا المسار
                    </div>
                  </div>

                  <TaskCard
                    v-for="task in safeArray(getTasksByPriority(priority))"
                    v-else
                    :key="task.id"
                    :task="task"
                    :can-cancel="canCancel"
                    :can-close="canClose"
                    :can-archive="canArchive"
                    :can-reopen="canReopen"
                    @edit="openEditDialog($event)"
                    @complete="confirmComplete($event)"
                    @cancel="openActionDialog('cancel', $event)"
                    @close="openActionDialog('close', $event)"
                    @archive="archiveTask($event)"
                    @reopen="openActionDialog('reopen', $event)"
                  />

                  <div v-if="store.hasMore(priority)" class="d-flex justify-center pt-2">
                    <v-btn
                      variant="tonal"
                      color="primary"
                      class="rounded-xl shadow-premium glass-card px-5 premium-btn-gold-gradient"
                      :loading="store.loadingByPriority[priority]"
                      @click="store.loadMore(priority)"
                    >
                      <LucideIcon name="plus" :size="18" class="me-2" />
                      <span class="font-weight-black">تحميل المزيد</span>
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>
      </v-fade-transition>
    </template>

      <!-- Dialogs -->
      <v-dialog v-model="showDialog" width="90%" max-width="800" persistent scrollable>
            <v-card class="rounded-xl elevation-24 overflow-hidden modal-card glass-card">
              <v-toolbar color="white" class="px-6 border-b" height="72">
                <div class="pa-2 rounded-lg bg-accent-alpha me-4">
                  <LucideIcon
                    :name="isEditing ? 'pencil' : 'list-plus'"
                    :size="24"
                    class="text-pure-black"
                  />
                </div>
                <v-toolbar-title class="font-weight-black text-pure-black">
                  {{
                    isEditing
                      ? 'تعديل تفاصيل المهمة التشغيلية'
                      : 'إسناد مهمة قانونية أو إدارية جديدة'
                  }}
                </v-toolbar-title>
                <v-spacer></v-spacer>
                <v-btn
                  class="premium-btn-gold-gradient"
                  icon
                  variant="text"
                  color="black"
                  @click="showDialog = false"
                >
                  <LucideIcon name="x" :size="24" />
                </v-btn>
              </v-toolbar>

              <v-card-text class="pa-8 bg-white modal-scrollable glass-card">
                <v-form ref="formRef" v-model="formValid">
                  <v-row>
                    <v-col cols="12">
                      <v-card
                        variant="tonal"
                        color="primary"
                        class="rounded-xl pa-5 border-dashed-primary overflow-hidden glass-card"
                      >
                        <label class="mb-2 font-weight-black text-gold">
                          <LucideIcon name="link-2" :size="20" class="text-primary me-2" />
                          إستراتيجية الربط والارتباط
                        </label>
                        <v-btn-toggle
                          v-model="editItem.link_type"
                          color="primary"
                          variant="flat"
                          class="rounded-xl w-100 shadow-sm overflow-hidden mb-4 border d-flex premium-btn-gold-gradient"
                          mandatory
                          @update:model-value="
                            () => ensureLinkOptionsLoaded(String(editItem.link_type || ''))
                          "
                        >
                          <v-btn
                            value="case"
                            class="flex-grow-1 font-weight-black border-e text-pure-black premium-btn-gold-gradient"
                            height="48"
                            >مرتبط بقضية</v-btn
                          >
                          <v-btn
                            value="client"
                            class="flex-grow-1 font-weight-black border-e text-pure-black premium-btn-gold-gradient"
                            height="48"
                            >مرتبط بموكل</v-btn
                          >
                          <v-btn
                            value="none"
                            class="flex-grow-1 font-weight-black text-pure-black premium-btn-gold-gradient"
                            height="48"
                            >مهمة عامة</v-btn
                          >
                        </v-btn-toggle>

                        <v-expand-transition>
                          <div class="mt-4" style="min-height: 85px">
                            <div v-if="editItem.link_type === 'case'">
                              <label class="mb-2 font-weight-black text-gold"
                                >اختيار ملف القضية المستهدف*</label
                              >
                              <v-autocomplete
                                v-model="editItem.case_id"
                                :items="safeArray(caseOptions)"
                                item-title="display"
                                item-value="id"
                                variant="outlined"
                                class="premium-select glass-input"
                                no-data-text="لا يوجد قضايا حالياً"
                                :rules="[(v) => !!v || 'القضية مطلوبة']"
                                :custom-filter="arabicFilter"
                                clearable
                              >
                                <template #prepend-inner>
                                  <LucideIcon name="gavel" :size="20" class="text-primary me-2" />
                                </template>
                              </v-autocomplete>
                            </div>
                            <div v-else-if="editItem.link_type === 'client'">
                              <label class="mb-2 font-weight-black text-gold"
                                >اختيار الموكل المسؤول*</label
                              >
                              <v-autocomplete
                                v-model="editItem.client_id"
                                :items="safeArray(clientOptions)"
                                item-title="name"
                                item-value="id"
                                variant="outlined"
                                class="premium-select glass-input"
                                no-data-text="لا يوجد عملاء مسجلين"
                                :rules="[(v) => !!v || 'العميل مطلوب']"
                                :custom-filter="arabicFilter"
                                clearable
                              >
                                <template #prepend-inner>
                                  <LucideIcon
                                    name="user-cog"
                                    :size="20"
                                    class="text-primary me-2"
                                  />
                                </template>
                              </v-autocomplete>
                            </div>
                            <div v-else-if="editItem.link_type === 'none'">
                              <v-row dense>
                                <v-col cols="12" md="8">
                                  <label class="mb-2 font-weight-black text-gold"
                                    >جهة التنفيذ المستهدفة</label
                                  >
                                  <v-text-field
                                    v-model="editItem.external_name"
                                    variant="outlined"
                                    class="premium-select glass-input"
                                    placeholder="مثال: المحكمة الكبرى، مكتب الخبير، البريد..."
                                  >
                                    <template #prepend-inner>
                                      <LucideIcon
                                        name="landmark"
                                        :size="20"
                                        class="text-primary me-2"
                                      />
                                    </template>
                                  </v-text-field>
                                </v-col>
                                <v-col cols="12" md="4">
                                  <v-select
                                    v-model="editItem.owner_type"
                                    class="glass-input"
                                    :items="[
                                      { title: 'مهمة داخلية للمكتب', value: 'office' },
                                      { title: 'مهمة متابعة خارجية', value: 'external' }
                                    ]"
                                    label="نطاق المهمة"
                                    variant="outlined"
                                  ></v-select>
                                </v-col>
                              </v-row>
                            </div>
                          </div>
                        </v-expand-transition>
                      </v-card>
                    </v-col>

                    <v-col cols="12" md="6">
                      <label class="mb-2 font-weight-black text-gold">مسؤول المهمة</label>
                      <v-select
                        v-model="editItem.responsible_user_id"
                        :items="assignableUsers"
                        :item-title="getUserDisplayName"
                        item-value="id"
                        variant="outlined"
                        class="premium-select glass-input"
                        clearable
                        :loading="assignableUsersLoading"
                      >
                        <template #prepend-inner>
                          <LucideIcon name="user-cog" :size="20" class="text-primary me-2" />
                        </template>
                      </v-select>
                    </v-col>

                    <v-col cols="12">
                      <label class="mb-2 font-weight-black text-gold">عنوان المهمة التشغيلي*</label>
                      <v-text-field
                        v-model="editItem.title"
                        placeholder="مثال: تقديم لائحة جوابية، استخراج صك اعالة..."
                        variant="outlined"
                        class="premium-select glass-input"
                        :rules="[(v) => !!v || 'عنوان المهمة مطلوب']"
                        required
                      >
                        <template #prepend-inner>
                          <LucideIcon name="bookmark" :size="20" class="text-primary me-2" />
                        </template>
                      </v-text-field>
                    </v-col>

                    <v-col cols="12">
                      <label class="mb-2 font-weight-black text-gold"
                        >تفاصيل التنفيذ والملاحظات</label
                      >
                      <v-textarea
                        v-model="editItem.description"
                        variant="outlined"
                        class="premium-select"
                        rows="2"
                      >
                        <template #prepend-inner>
                          <LucideIcon name="file-search" :size="20" class="text-primary me-2" />
                        </template>
                      </v-textarea>
                    </v-col>

                    <v-col cols="12" md="6">
                      <label class="mb-2 font-weight-black text-gold">درجة الاستعجال*</label>
                      <v-select
                        v-model="editItem.priority"
                        :items="['عالية', 'متوسطة', 'منخفضة']"
                        variant="outlined"
                        class="premium-select glass-input"
                        required
                      >
                        <template #prepend-inner>
                          <LucideIcon name="flame" :size="20" class="text-primary me-2" />
                        </template>
                      </v-select>
                    </v-col>
                    <v-col cols="12" md="6">
                      <label class="mb-2 font-weight-black text-gold">موعد التسليم النهائي*</label>
                      <DualDatePicker v-model="editItem.due_date" />
                    </v-col>

                    <v-col cols="12">
                      <v-card
                        variant="flat"
                        class="rounded-xl pa-5 border bg-white shadow-sm overflow-hidden glass-card"
                      >
                        <label class="mb-2 font-weight-black text-gold">
                          <LucideIcon name="clipboard-check" :size="20" class="text-success me-2" />
                          مخرجات العمل
                        </label>

                        <div
                          v-if="!editItem.id"
                          class="text-caption font-weight-black text-grey-darken-2"
                        >
                          احفظ المهمة أولاً لإضافة مخرجات العمل
                        </div>

                        <div v-else>
                          <div class="d-flex align-center justify-space-between flex-wrap gap-2">
                            <v-btn
                              color="success"
                              variant="flat"
                              class="font-weight-black rounded-xl px-6 shadow-premium premium-btn-gold-gradient"
                              :loading="taskDocsUploading"
                              @click="uploadWorkOutput"
                            >
                              <LucideIcon name="upload" :size="18" class="me-2" />
                              رفع مستند للمهمة
                            </v-btn>

                            <v-chip
                              size="small"
                              color="success"
                              variant="tonal"
                              class="font-weight-black rounded-lg"
                            >
                              {{ safeLength(taskDocuments) }} مستند
                            </v-chip>
                          </div>

                          <v-skeleton-loader
                            v-if="taskDocsLoading"
                            class="mt-4"
                            type="list-item-two-line, list-item-two-line"
                          />

                          <div
                            v-else-if="safeLength(taskDocuments) === 0"
                            class="mt-4 text-caption font-weight-black text-grey-darken-2"
                          >
                            لا توجد مخرجات عمل مرتبطة بهذه المهمة
                          </div>

                          <v-list v-else class="mt-4 rounded-xl border" density="compact">
                            <v-list-item v-for="doc in safeArray(taskDocuments)" :key="doc.id">
                              <v-list-item-title class="font-weight-black">{{
                                doc.name
                              }}</v-list-item-title>
                              <v-list-item-subtitle class="font-weight-bold">{{
                                doc.created_at ? formatDate(String(doc.created_at)) : ''
                              }}</v-list-item-subtitle>
                              <template #append>
                                <v-btn
                                  icon
                                  size="x-small"
                                  variant="tonal"
                                  color="primary"
                                  class="rounded-lg premium-btn-gold-gradient"
                                  @click="openWorkOutput(doc)"
                                >
                                  <LucideIcon name="external-link" :size="14" />
                                </v-btn>
                              </template>
                            </v-list-item>
                          </v-list>
                        </div>
                      </v-card>
                    </v-col>

                    <v-col v-if="canViewTaskAudit" cols="12">
                      <v-card
                        variant="flat"
                        class="rounded-xl pa-5 border bg-white shadow-sm overflow-hidden glass-card"
                      >
                        <label class="mb-2 font-weight-black text-gold">
                          <LucideIcon name="shield-check" :size="20" class="text-primary me-2" />
                          سجل التدقيق
                        </label>

                        <div
                          v-if="!editItem.id"
                          class="text-caption font-weight-black text-grey-darken-2"
                        >
                          احفظ المهمة أولاً لعرض سجل التدقيق
                        </div>

                        <div v-else>
                          <v-skeleton-loader
                            v-if="taskAuditLoading"
                            class="mt-2"
                            type="list-item-two-line, list-item-two-line"
                          />

                          <div
                            v-else-if="safeLength(taskAuditItems) === 0"
                            class="text-caption font-weight-black text-grey-darken-2"
                          >
                            لا توجد سجلات تدقيق لهذه المهمة
                          </div>

                          <v-list v-else class="mt-3 rounded-xl border" density="compact">
                            <v-list-item v-for="row in safeArray(taskAuditItems)" :key="row.id">
                              <v-list-item-title class="font-weight-black">
                                {{ auditActionLabel(String(row.action_key || '')) }}
                                <span v-if="row.actor_name"> — {{ row.actor_name }}</span>
                              </v-list-item-title>
                              <v-list-item-subtitle class="font-weight-bold">
                                {{ row.created_at ? formatDate(String(row.created_at)) : '' }}
                                <span v-if="auditStatusText(row)">
                                  — {{ auditStatusText(row) }}</span
                                >
                              </v-list-item-subtitle>
                            </v-list-item>
                          </v-list>
                        </div>
                      </v-card>
                    </v-col>
                  </v-row>
                </v-form>
              </v-card-text>

              <v-divider></v-divider>
              <v-card-actions class="pa-8 modal-footer-solid modal-footer-sticky glass-card">
                <v-btn
                  variant="outlined"
                  color="gold"
                  size="large"
                  class="px-12 font-weight-black btn1-unified action-btn-unified h-56 premium-btn-gold-gradient"
                  @click="showDialog = false"
                  >إلغاء</v-btn
                >
                <v-spacer></v-spacer>
                <v-btn
                  variant="outlined"
                  color="gold"
                  size="large"
                  class="px-12 font-weight-black btn1-unified action-btn-unified h-56 premium-btn-gold-gradient"
                  :disabled="!formValid"
                  :loading="saving"
                  @click="handleSave"
                >
                  {{ isEditing ? 'تحديث المهمة' : 'اعتماد الإحالة' }}
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>

          <!-- Success Snackbar -->
          <v-snackbar v-model="snackbar" :color="snackbarColor" rounded="pill" elevation="12">
            <div class="d-flex align-center">
              <LucideIcon
                :name="snackbarColor === 'success' ? 'check-circle' : 'alert-circle'"
                :size="20"
                class="me-2"
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

          <TaskActionDialog
            v-model="actionDialog.show"
            :title="actionDialogTitle"
            :label="actionDialogLabel"
            :loading="actionDialog.loading"
            @confirm="confirmActionDialog"
          />
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTasksStore } from '../stores/tasks'
import { useCasesStore } from '../stores/cases'
import { useClientsStore } from '../stores/clients'
import { Task } from '../types/task'
import { safeArray, safeLength, isValidDate } from '../utils/safe'
import { useSearch } from '../composables/useSearch'
import DualDatePicker from '../components/DualDatePicker.vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import TaskActionDialog from './tasks/TaskActionDialog.vue'
import TaskCard from './tasks/TaskCard.vue'
import { useConfirmDialog } from '../composables/useConfirmDialog'
import TaskStatsCards from './tasks/TaskStatsCards.vue'
import LucideIcon from '../components/common/LucideIcon.vue'
import TaskFilterBar from './tasks/TaskFilterBar.vue'
import { usePermissions } from '../composables/usePermissions'
import { useMobileLayout } from '../composables/useMobileLayout'
import MobileTasks from '../components/mobile/MobileTasks.vue'

const store = useTasksStore()
const casesStore = useCasesStore()
const clientsStore = useClientsStore()
const route = useRoute()
const router = useRouter()
const { isMobile } = useMobileLayout()
const clientOptions = computed(() => safeArray(clientsStore.clients))

const mobileTasks = computed(() => {
  const all: any[] = []
  for (const p of ['عالية', 'متوسطة', 'منخفضة'] as const) {
    all.push(...safeArray((store.itemsByPriority as any)[p]))
  }
  return all
})

const { search } = useSearch((val) => {
  store.setSearchQuery(val)
  store.refresh()
}, store.searchQuery)

const filterStatus = ref('in_progress')

const statusItems = [
  { title: 'مسودة', value: 'draft' },
  { title: 'مجدولة', value: 'scheduled' },
  { title: 'قيد التنفيذ', value: 'in_progress' },
  { title: 'بانتظار طرف', value: 'waiting' },
  { title: 'معلقة', value: 'blocked' },
  { title: 'مكتملة', value: 'completed' },
  { title: 'مغلقة', value: 'closed' },
  { title: 'ملغاة', value: 'cancelled' },
  { title: 'الكل', value: 'all' }
]

const caseOptions = computed(() => {
  return safeArray(casesStore.cases).map((c) => ({
    ...c,
    display: `${c.case_number} - ${c.client_name || 'بدون موكل'}`
  }))
})

const showDialog = ref(false)
const isEditing = ref(false)
const formValid = ref(false)
const formRef = ref<any>(null)
const saving = ref(false)

const defaultItem: Task = {
  title: '',
  description: '',
  priority: 'متوسطة',
  due_date: new Date().toISOString().split('T')[0],
  status: 'draft',
  link_type: 'case',
  owner_type: 'office'
}

const editItem = ref<Partial<Task>>({ ...defaultItem })

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const { confirmDialog, openConfirm, closeConfirm } = useConfirmDialog()

const taskDocuments = ref<any[]>([])
const taskDocsLoading = ref(false)
const taskDocsUploading = ref(false)

const { can } = usePermissions()
const canCancel = computed(() => can('cancel_tasks'))
const canClose = computed(() => can('close_tasks'))
const canArchive = computed(() => can('edit_tasks'))
const canReopen = computed(() => can('reopen_tasks'))
const canViewTaskAudit = computed(() => can('view_task_audit'))

const taskAuditItems = ref<any[]>([])
const taskAuditLoading = ref(false)
const taskAuditTotal = ref(0)

const auditActionLabel = (k: string): string => {
  const s = String(k || '').trim()
  if (s === 'close') return 'إقفال'
  if (s === 'cancel') return 'إلغاء'
  if (s === 'reopen') return 'إعادة فتح'
  if (s === 'transition') return 'تغيير حالة'
  return 'إجراء'
}

const statusLabel = (k: string): string => {
  const s = String(k || '').trim()
  if (!s) return ''
  const found = statusItems.find((x) => x.value === (s as any))
  if (found?.title) return found.title
  if (s === 'pending') return 'قيد التنفيذ'
  return s
}

const auditStatusText = (row: any): string => {
  try {
    const before = row?.before_json ? JSON.parse(String(row.before_json)) : null
    const afterWrap = row?.after_json ? JSON.parse(String(row.after_json)) : null
    const after = afterWrap?.after || null
    const from = before?.status ? String(before.status) : ''
    const to = after?.status ? String(after.status) : ''
    const fromAr = statusLabel(from)
    const toAr = statusLabel(to)
    if (!from && !to) return ''
    if (from && to && from !== to) return `من ${fromAr || from} إلى ${toAr || to}`
    return to ? `الحالة: ${toAr || to}` : `الحالة: ${fromAr || from}`
  } catch {
    return ''
  }
}

const loadTaskAudit = async (taskId: string): Promise<void> => {
  if (taskAuditLoading.value) return
  taskAuditLoading.value = true
  try {
    taskAuditTotal.value = await window.api.tasks.auditCount(taskId)
    taskAuditItems.value = await window.api.tasks.auditList(taskId, { page: 1, pageSize: 50 })
  } catch {
    taskAuditItems.value = []
    taskAuditTotal.value = 0
  } finally {
    taskAuditLoading.value = false
  }
}

const pickDefaultStatusByLinkType = (linkType: string | undefined): string => {
  const t = String(linkType || '').trim()
  if (t === 'case' || t === 'session') return 'scheduled'
  if (t === 'client' || t === 'none') return 'draft'
  return 'draft'
}

const loadTaskDocuments = async (taskId: string): Promise<void> => {
  if (taskDocsLoading.value) return
  taskDocsLoading.value = true
  try {
    taskDocuments.value = await window.api.documents.getByTaskId(taskId)
  } catch {
    taskDocuments.value = []
  } finally {
    taskDocsLoading.value = false
  }
}

const uploadWorkOutput = async (): Promise<void> => {
  const taskId = String(editItem.value?.id || '').trim()
  if (!taskId) return
  taskDocsUploading.value = true
  try {
    await window.api.documents.upload({
      linkType: 'task',
      parentId: taskId,
      linkedTitle: String(editItem.value?.title || '').trim() || undefined
    })
    await loadTaskDocuments(taskId)
    showSnackbar('تم رفع المستند وربطه بالمهمة', 'success')
  } catch (err: unknown) {
    showSnackbar('تعذر رفع المستند: ' + (err as Error).message, 'error')
  } finally {
    taskDocsUploading.value = false
  }
}

const openWorkOutput = async (doc: any): Promise<void> => {
  const p = String(doc?.file_path || '').trim()
  if (!p) return
  try {
    await window.api.documents.open(p)
  } catch (err: unknown) {
    showSnackbar('تعذر فتح المستند: ' + (err as Error).message, 'error')
  }
}

const actionDialog = ref<{
  show: boolean
  mode: 'cancel' | 'close' | 'reopen'
  taskId: string | null
  text: string
  loading: boolean
}>({
  show: false,
  mode: 'cancel',
  taskId: null,
  text: '',
  loading: false
})

const actionDialogTitle = computed(() => {
  if (actionDialog.value.mode === 'close') return 'إقفال المهمة'
  if (actionDialog.value.mode === 'reopen') return 'إعادة فتح المهمة'
  return 'إلغاء المهمة'
})

const actionDialogLabel = computed(() => {
  if (actionDialog.value.mode === 'close') return 'ملاحظة الإقفال'
  if (actionDialog.value.mode === 'reopen') return 'سبب إعادة الفتح'
  return 'سبب الإلغاء'
})

const assignableUsersLoading = ref(false)
const assignableUsers = ref<
  Array<{ id: string; username: string; full_name?: string; role_key: string }>
>([])
const getUserDisplayName = (u: any) => String(u?.full_name || u?.username || '')
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

onMounted(() => {
  store.setStatusFilter(filterStatus.value as any)
  store.refresh()
  loadAssignableUsers()

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
      if (editItem.value) {
        editItem.value.link_type = 'case'
        editItem.value.case_id = route.query.add_for as string
        if (route.query.title) editItem.value.title = route.query.title as string
        editItem.value.priority = 'عالية'
      }
    }, 500)
  }
})

watch([showDialog, () => String((editItem.value as any)?.id || '').trim()], async ([open, id]) => {
  if (!open) {
    taskDocuments.value = []
    taskAuditItems.value = []
    taskAuditTotal.value = 0
    return
  }
  if (id) {
    await loadTaskDocuments(id)
    if (canViewTaskAudit.value) await loadTaskAudit(id)
    else {
      taskAuditItems.value = []
      taskAuditTotal.value = 0
    }
  } else {
    taskDocuments.value = []
    taskAuditItems.value = []
    taskAuditTotal.value = 0
  }
})

const getTasksByPriority = (p: string): Task[] => safeArray((store.itemsByPriority as any)[p])

watch(filterStatus, async (val) => {
  store.setStatusFilter(val as any)
  await store.refresh()
})

const ensureLinkOptionsLoaded = async (linkType: string | undefined): Promise<void> => {
  if (linkType === 'case') {
    if (!safeLength(casesStore.cases) && !casesStore.loading) await casesStore.fetchAllCases()
  } else if (linkType === 'client') {
    if (!safeLength(clientsStore.clients) && !clientsStore.loading)
      await clientsStore.fetchAllClients()
  }
}

const getHeaderBgClass = (p: string): string => {
  switch (p) {
    case 'عالية':
      return 'bg-red-premium'
    case 'متوسطة':
      return 'bg-amber-premium'
    case 'منخفضة':
      return 'bg-blue-premium'
    default:
      return 'bg-grey-premium'
  }
}

const getLinkColor = (type: string | undefined): string => {
  switch (type) {
    case 'case':
      return 'indigo'
    case 'client':
      return 'teal'
    default:
      return 'blue-grey'
  }
}

const getLinkName = (type: string | undefined): string => {
  switch (type) {
    case 'case':
      return 'بالقضية'
    case 'client':
      return 'بالموكل'
    default:
      return 'مكتبية'
  }
}

const pageLoading = ref(false)

const openAddDialog = (): void => {
  isEditing.value = false
  editItem.value = { ...defaultItem, status: pickDefaultStatusByLinkType(defaultItem.link_type) }
  showDialog.value = true
  ensureLinkOptionsLoaded(String(editItem.value.link_type || ''))
}

const openEditDialog = (task: Task): void => {
  if (!task) return
  isEditing.value = true
  editItem.value = JSON.parse(JSON.stringify(task))
  ensureLinkOptionsLoaded(String(editItem.value.link_type || ''))
  showDialog.value = true
}

const confirmComplete = (task: Task): void => {
  openConfirm({
    title: 'تأكيد إكمال المهمة',
    message: `هل تريد اعتماد إكمال المهمة التالية؟\n${task.title || ''}`,
    color: 'success',
    confirmButtonColor: 'success',
    icon: 'check-circle',
    confirmText: 'نعم، أكمل',
    cancelText: 'تراجع',
    action: async () => {
      confirmDialog.value.loading = true
      try {
        await store.transitionTask(String(task.id), 'completed')
        showSnackbar('تم إكمال المهمة', 'success')
        closeConfirm()
      } catch (err: unknown) {
        showSnackbar('تعذر إكمال المهمة: ' + (err as Error).message, 'error')
      } finally {
        confirmDialog.value.loading = false
      }
    }
  })
}

const executeSave = async (): Promise<void> => {
  if (!formRef.value) return
  const { valid } = await formRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const payload = { ...editItem.value }
    if (payload.link_type === 'none') {
      payload.case_id = null
      payload.client_id = null
    } else {
      if (payload.link_type === 'case') payload.client_id = null
      if (payload.link_type === 'client') payload.case_id = null
    }

    if (isEditing.value && payload.id) {
      await store.updateTask(payload.id, payload)
      showSnackbar('تم تحديث المهمة التشغيلية بنجاح', 'success')
    } else {
      await store.addTask(payload)
      showSnackbar('تم إدراج المهمة في دورة العمل بنجاح', 'success')
    }
    showDialog.value = false
  } catch (err: unknown) {
    showSnackbar('خطأ في أرشفة المهمة: ' + (err as Error).message, 'error')
  } finally {
    saving.value = false
  }
}

const handleSave = async (): Promise<void> => {
  openConfirm({
    title: isEditing.value ? 'تأكيد تعديل المهمة' : 'تأكيد اعتماد المهمة',
    message: isEditing.value
      ? 'هل أنت متأكد من رغبتك في حفظ التعديلات على هذه المهمة التشغيلية؟'
      : 'هل أنت متأكد من رغبتك في اعتماد وإسناد هذه المهمة التشغيلية؟',
    color: 'success',
    confirmButtonColor: 'success',
    icon: 'check-circle',
    confirmText: 'نعم، احفظ',
    cancelText: 'تراجع',
    action: async () => {
      confirmDialog.value.loading = true
      try {
        await executeSave()
        closeConfirm()
      } finally {
        confirmDialog.value.loading = false
      }
    }
  })
}

const openActionDialog = (mode: 'cancel' | 'close' | 'reopen', task: Task): void => {
  actionDialog.value.mode = mode
  actionDialog.value.taskId = String(task.id || '')
  actionDialog.value.text = ''
  actionDialog.value.show = true
}

const closeActionDialog = (): void => {
  actionDialog.value.show = false
  actionDialog.value.taskId = null
  actionDialog.value.text = ''
  actionDialog.value.loading = false
}

const confirmActionDialog = async (): Promise<void> => {
  const id = String(actionDialog.value.taskId || '').trim()
  if (!id) return
  actionDialog.value.loading = true
  try {
    const text = String(actionDialog.value.text || '').trim()
    if (!text) {
      showSnackbar('البيان مطلوب قبل المتابعة', 'error')
      return
    }
    if (actionDialog.value.mode === 'cancel') {
      await store.transitionTask(id, 'cancelled', { reason: text })
      showSnackbar('تم إلغاء المهمة', 'success')
    } else if (actionDialog.value.mode === 'close') {
      await store.transitionTask(id, 'closed', { note: text })
      showSnackbar('تم إقفال المهمة', 'success')
    } else {
      await store.transitionTask(id, 'in_progress', { reason: text })
      showSnackbar('تمت إعادة فتح المهمة', 'success')
    }
    closeActionDialog()
  } catch (err: unknown) {
    showSnackbar('تعذر تنفيذ الإجراء: ' + (err as Error).message, 'error')
  } finally {
    actionDialog.value.loading = false
  }
}

const archiveTask = async (task: Task): Promise<void> => {
  try {
    await window.api.archive.toggle('task', String(task.id), true)
    await store.refresh()
    showSnackbar('تمت أرشفة المهمة', 'success')
  } catch (err: unknown) {
    showSnackbar('تعذر أرشفة المهمة: ' + (err as Error).message, 'error')
  }
}

const formatDate = (date: string): string => {
  if (!isValidDate(date)) return '-'
  return new Date(date).toLocaleDateString('ar-SA')
}

const isOverdue = (date: string, status: string): boolean => {
  if (!isValidDate(date) || status === 'completed') return false
  return new Date(date) < new Date()
}

const arabicFilter = (itemTitle: string, queryText: string): boolean => {
  const normalize = (s: string): string =>
    s.replace(/[أإآ]/g, 'ا').replace(/[ة]/g, 'ه').replace(/[ى]/g, 'ي').toLowerCase()
  return normalize(itemTitle || '').includes(normalize(queryText || ''))
}

const showSnackbar = (text: string, color: string = 'success'): void => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

onUnmounted(() => {
  store.setSearchQuery('')
})
</script>

<style scoped>
.tasks-filter-toggle :deep(.v-btn) {
  color: rgba(255, 255, 255, 0.72);
}

.tasks-filter-toggle :deep(.v-btn__content) {
  opacity: 1;
}

.tasks-filter-toggle :deep(.v-btn--active) {
  color: #0c0e14;
}
</style>

<style scoped>
.tasks-container {
  min-height: 100vh;
  background: transparent !important;
}

.header-icon-box {
  transition: var(--transition-premium);
}

.glass-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border) !important;
}

.glass-card-noir {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.premium-hover:hover {
  transform: translateY(-6px);
  border-color: var(--accent) !important;
  box-shadow: var(--shadow-premium);
  background: rgba(255, 255, 255, 0.02);
}

.premium-btn-glow {
  box-shadow: 0 10px 30px var(--accent-glow);
  transition: var(--transition-premium);
}
.premium-btn-glow:hover {
  transform: scale(1.02);
  box-shadow: 0 15px 40px var(--accent-glow);
}

.kanban-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.bg-red-premium {
  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
}
.bg-amber-premium {
  background: linear-gradient(135deg, #d4af37 0%, #a1843b 100%);
}
.bg-blue-premium {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

.bg-primary-alpha {
  background: rgba(212, 175, 55, 0.1);
}
.bg-accent-alpha {
  background: rgba(212, 175, 55, 0.1);
}
.bg-success-alpha {
  background: rgba(34, 197, 94, 0.08);
}

.border-top-accent {
  border-top: 3px solid var(--accent) !important;
}

.tracking-tight {
  letter-spacing: -0.025em;
}
.tracking-widest {
  letter-spacing: 0.1em;
}
.uppercase {
  text-transform: uppercase;
}
.text-text-muted {
  color: #000000 !important;
}
.leading-relaxed {
  line-height: 1.625;
}

.h-56 {
  height: 56px !important;
}
.h-48 {
  height: 48px !important;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.opacity-40 {
  opacity: 0.4;
}
.grayscale {
  filter: grayscale(80%);
}

.modal-card {
  background: #ffffff !important;
  border: 1px solid rgba(233, 195, 73, 0.4) !important;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2) !important;
}

.text-pure-black {
  color: #000000 !important;
  opacity: 1 !important;
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

.modal-footer-solid {
  background: #ffffff !important;
  opacity: 1 !important;
  border-top: 1px solid rgba(233, 195, 73, 0.2) !important;
}

.action-btn-unified {
  min-width: 180px !important;
}

.premium-button-highlight.v-btn--disabled {
  background: #f5f5f5 !important;
  color: #9e9e9e !important;
  border-color: #e0e0e0 !important;
  opacity: 1 !important;
}

.btn1-unified {
  border: 1px solid rgba(233, 195, 73, 0.82) !important;
  background: transparent !important;
  border-radius: 12px !important;
  min-height: 36px !important;
  box-shadow: none !important;
  transform: none !important;
}

.btn1-unified:hover {
  background: rgba(233, 195, 73, 0.08) !important;
  border-color: rgba(233, 195, 73, 0.95) !important;
}

:deep(.v-btn-toggle .v-btn) {
  border-color: rgba(233, 195, 73, 0.3) !important;
}

:deep(.v-btn-toggle .v-btn--active) {
  background-color: #fff9c4 !important;
  color: #000000 !important;
  border: 1px solid #000000 !important;
}

:deep(.v-field__input),
:deep(.v-field__display),
:deep(.v-select__selection-text),
:deep(.v-label) {
  color: #000000 !important;
  opacity: 1 !important;
  font-weight: 700 !important;
}

:deep(.v-field__outline) {
  --v-field-border-opacity: 0.4 !important;
  color: #000000 !important;
}

/* ---- Mobile responsive ---- */
@media (max-width: 768px) {
  .tasks-container {
    padding: 12px !important;
  }

  .tasks-container .v-row.mb-8.align-center.px-4 {
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  .tasks-container .v-row.mb-8.align-center .v-col:first-child {
    flex: 1 1 auto;
  }

  .tasks-container .v-row.mb-8.align-center .v-col-md-auto {
    flex: 0 0 100%;
    margin-top: 12px;
  }

  .tasks-container .v-row.mb-8.align-center .v-col-md-auto .v-btn {
    width: 100%;
  }

  .header-icon-box {
    width: 48px !important;
    height: 48px !important;
    padding: 12px !important;
  }

  .header-icon-box :deep(.lucide-icon) {
    width: 24px !important;
    height: 24px !important;
  }

  .text-h5 {
    font-size: 1.1rem !important;
  }

  .text-subtitle-1 {
    font-size: 0.8rem !important;
  }

  /* Stack kanban columns */
  :deep(.v-row.min-h-500 .v-col-md-4) {
    flex: 0 0 100% !important;
    max-width: 100% !important;
  }

  /* Stack stat cards */
  :deep(.v-row.mb-8 .v-col-md-4) {
    flex: 0 0 100% !important;
    max-width: 100% !important;
  }

  /* Stack search/filter columns */
  :deep(.rounded-xl.mb-8.pa-5 .v-row .v-col-md-4),
  :deep(.rounded-xl.mb-8.pa-5 .v-row .v-col-md-3) {
    flex: 0 0 100% !important;
    max-width: 100% !important;
  }

  :deep(.rounded-xl.mb-8.pa-5 .v-row .v-col-auto) {
    flex: 0 0 auto;
    margin-top: 8px;
  }

  :deep(.rounded-xl.mb-8.pa-5) {
    padding: 12px !important;
  }

  /* Task card improvements */
  :deep(.rounded-xl.mb-4.pa-5) {
    padding: 12px !important;
  }

  :deep(.kanban-header.pa-4) {
    padding: 12px !important;
  }

  :deep(.kanban-header .text-subtitle-2) {
    font-size: 0.9rem !important;
  }
}

/* ---- Tablet responsive ---- */
@media (min-width: 768px) and (max-width: 1024px) {
  :deep(.v-row.min-h-500 .v-col-md-4) {
    flex: 0 0 100% !important;
    max-width: 100% !important;
  }
}
</style>
