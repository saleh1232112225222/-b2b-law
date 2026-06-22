<template>
  <v-card class="urgent-card premium-lift" elevation="0">
    <v-toolbar color="transparent" flat height="96" class="px-8 border-b">
      <div class="d-flex align-center">
        <div class="urgent-icon-box me-5 premium-lift">
          <LucideIcon :name="ICONS.STATUS.URGENT" :size="30" class="text-error" />
        </div>
        <div>
          <v-toolbar-title class="text-h6 font-weight-black text-gold tracking-tight"
            >الإجراءات العاجلة (الحالة الحرجة)</v-toolbar-title
          >
          <div class="text-caption text-pure-black font-weight-black">
            تتطلب هذه المهام تدخلاً فورياً لتجنب تجميد الملفات والعمليات
          </div>
        </div>
      </div>
      <v-spacer></v-spacer>
      <v-btn
        v-if="sessions.length > 0"
        color="error"
        variant="tonal"
        class="rounded-xl font-weight-black px-8 py-2"
        height="44"
        :prepend-icon="ICONS.ACTION.FIX"
        @click="$emit('bulk-close')"
      >
        إغلاق إجباري للمهام المتأخرة في الأرشيف
      </v-btn>
    </v-toolbar>

    <div class="pa-0">
      <v-table hover class="premium-table">
        <thead>
          <tr class="bg-noir-surface">
            <th class="text-right font-weight-black ps-8">مستوى الخطورة</th>
            <th class="text-right font-weight-black">رقم القضية</th>
            <th class="text-right font-weight-black">الموكل</th>
            <th class="text-right font-weight-black">تاريخ الجلسة</th>
            <th class="text-right font-weight-black text-error">مدة التأخير</th>
            <th class="text-center font-weight-black pe-8">الإجراء المباشر</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="session in sessions" :key="session.id" class="session-row">
            <td class="ps-8">
              <v-chip
                :color="getSeverityColor(session)"
                size="small"
                variant="flat"
                class="rounded-lg font-weight-black px-4"
              >
                {{ getSeverityText(session) }}
              </v-chip>
            </td>
            <td class="font-weight-black text-gold text-body-2 tracking-tighter">
              {{ session.case_number }}
            </td>
            <td>
              <div class="d-flex align-center">
                <v-avatar
                  size="34"
                  class="me-3 bg-noir-surface text-gold text-caption font-weight-black border shadow-sm"
                >
                  {{ session.client_name?.charAt(0) || 'ق' }}
                </v-avatar>
                <div class="d-flex flex-column">
                  <span class="font-weight-black text-body-2 text-gold leading-none mb-1">{{
                    session.client_name
                  }}</span>
                  <span class="text-tiny text-secondary font-weight-black">ملف نشط</span>
                </div>
              </div>
            </td>
            <td class="text-body-2 font-weight-bold text-secondary">{{ session.date }}</td>
            <td>
              <div class="d-flex align-center">
                <LucideIcon :name="ICONS.STATUS.DELAY" :size="16" class="me-2 text-error pulse" />
                <span class="text-error font-weight-black text-body-2 text-decoration-underline">
                  {{ session.overdue_days > 0 ? `${session.overdue_days} أيام` : 'اليوم (عاجل)' }}
                </span>
              </div>
            </td>
            <td class="text-center pe-8">
              <v-btn
                color="accent"
                variant="flat"
                size="small"
                class="rounded-lg font-weight-black px-6 shadow-sm"
                :prepend-icon="ICONS.ENTITY.CASE"
                @click="$emit('close-result', session)"
              >
                إغلاق الإجراء
              </v-btn>
            </td>
          </tr>
          <tr v-if="sessions.length === 0">
            <td colspan="6" class="text-center py-16">
              <v-empty-state
                :icon="ICONS.STATUS.SUCCESS"
                color="success"
                title="المنطقة الآمنة: لا توجد معلقات"
                text="تمت مراجعة كافة الجلسات السابقة بنجاح. النظام يعمل بكفاءة قصوى."
                class="py-12"
              ></v-empty-state>
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { ICONS } from '../../config/icons'
import LucideIcon from '../common/LucideIcon.vue'

interface Session {
  id: string | number
  case_number: string
  client_name: string
  date: string
  overdue_days: number
}

const props = defineProps<{
  sessions: Session[]
}>()

defineEmits(['close-result', 'bulk-close'])

function getSeverityColor(session: any): string {
  const days = session.overdue_days || 0
  if (days > 7) return 'error'
  if (days > 2) return 'warning'
  return 'primary'
}

function getSeverityText(session: any): string {
  const days = session.overdue_days || 0
  if (days > 7) return 'حرج جداً'
  if (days > 2) return 'انتباه مطلوب'
  return 'متابعة عادية'
}
</script>

<style scoped>
.urgent-card {
  border-radius: var(--radius-lg) !important;
  border: 1px solid var(--border) !important;
  background: var(--surface) !important;
  overflow: hidden;
}

.urgent-icon-box {
  background: var(--accent-alpha);
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  border: 1px solid var(--border);
}

.premium-table {
  background: transparent !important;
}

.premium-table :deep(th) {
  font-size: 1.1rem !important;
  padding: 16px !important;
  color: var(--gold-royal) !important;
}

.premium-table :deep(td) {
  padding: 16px !important;
}

/* Global premium-table in main.css handles the rest */

.session-row {
  transition: var(--transition-smooth);
}

.pulse {
  animation: pulse-red 2s infinite;
}

@keyframes pulse-red {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.text-tiny {
  font-size: 0.95rem !important;
}
.leading-none {
  line-height: 1;
}
.tracking-tight {
  letter-spacing: -0.025em;
}
.tracking-tighter {
  letter-spacing: -0.05em;
}
</style>
