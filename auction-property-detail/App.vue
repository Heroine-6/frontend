<template>
  <AppLayout>
    <!-- Overlay -->
    <div v-if="sidebarOpen" class="overlay" @click="closeSidebar"></div>

    <!-- Sidebar (메인과 동일) -->
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-header">
        <span class="sidebar-title">메뉴</span>
        <button class="close-btn" @click="closeSidebar">✕</button>
      </div>

      <nav class="sidebar-nav">
        <a href="/search" @click="closeSidebar" class="sidebar-link">
          <span class="icon">🔍</span>
          매물 검색
        </a>

        <a href="/market-prices" @click="closeSidebar" class="sidebar-link">
          <span class="icon">📊</span>
          주변 시세
        </a>

        <a v-if="isLoggedIn" href="/mypage" @click="closeSidebar" class="sidebar-link">
          <span class="icon">👤</span>
          마이페이지
        </a>
      </nav>

      <div class="sidebar-divider"></div>

      <div class="sidebar-user-area">
        <div v-if="isLoggedIn" class="sidebar-user">
          🙋 {{ userName }}님
        </div>

        <button v-if="isLoggedIn" class="sidebar-logout" @click="logout">
          🚪 로그아웃
        </button>

        <template v-else>
          <div class="sidebar-auth">
            <a href="/signin" class="sidebar-link">🔑 로그인</a>
            <a href="/signup" class="sidebar-link">✨ 회원가입</a>
          </div>
        </template>
      </div>
    </aside>

    <!-- ================= 본문 ================= -->
    <section class="detail-section">
      <div v-if="loading" class="loading">경매 정보를 불러오는 중...</div>
      <div v-else-if="!data" class="empty">경매 정보를 찾을 수 없습니다.</div>

      <div v-else class="detail-layout">
        <!-- 왼쪽: 매물 정보 -->
        <section class="detail-card left-card">
          <h1 class="detail-title">{{ data.name }}</h1>
          <p class="detail-address">{{ data.address }}</p>

          <!-- 이미지 -->
          <div v-if="data.images?.length" class="gallery">
            <img
                v-for="(img, i) in data.images"
                :key="i"
                class="gallery-img"
                :src="img"
                alt="매물 이미지"
            />
          </div>

          <div class="divider"></div>

          <!-- 지도 -->
          <div class="map-wrap">
            <div ref="mapContainer" class="map"></div>
            <p v-if="mapError" class="map-error">지도 표시 실패: {{ mapError }}</p>
          </div>

          <div class="divider"></div>

          <!-- 스펙 -->
          <div class="spec-grid">
            <div><b>층수</b><span>{{ data.floor }} / {{ data.totalFloor }}층</span></div>
            <div><b>방 개수</b><span>{{ data.roomCount }}개</span></div>
            <div><b>전용면적</b><span>{{ data.privateArea }}㎡</span></div>
            <div><b>공급면적</b><span>{{ data.supplyArea }}㎡</span></div>
            <div><b>준공연도</b><span>{{ data.builtYear }}년</span></div>
            <div><b>매물 유형</b><span>{{ propertyTypeLabel }}</span></div>
          </div>

          <div v-if="data.description" class="desc">
            {{ data.description }}
          </div>
        </section>

        <!-- 오른쪽: 경매 정보 -->
        <aside class="detail-card right-card">
          <div class="auction-top">
            <div class="auction-type">
              <span>{{ auctionTypeLabel }}</span>
              <span class="dday" :class="{ expired: dDayLabel === '종료' }">
                {{ dDayLabel }}
              </span>
            </div>

            <span class="status" :class="badgeClass">{{ statusLabel }}</span>
          </div>

          <!-- 가격: 글자 붙는 문제 해결을 위해 박스 2개로 분리 -->
          <div class="auction-grid">
            <div class="auction-block">
              <div class="label">시작가</div>
              <div class="price">{{ formatPrice(data.startPrice) }}</div>
            </div>

            <div class="auction-block">
              <div class="label">현재가</div>
              <div class="price highlight">{{ formatPrice(displayCurrentPrice) }}</div>
            </div>
          </div>

          <div v-if="data.auctionType === 'ENGLISH'" class="sub-line">
            최소 입찰 단위 <b>{{ formatPrice(data.minBidIncrement) }}</b>
          </div>

          <div v-if="data.auctionType === 'DUTCH'" class="sub-line">
            감액 단위 <b>{{ formatPrice(data.decreasePrice) }}</b>
          </div>

          <div class="time-box">
            <div>시작 <b>{{ formatDateOnly(data.startedAt) }}</b></div>
            <div>종료 <b>{{ formatDateOnly(data.endedAt) }}</b></div>
          </div>

          <!-- 버튼 -->
          <div class="btn-area">
            <!-- 상향식: 입찰내역 조회 -->
            <button
                v-if="data.auctionType === 'ENGLISH'"
                class="btn-outline"
                @click="goToBidHistory"
            >
              입찰 내역 조회
            </button>

            <!-- 하향식: 즉시낙찰 -->
            <button
                v-if="data.auctionType === 'DUTCH' && data.status === 'OPEN'"
                class="btn-primary"
                @click="goToBidPage"
            >
              이 가격에 즉시 낙찰
            </button>

            <!-- 하향식인데 OPEN 아니면 비활성 안내 -->
            <button
                v-if="data.auctionType === 'DUTCH' && data.status !== 'OPEN'"
                class="btn-disabled"
                disabled
            >
              경매가 진행중일 때만 낙찰할 수 있어요
            </button>
          </div>
        </aside>
      </div>
    </section>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import AppLayout from "../components/AppLayout.vue";

