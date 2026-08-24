import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../context/AuthContext'
import { chatWithStudentUrl } from '../../utils/chatWithStudentUrl'
import TabConditionsAdmissionEtab from '../../components/TabConditionsAdmissionEtab'
import StatutBadge from '../../components/StatutBadge'
import CreerProformaModal from '../../components/CreerProformaModal'
import {
  DashboardPage,
  DashboardHero,
  StatTile,
  Panel,
  DashboardSpinner,
} from '../../components/dashboard/DashboardChrome'

const ONGLETS = [
  { key: 'fad',        label: 'FAD (En ligne)',    type: 'fad' },
  { key: 'presentiel', label: 'Présentiel',        type: 'presentiel' },
  { key: 'conditions', label: 'Conditions d’admission', type: null },
]

export default function ResponsableDashboard() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [onglet, setOnglet]         = useState(() =>
    searchParams.get('tab') === 'conditions' ? 'conditions' : 'fad',
  )
  const [stats, setStats]           = useState(null)
  const [dossiers, setDossiers]     = useState([])
  const [pagination, setPagination] = useState({})
  const [search, setSearch]         = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(true)
  const [creerOpen, setCreerOpen]   = useState(false)

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t === 'conditions') setOnglet('conditions')
  }, [searchParams])

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t === 'conditions') setOnglet('conditions')
  }, [searchParams])

  // Stats
  useEffect(() => {
    axios.get('/api/responsable/statistiques').then(({ data }) => setStats(data)).catch(() => {})
  }, [])

  // Dossiers FAD / Présentiel
  useEffect(() => {
    if (onglet === 'conditions') return
    setLoading(true)
    const params = new URLSearchParams({ page, limit: 12, type: onglet })
    if (filtreStatut) params.append('statut', filtreStatut)
    if (search)       params.append('search', search)
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
    if (key === 'conditions') {
      setSearchParams({ tab: 'conditions' }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  const canChatterEtudiant =
    user?.role === 'responsable' && user?.etablissement_id != null

  const canChatterEtudiant =
    user?.role === 'responsable' && user?.etablissement_id != null

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Pédagogie"
        title="Espace responsable"
        subtitle="Dossiers FAD / présentiel et conditions d’admission. Les demandes proforma sont sur leur page dédiée."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/responsable/demandes-proforma" className="btn-secondary text-sm">Demandes proforma</Link>
            <Link to="/responsable/preinscription-guichet" className="btn-secondary text-sm">Guichet</Link>
            <Link to="/responsable/gestion-etablissement" className="btn-secondary text-sm">Formations</Link>
            <button type="button" onClick={() => setCreerOpen(true)} className="btn-primary text-sm">
              Nouvelle facture proforma
            </button>
          </div>
        }
      />
      <CreerProformaModal open={creerOpen} onClose={() => setCreerOpen(false)} />

      {stats && (
        <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile icon={<span className="text-2xl">🌐</span>} gradient="emerald" label="Dossiers FAD" value={stats.fad.total} sub={`${stats.fad.en_attente} en attente`} />
          <StatTile icon={<span className="text-2xl">🏫</span>} gradient="blue" label="Dossiers présentiel" value={stats.presentiel.total} sub={`${stats.presentiel.en_attente} en attente`} />
          <StatTile icon={<span className="text-2xl">✅</span>} gradient="cyan" label="Acceptés (total)" value={(stats.fad.acceptes || 0) + (stats.presentiel.acceptes || 0)} />
          <Link to="/responsable/demandes-proforma" className="block">
            <StatTile
              icon={<span className="text-2xl">🧾</span>}
              gradient="amber"
              label="Demandes proforma"
              value={stats.demandes_proforma}
              sub={stats.nouvelles_demandes > 0 ? `${stats.nouvelles_demandes} nouvelle(s)` : null}
            />
          </Link>
        </div>
      )}

      <div className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1.5 shadow-inner">
        {ONGLETS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => handleOnglet(o.key)}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
              onglet === o.key
                ? 'bg-white text-blue-700 shadow-md ring-1 ring-slate-200/60'
                : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

        {onglet !== 'demandes' && onglet !== 'conditions' && (
          <Panel title={onglet === 'fad' ? 'Dossiers — formation à distance (FAD)' : 'Dossiers — présentiel'} bodyClassName="p-6">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" placeholder="Rechercher par nom, email, N° dossier..."
                  className="input-field pl-9" value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }} />
              </div>
              <select className="input-field sm:w-44" value={filtreStatut}
                onChange={e => { setFiltreStatut(e.target.value); setPage(1) }}>
                <option value="">Tous les statuts</option>
                <option value="en_attente">⏳ En attente</option>
                <option value="en_cours">🔍 En cours</option>
                <option value="accepte">✅ Accepté</option>
                <option value="refuse">❌ Refusé</option>
              </select>
            </div>

            {loading ? (
              <DashboardSpinner />
            ) : dossiers.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <div className="mb-3 text-4xl">📂</div>
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
                        <th className="hidden sm:table-cell">Formation</th>
                        <th className="hidden md:table-cell">Date</th>
                        <th>Statut</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dossiers.map((d) => (
                        <tr key={d.id}>
                          <td className="font-mono text-xs text-slate-500">{d.numero_dossier}</td>
                          <td>
                            <div className="font-semibold text-slate-800">
                              {d.prenom} {d.nom}
                            </div>
                            <div className="text-xs text-slate-400">{d.email}</div>
                          </td>
                          <td className="hidden max-w-[180px] truncate text-xs text-slate-600 sm:table-cell">{d.filiere}</td>
                          <td className="hidden text-xs text-slate-400 md:table-cell">{new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
                          <td>
                            <StatutBadge statut={d.statut} />
                          </td>
                          <td>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Link
                                to={`/responsable/dossier/${d.id}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/80 px-2.5 py-1.5 text-xs font-bold text-blue-700 transition-colors hover:border-blue-400 hover:bg-blue-100"
                              >
                                Traiter →
                              </Link>
                              {canChatterEtudiant && d.etudiant_id != null && Number(d.etudiant_id) > 0 && (
                                <Link
                                  to={chatWithStudentUrl(d.etudiant_id, d.prenom, d.nom)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50/90 px-2.5 py-1.5 text-xs font-bold text-emerald-800 transition-colors hover:border-emerald-400 hover:bg-emerald-100"
                                  title="Messagerie avec le candidat"
                                >
                                  💬 Chatter
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
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                    <p className="text-sm text-slate-500">{pagination.total} dossier(s)</p>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">
                        ← Préc.
                      </button>
                      <span className="text-sm text-slate-500">
                        Page {page}/{pagination.totalPages}
                      </span>
                      <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page === pagination.totalPages} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">
                        Suiv. →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Panel>
        )}

        {onglet === 'conditions' && (
          <Panel
            title="Conditions d’admission (candidats)"
            meta={
              <Link
                to="/responsable/gestion-etablissement"
                className="text-sm font-semibold text-blue-700 hover:underline"
              >
                Gestion avancée (filières) →
              </Link>
            }
            bodyClassName="p-6"
          >
            <p className="mb-6 text-sm text-slate-600">
              Ajoutez <strong>plusieurs blocs</strong> de conditions (par thème ou niveau), modifiez ou supprimez-les. Le
              champ de saisie d’un <strong>nouveau</strong> bloc est vidé après chaque ajout validé. Affichage sur la page
              « Demande de facture proforma » après choix de votre établissement.
            </p>
            {user?.etablissement_id ? (
              <TabConditionsAdmissionEtab
                etabId={user.etablissement_id}
                etabNom={user.etablissement_nom}
              />
            ) : (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Aucun établissement n’est rattaché à votre compte. Contactez l’administrateur.
              </p>
            )}
          </Panel>
        )}
    </DashboardPage>
  )
}
