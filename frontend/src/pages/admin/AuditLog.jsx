import { useState, useEffect, useRef, useCallback, useId } from 'react'
import { Search, Download, X, ChevronDown, Check, Loader2, Filter } from 'lucide-react'
import { getAuditLogs, getAuditLogOptions } from '../../api/index.js'
import Pagination from '../../components/Pagination.jsx'
import { DateRangeFilter } from '../../components/FilterDropdown.jsx'

// ── Constants ──

const ACTION_LABEL = {
  login: '登录', logout: '登出', upload: '上传文件', download: '下载文件',
  preview: '预览文件', delete: '删除文件', restore: '恢复文件',
  permanent_delete: '永久删除', empty_recycle_bin: '清空回收站',
  rename: '重命名文件', move: '移动文件',
  copy: '拷贝文件',
  create_user: '创建用户', update_user: '编辑用户',
  delete_user: '禁用用户', set_permissions: '权限变更', reset_password: '密码重置',
  create_directory: '创建目录', delete_directory: '删除目录', rename_directory: '重命名目录',
  change_password: '修改密码', update_profile: '编辑个人信息',
}

const MODULE_LABEL = {
  auth: '登录认证', user: '用户管理', file: '文件管理',
  copy: '文件拷贝', config: '系统配置', system: '系统',
}

const ACTION_COLORS = {
  login: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  logout: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  upload: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  download: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  preview: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
  delete: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  restore: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  permanent_delete: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  empty_recycle_bin: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  rename: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
  move: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  copy: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  create_user: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  update_user: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  update_profile: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  delete_user: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  set_permissions: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  reset_password: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  change_password: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  create_directory: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  delete_directory: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  rename_directory: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
}

const TABS = [
  { key: '', label: '全部日志' },
  { key: 'file', label: '文件操作' },
  { key: 'user', label: '账号操作' },
  { key: 'copy', label: '文件拷贝' },
  { key: 'auth', label: '登录日志' },
]

const EMPTY_FILTERS = {
  account: '', username: '', action: '', ip: '', startTime: '', endTime: '',
}

const PER_PAGE = 20

function fmt(obj, key) { return obj[key] || key }

function fmtTime(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('zh-CN', { hour12: false })
}

// ── FilterDropdown ──

