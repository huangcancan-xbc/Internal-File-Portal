import { useState } from 'react'
import { FolderOpen, Eye, EyeOff, Shield, Sun, Moon } from 'lucide-react'
import { login as apiLogin } from '../api/index.js'
import { useTheme } from '../components/ThemeContext.jsx'

export default function Login({ onLogin }) {
  const { dark, toggle } = useTheme()
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await apiLogin(account, password)
      onLogin(user)
    } catch (err) {
      setError(err.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"

  return (
    <div className="min-h-screen flex items-center justify-center login-bg p-4 relative">
      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="absolute top-4 right-4 p-2.5 rounded-xl bg-[var(--color-surface)] shadow-md hover:shadow-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] cursor-pointer transition-all"
        aria-label={dark ? '切换到亮色模式' : '切换到暗色模式'}
      >
        {dark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="w-full max-w-md login-enter">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl mb-4 shadow-lg">
            <FolderOpen size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">文件全流程管控系统</h1>
          <p className="text-sm text-[var(--color-text-subtle)] mt-1">File Lifecycle Control System</p>
        </div>

        <div className="bg-[var(--color-surface)] rounded-2xl shadow-lg border border-[var(--color-border)] p-8">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[var(--color-border)]">
            <Shield size={18} className="text-[var(--color-success)]" />
            <span className="text-sm font-medium text-[var(--color-text-muted)]">安全登录认证</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="account" className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">用户名</label>
              <input id="account" type="text" value={account} onChange={e => setAccount(e.target.value)}
                placeholder="请输入用户名" className={inputClass} required autoFocus />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">密码</label>
              <div className="relative">
                <input id="password" type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="请输入密码" className={inputClass + " pr-10"} required />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] cursor-pointer">
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && (
              <div className="bg-[var(--color-danger-light)] border border-red-300 dark:border-red-800 text-[var(--color-danger)] text-sm rounded-lg px-4 py-2.5">{error}</div>
            )}
            <button type="submit" disabled={loading || !account || !password}
              className="w-full py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-40 text-white font-medium rounded-lg cursor-pointer">
              {loading ? '验证中...' : '登录系统'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
