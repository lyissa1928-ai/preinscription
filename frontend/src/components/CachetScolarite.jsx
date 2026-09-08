import { mediaUrl } from '../utils/mediaUrl'

/**
 * Cachet institutionnel — toujours « La scolarité », jamais un titre de direction.
 * Fond transparent, sans cadre.
 */
export default function CachetScolarite({
  cachetUrl,
  className = '',
  /** Classes Tailwind supplémentaires pour l’image (taille / marges). */
  imgClassName = '',
}) {
  const src = mediaUrl(cachetUrl)
  return (
    <div className={`text-center ${className}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">La scolarité</p>
      {src ? (
        <img
          src={src}
          alt="Cachet de la scolarité"
          className={`mx-auto mt-2 block max-h-[26mm] w-auto max-w-full bg-transparent object-contain ${imgClassName}`}
          style={{ backgroundColor: 'transparent' }}
          decoding="sync"
        />
      ) : (
        <div
          className="mx-auto mt-2 h-[18mm] w-[32mm] border border-dashed border-slate-300 bg-transparent"
          aria-hidden
        />
      )}
    </div>
  )
}
