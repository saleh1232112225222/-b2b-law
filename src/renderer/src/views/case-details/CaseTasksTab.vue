<template>
  <v-list class="bg-transparent pa-0">
    <v-list-item v-for="t in tasks" :key="t.id" class="mb-2 glass-card border-0 premium-hover">
      <template #prepend>
        <div class="bg-accent-alpha pa-2 rounded-lg me-3">
          <LucideIcon name="check-square" :size="18" class="text-accent" />
        </div>
      </template>
      <v-list-item-title class="font-weight-black text-visible-high text-body-2">{{ t.title }}</v-list-item-title>
      <v-list-item-subtitle class="text-primary font-weight-bold">{{ t.due_date }} مـ</v-list-item-subtitle>
      <template #append>
        <v-chip size="x-small" :color="getPriorityColor(t.priority)" variant="flat" class="font-weight-black">{{ t.priority }}</v-chip>
      </template>
    </v-list-item>
    <div v-if="tasks.length === 0" class="pa-10 text-center text-primary italic font-weight-bold">لا توجد مهام مسجلة</div>
  </v-list>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'

defineProps<{ tasks: any[] }>()

const getPriorityColor = (priority: string): string => {
  const map: Record<string, string> = { عالية: 'error', متوسط: 'warning', منخفض: 'success', حرجة: 'error-dark' }
  return map[priority || ''] || 'grey'
}
</script>
