<template>
  <AppLayout>
    <div class="bid-container">
      <div class="bid-inner">
        <h1 class="page-title">입찰 등록</h1>

        <div v-if="loading" class="loading-state">정보를 불러오는 중...</div>
        <div v-else-if="error" class="error-state">{{ error }}</div>

        <template v-else-if="auctionInfo">

          <!-- ==================== 영국식 경매 ==================== -->
          <template v-if="auctionType === 'ENGLISH'">
            <!-- 매물 정보 확인 + 입찰자 정보 확인 -->
            <div class="two-col">
              <div class="card">
                <h3 class="card-title">매물 정보 확인</h3>
                <div class="info-row">
                  <span class="info-label">매물명</span>
                  <span class="info-value">{{ propertyInfo?.name || '-' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">경매 종료까지</span>
                  <span class="info-value countdown-text">{{ formatCountdownInline() }}</span>
                </div>
              </div>

              <div class="card">
                <h3 class="card-title">입찰자 정보 확인</h3>
                <div class="info-row">
                  <span class="info-label">성명</span>
                  <span class="info-value">{{ userInfo.name || '-' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">주소</span>
                  <span class="info-value">{{ userInfo.address || '-' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">전화번호</span>
                  <span class="info-value">{{ userInfo.phone || '-' }}</span>
                </div>
              </div>
            </div>

            <!-- 입찰 금액 설정 -->
            <div class="card">
              <h3 class="card-title">입찰 금액 설정</h3>
              <div class="bid-amount-grid">
                <div class="info-row">
                  <span class="info-label">현재 최고가</span>
                  <span class="info-value highlight">{{ formatPrice(auctionInfo.highestPrice) }}원</span>
                </div>
                <div class="info-row">
                  <span class="info-label">최소 입찰 단위</span>
                  <span class="info-value">{{ formatPrice(auctionInfo.minBidIncrement) }}원</span>
                </div>
                <div class="info-row bid-input-row">
                  <span class="info-label">나의 입찰 희망가</span>
                  <div class="bid-input-wrap">
                    <input
                      type="number"
                      v-model.number="bidPrice"
                      class="bid-input"
                      :min="minBidAmount"
                      :step="auctionInfo?.minBidIncrement || 1"
                      @change="onBidPriceChange"
                    />
                    <span class="bid-input-unit">원</span>
                  </div>
                </div>
              </div>

              <!-- 입찰 금액 미리보기 -->
              <div v-if="bidPrice" class="bid-preview">
                {{ formatPrice(bidPrice) }}원
              </div>
            </div>

            <!-- 시세 비교 -->
            <div v-if="marketCompare" class="card market-card">
              <h3 class="card-title">주변 시세 비교</h3>
              <div class="market-grid">
                <div class="market-item">
                  <span class="market-label">시작가 대비</span>
                  <span class="market-value" :class="ratioClass(marketCompare.startPriceRatio)">
                    {{ marketCompare.startPriceRatio.toFixed(1) }}%
                  </span>
                </div>
                <div class="market-item">
                  <span class="market-label">최고입찰가 대비</span>
                  <span class="market-value" :class="ratioClass(marketCompare.highestBidPriceRatio)">
                    {{ marketCompare.highestBidPriceRatio.toFixed(1) }}%
                  </span>
                </div>
                <div v-if="marketCompare.inputPriceRatio" class="market-item">
                  <span class="market-label">나의 입찰가 대비</span>
                  <span class="market-value" :class="ratioClass(marketCompare.inputPriceRatio)">
                    {{ marketCompare.inputPriceRatio.toFixed(1) }}%
                  </span>
                </div>
                <div class="market-item">
                  <span class="market-label">주변 시세 중앙값(m²)</span>
                  <span class="market-value">{{ formatPrice(marketCompare.medianPricePerArea) }}만원</span>
                </div>
              </div>
              <p class="market-note">* 주변 {{ marketCompare.totalCount }}건의 실거래 데이터 기준</p>
            </div>
            <div v-else-if="marketLoading" class="market-loading">시세 비교 데이터를 불러오는 중...</div>
          </template>

          <!-- ==================== 네덜란드식 경매 ==================== -->
          <template v-else-if="auctionType === 'DUTCH'">
            <!-- 매물 정보 + 입찰자 정보 -->
            <div class="two-col">
              <div class="card">
                <h3 class="card-title">매물 정보 확인</h3>
                <div class="info-row">
                  <span class="info-label">매물명</span>
                  <span class="info-value">{{ propertyInfo?.name || '-' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">현재가</span>
                  <span class="info-value highlight">{{ formatPrice(auctionInfo.currentPrice) }}원</span>
                </div>
              </div>

              <div class="card">
                <h3 class="card-title">입찰자 정보 확인</h3>
                <div class="info-row">
                  <span class="info-label">성명</span>
                  <span class="info-value">{{ userInfo.name || '-' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">주소</span>
                  <span class="info-value">{{ userInfo.address || '-' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">전화번호</span>
                  <span class="info-value">{{ userInfo.phone || '-' }}</span>
                </div>
              </div>
            </div>

            <!-- 즉시 낙찰가 -->
            <div class="card dutch-bid-card">
              <div class="dutch-bid-price">{{ formatPrice(auctionInfo.currentPrice) }}원</div>
              <p class="dutch-bid-notice">이 금액으로 즉시 낙찰됩니다</p>
              <p class="dutch-bid-sub">입찰 즉시 경매가 종료되며, 낙찰이 확정됩니다.</p>
            </div>
          </template>

          <!-- ==================== 공통: 유의사항 + 입찰 버튼 ==================== -->
          <div class="card agree-card">
            <h3 class="card-title">입찰 유의사항 및 동의</h3>
            <label class="agree-row">
              <input type="checkbox" v-model="agree1" />
              <span>1. 입찰 후에는 입찰 취소 또는 금액 수정이 불가능에 동의합니다. (필수)</span>
            </label>
            <label class="agree-row">
              <input type="checkbox" v-model="agree2" />
              <span>2. 낙찰 시 해당 매물의 매매 절차를 이행할 것이다. (필수)</span>
            </label>
          </div>
          <!-- 🔥 보증금 결제 안내 모달 -->
          <div v-if="showDepositModal" class="modal-overlay">
            <div class="modal-box">
              <h3 class="modal-title">보증금 결제 필요</h3>
              <p class="modal-text">
                입찰 전 최초 1회 시작가의 10% 보증금을 먼저 결제해야 합니다.<br />
                결제하시겠습니까?
              </p>

              <div class="modal-actions">
                <button class="btn-cancel" @click="showDepositModal = false">
                  취소
                </button>
                <button class="btn-confirm" @click="proceedDepositPayment">
                  결제하기
                </button>
              </div>
            </div>
          </div>

          <div class="submit-section">
            <button
              class="btn-submit"
              :disabled="!canSubmit || submitting"
              @click="submitBid"
            >
              {{ submitting ? '처리 중...' : '입찰' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  getAuctionInfo,
  getPropertyDetail,
  getMyProfile,
  createBid,
  createDutchBid,
  compareWithMarket,
  createDepositPayment
} from '../shared/api.js'
import AppLayout from "../components/AppLayout.vue";

// URL 파라미터
const params = new URLSearchParams(window.location.search)
const auctionId = ref(params.get('auctionId'))
const auctionType = ref(params.get('type') || 'ENGLISH')

// 상태
const loading = ref(false)
const error = ref('')
const auctionInfo = ref(null)
const propertyInfo = ref(null)
const userInfo = ref({ name: '', phone: '', address: '' })
const bidPrice = ref(null)
const marketCompare = ref(null)
const marketLoading = ref(false)
const agree1 = ref(false)
const agree2 = ref(false)
const submitting = ref(false)
const showDepositModal = ref(false)


// 카운트다운
const timeRemaining = ref({ days: 0, hours: 0, minutes: 0, seconds: 0 })
let countdownInterval = null

// 최소 입찰 금액
const minBidAmount = computed(() => {
  if (!auctionInfo.value) return 0
  const highest = Number(auctionInfo.value.highestPrice) || 0
  const increment = Number(auctionInfo.value.minBidIncrement) || 0
  return highest + increment
})

// 제출 가능 여부
const canSubmit = computed(() => {
  if (!agree1.value || !agree2.value) return false
  if (auctionType.value === 'ENGLISH') {
    return bidPrice.value && bidPrice.value >= minBidAmount.value
  }
  return true // Dutch: 금액 입력 불필요
})

onMounted(async () => {
  const token = localStorage.getItem('accessToken')
  if (!token) {
    alert('로그인이 필요합니다')
    window.location.href = '/signin.html'
    return
  }

  if (!auctionId.value) {
    error.value = '경매 ID가 없습니다.'
    return
  }

  await fetchData()

  // 🔥 결제 후 자동 입찰 재시도
  const pending = localStorage.getItem('pendingBid')
  if (pending) {
    const parsed = JSON.parse(pending)

    if (parsed.auctionId === auctionId.value) {
      localStorage.removeItem('pendingBid')

      // 약간의 UX 안정성을 위해 약간 지연
      setTimeout(async () => {
        try {
          submitting.value = true

          if (parsed.type === 'ENGLISH') {
            await createBid(parsed.auctionId, { price: parsed.price })
          } else {
            await createDutchBid(parsed.auctionId)
          }

          alert('보증금 결제 후 자동으로 입찰이 완료되었습니다!')
          window.location.href = `/auction-detail?id=${parsed.auctionId}`

        } catch (e) {
          console.error('자동 입찰 실패:', e)
        } finally {
          submitting.value = false
        }
      }, 500)
    }
  }
})


onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval)
})

async function fetchData() {
  loading.value = true
  try {
    // 사용자 정보 + 경매 정보 병렬 조회
    const [profileRes, infoRes] = await Promise.all([
      getMyProfile(),
      getAuctionInfo(auctionId.value)
    ])

    if (profileRes.data) {
      userInfo.value = profileRes.data
    }

    auctionInfo.value = infoRes.data
    if (auctionInfo.value.type) {
      auctionType.value = auctionInfo.value.type
    }

    // 매물 정보 조회
    if (auctionInfo.value.propertyId) {
      const propRes = await getPropertyDetail(auctionInfo.value.propertyId)
      if (propRes.data) propertyInfo.value = propRes.data
    }

    // 영국식: 기본 입찰가 설정 + 시세 비교 초기 로드
    if (auctionType.value === 'ENGLISH') {
      bidPrice.value = minBidAmount.value
      startCountdown()
      fetchMarketCompare(bidPrice.value)
    }
  } catch (e) {
    error.value = e.message || '데이터를 불러오는 중 오류가 발생했습니다.'
  } finally {
    loading.value = false
  }
}

async function fetchMarketCompare(inputPrice) {
  marketLoading.value = true
  try {
    const res = await compareWithMarket(auctionId.value, inputPrice || null)
    if (res.data) marketCompare.value = res.data
  } catch (e) {
    console.error('시세 비교 실패:', e)
  } finally {
    marketLoading.value = false
  }
}

let marketDebounce = null
function onBidPriceChange() {
  if (marketDebounce) clearTimeout(marketDebounce)
  marketDebounce = setTimeout(() => {
    if (bidPrice.value && bidPrice.value > 0) {
      fetchMarketCompare(bidPrice.value)
    }
  }, 500)
}

async function submitBid() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true

  try {

    if (auctionType.value === 'ENGLISH') {
      await createBid(auctionId.value, { price: bidPrice.value })
    } else {
      await createDutchBid(auctionId.value)
    }

    alert('입찰이 완료되었습니다!')
    window.location.href = `/auction-detail.html?id=${auctionId.value}`

  } catch (e) {
    if (e.message === '보증금 결제가 먼저 필요합니다') {
      showDepositModal.value = true
      return
    }
  }
}

async function proceedDepositPayment() {

  showDepositModal.value = false

  localStorage.setItem('pendingBid', JSON.stringify({
    auctionId: auctionId.value,
    type: auctionType.value,
    price: bidPrice.value
  }))

  const res = await createDepositPayment(
      auctionId.value,
      auctionType.value === 'ENGLISH' ? bidPrice.value : null
  )

  const { orderId, orderName, amount } = res.data

  const tossPayments = window.TossPayments(
      import.meta.env.VITE_TOSS_CLIENT_KEY
  )

  await tossPayments.requestPayment('CARD', {
    amount,
    orderId,
    orderName,
    successUrl: window.location.origin + '/payment-success.html',
    failUrl: window.location.origin + '/payment-fail.html'
  })
}


// 카운트다운
function startCountdown() {
  updateCountdown()
  countdownInterval = setInterval(updateCountdown, 1000)
}

function updateCountdown() {
  if (!auctionInfo.value?.endedAt) return
  const diff = new Date(auctionInfo.value.endedAt) - new Date()
  if (diff <= 0) {
    timeRemaining.value = { days: 0, hours: 0, minutes: 0, seconds: 0 }
    if (countdownInterval) clearInterval(countdownInterval)
    return
  }
  timeRemaining.value = {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000)
  }
}

function formatCountdownInline() {
  const t = timeRemaining.value
  const parts = []
  if (t.days > 0) parts.push(`${t.days}일`)
  parts.push(`${String(t.hours).padStart(2, '0')}:${String(t.minutes).padStart(2, '0')}:${String(t.seconds).padStart(2, '0')}`)
  return parts.join(' ')
}

function formatPrice(price) {
  if (!price && price !== 0) return '0'
  return Number(price).toLocaleString()
}

function ratioClass(ratio) {
  if (ratio > 110) return 'ratio-high'
  if (ratio < 90) return 'ratio-low'
  return 'ratio-normal'
}

function goBack() {
  window.history.back()
}
</script>

<style scoped>
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
}

.btn-text:hover { color: var(--color-primary); }

.bid-container {
  background: var(--color-bg);
  min-height: calc(100vh - 64px);
  padding: 40px 48px;
}

.bid-inner {
  max-width: 800px;
  margin: 0 auto;
}

.page-title {
  font-size: 24px;
  font-weight: 800;
  margin-bottom: 28px;
}

.loading-state, .error-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-secondary);
}

/* 카드 */
.card {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow);
  margin-bottom: 20px;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 16px 0;
}

/* 2열 레이아웃 */
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 0;
}

.two-col .card { margin-bottom: 20px; }

/* 정보 행 */
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
}

.info-row:last-child { border-bottom: none; }

.info-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.info-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
}

.info-value.highlight {
  color: var(--color-primary);
  font-size: 16px;
}

.countdown-text {
  color: var(--color-error);
}

/* 입찰 금액 입력 */
.bid-input-row {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.bid-input-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.bid-input {
  flex: 1;
  padding: 10px 12px;
  font-size: 16px;
  font-weight: 700;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s;
}

.bid-input:focus {
  border-color: var(--color-primary);
}

.bid-input-unit {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.bid-preview {
  margin-top: 16px;
  text-align: center;
  font-size: 28px;
  font-weight: 800;
  color: var(--color-primary);
  padding: 16px;
  background: #f0f7ff;
  border-radius: 8px;
}

/* 시세 비교 */
.market-card {
  background: #f8fdf8;
}

.market-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.market-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--color-surface);
  border-radius: 8px;
}

.market-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.market-value {
  font-size: 15px;
  font-weight: 700;
}

.ratio-high { color: var(--color-error); }
.ratio-low { color: #2e7d32; }
.ratio-normal { color: var(--color-text); }

.market-note {
  margin-top: 12px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.market-loading {
  text-align: center;
  padding: 20px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

/* 네덜란드식 즉시 낙찰 카드 */
.dutch-bid-card {
  text-align: center;
  background: #fff0f3;
}

.dutch-bid-price {
  font-size: 36px;
  font-weight: 800;
  color: var(--color-primary);
  margin-bottom: 8px;
}

.dutch-bid-notice {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 4px 0;
}

.dutch-bid-sub {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
}

/* 동의 */
.agree-card {
  background: #fffdf0;
}

.agree-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 0;
  font-size: 13px;
  color: var(--color-text);
  cursor: pointer;
}

.agree-row input[type="checkbox"] {
  margin-top: 2px;
  accent-color: var(--color-primary);
}

/* 제출 */
.submit-section {
  display: flex;
  justify-content: center;
  padding-top: 12px;
}

.btn-submit {
  padding: 12px 48px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  background: #e57373;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-submit:hover { background: #ef5350; }
.btn-submit:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* 🔥 모달 스타일 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-box {
  background: #fff;
  padding: 28px;
  width: 420px;
  max-width: 90%;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  animation: fadeUp 0.2s ease;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 16px;
}

.modal-text {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: 24px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-cancel {
  padding: 8px 18px;
  background: #eee;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-confirm {
  padding: 8px 18px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

@keyframes fadeUp {
  from { transform: translateY(8px); opacity: 0 }
  to { transform: translateY(0); opacity: 1 }
}

/* 반응형 */
@media (max-width: 768px) {
  .bid-container { padding: 20px 16px; }
  .two-col { grid-template-columns: 1fr; }
  .market-grid { grid-template-columns: 1fr; }
  .page-title { font-size: 20px; }
  .dutch-bid-price { font-size: 28px; }
}
</style>
