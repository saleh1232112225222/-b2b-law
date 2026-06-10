<template>
  <v-dialog v-model="show" width="90%" max-width="600" persistent>
    <v-card class="rounded-xl overflow-hidden modal-card">
      <v-toolbar color="error" class="px-6" height="72">
        <LucideIcon name="file-minus" :size="24" class="text-white me-3" />
        <v-toolbar-title class="font-weight-black text-white"
          >إصدار إشعار دائن (استرداد)</v-toolbar-title
        >
        <v-spacer></v-spacer>
        <v-btn icon variant="text" color="white" @click="show = false">
          <LucideIcon name="x" :size="24" />
        </v-btn>
      </v-toolbar>

      <v-card-text class="pa-6 bg-grey-lighten-4">
        <v-form ref="formRef" v-model="formValid">
          <v-row dense>
            <v-col cols="12">
              <v-autocomplete
                v-model="item.client_id"
                :items="clients"
                item-title="name"
                item-value="id"
                label="الموكل المستفيد*"
                variant="outlined"
                bg-color="white"
                :rules="[(v) => !!v || 'الموكل مطلوب']"
                @update:model-value="onClientChange"
              ></v-autocomplete>
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="item.invoice_id"
                :items="clientInvoices"
                item-title="invoice_number"
                item-value="id"
                label="مرتبط بفاتورة (اختياري)"
                variant="outlined"
                bg-color="white"
                clearable
              ></v-select>
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model.number="item.amount"
                type="number"
                label="المبلغ المراد استراده*"
                variant="outlined"
                bg-color="white"
                prefix="ريال"
                :rules="[
                  (v) => !!v || 'المبلغ مطلوب',
                  (v) => v > 0 || 'المبلغ يجب أن يكون أكبر من صفر'
                ]"
              ></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="item.reason"
                label="سبب الاسترداد / الملاحظات*"
                variant="outlined"
                bg-color="white"
                rows="3"
                :rules="[(v) => !!v || 'السبب مطلوب']"
              ></v-textarea>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-6 bg-white">
        <v-btn variant="text" size="large" @click="show = false">إلغاء</v-btn>
        <v-spacer></v-spacer>
        <v-btn
          color="error"
          variant="elevated"
          size="large"
          class="px-8 font-weight-black"
          :loading="saving"
          :disabled="!formValid"
          @click="handleSave"
        >
          إصدار الإشعار
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useCreditNoteStore } from '../../stores/creditNote'
import { useClientsStore } from '../../stores/clients'
import { useFinanceStore } from '../../stores/finance'
import LucideIcon from '../common/LucideIcon.vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue', 'created'])

const show = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const creditNoteStore = useCreditNoteStore()
const clientsStore = useClientsStore()
const financeStore = useFinanceStore()

const formValid = ref(false)
const saving = ref(false)
const formRef = ref<any>(null)
const clientInvoices = ref<any[]>([])

const clients = computed(() => clientsStore.clients)

const item = reactive({
  client_id: '',
  invoice_id: '',
  amount: 0,
  reason: '',
  date: new Date().toISOString().split('T')[0]
})

const onClientChange = async (clientId: string) => {
  if (!clientId) {
    clientInvoices.value = []
    return
  }
  // Filter invoices for this client
  clientInvoices.value = financeStore.invoices.filter((i) => i.client_id === clientId)
}

const handleSave = async () => {
  if (!formRef.value) return
  const { valid } = await formRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    await creditNoteStore.create({
      ...item,
      status: 'pending' // Default status
    })
    emit('created')
    show.value = false
  } catch (error) {
    console.error('Failed to create credit note:', error)
  } finally {
    saving.value = false
  }
}
</script>
