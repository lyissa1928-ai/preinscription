import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { chatWithStudentUrl } from '../../utils/chatWithStudentUrl'
import TabConditionsAdmissionEtab from '../../components/TabConditionsAdmissionEtab'
import StatutBadge from '../../components/StatutBadge'
import CreerProformaModal from '../../components/CreerProformaModal'
import {
  DashboardPage,
  Panel,
  DashboardSpinner,
} from '../../components/dashboard/DashboardChrome'

const ONGLETS = [
  { key: 'fad', label: 'FAD', type: 'fad' },
  { key: 'presentiel', label: 'Présentiel', type: 'presentiel' },
  { key: 'conditions', label: 'Conditions', type: null },
]

const CHART_COLORS = ['#ea580c', '#0284c7', '#059669', '#7c3aed', '#db2777', '#ca8a04', '#0f766e', '#475569']

function shortTitle(t, max = 28) {
  const s = String(t || 'Sans titre')
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

/** Camembert SVG pur (sans lib). */
function PieChart({ items }) {
  const total = items.reduce((s, x) => s + (x.total || 0), 0) || 1
  const r = 54
  const cx = 70
  const cy = 70
  let angle = -Math.PI / 2
  const slices = items.map((it, i) => {
    const frac = (it.total || 0) / total
    const start = angle
    const sweep = frac * Math.PI * 2
    angle += sweep
    const x1 = cx + r * Math.cos(start)
    const y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(start + sweep)
    const y2 = cy + r * Math.sin(start + sweep)
    const large = sweep > Math.PI ? 1 : 0
    const d =
      frac >= 0.999
        ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
    return { d, color: CHART_COLORS[i % CHART_COLORS.length], it, pct: Math.round(frac * 100) }
  })

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-5">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0" aria-hidden>
        {slices.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} stroke="#fff" strokeWidth="1.5" />
        ))}
        <circle cx={cx} cy={cy} r="28" fill="#fff" />
        <text x={cx} y={cy - 2} textAnchor="middle" className="fill-slate-800" style={{ fontSize: 16, fontWeight: 800 }}>
          {total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 9 }}>
          demandes
        </text>
      </svg>
      <ul className="w-full min-w-0 space-y-1.5">
        {slices.map((s, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate text-slate-700" title={s.it.titre}>{shortTitle(s.it.titre, 36)}</span>
            <span className="shrink-0 tabular-nums font-bold text-slate-800">{s.it.total}</span>
            <span className="w-8 shrink-0 text-right tabular-nums text-slate-400">{s.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Histogramme horizontal compact. */
function BarChart({ items }) {
  const max = Math.max(1, ...items.map((x) => x.total || 0))
  return (
    <ul className="space-y-2.5">
      {items.map((f, i) => (
        <li key={f.formation_id || f.titre}>
          <div className="mb-0.5 flex justify-between gap-2 text-xs">
            <span className="truncate font-medium text-slate-700" title={f.titre}>{shortTitle(f.titre, 40)}</span>
            <span className="shrink-0 tabular-nums font-bold text-slate-900">{f.total}</span>
          </div>
          <div className="h-3 overflow-hidden rounded bg-slate-100">
            <div
              className="h-full rounded transition-all"
              style={{
                width: `${Math.round(((f.total || 0) / max) * 100)}%`,
                background: CHART_COLORS[i % CHART_COLORS.length],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function ResponsableDashboard() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [onglet, setOnglet] = useState(() =>
    searchParams.get('tab') === 'conditions' ? 'conditions' : 'fad',
  )
  const [stats, setStats] = useState(null)
  const [dossiers, setDossiers] = useState([])
  const [pagination, setPagination] = useState({})
  const [search, setSearch] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [creerOpen, setCreerOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [chartMode, setChartMode] = useState('pie')

  useEffect(() => {
    if (searchParams.get('tab') === 'conditions') setOnglet('conditions')
  }, [searchParams])

  useEffect(() => {
    axios.get('/api/responsable/statistiques').then(({ data }) => setStats(data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (onglet === 'conditions') return
    setLoading(true)
    const params = new URLSearchParams({ page, limit: 6, type: onglet })
    if (filtreStatut) params.append('statut', filtreStatut)
    if (search) params.append('search', search)
    axios.get(`/api/responsable/dossiers?${params}`)
      .then(({ data }) => { setDossiers(data.dossiers); setPagination(data.pagination) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [onglet, page, filtreStatut, search])

  const handleOnglet = (key) => {
    setOnglet(key)
    setPage(1)
    setSearch('')
    setFiltreStatut('')
    if (key === 'conditions') setSearchParams({ tab: 'conditions' }, { replace: true })
    else setSearchParams({}, { replace: true })
  }

  const canChatterEtudiant =
    user?.role === 'responsable' && user?.etablissement_id != null

  const exportRapportExcel = async () => {
    const etabId = user?.etablissement_id
    if (!etabId) {
      toast.error('Aucun établissement rattaché à votre compte.')
      return
    }
    setExporting(true)
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
      toast.success('Rapport Excel téléchargé')
    } catch {
      toast.error('Impossible de générer le rapport Excel')
    } finally {
      setExporting(false)
    }
  }

  const topFormations = useMemo(
    () => (stats?.formations_plus_demandees || []).slice(0, 6),
    [stats],
  )
  const aTraiter = stats?.nouvelles_demandes ?? 0

  return (
    <DashboardPage className="!py-4 md:!py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 md:text-2xl">Tableau de bord</h1>
          <p className="text-sm text-slate-500">
            Formations les plus demandées
            {aTraiter > 0 && (
              <>
                {' · '}
                <Link to="/responsable/demandes-proforma" className="font-semibold text-amber-700 hover:underline">
                  {aTraiter} préinscription(s) à traiter
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user?.etablissement_id && (
            <button
              type="button"
              onClick={exportRapportExcel}
              disabled={exporting}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              {exporting ? 'Export…' : 'Rapport Excel'}
            </button>
          )}
          <button type="button" onClick={() => setCreerOpen(true)} className="btn-primary text-sm">
            Nouvelle facture
          </button>
        </div>
      </div>

      <CreerProformaModal open={creerOpen} onClose={() => setCreerOpen(false)} />

      <Panel
        title="Formations les plus demandées"
        className="mb-4"
        bodyClassName="p-4"
        meta={
          <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setChartMode('pie')}
              className={`rounded-md px-2.5 py-1 ${chartMode === 'pie' ? 'bg-orange-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Circulaire
            </button>
            <button
              type="button"
              onClick={() => setChartMode('bar')}
              className={`rounded-md px-2.5 py-1 ${chartMode === 'bar' ? 'bg-orange-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Histogramme
            </button>
          </div>
        }
      >
        {!stats ? (
          <DashboardSpinner />
        ) : topFormations.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Aucune demande pour le moment.</p>
        ) : chartMode === 'pie' ? (
          <PieChart items={topFormations} />
        ) : (
          <BarChart items={topFormations} />
        )}
      </Panel>

      <div className="mb-3 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {ONGLETS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => handleOnglet(o.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              onglet === o.key
                ? 'bg-white text-orange-700 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-600 hover:bg-white/80'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {onglet !== 'conditions' && (
        <Panel
          title={onglet === 'fad' ? 'Dossiers FAD' : 'Dossiers présentiel'}
          bodyClassName="p-3 sm:p-4"
        >
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              placeholder="Rechercher…"
              className="input-field flex-1 py-2 text-sm"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
            <select
              className="input-field py-2 text-sm sm:w-40"
              value={filtreStatut}
              onChange={(e) => { setFiltreStatut(e.target.value); setPage(1) }}
            >
              <option value="">Tous</option>
              <option value="en_attente">En attente</option>
              <option value="en_cours">En cours</option>
              <option value="accepte">Accepté</option>
              <option value="refuse">Refusé</option>
            </select>
          </div>

          {loading ? (
            <DashboardSpinner />
          ) : dossiers.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Aucun dossier</p>
          ) : (
            <>
              <div className="max-h-[280px] overflow-auto rounded-xl border border-slate-100">
                <table className="dashboard-table text-sm">
                  <thead>
                    <tr>
                      <th>N°</th>
                      <th>Candidat</th>
                      <th className="hidden sm:table-cell">Formation</th>
                      <th>Statut</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dossiers.map((d) => (
                      <tr key={d.id}>
                        <td className="font-mono text-xs text-slate-500">{d.numero_dossier}</td>
                        <td>
                          <div className="font-semibold text-slate-800">{d.prenom} {d.nom}</div>
                        </td>
                        <td className="hidden max-w-[160px] truncate text-xs text-slate-600 sm:table-cell">{d.filiere}</td>
                        <td><StatutBadge statut={d.statut} /></td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            <Link
                              to={`/responsable/dossier/${d.id}`}
                              className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700"
                            >
                              Traiter
                            </Link>
                            {canChatterEtudiant && d.etudiant_id != null && Number(d.etudiant_id) > 0 && (
                              <Link
                                to={chatWithStudentUrl(d.etudiant_id, d.prenom, d.nom)}
                                className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800"
                              >
                                Chat
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pagination.totalPages > 1 && (
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{pagination.total} dossier(s)</span>
                  <div className="flex gap-1">
                    <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary px-2 py-1 text-xs disabled:opacity-40">←</button>
                    <span>{page}/{pagination.totalPages}</span>
                    <button type="button" disabled={page === pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="btn-secondary px-2 py-1 text-xs disabled:opacity-40">→</button>
                  </div>
                </div>
              )}
            </>
          )}
        </Panel>
      )}

      {onglet === 'conditions' && (
        <Panel title="Conditions d’admission" bodyClassName="p-4">
          {user?.etablissement_id ? (
            <TabConditionsAdmissionEtab etabId={user.etablissement_id} etabNom={user.etablissement_nom} />
          ) : (
            <p className="text-sm text-amber-800">Aucun établissement rattaché.</p>
          )}
        </Panel>
      )}
    </DashboardPage>
  )
}
