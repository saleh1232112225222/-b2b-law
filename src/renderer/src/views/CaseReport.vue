<template>
  <v-container fluid class="pa-4 pa-md-6 pb-12 rtl report-page">
    <PrintReportFrame title="تقرير القضية التنفيذي الشامل" />

    <!-- Top Header Bar -->
    <v-row dense class="mb-6 align-center report-header-bar">
      <v-col cols="12" md="8">
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-3 pa-md-4 rounded-xl me-4 border-gold opacity-20">
            <LucideIcon name="scale" :size="32" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">
              تقرير القضية التنفيذي الشامل
            </h1>
            <p class="text-caption text-md-subtitle-2 text-gold opacity-70 font-weight-bold mb-0">
              ملف تنفيذي موحد وشامل لبيانات القضية طبقاً لعقد البيانات المعتمد (تقرير قضية شامل)
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="4" class="text-left mt-2 mt-md-0 d-flex justify-md-end gap-2">
        <v-btn
          variant="outlined"
          color="gold"
          class="rounded-lg px-4 font-weight-black"
          @click="$router.push('/reports')"
        >
          <LucideIcon name="arrow-right" :size="16" class="me-1" /> رجوع للمركز
        </v-btn>
      </v-col>
    </v-row>

    <!-- Controls & Filters Card -->
    <v-card elevation="0" class="glass-card pa-4 pa-md-6 border-gold border-opacity-20 rounded-xl mb-6">
      <v-row dense class="align-center">
        <v-col cols="12" md="6">
          <v-select
            v-model="caseId"
            :items="cases"
            :loading="loadingCases"
            item-title="title"
            item-value="value"
            label="اختر القضية للمعاينة"
            variant="outlined"
            class="glass-input"
            hide-details
            clearable
          >
            <template #prepend-inner>
              <LucideIcon name="briefcase" :size="20" class="text-gold me-2" />
            </template>
          </v-select>
        </v-col>
        <v-col cols="6" md="3">
          <v-text-field
            v-model="from"
            label="من تاريخ"
            type="date"
            variant="outlined"
            class="glass-input"
            hide-details
          />
        </v-col>
        <v-col cols="6" md="3">
          <v-text-field
            v-model="to"
            label="إلى تاريخ"
            type="date"
            variant="outlined"
            class="glass-input"
            hide-details
          />
        </v-col>
      </v-row>

      <!-- Action Buttons Row -->
      <v-row dense class="mt-4 align-center">
        <v-col cols="12" class="d-flex flex-wrap gap-2 justify-end">
          <v-btn
            color="accent"
            variant="flat"
            height="46"
            class="rounded-lg font-weight-black text-ebony"
            :loading="loading"
            :disabled="!caseId"
            @click="load"
          >
            <LucideIcon name="refresh-cw" :size="16" class="me-2" /> توليد التقرير
          </v-btn>

          <v-btn
            variant="tonal"
            color="white"
            height="46"
            class="rounded-lg px-4 font-weight-black"
            :loading="printPreviewLoading"
            :disabled="!caseId || loading"
            @click="printPage"
          >
            <LucideIcon name="printer" :size="18" class="me-2 text-gold" /> طباعة رسمية A4
          </v-btn>

          <v-btn
            variant="tonal"
            color="white"
            height="46"
            class="rounded-lg px-4 font-weight-black"
            :loading="exporting"
            :disabled="!caseId || loading"
            @click="exportPdf"
          >
            <LucideIcon name="file-text" :size="18" class="me-2 text-gold" /> تصدير PDF
          </v-btn>

          <v-btn
            variant="tonal"
            color="white"
            height="46"
            class="rounded-lg px-4 font-weight-black"
            :disabled="!report"
            @click="exportExcel"
          >
            <LucideIcon name="file-spreadsheet" :size="18" class="me-2 text-gold" /> تصدير Excel
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <!-- Loading State -->
    <v-row v-if="loading" dense class="mb-8">
      <v-col cols="12">
        <v-skeleton-loader type="card, table" class="glass-card rounded-xl" />
      </v-col>
    </v-row>

    <!-- Empty State -->
    <div v-else-if="!report && !loading" class="text-center py-16">
      <LucideIcon name="folder-search" :size="72" class="text-gold opacity-20 mb-4 mx-auto" />
      <div class="text-h6 text-gold opacity-50 font-weight-black">
        الرجاء اختيار قضية لتوليد التقرير الشامل
      </div>
    </div>

    <!-- MAIN DOSSIER REPORT (12 Canonical Sections) -->
    <div v-else-if="dossier" class="dossier-container">
      <!-- Section 1: Executive Status Ribbon -->
      <v-card elevation="0" class="glass-card pa-4 pa-md-6 border-gold border-opacity-30 rounded-xl mb-6">
        <div class="d-flex align-center justify-space-between mb-4 border-b border-gold border-opacity-10 pb-3">
          <div class="d-flex align-center">
            <LucideIcon name="activity" :size="20" class="text-accent me-2" />
            <h2 class="text-h6 font-weight-black text-gold mb-0">أولاً: شريط الحالة التنفيذي الموحد</h2>
          </div>
          <v-chip size="small" color="accent" variant="flat" class="font-weight-black text-ebony">
            {{ dossier.executiveHeader.phase }}
          </v-chip>
        </div>

        <v-row dense>
          <!-- Case # and Phase -->
          <v-col cols="12" sm="6" md="3">
            <div class="kpi-card pa-4 rounded-lg h-100">
              <div class="text-caption text-gold opacity-70 font-weight-bold">رقم القضية</div>
              <div class="text-h6 font-weight-black text-white mt-1">{{ dossier.executiveHeader.caseNumber }}</div>
              <div class="text-caption text-accent font-weight-bold mt-1">{{ dossier.executiveHeader.phase }}</div>
            </div>
          </v-col>

          <!-- Current Status -->
          <v-col cols="12" sm="6" md="3">
            <div class="kpi-card pa-4 rounded-lg h-100">
              <div class="text-caption text-gold opacity-70 font-weight-bold">الحالة القضائية</div>
              <div class="text-h6 font-weight-black text-white mt-1">{{ dossier.executiveHeader.status }}</div>
              <div class="text-caption text-white opacity-60 mt-1">المحامي: {{ dossier.executiveHeader.responsibleLawyer }}</div>
            </div>
          </v-col>

          <!-- Next Session & Countdown -->
          <v-col cols="12" sm="6" md="3">
            <div class="kpi-card pa-4 rounded-lg h-100 border-accent">
              <div class="text-caption text-gold opacity-70 font-weight-bold">الجلسة القادمة</div>
              <template v-if="dossier.executiveHeader.nextSession">
                <div class="text-h6 font-weight-black text-accent mt-1">
                  {{ dossier.executiveHeader.nextSession.date }}
                </div>
                <div class="text-caption font-weight-bold" :class="dossier.executiveHeader.nextSession.daysRemaining <= 3 ? 'text-error' : 'text-accent'">
                  {{ dossier.executiveHeader.nextSession.daysRemaining === 0 ? 'اليوم موعد الجلسة' : dossier.executiveHeader.nextSession.daysRemaining > 0 ? `متبقي ${dossier.executiveHeader.nextSession.daysRemaining} يوم على موعدها` : 'انقضت' }}
                </div>
              </template>
              <template v-else>
                <div class="text-body-2 font-weight-bold text-white opacity-50 mt-2">لا توجد جلسات مجدولة</div>
              </template>
            </div>
          </v-col>

          <!-- Closest Statutory Deadline -->
          <v-col cols="12" sm="6" md="3">
            <div class="kpi-card pa-4 rounded-lg h-100">
              <div class="text-caption text-gold opacity-70 font-weight-bold">أقرب مهلة نظامية</div>
              <template v-if="dossier.executiveHeader.closestDeadline">
                <div class="text-subtitle-2 font-weight-black text-warning mt-1 text-truncate">
                  {{ dossier.executiveHeader.closestDeadline.type }}
                </div>
                <div class="text-caption text-warning font-weight-bold mt-1">
                  الاستحقاق: {{ dossier.executiveHeader.closestDeadline.deadlineDate }} (متبقي {{ dossier.executiveHeader.closestDeadline.daysRemaining }} يوم)
                </div>
              </template>
              <template v-else>
                <div class="text-caption text-white opacity-50 mt-2">لا توجد مهلة نظامية سارية [D]</div>
              </template>
            </div>
          </v-col>
        </v-row>

        <!-- Last Judicial Action Bar -->
        <v-card elevation="0" class="mt-4 pa-3 rounded-lg border border-gold border-opacity-10 bg-black-opacity">
          <div class="d-flex align-center flex-wrap gap-2 text-body-2">
            <span class="text-gold font-weight-black">آخر إجراء قضائي:</span>
            <template v-if="dossier.executiveHeader.lastJudicialAction">
              <v-chip size="x-small" color="accent" variant="tonal" class="font-weight-black">
                {{ dossier.executiveHeader.lastJudicialAction.type }}
              </v-chip>
              <span class="text-white font-weight-bold">{{ dossier.executiveHeader.lastJudicialAction.title }}</span>
              <span class="text-gold opacity-60 font-mono text-caption">({{ dossier.executiveHeader.lastJudicialAction.date }})</span>
              <span v-if="dossier.executiveHeader.lastJudicialAction.resultOrStatus" class="text-white opacity-80 text-caption">
                — النتيجة: {{ dossier.executiveHeader.lastJudicialAction.resultOrStatus }}
              </span>
            </template>
            <template v-else>
              <span class="text-white opacity-50">لا توجد وقائع قضائية مسجلة حتى الآن</span>
            </template>
          </div>
        </v-card>
      </v-card>

      <!-- Section 2: Case Info & Parties -->
      <v-card elevation="0" class="glass-card pa-4 pa-md-6 border-gold border-opacity-20 rounded-xl mb-6">
        <div class="d-flex align-center mb-4 border-b border-gold border-opacity-10 pb-3">
          <LucideIcon name="landmark" :size="20" class="text-accent me-2" />
          <h2 class="text-h6 font-weight-black text-gold mb-0">ثانياً: بيانات القضية الأساسية وأطراف النزاع</h2>
        </div>

        <v-row dense class="mb-4">
          <v-col cols="12" sm="6" md="3">
            <div class="data-badge"><span class="label">المحكمة:</span> <span class="val">{{ dossier.caseInfo.court }}</span></div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="data-badge"><span class="label">الدائرة:</span> <span class="val">{{ dossier.caseInfo.circuit }}</span></div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="data-badge"><span class="label">تاريخ القيد:</span> <span class="val">{{ dossier.caseInfo.registrationDate }} ({{ dossier.caseInfo.registrationDateHijri }})</span></div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="data-badge"><span class="label">صفة موكلنا:</span> <span class="val font-weight-black text-accent">{{ dossier.caseInfo.clientRole }}</span></div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="data-badge"><span class="label">التصنيف:</span> <span class="val">{{ dossier.caseInfo.mainClassification }} / {{ dossier.caseInfo.subClassification }}</span></div>
          </v-col>
          <v-col cols="12" sm="6" md="9">
            <div class="data-badge">
              <span class="label">رابط ناجز:</span>
              <span class="val">
                <a v-if="dossier.caseInfo.najizUrl && dossier.caseInfo.najizUrl !== 'غير مسجل'" :href="dossier.caseInfo.najizUrl" target="_blank" class="text-accent text-decoration-none">
                  {{ dossier.caseInfo.najizUrl }}
                </a>
                <span v-else class="text-white opacity-40">غير مسجل [D]</span>
              </span>
            </div>
          </v-col>
        </v-row>

        <div class="table-responsive">
          <v-table density="compact" class="glass-table">
            <thead>
              <tr>
                <th class="text-right text-gold">الاسم</th>
                <th class="text-right text-gold">الصفة في الدعوى</th>
                <th class="text-right text-gold">رقم الهوية / السجل</th>
                <th class="text-right text-gold">الجنسية</th>
                <th class="text-right text-gold">رقم التواصل</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, idx) in dossier.caseInfo.parties" :key="idx">
                <td class="text-white font-weight-black">{{ p.name }}</td>
                <td>
                  <v-chip size="x-small" :color="p.partyType === 'client' ? 'accent' : 'error'" variant="tonal" class="font-weight-black">
                    {{ p.role }}
                  </v-chip>
                </td>
                <td class="text-white opacity-80 font-mono">{{ p.idNumber }}</td>
                <td class="text-white opacity-80">{{ p.nationality }}</td>
                <td class="text-white opacity-80 font-mono">{{ p.phone || '-' }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card>

      <!-- Section 3: Dispute Summary & Narrative -->
      <v-card elevation="0" class="glass-card pa-4 pa-md-6 border-gold border-opacity-20 rounded-xl mb-6">
        <div class="d-flex align-center mb-4 border-b border-gold border-opacity-10 pb-3">
          <LucideIcon name="file-text" :size="20" class="text-accent me-2" />
          <h2 class="text-h6 font-weight-black text-gold mb-0">ثالثاً: ملخص النزاع والطلبات القضائية</h2>
        </div>

        <v-row dense>
          <v-col cols="12" md="6">
            <div class="narrative-panel pa-4 rounded-lg mb-3">
              <div class="text-caption text-gold font-weight-black mb-1">موضوع الدعوى وسياقها:</div>
              <div class="text-body-2 text-white">{{ dossier.disputeSummary.subject }}</div>
            </div>
          </v-col>
          <v-col cols="12" md="6">
            <div class="narrative-panel pa-4 rounded-lg mb-3">
              <div class="text-caption text-gold font-weight-black mb-1">
                التقييم القانوني المسجل <v-chip size="x-small" color="gold" variant="outlined" class="ms-1">بيان تحليلي مسجل [C]</v-chip>
              </div>
              <div class="text-body-2 text-white">{{ dossier.disputeSummary.assessment }}</div>
            </div>
          </v-col>
          <v-col cols="12" md="6">
            <div class="narrative-panel pa-4 rounded-lg mb-3">
              <div class="text-caption text-accent font-weight-black mb-1">طلبات موكلنا:</div>
              <div class="text-body-2 text-white">{{ dossier.disputeSummary.clientRequirement }}</div>
            </div>
          </v-col>
          <v-col cols="12" md="6">
            <div class="narrative-panel pa-4 rounded-lg mb-3">
              <div class="text-caption text-error font-weight-black mb-1">طلبات المدعي / الخصم:</div>
              <div class="text-body-2 text-white">{{ dossier.disputeSummary.plaintiffRequests }}</div>
            </div>
          </v-col>
        </v-row>
      </v-card>

      <!-- Section 4: Litigation & Execution Financials -->
      <v-card elevation="0" class="glass-card pa-4 pa-md-6 border-gold border-opacity-20 rounded-xl mb-6">
        <div class="d-flex align-center justify-space-between mb-4 border-b border-gold border-opacity-10 pb-3">
          <div class="d-flex align-center">
            <LucideIcon name="coins" :size="20" class="text-accent me-2" />
            <h2 class="text-h6 font-weight-black text-gold mb-0">رابعاً: المبالغ القضائية وموضوع النزاع والتنفيذ</h2>
          </div>
          <v-chip size="x-small" color="success" variant="tonal" class="font-weight-black">
            فصل قطعي عن مالية أتعاب المكتب
          </v-chip>
        </div>

        <v-row dense class="mb-4">
          <v-col cols="12" sm="6" md="3">
            <div class="fin-kpi pa-4 rounded-lg text-center">
              <div class="text-caption text-gold opacity-70 font-weight-bold">المطالب به في الدعوى</div>
              <div class="text-h6 font-weight-black text-white mt-1">{{ formatCurrency(dossier.litigationFinancials.claimedAmount, dossier.litigationFinancials.hasFinancialAccess) }}</div>
            </div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="fin-kpi pa-4 rounded-lg text-center">
              <div class="text-caption text-gold opacity-70 font-weight-bold">المحكوم به رسمياً</div>
              <div class="text-h6 font-weight-black text-accent mt-1">{{ formatCurrency(dossier.litigationFinancials.awardedAmount, dossier.litigationFinancials.hasFinancialAccess) }}</div>
            </div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="fin-kpi pa-4 rounded-lg text-center">
              <div class="text-caption text-gold opacity-70 font-weight-bold">الفرق بين المطالب به والمحكوم به</div>
              <div class="text-h6 font-weight-black text-white mt-1">{{ formatCurrency(dossier.litigationFinancials.differenceAmount, dossier.litigationFinancials.hasFinancialAccess) }}</div>
            </div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="fin-kpi pa-4 rounded-lg text-center border-success">
              <div class="text-caption text-success font-weight-black">المحصل للعميل من التنفيذ</div>
              <div class="text-h6 font-weight-black text-success mt-1">{{ formatCurrency(dossier.litigationFinancials.collectedForClient, dossier.litigationFinancials.hasFinancialAccess) }}</div>
            </div>
          </v-col>
        </v-row>

        <!-- Isolated Office Agency Fees Box -->
        <v-card elevation="0" class="pa-4 rounded-lg border border-gold border-opacity-10 bg-black-opacity">
          <div class="text-caption text-gold font-weight-black mb-2">مالية أتعاب الوكالة مع المكتب (مستقلة عن موضوع النزاع):</div>
          <v-row v-if="!dossier.officeFinancials.hasFinancialAccess" dense>
            <v-col cols="12">
              <div class="text-caption text-warning font-weight-bold">غير مصرح بالاطلاع على التفاصيل المالية</div>
            </v-col>
          </v-row>
          <v-row v-else dense>
            <v-col cols="12" sm="4">
              <span class="text-caption text-white opacity-70">أتعاب الوكالة المتفق عليها:</span>
              <strong class="text-white ms-2">{{ formatCurrency(dossier.officeFinancials.contractAmount, dossier.officeFinancials.hasFinancialAccess) }}</strong>
            </v-col>
            <v-col cols="12" sm="4">
              <span class="text-caption text-white opacity-70">المسدد للمكتب حتى تاريخه:</span>
              <strong class="text-success ms-2">{{ formatCurrency(dossier.officeFinancials.totalPaidToOffice, dossier.officeFinancials.hasFinancialAccess) }}</strong>
            </v-col>
            <v-col cols="12" sm="4">
              <span class="text-caption text-white opacity-70">المتبقي بذمة الموكل:</span>
              <strong class="text-accent ms-2">{{ formatCurrency(dossier.officeFinancials.remainingOfficeFee, dossier.officeFinancials.hasFinancialAccess) }}</strong>
            </v-col>
          </v-row>
        </v-card>
      </v-card>

      <!-- Section 5: Unified Chronological Timeline -->
      <v-card elevation="0" class="glass-card pa-4 pa-md-6 border-gold border-opacity-20 rounded-xl mb-6">
        <div class="d-flex align-center justify-space-between mb-4 border-b border-gold border-opacity-10 pb-3">
          <div class="d-flex align-center">
            <LucideIcon name="clock" :size="20" class="text-accent me-2" />
            <h2 class="text-h6 font-weight-black text-gold mb-0">خامساً: التسلسل الزمني القضائي الشامل</h2>
          </div>
          <span class="text-caption text-gold opacity-60">مرتب تنازلياً من الجلسات، المذكرات، الأحكام، والتنفيذ</span>
        </div>

        <div class="table-responsive">
          <v-table density="compact" class="glass-table">
            <thead>
              <tr>
                <th class="text-right text-gold" style="width: 15%;">التاريخ</th>
                <th class="text-right text-gold" style="width: 18%;">نوع الإجراء القضائي</th>
                <th class="text-right text-gold">البيان والوقائع</th>
                <th class="text-right text-gold" style="width: 20%;">النتيجة / الموقف</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="dossier.timeline.length === 0">
                <td colspan="4" class="text-center py-6 text-white opacity-30">لا توجد وقائع مسجلة في الجدول الزمني</td>
              </tr>
              <tr v-for="(t, idx) in dossier.timeline" :key="idx">
                <td class="text-white font-mono text-caption">{{ t.date }}</td>
                <td>
                  <v-chip size="x-small" color="accent" variant="tonal" class="font-weight-black">
                    {{ t.type }}
                  </v-chip>
                </td>
                <td class="text-white font-weight-medium">{{ t.title }}</td>
                <td class="text-white opacity-80 text-caption">{{ t.resultOrStatus }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card>

      <!-- Section 6: Judgments, Appeals & Enforcement -->
      <v-card elevation="0" class="glass-card pa-4 pa-md-6 border-gold border-opacity-20 rounded-xl mb-6">
        <div class="d-flex align-center mb-4 border-b border-gold border-opacity-10 pb-3">
          <LucideIcon name="gavel" :size="20" class="text-accent me-2" />
          <h2 class="text-h6 font-weight-black text-gold mb-0">سادساً: الأحكام الصادرة وإجراءات الطعن والتنفيذ</h2>
        </div>

        <div class="text-subtitle-2 font-weight-black text-gold mb-2">الأحكام القضائية الصادرة:</div>
        <div class="table-responsive mb-6">
          <v-table density="compact" class="glass-table">
            <thead>
              <tr>
                <th class="text-right text-gold">رقم الحكم</th>
                <th class="text-right text-gold">تاريخه</th>
                <th class="text-right text-gold">النتيجة</th>
                <th class="text-right text-gold">منطوق الحكم المسجل [C]</th>
                <th class="text-right text-gold">مهلة الاعتراض</th>
                <th class="text-right text-gold">حالة الاعتراض</th>
                <th class="text-right text-gold">النفاذ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="dossier.judgmentsAndEnforcement.judgments.length === 0">
                <td colspan="7" class="text-center py-4 text-white opacity-30">لم تصدر أحكام قضائية مسجلة في هذا الملف بعد</td>
              </tr>
              <tr v-for="j in dossier.judgmentsAndEnforcement.judgments" :key="j.id">
                <td class="text-white font-weight-black">{{ j.judgmentNumber }}</td>
                <td class="text-white font-mono text-caption">{{ j.date }}</td>
                <td>
                  <v-chip size="x-small" :color="j.favor.includes('لصالح') ? 'success' : 'warning'" variant="tonal" class="font-weight-black">
                    {{ j.favor }}
                  </v-chip>
                </td>
                <td class="text-white opacity-80 text-caption" style="max-width: 250px;">{{ j.notes }}</td>
                <td class="text-white font-mono text-caption">
                  {{ j.objectionDeadline ? `${j.objectionDeadline} (${j.daysUntilDeadline !== null && j.daysUntilDeadline >= 0 ? `متبقي ${j.daysUntilDeadline} يوم` : 'منتهية'})` : 'غير محدد' }}
                </td>
                <td>
                  <v-chip size="x-small" :color="j.isObjectionHandled ? 'success' : 'warning'" variant="outlined">
                    {{ j.isObjectionHandled ? 'تم التعامل' : 'قيد المهلة' }}
                  </v-chip>
                </td>
                <td>
                  <v-chip size="x-small" :color="j.isExecutable ? 'success' : 'grey'" variant="outlined">
                    {{ j.isExecutable ? 'صالح للتنفيذ' : 'غير مشمول بالنفاذ' }}
                  </v-chip>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <div class="text-subtitle-2 font-weight-black text-gold mb-2">طلبات التنفيذ المرتبطة:</div>
        <div class="table-responsive">
          <v-table density="compact" class="glass-table">
            <thead>
              <tr>
                <th class="text-right text-gold">رقم الطلب</th>
                <th class="text-right text-gold">محكمة التنفيذ</th>
                <th class="text-right text-gold">السند وتاريخه</th>
                <th class="text-right text-gold">الحالة</th>
                <th class="text-right text-gold">المبلغ المنفذ</th>
                <th class="text-right text-gold">المحصل للعميل</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="dossier.judgmentsAndEnforcement.enforcementRequests.length === 0">
                <td colspan="6" class="text-center py-4 text-white opacity-30">لا توجد طلبات تنفيذ مرتبطة مقيدة بالنظام</td>
              </tr>
              <tr v-for="er in dossier.judgmentsAndEnforcement.enforcementRequests" :key="er.id">
                <td class="text-white font-weight-black">{{ er.requestNo }}</td>
                <td class="text-white">{{ er.courtName }}</td>
                <td class="text-white opacity-80 text-caption">{{ er.instrumentNo }} ({{ er.instrumentDate }})</td>
                <td>
                  <v-chip size="x-small" color="accent" variant="tonal">{{ er.status }}</v-chip>
                </td>
                <td class="text-white font-mono">{{ formatCurrency(er.amountInstrument) }}</td>
                <td class="text-success font-weight-black font-mono">{{ formatCurrency(er.amountCollected) }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card>

      <!-- Section 7: Sessions Log -->
      <v-card elevation="0" class="glass-card pa-4 pa-md-6 border-gold border-opacity-20 rounded-xl mb-6">
        <div class="d-flex align-center justify-space-between mb-4 border-b border-gold border-opacity-10 pb-3">
          <div class="d-flex align-center">
            <LucideIcon name="calendar-days" :size="20" class="text-accent me-2" />
            <h2 class="text-h6 font-weight-black text-gold mb-0">سابعاً: سجل الجلسات القضائية والقرارات</h2>
          </div>
          <div class="text-caption text-gold font-weight-bold">
            إجمالي الجلسات: {{ dossier.sessionsSummary.totalSessions }}
          </div>
        </div>

        <v-row dense class="mb-4">
          <v-col cols="12" md="6">
            <div class="narrative-panel pa-4 rounded-lg h-100">
              <div class="text-caption text-gold font-weight-black mb-1">آخر جلسة وقرارها:</div>
              <template v-if="dossier.sessionsSummary.lastSession">
                <div class="text-subtitle-2 text-white font-weight-bold">
                  {{ dossier.sessionsSummary.lastSession.date }} — القاعة: {{ dossier.sessionsSummary.lastSession.courtRoom || 'غير محدد' }}
                </div>
                <div class="text-caption text-white opacity-80 mt-1">
                  <strong>القرار المسجل:</strong> {{ dossier.sessionsSummary.lastSession.result }}
                </div>
              </template>
              <template v-else>
                <div class="text-caption text-white opacity-40">لا توجد جلسات سابقة مسجلة</div>
              </template>
            </div>
          </v-col>
          <v-col cols="12" md="6">
            <div class="narrative-panel pa-4 rounded-lg h-100 border-accent">
              <div class="text-caption text-accent font-weight-black mb-1">الجلسة القادمة والمطلوب إجراؤه:</div>
              <template v-if="dossier.sessionsSummary.nextSession">
                <div class="text-subtitle-2 text-accent font-weight-bold">
                  {{ dossier.sessionsSummary.nextSession.date }} ({{ dossier.sessionsSummary.nextSession.time || 'صباحاً' }})
                </div>
                <div class="text-caption text-white mt-1">
                  <strong>المطلوب:</strong> {{ dossier.sessionsSummary.nextSession.requiredAction }}
                </div>
              </template>
              <template v-else>
                <div class="text-caption text-white opacity-40">لا توجد جلسات قادمة مجدولة</div>
              </template>
            </div>
          </v-col>
        </v-row>

        <div class="table-responsive">
          <v-table density="compact" class="glass-table">
            <thead>
              <tr>
                <th class="text-right text-gold">تاريخ الجلسة</th>
                <th class="text-right text-gold">الوقت</th>
                <th class="text-right text-gold">القاعة</th>
                <th class="text-right text-gold">الحالة</th>
                <th class="text-right text-gold">القرار / الملاحظات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in dossier.sessionsSummary.sessionsList" :key="s.id">
                <td class="text-white font-mono">{{ s.date }}</td>
                <td class="text-white opacity-80">{{ s.time || '-' }}</td>
                <td class="text-white opacity-80">{{ s.courtRoom || '-' }}</td>
                <td>
                  <v-chip size="x-small" :color="getSessionColor(s.status)" variant="tonal">{{ s.status }}</v-chip>
                </td>
                <td class="text-white opacity-90 text-caption">{{ s.result || s.notes || '-' }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card>

      <!-- Section 8: Memoranda -->
      <v-card elevation="0" class="glass-card pa-4 pa-md-6 border-gold border-opacity-20 rounded-xl mb-6">
        <div class="d-flex align-center justify-space-between mb-4 border-b border-gold border-opacity-10 pb-3">
          <div class="d-flex align-center">
            <LucideIcon name="file-symlink" :size="20" class="text-accent me-2" />
            <h2 class="text-h6 font-weight-black text-gold mb-0">ثامناً: المذكرات واللوائح القضائية المتبادلة</h2>
          </div>
          <span class="text-caption text-white opacity-40">* موقف الرد غير مهيكل ويُعرض كنص مسجل [C/D]</span>
        </div>

        <div class="table-responsive">
          <v-table density="compact" class="glass-table">
            <thead>
              <tr>
                <th class="text-right text-gold">عنوان المذكرة</th>
                <th class="text-right text-gold">النوع</th>
                <th class="text-right text-gold">تاريخ الإيداع</th>
                <th class="text-right text-gold">رقم ناجز</th>
                <th class="text-right text-gold">الحالة</th>
                <th class="text-right text-gold">الملخص المسجل</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="dossier.memoranda.length === 0">
                <td colspan="6" class="text-center py-4 text-white opacity-30">لا توجد مذكرات أو لوائح مسجلة</td>
              </tr>
              <tr v-for="m in dossier.memoranda" :key="m.id">
                <td class="text-white font-weight-black">{{ m.title }}</td>
                <td class="text-white opacity-80">{{ m.type }}</td>
                <td class="text-white font-mono text-caption">{{ m.date }}</td>
                <td class="text-white font-mono text-caption">{{ m.najizNumber }}</td>
                <td>
                  <v-chip size="x-small" color="accent" variant="tonal">{{ m.status }}</v-chip>
                </td>
                <td class="text-white opacity-80 text-caption">{{ m.summaryText }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card>

      <!-- Section 9: Expert Tracking -->
      <v-card elevation="0" class="glass-card pa-4 pa-md-6 border-gold border-opacity-20 rounded-xl mb-6">
        <div class="d-flex align-center justify-space-between mb-4 border-b border-gold border-opacity-10 pb-3">
          <div class="d-flex align-center">
            <LucideIcon name="user-check" :size="20" class="text-accent me-2" />
            <h2 class="text-h6 font-weight-black text-gold mb-0">تاسعاً: أعمال الخبرة القضائية</h2>
          </div>
          <span class="text-caption text-white opacity-40">* بيانات الخبرة هي نصوص مسجلة بالملف [C]</span>
        </div>

        <div class="table-responsive">
          <v-table density="compact" class="glass-table">
            <thead>
              <tr>
                <th class="text-right text-gold">اسم الخبير</th>
                <th class="text-right text-gold">التخصص</th>
                <th class="text-right text-gold">بيانات الاتصال</th>
                <th class="text-right text-gold">الملاحظات وموقف التقرير</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="dossier.experts.length === 0">
                <td colspan="4" class="text-center py-4 text-white opacity-30">لم يتم ندب خبير أو لا توجد بيانات خبرة مسجلة</td>
              </tr>
              <tr v-for="ex in dossier.experts" :key="ex.id">
                <td class="text-white font-weight-black">{{ ex.name }}</td>
                <td class="text-white opacity-80">{{ ex.specialty }}</td>
                <td class="text-white font-mono">{{ ex.phone }}</td>
                <td class="text-white opacity-80 text-caption">{{ ex.notes }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card>

      <!-- Section 10: Evidence & Documents -->
      <v-card elevation="0" class="glass-card pa-4 pa-md-6 border-gold border-opacity-20 rounded-xl mb-6">
        <div class="d-flex align-center justify-space-between mb-4 border-b border-gold border-opacity-10 pb-3">
          <div class="d-flex align-center">
            <LucideIcon name="paperclip" :size="20" class="text-accent me-2" />
            <h2 class="text-h6 font-weight-black text-gold mb-0">عاشراً: الأدلة والبينات والمستندات المرفوعة</h2>
          </div>
          <span class="text-caption text-white opacity-40">* لا تدّع وجود مستند ناقص لعدم وجود بنية بيانات له [D]</span>
        </div>

        <v-row dense>
          <v-col cols="12" md="6">
            <div class="text-caption text-gold font-weight-black mb-2">الأدلة والبينات المقيدة:</div>
            <div class="table-responsive">
              <v-table density="compact" class="glass-table">
                <thead>
                  <tr>
                    <th class="text-right text-gold">الدليل</th>
                    <th class="text-right text-gold">الوصف</th>
                    <th class="text-right text-gold">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="dossier.evidenceAndDocuments.evidence.length === 0">
                    <td colspan="3" class="text-center py-4 text-white opacity-30">لا توجد أدلة مسجلة</td>
                  </tr>
                  <tr v-for="e in dossier.evidenceAndDocuments.evidence" :key="e.id">
                    <td class="text-white font-weight-bold">{{ e.title }}</td>
                    <td class="text-white opacity-80 text-caption">{{ e.description }}</td>
                    <td><v-chip size="x-small" color="accent" variant="tonal">{{ e.status }}</v-chip></td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </v-col>
          <v-col cols="12" md="6">
            <div class="text-caption text-gold font-weight-black mb-2">المستندات الرقمية المرفوعة:</div>
            <div class="table-responsive">
              <v-table density="compact" class="glass-table">
                <thead>
                  <tr>
                    <th class="text-right text-gold">اسم الملف</th>
                    <th class="text-right text-gold">النوع</th>
                    <th class="text-right text-gold">الحجم</th>
                    <th class="text-right text-gold">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="dossier.evidenceAndDocuments.documents.length === 0">
                    <td colspan="4" class="text-center py-4 text-white opacity-30">لا توجد مستندات مرفوعة</td>
                  </tr>
                  <tr v-for="doc in dossier.evidenceAndDocuments.documents" :key="doc.id">
                    <td class="text-white font-weight-bold text-truncate" style="max-width: 180px;">📄 {{ doc.name }}</td>
                    <td class="text-white opacity-80 text-caption">{{ doc.fileType }}</td>
                    <td class="text-white opacity-80 font-mono text-caption">{{ doc.sizeFormatted }}</td>
                    <td class="text-white opacity-60 text-caption">{{ doc.uploadedAt }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </v-col>
        </v-row>
      </v-card>

      <!-- Section 11: Tasks & Next Steps -->
      <v-card elevation="0" class="glass-card pa-4 pa-md-6 border-gold border-opacity-20 rounded-xl mb-6">
        <div class="d-flex align-center mb-4 border-b border-gold border-opacity-10 pb-3">
          <LucideIcon name="check-square" :size="20" class="text-accent me-2" />
          <h2 class="text-h6 font-weight-black text-gold mb-0">الحادي عشر: خطة العمل والمهام المعلقة</h2>
        </div>

        <div class="table-responsive">
          <v-table density="compact" class="glass-table">
            <thead>
              <tr>
                <th class="text-right text-gold">عنوان المهمة</th>
                <th class="text-right text-gold">المسؤول عن التنفيذ</th>
                <th class="text-right text-gold">الأولوية</th>
                <th class="text-right text-gold">تاريخ الاستحقاق</th>
                <th class="text-right text-gold">حالة التأخير</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="dossier.tasksAndNextSteps.length === 0">
                <td colspan="5" class="text-center py-4 text-white opacity-30">لا توجد مهام معلقة على هذه القضية</td>
              </tr>
              <tr v-for="t in dossier.tasksAndNextSteps" :key="t.id">
                <td class="text-white font-weight-black">{{ t.title }}</td>
                <td class="text-white opacity-80">{{ t.responsible }}</td>
                <td>
                  <v-chip size="x-small" :color="t.priority.includes('عاجل') || t.priority.includes('عالية') ? 'error' : 'accent'" variant="tonal">
                    {{ t.priority }}
                  </v-chip>
                </td>
                <td class="text-white font-mono text-caption">{{ t.dueDate }}</td>
                <td>
                  <v-chip size="x-small" :color="t.isOverdue ? 'error' : 'success'" variant="outlined" class="font-weight-black">
                    {{ t.isOverdue ? 'متأخرة' : 'سارية' }}
                  </v-chip>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card>

      <!-- Section 12: Admin Audit -->
      <v-card elevation="0" class="glass-card pa-4 pa-md-6 border-gold border-opacity-20 rounded-xl mb-6">
        <div class="d-flex align-center justify-space-between mb-4 border-b border-gold border-opacity-10 pb-3">
          <div class="d-flex align-center">
            <LucideIcon name="shield-check" :size="20" class="text-accent me-2" />
            <h2 class="text-h6 font-weight-black text-gold mb-0">الثاني عشر: بيانات الإدارة وتدقيق السجل</h2>
          </div>
          <span class="text-caption text-white opacity-40">* مفصول تماماً ودلالياً عن آخر إجراء قضائي</span>
        </div>

        <v-row dense class="align-center">
          <v-col cols="12" sm="4">
            <div class="data-badge"><span class="label">تاريخ إنشاء السجل:</span> <span class="val font-mono">{{ dossier.adminAudit.recordCreatedAt }}</span></div>
          </v-col>
          <v-col cols="12" sm="4">
            <div class="data-badge"><span class="label">آخر تحديث للسجل:</span> <span class="val font-mono">{{ dossier.adminAudit.recordLastUpdated }}</span></div>
          </v-col>
          <v-col cols="12" sm="4">
            <div class="data-badge">
              <span class="label">آخر نشاط تقني:</span>
              <span class="val text-caption">
                {{ dossier.adminAudit.lastTechnicalActivity ? `${dossier.adminAudit.lastTechnicalActivity.action} (${dossier.adminAudit.lastTechnicalActivity.actor})` : 'لا يوجد نشاط تقني مسجل' }}
              </span>
            </div>
          </v-col>
        </v-row>
      </v-card>

      <PrintSignaturePage />
    </div>

    <!-- Print Preview Modal Dialog -->
    <v-dialog v-model="printPreviewDialog" width="90%" max-width="1024" scrollable>
      <v-card class="rounded-xl overflow-hidden glass-card">
        <v-toolbar color="primary" height="60" class="px-4">
          <LucideIcon name="printer" :size="20" class="me-2 text-gold" />
          <v-toolbar-title class="text-white font-weight-black">
            معاينة الطباعة الرسمية متعددة الصفحات (A4)
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon variant="text" color="white" @click="printPreviewDialog = false">
            <LucideIcon name="x" />
          </v-btn>
        </v-toolbar>
        <v-card-text class="pa-0" style="background: #e2e8f0;">
          <div v-if="printPreviewLoading" class="pa-12 text-center">
            <v-progress-circular indeterminate color="accent" size="48" />
            <div class="mt-4 text-slate-800 font-weight-black">جاري تجهيز وثيقة الطباعة الرسمية A4...</div>
          </div>
          <iframe
            v-else-if="printPreviewHtml"
            class="print-preview-frame"
            :srcdoc="printPreviewHtml"
          />
          <div v-else class="pa-8 text-center text-slate-600">
            {{ printPreviewError || 'لا توجد معاينة متاحة.' }}
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4 bg-slate-900 d-flex justify-space-between">
          <v-btn variant="text" class="font-weight-black text-white" @click="printPreviewDialog = false">
            إغلاق المعاينة
          </v-btn>
          <v-btn
            color="accent"
            variant="flat"
            class="font-weight-black px-6 text-ebony"
            :loading="printingReport"
            :disabled="printPreviewLoading || !printPreviewHtml"
            @click="printFromPreview"
          >
            <LucideIcon name="printer" :size="16" class="me-2" /> تنفيذ الطباعة الآن
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" rounded="pill" elevation="12" timeout="4000">
      <div class="d-flex align-center">
        <LucideIcon :name="snackbar.icon" :size="20" class="me-3" />
        <span class="font-weight-black">{{ snackbar.text }}</span>
      </div>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { safeArray } from '../utils/safe'
import PrintReportFrame from '../components/common/PrintReportFrame.vue'
import PrintSignaturePage from '../components/common/PrintSignaturePage.vue'
import LucideIcon from '../components/common/LucideIcon.vue'

const caseId = ref<string | null>(null)
const from = ref('')
const to = ref('')
const report = ref<any | null>(null)
const error = ref('')
const loading = ref(false)
const exporting = ref(false)
const printPreviewDialog = ref(false)
const printPreviewHtml = ref('')
const printPreviewLoading = ref(false)
const printPreviewError = ref('')
const printingReport = ref(false)
const loadingCases = ref(false)
const cases = ref<{ title: string; value: string }[]>([])

const snackbar = ref({ show: false, text: '', color: 'success', icon: 'check-circle' })
const showSnackbar = (text: string, type: 'success' | 'error' = 'success'): void => {
  snackbar.value = {
    show: true,
    text,
    color: type === 'success' ? 'success' : 'error',
    icon: type === 'success' ? 'check-circle' : 'alert-circle'
  }
}

// Canonical dossier object with legacy fallback adapter
const dossier = computed(() => {
  if (report.value?.dossier) return report.value.dossier
  if (!report.value?.case) return null

  const c = report.value.case || {}
  const k = report.value.kpis || {}
  const hasAccess = k.hasFinancialAccess ?? true

  return {
    executiveHeader: {
      caseNumber: c.case_number || 'غير محدد',
      phase: c.phase || 'المحاكمة الابتدائية',
      status: c.status || 'قيد النظر',
      responsibleLawyer: c.lawyer_name || 'غير محدد',
      nextSession: null,
      closestDeadline: null,
      lastJudicialAction: null
    },
    caseInfo: {
      caseId: c.id || '',
      caseNumber: c.case_number || 'غير محدد',
      court: c.court || 'غير محدد',
      circuit: c.circuit || 'غير محدد',
      registrationDate: c.created_at || 'غير مسجل',
      registrationDateHijri: '',
      clientRole: 'موكل',
      mainClassification: 'عامة',
      subClassification: '',
      caseType: c.case_type || c.type || 'عامة',
      najizUrl: '',
      parties: (c.parties || []).map((p: any) => ({
        name: p.name || '',
        role: p.role || (p.party_type === 'client' ? 'موكل' : 'خصم'),
        idNumber: p.id_number || '',
        nationality: p.nationality || '',
        partyType: p.party_type || 'client',
        phone: p.phone || ''
      }))
    },
    disputeSummary: {
      subject: c.subject || 'غير مسجل',
      clientRequirement: c.demands || 'غير مسجل',
      plaintiffRequests: 'غير مسجل',
      assessment: c.description || 'غير مسجل'
    },
    litigationFinancials: {
      claimedAmount: 0,
      awardedAmount: 0,
      differenceAmount: 0,
      collectedForClient: 0,
      currency: 'SAR',
      hasFinancialAccess: hasAccess
    },
    officeFinancials: {
      contractAmount: k.totalIn ?? 0,
      totalPaidToOffice: k.totalIn ?? 0,
      remainingOfficeFee: k.balance ?? 0,
      currency: 'SAR',
      hasFinancialAccess: hasAccess
    },
    timeline: [],
    judgmentsAndEnforcement: {
      judgments: [],
      enforcementRequests: []
    },
    sessionsSummary: {
      totalSessions: k.sessionsTotal ?? (report.value.sessions?.rows?.length || 0),
      lastSession: null,
      nextSession: null,
      sessionsList: report.value.sessions?.rows || []
    },
    memoranda: [],
    experts: [],
    evidenceAndDocuments: {
      evidence: [],
      documents: []
    },
    tasksAndNextSteps: [],
    adminAudit: {
      recordCreatedAt: 'غير مسجل',
      recordLastUpdated: 'غير مسجل',
      lastTechnicalActivity: null
    }
  }
})

const formatCurrency = (amount: number | string | null | undefined, hasAccess: boolean = true): string => {
  if (!hasAccess) return 'غير مصرح'
  if (amount === null || amount === undefined) return 'غير متوفر'
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0)) || 0
  return `${num} ر.س`
}

const getSessionColor = (status: string | undefined): string => {
  if (!status) return 'grey'
  if (status.includes('منتهية')) return 'success'
  if (status.includes('قادمة')) return 'accent'
  if (status.includes('مؤجلة')) return 'warning'
  return 'gold'
}

const load = async (): Promise<void> => {
  if (!caseId.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await (window as any).api.reports.getCaseReport({
      caseId: caseId.value,
      from: from.value || undefined,
      to: to.value || undefined
    })
    report.value = res
  } catch (e: unknown) {
    error.value = (e as Error)?.message || 'فشل جلب بيانات تقرير القضية الشامل'
    showSnackbar(error.value, 'error')
  } finally {
    loading.value = false
  }
}

const printPage = async (): Promise<void> => {
  if (!caseId.value) return
  printPreviewDialog.value = true
  printPreviewLoading.value = true
  printPreviewError.value = ''
  printPreviewHtml.value = ''
  try {
    const html = await (window as any).api.reports.getPreviewHtml({
      type: 'case-a4',
      params: {
        caseId: caseId.value,
        from: from.value || undefined,
        to: to.value || undefined
      }
    })
    printPreviewHtml.value = typeof html === 'string' ? html : ''
    if (!printPreviewHtml.value) {
      printPreviewError.value = 'تعذر توليد المعاينة (لم يتم إرجاع محتوى)'
    }
  } catch (e: unknown) {
    printPreviewError.value = (e as Error)?.message || 'تعذر فتح معاينة التقرير'
    showSnackbar(printPreviewError.value, 'error')
  } finally {
    printPreviewLoading.value = false
  }
}

const printFromPreview = async (): Promise<void> => {
  if (!caseId.value || printingReport.value) return
  printingReport.value = true
  try {
    const ok = await (window as any).api.reports.printReport({
      type: 'case-a4',
      params: {
        caseId: caseId.value,
        from: from.value || undefined,
        to: to.value || undefined
      }
    })
    if (ok) {
      showSnackbar('تم إرسال التقرير للطباعة بنجاح', 'success')
    } else {
      showSnackbar('تم إلغاء الطباعة', 'error')
    }
  } catch (e: unknown) {
    const msg = (e as Error)?.message || 'فشل تنفيذ الطباعة'
    showSnackbar(msg, 'error')
  } finally {
    printingReport.value = false
  }
}

const exportPdf = async (): Promise<void> => {
  if (!caseId.value) return
  exporting.value = true
  try {
    await (window as any).api.reports.printReport({
      type: 'case-a4',
      params: {
        caseId: caseId.value,
        from: from.value || undefined,
        to: to.value || undefined
      }
    })
    showSnackbar('تم بدء تصدير PDF بنجاح', 'success')
  } catch (e: unknown) {
    showSnackbar((e as Error)?.message || 'فشل تصدير PDF', 'error')
  } finally {
    exporting.value = false
  }
}

const exportExcel = async (): Promise<void> => {
  if (!dossier.value) return
  try {
    const rows = safeArray(dossier.value.timeline).map((t: any) => ({
      case_number: dossier.value.caseInfo.caseNumber,
      client_role: dossier.value.caseInfo.clientRole,
      court: dossier.value.caseInfo.court,
      circuit: dossier.value.caseInfo.circuit,
      event_date: t.date,
      event_type: t.type,
      event_title: t.title,
      event_result: t.resultOrStatus
    }))
    await (window as any).api.reports.exportCsv(`case-${dossier.value.caseInfo.caseNumber}.csv`, rows)
    showSnackbar('تم تصدير ملف Excel بنجاح', 'success')
  } catch {
    showSnackbar('فشل تصدير Excel', 'error')
  }
}

const loadCases = async (): Promise<void> => {
  loadingCases.value = true
  try {
    const rows = await (window as any).api.reports.listCases()
    cases.value = safeArray(rows).map((r: any) => ({
      value: r.id,
      title: `${r.case_number || r.id} — ${r.client_name || ''}`
    }))
  } catch (e: unknown) {
    console.error('Failed to load cases:', e)
  } finally {
    loadingCases.value = false
  }
}

onMounted(() => {
  loadCases()
})
</script>

<style scoped>
.report-page {
  max-width: 1400px;
  margin: 0 auto;
}

.kpi-card {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(217, 119, 6, 0.2);
}

.border-accent {
  border-color: rgba(217, 119, 6, 0.6) !important;
}

.border-success {
  border-color: rgba(34, 197, 94, 0.5) !important;
}

.bg-black-opacity {
  background: rgba(0, 0, 0, 0.35);
}

.data-badge {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.85rem;
}

.data-badge .label {
  color: #d97706;
  font-weight: 700;
  margin-left: 6px;
}

.data-badge .val {
  color: #f8fafc;
}

.narrative-panel {
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.fin-kpi {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.glass-table {
  background: transparent !important;
}

.glass-table th {
  font-weight: 900 !important;
  font-size: 0.85rem !important;
}

.print-preview-frame {
  width: 100%;
  height: 720px;
  border: none;
  background: #ffffff;
}

/* Mobile Responsive Adjustments */
@media (max-width: 768px) {
  .report-page {
    padding: 8px !important;
  }
  .report-header-bar h1 {
    font-size: 1.25rem !important;
  }
  .print-preview-frame {
    height: 500px;
  }
}

/* Print Rules */
@media print {
  .report-header-bar,
  .v-card:has(.glass-input),
  .v-btn,
  .no-print {
    display: none !important;
  }
  .dossier-container {
    color: #000000 !important;
  }
}
</style>
