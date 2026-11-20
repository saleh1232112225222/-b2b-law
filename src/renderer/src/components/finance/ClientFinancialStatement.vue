<template>
  <div class="pa-4 pa-md-6">
    <!-- Client Selector & Actions Header -->
    <v-card class="glass-card pa-6 mb-6" elevation="0">
      <v-row align="center" dense>
        <v-col cols="12" md="6">
          <div class="d-flex align-center mb-3">
            <LucideIcon name="users" :size="24" class="me-3 text-accent" />
            <div>
              <h2 class="text-h6 font-weight-black text-gold mb-0">كشف حساب العميل التفصيلي</h2>
              <div class="text-caption text-gold opacity-70 font-weight-bold">
                مرتبط تلقائياً بجميع قضايا العميل، العقود، الخدمات القانونية، الدفعات، المصروفات، والفواتير
              </div>
            </div>
          </div>
          <v-autocomplete
            v-model="selectedClientId"
            :items="clientItems"
            item-title="name"
            item-value="id"
            label="اختر العميل لعرض كشف حسابه الكامل..."
            variant="outlined"
            density="comfortable"
            clearable
            hide-details
            class="glass-input"
            @update:model-value="loadClientSummary"
          >
            <template #prepend-inner>
              <LucideIcon name="search" :size="18" class="text-gold opacity-50 me-2" />
            </template>
          </v-autocomplete>
        </v-col>

        <v-col v-if="selectedClientId && summary" cols="12" md="6" class="d-flex flex-wrap gap-2 justify-md-end mt-4 mt-md-0">
          <v-btn
            color="accent"
            variant="flat"
            class="rounded-lg font-weight-black px-4"
            @click="openQuickPaymentDialog()"
          >
            <LucideIcon name="plus-circle" :size="16" class="me-2" /> تسجيل دفعة / حركة
          </v-btn>
          <v-btn
            color="primary"
            variant="tonal"
            class="rounded-lg font-weight-black px-4"
            @click="openQuickInvoiceDialog()"
          >
            <LucideIcon name="file-text" :size="16" class="me-2" /> إصدار فاتورة للعميل
          </v-btn>
          <v-btn
            color="gold"
            variant="outlined"
            class="rounded-lg font-weight-black px-4"
            :loading="exportingPdf"
            @click="exportStatementPdf"
          >
            <LucideIcon name="download" :size="16" class="me-2" /> تصدير كشف الحساب PDF
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <!-- Empty State -->
    <v-card v-if="!selectedClientId && !loading" class="glass-card pa-12 text-center" elevation="0">
      <LucideIcon name="user-check" :size="56" class="text-gold opacity-30 mb-3" />
      <div class="text-h6 font-weight-black text-gold mb-1">اختر العميل من القائمة أعلاه</div>
      <div class="text-body-2 text-gold opacity-70">
        سيتم استعراض كافة الحركات المالية، أتعاب القضايا، المدفوعات، المصروفات، والمتبقي مع إمكانية إصدار الفواتير وتصدير الكشف
      </div>
    </v-card>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-10">
      <v-progress-circular indeterminate color="accent" size="48" />
      <div class="mt-4 text-gold font-weight-black">جاري تحميل كشف حساب العميل...</div>
    </div>

    <!-- Summary Content -->
    <template v-if="summary && !loading">
      <!-- Summary KPI Cards -->
      <v-row class="mb-6" dense>
        <v-col cols="6" sm="4" md="2">
          <v-card class="glass-card pa-4 text-center h-100" elevation="0">
            <LucideIcon name="briefcase" :size="24" class="text-accent mb-2" />
            <div class="text-caption text-gold opacity-70 font-weight-bold mb-1">القضايا والخدمات</div>
            <div class="text-h6 font-weight-black text-white">{{ services.length }}</div>
          </v-card>
        </v-col>
        <v-col cols="6" sm="4" md="3">
          <v-card class="glass-card pa-4 text-center h-100" elevation="0">
            <LucideIcon name="coins" :size="24" class="text-warning mb-2" />
            <div class="text-caption text-gold opacity-70 font-weight-bold mb-1">إجمالي الأتعاب المستحقة</div>
            <div class="text-h6 font-weight-black text-white">
              {{ formatCurrency(summary.total_due) }}
            </div>
          </v-card>
        </v-col>
        <v-col cols="6" sm="4" md="3">
          <v-card class="glass-card pa-4 text-center h-100" elevation="0">
            <LucideIcon name="check-circle" :size="24" class="text-success mb-2" />
            <div class="text-caption text-gold opacity-70 font-weight-bold mb-1">إجمالي المدفوع والمحصل</div>
            <div class="text-h6 font-weight-black text-success">
              {{ formatCurrency(summary.total_paid) }}
            </div>
          </v-card>
        </v-col>
        <v-col cols="6" sm="6" md="2">
          <v-card class="glass-card pa-4 text-center h-100" elevation="0">
            <LucideIcon name="alert-triangle" :size="24" class="text-error mb-2" />
            <div class="text-caption text-gold opacity-70 font-weight-bold mb-1">المتبقي من الأتعاب</div>
            <div class="text-h6 font-weight-black text-error">
              {{ formatCurrency(summary.balance) }}
            </div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="2">
          <v-card class="glass-card pa-4 text-center h-100" elevation="0">
            <LucideIcon name="trending-down" :size="24" class="text-error mb-2" />
            <div class="text-caption text-gold opacity-70 font-weight-bold mb-1">مصروفات القضايا</div>
            <div class="text-h6 font-weight-black text-error">
              {{ formatCurrency(summary.total_expenses || 0) }}
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Collection Rate Progress -->
      <v-card class="glass-card pa-5 mb-6" elevation="0">
        <div class="d-flex justify-space-between align-center mb-2">
          <span class="text-body-2 font-weight-black text-gold">نسبة تحصيل الأتعاب من إجمالي المستحق</span>
          <span
            class="text-subtitle-1 font-weight-black"
            :class="collectionRate >= 50 ? 'text-success' : 'text-error'"
          >
            {{ collectionRate }}%
          </span>
        </div>
        <v-progress-linear
          :model-value="collectionRate"
          :color="collectionRate >= 75 ? 'success' : collectionRate >= 50 ? 'warning' : 'error'"
          height="10"
          rounded
        />
      </v-card>

      <!-- Main Statement Tabs -->
      <v-card class="glass-card overflow-hidden" elevation="0">
        <v-tabs v-model="activeTab" color="accent" grow class="border-b border-gold-thin">
          <v-tab value="transactions" class="font-weight-black">
            <LucideIcon name="list" :size="18" class="me-2" /> سجل العمليات والدفعات ({{
              transactions.length
            }})
          </v-tab>
          <v-tab value="services" class="font-weight-black">
            <LucideIcon name="gavel" :size="18" class="me-2" /> القضايا والخدمات والعقود ({{
              services.length
            }})
          </v-tab>
          <v-tab value="invoices" class="font-weight-black">
            <LucideIcon name="file-text" :size="18" class="me-2" /> الفواتير والسندات ({{
              invoices.length + vouchers.length
            }})
          </v-tab>
        </v-tabs>

        <v-window v-model="activeTab" class="pa-6">
          <!-- Tab 1: Complete Transactions & Operations Ledger -->
          <v-window-item value="transactions">
            <div v-if="transactions.length === 0" class="text-center py-8 text-grey">
              <LucideIcon name="banknote" :size="48" class="mb-3 text-gold opacity-30" />
              <div class="font-weight-bold mb-3">لا توجد عمليات أو حركات مالية مسجلة لهذا العميل حتى الآن</div>
              <v-btn color="accent" variant="tonal" class="font-weight-black" @click="openQuickPaymentDialog()">
                <LucideIcon name="plus" :size="16" class="me-2" /> تسجيل أول حركة مالية للعميل
              </v-btn>
            </div>
            <v-table v-else class="bg-transparent">
              <thead>
                <tr>
                  <th class="text-right text-gold font-weight-black">التاريخ</th>
                  <th class="text-right text-gold font-weight-black">نوع الحركة</th>
                  <th class="text-right text-gold font-weight-black">القضية / المرجع</th>
                  <th class="text-right text-gold font-weight-black">التصنيف / نوع المصروف</th>
                  <th class="text-right text-gold font-weight-black">البيان / الوصف</th>
                  <th class="text-right text-gold font-weight-black">المبلغ</th>
                  <th class="text-left text-gold font-weight-black">إجراءات وفوترة</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="tx in transactions" :key="tx.id">
                  <td class="text-right text-white font-mono">
                    {{ formatDate(tx.payment_date || tx.date) }}
                  </td>
                  <td class="text-right">
                    <v-chip
                      size="x-small"
                      :color="tx.type === 'income' ? 'success' : 'error'"
                      variant="flat"
                      class="font-weight-black"
                    >
                      {{ tx.type === 'income' ? 'إيراد / دفعة' : 'مصروف' }}
                    </v-chip>
                  </td>
                  <td class="text-right">
                    <div class="text-white font-weight-black font-mono">
                      {{ tx.case_number || tx.engagement_number || 'عام' }}
                    </div>
                    <div class="text-caption text-gold opacity-70">{{ tx.source || '' }}</div>
                  </td>
                  <td class="text-right">
                    <v-chip size="x-small" variant="tonal" color="gold" class="font-weight-black">
                      {{ tx.category || tx.service_type_name || 'عام' }}
                    </v-chip>
                  </td>
                  <td class="text-right text-white opacity-90">
                    {{ tx.notes || tx.description || '-' }}
                  </td>
                  <td
                    class="text-right font-weight-black"
                    :class="tx.type === 'income' ? 'text-success' : 'text-error'"
                  >
                    {{ formatCurrency(tx.amount) }}
                  </td>
                  <td class="text-left">
                    <v-btn
                      v-if="tx.linked_invoice_id"
                      size="x-small"
                      color="success"
                      variant="tonal"
                      class="font-weight-black"
                      @click="printInvoiceById(tx.linked_invoice_id)"
                    >
                      <LucideIcon name="printer" :size="14" class="me-1" />
                      فاتورة {{ tx.linked_invoice_number || '' }}
                    </v-btn>
                    <v-btn
                      v-else
                      size="x-small"
                      color="primary"
                      variant="tonal"
                      class="font-weight-black"
                      @click="openQuickInvoiceDialog(tx)"
                    >
                      <LucideIcon name="file-plus" :size="14" class="me-1" />
                      إصدار فاتورة
                    </v-btn>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="border-t border-gold-thin">
                  <td colspan="5" class="text-right font-weight-black text-gold">
                    صافي المدفوعات المحصلة من العميل (الإيرادات: {{ formatCurrency(totalPaid) }} | المصروفات: {{ formatCurrency(totalExpenses) }})
                  </td>
                  <td class="text-right font-weight-black text-success">
                    {{ formatCurrency(totalPaid) }}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </v-table>
          </v-window-item>

          <!-- Tab 2: Cases, Services & Contracts -->
          <v-window-item value="services">
            <div v-if="services.length === 0" class="text-center py-8 text-grey">
              <LucideIcon name="inbox" :size="48" class="mb-3 text-gold opacity-30" />
              <div>لا توجد قضايا أو خدمات قانونية مسجلة لهذا العميل</div>
            </div>
            <v-table v-else class="bg-transparent">
              <thead>
                <tr>
                  <th class="text-right text-gold font-weight-black">النوع</th>
                  <th class="text-right text-gold font-weight-black">رقم القضية / التعاقد</th>
                  <th class="text-right text-gold font-weight-black">الموضوع / الخدمة</th>
                  <th class="text-right text-gold font-weight-black">المحكمة / التصنيف</th>
                  <th class="text-right text-gold font-weight-black">الأتعاب المتفق عليها</th>
                  <th class="text-right text-gold font-weight-black">المدفوع</th>
                  <th class="text-right text-gold font-weight-black">المتبقي</th>
                  <th class="text-right text-gold font-weight-black">الحالة</th>
                  <th class="text-left text-gold font-weight-black">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="svc in services" :key="svc.id">
                  <td class="text-right">
                    <v-chip
                      size="x-small"
                      :color="svc.item_kind === 'case' ? 'primary' : svc.item_kind === 'contract' ? 'secondary' : 'accent'"
                      variant="tonal"
                      class="font-weight-black"
                    >
                      {{ svc.item_kind === 'case' ? 'قضية' : svc.item_kind === 'contract' ? 'عقد' : 'خدمة' }}
                    </v-chip>
                  </td>
                  <td class="text-right font-weight-black text-white font-mono">
                    {{ svc.engagement_number }}
                  </td>
                  <td class="text-right text-white font-weight-bold">{{ svc.service_type_name }}</td>
                  <td class="text-right text-gold opacity-80">{{ svc.category_name }}</td>
                  <td class="text-right font-weight-black text-white">
                    {{ formatCurrency(svc.total_amount || 0) }}
                  </td>
                  <td class="text-right font-weight-black text-success">
                    {{ formatCurrency(svc.paid_amount || 0) }}
                  </td>
                  <td
                    class="text-right font-weight-black"
                    :class="(svc.remaining_amount || 0) > 0 ? 'text-error' : 'text-success'"
                  >
                    {{ formatCurrency(svc.remaining_amount || 0) }}
                  </td>
                  <td class="text-right">
                    <v-chip
                      size="x-small"
                      :color="getServiceStatusColor(svc.finance_status)"
                      class="font-weight-black"
                    >
                      {{ getServiceStatusLabel(svc.finance_status) }}
                    </v-chip>
                  </td>
                  <td class="text-left">
                    <div class="d-flex gap-1 justify-end">
                      <v-btn
                        size="x-small"
                        color="accent"
                        variant="tonal"
                        class="font-weight-black"
                        @click="openQuickPaymentDialog(svc)"
                      >
                        دفعة
                      </v-btn>
                      <v-btn
                        size="x-small"
                        color="primary"
                        variant="tonal"
                        class="font-weight-black"
                        @click="openQuickInvoiceDialogForItem(svc)"
                      >
                        فاتورة
                      </v-btn>
                    </div>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="border-t border-gold-thin">
                  <td colspan="4" class="text-right font-weight-black text-gold">الإجمالي</td>
                  <td class="text-right font-weight-black text-white">
                    {{ formatCurrency(totals.total) }}
                  </td>
                  <td class="text-right font-weight-black text-success">
                    {{ formatCurrency(totals.paid) }}
                  </td>
                  <td class="text-right font-weight-black text-error">
                    {{ formatCurrency(totals.remaining) }}
                  </td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </v-table>
          </v-window-item>

          <!-- Tab 3: Invoices & Vouchers -->
          <v-window-item value="invoices">
            <div class="mb-6">
              <div class="d-flex justify-space-between align-center mb-3">
                <h4 class="text-subtitle-1 font-weight-black text-gold">الفواتير الضريبية الصادرة للعميل ({{ invoices.length }})</h4>
                <v-btn size="small" color="primary" variant="tonal" class="font-weight-black" @click="openQuickInvoiceDialog()">
                  <LucideIcon name="plus" :size="14" class="me-1" /> فاتورة جديدة
                </v-btn>
              </div>
              <div v-if="invoices.length === 0" class="text-center py-4 text-grey">
                لا توجد فواتير صادرة لهذا العميل
              </div>
              <v-table v-else density="comfortable" class="bg-transparent">
                <thead>
                  <tr>
                    <th class="text-right text-gold font-weight-black">رقم الفاتورة</th>
                    <th class="text-right text-gold font-weight-black">التاريخ</th>
                    <th class="text-right text-gold font-weight-black">رقم القضية</th>
                    <th class="text-right text-gold font-weight-black">المبلغ الأساسي</th>
                    <th class="text-right text-gold font-weight-black">الضريبة</th>
                    <th class="text-right text-gold font-weight-black">الإجمالي</th>
                    <th class="text-right text-gold font-weight-black">الحالة</th>
                    <th class="text-left text-gold font-weight-black">تصدير / طباعة</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="inv in invoices" :key="inv.id">
                    <td class="text-right font-weight-black text-white font-mono">{{ inv.invoice_number }}</td>
                    <td class="text-right text-white">{{ formatDate(inv.date) }}</td>
                    <td class="text-right text-white font-mono">{{ inv.case_number || '---' }}</td>
                    <td class="text-right text-white">{{ formatCurrency(inv.amount) }}</td>
                    <td class="text-right text-white">{{ formatCurrency(inv.vat_amount) }}</td>
                    <td class="text-right font-weight-black text-accent">{{ formatCurrency(inv.total_amount) }}</td>
                    <td class="text-right">
                      <v-chip size="x-small" :color="inv.status === 'paid' ? 'success' : 'warning'" class="font-weight-black">
                        {{ inv.status === 'paid' ? 'مدفوعة' : 'مستحقة' }}
                      </v-chip>
                    </td>
                    <td class="text-left">
                      <v-btn size="x-small" color="primary" variant="tonal" @click="printInvoiceById(inv.id)">
                        <LucideIcon name="printer" :size="14" class="me-1" /> حفظ / طباعة PDF
                      </v-btn>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>

            <v-divider class="my-4" />

            <div>
              <h4 class="text-subtitle-1 font-weight-black text-gold mb-3">سندات القبض والصرف ({{ vouchers.length }})</h4>
              <div v-if="vouchers.length === 0" class="text-center py-4 text-grey">
                لا توجد سندات مسجلة لهذا العميل
              </div>
              <v-table v-else density="comfortable" class="bg-transparent">
                <thead>
                  <tr>
                    <th class="text-right text-gold font-weight-black">رقم السند</th>
                    <th class="text-right text-gold font-weight-black">التاريخ</th>
                    <th class="text-right text-gold font-weight-black">النوع</th>
                    <th class="text-right text-gold font-weight-black">المبلغ</th>
                    <th class="text-right text-gold font-weight-black">البيان</th>
                    <th class="text-left text-gold font-weight-black">تصدير / طباعة</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="v in vouchers" :key="v.id">
                    <td class="text-right font-weight-black text-white font-mono">{{ v.voucher_number }}</td>
                    <td class="text-right text-white">{{ formatDate(v.date) }}</td>
                    <td class="text-right">
                      <v-chip size="x-small" :color="v.type === 'receipt' ? 'success' : 'error'" class="font-weight-black">
                        {{ v.type === 'receipt' ? 'سند قبض' : 'سند صرف' }}
                      </v-chip>
                    </td>
                    <td class="text-right font-weight-black" :class="v.type === 'receipt' ? 'text-success' : 'text-error'">
                      {{ formatCurrency(v.amount) }}
                    </td>
                    <td class="text-right text-white">{{ v.description || v.notes || '---' }}</td>
                    <td class="text-left">
                      <v-btn size="x-small" color="primary" variant="tonal" @click="printVoucherById(v.id)">
                        <LucideIcon name="printer" :size="14" class="me-1" /> حفظ / طباعة PDF
                      </v-btn>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </v-window-item>
        </v-window>
      </v-card>
    </template>

    <!-- Quick Record Payment / Transaction Dialog -->
    <v-dialog v-model="showPaymentDialog" max-width="620" persistent>
      <v-card class="rounded-xl glass-card">
        <v-toolbar color="primary" class="px-6" height="64">
          <LucideIcon name="banknote" :size="22" class="text-white me-3" />
          <v-toolbar-title class="text-white font-weight-black">
            تسجيل حركة مالية للعميل
          </v-toolbar-title>
          <v-spacer />
          <v-btn icon variant="text" color="white" @click="showPaymentDialog = false">
            <LucideIcon name="x" :size="20" />
          </v-btn>
        </v-toolbar>
        <v-card-text class="pa-6">
          <v-row dense>
            <v-col cols="12" class="mb-2">
              <v-btn-toggle v-model="quickTx.type" mandatory color="primary" class="w-100">
                <v-btn value="income" class="flex-grow-1 font-weight-black">
                  دفعة أتعاب / إيراد من العميل
                </v-btn>
                <v-btn value="expense" class="flex-grow-1 font-weight-black">
                  مصروف على قضية العميل
                </v-btn>
              </v-btn-toggle>
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="quickTx.case_id"
                :items="clientCasesOptions"
                item-title="label"
                item-value="id"
                label="القضية المرتبطة (اختياري)"
                variant="outlined"
                clearable
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-combobox
                v-model="quickTx.category"
                :items="quickTx.type === 'income' ? incomeCategories : expenseCategories"
                label="التصنيف / نوع المصروف*"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="quickTx.amount"
                type="number"
                label="المبلغ (SAR)*"
                variant="outlined"
                prefix="SAR"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="quickTx.date"
                type="date"
                label="التاريخ*"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="quickTx.description"
                label="البيان / تفاصيل العملية*"
                variant="outlined"
                rows="2"
              />
            </v-col>
            <v-col cols="12">
              <v-checkbox
                v-model="quickTx.issueInvoice"
                color="primary"
                hide-details
                label="إصدار فاتورة ضريبية تلقائياً عن هذه العملية"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-btn variant="text" @click="showPaymentDialog = false">إلغاء</v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            class="px-6 font-weight-black"
            :loading="savingTx"
            :disabled="!quickTx.amount || quickTx.amount <= 0"
            @click="saveQuickTransaction"
          >
            حفظ الحركة
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Quick Issue Invoice Dialog -->
    <v-dialog v-model="showInvoiceDialog" max-width="620" persistent>
      <v-card class="rounded-xl glass-card">
        <v-toolbar color="primary" class="px-6" height="64">
          <LucideIcon name="file-text" :size="22" class="text-white me-3" />
          <v-toolbar-title class="text-white font-weight-black">
            إصدار فاتورة ضريبية للعميل
          </v-toolbar-title>
          <v-spacer />
          <v-btn icon variant="text" color="white" @click="showInvoiceDialog = false">
            <LucideIcon name="x" :size="20" />
          </v-btn>
        </v-toolbar>
        <v-card-text class="pa-6">
          <v-row dense>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="quickInv.invoice_number"
                label="رقم الفاتورة*"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="quickInv.case_id"
                :items="clientCasesOptions"
                item-title="label"
                item-value="id"
                label="القضية المرتبطة (اختياري)"
                variant="outlined"
                clearable
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model.number="quickInv.amount"
                type="number"
                label="المبلغ الأساسي (SAR)*"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-select
                v-model.number="quickInv.vat_rate"
                :items="[
                  { title: '15% ضريبة القيمة المضافة', value: 0.15 },
                  { title: '0% معفاة من الضريبة', value: 0 }
                ]"
                label="نسبة الضريبة"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-select
                v-model="quickInv.status"
                :items="[
                  { title: 'مدفوعة', value: 'paid' },
                  { title: 'مرسلة / مستحقة', value: 'sent' },
                  { title: 'مسودة', value: 'draft' }
                ]"
                label="حالة الفاتورة"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="quickInv.description"
                label="بيان الفاتورة / وصف الخدمة*"
                variant="outlined"
                rows="2"
              />
            </v-col>
            <v-col cols="12">
              <div class="pa-3 rounded-lg bg-grey-lighten-4 d-flex justify-space-between align-center">
                <span class="font-weight-bold">الإجمالي شامل الضريبة:</span>
                <span class="text-h6 font-weight-black text-primary">
                  {{ formatCurrency((Number(quickInv.amount) || 0) * (1 + Number(quickInv.vat_rate || 0))) }}
                </span>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-btn variant="text" @click="showInvoiceDialog = false">إلغاء</v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            class="px-6 font-weight-black"
            :loading="savingInv"
            :disabled="!quickInv.amount || quickInv.amount <= 0"
            @click="saveQuickInvoice"
          >
            إصدار وحفظ الفاتورة
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Notification Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" rounded="pill" timeout="4000">
      <span class="font-weight-black">{{ snackbar.text }}</span>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useClientsStore } from '../../stores/clients'
