<template>
  <v-container fluid class="pa-6 pb-12 rtl">
    <!-- Header -->
    <v-row dense class="mb-4 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-2 rounded-lg me-4 border-gold border-opacity-20">
            <LucideIcon name="settings" :size="24" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h6 font-weight-black text-primary mb-0">الإعدادات وصيانة النظام</h1>
            <p class="text-caption text-primary font-weight-black opacity-70">
              إدارة بيانات المكتب، المزامنة السحابية، وأدوات الصيانة
            </p>
          </div>
        </div>
      </v-col>
    </v-row>

    <v-row dense>
      <!-- Row 1: Core Identity & Licensing -->
      <v-col cols="12" md="6">
        <SettingsOfficeCard v-model="settings" @save="saveSettings" />

        <v-card
          elevation="0"
          class="glass-card mb-4 border border-gold border-opacity-20 glass-card"
        >
          <div class="pa-4 d-flex align-center border-b border-gold border-opacity-10">
            <LucideIcon name="crown" :size="20" class="text-gold me-3" />
            <span class="text-subtitle-1 font-weight-black text-primary">الاشتراك والترخيص</span>
            <v-spacer />
            <v-chip
              :color="trialInfo?.isActivated ? 'success' : trialInfo?.isValid ? 'gold' : 'error'"
              size="small"
              class="font-weight-black"
            >
              {{ trialInfo?.isActivated ? 'مفعل' : trialInfo?.isValid ? 'تجريبي' : 'منتهي' }}
            </v-chip>
          </div>
          <div class="pa-4">
            <div class="d-flex align-center mb-3">
              <LucideIcon name="shield-check" :size="18" class="text-gold me-3" />
              <div>
                <div class="text-body-2 font-weight-black">حالة الاشتراك</div>
                <div class="text-caption text-grey">
                  {{
                    trialInfo?.isActivated
                      ? 'اشتراك مدفوع'
                      : trialInfo?.isValid
                        ? 'تجربة مجانية'
                        : 'منتهية'
                  }}
                </div>
              </div>
            </div>
            <div
              v-if="trialInfo?.daysLeft !== undefined && trialInfo?.daysLeft < 999"
              class="d-flex align-center mb-3"
            >
              <LucideIcon name="clock" :size="18" class="text-gold me-3" />
              <div>
                <div class="text-body-2 font-weight-black">الأيام المتبقية</div>
                <div class="text-caption text-grey">{{ trialInfo.daysLeft }} يوم</div>
              </div>
            </div>
            <div class="d-flex align-center mb-3">
              <LucideIcon name="globe" :size="18" class="text-gold me-3" />
              <div>
                <div class="text-body-2 font-weight-black">نوع الترخيص</div>
                <div class="text-caption text-grey">اشتراك سحابي - مرتبط بالحساب</div>
              </div>
            </div>
            <v-btn
              block
              color="accent"
              class="font-weight-black rounded-xl mt-2 premium-btn-gold-gradient"
              @click="showSuspensionDialog = true"
            >
              <LucideIcon name="crown" :size="18" class="me-2" />
              {{ trialInfo?.isActivated ? 'إدارة الاشتراك' : 'اشترك الآن' }}
            </v-btn>
          </div>
        </v-card>

        <SettingsSecurityCard />
      </v-col>

      <!-- Row 2: Data & Sync -->
      <v-col cols="12" md="6">
        <v-card
          elevation="0"
          class="glass-card mb-4 border border-gold border-opacity-20 glass-card"
        >
          <div class="pa-4 d-flex align-center border-b border-gold border-opacity-10">
            <LucideIcon name="cloud-cog" :size="20" class="text-primary me-3" />
            <span class="text-subtitle-1 font-weight-black text-primary">المزامنة السحابية</span>
          </div>
          <v-card-text class="pa-4">
            <v-text-field
              v-model="gasUrl"
              label="رابط المزامنة (Google Apps Script)"
              variant="outlined"
              density="compact"
              class="mb-3 glass-input"
              hide-details="auto"
              @update:model-value="onGasUrlInput"
            ></v-text-field>
            <v-row dense class="mb-2">
              <v-col cols="4">
                <v-btn
                  variant="outlined"
                  color="gold"
                  block
                  class="font-weight-black premium-btn-gold-gradient"
                  size="small"
                  :loading="testingSync"
                  @click="testConnection"
                  >اختبار</v-btn
                >
              </v-col>
              <v-col cols="4">
                <v-btn
                  color="accent"
                  variant="flat"
                  block
                  class="font-weight-black premium-btn-gold-gradient"
                  size="small"
                  :loading="syncingCloud"
                  @click="handleCloudSync"
                  >مزامنة</v-btn
                >
              </v-col>
              <v-col cols="4">
                <v-btn
                  color="gold"
                  variant="tonal"
                  block
                  class="font-weight-black premium-btn-gold-gradient"
                  size="small"
                  @click="openSyncSheet"
                  >فتح الشيت</v-btn
                >
              </v-col>
            </v-row>
            <div class="d-flex align-center justify-space-between mb-4">
              <span class="text-caption text-gold font-weight-bold"
                >آخر مزامنة: {{ syncService.lastSyncTime }}</span
              >
              <v-btn
                variant="tonal"
                size="small"
                color="gold"
                class="font-weight-black px-4 premium-btn-gold-gradient"
                @click="copySyncScript"
              >
                <LucideIcon name="code" :size="14" class="me-1" />
                كود الإعداد والربط
              </v-btn>
            </div>
            <v-divider class="mb-4 opacity-10" />
            <div class="text-caption font-weight-bold text-white mb-2">
              استعادة سحابية آمنة (ملف منفصل):
            </div>
            <v-row dense>
              <v-col cols="6">
                <v-btn
                  class="premium-btn-gold-gradient"
                  variant="outlined"
                  color="gold"
                  block
                  size="small"
                  :loading="preparingRestore"
                  @click="prepareRestore"
                  >إنشاء ملف استعادة</v-btn
                >
              </v-col>
              <v-col cols="6">
                <v-btn
                  class="premium-btn-gold-gradient"
                  color="error"
                  variant="tonal"
                  block
                  size="small"
                  :loading="approvingRestore"
                  @click="approveRestore"
                  >اعتماد الاستعادة</v-btn
                >
              </v-col>
            </v-row>
            <v-alert
              v-if="restorePreview"
              type="info"
              variant="flat"
              density="compact"
              class="mt-3 glass-panel-light border-gold text-white rounded-lg"
            >
              <div class="text-tiny font-weight-bold">جاهز: {{ restorePreview.updatedAt }}</div>
              <div class="d-flex ga-1 mt-1">
                <v-btn
                  class="premium-btn-gold-gradient"
                  size="x-small"
                  variant="tonal"
                  color="gold"
                  @click="showRestoreInFolder"
                  >فتح</v-btn
                >
                <v-btn
                  class="premium-btn-gold-gradient"
                  size="x-small"
                  variant="tonal"
                  color="gold"
                  @click="exportRestoreFile"
                  >تصدير</v-btn
                >
              </div>
            </v-alert>
          </v-card-text>
        </v-card>

        <v-card
          elevation="0"
          class="glass-card mb-4 border border-gold border-opacity-20 glass-card"
        >
          <div class="pa-4 d-flex align-center border-b border-gold border-opacity-10">
            <LucideIcon name="database" :size="20" class="text-primary me-3" />
            <span class="text-subtitle-1 font-weight-black text-primary"
              >النسخ الاحتياطي والأمان</span
            >
          </div>
          <v-card-text class="pa-4">
            <v-row dense class="mb-4">
              <v-col cols="6">
                <v-btn
                  color="gold"
                  variant="outlined"
                  block
                  size="small"
                  class="font-weight-black settings-data-btn premium-btn-gold-gradient"
                  @click="exportBackup"
                  >تصدير قاعدة البيانات</v-btn
                >
              </v-col>
              <v-col cols="6">
                <v-btn
                  color="gold"
                  variant="outlined"
                  block
                  size="small"
                  class="font-weight-black settings-data-btn premium-btn-gold-gradient"
                  @click="importBackup"
                  >استيراد نسخة</v-btn
                >
              </v-col>
            </v-row>
            <v-row dense class="mb-4">
              <v-col cols="6">
                <v-btn
                  color="gold"
                  variant="outlined"
                  block
                  size="small"
                  class="font-weight-black settings-data-btn premium-btn-gold-gradient"
                  :loading="savingManualSnapshot"
                  @click="exportManualSnapshot"
                  >حفظ البيانات</v-btn
                >
              </v-col>
              <v-col cols="6">
                <v-btn
                  color="gold"
                  variant="outlined"
                  block
                  size="small"
                  class="font-weight-black settings-data-btn premium-btn-gold-gradient"
                  :loading="injectingManualSnapshot"
                  @click="injectManualSnapshot"
                  >حقن البيانات</v-btn
                >
              </v-col>
            </v-row>
            <v-text-field
              v-model="settings.casesRootPath"
              label="مجلد ملفات القضايا"
              variant="outlined"
              density="compact"
              readonly
              class="mb-4 glass-input"
              hide-details="auto"
            >
              <template #append-inner>
                <div class="d-flex ga-1">
                  <v-btn
                    class="premium-btn-gold-gradient"
                    variant="text"
                    size="small"
                    color="gold"
                    density="compact"
                    @click="chooseCasesRootFolder"
                    >تغيير</v-btn
                  >
                  <v-btn
                    class="premium-btn-gold-gradient"
                    variant="text"
                    size="small"
                    color="gold"
                    density="compact"
                    :disabled="!settings.casesRootPath"
                    @click="openCasesRootFolder"
                    >فتح</v-btn
                  >
                </div>
              </template>
            </v-text-field>
            <div class="d-flex ga-2">
              <v-btn
                variant="tonal"
                color="gold"
                size="small"
                class="flex-grow-1 premium-btn-gold-gradient"
                @click="exportSupportBundle"
                >تقرير دعم</v-btn
              >
              <v-btn
                variant="tonal"
                color="gold"
                size="small"
                class="flex-grow-1 premium-btn-gold-gradient"
                @click="captureScreenshot"
                >لقطة شاشة</v-btn
              >
            </div>
          </v-card-text>
        </v-card>

        <!-- System Wipe Alert -->
        <v-alert
          type="error"
          variant="tonal"
          density="compact"
          class="border border-error border-opacity-50 rounded-xl"
        >
          <div class="d-flex align-center justify-space-between">
            <div class="text-caption font-weight-black">مسح كافة البيانات (System Wipe)</div>
            <v-btn
              color="error"
              variant="flat"
              size="small"
              class="font-weight-black premium-btn-gold-gradient"
              @click="handleClear"
              >تنفيذ</v-btn
            >
          </div>
        </v-alert>
      </v-col>

      <!-- Row 3: Preferences & PDPL -->
      <v-col cols="12">
        <v-card elevation="0" class="glass-card border border-gold border-opacity-20 glass-card">
          <v-card-text class="pa-4 d-flex align-center flex-wrap ga-4">
            <div class="d-flex align-center ga-3 border-l border-gold border-opacity-20 pe-4">
              <LucideIcon name="timer" :size="20" class="text-primary" />
              <span class="text-body-2 font-weight-black text-primary">سياسة الاحتفاظ:</span>
              <v-text-field
                v-model.number="settings.activityLogRetentionDays"
                type="number"
                variant="outlined"
                density="compact"
                hide-details
                style="width: 80px"
                class="glass-input-compact glass-input"
              ></v-text-field>
              <span class="text-caption text-gold font-weight-bold">يوم</span>
            </div>

            <div class="d-flex align-center ga-3">
              <LucideIcon name="bell" :size="20" class="text-primary" />
              <span class="text-body-2 font-weight-black text-primary">تنبيه المهام:</span>
              <v-switch
                v-model="settings.taskNotificationsEnabled"
                color="gold"
                hide-details
                density="compact"
                inset
              />
              <v-text-field
                v-if="settings.taskNotificationsEnabled"
                v-model.number="settings.taskNotificationLeadDays"
                type="number"
                variant="outlined"
                density="compact"
                hide-details
                style="width: 70px"
                class="glass-input-compact glass-input"
              ></v-text-field>
              <span
                v-if="settings.taskNotificationsEnabled"
                class="text-caption text-gold font-weight-bold"
                >يوم مسبق</span
              >
            </div>

            <v-spacer />

            <div class="d-flex ga-2">
              <v-btn
                color="gold"
                variant="tonal"
                size="small"
                class="font-weight-black premium-btn-gold-gradient"
                @click="exportPerformanceReport"
                >تقرير أداء</v-btn
              >
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <SettingsWipeDialog v-model="showClearDialog" :clearing="clearing" @confirm="executeWipe" />

    <!-- Suspension Dialog -->
    <v-dialog v-model="showSuspensionDialog" max-width="500">
      <v-card class="glass-card overflow-hidden border-gold border-2 glass-card pa-6 text-center">
        <LucideIcon name="alert-triangle" :size="64" class="text-gold mx-auto mb-4" />
        <h2 class="text-h5 font-weight-black mb-4">الاشتراك معلق</h2>
        <p class="text-body-1 text-grey-darken-1 mb-6">
          عذراً، تم إيقاف صفحة الاشتراك والدفع مؤقتاً. يرجى مراجعة الدعم الفني لمعرفة المزيد من التفاصيل حول حالة اشتراكك وتفعيله.
        </p>
        <v-divider class="mb-6 opacity-10" />
        <h3 class="text-subtitle-1 font-weight-black mb-4">للتواصل مع الدعم الفني المباشر</h3>
        <div class="d-flex justify-center gap-3 flex-wrap">
          <v-btn
            color="success"
            variant="elevated"
            class="font-weight-black px-4 rounded-xl"
            href="https://wa.me/966567905696"
            target="_blank"
          >
            <LucideIcon name="message-circle" :size="18" class="me-2" />
            واتساب
          </v-btn>
          <v-btn
            color="primary"
            variant="outlined"
            class="font-weight-black px-4 rounded-xl"
            href="tel:0567905696"
          >
            <LucideIcon name="phone" :size="18" class="me-2" />
            اتصال
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- Google Apps Script Instructions Dialog -->
    <v-dialog v-model="showGasInstructions" max-width="700">
      <v-card class="glass-card overflow-hidden border-gold border-2 glass-card">
        <div class="pa-6 d-flex align-center bg-gold-gradient text-ebony">
          <LucideIcon name="globe" :size="24" class="me-3" />
          <span class="text-h6 font-weight-black">تعليمات إعداد مزامنة قوقل</span>
          <v-spacer />
          <v-btn
            class="premium-btn-gold-gradient"
            icon
            variant="text"
            color="ebony"
            @click="showGasInstructions = false"
          >
            <LucideIcon name="x" :size="24" />
          </v-btn>
        </div>

        <v-card-text class="pa-8">
          <div class="mb-6 glass-panel-light pa-4 rounded-lg border border-gold border-opacity-20">
            <div class="text-subtitle-1 font-weight-black text-gold mb-3">
              طريقة الإعداد السريع:
            </div>
            <ol class="text-body-2 text-white leading-relaxed ps-4">
              <li class="mb-3">
                افتح
                <a
                  href="https://script.google.com/"
                  target="_blank"
                  class="text-accent font-weight-black"
                  >Google Apps Script</a
                >
                وأنشئ مشروعاً جديداً.
              </li>
              <li class="mb-3">امسح أي كود قديم ثم <b>الصق الكود</b> الذي تم نسخ الآن.</li>
              <li class="mb-3">اضغط <b>نشر (Deploy)</b> > نشر جديد > تطبيق ويب.</li>
              <li class="mb-3">اختر الوصول "للجميع" ثم انسخ الرابط وضعه في خانة الإعدادات.</li>
            </ol>
          </div>
          <div class="text-caption text-gold opacity-60 text-center">
            * تأكد من استخدام نفس حساب Gmail الخاص بجدول البيانات.
          </div>
        </v-card-text>

        <v-card-actions class="pa-8 pt-0">
          <v-btn
            color="gold"
            variant="flat"
            block
            size="large"
            class="font-weight-black premium-lift premium-btn-gold-gradient"
            @click="showGasInstructions = false"
            >فهمت، سأقوم بالإعداد الآن</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showRestoreDialog" max-width="800" persistent scrollable>
      <v-card class="glass-card overflow-hidden border-gold border-2 glass-card">
        <div class="pa-6 d-flex align-center bg-gold-gradient text-ebony">
          <LucideIcon name="download-cloud" :size="24" class="me-3" />
          <span class="text-h6 font-weight-black">استعادة نسخة احتياطية</span>
          <v-spacer />
          <v-btn
            class="premium-btn-gold-gradient"
            icon
            variant="text"
            color="ebony"
            :disabled="restoringBackup"
            @click="showRestoreDialog = false"
          >
            <LucideIcon name="x" :size="24" />
          </v-btn>
        </div>

        <v-card-text class="pa-8">
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="text-subtitle-1 font-weight-black text-gold">تقدم الاستعادة</div>
            <div class="text-h6 font-weight-black text-accent">{{ restoreProgress.percent }}%</div>
          </div>
          <v-progress-linear
            :model-value="restoreProgress.percent"
            height="12"
            rounded
            color="gold"
            class="mb-8"
          ></v-progress-linear>

          <v-alert
            v-if="restoreResult?.success"
            type="success"
            variant="flat"
            class="mb-6 rounded-xl glass-panel-light border-success"
          >
            <div class="text-h6 font-weight-black text-visible-high">
              تمت استعادة البيانات بنجاح!
            </div>
            <div class="text-body-2 mt-2 text-visible-high">
              {{
                restoreResult?.requiresRestart
                  ? 'يجب إعادة تشغيل البرنامج لتحديث محرك قاعدة البيانات.'
                  : ''
              }}
            </div>
          </v-alert>

          <div class="text-subtitle-1 font-weight-black text-visible-high mb-4">سجل الخطوات</div>
          <div
            class="glass-panel-light pa-6 rounded-xl border border-gold max-height-300 overflow-y-auto"
          >
            <div
              v-for="(s, i) in restoreSteps"
              :key="i"
              class="d-flex justify-space-between text-body-2 mb-3 pb-2 border-b border-gold border-opacity-10 last-no-border"
            >
              <span class="font-weight-black text-gold">{{ s.message }}</span>
              <span class="text-accent font-weight-black">{{ s.percent }}%</span>
            </div>
            <div
              v-if="restoreSteps.length === 0"
              class="text-caption text-gold opacity-40 text-center"
            >
              لم تبدأ العملية بعد.
            </div>
          </div>
        </v-card-text>

        <v-card-actions class="pa-8 pt-0 gap-3">
          <v-btn
            variant="text"
            color="gold"
            class="font-weight-black premium-btn-gold-gradient"
            :disabled="restoringBackup"
            @click="showRestoreDialog = false"
            >إغلاق</v-btn
          >
          <v-spacer></v-spacer>
          <v-btn
            color="gold"
            variant="flat"
            class="px-10 font-weight-black premium-lift premium-btn-gold-gradient"
            :loading="restoringBackup"
            @click="startBackupRestore"
            >بدء الاستعادة</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Najiz Progress Dialog -->
    <v-dialog v-model="showNajizDialog" max-width="920" persistent>
      <v-card class="glass-card overflow-hidden border-gold border-2 glass-card">
        <div class="pa-6 d-flex align-center bg-gold-gradient text-ebony">
          <LucideIcon name="globe" :size="24" class="me-3" />
          <span class="text-h6 font-weight-black">مزامنة ناجز — التقدم</span>
          <v-spacer />
          <v-btn
            class="premium-btn-gold-gradient"
            icon
            variant="text"
            color="ebony"
            @click="showNajizDialog = false"
          >
            <LucideIcon name="x" :size="24" />
          </v-btn>
        </div>

        <v-card-text class="pa-8">
          <v-row dense class="mb-8">
            <v-col cols="12" md="6">
              <div class="text-body-1 text-gold font-weight-black mb-1">المرحلة الحالية</div>
              <div class="text-h5 font-weight-black text-white">{{ najizPhaseLabel }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-body-1 text-gold font-weight-black mb-1">الرابط</div>
              <div class="text-body-1 font-weight-bold text-accent text-truncate">
                {{ najizUrl || '—' }}
              </div>
            </v-col>
            <v-col cols="12" class="mt-6">
              <div class="d-flex align-center justify-space-between mb-2">
                <span class="text-body-1 text-gold font-weight-black">التقدم الإجمالي</span>
                <span class="text-h6 font-weight-black text-gold"
                  >{{ najizCurrent }} / {{ najizTotal || 0 }}</span
                >
              </div>
              <v-progress-linear
                :model-value="najizTotal ? Math.round((najizCurrent / najizTotal) * 100) : 0"
                height="12"
                rounded
                color="gold"
              />
              <div v-if="najizCaseNumber" class="text-caption mt-2 text-accent font-weight-black">
                القضية الحالية: {{ najizCaseNumber }}
              </div>
            </v-col>
          </v-row>

          <v-divider class="mb-8 border-gold opacity-10" />

          <div class="text-subtitle-1 font-weight-black text-white mb-4">سجل العمليات</div>
          <div
            class="glass-panel-light pa-6 rounded-xl border border-gold opacity-10 max-height-300 overflow-y-auto font-mono"
          >
            <div
              v-for="(m, idx) in najizMessages"
              :key="idx"
              class="text-body-2 text-gold opacity-80 mb-2 border-b border-gold border-opacity-5 pb-2"
            >
              > {{ m }}
            </div>
            <div
              v-if="najizMessages.length === 0"
              class="text-caption text-gold opacity-40 text-center"
            >
              لا توجد رسائل بعد.
            </div>
          </div>
        </v-card-text>

        <v-card-actions class="pa-8 pt-0">
          <v-spacer />
          <v-btn
            color="gold"
            variant="flat"
            class="px-8 font-weight-black premium-lift premium-btn-gold-gradient"
            @click="showNajizDialog = false"
            >إغلاق النافذة</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" class="premium-snackbar">
      <div class="d-flex align-center">
        <LucideIcon
          :name="snackbarColor === 'success' ? 'check-circle' : 'alert-circle'"
          :size="20"
          class="me-3"
        />
        <span class="font-weight-black">{{ snackbarText }}</span>
      </div>
      <template #actions>
        <v-btn color="white" icon variant="text" @click="snackbar = false">
          <LucideIcon name="x" :size="18" />
        </v-btn>
      </template>
    </v-snackbar>

    <!-- Performance Report Dialog -->
    <v-dialog v-model="showPerfReportDialog" max-width="700">
      <v-card class="glass-card border-gold border-2 overflow-hidden glass-card">
        <div class="pa-6 bg-gold-gradient text-ebony d-flex align-center">
          <LucideIcon name="activity" :size="24" class="me-3" />
          <span class="text-h6 font-weight-black">تقرير أداء النظام</span>
          <v-spacer />
          <v-btn
            class="premium-btn-gold-gradient"
            icon
            variant="text"
            color="ebony"
            @click="showPerfReportDialog = false"
          >
            <LucideIcon name="x" :size="24" />
          </v-btn>
        </div>
        <v-card-text class="pa-8">
          <div class="mb-4 text-subtitle-2 text-gold font-weight-black">
            البيانات التقنية (JSON):
          </div>
          <pre
            class="glass-panel-light pa-4 rounded-lg text-caption text-white overflow-auto font-mono"
            style="max-height: 400px; white-space: pre-wrap"
            >{{ JSON.stringify(perfReportData, null, 2) }}</pre
          >
        </v-card-text>
        <v-card-actions class="pa-8 pt-0">
          <v-btn
            color="gold"
            variant="flat"
            block
            size="large"
            class="font-weight-black premium-btn-gold-gradient"
            @click="savePerfReportToFile"
            >حفظ التقرير كملف</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, watch, toRaw } from 'vue'
