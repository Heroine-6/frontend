<template>
  <AppLayout>
    <!-- 컨텐츠 -->
    <div class="container">
      <div class="form-wrapper">
        <h1 class="page-title">경매 등록</h1>
        <p class="page-desc" v-if="propertyName">매물: {{ propertyName }}</p>

        <!-- 경매 방식 탭 -->
        <div class="tab-group">
          <label class="tab-label">경매 방식</label>
          <div class="tabs">
            <button
              class="tab"
              :class="{ active: auctionType === 'ASCENDING' }"
              @click="auctionType = 'ASCENDING'"
            >
              공개 상향 경매
            </button>
            <button
              class="tab"
              :class="{ active: auctionType === 'DESCENDING' }"
              @click="auctionType = 'DESCENDING'"
            >
              공개 하향 경매
            </button>
          </div>
        </div>

        <!-- 공개 상향 경매 -->
        <div v-if="auctionType === 'ASCENDING'" class="form-card">
          <h2 class="card-title">공개 상향 경매</h2>
          <p class="card-notice">최소 입찰 단위는 시세의 15% 이내에서 입력 가능합니다</p>

          <div class="form-body">
            <div class="form-group">
              <label class="form-label">경매 시작일</label>
              <input
                v-model="ascending.startDate"
                type="date"
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label class="form-label">경매 종료일</label>
              <input
                v-model="ascending.endDate"
                type="date"
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label class="form-label">경매 시작 가격</label>
              <div class="input-with-unit">
                <input
                  v-model="ascending.startPrice"
                  type="text"
                  class="form-input"
                  placeholder="0"
                  @input="formatPriceInput($event, 'ascending', 'startPrice')"
                />
                <span class="unit">원</span>
              </div>
            </div>

            <button
              class="btn-submit"
              :disabled="submitting"
              @click="submitAscending"
            >
              {{ submitting ? '등록 중...' : '등록' }}
            </button>
          </div>
        </div>

        <!-- 공개 하향 경매 -->
        <div v-if="auctionType === 'DESCENDING'" class="form-card">
          <h2 class="card-title">공개 하향 경매</h2>
          <p class="card-notice">공개 하향 경매의 기간은 1일입니다</p>

          <div class="form-body">
            <div class="form-group">
              <label class="form-label">경매 시작일</label>
              <input
                v-model="descending.startDate"
                type="date"
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label class="form-label">경매 시작 가격</label>
              <div class="input-with-unit">
                <input
                  v-model="descending.startPrice"
                  type="text"
                  class="form-input"
                  placeholder="0"
                  @input="formatPriceInput($event, 'descending', 'startPrice')"
                />
                <span class="unit">원</span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">감가율</label>
              <div class="input-with-unit">
                <input
                  v-model="descending.depreciationRate"
                  type="number"
                  class="form-input"
                  placeholder="0"
                  min="1"
                  max="100"
                />
                <span class="unit">%</span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">하한가</label>
              <div class="input-with-unit">
                <input
                  v-model="descending.floorPrice"
                  type="text"
                  class="form-input"
                  placeholder="0"
                  @input="formatPriceInput($event, 'descending', 'floorPrice')"
                />
                <span class="unit">원</span>
              </div>
            </div>

            <button
              class="btn-submit"
              :disabled="submitting"
              @click="submitDescending"
            >
              {{ submitting ? '등록 중...' : '등록' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { createAuction, createDutchAuction } from '../shared/api.js'
import AppLayout from "../components/AppLayout.vue";

const userName = ref('')
const propertyId = ref(null)
const propertyName = ref('')
const auctionType = ref('ASCENDING')
const submitting = ref(false)

const ascending = ref({
  startDate: '',
  endDate: '',
  startPrice: '',
})

const descending = ref({
  startDate: '',
  depreciationRate: '',
  startPrice: '',
  floorPrice: '',
})

onMounted(() => {
  const token = localStorage.getItem('accessToken')
  if (!token) {
    alert('로그인이 필요합니다')
    window.location.href = '/signin.html'
    return
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    userName.value = payload.username || payload.userEmail || ''

    // 토큰 만료 확인
    const exp = payload.exp * 1000
    if (Date.now() >= exp) {
      alert('로그인이 만료되었습니다. 다시 로그인해주세요.')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      window.location.href = '/signin.html'
      return
    }

    const role = (payload.userRole || '').toUpperCase()
    if (!role.includes('SELLER') && !role.includes('ADMIN')) {
      alert('판매자만 접근 가능합니다')
      window.location.href = '/mypage.html'
      return
    }
  } catch (e) {
    console.error('토큰 파싱 실패:', e)
  }

  // URL에서 propertyId 가져오기
  const params = new URLSearchParams(window.location.search)
  propertyId.value = params.get('propertyId')
  propertyName.value = params.get('propertyName') || ''
})

// 가격 입력 포맷팅 (콤마 추가)
function formatPriceInput(event, formRef, field) {
  const raw = event.target.value.replace(/,/g, '')
  if (raw === '' || isNaN(raw)) {
    if (formRef === 'ascending') ascending.value[field] = ''
    else descending.value[field] = ''
    return
  }
  const formatted = Number(raw).toLocaleString()
  if (formRef === 'ascending') ascending.value[field] = formatted
  else descending.value[field] = formatted
}

function parsePriceValue(str) {
  if (!str) return 0
  return Number(String(str).replace(/,/g, ''))
}

// 상향 경매 등록
async function submitAscending() {
  const { startDate, endDate, startPrice } = ascending.value
  const price = parsePriceValue(startPrice)

  if (!startDate) return alert('경매 시작일을 입력해주세요')
  if (!endDate) return alert('경매 종료일을 입력해주세요')
  if (startDate >= endDate) return alert('종료일은 시작일 이후여야 합니다')
  if (!price || price <= 0) return alert('경매 시작 가격을 입력해주세요')

  submitting.value = true
  try {
    await createAuction({
      propertyId: Number(propertyId.value),
      startPrice: price,
      startedAt: startDate + 'T00:00:00',
      endedAt: endDate + 'T23:59:59',
    })
    alert('경매가 등록되었습니다!')
    window.location.href = '/my-properties.html'
  } catch (e) {
    alert('경매 등록 실패: ' + e.message)
  } finally {
    submitting.value = false
  }
}

// 하향 경매 등록
async function submitDescending() {
  const { startDate, startPrice, depreciationRate, floorPrice } = descending.value
  const price = parsePriceValue(startPrice)
  const floor = parsePriceValue(floorPrice)
  const rate = Number(depreciationRate)

  if (!startDate) return alert('경매 시작일을 입력해주세요')
  if (!price || price <= 0) return alert('경매 시작 가격을 입력해주세요')
  if (!rate || rate <= 0 || rate > 100) return alert('감가율을 1~100 사이로 입력해주세요')
  if (!floor || floor <= 0) return alert('하한가를 입력해주세요')
  if (floor >= price) return alert('하한가는 시작 가격보다 낮아야 합니다')

  submitting.value = true
  try {
    await createDutchAuction({
      propertyId: Number(propertyId.value),
      startedAt: startDate + 'T00:00:00',
      startPrice: price,
      decreaseRate: rate,
      endPrice: floor,
    })
    alert('경매가 등록되었습니다!')
    window.location.href = '/my-properties.html'
  } catch (e) {
    alert('경매 등록 실패: ' + e.message)
  } finally {
    submitting.value = false
  }
}

function logout() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  window.location.href = '/signin.html'
}
</script>

<style scoped>
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
  padding: 0 24px;
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.btn-text:hover {
  color: var(--color-text);
}

.user-greeting {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

/* 컨텐츠 */
.container {
  max-width: 640px;
  margin: 0 auto;
  padding: 40px 24px;
}

.form-wrapper {
  width: 100%;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 4px;
}

.page-desc {
  font-size: 15px;
  color: var(--color-text-secondary);
  margin-bottom: 32px;
}

/* 탭 */
.tab-group {
  margin-bottom: 24px;
}

.tab-label {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 10px;
}

.tabs {
  display: flex;
  border: 2px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
}

.tab {
  flex: 1;
  padding: 14px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.tab + .tab {
  border-left: 2px solid var(--color-border);
}

.tab.active {
  background: #fff0f0;
  color: #e5503c;
  border-color: #e5503c;
}

.tab:not(.active):hover {
  background: var(--color-bg);
}

/* 폼 카드 */
.form-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  padding: 24px 24px 0;
  color: var(--color-text);
}

.card-notice {
  font-size: 13px;
  color: #e5503c;
  padding: 8px 24px 0;
}

.form-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px 14px;
  font-size: 15px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text);
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: var(--color-primary);
}

.input-with-unit {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-with-unit .form-input {
  flex: 1;
  text-align: right;
}

.unit {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  min-width: 24px;
}

/* 등록 버튼 */
.btn-submit {
  width: 100%;
  padding: 16px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  background: #e5503c;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  margin-top: 8px;
  transition: background 0.2s;
}

.btn-submit:hover:not(:disabled) {
  background: #cc3a28;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 반응형 */
@media (max-width: 768px) {
  .container {
    padding: 24px 16px;
  }

  .page-title {
    font-size: 22px;
  }

  .header-nav {
    gap: 4px;
  }

  .btn-text {
    font-size: 13px;
    padding: 6px 8px;
  }
}
</style>
