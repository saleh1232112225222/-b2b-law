<template>
  <v-container fluid class="pa-3 pa-sm-6 pb-12 rtl report-page">
    <PrintReportFrame title="تقرير الأحكام والقرارات القضائية" />

    <!-- Header -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="gavel" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-gold mb-1">تقرير الأحكام والقرارات القضائية</h1>
            <p class="text-subtitle-1 text-gold opacity-60 font-weight-black">
              بيان تحليلي شامل بالأحكام الصادرة، درجات التقاضي، مواعيد الاعتراض، وحالة الصكوك
            </p>
          </div>
        </div>
      </v-col>
      <v-col cols="auto" class="d-flex gap-3 flex-wrap align-center">
        <!-- View Mode Switcher -->
        <v-btn-toggle
          v-model="viewMode"
          mandatory
          color="accent"
          density="comfortable"
          class="rounded-xl border border-gold border-opacity-20 me-2"
          @update:model-value="load"
        >
          <v-btn value="by_judgment" class="font-weight-black px-4" size="small">
            <LucideIcon name="gavel" :size="15" class="me-1" />
            حسب الأحكام
          </v-btn>
          <v-btn value="by_case" class="font-weight-black px-4" size="small">
            <LucideIcon name="briefcase" :size="15" class="me-1" />
            حسب القضايا
          </v-btn>
        </v-btn-toggle>

        <v-btn
          variant="outlined"
          color="gold"
          class="rounded-lg px-5 font-weight-black premium-hover"
          @click="$router.push('/reports')"
        >
          <LucideIcon name="arrow-right" :size="18" class="me-2" /> رجوع للمركز
        </v-btn>
        <v-btn
          variant="tonal"
          color="white"
          height="40"
          class="rounded-xl px-5 font-weight-black"
          @click="printPage"
        >
          <LucideIcon name="printer" :size="18" class="me-2 text-gold" /> طباعة
        </v-btn>
        <v-btn
          color="accent"
          variant="flat"
          height="40"
          class="rounded-xl px-5 font-weight-black text-ebony"
          @click="exportPdf"
        >
          <LucideIcon name="file-text" :size="18" class="me-2" /> تصدير PDF
        </v-btn>
        <v-btn
          variant="tonal"
          color="white"
          height="40"
          class="rounded-xl px-5 font-weight-black"
          @click="exportCsv"
        >
          <LucideIcon name="file-spreadsheet" :size="18" class="me-2 text-gold" /> تصدير ملف إكسل
        </v-btn>
      </v-col>
    </v-row>

    <!-- Filters Row -->
    <v-card elevation="0" class="glass-card pa-6 border-gold border-opacity-20 mb-6">
      <v-row dense>
        <v-col cols="12" md="3">
          <v-autocomplete
            v-model="clientId"
            :items="clientsList"
            item-title="name"
            item-value="id"
            label="تصفية حسب الموكل"
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
          >
            <template #prepend-inner>
              <LucideIcon name="users" :size="18" class="text-gold me-2" />
            </template>
          </v-autocomplete>
        </v-col>
        <v-col cols="12" md="3">
          <v-autocomplete
            v-model="caseId"
            :items="cases"
            item-title="title"
            item-value="value"
            label="تصفية حسب القضية"
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
          >
            <template #prepend-inner>
              <LucideIcon name="briefcase" :size="18" class="text-gold me-2" />
            </template>
          </v-autocomplete>
        </v-col>
        <v-col cols="12" md="2">
          <v-select
            v-model="favorFilter"
            :items="['الكل', 'لصالح الموكل', 'ضد الموكل', 'شبه كلي', 'صلح / تسوية', 'غير محدد']"
            label="نتيجة الحكم"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-select
            v-model="judgmentTypeFilter"
            :items="['الكل', 'ابتدائي', 'استئناف', 'قطعي', 'عليا', 'صلح', 'غير محدد']"
            label="درجة / نوع الحكم"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-select
            v-model="deedFilter"
            :items="['الكل', 'الصك مسجل', 'الصك غير مسجل']"
            label="حالة تدوين الصك"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2" class="mt-md-3">
          <v-text-field
            v-model="from"
            label="من تاريخ الحكم"
            type="date"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2" class="mt-md-3">
          <v-text-field
            v-model="to"
            label="إلى تاريخ الحكم"
            type="date"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="4" class="mt-md-3">
          <v-text-field
            v-model="q"
            label="البحث برقم الصك، القضية، الأطراف، أو المحكمة..."
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
          >
            <template #prepend-inner>
              <LucideIcon name="search" :size="18" class="text-gold me-2" />
            </template>
          </v-text-field>
        </v-col>
        <v-col cols="12" md="2" class="mt-md-3">
          <v-btn
            color="accent"
            variant="flat"
            block
            height="44"
            class="rounded-xl font-weight-black text-ebony"
            :loading="loading"
            @click="load"
          >
            تحديث البيانات
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <!-- KPI Summary Cards -->
    <v-row class="mb-6" dense>
      <v-col cols="6" sm="4" md="2">
        <v-card elevation="0" class="glass-card pa-4 text-center rounded-xl border border-gold border-opacity-10">
          <div class="text-caption text-gold opacity-70 mb-1 font-weight-black">الأحكام الفريدة</div>
          <div class="text-h5 font-weight-black text-white">{{ stats.total || 0 }}</div>
          <div class="text-tiny text-grey font-weight-bold">من أصل {{ stats.rawTotal || stats.total || 0 }} مدخلة</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card elevation="0" class="glass-card pa-4 text-center rounded-xl border border-gold border-opacity-10">
          <div class="text-caption text-gold opacity-70 mb-1 font-weight-black">القضايا الفريدة</div>
          <div class="text-h5 font-weight-black text-white">{{ stats.uniqueCases || 0 }}</div>
          <div class="text-tiny text-accent font-weight-bold">{{ summary.multiJudgmentCasesCount || 0 }} متعددة المراحل</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card elevation="0" class="glass-card pa-4 text-center rounded-xl border border-gold border-opacity-10">
          <div class="text-caption text-warning mb-1 font-weight-black">أحكام ابتدائية</div>
          <div class="text-h5 font-weight-black text-warning">{{ stats.preliminaryCount || 0 }}</div>
          <div class="text-tiny text-grey font-weight-bold">مرحلة أولى</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card elevation="0" class="glass-card pa-4 text-center rounded-xl border border-gold border-opacity-10">
          <div class="text-caption text-success mb-1 font-weight-black">أحكام قطعية / نهائية</div>
          <div class="text-h5 font-weight-black text-success">{{ stats.finalCount || 0 }}</div>
          <div class="text-tiny text-success font-weight-bold">حكم مكتسب للقطعية</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card elevation="0" class="glass-card pa-4 text-center rounded-xl border border-gold border-opacity-10">
          <div class="text-caption text-grey-lighten-1 mb-1 font-weight-black">مستبعد كتكرار</div>
          <div class="text-h5 font-weight-black text-grey-lighten-1">{{ stats.excludedDuplicatesCount || 0 }}</div>
          <div class="text-tiny text-grey font-weight-bold">تم تنقيته تلقائياً</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card elevation="0" class="glass-card pa-4 text-center rounded-xl border border-gold border-opacity-10">
          <div class="text-caption text-error mb-1 font-weight-black">صكوك غير مسجلة</div>
          <div class="text-h5 font-weight-black text-error">{{ stats.unregisteredDeedsCount || 0 }}</div>
          <div class="text-tiny text-error font-weight-bold">بانتظار تدوين الصك</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Visual Charts Section -->
    <v-row v-if="filteredRows.length > 0" class="mb-6" dense>
      <v-col cols="12" md="5">
        <v-card elevation="0" class="glass-card pa-5 rounded-xl border border-gold border-opacity-10 h-100">
          <div class="d-flex justify-space-between align-center mb-3">
            <div class="text-subtitle-2 font-weight-black text-gold">
              توزيع نتائج الأحكام الصادرة
            </div>
            <v-chip size="x-small" color="accent" class="font-weight-black">
              كسب الدعاوى: {{ winRate }}%
            </v-chip>
          </div>
          <div style="height: 220px">
            <PieChart :labels="favorChartLabels" :data="favorChartValues" :colors="favorChartColors" />
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" md="7">
        <v-card elevation="0" class="glass-card pa-5 rounded-xl border border-gold border-opacity-10 h-100">
          <div class="text-subtitle-2 font-weight-black text-gold mb-3">
            توزيع الأحكام بحسب المحاكم
          </div>
          <div style="height: 220px">
            <SimpleBarChart :data="courtChartData" :height="220" />
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- VIEW MODE 1: BY JUDGMENTS TABLE -->
    <v-card
      v-if="viewMode === 'by_judgment'"
      elevation="0"
      class="glass-card rounded-xl border border-gold border-opacity-10 overflow-hidden mb-8"
    >
      <v-table density="comfortable" class="glass-table">
        <thead>
          <tr>
            <th class="text-right text-gold font-weight-black" style="width: 13%;">رقم الصك</th>
            <th class="text-right text-gold font-weight-black" style="width: 10%;">درجة الحكم</th>
            <th class="text-right text-gold font-weight-black" style="width: 15%;">رقم القضية والمحكمة</th>
            <th class="text-right text-gold font-weight-black" style="width: 15%;">المدعي</th>
            <th class="text-right text-gold font-weight-black" style="width: 15%;">المدعى عليه</th>
            <th class="text-right text-gold font-weight-black" style="width: 12%;">تاريخ الحكم</th>
            <th class="text-right text-gold font-weight-black" style="width: 13%;">مهلة الاعتراض</th>
            <th class="text-right text-gold font-weight-black" style="width: 11%;">نتيجة الحكم</th>
            <th class="text-center text-gold font-weight-black" style="width: 6%;">إجراء</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!loading && filteredRows.length === 0">
            <td colspan="9" class="text-center py-12 text-gold opacity-40 font-weight-black">
              لا توجد أحكام قضائية مسجلة مطابقة لشروط التصفية
            </td>
          </tr>
          <tr v-for="r in filteredRows" :key="r.id" class="premium-hover-row">
            <td>
              <span
                v-if="r.is_deed_registered"
                class="font-mono text-accent font-weight-black font-size-13"
              >
                {{ r.display_judgment_number }}
              </span>
              <v-chip
                v-else
                size="x-small"
                variant="outlined"
                color="grey"
                class="font-weight-bold"
              >
                غير مسجل
              </v-chip>
            </td>
            <td>
              <v-chip
                size="small"
                variant="tonal"
                :color="r.normalized_stage === 'قطعي' ? 'success' : r.normalized_stage === 'ابتدائي' ? 'warning' : 'info'"
                class="font-weight-black"
              >
                {{ r.normalized_stage || r.type || '---' }}
              </v-chip>
            </td>
            <td>
              <div class="font-weight-black text-white font-mono">{{ r.case_number || '---' }}</div>
              <div class="text-caption text-gold opacity-80">{{ r.court || '---' }}</div>
            </td>
            <td class="text-white font-weight-bold">{{ r.plaintiff_name || '---' }}</td>
            <td class="text-white font-weight-medium" style="color: #e2e8f0 !important;">
              {{ r.defendant_name || '---' }}
            </td>
            <td class="font-mono">
              <div class="text-white font-weight-bold">{{ r.judgment_date || '---' }}</div>
              <div v-if="r.judgment_date_hijri" class="text-caption text-gold opacity-70">
                {{ r.judgment_date_hijri }} هـ
              </div>
            </td>
            <td>
              <div
                v-if="r.objection_deadline"
                class="font-mono text-warning font-weight-bold"
              >
                {{ r.objection_deadline }}
              </div>
              <div
                v-else-if="r.normalized_stage === 'قطعي'"
                class="text-caption text-success font-weight-bold"
              >
                حكم قطعي / نهائي
              </div>
              <div v-else class="text-caption text-grey">غير محدد</div>
            </td>
            <td>
              <v-chip
                size="small"
                variant="flat"
                :color="getFavorColor(r.favor)"
                class="text-ebony font-weight-black"
              >
                {{ r.favor || 'غير محدد' }}
              </v-chip>
            </td>
            <td class="text-center">
              <v-btn
                variant="text"
                size="small"
                color="accent"
                icon
                title="تعديل بيانات الحكم"
                @click="openEditJudgment(r)"
              >
                <LucideIcon name="pencil" :size="16" />
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- VIEW MODE 2: BY CASE PROCEDURAL PROGRESSION -->
    <div v-else-if="viewMode === 'by_case'" class="mb-8">
      <div v-if="!loading && filteredCases.length === 0" class="glass-card pa-12 text-center text-gold opacity-40 font-weight-black rounded-xl">
        لا توجد قضايا مطابقة لشروط التصفية
      </div>
      <v-card
        v-for="cg in filteredCases"
        :key="cg.case_id"
        elevation="0"
        class="glass-card rounded-xl border border-gold border-opacity-15 mb-4 overflow-hidden"
      >
        <!-- Case Summary Header -->
        <div class="pa-4 glass-panel-light border-bottom d-flex flex-wrap align-center justify-space-between gap-3">
          <div class="d-flex align-center gap-3">
            <div class="glass-panel pa-2 rounded-lg border border-gold">
              <LucideIcon name="briefcase" :size="20" class="text-accent" />
            </div>
            <div>
              <div class="d-flex align-center gap-2">
                <span class="font-weight-black text-h6 text-white font-mono">قضية رقم: {{ cg.case_number }}</span>
                <v-chip size="x-small" color="accent" variant="outlined" class="font-weight-black">
                  {{ cg.case_type || 'قضية' }}
                </v-chip>
                <v-chip
                  v-if="cg.is_multi_stage"
                  size="x-small"
                  color="info"
                  variant="flat"
                  class="font-weight-black"
                >
                  متعددة المراحل ({{ cg.judgments_count }} أحكام)
                </v-chip>
              </div>
              <div class="text-caption text-gold opacity-80 mt-1">
                {{ cg.court || 'المحكمة غير محددة' }}
              </div>
            </div>
          </div>
          <div class="d-flex align-center gap-4 text-body-2">
            <div><span class="text-gold opacity-60">المدعي:</span> <b class="text-white">{{ cg.plaintiff_name }}</b></div>
            <div><span class="text-gold opacity-60">المدعى عليه:</span> <b class="text-white">{{ cg.defendant_name }}</b></div>
          </div>
        </div>

        <!-- Judgments Timeline Sub-table -->
        <v-table density="compact" class="glass-table timeline-table-mobile">
          <thead>
            <tr>
              <th class="text-right text-gold font-weight-black" style="width: 15%;">المرحلة / الدرجة</th>
              <th class="text-right text-gold font-weight-black" style="width: 15%;">تاريخ الحكم</th>
              <th class="text-right text-gold font-weight-black" style="width: 15%;">رقم الصك</th>
              <th class="text-right text-gold font-weight-black" style="width: 18%;">مهلة الاعتراض</th>
              <th class="text-right text-gold font-weight-black" style="width: 15%;">نتيجة الحكم</th>
              <th class="text-right text-gold font-weight-black" style="width: 22%;">منطوق الحكم / الملاحظات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(t, tIdx) in cg.timeline" :key="t.id" class="premium-hover-row">
              <td>
                <div class="d-flex align-center gap-2">
                  <span class="text-caption font-mono text-gold opacity-60 font-weight-bold">#{{ Number(tIdx) + 1 }}</span>
                  <v-chip
                    size="x-small"
                    variant="tonal"
                    :color="t.stage === 'قطعي' ? 'success' : t.stage === 'ابتدائي' ? 'warning' : 'info'"
                    class="font-weight-black"
                  >
                    {{ t.stage || t.raw_type || '---' }}
                  </v-chip>
                </div>
              </td>
              <td class="font-mono">
                <div class="text-white font-weight-bold">{{ t.judgment_date || '---' }}</div>
                <div v-if="t.judgment_date_hijri" class="text-caption text-gold opacity-70">
                  {{ t.judgment_date_hijri }} هـ
                </div>
              </td>
              <td>
                <span
                  v-if="t.is_deed_registered"
                  class="font-mono text-accent font-weight-black"
                >
                  {{ t.display_judgment_number }}
                </span>
                <span v-else class="text-caption text-grey font-weight-bold">
                  غير مسجل
                </span>
              </td>
              <td>
                <span v-if="t.objection_deadline" class="font-mono text-warning font-weight-bold">
                  {{ t.objection_deadline }}
                </span>
                <span v-else-if="t.stage === 'قطعي'" class="text-caption text-success font-weight-bold">
                  حكم قطعي / نهائي
                </span>
                <span v-else class="text-caption text-grey">غير محدد</span>
              </td>
              <td>
                <v-chip
                  size="x-small"
                  variant="flat"
                  :color="getFavorColor(t.favor)"
                  class="text-ebony font-weight-black"
                >
                  {{ t.favor || 'غير محدد' }}
                </v-chip>
              </td>
              <td class="text-caption text-grey-lighten-1">
                {{ t.notes || '---' }}
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </div>

    <!-- ANALYTICAL SUMMARY SECTION (ملخص تحليلي إداري شامل) -->
    <v-card elevation="0" class="glass-card pa-6 rounded-xl border border-gold border-opacity-20 mt-6">
      <div class="d-flex align-center justify-space-between mb-4">
        <div class="d-flex align-center gap-3">
          <LucideIcon name="bar-chart-3" :size="24" class="text-accent" />
          <h2 class="text-h6 font-weight-black text-gold mb-0">الملخص التحليلي والإحصائي الإداري</h2>
        </div>
        <v-chip color="accent" size="small" variant="tonal" class="font-weight-black">
          تقرير حوكمة المكتب
        </v-chip>
      </div>

      <v-row dense>
        <!-- Courts Breakdown -->
        <v-col cols="12" md="6">
          <div class="pa-4 glass-panel rounded-lg border border-gold border-opacity-10 h-100">
            <div class="text-subtitle-2 font-weight-black text-gold mb-3">
              1. توزيع الأحكام الصادرة بحسب المحاكم
            </div>
            <div v-for="c in summary.casesByCourt?.slice(0, 6)" :key="c.court" class="d-flex justify-space-between align-center py-2 border-bottom">
              <span class="text-body-2 text-white">{{ c.court }}</span>
              <div class="d-flex align-center gap-3">
                <span class="font-weight-black text-accent font-mono">{{ c.count }} حكم</span>
                <v-chip size="x-small" color="gold" variant="outlined" class="font-weight-bold">{{ c.percentage }}%</v-chip>
              </div>
            </div>
          </div>
        </v-col>

        <!-- Case Types Breakdown -->
        <v-col cols="12" md="6">
          <div class="pa-4 glass-panel rounded-lg border border-gold border-opacity-10 h-100">
            <div class="text-subtitle-2 font-weight-black text-gold mb-3">
              2. توزيع الأحكام بحسب تصنيف القضية
            </div>
            <div v-for="t in summary.casesByType?.slice(0, 6)" :key="t.caseType" class="d-flex justify-space-between align-center py-2 border-bottom">
              <span class="text-body-2 text-white">{{ t.caseType }}</span>
              <div class="d-flex align-center gap-3">
                <span class="font-weight-black text-accent font-mono">{{ t.count }} حكم</span>
                <v-chip size="x-small" color="gold" variant="outlined" class="font-weight-bold">{{ t.percentage }}%</v-chip>
              </div>
            </div>
          </div>
        </v-col>
      </v-row>

      <!-- Multi-Stage and Governance KPIs -->
      <v-row dense class="mt-4">
        <v-col cols="12" md="4">
          <div class="pa-4 glass-panel rounded-lg border border-gold border-opacity-10 text-center">
            <div class="text-caption text-gold opacity-70 mb-1 font-weight-black">القضايا ذات الأحكام المتعددة</div>
            <div class="text-h6 font-weight-black text-accent font-mono">{{ summary.multiJudgmentCasesCount || 0 }} قضايا</div>
            <div class="text-tiny text-grey font-weight-bold">تطورت عبر درجات تقاضي متعاقبة</div>
          </div>
        </v-col>
        <v-col cols="12" md="4">
          <div class="pa-4 glass-panel rounded-lg border border-gold border-opacity-10 text-center">
            <div class="text-caption text-gold opacity-70 mb-1 font-weight-black">مؤشر الامتثال لتدوين الصكوك</div>
            <div class="text-h6 font-weight-black text-success font-mono">
              {{ Math.round((((stats.total || 1) - (stats.unregisteredDeedsCount || 0)) / (stats.total || 1)) * 100) }}%
            </div>
            <div class="text-tiny text-grey font-weight-bold">من الأحكام مسجلة بصك رسمي صحيح</div>
          </div>
        </v-col>
        <v-col cols="12" md="4">
          <div class="pa-4 glass-panel rounded-lg border border-gold border-opacity-10 text-center">
            <div class="text-caption text-gold opacity-70 mb-1 font-weight-black">دقة مؤشرات التقاضي</div>
            <div class="text-h6 font-weight-black text-info font-mono">100%</div>
            <div class="text-tiny text-grey font-weight-bold">تم استبعاد {{ stats.excludedDuplicatesCount || 0 }} تكرارات في البيانات</div>
          </div>
        </v-col>
      </v-row>
    </v-card>

    <!-- Edit Dialog -->
    <v-dialog v-model="editDialog" max-width="500">
      <v-card class="glass-card pa-6 rounded-xl border border-gold">
        <h3 class="text-h6 font-weight-black text-gold mb-4">تعديل بيانات الحكم القضائي</h3>
        <v-form @submit.prevent="saveJudgment">
          <v-text-field
            v-model="editItem.judgment_number"
            label="رقم الصك القضائي"
            variant="outlined"
            class="mb-3"
          />
          <v-select
            v-model="editItem.favor"
            :items="['لصالح الموكل', 'ضد الموكل', 'شبه كلي', 'صلح / تسوية', 'غير محدد']"
            label="نتيجة الحكم"
            variant="outlined"
            class="mb-3"
          />
          <v-text-field
            v-model="editItem.judgment_date"
            label="تاريخ الحكم"
            type="date"
            variant="outlined"
            class="mb-3"
          />
          <v-text-field
            v-model.number="editItem.objection_period_days"
            label="مدة الاعتراض (أيام)"
            type="number"
            variant="outlined"
            class="mb-3"
          />
          <v-textarea
            v-model="editItem.notes"
            label="منطوق الحكم والملاحظات"
            variant="outlined"
            rows="3"
            class="mb-4"
          />
          <div class="d-flex justify-end gap-2">
            <v-btn variant="outlined" color="gold" @click="editDialog = false">إلغاء</v-btn>
            <v-btn color="accent" class="text-ebony font-weight-black" :loading="saving" @click="saveJudgment">حفظ</v-btn>
          </div>
        </v-form>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { safeArray } from '../utils/safe'