import { useSyncService } from '../services/sync'
import { useClientsStore } from '../stores/clients'
import { useCasesStore } from '../stores/cases'
import { useSessionsStore } from '../stores/sessions'
import { useLicensingStore } from '../stores/licensing'
import { safeArray } from '../utils/safe'
import LucideIcon from '../components/common/LucideIcon.vue'
import SettingsWipeDialog from './settings/SettingsWipeDialog.vue'
import SettingsOfficeCard from './settings/SettingsOfficeCard.vue'
import SettingsLicensingCard from './settings/SettingsLicensingCard.vue'
import SettingsSecurityCard from './settings/SettingsSecurityCard.vue'

interface AppSettings {
  officeName: string
  firmAddress: string
  firmPhone: string
  firmEmail: string
  vatNumber?: string
  theme: string
  activityLogRetentionDays: number
  casesRootPath: string
  taskNotificationsEnabled: boolean
  taskNotificationLeadDays: number
}

interface InventoryItem {
  name: string
  count: number
}

interface RestorePreview {
  updatedAt: string
  counts: {
    clients: number
    cases: number
    sessions: number
  }
  restoreDbPath: string
}

const syncService = useSyncService()
const clientsStore = useClientsStore()
const casesStore = useCasesStore()
const sessionsStore = useSessionsStore()

