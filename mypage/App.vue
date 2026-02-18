<template>
  <AppLayout>
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
          <div v-if="isGeneral" class="main-card">
            <h2 class="card-title">결제</h2>
            <div class="card-content">
              <a href="/payments.html" class="menu-item">
                <span class="menu-text">내역 조회</span>
                <span class="menu-arrow">›</span>
              </a>
              <a href="/payment-checkout?type=DOWN_PAYMENT" class="menu-item">
                <span class="menu-text">계약금 결제</span>
                <span class="menu-arrow">›</span>
              </a>
              <a href="/payment-checkout?type=BALANCE" class="menu-item">
                <span class="menu-text">잔금 결제</span>
                <span class="menu-arrow">›</span>
              </a>
            </div>
          </div>

          <!-- 입찰 카드 -->
          <div class="main-card">
            <h2 class="card-title">{{ isSeller && !isGeneral ? '매물 관리' : '입찰' }}</h2>
            <div class="card-content">
              <a v-if="isGeneral" href="/bids.html" class="menu-item">
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
              <!-- 카카오 연동 -->
              <div class="kakao-link-section">
                <div v-if="kakaoLinkSuccess" class="alert-banner success">
                  카카오 계정이 연동되었습니다!
                </div>
                <div v-if="kakaoLinkError" class="alert-banner error">
                  {{ kakaoLinkError }}
                </div>
                <div class="toggle-info" style="margin-bottom: 12px">
                  <span class="toggle-label">카카오톡 연동</span>
                  <span class="toggle-desc">연동하면 카카오톡으로 알림을 받을 수 있어요</span>
                </div>
                <div v-if="kakaoLinked" class="kakao-linked-badge">
                  <span class="linked-dot"></span> 연동 완료
                </div>
                <button v-else class="btn-kakao" :disabled="kakaoLinking" @click="startKakaoLink">
                  <svg class="kakao-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.48 3 2 6.58 2 10.94c0 2.8 1.86 5.27 4.66 6.67-.15.56-.96 3.6-.99 3.83 0 0-.02.17.09.24.11.06.24.01.24.01.32-.04 3.7-2.44 4.28-2.86.55.08 1.13.12 1.72.12 5.52 0 10-3.58 10-7.94C22 6.58 17.52 3 12 3"/></svg>
                  {{ kakaoLinking ? '연동 중...' : '카카오 계정 연동하기' }}
                </button>
              </div>

              <div class="section-divider"></div>

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
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getMyNotifications, linkKakao, getMyProfile } from '../shared/api.js'
import AppLayout from '../components/AppLayout.vue'

const KAKAO_CLIENT_ID = '9134d431a52486f652c7c83e9156d009'

// 사용자 정보
const userName = ref('')
const isSeller = ref(false)
const isGeneral = ref(false)

// 채팅 페이지 경로
const chatPageUrl = '/chat.html'

// 카카오 연동
const kakaoLinked = ref(false)
const kakaoLinking = ref(false)
const kakaoLinkSuccess = ref(false)
const kakaoLinkError = ref('')

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
    const payload = decodeJwtPayload(token)
    userName.value = payload.username || payload.userEmail || ''
    applyRoleFlags(extractRoles(payload))
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

  // 서버 프로필 기준으로 역할 보정
  try {
    const me = await getMyProfile()
    const profile = me?.data || {}
    const roles = extractRoles(profile)
    if (roles.length) applyRoleFlags(roles)
    if (!userName.value) {
      userName.value = profile.name || profile.username || profile.userEmail || ''
    }
  } catch {
    /* ignore */
  }

  // URL에 code 파라미터가 있으면 카카오 연동 처리
  const urlParams = new URLSearchParams(window.location.search)
  const code = urlParams.get('code')
  if (code) {
    await handleKakaoCallback(code)
  }

  // 알림 내역 불러오기
  await loadNotifications()
})

function decodeJwtPayload(token) {
  const raw = token.startsWith('Bearer ') ? token.slice(7) : token
  const base64 = raw.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}

function extractRoles(obj) {
  const direct = [obj?.userRole, obj?.role, obj?.userType].filter(Boolean)
  const roles = Array.isArray(obj?.roles) ? obj.roles : []
  const authorities = Array.isArray(obj?.authorities) ? obj.authorities : []
  return [...direct, ...roles, ...authorities]
    .map((v) => (typeof v === 'string' ? v : v?.authority || v?.role || ''))
    .filter(Boolean)
    .map((v) => v.toUpperCase())
}

function applyRoleFlags(roleList) {
  const joined = roleList.join(',')
  isSeller.value = joined.includes('SELLER') || joined.includes('ADMIN')
  isGeneral.value = joined.includes('GENERAL') || joined.includes('USER')
}

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

// 채팅 페이지로 이동
function goToChatServer() {
  window.location.href = chatPageUrl
}

// 알림 토글
function toggleNotification() {
  console.log('알림 설정:', notificationEnabled.value)
  // TODO: API 호출하여 설정 저장
}

// 카카오 연동 시작
function startKakaoLink() {
  const redirectUri = encodeURIComponent(window.location.origin + '/mypage.html')
  const url = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=talk_message`
  window.location.href = url
}

// 카카오 콜백 처리
async function handleKakaoCallback(code) {
  kakaoLinking.value = true
  kakaoLinkError.value = ''
  try {
    const redirectUri = window.location.origin + '/mypage.html'
    await linkKakao(code, redirectUri)
    kakaoLinked.value = true
    kakaoLinkSuccess.value = true
  } catch (e) {
    kakaoLinkError.value = e.message
  } finally {
    kakaoLinking.value = false
    window.history.replaceState({}, '', '/mypage.html')
  }
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
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
  justify-content: center;
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

/* 카카오 연동 */
.kakao-link-section {
  padding: 16px;
  margin-bottom: 16px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.btn-kakao {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #191919;
  background: #FEE500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-kakao:hover:not(:disabled) {
  background: #e6cf00;
}

.btn-kakao:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.kakao-icon {
  width: 18px;
  height: 18px;
}

.kakao-linked-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  background: #e8f5e9;
  color: #1b5e20;
}

.linked-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2eb67d;
}

.alert-banner {
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 12px;
}

.alert-banner.success {
  background: #e8f5e9;
  color: #1b5e20;
  border: 1px solid #a5d6a7;
}

.alert-banner.error {
  background: #ffeef0;
  color: #e5503c;
  border: 1px solid #f5c6cb;
}

.section-divider {
  height: 1px;
  background: var(--color-border);
  margin: 16px 0;
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
  transition: background-color 0.2s;
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
