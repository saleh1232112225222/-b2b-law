<template>
  <v-container v-if="!isEnabled" fluid class="pa-6 pb-12 rtl text-center">
    <v-row justify="center" class="mt-12">
      <v-col cols="12" md="6">
        <v-card class="glass-card pa-8 border-gold">
          <LucideIcon name="shield-alert" :size="64" class="text-error mb-4" />
          <h2 class="text-h5 font-weight-black text-gold mb-2">الميزة غير مفعلة</h2>
          <p class="text-subtitle-1 text-gold opacity-70 mb-6">
            قسم الخدمات القانونية معطل حالياً من إعدادات النظام.
          </p>
          <v-btn color="accent" class="rounded-lg font-weight-black" to="/dashboard">
            العودة للوحة التحكم
          </v-btn>
        </v-card>
      </v-col>
    </v-row>
  </v-container>

  <v-container v-else fluid class="pa-6 pb-12 rtl">
    <!-- Header -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="scale" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">
              مركز الخدمات والارتباطات القانونية
            </h1>
            <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
              إدارة وتتبع الاستشارات، عقود التأسيس، أعمال التوثيق، وكافة الخدمات القانونية
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="auto">
        <v-btn
          color="accent"
          size="large"
          class="font-weight-black rounded-lg px-8 premium-lift h-100"
          :disabled="!can('create_legal_services')"
          @click="openCreate()"
        >
          <LucideIcon name="plus" :size="20" class="me-3" /> تسجيل خدمة جديدة
        </v-btn>
      </v-col>
    </v-row>

    <!-- ERP Stats Summary -->
    <v-row class="mb-8" dense>
      <v-col cols="12" sm="6" md="3">
        <v-card
          elevation="0"
          class="glass-card pa-6 position-relative overflow-hidden border-gold-alpha rounded-xl"
        >
          <div class="d-flex align-center">
            <div class="glass-panel-light pa-3 rounded-lg me-4">
              <LucideIcon name="scale" :size="24" class="text-accent" />
            </div>
            <div>
              <div class="text-tiny font-weight-black text-white mb-1">إجمالي الخدمات</div>
              <div class="text-h5 font-weight-black text-gold">{{ store.total }}</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card
          elevation="0"
          class="glass-card pa-6 position-relative overflow-hidden border-gold-alpha rounded-xl"
        >
          <div class="d-flex align-center">
            <div class="glass-panel-light pa-3 rounded-lg me-4">
              <LucideIcon name="clock" :size="24" class="text-accent" />
            </div>
            <div>
              <div class="text-tiny font-weight-black text-white mb-1">قيد العمل</div>
              <div class="text-h5 font-weight-black text-gold">{{ inProgressCount }}</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card
          elevation="0"
          class="glass-card pa-6 position-relative overflow-hidden border-gold-alpha rounded-xl"
        >
          <div class="d-flex align-center">
            <div class="glass-panel-light pa-3 rounded-lg me-4">
              <LucideIcon name="check-circle" :size="24" class="text-accent" />
            </div>
            <div>
              <div class="text-tiny font-weight-black text-white mb-1">منجزة</div>
              <div class="text-h5 font-weight-black text-gold">{{ completedCount }}</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card
          elevation="0"
          class="glass-card pa-6 position-relative overflow-hidden border-gold-alpha rounded-xl"
        >
          <div class="d-flex align-center">
            <div class="glass-panel-light pa-3 rounded-lg me-4">
              <LucideIcon name="banknote" :size="24" class="text-accent" />
            </div>
            <div>
              <div class="text-tiny font-weight-black text-white mb-1">المستحقات المعلقة</div>
              <div class="text-h5 font-weight-black text-gold">
                {{ formatCurrency(totalRemainingFees) }}
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Search & Filters -->
    <v-card elevation="0" class="glass-card mb-8 pa-6 border-gold-alpha rounded-xl">
      <v-row dense align="center">
        <v-col cols="12" md="4">
          <v-text-field
            v-model="search"
            placeholder="البحث بالرقم، اسم الخدمة، الموكل أو الملاحظات..."
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
          >
            <template #prepend-inner>
              <LucideIcon name="search" :size="20" class="text-gold opacity-50" />
            </template>
          </v-text-field>
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            v-model="store.filterCategory"
            label="تصفية حسب التصنيف"
            :items="['الكل', ...categoryOptions]"
            variant="outlined"
            density="comfortable"
            hide-details
            @update:model-value="onFilterChange"
          ></v-select>
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            v-model="store.filterStatus"
            label="تصفية حسب الحالة"
            :items="['الكل', ...statusOptions]"
            variant="outlined"
            density="comfortable"
            hide-details
            @update:model-value="onFilterChange"
          ></v-select>
        </v-col>
        <v-spacer />
        <v-col cols="auto">
          <v-btn
            variant="text"
            color="gold"
            class="rounded-lg opacity-70"
            :loading="store.loading"
            @click="loadData()"
          >
            <LucideIcon name="refresh-cw" :size="20" class="me-2" />
            <span class="font-weight-black">تحديث البيانات</span>
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <!-- Data Table -->
    <v-card elevation="0" class="glass-card overflow-hidden border-gold-alpha rounded-xl">
      <v-table hover class="bg-transparent premium-table">
        <thead>
          <tr>
            <th class="text-right text-gold opacity-70 font-weight-black">الخدمة والرقم</th>
            <th class="text-right text-gold opacity-70 font-weight-black">التصنيف</th>
            <th class="text-right text-gold opacity-70 font-weight-black">العميل</th>
            <th class="text-right text-gold opacity-70 font-weight-black">المسؤول</th>
            <th class="text-right text-gold opacity-70 font-weight-black">المالي والمتبقي</th>
            <th class="text-right text-gold opacity-70 font-weight-black">الحالة</th>
            <th class="text-right text-gold opacity-70 font-weight-black">الأولوية</th>
            <th class="text-left text-gold opacity-70 font-weight-black">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="store.services.length === 0">
            <td colspan="8" class="text-center py-12 text-gold opacity-40 font-weight-black">
              <div class="d-flex flex-column align-center">
                <LucideIcon name="scale" :size="48" class="mb-4 opacity-20" />
                لا توجد خدمات قانونية مسجلة مطابقة للبحث
              </div>
            </td>
          </tr>
          <tr v-for="item in store.services" :key="item.id" class="premium-hover-row">
            <td class="text-right py-4">
              <div class="font-weight-black mb-1">{{ item.service_type_name }}</div>
              <div class="text-tiny text-gold opacity-40 font-mono">
                REF: {{ item.engagement_number }}
              </div>
            </td>
            <td class="text-right opacity-80 font-weight-black">
              {{ item.category_name }}
            </td>
            <td class="text-right opacity-80 font-weight-black">
              {{ item.client_name || '-' }}
            </td>
            <td class="text-right opacity-80 font-weight-black">
              {{ item.responsible_name || '-' }}
            </td>
            <td class="text-right py-3">
              <div class="text-accent font-weight-black">
                {{ formatCurrency(item.financial_compensation || 0) }}
              </div>
              <div class="text-tiny text-error font-weight-bold">
                متبقي: {{ formatCurrency(item.remaining_amount || 0) }}
              </div>
            </td>
            <td class="text-right">
              <v-chip
                size="x-small"
                :color="getStatusColor(item.status_id)"
                variant="flat"
                class="font-weight-black"
              >
                {{ item.status_name }}
              </v-chip>
            </td>
            <td class="text-right">
              <v-chip
                size="x-small"
                :color="getPriorityColor(item.priority_id)"
                variant="tonal"
                class="font-weight-black"
              >
                {{ item.priority_name }}
              </v-chip>
            </td>
            <td class="text-left">
              <div class="d-flex ga-1">
                <v-btn icon variant="text" color="accent" size="small" @click="openDetails(item)">
                  <LucideIcon name="eye" :size="16" />
                </v-btn>
                <v-btn
                  icon
                  variant="text"
                  color="gold"
                  size="small"
                  :disabled="!can('edit_legal_services')"
                  @click="openEdit(item)"
                >
                  <LucideIcon name="pencil" :size="16" />
                </v-btn>
                <v-btn
                  icon
                  variant="text"
                  color="error"
                  size="small"
                  :disabled="!can('delete_legal_services')"
                  @click="confirmDelete(item)"
                >
                  <LucideIcon name="trash-2" :size="16" />
                </v-btn>
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>

      <!-- Pagination Footer -->
      <v-divider class="border-gold opacity-10" />
      <div class="d-flex align-center justify-space-between pa-4 bg-transparent">
        <span class="text-caption text-gold opacity-60"> إجمالي السجلات: {{ store.total }} </span>
        <div class="d-flex align-center ga-4">
          <v-btn
            size="small"
            variant="tonal"
            color="accent"
            :disabled="store.page <= 1"
            @click="prevPage"
            >السابق</v-btn
          >
          <span class="text-caption font-weight-black">
            صفحة {{ store.page }} من {{ Math.ceil(store.total / store.pageSize) || 1 }}
          </span>
          <v-btn
            size="small"
            variant="tonal"
            color="accent"
            :disabled="store.page >= Math.ceil(store.total / store.pageSize)"
            @click="nextPage"
            >التالي</v-btn
          >
        </div>
      </div>
    </v-card>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="showDialog" max-width="850" persistent scrollable>
      <v-card class="modal-card overflow-hidden">
        <v-card-title class="pa-6 modal-header-solid d-flex align-center">
          <div class="bg-accent-alpha pa-2 rounded-lg me-3">
            <LucideIcon :name="isEditing ? 'pencil' : 'plus'" :size="20" class="text-primary" />
          </div>
          <span class="text-h6 font-weight-black text-pure-black">
            {{ isEditing ? 'تعديل بيانات الخدمة القانونية' : 'تسجيل خدمة قانونية جديدة' }}
          </span>
          <v-spacer />
          <v-btn icon variant="text" size="small" @click="showDialog = false">
            <LucideIcon name="x" :size="20" class="text-primary" />
          </v-btn>
        </v-card-title>

        <v-card-text class="pa-8 bg-white">
          <LegalServiceForm ref="formRef" v-model="editItem" v-model:valid="formValid" />
        </v-card-text>

        <v-divider class="border-gold" />
        <v-card-actions class="pa-8 modal-footer-solid">
          <v-btn
            variant="flat"
            size="large"
            class="px-8 font-weight-black action-btn-unified"
            @click="showDialog = false"
          >
            إلغاء
          </v-btn>
          <v-spacer />
          <v-btn
            variant="flat"
            size="large"
            class="px-12 font-weight-black premium-button-highlight action-btn-unified h-56"
            :disabled="!formValid"
            :loading="saving"
            @click="handleSave"
          >
            {{ isEditing ? 'حفظ التعديلات' : 'تأكيد الحفظ' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Details View Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="950" scrollable>
      <v-card class="modal-card overflow-hidden" style="max-height: 90vh">
        <v-card-title class="pa-6 modal-header-solid d-flex align-center">
          <div class="bg-accent-alpha pa-2 rounded-lg me-3">
            <LucideIcon name="scale" :size="20" class="text-primary" />
          </div>
          <span class="text-h6 font-weight-black text-pure-black">
            تفاصيل الارتباط القانوني: {{ selectedService?.engagement_number }}
          </span>
          <v-spacer />
          <v-btn icon variant="text" size="small" @click="showDetailsDialog = false">
            <LucideIcon name="x" :size="20" class="text-primary" />
          </v-btn>
        </v-card-title>

        <v-card-text class="pa-0 bg-white">
          <!-- Details Tabs -->
          <v-tabs v-model="detailsTab" color="accent" align-tabs="start" class="border-b">
            <v-tab value="general" class="font-weight-black">البيانات العامة</v-tab>
            <v-tab value="finance" class="font-weight-black">المالية</v-tab>
            <v-tab value="notes" class="font-weight-black"
              >الملاحظات الداخلية ({{ notes.length }})</v-tab
            >
            <v-tab value="attachments" class="font-weight-black"
              >المرفقات ({{ attachments.length }})</v-tab
            >
            <v-tab value="tasks" class="font-weight-black"
              >المهام المرتبطة ({{ tasks.length }})</v-tab
            >
            <v-tab value="timeline" class="font-weight-black">سجل الإجراءات (Timeline)</v-tab>
          </v-tabs>

          <v-window v-model="detailsTab" class="pa-8">
            <!-- General Info Window -->
            <v-window-item value="general">
              <v-row>
                <v-col cols="12" md="6">
                  <div class="text-caption text-grey">التصنيف الرئيسي</div>
                  <div class="text-body-1 font-weight-black mb-4">
                    {{ selectedService?.category_name }}
                  </div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="text-caption text-grey">اسم الخدمة</div>
                  <div class="text-body-1 font-weight-black mb-4">
                    {{ selectedService?.service_type_name }}
                  </div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="text-caption text-grey">نوع الخدمة</div>
                  <div class="text-body-1 font-weight-black mb-4">
                    {{ selectedService?.service_type || '-' }}
                  </div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="text-caption text-grey">العميل</div>
                  <div class="text-body-1 font-weight-black mb-4">
                    {{ selectedService?.client_name || '-' }}
                  </div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="text-caption text-grey">المستفيد</div>
                  <div class="text-body-1 font-weight-black mb-4">
                    {{ selectedService?.beneficiary || '-' }}
                  </div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="text-caption text-grey">المحامي المسؤول</div>
                  <div class="text-body-1 font-weight-black mb-4">
                    {{ selectedService?.responsible_name || '-' }}
                  </div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="text-caption text-grey">تاريخ بدء الخدمة</div>
                  <div class="text-body-1 font-weight-black mb-4">
                    {{ formatDate(selectedService?.start_date) }}
                  </div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="text-caption text-grey">تاريخ الانتهاء المتوقع</div>
                  <div class="text-body-1 font-weight-black mb-4">
                    {{ formatDate(selectedService?.expected_end_date) }}
                  </div>
                </v-col>
                <v-col cols="12" md="4">
                  <div class="text-caption text-grey">العقد المرتبط</div>
                  <div class="text-body-1 font-weight-black mb-4">
                    {{ selectedService?.contract_number || '-' }}
                  </div>
                </v-col>
                <v-col cols="12" md="4">
                  <div class="text-caption text-grey">القضية المرتبطة</div>
                  <div class="text-body-1 font-weight-black mb-4">
                    {{ selectedService?.case_number || '-' }}
                  </div>
                </v-col>
                <v-col cols="12" md="4">
                  <div class="text-caption text-grey">الفاتورة المرتبطة</div>
                  <div class="d-flex align-center gap-2 mb-4">
                    <div class="text-body-1 font-weight-black">
                      {{ selectedService?.invoice_number || 'لا توجد فاتورة' }}
                    </div>

                    <v-btn
                      v-if="!selectedService?.invoice_id"
                      size="x-small"
                      color="accent"
                      variant="flat"
                      class="rounded-lg font-weight-black text-ebony ms-3"
                      :loading="generatingInvoice"
                      @click="handleGenerateInvoice"
                    >
                      <LucideIcon name="receipt" :size="12" class="me-1" /> إنشاء فاتورة للخدمة
                    </v-btn>

                    <v-btn
                      v-else
                      size="x-small"
                      color="success"
                      variant="tonal"
                      class="rounded-lg font-weight-black ms-3"
                      :loading="printingInvoice"
                      @click="handlePrintInvoice(selectedService?.invoice_id)"
                    >
                      <LucideIcon name="printer" :size="12" class="me-1" /> طباعة / تصدير PDF
                    </v-btn>
                  </div>
                </v-col>
                <v-col cols="12" md="4">
                  <div class="text-caption text-grey">المقابل المالي</div>
                  <div class="text-body-1 font-weight-black text-accent mb-4">
                    {{ formatCurrency(selectedService?.financial_compensation || 0) }}
                  </div>
                </v-col>
                <v-col cols="12" md="4">
                  <div class="text-caption text-grey">المسدد</div>
                  <div class="text-body-1 font-weight-black text-success mb-4">
                    {{ formatCurrency(selectedService?.paid_amount || 0) }}
                  </div>
                </v-col>
                <v-col cols="12" md="4">
                  <div class="text-caption text-grey">المتبقي</div>
                  <div class="text-body-1 font-weight-black text-error mb-4">
                    {{ formatCurrency(selectedService?.remaining_amount || 0) }}
                  </div>
                </v-col>
                <v-col cols="12">
                  <v-divider class="my-4" />
                  <div class="text-caption text-grey">وصف الخدمة</div>
                  <div class="text-body-1 leading-relaxed mb-4" style="white-space: pre-wrap">
                    {{ selectedService?.description || '-' }}
                  </div>
                </v-col>
                <v-col cols="12">
                  <div class="text-caption text-grey">ملاحظات عامة</div>
                  <div class="text-body-1 leading-relaxed mb-4" style="white-space: pre-wrap">
                    {{ selectedService?.notes || '-' }}
                  </div>
                </v-col>
              </v-row>
            </v-window-item>

            <!-- Finance Window -->
            <v-window-item value="finance">
              <v-row>
                <v-col cols="12" md="6">
                  <v-card
                    variant="outlined"
                    class="pa-5 rounded-xl border-gold-alpha bg-grey-lighten-5"
                  >
                    <div class="text-subtitle-2 font-weight-black text-primary mb-4">
                      ملخص المالية
                    </div>
                    <div class="d-flex justify-space-between align-center mb-3">
                      <span class="text-grey">المقابل المالي:</span>
                      <span class="font-weight-black text-accent">{{
                        formatCurrency(selectedService?.financial_compensation || 0)
                      }}</span>
                    </div>
                    <div class="d-flex justify-space-between align-center mb-3">
                      <span class="text-grey">الضريبة:</span>
                      <span class="font-weight-black text-grey-darken-1">{{
                        formatCurrency(selectedService?.tax || 0)
                      }}</span>
                    </div>
                    <v-divider class="my-3" />
                    <div class="d-flex justify-space-between align-center mb-3">
                      <span class="text-grey">الإجمالي:</span>
                      <span class="font-weight-black text-accent">{{
                        formatCurrency(
                          (selectedService?.financial_compensation || 0) +
                            (selectedService?.tax || 0)
                        )
                      }}</span>
                    </div>
                    <div class="d-flex justify-space-between align-center mb-3">
                      <span class="text-grey">المسدد:</span>
                      <span class="font-weight-black text-success">{{
                        formatCurrency(selectedService?.paid_amount || 0)
                      }}</span>
                    </div>
                    <div class="d-flex justify-space-between align-center mb-3">
                      <span class="text-grey">المتبقي:</span>
                      <span class="font-weight-black text-error">{{
                        formatCurrency(selectedService?.remaining_amount || 0)
                      }}</span>
                    </div>
                    <div class="d-flex justify-space-between align-center mb-3">
                      <span class="text-grey">طريقة الدفع:</span>
                      <span class="font-weight-black">{{
                        selectedService?.payment_method || '-'
                      }}</span>
                    </div>
                    <div class="d-flex justify-space-between align-center">
                      <span class="text-grey">الفاتورة:</span>
                      <span class="font-weight-black">{{
                        selectedService?.invoice_number || 'لا توجد'
                      }}</span>
                    </div>
                  </v-card>
                </v-col>
                <v-col cols="12" md="6">
                  <v-card
                    variant="outlined"
                    class="pa-5 rounded-xl border-gold-alpha bg-grey-lighten-5"
                  >
                    <div class="text-subtitle-2 font-weight-black text-gold mb-4">
                      سجل المالية (حسابات المكتب)
                    </div>
                    <div v-if="loadingFinance" class="text-center py-6">
                      <v-progress-circular indeterminate color="accent" size="24" />
                    </div>
                    <div v-else-if="financeRecord">
                      <div class="d-flex justify-space-between align-center mb-3">
                        <span class="text-grey">رقم المرجع المالي:</span>
                        <span class="font-weight-black font-mono">{{
                          financeRecord.id?.substring(0, 8) || '-'
                        }}</span>
                      </div>
                      <div class="d-flex justify-space-between align-center mb-3">
                        <span class="text-grey">تاريخ التسجيل:</span>
                        <span class="font-weight-black">{{ formatDate(financeRecord.date) }}</span>
                      </div>
                      <div class="d-flex justify-space-between align-center mb-3">
                        <span class="text-grey">حالة الدفع:</span>
                        <v-chip
                          size="x-small"
                          :color="getFinanceStatusColor(financeRecord.status)"
                          class="font-weight-black text-ebony"
                        >
                          {{ getFinanceStatusLabel(financeRecord.status) }}
                        </v-chip>
                      </div>
                      <div class="d-flex justify-space-between align-center mb-3">
                        <span class="text-grey">المبلغ المسجل:</span>
                        <span class="font-weight-black">{{
                          formatCurrency(financeRecord.amount || 0)
                        }}</span>
                      </div>
                      <div class="d-flex justify-space-between align-center mb-3">
                        <span class="text-grey">المبلغ الإجمالي:</span>
                        <span class="font-weight-black">{{
                          formatCurrency(financeRecord.total || 0)
                        }}</span>
                      </div>
                    </div>
                    <div v-else class="text-center py-6 text-grey">
                      <LucideIcon name="banknote" :size="32" class="mb-2 opacity-50" />
                      <div>لا يوجد سجل مالي مرتبط في حسابات المكتب</div>
                      <div class="text-caption mt-2">
                        يتم إنشاء سجل مالي تلقائياً عند إدخال مقابل مالي للخدمة
                      </div>
                    </div>
                  </v-card>
                </v-col>
              </v-row>
              <v-row class="mt-4">
                <v-col cols="12">
                  <v-card
                    variant="outlined"
                    class="pa-5 rounded-xl border-gold-alpha bg-grey-lighten-5"
                  >
                    <div class="d-flex align-center justify-space-between mb-4">
                      <div class="text-subtitle-2 font-weight-black text-primary">
                        إجراءات مالية
                      </div>
                    </div>
                    <div class="d-flex flex-wrap ga-3">
                      <v-btn
                        v-if="!selectedService?.invoice_id"
                        color="accent"
                        variant="flat"
                        class="rounded-lg font-weight-black text-ebony"
                        :loading="generatingInvoice"
                        @click="handleGenerateInvoice"
                      >
                        <LucideIcon name="receipt" :size="16" class="me-2" /> إنشاء فاتورة ضريبية
                      </v-btn>
                      <v-btn
                        v-else
                        color="success"
                        variant="tonal"
                        class="rounded-lg font-weight-black"
                        :loading="printingInvoice"
                        @click="handlePrintInvoice(selectedService?.invoice_id)"
                      >
                        <LucideIcon name="printer" :size="16" class="me-2" /> طباعة / تصدير الفاتورة
                      </v-btn>
                      <v-btn
                        color="gold"
                        variant="tonal"
                        class="rounded-lg font-weight-black"
                        @click="showPaymentDialog = true"
                      >
                        <LucideIcon name="wallet" :size="16" class="me-2" /> تسجيل دفعة جديدة
                      </v-btn>
                    </div>
                  </v-card>
                </v-col>
              </v-row>
            </v-window-item>

            <!-- Internal Notes Window -->
            <v-window-item value="notes">
              <v-textarea
                v-model="newNoteText"
                label="إضافة ملاحظة جديدة..."
                variant="outlined"
                rows="2"
                hide-details
                class="mb-4"
              ></v-textarea>
              <div class="d-flex justify-end mb-6">
                <v-btn
                  color="accent"
                  class="font-weight-black rounded-lg"
                  :disabled="!newNoteText.trim()"
                  :loading="addingNote"
                  @click="submitNote"
                  >إدراج الملاحظة</v-btn
                >
              </div>

              <div v-if="notes.length === 0" class="text-center py-6 text-grey">
                لا توجد ملاحظات داخلية مسجلة بعد.
              </div>
              <div v-else class="d-flex flex-column ga-4">
                <v-card
                  v-for="n in notes"
                  :key="n.id"
                  variant="outlined"
                  class="pa-4 bg-grey-lighten-4 rounded-xl border-gold-alpha"
                >
                  <div class="d-flex justify-space-between align-center mb-2">
                    <span class="font-weight-black text-primary text-caption">{{
                      n.created_by
                    }}</span>
                    <span class="text-tiny text-grey">{{ formatDate(n.created_at) }}</span>
                  </div>
                  <div class="text-body-2 leading-relaxed text-black" style="white-space: pre-wrap">
                    {{ n.note_text }}
                  </div>
                </v-card>
              </div>
            </v-window-item>

            <!-- Attachments Window -->
            <v-window-item value="attachments">
              <div class="d-flex justify-end mb-6">
                <v-btn
                  color="accent"
                  class="font-weight-black rounded-lg"
                  :loading="uploadingAttachment"
                  @click="uploadAttachment"
                >
                  <LucideIcon name="upload" :size="16" class="me-2" /> إرفاق مستند جديد
                </v-btn>
              </div>

              <div v-if="attachments.length === 0" class="text-center py-6 text-grey">
                لا توجد مرفقات مسجلة بعد.
              </div>
              <v-table v-else class="bg-transparent">
                <thead>
                  <tr>
                    <th class="text-right text-grey font-weight-black">اسم الملف</th>
                    <th class="text-right text-grey font-weight-black">تاريخ الرفع</th>
                    <th class="text-right text-grey font-weight-black">بواسطة</th>
                    <th class="text-left text-grey font-weight-black">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="att in attachments" :key="att.id">
                    <td class="text-right font-weight-black text-black">{{ att.file_name }}</td>
                    <td class="text-right text-grey">{{ formatDate(att.uploaded_at) }}</td>
                    <td class="text-right text-grey">{{ att.uploaded_by }}</td>
                    <td class="text-left">
                      <v-btn
                        size="small"
                        variant="tonal"
                        color="accent"
                        class="rounded-lg font-weight-black"
                        @click="openAttachmentFile(att.file_path)"
                      >
                        فتح الملف
                      </v-btn>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-window-item>

            <!-- Linked Tasks Window -->
            <v-window-item value="tasks">
              <!-- Add Quick Task Form Toggle -->
              <v-expand-transition>
                <div v-if="showAddTaskForm" class="pa-4 mb-6 border rounded-xl bg-grey-lighten-5">
                  <div class="text-subtitle-2 font-weight-black mb-4 text-primary">
                    إضافة مهمة جديدة للخدمة
                  </div>
                  <v-form ref="taskFormRef">
                    <v-row dense>
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="newTask.title"
                          label="عنوان المهمة*"
                          variant="outlined"
                          density="comfortable"
                          :rules="[(v) => !!v || 'العنوان مطلوب']"
                          required
                        />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-select
                          v-model="newTask.responsible_user_id"
                          :items="assignableUsers"
                          item-title="full_name"
                          item-value="id"
                          label="المسؤول عنها*"
                          variant="outlined"
                          density="comfortable"
                          :rules="[(v) => !!v || 'المسؤول مطلوب']"
                          required
                        />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="newTask.due_date"
                          label="تاريخ الاستحقاق"
                          type="date"
                          variant="outlined"
                          density="comfortable"
                        />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-select
                          v-model="newTask.priority"
                          :items="['عالية', 'متوسطة', 'منخفضة']"
                          label="الأولوية"
                          variant="outlined"
                          density="comfortable"
                        />
                      </v-col>
                      <v-col cols="12">
                        <v-textarea
                          v-model="newTask.description"
                          label="الوصف والتفاصيل"
                          variant="outlined"
                          density="comfortable"
                          rows="2"
                        />
                      </v-col>
                    </v-row>
                    <div class="d-flex justify-end gap-2 mt-2">
                      <v-btn
                        variant="text"
                        color="grey"
                        class="rounded-lg font-weight-bold"
                        @click="showAddTaskForm = false"
                        >تراجع</v-btn
                      >
                      <v-btn
                        color="accent"
                        class="rounded-lg font-weight-black text-ebony"
                        :loading="savingTask"
                        @click="submitTask"
                        >حفظ المهمة</v-btn
                      >
                    </div>
                  </v-form>
                </div>
              </v-expand-transition>

              <div class="d-flex justify-space-between align-center mb-6">
                <div class="text-subtitle-2 text-grey">المهام المدرجة تحت هذه الخدمة</div>
                <v-btn
                  v-if="!showAddTaskForm"
                  color="accent"
                  variant="flat"
                  size="small"
                  class="rounded-lg font-weight-black text-ebony"
                  @click="showAddTaskForm = true"
                >
                  <LucideIcon name="plus" :size="16" class="me-2" /> إضافة مهمة سريعة
                </v-btn>
              </div>

              <div v-if="tasks.length === 0" class="text-center py-6 text-grey">
                لا توجد مهام مرتبطة بهذه الخدمة بعد.
              </div>
              <v-table v-else class="bg-transparent">
                <thead>
                  <tr>
                    <th class="text-right text-grey font-weight-black">المهمة</th>
                    <th class="text-right text-grey font-weight-black">المسؤول</th>
                    <th class="text-right text-grey font-weight-black">الأولوية</th>
                    <th class="text-right text-grey font-weight-black">تاريخ الاستحقاق</th>
                    <th class="text-right text-grey font-weight-black">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="t in tasks" :key="t.id">
                    <td class="text-right font-weight-black text-black">
                      <div>{{ t.title }}</div>
                      <div class="text-caption text-grey">{{ t.description || '-' }}</div>
                    </td>
                    <td class="text-right text-grey">{{ t.responsible_name || '-' }}</td>
                    <td class="text-right">
                      <v-chip
                        size="x-small"
                        :color="getTaskPriorityColor(t.priority)"
                        variant="tonal"
                        class="font-weight-black"
                      >
                        {{ t.priority }}
                      </v-chip>
                    </td>
                    <td class="text-right text-grey">{{ t.due_date || '-' }}</td>
                    <td class="text-right">
                      <v-chip
                        size="x-small"
                        :color="getTaskStatusColor(t.status)"
                        variant="flat"
                        class="text-ebony font-weight-black"
                      >
                        {{ getTaskStatusLabel(t.status) }}
                      </v-chip>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-window-item>

            <!-- Timeline Window -->
            <v-window-item value="timeline">
              <v-timeline side="end" align="start" density="compact" class="pe-6">
                <v-timeline-item
                  v-for="t in timeline"
                  :key="t.id"
                  :dot-color="getTimelineDotColor(t.event_type)"
                  size="small"
                >
                  <div class="mb-4">
                    <div class="d-flex justify-space-between align-center mb-1">
                      <span class="font-weight-black text-black text-body-2">{{
                        t.event_title
                      }}</span>
                      <span class="text-tiny text-grey">{{ formatDate(t.created_at) }}</span>
                    </div>
                    <div class="text-caption text-grey-darken-2 mb-1">
                      {{ t.event_description }}
                    </div>
                    <div class="text-tiny text-primary font-weight-black">
                      المسؤول: {{ t.actor }}
                    </div>
                  </div>
                </v-timeline-item>
              </v-timeline>
            </v-window-item>
          </v-window>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="500" persistent>
      <v-card class="modal-card overflow-hidden">
        <v-card-title class="pa-6 modal-header-solid d-flex align-center">
          <LucideIcon name="alert-triangle" :size="24" class="me-3 text-error" />
          <span class="text-h6 font-weight-black text-pure-black"
            >تأكيد الأرشفة / الحذف الناعم</span
          >
          <v-spacer />
          <v-btn icon variant="text" size="small" @click="showDeleteDialog = false">
            <LucideIcon name="x" :size="20" class="text-primary" />
          </v-btn>
        </v-card-title>

        <v-card-text class="pa-8 bg-white text-center">
          <div class="text-body-1 mb-6 text-pure-black font-weight-black leading-relaxed">
            هل أنت متأكد من نقل هذه الخدمة القانونية إلى سلة المحذوفات؟ سيتم حجبها من جداول التشغيل
            الأساسية مع بقائها في قاعدة البيانات لأغراض الرقابة.
          </div>
          <div
            class="pa-4 rounded-lg font-weight-black text-h6 bg-grey-lighten-4 border-gold-alpha text-error mb-4"
          >
            REF: {{ itemToDelete?.engagement_number }} - {{ itemToDelete?.service_type_name }}
          </div>
        </v-card-text>

        <v-card-actions class="pa-8 modal-footer-solid ga-3">
          <v-btn
            variant="flat"
            size="large"
            class="px-8 font-weight-black action-btn-unified"
            @click="showDeleteDialog = false"
          >
            تراجع
          </v-btn>
          <v-spacer />
          <v-btn
            color="error"
            variant="elevated"
            size="large"
            class="px-12 font-weight-black rounded-xl premium-lift h-56"
            :loading="deleting"
            @click="handleDelete"
          >
            نقل للأرشيف المحذوف
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Payment Dialog -->
    <PaymentDialog
      v-if="showPaymentDialog && selectedService"
      v-model="showPaymentDialog"
      :engagement="selectedService"
      @save="handlePaymentSaved"
    />

    <!-- Feedback Snackbars -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" rounded="lg" elevation="24">
      <div class="d-flex align-center">
        <LucideIcon
          :name="snackbarColor === 'success' ? 'check-circle' : 'alert-circle'"
          :size="18"
          class="me-3"
        />
        <span class="font-weight-black">{{ snackbarText }}</span>
      </div>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, reactive } from 'vue'
import { useLegalStore } from '../stores/legal'
import { usePermissions } from '../composables/usePermissions'
import LegalServiceForm from '../components/LegalServiceForm.vue'
import PaymentDialog from '../components/finance/PaymentDialog.vue'
import LucideIcon from '../components/common/LucideIcon.vue'
import { LegalEngagement } from '../types/legal'

const store = useLegalStore()
const { can } = usePermissions()

// Feature Flag Check
const isEnabled = ref(true)

// Filters & States
const search = ref('')
const showDialog = ref(false)
const isEditing = ref(false)
const formValid = ref(false)
const formRef = ref<any>(null)
const saving = ref(false)

const showDeleteDialog = ref(false)
const deleting = ref(false)
const itemToDelete = ref<LegalEngagement | null>(null)

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

// Details Dialog States
const showDetailsDialog = ref(false)
const selectedService = ref<LegalEngagement | null>(null)
const detailsTab = ref('general')

// Payment Dialog
const showPaymentDialog = ref(false)

// Auxiliary Notes, Attachments, Timeline, Tasks
const notes = ref<any[]>([])
const newNoteText = ref('')
const addingNote = ref(false)

const attachments = ref<any[]>([])
const uploadingAttachment = ref(false)

const timeline = ref<any[]>([])

const tasks = ref<any[]>([])
const showAddTaskForm = ref(false)
const savingTask = ref(false)
const financeRecord = ref<any>(null)
const loadingFinance = ref(false)
const taskFormRef = ref<any>(null)
const assignableUsers = ref<any[]>([])
const newTask = reactive({
  title: '',
  description: '',
  due_date: '',
  priority: 'متوسطة',
  responsible_user_id: ''
})

// Reference dropdown options derived from store lookups
const categoryOptions = computed(() =>
  store.categories.map((c) => ({ title: c.name_ar, value: c.id }))
)
const statusOptions = computed(() =>
  store.statuses.map((s) => ({ title: s.status_name_ar, value: s.id }))
)

// Top stats calculations computed strictly from loaded data
const inProgressCount = computed(() => {
  const targetStatus = store.statuses.find((s) => s.status_key === 'in_progress')
  if (!targetStatus) return 0
  return store.services.filter((s) => s.status_id === targetStatus.id).length
})

const completedCount = computed(() => {
  const targetStatus = store.statuses.find((s) => s.status_key === 'completed')
  if (!targetStatus) return 0
  return store.services.filter((s) => s.status_id === targetStatus.id).length
})

const totalRemainingFees = computed(() => {
  return store.services.reduce((sum, item) => sum + Number(item.remaining_amount || 0), 0)
})

// Check Feature Flag and load lookups on mount
onMounted(async () => {
  try {
    const s = (await window.api.settings.get()) as any
    isEnabled.value = s?.featureLegalServicesEnabled !== false
    if (isEnabled.value) {
      await store.fetchMetadata()
      await loadData()
      await loadUsers()
    }
  } catch (e) {
    console.error('Failed to load Settings/Services:', e)
  }
})

const loadData = async () => {
  await store.fetchServices({
    page: store.page,
    pageSize: store.pageSize,
    q: search.value,
    category_id: store.filterCategory,
    status_id: store.filterStatus
  })
}

// Filters change triggers reload
const onFilterChange = () => {
  store.page = 1
  loadData()
}

// Watch search and reload
let searchTimeout: any = null
watch(search, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    store.page = 1
    loadData()
  }, 400)
})

