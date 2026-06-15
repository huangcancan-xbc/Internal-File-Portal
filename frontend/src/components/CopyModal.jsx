import { useState, useEffect } from 'react'
import { X, Folder, ChevronRight, ArrowUp, Copy, Check } from 'lucide-react'
import { getDirectories } from '../api/index.js'

/**
 * CopyModal — 系统内拷贝的目录选择器
 *
 * Props:
 *   file       — 要拷贝的文件对象
 *   scope      — 'public' | 'private'
 *   onConfirm  — (targetDirectoryId) => void
 *   onClose    — () => void
 */
export default function CopyModal({ file, scope = 'public', onConfirm, onClose }) {
  const [dirs, setDirs] = useState([])
  const [currentDir, setCurrentDir] = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const fetchDirs = async (parentId = null) => {
    setLoading(true)
    try {
      const params = { scope }
      if (parentId) params.parent_id = parentId
      const data = await getDirectories(params)
      setDirs(data || [])
    } catch { setDirs([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchDirs(currentDir?.id) }, [currentDir])

  const enterDir = (dir) => setCurrentDir(dir)
  const goUp = () => {
    if (!currentDir) return
    setCurrentDir(null)  // simplified: back to root
    fetchDirs()
  }

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      await onConfirm(currentDir?.id || null)
    } finally {
      setConfirming(false)
    }
  }

  if (!file) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-md border border-[var(--color-border)]"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2 min-w-0">
            <Copy size={16} className="text-[var(--color-primary)] shrink-0" />
            <span className="text-sm font-semibold text-[var(--color-text)] truncate">复制到…</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-danger-light)] text-[var(--color-text-muted)] cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* File info */}
        <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
          <p className="text-xs text-[var(--color-text-subtle)]">源文件</p>
          <p className="text-sm font-medium text-[var(--color-text)] truncate">{file.original_filename}</p>
        </div>

        {/* Directory picker */}
        <div className="px-5 py-3 space-y-2">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-xs">
            <button onClick={() => { setCurrentDir(null); fetchDirs() }}
              className={`px-2 py-1 rounded cursor-pointer ${!currentDir ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)]'}`}>
              {scope === 'public' ? '公共根目录' : '我的根目录'}
            </button>
            {currentDir && (
              <>
                <ChevronRight size={12} className="text-[var(--color-text-subtle)]" />
                <span className="px-2 py-1 rounded bg-[var(--color-primary)] text-white">{currentDir.name}</span>
                <button onClick={goUp} className="ml-1 p-0.5 rounded hover:bg-[var(--color-primary-light)] text-[var(--color-text-muted)] cursor-pointer">
                  <ArrowUp size={12} />
                </button>
              </>
            )}
          </div>

          {/* Directory list */}
          <div className="max-h-48 overflow-y-auto space-y-1 border border-[var(--color-border)] rounded-lg p-2">
            {loading && <p className="text-xs text-[var(--color-text-subtle)] text-center py-4">加载中…</p>}
            {!loading && dirs.length === 0 && (
              <p className="text-xs text-[var(--color-text-subtle)] text-center py-4">此目录下无子目录</p>
            )}
            {dirs.map(dir => (
              <button key={dir.id} onClick={() => enterDir(dir)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-[var(--color-primary-light)] text-left cursor-pointer">
                <Folder size={16} className="text-amber-500 shrink-0" />
                <span className="text-sm text-[var(--color-text)] truncate">{dir.name}</span>
                <ChevronRight size={14} className="text-[var(--color-text-subtle)] ml-auto shrink-0" />
              </button>
            ))}
          </div>

          <p className="text-xs text-[var(--color-text-subtle)]">
            目标位置：<span className="font-medium text-[var(--color-text)]">
              {currentDir ? currentDir.name : (scope === 'public' ? '公共根目录' : '我的根目录')}
            </span>
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--color-border)] flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)] rounded-lg cursor-pointer">
            取消
          </button>
          <button onClick={handleConfirm} disabled={confirming}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm rounded-lg cursor-pointer disabled:opacity-60">
            <Check size={14} /> {confirming ? '复制中…' : '确认复制'}
          </button>
        </div>
      </div>
    </div>
  )
}