import PrintReportFrame from '../components/common/PrintReportFrame.vue'
import LucideIcon from '../components/common/LucideIcon.vue'
import PieChart from '../components/charts/PieChart.vue'
import SimpleBarChart from '../components/SimpleBarChart.vue'

const route = useRoute()

const viewMode = ref<'by_judgment' | 'by_case'>('by_judgment')
const from = ref('')
const to = ref('')
const q = ref('')
const caseId = ref<string | null>(null)
const clientId = ref<string | null>(null)
const favorFilter = ref('الكل')
const judgmentTypeFilter = ref('الكل')
const deedFilter = ref('الكل')

const rows = ref<any[]>([])
const caseGroups = ref<any[]>([])
const loading = ref(false)
const cases = ref<{ title: string; value: string }[]>([])
const clientsList = ref<{ name: string; id: string }[]>([])

const stats = ref<any>({
  total: 0,
  rawTotal: 0,
  uniqueCases: 0,
  preliminaryCount: 0,
  appealCount: 0,
  finalCount: 0,
  excludedDuplicatesCount: 0,
  unregisteredDeedsCount: 0,
  inFavor: 0,
  against: 0,
  settlement: 0,
  partial: 0,
  unassigned: 0,
  winRate: 0,
  byCourt: []
})

const summary = ref<any>({
  casesByCourt: [],
  casesByType: [],
  stagesDistribution: {},
  multiJudgmentCasesCount: 0,
  unregisteredDeedsCount: 0
})

