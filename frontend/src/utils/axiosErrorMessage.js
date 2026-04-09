/**
 * Extrait un message lisible même si l’API renvoie du HTML (nginx, proxy) ou un corps vide.
 */
export function messageFromAxiosError(e, fallback = 'Une erreur est survenue.') {
  if (!e?.response) {
    if (e?.message === 'Network Error') {
      return 'Erreur réseau : vérifiez la connexion, que l’API tourne, et en production le proxy / CORS.'
    }
    return e?.message || fallback
  }
  const status = e.response.status
  const d = e.response.data
  if (d && typeof d === 'object') {
    const m = d.message ?? d.error
    if (typeof m === 'string' && m.trim()) return m.trim()
  }
  if (typeof d === 'string') {
    const t = d.trim()
    if (t.startsWith('<!') || t.startsWith('<html')) {
      if (status === 404) {
        return (
          'L’API n’a pas été trouvée (réponse HTML, HTTP 404). Les appels /api partent sur le mauvais hôte. ' +
          'En production : définissez VITE_API_URL au build (ex. https://votredomaine.com) ou apiBaseUrl dans public/config-site.js ' +
          'pour l’URL exacte du serveur Node, ou configurez nginx pour proxy /api vers le backend.'
        )
      }
      if (status === 413) {
        return 'Corps de requête trop volumineux (HTTP 413). Augmentez client_max_body_size dans nginx.'
      }
      return `Réponse HTML inattendue (HTTP ${status}). Vérifiez le proxy vers l’API Node et CORS.`
    }
    if (t.length > 0 && t.length < 400) return t
  }
  if (status === 413) return 'Contenu trop volumineux (limite serveur ou proxy). Réduisez le texte ou augmentez client_max_body_size (nginx).'
  if (status === 401) return 'Session expirée : reconnectez-vous.'
  if (status === 403) return 'Accès refusé (droits insuffisants ou mot de passe à changer).'
  if (status === 400) return 'Requête invalide (paramètres manquants ou données incorrectes).'
  if (status >= 500) return `Erreur serveur (HTTP ${status}). Réessayez plus tard.`
  return `Erreur HTTP ${status}.`
}
