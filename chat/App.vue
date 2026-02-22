<template>
  <AppLayout>
    <!-- 채팅 레이아웃 -->
    <div class="chat-layout">
      <!-- 왼쪽: 채팅방 목록 -->
      <aside class="chat-sidebar">
        <div class="sidebar-header">
          <h2 class="sidebar-title">채팅방 목록</h2>
        </div>
        <div class="room-list">
          <div v-if="roomsLoading" class="loading-text">로딩 중...</div>
          <div v-else-if="rooms.length === 0" class="empty-text">
            채팅방이 없습니다
          </div>
          <div
            v-else
            v-for="room in rooms"
            :key="room.roomId"
            class="room-item"
            :class="{ active: selectedRoom?.roomId === room.roomId }"
            @click="selectRoom(room)"
          >
            <div class="room-info">
              <p class="room-name">{{ getRoomTitle(room) }}</p>
              <p class="room-address">{{ getPropertyAddress(room) }}</p>
            </div>
            <div class="room-meta">
              <span class="room-time">{{ formatTime(room.lastMessageAt) }}</span>
              <span v-if="room.unreadCount > 0" class="unread-badge">
                {{ room.unreadCount > 99 ? '99+' : room.unreadCount }}
              </span>
            </div>
          </div>
        </div>
      </aside>

      <!-- 오른쪽: 채팅 영역 -->
      <main class="chat-main">
        <template v-if="selectedRoom">
          <!-- 채팅 헤더 -->
          <div class="chat-header">
            <h2 class="chat-title">{{ getRoomTitle(selectedRoom) }}</h2>
            <p class="chat-detail">{{ getPropertyAddress(selectedRoom) }}</p>
          </div>

          <!-- 채팅 메시지 영역 -->
          <div class="chat-messages" ref="messagesContainer">
            <div v-if="messagesLoading" class="loading-text">메시지 로딩 중...</div>
            <div v-else-if="messages.length === 0" class="empty-text">
              메시지가 없습니다. 대화를 시작해보세요!
            </div>
            <template v-else>
              <button
                v-if="hasMoreMessages"
                class="load-more-btn"
                @click="loadMoreMessages"
                :disabled="messagesLoading"
              >
                이전 메시지 불러오기
              </button>
              <div
                v-for="msg in messages"
                :key="msg.messageId"
                class="message-row"
                :class="{ mine: msg.senderId === userId }"
              >
                <div class="message-read-wrap" :class="{ mine: msg.senderId === userId }">
                  <span
                    v-if="msg.senderId === userId"
                    class="read-indicator"
                    :class="{ read: isMessageRead(msg) }"
                  >
                    {{ isMessageRead(msg) ? '읽음' : '1' }}
                  </span>
                  <div class="message-bubble">
                    <p class="message-content">{{ msg.content }}</p>
                    <span class="message-time">{{ formatMessageTime(msg.createdAt) }}</span>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- 메시지 입력 -->
          <div class="chat-input-area">
            <input
              v-model="newMessage"
              class="chat-input"
              placeholder="메시지를 입력하세요..."
              @keyup.enter="handleSendMessage"
              :disabled="sending"
            />
            <button
              class="chat-send-btn"
              @click="handleSendMessage"
              :disabled="!newMessage.trim() || sending"
            >
              전송
            </button>
          </div>
        </template>

        <!-- 새 채팅방 대기 상태 -->
        <template v-else-if="pendingPropertyId">
          <div class="chat-header">
            <h2 class="chat-title">{{ pendingPropertyInfo?.name || '매물' }}</h2>
            <p class="chat-detail">{{ pendingPropertyInfo?.address || '' }}</p>
          </div>
          <div class="chat-messages">
            <div class="empty-text">메시지를 보내면 채팅방이 생성됩니다.</div>
          </div>
          <div class="chat-input-area">
            <input
              v-model="newMessage"
              class="chat-input"
              placeholder="메시지를 입력하세요..."
              @keyup.enter="handleSendMessage"
              :disabled="sending"
            />
            <button
              class="chat-send-btn"
              @click="handleSendMessage"
              :disabled="!newMessage.trim() || sending"
            >
              전송
            </button>
          </div>
        </template>

        <!-- 채팅방 미선택 상태 -->
        <div v-else class="chat-empty">
          <p class="chat-empty-text">채팅방을 선택해주세요</p>
        </div>
      </main>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import {
  getChatRooms,
  findChatRoom,
  sendFirstMessage,
  getChatMessages,
  getPropertyDetail
} from '../shared/api.js'
import SockJS from 'sockjs-client/dist/sockjs.min.js'
import { Client } from '@stomp/stompjs'
import AppLayout from "../components/AppLayout.vue";

