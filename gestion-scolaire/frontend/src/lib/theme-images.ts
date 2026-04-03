import { getApiUrl } from '@/lib/api';

/**
 * Résout l’URL d’une image du thème (logo, favicon).
 * - Fichiers sous `/uploads/` : en navigateur on utilise l’URL **relative** pour que Next.js
 *   (`next.config` rewrites `/uploads/*` → API) serve le fichier en **même origine** que l’app.
 *   Cela évite les URLs cassées si `NEXT_PUBLIC_API_URL` est incorrect et les soucis CORS / mixed content.
 * - Définir `NEXT_PUBLIC_THEME_IMAGES_VIA_API=true` pour forcer `http(s)://API/uploads/...` (cas rare).
 * - Fichiers `public/` (`/logo.png`, `/favicon.ico`) : URL relative inchangée.
 */
export function getThemeImageSrc(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  if (path.startsWith('/uploads/')) {
    const forceApi =
      typeof process !== 'undefined' && process.env.NEXT_PUBLIC_THEME_IMAGES_VIA_API === 'true';
    if (typeof window !== 'undefined' && !forceApi) {
      return path;
    }
    return getApiUrl() + path;
  }
  return path;
}

/** Ancienne fonction, conservée pour compatibilité ; préférer getThemeImageSrc. */
export function resolveThemeImageUrl(url: string | null | undefined): string {
  return getThemeImageSrc(url);
}

/** Chemins par défaut dans public/ (sans upload). */
export const DEFAULT_LOGO_PATH = '/logo.png';
export const DEFAULT_LOGO_LOGIN_PATH = '/logo-login.png';
export const DEFAULT_FAVICON_PATH = '/favicon.ico';
