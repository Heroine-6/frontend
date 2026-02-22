<template>
  <AppLayout>

    <!-- 컨텐츠 -->
    <div class="checkout-container">
      <div class="checkout-inner">
        <!-- 뒤로가기 -->
        <button class="btn-back" @click="goBack">
          &larr; {{ step === 'detail' ? '목록으로 돌아가기' : '마이페이지로 돌아가기' }}
        </button>

        <div class="page-header">
          <h1 class="page-title">{{ pageTitle }}</h1>
          <p class="page-subtitle">{{ pageSubtitle }}</p>
        </div>

        <!-- ========== Step 1: 경매 목록 ========== -->
        <div v-if="step === 'list'" class="auction-list-section">
          <!-- 로딩 -->
          <div v-if="listLoading" class="loading-card">
            <div class="spinner"></div>
            <p>결제 대상 경매를 불러오는 중...</p>
          </div>

          <!-- 빈 목록 -->
          <div v-else-if="auctionList.length === 0" class="empty-card">
            <div class="empty-icon">📋</div>
            <h3>결제 대상 경매가 없습니다</h3>
            <p>현재 {{ paymentTypeLabel }} 결제가 필요한 경매가 없습니다.</p>
            <a href="/mypage" class="btn-go-mypage">마이페이지로 돌아가기</a>
          </div>

          <!-- 목록 -->
          <div v-else class="auction-list">
            <div
              v-for="item in auctionList"
              :key="item.auctionId"
              class="auction-item"
              :class="{ 'overdue': item.expired, 'clickable': !item.expired }"
              @click="!item.expired && selectAuction(item)"
            >
              <div class="auction-item-header">
                <span class="auction-name">{{ item.auctionName || item.propertyName || `경매 #${item.auctionId}` }}</span>
                <span v-if="item.expired" class="badge badge-overdue">기한 만료</span>
                <span v-else class="badge badge-active">결제 대기</span>
              </div>
              <div class="auction-item-body">
                <div class="auction-meta">
                  <span class="meta-label">낙찰가</span>
                  <span class="meta-value">{{ formatAmount(item.finalPrice) }}</span>
                </div>
                <div class="auction-meta">
                  <span class="meta-label">결제 금액</span>
                  <span class="meta-value highlight">{{ formatAmount(item.payableAmount) }}</span>
                </div>
                <div class="auction-meta">
                  <span class="meta-label">납부 기한</span>
                  <span class="meta-value" :class="{ 'overdue-text': item.expired }">
                    {{ formatDateTime(item.dueAt) }}
                  </span>
                </div>
              </div>
              <div v-if="item.expired" class="overdue-overlay">
                <span>납부 기한이 만료되어 결제할 수 없습니다</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ========== Step 2: 결제 상세 ========== -->
        <div v-if="step === 'detail'" class="checkout-card">
          <!-- 로딩 -->
          <div v-if="detailLoading" class="loading-card">
            <div class="spinner"></div>
            <p>결제 정보를 불러오는 중...</p>
          </div>

          <template v-else-if="detailInfo">
            <!-- 제목 -->
            <div class="card-section">
              <h2 class="section-title">
                {{ paymentType === 'BALANCE' ? '낙찰 잔금 결제' : '낙찰 계약금 결제' }}
              </h2>
            </div>

            <div class="divider"></div>

            <!-- 경매 상세 정보 테이블 -->
            <div class="card-section">
              <div class="detail-table">

                <div class="detail-row">
                  <span class="detail-label">입찰건명</span>
                  <span class="detail-value">{{ detailInfo.auctionName }}</span>
                </div>

                <div class="detail-row">
                  <span class="detail-label">낙찰가</span>
                  <span class="detail-value">
                    {{ formatAmount(detailInfo.finalPrice) }}
                  </span>
                </div>

                <div class="detail-row">
                  <span class="detail-label">결제 금액</span>
                  <span class="detail-value highlight">
                    {{ formatAmount(detailInfo.payableAmount) }}
                  </span>
                </div>

                <div v-if="detailInfo.alreadyPaidAmount != null" class="detail-row">
                  <span class="detail-label">이미 납부한 금액</span>
                  <span class="detail-value">
                  {{ formatAmount(detailInfo.alreadyPaidAmount) }}
                </span>
                </div>

                <div class="detail-row">
                  <span class="detail-label">입찰 일자</span>
                  <span class="detail-value">
                  {{ formatDateTime(detailInfo.bidAt) }}
                </span>
                </div>

                <div class="detail-row">
                  <span class="detail-label">낙찰 일자</span>
                  <span class="detail-value">
                  {{ formatDateTime(detailInfo.wonAt) }}
                </span>
                </div>

                <div class="detail-row">
                  <span class="detail-label">납부 기한</span>
                  <span class="detail-value">
                  {{ formatDateTime(detailInfo.dueAt) }}
                </span>
                </div>

              </div>
            </div>


            <div class="divider"></div>

            <!-- 결제 동의 -->
            <div class="card-section">
              <div class="agreement-box">
                <h3 class="agreement-title">
                  {{ paymentType === 'BALANCE' ? '잔금 결제 동의' : '낙찰 계약금 결제 동의' }}
                </h3>
                <label class="agreement-item">
                  <input type="checkbox" v-model="agree1" />
                  <span>1. 본 내용을 숙지했습니다 (필수)</span>
                </label>
                <label class="agreement-item">
                  <input type="checkbox" v-model="agree2" />
                  <span>2. 결제 후 환불 규정에 동의합니다 (필수)</span>
                </label>
              </div>

              <button
                class="btn-pay"
                :disabled="!canPay || paying"
                @click="processPayment"
              >
                {{ paying ? '결제 처리 중...' : '결제' }}
              </button>
            </div>
          </template>

          <!-- 에러 -->
          <div v-if="detailError" class="error-card">
            <p>{{ detailError }}</p>
            <button class="btn-retry" @click="step = 'list'">목록으로 돌아가기</button>
          </div>
        </div>

        <!-- ========== Step 3: 결제 결과 ========== -->
        <div v-if="step === 'result'" class="checkout-card">
          <div class="card-section">
            <div v-if="paymentResult" class="result-card success">
              <div class="result-icon">&#10003;</div>
              <h3>결제가 완료되었습니다</h3>
              <div class="result-details">
                <div class="result-row">
                  <span>주문명</span>
                  <span>{{ paymentResult.orderName || '-' }}</span>
                </div>
                <div class="result-row">
                  <span>결제 금액</span>
                  <span>{{ formatAmount(paymentResult.amount || paymentResult.paymentAmount) }}</span>
                </div>
                <div class="result-row">
                  <span>결제 상태</span>
                  <span>{{ statusLabel(paymentResult.status) }}</span>
                </div>
              </div>
              <div class="result-actions">
                <a href="/payments" class="btn-go-payments">결제 내역 보기</a>
                <a href="/mypage" class="btn-go-mypage">마이페이지</a>
              </div>
            </div>
            <div v-if="paymentError" class="result-card error">
              <div class="result-icon error-icon">!</div>
              <h3>결제에 실패했습니다</h3>
              <p class="error-detail">{{ paymentError }}</p>
              <button class="btn-retry" @click="retryPayment">다시 시도</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 토스트 -->
    <div class="toast" :class="{ show: toastVisible }">{{ toastMsg }}</div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getMyPaymentAuctions, getPaymentAuctionInfo, createPayment } from '../shared/api.js'
