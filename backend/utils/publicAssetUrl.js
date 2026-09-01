/**
 * URL absolue pour les fichiers servis par ce backend (/uploads/...).
 * - Si déjà http(s) : extrait le chemin /uploads/... puis reconstruit l’URL courante
 * - Si PUBLIC_ASSET_BASE_URL est défini : préfixe (reverse proxy, CDN API)
 * - Sinon : construit depuis la requête (Host, X-Forwarded-Proto)
 */
function normalizeAssetPath(relativeOrAbsolute) {
  if (relativeOrAbsolute == null || relativeOrAbsolute === '') return null;
  const s = String(relativeOrAbsolute).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) {
    const m = s.match(/\/uploads\/[^\s?#]+/i);
    return m ? m[0] : s;
  }
  return s.startsWith('/') ? s : `/${s}`;
}

function publicAssetUrl(req, relativeOrAbsolute) {
  const pathPart = normalizeAssetPath(relativeOrAbsolute);
  if (!pathPart) return null;
  if (/^https?:\/\//i.test(pathPart)) return pathPart;
  const envBase = (process.env.PUBLIC_ASSET_BASE_URL || '').replace(/\/$/, '');
  if (envBase) return `${envBase}${pathPart}`;
  if (!req || typeof req.get !== 'function') return pathPart;
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  const host = req.get('host');
  if (!host) return pathPart;
  return `${proto}://${host}${pathPart}`;
}

module.exports = { publicAssetUrl, normalizeAssetPath };