const gasUrl = ref('')
let gasUrlTimer: number | undefined
const testingSync = ref(false)
const syncingCloud = ref(false)
const preparingRestore = ref(false)
const approvingRestore = ref(false)
const restorePreview = ref<RestorePreview | null>(null)

const loading = ref(false)
const settings = ref<AppSettings>({
  officeName: '',
  firmAddress: '',
  firmPhone: '',
  firmEmail: '',
  vatNumber: '',
  theme: 'light',
  activityLogRetentionDays: 365,
  casesRootPath: '',
  taskNotificationsEnabled: true,
  taskNotificationLeadDays: 1
})
const savingManualSnapshot = ref(false)
const injectingManualSnapshot = ref(false)
const clearing = ref(false)
const checkingInventory = ref(false)
const inventory = ref<InventoryItem[]>([])
const showClearDialog = ref(false)
const showSuspensionDialog = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')
const isDev = ref(false)
const najizStatusMessage = ref('')
const najizStatusType = ref<'info' | 'error' | 'success'>('info')
const showNajizDialog = ref(false)
const najizPhase = ref<string>('')
const najizCurrent = ref<number>(0)
const najizTotal = ref<number>(0)
const najizCaseNumber = ref<string>('')
const najizUrl = ref<string>('')
const najizSavedPath = ref<string>('')
const najizMessages = ref<string[]>([])
const showPerfReportDialog = ref(false)
const perfReportData = ref<any>(null)
const showDiagnosticDialog = ref(false)
const diagnosticData = ref<any>(null)
const diagnosticLoading = ref(false)
let offNajizStatus: (() => void) | null = null

