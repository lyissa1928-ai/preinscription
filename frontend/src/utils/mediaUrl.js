import { resolveApiBaseUrl } from './resolveApiBaseUrl'
import { getAccessToken } from '../lib/tokenStorage'

/** Sous-dossiers /uploads restés publics côté API (logos établissements, branding plateforme). */
const PUBLIC_UPLOAD_PREFIXES = ['/uploads/etablissements/', '/uploads/platform/']

/**
 * URL affichable pour un fichier API (/uploads/...).
 * Aligné sur resolveApiBaseUrl (config-site.js en prod, proxy en dev).
 *
 * Les fichiers protégés (documents de dossier, justificatifs, PJ chat) exigent
 * désormais une authentification : comme <img>/<a> ne peuvent pas envoyer de
 * header Authorization, le token d'accès (courte durée) est ajouté en query.
 */
export function mediaUrl(pathOrUrl) {
  if (pathOrUrl == null || pathOrUrl === '') return null
  const s = String(pathOrUrl).trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  let path = s.startsWith('/') ? s : `/${s}`

  const isProtectedUpload =
    path.startsWith('/uploads/') &&
    !PUBLIC_UPLOAD_PREFIXES.some((p) => path.startsWith(p))
  if (isProtectedUpload) {
    const token = getAccessToken()
    if (token) {
      path += `${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
    }
  }

  const base = resolveApiBaseUrl()
  if (base) return `${base}${path}`
  return path
}