import AppLayout from "../components/AppLayout.vue";

// URL 파라미터
const urlParams = new URLSearchParams(window.location.search)
const rawType = urlParams.get('type')
if (!rawType) {
  window.location.href = '/mypage'
}
const paymentType = rawType || 'DOWN_PAYMENT'

// 사용자 정보
const userName = ref('')

// 단계 관리 ('list', 'detail', 'result')
const step = ref('list')

// 목록
const auctionList = ref([])
const listLoading = ref(false)

// 상세
const selectedAuctionId = ref(null)
const detailInfo = ref(null)
const detailLoading = ref(false)
const detailError = ref('')

// 결제 동의
const agree1 = ref(false)
const agree2 = ref(false)

// 결제
const paying = ref(false)
const paymentResult = ref(null)
const paymentError = ref('')

// 토스트
const toastMsg = ref('')
const toastVisible = ref(false)
let toastTimer = null

// 페이지 타이틀
const pageTitle = computed(() => {
  return paymentType === 'BALANCE' ? '잔금 결제' : '계약금 결제'
})

const pageSubtitle = computed(() => {
  if (step.value === 'list') {
    return paymentType === 'BALANCE'
      ? '잔금 결제가 필요한 경매 목록입니다'
      : '계약금 결제가 필요한 경매 목록입니다'
  }
  return paymentType === 'BALANCE'
    ? '낙찰 경매의 잔금을 결제합니다'
    : '낙찰 경매의 계약금을 결제합니다'
})

