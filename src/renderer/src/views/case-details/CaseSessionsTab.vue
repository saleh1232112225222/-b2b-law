<template>
  <div>
    <v-alert v-if="blocked" type="error" variant="tonal" class="glass-card mb-6">
      <template #prepend
        ><LucideIcon name="shield-alert" :size="24" class="text-error me-3"
      /></template>
      <div class="text-subtitle-2 font-weight-black">يوجد حظر مهني على هذه القضية</div>
      <div class="text-caption opacity-80">{{ blockReason }}</div>
    </v-alert>

    <v-btn
      color="accent"
      variant="flat"
      size="small"
      class="mb-6 rounded-lg font-weight-black text-primary-dark premium-btn-gold-gradient"
      :disabled="blocked"
      @click="$emit('add')"
    >
      <LucideIcon name="plus" :size="16" class="me-2" /> إضافة جلسة
    </v-btn>

    <v-table class="premium-table mt-4">
      <thead>
        <tr>
          <th class="text-right text-gold font-weight-black">التاريخ</th>
          <th class="text-right text-gold font-weight-black">الساعة</th>
          <th class="text-right text-gold font-weight-black">القاعة</th>
          <th class="text-right text-gold font-weight-black">النتيجة</th>
          <th class="text-right text-gold font-weight-black">رابط الجلسة</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="sessions.length === 0">
          <td colspan="5" class="text-center pa-8 text-gold opacity-50 italic">
            لا توجد جلسات مسجلة
          </td>
        </tr>
        <tr v-for="s in sessions" :key="s.id" class="premium-hover">
          <td>
            <div class="d-flex flex-column py-1">
              <span class="text-subtitle-2 font-weight-black text-visible-high"
                >{{ s.date }} مـ</span
              >
              <v-chip
                size="x-small"
                color="accent"
                variant="tonal"
                class="mt-1 font-weight-black"
                style="max-width: fit-content"
              >
                {{ s.date_hijri || (s.date ? getHijri(s.date) : '') }} هـ
              </v-chip>
            </div>
          </td>
          <td class="text-visible-high">{{ s.time }}</td>
          <td class="text-visible-high">{{ s.court_room }}</td>
          <td class="text-visible-high">{{ s.result || '-' }}</td>
          <td>
            <v-btn
              v-if="s.meeting_link"
              color="accent"
              size="x-small"
              variant="tonal"
              class="rounded-lg px-3 font-weight-black premium-btn-gold-gradient"
              @click="openLink(s.meeting_link)"
            >
              <LucideIcon name="video" :size="14" class="me-1" /> انضمام
            </v-btn>
            <span v-else class="text-caption text-primary italic">لا يوجد رابط</span>
          </td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'

defineProps<{
  sessions: any[]
  blocked: boolean
  blockReason: string
}>()

defineEmits<{ add: [] }>()

const getHijri = (date: string): string => {
  try {
    return new Date(date).toLocaleDateString('ar-SA')
  } catch {
    return ''
  }
}
const openLink = (url: string): void => {
  window.open(url, '_blank')
}
</script>
