<template>
  <div class="pa-3">
    <v-card class="rounded-xl pa-4 mb-3" variant="outlined">
      <v-row dense>
        <v-col cols="4" class="text-center">
          <div class="text-caption text-medium-emphasis">الإيرادات</div>
          <div class="text-subtitle-1 font-weight-black text-success">
            {{ formatMoney(stats.income) }}
          </div>
        </v-col>
        <v-col cols="4" class="text-center">
          <div class="text-caption text-medium-emphasis">المصروفات</div>
          <div class="text-subtitle-1 font-weight-black text-error">
            {{ formatMoney(stats.expense) }}
          </div>
        </v-col>
        <v-col cols="4" class="text-center">
          <div class="text-caption text-medium-emphasis">الرصيد</div>
          <div class="text-subtitle-1 font-weight-black text-primary">
            {{ formatMoney(stats.balance) }}
          </div>
        </v-col>
      </v-row>
    </v-card>

    <v-tabs v-model="activeTab" density="compact" color="primary" class="mb-3">
      <v-tab value="transactions" class="font-weight-bold">المعاملات</v-tab>
      <v-tab value="invoices" class="font-weight-bold">الفواتير</v-tab>
      <v-tab value="receivables" class="font-weight-bold">الذمم</v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <v-window-item value="transactions">
        <MobileCardList
          :items="transactions"
          :loading="loading"
          title-field="description"
          subtitle-field="client_name"
          :info-fields="[
            { key: 'amount', label: 'المبلغ' },
            { key: 'category', label: 'التصنيف' }
          ]"
          icon-field="icon"
          default-icon="mdi-swap-horizontal"
          empty-text="لا توجد معاملات"
          can-add
          add-label="إضافة معاملة"
          @item-click="openItem"
          @add="emit('add-transaction')"
        />
      </v-window-item>

      <v-window-item value="invoices">
        <MobileCardList
          :items="invoices"
          :loading="loading"
          title-field="invoice_number"
          subtitle-field="client_name"
          :info-fields="[
            { key: 'total_amount', label: 'المبلغ' },
            { key: 'status', label: 'الحالة' }
          ]"
          icon-field="icon"
          default-icon="mdi-file-invoice"
          empty-text="لا توجد فواتير"
          can-add
          add-label="إضافة فاتورة"
          @item-click="openItem"
          @add="emit('add-invoice')"
        />
      </v-window-item>

      <v-window-item value="receivables">
        <MobileCardList
          :items="receivables"
          :loading="loading"
          title-field="client_name"
          subtitle-field="invoice_number"
          :info-fields="[
            { key: 'remaining_amount', label: 'المتبقي' },
            { key: 'status', label: 'الحالة' }
          ]"
          icon-field="icon"
          default-icon="mdi-hand-coin"
          empty-text="لا توجد ذمم"
          can-add
          add-label="إضافة ذمة"
          @item-click="openItem"
          @add="emit('add-receivable')"
        />
      </v-window-item>
    </v-window>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFinanceStore } from '../../stores/finance'
import { storeToRefs } from 'pinia'
import MobileCardList from './MobileCardList.vue'

const emit = defineEmits<{
  'add-transaction': []
  'add-invoice': []
  'add-receivable': []
}>()

const financeStore = useFinanceStore()
const { transactions, invoices, receivables, stats, loading } = storeToRefs(financeStore)

const activeTab = ref('transactions')

const formatMoney = (val: number) => (val || 0).toLocaleString()

const openItem = (item: any) => {
  // handled by parent if needed
}
</script>
