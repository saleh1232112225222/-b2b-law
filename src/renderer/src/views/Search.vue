<template>
  <v-container fluid class="pa-6 rtl">
    <v-row class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="search" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-visible-high mb-1">البحث الشامل</h1>
            <p class="text-subtitle-1 text-visible-medium font-weight-black">
              ابحث في الموكلين، القضايا، والمستندات
            </p>
          </div>
        </div>
      </v-col>
    </v-row>

    <v-card elevation="0" class="glass-card pa-6 mb-10">
      <v-text-field
        v-model="searchQuery"
        placeholder="اكتب ما تبحث عنه هنا (رقم قضية، اسم موكل، محتوى مذكرة)..."
        variant="outlined"
        hide-details
        clearable
        class="glass-input text-h6"
        :loading="loading"
        @update:model-value="performSearch"
      >
        <template #prepend-inner>
          <LucideIcon name="search" :size="24" class="text-gold opacity-50" />
        </template>
        <template #loader>
          <v-progress-linear indeterminate color="accent" height="2"></v-progress-linear>
        </template>
      </v-text-field>
    </v-card>

    <v-row v-if="safeLength(results) > 0" class="results-grid">
      <v-col v-for="res in safeArray(results)" :key="res.id" cols="12" md="6" lg="4">
        <v-card
          elevation="0"
          class="glass-card pa-5 premium-lift border-gold-alpha cursor-pointer h-100"
          :to="getRoute(res)"
        >
          <div class="d-flex align-center">
            <div
              class="glass-panel-light pa-3 rounded-lg me-4"
              :class="'bg-' + getTypeColor(String(res.type)) + '-alpha'"
            >
              <LucideIcon
                :name="getTypeIcon(String(res.type))"
                :size="24"
                :class="'text-' + getTypeColor(String(res.type))"
              />
            </div>
            <div class="overflow-hidden flex-grow-1">
              <div class="text-h6 font-weight-black text-visible-high text-truncate mb-1">
                {{ valWithDefault(res.title, 'بدون عنوان') }}
              </div>
              <div class="text-body-2 text-visible-high text-truncate font-weight-black">
                {{ valWithDefault(res.subtitle, 'لا يوجد تفاصيل إضافية') }}
              </div>
            </div>
            <v-chip size="x-small" color="gold" variant="tonal" class="font-weight-black ms-2">
              {{ getTypeName(String(res.type)) }}
            </v-chip>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <div
      v-else-if="searchQuery && !loading"
      class="text-center pa-15 d-flex flex-column align-center"
    >
      <div class="glass-panel-light pa-8 rounded-full mb-6 border-gold-alpha">
        <LucideIcon name="search-slash" :size="64" class="text-gold opacity-30" />
      </div>
      <div class="text-h5 font-weight-black text-visible-high">لا توجد نتائج مطابقة لبحثك</div>
      <p class="text-body-1 text-visible-medium mt-2">
        جرب البحث بكلمات دلالية أخرى أو التأكد من رقم القيد
      </p>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { safeArray, safeLength, valWithDefault } from '../utils/safe'
import LucideIcon from '../components/common/LucideIcon.vue'

const searchQuery = ref('')
const results = ref<any[]>([])
const loading = ref(false)

const performSearch = async (): Promise<void> => {
  if (!searchQuery.value) {
    results.value = []
    return
  }
  loading.value = true
  try {
    results.value = await (window as any).api.search.query(searchQuery.value)
  } catch (err: unknown) {
    console.error('Search error:', err)
  } finally {
    loading.value = false
  }
}

const getTypeColor = (type: string): string =>
  (({ client: 'accent', case: 'gold', document: 'success' }) as Record<string, string>)[type] ||
  'gold'

const getTypeIcon = (type: string): string =>
  (({ client: 'user', case: 'gavel', document: 'file-text' }) as Record<string, string>)[type] ||
  'help-circle'

const getTypeName = (type: string): string =>
  (({ client: 'موكل', case: 'قضية', document: 'مستند' }) as Record<string, string>)[type] || ''

const getRoute = (res: any): string =>
  res.type === 'case' ? `/cases/${res.id}` : res.type === 'client' ? '/clients' : '/documents'
</script>

<style scoped>
.results-grid {
  animation: fadeUp 0.5s ease-out;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bg-accent-alpha {
  background: rgba(var(--v-theme-accent), 0.1) !important;
}
.bg-gold-alpha {
  background: rgba(var(--v-theme-gold), 0.1) !important;
}
.bg-success-alpha {
  background: rgba(var(--v-theme-success), 0.1) !important;
}

.text-accent {
  color: #8a7322 !important;
} /* Standard gold variant */
.text-gold {
  color: #e9c349 !important;
}
.text-success {
  color: #4caf50 !important;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
