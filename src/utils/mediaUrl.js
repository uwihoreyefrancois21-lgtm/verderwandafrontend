/** Resolve image paths from API (relative or absolute) to a full URL for <img src>. */
export function resolveMediaUrl(path) {
  if (path == null || path === '') return ''
  const s = String(path).trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
  const origin = base.replace(/\/api\/v1\/?$/, '')
  return s.startsWith('/') ? `${origin}${s}` : `${origin}/${s}`
}