const winRate = computed(() => {
  if (stats.value.winRate !== undefined && stats.value.winRate !== null) {
    return stats.value.winRate
  }
  const decided = (stats.value.inFavor || 0) + (stats.value.against || 0)
  if (decided === 0) return 0
  return Math.round(((stats.value.inFavor || 0) / decided) * 100)
})

const favorChartLabels = computed(() => {
  const total = stats.value.total || 1
  return [
    `لصالح الموكل (${Math.round(((stats.value.inFavor || 0) / total) * 100)}%)`,
    `ضد الموكل (${Math.round(((stats.value.against || 0) / total) * 100)}%)`,
    `صلح / تسوية (${Math.round(((stats.value.settlement || 0) / total) * 100)}%)`,
    `شبه كلي (${Math.round(((stats.value.partial || 0) / total) * 100)}%)`,
    `غير محدد (${Math.round(((stats.value.unassigned || 0) / total) * 100)}%)`
  ]
})

const favorChartValues = computed(() => [
  stats.value.inFavor || 0,
  stats.value.against || 0,
  stats.value.settlement || 0,
  stats.value.partial || 0,
  stats.value.unassigned || 0
])
const favorChartColors = computed(() => ['#27ae60', '#e74c3c', '#f39c12', '#2980b9', '#7f8c8d'])

