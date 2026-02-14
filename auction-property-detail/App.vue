<template>
  <div class="auction-detail-page">

    <div v-if="loading" class="loading">
      경매 정보를 불러오는 중...
    </div>

    <div v-else-if="!data" class="empty">
      경매 정보를 찾을 수 없습니다.
    </div>

    <div v-else class="container">

      <!-- ===================== -->
      <!-- 🔹 매물 카드 -->
      <!-- ===================== -->
      <section class="card">

        <h1 class="title">{{ data.name }}</h1>
        <p class="address">{{ data.address }}</p>

        <!-- 이미지 -->
        <div v-if="data.images?.length" class="image-gallery">
          <div v-for="(img, i) in data.images" :key="i" class="image-item">
            <img :src="img" />
          </div>
        </div>

        <div class="divider"></div>

        <!-- 지도 -->
        <div class="map-section">
          <div ref="mapContainer" class="map"></div>
        </div>

        <div class="divider"></div>

        <!-- 상세 스펙 -->
        <div class="info-grid">
          <div><b>층수</b><span>{{ data.floor }} / {{ data.totalFloor }}층</span></div>
          <div><b>방 개수</b><span>{{ data.roomCount }}개</span></div>
          <div><b>전용면적</b><span>{{ data.privateArea }}㎡</span></div>
          <div><b>공급면적</b><span>{{ data.supplyArea }}㎡</span></div>
          <div><b>준공연도</b><span>{{ data.builtYear }}년</span></div>
          <div><b>매물 유형</b><span>{{ propertyTypeLabel }}</span></div>
        </div>

        <div v-if="data.description" class="description">
          {{ data.description }}
        </div>

      </section>


      <!-- ===================== -->
      <!-- 🔹 경매 카드 -->
      <!-- ===================== -->
      <section class="card highlight">

        <div class="auction-header">

          <div class="auction-left">
            <span class="auction-type">
              {{ auctionTypeLabel }}
            </span>

            <span
                class="dday-badge"
                :class="{ expired: dDayLabel === '종료' }"
            >
              {{ dDayLabel }}
            </span>
          </div>

          <span class="status-badge" :class="badgeClass">
            {{ statusLabel }}
          </span>
        </div>


        <div class="price-row">
          <div class="price-box">
            <div class="label">시작가</div>
            <div class="price">
              {{ formatPrice(data.startPrice) }}
            </div>
          </div>

          <div class="price-box">
            <div class="label">현재가</div>
            <div class="price highlight-price">
              {{ formatPrice(displayCurrentPrice) }}
            </div>
          </div>
        </div>

        <div v-if="data.auctionType === 'ENGLISH'" class="sub-info">
          최소 입찰 단위 {{ formatPrice(data.minBidIncrement) }}
        </div>

        <div v-if="data.auctionType === 'DUTCH'" class="sub-info">
          감액 단위 {{ formatPrice(data.decreasePrice) }}
        </div>

        <div class="time-box">
          <p>시작 {{ formatDateOnly(data.startedAt) }}</p>
          <p>종료 {{ formatDateOnly(data.endedAt) }}</p>
        </div>

        <div class="action-buttons">

          <!-- 🔵 상향식 경매 -->
          <button
              v-if="data.auctionType === 'ENGLISH'"
              class="btn-secondary"
              @click="goToBidHistory"
          >
            입찰 내역 조회
          </button>

          <!-- 🔴 하향식 경매 -->
          <button
              v-if="data.auctionType === 'DUTCH' && data.status === 'OPEN'"
              class="btn-primary"
              @click="goToBidPage"
          >
            이 가격에 즉시 낙찰
          </button>

        </div>

      </section>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'

const data = ref(null)
const loading = ref(true)

