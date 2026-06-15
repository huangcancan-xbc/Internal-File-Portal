import { useState, useEffect } from 'react'
import { X, Download, Loader } from 'lucide-react'
import { marked } from 'marked'

const BASE_URL = '/api'

const IMAGE_EXTS = new Set(['jpg','jpeg','png','gif','svg','webp','ico','bmp'])
const TEXT_EXTS = new Set(['txt','csv','json','xml','yaml','yml','log','html','htm','css','js','py','sh'])
const MD_EXTS = new Set(['md','markdown'])
const OFFICE_EXTS = new Set(['docx','doc','xlsx','xls'])

// Fetch with JWT auto-refresh (same pattern as api/index.js)
function getToken() { return localStorage.getItem('access_token') }
function getRefreshToken() { return localStorage.getItem('refresh_token') }

async function refreshToken() {
  const refresh = getRefreshToken()
  if (!refresh) return false
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${refresh}` }
    })
    if (!res.ok) return false
    const data = await res.json()
    localStorage.setItem('access_token', data.access_token)
    return true
  } catch { return false }
}

async function fetchWithAuth(path, options = {}) {
  let token = getToken()
  let headers = { ...options.headers, 'Authorization': `Bearer ${token}` }
  let res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (res.status === 401 && getRefreshToken()) {
    const ok = await refreshToken()
    if (ok) {
      token = getToken()
      headers['Authorization'] = `Bearer ${token}`
      res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
    }
  }
  return res
}

async function fetchPreview(fileId) {
  const res = await fetchWithAuth(`/files/${fileId}/preview`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '预览失败')
  }
  return res
}

const markdownCss = `
  .md-preview { padding: 24px 32px; max-width: 900px; margin: 0 auto; }
  .md-preview h1 { font-size: 1.75rem; font-weight: 700; margin: 1.5em 0 0.5em; color: var(--color-text); border-bottom: 2px solid var(--color-border); padding-bottom: 0.3em; }
  .md-preview h2 { font-size: 1.4rem; font-weight: 600; margin: 1.3em 0 0.4em; color: var(--color-text); }
  .md-preview h3 { font-size: 1.15rem; font-weight: 600; margin: 1em 0 0.3em; color: var(--color-text); }
  .md-preview p { margin: 0.6em 0; line-height: 1.7; color: var(--color-text-muted); }
  .md-preview code { background: var(--color-primary-light); padding: 2px 6px; border-radius: 4px; font-family: 'Fira Code', monospace; font-size: 0.88em; color: var(--color-primary); }
  .md-preview pre { background: #0d1b2a; padding: 16px 20px; border-radius: 8px; overflow-x: auto; margin: 0.8em 0; }
  .md-preview pre code { background: none; padding: 0; color: #e0f2fe; font-size: 0.82em; }
  .md-preview ul, .md-preview ol { padding-left: 1.5em; margin: 0.5em 0; color: var(--color-text-muted); }
  .md-preview li { margin: 0.3em 0; line-height: 1.6; }
  .md-preview blockquote { border-left: 4px solid var(--color-primary); padding: 0.5em 1em; margin: 0.8em 0; background: var(--color-primary-light); border-radius: 0 6px 6px 0; color: var(--color-text-muted); }
  .md-preview table { border-collapse: collapse; width: 100%; margin: 0.8em 0; }
  .md-preview th, .md-preview td { border: 1px solid var(--color-border); padding: 8px 12px; text-align: left; }
  .md-preview th { background: var(--color-primary-light); font-weight: 600; color: var(--color-text); }
  .md-preview a { color: var(--color-primary); text-decoration: underline; }
  .md-preview img { max-width: 100%; border-radius: 8px; }
  .md-preview hr { border: none; border-top: 1px solid var(--color-border); margin: 1.5em 0; }
`

export default function PreviewModal({ file, onClose }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [content, setContent] = useState(null)

  const ext = file ? (file.original_filename || '').split('.').pop()?.toLowerCase() : ''
  const mime = file?.mime_type || ''

  useEffect(() => {
    if (!file) return
    setLoading(true)
    setError('')
    ;(async () => {
      try {
        const res = await fetchPreview(file.id)

        if (MD_EXTS.has(ext) || OFFICE_EXTS.has(ext)) {
          const text = await res.text()
          if (res.headers.get('Content-Type')?.includes('text/html')) {
            setContent({ type: 'html', data: text })
          } else {
            const html = await marked.parse(text)
            setContent({ type: 'html', data: html + `<style>${markdownCss}</style>` })
          }
        } else if (ext === 'pdf') {
          // Explicit MIME type — res.blob() may lose it
          const buf = await res.arrayBuffer()
          const blob = new Blob([buf], { type: 'application/pdf' })
          setContent({ type: 'blob', data: URL.createObjectURL(blob), mime: 'application/pdf' })
        } else if (IMAGE_EXTS.has(ext)) {
          const blob = await res.blob()
          setContent({ type: 'blob', data: URL.createObjectURL(blob), mime: mime })
        } else if (TEXT_EXTS.has(ext)) {
          const text = await res.text()
          setContent({ type: 'text', data: text })
        } else {
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          window.open(url, '_blank')
          setTimeout(() => URL.revokeObjectURL(url), 60000)
          onClose()
          return
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [file?.id])

  useEffect(() => {
    return () => {
      if (content?.data && content.type === 'blob') {
        URL.revokeObjectURL(content.data)
      }
    }
  }, [content])

  const handleDownload = () => {
    if (content?.data && content.type === 'blob') {
      const a = document.createElement('a')
      a.href = content.data
      a.download = file.original_filename
      a.click()
    }
  }

  if (!file) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-[var(--color-border)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-semibold text-[var(--color-text)] truncate">{file.original_filename}</span>
            <span className="text-xs text-[var(--color-text-subtle)] font-mono">{ext?.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-1">
            {content?.type === 'blob' && (
              <button onClick={handleDownload} className="p-2 rounded-lg hover:bg-[var(--color-primary-light)] text-[var(--color-text-muted)] cursor-pointer" title="下载">
                <Download size={18} />
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--color-danger-light)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] cursor-pointer" title="关闭">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[var(--color-bg)]">
          {loading && (
            <div className="flex items-center justify-center h-64 text-[var(--color-text-subtle)]">
              <Loader size={32} className="animate-spin" />
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-[var(--color-danger)] text-sm mb-2">预览失败</p>
                <p className="text-[var(--color-text-subtle)] text-xs">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && content?.type === 'html' && (
            <div className="md-preview" dangerouslySetInnerHTML={{ __html: content.data }} />
          )}

          {!loading && !error && content?.type === 'blob' && ext === 'pdf' && (
            <embed src={content.data} type="application/pdf" className="w-full h-full min-h-[70vh]" />
          )}

          {!loading && !error && content?.type === 'blob' && IMAGE_EXTS.has(ext) && (
            <div className="flex items-center justify-center p-4 min-h-[300px]">
              <img src={content.data} alt={file.original_filename} className="max-w-full max-h-[75vh] object-contain rounded-lg" />
            </div>
          )}

          {!loading && !error && content?.type === 'text' && (
            <pre className="p-6 text-sm font-mono text-[var(--color-text)] whitespace-pre-wrap break-all leading-relaxed">{content.data}</pre>
          )}
        </div>
      </div>
    </div>
  )
}
