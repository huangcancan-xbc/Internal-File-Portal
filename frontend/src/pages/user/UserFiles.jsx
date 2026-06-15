import { useState, useEffect } from 'react'
import { Upload, Search, Download, Eye, Trash2, Copy } from 'lucide-react'
import { getFiles, deleteFile, uploadFiles, downloadFile, copyFile } from '../../api/index.js'
import PreviewModal from '../../components/PreviewModal.jsx'
import CopyModal from '../../components/CopyModal.jsx'

const typeColors = {
  document: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  pdf: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  spreadsheet: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  image: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  archive: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  other: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
}

function getTypeLabel(ext) {
  const map = { doc:'文档',docx:'文档',pdf:'PDF',xls:'表格',xlsx:'表格',csv:'表格',
    jpg:'图片',jpeg:'图片',png:'图片',gif:'图片',svg:'图片',
    mp4:'视频',zip:'压缩包',rar:'压缩包','7z':'压缩包' }
  return map[ext] || '其他'
}
function getTypeKey(ext) {
  const map = { doc:'document',docx:'document',pdf:'pdf',xls:'spreadsheet',xlsx:'spreadsheet',csv:'spreadsheet',
    jpg:'image',jpeg:'image',png:'image',gif:'image',svg:'image',
    mp4:'video',zip:'archive',rar:'archive','7z':'archive' }
  return map[ext] || 'other'
}
function formatSize(bytes) {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB'
  return (bytes/(1024*1024)).toFixed(1) + ' MB'
}

export default function UserFiles() {
  const [files, setFiles] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [previewFile, setPreviewFile] = useState(null)
  const [copyTarget, setCopyTarget] = useState(null)

  const fetchFiles = async () => {
    setLoading(true)
    setError('')
    try {
      const params = { scope: 'private', page, per_page: 20 }
      if (search) params.keyword = search
      const data = await getFiles(params)
      setFiles(data.items || [])
      setTotal(data.total || 0)
      setPages(data.pages || 0)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchFiles() }, [page])

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchFiles() }
  const handleDelete = async (file) => {
    if (!confirm(`确定删除 "${file.original_filename}" 吗？`)) return
    try { await deleteFile(file.id); fetchFiles() } catch (err) { setError(err.message) }
  }
  const handleUpload = async (e) => {
    const fls = e.target.files
    if (!fls.length) return
    setError('')
    setSuccess('')
    try {
      const result = await uploadFiles(fls, 'private')
      const { success_count, fail_count, results } = result
      if (fail_count > 0) {
        const fails = results.filter(r => r.status === 'failure').map(r => `${r.filename}: ${r.reason}`).join('；')
        setError(`上传完成：成功 ${success_count} 个，失败 ${fail_count} 个。${fails ? ' 失败原因：' + fails : ''}`)
      } else {
        setSuccess(`上传成功，共 ${success_count} 个文件`)
      }
      fetchFiles()
    } catch (err) {
      const detail = err.status ? `[HTTP ${err.status}] ` : '[网络] '
      setError(detail + (err.message || '上传失败，请确认后端运行中'))
    }
    e.target.value = ''
  }

  const card = "bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden"
  const th = "text-left px-5 py-3 text-xs font-medium text-[var(--color-text-subtle)] uppercase tracking-wider"
  const td = "px-5 py-3"
  const input = "w-full pl-10 pr-4 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-primary)]"
  const btnIcon = "p-1.5 rounded hover:bg-[var(--color-primary-light)] text-[var(--color-text-muted)] cursor-pointer"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-[var(--color-text)]">我的文件</h1><p className="text-sm text-[var(--color-text-subtle)] mt-1">管理个人私有文件</p></div>
        <label className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-medium rounded-lg cursor-pointer">
          <Upload size={16} /> 上传文件
          <input type="file" multiple className="hidden" onChange={handleUpload} />
        </label>
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
                <th className={th}>文件名</th><th className={th}>类型</th><th className={th}>大小</th><th className={th}>上传时间</th><th className={th}>操作</th>
              </tr>
            </thead>
            <tbody>
              {files.map(file => {
                const ext = (file.original_filename || '').split('.').pop()?.toLowerCase()
                const typeKey = getTypeKey(ext)
                return (
                  <tr key={file.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-primary-light)]">
                    <td className={`${td} text-[var(--color-text)] font-medium`}>{file.original_filename}</td>
                    <td className={td}><span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[typeKey]}`}>{getTypeLabel(ext)}</span></td>
                    <td className={`${td} text-[var(--color-text-muted)] font-mono text-xs`}>{formatSize(file.file_size)}</td>
                    <td className={`${td} text-[var(--color-text-subtle)] text-xs`}>{file.created_at ? new Date(file.created_at).toLocaleString() : '-'}</td>
                    <td className={td}>
                      <div className="flex items-center gap-1">
                        <button className={btnIcon} onClick={() => setPreviewFile(file)} title="预览"><Eye size={14} /></button>
                        <button className={btnIcon} onClick={() => setCopyTarget({ file, type: 'internal' })} title="复制到目录"><Copy size={14} /></button>
                        <button className={btnIcon} onClick={() => downloadFile(file.id, file.original_filename, 'local').catch(e => setError(e.message))} title="下载到本地"><Download size={14} /></button>
                        <button className="p-1.5 rounded hover:bg-[var(--color-danger-light)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] cursor-pointer" onClick={() => handleDelete(file)} title="删除"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!loading && files.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-[var(--color-text-subtle)]">
                  <Upload size={32} className="mx-auto mb-2 opacity-40" />暂无文件，点击上方按钮上传
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-[var(--color-border)] flex items-center justify-between text-sm text-[var(--color-text-subtle)]">
          <span>共 {total} 个文件 {loading && '· 加载中...'}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page<=1} className="px-3 py-1 rounded border border-[var(--color-border)] hover:bg-[var(--color-primary-light)] text-xs cursor-pointer disabled:opacity-40">上一页</button>
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

      <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />

      {copyTarget?.type === 'internal' && (
        <CopyModal
          file={copyTarget.file}
          scope="private"
          onConfirm={async (targetDirId) => {
            try {
              await copyFile(copyTarget.file.id, targetDirId, 'internal')
              setSuccess(`"${copyTarget.file.original_filename}" 已复制`)
              setError('')
              setCopyTarget(null)
              fetchFiles()
            } catch (err) { setError(err.message); setSuccess('') }
          }}
          onClose={() => setCopyTarget(null)}
        />
      )}
    </div>
  )
}
