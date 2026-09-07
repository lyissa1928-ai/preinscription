/**
 * Détecte les erreurs de chunks Vite après un déploiement
 * (ancien hash encore en cache / onglet ouvert).
 */
export function isChunkLoadError(error) {
  const msg = String(error?.message || error || '')
  const name = String(error?.name || '')
  return (
    name === 'ChunkLoadError'
    || /Failed to fetch dynamically imported module/i.test(msg)
    || /error loading dynamically imported module/i.test(msg)
    || /Importing a module script failed/i.test(msg)
    || /Loading chunk [\w-]+ failed/i.test(msg)
    || /Unable to preload CSS/i.test(msg)
  )
}

const RELOAD_KEY = 'uniportail_chunk_reload_v1'

/** Une seule tentative de hard-reload par session pour éviter une boucle. */
export function tryReloadOnceForStaleChunk() {
  try {
    if (typeof sessionStorage === 'undefined') {
      window.location.reload()
      return true
    }
    if (sessionStorage.getItem(RELOAD_KEY) === '1') return false
    sessionStorage.setItem(RELOAD_KEY, '1')
  } catch {
    /* private mode */
  }
  const url = new URL(window.location.href)
  url.searchParams.set('_v', String(Date.now()))
  window.location.replace(url.toString())
  return true
}

/** Appelé au boot réussi : autorise un futur reload après le prochain deploy. */
export function clearChunkReloadFlag() {
  try {
    sessionStorage.removeItem(RELOAD_KEY)
  } catch {
    /* ignore */
  }
}