const paymentTypeLabel = computed(() => {
  return paymentType === 'BALANCE' ? '잔금' : '계약금'
})

const canPay = computed(() => agree1.value && agree2.value)

// 초기화
onMounted(async () => {
  const token = localStorage.getItem('accessToken')
  if (!token) {
    alert('로그인이 필요합니다')
    window.location.href = '/signin'
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

  await fetchAuctionList()
})

// 경매 목록 조회
async function fetchAuctionList() {
  listLoading.value = true
  try {
    const res = await getMyPaymentAuctions(paymentType)
    if (res.data && Array.isArray(res.data.content)) {
      auctionList.value = res.data.content
    } else if (res.data && Array.isArray(res.data)) {
      auctionList.value = res.data
    } else if (Array.isArray(res.content)) {
      auctionList.value = res.content
    } else {
      auctionList.value = []
    }
  } catch (e) {
    console.error('목록 조회 실패:', e)
    showToast(e.message || '목록을 불러올 수 없습니다.')
    auctionList.value = []
  } finally {
    listLoading.value = false
  }
}

// 경매 선택 → 상세 조회
async function selectAuction(item) {
  selectedAuctionId.value = item.auctionId
  step.value = 'detail'
  detailLoading.value = true
  detailError.value = ''
  detailInfo.value = null
  agree1.value = false
  agree2.value = false

  try {
    const res = await getPaymentAuctionInfo(item.auctionId, paymentType)
    detailInfo.value = res.data
  } catch (e) {
    detailError.value = e.message || '결제 정보를 불러올 수 없습니다.'
  } finally {
    detailLoading.value = false
  }
}

// 결제 처리
async function processPayment() {
  if (!selectedAuctionId.value || !canPay.value) return

  paying.value = true

  try {
    const res = await createPayment(selectedAuctionId.value, paymentType)
    const { orderId, orderName, amount } = res.data
    console.log(window.TossPayments)
    const tossPayments = window.TossPayments(import.meta.env.VITE_TOSS_CLIENT_KEY)
    console.log(window.TossPayments)

    tossPayments.requestPayment('CARD', {
      amount,
      orderId,
      orderName,
      successUrl: window.location.origin + '/payment-success.html',
      failUrl: window.location.origin + '/payment-fail.html'
    })

  } catch (e) {
    paymentError.value = e.message || '결제 처리에 실패했습니다.'
    step.value = 'result'
  } finally {
    paying.value = false
  }
}


// 다시 시도
function retryPayment() {
  step.value = 'detail'
  paymentResult.value = null
  paymentError.value = ''
  agree1.value = false
  agree2.value = false
}

// 유틸
function formatAmount(amount) {
  if (!amount && amount !== 0) return '-'
  return Number(amount).toLocaleString('ko-KR') + '원'
}

function formatAmountWithWon(amount) {
  if (!amount && amount !== 0) return '-'
  const num = Number(amount)
  const formatted = num.toLocaleString('ko-KR')
  // 한글 단위 변환
  if (num >= 100000000) {
    const eok = Math.floor(num / 100000000)
    const remainder = num % 100000000
    if (remainder > 0) {
      const man = Math.floor(remainder / 10000)
      return `${eok}억${man > 0 ? man + '만' : ''}원 (₩${formatted})`
    }
    return `${eok}억원 (₩${formatted})`
  }
  if (num >= 10000) {
    const man = Math.floor(num / 10000)
    return `${man}만원 (₩${formatted})`
  }
  return `${formatted}원`
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const sec = String(date.getSeconds()).padStart(2, '0')
  return `${y}년 ${m}월 ${d}일 ${h}시 ${min}분 ${sec}초`
}

function statusLabel(status) {
  const map = {
    PAID: '결제 완료', SUCCESS: '결제 완료',
    FAILED: '결제 실패', FAIL: '결제 실패',
    IN_PROGRESS: '결제 진행중', READY: '결제 대기',
    VERIFYING: '확인 중',
    REFUND_REQUESTED: '환불 처리중',
    REFUND_IN_PROGRESS: '환불 처리중',
    REFUNDED: '환불 완료'
  }
  return map[status] || status || '-'
}

function showToast(msg) {
  toastMsg.value = msg
  toastVisible.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, 3000)
}

