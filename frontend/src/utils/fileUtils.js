export const typeColors = {
  document: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  pdf: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  spreadsheet: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  video: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  image: 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
  archive: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  other: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
}

const typeLabelMap = {
  doc: '文档', docx: '文档', pdf: 'PDF', xls: '表格', xlsx: '表格', csv: '表格',
  jpg: '图片', jpeg: '图片', png: '图片', gif: '图片', svg: '图片',
  mp4: '视频', avi: '视频', mov: '视频',
  zip: '压缩包', rar: '压缩包', '7z': '压缩包', tar: '压缩包', gz: '压缩包',
}

const typeKeyMap = {
  doc: 'document', docx: 'document', pdf: 'pdf', xls: 'spreadsheet', xlsx: 'spreadsheet', csv: 'spreadsheet',
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', svg: 'image',
  mp4: 'video', avi: 'video', mov: 'video',
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
}

export function getTypeLabel(ext) {
  return typeLabelMap[ext] || '其他'
}

export function getTypeKey(ext) {
  return typeKeyMap[ext] || 'other'
}

export function formatSize(bytes) {
  if (bytes == null) return '-'
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

/**
 * Mask a raw string into the strict "YYYY-MM-DD HH:mm" datetime format.
 *
 * - Strips every non-digit character, so users can paste ISO strings
 *   ("2024-01-15T10:30:00"), slash dates ("2024/01/15"), or anything else
 *   and it will still come out as the canonical format.
 * - Caps at 12 digits (4 year + 2 month + 2 day + 2 hour + 2 minute), so
 *   the year is structurally locked to 4 digits — there is no keystroke
 *   path that can make it grow past 4.
 * - Inserts separators as the user types, so the displayed value is
 *   always a valid prefix of "YYYY-MM-DD HH:mm".
 *
 * @param {string} raw - whatever the user just typed or pasted
 * @returns {string} the formatted value (possibly empty or a partial prefix)
 */
export function formatDateTimeInput(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '').slice(0, 12)
  if (!digits) return ''

  const yyyy = digits.slice(0, 4)
  const MM = digits.slice(4, 6)
  const DD = digits.slice(6, 8)
  const HH = digits.slice(8, 10)
  const mm = digits.slice(10, 12)

  let out = yyyy
  if (digits.length > 4) out += '-' + MM
  if (digits.length > 6) out += '-' + DD
  if (digits.length > 8) out += ' ' + HH
  if (digits.length > 10) out += ':' + mm
  return out
}
