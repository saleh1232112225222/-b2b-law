export const SAUDI_CITIES = [
  'الرياض',
  'جدة',
  'مكة المكرمة',
  'المدينة المنورة',
  'الدمام',
  'الخبر',
  'الظهران',
  'الأحساء',
  'الطائف',
  'القصيم',
  'بريدة',
  'عنيزة',
  'تبوك',
  'أبها',
  'خميس مشيط',
  'جازان',
  'نجران',
  'حائل',
  'الجوف',
  'سكاكا',
  'عرعر',
  'الباحة',
  'الجبيل',
  'ينبع',
  'حفر الباطن',
  'الخرج',
  'بيشة',
  'الرس',
  'المجمعة',
  'القريات'
]

export const COURT_BASE_TYPES = [
  'المحكمة العامة',
  'محكمة الأحوال الشخصية',
  'المحكمة الجزائية',
  'المحكمة العمالية',
  'المحكمة التجارية',
  'محكمة التنفيذ'
]

const cityWithBa = (city: string) => {
  const c = String(city || '').trim()
  if (!c) return ''
  if (c.startsWith('ال')) return `بال${c.slice(2)}`
  return `ب${c}`
}

export const COURT_TYPES = [
  ...SAUDI_CITIES.flatMap((city) => COURT_BASE_TYPES.map((t) => `${t} ${cityWithBa(city)}`)),
  'ديوان المظالم (المحكمة الإدارية) بالرياض',
  'ديوان المظالم (المحكمة الإدارية) بجدة',
  'ديوان المظالم (المحكمة الإدارية) بالدمام',
  'ديوان المظالم (المحكمة الإدارية) بالمدينة المنورة',
  'ديوان المظالم (المحكمة الإدارية) بمكة المكرمة',
  'ديوان المظالم (المحكمة الإدارية) بأبها',
  'ديوان المظالم (المحكمة الإدارية) بتبوك',
  'لجان المنازعات المصرفية والتمويلية',
  'لجنة منازعات التأمين',
  'لجنة الفصل في المخالفات والمنازعات التمويلية',
  'اللجان الإعلامية',
  'لجنة الفصل في منازعات الأوراق المالية',
  'اللجان الجمركية',
  'لجان الفصل في المخالفات والمنازعات الضريبية',
  'المحكمة الجزائية المتخصصة',
  'أخرى'
]

export const CASE_SUBJECTS: Record<string, string[]> = {
  'عامة (حقوقية)': ['مطالبة مالية', 'رد عين', 'تعويض', 'عقارية'],
  'أحوال شخصية': ['طلاق/فسخ', 'نفقة', 'حضانة', 'إرث'],
  تجارية: ['شركات', 'عقود تجارية', 'إفلاس'],
  عمالية: ['رواتب', 'مكافأة نهاية خدمة', 'فصل تعسفي'],
  جزائية: ['حق خاص', 'نصب', 'خيانة أمانة'],
  'إدارية (ديوان المظالم)': ['إلغاء قرار', 'تعويض إداري'],
  'لجان متخصصة': ['تمويل', 'تأمين', 'سوق مالية', 'زكاة وضريبة'],
  أخرى: ['أخرى']
}

export const CASE_TYPES = Object.keys(CASE_SUBJECTS)

export const CASE_STATUSES = [
  'قيد النظر',
  'تحت الدراسة',
  'معلقة',
  'موقفة بطلب من أطراف الدعوى',
  'محكومة بحكم غير نهائي',
  'محكومة بحكم نهائي',
  'منتهية',
  'كأن لم تكن',
  'مغلقة',
  'مؤرشفة'
]

export const SESSION_TYPES = [
  'مرافعة',
  'نطق بالحكم',
  'إجرائية',
  'استماع شهود',
  'خبرة',
  'صلح',
  'أخرى'
]

export const SESSION_STATUSES = ['قادمة', 'تمت', 'مؤجلة', 'ملغاة']

export const JUDGMENT_TYPES = ['ابتدائي', 'استئنافي', 'نهائي', 'تمييز']

export const JUDGMENT_STATUSES = ['منطوق', 'تحت التنفيذ', 'مكتسب القطعية', 'ملغى']

export const PRIORITIES = ['عالية', 'متوسطة', 'منخفضة']

export const CASE_PHASES = [
  'الاستشارة والدراسة',
  'التحضير والقيد',
  'المرافعة والجلسات',
  'صدور الحكم',
  'التنفيذ',
  'ابتدائية',
  'استئناف',
  'نقض (المحكمة العليا)',
  'صلح / تسوية',
  'أخرى'
]

export const PIPELINE_STAGES = [
  { key: 'الكل', label: 'كافة المراحل', countKey: 'all' },
  { key: 'استشارة', label: 'الاستشارة', countKey: 'consultation' },
  { key: 'تحضير', label: 'التحضير', countKey: 'preparation' },
  { key: 'مرافعة', label: 'المرافعة', countKey: 'pleading' },
  { key: 'حكم', label: 'الحكم', countKey: 'judgment' },
  { key: 'تنفيذ', label: 'التنفيذ', countKey: 'enforcement' }
]

export const getCasePipelineStage = (
  c: any
): 'استشارة' | 'تحضير' | 'مرافعة' | 'حكم' | 'تنفيذ' => {
  const stage = String(c?.stage || '').trim()
  const phase = String(c?.phase || '').trim()
  const status = String(c?.status || '').trim()
  const court = String(c?.court || '').trim()
  const type = String(c?.case_type || '').trim()

  if (
    stage.includes('استشارة') ||
    phase.includes('استشارة') ||
    phase.includes('دراسة') ||
    status === 'تحت الدراسة' ||
    status.includes('استشارة')
  ) {
    return 'استشارة'
  }
  if (
    stage.includes('تنفيذ') ||
    phase.includes('تنفيذ') ||
    court.includes('تنفيذ') ||
    type.includes('تنفيذ') ||
    status.includes('تنفيذ')
  ) {
    return 'تنفيذ'
  }
  if (
    stage.includes('حكم') ||
    phase.includes('حكم') ||
    status.includes('محكوم') ||
    status.includes('حكم')
  ) {
    return 'حكم'
  }
  if (
    stage.includes('مرافعة') ||
    phase.includes('مرافعة') ||
    phase.includes('استئناف') ||
    phase.includes('نقض') ||
    status === 'قيد النظر'
  ) {
    return 'مرافعة'
  }
  return 'تحضير'
}

export const CLIENT_ROLES = [
  'مدعي',
  'مدعى عليه',
  'طالب تنفيذ',
  'منفذ ضده',
  'مستأنف',
  'مستأنف ضده',
  'صاحب حق / علاقة'
]
export const SESSION_OUTCOMES = [
  'تأجيل الجلسة لموعد آخر',
  'حجز القضية للحكم',
  'صدور حكم ابتدائي',
  'صدور حكم قطعي',
  'شطب الدعوى / انقطاع',
  'تبليغ / إجراء إداري',
  'أخرى'
]