const najizPhaseLabel = computed(() => {
  switch (najizPhase.value) {
    case 'init':
      return 'تهيئة النظام'
    case 'scan':
      return 'مسح قائمة القضايا'
    case 'scrape':
      return 'جلب تفاصيل القضايا'
    case 'done':
      return 'اكتملت المزامنة'
    case 'closed':
      return 'مغلق'
    case 'error':
      return 'حدث خطأ'
    default:
      return '—'
  }
})

const licensingStore = useLicensingStore()
const trialInfo = computed(() => licensingStore.trialInfo)

const fetchSubscriptionInfo = async (): Promise<void> => {
  try {
    await licensingStore.refreshStatus()
  } catch {}
}

const fetchInventory = async (): Promise<void> => {
  checkingInventory.value = true
  try {
    const data = await (window as any).api.system.getDatabaseInventory()
    inventory.value = safeArray(data)
  } catch (e: unknown) {
    console.error('Failed to fetch inventory:', e)
  } finally {
    checkingInventory.value = false
  }
}

onMounted(async (): Promise<void> => {
  loading.value = true
  try {
    await fetchSubscriptionInfo()
    const data = (await (window as any).api.settings.get()) as AppSettings
    if (data) {
      settings.value = {
        officeName: data.officeName || '',
        firmAddress: data.firmAddress || '',
        firmPhone: data.firmPhone || '',
        firmEmail: data.firmEmail || '',
        vatNumber: (data as any).vatNumber || '',
        theme: data.theme || 'light',
        activityLogRetentionDays: data.activityLogRetentionDays || 365,
        casesRootPath: String((data as any).casesRootPath || ''),
        taskNotificationsEnabled: Boolean((data as any).taskNotificationsEnabled ?? true),
        taskNotificationLeadDays: Number((data as any).taskNotificationLeadDays ?? 1)
      }
    }
    await syncService.refreshStatus()
    const r = await (window as any).api.cloudSync.getUrl()
    if (r?.url) gasUrl.value = syncService.normalizeUrl(r.url)
    await fetchInventory()

    isDev.value = true
    if ((window as any).api?.najiz?.onStatus) {
      offNajizStatus = (window as any).api.najiz.onStatus((payload: any) => {
        najizStatusMessage.value = payload?.message || ''
        najizStatusType.value = payload?.status || 'info'
        if (payload?.phase) najizPhase.value = String(payload.phase)
        if (typeof payload?.currentIndex === 'number') najizCurrent.value = payload.currentIndex
        if (typeof payload?.total === 'number') najizTotal.value = payload.total
        if (payload?.caseNumber) najizCaseNumber.value = String(payload.caseNumber)
        if (payload?.url) najizUrl.value = String(payload.url)
        if (payload?.savedPath) najizSavedPath.value = String(payload.savedPath)
        if (payload?.message) {
          najizMessages.value = [String(payload.message), ...najizMessages.value].slice(0, 25)
        }
      })
    }

    if ((window as any).api?.najiz?.getStatus) {
      const st = await (window as any).api.najiz.getStatus()
      if (st?.lastStatus) {
        najizStatusMessage.value = st.lastStatus.message || najizStatusMessage.value
        najizStatusType.value = st.lastStatus.status || najizStatusType.value
        najizPhase.value = st.lastStatus.phase || najizPhase.value
        najizCurrent.value = st.lastStatus.currentIndex || najizCurrent.value
        najizTotal.value = st.lastStatus.total || najizTotal.value
        najizCaseNumber.value = st.lastStatus.caseNumber || najizCaseNumber.value
        najizUrl.value = st.lastStatus.url || najizUrl.value
        najizSavedPath.value =
          st.lastStatus.savedPath || st.lastAutoSavedPath || najizSavedPath.value
      } else if (st?.lastAutoSavedPath) {
        najizSavedPath.value = String(st.lastAutoSavedPath)
      }
    }

    await fetchSubscriptionInfo()
  } catch (err: unknown) {
    console.error('[Settings] Initialization error:', err)
    await fetchSubscriptionInfo()
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (offNajizStatus) offNajizStatus()
  offNajizStatus = null
})

const onGasUrlInput = (v: string) => {
  gasUrl.value = v
  if (gasUrlTimer) window.clearTimeout(gasUrlTimer)
  gasUrlTimer = window.setTimeout(() => {
    flushGasUrl()
  }, 600)
}

const flushGasUrl = async () => {
  if (gasUrlTimer) window.clearTimeout(gasUrlTimer)
  gasUrlTimer = undefined
  const normalized = await syncService.setUrl(gasUrl.value)
  gasUrl.value = normalized
}

// Theme sync logic
watch(
  () => settings.value.theme,
  (newTheme) => {
    if (!newTheme) return
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: newTheme }))
  }
)

