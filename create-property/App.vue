<template>
  <AppLayout>
    <!-- 권한 없음 -->
    <div v-if="!authorized" class="access-denied">
      <p class="denied-icon">🔒</p>
      <h2>접근 권한이 없습니다</h2>
      <p>판매자 계정으로 로그인해주세요</p>
      <a href="/signin.html" class="btn-go-login">로그인 페이지로</a>
    </div>

    <!-- 컨텐츠 -->
    <div v-else class="container">
      <a href="/my-properties.html" class="back-link">&larr; 내 매물 관리</a>

      <div class="page-header">
        <h1 class="page-title">매물 등록</h1>
        <p class="page-subtitle">판매할 부동산 정보를 입력해 주세요</p>
      </div>

      <!-- 알림 -->
      <div v-if="successMsg" class="alert alert-success">{{ successMsg }}</div>
      <div v-if="errorMsg" class="alert alert-error">{{ errorMsg }}</div>

      <!-- STEP 1: 매물 조회 -->
      <div v-show="step === 1">
        <div class="card">
          <div class="card-title">1. 매물 조회</div>

          <div class="form-group">
            <label class="form-label">매물 유형 <span class="required">*</span></label>
            <div class="type-chips">
              <button
                v-for="t in propertyTypes"
                :key="t.value"
                type="button"
                class="type-chip"
                :class="{ active: selectedType === t.value }"
                :disabled="lookupDone"
                @click="selectedType = t.value"
              >
                {{ t.label }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="address">주소 <span class="required">*</span></label>
            <input
              id="address"
              v-model="form.address"
              type="text"
              class="form-input"
              :class="{ error: errors.address }"
              :readonly="lookupDone"
              placeholder="서울특별시 강남구 역삼동 123"
            />
            <div class="form-hint">법정동 주소를 입력해 주세요 (예: 서울특별시 강남구 역삼동 123)</div>
            <div v-if="errors.address" class="error-message">{{ errors.address }}</div>
          </div>

          <div class="form-group">
            <label class="form-label" for="dealYmd">계약연월 <span class="required">*</span></label>
            <input
              id="dealYmd"
              v-model="form.dealYmd"
              type="text"
              class="form-input"
              :class="{ error: errors.dealYmd }"
              :readonly="lookupDone"
              placeholder="202501"
              maxlength="6"
            />
            <div class="form-hint">YYYYMM 형식 (예: 202501)</div>
            <div v-if="errors.dealYmd" class="error-message">{{ errors.dealYmd }}</div>
          </div>

          <div class="form-group">
            <label class="form-label" for="floor">층수 <span class="required">*</span></label>
            <input
              id="floor"
              v-model="form.floor"
              type="number"
              class="form-input"
              :class="{ error: errors.floor }"
              :readonly="lookupDone"
              placeholder="5"
              min="1"
            />
            <div v-if="errors.floor" class="error-message">{{ errors.floor }}</div>
          </div>

          <!-- 조회 결과 -->
          <div v-if="lookupData" class="lookup-result">
            <div class="result-title">조회 결과</div>
            <div class="lookup-row">
              <span class="lookup-label">건물명</span>
              <span class="lookup-value">{{ lookupData.name || '-' }}</span>
            </div>
            <div class="lookup-row">
              <span class="lookup-label">매매가</span>
              <span class="lookup-value">{{ formatPrice(lookupData.price) }}</span>
            </div>
            <div class="lookup-row">
              <span class="lookup-label">전용면적</span>
              <span class="lookup-value">{{ lookupData.privateArea ? lookupData.privateArea + ' m²' : '-' }}</span>
            </div>
            <div class="lookup-row">
              <span class="lookup-label">건축년도</span>
              <span class="lookup-value">{{ lookupData.builtYear || '-' }}</span>
            </div>
          </div>
        </div>

        <button
          v-if="!lookupDone"
          class="btn-lookup"
          :disabled="lookingUp"
          @click="lookupProperty"
        >
          {{ lookingUp ? '조회 중...' : '매물 조회' }}
        </button>
      </div>

      <!-- STEP 2: 추가 정보 입력 -->
      <div v-if="step === 2">
        <div class="lookup-info alert alert-info">
          {{ lookupData.name || '매물' }} · {{ formatPrice(lookupData.price) }}
          <template v-if="lookupData.privateArea"> · 전용 {{ lookupData.privateArea }}m²</template>
        </div>

        <div class="card">
          <div class="card-title">2. 추가 정보 입력</div>

          <div class="input-row">
            <div class="form-group">
              <label class="form-label" for="totalFloor">총 층수 <span class="required">*</span></label>
              <input
                id="totalFloor"
                v-model="form.totalFloor"
                type="number"
                class="form-input"
                :class="{ error: errors.totalFloor }"
                placeholder="20"
                min="1"
              />
              <div v-if="errors.totalFloor" class="error-message">{{ errors.totalFloor }}</div>
            </div>
            <div class="form-group">
              <label class="form-label" for="roomCount">방 개수 <span class="required">*</span></label>
              <input
                id="roomCount"
                v-model="form.roomCount"
                type="number"
                class="form-input"
                :class="{ error: errors.roomCount }"
                placeholder="3"
                min="1"
              />
              <div v-if="errors.roomCount" class="error-message">{{ errors.roomCount }}</div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="supplyArea">공급면적 (m²) <span class="required">*</span></label>
            <input
              id="supplyArea"
              v-model="form.supplyArea"
              type="number"
              class="form-input"
              :class="{ error: errors.supplyArea }"
              placeholder="84.0"
              step="0.01"
              min="0"
            />
            <div v-if="lookupData.privateArea" class="form-hint">
              조회된 전용면적: {{ lookupData.privateArea }} m² (공급면적은 전용면적보다 큽니다)
            </div>
            <div v-if="errors.supplyArea" class="error-message">{{ errors.supplyArea }}</div>
          </div>

          <div class="form-group">
            <label class="form-label" for="migrateDate">입주가능일 <span class="required">*</span></label>
            <input
              id="migrateDate"
              v-model="form.migrateDate"
              type="date"
              class="form-input"
              :class="{ error: errors.migrateDate }"
            />
            <div v-if="errors.migrateDate" class="error-message">{{ errors.migrateDate }}</div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">상세 정보</div>
          <div class="form-group">
            <label class="form-label" for="description">매물 설명</label>
            <textarea
              id="description"
              v-model="form.description"
              class="form-textarea"
              placeholder="매물에 대한 상세 설명을 입력해 주세요 (선택)"
            ></textarea>
          </div>
        </div>

        <div class="card">
          <div class="card-title">매물 이미지</div>
          <div class="form-group">
            <div
              class="image-upload-area"
              :class="{ dragover: dragging }"
              @click="$refs.imageInput.click()"
              @dragover.prevent="dragging = true"
              @dragleave="dragging = false"
              @drop.prevent="onDrop"
            >
              <div class="upload-icon">+</div>
              <div class="upload-text">클릭하거나 이미지를 드래그해 주세요</div>
              <div class="upload-hint">JPG, PNG (최대 5장)</div>
            </div>
            <input
              ref="imageInput"
              type="file"
              accept="image/jpeg,image/png"
              multiple
              style="display:none"
              @change="onFileSelect"
            />
            <div v-if="selectedFiles.length" class="image-preview-list">
              <div v-for="(file, i) in selectedFiles" :key="i" class="image-preview-item">
                <img :src="getPreviewUrl(file)" />
                <button class="image-remove-btn" @click.stop="removeFile(i)">x</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="submitError" class="alert alert-error">{{ submitError }}</div>
        <button
          class="btn-primary-full"
          :disabled="submitting"
          @click="submitProperty"
        >
          {{ submitting ? '등록 중...' : '매물 등록하기' }}
        </button>
        <button class="btn-reset-full" @click="goBackToStep1">다시 조회하기</button>
      </div>

      <div class="footer">부동부동 · 매물 등록</div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { getPresignedUrls, uploadFileToPresignedUrl } from '../shared/api.js'
import AppLayout from "../components/AppLayout.vue";

// ====== 상수 ======
const propertyTypes = [
  { label: '아파트', value: 'APARTMENT' },
  { label: '빌라', value: 'VILLA' },
  { label: '오피스텔', value: 'OFFICETEL' },
]

// ====== 상태 ======
const userName = ref('')
const authorized = ref(false)
const step = ref(1)
const selectedType = ref('APARTMENT')
const lookupData = ref(null)
const lookupDone = ref(false)
const lookingUp = ref(false)
const submitting = ref(false)
const dragging = ref(false)
const selectedFiles = ref([])
const previewUrls = []

const successMsg = ref('')
const errorMsg = ref('')
const submitError = ref('')
const errors = ref({})

const form = ref({
  address: '',
  dealYmd: '',
  floor: '',
  totalFloor: '',
  roomCount: '',
  supplyArea: '',
  migrateDate: '',
  description: '',
})

// ====== 초기화 ======
onMounted(() => {
  const token = localStorage.getItem('accessToken')
  if (!token) {
    alert('로그인이 필요합니다')
    window.location.href = '/signin.html'
    return
  }

  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
    const payload = JSON.parse(new TextDecoder().decode(bytes))

    userName.value = payload.username || payload.userEmail || ''

    const exp = payload.exp * 1000
    if (Date.now() >= exp) {
      alert('로그인이 만료되었습니다. 다시 로그인해주세요.')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      window.location.href = '/signin.html'
      return
    }

    const role = (payload.userRole || '').toUpperCase()
    if (role.includes('SELLER') || role.includes('ADMIN')) {
      authorized.value = true
    }
  } catch (e) {
    console.error('토큰 파싱 실패:', e)
  }
})

