<template>
  <v-window-item value="calendar" class="h-100">
    <v-row dense class="ma-0">
      <v-col cols="12" sm="7" class="pr-0">
        <div class="d-flex align-center justify-space-between mb-3 px-1">
          <div class="font-weight-bold text-ebony text-subtitle-1">
            {{ calendarMonthLabel }}
          </div>
          <div class="d-flex align-center gap-2">
            <v-btn
              variant="tonal"
              color="grey-darken-1"
              icon
              size="small"
              class="rounded-circle"
              @click="$emit('prev-month')"
            >
              <LucideIcon name="chevron-right" :size="16" />
            </v-btn>
            <v-btn
              variant="tonal"
              color="grey-darken-1"
              icon
              size="small"
              class="rounded-circle"
              @click="$emit('next-month')"
            >
              <LucideIcon name="chevron-left" :size="16" />
            </v-btn>
          </div>
        </div>
        <div class="calendar-grid-mini bg-white rounded-lg border">
          <div
            v-for="d in weekDays"
            :key="d"
            class="calendar-head font-weight-bold text-grey-darken-3"
          >
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
      <v-col cols="12" sm="5" class="d-flex flex-column gap-1 overflow-hidden pl-0">
        <v-card
          elevation="0"
          class="bg-white border rounded-lg overflow-hidden flex-grow-1 d-flex flex-column"
          min-height="100"
        >
          <v-card-title
            class="pa-2 px-3 d-flex align-center justify-start shrink-0 bg-grey-lighten-4"
          >
            <span class="text-caption font-weight-bold text-ebony">
              {{ gregorianIsoToHijriIso(selectedDate) }} &nbsp; | &nbsp; {{ selectedDate }}
            </span>
          </v-card-title>
          <v-divider></v-divider>
          <div class="overflow-y-auto flex-grow-1 p-2">
            <div
              v-if="selectedImportantDates.length === 0"
              class="pa-4 text-center text-grey text-body-2 mt-4"
            >
              لا توجد بيانات
            </div>
            <v-list v-else class="pa-0 bg-transparent" density="compact">
              <v-list-item
                v-for="it in selectedImportantDates"
                :key="it.type + it.date + it.title"
                class="px-3 py-2 border-b"
              >
                <v-list-item-title class="font-weight-bold text-body-2 text-ebony mb-1">{{
                  it.title
                }}</v-list-item-title>
                <v-list-item-subtitle
                  v-if="it.subtitle"
                  class="text-caption text-grey-darken-1"
                  style="white-space: normal"
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
  padding: 8px;
}

.calendar-cell-mini {
  border-radius: 8px;
  background: #ffffff;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem !important;
  border: 1px solid #f8f9fa;
  transition: all 0.2s ease;
  color: #1f2937 !important;
  font-weight: 400;
}

.calendar-cell-mini:hover {
  background: #f3f4f6 !important;
  border-color: #e5e7eb !important;
}

.calendar-day__dot {
  position: absolute;
  bottom: 4px;
  width: 4px;
  height: 4px;
  background: #3b82f6 !important;
  border-radius: 50%;
}

.calendar-day {
  position: relative;
}

.calendar-day--muted {
  color: #9ca3af !important;
  background: #f9fafb;
}

.calendar-day--selected {
  background: #fff8eb !important;
  color: #1f2937 !important;
  font-weight: 600 !important;
  border: 2px solid #f59e0b !important;
}

.calendar-head {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem !important;
  color: #4b5563 !important;
  padding: 8px 0;
  text-align: center;
}

.border {
  border: 1px solid #e5e7eb !important;
}

.border-b {
  border-bottom: 1px solid #e5e7eb !important;
}

@media (max-width: 768px) {
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
}
</style>
