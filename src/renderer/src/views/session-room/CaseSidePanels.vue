<template>
  <v-row dense class="mb-4" style="height: 30vh">
    <v-col cols="12" md="2" class="d-flex flex-column ga-2">
      <v-card
        class="rounded-xl pa-4 flex-grow-1 cursor-pointer transition-premium glass-card border shadow-sm glass-card"
        elevation="0"
        :style="{ borderRight: '6px solid var(--gold-royal)' }"
        :class="{ 'bg-primary-alpha border-accent': selected.category === 'الموضوع' }"
        @click="$emit('select-text', 'الموضوع', 'موضوع الدعوى', caseItem?.subject || '—')"
      >
        <div class="text-subtitle-2 font-weight-black text-primary">موضوع الدعوى</div>
        <div class="text-caption text-text-muted mt-2 line-clamp-2">
          وقائع النزاع والحيثيات والطلبات الأصلية
        </div>
      </v-card>
      <v-card
        class="rounded-xl pa-4 flex-grow-1 cursor-pointer transition-premium glass-card border shadow-sm glass-card"
        elevation="0"
        :style="{ borderRight: '6px solid var(--warning)' }"
        :class="{ 'bg-orange-lighten-5 border-orange': selected.category === 'الطلبات' }"
        @click="
          $emit('select-text', 'الطلبات', 'طلبات المدعي', caseItem?.plaintiff_requests || '—')
        "
      >
        <div class="text-subtitle-2 font-weight-black text-orange-darken-2">طلبات المدعي</div>
        <div class="text-caption text-text-muted mt-2 line-clamp-2">
          تحديد المبالغ والأهداف الإجرائية للمدعي
        </div>
      </v-card>
    </v-col>
    <v-col cols="12" md="3" style="height: 100%">
      <v-card
        class="rounded-xl overflow-hidden d-flex flex-column h-100 glass-card border shadow-premium glass-card"
        elevation="0"
      >
        <div
          class="px-4 py-3 text-white d-flex justify-space-between align-center glass-card-noir border-b"
        >
          <div class="text-subtitle-2 font-weight-black">مستندات القضية</div>
          <LucideIcon name="folder-archive" :size="18" class="text-accent" />
        </div>
        <div class="flex-grow-1 overflow-y-auto pa-3">
          <div v-if="docs.length === 0" class="text-caption text-text-muted text-center py-8">
            لا توجد مرفقات PDF
          </div>
          <v-card
            v-for="d in docs"
            :key="d.id"
            elevation="0"
            class="rounded-xl pa-3 mb-3 cursor-pointer transition-premium glass-card border glass-card"
            :class="{
              'bg-primary-alpha border-accent shadow-premium':
                selected.type === 'pdf' && selected.file_path === d.file_path
            }"
            @click="$emit('select-pdf', 'مستند', d.name, d.file_path)"
          >
            <div class="text-caption font-weight-black text-primary text-truncate">
              {{ d.name }}
            </div>
            <div class="text-caption text-text-muted font-weight-bold mt-1">
              مرفوع في {{ formatDate(d.created_at) }}
            </div>
          </v-card>
        </div>
      </v-card>
    </v-col>
    <v-col cols="12" md="3" style="height: 100%">
      <v-card
        class="rounded-xl overflow-hidden d-flex flex-column h-100 glass-card border shadow-premium glass-card"
        elevation="0"
      >
        <div
          class="px-4 py-3 text-white d-flex justify-space-between align-center glass-card-noir border-b"
        >
          <div class="text-subtitle-2 font-weight-black">جلسات القضية</div>
          <LucideIcon name="video" :size="18" class="text-accent" />
        </div>
        <div class="flex-grow-1 overflow-y-auto pa-3">
          <div
            v-if="caseSessions.length === 0"
            class="text-caption text-text-muted text-center py-8"
          >
            لا توجد جلسات
          </div>
          <v-card
            v-for="(s, idx) in caseSessions"
            :key="s.id"
            elevation="0"
            class="rounded-xl pa-3 mb-3 cursor-pointer d-flex align-center justify-space-between transition-premium glass-card border glass-card"
            :class="{
              'bg-primary-alpha border-accent shadow-premium': selected.session_id === s.id
            }"
            @click="$emit('select-session-text', s, idx)"
          >
            <div style="min-width: 0">
              <div class="text-caption font-weight-black text-primary">
                الجلسة {{ ordinal(idx) }}
              </div>
              <div class="text-caption text-text-muted font-weight-bold">
                {{ formatSessionDate(s) }}
              </div>
            </div>
            <div class="d-flex align-center ga-1">
              <v-btn
                class="premium-btn-gold-gradient"
                icon
                size="x-small"
                variant="text"
                color="primary"
                :disabled="!s.meeting_link"
                @click.stop="$emit('copy', s.meeting_link)"
              >
                <LucideIcon name="link" :size="14" />
              </v-btn>
              <v-btn
                class="premium-btn-gold-gradient"
                icon
                size="x-small"
                variant="text"
                color="accent"
                :disabled="!s.meeting_link"
                @click.stop="$emit('open-external', s.meeting_link)"
              >
                <LucideIcon name="external-link" :size="14" />
              </v-btn>
            </div>
          </v-card>
        </div>
      </v-card>
    </v-col>
    <v-col cols="12" md="2" style="height: 100%">
      <v-card
        class="rounded-xl overflow-hidden d-flex flex-column h-100 glass-card border shadow-premium glass-card"
        elevation="0"
      >
        <div
          class="px-4 py-3 text-white d-flex justify-space-between align-center glass-card-noir border-b"
        >
          <div class="text-subtitle-2 font-weight-black">مذكرات القضية</div>
          <LucideIcon name="file-edit" :size="18" class="text-accent" />
        </div>
        <div class="flex-grow-1 overflow-y-auto pa-3">
          <div v-if="memos.length === 0" class="text-caption text-text-muted text-center py-8">
            لا توجد مذكرات
          </div>
          <v-card
            v-for="m in memos"
            :key="m.id"
            elevation="0"
            class="rounded-xl pa-3 mb-3 cursor-pointer transition-premium glass-card border glass-card"
            :class="{
              'bg-primary-alpha border-accent shadow-premium':
                selected.type === 'pdf' && selected.file_path === m.file_path
            }"
            @click="$emit('select-pdf', 'مذكرة', m.name, m.file_path)"
          >
            <div class="text-caption font-weight-black text-primary text-truncate">
              {{ m.name }}
            </div>
            <div class="text-caption text-text-muted font-weight-bold mt-1">
              تاريخ الإيداع {{ formatDate(m.created_at) }}
            </div>
          </v-card>
        </div>
      </v-card>
    </v-col>
    <v-col cols="12" md="2" style="height: 100%">
      <v-card
        class="rounded-xl overflow-hidden d-flex flex-column h-100 glass-card border shadow-premium glass-card"
        elevation="0"
      >
        <div
          class="px-4 py-3 text-white d-flex justify-space-between align-center glass-card-noir border-b"
        >
          <div class="text-subtitle-2 font-weight-black">أحكام القضية</div>
          <LucideIcon name="gavel" :size="18" class="text-accent" />
        </div>
        <div class="flex-grow-1 overflow-y-auto pa-3">
          <div v-if="judgments.length === 0" class="text-caption text-text-muted text-center py-8">
            لا توجد أحكام
          </div>
          <v-card
            v-for="j in judgments"
            :key="j.id"
            elevation="0"
            class="rounded-xl pa-3 mb-3 cursor-pointer transition-premium glass-card border-dashed-primary glass-card"
            :class="{
              'bg-primary-alpha border-accent shadow-premium': selected.category === 'الحكم'
            }"
            @click="$emit('judgment-click', j)"
          >
            <div class="text-caption font-weight-black text-accent text-truncate">
              {{ j.judgment_type || j.type || 'حكم' }}
            </div>
            <div class="text-caption text-text-muted font-weight-bold mt-1">
              تاريخ الحكم {{ formatDate(j.judgment_date) }}
            </div>
          </v-card>
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'
import { formatDate, formatSessionDate, ordinal } from './helpers'

defineProps<{
  docs: any[]
  caseSessions: any[]
  memos: any[]
  judgments: any[]
  caseItem: any
  selected: any
}>()

defineEmits<{
  'select-text': [category: string, title: string, content: string]
  'select-pdf': [category: string, title: string, filePath: string]
  'select-session-text': [session: any, idx: number]
  'judgment-click': [judgment: any]
  copy: [text: string]
  'open-external': [url: string]
}>()
</script>
