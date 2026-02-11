<template>
  <div class="page">
    <!-- 헤더 -->
    <header class="header">
      <div class="header-inner">
        <a href="/" class="logo">부동부동</a>
        <nav class="header-nav">
          <a href="/search.html" class="nav-link">매물 검색</a>
          <a href="/market-prices.html" class="nav-link active">주변 시세</a>
          <template v-if="isLoggedIn">
            <a href="/mypage.html" class="btn-text">마이페이지</a>
            <span class="user-greeting">{{ userName }}님</span>
            <button class="btn-text" @click="logout">로그아웃</button>
          </template>
          <template v-else>
            <a href="/signin.html" class="btn-text">로그인</a>
            <a href="/signup.html" class="btn-header-primary">회원가입</a>
          </template>
        </nav>
      </div>
    </header>

    <!-- 메인 레이아웃: 지도 + 패널 -->
    <div class="main-layout">
      <!-- 지도 영역 -->
      <div class="map-area">
        <div ref="mapContainer" class="map-container"></div>

        <!-- 지도 위 필터 칩 -->
        <div class="map-filters">
          <button
            v-for="t in propertyTypes"
            :key="t.value"
            class="filter-chip"
            :class="{ active: filters.type === t.value }"
            @click="setTypeFilter(t.value)"
          >
            {{ t.label }}
          </button>
        </div>
      </div>

      <!-- 우측 패널 -->
      <div class="side-panel">
        <!-- 지역 선택 -->
        <div class="location-selector">
          <div class="location-icon">📍</div>
          <select v-model="selectedSido" @change="onSidoChange" class="loc-select">
            <option value="">시/도 선택</option>
            <option v-for="s in sidoList" :key="s" :value="s">{{ s }}</option>
          </select>
          <select v-model="selectedGugun" @change="onGugunChange" class="loc-select" :disabled="!selectedSido">
            <option value="">구/군 선택</option>
            <option v-for="g in gugunList" :key="g" :value="g">{{ g }}</option>
          </select>
          <select v-model="selectedDong" @change="onDongChange" class="loc-select" :disabled="!selectedGugun">
            <option value="">동 선택</option>
            <option v-for="d in dongList" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>

        <!-- 브레드크럼 -->
        <div class="breadcrumb" v-if="selectedDong">
          <span>{{ selectedSido }}</span>
          <span class="bc-sep">›</span>
          <span>{{ selectedGugun }}</span>
          <span class="bc-sep">›</span>
          <span class="bc-current">{{ selectedDong }}</span>
        </div>

        <!-- 정렬 탭 -->
        <div class="sort-tabs">
          <button
            class="sort-tab"
            :class="{ active: sortBy === 'distance' }"
            @click="sortBy = 'distance'; sortProperties()"
          >
            거리순
          </button>
          <button
            class="sort-tab"
            :class="{ active: sortBy === 'price' }"
            @click="sortBy = 'price'; sortProperties()"
          >
            평단가순
          </button>
        </div>

        <!-- 매물 리스트 -->
        <div class="property-list">
          <div v-if="loading" class="state-box">매물 정보를 불러오는 중...</div>
          <div v-else-if="properties.length === 0" class="state-box">
            <p>지역을 선택하면 주변 시세를 확인할 수 있습니다</p>
          </div>
          <div
            v-else
            v-for="item in properties"
            :key="item.id"
            class="property-item"
            :class="{ selected: selectedProperty?.id === item.id }"
            @click="selectProperty(item)"
          >
            <div class="item-info">
              <p class="item-name">{{ item.name }}</p>
              <p class="item-type">{{ item.typeName || typeLabel(item.type) }}</p>
            </div>
            <div class="item-price">
              <span class="price-value">{{ formatPriceShort(item.price) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { getSidoList, getGugunList, getDongList, getMarketPrices } from '../shared/api.js'

// ====== 인증 ======
const isLoggedIn = ref(false)
const userName = ref('')

// ====== 지도 ======
const mapContainer = ref(null)
let map = null
let markers = []

// ====== 지역 선택 ======
const sidoList = ref([])
const gugunList = ref([])
const dongList = ref([])
const selectedSido = ref('')
const selectedGugun = ref('')
const selectedDong = ref('')

// ====== 필터 ======
const propertyTypes = [
  { label: '전체', value: '' },
  { label: '아파트', value: 'APARTMENT' },
  { label: '오피스텔', value: 'OFFICETEL' },
  { label: '빌라', value: 'VILLA' },
]
const filters = ref({ type: '' })

// ====== 매물 데이터 ======
const properties = ref([])
const selectedProperty = ref(null)
const loading = ref(false)
const sortBy = ref('distance')

// ====== 초기화 ======
onMounted(async () => {
  checkAuth()
  await loadKakaoMap()
  await loadSidoList()
})

// ====== 인증 ======
function checkAuth() {
  const token = localStorage.getItem('accessToken')
  if (!token) return
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    isLoggedIn.value = true
    userName.value = payload.username || payload.userEmail || ''
  } catch {
    isLoggedIn.value = false
  }
}

function logout() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  isLoggedIn.value = false
  userName.value = ''
}

