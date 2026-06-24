<template>
  <v-card elevation="0" class="glass-card overflow-hidden glass-card">
    <div class="glass-panel px-6 pt-2">
      <v-tabs
        :model-value="tab"
        color="accent"
        align-tabs="start"
        class="premium-tabs"
        @update:model-value="$emit('update:tab', $event)"
      >
        <v-tab value="employment" class="font-weight-black">عقود الموظفين</v-tab>
        <v-tab value="fee_agreement" class="font-weight-black">عقود الأتعاب (قضايا)</v-tab>
      </v-tabs>
    </div>
    <v-divider class="border-gold opacity-10" />
    <v-card-text class="pa-8">
      <v-alert
        v-if="!can('view_contracts')"
        type="error"
        variant="flat"
        class="rounded-lg mb-6 border-dashed"
      >
        <template #prepend><LucideIcon name="shield-alert" :size="24" class="me-3" /></template>
        ليس لديك صلاحية كافية للوصول إلى أرشيف العقود. يرجى مراجعة المسؤول.
      </v-alert>
      <div v-else>
        <v-row dense class="mb-8 align-center">
          <v-col cols="12" md="4">
            <v-text-field
              :model-value="search"
              variant="outlined"
              density="comfortable"
              placeholder="بحث برقم العقد، العنوان، أو اسم الطرف..."
              hide-details
              class="glass-input"
              clearable
              @update:model-value="$emit('update:search', $event)"
            >
              <template #prepend-inner
                ><LucideIcon name="search" :size="20" class="text-gold opacity-50"
              /></template>
            </v-text-field>
          </v-col>
          <v-spacer />
          <v-col cols="auto">
            <v-btn
              variant="text"
              color="gold"
              class="rounded-lg opacity-70 premium-btn-gold-gradient"
              :loading="loading"
              @click="$emit('reload')"
            >
              <LucideIcon name="refresh-cw" :size="20" class="me-2" />
              <span class="font-weight-black">تحديث البيانات</span>
            </v-btn>
          </v-col>
        </v-row>
        <v-table hover class="bg-transparent premium-table">
          <thead>
            <tr>
              <th class="text-right text-gold opacity-70 font-weight-black">العقد والمرجع</th>
              <th class="text-right text-gold opacity-70 font-weight-black">التصنيف</th>
              <th class="text-right text-gold opacity-70 font-weight-black">الحالة</th>
              <th class="text-right text-gold opacity-70 font-weight-black">القيمة المالية</th>
              <th class="text-right text-gold opacity-70 font-weight-black">التاريخ</th>
              <th class="text-left text-gold opacity-70 font-weight-black">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filtered.length === 0">
              <td colspan="6" class="text-center pa-8">
                <LucideIcon name="file-x" :size="48" class="mx-auto mb-4 text-gold opacity-20" />
                <div class="text-h6 text-gold opacity-40">
                  لا توجد عقود {{ tab === 'employment' ? 'توظيف' : 'أتعاب' }} مطابقة
                </div>
              </td>
            </tr>
            <tr v-for="c in filtered" :key="c.id" class="premium-hover-row">
              <td>
                <div class="font-weight-black text-white mb-1">{{ c.title || 'بدون عنوان' }}</div>
                <div class="text-tiny text-gold opacity-50 font-weight-black">
                  {{ c.contract_no || '—' }}
                </div>
              </td>
              <td>
                <v-chip
                  size="x-small"
                  :color="c.contract_type === 'employment' ? 'accent' : 'info'"
                  variant="flat"
                  class="font-weight-black rounded-md"
                >
                  {{ c.contract_type === 'employment' ? 'توظيف' : 'أتعاب' }}
                </v-chip>
              </td>
              <td>
                <v-chip
                  size="x-small"
                  :color="
                    c.status === 'approved'
                      ? 'success'
                      : c.status === 'archived'
                        ? 'grey'
                        : 'warning'
                  "
                  variant="flat"
                  class="font-weight-black rounded-md"
                >
                  {{
                    c.status === 'approved'
                      ? 'معتمد'
                      : c.status === 'archived'
                        ? 'مؤرشف'
                        : 'قيد الانتظار'
                  }}
                </v-chip>
              </td>
              <td class="font-weight-black text-white">{{ formatCurrency(c.total_amount) }}</td>
              <td class="text-gold font-weight-black">{{ c.contract_date || '—' }}</td>
              <td>
                <div class="d-flex align-center gap-2">
                  <v-btn
                    icon
                    size="small"
                    variant="tonal"
                    color="accent"
                    class="rounded-lg premium-btn-gold-gradient"
                    @click="$emit('view', c.id)"
                  >
                    <LucideIcon name="eye" :size="16" />
                    <v-tooltip activator="parent" location="top">معاينة العقد</v-tooltip>
                  </v-btn>
                  <v-btn
                    v-if="c.status === 'pending'"
                    icon
                    size="small"
                    variant="tonal"
                    color="success"
                    class="rounded-lg premium-btn-gold-gradient"
                    @click="$emit('approve', c.id)"
                  >
                    <LucideIcon name="check" :size="16" />
                    <v-tooltip activator="parent" location="top">اعتماد العقد</v-tooltip>
                  </v-btn>
                  <v-btn
                    v-if="c.status !== 'archived'"
                    icon
                    size="small"
                    variant="tonal"
                    color="grey"
                    class="rounded-lg premium-btn-gold-gradient"
                    @click="$emit('archive', c.id)"
                  >
                    <LucideIcon name="archive" :size="16" />
                    <v-tooltip activator="parent" location="top">أرشفة</v-tooltip>
                  </v-btn>
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'

defineProps<{
  tab: string
  search: string
  loading: boolean
  filtered: any[]
  can: (perm: string) => boolean
  formatCurrency: (val: any) => string
}>()

defineEmits<{
  'update:tab': [value: string]
  'update:search': [value: string]
  reload: []
  view: [id: string]
  approve: [id: string]
  archive: [id: string]
}>()
</script>
