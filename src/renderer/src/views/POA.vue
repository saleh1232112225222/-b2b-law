<template>
  <v-container fluid class="pa-6 rtl">
    <!-- Header -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="book-user" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">إدارة الوكالات الشرعية</h1>
            <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
              التوثيق الرقمي للوكالات الصادرة من كتابة العدل والمنصات المعتمدة
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="auto">
        <v-btn
          color="accent"
          size="large"
          class="font-weight-black rounded-lg px-8 premium-btn-gold-gradient h-100 premium-btn-gold-gradient"
          @click="openAddDialog"
        >
          <LucideIcon name="plus" :size="20" class="me-3" /> تسجيل وكالة جديدة
        </v-btn>
      </v-col>
    </v-row>

    <!-- Search & Filter Controls -->
    <v-row dense class="mb-6 align-center">
      <!-- Search Input -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model="searchQuery"
          placeholder="ابحث برقم الوكالة، اسم الموكل، أو مصدر الوكالة..."
          variant="outlined"
          density="comfortable"
          clearable
          class="glass-input search-input glass-input"
          hide-details
        >
          <template #prepend-inner>
            <LucideIcon name="search" :size="20" class="text-gold opacity-50" />
          </template>
        </v-text-field>
      </v-col>

      <!-- Filter Tabs (Toggle) -->
      <v-col cols="12" md="6" class="d-flex justify-md-end justify-center mt-3 mt-md-0">
        <v-btn-toggle
          v-model="statusFilter"
          mandatory
          selected-class="active-toggle-btn premium-btn-gold-gradient"
          class="glass-toggle rounded-xl overflow-hidden border border-gold border-opacity-10"
          density="comfortable"
        >
          <v-btn value="all" class="font-weight-black px-4 text-body-2 text-white premium-btn-gold-gradient">
            <LucideIcon name="list" :size="16" class="me-2" /> الكل ({{ totalCount }})
          </v-btn>
          <v-btn value="active" class="font-weight-black px-4 text-body-2 text-success premium-btn-gold-gradient">
            <LucideIcon name="check-circle" :size="16" class="me-2" /> سارية ({{ activeCount }})
          </v-btn>
          <v-btn value="expired" class="font-weight-black px-4 text-body-2 text-error premium-btn-gold-gradient">
            <LucideIcon name="alert-triangle" :size="16" class="me-2" /> منتهية ({{ expiredCount }})
          </v-btn>
        </v-btn-toggle>
      </v-col>
    </v-row>

    <!-- Agencies Table (Desktop) -->
    <v-card v-if="!isMobile" elevation="0" class="glass-card overflow-hidden min-h-500 glass-card">
      <v-data-table
        :headers="headers"
        :items="filteredAgencies"
        :loading="store.loading"
        class="bg-transparent poa-table"
        fixed-header
        height="calc(100vh - 300px)"
        hover
        density="comfortable"
        :items-per-page="12"
        items-per-page-text="عدد الوكالات لكل صفحة:"
        no-data-text="لا توجد وكالات مسجلة حالياً"
      >
        <!-- Skeleton Loader -->
        <template #loading>
          <v-skeleton-loader type="table-row@12" class="bg-transparent"></v-skeleton-loader>
        </template>

        <template #[`header.agency_number`]="{ column }">
          <span class="font-weight-black text-gold opacity-70">{{ column.title }}</span>
        </template>
        <template #[`header.client_name`]="{ column }">
          <span class="font-weight-black text-gold opacity-70">{{ column.title }}</span>
        </template>
        <template #[`header.date`]="{ column }">
          <span class="font-weight-black text-gold opacity-70">{{ column.title }}</span>
        </template>
        <template #[`header.expiry_date`]="{ column }">
          <span class="font-weight-black text-gold opacity-70">{{ column.title }}</span>
        </template>
        <template #[`header.court`]="{ column }">
          <span class="font-weight-black text-gold opacity-70">{{ column.title }}</span>
        </template>
        <template #[`header.actions`]="{ column }">
          <span class="font-weight-black text-gold opacity-70">{{ column.title }}</span>
        </template>

        <template #[`item.agency_number`]="{ item }">
          <div class="d-flex align-center justify-center">
            <v-btn
              variant="text"
              color="white"
              class="px-0 font-weight-black text-body-2 ltr-text hover-gold premium-btn-gold-gradient"
              @click="openEditDialog(item)"
            >
              {{ item.agency_number }}
            </v-btn>
          </div>
        </template>

        <template #[`item.client_name`]="{ item }">
          <v-btn
            v-if="item.client_id"
            variant="text"
            color="white"
            class="px-0 font-weight-black text-body-2 opacity-80 hover-gold premium-btn-gold-gradient"
            :to="'/clients/' + item.client_id"
            density="compact"
          >
            {{ item.client_name || '-' }}
          </v-btn>
          <div v-else class="font-weight-bold text-white opacity-40">
            {{ item.client_name || '-' }}
          </div>
        </template>

        <template #[`item.date`]="{ item }">
          <div v-if="isValidDate(String(item.date))" class="d-flex flex-column align-center">
            <div class="text-caption font-weight-black text-white">
              {{ formatDate(String(item.date)) }} مـ
            </div>
            <v-chip
              size="x-small"
              color="accent"
              variant="flat"
              class="mt-1 font-weight-black rounded-md"
            >
              {{ formatHijri(String(item.date)) }} هـ
            </v-chip>
          </div>
          <span v-else class="text-caption text-gold opacity-30 italic">---</span>
        </template>

        <template #[`item.expiry_date`]="{ item }">
          <div v-if="isValidDate(String(item.expiry_date))" class="d-flex flex-column align-center">
            <div class="text-caption font-weight-black text-white">
              {{ formatDate(String(item.expiry_date)) }} مـ
            </div>
            <v-chip
              size="x-small"
              color="warning"
              variant="flat"
              class="mt-1 font-weight-black rounded-md"
            >
              {{ formatHijri(String(item.expiry_date)) }} هـ
            </v-chip>
          </div>
          <span v-else class="text-caption text-gold opacity-30 italic">---</span>
        </template>

        <template #[`item.court`]="{ item }">
          <div class="d-flex align-center justify-center">
            <LucideIcon name="landmark" :size="14" class="text-gold opacity-50 me-2" />
            <span class="text-caption font-weight-bold text-white opacity-70">{{
              item.court || 'كتابة عدل عامة'
            }}</span>
          </div>
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-center gap-2">
            <v-btn
              icon
              variant="text"
              color="accent"
              size="small"
              class="premium-hover opacity-70 premium-btn-gold-gradient"
              @click="openPreviewDialog(item)"
            >
              <LucideIcon name="eye" :size="18" />
              <v-tooltip activator="parent" location="top">معاينة الوكالة</v-tooltip>
            </v-btn>
            <v-btn
              icon
              variant="text"
              color="gold"
              size="small"
              class="premium-hover opacity-70 premium-btn-gold-gradient"
              @click="openEditDialog(item)"
            >
              <LucideIcon name="edit-3" :size="18" />
              <v-tooltip activator="parent" location="top">تعديل الوكالة</v-tooltip>
            </v-btn>
            <v-btn
              icon
              variant="text"
              color="error"
              size="small"
              class="premium-hover opacity-70 premium-btn-gold-gradient"
              @click="confirmDelete(item)"
            >
              <LucideIcon name="trash-2" :size="18" />
              <v-tooltip activator="parent" location="top">حذف سجل الوكالة</v-tooltip>
            </v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Agencies Mobile Cards View -->
    <div v-else>
      <div v-if="store.loading" class="d-flex flex-column gap-4">
        <v-skeleton-loader
          v-for="n in 4"
          :key="n"
          type="card"
          class="glass-card mb-4 rounded-xl bg-transparent"
        />
      </div>

      <div
        v-else-if="filteredAgencies.length === 0"
        class="text-center py-12 glass-card rounded-xl"
      >
        <LucideIcon name="folder-open" :size="48" class="text-gold opacity-30 mb-4" />
        <div class="text-h6 text-gold opacity-50 font-weight-black">
          لا توجد وكالات مطابقة للبحث أو الفرز
        </div>
      </div>

      <div v-else class="mobile-cards-container d-flex flex-column gap-4">
        <v-card
          v-for="item in filteredAgencies"
          :key="item.id"
          class="glass-card mb-4 rounded-xl border-gold border-opacity-10 overflow-hidden premium-hover glass-card"
          elevation="0"
        >
          <!-- Card Header -->
          <div
            class="d-flex align-center justify-space-between pa-4 border-b border-gold border-opacity-10"
          >
            <div class="d-flex align-center">
              <div class="glass-panel-light pa-2 rounded-lg me-3 border-gold border-opacity-20">
                <LucideIcon name="file-text" :size="20" class="text-gold" />
              </div>
              <div>
                <span class="text-caption text-gold opacity-50 d-block mb-1"
                  >الرقم المرجعي للوكالة</span
                >
                <v-btn
                  variant="text"
                  color="white"
                  class="px-0 py-0 font-weight-black text-body-1 ltr-text hover-gold h-auto min-width-0 premium-btn-gold-gradient"
                  @click="openEditDialog(item)"
                >
                  {{ item.agency_number }}
                </v-btn>
              </div>
            </div>

            <!-- Status Chip -->
            <v-chip
              :color="isExpired(item.expiry_date) ? 'error' : 'success'"
              variant="flat"
              size="small"
              class="font-weight-black rounded-lg px-3"
            >
              {{ isExpired(item.expiry_date) ? 'منتهية' : 'سارية' }}
            </v-chip>
          </div>

          <!-- Card Body -->
          <v-card-text class="pa-4 text-white glass-card">
            <!-- Client name -->
            <div class="mb-4">
              <span class="text-caption text-gold opacity-50 d-block mb-1">الموكل (الموكِّل)</span>
              <v-btn
                v-if="item.client_id"
                variant="text"
                color="white"
                class="px-0 py-0 font-weight-black text-body-2 hover-gold h-auto min-width-0 premium-btn-gold-gradient"
                :to="'/clients/' + item.client_id"
              >
                {{ item.client_name || '-' }}
              </v-btn>
              <div v-else class="font-weight-bold text-white opacity-40">
                {{ item.client_name || '-' }}
              </div>
            </div>

            <v-row dense class="mb-4">
              <!-- Start Date -->
              <v-col cols="6">
                <span class="text-caption text-gold opacity-50 d-block mb-1">تاريخ الاعتماد</span>
                <div v-if="isValidDate(String(item.date))">
                  <span class="text-caption font-weight-black text-white d-block">
                    {{ formatDate(String(item.date)) }} مـ
                  </span>
                  <v-chip
                    size="x-small"
                    color="accent"
                    variant="flat"
                    class="mt-1 font-weight-black rounded-md"
                  >
                    {{ formatHijri(String(item.date)) }} هـ
                  </v-chip>
                </div>
                <span v-else class="text-caption text-white opacity-30 italic">---</span>
              </v-col>

              <!-- Expiry Date -->
              <v-col cols="6">
                <span class="text-caption text-gold opacity-50 d-block mb-1">تاريخ الانتهاء</span>
                <div v-if="isValidDate(String(item.expiry_date))">
                  <span class="text-caption font-weight-black text-white d-block">
                    {{ formatDate(String(item.expiry_date)) }} مـ
                  </span>
                  <v-chip
                    size="x-small"
                    color="warning"
                    variant="flat"
                    class="mt-1 font-weight-black rounded-md"
                  >
                    {{ formatHijri(String(item.expiry_date)) }} هـ
                  </v-chip>
                </div>
                <span v-else class="text-caption text-white opacity-30 italic">---</span>
              </v-col>
            </v-row>

            <!-- Source (Court) -->
            <div class="d-flex align-center pt-3 border-t border-gold border-opacity-5">
              <LucideIcon name="landmark" :size="16" class="text-gold opacity-50 me-2" />
              <div>
                <span class="text-caption text-gold opacity-50 d-block">مصدر الوكالة</span>
                <span class="text-caption font-weight-bold text-white opacity-70">
                  {{ item.court || 'كتابة عدل عامة' }}
                </span>
              </div>
            </div>
          </v-card-text>

          <!-- Card Actions -->
          <div
            class="d-flex border-t border-gold border-opacity-10 bg-black bg-opacity-20 pa-2 justify-space-around"
          >
            <v-btn
              variant="text"
              color="accent"
              size="small"
              class="font-weight-black rounded-lg premium-btn-gold-gradient"
              @click="openPreviewDialog(item)"
            >
              <LucideIcon name="eye" :size="16" class="me-1" /> معاينة
            </v-btn>
            <v-btn
              variant="text"
              color="gold"
              size="small"
              class="font-weight-black rounded-lg premium-btn-gold-gradient"
              @click="openEditDialog(item)"
            >
              <LucideIcon name="edit-3" :size="16" class="me-1" /> تعديل
            </v-btn>
            <v-btn
              variant="text"
              color="error"
              size="small"
              class="font-weight-black rounded-lg premium-btn-gold-gradient"
              @click="confirmDelete(item)"
            >
              <LucideIcon name="trash-2" :size="16" class="me-1" /> حذف
            </v-btn>
          </div>
        </v-card>
      </div>
    </div>

    <!-- Preview Dialog -->
    <v-dialog
      v-model="previewDialog"
      width="90%"
      max-width="800"
      scrollable
      :fullscreen="isMobile"
      :transition="isMobile ? 'dialog-bottom-transition' : 'dialog-transition'"
    >
      <v-card class="poa-dialog-card overflow-hidden glass-card">
        <div class="poa-dialog-header d-flex align-center py-5 px-8">
          <div class="bg-accent-alpha pa-2 rounded-lg me-4">
            <LucideIcon name="eye" :size="24" class="text-accent" />
          </div>
          <span class="text-h5 font-weight-black text-gold">معاينة بيانات الوكالة</span>
          <v-spacer></v-spacer>
          <v-btn class="premium-btn-gold-gradient" variant="text" color="gold" icon @click="previewDialog = false">
            <LucideIcon name="x" :size="24" />
          </v-btn>
        </div>

        <v-card-text class="pa-8 modal-scrollable poa-dialog-body glass-card">
          <v-row dense>
            <v-col cols="12" md="6">
              <div class="detail-row mb-6">
                <span class="poa-preview-label mb-1">الرقم المرجعي الرسمي</span>
                <span class="text-h6 font-weight-black poa-preview-text d-block ltr-text">{{
                  previewItem?.agency_number || '—'
                }}</span>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="detail-row mb-6">
                <span class="poa-preview-label mb-1">الموكل صاحب الوكالة</span>
                <span class="text-h6 font-weight-black poa-preview-text d-block">{{
                  previewItem?.client_name || '—'
                }}</span>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="detail-row mb-6">
                <span class="poa-preview-label mb-1">تاريخ الاعتماد</span>
                <div class="d-flex align-center">
                  <span class="text-body-1 poa-preview-text font-weight-black"
                    >{{ previewItem?.date || '—' }} مـ</span
                  >
                  <v-chip
                    v-if="previewItem?.date"
                    size="x-small"
                    color="accent"
                    variant="flat"
                    class="ms-3 font-weight-black"
                  >
                    {{ formatHijri(String(previewItem?.date)) }} هـ
                  </v-chip>
                </div>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="detail-row mb-6">
                <span class="poa-preview-label mb-1">تاريخ الانتهاء</span>
                <div class="d-flex align-center">
                  <span class="text-body-1 poa-preview-text font-weight-black"
                    >{{ previewItem?.expiry_date || '—' }} مـ</span
                  >
                  <v-chip
                    v-if="previewItem?.expiry_date"
                    size="x-small"
                    color="warning"
                    variant="flat"
                    class="ms-3 font-weight-black"
                  >
                    {{ formatHijri(String(previewItem?.expiry_date)) }} هـ
                  </v-chip>
                </div>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="detail-row mb-6">
                <span class="poa-preview-label mb-1">مصدر الوكالة / جهة الإصدار</span>
                <span class="text-body-1 poa-preview-text font-weight-black d-block">{{
                  previewItem?.court || '—'
                }}</span>
              </div>
            </v-col>
            <v-col cols="12">
              <div class="detail-row mb-2">
                <span class="poa-preview-label mb-2"
                  >نطاق الوكالة / الصلاحيات الممنوحة</span
                >
                <div class="poa-preview-box pa-4 rounded-lg leading-relaxed shadow-sm">
                  {{ previewItem?.notes || 'لا توجد ملاحظات مسجلة لنطاق هذه الوكالة' }}
                </div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider class="border-gold opacity-20"></v-divider>
        <v-card-actions class="pa-8 poa-dialog-footer glass-card">
          <v-btn
            variant="flat"
            color="grey-darken-3"
            class="px-8 font-weight-black text-white premium-btn-gold-gradient"
            @click="previewDialog = false"
            >إغلاق</v-btn
          >
          <v-spacer></v-spacer>
          <v-btn
            v-if="previewItem?.client_id"
            color="accent"
            variant="tonal"
            class="px-8 font-weight-black rounded-lg me-3 premium-btn-gold-gradient"
            :to="'/clients/' + String(previewItem?.client_id)"
          >
            <LucideIcon name="user" :size="18" class="me-2" /> ملف الموكل
          </v-btn>
          <v-btn
            color="accent"
            variant="flat"
            size="large"
            class="px-12 font-weight-black rounded-lg premium-btn-gold-gradient"
            @click="handleEditFromPreview"
          >
            <LucideIcon name="edit-3" :size="18" class="me-2" /> تعديل البيانات
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add/Edit Agency Dialog -->
    <v-dialog
      v-model="showDialog"
      width="90%"
      max-width="800"
      persistent
      scrollable
      :fullscreen="isMobile"
      :transition="isMobile ? 'dialog-bottom-transition' : 'dialog-transition'"
    >
      <v-card class="poa-dialog-card overflow-hidden glass-card">
        <div class="poa-dialog-header d-flex align-center py-5 px-8">
          <div class="glass-panel-light pa-2 rounded-lg me-4 border-gold border-opacity-20">
            <LucideIcon :name="isEditing ? 'edit-3' : 'card-plus'" :size="24" class="text-accent" />
          </div>
          <span class="text-h5 font-weight-black text-gold">
            {{ isEditing ? 'تعديل بيانات الوكالة الشرعية' : 'تسجيل وكالة شرعية جديدة' }}
          </span>
          <v-spacer></v-spacer>
          <v-btn class="premium-btn-gold-gradient" variant="text" color="gold" icon @click="showDialog = false">
            <LucideIcon name="x" :size="24" />
          </v-btn>
        </div>

        <v-card-text class="pa-8 modal-scrollable poa-form poa-dialog-body glass-card">
          <v-form ref="formRef" v-model="formValid" lazy-validation>
            <v-row dense>
              <v-col cols="12">
                <label class="mb-2 font-weight-black text-gold">الموكل صاحب الوكالة*</label>
                <v-autocomplete
                  v-model="editItem.client_id"
                  :items="safeArray(clientsStore.clients)"
                  item-title="name"
                  item-value="id"
                  placeholder="ابحث عن اسم الموكل..."
                  variant="outlined"
                  class="glass-input glass-input"
                  :rules="[(v) => !!v || 'تعيين الموكل ضروري لإتمام التسجيل']"
                  no-data-text="لا يوجد موكلون مسجلون"
                  required
                >
                  <template #prepend-inner>
                    <LucideIcon name="user-cog" :size="20" class="text-gold opacity-50" />
                  </template>
                </v-autocomplete>
              </v-col>
              <v-col cols="12" md="4">
                <label class="mb-2 font-weight-black text-gold">رقم الوكالة الرسمي*</label>
                <v-text-field
                  v-model="editItem.agency_number"
                  placeholder="مثال: 44123456"
                  variant="outlined"
                  class="glass-input glass-input"
                  :rules="[(v) => !!v || 'رقم الوكالة مطلوب للتحقق النظامي']"
                  required
                />
              </v-col>
              <v-col cols="12" md="4">
                <label class="mb-2 font-weight-black text-gold">تاريخ صدور الوكالة*</label>
                <DualDatePicker v-model="editItem.date" />
              </v-col>
              <v-col cols="12" md="4">
                <label class="mb-2 font-weight-black text-gold">تاريخ انتهاء الوكالة</label>
                <DualDatePicker v-model="editItem.expiry_date" />
              </v-col>
              <v-col cols="12">
                <label class="mb-2 font-weight-black text-gold">جهة الإصدار (كتابة عدل / منصة ناجز)</v-label
                >
                <v-text-field
                  v-model="editItem.court"
                  placeholder="مثال: كتابة العدل الأولى بالرياض"
                  variant="outlined"
                  class="glass-input glass-input"
                >
                  <template #prepend-inner>
                    <LucideIcon name="landmark" :size="20" class="text-gold opacity-50" />
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="12">
                <label class="mb-2 font-weight-black text-gold">نطاق الوكالة / الصلاحيات الممنوحة</v-label
                >
                <v-textarea
                  v-model="editItem.notes"
                  placeholder="دون هنا الصلاحيات الأساسية (المرافعة، الحجز، قبض الثمن...)"
                  variant="outlined"
                  rows="3"
                  class="glass-input"
                >
                  <template #prepend-inner>
                    <LucideIcon name="sticky-note" :size="20" class="text-gold opacity-50" />
                  </template>
                </v-textarea>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-divider class="border-gold opacity-10"></v-divider>
        <v-card-actions class="pa-8 poa-dialog-footer glass-card">
          <v-btn
            variant="flat"
            size="large"
            class="px-8 font-weight-black premium-button-highlight action-btn-unified premium-btn-gold-gradient"
            @click="showDialog = false"
            >إلغاء</v-btn
          >
          <v-spacer></v-spacer>
          <v-btn
            variant="flat"
            size="large"
            class="px-12 font-weight-black premium-button-highlight action-btn-unified h-56 premium-btn-gold-gradient"
            :disabled="!formValid"
            :loading="saving"
            @click="handleSave"
          >
            {{ isEditing ? 'تحديث السجل' : 'اعتماد الوكالة' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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

    <ConfirmDialog
      v-model="confirmDialog.show"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :color="confirmDialog.color"
      :confirm-button-color="confirmDialog.confirmButtonColor"
      :icon="confirmDialog.icon"
      :confirm-text="confirmDialog.confirmText"
      :cancel-text="confirmDialog.cancelText"
      :loading="confirmDialog.loading"
      @confirm="confirmDialog.action"
    />
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useDisplay } from 'vuetify'
import { useAgenciesStore } from '../stores/agencies'
import { useClientsStore } from '../stores/clients'
import { Agency } from '../types'
import DualDatePicker from '../components/DualDatePicker.vue'
import { safeArray, isValidDate, safeLength } from '../utils/safe'
import { convertToHijri } from '../utils/hijri'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import { useConfirmDialog } from '../composables/useConfirmDialog'
import LucideIcon from '../components/common/LucideIcon.vue'

const store = useAgenciesStore()
const clientsStore = useClientsStore()

const { mobile, width } = useDisplay()
const isMobile = computed(() => mobile.value || width.value <= 1023)

const searchQuery = ref('')
const statusFilter = ref<'all' | 'active' | 'expired'>('all')

const isExpired = (expiryDateStr: string | undefined): boolean => {
  if (!expiryDateStr || !isValidDate(expiryDateStr)) return false
  const expiryDate = new Date(expiryDateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiryDate.setHours(0, 0, 0, 0)
  return expiryDate < today
}

const filteredAgencies = computed(() => {
  let list = safeArray(store.agencies)

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    list = list.filter((item: Agency) => {
      const agencyNum = String(item.agency_number || '').toLowerCase()
      const clientName = String(item.client_name || '').toLowerCase()
      const courtName = String(item.court || '').toLowerCase()
      return agencyNum.includes(query) || clientName.includes(query) || courtName.includes(query)
    })
  }

  if (statusFilter.value === 'active') {
    list = list.filter((item: Agency) => !isExpired(item.expiry_date))
  } else if (statusFilter.value === 'expired') {
    list = list.filter((item: Agency) => {
      return item.expiry_date && isValidDate(item.expiry_date) && isExpired(item.expiry_date)
    })
  }

  return list
})

const totalCount = computed(() => safeArray(store.agencies).length)
const activeCount = computed(
  () => safeArray(store.agencies).filter((item: Agency) => !isExpired(item.expiry_date)).length
)
const expiredCount = computed(
  () =>
    safeArray(store.agencies).filter(
      (item: Agency) =>
        item.expiry_date && isValidDate(item.expiry_date) && isExpired(item.expiry_date)
    ).length
)

const showDialog = ref(false)
const isEditing = ref(false)
const formValid = ref(false)
const formRef = ref<any>(null)
const saving = ref(false)

const deleting = ref(false)
const itemToDelete = ref<Agency | null>(null)

const previewDialog = ref(false)
const previewItem = ref<Agency | null>(null)

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const { confirmDialog, openConfirm, closeConfirm } = useConfirmDialog()

const headers = [
  { title: 'الرقم المرجعي للوكالة', key: 'agency_number', align: 'center' as const },
  { title: 'اسم الموكل (الموكِّل)', key: 'client_name', align: 'center' as const },
  { title: 'تاريخ الاعتماد', key: 'date', align: 'center' as const, width: '150px' },
  { title: 'تاريخ الانتهاء', key: 'expiry_date', align: 'center' as const, width: '150px' },
  { title: 'مصدر الوكالة', key: 'court', align: 'center' as const, width: '180px' },
  { title: 'إجراءات', key: 'actions', sortable: false, align: 'center' as const, width: '160px' }
]

const defaultItem: Partial<Agency> = {
  client_id: '',
  agency_number: '',
  date: new Date().toISOString().split('T')[0],
  expiry_date: '',
  court: '',
  notes: ''
}

const editItem = ref<Partial<Agency>>({ ...defaultItem })

onMounted(async (): Promise<void> => {
  await Promise.all([store.fetchAgencies(), clientsStore.fetchClients()])
})

const openAddDialog = (): void => {
  if (safeLength(clientsStore.clients) === 0) {
    showSnackbar('يرجى تسجيل موكل واحد على الأقل قبل إضافة وكالة قانونية', 'error')
    return
  }
  isEditing.value = false
  editItem.value = { ...defaultItem }
  showDialog.value = true
}

const openEditDialog = (item: Agency): void => {
  isEditing.value = true
  editItem.value = { ...item }
  showDialog.value = true
}

const openPreviewDialog = (item: Agency): void => {
  previewItem.value = item
  previewDialog.value = true
}

const handleEditFromPreview = (): void => {
  if (previewItem.value) {
    const item = { ...previewItem.value }
    previewDialog.value = false
    openEditDialog(item)
  }
}

const executeSave = async (): Promise<void> => {
  if (!formRef.value) return
  const { valid } = await formRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const dataToSave = JSON.parse(JSON.stringify(editItem.value))
    dataToSave.expiry_date = dataToSave.expiry_date || ''
    if (isEditing.value && dataToSave.id) {
      await store.updateAgency(dataToSave.id, dataToSave)
      showSnackbar('تم تحديث بيانات الوكالة بنجاح', 'success')
    } else {
      await store.addAgency(dataToSave)
      showSnackbar('تم توثيق الوكالة الجديدة بملف الموكل', 'success')
    }
    showDialog.value = false
  } catch (e: unknown) {
    showSnackbar('تعذر أرشفة الوكالة: ' + (e as Error).message, 'error')
  } finally {
    saving.value = false
  }
}