// ====== 카카오 지도 ======
function loadKakaoMap() {
  return new Promise((resolve, reject) => {
    // 이미 로드된 경우
    if (window.kakao && window.kakao.maps) {
      initMap()
      resolve()
      return
    }

    const apiKey = import.meta.env.VITE_KAKAO_MAP_KEY || ''
    if (!apiKey) {
      console.warn('VITE_KAKAO_MAP_KEY 환경변수가 설정되지 않았습니다. .env 파일에 추가해주세요.')
      // 지도 없이 기본 배경으로 대체
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false&libraries=services`
    script.onload = () => {
      window.kakao.maps.load(() => {
        initMap()
        resolve()
      })
    }
    script.onerror = () => {
      console.error('카카오 지도 SDK 로드 실패')
      reject(new Error('카카오 지도 SDK 로드 실패'))
    }
    document.head.appendChild(script)
  })
}

function initMap() {
  if (!mapContainer.value || !window.kakao) return

  const options = {
    center: new window.kakao.maps.LatLng(37.5665, 126.978),  // 서울 시청 기본
    level: 5
  }
  map = new window.kakao.maps.Map(mapContainer.value, options)
}

function moveMapTo(lat, lng, level = 5) {
  if (!map) return
  const position = new window.kakao.maps.LatLng(lat, lng)
  map.setCenter(position)
  map.setLevel(level)
}

function clearMarkers() {
  markers.forEach(m => m.setMap(null))
  markers = []
}

function addMarkers(items) {
  if (!map || !window.kakao) return
  clearMarkers()

  items.forEach(item => {
    if (!item.lat || !item.lng) return

    const position = new window.kakao.maps.LatLng(item.lat, item.lng)

    // 커스텀 오버레이 (가격 표시)
    const content = `
      <div class="map-price-tag ${selectedProperty.value?.id === item.id ? 'active' : ''}">
        ${formatPriceShort(item.price)}
      </div>
    `
    const overlay = new window.kakao.maps.CustomOverlay({
      position,
      content,
      yAnchor: 1.3
    })
    overlay.setMap(map)

    // 기본 마커 (클릭용)
    const marker = new window.kakao.maps.Marker({ position })
    marker.setMap(map)

    window.kakao.maps.event.addListener(marker, 'click', () => {
      selectProperty(item)
    })

    markers.push(marker)
    markers.push(overlay) // overlay도 추적
  })

  // 모든 마커가 보이도록 지도 범위 조정
  if (items.length > 0 && items[0].lat) {
    const bounds = new window.kakao.maps.LatLngBounds()
    items.forEach(item => {
      if (item.lat && item.lng) {
        bounds.extend(new window.kakao.maps.LatLng(item.lat, item.lng))
      }
    })
    map.setBounds(bounds)
  }
}

// ====== 지역 선택 핸들러 ======
async function loadSidoList() {
  try {
    sidoList.value = await getSidoList()
  } catch (e) {
    console.error('시/도 목록 로드 실패:', e)
    sidoList.value = ['서울특별시', '경기도', '인천광역시', '부산광역시', '대구광역시', '대전광역시', '광주광역시', '울산광역시', '세종특별자치시']
  }
}

async function onSidoChange() {
  selectedGugun.value = ''
  selectedDong.value = ''
  gugunList.value = []
  dongList.value = []
  properties.value = []

  if (!selectedSido.value) return

  try {
    gugunList.value = await getGugunList(selectedSido.value)
  } catch (e) {
    console.error('구/군 목록 로드 실패:', e)
    gugunList.value = []
  }
}

async function onGugunChange() {
  selectedDong.value = ''
  dongList.value = []
  properties.value = []

  if (!selectedGugun.value) return

  try {
    dongList.value = await getDongList(selectedSido.value, selectedGugun.value)
  } catch (e) {
    console.error('동 목록 로드 실패:', e)
    dongList.value = []
  }
}

async function onDongChange() {
  if (!selectedDong.value) {
    properties.value = []
    return
  }
  await fetchMarketPrices()
}

// ====== 시세 데이터 조회 ======
async function fetchMarketPrices() {
  loading.value = true
  try {
    const params = {
      sido: selectedSido.value,
      gugun: selectedGugun.value,
      dong: selectedDong.value,
    }
    if (filters.value.type) {
      params.type = filters.value.type
    }

    const res = await getMarketPrices(params)

    // 메인 백엔드 응답: { success, data: { totalCount, deals: [...] } }
    const deals = res.data?.deals || []

    // RealDealDocument → 프론트 형식으로 변환
    const items = deals.map(d => ({
      id: d.id,
      name: d.propertyName,
      type: d.propertyType,
      price: d.dealAmount,
      area: d.exclusiveArea,
      floor: d.floor,
      builtYear: d.builtYear,
      dealDate: d.dealDate,
      address: d.address,
      roadAddress: d.roadAddress,
      lat: d.location?.lat,
      lng: d.location?.lon,
    }))

    properties.value = items
    sortProperties()
    addMarkers(items)

    // 지도 중심 이동 (첫 번째 매물 기준)
    if (items.length > 0 && items[0].lat && items[0].lng) {
      moveMapTo(items[0].lat, items[0].lng, 5)
    }
  } catch (e) {
    console.error('시세 조회 실패:', e)
    properties.value = []
  } finally {
    loading.value = false
  }
}

// ====== 필터 ======
function setTypeFilter(type) {
  filters.value.type = type
  if (selectedDong.value) {
    fetchMarketPrices()
  }
}

// ====== 정렬 ======
function sortProperties() {
  if (sortBy.value === 'price') {
    properties.value.sort((a, b) => (a.price || 0) - (b.price || 0))
  } else {
    properties.value.sort((a, b) => (a.distance || 0) - (b.distance || 0))
  }
}

// ====== 매물 선택 ======
function selectProperty(item) {
  selectedProperty.value = item
  if (item.lat && item.lng && map) {
    moveMapTo(item.lat, item.lng, 4)
  }
}

// ====== 유틸 ======
function typeLabel(type) {
  const map = { APARTMENT: '아파트', VILLA: '빌라', OFFICETEL: '오피스텔' }
  return map[type] || type || ''
}

function formatPriceShort(price) {
  if (!price) return '-'
  const num = Number(price)
  if (num >= 100000000) {
    const eok = Math.floor(num / 100000000)
    const man = Math.floor((num % 100000000) / 10000)
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만` : `${eok}억`
  }
  if (num >= 10000) {
    return `${Math.floor(num / 10000).toLocaleString()}만`
  }
  return `${num.toLocaleString()}원`
}
</script>

<style scoped>
/* ========== 헤더 ========== */
.header {
  position: sticky;
  top: 0;
  z-index: 200;
  background: #fff;
  border-bottom: 1px solid var(--color-border);
}
.header-inner {
  max-width: 100%;
  margin: 0 auto;
  padding: 0 24px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.logo {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-primary);
  text-decoration: none;
}
.header-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}
.nav-link {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-decoration: none;
  padding: 8px 12px;
}
.nav-link.active {
  color: var(--color-primary);
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
.btn-header-primary {
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary);
  border-radius: 8px;
  text-decoration: none;
}
.user-greeting {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

/* ========== 메인 레이아웃 ========== */
.main-layout {
  display: flex;
  height: calc(100vh - 56px);
  overflow: hidden;
}

/* ========== 지도 영역 ========== */
.map-area {
  flex: 1;
  position: relative;
  min-width: 0;
}
.map-container {
  width: 100%;
  height: 100%;
  background: #e8edf3;
}

/* 지도 위 필터 칩 */
.map-filters {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  gap: 8px;
  z-index: 10;
}
.filter-chip {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 20px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  transition: all 0.15s;
}
.filter-chip:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.filter-chip.active {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

/* ========== 우측 패널 ========== */
.side-panel {
  width: 420px;
  flex-shrink: 0;
  background: #fff;
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 지역 선택 */
.location-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
  flex-wrap: wrap;
}
.location-icon {
  font-size: 20px;
}
.loc-select {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #fff;
  color: var(--color-text);
  cursor: pointer;
  outline: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7684' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 28px;
}
.loc-select:focus {
  border-color: var(--color-primary);
}
.loc-select:disabled {
  background: var(--color-input-bg);
  cursor: not-allowed;
  color: var(--color-text-secondary);
}

/* 브레드크럼 */
.breadcrumb {
  padding: 12px 16px;
  font-size: 13px;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-input-bg);
}
.bc-sep {
  margin: 0 6px;
  color: var(--color-border);
}
.bc-current {
  color: var(--color-text);
  font-weight: 600;
}

/* 정렬 탭 */
.sort-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
}
.sort-tab {
  flex: 1;
  padding: 14px;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  color: var(--color-text-secondary);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}
.sort-tab:hover {
  color: var(--color-text);
}
.sort-tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

/* 매물 리스트 */
.property-list {
  flex: 1;
  overflow-y: auto;
}

.property-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 0.15s;
}
.property-item:hover {
  background: var(--color-input-bg);
}
.property-item.selected {
  background: #eaf3ff;
  border-left: 3px solid var(--color-primary);
}

