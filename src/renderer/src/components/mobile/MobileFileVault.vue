<template>
  <div class="pa-2">
    <div class="mb-3 glass-card pa-4 rounded-xl">
      <v-select
        v-model="localEntityType"
        :items="entityTypes"
        variant="outlined"
        density="compact"
        class="glass-input mb-2"
        hide-details
      />
      <div class="d-flex ga-2">
        <v-select
          v-model="localEntityId"
          :items="entityOptions"
          :loading="loadingLookups"
          item-title="title"
          item-value="value"
          placeholder="اختر المرجع"
          variant="outlined"
          density="compact"
          class="glass-input flex-grow-1"
          hide-details
          clearable
        />
        <v-btn
          color="accent"
          class="rounded-lg premium-lift"
          :loading="uploading"
          icon
          @click="emit('upload')"
        >
          <v-icon icon="mdi-upload" />
        </v-btn>
      </div>
    </div>
    <MobileCardList
      :items="items"
      :loading="loading"
      title-field="original_name"
      subtitle-field="doc_type"
      :info-fields="[{ key: 'uploaded_by', label: 'بواسطة' }]"
      icon-field="icon"
      default-icon="mdi-folder-lock"
      empty-text="لا توجد ملفات"
      can-add
      add-label="رفع ملف"
      @item-click="openFile"
      @add="emit('add')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MobileCardList from './MobileCardList.vue'

const props = defineProps<{
  items: any[]
  loading: boolean
  uploading: boolean
  loadingLookups: boolean
  entityType: string
  entityId: string | null
  entityOptions: { title: string; value: string }[]
}>()

const emit = defineEmits<{
  add: []
  upload: []
  'update:entityType': [value: string]
  'update:entityId': [value: string | null]
}>()

const entityTypes = [
  { title: 'ارتباط بقضية', value: 'case' },
  { title: 'ارتباط بموكل', value: 'client' },
  { title: 'ارتباط بجلسة', value: 'session' },
  { title: 'ارتباط بمهمة', value: 'task' },
  { title: 'بدون ارتباط مباشر', value: 'none' }
]

const localEntityType = computed({
  get: () => props.entityType,
  set: (val: string) => emit('update:entityType', val)
})

const localEntityId = computed({
  get: () => props.entityId,
  set: (val: string | null) => emit('update:entityId', val)
})

const openFile = async (item: any) => {
  try {
    await (window as any).api.files.open(item.id)
  } catch (e) {
    console.error('Failed to open file:', e)
  }
}
</script>
