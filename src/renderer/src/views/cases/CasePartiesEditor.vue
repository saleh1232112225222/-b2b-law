<template>
  <div class="parties-editor-container">
    <!-- Section Header -->
    <div class="d-flex align-center justify-space-between mb-4 pb-2 border-b-light flex-wrap ga-3">
      <div class="d-flex align-center">
        <div class="icon-circle-gold me-3">
          <LucideIcon name="users" :size="18" />
        </div>
        <div>
          <h4 class="text-h6 font-weight-black text-navy mb-0">أطراف القضية (موكلين وخصوم) *</h4>
          <span class="text-caption text-muted-gray">أضف الموكلين أولاً ثم الخصوم المرتبطين بالقضية</span>
        </div>
      </div>
      <div class="d-flex ga-3 align-center">
        <v-btn
          variant="outlined"
          class="pill-btn-gold px-4"
          @click="addParty('client')"
        >
          <LucideIcon name="user-plus" :size="18" class="me-2" /> إضافة موكل
        </v-btn>
        <v-btn
          variant="outlined"
          class="pill-btn-opponent px-4"
          @click="addParty('opponent')"
        >
          <LucideIcon name="user-x" :size="18" class="me-2" /> إضافة خصم
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

    <!-- Party Items List -->
    <div
      v-for="(party, idx) in parties"
      :key="idx"
      class="party-card-box mb-4 pa-4 pa-sm-5 rounded-xl position-relative"
      :class="party.party_type === 'client' ? 'party-card-client' : 'party-card-opponent'"
    >
      <!-- Mobile Layout (<768px) -->
      <div class="d-block d-md-none">
        <div class="d-flex align-center justify-space-between mb-3 border-b pb-2">
          <v-chip
            size="small"
            variant="flat"
            :color="party.party_type === 'client' ? 'primary' : 'warning'"
            class="font-weight-black px-3"
          >
            {{ party.party_type === 'client' ? 'موكل' : 'خصم' }}
          </v-chip>

          <v-btn
            variant="tonal"
            color="error"
            size="small"
            class="rounded-lg px-3 font-weight-black"
            @click="removeParty(idx)"
          >
            <LucideIcon name="trash-2" :size="16" class="me-1" /> حذف الطرف
          </v-btn>
        </div>

        <div class="d-flex flex-column ga-3">
          <!-- Client Select -->
          <template v-if="party.party_type === 'client'">
            <div>
              <label class="text-caption font-weight-bold text-gold mb-1 d-block">اختر الموكل من القائمة*</label>
              <v-autocomplete
                :model-value="getPartyClientValue(party)"
                :items="clients"
                item-title="name"
                item-value="id"
                placeholder="اختر الموكل..."
                variant="outlined"
                density="comfortable"
                hide-details="auto"
                class="glass-input premium-select w-100"
                :rules="[(v: any) => !!v || 'الموكل مطلوب']"
                @update:model-value="(val: any) => onClientChange(idx, val)"
              >
                <template #prepend-inner>
                  <LucideIcon name="user" :size="18" class="text-gold me-2" />
                </template>
              </v-autocomplete>
            </div>
          </template>

          <!-- Defendant Select -->
          <template v-else>
            <div>
              <label class="text-caption font-weight-bold text-gold mb-1 d-block">اختر الخصم من القائمة أو اكتب اسمه*</label>
              <div class="d-flex ga-2 align-center">
                <v-combobox
                  :model-value="getPartyDefendantValue(party)"
                  :items="defendants"
                  item-title="name"
                  item-value="id"
                  :return-object="false"
                  placeholder="اختر الخصم أو اكتب اسمه..."
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                  class="glass-input flex-grow-1 premium-select"
                  :rules="[(v: any) => !!v || 'الخصم مطلوب']"
                  @update:model-value="(val: any) => onDefendantChange(idx, val)"
                >
                  <template #prepend-inner>
                    <LucideIcon name="user-x" :size="18" class="text-gold me-2" />
                  </template>
                </v-combobox>

                <v-btn
                  size="small"
                  variant="outlined"
                  class="btn-gold-outline rounded-lg px-2 h-44"
                  title="إضافة خصم سريع"
                  @click="$emit('quickAddDefendant', idx)"
                >
                  <LucideIcon name="user-plus" :size="18" />
                </v-btn>
              </div>
            </div>
          </template>

          <!-- Role -->
          <div>
            <label class="text-caption font-weight-bold text-gold mb-1 d-block">الصفة</label>
            <v-select
              :model-value="party.role"
              :items="['مدعي', 'مدعى عليه', 'طرف ثالث', 'متدخل']"
              placeholder="اختر الصفة..."
              variant="outlined"
              density="comfortable"
              hide-details="auto"
              class="premium-select glass-input w-100"
              @update:model-value="(val: string) => updateParty(idx, { role: val })"
            >
              <template #prepend-inner>
                <LucideIcon name="tag" :size="18" class="text-gold me-2" />
              </template>
            </v-select>
          </div>

          <!-- Phone -->
          <div>
            <label class="text-caption font-weight-bold text-gold mb-1 d-block">رقم الجوال</label>
            <v-text-field
              :model-value="party.phone"
              placeholder="05xxxxxxx"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
              class="premium-select glass-input w-100"
              @update:model-value="(val: string) => updateParty(idx, { phone: val })"
            >
              <template #prepend-inner>
                <LucideIcon name="phone" :size="18" class="text-gold me-2" />
              </template>
            </v-text-field>
          </div>
        </div>
      </div>

      <!-- Desktop Layout (>=768px) -->
      <div class="d-none d-md-block">
        <v-row dense class="align-center">
          <v-col cols="12" md="2">
            <label class="text-caption font-weight-bold text-gold mb-1 d-block">نوع الطرف</label>
            <v-select
              :model-value="party.party_type"
              :items="[
                { title: 'موكل', value: 'client' },
                { title: 'خصم', value: 'opponent' }
              ]"
              variant="outlined"
              density="compact"
              hide-details
              readonly
              class="premium-select glass-input"
            >
              <template #prepend-inner>
                <LucideIcon
                  :name="party.party_type === 'client' ? 'user-check' : 'user-x'"
                  :size="16"
                  class="text-gold me-2"
                />
              </template>
            </v-select>
          </v-col>

          <template v-if="party.party_type === 'client'">
            <v-col cols="12" md="4">
              <label class="text-caption font-weight-bold text-gold mb-1 d-block">اختر الموكل من القائمة*</label>
              <v-autocomplete
                :model-value="getPartyClientValue(party)"
                :items="clients"
                item-title="name"
                item-value="id"
                variant="outlined"
                density="compact"
                hide-details
                class="glass-input premium-select"
                :rules="[(v: any) => !!v || 'الموكل مطلوب']"
                @update:model-value="(val: any) => onClientChange(idx, val)"
              >
                <template #prepend-inner>
                  <LucideIcon name="user" :size="16" class="text-gold me-2" />
                </template>
              </v-autocomplete>
            </v-col>
          </template>

          <template v-else>
            <v-col cols="12" md="4">
              <label class="text-caption font-weight-bold text-gold mb-1 d-block">اختر الخصم أو اكتب اسمه*</label>
              <div class="d-flex ga-2 align-center">
                <v-combobox
                  :model-value="getPartyDefendantValue(party)"
                  :items="defendants"
                  item-title="name"
                  item-value="id"
                  :return-object="false"
                  placeholder="اختر الخصم أو اكتب اسمه..."
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="glass-input flex-grow-1 premium-select"
                  :rules="[(v: any) => !!v || 'الخصم مطلوب']"
                  @update:model-value="(val: any) => onDefendantChange(idx, val)"
                >
                  <template #prepend-inner>
                    <LucideIcon name="user-x" :size="16" class="text-gold me-2" />
                  </template>
                </v-combobox>
                <v-btn
                  size="small"
                  variant="outlined"
                  class="btn-gold-outline rounded-lg h-40 px-2"
                  title="إضافة خصم سريع"
                  @click="$emit('quickAddDefendant', idx)"
                >
                  <LucideIcon name="user-plus" :size="18" />
                </v-btn>
              </div>
            </v-col>
          </template>

          <v-col cols="12" md="3">
            <label class="text-caption font-weight-bold text-gold mb-1 d-block">الصفة</label>
            <v-select
              :model-value="party.role"
              :items="['مدعي', 'مدعى عليه', 'طرف ثالث', 'متدخل']"
              variant="outlined"
              density="compact"
              hide-details
              class="premium-select glass-input"
              @update:model-value="(val: string) => updateParty(idx, { role: val })"
            >
              <template #prepend-inner>
                <LucideIcon name="tag" :size="16" class="text-gold me-2" />
              </template>
            </v-select>
          </v-col>

          <v-col cols="12" md="2">
            <label class="text-caption font-weight-bold text-gold mb-1 d-block">رقم الجوال</label>
            <v-text-field
              :model-value="party.phone"
              variant="outlined"
              density="compact"
              hide-details
              class="premium-select glass-input"
              @update:model-value="(val: string) => updateParty(idx, { phone: val })"
            >
              <template #prepend-inner>
                <LucideIcon name="phone" :size="16" class="text-gold me-2" />
              </template>
            </v-text-field>
          </v-col>

          <v-col cols="12" md="1" class="d-flex justify-end pt-5">
            <v-btn
              variant="tonal"
              color="error"
              size="small"
              class="rounded-lg"
              title="حذف الطرف"
              @click="removeParty(idx)"
            >
              <LucideIcon name="trash-2" :size="18" />
            </v-btn>
          </v-col>
        </v-row>
      </div>
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
  const newParty = {
    party_type: type,
    name: '',
    client_id: '',
    defendant_id: '',
    phone: '',
    id_number: '',
    nationality: type === 'opponent' ? 'سعودي' : '',
    role: type === 'client' ? 'مدعي' : 'مدعى عليه'
  }

  let updated = [...props.parties]
  if (type === 'client') {
    // Insert after the last existing client (before opponents)
    const lastClientIdx = updated.map((p) => p.party_type).lastIndexOf('client')
    if (lastClientIdx >= 0) {
      updated.splice(lastClientIdx + 1, 0, newParty)
    } else {
      updated.unshift(newParty)
    }
  } else {
    // Append opponents at bottom
    updated.push(newParty)
  }

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

