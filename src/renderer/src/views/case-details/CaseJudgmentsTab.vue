<template>
  <div>
    <v-btn
      color="accent"
      variant="flat"
      size="small"
      class="mb-6 rounded-lg font-weight-black text-primary-dark"
      @click="$emit('add')"
    >
      <LucideIcon name="plus" :size="16" class="me-2" /> تسجيل حكم
    </v-btn>
    <v-table class="premium-table mt-4">
      <thead>
        <tr>
          <th class="text-right text-gold font-weight-black">الدرجة</th>
          <th class="text-right text-gold font-weight-black">التاريخ</th>
          <th class="text-right text-gold font-weight-black">الحالة</th>
          <th class="text-right text-gold font-weight-black">موعد الاعتراض</th>
          <th class="text-right text-gold font-weight-black">إجراءات</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="judgments.length === 0">
          <td colspan="5" class="text-center pa-8 text-gold opacity-50 italic">
            لا توجد أحكام مسجلة
          </td>
        </tr>
        <tr v-for="j in judgments" :key="j.id" class="premium-hover">
          <td class="text-visible-high font-weight-black">{{ j.type }}</td>
          <td>
            <div class="d-flex flex-column py-1">
              <span class="text-subtitle-2 font-weight-black text-visible-high"
                >{{ j.judgment_date }} مـ</span
              >
              <v-chip
                v-if="j.judgment_date_hijri"
                size="x-small"
                color="accent"
                variant="tonal"
                class="mt-1 font-weight-black"
                density="compact"
                >{{ j.judgment_date_hijri }} هـ</v-chip
              >
            </div>
          </td>
          <td>
            <v-chip
              :color="j.favor?.includes('لصالح') ? 'success' : 'error'"
              size="x-small"
              variant="flat"
              class="font-weight-black"
              >{{ j.favor }}</v-chip
            >
          </td>
          <td>
            <v-chip
              :color="isUrgent(j.objection_deadline) ? 'error' : 'grey'"
              size="x-small"
              variant="tonal"
              class="font-weight-black"
              >{{ j.objection_deadline }}</v-chip
            >
          </td>
          <td>
            <v-btn
              variant="text"
              color="accent"
              size="x-small"
              class="rounded-lg"
              @click="$emit('amend', j.id)"
            >
              <LucideIcon name="file-edit" :size="16" />
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'

defineProps<{
  judgments: any[]
}>()

defineEmits<{ add: []; amend: [id: string] }>()

const isUrgent = (deadline: string): boolean => {
  if (!deadline) return false
  const diff = new Date(deadline).getTime() - Date.now()
  return diff < 7 * 24 * 60 * 60 * 1000
}
</script>
