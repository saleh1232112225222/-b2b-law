<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <UserHeader @create="openCreate = true" />

    <UsersTable :users="users" :roles="roles" :loading="loading" :is-admin="isAdmin" @toggle-active="toggleActive" @edit-username="openUsernameEdit" @edit-permissions="(id) => { selectedUserId = id; openPerms = true }" @edit-recovery="openRecoveryEdit" @edit-scope="(id) => { selectedUserId = id; openScope = true }" @delete-user="deleteUser" @set-role="setRole" />

    <EditUsernameDialog :show="usernameDialog.show" :user-id="usernameDialog.userId" :old-username="usernameDialog.oldUsername" @update:show="usernameDialog.show = $event" @done="loadUsers" />

    <CreateUserDialog :show="openCreate" :roles="roles" @update:show="openCreate = $event" @done="loadUsers" />

    <PermissionsOverridesDialog :show="openPerms" :selected-user-id="selectedUserId" @update:show="openPerms = $event" @done="loadUsers" />

    <ScopeManagementDialog :show="openScope" :selected-user-id="selectedUserId" @update:show="openScope = $event" @done="loadUsers" />

    <RecoveryInfoDialog :show="recoveryDialog.show" :user-id="recoveryDialog.userId" :username="recoveryDialog.username" @update:show="recoveryDialog.show = $event" @done="loadUsers" />

    <PremiumConfirm v-model="confirmDialog.show" :title="confirmDialog.title" :message="confirmDialog.message" :color="confirmDialog.color" :confirm-button-color="confirmDialog.confirmButtonColor" :icon="confirmDialog.icon" :confirm-text="confirmDialog.confirmText" :cancel-text="confirmDialog.cancelText" :loading="confirmDialog.loading" @confirm="confirmDialog.action" />
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { usePermissions } from '../composables/usePermissions'
import { safeArray, safeLength } from '../utils/safe'
import PremiumConfirm from '../components/common/PremiumConfirm.vue'
import { useAppStore } from '../stores/app'
import UserHeader from './users/UserHeader.vue'
import UsersTable from './users/UsersTable.vue'
import EditUsernameDialog from './users/EditUsernameDialog.vue'
import CreateUserDialog from './users/CreateUserDialog.vue'
import PermissionsOverridesDialog from './users/PermissionsOverridesDialog.vue'
import ScopeManagementDialog from './users/ScopeManagementDialog.vue'
import RecoveryInfoDialog from './users/RecoveryInfoDialog.vue'

const appStore = useAppStore()

const roles = [
  { title: 'مدير النظام (Admin)', value: 'admin' },
  { title: 'سكرتير/مساعد', value: 'secretary' },
  { title: 'محامي مرخص', value: 'licensed_lawyer' },
  { title: 'محامي متدرب', value: 'trainee_lawyer' }
]

const loading = ref(false)
const users = ref<any[]>([])

const { session } = usePermissions()
const isAdmin = computed(() => session.value?.roleKey === 'admin')

const openCreate = ref(false)
const openPerms = ref(false)
const openScope = ref(false)
const selectedUserId = ref<string | null>(null)

const usernameDialog = ref({ show: false, userId: '', oldUsername: '' })
const openUsernameEdit = (u: any) => {
  usernameDialog.value = { show: true, userId: u.id, oldUsername: u.username }
}

const recoveryDialog = ref({ show: false, userId: '', username: '' })
const openRecoveryEdit = (u: any) => {
  recoveryDialog.value = { show: true, userId: u.id, username: u.username }
}

const confirmDialog = ref({
  show: false, title: '', message: '', color: 'primary',
  confirmButtonColor: 'primary', icon: 'alert-circle',
  confirmText: 'موافق', cancelText: 'إلغاء الأمر',
  loading: false, action: () => {}
})

const openConfirm = (options: { title: string; message: string; color?: string; confirmButtonColor?: string; icon?: string; confirmText?: string; cancelText?: string; action: () => void }) => {
  confirmDialog.value = { show: true, title: options.title, message: options.message, color: options.color || 'primary', confirmButtonColor: options.confirmButtonColor || 'primary', icon: options.icon || 'alert-circle', confirmText: options.confirmText || 'موافق', cancelText: options.cancelText || 'إلغاء الأمر', loading: false, action: options.action }
}

const loadUsers = async (): Promise<void> => {
  loading.value = true
  try {
    users.value = safeArray(await (window as any).api.users.getAll())
  } catch (e: unknown) {
    console.error('Failed to load users:', e)
  } finally {
    loading.value = false
  }
}

const toggleActive = async (userId: string, isActive: boolean): Promise<void> => {
  try {
    await (window as any).api.users.toggleActive(userId, isActive)
    appStore.markChanges()
    await loadUsers()
  } catch (e: unknown) {
    console.error('Failed to toggle active state:', e)
  }
}

const deleteUser = async (userId: string): Promise<void> => {
  const u = users.value.find((x) => x.id === userId)
  openConfirm({
    title: 'تأكيد حذف المستخدم نهائياً',
    message: `هل أنت متأكد من حذف المستخدم نهائياً؟\n${u?.username || ''}`,
    color: 'error', confirmButtonColor: 'error', icon: 'user-x',
    confirmText: 'حذف نهائي', cancelText: 'إلغاء',
    action: async () => {
      confirmDialog.value.loading = true
      try {
        await (window as any).api.users.delete(userId)
        appStore.markChanges()
        await loadUsers()
        confirmDialog.value.show = false
      } catch (e: unknown) {
        console.error('Failed to delete user:', e)
      } finally {
        confirmDialog.value.loading = false
      }
    }
  })
}

const setRole = async (userId: string, roleKey: string): Promise<void> => {
  try {
    await (window as any).api.users.setRole(userId, roleKey)
    appStore.markChanges()
    await loadUsers()
  } catch (e: unknown) {
    console.error('Failed to set role:', e)
  }
}

onMounted(() => { loadUsers() })
</script>

<style scoped>
.rtl { direction: rtl; }
.font-mono { font-family: 'Consolas', 'Monaco', monospace; }
.gap-2 { gap: 0.5rem; }
.gap-3 { gap: 0.75rem; }
.glass-input-compact :deep(.v-field__input) { padding-top: 4px !important; padding-bottom: 4px !important; min-height: 36px !important; }
.glass-table { background: transparent !important; }
@media (max-width: 1023px) {
  :deep(.v-dialog > .v-overlay__content) { width: 95vw !important; max-width: 95vw !important; margin: 4px !important; }
  :deep(.v-card-actions) { flex-wrap: wrap !important; gap: 8px !important; }
  :deep(.v-card-actions .v-spacer) { display: none !important; }
  :deep(.v-card-actions .v-btn) { flex: 1 1 auto !important; }
}
</style>
