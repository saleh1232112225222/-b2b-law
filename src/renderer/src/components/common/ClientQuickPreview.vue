<template>
  <div class="quick-preview-container">
    <div v-if="loading" class="text-center pa-10">
      <v-progress-circular indeterminate color="accent" size="50"></v-progress-circular>
      <div class="mt-4 text-gold opacity-50 font-weight-black">جاري استدعاء سجل الموكل...</div>
    </div>

    <div v-else-if="client" class="pa-4">
      <!-- Header Badge -->
      <div class="d-flex align-center mb-6 bg-accent-alpha pa-4 rounded-xl border-gold-alpha">
        <v-avatar color="accent" size="60" class="font-weight-black text-h5 text-black me-4">
          {{ client.name?.charAt(0) }}
        </v-avatar>
        <div>
          <h3 class="text-h6 font-weight-black text-gold mb-1">{{ client.name }}</h3>
          <div class="d-flex align-center ga-2">
            <v-chip
              size="x-small"
              :color="getClientTypeColor(client.type)"
              class="font-weight-black rounded-lg"
            >
              {{ client.type || 'فرد' }}
            </v-chip>
            <span class="text-caption text-gold opacity-60"
              >الهوية: {{ client.id_number || '---' }}</span
            >
          </div>
        </div>
      </div>

      <!-- Quick Details Tabs -->
      <v-tabs v-model="tab" color="accent" grow class="mb-4">
        <v-tab value="info" class="font-weight-bold text-caption py-3">
          <LucideIcon name="info" :size="16" class="me-2" /> المعطيات الأساسية
        </v-tab>
        <v-tab value="cases" class="font-weight-bold text-caption py-3">
          <LucideIcon name="gavel" :size="16" class="me-2" /> القضايا ({{
            safeLength(linkedCases)
          }})
        </v-tab>
      </v-tabs>

      <v-window v-model="tab">
        <!-- Info Tab -->
        <v-window-item value="info">
          <v-list class="pa-0 bg-transparent">
            <v-list-item class="px-0 py-2 border-b-thin">
              <template #prepend>
                <div class="bg-accent-alpha pa-2 rounded-lg me-3">
                  <LucideIcon name="phone" :size="16" class="text-accent" />
                </div>
              </template>
              <v-list-item-title class="text-tiny text-gold opacity-50 font-weight-bold"
                >رقم الجوال</v-list-item-title
              >
              <v-list-item-subtitle class="text-body-2 font-weight-black text-white ltr-text">{{
                client.phone || '---'
              }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item class="px-0 py-2 border-b-thin">
              <template #prepend>
                <div class="bg-accent-alpha pa-2 rounded-lg me-3">
                  <LucideIcon name="mail" :size="16" class="text-accent" />
                </div>
              </template>
              <v-list-item-title class="text-tiny text-gold opacity-50 font-weight-bold"
                >البريد الإلكتروني</v-list-item-title
              >
              <v-list-item-subtitle class="text-body-2 font-weight-black text-white">{{
                client.email || '---'
              }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item class="px-0 py-2 border-b-thin">
              <template #prepend>
                <div class="bg-accent-alpha pa-2 rounded-lg me-3">
                  <LucideIcon name="map-pin" :size="16" class="text-accent" />
                </div>
              </template>
              <v-list-item-title class="text-tiny text-gold opacity-50 font-weight-bold"
                >العنوان</v-list-item-title
              >
              <v-list-item-subtitle class="text-body-2 font-weight-black text-white">
                {{ client.city || '' }} {{ client.address ? '- ' + client.address : '' }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-card
            variant="tonal"
            color="primary"
            class="mt-4 pa-4 rounded-xl border-gold-alpha glass-card"
          >
            <div class="text-caption font-weight-black text-gold mb-2 d-flex align-center">
              <LucideIcon name="message-square" :size="16" class="me-2 opacity-50" /> الملاحظات
              المسجلة
            </div>
            <div class="text-caption text-white opacity-70 leading-relaxed font-weight-medium">
              {{ client.notes || 'لا توجد ملاحظات مسجلة.' }}
            </div>
          </v-card>
        </v-window-item>

        <!-- Cases Tab -->
        <v-window-item value="cases">
          <div v-if="safeLength(linkedCases) === 0" class="text-center py-6 text-gold opacity-50">
            لا توجد قضايا مرتبطة بهذا الموكل حالياً.
          </div>
          <v-card
            v-for="item in safeArray(linkedCases)"
            :key="item.id"
            elevation="0"
            class="glass-card glass-panel-light mb-3 pa-3 rounded-lg border-gold-alpha"
          >
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="text-caption font-weight-black text-gold">{{ item.case_number }}</span>
              <v-chip
                size="x-small"
                :color="getStatusColor(item.status)"
                variant="flat"
                class="font-weight-black"
              >
                {{ item.status }}
              </v-chip>
            </div>
            <div class="text-caption font-weight-black text-white mb-2">
              {{ item.subject || 'بدون موضوع' }}
            </div>
            <div class="text-tiny text-gold opacity-50">{{ item.court || 'غير محدد' }}</div>
          </v-card>
        </v-window-item>
      </v-window>
    </div>

    <div v-else class="text-center pa-10 text-error">الموكل المطلوب غير موجود.</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Client, Case } from '../../types'
import { safeArray, safeLength } from '../../utils/safe'
import LucideIcon from './LucideIcon.vue'

const props = defineProps<{
  clientId: string | number
}>()

const loading = ref(true)
const tab = ref('info')
const client = ref<Client | null>(null)
const linkedCases = ref<Case[]>([])

const loadData = async () => {
  if (!props.clientId) return
  loading.value = true
  try {
    const data = await (window as any).api.clients.getById(String(props.clientId))
    if (data) {
      client.value = data
      const cases = await (window as any).api.cases.getByClientId(String(props.clientId))
      linkedCases.value = safeArray(cases)
    }
  } catch (err) {
    console.error('Failed to load client details in quick view:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

watch(
  () => props.clientId,
  () => {
    loadData()
  }
)

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
</script>

<style scoped>
.quick-preview-container {
  font-family: inherit;
}
.bg-accent-alpha {
  background: rgba(var(--v-theme-accent), 0.08) !important;
}
.border-gold-alpha {
  border: 1px solid rgba(233, 195, 73, 0.15) !important;
}
.border-b-thin {
  border-bottom: 1px solid rgba(233, 195, 73, 0.08);
}
.ltr-text {
  direction: ltr;
  display: inline-block;
}
.text-tiny {
  font-size: 0.72rem;
}
.glass-panel-light {
  background: rgba(255, 255, 255, 0.02) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
</style>
