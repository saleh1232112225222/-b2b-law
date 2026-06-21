<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-4">
      <div class="text-h6 font-weight-black text-primary">
        <LucideIcon name="users" :size="24" class="text-primary me-2" /> أطراف القضية (موكلين
        وخصوم)*
      </div>
      <div class="d-flex ga-4">
        <v-btn
          size="large"
          variant="tonal"
          color="primary"
          class="font-weight-black rounded-xl px-6"
          @click="addParty('client')"
        >
          <LucideIcon name="plus" :size="20" class="me-2" /> إضافة موكل
        </v-btn>
        <v-btn
          size="large"
          variant="tonal"
          color="accent"
          class="font-weight-black rounded-xl px-6"
          @click="addParty('opponent')"
        >
          <LucideIcon name="plus" :size="20" class="me-2" /> إضافة خصم
        </v-btn>
      </div>
    </div>

    <v-alert
      v-if="parties.length === 0"
      type="warning"
      variant="tonal"
      class="rounded-xl mb-6 glass-card border shadow-sm"
    >
      يجب إضافة طرف واحد على الأقل (موكل) لحفظ القضية.
    </v-alert>

    <div
      v-for="(party, idx) in parties"
      :key="idx"
      class="party-item mb-6 pa-6 rounded-xl glass-card border position-relative overflow-hidden premium-hover shadow-premium"
    >
      <div
        class="position-absolute text-primary"
        style="top: -20px; right: -20px; opacity: 0.06; pointer-events: none"
      >
        <LucideIcon :name="party.party_type === 'client' ? 'user-check' : 'user-x'" :size="120" />
      </div>
      <v-btn
        variant="tonal"
        color="error"
        size="small"
        class="position-absolute rounded-lg glass-card"
        style="top: 12px; left: 12px; z-index: 2"
        @click="removeParty(idx)"
      >
        <LucideIcon name="trash-2" :size="18" />
      </v-btn>

      <v-row dense>
        <v-col cols="12" md="2">
          <v-select
            :model-value="party.party_type"
            :items="[
              { title: 'موكل', value: 'client' },
              { title: 'خصم', value: 'opponent' }
            ]"
            label="نوع الطرف"
            variant="outlined"
            density="compact"
            hide-details
            readonly
            class="premium-select"
          >
            <template #prepend-inner>
              <LucideIcon
                :name="party.party_type === 'client' ? 'user-check' : 'user-x'"
                :size="16"
                class="text-primary me-2"
              />
            </template>
          </v-select>
        </v-col>

        <template v-if="party.party_type === 'client'">
          <v-col cols="12" md="5">
            <v-autocomplete
              :model-value="party.client_id"
              :items="clients"
              item-title="name"
              item-value="id"
              label="اختر الموكل من القائمة*"
              variant="outlined"
              density="compact"
              hide-details
              :rules="[(v: any) => !!v || 'الموكل مطلوب']"
              class="premium-select"
              @update:model-value="(val: string) => onClientChange(idx, val)"
            >
              <template #prepend-inner>
                <LucideIcon name="user" :size="16" class="text-primary me-2" />
              </template>
            </v-autocomplete>
          </v-col>
        </template>

        <template v-else>
          <v-col cols="12" md="5">
            <div class="d-flex ga-4 align-center">
              <v-autocomplete
                :model-value="party.defendant_id"
                :items="defendants"
                item-title="name"
                item-value="id"
                label="اختر الخصم من القائمة*"
                variant="outlined"
                density="compact"
                hide-details
                :rules="[(v: any) => !!v || 'الخصم مطلوب']"
                class="flex-grow-1 premium-select"
                @update:model-value="
                  (val: string) => $emit('defendantChange', { index: idx, value: val })
                "
              >
                <template #prepend-inner>
                  <LucideIcon name="user-x" :size="16" class="text-accent me-2" />
                </template>
              </v-autocomplete>
              <v-btn
                size="small"
                variant="tonal"
                color="primary"
                class="rounded-lg h-40 px-3"
                @click="$emit('quickAddDefendant', idx)"
              >
                <LucideIcon name="user-plus" :size="18" />
              </v-btn>
            </div>
          </v-col>
        </template>

        <v-col cols="12" md="3">
          <v-select
            :model-value="party.role"
            :items="['مدعي', 'مدعى عليه', 'طرف ثالث', 'متدخل']"
            label="الصفة"
            variant="outlined"
            density="compact"
            hide-details
            class="premium-select"
            @update:model-value="(val: string) => updateParty(idx, { role: val })"
          >
            <template #prepend-inner>
              <LucideIcon name="tag" :size="16" class="text-primary me-2" />
            </template>
          </v-select>
        </v-col>

        <v-col cols="12" md="2">
          <v-text-field
            :model-value="party.phone"
            label="رقم الجوال"
            variant="outlined"
            density="compact"
            hide-details
            class="premium-select"
            @update:model-value="(val: string) => updateParty(idx, { phone: val })"
          >
            <template #prepend-inner>
              <LucideIcon name="phone" :size="16" class="text-primary me-2" />
            </template>
          </v-text-field>
        </v-col>
      </v-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'

interface Party {
  party_type: string
  client_id?: string
  defendant_id?: string
  name?: string
  phone?: string
  role?: string
  [key: string]: any
}

const props = defineProps<{
  parties: Party[]
  clients: any[]
  defendants: any[]
}>()

const emit = defineEmits<{
  update: [parties: Party[]]
  clientChange: [{ index: number; value: string }]
  defendantChange: [{ index: number; value: string }]
  quickAddDefendant: [index: number]
}>()

const addParty = (type: 'client' | 'opponent'): void => {
  const updated = [
    ...props.parties,
    {
      party_type: type,
      name: '',
      client_id: '',
      defendant_id: '',
      phone: '',
      id_number: '',
      nationality: type === 'opponent' ? 'سعودي' : '',
      role: type === 'client' ? 'مدعي' : 'مدعى عليه'
    }
  ]
  emit('update', updated)
}

const removeParty = (index: number): void => {
  const updated = props.parties.filter((_, i) => i !== index)
  emit('update', updated)
}

const updateParty = (index: number, partial: Partial<Party>): void => {
  const updated = props.parties.map((p, i) => (i === index ? { ...p, ...partial } : p))
  emit('update', updated)
}

const onClientChange = (index: number, clientId: string): void => {
  const client = props.clients.find((c) => c.id === clientId)
  if (!client) return
  const updated = props.parties.map((p, i) => {
    if (i !== index) return p
    return { ...p, client_id: clientId, name: client.name, phone: client.phone || '' }
  })
  emit('update', updated)
  emit('clientChange', { index, value: clientId })
}
</script>