const saveSettings = async (): Promise<void> => {
  try {
    await (window as any).api.settings.update({ ...settings.value })
    showSnackbar('تم حفظ الإعدادات بنجاح', 'success')
  } catch (e: unknown) {
    showSnackbar('خطأ في حفظ الإعدادات', 'error')
  }
}

const chooseCasesRootFolder = async (): Promise<void> => {
  try {
    const selected = await (window as any).api.cases.chooseRoot()
    if (selected) {
      settings.value.casesRootPath = String(selected)
      showSnackbar('تم حفظ مجلد ملفات القضايا', 'success')
    }
  } catch (e: unknown) {
    showSnackbar('تعذر اختيار مجلد ملفات القضايا', 'error')
  }
}

const openCasesRootFolder = async (): Promise<void> => {
  try {
    if (!settings.value.casesRootPath) return
    await (window as any).api.cases.openFolder(settings.value.casesRootPath)
  } catch (e: unknown) {
    showSnackbar('تعذر فتح مجلد ملفات القضايا', 'error')
  }
}

const exportManualSnapshot = async (): Promise<void> => {
  savingManualSnapshot.value = true
  try {
    const res = await (window as any).api.system.exportManualSnapshot()
    if (res?.success === false && res?.message === 'تم الإلغاء') return
    if (!res?.success) {
      showSnackbar(res?.message || 'فشل حفظ البيانات', 'error')
      return
    }
    showSnackbar('تم حفظ ملف البيانات بنجاح', 'success')
  } catch (e: unknown) {
    showSnackbar('خطأ في حفظ البيانات: ' + (e as Error).message, 'error')
  } finally {
    savingManualSnapshot.value = false
  }
}