const data = ref(null)
const loading = ref(true)

const sidebarOpen = ref(false)
const isLoggedIn = ref(false)
const userName = ref('')

const mapContainer = ref(null)
let map = null
const mapError = ref('')

onMounted(async () => {
  checkAuth()

  const id = new URLSearchParams(location.search).get('propertyId')
  if (!id) {
    loading.value = false
    return
  }

  try {
    const res = await fetch(`/api/properties/v1/${id}/auction`)
    const json = await res.json()
    data.value = json.data
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }

  await nextTick()
  loadMap()
})

/* ===== Auth ===== */
function decodeJwtPayload(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}

function checkAuth() {
  const token = localStorage.getItem('accessToken')
  if (!token) return
  try {
    const payload = decodeJwtPayload(token)
    isLoggedIn.value = true
    userName.value = payload.username || payload.userEmail || ''
  } catch {
    isLoggedIn.value = false
    userName.value = ''
  }
}

function logout() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  location.href = '/'
}

/* ===== Sidebar ===== */
function toggleSidebar() { sidebarOpen.value = true }
function closeSidebar() { sidebarOpen.value = false }

/* ===== Map ===== */
function loadMap() {
  const key = import.meta.env.VITE_KAKAO_MAP_KEY
  if (!key) {
    mapError.value = 'VITE_KAKAO_MAP_KEY 없음'
    return
  }
  if (!data.value?.address) {
    mapError.value = '주소 없음'
    return
  }
  if (!mapContainer.value) {
    mapError.value = 'mapContainer 없음'
    return
  }

  if (!window.kakao?.maps) {
    const script = document.createElement('script')
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false&libraries=services`
    script.onload = () => window.kakao.maps.load(initMap)
    script.onerror = () => { mapError.value = '카카오 맵 스크립트 로드 실패' }
    document.head.appendChild(script)
  } else {
    initMap()
  }
}

function initMap() {
  mapError.value = ''

  const geocoder = new kakao.maps.services.Geocoder()
  geocoder.addressSearch(data.value.address, (result, status) => {
    if (status !== kakao.maps.services.Status.OK || !result?.length) {
      mapError.value = `지오코딩 실패: ${status}`
      return
    }

    const coords = new kakao.maps.LatLng(result[0].y, result[0].x)

    map = new kakao.maps.Map(mapContainer.value, {
      center: coords,
      level: 3
    })

    new kakao.maps.Marker({ map, position: coords })

    // relayout 안정화
    setTimeout(() => {
      if (map) {
        map.relayout()
        map.setCenter(coords)
      }
    }, 150)
  })
}

/* ===== Computed ===== */
const displayCurrentPrice = computed(() => data.value?.currentPrice ?? data.value?.startPrice)

const auctionTypeLabel = computed(() => {
  return data.value?.auctionType === 'DUTCH' ? '하향식 경매' : '상향식 경매'
})

const propertyTypeLabel = computed(() => {
  const m = { APARTMENT: '아파트', VILLA: '빌라', OFFICETEL: '오피스텔' }
  return m[data.value?.propertyType] || data.value?.propertyType || '-'
})

const badgeClass = computed(() => ({
  open: data.value?.status === 'OPEN',
  scheduled: data.value?.status === 'SCHEDULED',
  closed: data.value?.status === 'CLOSED'
}))

const statusLabel = computed(() => {
  const m = { OPEN: '진행중', SCHEDULED: '경매 예정', CLOSED: '종료' }
  return m[data.value?.status] || data.value?.status || '-'
})

const dDayLabel = computed(() => {
  if (!data.value?.endedAt) return ''
  const end = new Date(data.value.endedAt)
  const today = new Date()
  end.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
  if (diff > 0) return `D-${diff}`
  if (diff === 0) return 'D-DAY'
  return '종료'
})

/* ===== Utils ===== */
function formatPrice(v) { return v ? Number(v).toLocaleString() + '원' : '-' }

function formatDateOnly(v) {
  if (!v) return '-'
  const d = new Date(v)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ===== Links ===== */
function goToBidHistory() { location.href = `/auction-detail?id=${data.value.auctionId}` }
function goToBidPage() { location.href = `/payment-checkout.html?auctionId=${data.value.auctionId}` }
</script>

<style scoped>
/* ================= 공통 페이지 ================= */
.page { background: #f5f7fa; min-height: 100vh; }

/* ================= 헤더 (메인과 동일) ================= */
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
  border-bottom: 1px solid #eaeef3;
}
.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.header-left { display: flex; align-items: center; gap: 12px; }
.logo {
  font-size: 22px;
  font-weight: 800;
  color: #1b64da;
  text-decoration: none;
}
.header-nav { display: flex; align-items: center; gap: 12px; }
.btn-text {
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  text-decoration: none;
  padding: 8px 12px;
}
.btn-text:hover { color: #0f172a; }
.btn-header-primary {
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: #1b64da;
  border-radius: 8px;
  text-decoration: none;
}
.user-greeting { font-size: 14px; font-weight: 600; color: #0f172a; }
.menu-btn { background: none; border: none; font-size: 20px; cursor: pointer; }

/* ================= Sidebar ================= */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.35);
  backdrop-filter: blur(2px);
  z-index: 150;
}
.sidebar {
  position: fixed;
  top: 0;
  left: -280px;
  width: 260px;
  height: 100%;
  background: #ffffff;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  border-top-right-radius: 20px;
  border-bottom-right-radius: 20px;
  transition: left 0.35s cubic-bezier(.4,.0,.2,1);
  z-index: 200;
  display: flex;
  flex-direction: column;
}
.sidebar.open { left: 0; }
.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 22px 20px;
  font-weight: 700;
  font-size: 16px;
  border-bottom: 1px solid #eef2f7;
}
.close-btn { border: none; background: none; font-size: 18px; cursor: pointer; color: #94a3b8; }
.sidebar-nav { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.sidebar-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  font-weight: 600;
  color: #334155;
  text-decoration: none;
  transition: all 0.2s ease;
}
.sidebar-link:hover { background: rgba(49,130,246,0.08); color: #2563eb; }
.icon { font-size: 16px; filter: grayscale(100%); opacity: 0.8; }
.sidebar-divider { height: 1px; background: #eef2f7; margin: 18px 0; }
.sidebar-user-area { padding: 20px; border-top: 1px solid #eef2f7; }
.sidebar-user { font-weight: 700; margin-bottom: 12px; color: #0f172a; }
.sidebar-logout {
  background: rgba(239,68,68,0.08);
  border: none;
  padding: 10px 14px;
  border-radius: 10px;
  font-weight: 600;
  color: #ef4444;
  cursor: pointer;
  width: 100%;
}

/* ================= Detail ================= */
.detail-section { padding: 40px 24px 80px; }
.detail-layout {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  gap: 32px;
  align-items: flex-start;
}
.detail-card {
  background: #fff;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.05);
}
.left-card { flex: 2; }
.right-card { flex: 1; position: sticky; top: 96px; }

/* 제목 */
.detail-title { font-size: 28px; font-weight: 800; margin-bottom: 6px; }
.detail-address { color:#666; margin-bottom: 20px; }

/* 이미지 */
.gallery { display:flex; gap:12px; overflow-x:auto; margin-bottom:20px; }
.gallery-img { width:260px; height:180px; object-fit:cover; border-radius:12px; }

/* 지도 */
.map-wrap { position: relative; }
.map { width:100%; height:320px; border-radius:12px; background: #eef2f7; }
.map-error { margin-top: 10px; font-size: 13px; color: #e53935; }

/* 구분선 */
.divider { height:1px; background:#eee; margin:24px 0; }

/* 스펙 */
.spec-grid {
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:16px;
}
.spec-grid div { display:flex; justify-content:space-between; font-size:14px; }
.desc { margin-top: 18px; line-height: 1.7; color: #334155; }

/* ===== 경매 ===== */
.auction-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:22px; }
.auction-type { font-weight:800; font-size:16px; color:#1b64da; display:flex; gap:10px; align-items:center; }
.dday { background:#1b64da; color:#fff; padding:5px 10px; border-radius:12px; font-size:12px; }
.dday.expired { background:#e53935; }

.status { padding:6px 12px; border-radius:14px; font-size:12px; font-weight: 700; }
.status.open { background:#d4f5e9; color:#0f9d58; }
.status.scheduled { background:#e3e8f0; color:#334155; }
.status.closed { background:#fddede; color:#d93025; }

/* 글자 붙는 문제 해결 핵심 */
.auction-grid{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-bottom: 18px;
}
.auction-block { padding: 14px 14px; border-radius: 12px; background: #f8fafc; }
.label { font-size:13px; color:#64748b; margin-bottom:8px; }
.price { font-size:20px; font-weight:900; letter-spacing: -0.2px; }
.highlight { color: #1b84e1; }

.sub-line { margin: 10px 0 18px; font-size:14px; color:#475569; }
.time-box { margin-bottom: 22px; font-size:13px; color:#64748b; display:flex; flex-direction:column; gap:10px; }

.btn-area { display:flex; flex-direction:column; gap: 12px; }
.btn-primary {
  width:100%;
  padding:14px;
  background: #1f3bdf;
  color:#fff;
  border:none;
  border-radius:12px;
  font-weight:800;
  cursor:pointer;
}
.btn-outline {
  width:100%;
  padding:14px;
  background:#fff;
  border:1px solid #1b64da;
  color:#1b64da;
  border-radius:12px;
  font-weight:800;
  cursor:pointer;
}
.btn-disabled {
  width:100%;
  padding:14px;
  background:#eef2f7;
  border:none;
  color:#94a3b8;
  border-radius:12px;
  font-weight:800;
}

/* loading/empty */
.loading, .empty { text-align:center; padding: 120px 0; color:#64748b; }

/* 반응형 */
@media (max-width: 960px) {
  .detail-layout { flex-direction: column; }
  .right-card { position: static; }
}
</style>