const courtChartData = computed(() => {
  const courts = stats.value.byCourt || summary.value.casesByCourt || []
  if (courts.length > 0) {
    return courts.slice(0, 8).map((c: any) => {
      let shortLabel = c.court || 'أخرى'
      shortLabel = shortLabel
        .replace(/^المحكمة\s+/, '')
        .replace(/^محكمة\s+/, '')
        .replace(/بالرياض/, 'الرياض')
        .replace(/بجدة/, 'جدة')
        .replace(/بمكة المكرمة/, 'مكة')
        .replace(/بالدمام/, 'الدمام')
        .replace(/ببريدة/, 'بريدة')
      return {
        label: shortLabel,
        value: Number(c.count) || 0,
        color: '#D4AF37'
      }
    })
  }
  return []
})

const getFavorColor = (favor: string) => {
  if (favor?.includes('لصالح') || favor?.includes('للموكل')) return 'success'
  if (favor?.includes('ضد') || favor?.includes('خصم')) return 'error'
  if (favor?.includes('صلح') || favor?.includes('تسوية')) return 'warning'
  if (favor?.includes('جزئي') || favor?.includes('شبه')) return 'primary'
  return 'grey'
}

const filteredRows = computed(() => {
  let list = rows.value
  if (deedFilter.value === 'الصك مسجل') {
    list = list.filter((r) => r.is_deed_registered)
  } else if (deedFilter.value === 'الصك غير مسجل') {
    list = list.filter((r) => !r.is_deed_registered)
  }
  return list
})

