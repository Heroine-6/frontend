<template>
  <div class="page">
    <!-- 헤더 -->
    <header class="header">
      <div class="header-inner">
        <a href="/" class="logo">부동부동</a>
        <nav class="header-nav">
          <a href="/search" class="btn-text">매물 검색</a>
          <a href="/market-prices" class="btn-text">주변 시세</a>
          <a href="/mypage" class="btn-text">마이페이지</a>
          <span class="user-greeting">{{ userName }}님</span>
          <button class="btn-text" @click="logout">로그아웃</button>
        </nav>
      </div>
    </header>

    <!-- 권한 없음 -->
    <div v-if="!authorized" class="access-denied">
      <p class="denied-icon">🔒</p>
      <h2>접근 권한이 없습니다</h2>
      <p>판매자 계정으로 로그인해주세요</p>
      <a href="/signin" class="btn-primary">로그인 페이지로</a>
    </div>

    <!-- 메인 레이아웃 -->
    <div v-else class="main-layout">
      <!-- 사이드바 필터 -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2 class="sidebar-title">내 매물 관리</h2>
          <button class="btn-reset" @click="resetFilters">초기화</button>
        </div>

        <!-- 매물명 검색 -->
        <div class="filter-block">
          <label class="filter-label">매물명</label>
          <input
            v-model="filters.name"
            type="text"
            class="form-input"
            placeholder="매물명으로 검색"
            @keyup.enter="doSearch"
          />
        </div>

        <!-- 매물 유형 -->
        <div class="filter-block">
          <label class="filter-label">매물 유형</label>
          <div class="chip-group">
            <button
              v-for="t in propertyTypes"
              :key="t.value"
              class="chip"
              :class="{ active: filters.type === t.value }"
              @click="filters.type = t.value"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <!-- 경매 상태 -->
        <div class="filter-block">
          <label class="filter-label">경매 상태</label>
          <div class="chip-group">
            <button
              v-for="s in auctionStatuses"
              :key="s.value"
              class="chip"
              :class="{ active: filters.status === s.value }"
              @click="filters.status = s.value"
            >
              {{ s.label }}
            </button>
          </div>
        </div>

        <!-- 지역 -->
        <div class="filter-block">
          <label class="filter-label">지역</label>
          <input
            v-model="filters.address"
            type="text"
            class="form-input"
            placeholder="주소 검색"
            @keyup.enter="doSearch"
          />
        </div>

        <!-- 가격 범위 -->
        <div class="filter-block">
          <label class="filter-label">가격</label>
          <div class="price-row">
            <input
              v-model="filters.minPrice"
              type="number"
              class="form-input price-input"
              placeholder="최소"
            />
            <span class="price-sep">~</span>
            <input
              v-model="filters.maxPrice"
              type="number"
              class="form-input price-input"
              placeholder="최대"
            />
          </div>
        </div>

        <!-- 입주 가능일 -->
        <div class="filter-block">
          <label class="filter-label">입주 가능일</label>
          <input
            v-model="filters.migrateDate"
            type="date"
            class="form-input"
          />
        </div>

        <!-- 준공연도 -->
        <div class="filter-block">
          <label class="filter-label">준공연도</label>
          <input
            v-model="filters.builtYear"
            type="number"
            class="form-input"
            placeholder="예: 2020"
          />
        </div>

        <!-- 거리 -->
        <div class="filter-block">
          <label class="filter-label">거리</label>
          <input
            v-model="filters.distance"
            type="text"
            class="form-input"
            placeholder="예: 역세권"
          />
        </div>

        <button class="btn-search" @click="doSearch">검색하기</button>
      </aside>

      <!-- 매물 리스트 -->
      <main class="content">
        <!-- 상단 헤더 -->
        <div class="content-header">
          <p class="results-count">
            총 <strong>{{ filteredProperties.length }}</strong>건
          </p>
          <a href="#" class="btn-register" @click.prevent="goRegister">매물 등록</a>
        </div>

        <!-- 로딩 -->
        <div v-if="loading" class="state-box">매물을 불러오는 중...</div>

        <!-- 빈 결과 -->
        <div v-else-if="filteredProperties.length === 0" class="state-box">
          <p class="empty-icon">📋</p>
          <p>등록된 매물이 없습니다</p>
          <p class="empty-hint">매물을 등록하고 경매를 시작하세요</p>
        </div>

        <!-- 매물 카드 리스트 -->
        <div v-else class="property-list">
          <div v-for="item in filteredProperties" :key="item.id" class="property-card">
            <!-- 카드 썸네일 -->
            <div class="card-thumb">
              <img
                v-if="item.thumbnailImage"
                :src="item.thumbnailImage"
                :alt="item.name"
                class="thumb-img"
              />
              <div v-else class="thumb-placeholder">🏢</div>
            </div>

            <!-- 카드 바디 -->
            <div class="card-body">
              <!-- 경매 정보 -->
              <div class="card-top">
                <h3 class="card-price">
                  경매 시작가 {{ formatPrice(item.auction?.startPrice) }}
                </h3>
                <span v-if="item.auction" class="card-date">
                  {{ formatDate(item.auction.startedAt) }} ~ {{ formatDate(item.auction.endedAt) }}
                </span>
              </div>

              <!-- 매물 정보 -->
              <p class="card-name">{{ item.name }}</p>
              <div class="card-meta">
                <span v-if="item.floor">{{ item.floor }}층</span>
                <span v-if="item.supplyArea">, {{ item.supplyArea }}m²</span>
                <span v-if="item.privateArea">, 전용 {{ item.privateArea }}m²</span>
              </div>
              <p class="card-address">{{ item.address }}</p>

              <!-- 태그 + 액션 -->
              <div class="card-bottom">
                <div class="card-tags">
                  <span class="tag tag-type">{{ typeLabel(item.type) }}</span>
                  <span
                    v-if="item.auction"
                    class="tag"
                    :class="statusTagClass(item.auction.status)"
                  >
                    {{ statusLabel(item.auction.status) }}
                  </span>
                  <span v-else class="tag tag-none">경매 미등록</span>
                </div>
                <div class="card-actions">
                  <button
                    v-if="!item.auction || item.auction.status === 'CANCELLED'"
                    class="btn-action btn-action-primary"
                    @click="registerAuction(item.id, item.name)"
                  >
                    경매 등록
                  </button>
                  <template v-if="item.auction">
                    <button
                      v-if="item.auction.status === 'SCHEDULED'"
                      class="btn-action btn-action-danger"
                      @click="cancelAuction(item)"
                    >
                      경매 취소
                    </button>
                    <button
                      class="btn-action btn-action-outline"
                      @click="viewDetail(item.id)"
                    >
                      매물 상세보기
                    </button>
                    <button
                      class="btn-action btn-action-outline"
                      @click="viewAuctionDetail(item.auction.id)"
                    >
                      경매 상세보기
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 더보기 -->
        <div v-if="hasNext && !loading" class="load-more">
          <button class="btn-outline" :disabled="loadingMore" @click="loadMore">
            {{ loadingMore ? '불러오는 중...' : '더보기' }}
          </button>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getMyProperties, cancelAuction as cancelAuctionAPI } from '../shared/api.js'