// Pagination
const nextPage = () => {
  store.page++
  loadData()
}
const prevPage = () => {
  if (store.page > 1) {
    store.page--
    loadData()
  }
}

// Actions: Create, Edit, Save
const defaultItem: Partial<LegalEngagement> = {
  engagement_type_id: '',
  category_id: '',
  client_id: '',
  beneficiary: '',
  linked_parties: '',
  responsible_lawyer_id: null,
  assistant_team: '',
  description: '',
  purpose: '',
  start_date: new Date().toISOString().substring(0, 10),
  expected_end_date: '',
  completion_date: '',
  status_id: 'status_pending',
  priority_id: 'priority_medium',
  financial_compensation: 0,
  tax: 0,
  paid_amount: 0,
  payment_method: '',
  contract_id: '',
  case_id: '',
  notes: ''
}

const editItem = ref<Partial<LegalEngagement>>({ ...defaultItem })

const openCreate = () => {
  isEditing.value = false
  editItem.value = { ...defaultItem }
  showDialog.value = true
}

const openEdit = (item: LegalEngagement) => {
  isEditing.value = true
  editItem.value = { ...item }
  showDialog.value = true
}

const handleSave = async () => {
  if (formRef.value) {
    const check = await formRef.value.validate()
    if (!check.valid) return
  }

  saving.value = true
  try {
    if (isEditing.value) {
      await store.updateService(editItem.value.id!, editItem.value)
      triggerSnackbar('تم حفظ التعديلات بنجاح')
    } else {
      await store.addService(editItem.value)
      triggerSnackbar('تم تسجيل الخدمة القانونية بنجاح')
    }
    showDialog.value = false
  } catch (e: any) {
    triggerSnackbar(e.message || 'فشل في حفظ البيانات', 'error')
  } finally {
    saving.value = false
  }
}

