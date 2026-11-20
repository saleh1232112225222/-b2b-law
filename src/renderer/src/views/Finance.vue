<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <MobileFinance
      v-if="isMobile"
      @add-transaction="openAddDialog"
      @add-invoice="openAddDialog"
      @add-receivable="openAddDialog"
    />
    <template v-else>
      <!-- Header -->
      <v-row dense class="mb-8 align-center">
        <v-col>
          <div class="d-flex align-center">
            <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
              <LucideIcon name="banknote" :size="36" class="text-accent" />
            </div>
            <div>
              <h1 class="text-h5 font-weight-black text-gold mb-1">المنظومة المالية والمحاسبية</h1>
              <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
                إدارة التدفقات النقدية، المصاريف التشغيلية، وصافي الربحية للمكتب
              </p>
            </div>
          </div>
        </v-col>
        <v-col cols="auto">
          <v-btn
            color="accent"
            size="large"
            class="font-weight-black rounded-lg px-8 premium-lift h-100 premium-btn-gold-gradient"
            @click="openAddDialog"
          >
            <LucideIcon name="plus-circle" :size="20" class="me-3" /> تسجيل حركة مالية
          </v-btn>
          <v-btn
            color="error"
            variant="outlined"
            size="large"
            class="font-weight-black rounded-lg px-8 premium-lift h-100 ms-3 premium-btn-gold-gradient"
            @click="showCreditNoteDialog = true"
          >
            <LucideIcon name="file-minus" :size="20" class="me-3" /> إصدار إشعار دائن
          </v-btn>
        </v-col>
      </v-row>

      <!-- Stats Summary Cards (Interactive / Clickable) -->
      <v-row class="mb-6" dense>
        <v-col v-for="(stat, key) in statCards" :key="key" cols="12" sm="6" md="3">
          <v-card
            elevation="0"
            class="glass-card premium-hover pa-5 position-relative overflow-hidden h-100 kpi-clickable-card"
            :class="{ 'kpi-card-active': activeKpiKey === stat.key }"
            @click="onKpiCardClick(stat.key)"
          >
            <v-skeleton-loader
              v-if="loading || !stats"
              type="list-item-two-line"
              class="bg-transparent"
            ></v-skeleton-loader>
            <div v-else class="position-relative z-index-1">
              <div class="d-flex align-center justify-space-between mb-2">
                <div
                  class="text-tiny font-weight-black text-gold opacity-80 uppercase tracking-widest"
                >
                  {{ stat.title }}
                </div>
                <v-chip
                  size="x-small"
                  :color="activeKpiKey === stat.key ? 'primary' : 'default'"
                  variant="tonal"
                  class="font-weight-bold"
                >
                  {{ stat.actionHint }}
                </v-chip>
              </div>
              <div
                class="text-h5 font-weight-black d-flex align-baseline finance-num"
                :class="stat.textColor"
              >
                {{ formatCurrency(stat.value) }}
                <span class="text-subtitle-2 ms-2 font-weight-bold opacity-60">SAR</span>
              </div>
              <div v-if="stat.subtitle" class="text-caption opacity-75 mt-1 font-weight-bold">
                {{ stat.subtitle }}
              </div>
            </div>
            <LucideIcon
              :name="stat.icon"
              :size="72"
              class="position-absolute opacity-5"
              style="bottom: -10px; left: -10px"
            />
          </v-card>
        </v-col>
      </v-row>

      <!-- Cash Flow Chart (Last 6 Months — SQLite Driven) -->
      <CashFlowChart :items="cashFlow" :loading="loading" />

      <!-- Main Content Tabs -->
      <v-card elevation="0" class="glass-card overflow-hidden glass-card">
        <div class="glass-panel px-6 pt-2">
          <v-tabs v-model="tab" color="accent" align-tabs="start" class="premium-tabs">
            <v-tab value="transactions" class="font-weight-black">
              <LucideIcon name="list" :size="18" class="me-2" /> سجل العمليات
            </v-tab>
            <v-tab value="invoices" class="font-weight-black">
              <LucideIcon name="file-text" :size="18" class="me-2" /> الفواتير
            </v-tab>
            <v-tab value="vouchers" class="font-weight-black">
              <LucideIcon name="receipt" :size="18" class="me-2" /> السندات
            </v-tab>
            <v-tab value="receivables" class="font-weight-black">
              <LucideIcon name="wallet" :size="18" class="me-2" /> الذمم
            </v-tab>
            <v-tab value="accounts" class="font-weight-black">
              <LucideIcon name="git-branch" :size="18" class="me-2" /> شجرة الحسابات
            </v-tab>
            <v-tab value="reports" class="font-weight-black">
              <LucideIcon name="pie-chart" :size="18" class="me-2" /> تقارير الأداء
            </v-tab>
            <v-tab value="legal-finance" class="font-weight-black">
              <LucideIcon name="scale" :size="18" class="me-2" /> الخدمات القانونية
            </v-tab>
            <v-tab value="office-accounts" class="font-weight-black">
              <LucideIcon name="landmark" :size="18" class="me-2" /> حسابات المكتب
            </v-tab>
            <v-tab value="client-statement" class="font-weight-black">
              <LucideIcon name="file-text" :size="18" class="me-2" /> كشف حساب عميل
            </v-tab>
            <v-tab value="client-full-profile" class="font-weight-black">
              <LucideIcon name="account-details" :size="18" class="me-2" /> الملف المالي الشامل
            </v-tab>
            <v-tab value="office-management" class="font-weight-black">
              <LucideIcon name="office-building" :size="18" class="me-2" /> ميزانية التوزيع وأصحاب
              الربح
            </v-tab>
          </v-tabs>
        </div>
        <v-divider class="border-gold opacity-10" />

        <v-card-text class="pa-0 glass-card">
          <v-window v-model="tab">
            <!-- Transactions Tab -->
            <v-window-item value="transactions">
              <div class="glass-panel-light pa-6 border-b">
                <v-row dense align="center">
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="localSearch"
                      placeholder="بحث في السجل العام (الموكل، رقم القضية، البيان)..."
                      variant="outlined"
                      density="comfortable"
                      hide-details
                      class="glass-input"
                      clearable
                    >
                      <template #prepend-inner>
                        <LucideIcon name="search" :size="20" class="text-gold opacity-50" />
                      </template>
                    </v-text-field>
                  </v-col>
                  <v-col cols="6" md="3">
                    <v-select
                      v-model="filterType"
                      :items="[
                        { title: 'جميع الحركات (إيراد ومصروف)', value: 'all' },
                        { title: 'الإيرادات والأتعاب فقط', value: 'income' },
                        { title: 'المصروفات فقط', value: 'expense' }
                      ]"
                      variant="outlined"
                      density="comfortable"
                      hide-details
                      class="glass-input"
                    />
                  </v-col>
                  <v-col cols="6" md="3">
                    <v-select
                      v-model="filterCategory"
                      :items="allCategoriesFilterList"
                      label="تصفية حسب نوع المصروف / التصنيف"
                      variant="outlined"
                      density="comfortable"
                      hide-details
                      clearable
                      class="glass-input"
                    />
                  </v-col>
                  <v-spacer></v-spacer>
                  <v-col cols="auto">
                    <v-btn
                      variant="text"
                      color="gold"
                      class="rounded-lg opacity-70 premium-btn-gold-gradient"
                      :loading="loading"
                      @click="financeStore.fetchFinanceData()"
                    >
                      <LucideIcon name="refresh-cw" :size="20" class="me-2" />
                      <span class="font-weight-black">تحديث البيانات</span>
                    </v-btn>
                  </v-col>
                </v-row>
              </div>

              <v-data-table
                :headers="headers"
                :items="safeArray(transactions)"
                :loading="loading || transactionsLoading"
                class="bg-transparent premium-table finance-accountant-table"
                hover
                :items-per-page="15"
                items-per-page-text="عدد العمليات في الصفحة:"
              >
                <template #[`item.type`]="{ item }">
                  <v-chip
                    :color="(item as Transaction).type === 'income' ? 'green-darken-3' : 'error'"
                    size="x-small"
                    variant="flat"
                    class="font-weight-black rounded-md px-3"
                  >
                    <LucideIcon
                      :name="
                        (item as Transaction).type === 'income'
                          ? 'arrow-down-left'
                          : 'arrow-up-right'
                      "
                      :size="12"
                      class="me-1"
                    />
                    {{ (item as Transaction).type === 'income' ? 'إيراد' : 'مصروف' }}
                  </v-chip>
                </template>

                <template #[`item.display_entity`]="{ item }">
                  <div class="d-flex flex-column text-right py-2">
                    <span class="font-weight-black text-high-emphasis">
                      {{ (item as Transaction).client_name || 'تشغيلي - للمكتب' }}
                    </span>
                    <div
                      v-if="(item as Transaction).case_number"
                      class="text-tiny font-weight-black text-primary d-flex align-center mt-1"
                    >
                      <LucideIcon name="gavel" :size="12" class="me-1" />
                      رقم القضية: {{ (item as Transaction).case_number }}
                    </div>
                  </div>
                </template>

                <template #[`item.description`]="{ item }">
                  <span class="text-high-emphasis opacity-90 text-body-2 font-weight-medium">
                    {{ (item as Transaction).description || '---' }}
                  </span>
                </template>

                <template #[`item.amount`]="{ item }">
                  <div
                    class="font-weight-black text-left finance-num"
                    :class="
                      (item as Transaction).type === 'income' ? 'text-green-darken-2' : 'text-error'
                    "
                  >
                    <span class="me-1">{{ formatCurrency((item as Transaction).amount) }}</span>
                    <span class="text-tiny opacity-60">SAR</span>
                  </div>
                </template>

                <template #[`item.date`]="{ item }">
                  <div class="text-tiny font-weight-black text-medium-emphasis font-mono">
                    {{ formatDateOnly((item as Transaction).date) }}
                  </div>
                </template>

                <template #[`item.account_name`]="{ item }">
                  <span class="text-high-emphasis opacity-85 font-weight-bold">{{
                    (item as Transaction).account_name || 'الصندوق / البنك'
                  }}</span>
                </template>

                <template #[`item.category`]="{ item }">
                  <v-chip size="x-small" variant="tonal" color="primary" class="font-weight-black">
                    {{ (item as Transaction).category || 'عام' }}
                  </v-chip>
                </template>

                <template #[`item.actions`]="{ item }">
                  <div class="d-flex align-center justify-end gap-1">
                    <v-btn
                      v-if="(item as any).linked_invoice_id"
                      size="x-small"
                      color="success"
                      variant="tonal"
                      class="font-weight-black"
                      title="طباعة وتصدير الفاتورة المرتبطة"
                      @click="printLinkedInvoice((item as any).linked_invoice_id)"
                    >
                      <LucideIcon name="printer" :size="14" class="me-1" />
                      فاتورة
                    </v-btn>
                    <v-btn
                      v-else
                      size="x-small"
                      color="primary"
                      variant="tonal"
                      class="font-weight-black"
                      title="إصدار فاتورة للعميل عن هذه العملية"
                      @click="openIssueInvoiceForTx(item as any)"
                    >
                      <LucideIcon name="file-text" :size="14" class="me-1" />
                      إصدار فاتورة
                    </v-btn>
                    <v-btn
                      icon
                      variant="text"
                      color="primary"
                      size="small"
                      title="تعديل العملية"
                      @click="openEditDialog(item as Transaction)"
                    >
                      <LucideIcon name="edit-2" :size="16" />
                    </v-btn>
                    <v-btn
                      icon
                      variant="text"
                      color="error"
                      size="small"
                      class="premium-hover opacity-70"
                      title="حذف العملية"
                      @click="confirmDelete(item as Transaction)"
                    >
                      <LucideIcon name="trash-2" :size="18" />
                    </v-btn>
                  </div>
                </template>

                <template #no-data>
                  <div class="pa-12 text-center">
                    <LucideIcon name="database-zap" :size="64" class="mb-4 opacity-10" />
                    <div class="text-h6 text-gold opacity-30 font-weight-black">
                      لا توجد حركات مالية مسجلة في هذا النطاق
                    </div>
                  </div>
                </template>
              </v-data-table>
            </v-window-item>

            <v-window-item value="invoices">
              <InvoicesList :status-filter="invoicesStatusFilter" />
            </v-window-item>
            <v-window-item value="vouchers"><VouchersList /></v-window-item>
            <v-window-item value="receivables"><ReceivablesList /></v-window-item>
            <v-window-item value="accounts"><AccountsChart /></v-window-item>
            <v-window-item value="reports"><ProfitabilityReport /></v-window-item>
            <v-window-item value="legal-finance">
              <div class="pa-6">
                <div class="d-flex align-center justify-space-between mb-6">
                  <div class="text-subtitle-1 font-weight-black text-gold">
                    ملخص الخدمات القانونية المالية
                  </div>
                  <v-btn
                    variant="text"
                    color="accent"
                    class="rounded-lg font-weight-black"
                    :loading="legalFinanceLoading"
                    @click="loadLegalFinanceData"
                  >
                    <LucideIcon name="refresh-cw" :size="18" class="me-2" /> تحديث
                  </v-btn>
                </div>
                <v-row dense class="mb-6">
                  <v-col cols="12" sm="6" md="3">
                    <v-card
                      elevation="0"
                      class="pa-5 rounded-xl border border-gold border-opacity-20 glass-card text-center"
                    >
                      <div class="text-caption font-weight-black text-gold opacity-60 mb-2">
                        إجمالي الخدمات
                      </div>
                      <div class="text-h5 font-weight-black text-white">
                        {{ legalFinanceStats.total_services || 0 }}
                      </div>
                    </v-card>
                  </v-col>
                  <v-col cols="12" sm="6" md="3">
                    <v-card
                      elevation="0"
                      class="pa-5 rounded-xl border border-success border-opacity-20 glass-card text-center"
                    >
                      <div class="text-caption font-weight-black text-gold opacity-60 mb-2">
                        إجمالي المقابل المالي
                      </div>
                      <div class="text-h5 font-weight-black text-success">
                        {{ formatCurrency(legalFinanceStats.total_compensation || 0) }}
                      </div>
                    </v-card>
                  </v-col>
                  <v-col cols="12" sm="6" md="3">
                    <v-card
                      elevation="0"
                      class="pa-5 rounded-xl border border-accent border-opacity-20 glass-card text-center"
                    >
                      <div class="text-caption font-weight-black text-gold opacity-60 mb-2">
                        المحصل فعلياً
                      </div>
                      <div class="text-h5 font-weight-black text-accent">
                        {{ formatCurrency(legalFinanceStats.total_paid || 0) }}
                      </div>
                    </v-card>
                  </v-col>
                  <v-col cols="12" sm="6" md="3">
                    <v-card
                      elevation="0"
                      class="pa-5 rounded-xl border border-error border-opacity-20 glass-card text-center"
                    >
                      <div class="text-caption font-weight-black text-gold opacity-60 mb-2">
                        المتبقي المستحق
                      </div>
                      <div class="text-h5 font-weight-black text-error">
                        {{ formatCurrency(legalFinanceStats.total_remaining || 0) }}
                      </div>
                    </v-card>
                  </v-col>
                </v-row>
                <v-data-table
                  :headers="legalFinanceHeaders"
                  :items="legalFinanceList"
                  class="bg-transparent premium-table"
                  hover
                  :items-per-page="10"
                  no-data-text="لا توجد خدمات قانونية مسجلة"
                >
                  <template #[`item.engagement_number`]="{ item }">
                    <v-btn
                      variant="text"
                      color="accent"
                      class="px-0 font-weight-black text-decoration-underline ltr-text"
                      density="compact"
                      @click="$router.push('/legal-engagements/' + item.id)"
                    >
                      {{ item.engagement_number }}
                    </v-btn>
                  </template>
                  <template #[`item.client_name`]="{ item }">
                    <span class="font-weight-black text-white">{{ item.client_name || '-' }}</span>
                  </template>
                  <template #[`item.financial_compensation`]="{ item }">
                    <span class="font-weight-black text-accent">{{
                      formatCurrency(item.financial_compensation || 0)
                    }}</span>
                  </template>
                  <template #[`item.paid_amount`]="{ item }">
                    <span class="font-weight-black text-success">{{
                      formatCurrency(item.paid_amount || 0)
                    }}</span>
                  </template>
                  <template #[`item.remaining_amount`]="{ item }">
                    <span class="font-weight-black text-error">{{
                      formatCurrency(item.remaining_amount || 0)
                    }}</span>
                  </template>
                </v-data-table>
              </div>
            </v-window-item>
            <v-window-item value="office-accounts">
              <OfficeAccountsReport />
            </v-window-item>
            <v-window-item value="client-statement">
              <ClientFinancialStatement />
            </v-window-item>
            <v-window-item value="client-full-profile">
              <ClientFullProfile />
            </v-window-item>
            <v-window-item value="office-management">
              <OfficeManagementDashboard />
            </v-window-item>
          </v-window>
        </v-card-text>
      </v-card>
    </template>

    <v-dialog v-model="showDialog" width="90%" max-width="850" persistent scrollable>
      <v-card
        v-if="showDialog"
        class="rounded-xl elevation-24 overflow-hidden modal-card glass-card"
      >
        <v-toolbar color="rgba(15, 23, 42, 0.95)" class="px-8 border-b text-white" height="72">
          <div class="bg-gold-alpha pa-2 rounded-lg me-4">
            <LucideIcon :name="isEditingTx ? 'edit-3' : 'plus-circle'" :size="24" class="text-gold" />
          </div>
          <v-toolbar-title class="text-h5 font-weight-black text-white">
            {{ isEditingTx ? 'تعديل القيد المالي' : 'إدراج عملية مالية جديدة' }}
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn
            icon
            variant="text"
            size="small"
            class="rounded-lg premium-btn-gold-gradient"
            color="white"
            @click="closeDialog"
          >
            <LucideIcon name="x" :size="24" class="text-white" />
          </v-btn>
        </v-toolbar>

        <v-card-text class="pa-8 modal-scrollable glass-card">
          <v-form ref="formRef" v-model="formValid">
            <v-row>
              <!-- Transaction Type Switch -->
              <v-col cols="12" class="mb-4">
                <div class="glass-panel-light pa-1 rounded-xl border overflow-hidden">
                  <v-btn-toggle
                    v-model="editItem.type"
                    mandatory
                    color="gold"
                    class="w-100 rounded-lg overflow-hidden bg-white border-gold-alpha premium-btn-gold-gradient"
                    variant="flat"
                    density="comfortable"
                  >
                    <v-btn
                      value="income"
                      class="flex-grow-1 h-48 font-weight-black text-gold premium-btn-gold-gradient"
                      :active="editItem.type === 'income'"
                    >
                      <LucideIcon name="trending-up" :size="18" class="me-2" /> إيراد / أتعاب
                    </v-btn>
                    <v-btn
                      value="expense"
                      class="flex-grow-1 h-48 font-weight-black text-gold premium-btn-gold-gradient"
                      :active="editItem.type === 'expense'"
                    >
                      <LucideIcon name="trending-down" :size="18" class="me-2" /> مصروفات تشغيلية / قضائية
                    </v-btn>
                  </v-btn-toggle>
                </div>
              </v-col>

              <v-col v-if="editItem.type === 'expense'" cols="12" md="6">
                <label class="mb-2 font-weight-black text-gold">وجهة صرف المبلغ*</label>
                <v-select
                  v-model="editItem.expense_owner_type"
                  :items="expenseOwnerTypes"
                  variant="outlined"
                  class="glass-input"
                  :rules="[(v) => !!v || 'وجهة الصرف مطلوبة']"
                >
                  <template #prepend-inner>
                    <LucideIcon name="share-2" :size="20" class="text-gold opacity-50" />
                  </template>
                </v-select>
              </v-col>

              <v-col :cols="12" :md="editItem.type === 'expense' ? 6 : 12">
                <label class="mb-2 font-weight-black text-gold">
                  {{ editItem.type === 'expense' ? 'نوع المصروف (مرتبط بالميزانية)*' : 'تصنيف الإيراد*' }}
                </label>
                <v-combobox
                  v-model="editItem.category"
                  :items="currentCategoryOptions"
                  variant="outlined"
                  class="glass-input"
                  placeholder="اختر أو اكتب التصنيف..."
                  :rules="[(v) => !!v || 'التصنيف مطلوب']"
                >
                  <template #prepend-inner>
                    <LucideIcon name="tag" :size="20" class="text-gold opacity-50" />
                  </template>
                </v-combobox>
              </v-col>

              <v-col v-if="shouldShowClientSelector" cols="12" md="6">
                <label class="mb-2 font-weight-black text-gold">
                  الموكل المعني{{ editItem.expense_owner_type === 'client' ? '*' : ' (اختياري أو مرتبط بالقضية)' }}
                </label>
                <v-autocomplete
                  v-model="editItem.client_id"
                  :items="safeArray(lookupClients)"
                  item-title="name"
                  item-value="id"
                  placeholder="اختر الموكل..."
                  variant="outlined"
                  class="glass-input"
                  :loading="loadingLookups"
                  clearable
                  :rules="
                    editItem.expense_owner_type === 'client'
                      ? [(v) => !!v || 'اختيار الموكل إلزامي لهذا النوع']
                      : []
                  "
                >
                  <template #prepend-inner>
                    <LucideIcon name="user" :size="20" class="text-gold opacity-50" />
                  </template>
                </v-autocomplete>
              </v-col>

              <v-col v-if="shouldShowCaseSelector" cols="12" md="6">
                <label class="mb-2 font-weight-black text-gold">ملف القضية المتأثر*</label>
                <v-autocomplete
                  v-model="editItem.case_id"
                  :items="safeArray(filteredCasesForLink)"
                  item-value="id"
                  item-title="displayLabel"
                  placeholder="رقم القضية (إلزامي للإيرادات والمصروفات القضائية)..."
                  variant="outlined"
                  class="glass-input"
                  :loading="loadingLookups"
                  no-data-text="لا يوجد قضايا للموكل المحدد"
                  clearable
                  :rules="[(v) => !!v || 'رقم القضية إلزامي لضمان النزاهة المحاسبية']"
                >
                  <template #prepend-inner>
                    <LucideIcon name="gavel" :size="20" class="text-gold opacity-50" />
                  </template>
                </v-autocomplete>
              </v-col>

              <!-- Live Case Financial Summary Banner -->
              <v-col v-if="selectedCaseFinancials" cols="12">
                <v-card variant="tonal" color="primary" class="pa-4 rounded-xl border">
                  <div class="d-flex align-center justify-space-between flex-wrap gap-2">
                    <div class="d-flex align-center">
                      <LucideIcon name="briefcase" :size="18" class="me-2 text-primary" />
                      <span class="font-weight-black text-body-2">
                        الموقف المالي للقضية رقم ({{ selectedCaseFinancials.caseNumber }}):
                      </span>
                    </div>
                    <v-btn
                      v-if="editItem.type === 'income' && selectedCaseFinancials.remainingFee > 0"
                      size="x-small"
                      color="primary"
                      variant="flat"
                      class="font-weight-bold"
                      @click="editItem.amount = selectedCaseFinancials.remainingFee"
                    >
                      تعبئة المتبقي ({{ formatCurrency(selectedCaseFinancials.remainingFee) }} ر.س)
                    </v-btn>
                  </div>
                  <v-row dense class="mt-2 text-caption font-weight-bold">
                    <v-col cols="6" sm="3">
                      <div class="opacity-70">إجمالي أتعاب القضية:</div>
                      <div class="text-body-2 font-weight-black">
                        {{ formatCurrency(selectedCaseFinancials.totalFee) }} ر.س
                      </div>
                    </v-col>
                    <v-col cols="6" sm="3">
                      <div class="opacity-70">المدفوع سابقاً:</div>
                      <div class="text-body-2 font-weight-black text-success">
                        {{ formatCurrency(selectedCaseFinancials.paidAmount) }} ر.س
                      </div>
                    </v-col>
                    <v-col cols="6" sm="3">
                      <div class="opacity-70">المتبقي من الأتعاب:</div>
                      <div class="text-body-2 font-weight-black text-warning">
                        {{ formatCurrency(selectedCaseFinancials.remainingFee) }} ر.س
                      </div>
                    </v-col>
                    <v-col cols="6" sm="3">
                      <div class="opacity-70">مصروفات القضية:</div>
                      <div class="text-body-2 font-weight-black text-error">
                        {{ formatCurrency(selectedCaseFinancials.expensesAmount) }} ر.س
                      </div>
                    </v-col>
                  </v-row>
                </v-card>
              </v-col>

              <v-col cols="12" md="6">
                <label class="mb-2 font-weight-black text-gold">المبلغ النقدي الأساسي*</label>
                <v-text-field
                  v-model.number="editItem.amount"
                  type="number"
                  variant="outlined"
                  class="glass-input"
                  prefix="SAR"
                  :rules="[(v) => !!v || 'المبلغ مطلوب', (v) => v > 0 || 'يجب إدخال مبلغ صحيح']"
                >
                  <template #prepend-inner>
                    <LucideIcon name="dollar-sign" :size="20" class="text-accent opacity-50" />
                  </template>
                </v-text-field>
              </v-col>

              <v-col cols="12" md="6">
                <label class="mb-2 font-weight-black text-gold">وعاء الضريبة (VAT)*</label>
                <v-select
                  v-model.number="editItem.vat_rate"
                  :items="vatRates"
                  variant="outlined"
                  class="glass-input"
                >
                  <template #prepend-inner>
                    <LucideIcon name="percent" :size="20" class="text-gold opacity-50" />
                  </template>
                </v-select>
              </v-col>

              <v-col cols="12" md="6">
                <label class="mb-2 font-weight-black text-gold">الحساب المالي المتأثر*</label>
                <v-select
                  v-model="editItem.account_id"
                  :items="safeArray(filteredAccounts)"
                  item-title="name"
                  item-value="id"
                  placeholder="اختر الحساب..."
                  variant="outlined"
                  class="glass-input"
                  :rules="[(v) => !!v || 'يجب اختيار الحساب المالي']"
                >
                  <template #prepend-inner>
                    <LucideIcon name="wallet" :size="20" class="text-gold opacity-50" />
                  </template>
                </v-select>
              </v-col>

              <v-col cols="12" md="6">
                <label class="mb-2 font-weight-black text-gold">تاريخ تسجيل الحركة*</label>
                <DualDatePicker v-model="editItem.date" />
              </v-col>

              <v-col cols="12">
                <label class="mb-2 font-weight-black text-gold">وصف العملية / البيان المحاسبي</label>
                <v-textarea
                  v-model="editItem.description"
                  placeholder="اكتب تفاصيل إضافية لهذا القيد..."
                  variant="outlined"
                  class="glass-input"
                  rows="2"
                >
                  <template #prepend-inner>
                    <LucideIcon name="edit-3" :size="20" class="text-gold opacity-50 mt-1" />
                  </template>
                </v-textarea>
              </v-col>

              <!-- Option to immediately issue a client invoice -->
              <v-col v-if="!isEditingTx && (editItem.client_id || editItem.case_id)" cols="12">
                <v-checkbox
                  v-model="autoIssueInvoice"
                  color="primary"
                  hide-details
                  label="إصدار فاتورة ضريبية للعميل عن هذه العملية تلقائياً"
                  class="font-weight-bold"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions class="pa-8 modal-footer-solid glass-card">
          <v-btn
            variant="outlined"
            size="large"
            class="px-12 font-weight-black rounded-lg text-white btn-secondary"
            @click="closeDialog"
            >إلغاء</v-btn
          >
          <v-spacer></v-spacer>
          <v-btn
            color="gold"
            variant="outlined"
            size="large"
            class="px-12 font-weight-black btn-unified action-btn-unified h-56 premium-btn-gold-gradient"
            :loading="saving"
            @click="handleSave"
          >
            {{ isEditingTx ? 'حفظ التعديلات' : 'تثبيت القيد المالي' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Quick Issue Invoice Dialog for any Transaction -->
    <v-dialog v-model="showTxInvoiceDialog" max-width="640" persistent>
      <v-card class="rounded-xl overflow-hidden">
        <v-toolbar color="rgba(15, 23, 42, 0.95)" class="px-6 text-white" height="64">
          <LucideIcon name="file-text" :size="22" class="text-gold me-3" />
          <v-toolbar-title class="text-h6 font-weight-black text-white">
            إصدار فاتورة للعميل عن العملية
          </v-toolbar-title>
          <v-spacer />
          <v-btn icon variant="text" color="white" @click="showTxInvoiceDialog = false">
            <LucideIcon name="x" :size="20" />
          </v-btn>
        </v-toolbar>

        <v-card-text class="pa-6">
          <v-row dense>
            <v-col cols="12" md="6">
              <v-autocomplete
                v-model="txInvoiceForm.client_id"
                :items="safeArray(lookupClients)"
                item-title="name"
                item-value="id"
                label="الموكل / العميل *"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-autocomplete
                v-model="txInvoiceForm.case_id"
                :items="safeArray(lookupCases)"
                item-title="displayLabel"
                item-value="id"
                label="القضية المرتبطة (اختياري)"
                variant="outlined"
                density="comfortable"
                clearable
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="txInvoiceForm.amount"
                type="number"
                label="المبلغ الأساسي (SAR) *"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="txInvoiceForm.status"
                :items="[
                  { title: 'مدفوعة (تم التحصيل)', value: 'paid' },
                  { title: 'مرسلة / غير مدفوعة (ذمة على العميل)', value: 'sent' }
                ]"
                label="حالة الفاتورة *"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="txInvoiceForm.issue_date"
                type="date"
                label="تاريخ الإصدار"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model.number="txInvoiceForm.vat_rate"
                :items="vatRates"
                label="الضريبة (VAT)"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="txInvoiceForm.description"
                label="بيان الفاتورة *"
                rows="2"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12">
              <v-card variant="tonal" color="primary" class="pa-3 rounded-lg">
                <div class="d-flex justify-space-between text-body-2 mb-1">
                  <span>المبلغ قبل الضريبة:</span>
                  <strong>{{ formatCurrency(txInvoiceForm.amount) }} ر.س</strong>
                </div>
                <div class="d-flex justify-space-between text-body-2 mb-1">
                  <span>ضريبة القيمة المضافة:</span>
                  <strong>
                    {{
                      formatCurrency(
                        (Number(txInvoiceForm.amount) || 0) * Number(txInvoiceForm.vat_rate || 0)
                      )
                    }}
                    ر.س
                  </strong>
                </div>
                <v-divider class="my-1" />
                <div class="d-flex justify-space-between text-subtitle-1 font-weight-black">
                  <span>الإجمالي شامل الضريبة:</span>
                  <span>
                    {{
                      formatCurrency(
                        (Number(txInvoiceForm.amount) || 0) *
                          (1 + Number(txInvoiceForm.vat_rate || 0))
                      )
                    }}
                    ر.س
                  </span>
                </div>
              </v-card>
            </v-col>
            <v-col cols="12">
              <v-checkbox
                v-model="txInvoiceForm.exportPdfImmediately"
                color="primary"
                hide-details
                label="تصدير وحفظ الفاتورة كملف PDF فور الإصدار"
                class="font-weight-bold"
              />
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions class="pa-4 bg-grey-lighten-4">
          <v-btn variant="text" @click="showTxInvoiceDialog = false">إلغاء</v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            class="px-6 font-weight-black"
            :loading="savingTxInvoice"
            :disabled="!txInvoiceForm.client_id || !txInvoiceForm.amount"
            @click="saveTxInvoice"
          >
            إصدار الفاتورة
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="showDeleteDialog" width="90%" max-width="500" persistent>
      <v-card
        class="rounded-xl elevation-24 overflow-hidden modal-card border-error-alpha glass-card"
      >
        <v-toolbar color="white" class="px-8 border-b" height="72">
          <LucideIcon name="alert-triangle" :size="24" class="text-error me-4" />
          <v-toolbar-title class="text-h6 font-weight-black text-error"
            >شطب العملية المالية</v-toolbar-title
          >
          <v-spacer></v-spacer>
          <v-btn
            icon
            variant="text"
            size="small"
            class="rounded-lg premium-btn-gold-gradient"
            @click="showDeleteDialog = false"
          >
            <LucideIcon name="x" :size="24" class="text-pure-black" />
          </v-btn>
        </v-toolbar>
        <v-card-text class="pa-8 bg-white text-center glass-card">
          <div class="text-body-1 mb-6 font-weight-black text-pure-black">
            هل أنت متأكد من حذف هذا القيد المالي نهائياً من السجلات؟
          </div>
          <div class="glass-panel-light pa-6 rounded-lg border border-error-alpha mb-6 bg-white">
            <div class="text-h5 font-weight-black text-error mb-2">
              {{ formatCurrency(itemToDelete?.amount) }}
              <span class="text-subtitle-2 opacity-60">SAR</span>
            </div>
            <div class="text-tiny font-weight-black text-pure-black opacity-50">
              {{ itemToDelete?.description || 'بدون بيان' }}
            </div>
          </div>
          <div class="text-tiny text-error opacity-70 font-weight-black">
            سيؤدي هذا الإجراء إلى إعادة حساب الأرصدة وإلغاء الربط بالقضية/الموكل بشكل قطعي.
          </div>
        </v-card-text>
        <v-card-actions class="pa-8 modal-footer-solid glass-card">
          <v-btn
            color="gold"
            variant="outlined"
            size="large"
            class="px-8 font-weight-black btn-unified h-56 premium-btn-gold-gradient"
            @click="showDeleteDialog = false"
            >تراجع</v-btn
          >
          <v-spacer></v-spacer>
          <v-btn
            color="error"
            variant="flat"
            size="large"
            class="px-8 font-weight-black rounded-lg premium-lift h-56 premium-btn-gold-gradient"
            :loading="deleting"
            @click="handleDelete"
          >
            تأكيد الحذف النهائي
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Success Snackbar -->
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

    <!-- Credit Note Dialog -->
    <CreateCreditNoteModal v-model="showCreditNoteDialog" @created="onCreditNoteCreated" />
  </v-container>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue'
import { useFinanceStore } from '../stores/finance'
import { useSearch } from '../composables/useSearch'
import { Transaction, Account } from '../types'
import { storeToRefs } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import InvoicesList from '../components/finance/InvoicesList.vue'
import VouchersList from '../components/finance/VouchersList.vue'
import ReceivablesList from '../components/finance/ReceivablesList.vue'
import AccountsChart from '../components/finance/AccountsChart.vue'
import ProfitabilityReport from '../components/finance/ProfitabilityReport.vue'
import OfficeAccountsReport from '../components/finance/OfficeAccountsReport.vue'
import ClientFinancialStatement from '../components/finance/ClientFinancialStatement.vue'
import ClientFullProfile from '../components/finance/ClientFullProfile.vue'
import OfficeManagementDashboard from '../components/finance/OfficeManagementDashboard.vue'
import CreateCreditNoteModal from '../components/finance/CreateCreditNoteModal.vue'
import CashFlowChart from '../components/finance/CashFlowChart.vue'
import DualDatePicker from '../components/DualDatePicker.vue'
import LucideIcon from '../components/common/LucideIcon.vue'
import { safeArray, safeLength, valWithDefault as safeDefaults, formatDateOnly } from '../utils/safe'
import { useMobileLayout } from '../composables/useMobileLayout'
import MobileFinance from '../components/mobile/MobileFinance.vue'

const financeStore = useFinanceStore()
const { transactions, accounts, stats, loading, transactionsLoading, cashFlow } =
  storeToRefs(financeStore)
const { isMobile } = useMobileLayout()

const tab = ref('transactions')
const invoicesStatusFilter = ref<'all' | 'pending' | 'paid'>('all')
const activeKpiKey = ref<string>('balance')
const showDialog = ref(false)
const isEditingTx = ref(false)
const autoIssueInvoice = ref(false)
const formValid = ref(false)
const saving = ref(false)
const formRef = ref<any>(null)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')
const showCreditNoteDialog = ref(false)

// Filters on main ledger (SQL-level queries via financeStore.fetchFilteredTransactions)
const filterType = ref<string>('all')
const filterCategory = ref<string | null>(null)

const incomeCategories = [
  'أتعاب محاماة',
  'دفعة مقدمة',
  'دفعة أتعاب قضية',
  'استشارة قانونية',
  'صياغة ومراجعة عقود',
  'خدمات قانونية',
  'تحصيل ذمم',
  'إيرادات أخرى'
]

const expenseCategories = [
  'رسوم قضائية',
  'رواتب',
  'إيجار',
  'مرافق',
  'تسويق',
  'مستلزمات قانونية',
  'مستلزمات مكتبية',
  'أتعاب خبراء ومحكمين',
  'سفريات وانتقالات',
  'ضيافة ونثريات',
  'صيانة وتقنية',
  'أخرى'
]

const currentCategoryOptions = computed(() =>
  editItem.type === 'income' ? incomeCategories : expenseCategories
)

const allCategoriesFilterList = computed(() => {
  const dynamic = new Set<string>([...incomeCategories, ...expenseCategories])
  for (const t of safeArray(transactions.value) as any[]) {
    if (t?.category) dynamic.add(String(t.category))
  }
  return Array.from(dynamic)
})

const applySqlFilters = async () => {
  const typeVal = filterType.value && filterType.value !== 'all' ? filterType.value : undefined
  const catVal =
    filterCategory.value && filterCategory.value !== 'all' ? filterCategory.value : undefined
  const qVal = localSearch.value && localSearch.value.trim() !== '' ? localSearch.value.trim() : undefined

  await financeStore.fetchFilteredTransactions({
    page: 1,
    pageSize: 200,
    filters: {
      type: typeVal,
      category: catVal,
      q: qVal
    }
  })
}

watch([filterType, filterCategory], () => {
  if (filterType.value === 'income') activeKpiKey.value = 'income'
  else if (filterType.value === 'expense') activeKpiKey.value = 'expense'
  else activeKpiKey.value = 'balance'
  applySqlFilters()
})

const onKpiCardClick = (key: string) => {
  activeKpiKey.value = key
  if (key === 'income') {
    tab.value = 'transactions'
    filterType.value = 'income'
  } else if (key === 'expense') {
    tab.value = 'transactions'
    filterType.value = 'expense'
  } else if (key === 'pending') {
    invoicesStatusFilter.value = 'pending'
    tab.value = 'invoices'
  } else {
    tab.value = 'transactions'
    filterType.value = 'all'
    filterCategory.value = null
    localSearch.value = ''
    applySqlFilters()
  }
}

// Quick Issue Invoice for Transaction
const showTxInvoiceDialog = ref(false)
const savingTxInvoice = ref(false)
const txInvoiceForm = reactive({
  linked_transaction_id: '' as string,
  client_id: '' as string,
  case_id: null as string | null,
  amount: 0,
  vat_rate: 0.15,
  status: 'paid' as string,
  issue_date: new Date().toISOString().split('T')[0],
  description: '',
  exportPdfImmediately: true
})

// Legal Services Finance Data
const legalFinanceLoading = ref(false)
const legalFinanceStats = ref<any>({
  total_services: 0,
  total_compensation: 0,
  total_paid: 0,
  total_remaining: 0
})
const legalFinanceList = ref<any[]>([])
const legalFinanceHeaders = [
  { title: 'رقم الخدمة', key: 'engagement_number', align: 'start' as const },
  { title: 'الخدمة', key: 'service_type_name', align: 'start' as const },
  { title: 'العميل', key: 'client_name', align: 'start' as const },
  { title: 'التصنيف', key: 'category_name', align: 'start' as const },
  { title: 'المقابل المالي', key: 'financial_compensation', align: 'end' as const },
  { title: 'المحصل', key: 'paid_amount', align: 'end' as const },
  { title: 'المتبقي', key: 'remaining_amount', align: 'end' as const }
]

const onCreditNoteCreated = () => {
  showSnackbar('تم إصدار إشعار الدائن بنجاح. يرجى اعتماده لتفعيل الأثر المالي.', 'success')
  financeStore.fetchFinanceData()
}

// Metadata lookups
const lookupClients = ref<any[]>([])
const lookupCases = ref<any[]>([])
const loadingLookups = ref(false)

const { search: localSearch } = useSearch((val) => {
  financeStore.searchQuery = val
  applySqlFilters()
})

onUnmounted(() => {
  financeStore.searchQuery = ''
})

const openAddDialog = (): void => {
  isEditingTx.value = false
  autoIssueInvoice.value = false
  resetEditItem()
  showDialog.value = true
}

const openEditDialog = (item: any): void => {
  isEditingTx.value = true
  autoIssueInvoice.value = false
  Object.assign(editItem, {
    id: item.id,
    type: item.type || 'income',
    amount: Number(item.amount) || 0,
    vat_rate: item.vat_rate !== undefined ? Number(item.vat_rate) : 0.15,
    date: item.date || new Date().toISOString().split('T')[0],
    category: item.category || (item.type === 'income' ? 'أتعاب محاماة' : 'رسوم قضائية'),
    client_id: item.client_id || undefined,
    case_id: item.case_id || undefined,
    account_id: item.account_id || undefined,
    description: item.description || '',
    expense_owner_type: item.expense_owner_type || (item.case_id ? 'case' : 'office')
  })
  showDialog.value = true
}

const closeDialog = (): void => {
  showDialog.value = false
  isEditingTx.value = false
}

const editItem = reactive<Partial<Transaction> & { expense_owner_type: string }>({
  type: 'income',
  amount: 0,
  vat_rate: 0.15,
  date: new Date().toISOString().split('T')[0],
  category: 'أتعاب محاماة',
  client_id: undefined,
  case_id: undefined,
  account_id: undefined,
  description: '',
  expense_owner_type: 'office'
})

const resetEditItem = (): void => {
  Object.assign(editItem, {
    id: uuidv4(),
    type: 'income',
    amount: 0,
    vat_rate: 0.15,
    date: new Date().toISOString().split('T')[0],
    category: 'أتعاب محاماة',
    client_id: undefined,
    case_id: undefined,
    account_id: undefined,
    description: '',
    expense_owner_type: 'office'
  })
}

const selectedCaseFinancials = computed(() => {
  if (!editItem.case_id) return null
  const c = (safeArray(lookupCases.value) as any[]).find(
    (item) => String(item.id) === String(editItem.case_id)
  )
  if (!c) return null
  const totalFee = Number(c.contract_amount) || 0
  const allTx = safeArray(transactions.value) as any[]
  const caseIncome = allTx
    .filter(
      (t) =>
        String(t.case_id) === String(editItem.case_id) &&
        t.type === 'income' &&
        (!isEditingTx.value || String(t.id) !== String(editItem.id))
    )
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  const caseExpenses = allTx
    .filter(
      (t) =>
        String(t.case_id) === String(editItem.case_id) &&
        t.type === 'expense' &&
        (!isEditingTx.value || String(t.id) !== String(editItem.id))
    )
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

  return {
    caseNumber: c.case_number,
    totalFee,
    paidAmount: caseIncome,
    remainingFee: Math.max(0, totalFee - caseIncome),
    expensesAmount: caseExpenses
  }
})

// Auto-fill client_id when a case is selected
watch(
  () => editItem.case_id,
  (newCaseId) => {
    if (!newCaseId) return
    const found = (safeArray(lookupCases.value) as any[]).find(
      (c) => String(c.id) === String(newCaseId)
    )
    if (found?.client_id && !editItem.client_id) {
      editItem.client_id = found.client_id
    }
  }
)

const statCards = computed(() => [
  {
    key: 'income',
    title: 'إجمالي الأتعاب المحصلة',
    value: stats.value?.income,
    textColor: 'text-green-darken-2',
    iconColor: 'success',
    icon: 'trending-up',
    actionHint: 'عرض الإيرادات',
    subtitle: 'انقر لتصفية السجل على الإيرادات'
  },
  {
    key: 'pending',
    title: 'الأتعاب المتبقية قيد التحصيل',
    value: (stats.value as any)?.total_remaining ?? 0,
    textColor: 'text-amber-darken-3',
    iconColor: 'warning',
    icon: 'clock',
    actionHint: `${(stats.value as any)?.pending_invoices_count ?? 0} فاتورة معلقة`,
    subtitle: `فواتير معلقة: ${formatCurrency((stats.value as any)?.pending_invoices_total ?? 0)} SAR | عقود: ${formatCurrency((stats.value as any)?.total_contracted ?? 0)} SAR`
  },
  {
    key: 'expense',
    title: 'إجمالي المصاريف والمدفوعات',
    value: stats.value?.expense,
    textColor: 'text-error',
    iconColor: 'error',
    icon: 'trending-down',
    actionHint: 'عرض المصروفات',
    subtitle: 'انقر لتصفية السجل على المصروفات'
  },
  {
    key: 'balance',
    title: 'صافي التوازن المالي',
    value: stats.value?.balance,
    textColor: 'text-primary',
    iconColor: 'primary',
    icon: 'scale',
    actionHint: 'عرض الكل',
    subtitle: 'الإيرادات المحصلة − إجمالي المصروفات'
  }
])

const expenseOwnerTypes = [
  { title: 'مصروف مكتبي عام (إيجار، رواتب، تشغيل)', value: 'office' },
  { title: 'مصروف مرتبط بقضية (رسوم، معاينة، سفريات)', value: 'case' },
  { title: 'ذمة مستلمة من موكل (إيداعات)', value: 'client' }
]

const vatRates = [
  { title: 'الإعفاء الضريبي (0%)', value: 0 },
  { title: 'ضريبة القيمة المضافة (15%)', value: 0.15 }
]

const shouldShowClientSelector = computed(() => {
  return (
    editItem.type === 'income' ||
    editItem.expense_owner_type === 'client' ||
    editItem.expense_owner_type === 'case'
  )
})

const shouldShowCaseSelector = computed(() => {
  return editItem.type === 'income' || editItem.expense_owner_type === 'case'
})

const filteredCasesForLink = computed(() => {
  const cases = safeArray(lookupCases.value) as any[]
  if (cases.length === 0) return []
  if (editItem.expense_owner_type === 'office' || !editItem.client_id) return cases
  const targetClientId = String(editItem.client_id).trim()
  return cases.filter((c) => String(c.client_id || '').trim() === targetClientId)
})

const filteredAccounts = computed(() => {
  const all = safeArray(accounts.value) as Account[]
  if (editItem.type === 'income')
    return all.filter(
      (acc) => acc.type === 'revenue' || acc.type === 'asset' || acc.type === 'equity'
    )
  return all.filter(
    (acc) => acc.type === 'expense' || acc.type === 'asset' || acc.type === 'liability'
  )
})

const handleSave = async (): Promise<void> => {
  if (!formRef.value) return
  const { valid } = await formRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const sanitizeId = (id: unknown): string | null => {
      if (!id) return null
      const s = String(id).trim()
      return s === '' ? null : s
    }

    const payload: any = {
      ...editItem,
      client_id: sanitizeId(editItem.client_id),
      case_id: sanitizeId(editItem.case_id),
      account_id: sanitizeId(editItem.account_id)
    }

    if (payload.type === 'income') {
      payload.expense_owner_type = payload.case_id ? 'case' : 'client'
    } else {
      if (payload.expense_owner_type === 'office') {
        payload.client_id = null
        payload.case_id = null
      } else if (payload.expense_owner_type === 'client') {
        payload.case_id = null
      }
    }

    if (isEditingTx.value && payload.id) {
      await financeStore.updateTransaction(payload.id, payload)
      showSnackbar('تم تحديث القيد المالي بنجاح', 'success')
    } else {
      const createdTx: any = await financeStore.addTransaction(payload as Transaction)
      const txId = createdTx?.id || createdTx || payload.id
      if (autoIssueInvoice.value && (payload.client_id || payload.case_id)) {
        const amt = Number(payload.amount) || 0
        const vatRate = Number(payload.vat_rate ?? 0.15)
        const vatAmt = Number((amt * vatRate).toFixed(2))
        await financeStore.addInvoice({
          client_id: payload.client_id,
          case_id: payload.case_id,
          amount: amt,
          vat_amount: vatAmt,
          total_amount: Number((amt + vatAmt).toFixed(2)),
          issue_date: payload.date,
          due_date: payload.date,
          status: payload.type === 'income' ? 'paid' : 'sent',
          description: payload.description || `${payload.category || 'عملية مالية'}`,
          linked_transaction_id: txId
        } as any)
        showSnackbar('تم تثبيت العملية وإصدار الفاتورة الضريبية للعميل بنجاح', 'success')
      } else {
        showSnackbar('تم تثبيت الحركة المالية في السجل العام بنجاح', 'success')
      }
    }
    closeDialog()
    resetEditItem()
  } catch (e: unknown) {
    showSnackbar('فشل في حفظ العملية: ' + (e as Error).message, 'error')
  } finally {
    saving.value = false
  }
}

