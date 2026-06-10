<template>
  <v-card elevation="0" class="glass-card overflow-hidden border-gold border-opacity-20 border-2">
    <v-table density="comfortable" class="glass-table">
      <thead>
        <tr>
          <th class="text-right text-gold font-weight-black">اسم المستخدم</th>
          <th class="text-right text-gold font-weight-black">الاسم الكامل</th>
          <th class="text-right text-gold font-weight-black">الدور الوظيفي</th>
          <th class="text-right text-gold font-weight-black">الحالة</th>
          <th class="text-center text-gold font-weight-black">إجراءات التحكم</th>
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
            <LucideIcon name="users-round" :size="48" class="text-gold opacity-20 mb-4 mx-auto" />
            <div class="text-h6 text-gold opacity-40">لا يوجد مستخدمون حالياً</div>
          </td>
        </tr>
        <tr v-for="u in safeArray(users)" :key="u.id" class="premium-hover-row">
          <td class="font-weight-black text-accent">{{ u.username || '-' }}</td>
          <td class="text-white">{{ u.full_name || '---' }}</td>
          <td style="min-width: 240px">
            <v-select :items="roles" density="compact" variant="outlined" class="glass-input-compact" hide-details :model-value="u.role_key" @update:model-value="(val) => $emit('set-role', u.id, String(val))">
              <template #prepend-inner>
                <LucideIcon name="shield-check" :size="16" class="text-gold" />
              </template>
            </v-select>
          </td>
          <td>
            <v-chip :color="u.is_active ? 'success' : 'error'" size="small" variant="flat" class="font-weight-black" style="min-width: 80px; justify-content: center">
              {{ u.is_active ? 'مفعل' : 'معطل' }}
            </v-chip>
          </td>
          <td class="text-center">
            <div class="d-flex align-center justify-center gap-2">
              <v-tooltip :text="u.is_active ? 'تعطيل الدخول' : 'تفعيل الدخول'" location="top">
                <template #activator="{ props }">
                  <v-btn v-bind="props" icon size="small" variant="tonal" :color="u.is_active ? 'error' : 'success'" @click="$emit('toggle-active', u.id, !u.is_active)">
                    <LucideIcon :name="u.is_active ? 'user-minus' : 'user-check'" :size="18" />
                  </v-btn>
                </template>
              </v-tooltip>
              <v-tooltip text="تعديل اسم المستخدم" location="top">
                <template #activator="{ props }">
                  <v-btn v-bind="props" icon size="small" variant="tonal" color="gold" @click="$emit('edit-username', u)">
                    <LucideIcon name="pencil" :size="18" />
                  </v-btn>
                </template>
              </v-tooltip>
              <v-tooltip text="إدارة الصلاحيات التفصيلية" location="top">
                <template #activator="{ props }">
                  <v-btn v-bind="props" icon size="small" variant="tonal" color="accent" @click="$emit('edit-permissions', u.id)">
                    <LucideIcon name="key" :size="18" />
                  </v-btn>
                </template>
              </v-tooltip>
              <v-tooltip text="إدارة بيانات استعادة الحساب" location="top">
                <template #activator="{ props }">
                  <v-btn v-bind="props" icon size="small" variant="tonal" color="gold" @click="$emit('edit-recovery', u)">
                    <LucideIcon name="shield-alert" :size="18" />
                  </v-btn>
                </template>
              </v-tooltip>
              <v-tooltip text="تحديد نطاق العمل (قضايا/عملاء)" location="top">
                <template #activator="{ props }">
                  <v-btn v-bind="props" icon size="small" variant="tonal" color="gold" @click="$emit('edit-scope', u.id)">
                    <LucideIcon name="scope" :size="18" />
                  </v-btn>
                </template>
              </v-tooltip>
              <v-tooltip v-if="isAdmin && u.username !== 'admin'" text="حذف المستخدم نهائياً" location="top">
                <template #activator="{ props }">
                  <v-btn v-bind="props" icon size="small" variant="tonal" color="error" @click="$emit('delete-user', u.id)">
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