// Actions: Delete
const confirmDelete = (item: LegalEngagement) => {
  itemToDelete.value = item
  showDeleteDialog.value = true
}

const handleDelete = async () => {
  if (!itemToDelete.value?.id) return
  deleting.value = true
  try {
    await store.deleteService(itemToDelete.value.id)
    triggerSnackbar('تم أرشفة الخدمة القانونية بنجاح')
    showDeleteDialog.value = false
  } catch (e: any) {
    triggerSnackbar(e.message || 'فشل في الأرشفة', 'error')
  } finally {
    deleting.value = false
  }
}

// Action: Details modal & aux logs loaders
const openDetails = async (item: LegalEngagement) => {
  selectedService.value = item
  detailsTab.value = 'general'
  newNoteText.value = ''
  showAddTaskForm.value = false

  // Load notes, attachments, timeline, tasks and finance
  financeRecord.value = null
  await Promise.all([
    loadNotes(),
    loadAttachments(),
    loadTimeline(),
    loadTasks(),
    loadFinanceRecord()
  ])
  showDetailsDialog.value = true
}

const loadUsers = async () => {
  try {
    assignableUsers.value = await (window as any).api.users.listAssignable()
  } catch (e) {
    console.error('Failed to load assignable users:', e)
  }
}

const loadTasks = async () => {
  if (!selectedService.value?.id) return
  try {
    tasks.value = await (window as any).api.tasks.getByCaseId(selectedService.value.id)
  } catch (e) {
    console.error('Failed to load tasks:', e)
  }
}