import { useFinanceStore } from '../../stores/finance'
import { useOfficeAccountsStore } from '../../stores/officeAccounts'
import LucideIcon from '../common/LucideIcon.vue'

const clientsStore = useClientsStore()
const financeStore = useFinanceStore()
const officeStore = useOfficeAccountsStore()

const localClients = ref<any[]>([])
const selectedClientId = ref('')
const loading = ref(false)
const exportingPdf = ref(false)
const activeTab = ref('transactions')
const summaryData = ref<any | null>(null)

const snackbar = reactive({ show: false, text: '', color: 'success' })
const notify = (text: string, color = 'success') => {
  snackbar.text = text
  snackbar.color = color
  snackbar.show = true
}

const clientItems = computed(() =>
  clientsStore.clients?.length ? clientsStore.clients : localClients.value
)

const summary = computed(() => summaryData.value?.summary)
const services = computed(() => summaryData.value?.services || [])
const payments = computed(() => summaryData.value?.payments || [])
const transactions = computed(() => summaryData.value?.transactions || summaryData.value?.payments || [])
const invoices = computed(() => summaryData.value?.invoices || [])
const vouchers = computed(() => summaryData.value?.vouchers || [])
const clientCases = computed(() => summaryData.value?.cases || [])

const clientCasesOptions = computed(() =>
  clientCases.value.map((c: any) => ({
    id: c.id,
    label: `${c.case_number} - ${c.subject || c.case_type_name || 'قضية'} (المتبقي: ${formatCurrency(c.remaining || 0)})`
  }))
)

