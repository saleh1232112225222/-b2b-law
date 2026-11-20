<template>
  <v-dialog
    :model-value="show"
    max-width="960"
    scrollable
    persistent
    :fullscreen="isMobile"
    @update:model-value="$emit('update:show', $event)"
  >
    <v-card class="client-report-dialog-card rounded-xl border-gold">
      <!-- Modal Header -->
      <v-card-item class="dialog-header pa-4 pa-md-5 border-b border-gold">
        <div class="d-flex justify-space-between align-center flex-wrap gap-2">
          <div class="d-flex align-center gap-3">
            <div class="report-icon-box pa-2 rounded-lg bg-gold-gradient">
              <LucideIcon name="file-text" :size="24" class="text-ebony" />
            </div>
            <div>
              <div class="text-h6 font-weight-black text-black">
                تقرير جلسة العميل المعتمد
              </div>
              <div class="text-caption font-weight-bold text-muted-gold">
                النموذج القانوني المعتمد ─ إحاطة الموكل بالوقائع وقرار الدائرة والإجراءات القادمة
              </div>
            </div>
          </div>

          <div class="d-flex align-center gap-2">
            <!-- Dispatch Status Badge -->
            <v-chip
              :color="statusChipColor"
              variant="flat"
              class="font-weight-black px-3"
              size="small"
            >
              <LucideIcon :name="statusChipIcon" :size="14" class="me-1" />
              {{ reportData?.dispatch?.statusLabel || 'مسودة' }}
            </v-chip>

            <v-btn
              icon
              variant="text"
              density="comfortable"
              color="black"
              @click="$emit('update:show', false)"
            >
              <LucideIcon name="x" :size="20" />
            </v-btn>
          </div>
        </div>
      </v-card-item>

      <v-card-text class="dialog-body pa-4 pa-md-5 bg-dialog-body">
        <div v-if="loading" class="text-center py-10">
          <v-progress-circular indeterminate color="primary" size="48" />
          <div class="text-caption text-black mt-3 font-weight-black">
            جاري تجهيز وتجميع بيانات تقرير الجلسة...
          </div>
        </div>

        <div v-else-if="loadError" class="text-center py-8">
          <v-alert type="error" variant="tonal" class="rounded-xl mb-4 border border-error">
            <div class="font-weight-black mb-1">تعذر جلب بيانات التقرير</div>
            <div class="text-caption">{{ loadError }}</div>
          </v-alert>
          <v-btn color="primary" variant="flat" class="rounded-lg font-weight-bold text-white" @click="loadReport">
            إعادة المحاولة
          </v-btn>
        </div>

        <div v-else-if="reportData" class="d-flex flex-column gap-3">
          <!-- Top Executive Quick Summary Strip (شريط ملخص سريع للموكل في 5 ثوان) -->
          <div class="quick-summary-bar pa-3 rounded-lg border-gold-thick">
            <div class="d-flex align-center justify-space-between flex-wrap gap-2 text-body-2">
              <div class="d-flex align-center gap-2">
                <span class="summary-label">نتيجة الجلسة:</span>
                <span class="summary-value text-primary font-weight-black">{{ reportData.sessionInfo.result }}</span>
              </div>
              <div class="divider-dot d-none d-sm-inline">│</div>
              <div class="d-flex align-center gap-2">
                <span class="summary-label">الجلسة القادمة:</span>
                <span class="summary-value font-weight-black">
                  {{ nextSessionSummaryText }}
                </span>
              </div>
              <div class="divider-dot d-none d-sm-inline">│</div>
              <div class="d-flex align-center gap-2">
                <span class="summary-label">المطلوب من الموكل:</span>
                <span :class="editForm.clientHasAction ? 'text-error font-weight-black' : 'text-success font-weight-black'">
                  {{ editForm.clientHasAction ? (editForm.clientAction || 'مطلوب إجراء') : 'لا يوجد مطلوب حالياً' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Audit Trail Banner -->
          <div class="audit-trail-card pa-2 px-3 rounded-lg border-gold">
            <div class="d-flex align-center justify-space-between flex-wrap gap-2 text-caption">
              <div class="d-flex align-center gap-2">
                <LucideIcon name="shield-check" :size="16" class="text-primary" />
                <span class="text-muted-gold font-weight-bold">حالة التوثيق والاعتماد:</span>
                <span class="font-weight-black text-black">{{ reportData.dispatch.statusLabel }}</span>
              </div>
              <div v-if="reportData.dispatch.sentAt" class="text-success font-weight-black">
                تاريخ الإرسال: {{ reportData.dispatch.sentAt }}
                <span v-if="reportData.dispatch.sentViaLabel">({{ reportData.dispatch.sentViaLabel }})</span>
              </div>
              <div v-else-if="reportData.dispatch.approvedAt" class="text-primary font-weight-black">
                تم الاعتماد بتاريخ: {{ reportData.dispatch.approvedAt }}
              </div>
              <div v-else class="text-muted-gold font-weight-bold">
                مسودة جاهزة للمراجعة والاعتماد
              </div>
            </div>
          </div>

          <!-- Block 1: Case Particulars (بيانات القضية) -->
          <div class="block-card pa-4 rounded-xl border-gold">
            <div class="d-flex align-center justify-space-between mb-3 border-b-gold pb-2">
              <div class="block-title text-black">
                <LucideIcon name="briefcase" :size="17" class="text-primary me-1" />
                ١. بيانات القضية
              </div>
              <v-chip size="x-small" color="primary" variant="flat" class="font-weight-black text-white">
                {{ reportData.caseInfo.phase || 'المرحلة الابتدائية' }}
              </v-chip>
            </div>

            <v-row dense class="text-caption">
              <v-col cols="12" sm="6" md="3">
                <div class="field-lbl">رقم القضية:</div>
                <div class="field-val">{{ reportData.caseInfo.caseNumber }}</div>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <div class="field-lbl">المحكمة والدائرة:</div>
                <div class="field-val">{{ reportData.caseInfo.court }} / {{ reportData.caseInfo.circuit }}</div>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <div class="field-lbl">الموكل وصفته:</div>
                <div class="field-val">{{ reportData.clientName }} (صفته: {{ reportData.caseInfo.clientRole }})</div>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <div class="field-lbl">الطرف الخصم:</div>
                <div class="field-val">{{ reportData.caseInfo.opponentName }}</div>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <div class="field-lbl">قيمة المطالبة:</div>
                <div class="field-val text-primary">{{ formattedClaimAmount }}</div>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <div class="field-lbl">ناظر القضية / الدائرة:</div>
                <div class="field-val">{{ reportData.caseInfo.judgeName || reportData.caseInfo.circuit || 'الدائرة المختصة' }}</div>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <div class="field-lbl">المحامي المسؤول:</div>
                <div class="field-val">{{ reportData.caseInfo.responsibleLawyer }}</div>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <div class="field-lbl">تاريخ القيد:</div>
                <div class="field-val">{{ reportData.caseInfo.registrationDate }}</div>
              </v-col>
            </v-row>

            <!-- Subject Toggle & Short Summary (موضوع الدعوى إظهاره اختياري وملخص) -->
            <div class="mt-3 pt-2 border-t-gold">
              <div class="d-flex align-center justify-space-between flex-wrap gap-2 mb-2">
                <div class="d-flex align-center gap-2">
                  <v-switch
                    v-model="editForm.showSubjectInReport"
                    color="primary"
                    density="compact"
                    hide-details
                    label="إظهار موضوع الدعوى في التقرير المعتمد"
                    class="font-weight-black text-black"
                  />
                </div>
                <span class="text-caption text-muted-gold font-weight-bold">
                  (يظهر كملخص مختصر لمنع شغل مساحة التقرير)
                </span>
              </div>

              <div v-if="editForm.showSubjectInReport" class="mt-1">
                <label class="field-lbl mb-1 d-block">ملخص موضوع الدعوى المعتمد للتقرير:</label>
                <v-text-field
                  v-model="editForm.shortSubject"
                  density="compact"
                  variant="outlined"
                  class="high-contrast-input"
                  placeholder="مثال: مطالبة مالية برد مبالغ محولة على سبيل الأمانة..."
                  hide-details
                />
              </div>
            </div>
          </div>

          <!-- Block 2: Session Info & Attendance (بيانات الجلسة وتوثيق الحضور) -->
          <div class="block-card pa-4 rounded-xl border-gold">
            <div class="d-flex align-center justify-space-between mb-3 border-b-gold pb-2">
              <div class="block-title text-black">
                <LucideIcon name="calendar" :size="17" class="text-primary me-1" />
                ٢. بيانات الجلسة المنعقدة وتوثيق الحضور
              </div>
              <v-chip size="x-small" color="primary" variant="outlined" class="font-weight-black">
                الجلسة رقم ({{ reportData.sessionInfo.sessionNumber }})
              </v-chip>
            </div>

            <v-row dense class="text-caption">
              <v-col cols="12" sm="6" md="3">
                <div class="field-lbl">تاريخ الجلسة:</div>
                <div class="field-val">
                  {{ reportData.sessionInfo.sessionDate }}
                  <span v-if="reportData.sessionInfo.sessionDateHijri">({{ reportData.sessionInfo.sessionDateHijri }})</span>
                </div>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <div class="field-lbl">وقت الجلسة والقاعة:</div>
                <div class="field-val">
                  {{ reportData.sessionInfo.sessionTime || 'غير محدد' }} | قاعة: {{ reportData.sessionInfo.courtRoom || 'إلكترونية' }}
                </div>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <label class="field-lbl d-block mb-1">نوع الجلسة:</label>
                <v-select
                  v-model="editForm.sessionType"
                  :items="['جلسة مرافعة', 'جلسة تحضيرية', 'تبادل مذكرات', 'جلسة خبرة', 'جلسة استجواب', 'نطق بالحكم']"
                  density="compact"
                  variant="outlined"
                  class="high-contrast-input"
                  hide-details
                />
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <label class="field-lbl d-block mb-1">حضور الأطراف (توثيق نظامي):</label>
                <v-select
                  v-model="editForm.attendance"
                  :items="[
                    'حضر وكيل موكلنا وحضر وكيل الخصم',
                    'حضر وكيل موكلنا وتخلف الخصم عن الحضور',
                    'حضر وكيل الخصم وتخلف وكيل موكلنا',
                    'حضر موكلنا أصالة وحضر الخصم',
                    'تخلف الطرفان عن الحضور'
                  ]"
                  density="compact"
                  variant="outlined"
                  class="high-contrast-input"
                  hide-details
                />
              </v-col>
            </v-row>
          </div>

          <!-- Block 3: Proceedings (مجريات الجلسة - قلب التقرير) -->
          <div class="block-card pa-4 rounded-xl border-gold">
            <div class="d-flex align-center justify-space-between mb-2 border-b-gold pb-2">
              <div class="block-title text-black">
                <LucideIcon name="message-square" :size="17" class="text-primary me-1" />
                ٣. ملخص مجريات ووقائع الجلسة (قلب التقرير)
              </div>
              <span class="text-caption text-muted-gold font-weight-bold">
                إيضاح وافٍ لما دار بين الأطراف والدائرة
              </span>
            </div>

            <!-- Client Summary Textarea -->
            <div class="mb-3">
              <label class="field-lbl d-block mb-1">
                الصياغة الشاملة لمجريات الجلسة (الموجهة للموكل):
              </label>
              <v-textarea
                v-model="editForm.clientSummary"
                rows="3"
                variant="outlined"
                density="comfortable"
                class="high-contrast-input text-body-2"
                placeholder="اكتب ماذا حدث في الجلسة بالتفصيل: ماذا قدمنا، ماذا طلب الخصم، وما وجهت به الدائرة..."
                hide-details
              />
            </div>

            <!-- Detailed Sub-Blocks Accordion -->
            <v-expansion-panels variant="accordion" class="border-gold-subtle rounded-lg">
              <v-expansion-panel class="bg-card-subtle">
                <v-expansion-panel-title class="pa-2 text-caption font-weight-black text-black">
                  <LucideIcon name="layers" :size="15" class="me-2 text-primary" />
                  تفصيل الدفوع والمذكرات المتبادلة (اختياري - يثري التقرير الرسمي المطبوع)
                </v-expansion-panel-title>
                <v-expansion-panel-text class="pa-3">
                  <v-row dense>
                    <v-col cols="12" sm="6">
                      <label class="field-lbl d-block mb-1">ما قدمه وكيل موكلنا:</label>
                      <v-textarea
                        v-model="editForm.ourSubmissions"
                        rows="2"
                        variant="outlined"
                        density="compact"
                        class="high-contrast-input text-caption"
                        placeholder="المذكرات والدفوع والطلبات المقدمة بالجلسة..."
                        hide-details
                      />
                    </v-col>
                    <v-col cols="12" sm="6">
                      <label class="field-lbl d-block mb-1">ما قدمه الخصم وأبرز ما أثاره:</label>
                      <v-textarea
                        v-model="editForm.opponentSubmissions"
                        rows="2"
                        variant="outlined"
                        density="compact"
                        class="high-contrast-input text-caption"
                        placeholder="طلبات الخصم، الدفوع المثارة، المستندات المودعة..."
                        hide-details
                      />
                    </v-col>
                    <v-col cols="12" sm="6">
                      <label class="field-lbl d-block mb-1">ردنا على ما أثاره الخصم:</label>
                      <v-textarea
                        v-model="editForm.ourReply"
                        rows="2"
                        variant="outlined"
                        density="compact"
                        class="high-contrast-input text-caption"
                        placeholder="الرد النظامي والدفوع المضادة..."
                        hide-details
                      />
                    </v-col>
                    <v-col cols="12" sm="6">
                      <label class="field-lbl d-block mb-1">توجيه وأسئلة الدائرة القضائية:</label>
                      <v-textarea
                        v-model="editForm.courtDirectives"
                        rows="2"
                        variant="outlined"
                        density="compact"
                        class="high-contrast-input text-caption"
                        placeholder="ما قررته الدائرة، المهل الممنوحة، الاستفسارات الموجهة..."
                        hide-details
                      />
                    </v-col>
                  </v-row>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </div>

          <!-- Block 4: Court Decision & Postponement Reason (قرار الدائرة وسبب التأجيل) -->
          <div class="block-card pa-4 rounded-xl border-gold">
            <div class="d-flex align-center justify-space-between mb-3 border-b-gold pb-2">
              <div class="block-title text-black">
                <LucideIcon name="gavel" :size="17" class="text-primary me-1" />
                ٤. قرار الدائرة القضائية ومواعيد المتابعة
              </div>
              <v-chip
                v-if="reportData.sessionInfo.isPostponed"
                size="x-small"
                color="warning"
                variant="flat"
                class="font-weight-black"
              >
                تأجيل معتمد
              </v-chip>
            </div>

            <v-row dense class="text-caption">
              <v-col cols="12" sm="6">
                <div class="field-lbl">القرار الصادر بالجلسة:</div>
                <div class="field-val text-primary text-body-2 font-weight-black">
                  {{ reportData.sessionInfo.result }}
                </div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="field-lbl">سبب التأجيل المعتمد:</div>
                <div class="field-val font-weight-black">
                  {{ reportData.sessionInfo.postponementReason }}
                </div>
              </v-col>
            </v-row>

            <div v-if="reportData.nextSessionInfo" class="mt-3 pt-2 border-t-gold">
              <v-row dense class="text-caption">
                <v-col cols="12" sm="4">
                  <div class="field-lbl">موعد الجلسة القادمة:</div>
                  <div class="field-val font-weight-black">
                    {{ reportData.nextSessionInfo.date }}
                    <span v-if="reportData.nextSessionInfo.time"> – الساعة {{ reportData.nextSessionInfo.time }}</span>
                  </div>
                </v-col>
                <v-col cols="12" sm="4">
                  <div class="field-lbl">المدة المتبقية:</div>
                  <div class="field-val text-primary font-weight-black">
                    {{ reportData.nextSessionInfo.daysRemaining !== undefined ? `باقٍ ${reportData.nextSessionInfo.daysRemaining} يوماً` : 'محددة بالنظام' }}
                  </div>
                </v-col>
                <v-col cols="12" sm="4">
                  <div class="field-lbl">القاعة / الرابط:</div>
                  <div class="field-val">
                    {{ reportData.nextSessionInfo.courtRoom || 'جلسة مرئية / إلكترونية' }}
                  </div>
                </v-col>
              </v-row>
            </div>
          </div>

          <!-- Block 5: Case Position After Session (موقف القضية بعد الجلسة) -->
          <div class="block-card pa-4 rounded-xl border-gold">
            <div class="d-flex align-center justify-space-between mb-3 border-b-gold pb-2">
              <div class="block-title text-black">
                <LucideIcon name="compass" :size="17" class="text-primary me-1" />
                ٥. موقف القضية بعد الجلسة (تقييم موضوعي منضبط)
              </div>
            </div>

            <v-row dense>
              <v-col cols="12" sm="6">
                <label class="field-lbl d-block mb-1">المركز القضائي الحالي:</label>
                <v-select
                  v-model="editForm.statusAfterSession"
                  :items="[
                    'لا يوجد تغير جوهري في المركز القضائي للموكل',
                    'طرأ تطور إيجابي يعزز موقف موكلنا',
                    'طرأ تطور يحتاج إلى معالجة وتقديم دفوع إضافية',
                    'ظهر دفع أو مستند جديد من الخصم قيد الفحص',
                    'القضية بانتظار رد الخصم على مذكرتنا',
                    'القضية بانتظار قرار الدائرة / ورود تقرير الخبير',
                    'قفل باب المرافعة وحجز القضية للحكم'
                  ]"
                  density="compact"
                  variant="outlined"
                  class="high-contrast-input text-caption"
                  hide-details
                />
              </v-col>
              <v-col cols="12" sm="6">
                <label class="field-lbl d-block mb-1">أثر الجلسة الإجرائي على مسار القضية:</label>
                <v-textarea
                  v-model="editForm.effectOnCase"
                  rows="2"
                  variant="outlined"
                  density="compact"
                  class="high-contrast-input text-caption"
                  placeholder="بيان أثر الجلسة في سطرين دون توقعات جازمة..."
                  hide-details
                />
              </v-col>
            </v-row>
          </div>

          <!-- Block 6: Next Actions (الإجراءات القادمة - مدمجة لمنع التكرار) -->
          <div class="block-card pa-4 rounded-xl border-gold">
            <div class="d-flex align-center justify-space-between mb-3 border-b-gold pb-2">
              <div class="block-title text-black">
                <LucideIcon name="check-square" :size="17" class="text-primary me-1" />
                ٦. الإجراءات القادمة ومسؤوليات المتابعة (دمج التوجيهات والتكليفات)
              </div>
            </div>

            <v-row dense>
              <v-col cols="12" sm="4">
                <label class="field-lbl d-block mb-1">المهمة المطلوبة من المكتب:</label>
                <v-textarea
                  v-model="editForm.officeAction"
                  rows="2"
                  variant="outlined"
                  density="compact"
                  class="high-contrast-input text-caption"
                  placeholder="إعداد مذكرة الرد، حضور الجلسة..."
                  hide-details
                />
              </v-col>
              <v-col cols="12" sm="4">
                <label class="field-lbl d-block mb-1">المسؤول بالمكتب:</label>
                <v-text-field
                  v-model="editForm.officeResponsible"
                  density="compact"
                  variant="outlined"
                  class="high-contrast-input text-caption"
                  placeholder="المحامي المسؤول أو فريق الترافع..."
                  hide-details
                />
              </v-col>
              <v-col cols="12" sm="4">
                <label class="field-lbl d-block mb-1">الموعد النهائي للتنفيذ:</label>
                <v-text-field
                  v-model="editForm.officeDeadline"
                  density="compact"
                  variant="outlined"
                  class="high-contrast-input text-caption"
                  placeholder="مثال: قبل موعد الجلسة بـ 3 أيام..."
                  hide-details
                />
              </v-col>
            </v-row>

            <div class="mt-3 pt-2 border-t-gold">
              <div class="d-flex align-center gap-2 mb-2">
                <v-checkbox
                  v-model="editForm.clientHasAction"
                  color="primary"
                  density="compact"
                  hide-details
                  label="هل يوجد إجراء مطلوب من الموكل حالياً؟"
                  class="font-weight-black text-black"
                />
              </div>
              <div v-if="editForm.clientHasAction">
                <label class="field-lbl d-block mb-1">تحديد المطلوب من الموكل بدقة:</label>
                <v-text-field
                  v-model="editForm.clientAction"
                  density="compact"
                  variant="outlined"
                  class="high-contrast-input text-caption"
                  placeholder="تزويد المكتب بالمستندات الأصلية / السداد / الحضور الشخصي..."
                  hide-details
                />
              </div>
            </div>
          </div>

          <!-- Block 7: Client Alert (تنبيه وتوجيه الموكل) -->
          <div class="client-alert-card pa-4 rounded-xl border-gold-thick">
            <div class="d-flex align-center justify-space-between flex-wrap gap-2">
              <div class="d-flex align-center gap-2">
                <div class="alert-icon-tag">٧. تنبيه الموكل</div>
                <div class="text-body-2 font-weight-black text-black">
                  {{ editForm.clientHasAction 
                    ? `مطلوب منكم: ${editForm.clientAction || 'اتخاذ الإجراء المحدد أعلاه'}` 
                    : '«لا يوجد إجراء مطلوب من الموكل حالياً، ويتولى المكتب المتابعة القضائية والدفاع.»' }}
                </div>
              </div>
              <v-chip
                size="small"
                :color="editForm.clientHasAction ? 'error' : 'success'"
                variant="flat"
                class="font-weight-black text-white"
              >
                {{ editForm.clientHasAction ? 'مطلوب إجراء من الموكل' : 'تحت المتابعة المهنية' }}
              </v-chip>
            </div>
          </div>

          <!-- Strict Separation Notice -->
          <v-alert
            type="info"
            variant="tonal"
            color="primary"
            density="compact"
            class="rounded-lg border-dashed py-2"
          >
            <template #prepend>
              <LucideIcon name="lock" :size="18" class="text-primary me-2" />
            </template>
            <div class="text-caption font-weight-bold text-black">
              <strong>ضمان السرية والخصوصية:</strong> السجلات والملاحظات الداخلية للمكتب محجوبة تماماً ولا تظهر في التقرير الرسمي الصادر للعميل.
            </div>
          </v-alert>

          <!-- Internal Office Notes (Confidential) -->
          <v-expansion-panels variant="accordion">
            <v-expansion-panel class="bg-card-subtle border-gold rounded-lg">
              <v-expansion-panel-title class="pa-2 text-caption font-weight-black text-black">
                <LucideIcon name="eye-off" :size="16" class="me-2 text-primary" />
                سجل الملاحظات والمخاطر الداخلية للمكتب (محجوبة عن العميل تماماً)
              </v-expansion-panel-title>
              <v-expansion-panel-text class="pa-2">
                <v-textarea
                  v-model="editForm.internalNotes"
                  rows="2"
                  variant="outlined"
                  density="compact"
                  class="high-contrast-input text-caption"
                  placeholder="نقاط القوة والضعف، تقييم الخبير، الملاحظات الإدارية..."
                  hide-details
                />
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>
      </v-card-text>

      <v-divider class="border-gold" />

      <!-- Action Footer -->
      <v-card-actions class="dialog-footer pa-3 pa-md-4 d-flex flex-wrap justify-space-between align-center gap-2 bg-dialog-footer">
        <div class="d-flex align-center gap-2 flex-wrap">
          <!-- Save Edits Button -->
          <v-btn
            variant="flat"
            color="primary"
            height="40"
            class="rounded-lg font-weight-black text-white px-4"
            :loading="saving"
            :disabled="!canSend"
            @click="saveEdits"
          >
            <LucideIcon name="save" :size="16" class="me-1" />
            حفظ التعديلات
          </v-btn>

          <!-- Review Button (draft -> reviewed) -->
          <v-btn
            v-if="reportData?.dispatch?.status === 'draft'"
            variant="outlined"
            color="primary"
            height="40"
            class="rounded-lg font-weight-black px-4"
            :loading="transitioning"
            @click="transitionTo('reviewed')"
          >
            <LucideIcon name="check" :size="16" class="me-1" />
            تمت المراجعة
          </v-btn>

          <!-- Approve Button (reviewed/draft -> approved) -->
          <v-btn
            v-if="reportData?.dispatch?.status !== 'approved' && reportData?.dispatch?.status !== 'sent'"
            variant="flat"
            color="success"
            height="40"
            class="rounded-lg font-weight-black text-white px-4"
            :loading="transitioning"
            @click="transitionTo('approved')"
          >
            <LucideIcon name="check-circle" :size="16" class="me-1" />
            اعتماد التقرير
          </v-btn>
        </div>

        <div class="d-flex align-center gap-2 flex-wrap">
          <!-- Print / PDF Button -->
          <v-btn
            variant="outlined"
            color="black"
            height="40"
            class="rounded-lg font-weight-black px-4"
            :loading="printing"
            :disabled="!canSend"
            @click="printReport"
          >
            <LucideIcon name="printer" :size="16" class="me-1" />
            طباعة رسمية A4
          </v-btn>

          <!-- Send via WhatsApp Menu / Button -->
          <v-btn
            variant="flat"
            color="success"
            height="40"
            class="rounded-lg font-weight-black text-white px-4"
            :disabled="!canSend"
            @click="sendViaWhatsapp"
          >
            <LucideIcon name="share-2" :size="16" class="me-1" />
            إرسال عبر واتساب
          </v-btn>

          <!-- Record Manual Send -->
          <v-btn
            v-if="reportData?.dispatch?.status !== 'sent'"
            variant="text"
            color="primary"
            size="small"
            class="text-caption font-weight-black"
            @click="markSentManual"
          >
            توثيق التسليم يدوياً
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="saveFeedback.show" :color="saveFeedback.color" timeout="3500" location="top">
    <span class="font-weight-black">{{ saveFeedback.text }}</span>
  </v-snackbar>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import api from '../../api/ApiAdapter'
