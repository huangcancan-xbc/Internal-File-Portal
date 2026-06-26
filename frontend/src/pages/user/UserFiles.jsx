import { useState, useEffect, useCallback, useRef } from 'react'
import { Upload, Search, Download, Eye, Folder, ChevronRight } from 'lucide-react'
import { getFiles, uploadFiles, downloadFile, getDirectories, getFilterOptions } from '../../api/index.js'
import PreviewModal from '../../components/PreviewModal.jsx'
import Pagination from '../../components/Pagination.jsx'
import FilterDropdown, { SortHeader, DateRangeFilter } from '../../components/FilterDropdown.jsx'
import { typeColors, getTypeLabel, getTypeKey, formatSize } from '../../utils/fileUtils.js'

export default function UserFiles() {
  const [files, setFiles] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [dirs, setDirs] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [previewFile, setPreviewFile] = useState(null)
  const [currentDir, setCurrentDir] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [filterOptions, setFilterOptions] = useState({ file_types: [], uploaders: [] })
  const [filters, setFilters] = useState({ file_type: '', uploader: '', startTime: '', endTime: '' })
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const dropRef = useRef(null)

  const searchRef = useRef(search)
  searchRef.current = search

  const filtersRef = useRef(filters)
  filtersRef.current = filters
  const sortByRef = useRef(sortBy)
  sortByRef.current = sortBy
  const sortOrderRef = useRef(sortOrder)
  sortOrderRef.current = sortOrder

  // Fetch filter options on mount
  useEffect(() => {
    getFilterOptions('private').then(data => setFilterOptions(data)).catch(() => {})
  }, [])

  const fetchDirs = useCallback(async () => {
    try {
      const parentId = currentDir ? currentDir.id : undefined
      const data = await getDirectories({ scope: 'private', parent_id: parentId || '' })
      setDirs(Array.isArray(data) ? data : [])
    } catch (err) { /* ignore */ }
  }, [currentDir])

  const fetchFiles = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = { scope: 'private', page, per_page: 20 }
      const kw = searchRef.current
      if (kw) params.keyword = kw
      if (currentDir) params.directory_id = currentDir.id
      const data = await getFiles(params)
      setFiles(data.items || [])
      setTotal(data.total || 0)
      setPages(data.pages || 0)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [page, currentDir])

  const [searchKey, setSearchKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchDirs()
    setLoading(true); setError('')
    const params = { scope: 'private', page, per_page: 20 }
    const kw = searchRef.current
    if (kw) params.keyword = kw
    if (currentDir) params.directory_id = currentDir.id
    const f = filtersRef.current
    if (f.file_type) params.file_type = f.file_type
    if (f.uploader) params.uploader = f.uploader
    if (f.startTime) params.start_date = f.startTime
    if (f.endTime) params.end_date = f.endTime
    params.sort_by = sortByRef.current
    params.sort_order = sortOrderRef.current
    getFiles(params)
      .then(data => {
        if (cancelled) return
        setFiles(data.items || [])
        setTotal(data.total || 0)
        setPages(data.pages || 0)
      })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [page, currentDir, fetchDirs, searchKey])

  const handleSearch = (e) => {
    e.preventDefault()
    if (page === 1) setSearchKey(k => k + 1)
    else setPage(1)
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
    setSearchKey(k => k + 1)
  }

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortOrder('desc')
    }
    setPage(1)
    setSearchKey(k => k + 1)
  }

  const doUpload = async (files) => {
    if (!files || !files.length) return
    setError(''); setSuccess('')
    try {
      const dirId = currentDir ? currentDir.id : null
      const result = await uploadFiles(files, 'private', dirId)
      const { success_count, fail_count, results } = result
      if (fail_count > 0) {
        const fails = results.filter(r => r.status === 'failure').map(r => `${r.filename}: ${r.reason}`).join('；')
        setError(`上传完成：成功 ${success_count} 个，失败 ${fail_count} 个。${fails ? ' 失败原因：' + fails : ''}`)
      } else {
        setSuccess(`上传成功，共 ${success_count} 个文件 → ${currentDir ? currentDir.name : '根目录'}`)
      }
      fetchFiles()
    } catch (err) {
      const detail = err.status ? `[HTTP ${err.status}] ` : '[网络] '
      setError(detail + (err.message || '上传失败，请确认后端运行中'))
    }
  }

  const handleUpload = async (e) => {
    await doUpload(e.target.files)
    e.target.value = ''
  }

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }
  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }
  const handleDragLeave = (e) => {
    e.preventDefault(); e.stopPropagation()
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget)) {
      setDragOver(false)
    }
  }
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation()
    setDragOver(false)
    doUpload(e.dataTransfer.files)
  }

  const enterDir = (dir) => { setCurrentDir(dir); setPage(1) }

  const card = "bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden"
  const th = "text-left px-5 py-3 text-xs font-medium text-[var(--color-text-subtle)] uppercase tracking-wider"
  const td = "px-5 py-3"
  const input = "w-full pl-10 pr-4 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-primary)]"
  const btnIcon = "p-1.5 rounded hover:bg-[var(--color-primary-light)] text-[var(--color-text-muted)] cursor-pointer"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-[var(--color-text)]">我的文件</h1><p className="text-sm text-[var(--color-text-subtle)] mt-1">管理个人私有文件</p></div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-medium rounded-lg cursor-pointer">
            <Upload size={16} /> 上传文件
            <input id="file-upload-input" type="file" multiple className="hidden" onChange={handleUpload} />
          </label>
        </div>
      </div>

      {/* Breadcrumb */}
      {currentDir && (
        <div className="flex items-center gap-1 text-sm flex-wrap">
          <button onClick={() => { setCurrentDir(null); setPage(1) }}
            className="px-3 py-1.5 rounded-lg cursor-pointer text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)]">
            上级目录
          </button>
          <ChevronRight size={14} className="text-[var(--color-text-subtle)]" />
          <span className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white font-medium">{currentDir.name}</span>
        </div>
      )}

      {/* Sub-directories */}
      {dirs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {dirs.map(dir => (
            <button key={dir.id} onClick={() => enterDir({ id: dir.id, name: dir.name })}
              className="flex items-center gap-2 p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl hover:border-[var(--color-primary)] hover:shadow-sm cursor-pointer transition-smooth text-left">
              <Folder size={20} className="text-[var(--color-primary)] shrink-0" />
              <span className="text-sm font-medium text-[var(--color-text)] truncate">{dir.name}</span>
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSearch} className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索文件名..." className={input} />
        </div>
        <button type="submit" className="px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-muted)] text-sm rounded-lg cursor-pointer">搜索</button>
        {(filters.file_type || filters.startTime || filters.endTime || search) && (
          <button type="button" onClick={() => { setFilters({ file_type: '', uploader: '', startTime: '', endTime: '' }); setSortBy('created_at'); setSortOrder('desc'); setSearch(''); setPage(1); setSearchKey(k => k + 1) }}
            className="px-3 py-2.5 text-sm text-[var(--color-text-subtle)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] rounded-lg cursor-pointer transition-colors">
            重置筛选
          </button>
        )}
      </form>

      {error && <div className="bg-[var(--color-danger-light)] border border-red-300 dark:border-red-800 text-[var(--color-danger)] text-sm rounded-lg px-4 py-2.5">{error}</div>}
      {success && <div className="bg-green-50 border border-green-300 dark:bg-green-900/30 dark:border-green-800 text-green-700 dark:text-green-400 text-sm rounded-lg px-4 py-2.5">{success}</div>}

      <div className={card}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-bg)]/50">
                <th className={`${th} whitespace-nowrap`}>文件名</th>
                <th className={`${th} whitespace-nowrap`}>
                  <FilterDropdown label="类型" options={filterOptions.file_types} value={filters.file_type} onChange={v => handleFilterChange('file_type', v)} formatOption={v => getTypeLabel(v)} />
                </th>
                <th className={`${th} whitespace-nowrap`}>
                  <SortHeader label="大小" sortKey="file_size" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                </th>
                <th className={`${th} whitespace-nowrap`}>
                  <div className="flex items-center gap-1">
                    <SortHeader label="时间" sortKey="created_at" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <DateRangeFilter label="" startTime={filters.startTime} endTime={filters.endTime}
                      onStartChange={v => handleFilterChange('startTime', v)}
                      onEndChange={v => handleFilterChange('endTime', v)}
                      onClear={() => { setFilters(prev => ({ ...prev, startTime: '', endTime: '' })); setPage(1); setSearchKey(k => k + 1) }} />
                  </div>
                </th>
                <th className={`${th} whitespace-nowrap`}>操作</th>
              </tr>
            </thead>
            <tbody>
              {files.length > 0 ? (
                files.map(file => {
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
                        <button className={btnIcon} onClick={() => downloadFile(file.id, file.original_filename).catch(e => setError(e.message))} title="下载到本地"><Download size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })
              ) : !loading ? (
                <tr key="__userfiles_empty__"><td colSpan={5}
                  ref={dropRef}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`px-5 py-12 text-center cursor-pointer transition-all ${
                    dragOver
                      ? 'border-2 border-dashed border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                      : 'text-[var(--color-text-subtle)]'
                  }`}>
                  <Upload size={40} className={`mx-auto mb-3 transition-all ${dragOver ? 'opacity-100 scale-110' : 'opacity-40'}`} />
                  {dragOver
                    ? <span className="font-medium text-base">松开鼠标上传文件</span>
                    : <span>拖拽文件到此处或<label className="text-[var(--color-primary)] hover:underline cursor-pointer ml-1" onClick={() => document.querySelector('#file-upload-input')?.click()}>点击上传</label></span>
                  }
                </td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pages={pages} total={total} loading={loading} onPageChange={setPage} totalLabel={`共 ${total} 个文件`} />
      </div>

      <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />

    </div>
  )
}
