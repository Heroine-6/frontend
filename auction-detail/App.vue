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

    <!-- 경매 상세 컨텐츠 -->
    <div class="auction-container">
      <div class="auction-inner">

        <div v-if="loading" class="loading-state">경매 정보를 불러오는 중...</div>
        
        <div v-else-if="error" class="empty-state">
          <p class="empty-icon">⚠️</p>
          <p>{{ error }}</p>
        </div>

        <template v-else-if="auctionInfo && statistics">
          <!-- 실시간 카운트다운 (맨 위에 크게) -->
          <div v-if="auctionStatus === 'OPEN'" class="countdown-section">
            <div class="countdown-title">경매 종료까지 남은 시간</div>
            <div class="countdown-display" :class="{ 'countdown-urgent': isTimeUrgent }">
              <div v-if="timeRemaining.days > 0" class="countdown-unit">
                <div class="countdown-number">{{ String(timeRemaining.days).padStart(2, '0') }}</div>
                <div class="countdown-label">DAYS</div>
              </div>
              <div class="countdown-unit">
                <div class="countdown-number">{{ String(timeRemaining.hours).padStart(2, '0') }}</div>
                <div class="countdown-label">HOURS</div>
              </div>
              <div class="countdown-unit">
                <div class="countdown-number">{{ String(timeRemaining.minutes).padStart(2, '0') }}</div>
                <div class="countdown-label">MINUTES</div>
              </div>
              <div class="countdown-unit">
                <div class="countdown-number">{{ String(timeRemaining.seconds).padStart(2, '0') }}</div>
                <div class="countdown-label">SECONDS</div>
              </div>
            </div>
          </div>
          <div v-else-if="auctionStatus === 'SCHEDULED'" class="countdown-section">
            <div class="countdown-title">경매 시작까지</div>
            <div class="countdown-display">
              <div v-if="timeUntilStart.days > 0" class="countdown-unit">
                <div class="countdown-number">{{ String(timeUntilStart.days).padStart(2, '0') }}</div>
                <div class="countdown-label">DAYS</div>
              </div>
              <div class="countdown-unit">
                <div class="countdown-number">{{ String(timeUntilStart.hours).padStart(2, '0') }}</div>
                <div class="countdown-label">HOURS</div>
              </div>
              <div class="countdown-unit">
                <div class="countdown-number">{{ String(timeUntilStart.minutes).padStart(2, '0') }}</div>
                <div class="countdown-label">MINUTES</div>
              </div>
              <div class="countdown-unit">
                <div class="countdown-number">{{ String(timeUntilStart.seconds).padStart(2, '0') }}</div>
                <div class="countdown-label">SECONDS</div>
              </div>
            </div>
          </div>

          <!-- 컴팩트한 2열 레이아웃 -->
          <div class="compact-layout">
            <!-- 왼쪽: 경매 정보 + 통계 -->
            <div class="left-column">
              <!-- 경매 기본 정보 -->
              <div class="info-section-compact">
                <div class="section-header-compact">
                  <h2 class="section-title-compact">
                    경매 정보
                    <span class="auction-id-inline">#{{ auctionId }}</span>
                  </h2>

                  <span class="badge" :class="getBadgeClass()">{{ getStatusLabel() }}</span>
                </div>
                <div class="info-grid-compact">
                  <div class="info-item">
                    <span class="info-label-compact">시작가</span>
                    <span class="info-value-compact">{{ formatPrice(auctionInfo.startPrice) }}원</span>
                  </div>
                  <div class="info-item highlight">
                    <span class="info-label-compact">현재 최고가</span>
                    <span class="info-value-compact highlight-text">{{ formatPrice(auctionInfo.highestPrice) }}원</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label-compact">입찰 단위</span>
                    <span class="info-value-compact">{{ formatPrice(auctionInfo.minBidIncrement) }}원</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label-compact">입찰자 수</span>
                    <span class="info-value-compact">{{ auctionInfo.totalBidders }}명</span>
                  </div>
                </div>
              </div>

              <!-- 경쟁 통계 -->
              <div class="stats-section-compact">
                <h3 class="section-title-compact">경쟁 통계</h3>
                <div class="stats-grid-compact">
                  <div class="stat-item">
                    <span class="stat-label-compact">총 입찰 횟수</span>
                    <span class="stat-value-compact">{{ statistics.totalBidCount }}회</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label-compact">가격 상승</span>
                    <span class="stat-value-compact">{{ formatPrice(statistics.priceIncrease) }}원</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 오른쪽: 입찰 내역 -->
            <div class="right-column">
              <div class="bid-history-section-compact">
                <h3 class="section-title-compact">실시간 입찰 기록</h3>
                <div class="bid-history-list-compact">
                  <div v-if="bidHistory.length === 0" class="empty-bids-compact">
                    입찰 내역이 없습니다
                  </div>
                  <div v-else class="bid-items-compact">
                    <div
                      v-for="(bid, index) in bidHistory.slice(0, 8)"
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
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 액션 버튼 -->
          <div class="action-section">
            <button class="btn-primary" @click="goToBid">입찰하기</button>
            <button class="btn-secondary" @click="goToPropertyDetail">매물 상세보기</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

