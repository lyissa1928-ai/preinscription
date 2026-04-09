/**
 * URL de base de l’API (sans slash final).
 *
 * - **Dev (`npm run dev`)** : par défaut chaîne vide → requêtes relatives `/api/...` prises en charge
 *   par le proxy Vite (voir vite.config.js → localhost:5000). `apiBaseUrl` dans config-site.js est
 *   ignoré pour éviter de casser le local si ce fichier pointe déjà vers la prod.
 *   Seul `VITE_API_URL` dans `.env.local` peut forcer une autre origine en dev.
 * - **Production** : `config-site.js` puis `VITE_API_URL` si le front n’est pas derrière un proxy /api.
 */
export function resolveApiBaseUrl() {
  if (import.meta.env.DEV) {
    return (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '')
  }
  if (typeof window !== 'undefined' && window.__PREINSCRIPTION_SITE_KEYS__) {
    const raw = window.__PREINSCRIPTION_SITE_KEYS__.apiBaseUrl
    if (raw != null && String(raw).trim() !== '') {
      return String(raw).trim().replace(/\/$/, '')
    }
  }
  return (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '')
}