const collectionRate = computed(() => {
  if (!summary.value || !summary.value.total_due) return 0
  return Math.min(100, Math.round((summary.value.total_paid / summary.value.total_due) * 100))
})

const totalPaid = computed(() =>
  payments.value.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
)

const totalExpenses = computed(() =>
  transactions.value
    .filter((t: any) => t.type === 'expense')
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)
)

const totals = computed(() => {
  const t = { total: 0, paid: 0, remaining: 0 }
  services.value.forEach((s: any) => {
    t.total += Number(s.total_amount || 0)
    t.paid += Number(s.paid_amount || 0)
    t.remaining += Number(s.remaining_amount || 0)
  })
  return t
})

const incomeCategories = [
  'أتعاب محاماة',
  'دفعة مقدمة / عربون',
  'دفعة استشارة قانونية',
  'أتعاب صياغة وعقود',
  'أتعاب خدمات قانونية',
  'مصاريف قضائية مستردة'
]

const expenseCategories = [
  'رسوم قضائية',
  'مستلزمات قانونية',
  'أتعاب خبراء ومحكمين',
  'سفريات وانتقالات قضية',
  'ترجمة وتوثيق',
  'أخرى'
]

// Quick Transaction State
const showPaymentDialog = ref(false)
const savingTx = ref(false)
const quickTx = reactive({
  type: 'income' as 'income' | 'expense',
  case_id: null as string | null,
  category: 'أتعاب محاماة',
  amount: 0,
  date: new Date().toISOString().split('T')[0],
  description: '',
  issueInvoice: false
})