// ====== 상수 ======
const propertyTypes = [
  { label: '전체', value: '' },
  { label: '아파트', value: 'APARTMENT' },
  { label: '오피스텔', value: 'OFFICETEL' },
  { label: '빌라', value: 'VILLA' },
]

const auctionStatuses = [
  { label: '전체', value: '' },
  { label: '경매 전', value: 'NONE' },
  { label: '경매 예정', value: 'SCHEDULED' },
  { label: '경매 중', value: 'OPEN' },
  { label: '종료', value: 'CLOSED' },
]

// ====== 상태 ======
const userName = ref('')
const userRole = ref('')
const authorized = ref(false)
const loading = ref(false)
const loadingMore = ref(false)
const hasNext = ref(false)
const page = ref(0)
const properties = ref([])

const filters = ref({
  name: '',
  type: '',
  status: '',
  address: '',
  minPrice: '',
  maxPrice: '',
  migrateDate: '',
  builtYear: '',
  distance: '',
})

// ====== 필터링 ======
const filteredProperties = computed(() => {
  let list = [...properties.value]
  const f = filters.value

  if (f.name) {
    const kw = f.name.toLowerCase()
    list = list.filter(p => p.name?.toLowerCase().includes(kw))
  }
  if (f.type) {
    list = list.filter(p => p.type === f.type)
  }
  if (f.status) {
    if (f.status === 'NONE') {
      list = list.filter(p => !p.auction)
    } else {
      list = list.filter(p => p.auction?.status === f.status)
    }
  }
  if (f.address) {
    const kw = f.address.toLowerCase()
    list = list.filter(p => p.address?.toLowerCase().includes(kw))
  }
  if (f.minPrice) {
    list = list.filter(p => (p.auction?.startPrice || 0) >= Number(f.minPrice))
  }
  if (f.maxPrice) {
    list = list.filter(p => (p.auction?.startPrice || 0) <= Number(f.maxPrice))
  }
  if (f.builtYear) {
    list = list.filter(p => p.builtYear === Number(f.builtYear))
  }

  return list
})

