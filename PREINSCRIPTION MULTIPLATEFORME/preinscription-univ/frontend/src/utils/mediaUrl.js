import { resolveApiBaseUrl } from './resolveApiBaseUrl'

/**
 * URL affichable pour un fichier API (/uploads/...).
 * Aligné sur resolveApiBaseUrl (config-site.js en prod, proxy en dev).
 */
export function mediaUrl(pathOrUrl) {
  if (pathOrUrl == null || pathOrUrl === '') return null
  const s = String(pathOrUrl).trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  const path = s.startsWith('/') ? s : `/${s}`
  const base = resolveApiBaseUrl()
  if (base) return `${base}${path}`
  return path
}
