import { useEffect } from 'react'
import { X, AlertCircle, CheckCircle } from 'lucide-react'

export default function Toast({ message, type = 'error', onClose }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [message])

  if (!message) return null

  const isError = type === 'error'
  return (
    <div className="fixed top-4 right-4 z-[100] animate-[slideIn_0.3s_ease] max-w-md">
      <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl border-2 backdrop-blur ${
        isError
          ? 'bg-red-50 border-red-400 text-red-800 dark:bg-red-950 dark:border-red-600 dark:text-red-200'
          : 'bg-green-50 border-green-400 text-green-800 dark:bg-green-950 dark:border-green-600 dark:text-green-200'
      }`}>
        {isError ? <AlertCircle size={20} className="shrink-0 mt-0.5" /> : <CheckCircle size={20} className="shrink-0 mt-0.5" />}
        <p className="text-sm font-medium flex-1">{message}</p>
        <button onClick={onClose} className="shrink-0 p-0.5 rounded hover:bg-black/10 cursor-pointer"><X size={16} /></button>
      </div>
    </div>
  )
}
