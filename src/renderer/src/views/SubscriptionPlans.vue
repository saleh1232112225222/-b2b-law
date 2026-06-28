<template>
  <v-container fluid class="pa-6 subscription-page rtl d-flex align-center justify-center">
    <v-card class="pa-8 text-center rounded-2xl glass-card border-gold-alpha" max-width="600" width="100%">
      <div class="mb-6">
        <LucideIcon name="alert-triangle" :size="80" class="text-gold mx-auto" />
      </div>
      <h1 class="text-h4 font-weight-black text-pure-black mb-4">الاشتراك معلق</h1>
      <p class="text-body-1 text-grey-darken-1 mb-8 leading-relaxed">
        عذراً، تم إيقاف صفحة الاشتراك والدفع مؤقتاً. يرجى مراجعة الدعم الفني لمعرفة المزيد من التفاصيل حول حالة اشتراكك وتفعيله.
      </p>
      
      <v-divider class="mb-8"></v-divider>
      
      <h2 class="text-h6 font-weight-black mb-6">للتواصل مع الدعم الفني المباشر</h2>
      <div class="d-flex justify-center gap-4 flex-wrap">
        <v-btn
          color="success"
          variant="elevated"
          class="font-weight-black px-6 rounded-xl"
          size="x-large"
          href="https://wa.me/966567905696"
          target="_blank"
        >
          <LucideIcon name="message-circle" :size="22" class="me-3" />
          مراسلة عبر واتساب
        </v-btn>
        <v-btn
          color="primary"
          variant="outlined"
          class="font-weight-black px-6 rounded-xl"
          size="x-large"
          href="tel:0567905696"
        >
          <LucideIcon name="phone" :size="22" class="me-3" />
          0567905696
        </v-btn>
      </div>
    </v-card>
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

// Mock Payment Form State
const paymentFormRef = ref<any>(null)
const isPaymentFormValid = ref(false)
const cardName = ref('')
const cardNumber = ref('')
const cardExpiry = ref('')
const cardCvc = ref('')

// Helpers for simple formatting
const formatCardNumber = (e: Event) => {
  let val = (e.target as HTMLInputElement).value.replace(/\\D/g, '').substring(0, 16)
  val = val.replace(/(\\d{4})(?=\\d)/g, '$1 ')
  cardNumber.value = val
}
const formatExpiry = (e: Event) => {
  let val = (e.target as HTMLInputElement).value.replace(/\\D/g, '').substring(0, 4)
  if (val.length >= 2) {
    val = val.substring(0, 2) + '/' + val.substring(2)
  }
  cardExpiry.value = val
}

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
  if (!selectedPlan.value || !paymentFormRef.value) return
  
  const { valid } = await paymentFormRef.value.validate()
  if (!valid) return

  processingPayment.value = true
  paymentError.value = ''
  try {
    // Add realistic artificial delay to simulate contacting a payment gateway
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const intent = await (window as any).api.subscriptions.createPaymentIntent(
      selectedPlan.value.id
    )
    const confirm = await (window as any).api.subscriptions.confirmPayment(intent.paymentId)
    if (confirm.success) {
      showPaymentDialog.value = false
      showSuccessDialog.value = true
      // Reset form
      cardName.value = ''
      cardNumber.value = ''
      cardExpiry.value = ''
      cardCvc.value = ''
      paymentFormRef.value?.resetValidation()
      
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
