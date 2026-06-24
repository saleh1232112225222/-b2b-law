<template>
  <v-dialog
    :model-value="show"
    width="90%"
    max-width="700"
    persistent
    @update:model-value="$emit('update:show', $event)"
  >
    <v-card class="modal-card overflow-hidden glass-card">
      <div class="modal-header-solid d-flex align-center py-5 px-8 bg-white border-b">
        <div class="bg-accent-alpha pa-2 rounded-lg me-4">
          <LucideIcon name="file-plus" :size="24" class="text-accent" />
        </div>
        <span class="text-h5 font-weight-black text-pure-black">إدراج ملحق للعقد</span>
        <v-spacer />
        <v-btn
          class="premium-btn-gold-gradient"
          variant="text"
          color="primary"
          icon
          @click="$emit('update:show', false)"
          ><LucideIcon name="x" :size="24"
        /></v-btn>
      </div>
      <v-card-text class="pa-8 bg-white">
        <label class="mb-2 font-weight-black text-gold">سبب الإدراج (Required)</label>
        <v-text-field
          v-model="reason"
          variant="outlined"
          class="premium-input-solid mb-6 glass-input"
          hide-details
        />
        <label class="mb-2 font-weight-black text-gold">نص الملحق</label>
        <v-textarea
          v-model="content"
          variant="outlined"
          rows="6"
          class="premium-input-solid glass-input"
          hide-details
        />
      </v-card-text>
      <v-divider class="border-gold opacity-20" />
      <v-card-actions class="pa-8 modal-footer-solid">
        <v-btn
          variant="flat"
          size="large"
          class="px-8 font-weight-black premium-button-highlight action-btn-unified premium-btn-gold-gradient"
          @click="$emit('update:show', false)"
          >إلغاء</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          size="large"
          class="px-12 font-weight-black premium-button-highlight action-btn-unified h-56 premium-btn-gold-gradient"
          :disabled="!reason || !content"
          :loading="saving"
          @click="handleSave"
          >حفظ الملحق</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import LucideIcon from '../../components/common/LucideIcon.vue'

const props = defineProps<{ show: boolean; contractId: string | null }>()
const emit = defineEmits<{ 'update:show': [value: boolean]; done: [] }>()

const reason = ref('')
const content = ref('')
const saving = ref(false)

watch(
  () => props.show,
  (val) => {
    if (val) {
      reason.value = ''
      content.value = ''
    }
  }
)

const handleSave = async () => {
  if (!props.contractId || !reason.value || !content.value) return
  saving.value = true
  try {
    await (window as any).api.contracts.amendments.create({
      contract_id: props.contractId,
      reason: reason.value,
      content: content.value
    })
    emit('done')
    emit('update:show', false)
  } catch {
    console.error('Failed to save amendment')
  } finally {
    saving.value = false
  }
}
</script>
