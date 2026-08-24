import { mediaUrl } from '../utils/mediaUrl'

/** Cachet institutionnel — toujours « La scolarité », jamais un titre de direction. */
export default function CachetScolarite({ cachetUrl, className = '' }) {
  const src = mediaUrl(cachetUrl)
  return (
    <div className={`text-center ${className}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">La scolarité</p>
      {src ? (
        <img src={src} alt="Cachet de la scolarité" className="mx-auto my-2 max-h-28 object-contain" />
      ) : (
        <div className="mx-auto my-3 h-20 w-36 border border-dashed border-slate-300" aria-hidden />
      )}
    </div>
  )
}
