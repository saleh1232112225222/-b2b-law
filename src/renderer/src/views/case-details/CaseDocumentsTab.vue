<template>
  <div>
    <div class="d-flex justify-space-between align-center mb-6">
      <v-btn
        color="accent"
        variant="flat"
        size="small"
        class="rounded-lg font-weight-black text-primary-dark"
        @click="$emit('upload')"
      >
        <LucideIcon name="upload" :size="16" class="me-2" /> رفع مستند
      </v-btn>
      <v-chip size="small" color="accent" variant="tonal" class="font-weight-black"
        >{{ documents.length }} مستندات</v-chip
      >
    </div>
    <v-list v-if="documents.length > 0" class="bg-transparent pa-0">
      <v-list-item
        v-for="doc in documents"
        :key="doc.id"
        class="mb-2 glass-card border-0 premium-hover"
      >
        <template #prepend>
          <div class="bg-accent-alpha pa-2 rounded-lg me-3">
            <LucideIcon name="file-text" :size="18" class="text-accent" />
          </div>
        </template>
        <v-list-item-title class="font-weight-black text-visible-high text-body-2">{{
          doc.name
        }}</v-list-item-title>
        <v-list-item-subtitle class="text-primary font-weight-bold">{{
          formatDate(doc.created_at)
        }}</v-list-item-subtitle>
        <template #append>
          <v-btn
            variant="text"
            size="small"
            color="accent"
            class="rounded-lg"
            @click.stop="$emit('open', doc.file_path)"
          >
            <LucideIcon name="external-link" :size="16" />
          </v-btn>
          <v-btn
            variant="text"
            size="small"
            color="error"
            class="rounded-lg ms-2"
            @click.stop="$emit('remove', doc)"
          >
            <LucideIcon name="trash-2" :size="16" />
          </v-btn>
        </template>
      </v-list-item>
    </v-list>
    <div v-else class="pa-10 text-center grey--text">لا توجد مستندات مرفوعة لهذه القضية</div>
  </div>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'

defineProps<{ documents: any[] }>()
defineEmits<{ upload: []; open: [path: string]; remove: [doc: any] }>()

const formatDate = (date: string): string => {
  if (!date) return '-'
  try {
    return new Date(date).toLocaleDateString('ar-SA')
  } catch {
    return date
  }
}
</script>
