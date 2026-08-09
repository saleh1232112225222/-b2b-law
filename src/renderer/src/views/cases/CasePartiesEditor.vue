<template>
  <div class="parties-editor-container">
    <!-- Section Header -->
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-3">
      <div class="section-header-gold">
        <LucideIcon name="users" :size="22" class="text-gold me-2" />
        <span class="font-weight-black text-h6 text-gold">أطراف القضية (موكلين وخصوم)*</span>
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
                :model-value="party.client_id"
                :items="clients"
                item-title="name"
                item-value="id"
                placeholder="اختر الموكل..."
                variant="outlined"
                density="comfortable"
                hide-details="auto"
                class="glass-input premium-select w-100"
                :rules="[(v: any) => !!v || 'الموكل مطلوب']"
                @update:model-value="(val: string) => onClientChange(idx, val)"
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
              <label class="text-caption font-weight-bold text-gold mb-1 d-block">اختر الخصم من القائمة*</label>
              <div class="d-flex ga-2 align-center">
                <v-autocomplete
                  :model-value="party.defendant_id"
                  :items="defendants"
                  item-title="name"
                  item-value="id"
                  placeholder="اختر الخصم..."
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                  class="glass-input flex-grow-1 premium-select"
                  :rules="[(v: any) => !!v || 'الخصم مطلوب']"
                  @update:model-value="(val: string) => $emit('defendantChange', { index: idx, value: val })"
                >
                  <template #prepend-inner>
                    <LucideIcon name="user-x" :size="18" class="text-gold me-2" />
                  </template>
                </v-autocomplete>

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
                :model-value="party.client_id"
                :items="clients"
                item-title="name"
                item-value="id"
                variant="outlined"
                density="compact"
                hide-details
                class="glass-input premium-select"
                :rules="[(v: any) => !!v || 'الموكل مطلوب']"
                @update:model-value="(val: string) => onClientChange(idx, val)"
              >
                <template #prepend-inner>
                  <LucideIcon name="user" :size="16" class="text-gold me-2" />
                </template>
              </v-autocomplete>
            </v-col>
          </template>

          <template v-else>
            <v-col cols="12" md="4">
              <label class="text-caption font-weight-bold text-gold mb-1 d-block">اختر الخصم من القائمة*</label>
              <div class="d-flex ga-2 align-center">
                <v-autocomplete
                  :model-value="party.defendant_id"
                  :items="defendants"
                  item-title="name"
                  item-value="id"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="glass-input flex-grow-1 premium-select"
                  :rules="[(v: any) => !!v || 'الخصم مطلوب']"
                  @update:model-value="
                    (val: string) => $emit('defendantChange', { index: idx, value: val })
                  "
                >
                  <template #prepend-inner>
                    <LucideIcon name="user-x" :size="16" class="text-gold me-2" />
                  </template>
                </v-autocomplete>
                <v-btn
                  size="small"
                  variant="outlined"
                  class="btn-gold-outline rounded-lg h-40 px-2"
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

<style scoped>
.section-header-gold {
  border-right: 4px solid var(--primary, #735c00);
  padding-right: 12px;
  display: flex;
  align-items: center;
}

.party-card-box {
  background: transparent !important;
  border: 1px solid var(--border, rgba(208, 198, 175, 0.4)) !important;
  border-radius: 12px !important;
  transition: all 0.2s ease;
}

.party-card-client {
  border-right: 4px solid var(--primary, #735c00) !important;
}

.party-card-opponent {
  border-right: 4px solid #d97706 !important;
}
</style>
