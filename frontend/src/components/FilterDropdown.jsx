import { useState, useEffect, useRef } from 'react'
import { Search, Filter, Check, ChevronUp, ChevronDown, Calendar } from 'lucide-react'
import DateTimePicker from './DateTimePicker.jsx'

export default function FilterDropdown({ label, options, value, onChange, formatOption, customContent, icon: Icon = Filter, popupWidth }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef(null)
  const popupRef = useRef(null)
  const btnRef = useRef(null)
  const searchRef = useRef(null)

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
    if (open && !customContent) setTimeout(() => searchRef.current?.focus(), 0)
    else setSearch('')
  }, [open])

  const filtered = search && options
    ? options.filter(o => {
        const text = (formatOption ? formatOption(o) : o).toLowerCase()
        return text.includes(search.toLowerCase())
      })
    : (options || [])

  const btnRect = btnRef.current?.getBoundingClientRect()
  const popupW = popupWidth ?? (customContent ? 400 : 224)
  const style = btnRect ? (() => {
    const w = Math.min(popupW, window.innerWidth - 16)
    // 优先让面板左边缘对齐按钮左边缘（贴齐表头列），右边放不下时再切到右对齐
    const leftEdge = btnRect.left
    const rightEdge = btnRect.right
    const fitsLeft = leftEdge + w + 8 <= window.innerWidth
    if (fitsLeft) {
      return {
        position: 'fixed',
        top: btnRect.bottom + 8,
        left: Math.max(8, leftEdge),
        width: w,
        zIndex: 50,
      }
    }
    return {
      position: 'fixed',
      top: btnRect.bottom + 8,
      right: Math.max(8, window.innerWidth - rightEdge),
      width: w,
      zIndex: 50,
    }
  })() : {}

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
          className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl animate-slide-in max-h-[80vh] ${customContent ? 'overflow-visible' : 'overflow-hidden'}`}>
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

export function DateRangeFilter({ label, startTime, endTime, onStartChange, onEndChange, onClear }) {
  const hasFilter = !!(startTime || endTime)

  // Format a date string for display in the active filter badge
  const formatShort = (v) => {
    if (!v) return ''
    // Already in "YYYY-MM-DD HH:mm" — show as-is
    return v
  }

  const presets = [
    { label: '今天', getRange: () => {
      const now = new Date()
      const d = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
      return { start: `${d} 00-00`, end: `${d} 23-59` }
    }},
    { label: '最近7天', getRange: () => {
      const now = new Date()
      const end = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} 23-59`
      const from = new Date(now); from.setDate(from.getDate() - 6)
      const start = `${from.getFullYear()}-${String(from.getMonth()+1).padStart(2,'0')}-${String(from.getDate()).padStart(2,'0')} 00-00`
      return { start, end }
    }},
    { label: '最近30天', getRange: () => {
      const now = new Date()
      const end = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} 23-59`
      const from = new Date(now); from.setDate(from.getDate() - 29)
      const start = `${from.getFullYear()}-${String(from.getMonth()+1).padStart(2,'0')}-${String(from.getDate()).padStart(2,'0')} 00-00`
      return { start, end }
    }},
    { label: '本月', getRange: () => {
      const now = new Date()
      const y = now.getFullYear(), m = now.getMonth()
      const start = `${y}-${String(m+1).padStart(2,'0')}-01 00-00`
      const lastDay = new Date(y, m + 1, 0).getDate()
      const end = `${y}-${String(m+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')} 23-59`
      return { start, end }
    }},
  ]

  return (
    <FilterDropdown
      label={label}
      icon={Calendar}
      value={hasFilter ? '1' : ''}
      onChange={() => {}}
      popupWidth={340}
      customContent={
        <div className="w-[340px] font-normal normal-case">
          {/* Header with active filter indicator */}
          {hasFilter && (
            <div className="px-3.5 py-2.5 bg-[var(--color-primary-light)]/40 border-b border-[var(--color-border)] flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shrink-0" />
                <span className="text-xs text-[var(--color-primary)] font-medium truncate">
                  {startTime && endTime ? `${formatShort(startTime)} ~ ${formatShort(endTime)}` : startTime ? `从 ${formatShort(startTime)}` : `至 ${formatShort(endTime)}`}
                </span>
              </div>
              <button
                type="button"
                onClick={onClear}
                className="ml-2 text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-danger)] transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--color-danger-light)] cursor-pointer shrink-0"
              >
                清除
              </button>
            </div>
          )}

          {/* Presets */}
          <div className="px-3.5 pt-3 pb-2">
            <div className="flex flex-wrap gap-1.5">
              {presets.map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    const { start, end } = p.getRange()
                    onStartChange(start)
                    onEndChange(end)
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Separator */}
          <div className="px-3.5 flex items-center gap-2 py-1">
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            <span className="text-[10px] text-[var(--color-text-subtle)] uppercase tracking-wider">自定义</span>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>

          {/* Custom date range inputs */}
          <div className="px-3.5 pb-3 space-y-2.5">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)] mb-1.5">
                <span className="w-1 h-1 rounded-full bg-green-400" />
                起始时间
              </label>
              <DateTimePicker value={startTime} onChange={onStartChange} />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)] mb-1.5">
                <span className="w-1 h-1 rounded-full bg-red-400" />
                结束时间
              </label>
              <DateTimePicker value={endTime} onChange={onEndChange} />
            </div>
          </div>
        </div>
      }
    />
  )
}

export function SortHeader({ label, sortKey, sortBy, sortOrder, onSort }) {
  const active = sortBy === sortKey
  return (
    <div
      className="flex items-center gap-1 cursor-pointer select-none group"
      onClick={() => onSort(sortKey)}
    >
      <span className={`text-xs font-medium uppercase tracking-wider transition-colors ${active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-subtle)] group-hover:text-[var(--color-text)]'}`}>
        {label}
      </span>
      <div className={`p-0.5 rounded transition-colors ${active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]'}`}>
        {active ? (
          sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
        ) : (
          <ChevronDown size={14} className="opacity-30" />
        )}
      </div>
    </div>
  )
}