const handleSave = async (): Promise<void> => {
  openConfirm({
    title: isEditing.value ? 'تأكيد تحديث الوكالة' : 'تأكيد توثيق الوكالة',
    message: isEditing.value
      ? 'هل أنت متأكد من رغبتك في حفظ التعديلات على سجل الوكالة؟'
      : 'هل أنت متأكد من رغبتك في اعتماد وتوثيق هذه الوكالة ضمن ملف الموكل؟',
    color: 'success',
    confirmButtonColor: 'success',
    icon: 'check',
    confirmText: 'نعم، احفظ',
    cancelText: 'تراجع',
    action: async () => {
      confirmDialog.value.loading = true
      try {
        await executeSave()
        closeConfirm()
      } finally {
        confirmDialog.value.loading = false
      }
    }
  })
}

const confirmDelete = (item: Agency): void => {
  itemToDelete.value = item
  openConfirm({
    title: 'تأكيد حذف الوكالة نهائياً',
    message: `هل أنت متأكد من إبطال وحذف الوكالة رقم:\n${item.agency_number || ''}\n\nتحذير: لا يمكن التراجع عن هذا الإجراء.`,
    color: 'error',
    confirmButtonColor: 'error',
    icon: 'trash-2',
    confirmText: 'موافق',
    cancelText: 'إلغاء الأمر',
    action: async () => {
      confirmDialog.value.loading = true
      try {
        await handleDelete()
        closeConfirm()
      } finally {
        confirmDialog.value.loading = false
      }
    }
  })
}

