<template>
  <div class="pa-2">
    <v-card v-if="loading" elevation="0" class="glass-panel-light pa-6 text-center">
      <v-progress-circular indeterminate color="accent" size="48"></v-progress-circular>
      <div class="mt-4 text-gold opacity-40 font-weight-black">جاري التحميل...</div>
    </v-card>

    <template v-else-if="client">
      <!-- Client Header -->
      <v-card elevation="0" class="glass-card mb-6 overflow-hidden border-gold-alpha glass-card">
        <v-row no-gutters>
          <v-col cols="12" class="pa-6">
            <div class="d-flex align-center mb-4">
              <div class="glass-panel-light pa-1 rounded-xl me-4 border-gold opacity-40">
                <v-avatar color="accent" size="80" class="font-weight-black text-h5 text-black">
                  {{ client.name?.charAt(0) }}
                </v-avatar>
              </div>
              <div>
                <h1 class="text-h5 font-weight-black text-gold mb-1">{{ client.name }}</h1>
                <v-chip :color="getClientTypeColor(client.type)" variant="flat" size="small" class="font-weight-black rounded-lg px-3">
                  {{ client.type || 'فرد' }}
                </v-chip>
              </div>
            </div>
            <div class="text-h6 text-gold opacity-60 font-weight-black d-flex align-center">
              <LucideIcon name="id-card" :size="20" class="me-2 opacity-40" />
              الهوية/السجل: {{ client.id_number || '---' }}
            </div>
          </v-col>
        </v-row>
      </v-card>

      <!-- Action Buttons -->
      <v-row dense class="mb-4 ga-2">
        <v-col cols="6">
          <v-btn color="accent" variant="elevated" block class="rounded-xl py-3 font-weight-black" @click="openEditDialog">
            <LucideIcon name="pencil" :size="18" class="me-2" /> تعديل الملف
          </v-btn>
        </v-col>
        <v-col cols="6">
          <v-btn variant="outlined" block class="rounded-xl py-3 font-weight-black border-gold text-gold" @click="goToCases">
            <LucideIcon name="gavel" :size="18" class="me-2" /> القضايا ({{ safeLength(linkedCases) }})
          </v-btn>
        </v-col>
      </v-row>

      <!-- Tabs -->
      <v-card elevation="0" class="glass-card border-gold-alpha glass-card">
        <v-tabs v-model="tab" color="accent" class="border-b border-gold opacity-10" grow>
          <v-tab value="overview" class="font-weight-black text-gold py-4">
            <LucideIcon name="info" :size="18" class="me-2" /> الأساسية
          </v-tab>
          <v-tab value="cases" class="font-weight-black text-gold py-4">
            <LucideIcon name="gavel" :size="18" class="me-2" /> القضايا
            <v-badge v-if="safeLength(linkedCases) > 0" :content="safeLength(linkedCases)" color="accent" class="ms-2" inline></v-badge>
          </v-tab>
          <v-tab value="agencies" class="font-weight-black text-gold py-4">
            <LucideIcon name="file-text" :size="18" class="me-2" /> الوكالات
            <v-badge v-if="safeLength(linkedAgencies) > 0" :content="safeLength(linkedAgencies)" color="accent" class="ms-2" inline></v-badge>
          </v-tab>
        </v-tabs>

        <v-window v-model="tab" class="pa-4">
          <!-- Overview Tab -->
          <v-window-item value="overview">
            <v-list class="pa-0 bg-transparent">
              <v-list-item class="px-0 mb-4">
                <template #prepend>
                  <div class="glass-panel-light pa-3 rounded-lg me-3 bg-accent-alpha">
                    <LucideIcon name="phone" :size="24" class="text-accent" />
                  </div>
                </template>
                <v-list-item-title class="text-caption text-gold opacity-50 font-weight-black mb-1">رقم الجوال</v-list-item-title>
                <v-list-item-subtitle class="text-h6 font-weight-black text-white ltr-text">{{ client.phone || '---' }}</v-list-item-subtitle>
              </v-list-item>

              <v-list-item class="px-0 mb-4">
                <template #prepend>
                  <div class="glass-panel-light pa-3 rounded-lg me-3 bg-accent-alpha">
                    <LucideIcon name="mail" :size="24" class="text-accent" />
                  </div>
                </template>
                <v-list-item-title class="text-caption text-gold opacity-50 font-weight-black mb-1">البريد الإلكتروني</v-list-item-title>
                <v-list-item-subtitle class="text-h6 font-weight-black text-white">{{ client.email || '---' }}</v-list-item-subtitle>
              </v-list-item>

              <v-list-item class="px-0 mb-4">
                <template #prepend>
                  <div class="glass-panel-light pa-3 rounded-lg me-3 bg-accent-alpha">
                    <LucideIcon name="map-pin" :size="24" class="text-accent" />
                  </div>
                </template>
                <v-list-item-title class="text-caption text-gold opacity-50 font-weight-black mb-1">المدينة والعنوان</v-list-item-title>
                <v-list-item-subtitle class="text-h6 font-weight-black text-white">{{ client.city }} - {{ client.address || '---' }}</v-list-item-subtitle>
              </v-list-item>

              <v-divider class="my-4 border-gold opacity-10"></v-divider>

              <v-list-item class="px-0 mb-4">
                <template #prepend>
                  <div class="glass-panel-light pa-3 rounded-lg me-3 bg-accent-alpha">
                    <LucideIcon name="message-circle" :size="24" class="text-accent" />
                  </div>
                </template>
                <v-list-item-title class="text-caption text-gold opacity-50 font-weight-black mb-1">ملاحظات</v-list-item-title>
                <v-list-item-subtitle class="text-body-1 text-white opacity-70 leading-relaxed">{{ client.notes || 'لا توجد ملاحظات' }}</v-list-item-subtitle>
              </v-list-item>

              <v-divider class="my-4 border-gold opacity-10"></v-divider>

              <v-list-item class="px-0">
                <template #prepend>
                  <div class="glass-panel-light pa-3 rounded-lg me-3 bg-accent-alpha">
                    <LucideIcon name="calendar" :size="24" class="text-accent" />
                  </div>
                </template>
                <v-list-item-title class="text-caption text-gold opacity-50 font-weight-black mb-1">تاريخ الانضمام</v-list-item-title>
                <v-list-item-subtitle class="text-h6 font-weight-black text-white">{{ formatDate(client.created_at) }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-window-item>

          <!-- Cases Tab -->
          <v-window-item value="cases">
            <v-list class="pa-0" v-if="safeLength(linkedCases) === 0">
              <v-list-item class="text-center py-12">
                <v-icon size="48" class="text-gold opacity-30 mb-2">mdi-gavel</v-icon>
                <div class="text-gold opacity-50 font-weight-black">لا توجد قضايا مرتبطة</div>
              </v-list-item>
            </v-list>
            <v-list class="pa-0" v-else>
              <v-list-item v-for="c in linkedCases" :key="c.id" class="px-0 mb-3" @click="openCase(c)">
                <template #prepend>
                  <div class="glass-panel-light pa-3 rounded-lg me-3 bg-accent-alpha">
                    <LucideIcon name="gavel" :size="24" class="text-accent" />
                  </div>
                </template>
                <v-list-item-title class="text-h6 font-weight-black text-white">{{ c.case_number }}</v-list-item-title>
                <v-list-item-subtitle class="text-body-1 text-gold opacity-70">{{ c.subject }}</v-list-item-subtitle>
                <template #append>
                  <v-chip :color="getStatusColor(c.status)" variant="flat" size="x-small" class="font-weight-black">{{ c.status }}</v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-window-item>

          <!-- Agencies Tab -->
          <v-window-item value="agencies">
            <v-list class="pa-0" v-if="safeLength(linkedAgencies) === 0">
              <v-list-item class="text-center py-12">
                <v-icon size="48" class="text-gold opacity-30 mb-2">mdi-file-text</v-icon>
                <div class="text-gold opacity-50 font-weight-black">لا توجد وكالات مسجلة</div>
              </v-list-item>
            </v-list>
            <v-list class="pa-0" v-else>
              <v-list-item v-for="a in linkedAgencies" :key="a.id" class="px-0 mb-3">
                <template #prepend>
                  <div class="glass-panel-light pa-3 rounded-lg me-3 bg-accent-alpha">
                    <LucideIcon name="file-text" :size="24" class="text-accent" />
                  </div>
                </template>
                <v-list-item-title class="text-h6 font-weight-black text-white">{{ a.agency_number }}</v-list-item-title>
                <v-list-item-subtitle class="text-body-1 text-gold opacity-70">{{ a.court }} - {{ formatDate(a.date) }}</v-list-item-subtitle>
                <template #append>
                  <v-chip color="accent" variant="flat" size="x-small" class="font-weight-black">{{ formatDate(a.expiry_date) }}</v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-window-item>
        </v-window>
      </v-card>
    </template>

    <template v-else>
      <v-card elevation="0" class="glass-panel-light pa-12 text-center">
        <v-icon size="64" class="text-gold opacity-30 mb-4">mdi-account-off</v-icon>
        <div class="text-h6 text-gold opacity-50 font-weight-black">لم يتم العثور على الموكل</div>
      </v-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClientsStore } from '../../stores/clients'