const getTaskPriorityColor = (p: string) => {
  if (p === 'عالية') return 'error'
  if (p === 'متوسطة') return 'warning'
  return 'success'
}

const getTaskStatusColor = (s: string) => {
  if (s === 'completed' || s === 'done') return 'success'
  if (s === 'in_progress') return 'info'
  if (s === 'closed') return 'grey'
  if (s === 'cancelled') return 'error'
  return 'warning'
}

const getTaskStatusLabel = (s: string) => {
  if (s === 'completed' || s === 'done') return 'منجزة'
  if (s === 'in_progress') return 'قيد العمل'
  if (s === 'closed') return 'مغلقة'
  if (s === 'cancelled') return 'ملغاة'
  return 'قيد الانتظار'
}

const submitTask = async () => {
  if (taskFormRef.value) {
    const check = await taskFormRef.value.validate()
    if (!check.valid) return
  }

  savingTask.value = true
  try {
    const payload = {
      case_id: selectedService.value?.id,
      client_id: selectedService.value?.client_id || null,
      link_type: 'legal_service',
      title: newTask.title,
      description: newTask.description,
      due_date: newTask.due_date,
      priority: newTask.priority,
      responsible_user_id: newTask.responsible_user_id,
      status: 'pending'
    }
    await (window as any).api.tasks.create(payload)
    newTask.title = ''
    newTask.description = ''
    newTask.due_date = ''
    newTask.priority = 'متوسطة'
    newTask.responsible_user_id = ''
    showAddTaskForm.value = false
    await loadTasks()
    await loadTimeline()
    triggerSnackbar('تم إضافة المهمة بنجاح')
  } catch (e: any) {
    triggerSnackbar(e.message || 'فشل في إضافة المهمة', 'error')
  } finally {
    savingTask.value = false
  }
}

