import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import AdminLayout from './components/AdminLayout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/admin/Dashboard.jsx'
import UserManagement from './pages/admin/UserManagement.jsx'
import FileManagement from './pages/admin/FileManagement.jsx'
import AuditLog from './pages/admin/AuditLog.jsx'
import SystemConfig from './pages/admin/SystemConfig.jsx'
import UserFiles from './pages/user/UserFiles.jsx'
import PublicFiles from './pages/user/PublicFiles.jsx'
import RecycleBin from './pages/RecycleBin.jsx'
import Profile from './pages/Profile.jsx'
import { logout as apiLogout } from './api/index.js'

export default function App() {
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem('auth')
    return saved ? JSON.parse(saved) : null
  })
  const [loading, setLoading] = useState(false)

  const handleLogin = (user) => {
    localStorage.setItem('auth', JSON.stringify(user))
    setAuth(user)
  }

  const handleLogout = async () => {
    await apiLogout()
    localStorage.removeItem('auth')
    setAuth(null)
  }

  if (!auth) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  const isAdmin = auth.role === 'admin'

  return (
    <Routes>
      {isAdmin ? (
        <Route element={<AdminLayout user={auth} onLogout={handleLogout} />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/files" element={<FileManagement />} />
          <Route path="/recycle-bin" element={<RecycleBin />} />
          <Route path="/audit" element={<AuditLog />} />
          <Route path="/config" element={<SystemConfig />} />
          <Route path="/profile" element={<Profile user={auth} onUpdate={setAuth} />} />
        </Route>
      ) : (
        <Route element={<AdminLayout user={auth} onLogout={handleLogout} />}>
          <Route path="/" element={<Navigate to="/my-files" replace />} />
          <Route path="/my-files" element={<UserFiles />} />
          <Route path="/public-files" element={<PublicFiles />} />
          <Route path="/recycle-bin" element={<RecycleBin />} />
          <Route path="/profile" element={<Profile user={auth} onUpdate={setAuth} />} />
        </Route>
      )}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
