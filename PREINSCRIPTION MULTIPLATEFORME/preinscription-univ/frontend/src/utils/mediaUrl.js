/**
 * URL affichable pour un fichier API (/uploads/...).
 * Si l’API renvoie déjà une URL absolue, elle est renvoyée telle quelle.
 * Sinon, préfixe optionnel VITE_API_URL (front et API sur domaines différents).
 */
export function mediaUrl(pathOrUrl) {
  if (pathOrUrl == null || pathOrUrl === '') return null
  const s = String(pathOrUrl).trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  const path = s.startsWith('/') ? s : `/${s}`
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  if (base) return `${base}${path}`
  return path
}
