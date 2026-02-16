<template>
  <AppLayout>
    <!-- 경매 상세 컨텐츠 -->
    <div class="auction-container">
      <div class="auction-inner">

        <div v-if="loading" class="loading-state">경매 정보를 불러오는 중...</div>

        <div v-else-if="error" class="empty-state">
          <p class="empty-icon">⚠️</p>
          <p>{{ error }}</p>
        </div>

        <!-- ==================== 상향 경매 (ENGLISH) ==================== -->
        <template v-else-if="auctionType === 'ENGLISH' && auctionInfo">
          <!-- 페이지 헤더 -->
          <div class="dutch-page-header">
            <div class="dutch-title-row">
              <div>
                <span class="dutch-label">영국식 경매</span>
                <h1 class="dutch-title">
                  실시간 경매 진행 중 - 상향 경매
                  <span class="badge" :class="getBadgeClass()">{{ getStatusLabel() }}</span>
                </h1>
              </div>
              <button class="btn-secondary" @click="goToPropertyDetail">매물 상세 조회</button>
            </div>
          </div>

          <!-- 2열 레이아웃: 매물 정보 + 경매 현황 -->
          <div class="dutch-layout">
            <!-- 왼쪽: 매물 정보 및 이미지 -->
            <div class="dutch-property-card">
              <h3 class="section-title-compact">매물 정보</h3>
              <div class="dutch-property-image">
                <img
                  v-if="propertyInfo?.thumbnailImage"
                  :src="propertyInfo.thumbnailImage"
                  :alt="propertyInfo.name"
                  class="dutch-thumb-img"
                />
                <div v-else class="dutch-thumb-placeholder">🏢</div>
              </div>
              <div class="dutch-property-details">
                <div class="dutch-detail-row">
                  <span class="dutch-detail-label">매물명</span>
                  <span class="dutch-detail-value">{{ propertyInfo?.name || '-' }}</span>
                </div>
                <div class="dutch-detail-row">
                  <span class="dutch-detail-label">유형</span>
                  <span class="dutch-detail-value">{{ typeLabel(propertyInfo?.type) }}</span>
                </div>
                <div class="dutch-detail-row">
                  <span class="dutch-detail-label">준공일</span>
                  <span class="dutch-detail-value">{{ propertyInfo?.builtYear || '-' }}년</span>
                </div>
              </div>
            </div>

            <!-- 오른쪽: 경매 현황 + 입찰 정보 -->
            <div class="dutch-right-column">
              <!-- 경매 현황 -->
              <div class="dutch-status-card">
                <h3 class="section-title-compact">경매 현황</h3>
                <div class="dutch-status-list">
                  <div class="dutch-status-item dutch-status-highlight">
                    <span class="dutch-status-label">현재 최고가</span>
                    <span class="dutch-status-value dutch-current-price">{{ formatPrice(auctionInfo.highestPrice) }}원</span>
                  </div>
                  <div class="dutch-status-item">
                    <span class="dutch-status-label">시작가</span>
                    <span class="dutch-status-value">{{ formatPrice(auctionInfo.startPrice) }}원</span>
                  </div>
                  <div class="dutch-status-item">
                    <span class="dutch-status-label">남은시간</span>
                    <span class="dutch-status-value">{{ formatCountdownInline() }}</span>
                  </div>
                  <div class="dutch-status-item">
                    <span class="dutch-status-label">종료</span>
                    <span class="dutch-status-value">{{ formatEndDate(auctionInfo.endedAt) }}</span>
                  </div>
                </div>
              </div>

              <!-- 입찰 정보 -->
              <div class="english-bid-info-card">
                <h3 class="section-title-compact">입찰 정보</h3>
                <div class="dutch-decrease-list">
                  <div class="dutch-decrease-item">
                    <span class="dutch-decrease-label">입찰 단위</span>
                    <span class="dutch-decrease-value">{{ formatPrice(auctionInfo.minBidIncrement) }}원</span>
                  </div>
                  <div class="dutch-decrease-item">
                    <span class="dutch-decrease-label">입찰자 수</span>
                    <span class="dutch-decrease-value">{{ auctionInfo.totalBidders }}명</span>
                  </div>
                  <div v-if="statistics" class="dutch-decrease-item">
                    <span class="dutch-decrease-label">총 입찰 횟수</span>
                    <span class="dutch-decrease-value">{{ statistics.totalBidCount }}회</span>
                  </div>
                  <div v-if="statistics" class="dutch-decrease-item">
                    <span class="dutch-decrease-label">가격 상승</span>
                    <span class="dutch-decrease-value">{{ formatPrice(statistics.priceIncrease) }}원</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 실시간 입찰 기록 -->
          <div class="dutch-history-card english-bid-history">
            <h3 class="section-title-compact">실시간 입찰 기록</h3>
            <div class="dutch-history-list">
              <div v-if="bidHistory.length === 0" class="empty-bids-compact">
                입찰 내역이 없습니다
              </div>
              <template v-else>
                <div
                  v-for="(bid, index) in bidHistory.slice(0, 10)"
                  :key="bid.id || index"
                  class="bid-item-compact"
                  :class="{ 'bid-highest': index === 0 }"
                >
                  <span class="bid-time-compact">{{ formatTime(bid.createdAt) }}</span>
                  <span class="bid-price-compact">
                    {{ formatPrice(bid.price) }}원
                    <span v-if="index === 0" class="bid-badge-compact">최고</span>
                  </span>
                </div>
              </template>
            </div>
          </div>

          <!-- 액션 버튼 -->
          <div class="action-section">
            <button v-if="auctionStatus === 'OPEN'" class="btn-primary" @click="goToBid">입찰하기</button>
            <button class="btn-chat" @click="goToChat">문의하기</button>
          </div>
        </template>

        <!-- ==================== 하향 경매 (DESCENDING) ==================== -->
        <template v-else-if="auctionType === 'DUTCH' && auctionInfo">
          <!-- 페이지 헤더 -->
          <div class="dutch-page-header">
            <div class="dutch-title-row">
              <div>
                <span class="dutch-label">네덜란드식 경매</span>
                <h1 class="dutch-title">
                  실시간 경매 진행 중 - 하향 경매
                  <span class="badge" :class="getBadgeClass()">{{ getStatusLabel() }}</span>
                </h1>
              </div>
              <button class="btn-secondary" @click="goToPropertyDetail">매물 상세 조회</button>
            </div>
          </div>

          <!-- 2열 레이아웃: 매물 정보 + 경매 현황 -->
          <div class="dutch-layout">
            <!-- 왼쪽: 매물 정보 및 이미지 -->
            <div class="dutch-property-card">
              <h3 class="section-title-compact">매물 정보</h3>
              <div class="dutch-property-image">
                <img
                  v-if="propertyInfo?.thumbnailImage"
                  :src="propertyInfo.thumbnailImage"
                  :alt="propertyInfo.name"
                  class="dutch-thumb-img"
                />
                <div v-else class="dutch-thumb-placeholder">🏢</div>
              </div>
              <div class="dutch-property-details">
                <div class="dutch-detail-row">
                  <span class="dutch-detail-label">매물명</span>
                  <span class="dutch-detail-value">{{ propertyInfo?.name || '-' }}</span>
                </div>
                <div class="dutch-detail-row">
                  <span class="dutch-detail-label">유형</span>
                  <span class="dutch-detail-value">{{ typeLabel(propertyInfo?.type) }}</span>
                </div>
                <div class="dutch-detail-row">
                  <span class="dutch-detail-label">준공일</span>
                  <span class="dutch-detail-value">{{ propertyInfo?.builtYear || '-' }}년</span>
                </div>
              </div>
            </div>

            <!-- 오른쪽: 경매 현황 + 감소 정보 -->
            <div class="dutch-right-column">
              <!-- 경매 현황 -->
              <div class="dutch-status-card">
                <h3 class="section-title-compact">경매 현황</h3>
                <div class="dutch-status-list">
                  <div class="dutch-status-item dutch-status-highlight">
                    <span class="dutch-status-label">현재 금액</span>
                    <span class="dutch-status-value dutch-current-price">{{ formatPrice(currentPrice) }}원</span>
                  </div>
                  <div class="dutch-status-item">
                    <span class="dutch-status-label">시작가</span>
                    <span class="dutch-status-value">{{ formatPrice(auctionInfo.startPrice) }}원</span>
                  </div>
                  <div class="dutch-status-item">
                    <span class="dutch-status-label">남은시간</span>
                    <span class="dutch-status-value">{{ formatCountdownInline() }}</span>
                  </div>
                  <div class="dutch-status-item">
                    <span class="dutch-status-label">종료</span>
                    <span class="dutch-status-value">{{ formatEndDate(auctionInfo.endedAt) }}</span>
                  </div>
                </div>
              </div>

              <!-- 감소 정보 -->
              <div class="dutch-decrease-card">
                <h3 class="section-title-compact">감소 정보</h3>
                <div class="dutch-decrease-list">
                  <div class="dutch-decrease-item">
                    <span class="dutch-decrease-label">감소 주기</span>
                    <span class="dutch-decrease-value">30분</span>
                  </div>
                  <div class="dutch-decrease-item">
                    <span class="dutch-decrease-label">주기당 감소 금액</span>
                    <span class="dutch-decrease-value">{{ formatPrice(auctionInfo.decreasePrice) }}원</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 액션 버튼 -->
          <div class="action-section">
            <button v-if="auctionStatus === 'OPEN'" class="btn-primary" @click="goToBid">입찰하기</button>
            <button class="btn-chat" @click="goToChat">문의하기</button>
          </div>
        </template>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getPropertyDetail } from '../shared/api.js'