const handleDelete = async (): Promise<void> => {
  if (!itemToDelete.value) return
  deleting.value = true
  try {
    await store.deleteAgency(itemToDelete.value.id)
    showSnackbar('تم إبطال وإزالة الوكالة من سجل الحماية بنجاح', 'success')
  } catch (e: unknown) {
    showSnackbar('فشل في إزالة السجل: ' + (e as Error).message, 'error')
  } finally {
    deleting.value = false
    itemToDelete.value = null
  }
}

const formatDate = (dateString: string | undefined): string => {
  if (!isValidDate(dateString)) return '-'
  return new Date(dateString as string).toLocaleDateString('ar-SA')
}

const formatHijri = (date: string): string => {
  if (!isValidDate(date)) return '-'
  return convertToHijri(new Date(date))
}

const showSnackbar = (text: string, color: string = 'success'): void => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}
</script>

<style scoped>
:root {
  --glass-bg-soft: rgba(0, 0, 0, 0.2);
  --glass-border: rgba(255, 255, 255, 0.12);
  --color-background: #101113;
}

.poa-table :deep(th) {
  background: rgba(233, 195, 73, 0.05) !important;
  color: #e9c349 !important;
  font-weight: 900 !important;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 0.75rem !important;
  border-bottom: 1px solid rgba(233, 195, 73, 0.2) !important;
}