function goBack() {
  if (step.value === 'detail') {
    step.value = 'list'
    detailInfo.value = null
    detailError.value = ''
    agree1.value = false
    agree2.value = false
  } else {
    window.location.href = '/mypage'
  }
}

function logout() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  window.location.href = '/signin'
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
.checkout-container {
  min-height: calc(100vh - 60px);
  padding: 40px 24px;
}
.checkout-inner {
  max-width: 720px;
  margin: 0 auto;
}

/* ===== 뒤로가기 ===== */
.btn-back {
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0;
  margin-bottom: 24px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color 0.2s;
}
.btn-back:hover { color: var(--color-primary); }

/* ===== 페이지 헤더 ===== */
.page-header { margin-bottom: 24px; }
.page-title { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
.page-subtitle { font-size: 15px; color: var(--color-text-secondary); }

/* ===== 로딩 / 빈 상태 ===== */
.loading-card,
.empty-card {
  background: var(--color-surface);
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 60px 32px;
  text-align: center;
}
.loading-card p,
.empty-card p {
  color: var(--color-text-secondary);
  font-size: 15px;
  margin-top: 12px;
}
.empty-card h3 {
  font-size: 18px;
  font-weight: 700;
  margin: 12px 0 8px;
}
.empty-icon {
  font-size: 48px;
}
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== 경매 목록 ===== */
.auction-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.auction-item {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
  position: relative;
}
.auction-item.clickable {
  cursor: pointer;
}
.auction-item.clickable:hover {
  border-color: var(--color-primary);
  box-shadow: 0 4px 16px rgba(49, 130, 246, 0.12);
  transform: translateY(-2px);
}
.auction-item.overdue {
  opacity: 0.7;
  cursor: not-allowed;
}
.auction-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 0;
}
.auction-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
}
.auction-item-body {
  padding: 16px 24px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.auction-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.meta-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}
.meta-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}
.meta-value.highlight {
  color: var(--color-primary);
  font-weight: 700;
}
.meta-value.overdue-text {
  color: var(--color-error);
}
.auction-item-footer {
  padding: 0 24px 16px;
  text-align: right;
}
.go-detail {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
}
.overdue-overlay {
  padding: 12px 24px 16px;
  text-align: center;
}
.overdue-overlay span {
  font-size: 13px;
  color: var(--color-error);
  font-weight: 600;
}

