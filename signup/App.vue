<template>
  <div class="auth-container">
    <div class="auth-card">
      <h1 class="auth-title">회원가입</h1>
      <p class="auth-subtitle">부동부동에 가입하고 시작하세요</p>

      <div v-if="successMsg" class="alert alert-success">{{ successMsg }}</div>
      <div v-if="errorMsg" class="alert alert-error">{{ errorMsg }}</div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label class="form-label" for="email">이메일</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            class="form-input"
            :class="{ error: errors.email }"
            placeholder="example@email.com"
            @blur="validate('email')"
          />
          <p v-if="errors.email" class="error-message">{{ errors.email }}</p>
        </div>

        <div class="form-group">
          <label class="form-label" for="name">이름</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            class="form-input"
            :class="{ error: errors.name }"
            placeholder="이름을 입력하세요"
            @blur="validate('name')"
          />
          <p v-if="errors.name" class="error-message">{{ errors.name }}</p>
        </div>

        <div class="form-group">
          <label class="form-label" for="password">비밀번호</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            class="form-input"
            :class="{ error: errors.password }"
            placeholder="대/소문자, 숫자, 특수문자 포함 8~20자"
            @blur="validate('password')"
          />
          <p v-if="errors.password" class="error-message">{{ errors.password }}</p>
        </div>

        <!-- 전화번호 + 인증 -->
        <div class="form-group">
          <label class="form-label" for="phone">전화번호</label>
          <div class="input-row">
            <input
              id="phone"
              v-model="form.phone"
              type="tel"
              class="form-input"
              :class="{ error: errors.phone }"
              placeholder="01012345678"
              :disabled="phoneVerified"
              @blur="validate('phone')"
            />
            <button
              type="button"
              class="btn-secondary"
              :disabled="sendingCode || phoneVerified || !form.phone"
              @click="handleSendCode"
            >
              {{ phoneVerified ? '인증완료' : sendingCode ? '전송중...' : codeSent ? '재전송' : '인증요청' }}
            </button>
          </div>
          <p v-if="errors.phone" class="error-message">{{ errors.phone }}</p>
        </div>

        <div v-if="codeSent && !phoneVerified" class="form-group">
          <label class="form-label" for="verifyCode">인증번호</label>
          <div class="input-row">
            <input
              id="verifyCode"
              v-model="verifyCode"
              type="text"
              class="form-input"
              :class="{ error: errors.verifyCode }"
              placeholder="인증번호 입력"
              maxlength="6"
            />
            <button
              type="button"
              class="btn-secondary"
              :disabled="verifying || !verifyCode"
              @click="handleVerifyCode"
            >
              {{ verifying ? '확인중...' : '확인' }}
            </button>
          </div>
          <p v-if="errors.verifyCode" class="error-message">{{ errors.verifyCode }}</p>
          <p v-if="countdown > 0" class="hint-message">남은 시간: {{ formatCountdown }}</p>
        </div>

        <div class="form-group">
          <label class="form-label" for="address">주소</label>
          <input
            id="address"
            v-model="form.address"
            type="text"
            class="form-input"
            :class="{ error: errors.address }"
            placeholder="주소를 입력하세요"
            @blur="validate('address')"
          />
          <p v-if="errors.address" class="error-message">{{ errors.address }}</p>
        </div>

        <div class="form-group">
          <label class="form-label" for="role">역할</label>
          <select
            id="role"
            v-model="form.role"
            class="form-select"
            :class="{ error: errors.role }"
            @blur="validate('role')"
          >
            <option value="" disabled>역할을 선택하세요</option>
            <option value="GENERAL">일반 회원</option>
            <option value="SELLER">판매자</option>
          </select>
          <p v-if="errors.role" class="error-message">{{ errors.role }}</p>
        </div>

        <button type="submit" class="btn-primary" :disabled="loading || !phoneVerified">
          {{ loading ? '가입 중...' : '회원가입' }}
        </button>
      </form>

      <div class="separator"><span>또는</span></div>
      <button type="button" class="btn-kakao" @click="handleKakaoSignUp">
        카카오톡으로 회원가입
      </button>

      <p class="auth-link">
        이미 계정이 있으신가요? <a href="/signin.html">로그인</a>
      </p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onUnmounted } from 'vue'
import { authSignUp, smsSend, smsVerify } from '../shared/api.js'
import {
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
  validateAddress,
  validateRole,
} from '../shared/validators.js'

const form = reactive({
  email: '',
  name: '',
  password: '',
  phone: '',
  address: '',
  role: '',
})

const errors = reactive({
  email: '',
  name: '',
  password: '',
  phone: '',
  address: '',
  role: '',
  verifyCode: '',
})

const loading = ref(false)
const successMsg = ref('')
const errorMsg = ref('')

// SMS 인증 상태
const verifyCode = ref('')
const codeSent = ref(false)
const sendingCode = ref(false)
const verifying = ref(false)
const phoneVerified = ref(false)
const countdown = ref(0)
let countdownTimer = null

const formatCountdown = computed(() => {
  const min = Math.floor(countdown.value / 60)
  const sec = countdown.value % 60
  return `${min}:${String(sec).padStart(2, '0')}`
})