// ─── 사용자 정보 ───
const userName = ref('')
const userId = ref(null)
const userRole = ref('')

// ─── 채팅방 목록 ───
const rooms = ref([])
const roomsLoading = ref(false)
const selectedRoom = ref(null)

// ─── 매물 정보 캐시 (propertyId → { propertyName, address }) ───
const propertyCache = ref({})

// ─── 메시지 ───
const messages = ref([])
const messagesLoading = ref(false)
const hasMoreMessages = ref(false)
const messagePage = ref(0)
const newMessage = ref('')
const sending = ref(false)

// ─── 새 채팅방 대기 상태 ───
const pendingPropertyId = ref(null)
const pendingPropertyInfo = ref(null)

// ─── WebSocket ───
let stompClient = null
const messagesContainer = ref(null)

// ─── URL 파라미터 ───
const urlParams = new URLSearchParams(window.location.search)
const targetPropertyId = urlParams.get('propertyId')

// ─── 초기화 ───
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
    userId.value = payload.sub ? parseInt(payload.sub) : null
    userRole.value = (payload.userRole || '').toUpperCase()

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
    window.location.href = '/signin.html'
    return
  }

  // 채팅방 목록 로드
  await loadRooms()

  // propertyId가 URL에 있으면 해당 채팅방 조회/생성
  if (targetPropertyId) {
    await handlePropertyChat(parseInt(targetPropertyId))
  }

  // WebSocket 연결
  connectWebSocket()
})

onUnmounted(() => {
  disconnectWebSocket()
})

// ─── 채팅방 목록 로드 ───
async function loadRooms() {
  roomsLoading.value = true
  try {
    const data = await getChatRooms()
    if (data && data.content) {
      rooms.value = data.content
    } else {
      rooms.value = []
    }
    // 각 채팅방의 매물 정보를 가져온다
    await loadPropertyInfoForRooms()
  } catch (e) {
    console.error('채팅방 목록 로드 실패:', e)
    rooms.value = []
  } finally {
    roomsLoading.value = false
  }
}

// ─── 채팅방 목록의 매물 정보 조회 ───
async function loadPropertyInfoForRooms() {
  const propertyIds = [...new Set(rooms.value.map(r => r.propertyId).filter(Boolean))]
  const uncachedIds = propertyIds.filter(id => !propertyCache.value[id])

  await Promise.all(
    uncachedIds.map(async (propertyId) => {
      try {
        const res = await getPropertyDetail(propertyId)
        if (res && res.data) {
          propertyCache.value[propertyId] = {
            propertyName: res.data.propertyName || res.data.name || '매물',
            address: res.data.address || res.data.propertyAddress || '',
            bidderName: res.data.bidderName || ''
          }
        }
      } catch (e) {
        console.error(`매물 정보 조회 실패 (${propertyId}):`, e)
        propertyCache.value[propertyId] = {
          propertyName: '매물',
          address: '',
          bidderName: ''
        }
      }
    })
  )
}

// ─── 매물 기반 채팅방 조회/생성 ───
async function handlePropertyChat(propertyId) {
  try {
    // 기존 채팅방 확인
    const existingRoom = await findChatRoom(propertyId)

    if (existingRoom && existingRoom.roomId) {
      // 기존 채팅방이 있으면 선택
      let room = rooms.value.find(r => r.roomId === existingRoom.roomId)
      if (!room) {
        await loadRooms()
        room = rooms.value.find(r => r.roomId === existingRoom.roomId)
      }
      if (room) await selectRoom(room)
    } else {
      // 채팅방이 없으면 대기 상태로 진입 (첫 메시지 전송 시 생성)
      selectedRoom.value = null
      messages.value = []
      pendingPropertyId.value = propertyId

      // 매물 정보 로드
      try {
        const res = await getPropertyDetail(propertyId)
        if (res && res.data) {
          pendingPropertyInfo.value = {
            name: res.data.name || '매물',
            address: res.data.address || ''
          }
        }
      } catch {
        pendingPropertyInfo.value = { name: '매물', address: '' }
      }
    }
  } catch (e) {
    console.error('채팅방 처리 실패:', e)
  }
}

