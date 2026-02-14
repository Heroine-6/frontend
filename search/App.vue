<template>
  <div class="page">
    <!-- 헤더 -->
    <header class="header">
      <div class="header-inner">
        <a href="/budongbudong" class="logo">부동부동</a>
        <nav class="header-nav">
          <a href="/search" class="nav-link active">매물 검색</a>
          <template v-if="isLoggedIn">
            <a href="/mypage" class="btn-text">마이페이지</a>
            <span class="user-greeting">{{ userName }}님</span>
            <button class="btn-text" @click="logout">로그아웃</button>
          </template>
          <template v-else>
            <a href="/signin" class="btn-text">로그인</a>
            <a href="/signup" class="btn-header-primary">회원가입</a>
          </template>
        </nav>
      </div>
    </header>

    <div class="search-layout">
      <!-- 사이드바 필터 -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2 class="sidebar-title">검색 필터</h2>
          <button class="btn-reset" @click="resetFilters">초기화</button>
        </div>

        <!-- 단지명 검색 -->
        <div class="filter-block">
          <label class="filter-title">단지명 검색</label>
          <input
            v-model="filters.name"
            type="text"
            class="form-input"
            placeholder="단지명으로 검색"
            @keyup.enter="doSearch"
          />
        </div>

        <!-- 주소 검색 -->
        <div class="filter-block">
          <label class="filter-title">주소 검색</label>
          <input
            v-model="filters.address"
            type="text"
            class="form-input"
            placeholder="주소 검색 (정확 일치)"
            @keyup.enter="doSearch"
          />
        </div>

        <!-- 매물 유형 -->
        <div class="filter-block">
          <label class="filter-title">매물 유형</label>
          <div class="check-group">
            <label
              v-for="t in propertyTypes"
              :key="t.value"
              class="check-label"
              :class="{ checked: filters.type === t.value }"
            >
              <input
                type="radio"
                name="type"
                :value="t.value"
                v-model="filters.type"
                class="check-input"
              />
              {{ t.label }}
            </label>
          </div>
        </div>

        <!-- 경매 상태 -->
        <div class="filter-block">
          <label class="filter-title">경매 상태</label>
          <div class="check-group">
            <label
              v-for="s in auctionStatuses"
              :key="s.value"
              class="check-label"
              :class="{ checked: filters.status === s.value }"
            >
              <input
                type="radio"
                name="status"
                :value="s.value"
                v-model="filters.status"
                class="check-input"
              />
              {{ s.label }}
            </label>
          </div>
        </div>

        <!-- 가격 범위 -->
        <div class="filter-block">
          <label class="filter-title">시작가 범위</label>
          <div class="price-row">
            <input
              v-model="filters.minPrice"
              type="number"
              class="form-input price-input"
              placeholder="최소"
              min="0"
            />
            <span class="price-sep">~</span>
            <input
              v-model="filters.maxPrice"
              type="number"
              class="form-input price-input"
              placeholder="최대"
              min="0"
            />
          </div>
          <div class="price-presets">
            <button
              v-for="p in pricePresets"
              :key="p.label"
              class="preset-chip"
              @click="applyPricePreset(p)"
            >
              {{ p.label }}
            </button>
          </div>
        </div>

        <!-- 입주 가능일 -->
        <div class="filter-block">
          <label class="filter-title">입주 가능일</label>
          <input
            v-model="filters.migrateDate"
            type="date"
            class="form-input"
          />
        </div>

        <!-- 건축 연도 -->
        <div class="filter-block">
          <label class="filter-title">건축 연도</label>
          <input
            v-model="filters.builtYear"
            type="number"
            class="form-input"
            placeholder="예: 2020"
            min="1970"
            max="2030"
          />
        </div>

        <button class="btn-search" @click="doSearch">검색하기</button>
      </aside>

      <!-- 결과 영역 -->
      <main class="results">
        <!-- 결과 헤더 -->
        <div class="results-header">
          <p class="results-count" v-if="!loading">
            검색 결과 <strong>{{ totalText }}</strong>
          </p>
          <div class="sort-group">
            <select v-model="sortOption" class="sort-select" @change="changeSort">
            <option value="newest">최신순</option>
              <option value="priceAsc">낮은 가격순</option>
              <option value="priceDesc">높은 가격순</option>
            </select>
          </div>
        </div>

        <!-- 적용된 필터 태그 -->
        <div v-if="activeTags.length" class="active-tags">
          <span v-for="tag in activeTags" :key="tag.key" class="tag">
            {{ tag.label }}
            <button class="tag-remove" @click="removeTag(tag.key)">&times;</button>
          </span>
        </div>

        <!-- 로딩 -->
        <div v-if="loading" class="state-box">매물을 불러오는 중...</div>

        <!-- 빈 결과 -->
        <div v-else-if="properties.length === 0" class="state-box">
          <p class="empty-icon">&#x1F50D;</p>
          <p>조건에 맞는 매물이 없습니다</p>
          <p class="empty-hint">필터 조건을 변경해 보세요</p>
        </div>

        <!-- 매물 리스트 -->
        <div v-else class="property-list">
          <a
              v-for="item in properties"
              :key="item.id"
              :href="'/property-detail.html?id=' + item.id"
              class="list-card"
          >
            <div class="list-thumb">
              <img
                  v-if="item.thumbnailImage"
                  :src="item.thumbnailImage"
                  :alt="item.name"
                  class="thumb-img"
              />
              <div v-else class="thumb-placeholder">&#x1F3E2;</div>
            </div>

            <div class="list-body">
              <h3 class="list-name">{{ item.name }}</h3>

              <p class="list-address">{{ item.address }}</p>

              <!-- 🔥 태그 위치 -->
              <div class="list-tags">
                <span class="tag-type">
                  {{ typeLabel(item.type) }}
                </span>

                <span
                    v-if="item.auction"
                    class="tag-status"
                    :class="badgeClass(item.auction.status)"
                >
                  {{ statusLabel(item.auction.status) }}
                </span>
              </div>

              <p v-if="item.description" class="list-desc">
                {{ item.description }}
              </p>
              <div class="list-bottom">
                <div class="price-block">
                  <span class="list-price-main">
                    실거래가 {{ formatPrice(item.price) }}
                  </span>
                  <span
                      v-if="item.auction"
                      class="list-auction-price"
                  >
                    경매 시작가 {{ formatPrice(item.auction.startPrice) }}
                  </span>
                </div>
                <span v-if="item.auction?.startedAt" class="list-date">
                  {{ formatDate(item.auction.startedAt) }}
                </span>
              </div>
            </div>
          </a>

        </div>

        <!-- 더보기 -->
        <div v-if="hasNext && !loading" class="load-more">
          <button class="btn-outline" :disabled="loadingMore" @click="loadMore">
            {{ loadingMore ? '불러오는 중...' : '더 보기' }}
          </button>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const propertyTypes = [
  { label: '전체', value: '' },
  { label: '아파트', value: 'APARTMENT' },
  { label: '빌라', value: 'VILLA' },
  { label: '오피스텔', value: 'OFFICETEL' },
]