onUnmounted(() => {
  previewUrls.forEach(url => URL.revokeObjectURL(url))
})

// ====== 알림 ======
function hideAlerts() {
  successMsg.value = ''
  errorMsg.value = ''
  submitError.value = ''
}

// ====== 가격 포맷 ======
function formatPrice(won) {
  if (!won) return '-'
  const num = Number(won)
  const eok = Math.floor(num / 100000000)
  const man = Math.floor((num % 100000000) / 10000)
  let result = ''
  if (eok > 0) result += eok + '억 '
  if (man > 0) result += man.toLocaleString() + '만'
  return result.trim() + '원'
}

// ====== STEP 1: 매물 조회 ======
function validateLookup() {
  const e = {}
  if (!form.value.address.trim()) e.address = '주소를 입력해 주세요'
  if (!form.value.dealYmd.trim()) {
    e.dealYmd = '계약연월을 입력해 주세요'
  } else if (!/^\d{6}$/.test(form.value.dealYmd.trim())) {
    e.dealYmd = 'YYYYMM 형식으로 입력해 주세요'
  }
  if (!form.value.floor) e.floor = '층수를 입력해 주세요'
  errors.value = e
  return Object.keys(e).length === 0
}

async function lookupProperty() {
  hideAlerts()
  if (!validateLookup()) return

  lookingUp.value = true
  try {
    const token = localStorage.getItem('accessToken')
    const rawToken = token ? token.replace(/^Bearer\s+/i, '') : ''
    const bearerToken = rawToken ? `Bearer ${rawToken}` : ''

    const requestBody = {
      type: selectedType.value,
      address: form.value.address.trim(),
      dealYmd: form.value.dealYmd.trim(),
      floor: parseInt(form.value.floor),
    }

    const runLookup = (authHeader) => fetch('/api/properties/v1/lookup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
      body: JSON.stringify(requestBody),
    })

    let res = await runLookup(bearerToken || token)
    if (res.status === 401 && rawToken && (bearerToken || token) !== rawToken) {
      res = await runLookup(rawToken)
    }

    const text = await res.text()
    let json = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = null
    }
    if (!json) {
      errorMsg.value = `매물 조회 응답이 비어 있습니다. (${res.status})`
      return
    }
    if (!json.success) {
      errorMsg.value = json.message || '매물 조회에 실패했습니다.'
      return
    }

    lookupData.value = json.data
    lookupDone.value = true
    step.value = 2
  } catch (e) {
    console.error(e)
    errorMsg.value = '네트워크 오류로 조회에 실패했습니다.'
  } finally {
    lookingUp.value = false
  }
}

