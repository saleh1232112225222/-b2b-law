<template>
  <v-dialog
    :model-value="show"
    max-width="540"
    persistent
    @update:model-value="$emit('update:show', $event)"
  >
    <v-card class="b2b-modal-card overflow-hidden" style="background: #FFFFFF; border: 1px solid #E5E1D8; border-radius: 16px;">
      <div class="pa-4 px-6 d-flex align-center" style="background: #F7F3E8; border-bottom: 1px solid #E5E1D8;">
        <div class="icon-circle-gold me-3">
          <LucideIcon name="user-plus" :size="20" />
        </div>
        <div>
          <h3 class="text-h6 font-weight-black text-navy mb-0">إضافة مستخدم جديد للنظام</h3>
          <span class="text-caption text-muted-gray">أدخل بيانات الحساب والدور الوظيفي المطلوب</span>
        </div>
        <v-spacer />
        <v-btn
          icon
          variant="text"
          class="rounded-circle close-btn"
          @click="$emit('update:show', false)"
        >
          <LucideIcon name="x" :size="20" />
        </v-btn>
      </div>
      <v-card-text class="pa-6" style="background: #F8F7F3;">
        <div class="section-card-wrapper mb-0 pa-5">
          <v-row dense>
            <v-col cols="12" class="mb-3">
              <label class="text-caption font-weight-bold text-navy mb-1 d-block">اسم المستخدم (Username) *</label>
              <v-text-field
                v-model="form.username"
                placeholder="أدخل اسم المستخدم للكون"
                variant="outlined"
                density="compact"
                hide-details
              >
                <template #prepend-inner>
                  <LucideIcon name="user" :size="18" class="text-gold-accent me-2" />
                </template>
              </v-text-field>
            </v-col>
            <v-col cols="12" class="mb-3">
              <label class="text-caption font-weight-bold text-navy mb-1 d-block">الاسم الكامل *</label>
              <v-text-field
                v-model="form.full_name"
                placeholder="أدخل الاسم الثلاثي أو الكامل"
                variant="outlined"
                density="compact"
                hide-details
              >
                <template #prepend-inner>
                  <LucideIcon name="id-card" :size="18" class="text-gold-accent me-2" />
                </template>
              </v-text-field>
            </v-col>
            <v-col cols="12" class="mb-3">
              <label class="text-caption font-weight-bold text-navy mb-1 d-block">الدور الوظيفي *</label>
              <v-select
                v-model="form.role_key"
                :items="roles"
                variant="outlined"
                density="compact"
                hide-details
              >
                <template #prepend-inner>
                  <LucideIcon name="shield-check" :size="18" class="text-gold-accent me-2" />
                </template>
              </v-select>
            </v-col>
            <v-col cols="12">
              <label class="text-caption font-weight-bold text-navy mb-1 d-block">كلمة المرور الأولية *</label>
              <v-text-field
                v-model="form.password"
                type="password"
                placeholder="••••••••"
                variant="outlined"
                density="compact"
                hide-details
              >
                <template #prepend-inner>
                  <LucideIcon name="lock" :size="18" class="text-gold-accent me-2" />
                </template>
              </v-text-field>
            </v-col>
          </v-row>
        </div>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4 px-6" style="background: #F7F3E8; border-top: 1px solid #E5E1D8;">
        <v-btn
          variant="outlined"
          class="pill-btn-cancel px-6"
          @click="$emit('update:show', false)"
          >إلغاء</v-btn
        >
        <v-spacer />
        <v-btn
          variant="flat"
          class="pill-btn-gold-filled px-8"
          @click="handleCreate"
          >تأكيد الإضافة</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import LucideIcon from '../../components/common/LucideIcon.vue'

const props = defineProps<{
  show: boolean
  roles: { title: string; value: string }[]
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  done: []
}>()

const form = ref({ username: '', full_name: '', role_key: 'secretary', password: '' })

watch(
  () => props.show,
  (val) => {
    if (val) form.value = { username: '', full_name: '', role_key: 'secretary', password: '' }
  }
)

const handleCreate = async () => {
  try {
    await (window as any).api.users.create({ ...form.value })
    emit('done')
    emit('update:show', false)
  } catch (e: unknown) {
    console.error('Failed to create user:', e)
  }
}
</script>
