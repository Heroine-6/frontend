<template>
  <div>
    <AppHeader
        :isLoggedIn="isLoggedIn"
        :userName="userName"
        @logout="logout"
        @toggleSidebar="toggleSidebar"
    />

    <AppSidebar
        :open="sidebarOpen"
        :isLoggedIn="isLoggedIn"
        :userName="userName"
        @close="closeSidebar"
        @logout="logout"
    />

    <!-- 페이지 콘텐츠 -->
    <slot />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'

const sidebarOpen = ref(false)
const isLoggedIn = ref(false)
const userName = ref('')

function toggleSidebar() {
  sidebarOpen.value = true
}
function closeSidebar() {
  sidebarOpen.value = false
}
function logout() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  isLoggedIn.value = false
  userName.value = ''
  window.location.href = '/'
}

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

onMounted(checkAuth)
</script>
