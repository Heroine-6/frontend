<template>
  <AppLayout>

    <!-- 로딩 -->
    <div v-if="loading" class="state-box">매물 정보를 불러오는 중...</div>

    <!-- 에러 -->
    <div v-else-if="error" class="state-box">
      <p class="empty-icon">&#x26A0;</p>
      <p>{{ error }}</p>
      <button class="btn-back" @click="goBack">목록으로 돌아가기</button>
    </div>

    <!-- 매물 상세 -->
    <div v-else-if="property" class="detail-container">
      <!-- 이미지 갤러리 -->
      <section class="gallery-section">
        <div class="gallery" v-if="property.images && property.images.length">
          <div class="gallery-main">
            <img :src="property.images[currentImage]" :alt="property.name" class="gallery-img" />
            <button
              v-if="property.images.length > 1"
              class="gallery-arrow gallery-prev"
              @click="prevImage"
            >&lsaquo;</button>
            <button
              v-if="property.images.length > 1"
              class="gallery-arrow gallery-next"
              @click="nextImage"
            >&rsaquo;</button>
            <span class="gallery-counter">{{ currentImage + 1 }} / {{ property.images.length }}</span>
          </div>
          <div v-if="property.images.length > 1" class="gallery-thumbs">
            <img
              v-for="(img, idx) in property.images"
              :key="idx"
              :src="img"
              :alt="`사진 ${idx + 1}`"
              class="gallery-thumb"
              :class="{ active: idx === currentImage }"
              @click="currentImage = idx"
            />
          </div>
        </div>
        <div v-else class="gallery-placeholder">&#x1F3E2;</div>
      </section>

      <!-- 매물 정보 -->
      <section class="info-section">
        <div class="info-header">
          <div>
            <div class="info-badges">
              <span class="type-badge">{{ typeLabel(property.type) }}</span>
              <span v-if="property.status" class="status-badge" :class="statusClass(property.status)">
                {{ statusLabel(property.status) }}
              </span>
            </div>
            <h1 class="info-name">{{ property.name }}</h1>
            <p class="info-address">{{ property.address }}</p>
          </div>
          <div class="info-price" v-if="property.price">
            {{ formatPrice(property.price) }}
          </div>
        </div>

        <!-- 상세 스펙 -->
        <div class="spec-grid">
          <div class="spec-item" v-if="property.supplyArea">
            <span class="spec-label">공급면적</span>
            <span class="spec-value">{{ property.supplyArea }}m&sup2;</span>
          </div>
          <div class="spec-item" v-if="property.privateArea">
            <span class="spec-label">전용면적</span>
            <span class="spec-value">{{ property.privateArea }}m&sup2;</span>
          </div>
          <div class="spec-item" v-if="property.floor">
            <span class="spec-label">층수</span>
            <span class="spec-value">{{ property.floor }}층 / {{ property.totalFloor || '-' }}층</span>
          </div>
          <div class="spec-item" v-if="property.roomCount">
            <span class="spec-label">방 수</span>
            <span class="spec-value">{{ property.roomCount }}개</span>
          </div>
          <div class="spec-item" v-if="property.builtYear">
            <span class="spec-label">건축연도</span>
            <span class="spec-value">{{ property.builtYear }}년</span>
          </div>
          <div class="spec-item" v-if="property.migratedDate">
            <span class="spec-label">입주가능일</span>
            <span class="spec-value">{{ formatDate(property.migratedDate) }}</span>
          </div>
        </div>

        <!-- 설명 -->
        <div v-if="property.description" class="desc-section">
          <h2 class="section-title">매물 설명</h2>
          <p class="desc-text">{{ property.description }}</p>
        </div>

        <!-- 하단 액션 -->
        <div class="action-bar">
          <button class="btn-back-outline" @click="goBack">이전으로</button>
          <button v-if="userRole === 'GENERAL'" class="btn-inquiry" @click="goToChat">문의하기</button>
        </div>
      </section>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getPropertyDetail } from '../shared/api.js'
import AppLayout from "../components/AppLayout.vue";

const property = ref(null)
const loading = ref(true)
const error = ref('')
const currentImage = ref(0)
const isLoggedIn = ref(false)
const userName = ref('')
const userRole = ref('')

onMounted(() => {
  checkAuth()
  loadProperty()
})

function checkAuth() {
  const token = localStorage.getItem('accessToken')
  if (!token) return
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    isLoggedIn.value = true
    userName.value = payload.username || payload.userEmail || ''
    userRole.value = (payload.userRole || '').toUpperCase()
    console.log('userRole:', userRole.value)
  } catch (e) {
    console.error('토큰 파싱 실패:', e)
    isLoggedIn.value = false
  }
}

function logout() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  isLoggedIn.value = false
  userName.value = ''
}

