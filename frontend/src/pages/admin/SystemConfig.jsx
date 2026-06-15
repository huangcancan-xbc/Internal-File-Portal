import { useState, useEffect } from 'react'
import { Shield, FileUp, ScrollText, Save } from 'lucide-react'
import { getConfig, updateConfig } from '../../api/index.js'

const defaults = {
  session_timeout: '30',
  login_max_attempts: '5',
  lockout_minutes: '30',
  single_file_max_mb: '50',
  batch_max_mb: '200',
  log_retention_days: '365',
}

export default function SystemConfig() {
  const [config, setConfig] = useState(defaults)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const items = await getConfig()
        if (items?.length) {
          const map = {}
          items.forEach(c => { map[c.key] = c.value })
          setConfig({
            session_timeout: map.SESSION_TIMEOUT_MINUTES || '30',
            login_max_attempts: map.LOGIN_MAX_ATTEMPTS || '5',
            lockout_minutes: map.LOGIN_LOCKOUT_MINUTES || '30',
            single_file_max_mb: String(Math.floor((parseInt(map.SINGLE_FILE_MAX_SIZE) || 52428800) / 1048576)),
            batch_max_mb: String(Math.floor((parseInt(map.BATCH_MAX_SIZE) || 209715200) / 1048576)),
            log_retention_days: map.LOG_RETENTION_DAYS || '365',
          })
        }
      } catch { /* use defaults */ }
      finally { setLoading(false) }
    })()
  }, [])

  const handleSave = async () => {
    setError('')
    try {
      await updateConfig('SESSION_TIMEOUT_MINUTES', config.session_timeout)
      await updateConfig('LOGIN_MAX_ATTEMPTS', config.login_max_attempts)
      await updateConfig('LOGIN_LOCKOUT_MINUTES', config.lockout_minutes)
      await updateConfig('SINGLE_FILE_MAX_SIZE', String(parseInt(config.single_file_max_mb) * 1048576))
      await updateConfig('BATCH_MAX_SIZE', String(parseInt(config.batch_max_mb) * 1048576))
      await updateConfig('LOG_RETENTION_DAYS', config.log_retention_days)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) { setError(err.message) }
  }

  const update = (k, v) => setConfig(prev => ({ ...prev, [k]: v }))

  const card = "bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden"
  const header = "px-5 py-4 border-b border-[var(--color-border)] flex items-center gap-2.5"
  const label = "block text-sm font-medium text-[var(--color-text-muted)] mb-1.5"
  const input = "w-full px-4 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text)]">系统配置</h1>
        <p className="text-sm text-[var(--color-text-subtle)] mt-1">全局安全策略与参数管理</p>
      </div>

      {error && (
        <div className="bg-[var(--color-danger-light)] border border-red-300 dark:border-red-800 text-[var(--color-danger)] text-sm rounded-lg px-4 py-2.5">{error}</div>
      )}

      {/* ── 登录安全 ── */}
      <div className={card}>
        <div className={header}>
          <Shield size={18} className="text-[var(--color-text-muted)]" />
          <h2 className="font-semibold text-[var(--color-text)]">登录安全</h2>
          <span className="text-xs text-[var(--color-text-subtle)] ml-auto">会话与锁定策略</span>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className={label}>会话超时（分钟）</label>
              <input type="number" value={config.session_timeout} onChange={e => update('session_timeout', e.target.value)} className={input} />
              <p className="text-xs text-[var(--color-text-subtle)] mt-1">超时后自动退出登录</p>
            </div>
            <div>
              <label className={label}>密码错误上限</label>
              <input type="number" value={config.login_max_attempts} onChange={e => update('login_max_attempts', e.target.value)} className={input} />
              <p className="text-xs text-[var(--color-text-subtle)] mt-1">连续错误达此次数锁定</p>
            </div>
            <div>
              <label className={label}>锁定时长（分钟）</label>
              <input type="number" value={config.lockout_minutes} onChange={e => update('lockout_minutes', e.target.value)} className={input} />
              <p className="text-xs text-[var(--color-text-subtle)] mt-1">锁定后自动解锁时间</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 文件上传 ── */}
      <div className={card}>
        <div className={header}>
          <FileUp size={18} className="text-[var(--color-text-muted)]" />
          <h2 className="font-semibold text-[var(--color-text)]">文件上传</h2>
          <span className="text-xs text-[var(--color-text-subtle)] ml-auto">大小限制</span>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={label}>单文件最大（MB）</label>
              <input type="number" value={config.single_file_max_mb} onChange={e => update('single_file_max_mb', e.target.value)} className={input} />
              <p className="text-xs text-[var(--color-text-subtle)] mt-1">超过此大小的文件拒绝上传</p>
            </div>
            <div>
              <label className={label}>批量总大小（MB）</label>
              <input type="number" value={config.batch_max_mb} onChange={e => update('batch_max_mb', e.target.value)} className={input} />
              <p className="text-xs text-[var(--color-text-subtle)] mt-1">单次批量上传的总上限</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 审计日志 ── */}
      <div className={card}>
        <div className={header}>
          <ScrollText size={18} className="text-[var(--color-text-muted)]" />
          <h2 className="font-semibold text-[var(--color-text)]">审计日志</h2>
          <span className="text-xs text-[var(--color-text-subtle)] ml-auto">留存策略</span>
        </div>
        <div className="p-5">
          <div>
            <label className={label}>日志留存天数</label>
            <input type="number" value={config.log_retention_days} onChange={e => update('log_retention_days', e.target.value)} className={`${input} max-w-xs`} />
            <p className="text-xs text-[var(--color-text-subtle)] mt-1">超过天数的日志将被自动清理</p>
          </div>
        </div>
      </div>

      {/* ── 操作 ── */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium rounded-lg cursor-pointer">
          <Save size={16} /> {saved ? '已保存' : '保存配置'}
        </button>
        {saved && <span className="text-sm text-[var(--color-success)]">✓ 配置已生效</span>}
      </div>
    </div>
  )
}