const auctionStatuses = [
  { label: '전체', value: '' },
  { label: '경매 예정', value: 'SCHEDULED' },
  { label: '경매 중', value: 'OPEN' },
  { label: '경매 종료', value: 'CLOSED' },
]

const pricePresets = [
  { label: '1억 이하', min: 0, max: 100000000 },
  { label: '1~3억', min: 100000000, max: 300000000 },
  { label: '3~5억', min: 300000000, max: 500000000 },
  { label: '5~10억', min: 500000000, max: 1000000000 },
  { label: '10억 이상', min: 1000000000, max: '' },
]

const filters = ref({
  name: '',
  address: '',
  type: '',
  status: '',
  minPrice: '',
  maxPrice: '',
  migrateDate: '',
  builtYear: '',
})

const sortOption = ref('newest')
const properties = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const hasNext = ref(false)
const page = ref(0)
const totalCount = ref(0)
const isLoggedIn = ref(false)
const userName = ref('')
const totalText = computed(() => `${totalCount.value}건`)

const activeTags = computed(() => {
  const tags = []
  const f = filters.value
  if (f.type) {
    const t = propertyTypes.find((p) => p.value === f.type)
    if (t) tags.push({ key: 'type', label: t.label })
  }
  if (f.status) {
    const s = auctionStatuses.find((a) => a.value === f.status)
    if (s) tags.push({ key: 'status', label: s.label })
  }
  if (f.name) tags.push({ key: 'name', label: `"${f.name}"` })
  if (f.address) tags.push({ key: 'address', label: `주소: ${f.address}` })
  if (f.minPrice || f.maxPrice) {
    const min = f.minPrice ? formatPrice(f.minPrice) : '0'
    const max = f.maxPrice ? formatPrice(f.maxPrice) : '~'
    tags.push({ key: 'price', label: `${min} ~ ${max}` })
  }
  if (f.migrateDate) tags.push({ key: 'migrateDate', label: `입주 ${f.migrateDate}` })
  if (f.builtYear) tags.push({ key: 'builtYear', label: `${f.builtYear}년 건축` })
  return tags
})