const injectManualSnapshot = async (): Promise<void> => {
  injectingManualSnapshot.value = true
  try {
    const res = await (window as any).api.system.injectManualSnapshot()
    if (!res || (res?.success === false && res?.message === 'تم الإلغاء')) return
    if (res === false) return
    if (!res?.success) {
      showSnackbar(res?.message || 'فشل حقن البيانات', 'error')
      return
    }
    const totalReceived = Object.values(res.counts || {}).reduce(
      (s: number, c: any) => s + (c.received || 0),
      0
    )
    const totalImported = Object.values(res.counts || {}).reduce(
      (s: number, c: any) => s + (c.imported || 0),
      0
    )
    const zeroTables = Object.entries(res.counts || {})
      .filter(([, c]: any) => c.imported === 0 && c.received > 0)
      .map(([t]) => t)

    if (totalImported === 0 && totalReceived > 0) {
      showSnackbar(
        `فشل الحقن: لم يتم استيراد أي سجل من أصل ${totalReceived}. الأخطاء في الـ Console.`,
        'error'
      )
      console.error('[ImportSnapshot] Zero import - all rows rejected. Errors:', res.errors || [])
    } else if (res?.errors && res.errors.length > 0) {
      console.error('[Import Errors]:', res.errors)
      showSnackbar(
        `تم الحقن: ${totalImported}/${totalReceived} سجل، مع تجاهل ${res.errors.length} سجل. راجع الـ Console.`,
        'warning'
      )
      await fetchInventory()
      setTimeout(() => window.location.reload(), 3000)
    } else {
      showSnackbar(
        `تم حقن البيانات بنجاح (${totalImported} سجل) — جاري إعادة التحميل...`,
        'success'
      )
      await fetchInventory()
      setTimeout(() => window.location.reload(), 1200)
    }
  } catch (e: unknown) {
    showSnackbar('خطأ في حقن البيانات: ' + (e as Error).message, 'error')
  } finally {
    injectingManualSnapshot.value = false
  }
}