// ─── 채팅방 선택 ───
async function selectRoom(room) {
  selectedRoom.value = room
  messages.value = []
  messagePage.value = 0
  hasMoreMessages.value = false
  await loadMessages(room.roomId)

  // 읽음 처리
  if (stompClient && stompClient.connected) {
    stompClient.publish({
      destination: '/app/read',
      body: JSON.stringify({ roomId: room.roomId })
    })
    room.unreadCount = 0
  }
}

// ─── 메시지 로드 ───
async function loadMessages(roomId, append = false) {
  messagesLoading.value = true
  try {
    const data = await getChatMessages(roomId, messagePage.value, 30)
    if (data && data.content) {
      // 서버에서 DESC 순으로 오므로 reverse하여 시간순 정렬
      const newMessages = data.content.reverse()
      if (append) {
        messages.value = [...newMessages, ...messages.value]
      } else {
        messages.value = newMessages
      }
      hasMoreMessages.value = !data.last
    }
  } catch (e) {
    console.error('메시지 로드 실패:', e)
  } finally {
    messagesLoading.value = false
    if (!append) {
      await nextTick()
      scrollToBottom()
    }
  }
}

// ─── 이전 메시지 불러오기 ───
async function loadMoreMessages() {
  if (!selectedRoom.value || messagesLoading.value) return
  messagePage.value++
  await loadMessages(selectedRoom.value.roomId, true)
}

// ─── 메시지 전송 ───
async function handleSendMessage() {
  const content = newMessage.value.trim()
  if (!content || sending.value) return

  // 새 채팅방 대기 상태: 첫 메시지로 채팅방 생성
  if (pendingPropertyId.value) {
    sending.value = true
    try {
      const result = await sendFirstMessage(pendingPropertyId.value, content)
      if (result && result.roomId) {
        pendingPropertyId.value = null
        pendingPropertyInfo.value = null
        newMessage.value = ''
        await loadRooms()
        const newRoom = rooms.value.find(r => r.roomId === result.roomId)
        if (newRoom) await selectRoom(newRoom)
      }
    } catch (e) {
      console.error('채팅방 생성 실패:', e)
    } finally {
      sending.value = false
    }
    return
  }

  if (!selectedRoom.value) return

  sending.value = true
  try {
    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: '/app/message',
        body: JSON.stringify({
          roomId: selectedRoom.value.roomId,
          content
        })
      })
      newMessage.value = ''
    }
  } catch (e) {
    console.error('메시지 전송 실패:', e)
  } finally {
    sending.value = false
  }
}

// ─── WebSocket 연결 ───
function connectWebSocket() {
  const token = localStorage.getItem('accessToken')
  if (!token) return

  const bearerToken = token.startsWith('Bearer ') ? token : 'Bearer ' + token

  stompClient = new Client({
    webSocketFactory: () => new SockJS('/ws?token=' + encodeURIComponent(bearerToken)),
    reconnectDelay: 5000,
    onConnect: () => {
      // 채팅 메시지 수신
      stompClient.subscribe('/user/queue/chat', (frame) => {
        const msg = JSON.parse(frame.body)
        // 현재 선택된 채팅방의 메시지면 화면에 추가
        if (selectedRoom.value && msg.roomId === selectedRoom.value.roomId) {
          messages.value.push(msg)
          nextTick(() => scrollToBottom())

          // 읽음 처리
          stompClient.publish({
            destination: '/app/read',
            body: JSON.stringify({ roomId: msg.roomId })
          })
        } else {
          // 다른 채팅방의 메시지면 unreadCount 증가
          const room = rooms.value.find(r => r.roomId === msg.roomId)
          if (room) {
            room.unreadCount = (room.unreadCount || 0) + 1
          }
        }

        // 채팅방 목록에서 해당 방의 lastMessageAt 업데이트 및 정렬
        const targetRoom = rooms.value.find(r => r.roomId === msg.roomId)
        if (targetRoom) {
          targetRoom.lastMessageAt = msg.createdAt
          rooms.value.sort((a, b) => {
            const timeA = a.lastMessageAt ? new Date(a.lastMessageAt) : new Date(0)
            const timeB = b.lastMessageAt ? new Date(b.lastMessageAt) : new Date(0)
            return timeB - timeA
          })
        }
      })

      // 읽음 상태 수신
      stompClient.subscribe('/user/queue/read', (frame) => {
        const readState = JSON.parse(frame.body)
        const room = rooms.value.find(r => r.roomId === readState.roomId)
        if (room) {
          room.lastReadMessageId = readState.lastReadMessageId
        }
      })
    },
    onStompError: (frame) => {
      console.error('STOMP 에러:', frame.headers['message'])
    }
  })

  stompClient.activate()
}

