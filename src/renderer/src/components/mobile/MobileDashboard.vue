<template>
  <div class="mobile-dashboard">
    <div class="px-3 pt-3">
      <v-row dense>
        <v-col v-for="kpi in kpis" :key="kpi.label" cols="6">
          <v-card class="rounded-xl pa-3" variant="outlined">
            <div class="text-caption text-medium-emphasis font-weight-bold">{{ kpi.label }}</div>
            <div class="text-h5 font-weight-black" :class="kpi.color || 'text-primary'">
              {{ kpi.value }}
            </div>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <div class="pa-3">
      <div class="text-subtitle-2 font-weight-black mb-2">الجلسات القادمة</div>
      <MobileCardList
        :items="sessions"
        :loading="sessionsLoading"
        title-field="case_number"
        subtitle-field="client_name"
        empty-text="لا توجد جلسات قادمة"
        can-add
        add-label="إضافة جلسة"
        @item-click="goToSession"
        @add="addSession"
      />

      <div class="text-subtitle-2 font-weight-black mb-2 mt-4">آخر المعاملات</div>
      <MobileCardList
        :items="transactions"
        :loading="financeLoading"
        title-field="description"
        subtitle-field="client_name"
        :info-fields="[{key:'amount',label:'المبلغ'}]"
        empty-text="لا توجد معاملات"
        can-add
        add-label="إضافة معاملة"
        @item-click="goToFinance"
        @add="addTransaction"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useClientsStore } from '../../stores/clients'
import { useCasesStore } from '../../stores/cases'
import { useSessionsStore } from '../../stores/sessions'
import { useFinanceStore } from '../../stores/finance'
import { safeLength } from '../../utils/safe'
import MobileCardList from './MobileCardList.vue'

const router = useRouter()
const clientsStore = useClientsStore()
const casesStore = useCasesStore()
const sessionsStore = useSessionsStore()
const financeStore = useFinanceStore()

const loading = ref(true)
onMounted(async () => {
  await Promise.all([
    clientsStore.fetchAllClients(),
    casesStore.fetchAllCases(),
    sessionsStore.listSessions({}),
    financeStore.fetchFinanceData()
  ])
  loading.value = false
})

const kpis = computed(() => [
  { label: 'القضايا', value: casesStore.total || 0, color: 'text-primary' },
  { label: 'العملاء', value: clientsStore.total || 0, color: 'text-accent' },
  { label: 'الجلسات', value: sessionsStore.totalSessions || 0, color: 'text-success' },
  {
    label: 'الإيرادات',
    value: `${(financeStore.stats?.income || 0).toLocaleString()}`,
    color: 'text-success'
  }
])

const sessions = computed(() => sessionsStore.sessions?.slice(0, 5) || [])
const transactions = computed(() => financeStore.transactions?.slice(0, 5) || [])
const sessionsLoading = computed(() => sessionsStore.loading)
const financeLoading = computed(() => financeStore.loading)

const goToSession = (item: any) => router.push(`/sessions?id=${item.id}`)
const goToFinance = (item: any) => router.push(`/finance?id=${item.id}`)
const addSession = () => router.push('/sessions?new=1')
const addTransaction = () => router.push('/finance?new=1')
</script>
