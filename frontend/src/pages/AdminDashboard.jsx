import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import StatutBadge from '../components/StatutBadge'
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
  search:      <Ico d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
  eye:         <Ico d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" d2="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />,
  filiere:     <Ico d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
}

export default function AdminDashboard() {
  const [stats,       setStats]       = useState(null)
  const [dossiers,    setDossiers]    = useState([])
  const [pagination,  setPagination]  = useState({})
  const [search,      setSearch]      = useState('')
  const [filtreStatut,setFiltreStatut]= useState('')
  const [page,        setPage]        = useState(1)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    axios.get('/api/admin/statistiques-globales')
      .then(({ data }) => setStats(data))
      .catch(() => {})
  }, [])

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
      bg:    'bg-blue-50',
      text:  'text-blue-700',
    },
    {
      label: 'Filières & Formations',
      desc:  'Gérer les filières et les formations par établissement',
      to:    '/admin/etablissements',
      icon:  ICO.filiere,
      color: 'from-teal-600 to-teal-800',
      bg:    'bg-teal-50',
      text:  'text-teal-700',
    },
    {
      label: 'Demandes Proforma',
      desc:  'Consulter et gérer les préinscriptions publiques',
      to:    '/admin/proforma',
      icon:  ICO.proforma,
      color: 'from-purple-600 to-purple-800',
      bg:    'bg-purple-50',
      text:  'text-purple-700',
      badge: stats?.demandes_proforma ?? null,
    },
    {
      label: 'Utilisateurs',
      desc:  'Gérer les comptes étudiants et le personnel',
      to:    '/admin/utilisateurs',
      icon:  ICO.users,
      color: 'from-orange-500 to-orange-700',
      bg:    'bg-orange-50',
      text:  'text-orange-700',
    },
  ]

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Administration"
        title="Tableau de bord"
        subtitle="Vue d’ensemble de la plateforme, indicateurs clés et accès rapide aux modules de gestion."
      />

      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile icon={ICO.dossiers} gradient="blue" label="Total dossiers" value={stats?.dossiers?.total} />
        <StatTile icon={ICO.attente} gradient="amber" label="En attente" value={stats?.dossiers?.en_attente} />
        <StatTile icon={ICO.accepte} gradient="emerald" label="Acceptés" value={stats?.dossiers?.acceptes} />
        <StatTile icon={ICO.users} gradient="violet" label="Étudiants inscrits" value={stats?.utilisateurs?.etudiants} />
      </div>

      <div className="mb-10">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Modules</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {shortcuts.map((s) => (
            <Link
              key={s.label}
              to={s.to}
              className={`group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-lg shadow-slate-200/30 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200/80 hover:shadow-xl hover:shadow-blue-500/10 ${s.bg}`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} text-white shadow-lg`}>{s.icon}</div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`font-bold ${s.text}`}>{s.label}</p>
                  {s.badge != null && (
                    <span className="rounded-full bg-purple-600 px-2 py-0.5 text-xs font-bold text-white shadow-sm">{s.badge}</span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-snug text-slate-500">{s.desc}</p>
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${s.text}`}>
                Accéder <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </div>
            </Link>
          ))}
        </div>
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
