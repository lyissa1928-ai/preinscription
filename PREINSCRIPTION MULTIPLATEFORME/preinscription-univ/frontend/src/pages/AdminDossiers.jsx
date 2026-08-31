import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import StatutBadge from '../components/StatutBadge'
import { DashboardPage, DashboardHero, Panel, DashboardSpinner } from '../components/dashboard/DashboardChrome'

export default function AdminDossiers() {
  const [searchParams] = useSearchParams()
  const [dossiers, setDossiers] = useState([])
  const [pagination, setPagination] = useState({})
  const [search, setSearch] = useState('')
  const [filtreStatut, setFiltreStatut] = useState(searchParams.get('statut') || '')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page, limit: 10 })
    if (filtreStatut) params.append('statut', filtreStatut)
    if (search) params.append('search', search)
    axios
      .get(`/api/admin/dossiers?${params}`)
      .then(({ data }) => {
        setDossiers(data.dossiers)
        setPagination(data.pagination)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, filtreStatut, search])

  return (
    <DashboardPage>
      <Link
        to="/admin"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-indigo-600"
      >
        <span aria-hidden className="text-lg leading-none">←</span>
        Tableau de bord
      </Link>

      <DashboardHero
        eyebrow="Administration"
        title="Dossiers de préinscription"
        subtitle="Recherche, filtrage par statut et consultation des dossiers de la plateforme."
      />

      <Panel
        title="Dossiers"
        meta={
          pagination.total != null ? (
            <span className="text-xs font-semibold text-slate-400">{pagination.total} dossier(s)</span>
          ) : null
        }
        bodyClassName="p-6"
      >
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Rechercher par nom, email, matricule, n° dossier…"
            className="input-field flex-1"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
          <select
            className="input-field sm:w-48"
            value={filtreStatut}
            onChange={(e) => { setFiltreStatut(e.target.value); setPage(1) }}
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
                      </td>
                      <td className="hidden text-xs text-slate-700 sm:table-cell">{d.filiere}</td>
                      <td className="hidden text-xs text-slate-400 md:table-cell">
                        {new Date(d.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td>
                        <StatutBadge statut={d.statut} />
                      </td>
                      <td>
                        <Link
                          to={`/admin/dossier/${d.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/80 px-2.5 py-1.5 text-xs font-bold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100"
                        >
                          Voir
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
