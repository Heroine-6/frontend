<template>
  <div class="auth-container">
    <div class="auth-card">
      <h1 class="auth-title">추가정보 입력</h1>
      <p class="auth-subtitle">서비스 이용을 위해 추가 정보를 입력해주세요</p>

      <div v-if="errorMsg" class="alert alert-error">{{ errorMsg }}</div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label class="form-label" for="name">이름</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            class="form-input"
            :class="{ error: errors.name }"
            placeholder="홍길동"
            @blur="validate('name')"
          />
          <p v-if="errors.name" class="error-message">{{ errors.name }}</p>
        </div>
        <div class="form-group">
          <label class="form-label" for="phone">전화번호</label>
          <input
            id="phone"
            v-model="form.phone"
            type="tel"
            class="form-input"
            :class="{ error: errors.phone }"
            placeholder="01012345678"
            @blur="validate('phone')"
          />
          <p v-if="errors.phone" class="error-message">{{ errors.phone }}</p>
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

        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? '저장 중...' : '저장' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { completeKakaoProfile } from '../shared/api.js'
import { validateName, validatePhone, validateAddress } from '../shared/validators.js'

const form = reactive({ name: '', phone: '', address: '' })
const errors = reactive({ name: '', phone: '', address: '' })
const loading = ref(false)
const errorMsg = ref('')

const validators = { name: validateName, phone: validatePhone, address: validateAddress }

function validate(field) {
  errors[field] = validators[field](form[field])
}

function validateAll() {
  validate('name')
  validate('phone')
  validate('address')
  return !errors.name && !errors.phone && !errors.address
}

async function handleSubmit() {
  errorMsg.value = ''
  if (!validateAll()) return

  loading.value = true
  try {
    await completeKakaoProfile(form.name, form.phone, form.address)
    window.location.href = '/'
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    loading.value = false
  }
}
</script>
