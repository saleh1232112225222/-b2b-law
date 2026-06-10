<template>
  <v-dialog :model-value="show" max-width="500" @update:model-value="$emit('update:show', $event)">
    <v-card class="glass-card border-gold border-2 overflow-hidden rounded-2xl ga-4">
      <div class="pa-6 bg-gold-gradient text-ebony d-flex align-center">
        <LucideIcon name="shield-alert" :size="24" class="me-3" />
        <span class="text-h6 font-weight-black">بيانات الاستعادة: {{ username }}</span>
        <v-spacer />
        <v-btn icon variant="text" color="ebony" @click="$emit('update:show', false)">
          <LucideIcon name="x" :size="24" />
        </v-btn>
      </div>
      <v-card-text class="pa-8">
        <div class="mb-4">
          <v-label class="mb-2 font-weight-black text-gold opacity-60">البريد الإلكتروني للاستعادة (Identity Hint)</v-label>
          <v-text-field v-model="email" variant="outlined" class="glass-input" placeholder="example@email.com" hide-details>
            <template #prepend-inner>
              <LucideIcon name="mail" :size="20" class="text-gold me-2" />
            </template>
          </v-text-field>
        </div>
        <div class="mb-4">
          <v-label class="mb-2 font-weight-black text-gold opacity-60">السؤال السري</v-label>
          <v-text-field v-model="question" variant="outlined" class="glass-input" placeholder="ما هو اسم مدرستك الأولى؟" hide-details>
            <template #prepend-inner>
              <LucideIcon name="help-circle" :size="20" class="text-gold me-2" />
            </template>
          </v-text-field>
        </div>
        <div class="mb-4">
          <v-label class="mb-2 font-weight-black text-gold opacity-60">الإجابة السرية (اتركه فارغاً لعدم التغيير)</v-label>
          <v-text-field v-model="answer" variant="outlined" class="glass-input" placeholder="أدخل الإجابة الجديدة هنا" hide-details type="password">
            <template #prepend-inner>
              <LucideIcon name="key-round" :size="20" class="text-gold me-2" />
            </template>
          </v-text-field>
        </div>
        <v-alert type="warning" variant="tonal" density="compact" class="mt-6 text-caption font-weight-bold border-gold border-opacity-20">
          بصفتك مديراً، يمكنك تعيين هذه البيانات للموظف في حال نسيانها بالكامل.
        </v-alert>
      </v-card-text>
      <v-card-actions class="pa-8 pt-0 ga-3">
        <v-btn variant="text" color="gold" class="font-weight-black" @click="$emit('update:show', false)">إلغاء</v-btn>
        <v-spacer />
        <v-btn color="gold" variant="flat" class="px-8 font-weight-black premium-lift" :loading="loading" @click="handleSave">حفظ البيانات</v-btn>
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
  username: string
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  done: []
}>()

const email = ref('')
const question = ref('')
const answer = ref('')
const loading = ref(false)

watch(() => props.show, (val) => {
  if (val) {
    email.value = ''
    question.value = ''
    answer.value = ''
  }
})

const handleSave = async () => {
  if (!props.userId) return
  loading.value = true
  try {
    await (window as any).api.users.adminUpdateRecoveryInfo(props.userId, email.value || null, question.value || null, answer.value || null)
    emit('done')
    emit('update:show', false)
  } catch (err: any) {
    console.error('Failed to update recovery info:', err)
  } finally {
    loading.value = false
  }
}
</script>
