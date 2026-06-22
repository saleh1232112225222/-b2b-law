<template>
  <div>
    <div class="d-flex justify-space-between align-center mb-6">
      <v-btn
        color="accent"
        variant="flat"
        size="small"
        class="rounded-lg font-weight-black text-primary-dark premium-btn-gold-gradient"
        :to="createRoute"
      >
        <LucideIcon name="plus" :size="16" class="me-2" /> مذكرات / ردود
      </v-btn>
      <v-chip size="small" color="accent" variant="tonal" class="font-weight-black"
        >{{ memoranda.length }} مذكرات</v-chip
      >
    </div>
    <v-row v-if="memoranda.length > 0">
      <v-col v-for="memo in memoranda" :key="memo.id" cols="12" md="6">
        <v-card elevation="0" class="glass-card pa-6 h-100 premium-lift glass-card">
          <div class="d-flex justify-space-between align-start mb-4">
            <div class="text-subtitle-1 font-weight-black text-gold">{{ memo.memo_title }}</div>
            <v-chip size="x-small" color="primary" variant="flat" class="font-weight-black">{{
              memo.memo_type
            }}</v-chip>
          </div>
          <div class="text-caption text-primary font-weight-bold mb-4 d-flex align-center">
            <LucideIcon name="calendar" :size="14" class="me-1" /> {{ memo.memo_date }}
          </div>
          <div class="text-body-2 mb-4 line-clamp-2 text-visible-high">{{ memo.memo_summary }}</div>
          <v-divider class="mb-4 opacity-10" />
          <div class="d-flex justify-end ga-2">
            <v-btn
              variant="text"
              size="small"
              color="accent"
              class="rounded-lg premium-btn-gold-gradient"
              :to="`/memoranda?id=${memo.id}`"
            >
              <LucideIcon name="eye" :size="18" />
            </v-btn>
            <v-btn
              variant="text"
              size="small"
              color="accent"
              class="rounded-lg premium-btn-gold-gradient"
              :to="`/memoranda?id=${memo.id}&edit=true`"
            >
              <LucideIcon name="pencil" :size="18" />
            </v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>
    <div v-else class="pa-10 text-center text-primary italic font-weight-bold">
      لا توجد مذكرات مسجلة لهذه القضية
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LucideIcon from '../../components/common/LucideIcon.vue'

const props = defineProps<{ memoranda: any[]; caseId: string }>()
const createRoute = computed(() => ({
  path: '/memoranda',
  query: { case_id: props.caseId, new: '1' }
}))
</script>
