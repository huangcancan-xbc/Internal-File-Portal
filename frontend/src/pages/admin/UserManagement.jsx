import { useState, useEffect, useRef } from 'react'
import { UserPlus, Search, Key, Ban, Pencil, X, Save, Trash2 } from 'lucide-react'
import { getUsers, createUser, updateUser, resetPassword } from '../../api/index.js'

const DEPTS = ['开发', '售前', '售后']

// Get current logged-in user info from localStorage
function getMe() {
  try { return JSON.parse(localStorage.getItem('auth') || '{}') }
  catch { return {} }
}

export default function UserManagement() {
  const me = getMe()
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editUser, setEditUser] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  const [editForm, setEditForm] = useState({ account: '', username: '', department: '', role: 'user' })
  const [createForm, setCreateForm] = useState({ account: '', username: '', password: '', department: '开发', role: 'user' })

  const searchRef = useRef(search)
  searchRef.current = search

  const fetchUsers = async () => {
    setLoading(true); setError('')
    try {
      const params = { page, per_page: 20 }
      const kw = searchRef.current
      if (kw) params.keyword = kw
      const data = await getUsers(params)
      setUsers(data.items || [])
      setTotal(data.total || 0)
      setPages(data.pages || 0)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError('')
    const params = { page, per_page: 20 }
    const kw = searchRef.current
    if (kw) params.keyword = kw
    getUsers(params)
      .then(data => {
        if (cancelled) return
        setUsers(data.items || [])
        setTotal(data.total || 0)
        setPages(data.pages || 0)
      })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [page])

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchUsers() }

  const handleToggleStatus = async (user) => {
    if (!confirm(`确定${user.status === 'active' ? '禁用' : '启用'} "${user.username}" 吗？`)) return
    try {
      await updateUser(user.id, { status: user.status === 'active' ? 'disabled' : 'active' })
      fetchUsers()
    } catch (err) { setError(err.message) }
  }

  const handleResetPassword = async (user) => {
    const pwd = prompt(`为 "${user.username}" 设置新密码（留空自动生成）：`)
    try {
      const result = await resetPassword(user.id, pwd || undefined)
      alert(pwd ? '密码已重置' : `已生成新密码: ${result.new_password}`)
    } catch (err) { setError(err.message) }
  }

  const openEdit = (user) => {
    setEditUser(user)
    setEditForm({
      account: user.account || '',
      username: user.username || '',
      department: user.department || '',
      role: user.role || 'user',
    })
  }

  const handleSaveEdit = async () => {
    if (!editUser) return
    try { await updateUser(editUser.id, editForm); setEditUser(null); fetchUsers() }
    catch (err) { setError(err.message) }
  }

  const handleDelete = async (user) => {
    if (!confirm(`确定永久删除用户 "${user.username}"（${user.account}）吗？此操作不可恢复。`)) return
    try {
      await updateUser(user.id, { status: 'deleted' })
      fetchUsers()
    } catch (err) { setError(err.message) }
  }

  const handleCreate = async () => {
    setError('')
    if (!createForm.username || !createForm.password) {
      setError('真实姓名和密码不能为空'); return
    }
    try {
      await createUser(createForm)
      setShowCreate(false)
      setCreateForm({ account: '', username: '', password: '', department: '开发', role: 'user' })
      fetchUsers()
    } catch (err) { setError(err.message) }
  }

  const card = "bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden"
  const th = "text-left px-5 py-3 text-xs font-medium text-[var(--color-text-subtle)] uppercase tracking-wider"
  const td = "px-5 py-2.5"
  const input = "w-full pl-10 pr-4 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-primary)]"
  const btnIcon = "p-1.5 rounded hover:bg-[var(--color-primary-light)] text-[var(--color-text-muted)] cursor-pointer"
  const modalInput = "w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">用户管理</h1>
          <p className="text-sm text-[var(--color-text-subtle)] mt-1">管理系统用户账号与权限</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-medium rounded-lg cursor-pointer">
          <UserPlus size={16} /> 新增用户
        </button>
      </div>

      <form onSubmit={handleSearch} className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索账号或姓名..." className={input} />
        </div>
        <button type="submit" className="px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-muted)] text-sm rounded-lg cursor-pointer">搜索</button>
      </form>

      {error && !showCreate && (
        <div className="bg-[var(--color-danger-light)] border border-red-300 dark:border-red-800 text-[var(--color-danger)] text-sm rounded-lg px-4 py-2.5">{error}</div>
      )}

      <div className={card}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-bg)]/50">
                <th className={th}>真实姓名</th><th className={th}>用户名</th><th className={th}>部门</th>
                <th className={th}>角色</th><th className={th}>状态</th><th className={th}>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map(user => (
                  <tr key={user.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-primary-light)]">
                    <td className={`${td} text-[var(--color-text)] font-bold text-sm`}>{user.username}</td>
                    <td className={`${td} font-mono text-xs text-[var(--color-text-muted)]`}>{user.account}</td>
                    <td className={`${td} text-[var(--color-text-muted)] text-xs`}>{user.department || '-'}</td>
                    <td className={td}>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${user.role === 'admin' ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'}`}>
                        {user.role === 'admin' ? '管理员' : '普通用户'}
                      </span>
                    </td>
                    <td className={td}>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.status === 'active' ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : 'bg-[var(--color-danger-light)] text-[var(--color-danger)]'}`}>
                      {user.status === 'active' ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className={td}>
                    <div className="flex items-center gap-1">
                      <button className={btnIcon} onClick={() => openEdit(user)} title="编辑"><Pencil size={14} /></button>
                      <button className={btnIcon} onClick={() => handleResetPassword(user)} title="重置密码"><Key size={14} /></button>
                      {me.id !== user.id && user.status !== 'deleted' && (
                        <button className="p-1.5 rounded hover:bg-[var(--color-danger-light)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] cursor-pointer" onClick={() => handleToggleStatus(user)} title={user.status === 'active' ? '禁用' : '启用'}><Ban size={14} /></button>
                      )}
                      {user.status === 'disabled' && (
                        <button className="p-1.5 rounded hover:bg-red-100 text-[var(--color-text-muted)] hover:text-red-600 cursor-pointer" onClick={() => handleDelete(user)} title="永久删除"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
                ))
                ) : !loading ? (
                  <tr key="__users_empty__"><td colSpan={6} className="px-5 py-8 text-center text-[var(--color-text-subtle)] text-sm">暂无用户</td></tr>
                ) : null}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-[var(--color-border)] flex items-center justify-between text-sm text-[var(--color-text-subtle)]">
          <span><span>共 {total} 个用户</span>{loading && <span>· 加载中...</span>}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1} className="px-3 py-1 rounded border border-[var(--color-border)] hover:bg-[var(--color-primary-light)] text-xs cursor-pointer disabled:opacity-40">上一页</button>
            <span className="text-xs px-2">{page} / {pages || 1}</span>
            <button onClick={() => setPage(p => p+1)} disabled={page >= pages} className="px-3 py-1 rounded border border-[var(--color-border)] hover:bg-[var(--color-primary-light)] text-xs cursor-pointer disabled:opacity-40">下一页</button>
            {pages > 1 && (
              <span className="flex items-center gap-1 ml-2">
                <input type="number" min={1} max={pages} placeholder="页码"
                  onKeyDown={e => { if (e.key === 'Enter') { const v = parseInt(e.target.value); if (v >= 1 && v <= pages) { setPage(v); e.target.value = '' } }}}
                  className="w-14 px-2 py-1 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-center focus:outline-none focus:border-[var(--color-primary)]" />
                <button onClick={e => { const inp = e.target.previousElementSibling; const v = parseInt(inp.value); if (v >= 1 && v <= pages) { setPage(v); inp.value = '' }}}
                  className="px-2 py-1 rounded border border-[var(--color-border)] hover:bg-[var(--color-primary-light)] text-xs cursor-pointer">跳转</button>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-sm border border-[var(--color-border)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
              <h3 className="font-semibold text-[var(--color-text)]">新增用户</h3>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-[var(--color-danger-light)] text-[var(--color-text-muted)] cursor-pointer"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-[var(--color-text-muted)] mb-1">真实姓名 *</label><input value={createForm.username} onChange={e => setCreateForm(f => ({...f, username: e.target.value}))} className={modalInput} required /></div>
                <div><label className="block text-xs text-[var(--color-text-muted)] mb-1">用户名</label><input value={createForm.account} onChange={e => setCreateForm(f => ({...f, account: e.target.value}))} placeholder="留空=拼音自动生成" className={modalInput} /></div>
              </div>
              <div><label className="block text-xs text-[var(--color-text-muted)] mb-1">密码 *</label><input type="password" value={createForm.password} onChange={e => setCreateForm(f => ({...f, password: e.target.value}))} className={modalInput} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1">部门</label>
                  <select value={createForm.department} onChange={e => setCreateForm(f => ({...f, department: e.target.value}))} className={modalInput}>
                    {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1">角色</label>
                  <select value={createForm.role} onChange={e => setCreateForm(f => ({...f, role: e.target.value}))} className={modalInput}>
                    <option value="user">普通用户</option><option value="admin">管理员</option>
                  </select>
                </div>
              </div>
            </div>
            {error && (
              <div className="mx-5 mb-1 p-3 bg-red-50 border-2 border-red-400 text-red-700 dark:bg-red-950 dark:border-red-600 dark:text-red-200 rounded-xl text-sm font-medium flex items-center gap-2">
                <span className="text-lg">⚠️</span> {error}
              </div>
            )}
            <div className="px-5 py-3 border-t border-[var(--color-border)] flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)] rounded-lg cursor-pointer">取消</button>
              <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm rounded-lg cursor-pointer"><Save size={14} />创建</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setEditUser(null)}>
          <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-sm border border-[var(--color-border)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
              <h3 className="font-semibold text-[var(--color-text)]">编辑 — {editUser.account}</h3>
              <button onClick={() => setEditUser(null)} className="p-1.5 rounded-lg hover:bg-[var(--color-danger-light)] text-[var(--color-text-muted)] cursor-pointer"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="block text-xs text-[var(--color-text-muted)] mb-1">用户名</label><input value={editForm.account} onChange={e => setEditForm(f => ({...f, account: e.target.value}))} className={modalInput} /></div>
              <div><label className="block text-xs text-[var(--color-text-muted)] mb-1">真实姓名</label><input value={editForm.username} onChange={e => setEditForm(f => ({...f, username: e.target.value}))} className={modalInput} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1">部门</label>
                  <select value={editForm.department} onChange={e => setEditForm(f => ({...f, department: e.target.value}))} className={modalInput}>
                    <option value="">--</option>
                    {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1">角色</label>
                  <select value={editForm.role} onChange={e => setEditForm(f => ({...f, role: e.target.value}))} className={modalInput}>
                    <option value="user">普通用户</option><option value="admin">管理员</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-[var(--color-border)] flex justify-end gap-2">
              <button onClick={() => setEditUser(null)} className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)] rounded-lg cursor-pointer">取消</button>
              <button onClick={handleSaveEdit} className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm rounded-lg cursor-pointer"><Save size={14} />保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