const getPartyClientValue = (party: Party) => {
  if (!party) return ''
  if (party.client_id) {
    const matched = props.clients.find((c) => c.id === party.client_id)
    if (matched) return matched.id
  }
  if (party.name) {
    const matched = props.clients.find(
      (c) => c.name === party.name || c.name?.trim() === party.name?.trim()
    )
    if (matched) return matched.id
  }
  return party.client_id || party.name || ''
}

const onClientChange = (index: number, val: any): void => {
  let clientId = ''
  let clientName = ''
  let clientPhone = ''

  if (typeof val === 'object' && val !== null) {
    clientId = val.id || ''
    clientName = val.name || ''
    clientPhone = val.phone || ''
  } else if (typeof val === 'string') {
    const matched = props.clients.find(
      (c) => c.id === val || c.name === val || c.name?.trim() === val.trim()
    )
    if (matched) {
      clientId = matched.id
      clientName = matched.name
      clientPhone = matched.phone || ''
    } else {
      clientId = val
      clientName = val
    }
  }

  const updated = props.parties.map((p, i) => {
    if (i !== index) return p
    return {
      ...p,
      client_id: clientId,
      name: clientName || p.name,
      phone: clientPhone || p.phone
    }
  })
  emit('update', updated)
  emit('clientChange', { index, value: clientId })
}

