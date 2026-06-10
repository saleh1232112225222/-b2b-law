<template>
  <div class="case-journey-container pa-4 rtl">
    <div class="d-flex align-center mb-6">
      <LucideIcon name="milestone" :size="32" class="text-accent me-3" />
      <h2 class="text-h5 font-weight-black text-gold">الدياغرام التفاعلي لمسار القضية</h2>
      <v-spacer></v-spacer>
      <v-btn-toggle
        v-model="viewMode"
        mandatory
        density="compact"
        color="accent"
        variant="tonal"
        class="rounded-lg glass-panel"
      >
        <v-btn value="flow" class="font-weight-black">
          <LucideIcon name="workflow" :size="16" class="me-2" /> انسيابي
        </v-btn>
        <v-btn value="timeline" class="font-weight-black">
          <LucideIcon name="clock" :size="16" class="me-2" /> زمني
        </v-btn>
      </v-btn-toggle>
    </div>

    <!-- Flow Mode -->
    <div v-if="viewMode === 'flow'" class="journey-flow pa-6">
      <div v-for="(group, stage) in groupedEvents" :key="stage" class="stage-section mb-10">
        <div class="stage-header d-flex align-center mb-6">
          <v-chip color="accent" variant="flat" class="font-weight-black text-primary-dark px-4">{{
            stage
          }}</v-chip>
          <div class="connector-line flex-grow-1 mx-4 opacity-20"></div>
        </div>

        <v-row>
          <v-col v-for="event in group" :key="event.id" cols="12" sm="6" md="4" lg="3">
            <v-card
              elevation="0"
              class="event-node glass-card pa-5 transition-swing premium-lift h-100"
              :class="{ 'active-node': selectedEventId === event.id }"
              @click="$emit('select-event', event)"
            >
              <div class="d-flex align-center mb-3">
                <div :class="`bg-${getEventColor(event.type)}-alpha pa-2 rounded-lg me-3`">
                  <LucideIcon
                    :name="getEventIcon(event.type)"
                    :size="20"
                    :class="`text-${getEventColor(event.type)}`"
                  />
                </div>
                <div class="flex-grow-1">
                  <div class="text-tiny font-weight-black text-gold opacity-50">
                    {{ event.date }}
                  </div>
                  <div
                    class="text-subtitle-2 font-weight-black text-white line-clamp-1"
                    :title="event.title"
                  >
                    {{ event.title }}
                  </div>
                </div>
              </div>

              <div class="text-caption text-gold opacity-70 mb-4 line-clamp-2 leading-relaxed">
                {{ event.summary }}
              </div>

              <div class="d-flex align-center justify-space-between mt-auto">
                <v-chip
                  :color="getStatusColor(event.status)"
                  size="x-small"
                  variant="flat"
                  class="font-weight-black"
                >
                  {{ event.status }}
                </v-chip>
                <LucideIcon
                  v-if="event.details.attachments?.length"
                  name="paperclip"
                  :size="14"
                  class="text-gold opacity-40"
                />
              </div>
            </v-card>
          </v-col>

          <!-- Placeholder if stage has no events -->
          <v-col v-if="group.length === 0" cols="12">
            <div
              class="text-center pa-6 glass-card border-dashed text-gold opacity-30 italic rounded-lg"
            >
              لا توجد بيانات لهذه المرحلة
            </div>
          </v-col>
        </v-row>
      </div>
    </div>

    <!-- Timeline Mode -->
    <v-timeline
      v-else
      align="start"
      side="end"
      truncate-line="both"
      line-color="rgba(212, 175, 55, 0.2)"
    >
      <v-timeline-item
        v-for="event in events"
        :key="event.id"
        :dot-color="getEventColor(event.type)"
        size="small"
      >
        <template #icon>
          <LucideIcon :name="getEventIcon(event.type)" :size="14" class="text-white" />
        </template>
        <template #opposite>
          <div class="text-subtitle-2 font-weight-black text-gold">{{ event.date }}</div>
          <div class="text-tiny text-gold opacity-50">{{ event.stage }}</div>
        </template>

        <v-card
          elevation="0"
          class="glass-card pa-5 transition-swing premium-lift"
          hover
          @click="$emit('select-event', event)"
        >
          <div class="text-subtitle-1 font-weight-black text-white">{{ event.title }}</div>
          <div class="text-caption text-gold opacity-70 mt-2 leading-relaxed">
            {{ event.summary }}
          </div>
          <div class="mt-3">
            <v-chip
              :color="getStatusColor(event.status)"
              size="x-small"
              variant="flat"
              class="font-weight-black"
              >{{ event.status }}</v-chip
            >
          </div>
        </v-card>
      </v-timeline-item>
    </v-timeline>

    <div v-if="events.length === 0" class="text-center pa-15">
      <LucideIcon name="map" :size="64" class="text-gold opacity-10 mb-4" />
      <div class="text-h6 text-gold opacity-40 italic">
        لا تتوفر بيانات كافية لبناء مسار القضية حالياً
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { CaseJourneyEvent, CaseJourneyEventType, CaseJourneyStatus } from '../types/caseJourney'
import LucideIcon from './common/LucideIcon.vue'