const openQuickPaymentDialog = (svc?: any) => {
  quickTx.type = 'income'
  quickTx.case_id = svc?.case_id || (svc?.item_kind === 'case' ? svc.id : null)
  quickTx.category = 'أتعاب محاماة'
  quickTx.amount = svc?.remaining_amount > 0 ? Number(svc.remaining_amount) : 0
  quickTx.date = new Date().toISOString().split('T')[0]
  quickTx.description = svc
    ? `دفعة أتعاب عن ${svc.service_type_name || ''} رقم ${svc.engagement_number || ''}`
    : 'دفعة أتعاب محاماة'
  quickTx.issueInvoice = false
  showPaymentDialog.value = true
}

const saveQuickTransaction = async () => {
  if (!selectedClientId.value || !quickTx.amount) return
  savingTx.value = true
  try {
    const txId = await financeStore.addTransaction({
      type: quickTx.type,
      client_id: selectedClientId.value,
      case_id: quickTx.case_id || null,
      amount: Number(quickTx.amount),
      category: quickTx.category || (quickTx.type === 'income' ? 'أتعاب محاماة' : 'رسوم قضائية'),
      description: quickTx.description,
      date: quickTx.date,
      expense_owner_type: quickTx.case_id ? 'case' : 'client',
      vat_rate: 0
    } as any)

    if (quickTx.issueInvoice) {
      await financeStore.addInvoice({
        invoice_number: `INV-${Date.now().toString().slice(-6)}`,
        client_id: selectedClientId.value,
        case_id: quickTx.case_id || undefined,
        date: quickTx.date,
        amount: Number(quickTx.amount),
        vat_rate: 0.15,
        vat_amount: Math.round(Number(quickTx.amount) * 0.15 * 100) / 100,
        total_amount: Math.round(Number(quickTx.amount) * 1.15 * 100) / 100,
        status: quickTx.type === 'income' ? 'paid' : 'sent',
        description: quickTx.description || quickTx.category,
        linked_transaction_id: txId
      } as any)
    }

    showPaymentDialog.value = false
    await loadClientSummary(selectedClientId.value)
    notify('تم تسجيل الحركة المالية وتحديث كشف حساب العميل بنجاح')
  } catch (e: any) {
    notify(e?.message || 'فشل حفظ الحركة المالية', 'error')
  } finally {
    savingTx.value = false
  }
}