function startCountdown(seconds) {
  clearInterval(countdownTimer)
  countdown.value = seconds
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
    }
  }, 1000)
}

onUnmounted(() => clearInterval(countdownTimer))

const validators = {
  email: validateEmail,
  name: validateName,
  password: validatePassword,
  phone: validatePhone,
  address: validateAddress,
  role: validateRole,
}

function validate(field) {
  errors[field] = validators[field](form[field])
}

function validateAll() {
  Object.keys(validators).forEach(validate)
  return Object.values(errors).every((e) => !e)
}

async function handleSendCode() {
  errors.verifyCode = ''
  errorMsg.value = ''
  validate('phone')
  if (errors.phone) return

  sendingCode.value = true
  try {
    await smsSend(form.phone)
    codeSent.value = true
    verifyCode.value = ''
    startCountdown(180)
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    sendingCode.value = false
  }
}

async function handleVerifyCode() {
  errors.verifyCode = ''
  errorMsg.value = ''
  if (!verifyCode.value) {
    errors.verifyCode = '인증번호를 입력해주세요.'
    return
  }

  verifying.value = true
  try {
    await smsVerify(form.phone, verifyCode.value)
    phoneVerified.value = true
    clearInterval(countdownTimer)
    countdown.value = 0
  } catch (e) {
    errors.verifyCode = e.message
  } finally {
    verifying.value = false
  }
}

async function handleSubmit() {
  successMsg.value = ''
  errorMsg.value = ''
  if (!validateAll()) return
  if (!phoneVerified.value) {
    errorMsg.value = '전화번호 인증을 완료해주세요.'
    return
  }

  loading.value = true
  try {
    const res = await authSignUp({
      email: form.email,
      name: form.name,
      password: form.password,
      phone: form.phone,
      address: form.address,
      role: form.role,
    })
    const { accessToken, refreshToken } = res.data
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    successMsg.value = '회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.'

    window.location.href = '/'

  } catch (e) {
    errorMsg.value = e.message
  } finally {
    loading.value = false
  }
}

function handleKakaoSignUp() {
  const KAKAO_CLIENT_ID = import.meta.env.VITE_KAKAO_CLIENT_ID || import.meta.env.VITE_KAKAO_REST_API_KEY;
  const REDIRECT_URI = import.meta.env.VITE_KAKAO_REDIRECT_URI || `${window.location.origin}/login/oauth2/code/kakao`;
  const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=profile_nickname,account_email,phone_number`;
  window.location.href = KAKAO_AUTH_URL;
}
</script>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f0f2f5;
  padding: 20px;
}

.auth-card {
  background-color: #fff;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 420px;
  text-align: center;
}

.auth-title {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin-bottom: 10px;
}

.auth-subtitle {
  font-size: 15px;
  color: #777;
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 20px;
  text-align: left;
}

.form-label {
  display: block;
  font-size: 14px;
  color: #555;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-input,
.form-select {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 15px;
  color: #333;
  transition: border-color 0.2s, box-shadow 0.2s;
  -webkit-appearance: none; /* Remove default select styles */
  -moz-appearance: none;
  appearance: none;
  background-color: #fff;
}

.form-input:focus,
.form-select:focus {
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.2);
  outline: none;
}

.form-input.error,
.form-select.error {
  border-color: #dc3545;
}

.error-message {
  color: #dc3545;
  font-size: 13px;
  margin-top: 6px;
  text-align: left;
}

.hint-message {
  color: #6c757d;
  font-size: 13px;
  margin-top: 6px;
  text-align: left;
}

.input-row {
  display: flex;
  gap: 10px;
}

.input-row .form-input {
  flex-grow: 1;
}

.btn-primary,
.btn-secondary {
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
  width: 100%;
}

.btn-primary {
  background-color: #007bff;
  color: #fff;
  border: none;
  margin-top: 10px;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-primary:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  opacity: 0.8;
}

.btn-secondary {
  background-color: #e9ecef;
  color: #495057;
  border: 1px solid #ced4da;
  flex-shrink: 0;
  width: auto;
  min-width: 100px;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #dae0e5;
}

.btn-secondary:disabled {
  background-color: #f8f9fa;
  color: #adb5bd;
  cursor: not-allowed;
  opacity: 0.8;
}

.separator {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 25px 0;
  color: #aaa;
}

.separator::before,
.separator::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #eee;
}

.separator:not(:empty)::before {
  margin-right: .25em;
}

.separator:not(:empty)::after {
  margin-left: .25em;
}

.btn-kakao {
  background-color: #FEE500; /* Kakao Yellow */
  color: #191919; /* Kakao Black */
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px; /* 로그인 링크와의 간격 */
}

.btn-kakao:hover {
  background-color: #fada00; /* Slightly darker yellow on hover */
}

.auth-link {
  font-size: 14px;
  color: #555;
  margin-top: 20px;
}

.auth-link a {
  color: #007bff;
  text-decoration: none;
  font-weight: 600;
}

.auth-link a:hover {
  text-decoration: underline;
}

.alert {
  padding: 10px 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
  text-align: left;
}

.alert-success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.alert-error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}
</style>
