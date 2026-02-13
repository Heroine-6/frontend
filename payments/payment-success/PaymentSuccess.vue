<script setup>
import { onMounted, ref } from 'vue'

const status = ref('loading')
const message = ref('승인 처리 중입니다...')
const orderId = ref('')
const amount = ref('')
const paymentKey = ref('')

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)

  paymentKey.value = params.get('paymentKey')
  orderId.value = params.get('orderId')
  amount.value = params.get('amount')

  if (!paymentKey.value || !orderId.value || !amount.value) {
    status.value = 'fail'
    message.value = '결제 정보가 누락되었습니다.'
    return
  }

  try {
    const res = await fetch('/api/payments/v2/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${localStorage.getItem('accessToken')}`
      },
      body: JSON.stringify({
        paymentKey: paymentKey.value,
        orderId: orderId.value,
        amount: Number(amount.value)
      })
    })

    if (!res.ok) throw new Error()

    status.value = 'success'
    message.value = '결제가 완료되었습니다.'
  } catch (e) {
    status.value = 'fail'
    message.value = '결제 승인 요청에 실패했습니다.'
  }
})

const goToPayments = () => {
  window.location.href = '/payments.html'
}

const retry = () => {
  window.location.reload()
}
</script>

<template>
  <div class="page">
    <div class="card">
      <h2>결제 승인 결과</h2>

      <div class="status-box" :class="status">
        <span v-if="status === 'loading'">⏳</span>
        <span v-if="status === 'success'">✅</span>
        <span v-if="status === 'fail'">❌</span>
        <span>{{ message }}</span>
      </div>

      <div class="info">
        <div class="row">
          <span>orderId</span>
          <span>{{ orderId }}</span>
        </div>
        <div class="row">
          <span>결제 금액</span>
          <span>{{ Number(amount).toLocaleString() }}원</span>
        </div>
        <div class="row">
          <span>paymentKey</span>
          <span class="break">{{ paymentKey }}</span>
        </div>
      </div>

      <div class="actions">
        <button v-if="status === 'success'" class="btn primary" @click="goToPayments">
          결제 내역 보기
        </button>

        <button v-if="status === 'fail'" class="btn ghost" @click="retry">
          다시 시도
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  height: 100vh;
  background: linear-gradient(135deg, #f5f7fa, #e4ebf5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card {
  width: 460px;
  background: #fff;
  padding: 32px;
  border-radius: 18px;
  box-shadow: 0 15px 35px rgba(0,0,0,0.12);
}

h2 {
  text-align: center;
  margin-bottom: 24px;
}

.status-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  border-radius: 12px;
  font-weight: 600;
  margin-bottom: 20px;
}

.status-box.loading {
  background: #eef2ff;
  color: #3730a3;
}

.status-box.success {
  background: #f0fdf4;
  color: #166534;
}

.status-box.fail {
  background: #fef2f2;
  color: #991b1b;
}

.info {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  background: #fafafa;
}

.row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.break {
  word-break: break-all;
  text-align: right;
  max-width: 60%;
}

.actions {
  display: flex;
  gap: 12px;
}

.btn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: none;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s;
}

.btn.primary {
  background: #2563eb;
  color: white;
}

.btn.ghost {
  background: #111827;
  color: white;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0,0,0,0.15);
}
</style>
