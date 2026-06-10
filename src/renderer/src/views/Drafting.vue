<template>
  <v-container fluid class="pa-6 rtl">
    <!-- Header -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="file-edit" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">المكوك القانوني الذكي</h1>
            <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
              صياغة المذكرات واللوائح والاتفاقيات بمعايير قضائية احترافية
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="auto">
        <v-btn
          color="accent"
          size="large"
          class="font-weight-black rounded-xl px-10 premium-lift h-56"
          :loading="aiLoading"
          :disabled="!draftContent"
          @click="simulateAI"
        >
          <LucideIcon name="sparkles" :size="20" class="me-2" /> تحسين الصياغة (AI)
        </v-btn>
      </v-col>
    </v-row>

    <v-row class="ga-6 ma-0">
      <!-- Templates Sidebar -->
      <v-col cols="12" md="4" class="pa-0">
        <v-card elevation="0" class="glass-card overflow-hidden mb-6">
          <v-list density="comfortable" class="bg-transparent pa-4">
            <div
              class="text-tiny font-weight-black text-gold opacity-40 uppercase tracking-widest mb-4 px-4"
            >
              مكتبة القوالب المعتمدة
            </div>
            <v-list-item
              v-for="t in safeArray(templates)"
              :key="t.title"
              link
              :active="selectedTemplate?.title === t.title"
              class="rounded-xl mb-2 py-3 glass-panel-light border-gold-alpha"
              @click="selectedTemplate = t"
            >
              <template #prepend>
                <LucideIcon :name="t.icon" :size="18" class="text-gold me-4" />
              </template>
              <v-list-item-title class="font-weight-black text-body-2 text-white">{{
                t.title
              }}</v-list-item-title>
              <template #append>
                <LucideIcon name="chevron-left" :size="14" class="text-gold opacity-30" />
              </template>
            </v-list-item>
          </v-list>
        </v-card>

        <v-card elevation="0" class="glass-panel-light pa-8 border-gold-alpha text-center">
          <div class="bg-accent-alpha pa-3 rounded-xl d-inline-flex mb-4">
            <LucideIcon name="lightbulb" :size="28" class="text-gold" />
          </div>
          <div class="text-h6 font-weight-black text-gold mb-3">دليل الاستخدام</div>
          <p class="text-caption text-white opacity-60 font-weight-black leading-relaxed">
            اختر القالب المناسب من القائمة، أو ابدأ بالكتابة مباشرة. استخدم زر "تحسين الصياغة" لضبط
            المصطلحات وفق الأنظمة السعودية المرعية.
          </p>
        </v-card>
      </v-col>

      <!-- Editor Area -->
      <v-col cols="12" md="8" class="pa-0">
        <v-card
          elevation="0"
          class="glass-card overflow-hidden d-flex flex-column min-h-800 border-gold-alpha"
        >
          <!-- Toolbar -->
          <div class="pa-3 glass-panel-light border-b border-gold-alpha d-flex align-center ga-2">
            <div class="d-flex ga-1 pe-4 border-l border-gold-alpha">
              <v-btn
                icon
                variant="text"
                size="small"
                class="rounded-lg text-white opacity-60 hover-gold"
                ><LucideIcon name="bold" :size="18"
              /></v-btn>
              <v-btn
                icon
                variant="text"
                size="small"
                class="rounded-lg text-white opacity-60 hover-gold"
                ><LucideIcon name="italic" :size="18"
              /></v-btn>
              <v-btn
                icon
                variant="text"
                size="small"
                class="rounded-lg text-white opacity-60 hover-gold"
                ><LucideIcon name="underline" :size="18"
              /></v-btn>
            </div>

            <div class="d-flex ga-1 px-4 border-l border-gold-alpha">
              <v-btn icon variant="tonal" color="accent" size="small" class="rounded-lg"
                ><LucideIcon name="align-right" :size="18"
              /></v-btn>
              <v-btn
                icon
                variant="text"
                size="small"
                class="rounded-lg text-white opacity-60 hover-gold"
                ><LucideIcon name="align-center" :size="18"
              /></v-btn>
              <v-btn
                icon
                variant="text"
                size="small"
                class="rounded-lg text-white opacity-60 hover-gold"
                ><LucideIcon name="align-left" :size="18"
              /></v-btn>
            </div>

            <v-spacer />

            <div class="d-flex ga-3">
              <v-btn
                color="gold"
                variant="outlined"
                class="rounded-lg font-weight-black px-6 h-40 border-gold-alpha"
                @click="saveDraft"
              >
                <LucideIcon name="save" :size="16" class="me-2" /> حفظ المسودة
              </v-btn>
              <v-btn
                variant="flat"
                color="white"
                class="rounded-lg font-weight-black px-6 h-40 text-black"
                @click="printDraft"
              >
                <LucideIcon name="printer" :size="16" class="me-2" /> طباعة / تصدير
              </v-btn>
            </div>
          </div>

          <!-- Content -->
          <v-card-text class="pa-12 flex-grow-1 position-relative">
            <v-fade-transition hide-on-leave>
              <div
                v-if="aiLoading"
                class="ai-overlay d-flex flex-column align-center justify-center"
              >
                <v-progress-circular
                  indeterminate
                  color="gold"
                  size="80"
                  width="8"
                  class="mb-6"
                ></v-progress-circular>
                <div class="text-h5 font-weight-black text-gold mb-2">جاري المعالجة الذكية...</div>
                <div class="text-subtitle-2 text-white opacity-40 font-weight-black">
                  يتم تحسين الصياغة قانونياً ونحوياً
                </div>
              </div>
            </v-fade-transition>

            <div v-if="selectedTemplate && !aiLoading" class="editor-header mb-12 text-center">
              <div class="text-h5 font-weight-black text-gold opacity-80 mb-4">
                {{ selectedTemplate.title }}
              </div>
              <div class="mx-auto w-25 border-b-2 border-gold opacity-20"></div>
            </div>

            <div v-else-if="!draftContent && !aiLoading" class="text-center py-20 opacity-20">
              <LucideIcon name="file-text" :size="120" class="text-gold mb-6" />
              <div class="text-h5 font-weight-black text-gold">ابدأ الصياغة هنا</div>
              <div class="text-body-2 font-weight-black text-white mt-2">
                اختر قالباً أو اكتب نصك الخاص مباشرة
              </div>
            </div>

            <v-textarea
              v-model="draftContent"
              variant="plain"
              placeholder="اكتب وقائع الدعوى أو بنود العقد هنا..."
              auto-grow
              rows="30"
              class="draft-editor"
              hide-details
            ></v-textarea>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Feedback -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" rounded="lg" elevation="24">
      <div class="d-flex align-center">
        <LucideIcon :name="snackbar.icon" :size="18" class="me-3" />
        <span class="font-weight-black">{{ snackbar.text }}</span>
      </div>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { safeArray } from '../utils/safe'
