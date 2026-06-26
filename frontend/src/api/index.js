import { api, setTokens, clearToken } from './client.js'

export { api }

// ── Auth ──

export async function login(account, password, remember = false, serial = '') {
  const headers = {}
  if (serial) headers['X-Serial-Number'] = serial
  const data = await api('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ account, password, remember }),
  })
  setTokens(data.data.access_token, data.data.refresh_token)
  return data.data.user
}

export async function logout() {
  try {
    await api('/auth/logout', { method: 'POST' })
  } catch {}
  clearToken()
}

export async function getMe() {
  const data = await api('/auth/me')
  return data.data
}

export async function changePassword(oldPassword, newPassword) {
  const data = await api('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  })
  return data
}

// ── Admin: Users ──

export async function getUsers(params = {}) {
  const qs = new URLSearchParams(params).toString()
  const data = await api(`/admin/users${qs ? '?' + qs : ''}`)
  return data.data
}

export async function getUser(id) {
  const data = await api(`/admin/users/${id}`)
  return data.data
}

export async function createUser(body) {
  const data = await api('/admin/users', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return data
}

export async function updateUser(id, body) {
  const data = await api(`/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  return data
}

export async function deleteUser(id) {
  const data = await api(`/admin/users/${id}`, { method: 'DELETE' })
  return data
}

export async function resetPassword(id, newPassword) {
  const data = await api(`/admin/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ new_password: newPassword }),
  })
  return data
}

// ── Admin: Permissions ──

export async function getPermissions(userId) {
  const data = await api(`/admin/users/${userId}/permissions`)
  return data.data
}

export async function setPermissions(userId, body) {
  const data = await api(`/admin/users/${userId}/permissions`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return data
}

// ── Admin: Dashboard ──

export async function getStats() {
  const data = await api('/admin/stats')
  return data.data
}

// ── Files ──

export async function getFiles(params = {}) {
  const qs = new URLSearchParams(params).toString()
  const data = await api(`/files/${qs ? '?' + qs : ''}`)
  return data.data
}

export async function getFilterOptions(scope = 'public') {
  const data = await api(`/files/filter-options?scope=${scope}`)
  return data.data
}

export async function uploadFiles(files, scope, directoryId) {
  const form = new FormData()
  for (const f of files) form.append('files', f)
  form.append('scope', scope || 'public')
  if (directoryId) form.append('directory_id', directoryId)
  const data = await api('/files/upload', { method: 'POST', body: form })
  return data.data || data
}

export async function deleteFile(id) {
  const data = await api(`/files/${id}`, { method: 'DELETE' })
  return data
}

export async function restoreFile(id) {
  const data = await api(`/files/${id}/restore`, { method: 'POST' })
  return data
}

export async function permanentDeleteFile(id) {
  const data = await api(`/files/${id}/permanent`, { method: 'DELETE' })
  return data
}

export async function emptyRecycleBin() {
  const data = await api('/files/recycle-bin/empty', { method: 'DELETE' })
  return data
}

export async function downloadFile(id, filename) {
  const blob = await api(`/files/${id}/download`, { responseType: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'download'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function previewFile(id) {
  const blob = await api(`/files/${id}/preview`, { responseType: 'blob' })
  return blob
}

export async function renameFile(id, name) {
  const data = await api(`/files/${id}/rename`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  })
  return data
}

export async function moveFile(id, targetDirectoryId) {
  const data = await api(`/files/${id}/move`, {
    method: 'PUT',
    body: JSON.stringify({ target_directory_id: targetDirectoryId }),
  })
  return data
}

export async function copyFile(id, targetDirectoryId) {
  const data = await api(`/files/${id}/copy`, {
    method: 'POST',
    body: JSON.stringify({ target_directory_id: targetDirectoryId }),
  })
  return data
}

export async function batchDeleteFiles(fileIds) {
  const data = await api('/files/batch/delete', {
    method: 'POST',
    body: JSON.stringify({ file_ids: fileIds }),
  })
  return data
}

export async function batchMoveFiles(fileIds, targetDirectoryId) {
  const data = await api('/files/batch/move', {
    method: 'POST',
    body: JSON.stringify({ file_ids: fileIds, target_directory_id: targetDirectoryId }),
  })
  return data
}

export async function batchCopyFiles(fileIds, targetDirectoryId) {
  const data = await api('/files/batch/copy', {
    method: 'POST',
    body: JSON.stringify({ file_ids: fileIds, target_directory_id: targetDirectoryId }),
  })
  return data
}

// ── Directories ──

export async function getDirectories(params = {}) {
  const qs = new URLSearchParams(params).toString()
  const data = await api(`/files/directories${qs ? '?' + qs : ''}`)
  return data.data
}

export async function createDirectory(body) {
  const data = await api('/files/directories', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return data
}

export async function deleteDirectory(id) {
  await api(`/files/directories/${id}`, { method: 'DELETE' })
}

export async function renameDirectory(id, name) {
  const data = await api(`/files/directories/${id}/rename`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  })
  return data
}

// ── Recycle Bin ──

export async function getRecycleBin(params = {}) {
  const qs = new URLSearchParams(params).toString()
  const data = await api(`/files/recycle-bin${qs ? '?' + qs : ''}`)
  return data.data
}

// ── Audit ──

export async function getAuditLogOptions(params = {}) {
  const qs = new URLSearchParams(params).toString()
  const data = await api(`/audit/log-options${qs ? '?' + qs : ''}`)
  return data.data
}

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

export async function updateConfig(body) {
  const data = await api('/admin/config', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  return data
}

// ── Announcements ──

export async function getAnnouncements() {
  const data = await api('/announcements/')
  return data.data
}

export async function createAnnouncement(body) {
  const data = await api('/announcements/', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return data
}

export async function deleteAnnouncement(id) {
  await api(`/announcements/${id}`, { method: 'DELETE' })
}

// ── Profile ──

export async function updateProfile(body) {
  const data = await api('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  return data
}
