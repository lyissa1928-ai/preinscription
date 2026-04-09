/**
 * Envoie une erreur client vers un endpoint optionnel (monitoring / logs agrégés).
 * Définir VITE_CLIENT_ERROR_REPORT_URL (POST JSON) pour activer ; sinon log en dev uniquement.
 */
export function reportClientError(payload) {
  try {
    const url = typeof import.meta.env?.VITE_CLIENT_ERROR_REPORT_URL === 'string'
      ? import.meta.env.VITE_CLIENT_ERROR_REPORT_URL.trim()
      : ''
    const body = JSON.stringify({
      ...payload,
      t: Date.now(),
      path: typeof window !== 'undefined' ? window.location?.pathname : undefined,
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    })
    if (url) {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
      return
    }
    if (import.meta.env?.DEV) {
      console.warn('[client-error]', payload)
    }
  } catch {
    /* ignore */
  }
}
