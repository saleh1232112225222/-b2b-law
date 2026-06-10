<template>
  <v-card flat class="pa-4 bg-transparent border rounded-lg">
    <div class="text-h6 font-weight-black mb-4 text-gold d-flex align-center">
      <LucideIcon name="paperclip" :size="24" class="text-gold me-2" />
      المرفقات والمستندات الساندة (PDF)
      <v-spacer></v-spacer>
      <v-progress-circular
        v-if="initializing || uploading"
        indeterminate
        size="20"
        width="2"
        color="orange-darken-3"
      ></v-progress-circular>
    </div>

    <!-- file-input with internal state only -->
    <v-file-input
      label="اختر ملفات السند أو الوكالات (PDF)"
      multiple
      accept="application/pdf"
      variant="outlined"
      :prepend-icon="ICONS.ACTION.UPLOAD"
      show-size
      :loading="uploading"
      :disabled="uploading || initializing"
      @change="onFileChange"
    >
    </v-file-input>

    <v-divider v-if="uploadedAssets.length" class="my-4"></v-divider>

    <div v-if="uploadedAssets.length" class="uploaded-list">
      <div
        v-for="(asset, index) in uploadedAssets"
        :key="asset.id || index"
        class="d-flex align-center py-2 px-3 border rounded mb-2 bg-grey-lighten-4 transition-swing"
        :class="{ 'opacity-50': uploading }"
      >
        <LucideIcon name="file-text" :size="20" class="text-error" />
        <div class="ms-2">
          <div class="text-body-2 font-weight-bold">{{ asset.name }}</div>
          <div class="text-caption text-grey">ملف مرفوع</div>
        </div>
        <v-spacer></v-spacer>
        <v-btn
          :icon="ICONS.ACTION.DELETE"
          size="x-small"
          color="error"
          variant="text"
          :disabled="uploading"
          @click="removeAsset(index)"
        ></v-btn>
      </div>
    </div>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      density="compact"
      class="mt-2"
      closable
      @click:close="error = ''"
    >
      {{ error }}
    </v-alert>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import LucideIcon from '../common/LucideIcon.vue'
import { ICONS } from '../../config/icons'

const props = defineProps({
  modelValue: { type: Array, default: () => [] } // Array of asset IDs
})

const emit = defineEmits(['update:modelValue'])

const uploading = ref(false)
const initializing = ref(false)
const error = ref('')
const uploadedAssets = ref<any[]>([]) // Local state for display

const onFileChange = async (event: any) => {
  const files = event.target.files
  if (!files || files.length === 0) return

  error.value = ''
  uploading.value = true

  try {
    const currentIds = [...(props.modelValue as string[])]
    const currentAssets = [...uploadedAssets.value]

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const res = await (window as any).api.files.upload({
        fileName: file.name,
        fileType: file.type,
        lastModified: file.lastModified,
        path: (file as any).path,
        linked_entity_type: 'enforcement_request', // Ensure entity type is provided
        linked_entity_id: null // Will be linked later after request is created
      })

      if (res && res.id) {
        currentIds.push(res.id)
        currentAssets.push({ id: res.id, name: file.name })
      }
    }

    uploadedAssets.value = currentAssets
    emit('update:modelValue', currentIds)

    // Reset the input manually if needed (not strictly required with @change on native input wrapped by v-file-input)
    event.target.value = ''
  } catch (e: any) {
    console.error('Upload failed:', e)
    error.value = 'فشل رفع الملفات: ' + (e.message || 'خطأ غير معروف')
  } finally {
    uploading.value = false
  }
}

const removeAsset = (index: number) => {
  const newAssets = [...uploadedAssets.value]
  newAssets.splice(index, 1)
  uploadedAssets.value = newAssets
  emit(
    'update:modelValue',
    newAssets.map((a) => a.id)
  )
}

const syncFromProps = async () => {
  if (!props.modelValue || props.modelValue.length === 0) {
    uploadedAssets.value = []
    return
  }

  // If lengths match, assume we are in sync (to avoid infinite cycles)
  if (uploadedAssets.value.length === props.modelValue.length) {
    return
  }

  initializing.value = true
  try {
    const assets: any[] = []
    for (const id of props.modelValue as string[]) {
      const asset = await (window as any).api.files.getById(id)
      if (asset) {
        assets.push({ id: asset.id, name: asset.original_name })
      }
    }
    uploadedAssets.value = assets
  } catch (e) {
    console.error('Failed to sync assets:', e)
  } finally {
    initializing.value = false
  }
}

onMounted(() => {
  syncFromProps()
})

// Deep watch props in case they are cleared externally
watch(
  () => props.modelValue,
  (newVal) => {
    if (!newVal || newVal.length === 0) {
      uploadedAssets.value = []
    } else if (newVal.length !== uploadedAssets.value.length) {
      syncFromProps()
    }
  },
  { deep: true }
)
</script>
