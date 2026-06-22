<template>
  <div class="pa-2">
    <MobileCardList
      :items="items"
      :loading="loading"
      title-field="title"
      subtitle-field="case_number"
      :info-fields="[
        { key: 'due_date', label: 'الموعد' },
        { key: 'priority', label: 'الأولوية' }
      ]"
      icon-field="icon"
      default-icon="mdi-clipboard-text"
      empty-text="لا توجد مهام"
      can-add
      add-label="إضافة مهمة"
      @item-click="emit('edit', $event)"
      @add="emit('add')"
    />
  </div>
</template>

<script setup lang="ts">
import MobileCardList from './MobileCardList.vue'

defineProps<{
  items: any[]
  loading: boolean
}>()

const emit = defineEmits<{
  edit: [item: any]
  add: []
  delete: [item: any]
}>()
</script>
