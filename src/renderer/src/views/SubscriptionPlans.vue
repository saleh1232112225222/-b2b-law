<template>
  <v-container fluid class="pa-6 subscription-page rtl">
    <!-- Expired Trial Hero Banner -->
    <v-alert
      v-if="isTrialExpired"
      type="warning"
      variant="tonal"
      border="start"
      class="mb-6 rounded-xl"
      prominent
    >
      <div class="d-flex align-center">
        <div class="flex-grow-1">
          <div class="text-h6 font-weight-black mb-1">انتهت فترة التجربة المجانية</div>
          <div class="text-body-2">
            يمكنك الوصول للبيانات بشكل قراءة فقط. للاشتراك في خطة مدفوعة والمتابعة، اختر الخطة
            المناسبة أدناه.
          </div>
        </div>
        <v-btn
          v-if="isTrialExpired"
          color="warning"
          variant="elevated"
          class="ms-4 font-weight-black premium-btn-gold-gradient"
          @click="openPlans"
        >
          اشترك الآن
        </v-btn>
      </div>
    </v-alert>

    <v-row dense class="mb-8 align-center">
      <v-col>
        <div class="d-flex align-center">
          <div class="bg-white pa-4 rounded-xl me-5 border-gold-alpha">
            <LucideIcon name="crown" :size="36" class="text-gold" />
          </div>
          <div>
            <h1 class="text-h5 font-weight-black text-pure-black mb-1">الاشتراك والخطط</h1>
            <p class="text-subtitle-1 text-pure-black font-weight-black">
              اختر الخطة المناسبة لمكتبك القانوني
            </p>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Current Subscription Status -->
    <v-card
      v-if="currentSub"
      elevation="0"
      class="bg-white pa-6 mb-8 border-gold-alpha rounded-2xl glass-card"
    >
      <v-row dense align="center">
        <v-col cols="12" md="8">
          <div class="d-flex align-center">
            <div class="bg-white pa-3 rounded-lg me-4 border-gold-alpha">
              <LucideIcon
                :name="currentSub.isActive ? 'shield-check' : 'alert-triangle'"
                :size="28"
                :class="currentSub.isActive ? 'text-success' : 'text-error'"
              />
            </div>
            <div>
              <div class="text-body-1 font-weight-black text-pure-black">
                {{ currentSub.planNameAr || currentSub.planName || 'تجربة مجانية' }}
              </div>
              <div class="text-body-2 text-grey-darken-1">
                <template v-if="currentSub.isExpired">
                  <span class="text-error font-weight-black">منتهية</span>
                </template>
                <template
                  v-else-if="currentSub.daysLeft !== undefined && currentSub.daysLeft < 999"
                >
                  متبقي {{ currentSub.daysLeft }} يوم
                </template>
                <template v-else> نشط </template>
                -
                {{
                  currentSub.status === 'trial'
                    ? 'تجريبي'
                    : currentSub.status === 'active'
                      ? 'مدفوع'
                      : 'ملغى'
                }}
              </div>
            </div>
          </div>
        </v-col>
        <v-col cols="12" md="4" class="text-md-end">
          <v-btn
            v-if="currentSub.isExpired"
            color="accent"
            size="large"
            class="font-weight-black rounded-xl px-8 premium-btn-gold-gradient"
          >
            اشترك الآن
          </v-btn>
          <v-btn
            v-else
            variant="outlined"
            color="gold"
            size="large"
            class="font-weight-black rounded-xl px-8 premium-btn-gold-gradient"
            @click="openPlans"
          >
            تغيير الخطة
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <!-- Loading -->
    <v-row v-if="loading" class="justify-center py-12">
      <v-progress-circular indeterminate color="gold" :size="48" />
    </v-row>

    <!-- Plans Grid -->
    <v-row v-else>
      <v-col v-for="plan in plans" :key="plan.id" cols="12" md="6" lg="4">
        <v-card
          elevation="0"
          class="plan-card bg-white border-gold-alpha rounded-2xl overflow-hidden glass-card"
          :class="{ 'plan-featured': plan.interval === 'year' }"
        >
          <div
            v-if="plan.interval === 'year'"
            class="featured-banner text-center pa-2 bg-accent text-white font-weight-black text-body-3"
          >
            الأفضل
          </div>
          <div class="pa-6">
            <div class="text-h5 font-weight-black text-pure-black mb-1">{{ plan.name_ar }}</div>
            <div class="text-body-2 text-grey-darken-1 mb-4">{{ plan.description_ar }}</div>

            <div class="text-h3 font-weight-black text-gold mb-1">
              {{ plan.price }} <span class="text-h6">ريال</span>
            </div>
            <div class="text-body-2 text-grey-darken-1 mb-6">
              {{
                plan.interval === 'month'
                  ? '/ شهرياً'
                  : plan.interval === 'year'
                    ? '/ سنوياً'
                    : 'مدى الحياة'
              }}
            </div>

            <v-divider class="mb-4" />

            <div
              v-for="(feature, fi) in plan.features_ar"
              :key="fi"
              class="d-flex align-center mb-3"
            >
              <LucideIcon name="check-circle-2" :size="18" class="text-success me-3" />
              <span class="text-body-2 text-pure-black">{{ feature }}</span>
            </div>

            <v-btn
              block
              color="accent"
              size="large"
              class="mt-6 font-weight-black rounded-xl premium-btn-gold-gradient"
              :loading="processingPlan === plan.id"
              @click="selectPlan(plan)"
            >
              {{ plan.interval === 'lifetime' ? 'اشتري الآن' : 'اشترك الآن' }}
            </v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Payment Dialog -->
    <v-dialog v-model="showPaymentDialog" max-width="520" persistent>
      <v-card class="rounded-2xl glass-card">
        <div class="pa-6 bg-gold-gradient text-ebony d-flex align-center">
          <LucideIcon name="credit-card" :size="24" class="me-3" />
          <span class="text-h6 font-weight-black">تأكيد الدفع</span>
          <v-spacer />
          <v-btn
            class="premium-btn-gold-gradient"
            icon
            variant="text"
            color="ebony"
            @click="showPaymentDialog = false"
          >
            <LucideIcon name="x" :size="24" />
          </v-btn>
        </div>

        <v-card-text class="pa-6 rtl">
          <div class="text-h5 font-weight-black text-center mb-4">{{ selectedPlan?.name_ar }}</div>

          <div
            class="d-flex justify-space-between align-center mb-3 pa-4 bg-grey-lighten-4 rounded-lg"
          >
            <span class="font-weight-black">المبلغ</span>
            <span class="text-h5 font-weight-black text-gold">{{ selectedPlan?.price }} ريال</span>
          </div>

          <div class="text-body-2 text-grey-darken-1 text-center mb-6">
            بعد الدفع سيتم تفعيل اشتراكك فوراً. يمكنك الدخول من أي جهاز.
          </div>

          <v-alert v-if="paymentError" type="error" variant="tonal" class="mb-4" closable>
            {{ paymentError }}
          </v-alert>

          <v-btn
            block
            color="accent"
            size="x-large"
            class="font-weight-black rounded-xl mb-3 premium-btn-gold-gradient"
            :loading="processingPayment"
            @click="processPayment"
          >
            <LucideIcon name="shield-check" :size="22" class="me-3" />
            تأكيد الدفع
          </v-btn>

          <p class="text-caption text-grey text-center mt-4">
            مدفوعاتك آمنة ومشفرة. لن يتم مشاركة معلومات بطاقتك مع أي طرف ثالث.
          </p>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Success Dialog -->
    <v-dialog v-model="showSuccessDialog" max-width="440" persistent>
      <v-card class="rounded-2xl text-center pa-8 glass-card">
        <LucideIcon name="check-circle-2" :size="64" class="text-success mb-4" />
        <h2 class="text-h5 font-weight-black mb-2">تم التفعيل بنجاح!</h2>
        <p class="text-body-1 text-grey-darken-1 mb-6">
          اشتراكك الآن نشط. يمكنك الاستمتاع بجميع ميزات {{ selectedPlan?.name_ar }}.
        </p>
        <v-btn
          color="accent"
          size="large"
          class="font-weight-black rounded-xl px-12 premium-btn-gold-gradient"
          @click="closeSuccessDialog"
        >
          الذهاب للوحة التحكم
        </v-btn>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLicensingStore } from '../stores/licensing'