function FilterDropdown({ label, options, value, onChange, formatOption, customContent, icon: Icon = Filter }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef(null)
  const popupRef = useRef(null)
  const btnRef = useRef(null)
  const searchRef = useRef(null)
  const uid = useId()

  useEffect(() => {
    if (!open) return
    const handler = e => {
      const t = e.target
      if (wrapperRef.current?.contains(t) || popupRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0)
    else setSearch('')
  }, [open])

  const filtered = search && options
    ? options.filter(o => {
        const text = (formatOption ? formatOption(o) : o).toLowerCase()
        return text.includes(search.toLowerCase())
      })
    : (options || [])

  const btnRect = btnRef.current?.getBoundingClientRect()
  const popupW = customContent ? 260 : Math.max(btnRect?.width + 60 || 200, 200)
  const style = btnRect ? {
    position: 'fixed',
    top: btnRect.bottom + 8,
    right: Math.max(8, window.innerWidth - btnRect.right),
    width: popupW,
    zIndex: 50,
  } : {}

  const isActive = !!value

  return (
    <div ref={wrapperRef} className="relative inline-flex items-center">
      <div
        ref={btnRef}
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        className="group flex items-center gap-1.5 cursor-pointer select-none transition-colors"
      >
        <span className={`text-xs font-medium uppercase tracking-wider transition-colors ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-subtle)] group-hover:text-[var(--color-text)]'}`}>
          {label}
        </span>
        <div className={`p-1 rounded-md transition-colors ${isActive || open ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] group-hover:bg-[var(--color-primary-light)] group-hover:text-[var(--color-primary)]'}`}>
          <Icon size={14} />
        </div>
      </div>

      {open && (
        <div ref={popupRef} style={style}
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden animate-slide-in">
          {customContent ? (
            customContent
          ) : (
            <>
              <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="搜索..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                    onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
                  />
                </div>
              </div>
              <ul role="listbox" className="max-h-[240px] overflow-y-auto py-1.5 font-normal normal-case">
                <li
                  role="option"
                  aria-selected={!value}
                  onClick={() => { onChange(''); setOpen(false) }}
                  className="px-4 py-2.5 text-sm cursor-pointer hover:bg-[var(--color-primary-light)] text-[var(--color-text-subtle)] transition-colors"
                >
                  全部
                </li>
                {filtered.map(opt => (
                  <li
                    key={opt}
                    role="option"
                    aria-selected={value === opt}
                    onClick={() => { onChange(opt); setOpen(false) }}
                    className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-[var(--color-primary-light)] flex items-center justify-between transition-colors ${
                      value === opt ? 'text-[var(--color-primary)] font-medium bg-[var(--color-primary-light)]/40' : 'text-[var(--color-text)]'
                    }`}>
                    <span className="truncate pr-4">{formatOption ? formatOption(opt) : opt}</span>
                    {value === opt && <Check size={14} className="shrink-0 text-[var(--color-primary)]" />}
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className="px-4 py-6 text-sm text-[var(--color-text-subtle)] text-center">无匹配项</li>
                )}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main ──

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [module, setModule] = useState('')
  const [search, setSearch] = useState('')
  const [hideDeleted, setHideDeleted] = useState(true)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [options, setOptions] = useState({ accounts: [], usernames: [], actions: [], modules: [], ips: [] })

  const fetchIdRef = useRef(0)

  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }, [])

  const hasActiveFilters = Object.values(filters).some(Boolean)

  useEffect(() => {
    getAuditLogOptions({ hide_deleted: hideDeleted ? '1' : '0' })
      .then(setOptions)
      .catch(() => {})
  }, [hideDeleted])

  useEffect(() => {
    const currentId = ++fetchIdRef.current
    setLoading(true)
    setError('')

    const params = { page, per_page: PER_PAGE }
    if (search) params.user_account = search
    if (module) params.module = module
    if (filters.account) params.user_account = filters.account
    if (filters.username) params.username = filters.username
    if (filters.action) params.action = filters.action
    if (filters.ip) params.ip = filters.ip
    if (filters.startTime) params.start_date = filters.startTime
    if (filters.endTime) params.end_date = filters.endTime
    if (hideDeleted) params.hide_deleted = '1'

    getAuditLogs(params)
      .then(data => {
        if (fetchIdRef.current !== currentId) return
        setLogs(data.items || [])
        setTotal(data.total || 0)
        setPages(data.pages || 0)
      })
      .catch(err => {
        if (fetchIdRef.current !== currentId) return
        setError(err.message)
      })
      .finally(() => {
        if (fetchIdRef.current !== currentId) return
        setLoading(false)
      })
  }, [page, module, search, filters, hideDeleted])

  const handleSearch = e => { e.preventDefault(); setPage(1) }

  const handleExport = async () => {
    try {
      const params = { page: 1, per_page: 10000 }
      if (search) params.user_account = search
      if (module) params.module = module
      if (filters.account) params.user_account = filters.account
      if (filters.username) params.username = filters.username
      if (filters.action) params.action = filters.action
      if (filters.ip) params.ip = filters.ip
      if (filters.startTime) params.start_date = filters.startTime
      if (filters.endTime) params.end_date = filters.endTime
      if (hideDeleted) params.hide_deleted = '1'

      const data = await getAuditLogs(params)
      const items = data.items || []
      if (items.length === 0) { alert('没有可导出的日志'); return }

      const header = ['登录账号', '姓名', '操作', '模块', '详情', 'IP', '时间']
      const rows = items.map(log => [
        log.account || '', log.username || '',
        fmt(ACTION_LABEL, log.action), fmt(MODULE_LABEL, log.module),
        (log.detail || '').replace(/"/g, '""'),
        log.ip || '', fmtTime(log.created_at),
      ])
      const csv = '﻿' + [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `审计日志_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) { alert('导出失败: ' + err.message) }
  }

  // ── Style tokens ──
  const card = "bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden"
  const th = "text-left px-5 py-2.5 text-xs font-medium text-[var(--color-text-subtle)] uppercase tracking-wider"
  const td = "px-5 py-2.5"
  const inputCls = "w-full pl-10 pr-4 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-primary)]"

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">审计日志</h1>
          <p className="text-sm text-[var(--color-text-subtle)] mt-1">全维度操作审计，日志不可篡改</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => { setHideDeleted(!hideDeleted); setPage(1) }}
            className={`group flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border-2 cursor-pointer transition-all duration-200 ${
              hideDeleted
                ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-sm hover:bg-[var(--color-primary-hover)]'
                : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
            }`}>
            <span className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${
              hideDeleted ? 'bg-white/30' : 'bg-[var(--color-border)]'
            }`}>
              <span className={`absolute top-[2px] w-[14px] h-[14px] rounded-full shadow-sm transition-all duration-200 ${
                hideDeleted
                  ? 'left-[16px] bg-white'
                  : 'left-[2px] bg-[var(--color-text-subtle)]'
              }`} />
            </span>
            <span>{hideDeleted ? '隐藏已删除账户' : '显示全部账户'}</span>
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-muted)] text-sm font-medium rounded-lg cursor-pointer">
            <Download size={16} /> 导出日志
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-1 w-fit flex-wrap">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => { setModule(tab.key); setPage(1) }}
            className={`px-4 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors ${
              module === tab.key
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)]'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Search bar ── */}
      <form onSubmit={handleSearch} className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜索操作人..." className={inputCls} />
        </div>
        <button type="submit"
          className="px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-muted)] text-sm rounded-lg cursor-pointer">
          搜索
        </button>
        {hasActiveFilters && (
          <button onClick={clearFilters} type="button"
            className="flex items-center gap-1 px-3 py-2.5 text-xs text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-lg cursor-pointer transition-colors">
            <X size={14} /> 清除筛选
          </button>
        )}
      </form>

      {/* ── Error ── */}
      {error && (
        <div className="bg-[var(--color-danger-light)] border border-red-300 dark:border-red-800 text-[var(--color-danger)] text-sm rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      {/* ── Table with integrated filters ── */}
      <div className={card}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-bg)]/50 border-b border-[var(--color-border)]">
                <th className="text-left px-5 py-3 whitespace-nowrap">
                  <FilterDropdown label="登录账号" options={options.accounts} value={filters.account} onChange={v => setFilter('account', v)} />
                </th>
                <th className="text-left px-5 py-3 whitespace-nowrap">
                  <FilterDropdown label="姓名" options={options.usernames} value={filters.username} onChange={v => setFilter('username', v)} />
                </th>
                <th className="text-left px-5 py-3 whitespace-nowrap">
                  <FilterDropdown label="操作" options={options.actions} value={filters.action} onChange={v => setFilter('action', v)} formatOption={v => fmt(ACTION_LABEL, v)} />
                </th>
                <th className="text-left px-5 py-3 whitespace-nowrap">
                  <FilterDropdown label="模块" options={options.modules} value={module} onChange={v => { setModule(v); setPage(1) }} formatOption={v => fmt(MODULE_LABEL, v)} />
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-text-subtle)] uppercase tracking-wider whitespace-nowrap">
                  详情
                </th>
                <th className="text-left px-5 py-3 whitespace-nowrap">
                  <FilterDropdown label="IP" options={options.ips} value={filters.ip} onChange={v => setFilter('ip', v)} />
                </th>
                <th className="text-left px-5 py-3 whitespace-nowrap">
                  <DateRangeFilter label="时间" startTime={filters.startTime} endTime={filters.endTime}
                    onStartChange={v => setFilter('startTime', v)}
                    onEndChange={v => setFilter('endTime', v)}
                    onClear={() => { setFilter('startTime', ''); setFilter('endTime', '') }} />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <Loader2 size={20} className="animate-spin mx-auto text-[var(--color-primary)]" />
                    <span className="text-xs text-[var(--color-text-subtle)] mt-2 block">加载中...</span>
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map(log => (
                  <tr key={log.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-primary-light)] transition-colors">
                    <td className={`${td} font-mono text-xs text-[var(--color-text-muted)]`}>{log.account}</td>
                    <td className={`${td} text-[var(--color-text)] font-medium whitespace-nowrap`}>{log.username}</td>
                    <td className={td}>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${ACTION_COLORS[log.action] || 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'}`}>
                        {fmt(ACTION_LABEL, log.action)}
                      </span>
                    </td>
                    <td className={`${td} text-[var(--color-text-subtle)] text-xs whitespace-nowrap`}>{fmt(MODULE_LABEL, log.module)}</td>
                    <td className={`${td} text-[var(--color-text-muted)] text-xs max-w-[280px]`}>
                      <span title={log.detail || ''} className="line-clamp-2 cursor-default">{log.detail || '-'}</span>
                    </td>
                    <td className={`${td} font-mono text-xs text-[var(--color-text-subtle)] whitespace-nowrap`}>{log.ip}</td>
                    <td className={`${td} font-mono text-xs text-[var(--color-text-subtle)] whitespace-nowrap`}>{fmtTime(log.created_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-[var(--color-text-subtle)] text-sm">
                    暂无日志记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pages={pages} total={total} loading={loading} onPageChange={setPage} totalLabel={`共 ${total} 条日志（永久留存，不可删除）`} />
      </div>
    </div>
  )
}
