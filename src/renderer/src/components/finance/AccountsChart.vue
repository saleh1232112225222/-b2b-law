<template>
  <div class="pa-4">
    <v-row class="mb-4 align-center">
      <v-col>
        <h3 class="text-h5 font-weight-black text-gold">دليل الحسابات</h3>
      </v-col>
      <v-col cols="auto">
        <v-btn
          color="accent"
          :prepend-icon="ICONS.UI.PLUS"
          variant="elevated"
          class="rounded-lg font-weight-black"
          @click="showAddDialog = true"
          >إضافة حساب جديد</v-btn
        >
      </v-col>
    </v-row>

    <!-- Add Account Dialog -->
    <v-dialog v-model="showAddDialog" max-width="500">
      <v-card class="rounded-xl overflow-hidden modal-card">
        <v-toolbar color="primary" class="px-6" height="72">
          <LucideIcon name="folder-plus" :size="24" class="text-white me-3" />
          <v-toolbar-title class="font-weight-black text-white">إضافة حساب محاسبي</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn
            :icon="ICONS.UI.CLOSE"
            variant="text"
            color="white"
            @click="showAddDialog = false"
          ></v-btn>
        </v-toolbar>
        <v-card-text class="pa-6">
          <v-form ref="formRef" v-model="formValid">
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="newItem.name"
                  label="اسم الحساب*"
                  variant="outlined"
                  :rules="[(v) => !!v || 'الاسم مطلوب']"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="newItem.code"
                  label="كود الحساب*"
                  variant="outlined"
                  :rules="[(v) => !!v || 'الكود مطلوب']"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="newItem.type"
                  :items="[
                    { title: 'أصل', value: 'asset' },
                    { title: 'التزام', value: 'liability' },
                    { title: 'حقوق ملكية', value: 'equity' },
                    { title: 'إيراد', value: 'revenue' },
                    { title: 'مصروف', value: 'expense' }
                  ]"
                  label="النوع*"
                  variant="outlined"
                  required
                ></v-select>
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="newItem.description"
                  label="الوصف"
                  variant="outlined"
                  rows="2"
                ></v-textarea>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-6">
          <v-btn variant="text" @click="showAddDialog = false">إلغاء</v-btn>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            variant="elevated"
            :loading="saving"
            :disabled="!formValid"
            @click="saveAccount"
            >حفظ الحساب</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-data-table
      :headers="headers"
      :items="safeArray(accounts)"
      :loading="loading"
      class="premium-table"
      density="comfortable"
      hover
    >
      <template #[`item.type`]="{ item }">
        <v-chip :color="getTypeColor((item as any).type)" size="small" variant="flat">
          {{ getTypeName((item as any).type) }}
        </v-chip>
      </template>
      <template #[`item.balance`]="{ item }">
        <span
          :class="((item as any).balance || 0) < 0 ? 'text-error' : 'text-success'"
          class="font-weight-bold"
        >
          {{ ((item as any).balance || 0).toLocaleString('ar-SA') }} ريال
        </span>
      </template>
    </v-data-table>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useFinanceStore } from '../../stores/finance'
import { storeToRefs } from 'pinia'
import { safeArray } from '../../utils/safe'
import LucideIcon from '../common/LucideIcon.vue'
import { ICONS } from '../../config/icons'

const financeStore = useFinanceStore()
const { accounts, loading } = storeToRefs(financeStore)

const showAddDialog = ref(false)
const formValid = ref(false)
const saving = ref(false)
const newItem = reactive({
  name: '',
  code: '',
  type: 'expense',
  description: ''
})

const saveAccount = async (): Promise<void> => {
  saving.value = true
  try {
    // Check if window.api exists (hardening for SSR or early mounts)
    if (window && (window as any).api && (window as any).api.accounts) {
      await (window as any).api.accounts.create({ ...newItem })
      await financeStore.fetchFinanceData()
      showAddDialog.value = false
      Object.assign(newItem, { name: '', code: '', type: 'expense', description: '' })
    }
  } catch (e: unknown) {
    console.error('Error creating account:', e)
  } finally {
    saving.value = false
  }
}

const headers = [
  { title: 'كود الحساب', key: 'code', align: 'start' as const },
  { title: 'اسم الحساب', key: 'name', align: 'start' as const },
  { title: 'النوع', key: 'type', align: 'start' as const },
  { title: 'الرصيد الحالي', key: 'balance', align: 'end' as const }
]

const getTypeName = (type: string): string => {
  const map: Record<string, string> = {
    asset: 'أصل',
    liability: 'التزام',
    equity: 'حقوق ملكية',
    revenue: 'إيراد',
    expense: 'مصروف'
  }
  return map[type] || type
}

const getTypeColor = (type: string): string => {
  const map: Record<string, string> = {
    asset: 'teal',
    liability: 'orange',
    equity: 'purple',
    revenue: 'success',
    expense: 'error'
  }
  return map[type] || 'grey'
}
</script>
