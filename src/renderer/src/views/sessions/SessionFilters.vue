<template>
  <v-card elevation="0" class="glass-card mb-8 pa-6">
    <v-row dense align="center">
      <v-col cols="12" md="4">
        <v-text-field
          v-model="search"
          label="بحث برقم القضية، الموكل، أو اسم القاعة..."
          variant="outlined"
          density="comfortable"
          hide-details
          class="glass-input"
          clearable
        >
          <template #prepend-inner>
            <LucideIcon name="search" :size="20" class="text-gold" />
          </template>
        </v-text-field>
      </v-col>
      <v-col cols="12" md="4">
        <v-btn-toggle
          v-model="filterType"
          mandatory
          color="accent"
          variant="text"
          class="glass-toggle w-100"
          density="comfortable"
        >
          <v-btn value="all" class="flex-grow-1 font-weight-bold">الكل</v-btn>
          <v-btn value="upcoming" class="flex-grow-1 font-weight-bold">القادمة</v-btn>
          <v-btn value="recent" class="flex-grow-1 font-weight-bold">الأخيرة</v-btn>
        </v-btn-toggle>
      </v-col>
      <v-spacer />
      <v-col cols="auto">
        <v-btn
          variant="tonal"
          color="accent"
          class="rounded-lg font-weight-bold"
          :loading="loading"
          @click="$emit('reset')"
        >
          <LucideIcon name="refresh-cw" :size="20" class="me-2" />
          <span class="font-weight-black">تصفير</span>
        </v-btn>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'
defineProps<{ loading: boolean }>()
const search = defineModel<string>('search', { required: true })
const filterType = defineModel<string>('filterType', { required: true })
defineEmits<{ reset: [] }>()
</script>
