import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../components/Navbar'
import { mediaUrl } from '../utils/mediaUrl'
import PreinscriptionConditionsBlock from '../components/PreinscriptionConditionsBlock'
import FiliereFormationsModal from '../components/FiliereFormationsModal'

/**
 * Catalogue public : Établissement → cartes filières → modale formations (Présentiel / FAD).
 */
export default function PublicEtablissementPage() {
  const { id } = useParams()
  const etabId = parseInt(String(id), 10)

  const [etab, setEtab] = useState(null)
  const [formations, setFormations] = useState([])
  const [flyers, setFlyers] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [filtreMode, setFiltreMode] = useState('all')
  const [modalFiliere, setModalFiliere] = useState(null)

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
      if (!map.has(key)) {
        map.set(key, {
          filiere_id: f.filiere_id || null,
          nom: key,
          duree_cycle: f.filiere_duree_cycle || null,
          condition_acces: f.filiere_condition_acces || null,
          formations: [],
        })
      }
      const bloc = map.get(key)
      if (!bloc.filiere_id && f.filiere_id) bloc.filiere_id = f.filiere_id
      if (!bloc.duree_cycle && f.filiere_duree_cycle) bloc.duree_cycle = f.filiere_duree_cycle
      if (!bloc.condition_acces && f.filiere_condition_acces) bloc.condition_acces = f.filiere_condition_acces
      bloc.formations.push(f)
    }
    return [...map.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  }, [formationsFiltrees])

  const flyersPourFiliere = (filiereId, filiereNom) =>
    flyers.filter((fl) => {
      if (filiereId && Number(fl.filiere_id) === Number(filiereId)) return true
      if (filiereNom && fl.filiere_nom && String(fl.filiere_nom).trim() === String(filiereNom).trim()) {
        return true
      }
      return false
    })

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
          <h1 className="text-xl font-bold text-gray-900">Établissement introuvable</h1>
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
          <Link to="/" className="font-medium text-blue-700 hover:underline">Accueil</Link>
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
                <span className="text-2xl font-black" style={{ color: primary }}>{etab.nom[0]}</span>
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
          <Link to={`/inscription?etablissement_id=${etabId}`} className="font-bold text-blue-800 underline underline-offset-2">
            compte candidat
          </Link>
          , puis depuis votre espace : préinscription ou demande de facture proforma.
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-black text-gray-900 sm:text-xl">Filières</h2>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Cliquez sur une filière pour voir ses formations (présentiel et/ou à distance). Les tarifs détaillés figurent sur la facture proforma.
          </p>
        </div>

        {formations.length > 0 && modesPresents.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-2">
            <span className="self-center text-[11px] font-semibold text-gray-400">Filtrer</span>
            {[
              { id: 'all', label: 'Tous' },
              modesPresents.includes('presentiel') && { id: 'presentiel', label: 'Présentiel' },
              modesPresents.includes('en_ligne') && { id: 'en_ligne', label: 'Distance (FAD)' },
            ]
              .filter(Boolean)
              .map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFiltreMode(opt.id)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                    filtreMode === opt.id ? 'border-transparent text-white' : 'border-gray-200 bg-white text-gray-600'
                  }`}
                  style={filtreMode === opt.id ? { background: secondary } : {}}
                >
                  {opt.label}
                </button>
              ))}
          </div>
        )}

        {formationsFiltrees.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-14 text-center text-gray-500">
            {formations.length === 0
              ? 'Aucune formation publiée pour cet établissement pour le moment.'
              : 'Aucune formation ne correspond au filtre.'}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {formationsParFiliere.map((bloc) => {
              const nP = bloc.formations.filter((x) => x.type === 'presentiel').length
              const nD = bloc.formations.filter((x) => x.type === 'en_ligne').length
              return (
                <button
                  key={bloc.nom}
                  type="button"
                  onClick={() => setModalFiliere(bloc)}
                  className="rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <p className="font-bold text-gray-900">{bloc.nom}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {bloc.formations.length} formation{bloc.formations.length !== 1 ? 's' : ''}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {nP > 0 && (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        Présentiel · {nP}
                      </span>
                    )}
                    {nD > 0 && (
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-800">
                        FAD · {nD}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-xs font-semibold" style={{ color: primary }}>
                    Voir les formations →
                  </p>
                </button>
              )
            })}
          </div>
        )}

        <div className="mt-10">
          <PreinscriptionConditionsBlock etablissementId={etabId} />
        </div>

        <div className="mt-10 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
          <Link
            to={`/inscription?etablissement_id=${etabId}`}
            className="inline-flex justify-center rounded-xl px-5 py-3 text-center text-sm font-bold text-white shadow-md"
            style={{ background: primary }}
          >
            Créer un compte — étape obligatoire
          </Link>
          <Link to="/etablissements" className="inline-flex justify-center py-2 text-sm font-semibold text-blue-700 hover:underline">
            ← Autres établissements
          </Link>
        </div>
      </div>

      <FiliereFormationsModal
        open={Boolean(modalFiliere)}
        onOpenChange={(o) => { if (!o) setModalFiliere(null) }}
        filiere={modalFiliere}
        formations={modalFiliere?.formations || []}
        primary={primary}
        hideTarifs
        showCandidater={false}
        flyers={modalFiliere ? flyersPourFiliere(modalFiliere.filiere_id, modalFiliere.nom) : []}
      />
    </div>
  )
}