import LucideIcon from '../common/LucideIcon.vue'
import type { ClientSessionReportData } from '../../../../shared/ClientSessionReportDesktopService'

const props = defineProps<{
  show: boolean
  sessionId: string
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'updated'): void
}>()

const isMobile = computed(() => typeof window !== 'undefined' && window.innerWidth <= 768)

const loading = ref(false)
const loadError = ref('')
const saving = ref(false)
const saveFeedback = ref({ show: false, text: '', color: 'success' })
const transitioning = ref(false)
const printing = ref(false)
const reportData = ref<ClientSessionReportData | null>(null)

const editForm = ref({
  clientSummary: '',
  lawyerNoteAndNextStep: '',
  internalNotes: '',
  showSubjectInReport: true,
  shortSubject: '',
  attendance: 'حضر وكيل موكلنا وحضر وكيل الخصم',
  sessionType: 'جلسة مرافعة',
  ourSubmissions: '',
  opponentSubmissions: '',
  ourReply: '',
  courtDirectives: '',
  statusAfterSession: 'لا يوجد تغير جوهري في المركز القضائي للموكل',
  effectOnCase: '',
  clientHasAction: false,
  clientAction: '',
  officeAction: '',
  officeResponsible: '',
  officeDeadline: ''
})

const formattedClaimAmount = computed(() => {
  const amt = reportData.value?.caseInfo?.claimAmount
  if (amt === undefined || amt === null || amt === '') return 'غير محدد'
  const n = Number(amt)
  return !isNaN(n) && n > 0 ? `${n.toLocaleString('ar-SA')} ريال` : String(amt)
})

