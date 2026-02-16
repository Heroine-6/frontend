<template>
  <div>
    <div v-if="open" class="overlay" @click="$emit('close')"></div>

    <aside class="app-sidebar" :class="{ open: open }">
      <div class="sidebar-header">
        <span class="sidebar-title">메뉴</span>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <nav class="sidebar-nav">
        <a href="/search" class="sidebar-link" @click="$emit('close')">
          🔍 매물 검색
        </a>

        <a href="/market-prices" class="sidebar-link" @click="$emit('close')">
          📊 주변 시세
        </a>

        <a
            v-if="isLoggedIn"
            href="/mypage"
            class="sidebar-link"
            @click="$emit('close')"
        >
          👤 마이페이지
        </a>
      </nav>

      <div class="sidebar-divider"></div>

      <div class="sidebar-user-area">
        <div v-if="isLoggedIn" class="sidebar-user">
          🙋 {{ userName }}님
        </div>

        <button
            v-if="isLoggedIn"
            class="sidebar-logout"
            @click="$emit('logout')"
        >
          🚪 로그아웃
        </button>

        <template v-else>
          <div class="sidebar-auth">
            <a href="/signin" class="sidebar-link">🔑 로그인</a>
            <a href="/signup" class="sidebar-link">✨ 회원가입</a>
          </div>
        </template>
      </div>
    </aside>
  </div>
</template>

<script setup>
defineProps({
  open: Boolean,
  isLoggedIn: Boolean,
  userName: String
})
defineEmits(['close', 'logout'])
</script>