// ====== STEP 2: 추가 정보 ======
function validateSubmit() {
  const e = {}
  if (!form.value.totalFloor) e.totalFloor = '총 층수를 입력해 주세요'
  if (!form.value.roomCount) e.roomCount = '방 개수를 입력해 주세요'
  if (!form.value.supplyArea) e.supplyArea = '공급면적을 입력해 주세요'
  if (!form.value.migrateDate) e.migrateDate = '입주가능일을 선택해 주세요'

  const floor = parseInt(form.value.floor)
  const totalFloor = parseInt(form.value.totalFloor)
  if (floor && totalFloor && floor > totalFloor) {
    e.totalFloor = '총 층수는 층수보다 크거나 같아야 합니다'
  }

  errors.value = e
  if (Object.keys(e).length > 0) {
    submitError.value = '필수 항목을 모두 입력해 주세요.'
    return false
  }
  return true
}

async function submitProperty() {
  hideAlerts()
  if (!validateSubmit()) return
  if (!lookupData.value) {
    submitError.value = '매물 조회 데이터가 없습니다. 다시 조회해 주세요.'
    return
  }

  const token = localStorage.getItem('accessToken')
  if (!token) {
    submitError.value = '로그인이 필요합니다. 로그인 후 다시 시도해 주세요.'
    return
  }

  submitting.value = true

  try {
    // 이미지를 Presigned URL로 S3에 직접 업로드
    let imageFileUrls = []
    if (selectedFiles.value.length > 0) {
      const presignResult = await getPresignedUrls(selectedFiles.value)
      const presignedUrls = presignResult.data

      await Promise.all(
        presignedUrls.map((urlInfo, i) =>
          uploadFileToPresignedUrl(urlInfo.uploadUrl, selectedFiles.value[i])
        )
      )

      imageFileUrls = presignedUrls.map(urlInfo => urlInfo.fileUrl)
    }

    // FormData로 매물 정보 전송 (이미지는 URL로)
    const formData = new FormData()

    formData.append('type', selectedType.value)
    formData.append('address', form.value.address.trim())
    formData.append('dealYmd', form.value.dealYmd.trim())
    formData.append('floor', form.value.floor)

    if (lookupData.value.name) formData.append('name', lookupData.value.name)
    if (lookupData.value.price) formData.append('price', lookupData.value.price.toString())
    if (lookupData.value.privateArea) formData.append('privateArea', lookupData.value.privateArea.toString())
    if (lookupData.value.builtYear) formData.append('builtYear', lookupData.value.builtYear.toString())

    formData.append('totalFloor', form.value.totalFloor)
    formData.append('roomCount', form.value.roomCount)
    formData.append('supplyArea', form.value.supplyArea)
    formData.append('migrateDate', form.value.migrateDate)

    if (form.value.description.trim()) {
      formData.append('description', form.value.description.trim())
    }

    // imageUrls를 쿼리파라미터로 전달
    const params = new URLSearchParams()
    imageFileUrls.forEach(url => params.append('imageUrls', url))
    const queryString = params.toString()
    const url = '/api/properties/v1' + (queryString ? '?' + queryString : '')

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': token },
      body: formData,
    })

    if (res.status === 201) {
      successMsg.value = '매물이 성공적으로 등록되었습니다!'
      setTimeout(() => {
        window.location.href = '/my-properties.html'
      }, 1500)
      return
    }

    if (res.status === 401) {
      submitError.value = '로그인이 만료되었습니다. 다시 로그인해 주세요.'
      return
    }
    if (res.status === 403) {
      submitError.value = '매물 등록 권한이 없습니다. 판매자(SELLER) 계정으로 로그인해 주세요.'
      return
    }

    let msg = '매물 등록에 실패했습니다.'
    try {
      const json = await res.json()
      msg = json.message || msg
    } catch { /* ignore */ }
    submitError.value = `[${res.status}] ${msg}`
  } catch (e) {
    console.error(e)
    submitError.value = '네트워크 오류로 등록에 실패했습니다: ' + e.message
  } finally {
    submitting.value = false
  }
}