const generatingInvoice = ref(false)
const printingInvoice = ref(false)

const handleGenerateInvoice = async () => {
  if (!selectedService.value?.id) return
  generatingInvoice.value = true
  try {
    await (window as any).api.legalServices.generateInvoice(selectedService.value.id)
    triggerSnackbar('تم إصدار الفاتورة الضريبية وتوصيلها بالخدمة بنجاح')

    // Reload data and update selection
    await loadData()
    const refreshed = store.services.find((s) => s.id === selectedService.value?.id)
    if (refreshed) {
      selectedService.value = refreshed
    } else {
      selectedService.value = await (window as any).api.legalServices.getById(
        selectedService.value.id
      )
    }
    await loadTimeline()
  } catch (e: any) {
    triggerSnackbar(e.message || 'فشل إنشاء الفاتورة', 'error')
  } finally {
    generatingInvoice.value = false
  }
}

const handlePrintInvoice = async (invoiceId: string) => {
  if (!invoiceId) return
  printingInvoice.value = true
  try {
    const result = await (window as any).api.reports.exportPdf({
      type: 'invoice',
      params: { id: invoiceId }
    })
    if (result && result.saved && result.path) {
      triggerSnackbar('تم إنشاء الفاتورة الضريبية بنجاح. جاري فتح ملف PDF...')
      await (window as any).api.documents.open(result.path)
    } else {
      triggerSnackbar('تم إلغاء تصدير الفاتورة')
    }
  } catch (e: any) {
    triggerSnackbar(e.message || 'فشل تصدير الفاتورة', 'error')
  } finally {
    printingInvoice.value = false
  }
}

