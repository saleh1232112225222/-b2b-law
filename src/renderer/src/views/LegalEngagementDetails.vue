<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <!-- Header -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <v-btn icon variant="text" class="me-4 text-gold" @click="$router.push('/legal-services')">
            <LucideIcon name="arrow-right" :size="24" />
          </v-btn>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">تفاصيل التعاقد: {{ engagement?.title || 'جاري التحميل...' }}</h1>
            <p class="text-subtitle-1 text-white opacity-60 font-weight-black mb-0">
              العميل: {{ clientName }} | الحالة: <v-chip size="small" :color="getStatusColor(engagement?.status || '')">{{ engagement?.status || '' }}</v-chip>
            </p>
          </div>
        </div>
      </v-col>
    </v-row>

    <v-row v-if="loading" class="mt-4">
      <v-col cols="12" class="text-center py-10">
        <v-progress-circular indeterminate color="accent" size="64"></v-progress-circular>
      </v-col>
    </v-row>

    <template v-else-if="engagement">
      <v-row>
        <!-- Info Card -->
        <v-col cols="12" md="8">
          <v-card class="glass-card pa-6 mb-6">
            <h3 class="text-h6 font-weight-black text-gold mb-4 border-b border-gold-thin pb-2">تفاصيل الخدمة</h3>
            <v-row>
              <v-col cols="12" sm="6">
                <div class="text-caption text-gold mb-1">الخدمة المرجعية</div>
                <div class="text-body-1 font-weight-bold text-white">{{ serviceName }}</div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="text-caption text-gold mb-1">مبلغ التعاقد</div>
                <div class="text-body-1 font-weight-bold text-success">{{ engagement.contract_amount || 0 }} ر.س</div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="text-caption text-gold mb-1">تاريخ البدء</div>
                <div class="text-body-1 font-weight-bold text-white">{{ engagement.start_date || 'غير محدد' }}</div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="text-caption text-gold mb-1">تاريخ الانتهاء المتوقع</div>
                <div class="text-body-1 font-weight-bold text-white">{{ engagement.end_date || 'غير محدد' }}</div>
              </v-col>
              <v-col cols="12">
                <div class="text-caption text-gold mb-1">ملاحظات</div>
                <div class="text-body-2 text-white opacity-80">{{ engagement.notes || 'لا يوجد ملاحظات' }}</div>
              </v-col>
            </v-row>
          </v-card>
        </v-col>

        <!-- Actions / Finance -->
        <v-col cols="12" md="4">
          <v-card class="glass-card pa-6 mb-6">
            <h3 class="text-h6 font-weight-black text-gold mb-4 border-b border-gold-thin pb-2">المالية</h3>
            <div class="d-flex justify-space-between align-center mb-3">
              <span class="text-white">المبلغ المدفوع:</span>
              <span class="font-weight-bold text-success">{{ engagement.paid_amount || 0 }} ر.س</span>
            </div>
            <div class="d-flex justify-space-between align-center mb-4">
              <span class="text-white">المتبقي:</span>
              <span class="font-weight-bold text-error">{{ (engagement.contract_amount || 0) - (engagement.paid_amount || 0) }} ر.س</span>
            </div>
            <v-btn block color="accent" class="font-weight-black mb-3">
              إصدار مطالبة مالية
            </v-btn>
            <v-btn block variant="outlined" color="gold" class="font-weight-black">
              تسجيل دفعة
            </v-btn>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import LucideIcon from '../components/common/LucideIcon.vue'
import { useLegalStore } from '../stores/legal'
import { useClientsStore } from '../stores/clients'

const props = defineProps<{ id: string }>()
const route = useRoute()

const legalStore = useLegalStore()
const clientsStore = useClientsStore()

const loading = ref(true)
const engagementId = props.id || route.params.id as string
const engagement = computed(() => legalStore.engagements.find(e => e.id === engagementId))

onMounted(async () => {
  loading.value = true
  if (!legalStore.engagements.length) {
    await legalStore.fetchEngagements()
  }
  if (!legalStore.services.length) {
    await legalStore.fetchServices()
  }
  if (!clientsStore.clients.length) {
    await clientsStore.fetchClients()
  }
  loading.value = false
})

const clientName = computed(() => {
  if (!engagement.value) return ''
  const client = clientsStore.clients.find(c => c.id === engagement.value?.client_id)
  return client ? client.name : 'غير معروف'
})

const serviceName = computed(() => {
  if (!engagement.value) return ''
  const srv = legalStore.services.find(s => s.id === engagement.value?.legal_service_id)
  return srv ? srv.name : 'غير معروف'
})

const getStatusColor = (status: string) => {
  switch (status) {
    case 'مكتمل': return 'success'
    case 'قيد العمل': return 'primary'
    case 'ملغى': return 'error'
    default: return 'warning'
  }
}
</script>
