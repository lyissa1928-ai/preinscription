import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../components/Navbar'
import { mediaUrl } from '../utils/mediaUrl'
import PreinscriptionConditionsBlock from '../components/PreinscriptionConditionsBlock'

const TYPE_META = {
  presentiel: { label: 'Présentiel', emoji: '🏫', short: 'Sur site' },
  en_ligne: { label: 'À distance (FAD)', emoji: '🌐', short: 'En ligne' },
}

/**
 * Catalogue public : filière → mode → formations, sans affichage des tarifs.
 */
export default function PublicEtablissementPage() {
  const { id } = useParams()
  const etabId = parseInt(String(id), 10)

  const [etab, setEtab] = useState(null)
  const [formations, setFormations] = useState([])
  const [flyers, setFlyers] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  /** 'all' | 'presentiel' | 'en_ligne' */
  const [filtreMode, setFiltreMode] = useState('all')
  const [step, setStep] = useState('filieres')
  const [selectedFiliereNom, setSelectedFiliereNom] = useState(null)
  const [selectedType, setSelectedType] = useState(null)

  useEffect(() => {
    if (!Number.isFinite(etabId)) {
      setNotFound(true)
      setLoading(false)
      return
    }
    let cancelled = false
    Promise.all([
      axios.get(`/api/public/etablissements/${etabId}`).catch(() => ({ data: null })),
      axios.get(`/api/public/formations?etablissement_id=${etabId}`).catch(() => ({ data: [] })),
      axios.get(`/api/public/etablissements/${etabId}/flyers`).catch(() => ({ data: [] })),
    ])
      .then(([etabRes, formRes, flyersRes]) => {
        if (cancelled) return
        if (!etabRes.data) {
          setNotFound(true)
          return
        }
        setEtab(etabRes.data)
        setFormations(Array.isArray(formRes.data) ? formRes.data : [])
        setFlyers(Array.isArray(flyersRes.data) ? flyersRes.data : [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [etabId])

  useEffect(() => {
    setStep('filieres')
    setSelectedFiliereNom(null)
    setSelectedType(null)
  }, [filtreMode])

  const primary = etab?.couleur_primaire || '#1e40af'
  const secondary = etab?.couleur_secondaire || '#3b82f6'

  const formationsFiltrees = useMemo(() => {
    return formations.filter((f) => filtreMode === 'all' || f.type === filtreMode)
  }, [formations, filtreMode])

  const modesPresents = useMemo(() => {
    const s = new Set()
    for (const f of formations) {
      if (f.type === 'presentiel' || f.type === 'en_ligne') s.add(f.type)
    }
    return ['presentiel', 'en_ligne'].filter((t) => s.has(t))
  }, [formations])

  const formationsParFiliere = useMemo(() => {
    const map = new Map()
    for (const f of formationsFiltrees) {
      const key = (f.filiere_nom && String(f.filiere_nom).trim()) || 'Sans filière'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(f)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'))
  }, [formationsFiltrees])

  const listeFiliere = selectedFiliereNom
    ? formationsParFiliere.find(([n]) => n === selectedFiliereNom)?.[1] || []
    : []

  const typesDispo = useMemo(() => {
    const order = ['presentiel', 'en_ligne']
    const st = new Set()
    for (const f of listeFiliere) {
      if (f.type === 'presentiel' || f.type === 'en_ligne') st.add(f.type)
    }
    return order.filter((t) => st.has(t))
  }, [listeFiliere])

  const formationsListe = listeFiliere.filter((f) => f.type === selectedType)

  const goFilieres = () => {
    setStep('filieres')
    setSelectedFiliereNom(null)
    setSelectedType(null)
  }
  const goTypes = () => {
    setStep('types')
    setSelectedType(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />
        </div>
      </div>
    )
  }

  if (notFound || !etab) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <p className="text-4xl mb-4">🔍</p>
          <h1 className="text-xl font-bold text-gray-900">Établissement introuvable</h1>
          <p className="mt-2 text-gray-500 text-sm">Ce lien n’est pas valide ou l’établissement n’est plus affiché.</p>
          <Link to="/" className="mt-6 inline-block font-semibold text-blue-700 hover:underline">
            ← Retour à l’accueil
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="mx-auto w-full max-w-5xl overflow-x-hidden px-4 py-8 sm:px-6 sm:py-10">
        <nav className="mb-6 text-sm">
          <Link to="/" className="font-medium text-blue-700 hover:underline">
            Accueil
          </Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-600">{etab.nom}</span>
        </nav>

        <header className="mb-8 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="h-2" style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }} />
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:gap-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-inner sm:h-20 sm:w-20">
              {etab.logo_url ? (
                <img src={mediaUrl(etab.logo_url)} alt="" className="h-full w-full object-contain p-1" />
              ) : (
                <span className="text-2xl font-black" style={{ color: primary }}>
                  {etab.nom[0]}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-black text-gray-900 sm:text-3xl">{etab.nom}</h1>
              {etab.description && <p className="mt-2 text-sm leading-relaxed text-gray-600">{etab.description}</p>}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                {etab.adresse && <span className="min-w-0 break-words">📍 {etab.adresse}</span>}
                {etab.telephone && <span>📞 {etab.telephone}</span>}
                {etab.email_contact && <span className="break-all">✉️ {etab.email_contact}</span>}
              </div>
            </div>
          </div>
        </header>

        <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-950">
          <span className="font-semibold">Candidature : </span>
          créez d’abord un{' '}
          <Link to={`/inscription?etablissement_id=${etabId}`} className="font-bold text-blue-800 underline decoration-blue-300 underline-offset-2 hover:text-blue-950">
            compte candidat
          </Link>
          {' '}
          (sans cela, pas de préinscription ni de demande proforma). Ensuite, depuis votre espace :{' '}
          <Link
            to={`/demande-proforma?etablissement_id=${etabId}&tab=conditions`}
            className="font-bold text-blue-800 underline decoration-blue-300 underline-offset-2 hover:text-blue-950"
          >
            conditions d’admission et demande de facture proforma
          </Link>
          {' '}
          ou{' '}
          <Link to="/preinscription" className="font-bold text-blue-800 underline decoration-blue-300 underline-offset-2 hover:text-blue-950">
            préinscription
          </Link>
          .
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-black text-gray-900 sm:text-xl">Filières et formations</h2>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Informations pédagogiques — les{' '}
            <strong>tarifs ne sont pas affichés</strong> ici. Ils sont communiqués lors de l’inscription ou sur la facture
            proforma.
          </p>
        </div>

        {formations.length > 0 && modesPresents.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
            <span className="self-center text-[11px] font-semibold text-gray-400">Mode</span>
            <button
              type="button"
              onClick={() => setFiltreMode('all')}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                filtreMode === 'all' ? 'border-transparent text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
              style={filtreMode === 'all' ? { background: secondary } : {}}
            >
              Tous
            </button>
            {modesPresents.includes('presentiel') && (
              <button
                type="button"
                onClick={() => setFiltreMode('presentiel')}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                  filtreMode === 'presentiel' ? 'border-transparent text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
                style={filtreMode === 'presentiel' ? { background: secondary } : {}}
              >
                Présentiel
              </button>
            )}
            {modesPresents.includes('en_ligne') && (
              <button
                type="button"
                onClick={() => setFiltreMode('en_ligne')}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                  filtreMode === 'en_ligne' ? 'border-transparent text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
                style={filtreMode === 'en_ligne' ? { background: secondary } : {}}
              >
                Distance
              </button>
            )}
          </div>
        )}

        {formationsFiltrees.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-14 text-center text-gray-500">
            {formations.length === 0
              ? 'Aucune formation publiée pour cet établissement pour le moment.'
              : 'Aucune formation ne correspond au filtre (mode).'}
          </div>
        ) : (
          <>
            {step === 'filieres' && (
              <div className="grid gap-4 sm:grid-cols-2">
                {formationsParFiliere.map(([nom, liste]) => {
                  const nP = liste.filter((x) => x.type === 'presentiel').length
                  const nD = liste.filter((x) => x.type === 'en_ligne').length
                  return (
                    <button
                      key={nom}
                      type="button"
                      onClick={() => {
                        setSelectedFiliereNom(nom)
                        setStep('types')
                      }}
                      className="rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
                    >
                      <p className="font-bold text-gray-900">{nom}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {liste.length} proposition{liste.length !== 1 ? 's' : ''}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {nP > 0 && (
                          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-800">
                            🏫 Présentiel · {nP}
                          </span>
                        )}
                        {nD > 0 && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            🌐 Distance · {nD}
                          </span>
                        )}
                      </div>
                      <p className="mt-4 text-xs font-bold text-blue-700">Voir les modes →</p>
                    </button>
                  )
                })}
              </div>
            )}

            {step === 'types' && selectedFiliereNom && (
              <div className="space-y-4">
                <button type="button" onClick={goFilieres} className="text-sm font-semibold text-blue-700 hover:underline">
                  ← Toutes les filières
                </button>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{selectedFiliereNom}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {typesDispo.map((t) => {
                    const meta = TYPE_META[t]
                    const count = listeFiliere.filter((f) => f.type === t).length
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setSelectedType(t)
                          setStep('liste')
                        }}
                        className="rounded-2xl border border-gray-100 bg-white p-6 text-left shadow-sm transition-all hover:shadow-md"
                      >
                        <div className="text-3xl">{meta?.emoji}</div>
                        <p className="mt-2 text-lg font-black text-gray-900">{meta?.label}</p>
                        <p className="text-sm text-gray-500">{meta?.short}</p>
                        <p className="mt-4 text-sm font-bold text-blue-700">
                          {count} formation{count !== 1 ? 's' : ''} →
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {step === 'liste' && selectedFiliereNom && selectedType && (
              <div className="space-y-4">
                <button type="button" onClick={goTypes} className="text-sm font-semibold text-blue-700 hover:underline">
                  ← Retour aux modes
                </button>
                <h3 className="text-base font-bold text-gray-900">
                  {TYPE_META[selectedType]?.emoji} {TYPE_META[selectedType]?.label}
                  <span className="font-normal text-gray-500"> — {selectedFiliereNom}</span>
                </h3>
                <ul className="space-y-4">
                  {formationsListe.map((f) => (
                    <li
                      key={f.id}
                      className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
                    >
                      <div className="h-1" style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }} />
                      <div className="p-4 sm:p-5">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              f.type === 'en_ligne' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {f.type === 'en_ligne' ? '🌐 FAD' : `🏫 ${f.ville || 'Présentiel'}`}
                          </span>
                          {f.niveau_requis && (
                            <span className="text-[11px] text-gray-400">{f.niveau_requis}</span>
                          )}
                        </div>
                        <h4 className="text-base font-bold text-gray-900">{f.titre}</h4>
                        {f.filiere_duree_cycle && (
                          <p className="mt-1 text-xs text-gray-600">
                            Durée cycle : <span className="font-semibold">{f.filiere_duree_cycle}</span>
                          </p>
                        )}
                        {f.filiere_condition_acces && (
                          <p className="mt-1 text-xs text-gray-600">Accès : {f.filiere_condition_acces}</p>
                        )}
                        {f.niveau && <p className="mt-1 text-xs text-gray-600">Niveau : {f.niveau}</p>}
                        {f.nombre_annees > 0 && (
                          <p className="mt-1 text-xs text-gray-600">Durée : {f.nombre_annees} an(s)</p>
                        )}
                        {f.description && <p className="mt-2 text-xs text-gray-500 line-clamp-3">{f.description}</p>}
                        {f.debouches && (
                          <p className="mt-2 text-xs text-slate-600">
                            <span className="font-semibold text-slate-700">Débouchés :</span> {f.debouches}
                          </p>
                        )}
                        <details className="mt-3 text-xs">
                          <summary className="cursor-pointer font-semibold text-blue-700">Conditions d&apos;entrée</summary>
                          <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-gray-100 bg-slate-50 p-2">
                            <PreinscriptionConditionsBlock formationNiveau={f.niveau} />
                          </div>
                        </details>
                        {flyers.filter((fl) => Number(fl.formation_id) === Number(f.id)).length > 0 && (
                          <div className="mt-3 space-y-1">
                            <p className="text-[11px] font-semibold text-slate-600">Flyers</p>
                            {flyers
                              .filter((fl) => Number(fl.formation_id) === Number(f.id))
                              .map((fl) => (
                                <a
                                  key={fl.id}
                                  href={mediaUrl(fl.file_url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block text-sm font-semibold text-blue-700 hover:underline"
                                >
                                  ⬇ {fl.titre || 'Télécharger le flyer'}
                                </a>
                              ))}
                          </div>
                        )}
                        <p className="mt-3 text-[10px] text-amber-800/90 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
                          Tarifs non affichés sur cette page — communiqués après inscription ou sur demande de facture proforma.
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {flyers.length > 0 && (
          <section className="mt-10 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-gray-900">Flyers à télécharger</h2>
            <p className="mt-1 text-xs text-gray-500">Documents publics — aucun compte requis.</p>
            <ul className="mt-4 space-y-3">
              {flyers.map((fl) => (
                <li key={fl.id} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                  <p className="font-bold text-slate-900">{fl.titre}</p>
                  {fl.description && <p className="mt-1 text-xs text-slate-600 line-clamp-2">{fl.description}</p>}
                  {fl.debouches && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                      <span className="font-semibold">Débouchés :</span> {fl.debouches}
                    </p>
                  )}
                  <a
                    href={mediaUrl(fl.file_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm font-bold hover:underline"
                    style={{ color: primary }}
                  >
                    ⬇ Télécharger
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-10 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
          <Link
            to={`/inscription?etablissement_id=${etabId}`}
            className="inline-flex justify-center rounded-xl px-5 py-3 text-center text-sm font-bold text-white shadow-md transition-opacity hover:opacity-95"
            style={{ background: primary }}
          >
            Créer un compte — étape obligatoire
          </Link>
          <Link
            to={`/demande-proforma?etablissement_id=${etabId}&tab=conditions`}
            className="inline-flex justify-center rounded-xl border-2 border-gray-200 bg-white px-5 py-3 text-center text-sm font-semibold text-gray-800 hover:border-gray-300"
          >
            Après connexion : facture proforma
          </Link>
          <Link to="/etablissements" className="inline-flex justify-center text-sm font-semibold text-blue-700 hover:underline py-2">
            ← Autres établissements
          </Link>
        </div>
      </div>
    </div>
  )
}
