<template>
  <v-container fluid class="pa-6 rtl">
    <!-- Header -->
    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="glass-panel-light pa-4 rounded-xl me-5 border-gold opacity-20">
            <LucideIcon name="users" :size="36" class="text-accent" />
          </div>
          <div>
            <h1 class="employees-page-title text-gold mb-1">إدارة شؤون الموظفين</h1>
            <p class="employees-page-subtitle text-gold">
              تنظيم سجلات الكادر القانوني والإداري وتتبع الأداء الوظيفي
            </p>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Stats Section -->
    <v-row class="mb-8" dense>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="0" class="glass-card pa-5 border-gold-premium h-100 glass-card">
          <div class="d-flex align-center">
            <div class="glass-panel-light pa-3 rounded-lg me-4 bg-accent-alpha">
              <LucideIcon name="users" :size="24" class="text-accent" />
            </div>
            <div>
              <div class="text-tiny font-weight-black text-gold mb-1">إجمالي الموظفين</div>
              <div class="text-h5 font-weight-black text-white-high">{{ stats.total }}</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="0" class="glass-card pa-5 border-gold-premium h-100 glass-card">
          <div class="d-flex align-center">
            <div class="glass-panel-light pa-3 rounded-lg me-4 bg-gold-alpha">
              <LucideIcon name="scale" :size="24" class="text-gold" />
            </div>
            <div>
              <div class="text-tiny font-weight-black text-gold mb-1">المحامون والمستشارون</div>
              <div class="text-h5 font-weight-black text-white-high">{{ stats.lawyers }}</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="0" class="glass-card pa-5 border-gold-premium h-100 glass-card">
          <div class="d-flex align-center">
            <div class="glass-panel-light pa-3 rounded-lg me-4 bg-success-alpha">
              <LucideIcon name="user-check" :size="24" class="text-success" />
            </div>
            <div>
              <div class="text-tiny font-weight-black text-gold mb-1">على رأس العمل</div>
              <div class="text-h5 font-weight-black text-success">{{ stats.active }}</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="0" class="glass-card pa-5 border-gold-premium h-100 glass-card">
          <div class="d-flex align-center">
            <div class="glass-panel-light pa-3 rounded-lg me-4 bg-error-alpha border-gold-alpha">
              <LucideIcon name="user-minus" :size="24" class="text-error" />
            </div>
            <div>
              <div class="text-tiny font-weight-black text-gold mb-1">في إجازة / معلق</div>
              <div class="text-h5 font-weight-black text-error">{{ stats.onLeave }}</div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Main Table Section -->
    <v-card elevation="0" class="glass-card overflow-hidden border-gold-premium glass-card">
      <v-card-title class="pa-6 d-flex align-center border-b border-gold-alpha flex-wrap ga-4 glass-card">
        <div class="d-flex align-center">
          <div class="bg-accent-alpha pa-2 rounded-lg me-3 border-gold-alpha">
            <LucideIcon name="contact-2" :size="20" class="text-gold" />
          </div>
          <span class="employees-table-title text-white-high">سجل الكوادر البشرية</span>
        </div>

        <v-spacer />

        <div class="d-flex ga-3 align-center">
          <v-text-field
            v-model="search"
            placeholder="بحث بالاسم أو الهوية..."
            variant="outlined"
            density="comfortable"
            hide-details
            class="glass-input min-width-300 glass-input"
            clearable
          >
            <template #prepend-inner>
              <LucideIcon name="search" :size="18" class="text-gold opacity-60" />
            </template>
          </v-text-field>

          <v-btn
            color="accent"
            class="rounded-lg font-weight-black px-6 premium-lift h-48 border-gold-premium premium-btn-gold-gradient"
            @click="openDialog()"
          >
            <LucideIcon name="user-plus" :size="18" class="me-2 text-gold" />
            <span class="text-gold-solid">إضافة موظف</span>
          </v-btn>
        </div>
      </v-card-title>

      <v-fade-transition>
        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          class="ma-6 rounded-lg border-gold-alpha"
          closable
        >
          <template #prepend>
            <LucideIcon name="alert-circle" :size="20" class="me-3" />
          </template>
          <span class="font-weight-black text-body-2">{{ error }}</span>
        </v-alert>
      </v-fade-transition>

      <v-table class="bg-transparent premium-table" hover>
        <thead>
          <tr>
            <th class="employees-table-head text-right pa-4">الموظف</th>
            <th class="employees-table-head text-right pa-4">المسمى الوظيفي</th>
            <th class="employees-table-head text-right pa-4">التصنيف</th>
            <th class="employees-table-head text-right pa-4">الاتصال</th>
            <th class="employees-table-head text-right pa-4">الراتب الشهري</th>
            <th class="employees-table-head text-center pa-4">الحالة</th>
            <th class="employees-table-head text-center pa-4">النظام</th>
            <th class="employees-table-head text-center pa-4">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="loading">
            <tr v-for="i in 8" :key="i">
              <td colspan="8" class="pa-0">
                <v-skeleton-loader type="table-row" class="bg-transparent"></v-skeleton-loader>
              </td>
            </tr>
          </template>
          <template v-else>
            <tr v-if="filteredEmployees.length === 0">
              <td colspan="8" class="text-center py-15">
                <LucideIcon name="users-round" :size="48" class="text-gold opacity-10 mb-4" />
                <div class="text-gold opacity-30 font-weight-black">
                  لا يوجد موظفين مسجلين حالياً
                </div>
              </td>
            </tr>
            <tr v-for="emp in filteredEmployees" :key="emp.id" class="hover-row">
              <td class="pa-4">
                <div class="d-flex align-center">
                  <v-avatar size="40" class="glass-panel-light border-gold-alpha me-3">
                    <span class="text-gold font-weight-black">{{ emp.name.charAt(0) }}</span>
                  </v-avatar>
                  <div>
                    <div class="font-weight-black text-white">{{ emp.name }}</div>
                    <div class="text-tiny text-gold opacity-40 font-weight-black">
                      {{ emp.national_id || '---' }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="pa-4 font-weight-black text-white opacity-80">
                {{ emp.job_title || '-' }}
              </td>
              <td class="pa-4">
                <v-chip
                  size="x-small"
                  variant="tonal"
                  :color="getRoleColor(emp.role_type)"
                  class="font-weight-black"
                >
                  {{ emp.role_type || 'غير مصنف' }}
                </v-chip>
              </td>
              <td class="pa-4">
                <div class="text-tiny font-weight-black text-white ltr">{{ emp.phone || '-' }}</div>
              </td>
              <td class="pa-4 font-weight-black text-gold">
                {{ formatCurrency(emp.salary) }} <span class="text-tiny opacity-50">ر.س</span>
              </td>
              <td class="pa-4 text-center">
                <v-chip
                  :color="getStatusColor(emp.status)"
                  size="x-small"
                  variant="flat"
                  class="font-weight-black px-3"
                >
                  {{ getStatusText(emp.status) }}
                </v-chip>
              </td>
              <td class="pa-4 text-center">
                <v-tooltip location="top">
                  <template #activator="{ props }">
                    <div v-bind="props" class="d-inline-flex">
                      <LucideIcon
                        :name="emp.user_id ? 'shield-check' : 'shield-off'"
                        :size="18"
                        :class="emp.user_id ? 'text-success' : 'text-gold opacity-20'"
                      />
                    </div>
                  </template>
                  <span class="font-weight-black">{{
                    emp.user_id ? 'حساب نشط' : 'بدون حساب'
                  }}</span>
                </v-tooltip>
              </td>
              <td class="pa-4">
                <div class="d-flex align-center justify-center ga-1">
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    color="success"
                    class="rounded-lg premium-btn-gold-gradient"
                    @click="viewPerformance(emp)"
                  >
                    <LucideIcon name="trending-up" :size="16" />
                  </v-btn>
                  <v-btn
                    v-if="!emp.user_id"
                    icon
                    size="small"
                    variant="text"
                    color="gold"
                    class="rounded-lg premium-btn-gold-gradient"
                    @click="openCreateUserDialog(emp)"
                  >
                    <LucideIcon name="key-round" :size="16" />
                  </v-btn>
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    color="accent"
                    class="rounded-lg premium-btn-gold-gradient"
                    @click="openDialog(emp)"
                  >
                    <LucideIcon name="pencil" :size="16" />
                  </v-btn>
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    color="error"
                    class="rounded-lg premium-btn-gold-gradient"
                    @click="confirmDelete(emp)"
                  >
                    <LucideIcon name="trash-2" :size="16" />
                  </v-btn>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </v-table>
    </v-card>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="dialog" max-width="800" persistent>
      <v-card class="rounded-xl elevation-24 overflow-hidden modal-card glass-card">
        <v-toolbar color="white" class="px-6 border-b" height="72">
          <div class="bg-gold-alpha pa-2 rounded-lg me-3">
            <LucideIcon :name="isEdit ? 'user-cog' : 'user-plus'" :size="20" class="text-gold" />
          </div>
          <v-toolbar-title class="text-h6 font-weight-black text-pure-black">
            {{ isEdit ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد للمؤسسة' }}
          </v-toolbar-title>
          <v-spacer />
          <v-btn icon variant="text" size="small" class="rounded-lg premium-btn-gold-gradient" @click="dialog = false">
            <LucideIcon name="x" :size="20" class="text-pure-black" />
          </v-btn>
        </v-toolbar>

        <v-card-text class="pa-8 bg-white glass-card">
          <v-form ref="form" v-model="formValid" validate-on="input">
            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              class="mb-6 rounded-lg border-gold-alpha"
              closable
              @click:close="error = ''"
            >
              <template #prepend>
                <LucideIcon name="alert-circle" :size="20" class="me-3" />
              </template>
              <span class="font-weight-black text-body-2">{{ error }}</span>
            </v-alert>
            <v-row dense>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editedItem.name"
                  label="الاسم الكامل"
                  variant="outlined"
                  class="glass-input glass-input"
                  required
                  :rules="[(v) => !!v || 'الاسم مطلوب']"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editedItem.national_id"
                  label="رقم الهوية / الإقامة"
                  variant="outlined"
                  class="glass-input glass-input"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="editedItem.nationality"
                  :items="['سعودي', 'مقيم']"
                  label="الجنسية"
                  variant="outlined"
                  class="glass-input glass-input"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editedItem.phone"
                  label="رقم الجوال"
                  variant="outlined"
                  class="glass-input text-ltr glass-input"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editedItem.job_title"
                  label="المسمى الوظيفي"
                  variant="outlined"
                  class="glass-input glass-input"
                  placeholder="مدير قانوني، محامي، إلخ..."
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="editedItem.role_type"
                  :items="['محامي', 'محامي متدرب', 'سكرتير', 'عامل', 'متعاقد']"
                  label="تصنيف الموظف"
                  variant="outlined"
                  class="glass-input glass-input"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="editedItem.salary"
                  label="الراتب الشهري"
                  variant="outlined"
                  class="glass-input glass-input"
                  type="number"
                  suffix="ر.س"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="editedItem.hourly_rate"
                  label="أجر الساعة"
                  variant="outlined"
                  class="glass-input glass-input"
                  type="number"
                  suffix="ر.س"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="editedItem.status"
                  :items="[
                    { title: 'نشط', value: 'active' },
                    { title: 'غير نشط', value: 'inactive' },
                    { title: 'في إجازة', value: 'on_leave' }
                  ]"
                  label="الحالة الوظيفية"
                  variant="outlined"
                  class="glass-input glass-input"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="editedItem.qualification"
                  label="المؤهلات والخبرات"
                  variant="outlined"
                  class="glass-input glass-input"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editedItem.license_number"
                  label="رقم الترخيص المهني"
                  variant="outlined"
                  class="glass-input glass-input"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editedItem.contract_number"
                  label="رقم العقد"
                  variant="outlined"
                  class="glass-input glass-input"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions class="pa-8 modal-footer-solid glass-card">
          <v-btn
            color="gold"
            variant="outlined"
            size="large"
            class="px-12 font-weight-black btn1-unified action-btn-unified h-56 premium-btn-gold-gradient"
            @click="dialog = false"
            >إلغاء</v-btn
          >
          <v-spacer />
          <v-btn
            color="gold"
            variant="outlined"
            size="large"
            class="px-12 font-weight-black btn1-unified action-btn-unified h-56 premium-btn-gold-gradient"
            :loading="saving"
            @click="save"
          >
            {{ isEdit ? 'تحديث السجل' : 'إضافة الموظف' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Create User Dialog -->
    <v-dialog v-model="userDialog" max-width="500">
      <v-card class="rounded-xl elevation-24 overflow-hidden modal-card glass-card">
        <v-toolbar color="white" class="px-6 border-b" height="72">
          <div class="bg-gold-alpha pa-2 rounded-lg me-3">
            <LucideIcon name="key-round" :size="20" class="text-gold" />
          </div>
          <v-toolbar-title class="font-weight-black text-pure-black"
            >تفعيل حساب النظام</v-toolbar-title
          >
          <v-spacer />
          <v-btn icon variant="text" size="small" class="rounded-lg premium-btn-gold-gradient" @click="userDialog = false">
            <LucideIcon name="x" :size="20" class="text-pure-black" />
          </v-btn>
        </v-toolbar>
        <v-card-text class="pa-8 bg-white glass-card">
          <div class="mb-8 text-center glass-panel-light pa-4 rounded-xl border-gold-alpha">
            <div class="text-h6 font-weight-black text-gold mb-1">{{ targetEmployee?.name }}</div>
            <div class="text-tiny text-pure-black opacity-60 font-weight-black">
              سيتم ربط الحساب بالموظف آلياً
            </div>
          </div>
          <v-form ref="userForm" v-model="userFormValid" validate-on="input">
            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              class="mb-6 rounded-lg border-gold-alpha"
              closable
              @click:close="error = ''"
            >
              <template #prepend>
                <LucideIcon name="alert-circle" :size="20" class="me-3" />
              </template>
              <span class="font-weight-black text-body-2">{{ error }}</span>
            </v-alert>
            <v-text-field
              v-model="newUser.username"
              label="اسم المستخدم"
              variant="outlined"
              class="glass-input mb-4 glass-input"
              required
              :rules="[(v) => !!v || 'مطلوب']"
            >
              <template #prepend-inner>
                <LucideIcon name="at-sign" :size="18" class="text-gold opacity-40" />
              </template>
            </v-text-field>
            <v-text-field
              v-model="newUser.password"
              label="كلمة المرور المؤقتة"
              type="password"
              variant="outlined"
              class="glass-input mb-4 glass-input"
              required
              :rules="[(v) => !!v || 'مطلوب', (v) => v.length >= 6 || '6 أحرف على الأقل']"
            >
              <template #prepend-inner>
                <LucideIcon name="lock" :size="18" class="text-gold opacity-40" />
              </template>
            </v-text-field>
            <v-select
              v-model="newUser.role_key"
              :items="[
                { title: 'محامي مرخص', value: 'licensed_lawyer' },
                { title: 'محامي متدرب', value: 'trainee_lawyer' },
                { title: 'سكرتارية قانونية', value: 'secretary' }
              ]"
              label="مستوى الصلاحية"
              variant="outlined"
              class="glass-input glass-input"
              required
              :rules="[(v) => !!v || 'مطلوب']"
            />
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-8 modal-footer-solid glass-card">
          <v-btn
            color="gold"
            variant="outlined"
            size="large"
            class="px-12 font-weight-black btn1-unified action-btn-unified h-56 premium-btn-gold-gradient"
            @click="userDialog = false"
            >إلغاء</v-btn
          >
          <v-spacer />
          <v-btn
            color="gold"
            variant="outlined"
            size="large"
            class="px-12 font-weight-black btn1-unified action-btn-unified h-56 premium-btn-gold-gradient"
            :loading="userSaving"
            @click="createUserAccount"
          >
            تفعيل الحساب
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import LucideIcon from '../components/common/LucideIcon.vue'
import { useAppStore } from '../stores/app'

const appStore = useAppStore()

interface Employee {
  id: string
  name: string
  national_id?: string | null
  nationality?: string | null
  phone?: string | null
  email?: string | null
  job_title?: string | null
  role_type?: string | null
  qualification?: string | null
  license_number?: string | null
  contract_number?: string | null
  salary?: number | null
  hourly_rate?: number | null
  status?: 'active' | 'inactive' | 'on_leave' | string | null
  user_id?: string | null
}

const employees = ref<Employee[]>([])
const loading = ref(false)
const dialog = ref(false)
const saving = ref(false)
const search = ref('')
const isEdit = ref(false)
const form = ref<any>(null)
const userForm = ref<any>(null)
const formValid = ref(false)
const userFormValid = ref(false)
const error = ref('')
const userDialog = ref(false)
const userSaving = ref(false)
const targetEmployee = ref<Employee | null>(null)
const newUser = ref({
  username: '',
  password: '',
  role_key: 'licensed_lawyer'
})

const editedItem = ref<Partial<Employee>>({
  name: '',
  status: 'active',
  nationality: 'سعودي',
  role_type: 'محامي'
})

const stats = computed(() => {
  return {
    total: employees.value.length,
    lawyers: employees.value.filter((e) => e.role_type === 'محامي' || e.role_type === 'محامي متدرب')
      .length,
    active: employees.value.filter((e) => e.status === 'active').length,
    onLeave: employees.value.filter((e) => e.status === 'on_leave' || e.status === 'inactive')
      .length
  }
})

const filteredEmployees = computed(() => {
  if (!search.value) return employees.value
  const q = search.value.toLowerCase()
  return employees.value.filter(
    (e) =>
      e.name?.toLowerCase().includes(q) ||
      (e.national_id && e.national_id.includes(q)) ||
      (e.job_title && e.job_title.toLowerCase().includes(q))
  )
})

const fetchEmployees = async () => {
  loading.value = true
  error.value = ''
  try {
    employees.value = await (window as any).api.employees.list()
  } catch (err) {
    const msg = (err as any)?.message || 'فشل تحميل الموظفين'
    error.value = msg
    console.error('Failed to fetch employees:', err)
  } finally {
    loading.value = false
  }
}

const viewPerformance = (emp: Employee) => {
  window.location.hash = `#/hr/performance/${emp.id}`
}

const openCreateUserDialog = (emp: Employee) => {
  error.value = ''
  targetEmployee.value = emp
  newUser.value = {
    username: emp.email?.split('@')[0] || emp.name.split(' ')[0] || '',
    password: '',
    role_key:
      emp.role_type === 'محامي'
        ? 'licensed_lawyer'
        : emp.role_type === 'محامي متدرب'
          ? 'trainee_lawyer'
          : 'secretary'
  }
  userDialog.value = true
}

const createUserAccount = async () => {
  const { valid } = await userForm.value.validate()
  if (!valid || !targetEmployee.value) return
  userSaving.value = true
  try {
    await (window as any).api.users.create({
      ...newUser.value,
      full_name: targetEmployee.value.name,
      employee_id: targetEmployee.value.id
    })
    appStore.markChanges()
    await fetchEmployees()
    userDialog.value = false
  } catch (err) {
    error.value = (err as any)?.message || 'فشل إنشاء الحساب'
  } finally {
    userSaving.value = false
  }
}

const openDialog = (item?: Employee) => {
  error.value = ''
  if (item) {
    isEdit.value = true
    editedItem.value = { ...item }
  } else {
    isEdit.value = false
    editedItem.value = {
      name: '',
      status: 'active',
      nationality: 'سعودي',
      role_type: 'محامي'
    }
  }
  dialog.value = true
}

const save = async () => {
  const { valid } = await form.value.validate()
  if (!valid) return
  saving.value = true
  error.value = ''
  try {
    if (isEdit.value && editedItem.value.id) {
      await (window as any).api.employees.update(editedItem.value.id, { ...editedItem.value })
    } else {
      await (window as any).api.employees.create({ ...editedItem.value })
    }
    appStore.markChanges()
    await fetchEmployees()
    dialog.value = false
  } catch (err) {
    const msg = (err as any)?.message || 'فشل حفظ بيانات الموظف'
    error.value = msg
    console.error('Failed to save employee:', err)
  } finally {
    saving.value = false
  }
}

const confirmDelete = async (item: Employee) => {
  if (confirm(`هل أنت متأكد من حذف الموظف ${item.name}؟`)) {
    try {
      error.value = ''
      await (window as any).api.employees.delete(item.id)
      appStore.markChanges()
      await fetchEmployees()
    } catch (err) {
      const msg = (err as any)?.message || 'فشل حذف الموظف'
      error.value = msg
      console.error('Failed to delete employee:', err)
    }
  }
}

const getRoleColor = (role?: string | null) => {
  switch (role) {
    case 'محامي':
      return 'gold'
    case 'محامي متدرب':
      return 'accent'
    case 'سكرتير':
      return 'success'
    case 'عامل':
      return 'brown'
    case 'متعاقد':
      return 'warning'
    default:
      return 'grey'
  }
}

const getStatusColor = (status?: string | null) => {
  switch (status) {
    case 'active':
      return 'success'
    case 'inactive':
      return 'error'
    case 'on_leave':
      return 'warning'
    default:
      return 'grey'
  }
}

const getStatusText = (status?: string | null) => {
  switch (status) {
    case 'active':
      return 'نشط'
    case 'inactive':
      return 'غير نشط'
    case 'on_leave':
      return 'في إجازة'
    default:
      return status || '-'
  }
}

const formatCurrency = (val?: number | null) => {
  if (val === undefined || val === null) return '0.00'
  return new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2 }).format(val)
}

onMounted(fetchEmployees)
</script>

<style scoped>
.employees-page-title {
  font-size: 1.9rem;
  line-height: 1.25;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.employees-page-subtitle {
  font-size: 1rem;
  line-height: 1.8;
  font-weight: 700;
  opacity: 0.82;
}

.employees-table-title {
  font-size: 1.08rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.employees-table-head {
  color: rgba(233, 195, 73, 0.96) !important;
  font-weight: 800 !important;
  font-size: 0.9rem !important;
  letter-spacing: 0 !important;
  line-height: 1.4;
  white-space: nowrap;
}

.premium-table :deep(th) {
  background: rgba(233, 195, 73, 0.07) !important;
  border-bottom: 1px solid rgba(233, 195, 73, 0.22) !important;
  vertical-align: middle;
}

.premium-table :deep(td) {
  border-bottom: 1px solid rgba(233, 195, 73, 0.05) !important;
}

.hover-row:hover {
  background: rgba(255, 255, 255, 0.02) !important;
}

.bg-accent-alpha {
  background: rgba(var(--v-theme-accent), 0.1) !important;
}
.bg-gold-alpha {
  background: rgba(var(--v-theme-gold), 0.1) !important;
}
.bg-success-alpha {
  background: rgba(var(--v-theme-success), 0.1) !important;
}
.bg-error-alpha {
  background: rgba(var(--v-theme-error), 0.1) !important;
}
.bg-black-alpha {
  background: rgba(0, 0, 0, 0.2) !important;
}

.h-48 {
  height: 48px !important;
}
.min-width-300 {
  min-width: 300px;
}

.border-gold-alpha {
  border: 1px solid rgba(233, 195, 73, 0.3) !important;
}

.border-gold-premium {
  border: 1px solid rgba(233, 195, 73, 0.6) !important;
  box-shadow: 0 0 10px rgba(233, 195, 73, 0.1);
}

.text-white-high {
  color: #ffffff !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  opacity: 1 !important;
}

[data-theme='light'] .text-white-high {
  color: #1a1a1a !important;
}

.text-gold-solid {
  color: #e9c349 !important;
  font-weight: 900;
}

.btn1-unified {
  border: 1px solid rgba(233, 195, 73, 0.82) !important;
  background: transparent !important;
  border-radius: 12px !important;
  min-height: 36px !important;
  box-shadow: none !important;
  transform: none !important;
}

.btn1-unified:hover {
  background: rgba(233, 195, 73, 0.08) !important;
  border-color: rgba(233, 195, 73, 0.95) !important;
}

.action-btn-unified {
  min-width: 180px !important;
}

.modal-card {
  background: #ffffff !important;
  border: 1px solid rgba(233, 195, 73, 0.4) !important;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2) !important;
}

.modal-footer-solid {
  background: #ffffff !important;
  opacity: 1 !important;
  border-top: 1px solid rgba(233, 195, 73, 0.2) !important;
}

.text-pure-black {
  color: #000000 !important;
  opacity: 1 !important;
}

.bg-white {
  background-color: #ffffff !important;
}

.ltr {
  direction: ltr;
}

/* ---- Mobile Styles (max-width: 1023px) ---- */
@media (max-width: 1023px) {
  /* Table: horizontal scroll */
  :deep(.v-table) {
    overflow-x: auto !important;
    display: block !important;
  }

  /* Search field: remove min-width constraint */
  .min-width-300 {
    min-width: 0 !important;
    width: 100% !important;
  }

  /* Header card-title: wrap on mobile */
  :deep(.v-card-title.pa-6.d-flex) {
    flex-wrap: wrap !important;
    gap: 12px !important;
    padding: 12px !important;
  }

  :deep(.v-card-title .v-spacer) {
    display: none !important;
  }

  :deep(.v-card-title .d-flex.ga-3.align-center) {
    width: 100% !important;
    flex-wrap: wrap !important;
  }

  :deep(.v-card-title .v-text-field) {
    flex: 1 1 100% !important;
  }

  :deep(.v-card-title .v-btn) {
    width: 100% !important;
  }

  /* Header icon: reduce size */
  .employees-page-title {
    font-size: 1.2rem !important;
  }

  /* Stat cards: 2 per row on mobile */
  :deep(.v-row.mb-8.dense > .v-col-sm-6) {
    flex: 0 0 50% !important;
    max-width: 50% !important;
  }

  .action-btn-unified {
    min-width: 100px !important;
  }
}

@media (max-width: 480px) {
  /* Stat cards: 1 per row on very small screens */
  :deep(.v-row.mb-8.dense > .v-col-sm-6) {
    flex: 0 0 100% !important;
    max-width: 100% !important;
  }
}
</style>