const getPartyDefendantValue = (party: Party) => {
  if (!party) return ''
  if (party.defendant_id) {
    const matched = props.defendants.find((d) => d.id === party.defendant_id)
    if (matched) return matched.id
  }
  if (party.name) {
    const matched = props.defendants.find(
      (d) => d.name === party.name || d.name?.trim() === party.name?.trim()
    )
    if (matched) return matched.id
    return party.name
  }
  return party.defendant_id || ''
}

const onDefendantChange = (index: number, val: any): void => {
  let defId = ''
  let defName = ''
  let defPhone = ''
  let defIdNumber = ''
  let defNat = 'سعودي'

  if (typeof val === 'object' && val !== null) {
    defId = val.id || ''
    defName = val.name || ''
    defPhone = val.phone || ''
    defIdNumber = val.id_number || ''
    defNat = val.nationality || 'سعودي'
  } else if (typeof val === 'string') {
    const trimmed = val.trim()
    const matched = props.defendants.find(
      (d) => d.id === trimmed || d.name === trimmed || d.name?.trim() === trimmed
    )
    if (matched) {
      defId = matched.id
      defName = matched.name
      defPhone = matched.phone || ''
      defIdNumber = matched.id_number || ''
      defNat = matched.nationality || 'سعودي'
    } else {
      defId = ''
      defName = trimmed
    }
  }

  const updated = props.parties.map((p, i) => {
    if (i !== index) return p
    return {
      ...p,
      defendant_id: defId,
      name: defName || p.name,
      phone: defPhone || p.phone,
      id_number: defIdNumber || p.id_number,
      nationality: defNat || p.nationality
    }
  })
  emit('update', updated)
  emit('defendantChange', { index, value: defId || defName })
}
</script>

<style scoped>
.party-card-box {
  background: #F8F7F3 !important;
  border: 1px solid #E5E1D8 !important;
  border-radius: 12px !important;
  transition: all 0.2s ease;
}

.party-card-client {
  border-right: 4px solid #B08A2E !important;
}

.party-card-opponent {
  border-right: 4px solid #D97706 !important;
}

/* Dark Mode Contrast Overrides */
:global([data-theme='dark']) .party-card-box {
  background: #0D1929 !important;
  border-color: #26364A !important;
}

:global([data-theme='dark']) .party-card-client {
  border-right: 4px solid #E5B52B !important;
}

:global([data-theme='dark']) .party-card-opponent {
  border-right: 4px solid #F59E0B !important;
}
</style>
