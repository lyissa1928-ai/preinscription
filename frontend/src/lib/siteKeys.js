/**
 * Clés site reCAPTCHA (publiques).
 * Ordre : variables Vite au build, puis window.__PREINSCRIPTION_SITE_KEYS__ (fichier public/config-site.js).
 */

function fromRuntime() {
  if (typeof window === 'undefined') return { recaptcha: '' }
  const w = window.__PREINSCRIPTION_SITE_KEYS__
  if (!w || typeof w !== 'object') return { recaptcha: '' }
  return {
    recaptcha: String(w.recaptcha ?? '').trim(),
  }
}

export function getRecaptchaSiteKey() {
  const env = String(import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? '').trim()
  if (env) return env
  return fromRuntime().recaptcha
}