const openIssueInvoiceForTx = (tx: any) => {
  txInvoiceForm.linked_transaction_id = tx.id
  txInvoiceForm.client_id = tx.client_id || ''
  txInvoiceForm.case_id = tx.case_id || null
  txInvoiceForm.amount = Number(tx.amount) || 0
  txInvoiceForm.vat_rate = tx.vat_rate !== undefined ? Number(tx.vat_rate) : 0.15
  txInvoiceForm.status = tx.type === 'income' ? 'paid' : 'sent'
  txInvoiceForm.issue_date = tx.date || new Date().toISOString().split('T')[0]
  txInvoiceForm.description =
    tx.description ||
    `${tx.category || (tx.type === 'income' ? 'دفعة أتعاب' : 'مصروفات قضائية')}${
      tx.case_number ? ' - قضية رقم ' + tx.case_number : ''
    }`
  txInvoiceForm.exportPdfImmediately = true
  showTxInvoiceDialog.value = true
}

const saveTxInvoice = async () => {
  if (!txInvoiceForm.client_id || !txInvoiceForm.amount) return
  savingTxInvoice.value = true
  try {
    const amt = Number(txInvoiceForm.amount) || 0
    const vat = Number((amt * Number(txInvoiceForm.vat_rate || 0)).toFixed(2))
    const total = Number((amt + vat).toFixed(2))
    const createdId: any = await financeStore.addInvoice({
      client_id: txInvoiceForm.client_id,
      case_id: txInvoiceForm.case_id || null,
      amount: amt,
      vat_amount: vat,
      total_amount: total,
      issue_date: txInvoiceForm.issue_date,
      due_date: txInvoiceForm.issue_date,
      status: txInvoiceForm.status as any,
      description: txInvoiceForm.description,
      linked_transaction_id: txInvoiceForm.linked_transaction_id
    } as any)

    showTxInvoiceDialog.value = false
    showSnackbar('تم إصدار الفاتورة للعميل وربطها بالعملية بنجاح', 'success')

    const invoiceId = typeof createdId === 'string' ? createdId : createdId?.id
    if (txInvoiceForm.exportPdfImmediately && invoiceId) {
      await printLinkedInvoice(invoiceId)
    }
  } catch (e: unknown) {
    showSnackbar('فشل في إصدار الفاتورة: ' + (e as Error).message, 'error')
  } finally {
    savingTxInvoice.value = false
  }
}