const loadNotes = async () => {
  if (!selectedService.value?.id) return
  notes.value = await window.api.legalServices.getNotes(selectedService.value.id)
}

const loadAttachments = async () => {
  if (!selectedService.value?.id) return
  attachments.value = await window.api.legalServices.getAttachments(selectedService.value.id)
}

const loadTimeline = async () => {
  if (!selectedService.value?.id) return
  timeline.value = await window.api.legalServices.getTimeline(selectedService.value.id)
}

const submitNote = async () => {
  if (!newNoteText.value.trim() || !selectedService.value?.id) return
  addingNote.value = true
  try {
    await window.api.legalServices.addNote(selectedService.value.id, newNoteText.value)
    newNoteText.value = ''
    await loadNotes()
    await loadTimeline()
    triggerSnackbar('تم إضافة الملاحظة بنجاح')
  } catch (e: any) {
    triggerSnackbar(e.message || 'فشل إضافة الملاحظة', 'error')
  } finally {
    addingNote.value = false
  }
}

const uploadAttachment = async () => {
  if (!selectedService.value?.id) return
  uploadingAttachment.value = true
  try {
    const result = await window.api.documents.upload({
      linkType: 'none',
      linkedTitle: 'مرفق خدمة قانونية'
    })
    if (result) {
      await window.api.legalServices.addAttachment(
        selectedService.value.id,
        result.original_name || result.file_name || 'مرفق',
        result.stored_path || ''
      )
      await loadAttachments()
      await loadTimeline()
      triggerSnackbar('تم إرفاق المستند بنجاح')
    }
  } catch (e: any) {
    triggerSnackbar(e.message || 'فشل إرفاق الملف', 'error')
  } finally {
    uploadingAttachment.value = false
  }
}

