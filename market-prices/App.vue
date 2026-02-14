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
        <div class="map-controls">
          <!-- 반경 설정 -->
          <div class="radius-control">
            <div class="radius-slider">
              <label for="radius">반경: {{ radiusKm.toFixed(1) }}km</label>
              <input
                type="range"
                id="radius"
                min="1"
                max="10"
                step="1"
                v-model.number="radiusSliderValue"
                class="slider"
              />
            </div>
            <div class="radius-toggle">
              <input type="checkbox" id="showRadius" v-model="showRadius" />
              <label for="showRadius">반경 표시</label>
            </div>
          </div>
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
      </div>

      <!-- 우측 패널 -->
      <aside class="side-panel">
        <!-- 지역 선택 -->
        <div class="location-selector">
          <div class="location-icon">📍</div>
          <select v-model="selectedSido" @change="onSidoChange" class="loc-select">
            <option value="">시/도</option>
            <option v-for="s in sidoList" :key="s" :value="s">{{ s }}</option>
          </select>
          <select v-model="selectedGugun" @change="onGugunChange" class="loc-select" :disabled="!selectedSido">
            <option value="">구/군</option>
            <option v-for="g in gugunList" :key="g" :value="g">{{ g }}</option>
          </select>
          <select v-model="selectedDong" @change="onDongChange" class="loc-select" :disabled="!selectedGugun">
            <option value="">동</option>
            <option v-for="d in dongList" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>

        <!-- 상세 정보 화면 -->
        <div v-if="selectedProperty" class="detail-view">
          <button @click="selectedProperty = null" class="back-button">&lt; 목록으로 돌아가기</button>
          <div class="detail-header">
            <h2>{{ selectedProperty.name }}</h2>
            <p class="detail-price">{{ formatPrice(selectedProperty.price) }}</p>
          </div>
          <div class="detail-content">
            <div class="info-grid">
              <div class="info-item"><span class="label">유형</span><span class="value">{{ typeLabel(selectedProperty.type) }}</span></div>
              <div class="info-item"><span class="label">전용면적</span><span class="value">{{ selectedProperty.area?.toFixed(2) }} m²</span></div>
              <div class="info-item"><span class="label">층</span><span class="value">{{ selectedProperty.floor || '-' }}층</span></div>
              <div class="info-item"><span class="label">준공년도</span><span class="value">{{ selectedProperty.builtYear || '-' }}년</span></div>
            </div>
            <div class="info-full"><span class="label">주소</span><span class="value">{{ selectedProperty.address }}</span></div>
            <div class="info-full"><span class="label">거래일</span><span class="value">{{ selectedProperty.dealDate }}</span></div>
          </div>
        </div>

        <!-- 목록 화면 -->
        <div v-else class="list-view">
          <div class="list-header">
            <h3>주변 실거래가 <span v-if="properties.length > 0">({{ properties.length }}건)</span></h3>
            <!-- 정렬 탭 추가 -->
            <div class="sort-tabs">
              <button class="sort-tab" :class="{ active: sortBy === 'distance' }" @click="sortBy = 'distance'">거리순</button>
              <button class="sort-tab" :class="{ active: sortBy === 'pricePerArea' }" @click="sortBy = 'pricePerArea'">평단가순</button>
            </div>
          </div>
          <div class="property-list">
            <div v-if="loading" class="state-box">데이터를 불러오는 중...</div>
            <div v-else-if="properties.length === 0" class="state-box">
              <p>주변에 거래 내역이 없거나<br/>지도를 움직여 검색해보세요.</p>
            </div>
            <!-- sortedProperties 사용 -->
            <div v-else v-for="item in sortedProperties" :key="item.id" class="property-item" @click="showDetails(item)">
              <div class="item-info">
                <p class="item-name">{{ item.name }}</p>
                <p class="item-type">{{ typeLabel(item.type) }} · {{ item.area?.toFixed(1) }}m²</p>
              </div>
              <div class="item-price">
                <span class="price-value">{{ formatPrice(item.price) }}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { getNearbyRealDeals, getSidoList, getGugunList, getDongList } from '../shared/api.js'
import { debounce } from 'lodash-es'

// ====== 상태 (State) ======
const isLoggedIn = ref(false)
const mapContainer = ref(null)
let map = null, geocoder = null, circle = null, customOverlay = null
let markers = []
let preventNextFetch = false

