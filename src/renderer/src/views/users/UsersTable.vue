<template>
  <v-card
    elevation="0"
    class="section-card-wrapper overflow-hidden pa-0"
  >
    <v-table density="comfortable" class="b2b-table">
      <thead>
        <tr style="background: #F7F3E8; border-bottom: 2px solid #E5E1D8;">
          <th class="text-right text-navy font-weight-black py-3">اسم المستخدم</th>
          <th class="text-right text-navy font-weight-black py-3">الاسم الكامل</th>
          <th class="text-right text-navy font-weight-black py-3">الدور الوظيفي</th>
          <th class="text-right text-navy font-weight-black py-3">الحالة</th>
          <th class="text-center text-navy font-weight-black py-3">إجراءات التحكم</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td colspan="5" class="pa-8">
            <v-skeleton-loader type="table-row-divider@3" color="transparent" />
          </td>
        </tr>
        <tr v-else-if="safeLength(users) === 0">
          <td colspan="5" class="text-center py-12">
            <LucideIcon name="users-round" :size="48" class="text-muted-gray mb-4 mx-auto" />
            <div class="text-h6 text-navy font-weight-bold opacity-60">لا يوجد مستخدمون حالياً</div>
          </td>
        </tr>
        <tr v-for="u in safeArray(users)" :key="u.id" class="b2b-table-row">
          <td class="font-weight-black text-navy">{{ u.username || '-' }}</td>
          <td class="text-navy font-weight-medium">{{ u.full_name || '---' }}</td>
          <td style="min-width: 240px">
            <v-select
              :items="roles"
              density="compact"
              variant="outlined"
              class="glass-input-compact glass-input"
              hide-details
              :model-value="u.role_key"
              @update:model-value="(val) => $emit('set-role', u.id, String(val))"
            >
              <template #prepend-inner>
                <LucideIcon name="shield-check" :size="16" class="text-gold" />
              </template>
            </v-select>
          </td>
          <td>
            <v-chip
              :color="u.is_active ? 'success' : 'error'"
              size="small"
              variant="flat"
              class="font-weight-black"
              style="min-width: 80px; justify-content: center"
            >
              {{ u.is_active ? 'مفعل' : 'معطل' }}
            </v-chip>
          </td>
          <td class="text-center">
            <div class="d-flex align-center justify-center gap-2">
              <v-tooltip :text="u.is_active ? 'تعطيل الدخول' : 'تفعيل الدخول'" location="top">
                <template #activator="{ props }">
                  <v-btn
                    class="premium-btn-gold-gradient"
                    v-bind="props"
                    icon
                    size="small"
                    variant="tonal"
                    :color="u.is_active ? 'error' : 'success'"
                    @click="$emit('toggle-active', u.id, !u.is_active)"
                  >
                    <LucideIcon :name="u.is_active ? 'user-minus' : 'user-check'" :size="18" />
                  </v-btn>
                </template>
              </v-tooltip>
              <v-tooltip text="تعديل اسم المستخدم" location="top">
                <template #activator="{ props }">
                  <v-btn
                    class="premium-btn-gold-gradient"
                    v-bind="props"
                    icon
                    size="small"
                    variant="tonal"
                    color="gold"
                    @click="$emit('edit-username', u)"
                  >
                    <LucideIcon name="pencil" :size="18" />
                  </v-btn>
                </template>
              </v-tooltip>
              <v-tooltip text="إدارة الصلاحيات التفصيلية" location="top">
                <template #activator="{ props }">
                  <v-btn
                    class="premium-btn-gold-gradient"
                    v-bind="props"
                    icon
                    size="small"
                    variant="tonal"
                    color="accent"
                    @click="$emit('edit-permissions', u.id)"
                  >
                    <LucideIcon name="key" :size="18" />
                  </v-btn>
                </template>
              </v-tooltip>
              <v-tooltip text="إدارة بيانات استعادة الحساب" location="top">
                <template #activator="{ props }">
                  <v-btn
                    class="premium-btn-gold-gradient"
                    v-bind="props"
                    icon
                    size="small"
                    variant="tonal"
                    color="gold"
                    @click="$emit('edit-recovery', u)"
                  >
                    <LucideIcon name="shield-alert" :size="18" />
                  </v-btn>
                </template>
              </v-tooltip>
              <v-tooltip text="تحديد نطاق العمل (قضايا/عملاء)" location="top">
                <template #activator="{ props }">
                  <v-btn
                    class="premium-btn-gold-gradient"
                    v-bind="props"
                    icon
                    size="small"
                    variant="tonal"
                    color="gold"
                    @click="$emit('edit-scope', u.id)"
                  >
                    <LucideIcon name="scope" :size="18" />
                  </v-btn>
                </template>
              </v-tooltip>
              <v-tooltip
                v-if="isAdmin && u.username !== 'admin'"
                text="حذف المستخدم نهائياً"
                location="top"
              >
                <template #activator="{ props }">
                  <v-btn
                    class="premium-btn-gold-gradient"
                    v-bind="props"
                    icon
                    size="small"
                    variant="tonal"
                    color="error"
                    @click="$emit('delete-user', u.id)"
                  >
                    <LucideIcon name="trash-2" :size="18" />
                  </v-btn>
                </template>
              </v-tooltip>
            </div>
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'
import { safeArray, safeLength } from '../../utils/safe'

defineProps<{
  users: any[]
  roles: { title: string; value: string }[]
  loading: boolean
  isAdmin: boolean
}>()

defineEmits<{
  'toggle-active': [userId: string, isActive: boolean]
  'edit-username': [user: any]
  'edit-permissions': [userId: string]
  'edit-recovery': [user: any]
  'edit-scope': [userId: string]
  'delete-user': [userId: string]
  'set-role': [userId: string, roleKey: string]
}>()
</script>
