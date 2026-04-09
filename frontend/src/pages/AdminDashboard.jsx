import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import StatutBadge from '../components/StatutBadge'
import TabConditionsAdmissionEtab from '../components/TabConditionsAdmissionEtab'
import {
  DashboardPage,
  DashboardHero,
  StatTile,
  Panel,
  DashboardSpinner,
} from '../components/dashboard/DashboardChrome'

// ─── Icônes SVG inline ────────────────────────────────────────────────────────
const Ico = ({ d, d2, cls = 'w-6 h-6' }) => (
  <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} />
    {d2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d2} />}
  </svg>
)

const ICO = {
  dossiers:    <Ico d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  attente:     <Ico d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
  accepte:     <Ico d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
  users:       <Ico d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
  etab:        <Ico d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
  proforma:    <Ico d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
  /** Liste à puces — aligné sidebar « Demandes proforma » */
  demandesListe: (
    <Ico
      d="M8.25 6.75h12M8.25 12h12m-12 5.25h12"
      d2="M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
    />
  ),
  finance:     <Ico d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  conditions:  <Ico d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  search:      <Ico d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
  eye:         <Ico d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" d2="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />,
  filiere:     <Ico d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
}

export default function AdminDashboard() {
  const [searchParams] = useSearchParams()
  const conditionsAnchorRef = useRef(null)
  const [stats,       setStats]       = useState(null)
  const [dossiers,    setDossiers]    = useState([])
  const [pagination,  setPagination]  = useState({})
  const [search,      setSearch]      = useState('')
  const [filtreStatut,setFiltreStatut]= useState('')
  const [page,        setPage]        = useState(1)
  const [loading,     setLoading]     = useState(true)
  const [etablissements, setEtablissements] = useState([])
  const [etabConditionsId, setEtabConditionsId] = useState(null)

  useEffect(() => {
    axios.get('/api/admin/statistiques-globales')
      .then(({ data }) => setStats(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    axios
      .get('/api/etablissements')
      .then(({ data }) => {
        const list = (data || []).filter((e) => e.actif !== false)
        setEtablissements(list)
        setEtabConditionsId((prev) => {
          if (prev && list.some((e) => e.id === prev)) return prev
          return null
        })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (searchParams.get('tab') !== 'conditions') return
    const t = setTimeout(() => {
      conditionsAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
    return () => clearTimeout(t)
  }, [searchParams])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page, limit: 10 })
    if (filtreStatut) params.append('statut', filtreStatut)
    if (search)       params.append('search', search)
    axios.get(`/api/admin/dossiers?${params}`)
      .then(({ data }) => { setDossiers(data.dossiers); setPagination(data.pagination) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, filtreStatut, search])

  // ── Raccourcis de navigation ──────────────────────────────────────────────
  const shortcuts = [
    {
      label: 'Établissements',
      desc:  'Créer et gérer les établissements',
      to:    '/admin/etablissements',
      icon:  ICO.etab,
      color: 'from-blue-600 to-blue-800',
      bg:    'bg-blue-50/80',
      text:  'text-blue-800',
      ring:  'group-hover:ring-blue-200/80',
    },
    {
      label: 'Filières & Formations',
      desc:  'Gérer les filières et les formations par établissement',
      to:    '/admin/etablissements',
      icon:  ICO.filiere,
      color: 'from-teal-600 to-emerald-700',
      bg:    'bg-teal-50/80',
      text:  'text-teal-800',
      ring:  'group-hover:ring-teal-200/80',
    },
    {
      label: 'Demandes proforma',
      desc:  'File des demandes : pièces, validation, facture et attestation côté candidat',
      to:    '/admin/proforma',
      icon:  ICO.demandesListe,
      color: 'from-purple-600 to-violet-800',
      bg:    'bg-purple-50/80',
      text:  'text-purple-800',
      ring:  'group-hover:ring-purple-200/80',
      badge: stats?.demandes_proforma ?? null,
    },
    {
      label: 'Factures par établissement',
      desc:  'Registre des factures par établissement : export HTML, sélection, suppression en base',
      to:    '/admin/factures-etablissement',
      icon:  ICO.finance,
      color: 'from-indigo-600 to-violet-800',
      bg:    'bg-indigo-50/80',
      text:  'text-indigo-900',
      ring:  'group-hover:ring-indigo-200/80',
    },
    {
      label: 'Conditions d’admission',
      desc:  'Texte affiché aux candidats (proforma) par établissement',
      to:    '/admin?tab=conditions',
      icon:  ICO.conditions,
      color: 'from-cyan-600 to-sky-800',
      bg:    'bg-cyan-50/80',
      text:  'text-cyan-900',
      ring:  'group-hover:ring-cyan-200/80',
    },
    {
      label: 'Utilisateurs',
      desc:  'Gérer les comptes étudiants et le personnel',
      to:    '/admin/utilisateurs',
      icon:  ICO.users,
      color: 'from-orange-500 to-rose-600',
      bg:    'bg-orange-50/80',
      text:  'text-orange-900',
      ring:  'group-hover:ring-orange-200/80',
    },
  ]

  const statItems = [
    { icon: ICO.dossiers, gradient: 'blue', label: 'Total dossiers', value: stats?.dossiers?.total },
    { icon: ICO.attente, gradient: 'amber', label: 'En attente', value: stats?.dossiers?.en_attente },
    { icon: ICO.accepte, gradient: 'emerald', label: 'Acceptés', value: stats?.dossiers?.acceptes },
    { icon: ICO.users, gradient: 'violet', label: 'Étudiants inscrits', value: stats?.utilisateurs?.etudiants },
  ]

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Administration"
        title="Tableau de bord"
        subtitle="Vue d’ensemble de la plateforme, indicateurs clés et accès rapide aux modules de gestion."
      />

      <div className="mb-3 flex items-center gap-3">
        <span className="h-px flex-1 max-w-[4rem] bg-gradient-to-r from-indigo-400/60 to-transparent" aria-hidden />
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Indicateurs clés</p>
        <span className="h-px flex-1 bg-gradient-to-l from-violet-400/50 to-transparent" aria-hidden />
      </div>
      <div className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statItems.map((t, i) => (
          <div
            key={t.label}
            className="animate-fade-in-up opacity-0 [animation-fill-mode:forwards]"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <StatTile icon={t.icon} gradient={t.gradient} label={t.label} value={t.value} />
          </div>
        ))}
      </div>

      <div className="mb-12">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Navigation</p>
            <h2 className="mt-1 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-2xl font-black tracking-tight text-transparent md:text-3xl">
              Modules
            </h2>
            <p className="mt-1 max-w-lg text-sm text-slate-500">
              Raccourcis vers les espaces de gestion — survolez une carte pour la mise en avant.
            </p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {shortcuts.map((s, i) => (
            <Link
              key={s.label}
              to={s.to}
              className={`group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/60 bg-white/95 shadow-[0_8px_32px_-8px_rgba(15,23,42,0.1)] ring-1 ring-slate-100/90 transition-all duration-300 hover:-translate-y-2 hover:border-white hover:shadow-[0_24px_48px_-12px_rgba(79,70,229,0.2)] hover:ring-2 ${s.ring} animate-fade-in-up opacity-0 [animation-fill-mode:forwards]`}
              style={{ animationDelay: `${120 + i * 40}ms` }}
            >
              <div className={`h-1.5 w-full shrink-0 bg-gradient-to-r ${s.color}`} aria-hidden />
              <div className={`relative flex flex-1 flex-col gap-4 p-5 ${s.bg}`}>
                <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/40 blur-2xl" aria-hidden />
                <div
                  className={`relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${s.color} text-white shadow-lg shadow-slate-900/10 ring-2 ring-white/40 transition duration-300 group-hover:scale-110 group-hover:shadow-xl`}
                >
                  {s.icon}
                </div>
                <div className="relative flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`font-bold leading-snug ${s.text}`}>{s.label}</p>
                    {s.badge != null && (
                      <span className="rounded-full bg-gradient-to-r from-purple-600 to-violet-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md shadow-purple-500/25">
                        {s.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{s.desc}</p>
                </div>
                <div
                  className={`relative mt-auto flex items-center justify-between rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-xs font-bold shadow-inner backdrop-blur-sm transition-colors group-hover:bg-white ${s.text}`}
                >
                  <span>Ouvrir le module</span>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900/5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:bg-slate-900/10">
                    →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div ref={conditionsAnchorRef} id="conditions-admission-admin" className="mb-12 scroll-mt-24">
        <Panel
          title="Conditions d’admission (candidats — proforma)"
          meta={
            <Link to="/admin/etablissements" className="text-xs font-semibold text-blue-700 hover:underline">
              Fiche établissement →
            </Link>
          }
          bodyClassName="p-6"
        >
          <p className="mb-4 text-sm text-slate-600">
            <strong>Choisissez d’abord un établissement</strong>, puis ajoutez une ou plusieurs conditions d’admission
            (blocs distincts). Elles sont affichées aux candidats après sélection de l’établissement sur la page «
            Demande de facture proforma ».
          </p>
          {etablissements.length === 0 ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Aucun établissement actif. Créez-en un dans « Établissements ».
            </p>
          ) : (
            <>
              <label className="mb-2 block text-sm font-semibold text-slate-800">Établissement</label>
              <select
                className="input-field mb-6 max-w-xl"
                value={etabConditionsId ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  setEtabConditionsId(v === '' ? null : Number(v))
                }}
              >
                <option value="">— Choisir un établissement —</option>
                {etablissements.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nom}
                  </option>
                ))}
              </select>
              {etabConditionsId != null && (
                <TabConditionsAdmissionEtab
                  etabId={etabConditionsId}
                  etabNom={etablissements.find((e) => e.id === etabConditionsId)?.nom}
                />
              )}
            </>
          )}
        </Panel>
      </div>

      <Panel
        title="Dossiers de préinscription"
        meta={
          pagination.total != null ? (
            <span className="text-xs font-semibold text-slate-400">{pagination.total} dossier(s)</span>
          ) : null
        }
        bodyClassName="p-6"
      >
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{ICO.search}</span>
            <input
              type="text"
              placeholder="Rechercher par nom, email, matricule, n° dossier…"
              className="input-field pl-10"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select
            className="input-field sm:w-48"
            value={filtreStatut}
            onChange={e => { setFiltreStatut(e.target.value); setPage(1) }}
          >
            <option value="">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="en_cours">En cours</option>
            <option value="accepte">Accepté</option>
            <option value="refuse">Refusé</option>
          </select>
        </div>

        {loading ? (
          <DashboardSpinner />
        ) : dossiers.length === 0 ? (
          <div className="py-14 text-center text-slate-500">
            <div className="mb-3 text-5xl opacity-25">📂</div>
            <p className="font-medium">Aucun dossier trouvé</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>N° Dossier</th>
                    <th className="hidden sm:table-cell">Matricule</th>
                    <th>Étudiant</th>
                    <th className="hidden sm:table-cell">Filière</th>
                    <th className="hidden md:table-cell">Date</th>
                    <th>Statut</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dossiers.map((d) => (
                    <tr key={d.id}>
                      <td className="font-mono text-xs text-slate-500">{d.numero_dossier}</td>
                      <td className="hidden sm:table-cell">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                          {d.matricule || '—'}
                        </span>
                      </td>
                      <td>
                        <div className="font-semibold text-slate-800">
                          {d.prenom} {d.nom}
                        </div>
                        <div className="text-xs text-slate-500">{d.email}</div>
                        <div className="mt-0.5 font-mono text-xs text-slate-500 sm:hidden">{d.matricule ? `Mat. ${d.matricule}` : ''}</div>
                      </td>
                      <td className="hidden text-xs text-slate-700 sm:table-cell">{d.filiere}</td>
                      <td className="hidden text-xs text-slate-400 md:table-cell">{new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <StatutBadge statut={d.statut} />
                      </td>
                      <td>
                        <Link
                          to={`/admin/dossier/${d.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/80 px-2.5 py-1.5 text-xs font-bold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100"
                        >
                          {ICO.eye} Voir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                <p className="text-sm text-slate-500">{pagination.total} dossier(s) au total</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                    className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40"
                  >
                    ← Préc.
                  </button>
                  <span className="px-2 text-sm text-slate-600">
                    Page {page}/{pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page === pagination.totalPages}
                    className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40"
                  >
                    Suiv. →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Panel>
    </DashboardPage>
  )
}
