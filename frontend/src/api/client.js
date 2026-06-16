/**
 * API client — handles JWT token injection, base URL, and error handling.
 */

const BASE_URL = ''  // Vite proxy handles /api/* → backend

export async function api(path, options = {}) {
  const { method = 'GET', body, headers: extraHeaders = {}, responseType } = options
  let res = await request(path, method, body, extraHeaders)

  if (res.status === 401 && path !== '/auth/refresh' && getRefreshToken()) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      res = await request(path, method, body, extraHeaders)
    }
  }

  return parseResponse(res, responseType)
}

async function request(path, method, body, extraHeaders) {
  const headers = { ...extraHeaders }
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const token = localStorage.getItem('access_token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(`${BASE_URL}/api${path}`, {
    method,
    headers,
    body,
  })
}

async function parseResponse(res, responseType) {
  // Handle blob/binary responses
  if (responseType === 'blob') {
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: '请求失败' }))
      throw { status: res.status, message: err.error || '请求失败' }
    }
    return res.blob()
  }

  let data
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    data = await res.json()
  } else {
    const text = await res.text()
    data = { error: text || '请求失败' }
  }

  if (!res.ok) {
    const err = new Error(data.error || '请求失败')
    err.status = res.status
    throw err
  }

  return data
}

async function refreshAccessToken() {
  const refresh = getRefreshToken()
  if (!refresh) return false

  const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${refresh}` },
  })
  if (!res.ok) return false

  const data = await res.json().catch(() => null)
  if (!data?.access_token) return false
  setToken(data.access_token)
  return true
}

// ── Token management ──

export function setToken(token) {
  if (token) localStorage.setItem('access_token', token)
  else localStorage.removeItem('access_token')
}

export function setTokens(accessToken, refreshToken) {
  setToken(accessToken)
  if (refreshToken) localStorage.setItem('refresh_token', refreshToken)
  else localStorage.removeItem('refresh_token')
}

export function getToken() {
  return localStorage.getItem('access_token')
}

export function getRefreshToken() {
  return localStorage.getItem('refresh_token')
}

export function clearToken() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}