.item-info {
  flex: 1;
  min-width: 0;
}
.item-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-type {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.item-price {
  text-align: right;
  flex-shrink: 0;
  margin-left: 16px;
}
.price-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-primary);
  white-space: nowrap;
}

/* 상태 박스 */
.state-box {
  text-align: center;
  padding: 60px 24px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

/* ========== 반응형 ========== */
@media (max-width: 1024px) {
  .main-layout {
    flex-direction: column;
    height: auto;
  }

  .map-area {
    height: 50vh;
  }

  .side-panel {
    width: 100%;
    height: 50vh;
    border-left: none;
    border-top: 1px solid var(--color-border);
  }
}

@media (max-width: 768px) {
  .map-area {
    height: 40vh;
  }

  .side-panel {
    height: 60vh;
  }

  .location-selector {
    flex-direction: column;
  }

  .loc-select {
    width: 100%;
  }

  .map-filters {
    flex-wrap: wrap;
    gap: 6px;
  }

  .filter-chip {
    font-size: 12px;
    padding: 6px 12px;
  }

  .header-nav {
    gap: 4px;
  }

  .btn-text, .nav-link {
    font-size: 13px;
    padding: 6px 8px;
  }
}
</style>

<!-- 전역 스타일 (지도 위 가격 태그) -->
<style>
.map-price-tag {
  display: inline-block;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: #3182f6;
  border-radius: 16px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  white-space: nowrap;
}
.map-price-tag.active {
  background: #e5503c;
  transform: scale(1.1);
}
</style>