const handleClear = (): void => {
  showClearDialog.value = true
}
const closeWipeDialog = (): void => {
  showClearDialog.value = false
}

const executeWipe = async (): Promise<void> => {
  clearing.value = true
  try {
    const success = await (window as any).api.system.clearAllData()
    if (success) {
      showSnackbar('تم تصفية قاعدة البيانات بالكامل بنجاح', 'success')
      showClearDialog.value = false
      await fetchInventory()
      await Promise.all([
        clientsStore.fetchClients(),
        casesStore.fetchCases(),
        sessionsStore.fetchSessions()
      ])
    }
  } catch (e: unknown) {
    showSnackbar('خطأ في مسح البيانات', 'error')
  } finally {
    clearing.value = false
  }
}

const testConnection = async (): Promise<void> => {
  testingSync.value = true
  try {
    const success = await syncService.testConnection()
    showSnackbar(
      success ? 'تم الاتصال بـ Google Sheets بنجاح' : 'فشل الاتصال بـ Google Sheets',
      success ? 'success' : 'error'
    )
  } catch (e: unknown) {
    showSnackbar('خطأ في اختبار الاتصال', 'error')
  } finally {
    testingSync.value = false
  }
}

const handleCloudSync = async (): Promise<void> => {
  syncingCloud.value = true
  try {
    const success = await syncService.uploadAll()
    showSnackbar(
      success ? 'تمت المزامنة السحابية بنجاح' : 'فشل في المزامنة السحابية',
      success ? 'success' : 'error'
    )
  } catch (e: unknown) {
    showSnackbar('خطأ في المزامنة', 'error')
  } finally {
    syncingCloud.value = false
  }
}

const openSyncSheet = (): void => {
  window.open('https://docs.google.com/spreadsheets/', '_blank')
}

const prepareRestore = async (): Promise<void> => {
  preparingRestore.value = true
  try {
    const result = (await (window as any).api.cloudRestore.prepare()) as RestorePreview
    if (result) {
      restorePreview.value = result
      showSnackbar('تم تجهيز ملف الاستعادة للمراجعة', 'success')
    }
  } catch (e: unknown) {
    showSnackbar('خطأ في تجهيز الاستعادة', 'error')
  } finally {
    preparingRestore.value = false
  }
}

const copyingScript = ref(false)
const copySyncScript = async (): Promise<void> => {
  copyingScript.value = true
  try {
    const content = await (window as any).api.system.getGoogleScriptContent()
    if (!content) throw new Error('الملف فارغ')
    await navigator.clipboard.writeText(content)
    showSnackbar('تم نسخ كود المزامنة إلى الحافظة', 'success')
    showGasInstructions.value = true
  } catch (e: unknown) {
    showSnackbar('خطأ في نسخ الملف: ' + (e as Error).message, 'error')
  } finally {
    copyingScript.value = false
  }
}

const approveRestore = async (): Promise<void> => {
  if (!confirm('هل أنت متأكد من استبدال البيانات الحالية؟')) return
  approvingRestore.value = true
  try {
    const result = (await (window as any).api.cloudRestore.approve()) as RestorePreview
    if (result) {
      showSnackbar('تمت استعادة البيانات بنجاح، يرجى إعادة تشغيل البرنامج', 'success')
      restorePreview.value = null
    }
  } catch (e: unknown) {
    showSnackbar('خطأ في اعتماد الاستعادة', 'error')
  } finally {
    approvingRestore.value = false
  }
}

const showRestoreInFolder = async (): Promise<void> => {
  try {
    await (window as any).api.cloudRestore.showInFolder()
  } catch {}
}

const exportRestoreFile = async (): Promise<void> => {
  try {
    await (window as any).api.cloudRestore.exportFile()
  } catch {}
}

const exportBackup = async (): Promise<void> => {
  try {
    await (window as any).api.backup.export()
    showSnackbar('تم تصدير النسخة بنجاح', 'success')
  } catch {}
}

const exportSupportBundle = async (): Promise<void> => {
  try {
    const res = await (window as any).api.system.exportSupportBundle()
    if (res?.saved) showSnackbar('تم حفظ تقرير الدعم الفني', 'success')
  } catch (e: unknown) {
    showSnackbar('فشل تصدير التقرير', 'error')
  }
}

