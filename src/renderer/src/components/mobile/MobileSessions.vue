<template>
  <div class="pa-2">
    <MobileCardList
      :items="items"
      :loading="loading"
      title-field="case_number"
      subtitle-field="client_name"
      :info-fields="[
        { key: 'date', label: 'التاريخ' },
        { key: 'status', label: 'الحالة' }
      ]"
      icon-field="icon"
      default-icon="mdi-calendar-clock"
      empty-text="لا توجد جلسات"
      can-add
      add-label="إضافة جلسة"
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
