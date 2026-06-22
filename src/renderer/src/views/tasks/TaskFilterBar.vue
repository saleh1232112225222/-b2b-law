<template>
  <v-card elevation="0" class="rounded-xl mb-8 pa-5 glass-card-noir border shadow-premium glass-card">
    <v-row dense align="center">
      <v-col cols="12" md="4">
        <v-text-field
          v-model="searchModel"
          label="بحث في عناوين المهام أو الموكلين..."
          variant="outlined"
          density="comfortable"
          hide-details
          class="rounded-xl premium-select glass-input"
          clearable
        >
          <template #prepend-inner>
            <LucideIcon name="search" :size="20" class="text-primary me-2" />
          </template>
        </v-text-field>
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="filterStatusModel"
          :items="statusItems"
          item-title="title"
          item-value="value"
          label="الحالة"
          variant="outlined"
          density="comfortable"
          hide-details
          class="rounded-xl premium-select glass-input"
        >
          <template #prepend-inner>
            <LucideIcon name="filter" :size="18" class="text-primary me-2" />
          </template>
        </v-select>
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="responsibleUserIdModel"
          :items="assignableUsers"
          :item-title="getUserDisplayName"
          item-value="id"
          label="المسؤول"
          variant="outlined"
          density="comfortable"
          hide-details
          clearable
          class="rounded-xl premium-select glass-input"
          :loading="assignableUsersLoading"
          @update:model-value="$emit('refresh')"
        >
          <template #prepend-inner>
            <LucideIcon name="user" :size="18" class="text-primary me-2" />
          </template>
        </v-select>
      </v-col>
      <v-spacer />
      <v-col cols="auto">
        <v-btn
          variant="tonal"
          color="primary"
          class="rounded-xl shadow-premium glass-card px-4 h-48 premium-btn-gold-gradient"
          :loading="loading"
          @click="$emit('refresh')"
        >
          <LucideIcon name="refresh-cw" :size="20" class="me-2" />
          <span class="font-weight-black">مزامنة</span>
        </v-btn>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LucideIcon from '../../components/common/LucideIcon.vue'

const props = defineProps<{
  search: string
  filterStatus: string
  statusItems: { title: string; value: string }[]
  assignableUsers: Array<any>
  assignableUsersLoading: boolean
  loading: boolean
  responsibleUserId: string
}>()

const emit = defineEmits<{
  (e: 'update:search', v: string): void
  (e: 'update:filterStatus', v: string): void
  (e: 'update:responsibleUserId', v: string): void
  (e: 'refresh'): void
}>()

const searchModel = computed({
  get: () => props.search,
  set: (v) => emit('update:search', v)
})

const filterStatusModel = computed({
  get: () => props.filterStatus,
  set: (v) => emit('update:filterStatus', v)
})

const responsibleUserIdModel = computed({
  get: () => props.responsibleUserId,
  set: (v) => emit('update:responsibleUserId', v)
})

const getUserDisplayName = (u: any) => (u ? u.full_name || u.username || '' : '')

const arabicFilter = (itemTitle: string, queryText: string) => {
  const norm = (s: string) =>
    s
      .replace(/[إأآا]/g, 'ا')
      .replace(/[ىي]/g, 'ي')
      .replace(/[ةه]/g, 'ه')
      .toLowerCase()
  return norm(itemTitle).includes(norm(queryText))
}
</script>