/* ===== 배지 ===== */
.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.badge-active {
  background: #e0f2fe;
  color: #0369a1;
}
.badge-overdue {
  background: #fef2f2;
  color: #991b1b;
}

/* ===== 체크아웃 카드 ===== */
.checkout-card {
  background: var(--color-surface);
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}
.card-section {
  padding: 28px 32px;
}
.divider {
  height: 1px;
  background: var(--color-border);
  margin: 0 32px;
}
.section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0;
}

/* ===== 상세 테이블 ===== */
.detail-table {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}
.detail-row {
  display: flex;
  border-bottom: 1px solid var(--color-border);
}
.detail-row:last-child {
  border-bottom: none;
}
.detail-label {
  width: 160px;
  flex-shrink: 0;
  padding: 14px 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: #f8fafc;
  border-right: 1px solid var(--color-border);
  display: flex;
  align-items: center;
}
.detail-value {
  flex: 1;
  padding: 14px 20px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  display: flex;
  align-items: center;
}
.detail-value.highlight {
  color: var(--color-primary);
  font-weight: 700;
}

/* ===== 결제 동의 ===== */
.agreement-box {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  padding: 20px 24px;
  margin-bottom: 24px;
}
.agreement-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 14px;
}
.agreement-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--color-text);
  margin-bottom: 8px;
  cursor: pointer;
}
.agreement-item:last-child {
  margin-bottom: 0;
}
.agreement-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

/* ===== 결제 버튼 ===== */
.btn-pay {
  width: 100%;
  padding: 16px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  background: var(--color-primary);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-pay:hover:not(:disabled) {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(49, 130, 246, 0.3);
}
.btn-pay:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* ===== 에러 카드 ===== */
.error-card {
  padding: 40px 32px;
  text-align: center;
}
.error-card p {
  font-size: 15px;
  color: var(--color-error);
  margin-bottom: 20px;
}

/* ===== 결제 결과 ===== */
.result-card {
  padding: 32px 24px;
  border-radius: 12px;
  text-align: center;
}
.result-card.success {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}
.result-card.error {
  background: #fef2f2;
  border: 1px solid #fecaca;
}
.result-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #22c55e;
  color: #fff;
  font-size: 28px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}
.result-icon.error-icon {
  background: #ef4444;
}
.result-card h3 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 20px;
}
.result-details {
  text-align: left;
  background: var(--color-surface);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}
.result-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  border-bottom: 1px solid #f3f4f6;
}
.result-row:last-child { border-bottom: none; }
.result-row span:first-child { color: var(--color-text-secondary); }
.result-row span:last-child { font-weight: 600; color: var(--color-text); }

.result-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.btn-go-payments,
.btn-go-mypage {
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.2s;
}
.btn-go-payments {
  color: #fff;
  background: var(--color-primary);
}
.btn-go-payments:hover { background: var(--color-primary-hover); }
.btn-go-mypage {
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  display: inline-block;
}
.btn-go-mypage:hover { border-color: var(--color-text-secondary); }

.error-detail {
  font-size: 14px;
  color: #991b1b;
  margin-bottom: 20px;
}
.btn-retry {
  padding: 12px 32px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-retry:hover { background: var(--color-primary-hover); }

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
  .checkout-container { padding: 24px 16px; }
  .card-section { padding: 20px 16px; }
  .divider { margin: 0 16px; }
  .page-title { font-size: 22px; }
  .header-nav { gap: 4px; }
  .btn-text { font-size: 13px; padding: 6px 8px; }
  .auction-item-body {
    grid-template-columns: 1fr;
  }
  .detail-label {
    width: 120px;
    font-size: 13px;
    padding: 12px 14px;
  }
  .detail-value {
    font-size: 13px;
    padding: 12px 14px;
  }
  .result-actions { flex-direction: column; }
  .agreement-box { padding: 16px; }
}
</style>