const openAttachmentFile = async (path: string) => {
  try {
    await window.api.documents.open(path)
  } catch (e: any) {
    triggerSnackbar('فشل فتح ملف المرفق', 'error')
  }
}

const loadFinanceRecord = async () => {
  if (!selectedService.value?.id) return
  loadingFinance.value = true
  try {
    financeRecord.value = await window.api.legalServices.getFinance(selectedService.value.id)
  } catch (e) {
    financeRecord.value = null
  } finally {
    loadingFinance.value = false
  }
}

const getFinanceStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
      return 'success'
    case 'partially_paid':
      return 'warning'
    case 'overdue':
      return 'error'
    default:
      return 'grey'
  }
}

const getFinanceStatusLabel = (status: string) => {
  switch (status) {
    case 'paid':
      return 'مدفوع بالكامل'
    case 'partially_paid':
      return 'مدفوع جزئياً'
    case 'overdue':
      return 'متأخر'
    case 'pending':
      return 'معلق'
    default:
      return status || 'معلق'
  }
}

const handlePaymentSaved = () => {
  showPaymentDialog.value = false
  triggerSnackbar('تم تسجيل الدفعة بنجاح')
  if (selectedService.value) {
    loadFinanceRecord()
    store.fetchServices()
  }
}

// Helpers
const getStatusColor = (statusId: string) => {
  const st = store.statuses.find((s) => s.id === statusId)
  return st?.color || 'grey'
}

const getPriorityColor = (priorityId: string) => {
  const pr = store.priorities.find((p) => p.id === priorityId)
  return pr?.color || 'grey'
}

const getTimelineDotColor = (type: string) => {
  if (type === 'create') return 'green'
  if (type === 'update') return 'blue'
  if (type === 'delete') return 'red'
  if (type === 'note_added') return 'orange'
  if (type === 'attachment_uploaded') return 'purple'
  return 'grey'
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0
  }).format(val)
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('ar-SA')
  } catch {
    return dateStr
  }
}

const triggerSnackbar = (text: string, color = 'success') => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}
</script>

<style scoped>
/* Glass styling overlays matching general App.vue design */
.glass-panel-light {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
