import { useState } from 'react'
import { User, Save, Key } from 'lucide-react'
import { api } from '../api/index.js'

const DEPTS = ['开发', '售前', '售后']

export default function Profile({ user, onUpdate }) {
  const [form, setForm] = useState({
    account: user?.account || '',
    department: user?.department || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')

  const inputCls = "w-full px-4 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
  const labelCls = "block text-sm font-medium text-[var(--color-text-muted)] mb-1.5"

  const handleSaveInfo = async (e) => {
    e.preventDefault()
    setError(''); setSuccess(''); setSaving(true)
    try {
      const res = await api('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ account: form.account, department: form.department })
      })
      setSuccess('个人信息已更新')
      const updated = res.data || { ...user, account: form.account, department: form.department }
      localStorage.setItem('auth', JSON.stringify(updated))
      if (onUpdate) onUpdate(updated)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const handleChangePwd = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (newPwd !== confirmPwd) { setError('两次新密码不一致'); return }
    setSaving(true)
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ old_password: oldPwd, new_password: newPwd })
      })
      setSuccess('密码已更新')
      setOldPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  if (!user) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text)]">个人信息</h1>
        <p className="text-sm text-[var(--color-text-subtle)] mt-1">管理您的个人资料与密码</p>
      </div>

      {error && <div className="bg-[var(--color-danger-light)] border border-red-300 dark:border-red-800 text-[var(--color-danger)] text-sm rounded-lg px-4 py-2.5">{error}</div>}
      {success && <div className="bg-[var(--color-success-light)] border border-green-300 dark:border-green-800 text-[var(--color-success)] text-sm rounded-lg px-4 py-2.5">{success}</div>}

      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center gap-2">
          <User size={18} className="text-[var(--color-text-muted)]" />
          <h2 className="font-semibold text-[var(--color-text)]">基本资料</h2>
        </div>
        <form onSubmit={handleSaveInfo} className="p-5 space-y-4">
          <div>
            <label className={labelCls}>真实姓名</label>
            <input type="text" value={user.username} disabled className={`${inputCls} opacity-60 cursor-not-allowed`} />
            <p className="text-xs text-[var(--color-text-subtle)] mt-1">真实姓名不可修改</p>
          </div>
          <div>
            <label className={labelCls}>角色</label>
            <input type="text" value={user.role === 'admin' ? '管理员' : '普通用户'} disabled className={`${inputCls} opacity-60 cursor-not-allowed`} />
          </div>
          <div>
            <label className={labelCls}>登录账号</label>
            <input type="text" value={form.account} onChange={e => setForm(f => ({...f, account: e.target.value}))} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>部门</label>
            <select value={form.department} onChange={e => setForm(f => ({...f, department: e.target.value}))} className={inputCls}>
              <option value="">-- 请选择 --</option>
              {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="pt-2">
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-medium rounded-lg cursor-pointer disabled:opacity-60">
              <Save size={14} /> {saving ? '保存中...' : '保存修改'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center gap-2">
          <Key size={18} className="text-[var(--color-text-muted)]" />
          <h2 className="font-semibold text-[var(--color-text)]">修改密码</h2>
        </div>
        <form onSubmit={handleChangePwd} className="p-5 space-y-4">
          <div>
            <label className={labelCls}>当前密码</label>
            <input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)} className={inputCls} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>新密码</label>
              <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} className={inputCls} required minLength={6} />
            </div>
            <div>
              <label className={labelCls}>确认新密码</label>
              <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} className={inputCls} required minLength={6} />
            </div>
          </div>
          <div className="pt-2">
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-medium rounded-lg cursor-pointer disabled:opacity-60">
              <Key size={14} /> {saving ? '更新中...' : '修改密码'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
