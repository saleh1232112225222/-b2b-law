<template>
  <div class="mobile-legal-services w-100 h-100 d-flex flex-column rtl">
    <MobileHeader title="الخدمات القانونية" @toggle-drawer="emit('toggle-drawer')" :isDark="true" />

    <!-- Search & Filter -->
    <div class="pa-4 pb-0">
      <v-text-field
        v-model="search"
        placeholder="بحث بالرقم أو الاسم..."
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="mb-3"
        @update:model-value="onSearchChange"
      >
        <template #prepend-inner>
          <LucideIcon name="search" :size="18" class="text-gold opacity-50" />
        </template>
      </v-text-field>
      <v-row dense class="mb-3">
        <v-col cols="6">
          <v-select
            v-model="filterStatus"
            :items="statusOptions"
            item-title="title"
            item-value="value"
            label="الحالة"
            variant="outlined"
            density="compact"
            hide-details
            clearable
            @update:model-value="onFilterChange"
          />
        </v-col>
        <v-col cols="6">
          <v-select
            v-model="filterCategory"
            :items="categoryOptions"
            item-title="title"
            item-value="value"
            label="التصنيف"
            variant="outlined"
            density="compact"
            hide-details
            clearable
            @update:model-value="onFilterChange"
          />
        </v-col>
      </v-row>
    </div>

    <div class="flex-grow-1 overflow-y-auto pa-4 pb-16">
      <div class="d-flex justify-space-between align-center mb-4">
        <h2 class="text-subtitle-1 font-weight-black text-gold">التعاقدات ({{ legalStore.total }})</h2>
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
            <div class="flex-grow-1 ms-2">
              <div class="font-weight-black text-body-1 text-white mb-1">{{ eng.service_type_name }}</div>
              <div class="text-caption text-gold">{{ eng.client_name || 'غير معروف' }}</div>
            </div>
            <v-chip size="x-small" :color="getStatusColor(eng.status_name || '')" class="font-weight-bold shrink">
              {{ eng.status_name }}
            </v-chip>
          </div>
          <div class="d-flex justify-space-between align-center mt-3 pt-3 border-t border-white-10">
            <div class="d-flex ga-3">
              <div class="text-caption">
                <span class="text-white opacity-70">المبلغ: </span>
                <span class="font-weight-black text-success">{{ formatCurrency(eng.financial_compensation || 0) }}</span>
              </div>
              <div class="text-caption" v-if="eng.remaining_amount > 0">
                <span class="text-white opacity-70">متبقي: </span>
                <span class="font-weight-black text-error">{{ formatCurrency(eng.remaining_amount) }}</span>
              </div>
            </div>
            <LucideIcon name="chevron-left" :size="18" class="text-gold opacity-40" />
          </div>
        </v-card>

        <div v-if="!legalStore.services.length" class="text-center py-10 opacity-60 text-white">
          <LucideIcon name="scale" :size="48" class="mb-3 text-gold opacity-30" />
          <p>لا توجد تعاقدات مطابقة</p>
        </div>

        <!-- Pagination -->
        <div v-if="legalStore.total > legalStore.pageSize" class="d-flex justify-center align-center ga-4 mt-4">
          <v-btn size="small" variant="tonal" color="accent" :disabled="legalStore.page <= 1" @click="prevPage">
            السابق
          </v-btn>
          <span class="text-caption text-gold font-weight-black">
            {{ legalStore.page }} / {{ Math.ceil(legalStore.total / legalStore.pageSize) }}
          </span>
          <v-btn size="small" variant="tonal" color="accent"
            :disabled="legalStore.page >= Math.ceil(legalStore.total / legalStore.pageSize)" @click="nextPage">
            التالي
          </v-btn>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import MobileHeader from './MobileHeader.vue'
import LucideIcon from '../common/LucideIcon.vue'
import { useLegalStore } from '../../stores/legal'

const emit = defineEmits(['toggle-drawer', 'add-engagement'])

const legalStore = useLegalStore()

const search = ref('')
const filterStatus = ref(null)
const filterCategory = ref(null)

const statusOptions = computed(() =>
  legalStore.statuses.map((s: any) => ({ title: s.status_name_ar, value: s.id }))
)

const categoryOptions = computed(() =>
  legalStore.categories.map((c: any) => ({ title: c.name_ar, value: c.id }))
)

const getStatusColor = (status: string) => {
  switch (status) {
    case 'مكتمل': return 'success'
    case 'قيد العمل': return 'primary'
    case 'ملغى': return 'error'
    default: return 'warning'
  }
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(val)
}

let searchTimeout: any = null
const onSearchChange = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    legalStore.page = 1
    loadData()
  }, 400)
}

const onFilterChange = () => {
  legalStore.page = 1
  loadData()
}

const loadData = async () => {
  await legalStore.fetchServices({
    page: legalStore.page,
    pageSize: legalStore.pageSize,
    q: search.value,
    category_id: filterCategory.value || 'الكل',
    status_id: filterStatus.value || 'الكل'
  })
}

const nextPage = () => {
  legalStore.page++
  loadData()
}

const prevPage = () => {
  if (legalStore.page > 1) {
    legalStore.page--
    loadData()
  }
}

onMounted(async () => {
  await legalStore.fetchMetadata()
  await loadData()
})
</script>