const exportPerformanceReport = async (): Promise<void> => {
  try {
    const apiSystem = (window as any)?.api?.system
    if (typeof apiSystem?.getPerformanceData === 'function') {
      const res = await apiSystem.getPerformanceData()
      if (res) {
        perfReportData.value = res
        showPerfReportDialog.value = true
        return
      }
    }

    if (typeof apiSystem?.exportPerformanceReport === 'function') {
      const r = await apiSystem.exportPerformanceReport()
      if (r?.saved) showSnackbar('تم حفظ تقرير الأداء', 'success')
      return
    }

    throw new Error('هذه الميزة غير متاحة في هذه النسخة')
  } catch (e: unknown) {
    showSnackbar('فشل توليد التقرير: ' + (e as Error).message, 'error')
  }
}

const savePerfReportToFile = async (): Promise<void> => {
  try {
    if (!perfReportData.value) return
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const timeStr =
      now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0')
    const filename = `b2b_perf_${dateStr}_${timeStr}.json`

    const seen = new WeakSet<object>()
    const payload = JSON.stringify(
      toRaw(perfReportData.value),
      (_k, v) => {
        if (typeof v === 'bigint') return v.toString()
        if (typeof v === 'object' && v !== null) {
          if (seen.has(v as object)) return '[Circular]'
          seen.add(v as object)
        }
        return v
      },
      2
    )

    const res = await (window as any).api.system.saveJsonToFile(payload, filename)
    if (res?.saved) showSnackbar('تم حفظ الملف بنجاح', 'success')
    else showSnackbar('تم إلغاء حفظ الملف', 'info')
  } catch (e: unknown) {
    showSnackbar('فشل حفظ الملف: ' + ((e as any)?.message || String(e)), 'error')
  }
}

const captureScreenshot = async (): Promise<void> => {
  try {
    const res = await (window as any).api.system.captureScreenshot()
    if (res?.saved) showSnackbar('تم حفظ لقطة الشاشة', 'success')
  } catch (e: unknown) {
    showSnackbar('فشل حفظ لقطة الشاشة', 'error')
  }
}

const showRestoreDialog = ref(false)
const showGasInstructions = ref(false)
const restoringBackup = ref(false)
const restoreProgress = ref({ percent: 0, stage: '', message: '' })
const restoreSteps = ref<Array<{ percent: number; stage: string; message: string }>>([])
const restoreResult = ref<any>(null)
let unsubscribeRestoreProgress: null | (() => void) = null

const importBackup = async (): Promise<void> => {
  restoreResult.value = null
  restoreSteps.value = []
  restoreProgress.value = { percent: 0, stage: '', message: '' }
  showRestoreDialog.value = true
}

const startBackupRestore = async (): Promise<void> => {
  if (restoringBackup.value) return
  restoringBackup.value = true
  restoreResult.value = null
  restoreSteps.value = []
  restoreProgress.value = { percent: 0, stage: '', message: 'بدء الاستعادة...' }

  try {
    unsubscribeRestoreProgress?.()
    unsubscribeRestoreProgress = (window as any).api.backup.onRestoreProgress((p: any) => {
      restoreProgress.value = {
        percent: Number(p?.percent ?? 0),
        stage: String(p?.stage ?? ''),
        message: String(p?.message ?? '')
      }
      restoreSteps.value.push({
        percent: Number(p?.percent ?? 0),
        stage: String(p?.stage ?? ''),
        message: String(p?.message ?? '')
      })
    })

    const res = await (window as any).api.backup.import()
    restoreResult.value = res
    if (res?.success) {
      showSnackbar('تم استيراد النسخة بنجاح', 'success')
      await fetchInventory()
    } else {
      showSnackbar('فشلت عملية الاستعادة', 'error')
    }
  } catch (e: unknown) {
    showSnackbar('خطأ في الاستعادة: ' + (e as Error).message, 'error')
  } finally {
    restoringBackup.value = false
    unsubscribeRestoreProgress?.()
    unsubscribeRestoreProgress = null
  }
}

const showSnackbar = (text: string, color: string): void => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}
</script>

<style scoped>
.rtl {
  direction: rtl;
}
.font-mono {
  font-family: 'Consolas', 'Monaco', monospace;
}
.gap-2 {
  gap: 0.5rem;
}
.gap-3 {
  gap: 0.75rem;
}
.last-no-border:last-child {
  border-bottom: none !important;
}
.max-height-300 {
  max-height: 300px;
}
.leading-relaxed {
  line-height: 1.8;
}

/* Custom styles for glass-card inputs in settings */
:deep(.glass-input .v-field__outline) {
  --v-field-border-opacity: 0.2;
}

:deep(.glass-input .v-label) {
  color: var(--primary) !important;
  font-weight: 800;
  font-size: 0.9rem;
}

:deep(.glass-input input),
:deep(.glass-input .v-field__input),
:deep(.glass-input .v-select__selection-text) {
  color: var(--text-primary) !important;
  font-weight: 700;
  font-size: 0.9rem;
}

:deep(.glass-input-compact .v-field__input) {
  padding-top: 4px !important;
  padding-bottom: 4px !important;
  min-height: 32px !important;
}

.header-highlight-box {
  background: rgba(255, 255, 255, 0.05) !important;
  padding: 4px 12px !important;
  border-radius: 8px !important;
  border: 1px solid rgba(233, 195, 73, 0.2) !important;
  display: flex !important;
  align-items: center !important;
  width: fit-content !important;
}

.settings-data-btn {
  border: 1px solid rgba(233, 195, 73, 0.55) !important;
  border-radius: 12px !important;
  min-height: 36px !important;
  background: transparent !important;
}

.settings-data-btn:hover {
  background: rgba(233, 195, 73, 0.08) !important;
}

.text-visible-high {
  color: var(--text-primary) !important;
}
.text-visible-medium {
  color: var(--text-secondary) !important;
}
</style>
