/** Chemin de déploiement (ex. /uniportail) dérivé de Vite `base`. */
export function getRouterBasename() {
  const raw = String(import.meta.env.BASE_URL || '/')
  if (raw === '/' || raw === '') return ''
  return raw.replace(/\/$/, '')
}

/** Retire le basename du pathname navigateur pour les comparaisons de routes. */
export function stripAppBasePath(pathname) {
  const base = getRouterBasename()
  if (!base) return pathname || '/'
  const p = pathname || '/'
  if (p === base) return '/'
  if (p.startsWith(`${base}/`)) return p.slice(base.length) || '/'
  return p
}

/** Préfixe un chemin interne pour les redirections `window.location` (hors React Router). */
export function withAppBase(path) {
  const base = getRouterBasename()
  const p = path.startsWith('/') ? path : `/${path}`
  if (!base) return p
  return `${base}${p}`
}
