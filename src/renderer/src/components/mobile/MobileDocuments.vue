<template>
  <div class="pa-2">
    <MobileCardList
      :items="items"
      :loading="loading"
      title-field="name"
      subtitle-field="document_type"
      :info-fields="[
        { key: 'created_at', label: 'التاريخ' },
        { key: 'case_number', label: 'القضية' }
      ]"
      icon-field="icon"
      default-icon="mdi-file-document"
      empty-text="لا توجد مستندات"
      can-add
      add-label="رفع مستند"
      @item-click="openDocument"
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

const openDocument = (item: any) => {
  if (item.file_url) window.open(item.file_url, '_blank')
}
</script>
