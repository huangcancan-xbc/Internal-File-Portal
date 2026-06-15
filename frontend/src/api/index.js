const BASE_URL = '/api'

export function getToken() {
  return localStorage.getItem('access_token')
}

function getRefreshToken() {
  return localStorage.getItem('refresh_token')
}

export function setTokens(access, refresh) {
  localStorage.setItem('access_token', access)
  if (refresh) localStorage.setItem('refresh_token', refresh)
}

export function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

async function refreshAccessToken() {
  const refresh = getRefreshToken()
  if (!refresh) return false
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${refresh}` }
    })
    if (!res.ok) return false
    const data = await res.json()
    setTokens(data.access_token, null)
    return true
  } catch {
    return false
  }
}

export async function api(path, options = {}) {
  const token = getToken()
  const headers = {
    ...options.headers,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  let res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  // If 401, try refresh
  if (res.status === 401 && getRefreshToken()) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getToken()}`
      res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
    }
  }

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const err = new Error(data?.error || `请求失败 (${res.status})`)
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}

// ── Auth ──

export async function login(account, password, remember = false) {
  const data = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ account, password, remember })
  })
  setTokens(data.data.access_token, data.data.refresh_token)
  return data.data.user
}

export async function updateProfile(profileData) {
  const data = await api('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData)
  })
  return data.data
}

export async function logout() {
  try { await api('/auth/logout', { method: 'POST' }) } catch {}
  clearTokens()
}

export async function getMe() {
  const data = await api('/auth/me')
  return data.data
}

// ── Users (admin) ──

export async function getUsers(params = {}) {
  const qs = new URLSearchParams(params).toString()
  const data = await api(`/admin/users${qs ? '?' + qs : ''}`)
  return data.data
}

export async function createUser(userData) {
  const data = await api('/admin/users', {
    method: 'POST',
    body: JSON.stringify(userData)
  })
  return data.data
}

export async function updateUser(id, userData) {
  const data = await api(`/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData)
  })
  return data.data
}

export async function deleteUser(id) {
  await api(`/admin/users/${id}`, { method: 'DELETE' })
}

export async function resetPassword(id, newPassword) {
  const data = await api(`/admin/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ new_password: newPassword })
  })
  return data.data
}

// ── Files ──

export async function getFiles(params = {}) {
  const qs = new URLSearchParams(params).toString()
  const data = await api(`/files/${qs ? '?' + qs : ''}`)
  return data.data
}

export async function uploadFiles(files, scope = 'public', directoryId = null) {
  const form = new FormData()
  for (const f of files) form.append('files', f)
  if (scope) form.append('scope', scope)
  if (directoryId) form.append('directory_id', directoryId)
  const data = await api('/files/upload', {
    method: 'POST',
    body: form
  })
  return data.data
}

export async function deleteFile(id) {
  await api(`/files/${id}`, { method: 'DELETE' })
}

export async function renameFile(id, newName) {
  const data = await api(`/files/${id}/rename`, {
    method: 'PUT',
    body: JSON.stringify({ name: newName })
  })
  return data.data
}

export async function copyFile(id, targetDir, copyType = 'internal') {
  const data = await api(`/files/${id}/copy`, {
    method: 'POST',
    body: JSON.stringify({ target_directory_id: targetDir, copy_type: copyType })
  })
  return data.data
}

// ── Recycle Bin ──

export async function getRecycleBin(params = {}) {
  const qs = new URLSearchParams(params).toString()
  const data = await api(`/files/recycle-bin${qs ? '?' + qs : ''}`)
  return data.data
}

export async function restoreFile(id) {
  const data = await api(`/files/${id}/restore`, { method: 'POST' })
  return data.data
}

export async function permanentDeleteFile(id) {
  return await api(`/files/${id}/permanent`, { method: 'DELETE' })
}

export async function emptyRecycleBin() {
  return await api('/files/recycle-bin/empty', { method: 'DELETE' })
}

export function getDownloadUrl(id) {
  return `${BASE_URL}/files/${id}/download`
}

export function getPreviewUrl(id) {
  return `${BASE_URL}/files/${id}/preview`
}

// Authenticated download (sends JWT, triggers browser download)
// copyType: null=normal download, 'local'=拷贝到本地
export async function downloadFile(id, filename, copyType) {
  const token = getToken()
  const fetchUrl = copyType
    ? `${BASE_URL}/files/${id}/download?copy_type=${copyType}`
    : `${BASE_URL}/files/${id}/download`
  const res = await fetch(fetchUrl, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '下载失败')
  }
  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename || 'download'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
}

// Authenticated preview (sends JWT, opens in new tab)
export async function previewFile(id) {
  const token = getToken()
  const res = await fetch(`${BASE_URL}/files/${id}/preview`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '预览失败')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

// ── Directories ──

export async function getDirectories(params = {}) {
  const qs = new URLSearchParams(params).toString()
  const data = await api(`/files/directories${qs ? '?' + qs : ''}`)
  return data.data
}

export async function createDirectory(name, scope = 'public', parentId = null) {
  const data = await api('/files/directories', {
    method: 'POST',
    body: JSON.stringify({ name, scope, parent_id: parentId })
  })
  return data.data
}

export async function deleteDirectory(id) {
  await api(`/files/directories/${id}`, { method: 'DELETE' })
}

// ── Audit ──

export async function getAuditLogs(params = {}) {
  const qs = new URLSearchParams(params).toString()
  const data = await api(`/audit/logs${qs ? '?' + qs : ''}`)
  return data.data
}

export async function getCopyAudits(params = {}) {
  const qs = new URLSearchParams(params).toString()
  const data = await api(`/audit/copy${qs ? '?' + qs : ''}`)
  return data.data
}

// ── Config ──

export async function getConfig() {
  const data = await api('/admin/config')
  return data.data
}

export async function updateConfig(key, value, description) {
  const data = await api('/admin/config', {
    method: 'PUT',
    body: JSON.stringify({ key, value, description })
  })
  return data.data
}