.poa-table :deep(td) {
  border-bottom: 1px solid rgba(233, 195, 73, 0.05) !important;
}

.hover-gold:hover {
  color: #e9c349 !important;
}

.modal-scrollable {
  max-height: calc(100vh - 280px);
  overflow-y: auto;
}

.min-h-500 {
  min-height: 500px;
}

.leading-relaxed {
  line-height: 1.6;
}

.ltr-text {
  direction: ltr;
  display: inline-block;
}

.detail-row {
  display: flex;
  flex-direction: column;
}

.poa-form :deep(.glass-input .v-field__outline) {
  --v-field-border-opacity: 1 !important;
  color: #000000 !important;
}

.poa-form :deep(.glass-input .v-field__outline__start),
.poa-form :deep(.glass-input .v-field__outline__notch),
.poa-form :deep(.glass-input .v-field__outline__end) {
  border-color: #000000 !important;
}

.poa-form :deep(.glass-input input),
.poa-form :deep(.glass-input .v-field__input),
.poa-form :deep(.glass-input .v-select__selection-text) {
  color: #000000 !important;
  font-weight: 800;
}

.premium-button-highlight {
  background: #ffffff !important;
  color: #000000 !important;
  border: 1px solid rgba(233, 195, 73, 0.6) !important;
  border-radius: 12px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
  transition: all 0.3s ease !important;
}

