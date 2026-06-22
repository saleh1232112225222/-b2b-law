<template>
  <v-dialog :model-value="show" max-width="500" @update:model-value="$emit('update:show', $event)">
    <v-card class="glass-card border-gold border-2 overflow-hidden rounded-2xl ga-4 glass-card">
      <div class="pa-6 bg-gold-gradient text-ebony d-flex align-center">
        <LucideIcon name="pencil" :size="24" class="me-3" />
        <span class="text-h6 font-weight-black">تعديل اسم المستخدم</span>
        <v-spacer />
        <v-btn class="premium-btn-gold-gradient" icon variant="text" color="ebony" @click="$emit('update:show', false)">
          <LucideIcon name="x" :size="24" />
        </v-btn>
      </div>
      <v-card-text class="pa-8 glass-card">
        <div class="text-caption text-gold opacity-60 mb-4 font-weight-black">
          المستخدم الحالي: {{ oldUsername }}
        </div>
        <label class="mb-2 font-weight-black text-gold">اسم المستخدم الجديد</label>
        <v-text-field
          v-model="newUsername"
          variant="outlined"
          class="glass-input glass-input"
          placeholder="أدخل اسم المستخدم الجديد"
          hide-details="auto"
          autofocus
          @keyup.enter="handleSave"
        >
          <template #prepend-inner>
            <LucideIcon name="user" :size="20" class="text-gold me-2" />
          </template>
        </v-text-field>
        <v-alert
          type="info"
          variant="tonal"
          density="compact"
          class="mt-6 text-caption font-weight-bold border-gold border-opacity-20"
        >
          تغيير اسم المستخدم سيؤثر على عملية تسجيل الدخول القادمة لهذا الحساب.
        </v-alert>
      </v-card-text>
      <v-card-actions class="pa-8 pt-0 ga-3 glass-card">
        <v-btn
          variant="text"
          color="gold"
          class="font-weight-black premium-btn-gold-gradient"
          @click="$emit('update:show', false)"
          >إلغاء</v-btn
        >
        <v-spacer />
        <v-btn
          color="gold"
          variant="flat"
          class="px-8 font-weight-black premium-lift premium-btn-gold-gradient"
          :loading="loading"
          :disabled="!newUsername || newUsername.length < 3 || newUsername === oldUsername"
          @click="handleSave"
          >حفظ التغيير</v-btn
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
  userId: string
  oldUsername: string
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  done: []
}>()

const newUsername = ref('')
const loading = ref(false)

watch(
  () => props.show,
  (val) => {
    if (val) newUsername.value = props.oldUsername
  }
)

const handleSave = async () => {
  if (!props.userId || !newUsername.value) return
  loading.value = true
  try {
    await (window as any).api.users.updateUsername(props.userId, newUsername.value)
    const sRaw = localStorage.getItem('web_currentUserSession')
    if (sRaw) {
      const s = JSON.parse(sRaw)
      if (s.userId === props.userId) {
        s.username = newUsername.value
        localStorage.setItem('web_currentUserSession', JSON.stringify(s))
      }
    }
    const cuRaw = localStorage.getItem('web_currentUser')
    if (cuRaw) {
      const cu = JSON.parse(cuRaw)
      if (cu.id === props.userId) {
        cu.username = newUsername.value
        localStorage.setItem('web_currentUser', JSON.stringify(cu))
      }
    }
    if (sRaw || localStorage.getItem('web_currentUser')) {
      window.dispatchEvent(new Event('auth-changed'))
    }
    emit('done')
    emit('update:show', false)
  } catch (err: any) {
    console.error('Failed to update username:', err)
  } finally {
    loading.value = false
  }
}
</script>
