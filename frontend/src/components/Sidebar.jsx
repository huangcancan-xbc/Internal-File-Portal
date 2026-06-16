import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, FolderOpen, ScrollText, Settings,
  FileText, Globe, X, User, Trash2
} from 'lucide-react'

const adminLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: '系统概览' },
  { to: '/users', icon: Users, label: '用户管理' },
  { to: '/files', icon: FolderOpen, label: '文件管理' },
  { to: '/recycle-bin', icon: Trash2, label: '回收站' },
  { to: '/audit', icon: ScrollText, label: '审计日志' },
  { to: '/config', icon: Settings, label: '系统配置' },
  { to: '/profile', icon: User, label: '个人信息' },
]

const userLinks = [
  { to: '/my-files', icon: FileText, label: '我的文件' },
  { to: '/public-files', icon: Globe, label: '公共目录' },
  { to: '/profile', icon: User, label: '个人信息' },
]

export default function Sidebar({ isAdmin, onClose }) {
  const links = isAdmin ? adminLinks : userLinks

  return (
    <div className="flex flex-col h-full">
      {/* Logo area */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
            <FolderOpen size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[var(--color-text)] leading-tight">文件管控系统</h1>
            <p className="text-[10px] text-[var(--color-text-subtle)] leading-tight">File Control System</p>
          </div>
        </div>
        <button className="lg:hidden p-1 rounded hover:bg-[var(--color-primary-light)] text-[var(--color-text-muted)] cursor-pointer" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
                isActive
                  ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)]'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-text-subtle)] text-center">v1.0 · 文件全流程管控</p>
      </div>
    </div>
  )
}