const filteredCases = computed(() => {
  let list = caseGroups.value
  if (deedFilter.value === 'الصك مسجل') {
    list = list.filter((cg) => cg.timeline?.some((t: any) => t.is_deed_registered))
  } else if (deedFilter.value === 'الصك غير مسجل') {
    list = list.filter((cg) => cg.timeline?.some((t: any) => !t.is_deed_registered))
  }
  return list
})

const load = async (): Promise<void> => {
  loading.value = true
  try {
    const params: any = {
      from: from.value || undefined,
      to: to.value || undefined,
      q: q.value || undefined,
      caseId: caseId.value || undefined,
      clientId: clientId.value || undefined,
      favor: favorFilter.value !== 'الكل' ? favorFilter.value : undefined,
      judgmentType: judgmentTypeFilter.value !== 'الكل' ? judgmentTypeFilter.value : undefined,
      viewMode: viewMode.value,
      page: 1,
      pageSize: 500
    }
    const res = await (window as any).api.reports.getJudgmentsReport(params)
    rows.value = safeArray(res.rows)
    caseGroups.value = safeArray(res.caseGroups)
    if (res.stats) {
      stats.value = res.stats
    }
    if (res.analyticalSummary) {
      summary.value = res.analyticalSummary
    }
  } catch (e: any) {
    console.error('Failed to load judgments:', e)
  } finally {
    loading.value = false
  }
}

