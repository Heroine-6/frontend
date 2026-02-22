<template>
  <header class="header">
    <div class="header-inner">
      <div class="header-left">
        <button class="menu-btn" @click="$emit('toggleSidebar')">☰</button>
        <a href="/" class="logo">부동부동</a>
      </div>

      <div class="header-right">
        <nav class="header-nav">
          <template v-if="isLoggedIn">
            <a href="/mypage" class="btn-text">마이페이지</a>
            <span class="user-greeting">{{ userName }}님</span>
            <button class="btn-text" @click="$emit('logout')">로그아웃</button>
          </template>
          <template v-else>
            <a href="/signin" class="btn-text">로그인</a>
            <a href="/signup" class="btn-header-primary">회원가입</a>
          </template>
        </nav>
      </div>
    </div>
  </header>
</template>

<script setup>
defineProps({
  isLoggedIn: Boolean,
  userName: String
})
defineEmits(['logout', 'toggleSidebar'])
</script>