// ====== 이미지 ======
function onFileSelect(e) {
  addFiles(e.target.files)
  e.target.value = ''
}

function onDrop(e) {
  dragging.value = false
  addFiles(e.dataTransfer.files)
}

function addFiles(files) {
  for (const file of files) {
    if (selectedFiles.value.length >= 5) break
    if (!file.type.match(/^image\/(jpeg|png)$/)) continue
    selectedFiles.value.push(file)
  }
}

function removeFile(index) {
  selectedFiles.value.splice(index, 1)
}

function getPreviewUrl(file) {
  const url = URL.createObjectURL(file)
  previewUrls.push(url)
  return url
}

// ====== 네비게이션 ======
function goBackToStep1() {
  step.value = 1
  lookupData.value = null
  lookupDone.value = false
  form.value.totalFloor = ''
  form.value.roomCount = ''
  form.value.supplyArea = ''
  form.value.migrateDate = ''
  form.value.description = ''
  selectedFiles.value = []
  errors.value = {}
  hideAlerts()
}

function logout() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  window.location.href = '/signin.html'
}
</script>

<style scoped>
* { box-sizing: border-box; }

.page {
  min-height: 100vh;
  background: var(--color-bg);
}

/* ===== 헤더 ===== */
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
.btn-text:hover { color: var(--color-text); }
.user-greeting {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

/* ===== 접근 권한 없음 ===== */
.access-denied {
  text-align: center;
  padding: 120px 24px;
  color: var(--color-text-secondary);
}
.denied-icon { font-size: 64px; margin-bottom: 16px; }
.access-denied h2 { font-size: 24px; color: var(--color-text); margin-bottom: 8px; }
.access-denied p { margin-bottom: 24px; }
.btn-go-login {
  display: inline-block;
  padding: 12px 32px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary);
  border-radius: 8px;
  text-decoration: none;
}
.btn-go-login:hover { background: var(--color-primary-hover); }