const printLinkedInvoice = async (invoiceId: string) => {
  try {
    const res = await (window as any).api.reports.exportPDF({
      reportType: 'invoice',
      id: invoiceId,
      promptSave: true
    })
    if (res?.filePath) {
      showSnackbar('تم حفظ وتصدير الفاتورة بصيغة PDF بنجاح', 'success')
    }
  } catch (e: unknown) {
    showSnackbar('فشل تصدير الفاتورة: ' + (e as Error).message, 'error')
  }
}

const loadLookups = async (): Promise<void> => {
  loadingLookups.value = true
  try {
    const clients = await window.api.clients.getAll()
    lookupClients.value = safeArray(clients)

    const cases = await window.api.cases.getAll()
    lookupCases.value = safeArray(cases).map((c: any) => ({
      ...c,
      displayLabel: `${c.case_number} - (${c.client_name || 'بدون موكل'})`
    }))

    await financeStore.fetchFinanceData()
  } catch (e: unknown) {
    console.error('Core lookup failed:', e)
  } finally {
    loadingLookups.value = false
  }
}

onMounted(loadLookups)

// Load legal finance data when tab changes
watch(tab, async (newTab) => {
  if (newTab === 'legal-finance') {
    await loadLegalFinanceData()
  }
})

const loadLegalFinanceData = async () => {
  legalFinanceLoading.value = true
  try {
    const data = await (window as any).api.reports.getLegalServicesReport({ pageSize: 500 })
    if (data) {
      legalFinanceStats.value = {
        total_services: data.summary?.totalServices || 0,
        total_compensation: data.summary?.totalRevenue || 0,
        total_paid: data.summary?.totalPaid || 0,
        total_remaining: data.summary?.totalRemaining || 0
      }
      legalFinanceList.value = data.services || []
    }
  } catch (e) {
    console.error('Failed to load legal finance data:', e)
  } finally {
    legalFinanceLoading.value = false
  }
}

