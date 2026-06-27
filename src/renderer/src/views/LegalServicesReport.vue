<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <!-- Header -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-card pa-4 rounded-xl me-5 border-gold-alpha">
            <LucideIcon name="scale" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">تقرير الخدمات والارتباطات القانونية</h1>
            <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
              تحليل شامل ومؤشرات للارتباطات التعاقدية والخدمات القانونية المقدمة لعملائنا
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="auto" class="d-flex gap-3">
        <v-btn
          variant="outlined"
          color="gold"
          class="rounded-lg px-6 font-weight-black premium-hover h-56"
          @click="$router.push('/reports')"
        >
          <LucideIcon name="arrow-right" :size="18" class="me-2" /> رجوع للمركز
        </v-btn>
        <v-btn
          color="accent"
          variant="flat"
          class="rounded-lg px-6 font-weight-black premium-lift h-56 text-ebony"
          @click="printReport"
        >
          <LucideIcon name="printer" :size="18" class="me-2" /> طباعة التقرير
        </v-btn>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-card elevation="0" class="glass-card pa-6 border-gold-alpha mb-6">
      <v-row dense>
        <v-col cols="12" md="3">
          <v-autocomplete
            v-model="filters.client_id"
            :items="clients"
            item-title="name"
            item-value="id"
            label="العميل"
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            v-model="filters.category_id"
            :items="store.categories"
            item-title="name_ar"
            item-value="id"
            label="التصنيف الرئيسي"
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-select
            v-model="filters.status_id"
            :items="store.statuses"
            item-title="status_name_ar"
            item-value="id"
            label="الحالة"
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field
            v-model="filters.q"
            label="بحث سريع..."
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
            prepend-inner-icon="mdi-magnify"
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-btn
            color="accent"
            variant="tonal"
            block
            height="48"
            class="rounded-lg font-weight-black"
            :loading="loading"
            @click="loadData"
          >
            تصفية البيانات
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <!-- KPI Summary Cards -->
    <v-row class="mb-6" dense>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="0" class="glass-card pa-5 rounded-xl border-gold-alpha premium-hover h-100">
          <div class="text-caption font-weight-black text-ebony opacity-60 mb-2">إجمالي الخدمات المدرجة</div>
          <div class="text-h5 font-weight-black text-ebony">{{ stats.totalCount }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="0" class="glass-card pa-5 rounded-xl border-gold-alpha premium-hover h-100">
          <div class="text-caption font-weight-black text-ebony opacity-60 mb-2">المقابل المالي الكلي</div>
          <div class="text-h5 font-weight-black text-accent">{{ formatCurrency(stats.totalCompensation) }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="0" class="glass-card pa-5 rounded-xl border-gold-alpha premium-hover h-100">
          <div class="text-caption font-weight-black text-ebony opacity-60 mb-2">المحسّل والمقبوض فعلياً</div>
          <div class="text-h5 font-weight-black text-success">{{ formatCurrency(stats.totalPaid) }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="0" class="glass-card pa-5 rounded-xl border-gold premium-hover h-100 border-2">
          <div class="text-caption font-weight-black text-gold mb-2">المستحقات المتبقية</div>
          <div class="text-h5 font-weight-black text-gold">{{ formatCurrency(stats.totalRemaining) }}</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Report Table -->
    <v-card elevation="0" class="glass-card rounded-xl border-gold-alpha overflow-hidden">
      <v-table density="comfortable" class="glass-table">
        <thead>
          <tr>
            <th class="text-right text-gold font-weight-black">رقم الخدمة</th>
            <th class="text-right text-gold font-weight-black">العميل</th>
            <th class="text-right text-gold font-weight-black">التصنيف والنوع</th>
            <th class="text-right text-gold font-weight-black">المسؤول</th>
            <th class="text-right text-gold font-weight-black">المقابل المالي</th>
            <th class="text-right text-gold font-weight-black">المحصل</th>
            <th class="text-right text-gold font-weight-black">المتبقي</th>
            <th class="text-right text-gold font-weight-black">الحالة</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!loading && items.length === 0">
            <td colspan="8" class="text-center py-12 text-gold opacity-30 font-weight-black">
              لا توجد خدمات مطابقة للتصفية الحالية
            </td>
          </tr>
          <tr v-for="item in items" :key="item.id" class="premium-hover-row">
            <td class="font-mono text-accent font-weight-black">{{ item.engagement_number }}</td>
            <td class="text-white font-weight-black">{{ item.client_name || '-' }}</td>
            <td class="text-white font-weight-bold">
              <div>{{ item.category_name }}</div>
              <div class="text-caption text-grey">{{ item.service_type_name }}</div>
            </td>
            <td class="text-grey-lighten-1">{{ item.responsible_name || '-' }}</td>
            <td class="text-accent font-weight-black">{{ formatCurrency(item.financial_compensation || 0) }}</td>
            <td class="text-success font-weight-black">{{ formatCurrency(item.paid_amount || 0) }}</td>
            <td class="text-gold font-weight-black">{{ formatCurrency(item.remaining_amount || 0) }}</td>
            <td>
              <v-chip size="small" variant="flat" :color="item.status_color || 'primary'" class="text-ebony font-weight-black">
                {{ item.status_name }}
              </v-chip>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useLegalStore } from '../stores/legal'
import LucideIcon from '../components/common/LucideIcon.vue'

const store = useLegalStore()
const loading = ref(false)

const filters = reactive({
  client_id: null,
  category_id: null,
  status_id: null,
  q: ''
})

const clients = ref<any[]>([])
const items = ref<any[]>([])
const stats = reactive({
  totalCount: 0,
  totalCompensation: 0,
  totalPaid: 0,
  totalRemaining: 0
})

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(val)
}

const loadData = async () => {
  loading.value = true
  try {
    await store.fetchMetadata()
    
    // Load clients
    clients.value = await window.api.clients.getAll()
    
    // Fetch all legal services
    const data = await window.api.legalServices.list({
      page: 1,
      pageSize: 500,
      q: filters.q,
      category_id: filters.category_id || '',
      status_id: filters.status_id || ''
    })
    
    let list = Array.isArray(data) ? data : (data as any)?.data || []
    
    // Filter client-side by client_id if specified
    if (filters.client_id) {
      list = list.filter((item: any) => item.client_id === filters.client_id)
    }
    
    items.value = list
    
    // Calculate stats
    stats.totalCount = list.length
    stats.totalCompensation = list.reduce((acc: number, cur: any) => acc + (Number(cur.financial_compensation) || 0), 0)
    stats.totalPaid = list.reduce((acc: number, cur: any) => acc + (Number(cur.paid_amount) || 0), 0)
    stats.totalRemaining = list.reduce((acc: number, cur: any) => acc + (Number(cur.remaining_amount) || 0), 0)
  } catch (e) {
    console.error('Failed to load legal services report data:', e)
  } finally {
    loading.value = false
  }
}

const printReport = () => {
  window.print()
}

onMounted(loadData)
</script>

<style scoped>
.rtl {
  direction: rtl;
}
.gap-3 {
  gap: 12px;
}
.font-mono {
  font-family: 'Consolas', 'Monaco', monospace;
}
.glass-table {
  background: transparent !important;
}
:deep(.glass-table th) {
  background: rgba(212, 175, 55, 0.05) !important;
  border-bottom: 1px solid rgba(212, 175, 55, 0.1) !important;
}
:deep(.glass-table td) {
  border-bottom: 1px solid rgba(212, 175, 55, 0.05) !important;
}
</style>