import LucideIcon from '../components/common/LucideIcon.vue'

const router = useRouter()
const licensingStore = useLicensingStore()

const plans = ref<any[]>([])
const currentSub = ref<any>(null)
const loading = ref(true)
const processingPlan = ref<string | null>(null)
const showPaymentDialog = ref(false)
const showSuccessDialog = ref(false)
const selectedPlan = ref<any>(null)
const processingPayment = ref(false)
const paymentError = ref('')

const isTrialExpired = computed(() => licensingStore.isTrialExpired)

const fetchData = async () => {
  loading.value = true
  try {
    if ((window as any).api?.subscriptions) {
      const [plansRes, statusRes] = await Promise.all([
        (window as any).api.subscriptions.getPlans(),
        (window as any).api.subscriptions.getStatus()
      ])
      plans.value = Array.isArray(plansRes) ? plansRes : plansRes.data || []
      currentSub.value = statusRes
    }
  } catch (e) {
    console.error('Failed to fetch subscription data:', e)
  } finally {
    loading.value = false
  }
}

const openPlans = () => {
  const el = document.querySelector('.plans-section')
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

const selectPlan = (plan: any) => {
  selectedPlan.value = plan
  showPaymentDialog.value = true
}

const processPayment = async () => {
  if (!selectedPlan.value) return
  processingPayment.value = true
  paymentError.value = ''
  try {
    const intent = await (window as any).api.subscriptions.createPaymentIntent(
      selectedPlan.value.id
    )
    const confirm = await (window as any).api.subscriptions.confirmPayment(intent.paymentId)
    if (confirm.success) {
      showPaymentDialog.value = false
      showSuccessDialog.value = true
      await licensingStore.refreshStatus()
      await fetchData()
    }
  } catch (e: any) {
    paymentError.value = e?.response?.data?.error || e?.message || 'فشلت عملية الدفع'
  } finally {
    processingPayment.value = false
  }
}

const closeSuccessDialog = () => {
  showSuccessDialog.value = false
  router.push('/dashboard')
}

onMounted(fetchData)
</script>

<style scoped>
.subscription-page {
  min-height: 100vh;
}
.plan-card {
  transition: all 0.3s ease;
  height: 100%;
}
.plan-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
}
.plan-featured {
  border: 2px solid;
  position: relative;
}
.featured-banner {
  letter-spacing: 1px;
}
</style>
