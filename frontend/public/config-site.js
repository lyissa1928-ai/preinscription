/**
 * Config sans rebuild : copié dans dist/ au build ; éditable sur le serveur après déploiement.
 * - apiBaseUrl : origine du serveur Node (API). Ex. '' si nginx proxy /api sur le même domaine,
 *   ou 'https://api.mondomaine.com' si le front et l’API sont sur des origines différentes.
 *   Sans ça, les requêtes /api peuvent partir sur l’hébergeur statique → 404 HTML.
 * - platform_name / faviconUrl : optionnels (sinon chargés via GET /api/public/site-branding).
 */
window.__PREINSCRIPTION_SITE_KEYS__ = {
  recaptcha: '',
  apiBaseUrl: '',
  platform_name: '',
  faviconUrl: '',
}
