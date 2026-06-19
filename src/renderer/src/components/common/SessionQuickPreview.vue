<template>
  <div class="quick-preview-container">
    <div v-if="loading" class="text-center pa-10">
      <v-progress-circular indeterminate color="accent" size="50"></v-progress-circular>
      <div class="mt-4 text-gold opacity-50 font-weight-black">جاري استدعاء تفاصيل الجلسة...</div>
    </div>

    <div v-else-if="session" class="pa-4">
      <!-- Status & Date Header -->
      <div class="d-flex align-center justify-space-between mb-6 bg-accent-alpha pa-4 rounded-xl border-gold-alpha">
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-2 rounded-lg me-3">
            <LucideIcon name="calendar-clock" :size="24" class="text-accent" />
          </div>
          <div>
            <h4 class="text-subtitle-1 font-weight-black text-white mb-1">
              {{ session.date }} مـ
            </h4>
            <span class="text-caption text-gold opacity-60">الوقت: {{ session.time || 'غير محدد' }}</span>
          </div>
        </div>
        <v-chip :color="getStatusColor(session.status)" variant="flat" class="font-weight-black rounded-lg px-4">
          {{ session.status }}
        </v-chip>
      </div>

      <!-- Session Classification & Room -->
      <v-row class="mb-4">
        <v-col cols="6">
          <div class="text-tiny text-gold opacity-50 font-weight-bold mb-1">نوع الجلسة</div>
          <div class="text-body-2 font-weight-black text-white">{{ session.type || 'مرافعة' }}</div>
        </v-col>
        <v-col cols="6">
          <div class="text-tiny text-gold opacity-50 font-weight-bold mb-1">القاعة / الدائرة</div>
          <div class="text-body-2 font-weight-black text-white">{{ session.court_room || 'غير محدد' }}</div>
        </v-col>
      </v-row>

      <v-divider class="border-gold opacity-10 mb-4"></v-divider>

      <!-- Linked Case Section -->
      <div v-if="caseItem" class="mb-4">
        <div class="text-caption font-weight-bold text-gold mb-2">ملف القضية المقترن</div>
        <v-card elevation="0" class="glass-panel-light pa-4 rounded-xl border-gold-alpha">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-body-2 font-weight-black text-accent">{{ caseItem.case_number }}</span>
            <v-chip size="x-small" color="primary" class="font-weight-bold">{{ caseItem.priority || 'عادية' }}</v-chip>
          </div>
          <div class="text-body-2 font-weight-black text-white mb-2">{{ caseItem.subject }}</div>
          <div class="text-caption text-gold opacity-60">المحكمة: {{ caseItem.court || 'غير محدد' }}</div>
        </v-card>
      </div>

      <!-- Digital Link -->
      <div v-if="session.meeting_link" class="mb-4">
        <v-btn
          block
          color="success"
          variant="flat"
          class="rounded-xl font-weight-black h-48 premium-lift"
          @click="openMeetingLink(session.meeting_link)"
        >
          <LucideIcon name="video" :size="18" class="me-2" /> الانضمام للجلسة الرقمية (ناجز / Teams)
        </v-btn>
      </div>

      <!-- Notes & Decisions -->
      <v-card variant="tonal" color="primary" class="pa-4 rounded-xl border-gold-alpha mb-4">
        <div class="text-caption font-weight-black text-gold mb-2 d-flex align-center">
          <LucideIcon name="sticky-note" :size="16" class="me-2 opacity-50" /> وقائع وتفاصيل الجلسة
        </div>
        <div class="text-caption text-white opacity-70 leading-relaxed font-weight-medium pre-wrap">
          {{ session.notes || 'لا توجد وقائع مسجلة بعد.' }}
        </div>
      </v-card>

      <v-card v-if="session.result" variant="tonal" color="success" class="pa-4 rounded-xl border-gold-alpha">
        <div class="text-caption font-weight-black text-accent mb-2 d-flex align-center">
          <LucideIcon name="check-square" :size="16" class="me-2 opacity-50" /> قرار اللجنة / سبب التأجيل
        </div>
        <div class="text-caption text-white opacity-70 leading-relaxed font-weight-medium">
          {{ session.result }}
        </div>
      </v-card>
    </div>

    <div v-else class="text-center pa-10 text-error">
      الجلسة المطلوبة غير موجودة.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Session, Case } from '../../types'
import LucideIcon from './LucideIcon.vue'

const props = defineProps<{
  sessionId: string | number
}>()

const loading = ref(true)
const session = ref<Session | null>(null)
const caseItem = ref<Case | null>(null)

const loadData = async () => {
  if (!props.sessionId) return
  loading.value = true
  try {
    const all = await (window as any).api.sessions.getAll()
    const found = all.find((s: any) => String(s.id) === String(props.sessionId))
    if (found) {
      session.value = found
      if (found.case_id) {
        const caseData = await (window as any).api.cases.getById(String(found.case_id))
        caseItem.value = caseData
      }
    }
  } catch (err) {
    console.error('Failed to load session quick preview:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

watch(() => props.sessionId, () => {
  loadData()
})

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'قادمة':
      return 'accent'
    case 'تمت':
      return 'green-darken-3'
    case 'مؤجلة':
      return 'warning'
    case 'ملغاة':
      return 'error'
    default:
      return 'grey'
  }
}

const openMeetingLink = (link: string) => {
  if (link) window.open(link, '_blank')
}
</script>

<style scoped>
.bg-accent-alpha {
  background: rgba(var(--v-theme-accent), 0.08) !important;
}
.border-gold-alpha {
  border: 1px solid rgba(233, 195, 73, 0.15) !important;
}
.text-tiny {
  font-size: 0.72rem;
}
.glass-panel-light {
  background: rgba(255, 255, 255, 0.02) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.pre-wrap {
  white-space: pre-wrap;
}
.h-48 {
  height: 48px !important;
}
</style>