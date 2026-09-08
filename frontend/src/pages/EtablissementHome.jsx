import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import FiliereFormationsModal from '../components/FiliereFormationsModal'
import { mediaUrl } from '../utils/mediaUrl'

const ROLE_LINKS = {
  admin_etablissement: { label: 'Identité établissement', path: '/mon-etablissement/identite', icon: '🏛️' },
  responsable: { label: 'Traiter les dossiers',    path: '/responsable',  icon: '📋' },
  agent_admin:  { label: 'Contrôle administratif', path: '/agent-admin',   icon: '🗂️' },
  comptable:    { label: 'Finance & Facturation',   path: '/comptable',    icon: '💰' },
  admin:        { label: 'Administration',          path: '/admin',         icon: '👁️' },
  controleur_qualite: { label: 'Qualité & conformité', path: '/qualite', icon: '✅' },
}

export default function EtablissementHome() {
  const { user } = useAuth()
  const [etab, setEtab] = useState(null)
  const [formations, setFormations] = useState([])
  const [flyers, setFlyers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  /** 'all' | 'presentiel' | 'en_ligne' — filtre par mode (pas par niveau diplôme) */
  const [filtreMode, setFiltreMode] = useState('all')
  const [modalFiliere, setModalFiliere] = useState(null)
  const [exportingRapport, setExportingRapport] = useState(false)

  const etabId = user?.etablissement_id

  useEffect(() => {
    if (!etabId) return
    Promise.all([
      axios.get(`/api/etablissements/${etabId}`),
      axios.get(`/api/formations?etablissement_id=${etabId}`),
      axios.get(`/api/etablissements/${etabId}/flyers`).catch(() => ({ data: [] })),
      user.role === 'responsable' || user.role === 'admin_etablissement' || user.role === 'admin'
        ? axios.get('/api/responsable/statistiques').catch(() => ({ data: null }))
        : Promise.resolve({ data: null })
    ]).then(([etabRes, formRes, flyersRes, statsRes]) => {
      setEtab(etabRes.data)
      setFormations(formRes.data)
      setFlyers(Array.isArray(flyersRes.data) ? flyersRes.data : [])
      setStats(statsRes.data)
    }).catch(() => {})
      .finally(() => setLoading(false))
  }, [etabId])

  useEffect(() => {
    setModalFiliere(null)
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
      if (!bloc.condition_acces && f.filiere_condition_acces) {
        bloc.condition_acces = f.filiere_condition_acces
      }
      bloc.formations.push(f)
    }
    return [...map.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  })()

  const flyersPourFiliere = (filiereId, filiereNom) =>
    flyers.filter((fl) => {
      if (filiereId && Number(fl.filiere_id) === Number(filiereId)) return true
      if (filiereNom && fl.filiere_nom && String(fl.filiere_nom).trim() === String(filiereNom).trim()) {
        return true
      }
      return false
    })

  const isEtudiant = user?.role === 'etudiant'

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
                  ? <img src={mediaUrl(etab.logo_url)} alt="" className="h-full w-full object-contain" />
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
            { label: 'Préinscriptions à traiter', value: stats.demandes_proforma || 0,  icon: '🧾', color: '#10b981' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {['responsable', 'comptable', 'agent_admin', 'controleur_qualite', 'admin_etablissement'].includes(user?.role) && (
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
          {(user?.role === 'responsable' || user?.role === 'comptable' || user?.role === 'admin_etablissement') && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
              <div>
                <p className="font-bold text-gray-800 text-sm">Rapport Excel établissement</p>
                <p className="text-xs text-gray-500">
                  Logo, formations les plus demandées, demandes proforma et factures — fichier propre à cet établissement.
                </p>
              </div>
              <button
                type="button"
                className="text-sm font-bold px-4 py-2 rounded-xl border-2 shrink-0 transition-all hover:opacity-80 disabled:opacity-50"
                style={{ color: primary, borderColor: primary }}
                disabled={exportingRapport}
                onClick={async () => {
                  setExportingRapport(true)
                  try {
                    const { data } = await axios.get(
                      `/api/etablissements/${etabId}/rapport-etablissement/export-xlsx`,
                      { responseType: 'blob' },
                    )
                    const url = URL.createObjectURL(data)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `rapport-etablissement-${etabId}.xlsx`
                    a.click()
                    URL.revokeObjectURL(url)
                  } catch {
                    /* ignore */
                  } finally {
                    setExportingRapport(false)
                  }
                }}
              >
                {exportingRapport ? 'Export…' : 'Télécharger Excel'}
              </button>
            </div>
          )}
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
                Cliquez sur une filière pour voir ses formations (présentiel et/ou à distance). Les tarifs ne sont pas affichés ici — utilisez « Préinscription » pour déposer un dossier.
              </p>
            )}
          </div>
          {(user?.role === 'responsable' || user?.role === 'admin_etablissement' || user?.fonctions?.includes?.('responsable')) && (
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {formationsParFiliere.map((bloc) => {
              const nPresentiel = bloc.formations.filter((x) => x.type === 'presentiel').length
              const nDistance = bloc.formations.filter((x) => x.type === 'en_ligne').length
              return (
                <button
                  key={bloc.nom}
                  type="button"
                  onClick={() => setModalFiliere(bloc)}
                  className="group min-h-0 min-w-0 text-left rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <div className="mb-3 flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: primary }} aria-hidden />
                    <span className="min-w-0 flex-1 text-base font-bold leading-snug text-gray-900 group-hover:text-blue-800 break-words">
                      {bloc.nom}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {bloc.formations.length} formation{bloc.formations.length !== 1 ? 's' : ''}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                    {nPresentiel > 0 && (
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-800">🏫 Présentiel · {nPresentiel}</span>
                    )}
                    {nDistance > 0 && (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">🌐 Distance · {nDistance}</span>
                    )}
                  </div>
                  <p className="mt-4 text-xs font-bold text-blue-700 group-hover:underline">Voir les formations →</p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {!isEtudiant && (() => {
        const role = user?.role
        const quick = [
          roleLink && { ...roleLink, desc: 'Tableau de bord de votre rôle' },
          (role === 'responsable' || role === 'admin_etablissement') && {
            label: 'Dossiers préinscription',
            path: '/responsable',
            icon: '✅',
            desc: 'Accepter ou refuser les dossiers candidats',
          },
          ['responsable', 'admin_etablissement', 'comptable'].includes(role) && {
            label: 'Demandes proforma',
            path: '/responsable/demandes-proforma',
            icon: '🧾',
            desc: 'Factures demandées par les visiteurs ou candidats',
          },
          ['responsable', 'admin_etablissement', 'agent_admin', 'comptable'].includes(role) && {
            label: 'Guichet / nouvelle facture',
            path: '/responsable/preinscription-guichet',
            icon: '🧾',
            desc: 'Créer une facture proforma ou définitive',
          },
          (role === 'responsable' || role === 'admin_etablissement') && {
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
          ['responsable', 'agent_admin', 'comptable', 'admin_etablissement'].includes(role) && {
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

      <FiliereFormationsModal
        open={Boolean(modalFiliere)}
        onOpenChange={(o) => { if (!o) setModalFiliere(null) }}
        filiere={modalFiliere}
        formations={modalFiliere?.formations || []}
        primary={primary}
        hideTarifs={isEtudiant}
        showCandidater={isEtudiant}
        flyers={modalFiliere ? flyersPourFiliere(modalFiliere.filiere_id, modalFiliere.nom) : []}
      />
    </div>
  )
}
