/** Applique favicon et titre document depuis l’API publique ou config-site.js */
import axios from 'axios'
import { mediaUrl } from './mediaUrl'

const DEFAULT_TITLE = 'Préinscription Universitaire'

function faviconMime(url) {
  if (!url) return 'image/svg+xml'
  const u = url.toLowerCase()
  if (u.endsWith('.svg')) return 'image/svg+xml'
  if (u.endsWith('.png')) return 'image/png'
  if (u.endsWith('.webp')) return 'image/webp'
  if (u.endsWith('.ico')) return 'image/x-icon'
  if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return 'image/jpeg'
  return 'image/png'
}

export function applySiteBranding({ platform_name, favicon_url } = {}) {
  if (platform_name) {
    document.title = platform_name
  }
  const href = mediaUrl(favicon_url) || '/favicon.svg'
  let link = document.querySelector('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = href
  link.type = faviconMime(href)
}

export async function loadAndApplySiteBranding() {
  const keys = typeof window !== 'undefined' ? window.__PREINSCRIPTION_SITE_KEYS__ : null
  if (keys?.platform_name || keys?.faviconUrl) {
    applySiteBranding({
      platform_name: keys.platform_name,
      favicon_url: keys.faviconUrl,
    })
  }
  try {
    const { data } = await axios.get('/api/public/site-branding', { timeout: 8000 })
    applySiteBranding(data)
    if (typeof window !== 'undefined' && window.__PREINSCRIPTION_SITE_KEYS__) {
      window.__PREINSCRIPTION_SITE_KEYS__.platform_name = data.platform_name
      window.__PREINSCRIPTION_SITE_KEYS__.faviconUrl = data.favicon_url
    }
  } catch {
    if (!document.querySelector('link[rel="icon"]')?.getAttribute('href')) {
      applySiteBranding({ platform_name: DEFAULT_TITLE, favicon_url: '/favicon.svg' })
    }
  }
}
