<template>
  <v-dialog :model-value="show" max-width="520" persistent @update:model-value="$emit('update:show', $event)">
    <v-card class="glass-card border-gold border-opacity-30 border-2 overflow-hidden">
      <div class="bg-gold-gradient pa-4 d-flex align-center">
        <LucideIcon name="user-plus" :size="24" class="text-ebony me-3" />
        <span class="text-h6 font-weight-black text-ebony">إضافة مستخدم جديد للنظام</span>
        <v-spacer />
        <v-btn icon variant="text" color="ebony" @click="$emit('update:show', false)">
          <LucideIcon name="x" :size="20" />
        </v-btn>
      </div>
      <v-card-text class="pa-8">
        <v-row dense>
          <v-col cols="12">
            <v-text-field v-model="form.username" label="اسم المستخدم (Username)" variant="outlined" class="glass-input mb-4" hide-details>
              <template #prepend-inner>
                <LucideIcon name="user" :size="20" class="text-gold me-2" />
              </template>
            </v-text-field>
          </v-col>
          <v-col cols="12">
            <v-text-field v-model="form.full_name" label="الاسم الكامل" variant="outlined" class="glass-input mb-4" hide-details>
              <template #prepend-inner>
                <LucideIcon name="id-card" :size="20" class="text-gold me-2" />
              </template>
            </v-text-field>
          </v-col>
          <v-col cols="12">
            <v-select v-model="form.role_key" :items="roles" label="الدور الوظيفي" variant="outlined" class="glass-input mb-4" hide-details>
              <template #prepend-inner>
                <LucideIcon name="shield-check" :size="20" class="text-gold me-2" />
              </template>
            </v-select>
          </v-col>
          <v-col cols="12">
            <v-text-field v-model="form.password" label="كلمة المرور الأولية" type="password" variant="outlined" class="glass-input mb-4" hide-details>
              <template #prepend-inner>
                <LucideIcon name="lock" :size="20" class="text-gold me-2" />
              </template>
            </v-text-field>
          </v-col>
        </v-row>
      </v-card-text>
      <v-divider class="border-gold opacity-10" />
      <v-card-actions class="pa-6">
        <v-spacer />
        <v-btn variant="text" color="gold" class="px-6 font-weight-black" @click="$emit('update:show', false)">إلغاء</v-btn>
        <v-btn color="accent" variant="flat" class="px-10 font-weight-black text-ebony rounded-lg" @click="handleCreate">تأكيد الإضافة</v-btn>
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

watch(() => props.show, (val) => {
  if (val) form.value = { username: '', full_name: '', role_key: 'secretary', password: '' }
})

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