const sidoList = ref([]), gugunList = ref([]), dongList = ref([])
const selectedSido = ref(''), selectedGugun = ref(''), selectedDong = ref('')

const radiusSliderValue = ref(10) // 슬라이더의 정수 값 (1-10, 10 = 1.0km)
const radiusKm = computed(() => radiusSliderValue.value / 10) // 실제 반경 (km)
const showRadius = ref(true)
const filters = ref({ type: '' })
const properties = ref([])
const selectedProperty = ref(null)
const loading = ref(false)
const sortBy = ref('distance') // 정렬 상태 추가

const propertyTypes = [
  { label: '전체', value: '' },
  { label: '아파트', value: 'APARTMENT' },
  { label: '오피스텔', value: 'OFFICETEL' },
  { label: '빌라', value: 'VILLA' },
]

// ====== 정렬된 목록 (Computed) ======
const sortedProperties = computed(() => {
  const center = map ? map.getCenter() : null
  const propertiesToSort = [...properties.value]

  if (sortBy.value === 'distance') {
    if (!center) return propertiesToSort
    propertiesToSort.sort((a, b) => {
      const distA = getDistanceInKm(center.getLat(), center.getLng(), a.lat, a.lng)
      const distB = getDistanceInKm(center.getLat(), center.getLng(), b.lat, b.lng)
      return distA - distB
    })
  } else if (sortBy.value === 'pricePerArea') {
    propertiesToSort.sort((a, b) => {
      const pricePerAreaA = a.area > 0 ? a.price / a.area : Infinity
      const pricePerAreaB = b.area > 0 ? b.price / b.area : Infinity
      return pricePerAreaA - pricePerAreaB
    })
  }
  return propertiesToSort
})


// ====== 라이프사이클 & 초기화 ======
onMounted(async () => {
  checkAuth()
  await loadKakaoMap()
  await loadSidoList()
})

// ====== 인증 ======
function checkAuth() { isLoggedIn.value = !!localStorage.getItem('accessToken') }
function logout() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  window.location.reload()
}