async function loadProperty() {
  const params = new URLSearchParams(window.location.search)
  const id = params.get('id') || params.get('propertyId')
  if (!id) {
    error.value = '매물 ID가 없습니다.'
    loading.value = false
    return
  }
  try {
    const res = await getPropertyDetail(id)
    property.value = res.data
  } catch (e) {
    error.value = e.message || '매물 정보를 불러올 수 없습니다.'
  } finally {
    loading.value = false
  }
}

function prevImage() {
  const len = property.value.images.length
  currentImage.value = (currentImage.value - 1 + len) % len
}

function nextImage() {
  const len = property.value.images.length
  currentImage.value = (currentImage.value + 1) % len
}

function goBack() {
  window.history.back()
}

function goToChat() {
  const token = localStorage.getItem('accessToken')
  if (!token) {
    alert('로그인이 필요합니다.')
    window.location.href = '/signin.html'
    return
  }
  const params = new URLSearchParams(window.location.search)
  const pid = params.get('id') || params.get('propertyId')
  window.location.href = `/chat.html?propertyId=${pid}`
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

function statusClass(status) {
  return {
    'status-scheduled': status === 'SCHEDULED',
    'status-open': status === 'OPEN',
    'status-closed': status === 'CLOSED' || status === 'FAILED' || status === 'CANCELLED',
  }
}

function formatPrice(price) {
  if (!price) return ''
  const num = Number(price)
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
.nav-link:hover { color: var(--color-primary); }
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

/* ---------- 상태 ---------- */
.state-box {
  text-align: center;
  padding: 80px 24px;
  color: var(--color-text-secondary);
  font-size: 15px;
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.btn-back {
  margin-top: 16px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
  background: none;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius);
  cursor: pointer;
}
.btn-back:hover {
  background: var(--color-primary);
  color: #fff;
}

/* ---------- 상세 컨테이너 ---------- */
.detail-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 24px 64px;
}

/* ---------- 이미지 갤러리 ---------- */
.gallery-section {
  margin-bottom: 32px;
}
.gallery-main {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #e8edf3;
  border-radius: 12px;
  overflow: hidden;
}
.gallery-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.gallery-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  border: none;
  border-radius: 50%;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.gallery-arrow:hover { background: rgba(0, 0, 0, 0.6); }
.gallery-prev { left: 12px; }
.gallery-next { right: 12px; }
.gallery-counter {
  position: absolute;
  bottom: 12px;
  right: 12px;
  padding: 4px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 16px;
}
.gallery-thumbs {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.gallery-thumb {
  width: 72px;
  height: 54px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  opacity: 0.6;
  transition: all 0.2s;
  flex-shrink: 0;
}
.gallery-thumb.active,
.gallery-thumb:hover {
  border-color: var(--color-primary);
  opacity: 1;
}
.gallery-placeholder {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #e8edf3;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 72px;
}

/* ---------- 매물 정보 ---------- */
.info-section {
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 32px;
}
.info-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 28px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--color-border);
}
.info-badges {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.type-badge {
  display: inline-block;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-primary);
  background: #eaf3ff;
  border-radius: 6px;
}
.status-badge {
  display: inline-block;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  border-radius: 6px;
}
.status-scheduled { background: #6b7684; }
.status-open { background: #2eb67d; }
.status-closed { background: var(--color-error); }

.info-name {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text);
  margin-bottom: 6px;
}
.info-address {
  font-size: 15px;
  color: var(--color-text-secondary);
}
.info-price {
  font-size: 28px;
  font-weight: 800;
  color: var(--color-text);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ---------- 스펙 그리드 ---------- */
.spec-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 28px;
}
.spec-item {
  padding: 16px;
  background: var(--color-input-bg);
  border-radius: 10px;
}
.spec-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}
.spec-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
}

/* ---------- 설명 ---------- */
.desc-section {
  margin-bottom: 28px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}
.section-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 12px;
}
.desc-text {
  font-size: 15px;
  color: var(--color-text-secondary);
  line-height: 1.7;
  white-space: pre-wrap;
}

/* ---------- 하단 액션 ---------- */
.action-bar {
  display: flex;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}
.btn-back-outline {
  flex: 1;
  padding: 14px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
}
.btn-back-outline:hover {
  border-color: var(--color-text-secondary);
  color: var(--color-text);
}
.btn-inquiry {
  flex: 2;
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
.btn-inquiry:hover { background: var(--color-primary-hover); }

/* ---------- 반응형 ---------- */
@media (max-width: 768px) {
  .detail-container {
    padding: 20px 16px 48px;
  }
  .info-header {
    flex-direction: column;
    gap: 12px;
  }
  .info-price {
    font-size: 22px;
  }
  .spec-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .info-section {
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .spec-grid {
    grid-template-columns: 1fr;
  }
}
</style>
