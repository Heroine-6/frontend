<template>
  <div class="page">
    <!-- 헤더 -->
    <header class="header">
      <div class="header-inner">
        <a href="/" class="logo">부동부동</a>
        <nav class="header-nav">
          <a href="/search.html" class="btn-text">매물 검색</a>
          <a href="/mypage.html" class="btn-text active">마이페이지</a>
          <span class="user-greeting">{{ userName }}님</span>
          <button class="btn-text" @click="logout">로그아웃</button>
        </nav>
      </div>
    </header>

    <!-- 마이페이지 컨텐츠 -->
    <div class="mypage-container">
      <div class="mypage-inner">
        <!-- 페이지 헤더 -->
        <div class="mypage-header">
          <div class="header-text">
            <h1 class="page-title">마이페이지</h1>
            <p class="page-subtitle">내 정보와 활동 내역을 확인하세요</p>
          </div>
          <button class="btn-chat-list" @click="goToChatServer">
            채팅 목록
          </button>
        </div>

        <!-- 3개의 큰 카드 -->
        <div class="cards-container">
          <!-- 결제 카드 -->
          <div class="main-card">
            <h2 class="card-title">결제</h2>
            <div class="card-content">
              <a href="/payments.html" class="menu-item">
                <span class="menu-text">내역 조회</span>
                <span class="menu-arrow">›</span>
              </a>
              <button class="menu-item" @click="handlePaymentPage">
                <span class="menu-text">계약금 결제</span>
                <span class="menu-arrow">›</span>
              </button>
              <button class="menu-item" @click="handlePaymentPage">
                <span class="menu-text">잔금 결제</span>
                <span class="menu-arrow">›</span>
              </button>
            </div>
          </div>

          <!-- 입찰 카드 -->
          <div class="main-card">
            <h2 class="card-title">입찰</h2>
            <div class="card-content">
              <a href="/bids.html" class="menu-item">
                <span class="menu-text">입찰 내역 조회</span>
                <span class="menu-arrow">›</span>
              </a>
              <a v-if="isSeller" href="/my-properties.html" class="menu-item">
                <span class="menu-text">내 매물 관리</span>
                <span class="menu-arrow">›</span>
              </a>
            </div>
          </div>

          <!-- 알림 카드 -->
          <div class="main-card">
            <h2 class="card-title">알림</h2>
            <div class="card-content">
              <!-- 알림 수신 동의 -->
              <div class="notification-toggle">
                <div class="toggle-info">
                  <span class="toggle-label">알림 수신 동의</span>
                  <span class="toggle-desc">카카오톡 알림 수신</span>
                </div>
                <label class="switch">
                  <input
                    type="checkbox"
                    v-model="notificationEnabled"
                    @change="toggleNotification"
                  />
                  <span class="slider"></span>
                </label>
              </div>

              <!-- 알림 내역 -->
              <div class="notification-list-section">
                <h3 class="section-label">알림 내역</h3>
                <div class="notification-list">
                  <div v-if="loading" class="loading-text">로딩 중...</div>
                  <div v-else-if="notifications.length === 0" class="empty-text">
                    알림이 없습니다
                  </div>
                  <div
                    v-else
                    v-for="notif in notifications"
                    :key="notif.id"
                    class="notification-item"
                  >
                    <div class="notif-dot"></div>
                    <div class="notif-content">
                      <p class="notif-title">{{ notif.title || '알림' }}</p>
                      <p class="notif-body">{{ formatContent(notif.content)  }}</p>
                      <p class="notif-date">{{ formatDate(notif.createdAt) }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getMyNotifications } from '../shared/api.js'

// 사용자 정보
const userName = ref('')
const isSeller = ref(false)

// 채팅 서버 URL
const chatServerUrl = 'https://chat.budongbudong.com'

// 알림 관련
const notificationEnabled = ref(true)
const notifications = ref([])
const loading = ref(false)

// 사용자 이름 및 알림 불러오기
onMounted(async () => {
  const token = localStorage.getItem('accessToken')
  if (!token) {
    alert('로그인이 필요합니다')
    window.location.href = '/signin.html'
    return
  }

  // JWT 디코딩
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    userName.value = payload.username || payload.userEmail || ''

    // seller 역할 확인
    const role = (payload.userRole || '').toUpperCase()
    isSeller.value = role.includes('SELLER') || role.includes('ADMIN')

    // 토큰 만료 확인
    const exp = payload.exp * 1000
    if (Date.now() >= exp) {
      alert('로그인이 만료되었습니다. 다시 로그인해주세요.')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      window.location.href = '/signin.html'
      return
    }
  } catch (e) {
    console.error('토큰 파싱 실패:', e)
  }

  // 알림 내역 불러오기
  await loadNotifications()
})