.premium-button-highlight:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15) !important;
  border-color: rgba(233, 195, 73, 0.8) !important;
}

.premium-button-highlight.v-btn--disabled {
  background: #f5f5f5 !important;
  color: #9e9e9e !important;
  border-color: #e0e0e0 !important;
  opacity: 1 !important;
}

.modal-footer-solid {
  background: #ffffff !important;
  opacity: 1 !important;
  border-top: 1px solid rgba(233, 195, 73, 0.2) !important;
}

.action-btn-unified {
  min-width: 180px !important;
}

.search-input :deep(.v-field) {
  border-radius: 16px !important;
  background: rgba(255, 255, 255, 0.03) !important;
  border: 1px solid rgba(233, 195, 73, 0.15) !important;
  transition: all 0.3s ease;
}

.search-input :deep(.v-field--focused) {
  border-color: rgba(233, 195, 73, 0.6) !important;
  background: rgba(255, 255, 255, 0.06) !important;
}

.search-input :deep(input) {
  color: #ffffff !important;
  font-weight: 800;
}

.glass-toggle {
  background: rgba(255, 255, 255, 0.02) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(233, 195, 73, 0.15) !important;
}

.active-toggle-btn {
  background: rgba(233, 195, 73, 0.15) !important;
  border-bottom: 2px solid #e9c349 !important;
}