/* ===== 컨테이너 ===== */
.container {
  max-width: 520px;
  margin: 0 auto;
  padding: 24px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: var(--color-text-secondary);
  text-decoration: none;
  margin-bottom: 16px;
}
.back-link:hover { color: var(--color-primary); }

.page-header { margin-bottom: 24px; }
.page-title { font-size: 24px; font-weight: 700; margin-bottom: 6px; }
.page-subtitle { font-size: 14px; color: var(--color-text-secondary); }

/* ===== 카드 ===== */
.card {
  background: var(--color-surface);
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 28px 24px;
  margin-bottom: 16px;
}
.card-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f2f4f6;
}

/* ===== 폼 ===== */
.form-group { margin-bottom: 18px; }
.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--color-text);
}
.required { color: var(--color-error); margin-left: 2px; }

.form-input,
.form-textarea {
  width: 100%;
  padding: 12px 16px;
  font-size: 15px;
  font-family: inherit;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-input-bg);
  color: var(--color-text);
  transition: border-color 0.2s, box-shadow 0.2s;
  outline: none;
}
.form-input:focus,
.form-textarea:focus {
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px rgba(49, 130, 246, 0.12);
  background: var(--color-surface);
}
.form-input.error,
.form-textarea.error {
  border-color: var(--color-error);
}
.form-input:read-only {
  background: #e9ecef;
  color: var(--color-text-secondary);
  cursor: default;
}
.form-input:read-only:focus {
  border-color: var(--color-border);
  box-shadow: none;
}
.form-textarea {
  resize: vertical;
  min-height: 100px;
}
.form-hint {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}
.error-message {
  font-size: 12px;
  color: var(--color-error);
  margin-top: 4px;
}

