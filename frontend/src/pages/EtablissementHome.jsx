import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import PreinscriptionConditionsBlock from '../components/PreinscriptionConditionsBlock'
import { forfaitAnnuelFromFormation } from '../lib/formationTarifs'

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0)

const TYPE_FORMATION_META = {
  presentiel: { label: 'Présentiel', emoji: '🏫', desc: 'Cours en présentiel sur site' },
  en_ligne: { label: 'À distance (FAD)', emoji: '🌐', desc: 'Formation à distance en ligne' },
}

const ROLE_LINKS = {
  responsable: { label: 'Traiter les dossiers',    path: '/responsable',  icon: '📋' },
  agent_admin:  { label: 'Contrôle administratif', path: '/agent-admin',   icon: '🗂️' },
  comptable:    { label: 'Finance & Facturation',   path: '/comptable',    icon: '💰' },
  admin:        { label: 'Administration',          path: '/admin',         icon: '👁️' },
  controleur_qualite: { label: 'Qualité & conformité', path: '/qualite', icon: '✅' },
}

function FormationCatalogueCard({ f, primary, secondary, isEtudiant }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="h-1.5 shrink-0" style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4 sm:p-5">
        <div className="mb-2 flex min-w-0 flex-wrap items-center gap-1.5">
          <span className={`max-w-full truncate text-[11px] font-bold sm:text-xs px-2.5 py-1 rounded-full ${f.type === 'en_ligne' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`} title={f.type === 'en_ligne' ? 'FAD' : (f.ville || 'Présentiel')}>
            {f.type === 'en_ligne' ? '🌐 FAD' : `🏫 ${f.ville || 'Présentiel'}`}
          </span>
          {f.niveau_requis && (
            <span className="max-w-[10rem] truncate text-[11px] text-gray-400 sm:text-xs" title={f.niveau_requis}>{f.niveau_requis}</span>
          )}
        </div>
        <h3 className="mb-2 line-clamp-3 min-h-0 text-[15px] font-bold leading-snug text-gray-900 sm:text-base">{f.titre}</h3>
        {f.filiere_duree_cycle && (
          <p className="mb-1 line-clamp-2 text-xs text-gray-700">Durée cycle : <span className="font-semibold">{f.filiere_duree_cycle}</span></p>
        )}
        {f.filiere_condition_acces && (
          <p className="mb-1 line-clamp-2 text-xs text-gray-700">Accès : {f.filiere_condition_acces}</p>
        )}
        {f.niveau && <p className="mb-1 text-xs text-gray-600">Niveau : {f.niveau}</p>}
        {f.description && <p className="mb-2 line-clamp-2 text-xs text-gray-500">{f.description}</p>}
        <details className="mb-2 min-w-0 text-xs">
          <summary className="cursor-pointer font-semibold text-blue-700 hover:text-blue-800">Conditions d&apos;entrée</summary>
          <div className="mt-2 max-h-36 overflow-y-auto rounded-lg border border-gray-100 bg-slate-50/90 p-2">
            <PreinscriptionConditionsBlock formationNiveau={f.niveau} />
          </div>
        </details>
        <div className="mt-auto border-t border-gray-100 pt-3">
          {isEtudiant ? (
            <div className="space-y-2">
              {(f.places_restantes != null || (f.places != null && f.places !== '')) && (
                <p className="text-center text-[11px] text-gray-500 sm:text-xs">
                  {f.places_restantes != null ? (
                    <>
                      <span className="font-semibold text-gray-700">{f.places_restantes}</span>
                      {' '}
                      place{Number(f.places_restantes) !== 1 ? 's' : ''} restante
                      {Number(f.places_restantes) !== 1 ? 's' : ''} (indicatif)
                      {typeof f.candidatures_actives === 'number' && f.candidatures_actives > 0 && (
                        <span className="mt-0.5 block text-[10px] text-gray-400">
                          {f.candidatures_actives} candidature
                          {f.candidatures_actives > 1 ? 's' : ''} active{f.candidatures_actives > 1 ? 's' : ''}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-gray-700">{f.places}</span> place
                      {Number(f.places) > 1 ? 's' : ''} (indicatif)
                    </>
                  )}
                </p>
              )}
              <Link
                to={`/preinscription/${f.id}`}
                className="block w-full rounded-xl py-2.5 text-center text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-95"
                style={{ background: primary }}
              >
                Candidater
              </Link>
              <p className="text-[10px] leading-snug text-gray-400 text-center px-0.5">Montants communiqués sur la facture proforma après instruction.</p>
            </div>
          ) : (
            <div className="flex min-w-0 flex-wrap items-end justify-between gap-2">
              <div className="min-w-0">
                <div className="font-black text-base" style={{ color: primary }}>{fmt(forfaitAnnuelFromFormation(f))} <span className="text-xs font-normal text-gray-400">FCFA/an</span></div>
                <div className="text-xs text-gray-500 break-words">
                  Inscription {fmt(f.frais_inscription)}
                  {f.mensualite > 0 && (
                    <> · {fmt(f.mensualite)}/mois{f.duree_mois ? ` × ${f.duree_mois} mois` : ''}</>
                  )}
                </div>
              </div>
              {f.places && (
                <div className="shrink-0 text-center">
                  <div className="text-sm font-black text-gray-700">{f.places}</div>
                  <div className="text-xs text-gray-400">places</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EtablissementHome() {
  const { user } = useAuth()
  const [etab, setEtab] = useState(null)
  const [formations, setFormations] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  /** 'all' | 'presentiel' | 'en_ligne' — filtre par mode (pas par niveau diplôme) */
  const [filtreMode, setFiltreMode] = useState('all')
  /** 'filieres' | 'types' | 'liste' */
  const [catalogueStep, setCatalogueStep] = useState('filieres')
  const [selectedFiliereNom, setSelectedFiliereNom] = useState(null)
  /** 'presentiel' | 'en_ligne' */
  const [selectedFormationType, setSelectedFormationType] = useState(null)

  const etabId = user?.etablissement_id

  useEffect(() => {
    if (!etabId) return
    Promise.all([
      axios.get(`/api/etablissements/${etabId}`),
      axios.get(`/api/formations?etablissement_id=${etabId}`),
      user.role === 'responsable' || user.role === 'admin'
        ? axios.get('/api/responsable/statistiques').catch(() => ({ data: null }))
        : Promise.resolve({ data: null })
    ]).then(([etabRes, formRes, statsRes]) => {
      setEtab(etabRes.data)
      setFormations(formRes.data)
      setStats(statsRes.data)
    }).catch(() => {})
      .finally(() => setLoading(false))
  }, [etabId])

  useEffect(() => {
    setCatalogueStep('filieres')
    setSelectedFiliereNom(null)
    setSelectedFormationType(null)
  }, [filtreMode])

  /** Administrateur global (sans rattachement) : tableau de bord unique. */
  if (user?.role === 'admin' && user?.etablissement_id == null) {
    return <Navigate to="/admin" replace />
  }

  if (!etabId) {
    return (
      <div className="flex items-center justify-center min-h-[16rem] px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">👁️</div>
          <p className="text-gray-700 font-semibold">
            Aucun établissement associé à votre compte.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Contactez l&apos;administrateur principal.
          </p>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-700 border-t-transparent" />
    </div>
  )

  if (!etab) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-500">Établissement introuvable.</p>
    </div>
  )

  const primary   = etab.couleur_primaire   || '#1e40af'
  const secondary = etab.couleur_secondaire || '#3b82f6'
  const roleLink  = ROLE_LINKS[user?.role]

  const modesPresents = (() => {
    const s = new Set()
    for (const f of formations) {
      if (f.type === 'presentiel' || f.type === 'en_ligne') s.add(f.type)
    }
    return ['presentiel', 'en_ligne'].filter((t) => s.has(t))
  })()
  const formationsFiltrees = formations.filter(
    (f) => filtreMode === 'all' || f.type === filtreMode
  )

  const formationsParFiliere = (() => {
    const map = new Map()
    for (const f of formationsFiltrees) {
      const key = (f.filiere_nom && String(f.filiere_nom).trim()) || 'Sans filière'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(f)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'))
  })()

  const listeFiliereSelectionnee = selectedFiliereNom
    ? (formationsParFiliere.find(([n]) => n === selectedFiliereNom)?.[1] || [])
    : []

  const typesDisponiblesPourFiliere = (() => {
    const order = ['presentiel', 'en_ligne']
    const set = new Set()
    for (const f of listeFiliereSelectionnee) {
      if (f.type === 'presentiel' || f.type === 'en_ligne') set.add(f.type)
    }
    return order.filter((t) => set.has(t))
  })()

  const formationsListeFinale = listeFiliereSelectionnee.filter(
    (f) => f.type === selectedFormationType
  )

  const isEtudiant = user?.role === 'etudiant'

  const goFilieres = () => {
    setCatalogueStep('filieres')
    setSelectedFiliereNom(null)
    setSelectedFormationType(null)
  }
  const goTypes = () => {
    setCatalogueStep('types')
    setSelectedFormationType(null)
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-3 py-6 sm:px-4 sm:py-8 space-y-6 sm:space-y-8">

      {/* ── EN-TÊTE ÉTABLISSEMENT ─────────────────────────────── */}
      <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg">
        <div className="h-24 sm:h-28 relative" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
          <div className="absolute inset-0 overflow-hidden opacity-20">
            <div className="absolute top-2 right-8 w-24 h-24 rounded-full bg-white" />
            <div className="absolute bottom-0 left-1/4 w-16 h-16 rounded-full bg-white" />
          </div>
        </div>
        <div className="bg-white px-4 pb-5 sm:px-6 sm:pb-6 -mt-10 relative">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
            <div className="flex min-w-0 flex-1 items-end gap-3 sm:gap-5">
              <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-2xl border-4 border-white bg-white shadow-xl flex items-center justify-center overflow-hidden">
                {etab.logo_url
                  ? <img src={etab.logo_url} alt="" className="h-full w-full object-contain" />
                  : <span className="text-2xl font-black sm:text-3xl" style={{ color: primary }}>{etab.nom[0]}</span>}
              </div>
              <div className="min-w-0 flex-1 pt-6 sm:pt-10">
                <h1 className="text-xl font-black leading-tight text-gray-900 break-words sm:text-2xl">{etab.nom}</h1>
                <div className="mt-2 flex flex-col gap-1.5 text-xs text-gray-500 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1 sm:text-sm">
                  {etab.adresse && (
                    <span className="min-w-0 break-words"><span aria-hidden>📍 </span>{etab.adresse}</span>
                  )}
                  {etab.telephone && (
                    <span className="shrink-0 break-all"><span aria-hidden>📞 </span>{etab.telephone}</span>
                  )}
                  {etab.email_contact && (
                    <span className="min-w-0 break-all"><span aria-hidden>✉️ </span>{etab.email_contact}</span>
                  )}
                </div>
              </div>
            </div>
            {roleLink && (
              <Link to={roleLink.path}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-center text-sm font-bold text-white shadow-md transition-opacity hover:opacity-90 sm:min-w-0"
                style={{ background: primary }}>
                <span aria-hidden>{roleLink.icon}</span>
                <span className="leading-tight">{roleLink.label}</span>
              </Link>
            )}
          </div>
          {etab.description && (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-gray-500">{etab.description}</p>
          )}
        </div>
      </div>

      {stats && !isEtudiant && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Formations',        value: formations.length,             icon: '🎓', color: primary },
            { label: 'Dossiers total',    value: stats.total,                   icon: '📂', color: secondary },
            { label: 'En attente',        value: stats.fad?.en_attente + stats.presentiel?.en_attente || 0, icon: '⏳', color: '#f59e0b' },
            { label: 'Demandes proforma', value: stats.demandes_proforma || 0,  icon: '🧾', color: '#10b981' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {['responsable', 'comptable', 'agent_admin', 'controleur_qualite'].includes(user?.role) && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-gray-800 text-sm">Factures proforma de l’établissement</p>
              <p className="text-xs text-gray-500">Consulter, exporter par lot (HTML) ou supprimer plusieurs factures.</p>
            </div>
            <Link
              to="/mon-etablissement/factures"
              className="text-sm font-bold px-4 py-2 rounded-xl text-white shrink-0"
              style={{ background: primary }}
            >
              Liste des factures
            </Link>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-gray-800 text-sm">Acceptés par formation</p>
              <p className="text-xs text-gray-500">Une liste par formation ; mise à jour automatique à chaque acceptation.</p>
            </div>
            <Link
              to="/mon-etablissement/acceptes-par-formation"
              className="text-sm font-bold px-4 py-2 rounded-xl border-2 shrink-0 transition-all hover:opacity-80"
              style={{ color: primary, borderColor: primary }}
            >
              Voir les listes
            </Link>
          </div>
        </div>
      )}

      {/* ── FORMATIONS DE L'ÉTABLISSEMENT ───────────────────────── */}
      <div className="min-w-0">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-gray-900 sm:text-xl">
              {isEtudiant ? 'Filières et formations' : 'Formations proposées'}
            </h2>
            <p className="mt-0.5 text-xs text-gray-400 sm:text-sm">
              {formationsFiltrees.length}/{formations.length} formation{formations.length !== 1 ? 's' : ''}
              {filtreMode !== 'all'
                ? ` · mode : ${filtreMode === 'presentiel' ? 'présentiel' : 'à distance'}`
                : ''}
            </p>
            {isEtudiant && (
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-600 sm:text-sm">
                Choisissez une filière, puis un mode (présentiel ou à distance), pour voir les formations. Les tarifs ne sont pas affichés ici — utilisez « Candidater » pour déposer un dossier.
              </p>
            )}
          </div>
          {(user?.role === 'responsable' || user?.fonctions?.includes?.('responsable')) && (
            <Link to="/responsable/gestion-etablissement"
              className="text-sm font-bold px-4 py-2 rounded-xl border-2 transition-all hover:opacity-80 shrink-0 self-start"
              style={{ color: primary, borderColor: primary }}>
              + Filières & formations
            </Link>
          )}
        </div>

        {formations.length > 0 && modesPresents.length > 0 && (
          <div className="mb-4 sm:mb-5 -mx-1 px-1 flex gap-2 overflow-x-auto pb-2 overscroll-x-contain [scrollbar-width:thin] touch-pan-x">
            <span className="shrink-0 self-center text-[11px] font-semibold text-gray-400 pr-1">Mode</span>
            <button
              type="button"
              onClick={() => setFiltreMode('all')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${filtreMode === 'all' ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
              style={filtreMode === 'all' ? { background: secondary } : {}}
              title="Toutes les formations"
            >
              Tous
            </button>
            {modesPresents.includes('presentiel') && (
              <button
                type="button"
                onClick={() => setFiltreMode('presentiel')}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${filtreMode === 'presentiel' ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
                style={filtreMode === 'presentiel' ? { background: secondary } : {}}
                title="Présentiel"
              >
                Présentiel
              </button>
            )}
            {modesPresents.includes('en_ligne') && (
              <button
                type="button"
                onClick={() => setFiltreMode('en_ligne')}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${filtreMode === 'en_ligne' ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
                style={filtreMode === 'en_ligne' ? { background: secondary } : {}}
                title="À distance"
              >
                Distance
              </button>
            )}
          </div>
        )}

        {/* Fil d'Ariane catalogue */}
        {formationsFiltrees.length > 0 && catalogueStep !== 'filieres' && (
          <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs sm:text-sm" aria-label="Navigation catalogue">
            <button type="button" onClick={goFilieres} className="font-semibold text-blue-700 hover:underline">
              Filières
            </button>
            {selectedFiliereNom && (
              <>
                <span className="text-gray-300">/</span>
                {catalogueStep === 'types' ? (
                  <span className="font-bold text-gray-800 truncate max-w-[min(100%,12rem)] sm:max-w-none">{selectedFiliereNom}</span>
                ) : (
                  <button type="button" onClick={goTypes} className="font-semibold text-blue-700 hover:underline truncate max-w-[min(100%,12rem)] sm:max-w-none">
                    {selectedFiliereNom}
                  </button>
                )}
              </>
            )}
            {catalogueStep === 'liste' && selectedFormationType && (
              <>
                <span className="text-gray-300">/</span>
                <span className="font-bold text-gray-800">{TYPE_FORMATION_META[selectedFormationType]?.label || selectedFormationType}</span>
              </>
            )}
          </nav>
        )}

        {formationsFiltrees.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
            <div className="text-5xl mb-4">📚</div>
            <p className="font-bold text-gray-700 mb-1">
              {formations.length === 0 ? 'Aucune formation enregistrée' : 'Aucune formation ne correspond au filtre (mode)'}
            </p>
            <p className="text-gray-400 text-sm">
              {formations.length === 0
                ? 'Contactez l\'administrateur pour ajouter des formations.'
                : <button type="button" onClick={() => setFiltreMode('all')} className="text-blue-600 underline">Voir tous les modes</button>}
            </p>
          </div>
        ) : (
          <>
            {/* Étape 1 : cartes filières */}
            {catalogueStep === 'filieres' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {formationsParFiliere.map(([filiereNom, liste]) => {
                  const nPresentiel = liste.filter((x) => x.type === 'presentiel').length
                  const nDistance = liste.filter((x) => x.type === 'en_ligne').length
                  return (
                    <button
                      key={filiereNom}
                      type="button"
                      onClick={() => {
                        setSelectedFiliereNom(filiereNom)
                        setCatalogueStep('types')
                      }}
                      className="group min-h-0 min-w-0 text-left rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <div className="mb-3 flex items-start gap-2">
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: primary }} aria-hidden />
                        <span className="min-w-0 flex-1 text-base font-bold leading-snug text-gray-900 group-hover:text-blue-800 break-words">
                          {filiereNom}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {liste.length} formation{liste.length !== 1 ? 's' : ''}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                        {nPresentiel > 0 && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-800">🏫 Présentiel · {nPresentiel}</span>
                        )}
                        {nDistance > 0 && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">🌐 Distance · {nDistance}</span>
                        )}
                      </div>
                      <p className="mt-4 text-xs font-bold text-blue-700 group-hover:underline">Voir les modes →</p>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Étape 2 : types présentiel / distance */}
            {catalogueStep === 'types' && selectedFiliereNom && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={goFilieres}
                  className="text-sm font-semibold text-gray-600 hover:text-blue-700"
                >
                  ← Retour aux filières
                </button>
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                  Mode de formation — {selectedFiliereNom}
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-3xl">
                  {typesDisponiblesPourFiliere.map((t) => {
                    const meta = TYPE_FORMATION_META[t]
                    const count = listeFiliereSelectionnee.filter((f) => f.type === t).length
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setSelectedFormationType(t)
                          setCatalogueStep('liste')
                        }}
                        className="rounded-2xl border-2 border-gray-100 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <div className="text-3xl mb-2">{meta?.emoji}</div>
                        <div className="text-lg font-black text-gray-900">{meta?.label}</div>
                        <p className="mt-1 text-sm text-gray-500">{meta?.desc}</p>
                        <p className="mt-4 text-sm font-bold text-blue-700">
                          {count} formation{count !== 1 ? 's' : ''} →
                        </p>
                      </button>
                    )
                  })}
                </div>
                {typesDisponiblesPourFiliere.length === 0 && (
                  <p className="text-sm text-gray-500">Aucun mode reconnu pour cette filière.</p>
                )}
              </div>
            )}

            {/* Étape 3 : liste des formations */}
            {catalogueStep === 'liste' && selectedFiliereNom && selectedFormationType && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={goTypes}
                  className="text-sm font-semibold text-gray-600 hover:text-blue-700"
                >
                  ← Retour aux modes
                </button>
                <h3 className="text-base font-bold text-gray-900">
                  {TYPE_FORMATION_META[selectedFormationType]?.emoji}{' '}
                  {TYPE_FORMATION_META[selectedFormationType]?.label}
                  <span className="font-normal text-gray-500"> — {selectedFiliereNom}</span>
                </h3>
                {formationsListeFinale.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucune formation dans cette catégorie.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-5">
                    {formationsListeFinale.map((f) => (
                      <FormationCatalogueCard
                        key={f.id}
                        f={f}
                        primary={primary}
                        secondary={secondary}
                        isEtudiant={isEtudiant}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {!isEtudiant && (() => {
        const role = user?.role
        const quick = [
          roleLink && { ...roleLink, desc: 'Tableau de bord de votre rôle' },
          role === 'responsable' && {
            label: 'Dossiers & acceptation',
            path: '/responsable',
            icon: '✅',
            desc: 'Accepter ou refuser les préinscriptions',
          },
          ['responsable', 'comptable'].includes(role) && {
            label: 'Demandes proforma',
            path: '/responsable/demandes-proforma',
            icon: '🧾',
            desc: 'Demandes de facture proforma',
          },
          ['responsable', 'agent_admin'].includes(role) && {
            label: 'Guichet',
            path: '/responsable/preinscription-guichet',
            icon: '🧾',
            desc: 'Saisie walk-in',
          },
          role === 'responsable' && {
            label: 'Formations',
            path: '/responsable/gestion-etablissement',
            icon: '📚',
            desc: 'Filières et formations',
          },
          {
            label: 'Messages',
            path: '/chat',
            icon: '💬',
            desc: 'Messagerie',
          },
          ['responsable', 'agent_admin', 'comptable'].includes(role) && {
            label: 'Factures',
            path: '/mon-etablissement/factures',
            icon: '📄',
            desc: 'Historique des factures',
          },
        ].filter(Boolean)
        return (
          <div>
            <h2 className="text-xl font-black text-gray-900 mb-4">Accès rapides</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {quick.map((item, i) => (
                <Link
                  key={`${item.path}-${i}`}
                  to={item.path}
                  className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group"
                >
                  <div className="text-2xl mb-3">{item.icon}</div>
                  <div className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors text-sm">{item.label}</div>
                  <div className="text-xs text-gray-400 mt-1">{item.desc}</div>
                </Link>
              ))}
            </div>
          </div>
        )
      })()}

      {(etab.ninea || etab.rc || etab.arrete) && (
        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 text-xs text-gray-500 space-y-1">
          <p className="font-bold text-gray-700 text-sm mb-2">Informations légales</p>
          {etab.ninea   && <p>NINEA : <span className="font-semibold text-gray-700">{etab.ninea}</span></p>}
          {etab.rc      && <p>RC : <span className="font-semibold text-gray-700">{etab.rc}</span></p>}
          {etab.arrete  && <p>Arrêté : <span className="font-semibold text-gray-700">{etab.arrete}</span></p>}
        </div>
      )}
    </div>
  )
}
