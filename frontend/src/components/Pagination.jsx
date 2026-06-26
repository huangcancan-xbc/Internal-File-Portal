import { useRef } from 'react'

export default function Pagination({ page, pages, total, loading, onPageChange, totalLabel }) {
  const jumpRef = useRef(null)

  const doJump = (v) => {
    if (v >= 1 && v <= pages) { onPageChange(v); if (jumpRef.current) jumpRef.current.value = '' }
  }

  return (
    <div className="px-5 py-3 border-t border-[var(--color-border)] flex items-center justify-between text-sm text-[var(--color-text-subtle)]">
      <span><span>{totalLabel || `共 ${total} 条`}</span>{loading && <span> · 加载中...</span>}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
          className="px-3 py-1 rounded border border-[var(--color-border)] hover:bg-[var(--color-primary-light)] text-xs cursor-pointer disabled:opacity-40">
          上一页
        </button>
        <span className="text-xs px-2">{page} / {pages || 1}</span>
        <button onClick={() => onPageChange(page + 1)} disabled={page >= pages}
          className="px-3 py-1 rounded border border-[var(--color-border)] hover:bg-[var(--color-primary-light)] text-xs cursor-pointer disabled:opacity-40">
          下一页
        </button>
        {pages > 1 && (
          <span className="flex items-center gap-1 ml-2">
            <input type="number" min={1} max={pages} placeholder="页码" ref={jumpRef}
              onKeyDown={e => {
                if (e.key === 'Enter') doJump(parseInt(e.target.value))
              }}
              className="w-14 px-2 py-1 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-center focus:outline-none focus:border-[var(--color-primary)]" />
            <button onClick={() => doJump(parseInt(jumpRef.current?.value))}
              className="px-2 py-1 rounded border border-[var(--color-border)] hover:bg-[var(--color-primary-light)] text-xs cursor-pointer">
              跳转
            </button>
          </span>
        )}
      </div>
    </div>
  )
}