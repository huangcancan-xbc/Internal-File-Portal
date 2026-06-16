import { useState, useEffect } from 'react'
import { X, Folder, ChevronRight, ArrowUp, Copy, Check, FolderInput } from 'lucide-react'
import { getDirectories } from '../api/index.js'

/**
 * DirectoryPickerModal — 系统内拷贝/移动的目录选择器
 *
 * Props:
 *   file        — 单文件对象（与 files 二选一）
 *   files       — 批量文件对象数组
 *   mode        — 'copy' | 'move'
 *   scope       — 'public' | 'private'
 *   onConfirm   — (targetDirectoryId) => void
 *   onClose     — () => void
 */
export default function CopyModal({ file, files, mode = 'copy', scope = 'public', onConfirm, onClose }) {
  const batchItems = files?.length ? files : (file ? [file] : [])
  const isBatch = batchItems.length > 1
  const isMove = mode === 'move'

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

  const goUp = () => {
    if (!currentDir) return
    setCurrentDir(null)
    fetchDirs()
  }

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      await onConfirm(currentDir?.id ?? null)
    } finally {
      setConfirming(false)
    }
  }

  if (!batchItems.length) return null

  const title = isMove ? (isBatch ? '批量移动到…' : '移动到…') : (isBatch ? '批量复制到…' : '复制到…')
  const confirmLabel = isMove
    ? (confirming ? '移动中…' : (isBatch ? `移动 ${batchItems.length} 个文件` : '确认移动'))
    : (confirming ? '复制中…' : (isBatch ? `复制 ${batchItems.length} 个文件` : '确认复制'))
  const Icon = isMove ? FolderInput : Copy

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-md border border-[var(--color-border)]"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2 min-w-0">
            <Icon size={16} className="text-[var(--color-primary)] shrink-0" />
            <span className="text-sm font-semibold text-[var(--color-text)] truncate">{title}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-danger-light)] text-[var(--color-text-muted)] cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
          <p className="text-xs text-[var(--color-text-subtle)]">{isBatch ? `已选 ${batchItems.length} 个文件` : '源文件'}</p>
          {isBatch ? (
            <ul className="mt-1 max-h-20 overflow-y-auto text-sm text-[var(--color-text)] space-y-0.5">
              {batchItems.slice(0, 5).map(f => (
                <li key={f.id} className="truncate">{f.original_filename}</li>
              ))}
              {batchItems.length > 5 && (
                <li className="text-xs text-[var(--color-text-subtle)]">…还有 {batchItems.length - 5} 个</li>
              )}
            </ul>
          ) : (
            <p className="text-sm font-medium text-[var(--color-text)] truncate">{batchItems[0].original_filename}</p>
          )}
        </div>

        <div className="px-5 py-3 space-y-2">
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

          <div className="max-h-48 overflow-y-auto space-y-1 border border-[var(--color-border)] rounded-lg p-2">
            {loading && <p className="text-xs text-[var(--color-text-subtle)] text-center py-4">加载中…</p>}
            {!loading && dirs.length === 0 && (
              <p className="text-xs text-[var(--color-text-subtle)] text-center py-4">此目录下无子目录</p>
            )}
            {dirs.map(dir => (
              <button key={dir.id} onClick={() => setCurrentDir(dir)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-[var(--color-primary-light)] text-left cursor-pointer">
                <Folder size={16} className="text-[var(--color-primary)] shrink-0" />
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

        <div className="px-5 py-3 border-t border-[var(--color-border)] flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)] rounded-lg cursor-pointer">
            取消
          </button>
          <button onClick={handleConfirm} disabled={confirming}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm rounded-lg cursor-pointer disabled:opacity-60">
            <Check size={14} /> {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
