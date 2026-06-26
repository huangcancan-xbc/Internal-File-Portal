import { useState, useEffect, useRef } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDateTimeInput } from '../utils/fileUtils.js'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

/**
 * Parse a value (any common format) into year/month/day/hour/minute components.
 * The value is first run through formatDateTimeInput to normalize ISO strings,
 * slash dates, etc. into the canonical "YYYY-MM-DD HH:mm" form.
 */
function parseValue(value) {
  const normalized = formatDateTimeInput(value || '')
  if (!normalized || normalized.length < 4) {
    return { year: null, month: null, day: null, hour: null, minute: null }
  }
  const year = parseInt(normalized.slice(0, 4), 10)
  if (!Number.isFinite(year)) {
    return { year: null, month: null, day: null, hour: null, minute: null }
  }
  const month = normalized.length >= 7 ? parseInt(normalized.slice(5, 7), 10) : null
  const day = normalized.length >= 10 ? parseInt(normalized.slice(8, 10), 10) : null
  const hour = normalized.length >= 13 && /^\d{2}$/.test(normalized.slice(11, 13)) ? normalized.slice(11, 13) : null
  const minute = normalized.length >= 16 && /^\d{2}$/.test(normalized.slice(14, 16)) ? normalized.slice(14, 16) : null
  return {
    year,
    month: Number.isFinite(month) ? month : null,
    day: Number.isFinite(day) ? day : null,
    hour,
    minute,
  }
}

/** Build a "YYYY-MM-DD HH:mm" string from individual components. */
function buildValue({ year, month, day, hour, minute }) {
  const yyyy = String(year).padStart(4, '0')
  if (month == null) return yyyy
  const MM = String(month).padStart(2, '0')
  if (day == null) return `${yyyy}-${MM}`
  const DD = String(day).padStart(2, '0')
  if (hour == null) return `${yyyy}-${MM}-${DD}`
  const HH = String(hour).padStart(2, '0')
  if (minute == null) return `${yyyy}-${MM}-${DD} ${HH}`
  const mm = String(minute).padStart(2, '0')
  return `${yyyy}-${MM}-${DD} ${HH}:${mm}`
}

/** Generate a 6-row day grid for the given month (Mon-first). */
function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstWeekday = (firstDay.getDay() + 6) % 7 // Mon=0, Sun=6
  const prevMonthLastDay = new Date(year, month, 0).getDate()

  const cells = []
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const m = month === 0 ? 11 : month - 1
    const y = month === 0 ? year - 1 : year
    cells.push({ year: y, month: m, day: prevMonthLastDay - i, current: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ year, month, day: d, current: true })
  }
  let nextDay = 1
  while (cells.length % 7 !== 0) {
    const m = month === 11 ? 0 : month + 1
    const y = month === 11 ? year + 1 : year
    cells.push({ year: y, month: m, day: nextDay++, current: false })
  }
  return cells
}

/**
 * A datetime input that supports BOTH manual typing (with the strict
 * "YYYY-MM-DD HH:mm" mask) AND click-to-select via a calendar popover.
 *
 * Props:
 *   - value:    current value string (controlled, in "YYYY-MM-DD HH:mm" format)
 *   - onChange: receives the new value string
 *   - placeholder / className: passthrough styling
 */