const showSnackbar = (text: string, color: string = 'success'): void => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

const formatCurrency = (val: number | undefined): string => {
  return Number(safeDefaults(val, 0)).toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

watch(
  () => editItem.type,
  (newType) => {
    if (isEditingTx.value) return
    if (newType === 'income') {
      editItem.category = 'أتعاب محاماة'
      editItem.expense_owner_type = 'office'
    } else {
      editItem.category = 'رسوم قضائية'
      editItem.expense_owner_type = 'case'
    }
  }
)

watch([filteredAccounts, showDialog], ([newAccs, isShown]) => {
  if (isShown && safeLength(newAccs) > 0 && !editItem.account_id) {
    const def = newAccs.find((a) => a.code === '1101' || a.name.includes('صندوق')) || newAccs[0]
    editItem.account_id = def.id
  }
})

const headers = [
  {
    title: 'بيانات العملية',
    align: 'center' as const,
    children: [
      { title: 'التاريخ', key: 'date', width: '110px' },
      { title: 'النوع', key: 'type', width: '90px' },
      { title: 'الموكل والقضية', key: 'display_entity' },
      { title: 'البيان / الوصف', key: 'description' }
    ]
  },
  {
    title: 'البيانات المالية',
    align: 'center' as const,
    children: [
      { title: 'الحساب المالي', key: 'account_name' },
      { title: 'المبلغ (SAR)', key: 'amount', align: 'end' as const },
      { title: 'التصنيف / نوع المصروف', key: 'category' }
    ]
  },
  {
    title: 'الإجراءات',
    align: 'center' as const,
    children: [
      {
        title: 'إجراءات وفواتير',
        key: 'actions',
        sortable: false,
        align: 'end' as const,
        width: '165px'
      }
    ]
  }
]

const showDeleteDialog = ref(false)
const itemToDelete = ref<Transaction | null>(null)
const deleting = ref(false)

const confirmDelete = (item: Transaction): void => {
  itemToDelete.value = item
  showDeleteDialog.value = true
}

const handleDelete = async (): Promise<void> => {
  if (!itemToDelete.value) return
  deleting.value = true
  try {
    await financeStore.deleteTransaction(itemToDelete.value.id)
    showSnackbar('تم شطب العملية المالية من السجلات')
    showDeleteDialog.value = false
  } catch (e: unknown) {
    showSnackbar('فشل في شطب العملية: ' + (e as Error).message, 'error')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.kpi-clickable-card {
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  border: 1.5px solid rgba(212, 175, 55, 0.22);
}

.kpi-clickable-card:hover {
  transform: translateY(-2px);
  border-color: rgba(212, 175, 55, 0.7);
}

.kpi-card-active {
  border-color: rgb(var(--v-theme-primary)) !important;
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.18) !important;
}

.finance-num {
  font-variant-numeric: tabular-nums;
}

.finance-accountant-table :deep(thead tr:first-child th) {
  background: rgba(15, 23, 42, 0.06);
  font-weight: 900;
  font-size: 0.78rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
}

.text-pure-black {
  color: #000000 !important;
}

.modal-card {
  background: #ffffff !important;
  border: 1px solid rgba(233, 195, 73, 0.4) !important;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2) !important;
}

.modal-footer-solid {
  background: rgba(15, 23, 42, 0.95) !important;
  opacity: 1 !important;
  border-top: 1px solid rgba(233, 195, 73, 0.2) !important;
}

.bg-gold-alpha {
  background: rgba(233, 195, 73, 0.1) !important;
}

.btn-unified {
  border: 1px solid rgba(233, 195, 73, 0.82) !important;
  background: transparent !important;
  border-radius: 12px !important;
}

.btn-unified:hover {
  background: rgba(233, 195, 73, 0.08) !important;
  border-color: rgba(233, 195, 73, 0.95) !important;
}

.action-btn-unified {
  min-width: 180px !important;
}

.modal-scrollable {
  max-height: calc(100vh - 260px);
  overflow-y: auto;
}

.uppercase {
  text-transform: uppercase;
}

.tracking-widest {
  letter-spacing: 0.1em;
}

.z-index-1 {
  position: relative;
  z-index: 1;
}

.border-error-alpha {
  border-color: rgba(244, 67, 54, 0.2) !important;
}

.rtl {
  direction: rtl;
}

.h-48 {
  height: 48px !important;
}

/* ---- Mobile Styles (max-width: 1023px) ---- */
@media (max-width: 1023px) {
  /* Header: stack buttons vertically */
  :deep(.v-row.mb-8.align-center > .v-col[cols='auto']) {
    flex: 0 0 100% !important;
    max-width: 100% !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 8px !important;
  }

  :deep(.v-row.mb-8.align-center > .v-col[cols='auto'] .v-btn) {
    width: 100% !important;
    margin: 0 !important;
  }

  /* Finance tabs: scrollable */
  :deep(.v-tabs) {
    overflow-x: auto !important;
    flex-wrap: nowrap !important;
  }

  :deep(.v-tab) {
    font-size: 0.78rem !important;
    padding: 0 8px !important;
    min-width: 80px !important;
  }

  :deep(.v-tab .v-icon) {
    display: none !important;
  }

  /* Table: horizontal scroll */
  :deep(.v-data-table) {
    overflow-x: auto !important;
  }

  /* Reduce modal padding */
  .modal-scrollable {
    max-height: calc(100dvh - 180px) !important;
    padding: 12px !important;
  }

  .btn-unified {
    min-width: 100px !important;
  }
}
</style>