onMounted(() => {
  checkAuth()
  parseUrlParams()
  doSearch()
})

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
  }
}

function logout() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  isLoggedIn.value = false
  userName.value = ''
}

function parseUrlParams() {
  const params = new URLSearchParams(window.location.search)
  if (params.get('name')) filters.value.name = params.get('name')
  if (params.get('keyword')) filters.value.name = params.get('keyword')
  if (params.get('address')) filters.value.address = params.get('address')
  if (params.get('type')) filters.value.type = params.get('type')
  if (params.get('status')) filters.value.status = params.get('status')
  if (params.get('minPrice')) filters.value.minPrice = params.get('minPrice')
  if (params.get('maxPrice')) filters.value.maxPrice = params.get('maxPrice')
  if (params.get('migrateDate')) filters.value.migrateDate = params.get('migrateDate')
  if (params.get('builtYear')) filters.value.builtYear = params.get('builtYear')
}

function buildParams() {
  const params = new URLSearchParams()
  const f = filters.value

  if (f.name) params.set('name', f.name)
  if (f.address) params.set('address', f.address)
  if (f.type) params.set('type', f.type)
  if (f.status) params.set('status', f.status)
  if (f.minPrice) params.set('minPrice', f.minPrice)
  if (f.maxPrice) params.set('maxPrice', f.maxPrice)
  if (f.migrateDate) params.set('migrateDate', f.migrateDate)
  if (f.builtYear) params.set('builtYear', f.builtYear)

  if (sortOption.value === 'priceAsc') {
    params.set('sort', 'price,asc')
  } else if (sortOption.value === 'priceDesc') {
    params.set('sort', 'price,desc')
  } else {
    params.set('sort', 'createdAt,desc')
  }

  params.set('page', String(page.value))
  params.set('size', '20')

  return params
}

function changeSort() {
  page.value = 0
  doSearch()
}

function updateUrl() {
  const params = new URLSearchParams()
  const f = filters.value
  if (f.name) params.set('name', f.name)
  if (f.address) params.set('address', f.address)
  if (f.type) params.set('type', f.type)
  if (f.status) params.set('status', f.status)
  if (f.minPrice) params.set('minPrice', f.minPrice)
  if (f.maxPrice) params.set('maxPrice', f.maxPrice)
  if (f.migrateDate) params.set('migrateDate', f.migrateDate)
  if (f.builtYear) params.set('builtYear', f.builtYear)
  const qs = params.toString()
  history.replaceState(null, '', qs ? `/search?${qs}` : '/search')
}

