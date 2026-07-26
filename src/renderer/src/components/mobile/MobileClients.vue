<template>
  <div class="pa-3">
    <v-text-field
      v-model="searchQuery"
      prepend-inner-icon="mdi-magnify"
      placeholder="بحث عن موكل..."
      variant="outlined"
      density="comfortable"
      hide-details
      class="mb-3 rounded-lg glass-input"
      clearable
    />

    <MobileCardList
      :items="filteredClients"
      :loading="store.loading"
      title-field="name"
      subtitle-field="phone"
      :info-fields="[{ key: 'type', label: 'النوع' }]"
      icon-field="icon"
      default-icon="mdi-account"
      empty-text="لا يوجد موكلين"
      can-add
      add-label="إضافة موكل"
      @item-click="openClient"
      @add="emit('add')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useClientsStore } from '../../stores/clients'
import { useMobilePagination } from '../../composables/useMobilePagination'
import MobileCardList from './MobileCardList.vue'

const emit = defineEmits<{ add: [] }>()
const router = useRouter()
const store = useClientsStore()
const searchQuery = ref('')

const filteredClients = computed(() => {
  if (!searchQuery.value) return store.clients
  const q = searchQuery.value.toLowerCase()
  return store.clients.filter((c: any) => c.name?.toLowerCase().includes(q) || c.phone?.includes(q))
})

const openClient = (item: any) => router.push(`/clients?id=${item.id}`)
</script>