const mapContainer = ref(null)
let map = null
let geocoder = null

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const propertyId = params.get('propertyId')

  if (!propertyId) {
    loading.value = false
    return
  }

  try {
    const res = await fetch(`/api/properties/v1/${propertyId}/auction`)
    const json = await res.json()
    data.value = json.data

    await nextTick()
    loadKakaoMap()

  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

/* 지도 */
function loadKakaoMap() {
  const apiKey = import.meta.env.VITE_KAKAO_MAP_KEY
  if (!apiKey) return

  if (window.kakao?.maps) {
    initMap()
    return
  }

  const script = document.createElement('script')
  script.src =
      `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false&libraries=services`
  script.onload = () => window.kakao.maps.load(initMap)
  document.head.appendChild(script)
}

function initMap() {
  if (!data.value?.address) return

  geocoder = new kakao.maps.services.Geocoder()

  geocoder.addressSearch(data.value.address, (result, status) => {
    if (status === kakao.maps.services.Status.OK) {

      const coords = new kakao.maps.LatLng(result[0].y, result[0].x)

      map = new kakao.maps.Map(mapContainer.value, {
        center: coords,
        level: 3
      })

      new kakao.maps.Marker({
        map,
        position: coords
      })

      setTimeout(() => {
        if (map) {
          map.relayout()
          map.setCenter(coords)
        }
      }, 300)
    } else {
      console.log("지오코딩 실패:", status)
    }
  })
}


/* computed */
const displayCurrentPrice = computed(() =>
    data.value?.currentPrice ?? data.value?.startPrice
)

const auctionTypeLabel = computed(() =>
    data.value?.auctionType === 'DUTCH'
        ? '하향식 경매'
        : '상향식 경매'
)

const propertyTypeLabel = computed(() => {
  const map = {
    APARTMENT: '아파트',
    VILLA: '빌라',
    OFFICETEL: '오피스텔'
  }
  return map[data.value?.propertyType] || data.value?.propertyType
})

const badgeClass = computed(() => ({
  open: data.value?.status === 'OPEN',
  scheduled: data.value?.status === 'SCHEDULED',
  closed: data.value?.status === 'CLOSED'
}))

const statusLabel = computed(() => {
  const map = {
    OPEN: '진행중',
    SCHEDULED: '경매 예정',
    CLOSED: '종료'
  }
  return map[data.value?.status]
})

/* util */
function formatPrice(val) {
  if (!val) return '-'
  return Number(val).toLocaleString() + '원'
}

function formatDateOnly(val) {
  if (!val) return '-'
  const d = new Date(val)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const dDayLabel = computed(() => {
  if (!data.value?.endedAt) return ''

  const end = new Date(data.value.endedAt)
  const today = new Date()

  // 시간 제거
  end.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)

  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24))

  if (diff > 0) return `D-${diff}`
  if (diff === 0) return 'D-DAY'
  return '종료'
})


function goToBidHistory() {
  window.location.href =
      `/bids?auctionId=${data.value.auctionId}`
}

function goToBidPage() {
  window.location.href =
      `/payment-checkout.html?auctionId=${data.value.auctionId}`
}


</script>

<style scoped>
.auction-detail-page {
  padding: 40px 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
}

/* 카드 */
.card {
  background: #fff;
  border-radius: 20px;
  padding: 32px;
  margin-bottom: 28px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.05);
}

.card.highlight {
  border: 2px solid #1b64da;
}

/* 타이틀 */
.title {
  font-size: 28px;
  font-weight: 800;
  margin-bottom: 6px;
}

.address {
  color: #666;
  margin-bottom: 20px;
}

/* 이미지 */
.image-gallery {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  margin-bottom: 24px;
}

.image-item img {
  width: 260px;
  height: 180px;
  object-fit: cover;
  border-radius: 14px;
}

/* 구분선 */
.divider {
  height: 1px;
  background: #e9edf2;
  margin: 24px 0;
}

/* 지도 */
.map {
  width: 100%;
  height: 320px;
  border-radius: 16px;
}

/* 정보 */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  font-size: 15px;
  margin-bottom: 20px;
}

.info-grid div {
  display: flex;
  justify-content: space-between;
}

.description {
  margin-top: 10px;
  line-height: 1.6;
  color: #444;
}

/* 경매 */
.auction-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
}

.auction-type {
  font-weight: 700;
  color: #1b64da;
}

.status-badge {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
}

.status-badge.open { background: #d4f5e9; color: #0f9d58; }
.status-badge.scheduled { background: #e3e8f0; }
.status-badge.closed { background: #fddede; color: #d93025; }

.price-row {
  display: flex;
  gap: 40px;
  margin-bottom: 20px;
}

.price-box .label {
  font-size: 13px;
  color: #666;
}

.price {
  font-size: 24px;
  font-weight: 700;
}

.highlight-price {
  color: #e53935;
}

.sub-info {
  margin-bottom: 12px;
  color: #555;
}

.time-box {
  margin-top: 20px;
  font-size: 13px;
  color: #666;
}

.loading,
.empty {
  text-align: center;
  padding: 120px;
}

.action-buttons {
  margin-top: 30px;
  display: flex;
  gap: 14px;
}

.btn-primary {
  flex: 1;
  padding: 14px;
  border-radius: 14px;
  border: none;
  background: #1b64da;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.btn-secondary {
  flex: 1;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid #ccc;
  background: white;
  font-weight: 600;
  cursor: pointer;
}

.action-buttons {
  margin-top: 30px;
  display: flex;
}

.btn-primary {
  width: 100%;
  padding: 16px;
  border-radius: 14px;
  border: none;
  background: #e53935;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.btn-secondary {
  width: 100%;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid #ccc;
  background: white;
  font-weight: 600;
  cursor: pointer;
}
.auction-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dday-badge {
  padding: 6px 14px;
  border-radius: 14px;
  background: #1b64da;
  color: white;
  font-size: 13px;
  font-weight: 700;
}

.dday-badge.expired {
  background: #e53935;
}

</style>