.input-row {
  display: flex;
  gap: 10px;
}
.input-row .form-group { flex: 1; }

/* ===== 타입 칩 ===== */
.type-chips { display: flex; gap: 10px; }
.type-chip {
  flex: 1;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-input-bg);
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  color: var(--color-text-secondary);
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
}
.type-chip:hover:not(:disabled) { border-color: var(--color-primary); }
.type-chip.active {
  border-color: var(--color-primary);
  background: rgba(49, 130, 246, 0.08);
  color: var(--color-primary);
}
.type-chip:disabled {
  opacity: 0.6;
  cursor: default;
}

/* ===== 알림 ===== */
.alert {
  padding: 12px 16px;
  border-radius: var(--radius);
  font-size: 14px;
  margin-bottom: 16px;
}
.alert-success { background: #e8f5e9; color: #1b5e20; border: 1px solid #a5d6a7; }
.alert-error { background: #ffeef0; color: var(--color-error); border: 1px solid #f5c6cb; }
.alert-info { background: #eef2ff; color: #3730a3; border: 1px solid #c7d2fe; }

/* ===== 조회 결과 ===== */
.lookup-result {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: var(--radius);
  padding: 16px;
  margin-top: 16px;
}
.result-title {
  font-size: 14px;
  font-weight: 700;
  color: #166534;
  margin-bottom: 12px;
}
.lookup-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
}
.lookup-label { font-size: 13px; color: #6b7280; }
.lookup-value { font-size: 13px; font-weight: 700; color: #111827; }

/* ===== 이미지 업로드 ===== */
.image-upload-area {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius);
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  background: var(--color-input-bg);
}
.image-upload-area:hover { border-color: var(--color-primary); background: rgba(49, 130, 246, 0.04); }
.image-upload-area.dragover { border-color: var(--color-primary); background: rgba(49, 130, 246, 0.08); }
.upload-icon { font-size: 28px; margin-bottom: 8px; color: var(--color-text-secondary); }
.upload-text { font-size: 14px; color: var(--color-text-secondary); margin-bottom: 4px; }
.upload-hint { font-size: 12px; color: var(--color-border); }

.image-preview-list { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
.image-preview-item {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--color-border);
}
.image-preview-item img { width: 100%; height: 100%; object-fit: cover; }
.image-remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

/* ===== 버튼 ===== */
.btn-lookup,
.btn-primary-full {
  width: 100%;
  padding: 14px;
  font-size: 16px;
  font-weight: 600;
  font-family: inherit;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}
.btn-lookup { background: #111827; color: #fff; }
.btn-lookup:hover:not(:disabled) { background: #1f2937; transform: translateY(-1px); }
.btn-lookup:active:not(:disabled) { transform: translateY(0); }
.btn-lookup:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary-full { background: var(--color-primary); color: #fff; }
.btn-primary-full:hover:not(:disabled) { background: var(--color-primary-hover); transform: translateY(-1px); }
.btn-primary-full:active:not(:disabled) { transform: translateY(0); }
.btn-primary-full:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-reset-full {
  width: 100%;
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 10px;
}
.btn-reset-full:hover { border-color: var(--color-text-secondary); color: var(--color-text); }

/* ===== 푸터 ===== */
.footer {
  text-align: center;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 24px;
  padding-bottom: 24px;
}

/* ===== 반응형 ===== */
@media (max-width: 768px) {
  .container { padding: 16px; }
  .page-title { font-size: 20px; }
  .header-nav { gap: 4px; }
  .btn-text { font-size: 13px; padding: 6px 8px; }
  .input-row { flex-direction: column; gap: 0; }
}
</style>
