<template>
  <div class="page">
    <!-- 헤더 -->
    <header class="header">
      <div class="header-inner">
        <a href="/" class="logo">부동부동</a>
        <nav class="header-nav">
          <a href="/search" class="btn-text">매물 검색</a>
          <a href="/mypage" class="btn-text">마이페이지</a>
          <span class="user-greeting">{{ userName }}님</span>
          <button class="btn-text" @click="logout">로그아웃</button>
        </nav>
      </div>
    </header>

    <!-- 결제 내역 컨텐츠 -->
    <div class="payments-container">
      <div class="payments-inner">
        <!-- 페이지 타이틀 -->
        <div class="page-header">
          <h1 class="page-title">💳 결제 내역</h1>
          <p class="page-subtitle">모든 결제 내역을 확인하세요</p>
        </div>

        <!-- 결제 내역 그리드 -->
        <div class="payments-section">
          <div v-if="loading" class="loading-state">로딩 중...</div>
          <div v-else-if="payments.length === 0" class="empty-state">
            <p class="empty-icon">💳</p>
            <p>결제 내역이 없습니다</p>
          </div>
          <div v-else class="payment-grid">
            <div v-for="payment in payments" :key="payment.paymentId" class="payment-card">
              <div class="payment-header">
                <span class="payment-type">{{ paymentTypeLabel(payment.type) }}</span>
                <span class="badge" :class="paymentStatusClass(payment.status)">
                  {{ paymentStatusLabel(payment.status) }}
                </span>
              </div>
              <p class="payment-property">{{ payment.orderName }}</p>
              <p class="payment-amount">{{ formatPrice(payment.amount) }}원</p>
              <p class="payment-date">{{ formatDate(payment.approvedAt) }}</p>
              <button class="btn-detail" @click="viewPaymentDetail(payment.paymentId)">
                상세보기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getMyPayments } from '../shared/api.js'

const userName = ref('사용자')
const loading = ref(false)
const payments = ref([])

onMounted(async () => {
  const token = localStorage.getItem('accessToken')
  if (!token) {
    alert('로그인이 필요합니다')
    window.location.href = '/signin.html'
    return
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    userName.value = payload.name || '사용자'
  } catch (e) {
    console.error('토큰 파싱 실패:', e)
  }

  await loadPayments()
})

async function loadPayments() {
  loading.value = true
  try {
    const res = await getMyPayments(0, 100)
    if (res.data && Array.isArray(res.data.content)) {
      payments.value = res.data.content
    } else if (res.data && Array.isArray(res.data)) {
      payments.value = res.data
    } else if (Array.isArray(res.content)) {
      payments.value = res.content
    } else {
      payments.value = []
    }
  } catch (e) {
    console.error('결제 내역 불러오기 실패:', e)
    payments.value = []
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

function formatPrice(price) {
  if (!price) return '0'
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function paymentTypeLabel(type) {
  const labels = {
    DEPOSIT: '계약금',
    BALANCE: '잔금',
    FULL: '전체금액',
    PAID: '결제완료'
  }
  return labels[type] || type
}

function paymentStatusLabel(status) {
  const labels = {
    PAID: '결제완료',
    DONE: '완료',
    CANCELED: '취소',
    PENDING: '대기중',
    FAILED: '실패'
  }
  return labels[status] || status
}

function paymentStatusClass(status) {
  return {
    'badge-success': status === 'PAID' || status === 'DONE',
    'badge-error': status === 'CANCELED' || status === 'FAILED',
    'badge-warning': status === 'PENDING'
  }
}

function viewPaymentDetail(paymentId) {
  alert(`결제 ID ${paymentId} 상세보기 (구현 예정)`)
}

function logout() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  window.location.href = '/signin.html'
}
</script>

<style scoped>
/* 헤더 */
.header {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
  text-decoration: none;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 20px;
}

.btn-text {
  font-size: 15px;
  color: var(--color-text-secondary);
  text-decoration: none;
  cursor: pointer;
  background: none;
  border: none;
  transition: color 0.2s;
}

.btn-text:hover {
  color: var(--color-primary);
}

.user-greeting {
  font-size: 14px;
  color: var(--color-text);
  font-weight: 600;
}

/* 결제 내역 컨테이너 */
.payments-container {
  background: var(--color-bg);
  min-height: calc(100vh - 64px);
  padding: 40px 24px;
}

.payments-inner {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
}

.page-subtitle {
  font-size: 16px;
  color: var(--color-text-secondary);
}

/* 결제 섹션 */
.payments-section {
  background: var(--color-surface);
  border-radius: 16px;
  box-shadow: var(--shadow);
  padding: 32px;
}

/* 결제 그리드 */
.payment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.payment-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
  transition: box-shadow 0.2s;
}

.payment-card:hover {
  box-shadow: var(--shadow);
}

.payment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.payment-type {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.payment-property {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.payment-amount {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 8px;
}

.payment-date {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}

.btn-detail {
  width: 100%;
  padding: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-detail:hover {
  background: var(--color-primary);
  color: #ffffff;
}

/* 배지 */
.badge {
  display: inline-block;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 12px;
}

.badge-success {
  background: #e8f5e9;
  color: #2e7d32;
}

.badge-error {
  background: #ffeef0;
  color: var(--color-error);
}

.badge-warning {
  background: #fff4e5;
  color: #e65100;
}

/* 로딩/빈 상태 */
.loading-state,
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

/* 반응형 */
@media (max-width: 768px) {
  .header-nav {
    gap: 12px;
  }

  .btn-text {
    font-size: 14px;
  }

  .page-title {
    font-size: 24px;
  }

  .payment-grid {
    grid-template-columns: 1fr;
  }
}
</style>