// Quick Invoice State
const showInvoiceDialog = ref(false)
const savingInv = ref(false)
const quickInv = reactive({
  invoice_number: '',
  case_id: null as string | null,
  amount: 0,
  vat_rate: 0.15,
  status: 'paid',
  description: '',
  linked_transaction_id: null as string | null
})

const openQuickInvoiceDialog = (tx?: any) => {
  quickInv.invoice_number = `INV-${Date.now().toString().slice(-6)}`
  quickInv.case_id = tx?.case_id || null
  quickInv.amount = tx?.amount ? Number(tx.amount) : 0
  quickInv.vat_rate = 0.15
  quickInv.status = tx?.type === 'income' ? 'paid' : 'sent'
  quickInv.description = tx
    ? tx.notes || tx.description || `${tx.category || 'أتعاب محاماة'} - ${tx.case_number || ''}`
    : 'أتعاب محاماة وخدمات قانونية'
  quickInv.linked_transaction_id = tx?.id || null
  showInvoiceDialog.value = true
}

const openQuickInvoiceDialogForItem = (svc: any) => {
  quickInv.invoice_number = `INV-${Date.now().toString().slice(-6)}`
  quickInv.case_id = svc.item_kind === 'case' ? svc.id : svc.case_id || null
  quickInv.amount = Number(svc.remaining_amount || svc.total_amount || 0)
  quickInv.vat_rate = 0.15
  quickInv.status = svc.remaining_amount <= 0 && svc.total_amount > 0 ? 'paid' : 'sent'
  quickInv.description = `أتعاب ${svc.service_type_name || 'قضية'} رقم ${svc.engagement_number || ''}`
  quickInv.linked_transaction_id = null
  showInvoiceDialog.value = true
}