import AppLayout from "../components/AppLayout.vue";

// URL 파라미터
const params = new URLSearchParams(window.location.search)
const auctionId = ref(params.get('id'))
const auctionType = ref(params.get('type') || 'ENGLISH')

const loading = ref(false)
const error = ref('')
const userName = ref('사용자')
const auctionInfo = ref(null)
const statistics = ref(null)
const auctionStatus = ref(null)
const bidHistory = ref([])
const propertyInfo = ref(null)

// 카운트다운 관련 상태
const timeRemaining = ref({ days: 0, hours: 0, minutes: 0, seconds: 0 })
const timeUntilStart = ref({ days: 0, hours: 0, minutes: 0, seconds: 0 })
const isTimeUrgent = ref(false)
let countdownInterval = null

// 하향 경매: 현재 가격 (API에서 currentPrice 제공)
const currentPrice = computed(() => {
  if (!auctionInfo.value) return 0
  return auctionInfo.value.currentPrice || auctionInfo.value.startPrice || 0
})

onMounted(async () => {
  const token = localStorage.getItem('accessToken')
  if (!token) {
    alert('로그인이 필요합니다')
    window.location.href = '/signin.html'
    return
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    userName.value = payload.name || payload.username || '사용자'
  } catch (e) {
    console.error('토큰 파싱 실패:', e)
  }

  if (auctionId.value) {
    await fetchAuctionData()
  } else {
    error.value = '경매 ID가 없습니다.'
  }
})

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})

