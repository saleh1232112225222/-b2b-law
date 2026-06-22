<template>
  <v-row>
    <v-col cols="12" md="6">
      <v-list class="pa-0">
        <v-list-item>
          <template #prepend
            ><LucideIcon name="landmark" :size="20" class="text-gold me-3"
          /></template>
          <v-list-item-title class="font-weight-black text-visible-high"
            >المحكمة والدائرة</v-list-item-title
          >
          <v-list-item-subtitle class="text-gold"
            >{{ caseItem.court || 'غير محدد' }} -
            {{ caseItem.circuit || 'بدون دائرة' }}</v-list-item-subtitle
          >
        </v-list-item>
        <v-list-item>
          <template #prepend
            ><LucideIcon name="calendar" :size="20" class="text-gold me-3"
          /></template>
          <v-list-item-title class="font-weight-black text-primary">تاريخ القيد</v-list-item-title>
          <v-list-item-subtitle class="text-primary font-weight-bold"
            >{{ caseItem.registration_date }} مـ |
            {{ caseItem.registration_date_hijri }} هـ</v-list-item-subtitle
          >
        </v-list-item>
        <v-divider class="my-4" />
        <div class="text-subtitle-1 font-weight-black mb-4 text-gold px-4">أطراف القضية</div>
        <v-list-item v-for="party in parties" :key="party.id" class="mb-2 glass-card mx-2 border-0">
          <template #prepend>
            <div class="bg-primary-alpha pa-2 rounded-lg me-3">
              <LucideIcon name="user-check" :size="18" class="text-primary" />
            </div>
          </template>
          <v-list-item-title class="font-weight-black text-visible-high text-body-2">
            {{ party.name }}
            <v-chip
              size="x-small"
              color="primary"
              variant="flat"
              class="ms-1 px-2 font-weight-black"
              >{{ party.party_type === 'client' ? 'موكل' : 'خصم' }}</v-chip
            >
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption text-primary font-weight-bold">
            {{ party.role
            }}<span v-if="party.phone" class="ms-2"
              ><LucideIcon name="phone" :size="10" class="me-1" /> {{ party.phone }}</span
            >
          </v-list-item-subtitle>
        </v-list-item>
      </v-list>
    </v-col>
    <v-col cols="12" md="6">
      <v-card elevation="0" class="glass-card pa-6 h-100 glass-card">
        <div class="d-flex justify-space-between align-center mb-6">
          <div class="text-subtitle-1 font-weight-black text-visible-high">حالة القضية الحالية</div>
          <v-chip color="success" size="large" variant="flat" class="font-weight-black">{{
            caseItem.status
          }}</v-chip>
        </div>
        <v-row dense>
          <v-col cols="6">
            <div class="text-caption grey--text mb-1">المرحلة الحالية</div>
            <v-chip size="small" variant="tonal" color="indigo">{{
              caseItem.phase || 'غير محددة'
            }}</v-chip>
          </v-col>
          <v-col cols="6">
            <div class="text-caption grey--text mb-1">صفة الموكل</div>
            <v-chip size="small" variant="tonal" color="teal">{{
              caseItem.client_role || 'غير محددة'
            }}</v-chip>
          </v-col>
        </v-row>
        <v-divider class="my-3" />
        <div v-if="caseItem.assessment" class="mb-3">
          <div class="text-caption font-weight-bold primary--text mb-1">
            التقييم الفني لحالة القضية
          </div>
          <div class="text-body-2 bg-white pa-2 rounded border-s-lg border-primary">
            {{ caseItem.assessment }}
          </div>
        </div>
        <div v-if="caseItem.plaintiff_requests" class="mb-3">
          <div class="text-caption font-weight-bold blue--text mb-1">طلب المدعي</div>
          <div class="text-body-2 bg-blue-lighten-5 pa-2 rounded border-s-lg border-blue">
            {{ caseItem.plaintiff_requests }}
          </div>
        </div>
        <div v-if="caseItem.client_requirement">
          <div class="text-caption font-weight-bold orange--text mb-1">المطلوب من الموكل</div>
          <div class="text-body-2 bg-orange-lighten-5 pa-2 rounded border-s-lg border-orange">
            {{ caseItem.client_requirement }}
          </div>
        </div>
        <div v-if="caseItem.notes" class="mt-3">
          <div class="text-caption font-weight-bold grey--text mb-1">ملاحظات عامة</div>
          <div class="text-body-2 bg-grey-lighten-4 pa-2 rounded border-s-lg border-grey">
            {{ caseItem.notes }}
          </div>
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import LucideIcon from '../../components/common/LucideIcon.vue'

defineProps<{
  caseItem: any
  parties: any[]
}>()
</script>
