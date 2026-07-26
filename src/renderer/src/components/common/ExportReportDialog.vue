<template>
  <v-dialog v-model="show" max-width="540" persistent class="rtl">
    <v-card class="glass-card pa-6 rounded-2xl border-gold border-2 overflow-hidden shadow-2xl">
      <!-- Dialog Header -->
      <div class="d-flex align-center justify-space-between mb-6 pb-4 border-b border-gold-alpha">
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-3 rounded-xl me-4">
            <LucideIcon name="download-cloud" :size="28" class="text-gold" />
          </div>
          <div>
            <h3 class="text-h6 font-weight-black text-gold mb-1">تصدير وحفظ التقرير</h3>
            <p class="text-caption text-medium-contrast mb-0">
              اختر اسم الملف، الصيغة، ومكان الحفظ المناسب لجهازك
            </p>
          </div>
        </div>
        <v-btn icon variant="text" color="gold" size="small" @click="close">
          <LucideIcon name="x" :size="20" />
        </v-btn>
      </div>

      <v-form @submit.prevent="handleConfirmExport">
        <!-- Filename Input -->
        <div class="mb-5">
          <label class="text-caption font-weight-black text-gold d-block mb-2">
            اسم الملف المراد حفظه:
          </label>
          <v-text-field
            v-model="filename"
            variant="outlined"
            density="comfortable"
            class="glass-input font-weight-bold"
            hide-details
            placeholder="أدخل اسم الملف..."
          >
            <template #prepend-inner>
              <LucideIcon name="file-text" :size="20" class="text-gold me-2" />
            </template>
            <template #append-inner>
              <span class="text-caption text-gold opacity-60 font-mono">{{ extensionLabel }}</span>
            </template>
          </v-text-field>
        </div>

        <!-- Format Selection -->
        <div class="mb-6">
          <label class="text-caption font-weight-black text-gold d-block mb-2">
            صيغة الملف المستهدف:
          </label>
          <v-row dense>
            <v-col cols="4">
              <v-card
                elevation="0"
                class="pa-3 text-center rounded-xl cursor-pointer transition-all border"
                :class="
                  format === 'pdf'
                    ? 'border-gold bg-gold-alpha'
                    : 'border-gold-alpha glass-panel-light'
                "
                @click="format = 'pdf'"
              >
                <LucideIcon
                  name="file-text"
                  :size="24"
                  :class="format === 'pdf' ? 'text-gold' : 'text-medium-contrast'"
                  class="mb-1 mx-auto"
                />
                <div
                  class="text-caption font-weight-black"
                  :class="format === 'pdf' ? 'text-gold' : 'text-high-contrast'"
                >
                  PDF
                </div>
              </v-card>
            </v-col>
            <v-col cols="4">
              <v-card
                elevation="0"
                class="pa-3 text-center rounded-xl cursor-pointer transition-all border"
                :class="
                  format === 'csv'
                    ? 'border-gold bg-gold-alpha'
                    : 'border-gold-alpha glass-panel-light'
                "
                @click="format = 'csv'"
              >
                <LucideIcon
                  name="file-spreadsheet"
                  :size="24"
                  :class="format === 'csv' ? 'text-gold' : 'text-medium-contrast'"
                  class="mb-1 mx-auto"
                />
                <div
                  class="text-caption font-weight-black"
                  :class="format === 'csv' ? 'text-gold' : 'text-high-contrast'"
                >
                  CSV (إكسل)
                </div>
              </v-card>
            </v-col>
            <v-col cols="4">
              <v-card
                elevation="0"
                class="pa-3 text-center rounded-xl cursor-pointer transition-all border"
                :class="
                  format === 'html'
                    ? 'border-gold bg-gold-alpha'
                    : 'border-gold-alpha glass-panel-light'
                "
                @click="format = 'html'"
              >
                <LucideIcon
                  name="printer"
                  :size="24"
                  :class="format === 'html' ? 'text-gold' : 'text-medium-contrast'"
                  class="mb-1 mx-auto"
                />
                <div
                  class="text-caption font-weight-black"
                  :class="format === 'html' ? 'text-gold' : 'text-high-contrast'"
                >
                  طباعة / HTML
                </div>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- Notification Banner -->
        <v-alert
          v-if="exportError"
          type="error"
          variant="flat"
          class="mb-4 rounded-xl font-weight-bold text-caption"
        >
          {{ exportError }}
        </v-alert>

        <!-- Device / Mobile Info Alert -->
        <div
          class="pa-3 rounded-xl glass-panel-light border border-gold-alpha mb-6 d-flex align-center"
        >
          <LucideIcon name="info" :size="18" class="text-gold me-3 flex-shrink-0" />
          <div class="text-caption text-medium-contrast">
            <span v-if="isMobile">سيتم فتح خيارات حفظ أو مشاركة الملف مباشرة على جوالك.</span>
            <span v-else>سيتم حفظ الملف باسمك المفضل في مجلد التنزيلات الخاص بك.</span>
          </div>
        </div>

        <!-- Dialog Actions -->
        <div class="d-flex justify-end gap-3">
          <v-btn
            variant="outlined"
            color="gold"
            height="48"
            class="rounded-xl px-6 font-weight-black"
            @click="close"
          >
            إلغاء
          </v-btn>
          <v-btn
            type="submit"
            color="accent"
            height="48"
            class="rounded-xl px-8 font-weight-black text-ebony premium-btn-gold-gradient shadow-lg"
            :loading="exporting"
          >
            <LucideIcon name="hard-drive-download" :size="20" class="me-2" />
            حفظ وتنزيل الملف
          </v-btn>
        </div>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import LucideIcon from './LucideIcon.vue'
