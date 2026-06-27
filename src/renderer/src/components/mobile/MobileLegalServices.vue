<template>
  <div class="mobile-legal-services w-100 h-100 d-flex flex-column rtl">
    <!-- Header -->
    <MobileHeader title="الخدمات القانونية" @toggle-drawer="emit('toggle-drawer')" />

    <div class="flex-grow-1 overflow-y-auto pa-4 pb-16">
      <div class="d-flex justify-space-between align-center mb-4">
        <h2 class="text-subtitle-1 font-weight-black text-gold">التعاقدات النشطة</h2>
        <v-btn size="small" color="accent" variant="tonal" class="rounded-pill px-4" @click="emit('add-engagement')">
          <LucideIcon name="plus" :size="16" class="me-1" /> جديد
        </v-btn>
      </div>

      <div v-if="legalStore.loading" class="text-center py-8">
        <v-progress-circular indeterminate color="accent"></v-progress-circular>
      </div>

      <template v-else>
        <v-card
          v-for="eng in legalStore.services"
          :key="eng.id"
          class="glass-card mb-3 pa-4 premium-hover"
          @click="$router.push(`/legal-engagements/${eng.id}`)"
        >
          <div class="d-flex justify-space-between align-start mb-2">
            <div>
              <div class="font-weight-black text-body-1 text-white mb-1">{{ eng.service_type_name }}</div>
              <div class="text-caption text-gold">{{ eng.client_name || 'غير معروف' }}</div>
            </div>
            <v-chip size="x-small" :color="getStatusColor(eng.status_name || '')" class="font-weight-bold">
              {{ eng.status_name }}
            </v-chip>
          </div>
          <div class="d-flex justify-space-between align-center mt-3 pt-3 border-t border-white-10">
            <div class="text-caption text-white opacity-70">المبلغ</div>
            <div class="font-weight-black text-success">{{ eng.financial_compensation }} ر.س</div>
          </div>
        </v-card>

        <div v-if="!legalStore.services.length" class="text-center py-10 opacity-60 text-white">
          <LucideIcon name="scale" :size="48" class="mb-3 text-gold opacity-30" />
          <p>لا توجد تعاقدات مسجلة</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import MobileHeader from './MobileHeader.vue'
import LucideIcon from '../common/LucideIcon.vue'
import { useLegalStore } from '../../stores/legal'
import { useClientsStore } from '../../stores/clients'

const emit = defineEmits(['toggle-drawer', 'add-engagement'])

const legalStore = useLegalStore()
const clientsStore = useClientsStore()

const getClientName = (id: string) => {
  const client = clientsStore.clients.find(c => c.id === id)
  return client ? client.name : 'غير معروف'
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'مكتمل': return 'success'
    case 'قيد العمل': return 'primary'
    case 'ملغى': return 'error'
    default: return 'warning'
  }
}
</script>
