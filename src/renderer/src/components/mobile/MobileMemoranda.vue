<template>
  <div class="pa-2">
    <MobileCardList
      :items="items"
      :loading="loading"
      title-field="title"
      subtitle-field="memoranda_type"
      :info-fields="[
        { key: 'created_at', label: 'التاريخ' },
        { key: 'case_number', label: 'القضية' }
      ]"
      icon-field="icon"
      default-icon="mdi-file-document-edit"
      empty-text="لا توجد مذكرات"
      can-add
      add-label="إضافة مذكرة"
      @item-click="openMemorandum"
      @add="emit('add')"
    />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import MobileCardList from './MobileCardList.vue'

const router = useRouter()
defineProps<{
  items: any[]
  loading: boolean
}>()

const emit = defineEmits<{ add: [] }>()

const openMemorandum = (item: any) => {
  if (item.file_url) window.open(item.file_url, '_blank')
  else router.push(`/memoranda?id=${item.id}`)
}
</script>
