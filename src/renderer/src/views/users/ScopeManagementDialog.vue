<template>
  <v-dialog
    :model-value="show"
    max-width="900"
    persistent
    scrollable
    @update:model-value="$emit('update:show', $event)"
  >
    <v-card class="glass-card border-gold border-opacity-30 border-2 overflow-hidden">
      <div class="bg-gold-gradient pa-4 d-flex align-center">
        <LucideIcon name="scope" :size="24" class="text-ebony me-3" />
        <span class="text-h6 font-weight-black text-ebony">إدارة نطاق العمل (Scope)</span>
        <v-spacer />
        <v-btn icon variant="text" color="ebony" @click="$emit('update:show', false)">
          <LucideIcon name="x" :size="20" />
        </v-btn>
      </div>
      <v-card-text class="pa-8">
        <div class="text-body-2 text-gold opacity-60 mb-6 font-weight-bold">
          اربط المستخدم بقضايا أو عملاء محددين للتحكم في الوصول الدقيق للبيانات.
        </div>
        <v-row dense class="mb-8 align-center">
          <v-col cols="12" md="3">
            <v-select
              v-model="scopeForm.type"
              :items="scopeTypes"
              label="نوع النطاق"
              variant="outlined"
              class="glass-input"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="5">
            <v-combobox
              v-model="scopeForm.entityId"
              :items="scopeForm.type === 'case' ? scopeCaseOptions : scopeClientOptions"
              item-title="title"
              item-value="value"
              :label="scopeForm.type === 'case' ? 'اختر القضية...' : 'اختر العميل...'"
              variant="outlined"
              class="glass-input"
              :return-object="false"
              clearable
              hide-details
            >
              <template #prepend-inner>
                <LucideIcon
                  :name="scopeForm.type === 'case' ? 'gavel' : 'users'"
                  :size="20"
                  class="text-gold me-2"
                />
              </template>
            </v-combobox>
          </v-col>
          <v-col cols="12" md="2">
            <v-select
              v-model="scopeForm.accessLevel"
              :items="accessLevels"
              label="المستوى"
              variant="outlined"
              class="glass-input"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-btn
              color="accent"
              variant="flat"
              block
              height="56"
              class="rounded-lg font-weight-black text-ebony"
              @click="addScope"
              >إضافة</v-btn
            >
          </v-col>
        </v-row>
        <v-divider class="border-gold opacity-10 my-8" />
        <v-row>
          <v-col cols="12" md="6">
            <div class="d-flex align-center mb-4">
              <div
                class="glass-panel-light pa-2 rounded-lg me-3 border border-gold border-opacity-10"
              >
                <LucideIcon name="gavel" :size="18" class="text-gold" />
              </div>
              <span class="text-h6 font-weight-black text-white">نطاق القضايا المسموح بها</span>
            </div>
            <v-table
              density="compact"
              class="glass-table border border-gold border-opacity-10 rounded-xl overflow-hidden"
            >
              <thead>
                <tr>
                  <th class="text-right text-gold font-weight-black">المعرف</th>
                  <th class="text-right text-gold font-weight-black">المستوى</th>
                  <th class="text-center text-gold font-weight-black" />
                </tr>
              </thead>
              <tbody>
                <tr v-if="safeLength(scope.caseScopes) === 0">
                  <td colspan="3" class="text-center py-6 text-gold opacity-20">
                    لا يوجد نطاق قضايا مخصص
                  </td>
                </tr>
                <tr
                  v-for="c in safeArray(scope.caseScopes)"
                  :key="c.case_id"
                  class="premium-hover-row"
                >
                  <td class="font-mono text-caption text-accent">{{ c.case_id }}</td>
                  <td>
                    <v-chip
                      size="x-small"
                      :color="c.access_level === 'edit' ? 'orange' : 'blue'"
                      variant="flat"
                      class="font-weight-black"
                      >{{ c.access_level === 'edit' ? 'تعديل' : 'عرض فقط' }}</v-chip
                    >
                  </td>
                  <td class="text-center">
                    <v-btn
                      icon
                      variant="tonal"
                      color="error"
                      size="x-small"
                      @click="removeScope('case', c.case_id || '')"
                    >
                      <LucideIcon name="trash-2" :size="14" />
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-col>
          <v-col cols="12" md="6">
            <div class="d-flex align-center mb-4">
              <div
                class="glass-panel-light pa-2 rounded-lg me-3 border border-gold border-opacity-10"
              >
                <LucideIcon name="users" :size="18" class="text-gold" />
              </div>
              <span class="text-h6 font-weight-black text-white">نطاق العملاء المسموح بهم</span>
            </div>
            <v-table
              density="compact"
              class="glass-table border border-gold border-opacity-10 rounded-xl overflow-hidden"
            >
              <thead>
                <tr>
                  <th class="text-right text-gold font-weight-black">المعرف</th>
                  <th class="text-right text-gold font-weight-black">المستوى</th>
                  <th class="text-center text-gold font-weight-black" />
                </tr>
              </thead>
              <tbody>
                <tr v-if="safeLength(scope.clientScopes) === 0">
                  <td colspan="3" class="text-center py-6 text-gold opacity-20">
                    لا يوجد نطاق عملاء مخصص
                  </td>
                </tr>
                <tr
                  v-for="c in safeArray(scope.clientScopes)"
                  :key="c.client_id"
                  class="premium-hover-row"
                >
                  <td class="font-mono text-caption text-accent">{{ c.client_id }}</td>
                  <td>
                    <v-chip
                      size="x-small"
                      :color="c.access_level === 'edit' ? 'orange' : 'blue'"
                      variant="flat"
                      class="font-weight-black"
                      >{{ c.access_level === 'edit' ? 'تعديل' : 'عرض فقط' }}</v-chip
                    >
                  </td>
                  <td class="text-center">
                    <v-btn
                      icon
                      variant="tonal"
                      color="error"
                      size="x-small"
                      @click="removeScope('client', c.client_id || '')"
                    >
                      <LucideIcon name="trash-2" :size="14" />
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions class="pa-6 glass-panel-light border-t border-gold border-opacity-10">
        <v-spacer />
        <v-btn
          color="gold"
          variant="flat"
          class="px-10 font-weight-black text-ebony rounded-lg"
          @click="$emit('update:show', false)"
          >حفظ وإغلاق</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import LucideIcon from '../../components/common/LucideIcon.vue'
