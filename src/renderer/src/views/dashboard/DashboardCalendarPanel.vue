<template>
  <v-window-item value="calendar" class="h-100">
    <v-row dense class="ma-0">
      <v-col cols="12" sm="7">
        <div class="d-flex align-center justify-space-between mb-1">
          <div class="font-weight-black text-white text-tiny">
            {{ calendarMonthLabel }}
          </div>
          <div class="d-flex align-center gap-1">
            <v-btn
              variant="tonal"
              color="primary"
              icon
              size="x-small"
              @click="$emit('prev-month')"
            >
              <LucideIcon name="chevron-right" :size="12" />
            </v-btn>
            <v-btn
              variant="tonal"
              color="primary"
              icon
              size="x-small"
              @click="$emit('next-month')"
            >
              <LucideIcon name="chevron-left" :size="12" />
            </v-btn>
          </div>
        </div>
        <div class="calendar-grid-mini border-gold-glow elite-glass">
          <div v-for="d in weekDays" :key="d" class="calendar-head font-weight-black">
            {{ d }}
          </div>
          <button
            v-for="cell in calendarCells"
            :key="cell.key"
            type="button"
            class="calendar-cell-mini calendar-day"
            :class="{
              'calendar-day--muted': !cell.inMonth,
              'calendar-day--selected': cell.iso === selectedDate,
              'calendar-day--has': (importantDatesByDay[cell.iso] || []).length > 0
            }"
            @click="$emit('select-date', cell.iso)"
          >
            <div class="calendar-day__num">{{ cell.day }}</div>
            <div
              v-if="(importantDatesByDay[cell.iso] || []).length > 0"
              class="calendar-day__dot"
            ></div>
          </button>
        </div>
      </v-col>
      <v-col cols="12" sm="5" class="d-flex flex-column gap-1 overflow-hidden">
        <v-card
          elevation="0"
          class="glass-card-light overflow-hidden flex-grow-1 d-flex flex-column"
          min-height="100"
        >
          <v-card-title
            class="pa-1 px-2 d-flex align-center justify-space-between shrink-0"
          >
            <span class="text-tiny-v font-weight-black dashboard-title">
              {{ selectedDate }} &nbsp; &nbsp; &nbsp; | &nbsp; &nbsp; &nbsp;
              {{ gregorianIsoToHijriIso(selectedDate) }}
            </span>
          </v-card-title>
          <v-divider opacity="0.1"></v-divider>
          <div class="overflow-y-auto max-h-140">
            <div
              v-if="selectedImportantDates.length === 0"
              class="pa-2 text-center opacity-40 text-tiny-v"
            >
              لا توجد أحداث
            </div>
            <v-list v-else class="pa-0 dashboard-list-mini" density="compact">
              <v-list-item
                v-for="it in selectedImportantDates"
                :key="it.type + it.date + it.title"
                class="px-2 border-b"
              >
                <v-list-item-title class="font-weight-black text-tiny-v">{{
                  it.title
                }}</v-list-item-title>
                <v-list-item-subtitle
                  v-if="it.subtitle"
                  class="text-tiny-vv opacity-70"
                >
                  {{ it.subtitle }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-window-item>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'
import { gregorianIsoToHijriIso } from '../../utils/hijriIso'

defineProps<{
  calendarMonthLabel: string
  calendarCells: { key: string; iso: string; day: number; inMonth: boolean }[]
  selectedDate: string
  importantDatesByDay: Record<string, any[]>
  selectedImportantDates: any[]
  weekDays: string[]
  isMobile: boolean
}>()

defineEmits<{
  (e: 'prev-month'): void
  (e: 'next-month'): void
  (e: 'select-date', value: string): void
}>()
</script>

<style scoped>
.calendar-grid-mini {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
  padding: 6px;
  background: rgba(197, 160, 40, 0.03);
  border-radius: 12px;
  box-shadow: inset 0 0 10px rgba(197, 160, 40, 0.05);
}

.calendar-cell-mini {
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(197, 160, 40, 0.05) 100%);
  min-height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem !important;
  border: 1px solid rgba(197, 160, 40, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #000 !important;
  font-weight: 900;
}

.calendar-cell-mini:hover {
  background: rgba(220, 38, 38, 0.1) !important;
  border-color: rgba(220, 38, 38, 0.5) !important;
  color: #dc2626 !important;
  transform: scale(1.08);
  z-index: 2;
}

.calendar-day__dot {
  position: absolute;
  bottom: 4px;
  width: 5px;
  height: 5px;
  background: #3b82f6 !important;
  border-radius: 50%;
  box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
}

.calendar-day {
  position: relative;
}

.calendar-day--selected {
  background: linear-gradient(135deg, var(--v-primary-base) 0%, #d4af37 100%) !important;
  color: white !important;
  font-weight: 900 !important;
  box-shadow: 0 4px 12px rgba(197, 160, 40, 0.3) !important;
  border: none !important;
}

.text-tiny-v {
  font-size: 0.6rem !important;
  height: 18px !important;
}

.calendar-head {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem !important;
  color: #000 !important;
  padding: 4px 0;
  text-align: center;
  min-height: 24px;
}

.text-tiny-vv {
  font-size: 0.55rem !important;
  line-height: 1 !important;
}

.max-h-140 {
  max-height: 140px;
}

.border-gold-glow {
  box-shadow: 0 0 15px rgba(197, 160, 40, 0.1);
  border: 1px solid rgba(197, 160, 40, 0.15) !important;
}

.dashboard-title {
  color: #000000 !important;
}

.dashboard-list-mini :deep(.v-list-item) {
  min-height: 24px !important;
  padding: 2px 8px !important;
}

.dashboard-list-mini :deep(.v-list-item-title) {
  font-size: 0.7rem !important;
  line-height: 1.1 !important;
  font-weight: 800 !important;
  color: #000 !important;
}

.dashboard-list-mini :deep(.v-list-item-subtitle) {
  font-size: 0.6rem !important;
  line-height: 1.1 !important;
  opacity: 0.7;
}

[data-theme='dark'] .dashboard-title {
  color: #ffffff !important;
}

@media (max-width: 768px) {
  .calendar-grid-mini {
    font-size: 0.75rem !important;
  }

  .calendar-cell-mini {
    min-height: 36px !important;
    min-width: 36px !important;
  }

  .v-window-item .v-row .v-col,
  .v-col-sm-7,
  .v-col-sm-5 {
    flex: 0 0 100% !important;
    max-width: 100% !important;
  }

  .dashboard-title {
    font-size: 0.8rem !important;
  }
}
</style>