const props = defineProps<{
  events: CaseJourneyEvent[]
  selectedEventId?: string
}>()

defineEmits(['select-event'])

const viewMode = ref('flow')

const stagesOrder = ['قيد القضية', 'الجلسات', 'المذكرات', 'الأحكام', 'الاستئناف', 'التنفيذ']

const groupedEvents = computed(() => {
  const groups: Record<string, CaseJourneyEvent[]> = {}
  stagesOrder.forEach((stage) => (groups[stage] = []))

  props.events.forEach((event) => {
    if (groups[event.stage]) {
      groups[event.stage].push(event)
    }
  })

  return groups
})

const getEventColor = (type: CaseJourneyEventType) => {
  const map: Record<string, string> = {
    FILING: 'indigo',
    SESSION: 'primary',
    MEMO: 'teal',
    JUDGMENT: 'accent',
    APPEAL: 'brown',
    EXECUTION: 'success',
    ATTACHMENT: 'blue-grey',
    TASK: 'warning'
  }
  return map[type] || 'grey'
}

const getEventIcon = (type: CaseJourneyEventType) => {
  const map: Record<string, string> = {
    FILING: 'folder',
    SESSION: 'calendar',
    MEMO: 'scroll-text',
    JUDGMENT: 'gavel',
    APPEAL: 'gavel',
    EXECUTION: 'handshake',
    ATTACHMENT: 'paperclip',
    TASK: 'check-square'
  }
  return map[type] || 'circle'
}

const getStatusColor = (status: CaseJourneyStatus) => {
  const map: Record<string, string> = {
    مكتملة: 'success',
    تمت: 'success',
    مجدولة: 'info',
    بانتظار: 'warning',
    مؤجلة: 'error',
    مشطوبة: 'grey'
  }
  return map[status] || 'grey'
}
</script>

<style scoped>
.case-journey-container {
  min-height: 400px;
}

.event-node {
  border-right: 3px solid transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.event-node:hover {
  border-right: 3px solid var(--v-accent-base);
}

.active-node {
  background: rgba(212, 175, 55, 0.1) !important;
  border-right: 3px solid #d4af37 !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
}

.stage-section {
  position: relative;
}

.connector-line {
  height: 1px;
  background: linear-gradient(90deg, #d4af37 0%, rgba(212, 175, 55, 0) 100%);
}

.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.border-dashed {
  border: 1px dashed rgba(212, 175, 55, 0.2) !important;
}

/* RTL Specifics */
.rtl {
  direction: rtl;
}

.bg-indigo-alpha {
  background: rgba(63, 81, 181, 0.15);
}
.bg-primary-alpha {
  background: rgba(var(--v-theme-primary), 0.15);
}
.bg-teal-alpha {
  background: rgba(0, 150, 136, 0.15);
}
.bg-accent-alpha {
  background: rgba(212, 175, 55, 0.15);
}
.bg-brown-alpha {
  background: rgba(121, 85, 72, 0.15);
}
.bg-success-alpha {
  background: rgba(76, 175, 80, 0.15);
}
.bg-blue-grey-alpha {
  background: rgba(96, 125, 139, 0.15);
}
.bg-warning-alpha {
  background: rgba(255, 193, 7, 0.15);
}

.leading-relaxed {
  line-height: 1.6 !important;
}
</style>