import { safeArray, safeLength } from '../../utils/safe'

const props = defineProps<{
  show: boolean
  selectedUserId: string | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  done: []
}>()

const scopeTypes = [
  { title: 'قضية', value: 'case' },
  { title: 'عميل', value: 'client' }
]
const accessLevels = [
  { title: 'عرض فقط', value: 'view' },
  { title: 'تعديل كامل', value: 'edit' }
]

const scope = ref<{ caseScopes: any[]; clientScopes: any[] }>({ caseScopes: [], clientScopes: [] })
const scopeForm = ref<{ type: 'case' | 'client'; entityId: string; accessLevel: 'view' | 'edit' }>({
  type: 'case',
  entityId: '',
  accessLevel: 'view'
})
const scopeLookupsLoaded = ref(false)
const scopeCaseOptions = ref<Array<{ title: string; value: string }>>([])
const scopeClientOptions = ref<Array<{ title: string; value: string }>>([])

const loadScopeLookups = async () => {
  if (scopeLookupsLoaded.value) return
  try {
    const cases = await (window as any).api.cases.getAll()
    scopeCaseOptions.value = safeArray(cases).map((c: any) => ({
      title: `${c.case_number || c.id} - (${c.client_name || 'بدون موكل'})`,
      value: String(c.id)
    }))
  } catch {
    scopeCaseOptions.value = []
  }
  try {
    const clients = await (window as any).api.clients.getAll()
    scopeClientOptions.value = safeArray(clients).map((c: any) => ({
      title: `${c.name || c.id}${c.id_number ? ` - ${c.id_number}` : ''}`,
      value: String(c.id)
    }))
  } catch {
    scopeClientOptions.value = []
  }
  scopeLookupsLoaded.value = true
}

watch(
  () => props.show,
  async (val) => {
    if (val && props.selectedUserId) {
      scopeLookupsLoaded.value = false
      await loadScopeLookups()
      try {
        const data = await (window as any).api.users.getScope(props.selectedUserId)
        scope.value = {
          caseScopes: safeArray(data?.caseScopes),
          clientScopes: safeArray(data?.clientScopes)
        }
      } catch (e) {
        console.error('Failed to load scope:', e)
      }
    }
  }
)

watch(
  () => scopeForm.value.type,
  () => {
    scopeForm.value.entityId = ''
  }
)

const addScope = async () => {
  if (!props.selectedUserId) return
  const entityId =
    scopeForm.value.entityId && typeof scopeForm.value.entityId === 'object'
      ? String((scopeForm.value.entityId as any).value || '').trim()
      : String(scopeForm.value.entityId || '').trim()
  if (!entityId) return
  try {
    await (window as any).api.users.setScope({
      userId: props.selectedUserId,
      type: scopeForm.value.type,
      entityId,
      accessLevel: scopeForm.value.accessLevel,
      action: 'set'
    })
    const data = await (window as any).api.users.getScope(props.selectedUserId)
    scope.value = {
      caseScopes: safeArray(data?.caseScopes),
      clientScopes: safeArray(data?.clientScopes)
    }
    scopeForm.value.entityId = ''
    emit('done')
  } catch (e: unknown) {
    console.error('Failed to add scope:', e)
  }
}

const removeScope = async (type: 'case' | 'client', entityId: string) => {
  if (!props.selectedUserId) return
  try {
    await (window as any).api.users.setScope({
      userId: props.selectedUserId,
      type,
      entityId,
      accessLevel: 'view',
      action: 'remove'
    })
    const data = await (window as any).api.users.getScope(props.selectedUserId)
    scope.value = {
      caseScopes: safeArray(data?.caseScopes),
      clientScopes: safeArray(data?.clientScopes)
    }
    emit('done')
  } catch (e: unknown) {
    console.error('Failed to remove scope:', e)
  }
}
</script>