// ====== 카카오 지도 ======
function loadKakaoMap() {
  const apiKey = import.meta.env.VITE_KAKAO_MAP_KEY
  if (!apiKey) { console.warn('VITE_KAKAO_MAP_KEY 환경변수를 설정해주세요.'); return }
  const script = document.createElement('script')
  script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false&libraries=services`
  script.onload = () => kakao.maps.load(initMap)
  document.head.appendChild(script)
}

function initMap() {
  const options = { center: new kakao.maps.LatLng(37.5665, 126.978), level: 5 }
  map = new kakao.maps.Map(mapContainer.value, options)
  geocoder = new kakao.maps.services.Geocoder()
  
  customOverlay = new kakao.maps.CustomOverlay({ map: null, yAnchor: 1.4 })
  
  circle = new kakao.maps.Circle({
    map: map,
    center: map.getCenter(),
    radius: radiusKm.value * 1000,
    strokeWeight: 2, strokeColor: '#3182f6', strokeOpacity: 0.8,
    strokeStyle: 'solid', fillColor: '#3182f6', fillOpacity: 0.1,
  })

  kakao.maps.event.addListener(map, 'idle', () => {
    updateCirclePosition()
    debouncedFetch()
  })
  
  // radiusKm (Computed) 값이 변할 때마다 circle 업데이트
  watch(radiusKm, () => updateCircleRadius())

  fetchNearbyDeals()
  updateCircle()
}

// ====== 지역 선택 핸들러 ======
async function loadSidoList() {
  try { sidoList.value = await getSidoList() } 
  catch (e) { console.error('시/도 목록 로드 실패:', e) }
}
async function onSidoChange() {
  selectedGugun.value = ''; selectedDong.value = '';
  gugunList.value = []; dongList.value = [];
  if (!selectedSido.value) return
  try { gugunList.value = await getGugunList(selectedSido.value) } 
  catch (e) { console.error('구/군 목록 로드 실패:', e) }
}
async function onGugunChange() {
  selectedDong.value = ''; dongList.value = [];
  if (!selectedGugun.value) return
  try { dongList.value = await getDongList(selectedSido.value, selectedGugun.value) } 
  catch (e) { console.error('동 목록 로드 실패:', e) }
}
function onDongChange() {
  if (!selectedDong.value) return
  const address = `${selectedSido.value} ${selectedGugun.value} ${selectedDong.value}`
  geocoder.addressSearch(address, (result, status) => {
    if (status === kakao.maps.services.Status.OK) {
      const coords = new kakao.maps.LatLng(result[0].y, result[0].x)
      preventNextFetch = true;
      map.setCenter(coords)
    } else { alert('선택한 지역의 좌표를 찾을 수 없습니다.') }
  })
}

// ====== 데이터 조회 ======\
const fetchNearbyDeals = async () => {
  if (preventNextFetch) { preventNextFetch = false; return }
  if (!map) return
  loading.value = true
  if (selectedProperty.value) selectedProperty.value = null

  try {
    const center = map.getCenter()
    const params = {
      lat: center.getLat(), lon: center.getLng(),
      distanceKm: radiusKm.value, size: 100,
    }
    if (filters.value.type) params.propertyType = filters.value.type

    const res = await getNearbyRealDeals(params)
    properties.value = (res.data?.deals || []).map(d => ({
      id: d.id, name: d.propertyName, type: d.propertyType, price: d.dealAmount,
      area: d.exclusiveArea, floor: d.floor, builtYear: d.builtYear,
      dealDate: d.dealDate, address: d.address,
      lat: d.location?.lat, lng: d.location?.lon,
    }))
    updateMarkers()
  } catch (e) {
    console.error('시세 조회 실패:', e)
    properties.value = []
  } finally { loading.value = false }
}
const debouncedFetch = debounce(fetchNearbyDeals, 500)
watch(() => filters.value.type, fetchNearbyDeals)
watch(showRadius, updateCircleVisibility)
watch(sortBy, () => { /* sortedProperties computed property가 자동으로 재정렬 */ })


// ====== 지도 시각화 (마커, 원) ======\
function updateMarkers() {
  markers.forEach(m => m.setMap(null))
  markers = []
  customOverlay.setMap(null)
  properties.value.forEach(item => {
    if (!item.lat || !item.lng) return
    const position = new kakao.maps.LatLng(item.lat, item.lng)
    const marker = new kakao.maps.Marker({ position })
    marker.setMap(map)
    markers.push(marker)
    kakao.maps.event.addListener(marker, 'click', () => {
      const content = `
        <div class="map-overlay">
          <div class="overlay-name">${item.name}</div>
          <div class="overlay-info">
            <span>${formatPrice(item.price)}</span>
            <span>${item.area?.toFixed(1)}m²</span>
          </div>
        </div>`
      customOverlay.setContent(content)
      customOverlay.setPosition(position)
      customOverlay.setMap(map)
      showDetails(item)
    })
  })
}

function updateCircleVisibility() { if (circle) circle.setMap(showRadius.value ? map : null) }
function updateCirclePosition() { if (map && circle) circle.setPosition(map.getCenter()) }
function updateCircleRadius() { if (circle) circle.setRadius(radiusKm.value * 1000) }
function updateCircle() {
  updateCircleVisibility()
  updateCirclePosition()
  updateCircleRadius()
}

// ====== UI 인터랙션 ======\
function setTypeFilter(type) { filters.value.type = type }
function showDetails(item) {
  selectedProperty.value = item
  if (item.lat && item.lng) {
    preventNextFetch = true;
    map.panTo(new kakao.maps.LatLng(item.lat, item.lng))
  }
}

// ====== 유틸리티 함수 ======\
function getDistanceInKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2-lat1) * (Math.PI/180);
    const dLon = (lon2-lon1) * (Math.PI/180); 
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
}
function typeLabel(type) {
  const map = { APARTMENT: '아파트', VILLA: '빌라', OFFICETEL: '오피스텔' }
  return map[type] || type || ''
}
function formatPrice(price) {
  if (!price || price <= 0) return '-'
  const num = Number(price)
  if (num < 10000) return `${Math.floor(num / 1000).toLocaleString()}천만원`
  return `${(num / 10000).toFixed(1)}억`
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100vh; overflow: hidden; font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'; background-color: #f0f2f5; color: #1a1a1a; }

/* Header */
.header {
  flex-shrink: 0;
  background-color: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  z-index: 1000; /* Ensure header is above map controls */
}
.header-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 64px; /* Slightly taller header */
}
.logo {
  font-size: 22px; /* Slightly larger logo */
  font-weight: 800;
  color: #007bff; /* Primary blue color */
  text-decoration: none;
  letter-spacing: -0.5px;
}
.header-nav {
  display: flex;
  align-items: center;
  gap: 12px; /* Increased gap */
}
.nav-link {
  font-size: 15px; /* Slightly larger font */
  font-weight: 600;
  color: #555555;
  text-decoration: none;
  padding: 8px 12px;
  transition: color 0.2s;
}
.nav-link:hover { color: #007bff; }
.nav-link.active { color: #007bff; border-bottom: 2px solid #007bff; padding-bottom: 6px; }
.btn-text {
  background: none;
  border: none;
  font-size: 15px;
  font-weight: 600;
  color: #555555;
  cursor: pointer;
  padding: 8px 12px;
  transition: color 0.2s;
}
.btn-text:hover { color: #007bff; }
.btn-header-primary {
  padding: 10px 20px; /* Adjusted padding */
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
  background: #007bff;
  border-radius: 8px;
  text-decoration: none;
  transition: background-color 0.2s;
}
.btn-header-primary:hover { background-color: #0056b3; }

/* Main Layout */
.main-layout {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* Map Area */
.map-area {
  flex: 1;
  position: relative;
  min-width: 0;
  background-color: #e8edf3; /* Light background for map loading */
}
.map-container {
  width: 100%;
  height: 100%;
}
.map-controls {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 500; /* Ensure controls are above map */
}

.radius-control {
  background: rgba(255, 255, 255, 0.95); /* Slightly less transparent */
  padding: 10px 18px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 20px; /* Increased gap */
}
.radius-slider {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #333333;
}
.slider {
  width: 160px; /* Slightly wider slider */
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  outline: none;
  opacity: 0.8;
  transition: opacity 0.2s;
}
.slider:hover { opacity: 1; }
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: #007bff;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}
.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: #007bff;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

.radius-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #333333;
}
.radius-toggle input[type="checkbox"] {
  width: 16px; height: 16px;
  cursor: pointer;
}

.map-filters {
  display: flex;
  gap: 8px;
}
.filter-chip {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  background: #ffffff;
  border: 1px solid #d0d0d0;
  border-radius: 20px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  transition: all 0.2s;
  color: #333333;
}
.filter-chip:hover { border-color: #007bff; color: #007bff; }
.filter-chip.active {
  background: #007bff;
  color: #ffffff;
  border-color: #007bff;
  box-shadow: 0 3px 8px rgba(0, 123, 255, 0.3);
}

/* Side Panel */
.side-panel {
  width: 380px; /* Slightly adjusted width */
  flex-shrink: 0;
  background: #ffffff;
  border-left: 1px solid #e0e0e0;
  box-shadow: -2px 0 5px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.list-view, .detail-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Location Selector */
.location-selector {
  display: flex;
  align-items: center;
  gap: 10px; /* Adjusted gap */
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  flex-wrap: wrap;
  background-color: #f9f9f9;
}
.location-icon {
  font-size: 20px;
  color: #007bff;
}
.loc-select {
  flex: 1;
  min-width: 0; /* Allow shrinking */
  padding: 10px 14px; /* Adjusted padding */
  font-size: 14px;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  background: #ffffff;
  color: #333333;
  cursor: pointer;
  outline: none;
  appearance: none; /* Remove default arrow */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%236c757d' d='M8 10.5L3.5 6h9z'/%3E%3C/svg%3E"); /* Custom arrow */
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 32px; /* Space for custom arrow */
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  transition: all 0.2s;
}
.loc-select:hover { border-color: #a0a0a0; }
.loc-select:focus {
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25); /* Focus ring */
}
.loc-select:disabled {
  background: #f0f0f0;
  cursor: not-allowed;
  color: #888888;
  box-shadow: none;
  border-color: #e0e0e0;
}

/* Breadcrumb */
.breadcrumb {
  padding: 12px 16px;
  font-size: 13px;
  color: #777777;
  border-bottom: 1px solid #e0e0e0;
  background: #f9f9f9;
}
.bc-sep {
  margin: 0 6px;
  color: #cccccc;
}
.bc-current {
  color: #333333;
  font-weight: 600;
}

/* List Header & Sort Tabs */
.list-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
  background-color: #ffffff;
}
.list-header h3 { margin: 0 0 12px; font-size: 18px; color: #1a1a1a; }
.list-header p { margin: 0; font-size: 14px; color: #777777; }

.sort-tabs {
  display: flex;
  border-top: 1px solid #e0e0e0;
  margin: 16px -16px 0; /* Extend tabs to full width */
}
.sort-tab {
  flex: 1;
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  color: #777777;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}
.sort-tab:hover { color: #333333; }
.sort-tab.active {
  color: #007bff;
  border-bottom-color: #007bff;
}

/* Property List */
.property-list {
  flex: 1;
  overflow-y: auto;
}
.property-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.15s;
}
.property-item:hover { background: #f7f7f7; }
.item-info {
  flex: 1;
  min-width: 0;
}
.item-name {
  font-size: 16px;
  font-weight: 600;
  color: #333333;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-type {
  font-size: 13px;
  color: #777777;
}
.item-price {
  text-align: right;
  flex-shrink: 0;
  margin-left: 16px;
}
.price-value {
  font-size: 17px;
  font-weight: 700;
  color: #007bff;
  white-space: nowrap;
}

/* State Box (Loading/No results) */
.state-box {
  text-align: center;
  padding: 60px 24px;
  color: #888888;
  font-size: 15px;
}

/* Detail View */
.back-button {
  background: none;
  border: none;
  font-weight: 600;
  color: #007bff;
  padding: 16px;
  cursor: pointer;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
  font-size: 15px;
  transition: color 0.2s;
}
.back-button:hover { color: #0056b3; background-color: #f9f9f9; }

.detail-header {
  padding: 24px;
  border-bottom: 1px solid #e0e0e0;
}
.detail-header h2 {
  margin: 0 0 8px;
  font-size: 24px;
  color: #1a1a1a;
  line-height: 1.4;
}
.detail-price {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #007bff;
}
.detail-content {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
  line-height: 1.6;
}
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}
.info-item, .info-full {
  display: flex;
  flex-direction: column;
}
.info-full { margin-bottom: 20px; }
.info-item .label, .info-full .label {
  font-size: 13px;
  color: #888888;
  margin-bottom: 6px;
}
.info-item .value, .info-full .value {
  font-size: 16px;
  font-weight: 500;
  color: #333333;
}

/* Responsive */
@media (max-width: 1024px) {
  .main-layout { flex-direction: column; }
  .map-area { height: 60vh; }
  .side-panel { width: 100%; height: 40vh; border-left: none; border-top: 1px solid #e0e0e0; max-width: none; }
}

@media (max-width: 768px) {
  .header-inner { padding: 0 16px; height: 56px; }
  .logo { font-size: 20px; }
  .header-nav { gap: 8px; }
  .nav-link, .btn-text, .btn-header-primary { font-size: 13px; padding: 6px 10px; }
  .btn-header-primary { padding: 8px 16px; }
  
  .map-controls { top: 10px; left: 10px; gap: 8px; }
  .radius-control { padding: 6px 12px; gap: 12px; font-size: 13px; }
  .slider { width: 120px; }
  .radius-toggle { font-size: 13px; gap: 5px; }
  .filter-chip { padding: 6px 12px; font-size: 12px; }

  .side-panel { box-shadow: 0 -2px 5px rgba(0,0,0,0.05); }
  .location-selector { padding: 12px; gap: 6px; }
  .loc-select { padding: 8px 10px; font-size: 13px; padding-right: 28px; background-position: right 8px center; }
  .breadcrumb { padding: 10px 12px; font-size: 12px; }
  .list-header { padding: 12px; }
  .list-header h3 { font-size: 16px; margin-bottom: 8px; }
  .sort-tab { padding: 10px; font-size: 13px; }
  .property-item { padding: 12px; }
  .item-name { font-size: 14px; }
  .item-type { font-size: 12px; }
  .price-value { font-size: 15px; }

  .back-button { padding: 12px; font-size: 14px; }
  .detail-header { padding: 16px; }
  .detail-header h2 { font-size: 20px; }
  .detail-price { font-size: 18px; }
  .detail-content { padding: 16px; }
  .info-grid { gap: 15px; margin-bottom: 18px; }
  .info-item .label, .info-full .label { font-size: 12px; }
  .info-item .value, .info-full .value { font-size: 14px; }
}
</style>

<!-- 전역 스타일 (지도 오버레이) -->
<style>
.map-overlay {
  padding: 7px 11px;
  background: rgba(0, 0, 0, 0.75);
  color: white;
  border-radius: 6px;
  text-align: center;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  white-space: nowrap;
}
.overlay-name {
  font-weight: 600;
  margin-bottom: 3px;
  font-size: 13px;
}
.overlay-info {
  display: flex;
  gap: 7px;
  opacity: 0.9;
  font-size: 11px;
}
</style>
