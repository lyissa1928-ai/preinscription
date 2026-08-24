import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import {
  FaShieldAlt,
  FaClipboardCheck,
  FaChartLine,
  FaExclamationTriangle,
  FaSearch,
  FaSync,
  FaChevronRight,
  FaLayerGroup,
} from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'

const STATUT_LABEL = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  accepte: 'Accepté',
  refuse: 'Refusé',
}

export default function QualiteDashboard() {
  const { user } = useAuth()
  const [dash, setDash] = useState(null)
  const [dossiers, setDossiers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)
  const [filtreStatut, setFiltreStatut] = useState('')
  const [page, setPage] = useState(1)

  const loadDash = () => {
    axios
      .get('/api/qualite/dashboard')
      .then(({ data }) => setDash(data))
      .catch(() => setDash(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadDash()
  }, [])

  useEffect(() => {
    setListLoading(true)
    axios
      .get('/api/qualite/dossiers', {
        params: {
          page,
          limit: 12,
          ...(filtreStatut ? { statut: filtreStatut } : {}),
        },
      })
      .then(({ data }) => {
        setDossiers(data.items || [])
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 })
      })
      .catch(() => {
        setDossiers([])
      })
      .finally(() => setListLoading(false))
  }, [page, filtreStatut])

  const etabNom = dash?.etablissement?.nom || 'Votre établissement'

  const kpiCards = useMemo(() => {
    if (!dash) return []
    return [
      {
        label: 'Complétude moyenne',
        value: `${dash.completude_moyenne_pct ?? 0}%`,
        sub: 'Pièces vs attendu',
        icon: FaClipboardCheck,
        gradient: 'from-cyan-500 to-teal-600',
      },
      {
        label: 'Dossiers suivis',
        value: dash.total_dossiers ?? 0,
        sub: 'Périmètre établissement',
        icon: FaLayerGroup,
        gradient: 'from-slate-700 to-slate-900',
      },
      {
        label: 'Sous le seuil',
        value: dash.dossiers_sous_seuil ?? 0,
        sub: '< 70 % complétude',
        icon: FaExclamationTriangle,
        gradient: 'from-amber-500 to-orange-600',
      },
      {
        label: 'En instruction',
        value: (dash.par_statut?.en_attente || 0) + (dash.par_statut?.en_cours || 0),
        sub: 'À contrôler',
        icon: FaChartLine,
        gradient: 'from-violet-600 to-indigo-700',
      },
    ]
  }, [dash])

  return (
    <>
      <style>{`
        @keyframes qfade { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes qshimmer { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        .q-anim { animation: qfade 0.6s ease forwards; }
        .q-hero-mesh {
          background-image:
            radial-gradient(at 40% 20%, rgba(255,255,255,0.12) 0px, transparent 50%),
            radial-gradient(at 80% 0%, rgba(6,182,212,0.25) 0px, transparent 45%),
            radial-gradient(at 0% 50%, rgba(99,102,241,0.2) 0px, transparent 50%);
        }
        .q-card-glow:hover { box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.25); }
      `}</style>

      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-cyan-50/30">
        {/* Hero */}
        <header className="relative overflow-hidden border-b border-white/10">
          <div
            className="absolute inset-0 q-hero-mesh"
            style={{
              background: `linear-gradient(135deg, #0f172a 0%, #164e63 40%, #0e7490 100%)`,
            }}
          />
          <div className="absolute inset-0 opacity-[0.35] bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.06\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
          <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl q-anim">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 backdrop-blur">
                  <FaShieldAlt className="h-3.5 w-3.5" aria-hidden />
                  Espace contrôleur qualité
                </div>
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Pilotage de la{' '}
                  <span className="bg-gradient-to-r from-cyan-200 to-emerald-200 bg-clip-text text-transparent">
                    conformité des dossiers
                  </span>
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-cyan-100/90 sm:text-base">
                  {etabNom} — suivez la complétude des pièces, identifiez les dossiers à risque et priorisez les contrôles avant la validation pédagogique.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/mon-etablissement"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
                  >
                    Mon établissement
                    <FaChevronRight className="h-3 w-3 opacity-70" aria-hidden />
                  </Link>
                  <Link
                    to="/chat"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
                  >
                    Messages
                    <FaChevronRight className="h-3 w-3 opacity-70" aria-hidden />
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(true)
                      loadDash()
                      setPage(1)
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
                  >
                    <FaSync className="h-3.5 w-3.5" aria-hidden />
                    Actualiser
                  </button>
                </div>
              </div>
              {user && (
                <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md q-anim sm:min-w-[200px]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-200/80">Session</p>
                  <p className="mt-1 font-bold text-white">
                    {user.prenom} {user.nom}
                  </p>
                  <p className="text-xs text-cyan-100/80">Rôle : contrôleur qualité</p>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {loading && !dash ? (
            <div className="flex justify-center py-24">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
            </div>
          ) : (
            <>
              {/* KPI */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {kpiCards.map((k, i) => (
                  <div
                    key={k.label}
                    className="q-card-glow q-anim group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5"
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <div
                      className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${k.gradient} opacity-[0.15] blur-2xl transition group-hover:opacity-25`}
                    />
                    <div className="relative flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{k.label}</p>
                        <p className="mt-2 text-3xl font-black tabular-nums text-slate-900">{k.value}</p>
                        <p className="mt-1 text-xs text-slate-500">{k.sub}</p>
                      </div>
                      <span
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${k.gradient} text-white shadow-lg`}
                      >
                        <k.icon className="h-5 w-5" aria-hidden />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Alertes */}
              {dash?.alertes_recentes?.length > 0 && (
                <section className="mt-10 q-anim">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <FaExclamationTriangle className="h-4 w-4" aria-hidden />
                    </span>
                    Dossiers à surveiller
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {dash.alertes_recentes.map((a) => (
                      <div
                        key={a.dossier_id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/50 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900">{a.numero_dossier}</p>
                          <p className="truncate text-xs text-slate-600">{a.etudiant}</p>
                          {a.pieces_manquantes?.length > 0 && (
                            <p className="mt-1 line-clamp-1 text-[11px] text-amber-800">
                              Manquants : {a.pieces_manquantes.join(', ')}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 rounded-full bg-amber-600 px-2.5 py-1 text-xs font-black text-white">
                          {a.completude_pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Liste dossiers */}
              <section className="mt-12 q-anim">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Dossiers et complétude</h2>
                    <p className="text-sm text-slate-500">Filtrez par statut et ouvrez une facture ou une lettre depuis le dossier.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="relative">
                      <FaSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <select
                        className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm font-semibold text-slate-800 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                        value={filtreStatut}
                        onChange={(e) => {
                          setFiltreStatut(e.target.value)
                          setPage(1)
                        }}
                      >
                        <option value="">Tous les statuts</option>
                        {Object.entries(STATUT_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </span>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-900/5">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-slate-50 to-cyan-50/40">
                          <th className="px-4 py-3 font-bold text-slate-600">Dossier</th>
                          <th className="px-4 py-3 font-bold text-slate-600">Candidat</th>
                          <th className="px-4 py-3 font-bold text-slate-600">Formation</th>
                          <th className="px-4 py-3 font-bold text-slate-600">Statut</th>
                          <th className="px-4 py-3 font-bold text-slate-600">Complétude</th>
                          <th className="px-4 py-3 font-bold text-slate-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {listLoading ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-16 text-center text-slate-500">
                              <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-cyan-200 border-t-cyan-600" />
                            </td>
                          </tr>
                        ) : dossiers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                              Aucun dossier pour ce filtre.
                            </td>
                          </tr>
                        ) : (
                          dossiers.map((d) => (
                            <tr key={d.id} className="transition hover:bg-cyan-50/40">
                              <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">{d.numero_dossier}</td>
                              <td className="px-4 py-3">
                                <p className="font-semibold text-slate-900">
                                  {d.etudiant?.prenom} {d.etudiant?.nom}
                                </p>
                                <p className="text-xs text-slate-500">{d.etudiant?.email}</p>
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {d.formation?.titre || '—'}
                                {d.formation?.type && (
                                  <span className="ml-1 text-xs text-slate-400">({d.formation.type})</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                                  {STATUT_LABEL[d.statut] || d.statut}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all"
                                      style={{ width: `${Math.min(100, d.completude_pct)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-bold text-slate-700">{d.completude_pct}%</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Link
                                  to={`/facture/${d.id}`}
                                  className="text-xs font-bold text-cyan-700 hover:text-cyan-900 hover:underline"
                                >
                                  Voir dossier →
                                </Link>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                      <p className="text-xs text-slate-500">
                        Page {pagination.page} / {pagination.totalPages} — {pagination.total} dossiers
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40"
                        >
                          Précédent
                        </button>
                        <button
                          type="button"
                          disabled={page >= pagination.totalPages}
                          onClick={() => setPage((p) => p + 1)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40"
                        >
                          Suivant
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </>
  )
}