async function fetchAuctionData() {
  loading.value = true
  error.value = ''

  try {
    // 경매 입찰 정보 조회
    const infoRes = await fetch(`/api/auctions/v1/${auctionId.value}/info`)
    const infoJson = await infoRes.json()

    if (!infoJson.success) {
      throw new Error(infoJson.message || '경매 정보를 불러올 수 없습니다.')
    }

    auctionInfo.value = infoJson.data

    // API 응답에서 타입/상태 자동 감지
    if (auctionInfo.value.type) {
      auctionType.value = auctionInfo.value.type
    }
    auctionStatus.value = auctionInfo.value.status || 'OPEN'

    // 매물 정보 조회 (공통)
    if (auctionInfo.value.propertyId) {
      await fetchPropertyInfo(auctionInfo.value.propertyId)
    }

    if (auctionType.value === 'ENGLISH') {
      // 상향 경매: 통계 + 입찰 내역 조회
      const statsRes = await fetch(`/api/auctions/v1/${auctionId.value}/statistics`)
      const statsJson = await statsRes.json()
      if (statsJson.success) {
        statistics.value = statsJson.data
      }
      await fetchBidHistory()
    }

    // 카운트다운 시작
    startCountdown()

  } catch (e) {
    error.value = e.message || '데이터를 불러오는 중 오류가 발생했습니다.'
  } finally {
    loading.value = false
  }
}

async function fetchPropertyInfo(propertyId) {
  try {
    const res = await getPropertyDetail(propertyId)
    if (res.data) {
      propertyInfo.value = res.data
    }
  } catch (e) {
    console.error('매물 정보 조회 실패:', e)
  }
}

async function fetchBidHistory() {
  try {
    const res = await fetch(`/api/bids/v1/auctions/${auctionId.value}`)
    const json = await res.json()

    if (json.success && json.data) {
      const data = Array.isArray(json.data.content) ? json.data.content :
                   Array.isArray(json.data) ? json.data : []
      bidHistory.value = data
      bidHistory.value.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    } else {
      bidHistory.value = []
    }
  } catch (e) {
    console.error('입찰 내역 조회 실패:', e)
  }
}

// 카운트다운
function startCountdown() {
  updateCountdown()
  countdownInterval = setInterval(() => {
    updateCountdown()
  }, 1000)
}

