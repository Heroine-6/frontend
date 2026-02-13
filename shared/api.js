// API 기본 요청 함수
async function request(url, options = {}) {
  const { method = 'GET', body, headers = {}, requireAuth = false } = options

  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  }

  // JWT 토큰 자동 추가
  if (requireAuth) {
    const token = localStorage.getItem('accessToken')
    if (token) {
      // Bearer 없이 토큰만 추가 (백엔드 설정에 맞춤)
      config.headers['Authorization'] = token
    }
  }

  // body가 있으면 추가
  if (body) {
    config.body = JSON.stringify(body)
  }

  const res = await fetch(url, config)

  // 401 에러 처리 (토큰 만료) → 바로 로그인 페이지로 이동
  if (res.status === 401 && requireAuth) {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    alert('인증이 만료되었습니다. 다시 로그인해주세요.')
    window.location.href = '/signin.html'
    throw new Error('인증이 만료되었습니다.')
  }

  // 204 No Content
  if (res.status === 204) {
    return { success: true, data: null }
  }

  const data = await res.json()
  if (!res.ok || !data.success) {
    throw new Error(data.message || '요청에 실패했습니다.')
  }
  return data
}

// ==================== 인증 API ====================

export function authSignIn({ email, password }) {
  return request('/api/auth/v1/signin', {
    method: 'POST',
    body: { email, password }
  })
}

export function authSignUp({ email, name, password, phone, address, role }) {
  return request('/api/auth/v1/signup', {
    method: 'POST',
    body: { email, name, password, phone, address, role }
  })
}

export function smsSend(toNumber) {
  return request('/api/auth/v1/send', {
    method: 'POST',
    body: { toNumber }
  })
}

export function smsVerify(toNumber, code) {
  return request('/api/auth/v1/verify', {
    method: 'POST',
    body: { toNumber, code }
  })
}

export function authRefresh(refreshToken) {
  return request('/api/auth/v1/refresh', {
    method: 'POST',
    body: { refreshToken }
  })
}

// ==================== 카카오 OAuth ====================

export async function kakaoLogin(code) {
  const res = await fetch(`/api/auth/v2/kakao?code=${encodeURIComponent(code)}`)
  const data = await res.json()
  if (!res.ok || !data.success) {
    throw new Error(data.message || '카카오 로그인에 실패했습니다.')
  }
  return data
}

export function completeKakaoProfile(phone, address) {
  const token = localStorage.getItem('accessToken')
  return fetch('/api/auth/v2/kakao/complete', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
    },
    body: JSON.stringify({ phone, address }),
  }).then(async res => {
    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.message || '프로필 저장에 실패했습니다.')
    }
    return data
  })
}

// ==================== 부동산 API ====================

export function getAllProperties(page = 0, size = 10) {
  return request(`/api/v1/properties?page=${page}&size=${size}`)
}

export function searchProperties(params) {
  const queryString = new URLSearchParams(params).toString()
  return request(`/api/v1/properties/search?${queryString}`)
}

export function getPropertyDetail(propertyId) {
  return request(`/api/v1/properties/${propertyId}`)
}

export function getMyProperties(page = 0, size = 10) {
  return request(`/api/v1/properties/my?page=${page}&size=${size}`, {
    requireAuth: true
  })
}

export function createProperty(propertyData) {
  return request('/api/v1/properties', {
    method: 'POST',
    body: propertyData,
    requireAuth: true
  })
}

export function updateProperty(propertyId, propertyData) {
  return request(`/api/v1/properties/${propertyId}`, {
    method: 'PATCH',
    body: propertyData,
    requireAuth: true
  })
}

export function deleteProperty(propertyId) {
  return request(`/api/v1/properties/${propertyId}`, {
    method: 'DELETE',
    requireAuth: true
  })
}

// ==================== 경매 API ====================

export function createAuction(auctionData) {
  return request('/api/auctions/v1', {
    method: 'POST',
    body: auctionData,
    requireAuth: true
  })
}

export function getAuctionInfo(auctionId) {
  return request(`/api/auctions/v1/${auctionId}/info`)
}

export function getAuctionStatistics(auctionId) {
  return request(`/api/auctions/v1/${auctionId}/statistics`)
}

export function createDutchAuction(auctionData) {
  return request('/api/auctions/v3/dutch', {
    method: 'POST',
    body: auctionData,
    requireAuth: true
  })
}

export function cancelAuction(auctionId) {
  return request(`/api/auctions/v1/${auctionId}`, {
    method: 'PATCH',
    requireAuth: true
  })
}

// ==================== 입찰 API ====================

export function createBid(auctionId, bidData) {
  return request(`/api/bids/v1/auctions/${auctionId}`, {
    method: 'POST',
    body: bidData,
    requireAuth: true
  })
}

