<template>
  <v-dialog
    v-model="localShow"
    location="bottom"
    transition="slide-y-reverse"
    max-width="480"
    persistent
  >
    <v-card class="rounded-t-xl">
      <v-card-title class="d-flex align-center pa-4 border-b">
        <span class="font-weight-black text-body-1">{{ title }}</span>
        <v-spacer />
        <v-btn icon variant="text" size="small" @click="localShow = false">
          <v-icon icon="mdi-close" />
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-4">
        <v-list v-if="items.length > 0" density="compact">
          <v-list-item
            v-for="item in items"
            :key="item.label"
            :prepend-icon="item.icon"
            :title="item.label"
            :color="item.color || 'primary'"
            class="rounded-lg mb-1 mobile-action-btn"
            @click="onItemClick(item)"
          >
            <template #append>
              <v-icon v-if="item.appendIcon" :icon="item.appendIcon" :size="18" />
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: boolean
  title: string
  items: Array<{
    label: string
    icon?: string
    action: string
    color?: string
    appendIcon?: string
  }>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  action: [action: string]
}>()

const localShow = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
})

const onItemClick = (item: any) => {
  localShow.value = false
  emit('action', item.action)
}
</script>