// URL에서 auctionId 가져오기
const auctionId = ref(new URLSearchParams(window.location.search).get('id'))

const loading = ref(false)
const error = ref('')
const userName = ref('사용자')
const auctionInfo = ref(null)
const statistics = ref(null)
const auctionStatus = ref(null)
const bidHistory = ref([])
const priceChart = ref(null)
let chartInstance = null

// 카운트다운 관련 상태
const timeRemaining = ref({
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0
})
const timeUntilStart = ref({
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0
})
const isTimeUrgent = ref(false) // 1시간 미만일 때 true
let countdownInterval = null

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
  // 컴포넌트 언마운트 시 타이머 정리
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

    // 경매 경쟁 통계 조회
    const statsRes = await fetch(`/api/auctions/v1/${auctionId.value}/statistics`)
    const statsJson = await statsRes.json()
    
    if (!statsJson.success) {
      throw new Error(statsJson.message || '경매 통계를 불러올 수 없습니다.')
    }
    
    statistics.value = statsJson.data

    // 경매 상태 조회
    await fetchAuctionStatus()
    
    // 입찰 내역 조회
    await fetchBidHistory()
    
    // 카운트다운 시작
    startCountdown()
    
  } catch (e) {
    error.value = e.message || '데이터를 불러오는 중 오류가 발생했습니다.'
  } finally {
    loading.value = false
  }
}

async function fetchAuctionStatus() {
  try {
    const now = new Date()
    const start = new Date(auctionInfo.value?.startedAt)
    const end = new Date(auctionInfo.value?.endedAt)
    
    if (now < start) {
      auctionStatus.value = 'SCHEDULED'
    } else if (now >= start && now < end) {
      auctionStatus.value = 'OPEN'
    } else {
      auctionStatus.value = 'CLOSED'
    }
  } catch (e) {
    console.error('경매 상태 조회 실패:', e)
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
      // 최신순으로 정렬
      bidHistory.value.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      
    } else {
      bidHistory.value = []
    }
  } catch (e) {
    console.error('입찰 내역 조회 실패:', e)
  }
}

// 카운트다운 시작
function startCountdown() {
  // 초기 계산
  updateCountdown()
  
  // 1초마다 업데이트
  countdownInterval = setInterval(() => {
    updateCountdown()
  }, 1000)
}

