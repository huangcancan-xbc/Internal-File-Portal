import { useState, useEffect } from 'react'
import { Trash2, RotateCcw, Search, AlertTriangle } from 'lucide-react'
import { getRecycleBin, restoreFile, permanentDeleteFile, emptyRecycleBin } from '../api/index.js'

function formatSize(bytes) {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB'
  return (bytes/(1024*1024)).toFixed(1) + ' MB'
}

export default function RecycleBin() {
  const [files, setFiles] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchFiles = async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, per_page: 20 }
      if (search) params.keyword = search
      const data = await getRecycleBin(params)
      setFiles(data.items || [])
      setTotal(data.total || 0)
      setPages(data.pages || 0)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchFiles() }, [page])

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchFiles() }

  const handleRestore = async (file) => {
    try {
      await restoreFile(file.id)
      setSuccess(`"${file.original_filename}" 已恢复`)
      setError('')
      fetchFiles()
    } catch (err) { setError(err.message); setSuccess('') }
  }

  const handlePermanentDelete = async (file) => {
    if (!confirm(`确定永久删除 "${file.original_filename}" 吗？此操作不可撤销。`)) return
    try {
      await permanentDeleteFile(file.id)
      setSuccess(`"${file.original_filename}" 已永久删除`)
      setError('')
      fetchFiles()
    } catch (err) { setError(err.message); setSuccess('') }
  }

  const handleEmpty = async () => {
    if (!confirm(`确定清空回收站吗？共 ${total} 个文件将被永久删除，此操作不可撤销。`)) return
    try {
      const msg = await emptyRecycleBin()
      setSuccess(msg.message || '回收站已清空')
      setError('')
      fetchFiles()
    } catch (err) { setError(err.message); setSuccess('') }
  }

  const card = "bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden"
  const th = "text-left px-5 py-3 text-xs font-medium text-[var(--color-text-subtle)] uppercase tracking-wider"
  const td = "px-5 py-3"
  const input = "w-full pl-10 pr-4 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-primary)]"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">回收站</h1>
          <p className="text-sm text-[var(--color-text-subtle)] mt-1">已删除的文件，可恢复或永久删除</p>
        </div>
        {total > 0 && (
          <button onClick={handleEmpty}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-danger)] hover:bg-red-700 text-white text-sm font-medium rounded-lg cursor-pointer">
            <Trash2 size={16} /> 清空回收站
          </button>
        )}
      </div>

      <form onSubmit={handleSearch} className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索文件名..." className={input} />
      </form>

      {error && <div className="bg-[var(--color-danger-light)] border border-red-300 dark:border-red-800 text-[var(--color-danger)] text-sm rounded-lg px-4 py-2.5">{error}</div>}
      {success && <div className="bg-green-50 border border-green-300 dark:bg-green-900/30 dark:border-green-800 text-green-700 dark:text-green-400 text-sm rounded-lg px-4 py-2.5">{success}</div>}

      <div className={card}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-bg)]/50">
                <th className={th}>文件名</th><th className={th}>类型</th><th className={th}>大小</th>
                <th className={th}>删除时间</th><th className={th}>操作</th>
              </tr>
            </thead>
            <tbody>
              {files.map(file => (
                <tr key={file.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-primary-light)]">
                  <td className={`${td} text-[var(--color-text)] font-medium`}>{file.original_filename}</td>
                  <td className={`${td} text-[var(--color-text-muted)] text-xs uppercase`}>{file.file_type || '-'}</td>
                  <td className={`${td} text-[var(--color-text-muted)] font-mono text-xs`}>{formatSize(file.file_size)}</td>
                  <td className={`${td} text-[var(--color-text-subtle)] text-xs`}>{file.updated_at ? new Date(file.updated_at).toLocaleString() : '-'}</td>
                  <td className={td}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleRestore(file)} className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-[var(--color-text-muted)] hover:text-green-600 cursor-pointer" title="恢复">
                        <RotateCcw size={14} />
                      </button>
                      <button onClick={() => handlePermanentDelete(file)} className="p-1.5 rounded hover:bg-[var(--color-danger-light)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] cursor-pointer" title="永久删除">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && files.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-[var(--color-text-subtle)]">
                  <AlertTriangle size={32} className="mx-auto mb-2 opacity-40" />回收站为空
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-[var(--color-border)] flex items-center justify-between text-sm text-[var(--color-text-subtle)]">
          <span>共 {total} 个文件 {loading && '· 加载中...'}</span>
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
