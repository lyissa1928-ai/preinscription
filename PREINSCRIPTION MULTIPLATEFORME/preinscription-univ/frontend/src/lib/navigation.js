/** Chemin interne sûr pour redirection après connexion / inscription (?next=). */
export function sanitizeNextPath(raw) {
  if (raw == null || typeof raw !== 'string') return null
  const s = raw.trim()
  if (!s.startsWith('/') || s.startsWith('//')) return null
  return s
}
