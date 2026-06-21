<template>
  <v-card variant="flat" class="rounded-xl glass-card border overflow-hidden">
    <div
      class="py-4 px-6 text-subtitle-2 font-weight-black text-primary d-flex align-center glass-card-noir border-0 border-b"
    >
      <LucideIcon name="calendar-days" :size="18" class="text-accent me-2" />
      سجل الجلسات المرتبطة
      <v-spacer />
      <v-progress-circular v-if="loading" indeterminate size="18" width="2" color="accent" />
    </div>
    <v-card-text class="pa-0">
      <v-table density="compact" class="bg-transparent">
        <thead>
          <tr>
            <th class="text-right text-text-muted font-weight-black py-4">التاريخ</th>
            <th class="text-right text-text-muted font-weight-black">الوقت</th>
            <th class="text-right text-text-muted font-weight-black">القاعة</th>
            <th class="text-right text-text-muted font-weight-black">الحالة</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="sessions.length === 0">
            <td colspan="4" class="text-center py-8 text-text-muted opacity-50 italic">
              لا توجد جلسات مضافة بعد
            </td>
          </tr>
          <tr v-for="s in sessions" :key="s.id" class="premium-hover">
            <td class="font-weight-bold text-primary">{{ s.date || '-' }}</td>
            <td>{{ s.time || '-' }}</td>
            <td>{{ s.court_room || '-' }}</td>
            <td>
              <v-chip
                size="x-small"
                :color="
                  s.status?.includes('تمت')
                    ? 'success'
                    : s.status?.includes('مؤجلة')
                      ? 'warning'
                      : 'info'
                "
                variant="flat"
                class="font-weight-black rounded-lg"
              >
                {{ s.status || '-' }}
              </v-chip>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'

defineProps<{
  sessions: any[]
  loading: boolean
}>()
</script>