import { safeLength } from '../../utils/safe'

const props = defineProps<{
  modelValue: boolean
  reportTitle: string
  defaultFilename: string
  reportType: string
  rowsData?: any[]
  exportParams?: Record<string, any>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'exported', payload: { filename: string; format: string }): void
}>()

const show = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
})

const filename = ref('')
const format = ref<'pdf' | 'csv' | 'html'>('pdf')
const exporting = ref(false)
const exportError = ref('')

const isMobile = computed(() => {
  if (typeof window === 'undefined') return false
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth < 768
  )
})

const extensionLabel = computed(() => {
  if (format.value === 'pdf') return '.pdf'
  if (format.value === 'csv') return '.csv'
  return '.html'
})

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      const today = new Date().toISOString().slice(0, 10)
      filename.value = props.defaultFilename
        ? `${props.defaultFilename}_${today}`
        : `تقرير_${today}`
      format.value = 'pdf'
      exportError.value = ''
    }
  }
)

const close = () => {
  show.value = false
}

const handleConfirmExport = async () => {
  if (!filename.value.trim()) {
    exportError.value = 'يرجى إدخال اسم الملف المراد حفظه'
    return
  }

  exporting.value = true
  exportError.value = ''

  try {
    const finalFilename = filename.value.trim().endsWith(extensionLabel.value)
      ? filename.value.trim()
      : `${filename.value.trim()}${extensionLabel.value}`

    if (format.value === 'csv') {
      const rows = props.rowsData || []
      if (safeLength(rows) === 0) {
        exportError.value = 'لا توجد بيانات متاحة للتصدير'
        exporting.value = false
        return
      }
      const res = await (window as any).api.reports.exportCsv(finalFilename, rows)
      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' })
      downloadBlob(blob, finalFilename)
    } else if (format.value === 'pdf') {
      // ApiAdapter already handles blob download for cloud mode
      await (window as any).api.reports.exportPdf({
        type: props.reportType,
        filename: finalFilename,
        params: props.exportParams || {}
      })
    } else if (format.value === 'html') {
      // ApiAdapter already handles blob download for cloud mode
      await (window as any).api.reports.exportHtml({
        type: props.reportType,
        filename: finalFilename,
        params: props.exportParams || {}
      })
    }

    emit('exported', { filename: finalFilename, format: format.value })
    close()
  } catch (err: any) {
    exportError.value = err?.message || 'حدث خطأ أثناء تنزيل الملف'
  } finally {
    exporting.value = false
  }
}

const downloadBlob = async (blob: Blob, name: string) => {
  const ext = name.endsWith('.csv') ? '.csv' : name.endsWith('.pdf') ? '.pdf' : '.html'
  const mime =
    ext === '.csv' ? 'text/csv;charset=utf-8;' : ext === '.pdf' ? 'application/pdf' : 'text/html'

  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: name,
        types: [
          {
            description: ext === '.csv' ? 'ملف CSV (إكسل)' : 'ملف تقرير',
            accept: { [mime]: [ext] }
          }
        ]
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (err: any) {
      if (err.name === 'AbortError') return
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>