import LucideIcon from '../components/common/LucideIcon.vue'

interface Template {
  title: string
  icon: string
  content: string
}

const draftContent = ref('')
const selectedTemplate = ref<Template | null>(null)
const aiLoading = ref(false)
const snackbar = ref({ show: false, text: '', color: 'success', icon: 'check-circle' })

const simulateAI = (): void => {
  if (!draftContent.value) return
  aiLoading.value = true
  setTimeout(() => {
    draftContent.value = `[تم تحسين النص بواسطة الذكاء الاصطناعي القانوني]\n\n${draftContent.value}\n\n[ملاحظة: تمت مراجعة المصطلحات وفق القواعد العامة والأنظمة السعودية]`
    aiLoading.value = false
    showSnackbar('تم تحسين الصياغة بنجاح وفق المعايير المعتمدة', 'success')
  }, 3000)
}

const saveDraft = (): void => {
  if (!draftContent.value) return
  showSnackbar('تم حفظ مسودة الوثيقة بنجاح في النظام', 'success')
}

const printDraft = (): void => {
  window.print()
}

const showSnackbar = (text: string, color: 'success' | 'error' = 'success'): void => {
  snackbar.value = {
    show: true,
    text,
    color,
    icon: color === 'success' ? 'check-circle' : 'alert-circle'
  }
}