.mobile-cards-container {
  padding-bottom: 24px;
}

.border-accent {
  border-color: var(--v-theme-accent) !important;
}

.text-gold {
  color: #e9c349 !important;
}

.text-accent {
  color: var(--v-theme-accent) !important;
}

.text-tiny {
  font-size: 0.7rem !important;
}

.gap-2 {
  gap: 8px;
}

.gap-4 {
  gap: 16px;
}

/* Glass Dialog Styling matching Figma mockups */
.poa-dialog-card {
  background: rgba(15, 23, 42, 0.95) !important;
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border: 1px solid rgba(233, 195, 73, 0.25) !important;
  border-radius: 24px !important;
}

.poa-dialog-header {
  background: rgba(0, 0, 0, 0.2) !important;
  border-bottom: 1px solid rgba(233, 195, 73, 0.15) !important;
}

.poa-dialog-footer {
  background: rgba(0, 0, 0, 0.2) !important;
  border-top: 1px solid rgba(233, 195, 73, 0.15) !important;
}

.poa-preview-text {
  color: #ffffff !important;
}

.poa-preview-label {
  color: #e9c349 !important;
  font-weight: 800 !important;
  font-size: 0.85rem !important;
}

.poa-preview-box {
  background: rgba(0, 0, 0, 0.3) !important;
  border: 1px solid rgba(233, 195, 73, 0.15) !important;
  color: #ffffff !important;
  border-radius: 12px;
}