function disconnectWebSocket() {
  if (stompClient) {
    stompClient.deactivate()
    stompClient = null
  }
}

// ─── 읽음 확인 ───
function isMessageRead(msg) {
  if (!selectedRoom.value) return false
  const lastRead = selectedRoom.value.lastReadMessageId
  return lastRead != null && msg.messageId <= lastRead
}

// ─── 역할별 제목 표시 ───
function isSellerInRoom(room) {
  return userId.value === room.sellerId
}

function getRoomTitle(room) {
  if (userRole.value === 'SELLER') {
    return '입찰자 #' + (room.bidderId || '?')
  }
  // GENERAL: 매물명
  const info = propertyCache.value[room.propertyId]
  return (info && info.propertyName) || '매물'
}

function getPropertyAddress(room) {
  const info = propertyCache.value[room.propertyId]
  return (info && info.address) || ''
}

// ─── 시간 포맷 ───
function formatTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return '어제'
  }

  return `${date.getMonth() + 1}/${date.getDate()}`
}

function formatMessageTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// ─── 스크롤 ───
function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// ─── 로그아웃 ───
function logout() {
  disconnectWebSocket()
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
  height: 100vh;
  overflow: hidden;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
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

/* 채팅 레이아웃 */
.chat-layout {
  display: flex;
  height: calc(100vh - 60px); /* 헤더(60px) 제외한 나머지 영역 고정 */
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  overflow: hidden;
}

/* 왼쪽 사이드바 */
.chat-sidebar {
  width: 340px;
  min-width: 340px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
}

.sidebar-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.room-list {
  flex: 1;
  overflow-y: auto;
}

.room-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border);
  transition: background 0.2s;
}

.room-item:hover {
  background: var(--color-bg);
}

.room-item.active {
  background: #eef4ff;
  border-left: 3px solid var(--color-primary);
}

.room-info {
  flex: 1;
  min-width: 0;
}

.room-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-address {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
  margin-left: 12px;
}

.room-time {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.unread-badge {
  background: var(--color-primary);
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
  min-width: 22px;
  text-align: center;
}

/* 오른쪽 채팅 영역 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

/* 채팅 헤더 */
.chat-header {
  padding: 20px 24px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.chat-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 4px 0;
}

.chat-detail {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
}

/* 메시지 영역 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.load-more-btn {
  align-self: center;
  padding: 8px 20px;
  font-size: 13px;
  color: var(--color-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 8px;
}

.load-more-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  background: #eef4ff;
}

.load-more-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 메시지 말풍선 */
.message-row {
  display: flex;
  justify-content: flex-start;
}

.message-row.mine {
  justify-content: flex-end;
}

.message-read-wrap {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  max-width: 65%;
}

.read-indicator {
  font-size: 11px;
  font-weight: 600;
  color: #f0c040;
  flex-shrink: 0;
  margin-bottom: 4px;
  line-height: 1;
}

.read-indicator.read {
  color: var(--color-primary);
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  min-width: 0;
}

.message-row.mine .message-bubble {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.message-content {
  font-size: 14px;
  color: var(--color-text);
  margin: 0 0 4px 0;
  line-height: 1.5;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.message-row.mine .message-content {
  color: #ffffff;
}

.message-time {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.message-row.mine .message-time {
  color: rgba(255, 255, 255, 0.7);
}

/* 입력 영역 */
.chat-input-area {
  padding: 16px 24px;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: 12px;
  align-items: center;
}

.chat-input {
  flex: 1;
  padding: 12px 16px;
  font-size: 15px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-input-bg);
  color: var(--color-text);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.chat-input:focus {
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px rgba(49, 130, 246, 0.12);
  background: var(--color-surface);
}

.chat-send-btn {
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.chat-send-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.chat-send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 빈 상태 */
.chat-empty {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.chat-empty-text {
  font-size: 16px;
  color: var(--color-text-secondary);
}

.loading-text,
.empty-text {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

/* 반응형 */
@media (max-width: 768px) {
  .chat-layout {
    flex-direction: column;
    height: calc(100vh - 60px);
  }

  .chat-sidebar {
    width: 100%;
    min-width: 100%;
    max-height: 40vh;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }

  .chat-main {
    flex: 1;
    min-height: 0;
  }

  .message-read-wrap {
    max-width: 80%;
  }

  .header-nav {
    gap: 12px;
  }

  .btn-text {
    font-size: 14px;
  }
}
</style>