const printPage = () => {
  window.print()
}

const exportPdf = async (): Promise<void> => {
  try {
    if ((window as any).api?.reports?.exportPdf) {
      await (window as any).api.reports.exportPdf({
      type: 'judgments',
      params: {
        caseId: caseId.value || undefined,
        clientId: clientId.value || undefined,
        from: from.value || undefined,
        to: to.value || undefined,
        q: q.value || undefined,
        viewMode: viewMode.value
      }
    })
    } else {
      window.print()
    }
  } catch (e: any) {
    console.error('Export PDF error:', e)
    window.print()
  }
}

const exportCsv = async (): Promise<void> => {
  if (filteredRows.value.length === 0) return
  try {
    const exportRows = filteredRows.value.map((r: any) => ({
      'رقم الصك': r.display_judgment_number || r.judgment_number || '',
      'حالة الصك': r.is_deed_registered ? 'مسجل' : 'غير مسجل',
      'درجة الحكم': r.normalized_stage || r.type || '',
      'رقم القضية': r.case_number || '',
      'المحكمة': r.court || '',
      'المدعي': r.plaintiff_name || '',
      'المدعى عليه': r.defendant_name || '',
      'تاريخ الحكم الميلادي': r.judgment_date || '',
      'تاريخ الحكم الهجري': r.judgment_date_hijri || '',
      'مهلة الاعتراض': r.display_objection_deadline || r.objection_deadline || '',
      'نتيجة الحكم': r.favor || '',
      'الملاحظات': r.notes || ''
    }))
    const res = await (window as any).api.reports.exportCsv('تقرير_الأحكام_القضائية.csv', exportRows)
    if (res?.csv) {
      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.filename || 'تقرير_الأحكام_القضائية.csv'
      a.click()
      URL.revokeObjectURL(url)
    }
  } catch (e: any) {
    console.error('Export CSV error:', e)
  }
}