export function getAuctionBids(auctionId, page = 0, size = 10) {
  return request(`/api/bids/v1/auctions/${auctionId}?page=${page}&size=${size}`)
}

export function getMyBids(page = 0, size = 10, status = null) {
  const query = status ? `?page=${page}&size=${size}&status=${status}` : `?page=${page}&size=${size}`
  return request(`/api/bids/v1/my${query}`, {
    requireAuth: true
  })
}

// ==================== 실거래가 API ====================

export function getNearbyRealDeals(params) {
  const queryString = new URLSearchParams(params).toString()
  return request(`/api/v2/real-deals/nearby?${queryString}`)
}

// ==================== 지역 데이터 (정적 JSON) ====================

let regionsCache = null

async function loadRegions() {
  if (regionsCache) return regionsCache
  const res = await fetch('/regions.json')
  regionsCache = await res.json()
  return regionsCache
}

// 시/도 목록 조회
export async function getSidoList() {
  const regions = await loadRegions()
  return Object.keys(regions)
}

// 구/군 목록 조회
export async function getGugunList(sido) {
  const regions = await loadRegions()
  return regions[sido] ? Object.keys(regions[sido]) : []
}

// 동 목록 조회
export async function getDongList(sido, gugun) {
  const regions = await loadRegions()
  return regions[sido]?.[gugun] || []
}

// 동별 주변 시세 조회 (메인 백엔드의 실거래가 API 활용)
export function getMarketPrices(params) {
  const { sido, gugun, dong, type } = params
  const address = [sido, gugun, dong].filter(Boolean).join(' ')
  const query = { address, size: 50 }
  if (type) query.propertyType = type
  return request(`/api/v2/real-deals/nearby?${new URLSearchParams(query).toString()}`)
}

// ==================== 결제 API ====================

export function createPayment(auctionId, type) {
  return request(`/api/payments/v2/auctions/${auctionId}`, {
    method: 'POST',
    body: { type },
    requireAuth: true
  })
}

export function confirmPayment(paymentData) {
  return request('/api/payments/v2/confirm', {
    method: 'POST',
    body: paymentData,
    requireAuth: true
  })
}

export function getMyPayments(page = 0, size = 10) {
  return request(`/api/payments/v2?page=${page}&size=${size}`, {
    requireAuth: true
  })
}

export function getPaymentDetail(paymentId) {
  return request(`/api/payments/v2/${paymentId}`, {
    requireAuth: true
  })
}

export function refundPayment(paymentId) {
  return request(`/api/payments/v2/${paymentId}/refund`, {
    method: 'POST',
    requireAuth: true
  })
}

// ==================== 알림 API ====================

export function getMyNotifications(page = 0, size = 10) {
  return request(`/api/notifications/v2/my?page=${page}&size=${size}`, {
    requireAuth: true
  })
}

// ==================== 사용자 API ====================

export function updateNotificationSettings(settings) {
  return request('/api/users/v2/notifications', {
    method: 'PATCH',
    body: settings,
    requireAuth: true
  })
}

// ==================== 채팅 API ====================

// 채팅 서버 전용 요청 함수 (Bearer 접두사 필요, 응답 형식이 다름)
async function chatRequest(url, options = {}) {
  const { method = 'GET', body, headers = {} } = options

  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  }

  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers['Authorization'] = token.startsWith('Bearer ') ? token : 'Bearer ' + token
  }

  if (body) {
    config.body = JSON.stringify(body)
  }

  const res = await fetch(url, config)

  if (res.status === 401) {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    alert('인증이 만료되었습니다. 다시 로그인해주세요.')
    window.location.href = '/signin.html'
    throw new Error('인증이 만료되었습니다.')
  }

  if (res.status === 204) {
    return null
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.message || '채팅 요청에 실패했습니다.')
  }

  return res.json()
}

// 내 채팅방 목록 조회
export function getChatRooms(page = 0, size = 20) {
  return chatRequest(`/api/v2/chats/rooms?page=${page}&size=${size}`)
}

// 매물별 채팅방 존재 여부 확인 (존재하면 { roomId }, 없으면 null)
export function findChatRoom(propertyId) {
  return chatRequest(`/api/v2/chats/rooms/open/${propertyId}`)
}

// 첫 메시지 전송 + 채팅방 생성
export function sendFirstMessage(propertyId, content) {
  return chatRequest(`/api/v2/chats/messages/${propertyId}`, {
    method: 'POST',
    body: { content }
  })
}

// 채팅 메시지 조회
export function getChatMessages(roomId, page = 0, size = 30) {
  return chatRequest(`/api/v2/chats/rooms/${roomId}/messages?page=${page}&size=${size}`)
}
