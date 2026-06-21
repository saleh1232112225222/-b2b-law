<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <ContractHeader :can="can" @create="createDialog = true" />

    <ContractsTable
      v-model:tab="tab"
      v-model:search="search"
      :loading="loading"
      :filtered="filtered"
      :can="can"
      :format-currency="formatCurrency"
      @reload="load"
      @view="openView"
      @approve="approve"
      @archive="archive"
    />

    <ContractCreateDialog :show="createDialog" @update:show="createDialog = $event" @done="load" />

    <ContractViewDialog
      :show="viewDialog"
      :contract-id="viewContractId"
      :case-options="caseOptions"
      :format-currency="formatCurrency"
      @update:show="viewDialog = $event"
      @add-participant="showSnackbar('قيد التطوير', 'info')"
      @remove-participant="(id) => showSnackbar('قيد التطوير', 'info')"
      @add-amendment="amendDialog = true"
      @save-signature="saveSignature"
    />

    <ContractAmendmentDialog
      :show="amendDialog"
      :contract-id="viewContractId"
      @update:show="amendDialog = $event"
      @done="openView(viewContractId!)"
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
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { safeArray } from '../utils/safe'
import LucideIcon from '../components/common/LucideIcon.vue'
import ContractHeader from './contracts/ContractHeader.vue'
import ContractsTable from './contracts/ContractsTable.vue'
import ContractCreateDialog from './contracts/ContractCreateDialog.vue'
import ContractViewDialog from './contracts/ContractViewDialog.vue'
import ContractAmendmentDialog from './contracts/ContractAmendmentDialog.vue'

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')
const showSnackbar = (text: string, color = 'success') => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

const can = (_perm: string) => true

const formatCurrency = (val: any) =>
  (Number(val) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const tab = ref('employment')
const loading = ref(false)
const search = ref('')
const contracts = ref<any[]>([])

const filtered = computed(() => {
  const list = contracts.value.filter((c) => c.contract_type === tab.value)
  if (!search.value) return list
  const q = search.value.toLowerCase()
  return list.filter(
    (c) =>
      (c.title || '').toLowerCase().includes(q) || (c.contract_no || '').toLowerCase().includes(q)
  )
})

const load = async () => {
  loading.value = true
  try {
    contracts.value = await (window as any).api.contracts.list()
  } catch {
    showSnackbar('فشل تحميل العقود', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(load)

const createDialog = ref(false)
const viewDialog = ref(false)
const viewContractId = ref<string | null>(null)
const caseOptions = ref<any[]>([])

const openView = async (id: string) => {
  viewContractId.value = id
  try {
    const rows = await (window as any).api.cases.getAll()
    caseOptions.value = safeArray(rows).map((c: any) => ({
      value: String(c.id),
      title: [c.case_number || c.title || c.id, c.client_name].filter(Boolean).join(' - ')
    }))
  } catch {
    caseOptions.value = []
  }
  viewDialog.value = true
}

const approve = async (id: string) => {
  try {
    await (window as any).api.contracts.approve(id)
    showSnackbar('تم اعتماد العقد', 'success')
    load()
  } catch {
    showSnackbar('خطأ في الاعتماد', 'error')
  }
}

const archive = async (id: string) => {
  if (!confirm('هل أنت متأكد من أرشفة هذا العقد؟')) return
  try {
    await (window as any).api.contracts.archive(id)
    showSnackbar('تمت الأرشفة', 'success')
    load()
  } catch {
    showSnackbar('خطأ في الأرشفة', 'error')
  }
}

const saveSignature = async (participantId: string) => {
  showSnackbar('قيد التطوير', 'info')
}

const amendDialog = ref(false)
</script>

<style scoped>
.premium-table :deep(th) {
  background: rgba(233, 195, 73, 0.05) !important;
  color: #e9c349 !important;
  font-weight: 900 !important;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 0.75rem !important;
  border-bottom: 1px solid rgba(233, 195, 73, 0.2) !important;
}
.premium-table :deep(td) {
  border-bottom: 1px solid rgba(233, 195, 73, 0.05) !important;
}
.modal-scrollable {
  max-height: calc(100vh - 260px);
  overflow-y: auto;
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
.modal-footer-solid {
  background: #ffffff !important;
  opacity: 1 !important;
  border-top: 1px solid rgba(233, 195, 73, 0.2) !important;
}
.action-btn-unified {
  min-width: 180px !important;
}
.font-judicial {
  font-family: 'Amiri', serif;
  font-size: 1.15rem;
}
.whitespace-pre-wrap {
  white-space: pre-wrap;
}
.premium-hover-row:hover {
  background: rgba(212, 175, 55, 0.03) !important;
}
.border-dashed {
  border: 1px dashed rgba(255, 255, 255, 0.1) !important;
}
.gap-2 {
  gap: 0.5rem;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
.rtl {
  direction: rtl;
}
@media (max-width: 1023px) {
  :deep(.v-row.mb-8.align-center > .v-col:first-child) {
    flex: 0 0 100% !important;
  }
  :deep(.v-row.mb-8.align-center > .v-col-auto) {
    flex: 0 0 100% !important;
    max-width: 100% !important;
  }
  :deep(.v-row.mb-8.align-center > .v-col-auto .v-btn) {
    width: 100% !important;
  }
  :deep(.premium-tabs .v-tabs__content) {
    overflow-x: auto !important;
    flex-wrap: nowrap !important;
  }
  :deep(.premium-tabs .v-tab) {
    white-space: nowrap !important;
    font-size: 0.78rem !important;
    padding: 0 10px !important;
  }
  :deep(.v-card-text.pa-8) {
    padding: 12px !important;
  }
  :deep(.v-table.premium-table) {
    overflow-x: auto !important;
    display: block !important;
  }
  :deep(.v-dialog > .v-overlay__content > .v-card) {
    width: 95vw !important;
    max-width: 95vw !important;
  }
  :deep(.v-card-actions.pa-8) {
    padding: 12px !important;
    flex-wrap: wrap !important;
    gap: 8px !important;
  }
  :deep(.v-card-actions.pa-8 .v-btn) {
    flex: 1 1 auto !important;
    min-width: 100px !important;
  }
  :deep(.v-card-actions.pa-8 .v-spacer) {
    display: none !important;
  }
}
</style>