export default function DateTimePicker({ value, onChange, placeholder = 'YYYY-MM-DD HH:mm', className = '' }) {
  const [open, setOpen] = useState(false)
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-11
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)
  const popupRef = useRef(null)
  const [popupStyle, setPopupStyle] = useState({})

  const parsed = parseValue(value)

  // Keep the calendar view in sync with whatever the user has typed/picked.
  useEffect(() => {
    if (parsed.year != null) setViewYear(parsed.year)
    if (parsed.month != null) setViewMonth(parsed.month - 1)
  }, [parsed.year, parsed.month])

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const onMouseDown = e => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false)
    }
    const onKeyDown = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // Position the popup: flip above if it would overflow the bottom edge.
  useEffect(() => {
    if (!open || !inputRef.current) return
    const POPUP_H = 380 // approximate calendar height
    const GAP = 8
    const rect = inputRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    if (spaceBelow < POPUP_H + GAP && spaceAbove > spaceBelow) {
      // Flip above
      setPopupStyle({
        position: 'fixed',
        bottom: window.innerHeight - rect.top + GAP,
        left: Math.max(8, rect.left),
        zIndex: 50,
      })
    } else {
      setPopupStyle({
        position: 'fixed',
        top: rect.bottom + GAP,
        left: Math.max(8, rect.left),
        zIndex: 50,
      })
    }
  }, [open])

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const goNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const handleDayClick = cell => {
    if (!cell.current) {
      setViewYear(cell.year)
      setViewMonth(cell.month)
    }
    onChange(buildValue({
      year: cell.year,
      month: cell.month + 1,
      day: cell.day,
      hour: parsed.hour,
      minute: parsed.minute,
    }))
  }

  const handleTimeChange = (field, raw) => {
    const cleaned = raw.replace(/\D/g, '').slice(0, 2)
    onChange(buildValue({
      year: parsed.year ?? viewYear,
      month: parsed.month ?? (viewMonth + 1),
      day: parsed.day ?? today.getDate(),
      hour: field === 'hour' ? (cleaned || '00') : (parsed.hour ?? '00'),
      minute: field === 'minute' ? (cleaned || '00') : (parsed.minute ?? '00'),
    }))
  }

  const handleNow = () => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    onChange(buildValue({
      year: y, month: m + 1, day: now.getDate(),
      hour: String(now.getHours()).padStart(2, '0'),
      minute: String(now.getMinutes()).padStart(2, '0'),
    }))
    setViewYear(y)
    setViewMonth(m)
  }

  const handleClear = () => {
    onChange('')
    setOpen(false)
  }

  const cells = getMonthGrid(viewYear, viewMonth)
  const isToday = c => c.year === today.getFullYear() && c.month === today.getMonth() && c.day === today.getDate()
  const isSelected = c => parsed.year === c.year && parsed.month === c.month + 1 && parsed.day === c.day

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div className="relative" ref={inputRef}>
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(formatDateTimeInput(e.target.value))}
          maxLength={16}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          className="w-full pr-9 px-3 py-2 text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-colors tracking-tight"
        />
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          tabIndex={-1}
          aria-label="打开日期时间选择器"
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
        >
          <Calendar size={14} />
        </button>
      </div>

      {open && (
        <div ref={popupRef} style={popupStyle}
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl p-3 w-[280px] animate-slide-in font-normal normal-case">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={goPrevMonth} className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)] cursor-pointer transition-colors">
              <ChevronLeft size={16} />
            </button>
            <div className="text-sm font-medium text-[var(--color-text)] select-none">
              {viewYear} 年 {viewMonth + 1} 月
            </div>
            <button type="button" onClick={goNextMonth} className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)] cursor-pointer transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-[var(--color-text-subtle)] py-1">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell, i) => {
              const selected = isSelected(cell)
              const todayCell = isToday(cell)
              const cls = [
                'h-8 flex items-center justify-center text-sm rounded-md transition-colors cursor-pointer',
                !cell.current ? 'text-[var(--color-text-subtle)] opacity-40' : '',
                cell.current && !selected ? 'text-[var(--color-text)] hover:bg-[var(--color-primary-light)]' : '',
                todayCell && !selected && cell.current ? 'font-semibold text-[var(--color-primary)]' : '',
                selected ? 'bg-[var(--color-primary)] text-white font-medium hover:bg-[var(--color-primary)]' : '',
              ].filter(Boolean).join(' ')
              return (
                <button key={i} type="button" onClick={() => handleDayClick(cell)} className={cls}>
                  {cell.day}
                </button>
              )
            })}
          </div>

          {/* Time */}
          <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)] shrink-0">时间</span>
              <input
                type="text"
                value={parsed.hour || ''}
                onChange={e => handleTimeChange('hour', e.target.value)}
                maxLength={2}
                placeholder="HH"
                className="w-12 px-2 py-1 text-sm text-center bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
              <span className="text-[var(--color-text-muted)]">:</span>
              <input
                type="text"
                value={parsed.minute || ''}
                onChange={e => handleTimeChange('minute', e.target.value)}
                maxLength={2}
                placeholder="mm"
                className="w-12 px-2 py-1 text-sm text-center bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
              <button
                type="button"
                onClick={handleNow}
                className="ml-auto text-xs px-2 py-1 rounded-md text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] cursor-pointer transition-colors"
              >
                现在
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex justify-between">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs px-2 py-1 rounded-md text-[var(--color-text-subtle)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] cursor-pointer transition-colors"
            >
              清除
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs px-3 py-1 rounded-md bg-[var(--color-primary)] text-white hover:opacity-90 cursor-pointer transition-opacity"
            >
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