.poa-form :deep(.v-label) {
  color: #e9c349 !important;
  font-weight: 800 !important;
  font-size: 0.95rem !important;
  margin-bottom: 6px !important;
}

.poa-form :deep(.v-field) {
  background: rgba(0, 0, 0, 0.4) !important;
  border-radius: 14px !important;
  border: 1px solid rgba(233, 195, 73, 0.25) !important;
  transition: all 0.3s ease;
}

.poa-form :deep(.v-field--focused) {
  border-color: #e9c349 !important;
  box-shadow: 0 0 12px rgba(233, 195, 73, 0.2) !important;
}

.poa-form :deep(input),
.poa-form :deep(textarea),
.poa-form :deep(.v-select__selection-text) {
  color: #ffffff !important;
  font-weight: 600 !important;
}

/* Mobile (<=1023px only) */
@media (max-width: 1023px) {
  :deep(.v-row.mb-8.align-center > .v-col-auto) {
    flex: 0 0 100% !important;
    max-width: 100% !important;
    margin-top: 8px;
  }
  :deep(.v-row.mb-8.align-center > .v-col-auto .v-btn) {
    width: 100% !important;
  }
  :deep(.v-table) {
    overflow-x: auto !important;
    display: block !important;
  }
  :deep(.v-table thead th) {
    white-space: nowrap !important;
    font-size: 0.7rem !important;
    padding: 8px !important;
  }
  :deep(.v-table tbody td) {
    padding: 8px !important;
    font-size: 0.78rem !important;
    padding: 8px !important;
  }
  :deep(.v-data-table .v-table__wrapper) {
    overflow-x: auto !important;
  }
  :deep(.v-dialog > .v-overlay__content) {
    width: 95vw !important;
    max-width: 95vw !important;
    margin: 8px !important;
  }
  :deep(.v-card-text.pa-8) {
    padding: 12px !important;
  }
  :deep(.v-card-actions.pa-8) {
    padding: 12px !important;
    flex-wrap: wrap !important;
    gap: 8px !important;
  }
  :deep(.v-card-actions .v-spacer) {
    display: none !important;
  }
  :deep(.v-card-actions .v-btn) {
    flex: 1 1 auto !important;
    min-width: 100px !important;
  }
}
</style>