const editDialog = ref(false)
const saving = ref(false)
const editItem = ref<any>({
  id: '',
  judgment_number: '',
  favor: '',
  judgment_date: '',
  objection_period_days: 30,
  notes: ''
})

const openEditJudgment = (r: any) => {
  editItem.value = { ...r }
  editDialog.value = true
}

const saveJudgment = async () => {
  if (!editItem.value.id) return
  saving.value = true
  try {
    await (window as any).api.judgments.update(editItem.value.id, editItem.value)
    editDialog.value = false
    await load()
  } catch (e: any) {
    console.error('Save judgment error:', e)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const [cData, clData] = await Promise.all([
      (window as any).api.reports.listCases?.(),
      (window as any).api.clients?.getAll?.()
    ])
    cases.value = safeArray(cData).map((r: any) => ({
      value: r.id,
      title: `${r.case_number || r.id} — ${r.client_name || ''}`
    }))
    clientsList.value = safeArray(clData)
  } catch {
    cases.value = []
    clientsList.value = []
  }

  if (route.query.caseId) {
    caseId.value = String(route.query.caseId)
  }
  await load()
})
</script>

<style scoped>
.rtl {
  direction: rtl;
}
.gap-2 {
  gap: 0.5rem;
}
.gap-3 {
  gap: 0.75rem;
}
.gap-4 {
  gap: 1rem;
}
.font-mono {
  font-family: 'Consolas', 'Monaco', monospace;
}
.font-size-13 {
  font-size: 13px;
}
.border-bottom {
  border-bottom: 1px solid rgba(212, 175, 55, 0.15) !important;
}
.glass-table {
  background: transparent !important;
}
:deep(.glass-table th) {
  background: rgba(212, 175, 55, 0.07) !important;
  border-bottom: 1px solid rgba(212, 175, 55, 0.15) !important;
  color: #D4AF37 !important;
}
:deep(.glass-table td) {
  border-bottom: 1px solid rgba(212, 175, 55, 0.05) !important;
}
.premium-hover-row:hover {
  background: rgba(255, 255, 255, 0.03) !important;
}

@media (max-width: 600px) {
  .table-responsive-mobile {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
  }
  :deep(.table-responsive-mobile table) {
    min-width: 760px;
  }
  :deep(.timeline-table-mobile table) {
    min-width: 650px;
  }
}
</style>