// ====== 초기화 ======
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
    userRole.value = payload.userRole || ''

    // 토큰 만료 확인
    const exp = payload.exp * 1000
    if (Date.now() >= exp) {
      alert('로그인이 만료되었습니다. 다시 로그인해주세요.')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      window.location.href = '/signin.html'
      return
    }

    // seller 역할 확인
    const role = userRole.value.toUpperCase()
    if (role.includes('SELLER') || role.includes('ADMIN')) {
      authorized.value = true
    } else {
      authorized.value = false
      return
    }
  } catch (e) {
    console.error('토큰 파싱 실패:', e)
    authorized.value = false
    return
  }

  await fetchProperties()
})

// ====== 데이터 로딩 ======
async function fetchProperties() {
  loading.value = true
  page.value = 0
  try {
    const res = await getMyProperties(0, 50)
    if (res.data && Array.isArray(res.data.content)) {
      properties.value = res.data.content
      hasNext.value = res.data.hasNext || false
    } else if (res.data && Array.isArray(res.data)) {
      properties.value = res.data
    } else {
      properties.value = []
    }
  } catch (e) {
    console.error('매물 불러오기 실패:', e)
    properties.value = []
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  loadingMore.value = true
  page.value++
  try {
    const res = await getMyProperties(page.value, 50)
    if (res.data && Array.isArray(res.data.content)) {
      properties.value.push(...res.data.content)
      hasNext.value = res.data.hasNext || false
    }
  } catch {
    /* ignore */
  } finally {
    loadingMore.value = false
  }
}

function doSearch() {
  // 프론트 필터링이므로 추가 API 호출 불필요
  // computed가 자동 반영
}

function resetFilters() {
  filters.value = {
    name: '', type: '', status: '', address: '',
    minPrice: '', maxPrice: '', migrateDate: '', builtYear: '', distance: '',
  }
}

// ====== 경매 액션 ======
function registerAuction(id, name) {
  const params = new URLSearchParams({ propertyId: id })
  if (name) params.set('propertyName', name)
  window.location.href = `/create-auction.html?${params.toString()}`
}

async function cancelAuction(item) {
  if (!confirm(`"${item.name}" 경매를 취소하시겠습니까?`)) return
  try {
    await cancelAuctionAPI(item.auction.id)
    alert('경매가 취소되었습니다.')
    await fetchProperties()
  } catch (e) {
    alert('경매 취소 실패: ' + e.message)
  }
}

function viewDetail(propertyId) {
  window.location.href = `/property-detail.html?id=${propertyId}`
}

function viewAuctionDetail(auctionId) {
  window.location.href = `/auction-detail.html?id=${auctionId}`
}

function goRegister() {
  window.location.href = '/create-property.html'
}

// ====== 유틸 ======
function typeLabel(type) {
  const m = { APARTMENT: '아파트', VILLA: '빌라', OFFICETEL: '오피스텔' }
  return m[type] || type || ''
}

function statusLabel(status) {
  const m = {
    SCHEDULED: '경매 예정', OPEN: '경매 중',
    CLOSED: '종료', FAILED: '유찰', CANCELLED: '취소',
  }
  return m[status] || status || ''
}

function statusTagClass(status) {
  return {
    'tag-scheduled': status === 'SCHEDULED',
    'tag-open': status === 'OPEN',
    'tag-closed': status === 'CLOSED' || status === 'FAILED' || status === 'CANCELLED',
  }
}

function formatPrice(price) {
  if (!price) return '-'
  const num = Number(price)
  if (num >= 100000000) {
    const eok = Math.floor(num / 100000000)
    const man = Math.floor((num % 100000000) / 10000)
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만` : `${eok}억`
  }
  if (num >= 10000) return `${Math.floor(num / 10000).toLocaleString()}만`
  return `${num.toLocaleString()}원`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function logout() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  window.location.href = '/signin'
}
</script>

<style scoped>
/* ========== 헤더 ========== */
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
  border-bottom: 1px solid var(--color-border);
}
.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
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

/* ========== 접근 권한 없음 ========== */
.access-denied {
  text-align: center;
  padding: 120px 24px;
  color: var(--color-text-secondary);
}
.denied-icon {
  font-size: 64px;
  margin-bottom: 16px;
}
.access-denied h2 {
  font-size: 24px;
  color: var(--color-text);
  margin-bottom: 8px;
}
.access-denied p {
  margin-bottom: 24px;
}
.btn-primary {
  display: inline-block;
  padding: 12px 32px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary);
  border-radius: 8px;
  text-decoration: none;
}
.btn-primary:hover {
  background: var(--color-primary-hover);
}

/* ========== 메인 레이아웃 ========== */
.main-layout {
  display: flex;
  max-width: 1400px;
  margin: 0 auto;
  min-height: calc(100vh - 60px);
}

/* ========== 사이드바 ========== */
.sidebar {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
  padding: 24px;
  background: #fff;
  overflow-y: auto;
  height: calc(100vh - 60px);
  position: sticky;
  top: 60px;
}
.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.sidebar-title {
  font-size: 18px;
  font-weight: 700;
}
.btn-reset {
  background: none;
  border: none;
  font-size: 13px;
  color: var(--color-text-secondary);
  cursor: pointer;
  text-decoration: underline;
}
.btn-reset:hover { color: var(--color-error); }

.filter-block {
  margin-bottom: 20px;
}
.filter-label {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 8px;
}
.form-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #fff;
  color: var(--color-text);
  outline: none;
}
.form-input:focus {
  border-color: var(--color-primary);
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-input-bg);
  border: 1px solid transparent;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.15s;
}
.chip:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.chip.active {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.price-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.price-input { flex: 1; min-width: 0; }
.price-sep { color: var(--color-text-secondary); }

.btn-search {
  width: 100%;
  padding: 14px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  margin-top: 8px;
}
.btn-search:hover { background: var(--color-primary-hover); }

/* ========== 콘텐츠 영역 ========== */
.content {
  flex: 1;
  padding: 24px;
  min-width: 0;
  background: var(--color-bg);
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.results-count {
  font-size: 14px;
  color: var(--color-text-secondary);
}
.results-count strong {
  color: var(--color-text);
}
.btn-register {
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary);
  border-radius: 8px;
  text-decoration: none;
  transition: background 0.2s;
}
.btn-register:hover {
  background: var(--color-primary-hover);
}

/* ========== 매물 카드 ========== */
.property-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.property-card {
  display: flex;
  gap: 20px;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.property-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 4px 16px rgba(49, 130, 246, 0.08);
}

.card-thumb {
  width: 200px;
  min-height: 180px;
  flex-shrink: 0;
  background: var(--color-input-bg);
  overflow: hidden;
}
.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  background: #e8edf3;
}

.card-body {
  flex: 1;
  padding: 20px 20px 20px 0;
  display: flex;
  flex-direction: column;
}

.card-top {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 8px;
}
.card-price {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text);
}
.card-date {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.card-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
}
.card-meta {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}
.card-address {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
}

.card-bottom {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 태그 */
.card-tags {
  display: flex;
  gap: 6px;
}
.tag {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 12px;
}
.tag-type {
  background: #eaf3ff;
  color: var(--color-primary);
}
.tag-scheduled {
  background: #f2f4f6;
  color: #6b7684;
}
.tag-open {
  background: #e8f5e9;
  color: #2e7d32;
}
.tag-closed {
  background: #ffeef0;
  color: var(--color-error);
}
.tag-none {
  background: #fff4e5;
  color: #e65100;
}

/* 액션 버튼 */
.card-actions {
  display: flex;
  gap: 8px;
}
.btn-action {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-action-primary {
  background: var(--color-primary);
  color: #fff;
}
.btn-action-primary:hover {
  background: var(--color-primary-hover);
}
.btn-action-danger {
  background: var(--color-error);
  color: #fff;
}
.btn-action-danger:hover {
  opacity: 0.85;
}
.btn-action-outline {
  background: #fff;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}
.btn-action-outline:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* 상태 */
.state-box {
  text-align: center;
  padding: 80px 0;
  color: var(--color-text-secondary);
  font-size: 15px;
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.empty-hint {
  font-size: 13px;
  margin-top: 4px;
}

/* 더보기 */
.load-more {
  text-align: center;
  margin-top: 32px;
}
.btn-outline {
  padding: 12px 40px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-primary);
  background: #fff;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius);
  cursor: pointer;
}
.btn-outline:hover:not(:disabled) {
  background: var(--color-primary);
  color: #fff;
}
.btn-outline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ========== 반응형 ========== */
@media (max-width: 1024px) {
  .main-layout {
    flex-direction: column;
  }
  .sidebar {
    width: 100%;
    height: auto;
    position: static;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }
}

@media (max-width: 768px) {
  .property-card {
    flex-direction: column;
  }
  .card-thumb {
    width: 100%;
    height: 200px;
  }
  .card-body {
    padding: 16px;
  }
  .card-bottom {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .card-actions {
    width: 100%;
  }
  .btn-action {
    flex: 1;
    text-align: center;
  }
  .header-nav { gap: 4px; }
  .btn-text { font-size: 13px; padding: 6px 8px; }
}
</style>
