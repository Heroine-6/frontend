<template>
  <AppLayout>
    <!-- 입찰 내역 컨텐츠 -->
    <div class="bids-container">
      <div class="bids-inner">
        <!-- 페이지 타이틀 -->
        <div class="page-header">
          <h1 class="page-title">🏷️ 입찰 내역</h1>
          <p class="page-subtitle">내가 참여한 모든 입찰 내역을 확인하세요</p>
        </div>

        <!-- 입찰 내역 테이블 -->
        <div class="bids-section">
          <div v-if="loading" class="loading-state">로딩 중...</div>
          <div v-else-if="bids.length === 0" class="empty-state">
            <p class="empty-icon">📝</p>
            <p>입찰 내역이 없습니다</p>
          </div>
          <div v-else class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>매물명</th>
                  <th>입찰 금액</th>
                  <th>입찰 일시</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(bid, index) in bids" :key="`bid-${index}-${bid.price}`">
                  <td class="td-bold">{{ bid.propertyName }}</td>
                  <td class="td-price">{{ formatPrice(bid.price) }}원</td>
                  <td class="td-date">{{ formatDate(bid.endedAt) }}</td>
                  <td>
                    <span class="badge" :class="bidStatusClass(bid.status)">
                      {{ bidStatusLabel(bid.status) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getMyBids } from '../shared/api.js'
import AppLayout from "../components/AppLayout.vue";

const userName = ref('사용자')
const loading = ref(false)
const bids = ref([])

onMounted(async () => {
  const token = localStorage.getItem('accessToken')
  if (!token) {
    alert('로그인이 필요합니다')
    window.location.href = '/signin.html'
    return
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    userName.value = payload.name || '사용자'
  } catch (e) {
    console.error('토큰 파싱 실패:', e)
  }

  await loadBids()
})

async function loadBids() {
  loading.value = true
  try {
    const res = await getMyBids(0, 100)
    if (res.data && Array.isArray(res.data.content)) {
      bids.value = res.data.content
    } else if (res.data && Array.isArray(res.data)) {
      bids.value = res.data
    } else if (Array.isArray(res.content)) {
      bids.value = res.content
    } else {
      bids.value = []
    }
  } catch (e) {
    console.error('입찰 내역 불러오기 실패:', e)
    bids.value = []
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

function formatPrice(price) {
  if (!price) return '0'
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function bidStatusLabel(status) {
  const labels = {
    WINNING: '낙찰 예상',
    OUTBID: '입찰 실패',
    PENDING: '대기중',
    ACCEPTED: '낙찰',
    REJECTED: '유찰'
  }
  return labels[status] || status
}

function bidStatusClass(status) {
  return {
    'badge-success': status === 'WINNING' || status === 'ACCEPTED',
    'badge-error': status === 'OUTBID' || status === 'REJECTED',
    'badge-warning': status === 'PENDING'
  }
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

/* 입찰 내역 컨테이너 */
.bids-container {
  background: var(--color-bg);
  min-height: calc(100vh - 64px);
  padding: 40px 24px;
}

.bids-inner {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
}

.page-subtitle {
  font-size: 16px;
  color: var(--color-text-secondary);
}

/* 입찰 섹션 */
.bids-section {
  background: var(--color-surface);
  border-radius: 16px;
  box-shadow: var(--shadow);
  padding: 32px;
}

/* 테이블 */
.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 16px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.data-table th {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-bg);
}

.data-table td {
  font-size: 15px;
}

.td-bold {
  font-weight: 600;
}

.td-price {
  font-weight: 700;
  color: var(--color-primary);
}

.td-date {
  color: var(--color-text-secondary);
}

/* 배지 */
.badge {
  display: inline-block;
  padding: 4px 10px;
  font-size: 12px;
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

/* 반응형 */
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

  .data-table {
    font-size: 13px;
  }

  .data-table th,
  .data-table td {
    padding: 12px 8px;
  }
}
</style>