async function doSearch() {
  loading.value = true
  page.value = 0
  updateUrl()
  try {
    const params = buildParams()
    const res = await fetch(`/api/properties/v1/search?${params}`)
    const json = await res.json()
    if (json.success && json.data) {
      properties.value = json.data.content || []
      totalCount.value = json.data.totalElements || 0
      hasNext.value = (page.value + 1) < json.data.totalPages
    }

  } catch {
    properties.value = []
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  loadingMore.value = true
  page.value++
  try {
    const params = buildParams()
    const res = await fetch(`/api/properties/v1/search?${params}`)
    const json = await res.json()
    if (json.success && json.data) {
      properties.value.push(...(json.data.content || []))
      totalCount.value = json.data.totalElements || 0
      hasNext.value = (page.value + 1) < json.data.totalPages
    }

  } catch {
    /* ignore */
  } finally {
    loadingMore.value = false
  }
}

function resetFilters() {
  filters.value = {
    keyword: '',
    type: '',
    status: '',
    minPrice: '',
    maxPrice: '',
    migrateDate: '',
    builtYear: '',
  }
  doSearch()
}

function removeTag(key) {
  if (key === 'price') {
    filters.value.minPrice = ''
    filters.value.maxPrice = ''
  } else {
    filters.value[key] = ''
  }
  doSearch()
}

function applyPricePreset(p) {
  filters.value.minPrice = p.min
  filters.value.maxPrice = p.max
  doSearch()
}

function typeLabel(type) {
  const map = { APARTMENT: '아파트', VILLA: '빌라', OFFICETEL: '오피스텔' }
  return map[type] || type
}

function statusLabel(status) {
  const map = {
    SCHEDULED: '경매 예정',
    OPEN: '진행 중',
    CLOSED: '종료',
    FAILED: '유찰',
    CANCELLED: '취소',
  }
  return map[status] || status
}

function badgeClass(status) {
  return {
    'badge-scheduled': status === 'SCHEDULED',
    'badge-open': status === 'OPEN',
    'badge-closed': status === 'CLOSED' || status === 'FAILED' || status === 'CANCELLED',
  }
}

function formatPrice(price) {
  if (price === null || price === undefined) return ''

  const num = Math.floor(Number(price))

  if (num >= 100000000) {
    const eok = Math.floor(num / 100000000)
    const man = Math.floor((num % 100000000) / 10000)
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`
  }
  if (num >= 10000) {
    return `${Math.floor(num / 10000).toLocaleString()}만원`
  }
  return `${num.toLocaleString()}원`
}


function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
</script>

<style scoped>
/* ---------- 헤더 ---------- */
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
.btn-header-primary:hover { background: var(--color-primary-hover); }
.user-greeting {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

/* ---------- 레이아웃 ---------- */
.search-layout {
  display: flex;
  max-width: 1400px;
  margin: 0 auto;
  min-height: calc(100vh - 60px);
}

/* ---------- 사이드바 ---------- */
.sidebar {
  width: 300px;
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
  margin-bottom: 24px;
}
.filter-title {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 8px;
}

.check-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.check-label {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  font-size: 13px;
  color: var(--color-text-secondary);
  background: var(--color-input-bg);
  border: 1px solid transparent;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.15s;
}
.check-label:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.check-label.checked {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}
.check-input {
  display: none;
}

.price-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.price-input {
  flex: 1;
  min-width: 0;
}
.price-sep {
  color: var(--color-text-secondary);
  font-size: 14px;
}
.price-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.preset-chip {
  padding: 4px 10px;
  font-size: 12px;
  color: var(--color-text-secondary);
  background: var(--color-input-bg);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.preset-chip:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

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
  transition: background 0.2s;
}
.btn-search:hover { background: var(--color-primary-hover); }

/* ---------- 결과 영역 ---------- */
.results {
  flex: 1;
  padding: 24px;
  min-width: 0;
}
.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.results-count {
  font-size: 14px;
  color: var(--color-text-secondary);
}
.results-count strong {
  color: var(--color-text);
}
.sort-select {
  padding: 8px 12px;
  font-size: 13px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #fff;
  color: var(--color-text);
  cursor: pointer;
  outline: none;
}

/* ---------- 태그 ---------- */
.active-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}
.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-primary);
  background: #eaf3ff;
  border-radius: 14px;
}
.tag-remove {
  background: none;
  border: none;
  font-size: 14px;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

/* ---------- 리스트 카드 ---------- */
.property-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.list-card {
  display: flex;
  gap: 20px;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
  height: 190px;
}

.list-thumb {
  width: 240px;
  height: 100%;
  flex-shrink: 0;
  overflow: hidden;
}

.list-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 4px 16px rgba(49, 130, 246, 0.08);
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
.badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 6px;
  color: #fff;
}
.badge-scheduled { background: #6b7684; }
.badge-open { background: #2eb67d; }
.badge-closed { background: var(--color-error); }

.list-body {
  flex: 1;
  padding: 20px 20px 20px 0;
  display: flex;
  flex-direction: column;
}
.list-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.list-type {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-primary);
}
.list-name {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 4px;
}
.list-address {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}
.list-meta {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}
.meta-dot::before {
  content: '·';
  margin: 0 6px;
}
.list-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.list-bottom {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
.list-price {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text);
}
.list-date {
  font-size: 13px;
  color: var(--color-text-secondary);
}

/* ---------- 상태 ---------- */
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

/* ---------- 더보기 ---------- */
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
  transition: all 0.2s;
}
.btn-outline:hover:not(:disabled) {
  background: var(--color-primary);
  color: #fff;
}
.btn-outline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.list-tags {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  margin-bottom: 8px;
}

.tag-type {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  background: #eaf3ff;
  color: var(--color-primary);
  border-radius: 16px;
}

.tag-status {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 16px;
}

.badge-scheduled {
  background: #f2f4f6;
  color: #6b7684;
}

.badge-open {
  background: #e8f5e9;
  color: #2e7d32;
}

.badge-closed {
  background: #ffeef0;
  color: var(--color-error);
}

.price-block {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 52px;
}

.list-price-main {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
}

.list-auction-price {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
  opacity: 0.7;
}


/* ---------- 반응형 ---------- */
@media (max-width: 768px) {
  .search-layout {
    flex-direction: column;
  }
  .sidebar {
    width: 100%;
    height: auto;
    position: static;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }
  .list-card {
    flex-direction: column;
    min-height: 180px;
  }
  .list-thumb {
    width: 240px;
    height: 80px;
    flex-shrink: 0;
    overflow: hidden;
  }
  .thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;     /* 🔥 inline-img 여백 제거 */
  }
  .list-body {
    padding: 16px;
  }

}
</style>
