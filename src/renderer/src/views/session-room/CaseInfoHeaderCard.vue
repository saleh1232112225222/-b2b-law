<template>
  <v-card
    class="rounded-xl overflow-hidden mb-4 glass-card shadow-premium border glass-card"
    elevation="0"
  >
    <div class="px-6 py-4 d-flex justify-space-between align-center glass-card-noir border-b">
      <div style="min-width: 0">
        <div class="d-flex align-center ga-3">
          <v-btn
            variant="tonal"
            color="accent"
            size="small"
            class="rounded-lg font-weight-black shadow-sm premium-btn-gold-gradient"
            @click="$emit('show-poa')"
          >
            <LucideIcon name="book-user" :size="16" class="me-2" /> معاينة الوكالة
          </v-btn>
          <div class="text-h6 font-weight-black text-primary text-truncate">
            الموكل: {{ header.clientName || '—' }}
          </div>
          <v-btn
            variant="tonal"
            color="primary"
            size="x-small"
            class="rounded-lg font-weight-black px-3 premium-btn-gold-gradient"
            height="28"
            :disabled="!hasClient"
            @click="$emit('go-to-client')"
          >
            <LucideIcon name="external-link" :size="14" class="me-1" /> معاينة
          </v-btn>
          <v-btn
            v-tooltip="'نسخ الاسم'"
            icon
            size="x-small"
            variant="text"
            color="primary"
            class="rounded-lg opacity-60 premium-btn-gold-gradient"
            :disabled="!header.clientName"
            @click="$emit('copy', header.clientName)"
          >
            <LucideIcon name="copy" :size="14" />
          </v-btn>
        </div>
        <div class="d-flex align-center flex-wrap ga-3 mt-2">
          <v-chip
            color="primary"
            variant="tonal"
            size="small"
            class="font-weight-black bg-primary-alpha"
          >
            <LucideIcon name="users" :size="14" class="me-2" /> الخصم:
            {{ header.opponentName || '—' }}
            <LucideIcon
              v-if="header.opponentName"
              name="copy"
              :size="12"
              class="ms-2 cursor-pointer opacity-70 hover-opacity-100"
              @click.stop="$emit('copy', header.opponentName)"
            />
          </v-chip>
          <v-chip
            color="accent"
            variant="tonal"
            size="small"
            class="font-weight-black bg-accent-alpha"
          >
            <LucideIcon name="hash" :size="14" class="me-2" /> رقم القضية:
            {{ header.caseNumber || '—' }}
            <LucideIcon
              v-if="header.caseNumber"
              name="copy"
              :size="12"
              class="ms-2 cursor-pointer opacity-70 hover-opacity-100"
              @click.stop="$emit('copy', header.caseNumber)"
            />
          </v-chip>
          <v-chip color="info" variant="tonal" size="small" class="font-weight-black bg-info-alpha">
            <LucideIcon name="file-badge" :size="14" class="me-2" /> الوكالة:
            {{ header.agencyNumber || '—' }}
            <LucideIcon
              v-if="header.agencyNumber"
              name="copy"
              :size="12"
              class="ms-2 cursor-pointer opacity-70 hover-opacity-100"
              @click.stop="$emit('copy', header.agencyNumber)"
            />
          </v-chip>
          <v-chip
            v-if="header.agencyExpiry"
            color="error"
            variant="flat"
            size="small"
            class="font-weight-black shadow-sm"
          >
            <LucideIcon name="calendar-off" :size="14" class="me-2" /> تنتهي:
            {{ header.agencyExpiry }}
          </v-chip>
        </div>
      </div>
      <div class="d-flex align-center ga-3">
        <v-btn
          color="primary"
          variant="flat"
          class="rounded-xl font-weight-black shadow-premium px-6 session-room-btn-zr1 premium-btn-gold-gradient"
          height="56"
          :disabled="!header.najizUrl"
          @click="$emit('copy', header.najizUrl)"
        >
          <LucideIcon name="link-2" :size="18" class="me-2" /> نسخ رابط ناجز
        </v-btn>
        <v-btn
          variant="tonal"
          color="success"
          class="rounded-xl shadow-premium px-6 font-weight-black session-room-btn-zr1 premium-btn-gold-gradient"
          height="56"
          :disabled="!header.najizUrl"
          @click="$emit('open-external', header.najizUrl)"
        >
          <v-img src="../assets/najiz-logo.png" width="24" height="24" class="me-2" /> فتح ناجز
        </v-btn>
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'
defineProps<{ header: any; hasClient: boolean }>()
defineEmits<{
  'show-poa': []
  'go-to-client': []
  copy: [text: string]
  'open-external': [url: string]
}>()
</script>
