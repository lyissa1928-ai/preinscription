import { useState, useEffect, useMemo, useRef } from 'react'

/** Images connues si le glob ne renvoie rien (build / dossier vide). */
const FALLBACK_URLS = [
  new URL('../../img/ESEBATBTP.jpg', import.meta.url).href,
  new URL('../../img/ESCOA.jpg', import.meta.url).href,
  new URL('../../img/EFOSANTE.jpg', import.meta.url).href,
  new URL('../../img/image-multisite.jpg', import.meta.url).href,
]

/**
 * Collecte toutes les images du dossier `frontend/img` (jpg, jpeg, png, webp).
 * Toute nouvelle image ajoutée au dossier est incluse automatiquement au build.
 */
function collectImgUrls() {
  try {
    const modules = import.meta.glob('../../img/*.{jpg,jpeg,png,webp}', { eager: true })
    const urls = Object.values(modules)
      .map((mod) => {
        if (mod && typeof mod === 'object' && 'default' in mod) return mod.default
        return mod
      })
      .filter((u) => typeof u === 'string' && u.length > 0)
    const unique = [...new Set(urls)].sort()
    if (unique.length > 0) return unique
  } catch {
    /* ignore */
  }
  return FALLBACK_URLS
}

const SLIDE_MS = 9000
const FADE_MS = 2200
const FOCUS_FADE_MS = 720

/**
 * Fond plein écran type « cinéma » : enchaînement des visuels du dossier img,
 * fondu enchaîné + léger effet Ken Burns (zoom / pan lent).
 * Si `focusedImageUrl` est défini, le carrousel est suspendu et ce visuel est affiché
 * (fondu + léger zoom lors d’un changement d’URL).
 * Respecte prefers-reduced-motion.
 */
export default function AuthCinematicBackground({ showProgressDots = true, focusedImageUrl = null }) {
  const urls = useMemo(() => collectImgUrls(), [])
  const [index, setIndex] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const prefRef = useRef(null)

  const baseRef = useRef(null)
  const [baseUrl, setBaseUrl] = useState(null)
  const [overlayUrl, setOverlayUrl] = useState(null)
  const [overlayVisible, setOverlayVisible] = useState(false)

  useEffect(() => {
    prefRef.current = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mq = prefRef.current
    const apply = () => setReducedMotion(!!mq.matches)
    apply()
    mq.addEventListener?.('change', apply)
    return () => mq.removeEventListener?.('change', apply)
  }, [])

  useEffect(() => {
    if (!focusedImageUrl) {
      baseRef.current = null
      setBaseUrl(null)
      setOverlayUrl(null)
      setOverlayVisible(false)
      return
    }
    if (!baseRef.current) {
      baseRef.current = focusedImageUrl
      setBaseUrl(focusedImageUrl)
      return
    }
    if (baseRef.current === focusedImageUrl) return
    setOverlayUrl(focusedImageUrl)
    setOverlayVisible(false)
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setOverlayVisible(true))
    })
    const t = window.setTimeout(() => {
      baseRef.current = focusedImageUrl
      setBaseUrl(focusedImageUrl)
      setOverlayUrl(null)
      setOverlayVisible(false)
    }, FOCUS_FADE_MS)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
    }
  }, [focusedImageUrl])

  useEffect(() => {
    if (focusedImageUrl) return undefined
    if (urls.length <= 1) return undefined
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % urls.length)
    }, SLIDE_MS)
    return () => clearInterval(t)
  }, [urls.length, focusedImageUrl])

  const kenVariant = ['auth-k0', 'auth-k1', 'auth-k2']

  return (
    <>
      <style>{`
        @keyframes authKenA {
          0%   { transform: scale(1.06) translate(0%, 0%); }
          100% { transform: scale(1.14) translate(-1.2%, -0.6%); }
        }
        @keyframes authKenB {
          0%   { transform: scale(1.08) translate(-0.5%, 0%); }
          100% { transform: scale(1.16) translate(1%, 0.8%); }
        }
        @keyframes authKenC {
          0%   { transform: scale(1.07) translate(0.3%, -0.4%); }
          100% { transform: scale(1.13) translate(-0.8%, 0.5%); }
        }
        .auth-kenburns.auth-k0 { animation: authKenA 24s ease-in-out infinite alternate; }
        .auth-kenburns.auth-k1 { animation: authKenB 26s ease-in-out infinite alternate; }
        .auth-kenburns.auth-k2 { animation: authKenC 20s ease-in-out infinite alternate; }
        @media (prefers-reduced-motion: reduce) {
          .auth-kenburns { animation: none !important; transform: scale(1.08); }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        {focusedImageUrl ? (
          <>
            <div className="absolute inset-0 z-[1]">
              <img
                src={baseUrl || focusedImageUrl}
                alt=""
                className={`absolute inset-0 h-full w-full object-cover ${
                  reducedMotion ? 'scale-105' : 'scale-[1.04]'
                }`}
                loading="eager"
                decoding="async"
              />
            </div>
            {overlayUrl ? (
              <div
                className="absolute inset-0 z-[2]"
                style={{
                  opacity: overlayVisible ? 1 : 0,
                  transition: `opacity ${FOCUS_FADE_MS}ms ease-out`,
                }}
              >
                <img
                  src={overlayUrl}
                  alt=""
                  className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out ${
                    reducedMotion ? 'scale-105' : overlayVisible ? 'scale-100' : 'scale-[1.08]'
                  }`}
                  loading="eager"
                  decoding="async"
                />
              </div>
            ) : null}
          </>
        ) : (
          urls.map((src, i) => (
            <div
              key={src}
              className="absolute inset-0 transition-opacity ease-in-out"
              style={{
                opacity: i === index ? 1 : 0,
                transitionDuration: `${FADE_MS}ms`,
                zIndex: i === index ? 2 : 1,
              }}
            >
              <img
                src={src}
                alt=""
                className={`absolute inset-0 h-full w-full object-cover ${reducedMotion ? '' : `auth-kenburns ${kenVariant[i % 3]}`}`}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
            </div>
          ))
        )}
        {/* Grain léger + vignette pour effet « pro » */}
        <div
          className="absolute inset-0 z-[3] opacity-[0.07] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
          }}
        />
        <div className="absolute inset-0 z-[4] bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(15,23,42,0.5)_100%)]" />
      </div>

      {/* Gradients lisibilité (identiques à l’existant) */}
      <div className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-b from-slate-950/65 via-indigo-950/55 to-slate-950/70" />
      <div className="pointer-events-none absolute inset-0 z-[5] bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.14),transparent_55%)]" />
      <div className="pointer-events-none absolute -top-24 -left-24 z-[5] h-72 w-72 rounded-full bg-cyan-300/15 blur-3xl" />
      <div className="pointer-events-none absolute top-24 -right-24 z-[5] h-80 w-80 rounded-full bg-violet-400/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 z-[5] h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />

      {showProgressDots && !focusedImageUrl && urls.length > 1 && (
        <div
          className="pointer-events-none absolute bottom-8 right-6 z-[6] flex gap-1.5 sm:right-10"
          aria-hidden="true"
        >
          {urls.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === index ? 'w-6 bg-white/90' : 'w-1.5 bg-white/35'
              }`}
            />
          ))}
        </div>
      )}
    </>
  )
}
