<template>
  <div class="pa-2">
    <MobileCardList
      :items="items"
      :loading="loading"
      title-field="case_number"
      subtitle-field="client_name"
      :info-fields="[
        { key: 'case_type', label: 'النوع' },
        { key: 'court_name', label: 'المحكمة' },
        { key: 'case_status', label: 'الحالة' }
      ]"
      icon-field="icon"
      default-icon="mdi-scale-balance"
      empty-text="لا توجد قضايا"
      can-add
      add-label="إضافة قضية"
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
