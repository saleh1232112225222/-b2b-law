<template>
  <v-dialog
    :model-value="show"
    max-width="900"
    persistent
    scrollable
    @update:model-value="$emit('update:show', $event)"
  >
    <v-card class="glass-card border-gold border-opacity-30 border-2 overflow-hidden glass-card">
      <div class="bg-gold-gradient pa-4 d-flex align-center">
        <LucideIcon name="key" :size="24" class="text-ebony me-3" />
        <span class="text-h6 font-weight-black text-ebony">تخصيص صلاحيات المستخدم</span>
        <v-spacer />
        <v-btn
          class="premium-btn-gold-gradient"
          icon
          variant="text"
          color="ebony"
          @click="$emit('update:show', false)"
        >
          <LucideIcon name="x" :size="20" />
        </v-btn>
      </div>
      <v-card-text class="pa-8">
        <div class="glass-panel-light pa-4 rounded-xl mb-6 border border-gold border-opacity-20">
          <div class="text-subtitle-2 font-weight-black text-gold mb-1">تنبيه الصلاحيات:</div>
          <div class="text-body-2 text-white opacity-60">
            يتم تطبيق صلاحيات الدور الوظيفي بشكل آلي، ويمكنك هنا إضافة استثناءات (سماح/منع) محددة
            لهذا المستخدم فقط.
          </div>
        </div>
        <div class="mb-6 d-flex gap-3">
          <v-btn
            color="success"
            variant="flat"
            class="rounded-lg font-weight-black px-6 premium-btn-gold-gradient"
            @click="handleBulkSet(true)"
          >
            <LucideIcon name="check-check" :size="18" class="me-2" /> سماح للكل
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            class="rounded-lg font-weight-black px-6 premium-btn-gold-gradient"
            @click="handleBulkSet(false)"
          >
            <LucideIcon name="octagon-x" :size="18" class="me-2" /> منع الكل
          </v-btn>
        </div>
        <v-table
          density="compact"
          class="glass-table border border-gold border-opacity-10 rounded-xl overflow-hidden"
        >
          <thead>
            <tr>
              <th class="text-right text-gold font-weight-black">الموديول</th>
              <th class="text-right text-gold font-weight-black">الاسم الوظيفي</th>
              <th class="text-center text-gold font-weight-black">حالة الاستثناء</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in safeArray(permissions)"
              :key="p.permission_key"
              class="premium-hover-row"
            >
              <td class="text-accent font-weight-bold">{{ p.module_key || '-' }}</td>
              <td>
                <div class="text-white font-weight-black">{{ p.permission_name || '-' }}</div>
                <div class="text-caption text-gold opacity-40 font-mono">
                  {{ p.permission_key || '-' }}
                </div>
              </td>
              <td class="text-center">
                <div class="d-flex align-center justify-center gap-2">
                  <v-btn
                    size="small"
                    :variant="getOverrideState(p.permission_key) === true ? 'flat' : 'tonal'"
                    color="success"
                    class="font-weight-black premium-btn-gold-gradient"
                    min-width="80"
                    @click="setOverride(p.permission_key, true)"
                    >سماح</v-btn
                  >
                  <v-btn
                    size="small"
                    :variant="getOverrideState(p.permission_key) === false ? 'flat' : 'tonal'"
                    color="error"
                    class="font-weight-black premium-btn-gold-gradient"
                    min-width="80"
                    @click="setOverride(p.permission_key, false)"
                    >منع</v-btn
                  >
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
      <v-card-actions class="pa-6 glass-panel-light border-t border-gold border-opacity-10">
        <v-spacer />
        <v-btn
          color="accent"
          variant="flat"
          class="px-10 font-weight-black text-ebony rounded-lg premium-btn-gold-gradient"
          @click="$emit('update:show', false)"
          >إغلاق وتاكيد</v-btn
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

const permissions = ref<any[]>([])
const userOverrides = ref<any[]>([])

watch(
  () => props.show,
  async (val) => {
    if (val && props.selectedUserId) {
      try {
        permissions.value = safeArray(await (window as any).api.permissions.getAll())
        userOverrides.value = safeArray(
          await (window as any).api.users.getOverrides(props.selectedUserId)
        )
      } catch (e) {
        console.error('Failed to load permissions:', e)
      }
    }
  }
)

const getOverrideState = (permissionKey: string): boolean | null => {
  const ov = userOverrides.value.find((x: any) => x.permission_key === permissionKey)
  if (!ov) return null
  return ov.is_allowed === 1 || ov.is_allowed === true
}

const setOverride = async (permissionKey: string, isAllowed: boolean): Promise<void> => {
  if (!props.selectedUserId) return
  try {
    await (window as any).api.users.setPermissionOverride(
      props.selectedUserId,
      permissionKey,
      isAllowed
    )
    userOverrides.value = safeArray(
      await (window as any).api.users.getOverrides(props.selectedUserId)
    )
    emit('done')
  } catch (e: unknown) {
    console.error('Failed to set override:', e)
  }
}

const handleBulkSet = async (isAllowed: boolean): Promise<void> => {
  if (!props.selectedUserId) return
  const keys = safeArray(permissions.value).map((p: any) => p.permission_key)
  if (safeLength(keys) === 0) return
  try {
    await (window as any).api.users.setBulkPermissionOverrides(
      props.selectedUserId,
      isAllowed,
      keys
    )
    userOverrides.value = safeArray(
      await (window as any).api.users.getOverrides(props.selectedUserId)
    )
    emit('done')
  } catch (e: unknown) {
    console.error('Failed to bulk set overrides:', e)
  }
}
</script>
