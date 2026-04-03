import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import StatutBadge from '../../components/StatutBadge'
import {
  DashboardPage,
  DashboardHero,
  StatTile,
  Panel,
  DashboardSpinner,
} from '../../components/dashboard/DashboardChrome'

const STATUT_ADMIN_CONFIG = {
  complet:         { label: 'Complet',         color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  incomplet:       { label: 'Incomplet',       color: 'bg-red-100 text-red-700',         dot: 'bg-red-500' },
  en_verification: { label: 'En vérification', color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500' },
  null:            { label: 'Non vérifié',     color: 'bg-gray-100 text-gray-500',       dot: 'bg-gray-400' }
}

function StatutAdminBadge({ statut }) {
  const cfg = STATUT_ADMIN_CONFIG[statut] || STATUT_ADMIN_CONFIG['null']
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
      {cfg.label}
    </span>
  )
}

export default function AgentAdminDashboard() {
  const [stats, setStats] = useState(null)
  const [dossiers, setDossiers] = useState([])
  const [pagination, setPagination] = useState({})
  const [filtreAdmin, setFiltreAdmin] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/agent-admin/dashboard').then(({ data }) => setStats(data)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page, limit: 15 })
    if (filtreAdmin) params.append('statut_admin', filtreAdmin)
    if (search) params.append('search', search)
    axios.get(`/api/agent-admin/dossiers?${params}`)
      .then(({ data }) => { setDossiers(data.dossiers); setPagination(data.pagination) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, filtreAdmin, search])

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Contrôle administratif"
        title="Vérification des dossiers"
        subtitle="Suivi de la complétude des pièces et traitement des dossiers de préinscription."
      />

      {stats && (
        <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatTile icon={<span className="text-xl">📂</span>} gradient="slate" label="Total dossiers" value={stats.total ?? 0} />
          <StatTile icon={<span className="text-xl">✅</span>} gradient="emerald" label="Complets" value={stats.complets ?? 0} />
          <StatTile icon={<span className="text-xl">⚠️</span>} gradient="rose" label="Incomplets" value={stats.incomplets ?? 0} />
          <StatTile icon={<span className="text-xl">🔍</span>} gradient="blue" label="En vérification" value={stats.en_verification ?? 0} />
          <StatTile icon={<span className="text-xl">⏳</span>} gradient="amber" label="Non vérifiés" value={stats.non_verifies ?? 0} />
        </div>
      )}

      <Panel title="Dossiers à contrôler" bodyClassName="p-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <input type="text" className="input-field" placeholder="🔍 Rechercher par nom, numéro..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
            <select className="input-field sm:w-52" value={filtreAdmin}
              onChange={e => { setFiltreAdmin(e.target.value); setPage(1) }}>
              <option value="">Tous les statuts admin</option>
              <option value="complet">✅ Complet</option>
              <option value="incomplet">⚠️ Incomplet</option>
              <option value="en_verification">🔍 En vérification</option>
            </select>
          </div>

          {loading ? (
            <DashboardSpinner />
          ) : dossiers.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <div className="mb-3 text-5xl opacity-30">📂</div>
              <p className="font-medium">Aucun dossier trouvé</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>N° Dossier</th>
                      <th>Candidat</th>
                      <th className="hidden sm:table-cell">Documents</th>
                      <th>Statut péda</th>
                      <th>Statut admin</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dossiers.map((d) => (
                      <tr key={d.id}>
                        <td className="font-mono text-xs text-slate-500">{d.numero_dossier}</td>
                        <td>
                          <div className="font-medium text-slate-800">{d.prenom} {d.nom}</div>
                          <div className="text-xs text-slate-400">{d.email}</div>
                        </td>
                        <td className="hidden sm:table-cell">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className={`text-sm font-bold ${d.nb_documents >= 4 ? 'text-emerald-600' : 'text-red-500'}`}>{d.nb_documents}/4</div>
                            {d.docs_manquants?.length > 0 && (
                              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                                {d.docs_manquants.length} manquant{d.docs_manquants.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <StatutBadge statut={d.statut} />
                        </td>
                        <td>
                          <StatutAdminBadge statut={d.statut_admin} />
                        </td>
                        <td>
                          <Link
                            to={`/agent-admin/dossier/${d.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-blue-700 to-indigo-700 px-3 py-1.5 text-xs font-bold text-white shadow-md transition-all hover:from-blue-800 hover:to-indigo-800 hover:shadow-lg"
                          >
                            Vérifier →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                  <p className="text-sm text-slate-500">{pagination.total} dossier(s)</p>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="btn-secondary py-1 px-3 text-sm disabled:opacity-40">
                      ← Préc.
                    </button>
                    <span className="px-2 text-sm text-slate-600">
                      Page {page}/{pagination.totalPages}
                    </span>
                    <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page === pagination.totalPages} className="btn-secondary py-1 px-3 text-sm disabled:opacity-40">
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