const nextSessionSummaryText = computed(() => {
  const n = reportData.value?.nextSessionInfo
  if (!n || !n.date) return 'لم تحدد بعد'
  let s = n.date
  if (n.time) s += ` – ${n.time}`
  if (n.daysRemaining !== undefined && n.daysRemaining !== null) {
    s += ` (خلال ${n.daysRemaining} يوم)`
  }
  return s
})

const statusChipColor = computed(() => {
  const s = reportData.value?.dispatch?.status
  if (s === 'sent') return 'success'
  if (s === 'approved') return 'primary'
  if (s === 'reviewed') return 'info'
  return 'warning'
})

const statusChipIcon = computed(() => {
  const s = reportData.value?.dispatch?.status
  if (s === 'sent') return 'check-check'
  if (s === 'approved') return 'check-circle'
  if (s === 'reviewed') return 'check'
  return 'file-edit'
})

const canSend = computed(() => {
  return reportData.value !== null
})

watch(
  [() => props.show, () => props.sessionId],
  ([show, sid]) => {
    if (show && sid) {
      loadReport()
    }
  },
  { immediate: true }
)

async function loadReport() {
  if (!props.sessionId) return
  loading.value = true
  loadError.value = ''
  try {
    const res = await (api as any).sessionOutcome.getClientReport(props.sessionId)
    const data = (res?.data || res) as ClientSessionReportData
    if (!data || typeof data !== 'object') {
      throw new Error('لم يتم استرجاع بيانات التقرير لهذه الجلسة')
    }
    reportData.value = data
    editForm.value.clientSummary = data.lawyerEdits?.clientSummary || ''
    editForm.value.lawyerNoteAndNextStep = data.lawyerEdits?.lawyerNoteAndNextStep || ''
    editForm.value.internalNotes = data.internalOnlyData?.internalNotes || ''

    editForm.value.showSubjectInReport = data.caseInfo?.showSubject !== false
    editForm.value.shortSubject = data.caseInfo?.shortSubject || data.caseInfo?.subject || ''

    editForm.value.attendance = data.sessionInfo?.attendance || 'حضر وكيل موكلنا وحضر وكيل الخصم'
    editForm.value.sessionType = data.sessionInfo?.sessionType || 'جلسة مرافعة'

    editForm.value.ourSubmissions = data.proceedings?.ourSubmissions || ''
    editForm.value.opponentSubmissions = data.proceedings?.opponentSubmissions || ''
    editForm.value.ourReply = data.proceedings?.ourReply || ''
    editForm.value.courtDirectives = data.proceedings?.courtDirectives || ''

    editForm.value.statusAfterSession = data.casePosition?.statusAfterSession || 'لا يوجد تغير جوهري في المركز القضائي للموكل'
    editForm.value.effectOnCase = data.casePosition?.effectOnCase || (data.sessionInfo?.isPostponed 
      ? 'لم يصدر في الجلسة قرار فاصل في الموضوع، واقتصر الإجراء على تأجيل نظر الدعوى لاستكمال تبادل المذكرات؛ ومن ثم لا يترتب على الجلسة الحالية تغير نهائي في المركز القضائي للموكل.'
      : 'متابعة مسار الدعوى وفق المستجدات القضائية المقررة.')

    editForm.value.clientHasAction = data.actionItems?.clientHasAction === true
    editForm.value.clientAction = data.actionItems?.clientAction || ''
    editForm.value.officeAction = data.actionItems?.officeAction || data.nextSessionInfo?.actionRequired || 'إعداد المذكرة ومتابعة الإجراءات'
    editForm.value.officeResponsible = data.actionItems?.officeResponsible || data.caseInfo?.responsibleLawyer || 'فريق الترافع بالمكتب'
    editForm.value.officeDeadline = data.actionItems?.officeDeadline || data.nextSessionInfo?.date || 'قبل الجلسة القادمة'
  } catch (err: any) {
    console.error('Failed to load client session report:', err)
    loadError.value = err?.message || 'تعذر تحميل بيانات تقرير الجلسة'
  } finally {
    loading.value = false
  }
}

