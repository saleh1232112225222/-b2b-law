<template>
  <v-hover v-slot="{ isHovering, props }">
    <v-card
      v-bind="props"
      elevation="0"
      class="rounded-xl mb-4 pa-5 glass-card border transition-premium position-relative premium-hover"
      :class="{ 'border-accent shadow-premium': isHovering }"
    >
      <div class="d-flex align-start">
        <div
          class="flex-grow-1 overflow-hidden"
          :class="{ 'opacity-40 grayscale': task.status === 'completed' }"
        >
          <div
            class="text-body-1 font-weight-black text-pure-black d-flex align-center flex-wrap gap-2"
          >
            {{ task.title }}
            <v-chip
              v-if="task.link_type && task.link_type !== 'none'"
              size="x-small"
              :color="getLinkColor(task.link_type)"
              class="font-weight-black rounded-lg text-pure-black shadow-sm"
            >
              {{ getLinkName(task.link_type) }}
            </v-chip>
          </div>
          <div
            class="text-caption text-pure-black font-weight-bold mt-2 line-clamp-2 leading-relaxed"
          >
            {{ task.description || 'لا يوجد وصف تشغيلي متاح' }}
          </div>

          <v-chip
            v-if="task.context_label"
            size="x-small"
            color="primary"
            variant="tonal"
            class="mt-4 font-weight-black rounded-lg bg-primary-alpha"
            block
          >
            <LucideIcon name="link-2" :size="12" class="me-1" />
            {{ task.context_label }}
          </v-chip>

          <v-chip
            size="x-small"
            color="accent"
            variant="tonal"
            class="mt-2 font-weight-black rounded-lg bg-accent-alpha"
            block
          >
            <LucideIcon name="user-check" :size="12" class="me-1" />
            المسؤول: {{ task.responsible_name || 'غير محدد' }}
          </v-chip>

          <div
            v-if="task.due_date"
            class="mt-4 d-flex align-center text-caption font-weight-black"
            :class="
              isOverdue(task.due_date, task.status) ? 'text-error' : 'text-accent'
            "
          >
            <LucideIcon name="alert-circle" :size="14" class="me-2" />
            <span>مستحق في: {{ formatDate(task.due_date) }} م</span>
          </div>
        </div>

        <div class="d-flex flex-column gap-2 ms-3">
          <v-btn
            icon
            variant="tonal"
            color="primary"
            size="x-small"
            class="rounded-lg glass-card"
            @click.stop="$emit('edit', task)"
          >
            <LucideIcon name="edit-3" :size="14" />
          </v-btn>
          <v-menu location="bottom end">
            <template #activator="{ props: menuProps }">
              <v-btn
                v-bind="menuProps"
                icon
                variant="tonal"
                color="primary"
                size="x-small"
                class="rounded-lg glass-card"
                @click.stop
              >
                <LucideIcon name="more-vertical" :size="14" />
              </v-btn>
            </template>
            <v-list density="compact" class="rounded-xl">
              <v-list-item
                v-if="
                  task.status !== 'completed' &&
                  task.status !== 'cancelled' &&
                  task.status !== 'closed'
                "
                @click="$emit('complete', task)"
              >
                <v-list-item-title class="font-weight-black"
                  >إكمال المهمة</v-list-item-title
                >
              </v-list-item>
              <v-list-item
                v-if="
                  canCancel && task.status !== 'cancelled' && task.status !== 'closed'
                "
                @click="$emit('cancel', task)"
              >
                <v-list-item-title class="font-weight-black"
                  >إلغاء المهمة</v-list-item-title
                >
              </v-list-item>
              <v-list-item
                v-if="canClose && task.status !== 'closed'"
                @click="$emit('close', task)"
              >
                <v-list-item-title class="font-weight-black"
                  >إقفال المهمة</v-list-item-title
                >
              </v-list-item>
              <v-list-item v-if="canArchive" @click="$emit('archive', task)">
                <v-list-item-title class="font-weight-black"
                  >أرشفة المهمة</v-list-item-title
                >
              </v-list-item>
              <v-list-item
                v-if="canReopen && task.status === 'completed'"
                @click="$emit('reopen', task)"
              >
                <v-list-item-title class="font-weight-black"
                  >إعادة فتح</v-list-item-title
                >
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </div>
    </v-card>
  </v-hover>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'

const props = defineProps({
  task: { type: Object, required: true },
  canCancel: { type: Boolean, default: false },
  canClose: { type: Boolean, default: false },
  canArchive: { type: Boolean, default: false },
  canReopen: { type: Boolean, default: false }
})

const emit = defineEmits(['edit', 'complete', 'cancel', 'close', 'archive', 'reopen'])

const getLinkColor = (type: string | undefined): string => {
  const map: Record<string, string> = { case: 'primary', client: 'success', none: 'grey' }
  return type ? map[type] || 'grey' : 'grey'
}

const getLinkName = (type: string | undefined): string => {
  const map: Record<string, string> = { case: 'قضية', client: 'موكل', none: 'عام' }
  return type ? map[type] || '' : ''
}

const isOverdue = (date: string, status: string): boolean => {
  if (!date || status === 'completed' || status === 'cancelled' || status === 'closed') return false
  return new Date(date) < new Date()
}

const formatDate = (date: string): string => {
  if (!date) return ''
  try { return new Date(date).toLocaleDateString('ar-SA') }
  catch { return date }
}
</script>

<style scoped>
</style>
