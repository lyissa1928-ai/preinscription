import { Link } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog'
import { mediaUrl } from '../utils/mediaUrl'

const TYPE_META = {
  presentiel: { label: 'Présentiel', badge: 'Sur site', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  en_ligne: { label: 'Formation à distance (FAD)', badge: 'En ligne', tone: 'bg-sky-50 text-sky-800 border-sky-200' },
}

function fmtMoney(n) {
  const v = Number(n)
  if (!Number.isFinite(v) || v <= 0) return null
  return new Intl.NumberFormat('fr-FR').format(Math.round(v))
}

/**
 * Modale professionnelle : formations d’une filière, groupées Présentiel / FAD.
 */
export default function FiliereFormationsModal({
  open,
  onOpenChange,
  filiere,
  formations = [],
  primary = '#1e40af',
  hideTarifs = false,
  showCandidater = false,
  flyers = [],
}) {
  const byType = {
    presentiel: formations.filter((f) => f.type === 'presentiel'),
    en_ligne: formations.filter((f) => f.type === 'en_ligne'),
  }
  const sections = ['presentiel', 'en_ligne'].filter((t) => byType[t].length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[min(96vw,720px)] overflow-hidden p-0 md:max-w-3xl">
        <div className="flex max-h-[92vh] flex-col">
          <DialogHeader className="shrink-0 border-b border-slate-100 px-5 py-4 text-left sm:px-6">
            <DialogTitle className="font-serif text-xl text-slate-900">
              {filiere?.nom || 'Filière'}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              {formations.length} formation{formations.length > 1 ? 's' : ''} — choisissez une modalité puis une formation.
            </DialogDescription>
            {(filiere?.duree_cycle || filiere?.condition_acces) && (
              <p className="mt-2 text-xs text-slate-500">
                {[filiere.duree_cycle && `Cycle : ${filiere.duree_cycle}`, filiere.condition_acces]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4 sm:px-6">
            {sections.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune formation active dans cette filière.</p>
            ) : (
              sections.map((type) => {
                const meta = TYPE_META[type]
                return (
                  <section key={type}>
                    <div className="mb-3 flex items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${meta.tone}`}>
                        {meta.badge}
                      </span>
                      <h3 className="text-sm font-bold text-slate-800">{meta.label}</h3>
                    </div>
                    <ul className="space-y-3">
                      {byType[type].map((f) => {
                        const inscription = fmtMoney(f.frais_inscription)
                        const mens = fmtMoney(f.mensualite)
                        const prix = fmtMoney(f.prix)
                        return (
                          <li
                            key={f.id}
                            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                          >
                            <p className="font-semibold text-slate-900">{f.titre}</p>
                            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                              {f.niveau && <span>Niveau : {f.niveau}</span>}
                              {(f.duree || f.duree_formation) && (
                                <span>Durée : {f.duree_formation || f.duree}</span>
                              )}
                              {f.ville && type === 'presentiel' && <span>{f.ville}</span>}
                            </p>
                            {f.description && (
                              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
                                {f.description}
                              </p>
                            )}
                            {!hideTarifs && (inscription || mens || prix) && (
                              <p className="mt-2 text-xs font-medium text-slate-700">
                                {[
                                  inscription && `Inscription ${inscription} FCFA`,
                                  mens && `Mensualité ${mens} FCFA`,
                                  !mens && prix && `Forfait ${prix} FCFA`,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </p>
                            )}
                            {showCandidater && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Link
                                  to={`/preinscription/${f.id}`}
                                  className="inline-flex min-h-[40px] items-center rounded-lg px-3 py-2 text-sm font-bold text-white"
                                  style={{ background: primary }}
                                  onClick={() => onOpenChange?.(false)}
                                >
                                  Préinscription
                                </Link>
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )
              })
            )}

            {flyers.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-bold text-slate-800">Documents / flyers</h3>
                <ul className="space-y-1 text-sm">
                  {flyers.map((fl) => (
                    <li key={fl.id || fl.url || fl.titre}>
                      <a
                        href={mediaUrl(fl.url || fl.fichier_url || fl.chemin)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold hover:underline"
                        style={{ color: primary }}
                      >
                        {fl.titre || fl.nom || 'Document'}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { TYPE_META }