function updateCountdown() {
  if (!auctionInfo.value) return

  const now = new Date()
  const endDate = new Date(auctionInfo.value.endedAt)
  const startDate = new Date(auctionInfo.value.startedAt)

  if (auctionStatus.value === 'OPEN') {
    const diff = endDate - now
    if (diff <= 0) {
      timeRemaining.value = { days: 0, hours: 0, minutes: 0, seconds: 0 }
      isTimeUrgent.value = false
      if (countdownInterval) clearInterval(countdownInterval)
      return
    }
    timeRemaining.value = calcTimeParts(diff)
    isTimeUrgent.value = diff < 3600000
  }

  if (auctionStatus.value === 'SCHEDULED') {
    const diff = startDate - now
    if (diff <= 0) {
      timeUntilStart.value = { days: 0, hours: 0, minutes: 0, seconds: 0 }
      if (countdownInterval) clearInterval(countdownInterval)
      return
    }
    timeUntilStart.value = calcTimeParts(diff)
  }
}

function calcTimeParts(diff) {
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000)
  }
}

// 포맷 유틸
function formatPrice(price) {
  if (!price && price !== 0) return '0'
  return Number(price).toLocaleString()
}

function formatTime(datetime) {
  if (!datetime) return '-'
  const date = new Date(datetime)
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${hour}:${minute}:${second}`
}

function formatDateTime(datetime) {
  if (!datetime) return '-'
  const d = new Date(datetime)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

function formatEndDate(datetime) {
  if (!datetime) return '-'
  const d = new Date(datetime)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day} 23:59`
}

function formatCountdownInline() {
  const t = timeRemaining.value
  const parts = []
  if (t.days > 0) parts.push(`${t.days}일`)
  parts.push(`${String(t.hours).padStart(2, '0')}:${String(t.minutes).padStart(2, '0')}:${String(t.seconds).padStart(2, '0')}`)
  return parts.join(' ')
}

function typeLabel(type) {
  const m = { APARTMENT: '아파트', VILLA: '빌라', OFFICETEL: '오피스텔' }
  return m[type] || type || '-'
}

function getBadgeClass() {
  const status = auctionStatus.value
  if (status === 'SCHEDULED') return 'badge-warning'
  if (status === 'OPEN') return 'badge-success'
  return 'badge-error'
}

function getStatusLabel() {
  const status = auctionStatus.value
  if (status === 'SCHEDULED') return '경매 예정'
  if (status === 'OPEN') return '진행 중'
  if (status === 'CLOSED') return '종료'
  if (status === 'FAILED') return '유찰'
  if (status === 'CANCELLED') return '취소'
  return '알 수 없음'
}

function goToBid() {
  window.location.href = `/bid-register.html?auctionId=${auctionId.value}&type=${auctionType.value}`
}

function goToPropertyDetail() {
  if (propertyInfo.value?.id) {
    window.location.href = `/auction-property-detail.html?id=${propertyInfo.value.id}&auctionId=${auctionId.value}`
  } else if (auctionInfo.value?.propertyId) {
    window.location.href = `/auction-property-detail.html?id=${auctionInfo.value.propertyId}&auctionId=${auctionId.value}`
  } else {
    alert('매물 정보가 없습니다.')
  }
}

function goToChat() {
  if (propertyInfo.value?.id) {
    window.location.href = `/chat.html?propertyId=${propertyInfo.value.id}`
  } else {
    window.location.href = '/chat.html'
  }
}

function logout() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  window.location.href = '/signin.html'
}
</script>

<style scoped>
/* ========== 공통 ========== */
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

.auction-container {
  background: var(--color-bg);
  min-height: calc(100vh - 64px);
  padding: 40px 48px;
}

.auction-inner {
  max-width: 1100px;
  margin: 0 auto;
}

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

.section-title-compact {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 16px 0;
}

.badge {
  display: inline-block;
  padding: 4px 12px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 12px;
}

.badge-success { background: #e8f5e9; color: #2e7d32; }
.badge-error { background: #ffeef0; color: var(--color-error); }
.badge-warning { background: #fff4e5; color: #e65100; }

.action-section {
  display: flex;
  gap: 16px;
  justify-content: center;
  padding-top: 32px;
}

.btn-primary {
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover { background: var(--color-primary-hover); }

.btn-secondary {
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
  background: #f0f7ff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover { background: #e6f2ff; }

/* ========== 상향 경매 ========== */
.countdown-section {
  margin-bottom: 20px;
  padding: 25px 32px;
  background: linear-gradient(135deg, #4a90e2 0%, #5c7cfa 100%);
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(74, 144, 226, 0.25);
}

.countdown-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 16px;
  text-align: center;
}

.countdown-display {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 40px;
}

.countdown-unit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.countdown-number {
  font-size: 72px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
  letter-spacing: -2px;
}

.countdown-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.countdown-urgent { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); }
.countdown-urgent .countdown-number { animation: pulse-number 1s ease-in-out infinite; }
@keyframes pulse-number {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.compact-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.left-column, .right-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-section-compact {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow);
}

.section-header-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.info-grid-compact {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--color-bg);
  border-radius: 8px;
}

.info-item.highlight {
  background: #f0f7ff;
  border: 2px solid var(--color-primary);
}

.info-label-compact {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 600;
}

.info-value-compact {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}

.highlight-text {
  color: var(--color-primary);
  font-size: 16px;
}

.stats-section-compact {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow);
}

.stats-grid-compact {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--color-bg);
  border-radius: 8px;
}

.stat-label-compact, .stat-value-compact {
  font-size: 12px;
  font-weight: 600;
}

.stat-label-compact { color: var(--color-text-secondary); }
.stat-value-compact { font-size: 15px; font-weight: 700; color: var(--color-text); }

.bid-history-section-compact {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow);
  height: 100%;
}

