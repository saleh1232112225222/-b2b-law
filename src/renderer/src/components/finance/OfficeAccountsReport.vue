<template>
  <div class="pa-4">
    <!-- فلاتر -->
    <v-card variant="outlined" class="pa-4 mb-6 rounded-xl">
      <div class="text-subtitle-2 font-weight-black mb-3">فلاتر التقرير</div>
      <v-row dense>
        <v-col cols="3">
          <v-select v-model="filters.status" :items="statusOptions" item-title="text" item-value="value"
            label="الحالة" variant="outlined" density="compact" clearable />
        </v-col>
        <v-col cols="3">
          <v-text-field v-model="filters.from_date" label="من تاريخ" type="date" variant="outlined" density="compact" />
        </v-col>
        <v-col cols="3">
          <v-text-field v-model="filters.to_date" label="إلى تاريخ" type="date" variant="outlined" density="compact" />
        </v-col>
        <v-col cols="3">
          <v-btn color="accent" block :loading="loading" @click="loadReport">
            <LucideIcon name="search" :size="16" class="me-1" /> عرض التقرير
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <!-- ملخص -->
    <v-row v-if="report" dense class="mb-6">
      <v-col v-for="stat in summaryCards" :key="stat.key" cols="3">
        <v-card elevation="0" class="pa-5 text-center rounded-xl glass-card">
          <div class="text-caption text-medium-emphasis mb-1">{{ stat.label }}</div>
          <div class="text-h6 font-weight-black" :class="stat.color">
            {{ formatMoney(stat.value) }}
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- تفصيل حسب التصنيف -->
    <div v-if="report?.by_category?.length" class="mb-6">
      <div class="text-subtitle-2 font-weight-black mb-3">إيرادات حسب التصنيف</div>
      <v-card variant="outlined" class="rounded-xl overflow-hidden">
        <v-table density="compact">
          <thead>
            <tr>
              <th class="font-weight-black">التصنيف</th>
              <th class="font-weight-black">الإجمالي</th>
              <th class="font-weight-black">المحصل</th>
              <th class="font-weight-black">المتبقي</th>
              <th class="font-weight-black">نسبة التحصيل</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cat in report.by_category" :key="cat.category">
              <td class="font-weight-bold">{{ cat.category || 'غير محدد' }}</td>
              <td>{{ formatMoney(cat.total) }}</td>
              <td class="text-success font-weight-black">{{ formatMoney(cat.collected) }}</td>
              <td class="text-error font-weight-black">{{ formatMoney(cat.total - cat.collected) }}</td>
              <td>
                <v-chip :color="cat.total > 0 && (cat.collected / cat.total) >= 0.7 ? 'success' : 'warning'"
                  size="x-small" label>
                  {{ cat.total > 0 ? ((cat.collected / cat.total) * 100).toFixed(1) : 0 }}%
                </v-chip>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </div>

    <!-- تفصيل حسب العميل -->
    <div v-if="report?.by_client?.length" class="mb-6">
      <div class="text-subtitle-2 font-weight-black mb-3">إيرادات حسب العميل</div>
      <v-card variant="outlined" class="rounded-xl overflow-hidden">
        <v-table density="compact">
          <thead>
            <tr>
              <th class="font-weight-black">العميل</th>
              <th class="font-weight-black">الإجمالي</th>
              <th class="font-weight-black">المحصل</th>
              <th class="font-weight-black">المتبقي</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="client in report.by_client" :key="client.client_id">
              <td class="font-weight-bold">{{ client.client_name || 'غير محدد' }}</td>
              <td>{{ formatMoney(client.total) }}</td>
              <td class="text-success font-weight-black">{{ formatMoney(client.collected) }}</td>
              <td class="text-error font-weight-black">{{ formatMoney(client.total - client.collected) }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </div>

    <!-- الأقساط المتأخرة -->
    <div v-if="report?.overdue_items?.length">
      <div class="text-subtitle-2 font-weight-black mb-3 text-error">
        <LucideIcon name="alert-triangle" :size="16" class="me-1" />
        الأقساط المتأخرة ({{ report.overdue_items.length }})
      </div>
      <v-card variant="outlined" class="rounded-xl overflow-hidden">
        <v-table density="compact">
          <thead>
            <tr>
              <th class="font-weight-black">العميل</th>
              <th class="font-weight-black">رقم الخدمة</th>
              <th class="font-weight-black">القسط</th>
              <th class="font-weight-black">المبلغ</th>
              <th class="font-weight-black">تاريخ الاستحقاق</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in report.overdue_items" :key="item.id">
              <td>{{ item.client_name }}</td>
              <td>{{ item.engagement_number }}</td>
              <td>{{ item.title }}</td>
              <td class="text-error font-weight-black">{{ formatMoney(item.amount) }}</td>
              <td>{{ item.due_date }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </div>

    <!-- لا توجد بيانات -->
    <div v-if="report && !loading && !report.by_category?.length" class="text-center py-8 text-medium-emphasis">
      <LucideIcon name="check-circle" :size="48" class="mb-3 opacity-20" />
      <div>لا توجد بيانات تطابق الفلاتر المحددة</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOfficeAccountsStore } from '../../stores/officeAccounts'

const store = useOfficeAccountsStore()
const loading = ref(false)

const filters = ref<Record<string, any>>({
  status: 'all',
  from_date: '',
  to_date: ''
})

const statusOptions = [
  { text: 'الكل', value: 'all' },
  { text: 'قيد الانتظار', value: 'pending' },
  { text: 'مدفوع جزئياً', value: 'partial' },
  { text: 'مدفوع بالكامل', value: 'paid' },
  { text: 'متأخر', value: 'overdue' },
  { text: 'مغلق', value: 'closed' }
]

const report = computed(() => store.report)

const summaryCards = computed(() => {
  if (!report.value) return []
  const s = report.value.summary
  return [
    { key: 'revenue', label: 'إجمالي الإيرادات', value: s.total_revenue, color: 'text-primary' },
    { key: 'collected', label: 'المحصل', value: s.total_collected, color: 'text-success' },
    { key: 'outstanding', label: 'المستحق', value: s.total_outstanding, color: 'text-warning' },
    { key: 'overdue', label: 'المتأخر', value: s.total_overdue, color: 'text-error' }
  ]
})

const formatMoney = (v: number) => (v || 0).toLocaleString('ar-SA')

const loadReport = async () => {
  loading.value = true
  try {
    await store.fetchReport(filters.value)
  } finally {
    loading.value = false
  }
}

onMounted(loadReport)
</script>