async function saveEdits() {
  if (!props.sessionId) return
  saving.value = true
  try {
    const payload = {
      clientSummary: editForm.value.clientSummary,
      lawyerNoteAndNextStep: editForm.value.officeAction,
      internalNotes: editForm.value.internalNotes,
      caseId: reportData.value?.caseId,
      clientId: reportData.value?.clientId,
      showSubjectInReport: editForm.value.showSubjectInReport,
      shortSubject: editForm.value.shortSubject,
      attendance: editForm.value.attendance,
      sessionType: editForm.value.sessionType,
      proceedings: {
        ourSubmissions: editForm.value.ourSubmissions,
        opponentSubmissions: editForm.value.opponentSubmissions,
        ourReply: editForm.value.ourReply,
        courtDirectives: editForm.value.courtDirectives
      },
      casePosition: {
        statusAfterSession: editForm.value.statusAfterSession,
        effectOnCase: editForm.value.effectOnCase
      },
      actionItems: {
        clientAction: editForm.value.clientAction,
        clientHasAction: editForm.value.clientHasAction,
        officeAction: editForm.value.officeAction,
        officeResponsible: editForm.value.officeResponsible,
        officeDeadline: editForm.value.officeDeadline
      }
    }

    const res = await (api as any).sessionOutcome.updateClientReport(props.sessionId, payload)
    const data = res?.data || res
    reportData.value = data
    loadError.value = ''
    saveFeedback.value = { show: true, text: 'تم حفظ تعديلات التقرير بنجاح', color: 'success' }
    emit('updated')
  } catch (err: any) {
    console.error('Failed to save report edits:', err)
    saveFeedback.value = {
      show: true,
      text: 'فشل حفظ تعديلات التقرير: ' + (err?.message || 'خطأ غير متوقع'),
      color: 'error'
    }
  } finally {
    saving.value = false
  }
}

