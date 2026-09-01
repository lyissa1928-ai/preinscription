import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import StatutBadge from '../components/StatutBadge'
import { DashboardPage, DashboardHero, Panel, DashboardSpinner } from '../components/dashboard/DashboardChrome'

function formatNom(d) {
  const parts = [d?.prenom, d?.nom].map((s) => String(s || '').trim()).filter(Boolean)
  return parts.length ? parts.join(' ') : '—'
}

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
        className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      >
        <span aria-hidden>←</span>
        Tableau de bord
      </Link>

      <DashboardHero
        eyebrow="Administration"
        title="Dossiers de préinscription"
        subtitle="Dossiers actifs uniquement — les candidatures liées à un compte étudiant supprimé sont masquées automatiquement."
      />

      <Panel
        title="Liste des dossiers"
        meta={
          pagination.total != null ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              {pagination.total} dossier{pagination.total > 1 ? 's' : ''}
            </span>
          ) : null
        }
        bodyClassName="p-5 sm:p-6"
      >
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>🔍</span>
            <input
              type="text"
              placeholder="Nom, email, matricule, n° dossier…"
              className="input-field w-full pl-10"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select
            className="input-field sm:w-52"
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
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 py-16 text-center">
            <p className="font-semibold text-slate-700">Aucun dossier trouvé</p>
            <p className="mt-1 text-sm text-slate-500">Modifiez les filtres ou la recherche.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 lg:hidden">
              {dossiers.map((d) => (
                <article
                  key={d.id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] font-bold text-indigo-600">{d.numero_dossier}</p>
                      <p className="mt-1 font-bold text-slate-900">{formatNom(d)}</p>
                      {d.email && <p className="truncate text-xs text-slate-500">{d.email}</p>}
                    </div>
                    <StatutBadge statut={d.statut} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-slate-600">{d.filiere}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">
                      {new Date(d.created_at).toLocaleDateString('fr-FR')}
                    </span>
                    <Link
                      to={`/admin/dossier/${d.id}`}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm"
                    >
                      Ouvrir
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-2xl border border-slate-200/90 lg:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
                    {['N° dossier', 'Matricule', 'Candidat', 'Formation', 'Date', 'Statut', ''].map((h) => (
                      <th
                        key={h || 'action'}
                        className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 first:rounded-tl-2xl last:rounded-tr-2xl"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dossiers.map((d) => (
                    <tr key={d.id} className="group bg-white transition hover:bg-indigo-50/20">
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-bold text-indigo-700">{d.numero_dossier}</span>
                        {!d.etudiant_id && (
                          <span className="ml-2 rounded bg-cyan-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-cyan-800">
                            Guichet
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                          {d.matricule || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900">{formatNom(d)}</p>
                        {d.email && <p className="text-xs text-slate-500">{d.email}</p>}
                      </td>
                      <td className="max-w-xs px-4 py-3.5 text-xs leading-snug text-slate-700">{d.filiere}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs tabular-nums text-slate-500">
                        {new Date(d.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatutBadge statut={d.statut} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          to={`/admin/dossier/${d.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition group-hover:bg-indigo-700"
                        >
                          Voir →
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
                  <span className="px-2 text-sm font-medium text-slate-600">
                    {page} / {pagination.totalPages}
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
