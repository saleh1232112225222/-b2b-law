<template>
  <v-dialog v-model="isOpen" max-width="900" persistent scrollable>
    <v-card class="glass-card modal-card rounded-xl">
      <v-toolbar color="primary" class="px-6" height="72">
        <LucideIcon name="alert-triangle" :size="24" class="text-warning me-3" />
        <v-toolbar-title class="text-h6 font-weight-black text-white">
          فض تعارض المزامنة (Conflict Resolution)
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon variant="text" size="small" @click="close">
          <LucideIcon name="x" :size="20" class="text-white" />
        </v-btn>
      </v-toolbar>

      <v-card-text class="pa-6">
        <div v-if="conflicts.length === 0" class="text-center py-8">
          <LucideIcon name="check-circle" :size="48" class="text-success mb-3" />
          <div class="text-h6 font-weight-black text-white">لا توجد أي تعارضات معلقة</div>
        </div>

        <div v-else>
          <div class="text-body-2 text-gold opacity-80 mb-4 font-weight-black">
            تم اكتشاف تعديل متزامن على نفس السجل بين جهازين مختلفين. يرجى اختيار النسخة المعتمدة لمنع الكتابة العشوائية:
          </div>

          <v-card
            v-for="(conflict, idx) in conflicts"
            :key="conflict.id || idx"
            class="mb-6 glass-panel pa-4 rounded-lg border-gold-alpha"
          >
            <div class="d-flex justify-space-between align-center mb-3">
              <v-chip color="warning" size="small" variant="flat" class="font-weight-black">
                جدول: {{ conflict.entity_type }} | المعرّف: {{ conflict.entity_id.slice(0, 8) }}...
              </v-chip>
              <span class="text-caption text-gold opacity-60">
                تاريخ الاكتشاف: {{ formatDateOnly(conflict.created_at) }}
              </span>
            </div>

            <!-- Side-by-Side Comparison -->
            <v-row dense>
              <!-- Local Version -->
              <v-col cols="12" md="6">
                <v-card class="pa-4 glass-card border-accent h-100">
                  <div class="d-flex align-center text-subtitle-2 font-weight-black text-accent mb-3">
                    <LucideIcon name="laptop" :size="16" class="me-2" />
                    النسخة المحلية (هذا الجهاز)
                  </div>
                  <div class="diff-container font-mono text-caption">
                    <div v-for="(val, key) in cleanEntity(conflict.local_value)" :key="key" class="mb-1">
                      <strong class="text-gold">{{ key }}:</strong>
                      <span class="text-white ms-1">{{ val !== null ? val : '—' }}</span>
                    </div>
                  </div>
                  <v-btn
                    block
                    color="accent"
                    variant="tonal"
                    class="mt-4 font-weight-black"
                    :loading="resolvingId === conflict.id"
                    @click="applyResolution(conflict.id, 'accept_local')"
                  >
                    اعتماد النسخة المحلية
                  </v-btn>
                </v-card>
              </v-col>

              <!-- Remote Version -->
              <v-col cols="12" md="6">
                <v-card class="pa-4 glass-card border-primary h-100">
                  <div class="d-flex align-center text-subtitle-2 font-weight-black text-primary mb-3">
                    <LucideIcon name="cloud" :size="16" class="me-2" />
                    النسخة السحابية (المصدر المرجعي)
                  </div>
                  <div class="diff-container font-mono text-caption">
                    <div v-for="(val, key) in cleanEntity(conflict.remote_value)" :key="key" class="mb-1">
                      <strong class="text-gold">{{ key }}:</strong>
                      <span class="text-white ms-1">{{ val !== null ? val : '—' }}</span>
                    </div>
                  </div>
                  <v-btn
                    block
                    color="primary"
                    variant="tonal"
                    class="mt-4 font-weight-black"
                    :loading="resolvingId === conflict.id"
                    @click="applyResolution(conflict.id, 'accept_remote')"
                  >
                    اعتماد النسخة السحابية
                  </v-btn>
                </v-card>
              </v-col>
            </v-row>
          </v-card>
        </div>
      </v-card-text>

      <v-card-actions class="pa-6 modal-footer-solid">
        <v-spacer></v-spacer>
        <v-btn color="gold" variant="outlined" class="px-8 font-weight-black" @click="close">
          إغلاق
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSyncStore } from '../../stores/sync'
import LucideIcon from '../common/LucideIcon.vue'
import { formatDateOnly } from '../../utils/safe'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
})

const syncStore = useSyncStore()
const { conflicts } = storeToRefs(syncStore)
const resolvingId = ref<string | null>(null)

const cleanEntity = (obj: any) => {
  if (!obj || typeof obj !== 'object') return {}
  const ignored = new Set(['company_id', 'created_at', 'updated_at', 'id'])
  const res: Record<string, any> = {}
  Object.keys(obj).forEach((k) => {
    if (!ignored.has(k) && obj[k] !== undefined) {
      res[k] = obj[k]
    }
  })
  return res
}

const applyResolution = async (conflictId: string, strategy: 'accept_local' | 'accept_remote') => {
  resolvingId.value = conflictId
  try {
    await syncStore.resolveConflict(conflictId, strategy)
  } finally {
    resolvingId.value = null
  }
}

const close = () => {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.modal-card {
  background: rgba(15, 23, 42, 0.98) !important;
  border: 1px solid rgba(233, 195, 73, 0.3) !important;
}
.diff-container {
  max-height: 220px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.3);
  padding: 12px;
  border-radius: 8px;
}
.border-gold-alpha {
  border: 1px solid rgba(233, 195, 73, 0.2);
}
</style>