async function transitionTo(toStatus: 'draft' | 'reviewed' | 'approved' | 'sent', sentVia?: string) {
  if (!props.sessionId) return
  transitioning.value = true
  try {
    // Save edits first
    await saveEdits()

    const res = await (api as any).sessionOutcome.transitionClientReport(props.sessionId, toStatus, sentVia)
    const data = res?.data || res
    reportData.value = data
    emit('updated')
  } catch (err) {
    console.error('Failed to transition report status:', err)
  } finally {
    transitioning.value = false
  }
}

async function printReport() {
  if (!props.sessionId) return
  printing.value = true
  try {
    const html = await (api as any).sessionOutcome.getClientReportHtml(props.sessionId)
    if (typeof window !== 'undefined' && (window as any).electron?.ipcRenderer) {
      // In Desktop Electron, call native safe printHtml without opening window
      await (window as any).electron.ipcRenderer.invoke('pdf:print-html', html)
    } else {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(html)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
          printWindow.print()
        }, 300)
      }
    }
  } catch (err) {
    console.error('Failed to print client session report:', err)
  } finally {
    printing.value = false
  }
}

async function sendViaWhatsapp() {
  if (!reportData.value) return
  const d = reportData.value

  const lines = [
    `السلام عليكم ورحمة الله وبركاته،`,
    `المكرم / ${d.clientName} المحترم،`,
    ``,
    `نفيدكم بصدور تقرير جلسة قضائية معتمد للقضية رقم: (${d.caseInfo.caseNumber})`,
    `لدى: ${d.caseInfo.court} - ${d.caseInfo.circuit}`,
    `صفة موكلنا: ${d.caseInfo.clientRole} | الطرف الخصم: ${d.caseInfo.opponentName}`,
    ``,
    `⚡ ملخص سريع:`,
    `• نتيجة الجلسة: ${d.sessionInfo.result}`,
    d.sessionInfo.isPostponed ? `• سبب التأجيل: ${d.sessionInfo.postponementReason}` : '',
    `• الجلسة القادمة: ${nextSessionSummaryText.value}`,
    `• المطلوب منكم: ${editForm.value.clientHasAction ? (editForm.value.clientAction || 'مطلوب إجراء') : 'لا يوجد مطلوب حالياً'}`,
    ``,
    `📋 مجريات الجلسة:`,
    editForm.value.clientSummary,
    ``,
    `🧭 موقف القضية بعد الجلسة:`,
    editForm.value.statusAfterSession,
    editForm.value.effectOnCase ? `(${editForm.value.effectOnCase})` : '',
    ``,
    `🛠️ الإجراءات القادمة:`,
    `• المطلوب من المكتب: ${editForm.value.officeAction}`,
    `• المسؤول: ${editForm.value.officeResponsible} | الموعد: ${editForm.value.officeDeadline}`,
    editForm.value.clientHasAction ? `• المطلوب منكم: ${editForm.value.clientAction}` : `• تنبيه: لا يوجد إجراء مطلوب منكم حالياً، ويتولى المكتب المتابعة القضائية.`,
    ``,
    `شاكرين لكم ثقتكم الكريمة،`,
    `${d.caseInfo.responsibleLawyer || 'مكتب المحاماة والاستشارات القانونية'}`
  ].filter(Boolean)

  const text = encodeURIComponent(lines.join('\n'))
  let phone = String(d.clientPhone || '').replace(/\D/g, '')
  if (phone.startsWith('05')) {
    phone = '966' + phone.slice(1)
  }

  const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`
  window.open(url, '_blank')

  // Automatically record as sent via WhatsApp
  await transitionTo('sent', 'whatsapp')
}

async function markSentManual() {
  await transitionTo('sent', 'manual_print')
}
</script>

<style scoped>
.client-report-dialog-card {
  background: #ffffff !important;
  color: #000000 !important;
  border-width: 1.5px !important;
}

.bg-dialog-body {
  background: #fcfcfc !important;
}

.bg-dialog-footer {
  background: #f8f9fa !important;
}

.bg-gold-gradient {
  background: linear-gradient(135deg, #735c00 0%, #b89758 100%) !important;
}

.text-ebony {
  color: #ffffff !important;
}

.text-muted-gold {
  color: #735c00 !important;
}

.border-gold {
  border: 1px solid #735c00 !important;
}

.border-gold-thick {
  border: 1.5px solid #735c00 !important;
}

.border-gold-subtle {
  border: 1px solid rgba(115, 92, 0, 0.25) !important;
}

.border-b-gold {
  border-bottom: 1.5px solid #735c00 !important;
}

.border-t-gold {
  border-top: 1px dashed #735c00 !important;
}

.quick-summary-bar {
  background: #faf7ed !important;
}

.summary-label {
  color: #735c00;
  font-weight: 900;
}

.divider-dot {
  color: #b89758;
  font-weight: 900;
}

.audit-trail-card {
  background: #ffffff !important;
}

.block-card {
  background: #ffffff !important;
}

.block-title {
  font-size: 14px;
  font-weight: 900;
  display: flex;
  align-items: center;
}

.field-lbl {
  color: #735c00;
  font-size: 11px;
  font-weight: 800;
}

.field-val {
  color: #000000;
  font-size: 13px;
  font-weight: 800;
  word-break: break-word;
}

.client-alert-card {
  background: #faf7ed !important;
}

.alert-icon-tag {
  background: #735c00;
  color: #ffffff;
  font-size: 11.5px;
  font-weight: 900;
  padding: 3px 8px;
  border-radius: 4px;
}

.bg-card-subtle {
  background: #fdfdfd !important;
}

/* High Contrast Input Styling: White background, Jet Black Text, Bold, Gold Border */
.high-contrast-input :deep(.v-field) {
  background: #ffffff !important;
  border-color: #735c00 !important;
  color: #000000 !important;
}

.high-contrast-input :deep(textarea),
.high-contrast-input :deep(input),
.high-contrast-input :deep(.v-select__selection-text) {
  color: #000000 !important;
  font-weight: 800 !important;
  font-size: 13px !important;
}

.high-contrast-input :deep(.v-field--focused) {
  border-color: #735c00 !important;
  box-shadow: 0 0 0 1px #735c00 !important;
}
</style>