import LucideIcon from '../common/LucideIcon.vue'
import { safeArray, safeLength } from '../../utils/safe'
import type { Client, Case, Agency } from '../../types'

const route = useRoute()
const router = useRouter()
const emit = defineEmits<{ edit: []; add: [] }>()

const clientId = computed(() => route.params.id as string)
const clientsStore = useClientsStore()

const loading = ref(true)
const tab = ref('overview')
const client = ref<Client | null>(null)
const linkedCases = ref<Case[]>([])
const linkedAgencies = ref<Agency[]>([])

const loadData = async () => {
  loading.value = true
  try {
    const data = await (window as any).api.clients.getById(clientId.value)
    if (data) {
      client.value = data
      const cases = await (window as any).api.cases.getByClientId(clientId.value)
      linkedCases.value = safeArray(cases)
      const agencies = await (window as any).api.agencies.getByClientId(clientId.value)
      linkedAgencies.value = safeArray(agencies)
    }
  } catch (err) {
    console.error('Failed to load client details:', err)
  } finally {
    loading.value = false
  }
}

const openEditDialog = () => emit('edit')
const openCase = (c: Case) => router.push(`/cases?id=${c.id}`)
const goToCases = () => router.push('/cases')
const goToContracts = () => router.push('/contracts')
const goToAgencies = () => router.push('/agencies')
const goToFinance = () => router.push('/finance')
const goToVault = () => router.push('/vault')
const goToMemoranda = () => router.push('/memoranda')
const goToReports = () => router.push('/reports')
const goToTasks = () => router.push('/tasks')
const goToSettings = () => router.push('/settings')
const logout = () => router.push('/login')

const getClientTypeColor = (type?: string) => {
  const map: Record<string, string> = {
    فرد: 'accent',
    شركة: 'indigo',
    مؤسسة: 'blue-grey',
    'جهة حكومية': 'brown'
  }
  return map[type || ''] || 'accent'
}

const getStatusColor = (status?: string) => {
  const map: Record<string, string> = {
    'قيد النظر': 'success',
    مغلقة: 'error',
    'جاري العمل': 'indigo'
  }
  return map[status || ''] || 'grey'
}

const formatDate = (date?: string) => {
  if (!date) return '---'
  return new Date(date).toLocaleDateString('ar-SA')
}
</script>