.bid-history-list-compact { max-height: 400px; overflow-y: auto; }
.empty-bids-compact { text-align: center; padding: 40px 20px; color: var(--color-text-secondary); font-size: 14px; }
.bid-items-compact { display: flex; flex-direction: column; gap: 8px; }

.bid-item-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--color-bg);
  border-radius: 8px;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.bid-item-compact:hover { border-color: var(--color-primary); }
.bid-item-compact.bid-highest { background: #f0f7ff; border-color: var(--color-primary); }
.bid-time-compact { font-size: 12px; font-weight: 600; color: var(--color-text-secondary); }

.bid-price-compact {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 6px;
}

.bid-badge-compact {
  display: inline-block;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 700;
  background: var(--color-primary);
  color: #fff;
  border-radius: 8px;
}

/* ========== 하향 경매 (Dutch) ========== */
.dutch-page-header {
  margin-bottom: 32px;
}

.dutch-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dutch-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
  display: block;
}

.dutch-title {
  font-size: 26px;
  font-weight: 800;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 2열 레이아웃 */
.dutch-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  margin-bottom: 28px;
}

/* 매물 정보 카드 */
.dutch-property-card {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow);
  border: 2px solid var(--color-primary);
}

.dutch-property-image {
  width: 100%;
  height: 240px;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
  background: #e8edf3;
}

.dutch-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dutch-thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
  background: #e8edf3;
}

.dutch-property-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dutch-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
}

.dutch-detail-row:last-child {
  border-bottom: none;
}

.dutch-detail-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.dutch-detail-value {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}

/* 오른쪽 컬럼 */
.dutch-right-column {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* 경매 현황 카드 */
.dutch-status-card {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow);
}

.dutch-status-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dutch-status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--color-bg);
  border-radius: 8px;
}

.dutch-status-highlight {
  background: #f0f7ff;
  border: 2px solid var(--color-primary);
}

.dutch-status-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.dutch-status-value {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}

.dutch-current-price {
  font-size: 18px;
  color: var(--color-primary);
}

/* 입찰 정보 카드 (영국식) */
.english-bid-info-card {
  background: #f0f7ff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow);
}

/* 입찰 기록 (영국식) */
.english-bid-history {
  background: var(--color-surface);
}

/* 감소 정보 카드 */
.dutch-decrease-card {
  background: #fff0f3;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow);
}

.dutch-decrease-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dutch-decrease-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dutch-decrease-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.dutch-decrease-value {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}


/* 채팅 버튼 */
.btn-chat {
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  color: #fff;
  background: #7c8db5;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-chat:hover {
  background: #6a7da5;
}

/* ========== 반응형 ========== */
@media (max-width: 1024px) {
  .compact-layout,
  .dutch-layout {
    grid-template-columns: 1fr;
  }

  .countdown-number {
    font-size: 60px;
  }
}

@media (max-width: 768px) {
  .header-nav { gap: 12px; }
  .btn-text { font-size: 14px; }
  .auction-container { padding: 16px; }

  .countdown-section { padding: 32px 20px; }
  .countdown-display { gap: 24px; }
  .countdown-number { font-size: 56px; }
  .countdown-label { font-size: 11px; }

  .compact-layout,
  .dutch-layout {
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }

  .info-grid-compact { grid-template-columns: 1fr; }

  .info-section-compact,
  .stats-section-compact,
  .bid-history-section-compact {
    padding: 16px;
  }

  .bid-history-list-compact { max-height: 300px; }

  .action-section { flex-direction: column; align-items: center; }

  .dutch-title-row { flex-direction: column; align-items: flex-start; gap: 12px; }
  .dutch-title { font-size: 20px; }
}
</style>
