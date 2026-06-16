import Sidebar from './Sidebar.jsx'
import { useTheme } from './ThemeContext.jsx'
import NotificationBell from './NotificationBell.jsx'
import { useState } from 'react'
import { Menu, User, LogOut, Sun, Moon } from 'lucide-react'

export default function AdminLayout({ user, onLogout, onUpdate, isAdmin, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { dark, toggle } = useTheme()

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <Sidebar isAdmin={isAdmin} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top navbar */}
        <header className="h-16 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between px-4 lg:px-6 shrink-0">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-[var(--color-primary-light)] text-[var(--color-text-muted)] cursor-pointer"
            onClick={() => setSidebarOpen(true)}
            aria-label="打开菜单"
          >
            <Menu size={22} />
          </button>

          <div className="hidden lg:block">
            <h2 className="text-sm font-medium text-[var(--color-text-subtle)]">
              {isAdmin ? '系统管理员' : '普通用户'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="p-2 rounded-lg hover:bg-[var(--color-primary-light)] text-[var(--color-text-muted)] cursor-pointer"
              aria-label={dark ? '切换到亮色模式' : '切换到暗色模式'}
              title={dark ? '亮色模式' : '暗色模式'}
            >
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <NotificationBell isAdmin={isAdmin} />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
              <span className="text-sm font-medium text-[var(--color-text)] hidden sm:block">{user.username}</span>
            </div>

            <button
              onClick={onLogout}
              className="p-2 rounded-lg hover:bg-[var(--color-danger-light)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] cursor-pointer"
              aria-label="退出登录"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
