/**
 * Thème dynamique basé sur la couleur principale de l'établissement.
 * Applique des variables CSS sur :root pour sidebar, boutons, accents.
 */

function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '').trim()
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16)
    const g = parseInt(h[1] + h[1], 16)
    const b = parseInt(h[2] + h[2], 16)
    return { r, g, b }
  }
  if (h.length !== 6 || Number.isNaN(parseInt(h, 16))) return null
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function rgbToHex({ r, g, b }) {
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)))
  return `#${[clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

/** Luminance relative (0 = noir, 1 = blanc). */
function luminance({ r, g, b }) {
  const a = [r, g, b].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]
}

function darken(rgb, amount) {
  return {
    r: rgb.r * (1 - amount),
    g: rgb.g * (1 - amount),
    b: rgb.b * (1 - amount),
  }
}

function lighten(rgb, amount) {
  return {
    r: rgb.r + (255 - rgb.r) * amount,
    g: rgb.g + (255 - rgb.g) * amount,
    b: rgb.b + (255 - rgb.b) * amount,
  }
}

/**
 * Garantit une couleur utilisable pour texte blanc / fond sombre.
 * Trop claire → assombrie ; trop sombre → légèrement éclaircie.
 */
export function normalizeBrandColor(hex, fallback = '#1e40af') {
  let rgb = hexToRgb(hex)
  if (!rgb) rgb = hexToRgb(fallback)
  let L = luminance(rgb)
  // Sidebar / boutons : besoin d'un fond assez sombre pour texte blanc
  if (L > 0.55) {
    rgb = darken(rgb, 0.35 + (L - 0.55))
    L = luminance(rgb)
  }
  if (L < 0.08) {
    rgb = lighten(rgb, 0.18)
  }
  const primary = rgbToHex(rgb)
  const secondary = rgbToHex(darken(rgb, 0.22))
  const onPrimary = luminance(rgb) > 0.45 ? '#0f172a' : '#ffffff'
  return { primary, secondary, onPrimary, raw: hex || fallback }
}

/** Applique le thème établissement sur document.documentElement. */
export function applyEtabTheme(couleurPrimaire, couleurSecondaire) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const brand = normalizeBrandColor(couleurPrimaire || '#1e40af')
  const sec = couleurSecondaire ? normalizeBrandColor(couleurSecondaire, brand.secondary) : brand

  root.style.setProperty('--etab-primary', brand.primary)
  root.style.setProperty('--etab-primary-dark', brand.secondary)
  root.style.setProperty('--etab-secondary', sec.primary)
  root.style.setProperty('--etab-on-primary', brand.onPrimary)
  root.style.setProperty('--etab-primary-soft', `${brand.primary}18`)
  root.dataset.etabThemed = '1'
}

export function clearEtabTheme() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  ;['--etab-primary', '--etab-primary-dark', '--etab-secondary', '--etab-on-primary', '--etab-primary-soft'].forEach((k) => {
    root.style.removeProperty(k)
  })
  delete root.dataset.etabThemed
}

export function getUserBrandColor(user) {
  return (
    user?.etablissement_couleur ||
    user?.etablissement?.couleur_primaire ||
    null
  )
}