// 알림 내역 불러오기
async function loadNotifications() {
  loading.value = true
  try {
    const res = await getMyNotifications(0, 10)

    if (res.data && Array.isArray(res.data.content)) {
      notifications.value = res.data.content
    } else if (res.data && Array.isArray(res.data)) {
      notifications.value = res.data
    } else if (Array.isArray(res.content)) {
      notifications.value = res.content
    } else {
      notifications.value = []
    }
  } catch (e) {
    console.error('알림 불러오기 실패:', e)
    notifications.value = []
  } finally {
    loading.value = false
  }
}

function formatContent(content) {
  return content.replace(/\\n/g, '\n')
}

// 날짜 포맷
function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

// 채팅 서버로 이동
function goToChatServer() {
  window.open(chatServerUrl, '_blank')
}

// 알림 토글
function toggleNotification() {
  console.log('알림 설정:', notificationEnabled.value)
  // TODO: API 호출하여 설정 저장
}

// 결제 관리 페이지 (구현 예정)
function handlePaymentPage() {
  alert('결제 관리 페이지 (구현 예정)')
}

// 로그아웃
function logout() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  window.location.href = '/signin.html'
}
</script>

<style scoped>
/* 전역 */
* {
  box-sizing: border-box;
}

.page {
  min-height: 100vh;
  background: var(--color-bg);
}

/* 헤더 */
.header {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  max-width: 1400px;
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

.btn-text:hover,
.btn-text.active {
  color: var(--color-primary);
}

.user-greeting {
  font-size: 14px;
  color: var(--color-text);
  font-weight: 600;
}

/* 마이페이지 컨테이너 */
.mypage-container {
  padding: 40px 24px;
}

.mypage-inner {
  max-width: 1400px;
  margin: 0 auto;
}

/* 페이지 헤더 */
.mypage-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.header-text {
  flex: 1;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--color-text);
}

.page-subtitle {
  font-size: 16px;
  color: var(--color-text-secondary);
}

.btn-chat-list {
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-primary);
  background: var(--color-surface);
  border: 2px solid var(--color-primary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-chat-list:hover {
  background: var(--color-primary);
  color: #ffffff;
}

/* 카드 컨테이너 */
.cards-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

/* 메인 카드 */
.main-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  min-height: 400px;
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 20px;
  font-weight: 700;
  padding: 24px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  margin: 0;
}

.card-content {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 메뉴 아이템 */
.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  margin-bottom: 8px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  text-decoration: none;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  text-align: left;
}

.menu-item:hover {
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.menu-text {
  font-size: 15px;
  font-weight: 500;
}

.menu-arrow {
  font-size: 24px;
  color: var(--color-text-secondary);
}

/* 알림 토글 */
.notification-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  margin-bottom: 16px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.toggle-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toggle-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.toggle-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
}

/* 스위치 */
.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-border);
  transition: 0.3s;
  border-radius: 28px;
}

.slider:before {
  position: absolute;
  content: '';
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--color-primary);
}

input:checked + .slider:before {
  transform: translateX(22px);
}

/* 알림 내역 리스트 섹션 */
.notification-list-section {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.section-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
}

.notification-list {
  flex: 1;
  max-height: 400px;
  overflow-y: auto;
  padding: 12px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.loading-text,
.empty-text {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.notification-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  transition: background 0.2s;
}

.notification-item:hover {
  background: var(--color-bg);
}

.notification-item:last-child {
  margin-bottom: 0;
}

.notif-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  flex-shrink: 0;
  margin-top: 6px;
}

.notif-content {
  flex: 1;
  min-width: 0;
}

.notif-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--color-text);
}

.notif-body {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
  word-wrap: break-word;
  white-space: pre-line;
}


.notif-date {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* 반응형 */
@media (max-width: 1024px) {
  .cards-container {
    grid-template-columns: 1fr;
  }

  .main-card {
    min-height: auto;
  }

  .notification-list {
    max-height: 300px;
  }
}

@media (max-width: 768px) {
  .mypage-header {
    flex-direction: column;
    gap: 16px;
  }

  .btn-chat-list {
    width: 100%;
  }

  .page-title {
    font-size: 24px;
  }

  .header-nav {
    gap: 12px;
  }

  .btn-text {
    font-size: 14px;
  }
}
</style>