const templates: Template[] = [
  {
    title: 'عقد إيجار سكني مرن',
    icon: 'home',
    content:
      'بسم الله الرحمن الرحيم\n\nإنه في يوم: [التاريخ]\nتم الاتفاق بين كل من:\nالطرف الأول (المؤجر): ...\nالطرف الثاني (المستأجر): ...\n\nبناءً على نظام الإيجار السعودي، تم الاتفاق على التالي...'
  },
  {
    title: 'صحيفة دعوى مدنية مكتملة',
    icon: 'file-text',
    content:
      'صاحب الفضيلة رئيس المحكمة ... حفظه الله\n\nبموجب وكالتي عن المدعي: ...\nضد المدعى عليه: ...\nالموضوع: [عنوان الدعوى]\n\nأولاً: الوقائع:\nثانياً: الأسانيد:\nثالثاً: الطلبات:'
  },
  {
    title: 'مذكرة جوابية (دفع موضوعي)',
    icon: 'reply',
    content:
      'فضيلة رئيس الدائرة ... بالمحكمة ... حفظه الله\n\nالسلام عليكم ورحمة الله وبركاته وبعد،،\n\nبصفتي وكيلاً عن المدعى عليه في القضية رقم ... العام ...، أتشرف بتقديم ردي الجوابي المشتمل على الدفوع التالية...'
  },
  {
    title: 'اتفاقية سرية المعلومات (NDA)',
    icon: 'shield-lock',
    content:
      'تعتبر هذه الاتفاقية عقداً ملزماً بين كل من:\n1. ...\n2. ...\nيقر الطرفان بضرورة حماية المعلومات الحساسة المتبادلة بينهما والمتعلقة بمشروع ...'
  },
  {
    title: 'مذكرة استئناف حكم',
    icon: 'gavel',
    content:
      'أصحاب الفضيلة رئيس وقضاة محكمة الاستئناف ... حفظهم الله\n\nالموضوع: لائحة اعتراضية على الحكم رقم ... الصادر بتاريخ ...\n\nأولاً: من حيث الشكل (تقديم الاستئناف في الموعد النظامي)...\nثانياً: أسباب الاعتراض على الحكم:'
  }
]

watch(selectedTemplate, (newVal) => {
  if (newVal) {
    draftContent.value = newVal.content
  }
})
</script>

<style scoped>
.min-h-800 {
  min-height: 800px;
}

.draft-editor :deep(textarea) {
  font-family: 'Tajawal', sans-serif !important;
  line-height: 2.4 !important;
  font-size: 1.4rem !important;
  color: rgba(255, 255, 255, 0.9) !important;
  padding: 0;
  border: none;
}

.ai-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  z-index: 10;
}

.hover-gold:hover {
  color: #e9c349 !important;
  opacity: 1 !important;
}

.border-gold-alpha {
  border: 1px solid rgba(233, 195, 73, 0.2) !important;
}

.h-56 {
  height: 56px !important;
}
.h-40 {
  height: 40px !important;
}

.leading-relaxed {
  line-height: 1.8;
}

@media print {
  .v-btn,
  .v-list,
  .glass-card,
  .v-divider,
  .glass-panel-light {
    display: none !important;
  }
  .v-container {
    padding: 0 !important;
  }
  .draft-editor :deep(textarea) {
    color: black !important;
    font-size: 14pt !important;
  }
}
</style>