// 남은 시간 계산 및 업데이트
function updateCountdown() {
  if (!auctionInfo.value) return
  
  const now = new Date()
  const endDate = new Date(auctionInfo.value.endedAt)
  const startDate = new Date(auctionInfo.value.startedAt)
  
  // 경매 종료까지 남은 시간 계산
  if (auctionStatus.value === 'OPEN') {
    const diff = endDate - now
    
    if (diff <= 0) {
      // 경매 종료
      timeRemaining.value = { days: 0, hours: 0, minutes: 0, seconds: 0 }
      auctionStatus.value = 'CLOSED'
      if (countdownInterval) {
        clearInterval(countdownInterval)
      }
      return
    }
    
    // 시간 계산
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    
    timeRemaining.value = { days, hours, minutes, seconds }
    
    // 1시간 미만이면 긴급 표시
    isTimeUrgent.value = diff < 3600000 // 1시간 = 3600000ms
  }
  
  // 경매 시작까지 남은 시간 계산
  if (auctionStatus.value === 'SCHEDULED') {
    const diff = startDate - now
    
    if (diff <= 0) {
      // 경매 시작
      auctionStatus.value = 'OPEN'
      return
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    
    timeUntilStart.value = { days, hours, minutes, seconds }
  }
}

function formatPrice(price) {
  if (!price) return '0'
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function formatDateTime(datetime) {
  if (!datetime) return '-'
  const date = new Date(datetime)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}.${month}.${day} ${hour}:${minute}`
}

function formatTime(datetime) {
  if (!datetime) return '-'
  const date = new Date(datetime)
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${hour}:${minute}:${second}`
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
  alert('입찰 기능은 준비 중입니다.')
}

function goToPropertyDetail() {
  alert('매물 상세 페이지로 이동합니다.')
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

/* 경매 상세 컨테이너 */
.auction-container {
  background: var(--color-bg);
  min-height: calc(100vh - 64px);
  padding: 20px 24px;
}

.auction-inner {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
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

/* 카운트다운 섹션 (맨 위에 크게) */
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
  letter-spacing: -0.3px;
}

.countdown-display {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 40px;
}

.countdown-scheduled {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  letter-spacing: -2px;
}

.countdown-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 1px;
  text-transform: uppercase;
}

/* 긴급 상태 (1시간 미만) */
.countdown-urgent {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
}

.countdown-urgent .countdown-number {
  animation: pulse-number 1s ease-in-out infinite;
}

@keyframes pulse-number {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

/* 컴팩트 2열 레이아웃 */
.compact-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.left-column,
.right-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 컴팩트 경매 정보 */
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

.section-title-compact {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
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

/* 컴팩트 통계 */
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

.stat-label-compact {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 600;
}

.stat-value-compact {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}

/* 컴팩트 입찰 내역 */
.bid-history-section-compact {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow);
  height: 100%;
}

.bid-history-list-compact {
  max-height: 400px;
  overflow-y: auto;
}

.empty-bids-compact {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.bid-items-compact {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

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

.bid-item-compact:hover {
  border-color: var(--color-primary);
}

.bid-item-compact.bid-highest {
  background: #f0f7ff;
  border-color: var(--color-primary);
}

.bid-time-compact {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

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

/* 배지 */
.badge {
  display: inline-block;
  padding: 4px 12px;
  font-size: 11px;
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

/* 액션 섹션 */
.action-section {
  display: flex;
  gap: 12px;
  justify-content: center;
  padding-top: 20px;
}

.btn-primary {
  padding: 14px 40px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}

.btn-secondary {
  padding: 14px 40px;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-primary);
  background: #f0f7ff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #e6f2ff;
}

/* 반응형 */
@media (max-width: 1024px) {
  .compact-layout {
    grid-template-columns: 1fr;
  }
  
  .countdown-number {
    font-size: 60px;
  }
}

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
  
  .auction-container {
    padding: 16px;
  }
  
  .page-header {
    margin-bottom: 16px;
  }
  
  .countdown-section {
    padding: 32px 20px;
  }
  
  .countdown-display {
    gap: 24px;
  }
  
  .countdown-number {
    font-size: 56px;
  }
  
  .countdown-label {
    font-size: 11px;
  }
  
  .compact-layout {
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }
  
  .info-grid-compact {
    grid-template-columns: 1fr;
  }
  
  .info-section-compact,
  .stats-section-compact,
  .bid-history-section-compact {
    padding: 16px;
  }
  
  .bid-history-list-compact {
    max-height: 300px;
  }

  .action-section {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}
</style>