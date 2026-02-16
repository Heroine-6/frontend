<template>
    <AppLayout>

    <!-- 컨텐츠 -->
    <div class="payments-container">
      <div class="payments-inner">
        <div class="page-header">
          <h1 class="page-title">💳 결제 내역</h1>
          <p class="page-subtitle">모든 결제 내역을 확인하세요</p>
        </div>

        <div class="payments-section">
          <!-- 로딩 -->
          <div v-if="loading" class="state-box">결제 내역을 불러오는 중...</div>

          <!-- 빈 결과 -->
          <div v-else-if="payments.length === 0" class="state-box">
            <p class="empty-icon">💳</p>
            <p>결제 내역이 없습니다</p>
          </div>

          <!-- 결제 그리드 -->
          <template v-else>
            <div class="payment-grid">
              <div
                v-for="item in payments"
                :key="item.paymentId"
                class="payment-card"
              >
                <div class="payment-header">
                  <span class="badge-type" :class="typeClass(item.type)">{{ typeLabel(item.type) }}</span>
                  <span class="badge" :class="statusClass(item.status)">
                    {{ statusLabel(item.status) }}
                  </span>
                </div>
                <p class="payment-name">{{ item.orderName }}</p>
                <p class="payment-amount">{{ formatAmount(item.amount) }}</p>
                <p class="payment-date">{{ formatDate(item.approvedAt) }}</p>
                <button class="btn-detail" @click="openDetail(item.paymentId)">상세보기</button>
              </div>
            </div>

            <!-- 페이지네이션 -->
            <div class="pagination">
              <button :disabled="currentPage === 0" @click="loadPayments(currentPage - 1)">이전</button>
              <button class="current" disabled>{{ currentPage + 1 }}</button>
              <button :disabled="!hasNext" @click="loadPayments(currentPage + 1)">다음</button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 상세 모달 -->
    <div
      v-if="detailOpen"
      class="detail-overlay"
      @click.self="closeDetail"
    >
      <div class="detail-card">
        <button class="close-btn" @click="closeDetail">&times;</button>

        <div v-if="detailLoading" class="state-box">상세 정보를 불러오는 중...</div>

        <template v-else-if="detail">
          <h2>{{ detail.orderName }}</h2>

          <div class="detail-row">
            <span class="detail-label">결제 유형</span>
            <span class="detail-value">{{ typeLabel(detail.type) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">결제 금액</span>
            <span class="detail-value">{{ formatAmount(detail.amount) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">결제 상태</span>
            <span class="detail-value">
              <span class="badge" :class="statusClass(detail.status)">
                {{ statusLabel(detail.status) }}
              </span>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">결제 수단</span>
            <span class="detail-value">{{ detail.paymentMethodType || '-' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">결제 상세</span>
            <span class="detail-value">{{ detail.methodDetail || '-' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">승인 일시</span>
            <span class="detail-value">{{ formatDate(detail.approvedAt) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">경매 상태</span>
            <span class="detail-value">{{ detail.auctionStatus || '-' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">시작가</span>
            <span class="detail-value">{{ detail.startPrice ? formatAmount(detail.startPrice) : '-' }}</span>
          </div>

          <button
            v-if="canRefund"
            class="refund-btn"
            :disabled="refunding"
            @click="requestRefund"
          >
            {{ refunding ? '환불 요청 중...' : '환불 요청' }}
          </button>
        </template>
      </div>
    </div>

    <!-- 토스트 -->
    <div class="toast" :class="{ show: toastVisible }">{{ toastMsg }}</div>
    </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getMyPayments, getPaymentDetail, refundPayment } from '../shared/api.js'
import AppLayout from "../components/AppLayout.vue";

const userName = ref('')
const loading = ref(false)
const payments = ref([])
const currentPage = ref(0)
const hasNext = ref(false)
const pageSize = 10

// 상세 모달
const detailOpen = ref(false)
const detailLoading = ref(false)
const detail = ref(null)
const refunding = ref(false)

// 토스트
const toastMsg = ref('')
const toastVisible = ref(false)
let toastTimer = null

const canRefund = computed(() =>
  detail.value && detail.value.type === 'DEPOSIT' && detail.value.status === 'SUCCESS'
)

onMounted(() => {
  const token = localStorage.getItem('accessToken')
  if (!token) {
    alert('로그인이 필요합니다')
    window.location.href = '/signin.html'
    return
  }

  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
    const payload = JSON.parse(new TextDecoder().decode(bytes))
    userName.value = payload.username || payload.userEmail || ''
  } catch (e) {
    console.error('토큰 파싱 실패:', e)
  }

  loadPayments(0)
})

async function loadPayments(page) {
  loading.value = true
  currentPage.value = page
  try {
    const res = await getMyPayments(page, pageSize)
    if (res.data) {
      payments.value = res.data.content || []
      hasNext.value = res.data.hasNext || false
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

async function openDetail(paymentId) {
  detailOpen.value = true
  detailLoading.value = true
  detail.value = null

  try {
    const res = await getPaymentDetail(paymentId)
    detail.value = res.data
  } catch (e) {
    showToast('상세 정보를 불러올 수 없습니다.')
    detailOpen.value = false
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  detailOpen.value = false
  detail.value = null
}

async function requestRefund() {
  if (!detail.value) return
  refunding.value = true
  try {
    await refundPayment(detail.value.paymentId)
    showToast('환불이 완료되었습니다.')
    closeDetail()

    // 상태 변경 감지
    await waitUntilStatusChanged(paymentId)
  } catch (e) {
    showToast(e.message || '환불 요청에 실패했습니다.')
  } finally {
    refunding.value = false
  }
}

async function waitUntilStatusChanged(paymentId, maxTry = 5) {
  let previousStatus = 'REFUND_REQUESTED'

  for (let i = 0; i < maxTry; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000))

    const res = await getPaymentDetail(paymentId)
    const currentStatus = res.data.status

    if (currentStatus !== previousStatus) {
      closeDetail()
      await loadPayments(currentPage.value)
      showToast('환불이 완료되었습니다.')
      return
    }
  }

  // maxTry 초과 시
  showToast('환불 처리 중입니다. 잠시 후 확인해주세요.')
}


// 유틸
function typeLabel(type) {
  const map = { DEPOSIT: '보증금', DOWN_PAYMENT: '계약금', BALANCE: '잔금' }
  return map[type] || type || '-'
}

function typeClass(type) {
  const cls = { DEPOSIT: 'type-deposit', DOWN_PAYMENT: 'type-down-payment', BALANCE: 'type-balance' }
  return cls[type] || ''
}

function statusLabel(status) {
  const map = {
    PAID: '결제 완료', FAILED: '결제 실패', IN_PROGRESS: '결제 진행중',
    REFUND_IN_PROGRESS: '환불 처리중', REFUNDED: '환불 완료',
    READY: '결제 대기', SUCCESS: '결제 완료', FAIL: '결제 실패',
    VERIFYING: '확인 중', REFUND_REQUESTED: '환불 처리중',
  }
  return map[status] || status || '-'
}

function statusClass(status) {
  const cls = {
    PAID: 'badge-paid', SUCCESS: 'badge-paid',
    FAILED: 'badge-failed', FAIL: 'badge-failed',
    IN_PROGRESS: 'badge-progress', READY: 'badge-progress', VERIFYING: 'badge-progress',
    REFUND_IN_PROGRESS: 'badge-refund-progress', REFUND_REQUESTED: 'badge-refund-progress',
    REFUNDED: 'badge-refunded',
  }
  return cls[status] || 'badge-progress'
}

function formatAmount(amount) {
  if (!amount) return '-'
  return Number(amount).toLocaleString('ko-KR') + '원'
}

function formatDate(dt) {
  if (!dt) return '-'
  const d = new Date(dt)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function showToast(msg) {
  toastMsg.value = msg
  toastVisible.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, 3000)
}

function logout() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  window.location.href = '/signin.html'
}
</script>

<style scoped>
* { box-sizing: border-box; }

.page {
  min-height: 100vh;
  background: var(--color-bg);
}

/* ===== 헤더 ===== */
.header {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.logo {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-primary);
  text-decoration: none;
}
.header-nav {
  display: flex;
  align-items: center;
  gap: 12px;
}
.btn-text {
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  text-decoration: none;
  padding: 8px 12px;
}
.btn-text:hover { color: var(--color-text); }
.user-greeting {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

/* ===== 컨테이너 ===== */
.payments-container {
  background: var(--color-bg);
  min-height: calc(100vh - 60px);
  padding: 40px 24px;
}
.payments-inner {
  max-width: 1200px;
  margin: 0 auto;
}
.page-header { margin-bottom: 32px; }
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
.page-subtitle { font-size: 15px; color: var(--color-text-secondary); }

/* ===== 섹션 ===== */
.payments-section {
  background: var(--color-surface);
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 32px;
}

/* ===== 상태 ===== */
.state-box {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-secondary);
  font-size: 15px;
}
.empty-icon { font-size: 48px; margin-bottom: 16px; }

/* ===== 결제 그리드 ===== */
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
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
.payment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.badge-type {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: #f3f4f6;
  color: #374151;
}
.type-deposit { background: #dbeafe; color: #1e40af; }
.type-down-payment { background: #e0e7ff; color: #3730a3; }
.type-balance { background: #eff6ff; color: #1d4ed8; }
.payment-name {
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
  color: #fff;
}

/* ===== 배지 ===== */
.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
.badge-paid { background: #dcfce7; color: #166534; }
.badge-failed { background: #fef2f2; color: #991b1b; }
.badge-progress { background: #eef2ff; color: #3730a3; }
.badge-refund-progress { background: #fef9c3; color: #854d0e; }
.badge-refunded { background: #f3f4f6; color: #6b7280; }

/* ===== 페이지네이션 ===== */
.pagination {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
}
.pagination button {
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: #374151;
  transition: background 0.2s;
}
.pagination button:hover:not(:disabled) { background: #f3f4f6; }
.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.pagination .current {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

/* ===== 상세 모달 ===== */
.detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.detail-card {
  width: 440px;
  max-width: 95vw;
  max-height: 90vh;
  overflow-y: auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  padding: 28px 24px;
  position: relative;
}
.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #9ca3af;
  line-height: 1;
}
.close-btn:hover { color: #111827; }
.detail-card h2 {
  font-size: 18px;
  font-weight: 800;
  margin-bottom: 18px;
  padding-right: 32px;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f3f4f6;
}
.detail-row:last-of-type { border-bottom: none; }
.detail-label { font-size: 13px; color: #6b7280; }
.detail-value { font-size: 13px; font-weight: 700; color: #111827; text-align: right; }

/* ===== 환불 버튼 ===== */
.refund-btn {
  width: 100%;
  margin-top: 18px;
  padding: 14px;
  border: none;
  border-radius: 12px;
  background: #dc2626;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}
.refund-btn:hover:not(:disabled) {
  background: #b91c1c;
  transform: translateY(-1px);
}
.refund-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
  transform: none;
}

/* ===== 토스트 ===== */
.toast {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: #111827;
  color: #fff;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  z-index: 300;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}
.toast.show { opacity: 1; }

/* ===== 반응형 ===== */
@media (max-width: 768px) {
  .payments-container { padding: 24px 16px; }
  .payments-section { padding: 20px; }
  .page-title { font-size: 22px; }
  .header-nav { gap: 4px; }
  .btn-text { font-size: 13px; padding: 6px 8px; }
  .payment-grid { grid-template-columns: 1fr; }
  .detail-card { padding: 20px 16px; }
}
</style>
