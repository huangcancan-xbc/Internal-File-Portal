import { useState, useEffect, useRef } from 'react'
import { Bell, Megaphone, X, Plus, Trash2, Send } from 'lucide-react'

const BASE = '/api'

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('zh-CN', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', hour12:false })
}

export default function NotificationBell({ isAdmin }) {
  const [open, setOpen] = useState(false)
  const [anns, setAnns] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPublish, setShowPublish] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const ref = useRef(null)

  // Read IDs from localStorage
  const getReadIds = () => {
    try { return JSON.parse(localStorage.getItem('read_anns') || '[]') }
    catch { return [] }
  }
  const [readIds, setReadIds] = useState(getReadIds)

  const unreadCount = anns.filter(a => !readIds.includes(a.id)).length

  const fetchAnns = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${BASE}/announcements/?per_page=20`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (!res.ok) throw new Error('加载失败')
      const data = await res.json()
      setAnns(data.data.items || [])
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    // Fetch on mount and poll every 10s so badge updates quickly
    fetchAnns()
    const interval = setInterval(() => fetchAnns(), 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Also refresh when opening dropdown
    if (open) fetchAnns()
  }, [open])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const markAllRead = () => {
    const all = anns.map(a => a.id)
    localStorage.setItem('read_anns', JSON.stringify(all))
    setReadIds(all)
  }

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) return
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token') || ''
      const res = await fetch(`${BASE}/announcements/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ title: title.trim(), content: content.trim() })
      })
      if (!res.ok) throw new Error((await res.json()).error || '发布失败')
      setShowPublish(false); setTitle(''); setContent('')
      fetchAnns()
    } catch (err) { setError(err.message) }
  }

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token') || ''
      await fetch(`${BASE}/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchAnns()
    } catch (err) { setError(err.message) }
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-[var(--color-primary-light)] text-[var(--color-text-muted)] cursor-pointer"
        aria-label="通知"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[var(--color-surface)] rounded-xl shadow-2xl border border-[var(--color-border)] z-40 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <Megaphone size={16} className="text-[var(--color-primary)]" />
              <h3 className="text-sm font-semibold text-[var(--color-text)]">系统公告</h3>
              {unreadCount > 0 && (
                <span className="text-xs text-red-500 font-medium">{unreadCount} 条未读</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-primary)] px-2 py-1 cursor-pointer">全部已读</button>
              )}
              {isAdmin && (
                <button onClick={() => { setShowPublish(true); setOpen(false) }}
                  className="p-1 rounded hover:bg-[var(--color-primary-light)] text-[var(--color-text-muted)] cursor-pointer" title="发布公告">
                  <Plus size={16} />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading && (
              <div className="p-8 text-center text-[var(--color-text-subtle)] text-sm">加载中...</div>
            )}
            {error && (
              <div className="p-4 text-center text-[var(--color-danger)] text-sm">{error}</div>
            )}
            {!loading && !error && anns.length === 0 && (
              <div className="p-8 text-center text-[var(--color-text-subtle)] text-sm">
                <Megaphone size={32} className="mx-auto mb-2 opacity-30" />
                暂无公告
              </div>
            )}
            {anns.map(ann => (
              <div key={ann.id} className={`px-4 py-3 border-b border-[var(--color-border)] last:border-0 ${readIds.includes(ann.id) ? '' : 'bg-[var(--color-primary-light)]/30'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!readIds.includes(ann.id) && (
                        <span className="w-2 h-2 bg-[var(--color-primary)] rounded-full shrink-0" />
                      )}
                      <h4 className="text-sm font-medium text-[var(--color-text)] truncate">{ann.title}</h4>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed line-clamp-3">{ann.content}</p>
                    <p className="text-[10px] text-[var(--color-text-subtle)] mt-1.5">
                      {ann.author_name} · {fmtTime(ann.created_at)}
                    </p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDelete(ann.id)} className="p-1 rounded hover:bg-[var(--color-danger-light)] text-[var(--color-text-subtle)] hover:text-[var(--color-danger)] cursor-pointer shrink-0" title="删除">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Publish Modal (admin only) */}
      {showPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowPublish(false)}>
          <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-lg border border-[var(--color-border)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <Megaphone size={18} className="text-[var(--color-primary)]" />
                <h3 className="font-semibold text-[var(--color-text)]">发布公告</h3>
              </div>
              <button onClick={() => setShowPublish(false)} className="p-1.5 rounded-lg hover:bg-[var(--color-danger-light)] text-[var(--color-text-muted)] cursor-pointer"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">标题</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="公告标题..." className="w-full px-4 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">内容</label>
                <textarea value={content} onChange={e => setContent(e.target.value)}
                  placeholder="公告内容..." rows={5}
                  className="w-full px-4 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] resize-none" />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-[var(--color-border)] flex justify-end gap-2">
              <button onClick={() => setShowPublish(false)} className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)] rounded-lg cursor-pointer">取消</button>
              <button onClick={handlePublish} disabled={!title.trim() || !content.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white text-sm font-medium rounded-lg cursor-pointer disabled:cursor-not-allowed">
                <Send size={14} />发布
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
