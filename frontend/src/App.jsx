import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import AdminLayout from './components/AdminLayout.jsx'
import Login from './pages/Login.jsx'
import { logout as apiLogout } from './api/index.js'

// Admin pages
import Dashboard from './pages/admin/Dashboard.jsx'
import UserManagement from './pages/admin/UserManagement.jsx'
import FileManagement from './pages/admin/FileManagement.jsx'
import AuditLog from './pages/admin/AuditLog.jsx'
import SystemConfig from './pages/admin/SystemConfig.jsx'

// User pages
import UserFiles from './pages/user/UserFiles.jsx'
import PublicFiles from './pages/user/PublicFiles.jsx'

// Shared pages
import RecycleBin from './pages/RecycleBin.jsx'
import Profile from './pages/Profile.jsx'

export default function App() {
  const [auth, setAuth] = useState(() => {
    try {
      const saved = localStorage.getItem('auth')
      return saved ? JSON.parse(saved) : null
    } catch {
      localStorage.removeItem('auth')
      return null
    }
  })

  // Listen for token expiration events from API client
  useEffect(() => {
    const onExpired = () => setAuth(null)
    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [])

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
    <AdminLayout user={auth} onLogout={handleLogout} onUpdate={setAuth} isAdmin={isAdmin}>
      <PageRoutes key={auth.id || auth.account} isAdmin={isAdmin} user={auth} onUpdate={setAuth} />
    </AdminLayout>
  )
}

/**
 * Inner component that handles route switching.
 * Uses useLocation().pathname as a key on each page element
 * to guarantee React unmounts/remounts on every navigation.
 */
function PageRoutes({ isAdmin, user, onUpdate }) {
  const location = useLocation()
  const key = location.pathname

  if (isAdmin) {
    switch (location.pathname) {
      case '/dashboard':
        return <Dashboard key={key} />
      case '/users':
        return <UserManagement key={key} />
      case '/files':
        return <FileManagement key={key} />
      case '/recycle-bin':
        return <RecycleBin key={key} />
      case '/audit':
        return <AuditLog key={key} />
      case '/config':
        return <SystemConfig key={key} />
      case '/profile':
        return <Profile key={key} user={user} onUpdate={onUpdate} />
      case '/':
        return <Navigate to="/dashboard" replace />
      default:
        return <Navigate to="/dashboard" replace />
    }
  }

  // Regular user routes
  switch (location.pathname) {
    case '/my-files':
      return <UserFiles key={key} />
    case '/public-files':
      return <PublicFiles key={key} />
    case '/profile':
      return <Profile key={key} user={user} onUpdate={onUpdate} />
    case '/':
      return <Navigate to="/my-files" replace />
    default:
      return <Navigate to="/my-files" replace />
  }
}