const saveQuickInvoice = async () => {
  if (!selectedClientId.value || !quickInv.amount) return
  savingInv.value = true
  try {
    const subtotal = Number(quickInv.amount)
    const vatAmt = Math.round(subtotal * Number(quickInv.vat_rate || 0) * 100) / 100
    const totalAmt = subtotal + vatAmt

    const invId = await financeStore.addInvoice({
      invoice_number: quickInv.invoice_number,
      client_id: selectedClientId.value,
      case_id: quickInv.case_id || undefined,
      date: new Date().toISOString().split('T')[0],
      amount: subtotal,
      subtotal,
      vat_rate: Number(quickInv.vat_rate || 0),
      vat_amount: vatAmt,
      tax_amount: vatAmt,
      total_amount: totalAmt,
      total: totalAmt,
      status: quickInv.status as any,
      description: quickInv.description,
      notes: quickInv.description,
      linked_transaction_id: quickInv.linked_transaction_id || undefined
    } as any)

    showInvoiceDialog.value = false
    await loadClientSummary(selectedClientId.value)
    notify('تم إصدار الفاتورة الضريبية للعميل بنجاح')
    if (invId) {
      await printInvoiceById(invId)
    }
  } catch (e: any) {
    notify(e?.message || 'فشل إصدار الفاتورة', 'error')
  } finally {
    savingInv.value = false
  }
}

