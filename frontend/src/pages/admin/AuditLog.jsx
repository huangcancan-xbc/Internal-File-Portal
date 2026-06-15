import { useState, useEffect } from 'react'
import { Search, Download } from 'lucide-react'
import { getAuditLogs } from '../../api/index.js'

// ── Chinese translations ──
const actionLabel = {
  login: '登录', logout: '登出', upload: '上传文件', download: '下载文件',
  preview: '预览文件', delete: '删除文件', rename: '重命名文件', move: '移动文件',
  copy: '拷贝文件', create_user: '创建用户', update_user: '编辑用户',
  delete_user: '禁用用户', set_permissions: '权限变更', reset_password: '密码重置',
  create_directory: '创建目录', delete_directory: '删除目录',
  change_password: '修改密码', update_profile: '编辑个人信息',
}
const moduleLabel = {
  auth: '登录认证', user: '用户管理', file: '文件管理',
  copy: '文件拷贝', config: '系统配置', system: '系统',
}
function t(obj, key) { return obj[key] || key }

const actionColors = {
  login: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  logout: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  upload: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  download: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  preview: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
  delete: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  rename: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
  move: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  copy: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  create_user: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  update_user: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  set_permissions: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  reset_password: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  create_directory: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  delete_directory: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
}

function fmtTime(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('zh-CN', { hour12: false })
}

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [module, setModule] = useState('')

  const fetchLogs = async () => {
    setLoading(true); setError('')
    try {
      const params = { page, per_page: 20 }
      if (search) params.user_account = search
      if (module) params.module = module
      const data = await getAuditLogs(params)
      setLogs(data.items || [])
      setTotal(data.total || 0)
      setPages(data.pages || 0)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchLogs() }, [page, module])

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchLogs() }

  const handleExport = async () => {
    try {
      // Fetch all logs matching current filters (up to 10000)
      const params = { page: 1, per_page: 10000 }
      if (search) params.user_account = search
      if (module) params.module = module
      const data = await getAuditLogs(params)
      const items = data.items || []
      if (items.length === 0) { alert('没有可导出的日志'); return }

      // Build CSV
      const header = ['登录账号', '姓名', '操作', '模块', '详情', 'IP', '时间']
      const rows = items.map(log => [
        log.account || '',
        log.username || '',
        t(actionLabel, log.action),
        t(moduleLabel, log.module),
        (log.detail || '').replace(/"/g, '""'),
        log.ip || '',
        fmtTime(log.created_at),
      ])
      const csv = '﻿' + [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')

      // Trigger download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `审计日志_${new Date().toISOString().slice(0,10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) { alert('导出失败: ' + err.message) }
  }

  const tabs = [
    { key: '', label: '全部日志' }, { key: 'file', label: '文件操作' },
    { key: 'user', label: '账号操作' }, { key: 'copy', label: '文件拷贝' }, { key: 'auth', label: '登录日志' },
  ]

  const card = "bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden"
  const th = "text-left px-4 py-3 text-xs font-medium text-[var(--color-text-subtle)] uppercase tracking-wider"
  const td = "px-4 py-2.5"
  const input = "w-full pl-10 pr-4 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-primary)]"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">审计日志</h1>
          <p className="text-sm text-[var(--color-text-subtle)] mt-1">全维度操作审计，日志不可篡改</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-muted)] text-sm font-medium rounded-lg cursor-pointer">
          <Download size={16} /> 导出日志
        </button>
      </div>

      <div className="flex items-center gap-1 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-1 w-fit flex-wrap">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => { setModule(tab.key); setPage(1) }}
            className={`px-4 py-2 text-sm font-medium rounded-md cursor-pointer ${module === tab.key ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)]'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSearch} className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索操作人..." className={input} />
        </div>
        <button type="submit" className="px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-muted)] text-sm rounded-lg cursor-pointer">搜索</button>
      </form>

      {error && <div className="bg-[var(--color-danger-light)] border border-red-300 dark:border-red-800 text-[var(--color-danger)] text-sm rounded-lg px-4 py-2.5">{error}</div>}

      <div className={card}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-bg)]/50">
                <th className={th}>登录账号</th><th className={th}>姓名</th><th className={th}>操作</th><th className={th}>模块</th>
                <th className={th}>详情</th><th className={th}>IP</th><th className={th}>时间</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-primary-light)]">
                  <td className={`${td} font-mono text-xs text-[var(--color-text-muted)]`}>{log.account}</td>
                  <td className={`${td} text-[var(--color-text)] font-medium whitespace-nowrap`}>{log.username}</td>
                  <td className={td}>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${actionColors[log.action] || 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'}`}>
                      {t(actionLabel, log.action)}
                    </span>
                  </td>
                  <td className={`${td} text-[var(--color-text-subtle)] text-xs whitespace-nowrap`}>{t(moduleLabel, log.module)}</td>
                  <td className={`${td} text-[var(--color-text-muted)] text-xs max-w-[280px]`}>
                    <span title={log.detail || ''} className="line-clamp-2 cursor-default">{log.detail || '-'}</span>
                  </td>
                  <td className={`${td} font-mono text-xs text-[var(--color-text-subtle)] whitespace-nowrap`}>{log.ip}</td>
                  <td className={`${td} font-mono text-xs text-[var(--color-text-subtle)] whitespace-nowrap`}>{fmtTime(log.created_at)}</td>
                </tr>
              ))}
              {!loading && logs.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-[var(--color-text-subtle)] text-sm">暂无日志记录</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-[var(--color-border)] flex items-center justify-between text-sm text-[var(--color-text-subtle)]">
          <span>共 {total} 条日志（永久留存，不可删除）{loading && ' · 加载中...'}</span>
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
    </div>
  )
}