const printInvoiceById = async (invoiceId: string) => {
  try {
    const res = await (window.api as any).reports?.exportPdf?.({
      type: 'invoice',
      params: { id: invoiceId, promptSave: true }
    })
    if (res?.saved) {
      notify(`تم حفظ الفاتورة بصيغة PDF في: ${res.path}`)
    }
  } catch (e: any) {
    notify(e?.message || 'تعذر تصدير الفاتورة', 'error')
  }
}

const printVoucherById = async (voucherId: string) => {
  try {
    const res = await (window.api as any).reports?.exportPdf?.({
      type: 'voucher',
      params: { id: voucherId, promptSave: true }
    })
    if (res?.saved) {
      notify(`تم حفظ السند بصيغة PDF في: ${res.path}`)
    }
  } catch (e: any) {
    notify(e?.message || 'تعذر تصدير السند', 'error')
  }
}

const exportStatementPdf = async () => {
  if (!selectedClientId.value) return
  exportingPdf.value = true
  try {
    const res = await (window.api as any).reports?.exportPdf?.({
      type: 'client-statement',
      params: { clientId: selectedClientId.value }
    })
    if (res?.saved) {
      notify(`تم حفظ كشف حساب العميل PDF في: ${res.path}`)
    }
  } catch (e: any) {
    notify(e?.message || 'تعذر تصدير كشف الحساب', 'error')
  } finally {
    exportingPdf.value = false
  }
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 2
  }).format(val || 0)

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('ar-SA')
  } catch {
    return dateStr
  }
}

const getServiceStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
      return 'success'
    case 'partial':
      return 'warning'
    case 'overdue':
      return 'error'
    default:
      return 'grey'
  }
}

const getServiceStatusLabel = (status: string) => {
  switch (status) {
    case 'paid':
      return 'مدفوع بالكامل'
    case 'partial':
      return 'مدفوع جزئياً'
    case 'overdue':
      return 'متأخر'
    case 'pending':
      return 'معلق'
    case 'closed':
      return 'مغلق'
    default:
      return status || 'معلق'
  }
}

const loadClientSummary = async (clientId: string) => {
  if (!clientId) {
    summaryData.value = null
    return
  }
  loading.value = true
  try {
    await officeStore.fetchClientSummary(clientId)
    summaryData.value = officeStore.clientSummary
  } catch (e) {
    console.error('Error loading client summary:', e)
    summaryData.value = null
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    if (!clientsStore.clients?.length) {
      await clientsStore.fetchClients?.()
    }
    if (!clientsStore.clients?.length) {
      const all = await window.api.clients.getAll()
      localClients.value = Array.isArray(all) ? all : []
    }
  } catch (e) {
    console.error('Failed to load clients in ClientFinancialStatement:', e)
  }
})
</script>
