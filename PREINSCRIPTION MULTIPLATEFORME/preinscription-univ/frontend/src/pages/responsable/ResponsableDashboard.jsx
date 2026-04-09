import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../context/AuthContext'
import { chatWithStudentUrl } from '../../utils/chatWithStudentUrl'
import TabConditionsAdmissionEtab from '../../components/TabConditionsAdmissionEtab'
import StatutBadge from '../../components/StatutBadge'
import {
  DashboardPage,
  DashboardHero,
  StatTile,
  Panel,
  DashboardSpinner,
} from '../../components/dashboard/DashboardChrome'

const ONGLETS = [
  { key: 'fad',        label: '🌐 FAD (En ligne)',    type: 'fad' },
  { key: 'presentiel', label: '🏫 Présentiel',        type: 'presentiel' },
  { key: 'demandes',   label: '🧾 Demandes proforma', type: null },
  { key: 'conditions', label: '📋 Conditions d’admission', type: null },
]

export default function ResponsableDashboard() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [onglet, setOnglet]         = useState(() =>
    searchParams.get('tab') === 'conditions' ? 'conditions' : 'fad',
  )
  const [stats, setStats]           = useState(null)
  const [dossiers, setDossiers]     = useState([])
  const [demandes, setDemandes]     = useState([])
  const [pagination, setPagination] = useState({})
  const [search, setSearch]         = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(true)

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
    if (onglet === 'demandes' || onglet === 'conditions') return
    setLoading(true)
    const params = new URLSearchParams({ page, limit: 12, type: onglet })
    if (filtreStatut) params.append('statut', filtreStatut)
    if (search)       params.append('search', search)
    axios.get(`/api/responsable/dossiers?${params}`)
      .then(({ data }) => { setDossiers(data.dossiers); setPagination(data.pagination) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [onglet, page, filtreStatut, search])

  // Demandes proforma
  useEffect(() => {
    if (onglet !== 'demandes') return
    setLoading(true)
    axios.get('/api/responsable/demandes-proforma')
      .then(({ data }) => setDemandes(data.demandes))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [onglet])

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

  const marquerVue = (id) => {
    axios.put(`/api/responsable/demandes-proforma/${id}/statut`, { statut: 'vue' }).then(() => {
      setDemandes(prev => prev.map(d => d.id === id ? { ...d, statut: 'vue' } : d))
    }).catch(() => {})
  }

  const canChatterEtudiant =
    user?.role === 'responsable' && user?.etablissement_id != null

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Pédagogie"
        title="Espace responsable"
        subtitle="Dossiers FAD / présentiel, demandes proforma, et publication des conditions d’admission visibles par les candidats."
      />

      {stats && (
        <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile icon={<span className="text-2xl">🌐</span>} gradient="emerald" label="Dossiers FAD" value={stats.fad.total} sub={`${stats.fad.en_attente} en attente`} />
          <StatTile icon={<span className="text-2xl">🏫</span>} gradient="blue" label="Dossiers présentiel" value={stats.presentiel.total} sub={`${stats.presentiel.en_attente} en attente`} />
          <StatTile icon={<span className="text-2xl">✅</span>} gradient="cyan" label="Acceptés (total)" value={(stats.fad.acceptes || 0) + (stats.presentiel.acceptes || 0)} />
          <StatTile
            icon={<span className="text-2xl">🧾</span>}
            gradient="amber"
            label="Demandes proforma"
            value={stats.demandes_proforma}
            sub={stats.nouvelles_demandes > 0 ? `${stats.nouvelles_demandes} nouvelle(s)` : null}
          />
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
            {o.key === 'demandes' && stats?.nouvelles_demandes > 0 && (
              <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white shadow-sm">{stats.nouvelles_demandes}</span>
            )}
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

        {onglet === 'demandes' && (
          <Panel
            title="Demandes de facture proforma"
            meta={
              stats?.nouvelles_demandes > 0 ? (
                <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">{stats.nouvelles_demandes} nouvelle(s)</span>
              ) : null
            }
            bodyClassName="p-6"
          >
            <p className="mb-5 text-sm text-slate-500">Déposées par les candidats (compte + justificatifs) ; validation pédagogique requise.</p>

            {loading ? (
              <DashboardSpinner />
            ) : demandes.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <div className="mb-3 text-4xl">🧾</div>
                <p>Aucune demande pour le moment</p>
              </div>
            ) : (
              <div className="space-y-3">
                {demandes.map((d) => (
                  <div
                    key={d.id}
                    role={d.statut === 'nouvelle' || d.statut === 'en_attente' ? 'button' : undefined}
                    tabIndex={d.statut === 'nouvelle' || d.statut === 'en_attente' ? 0 : undefined}
                    className={`rounded-2xl border p-4 transition-all ${
                      d.statut === 'nouvelle' || d.statut === 'en_attente' ? 'border-amber-300/80 bg-gradient-to-br from-amber-50 to-orange-50/50 shadow-md shadow-amber-100/50' : 'border-slate-100 bg-white shadow-sm'
                    } ${d.statut === 'nouvelle' || d.statut === 'en_attente' ? 'cursor-pointer hover:border-amber-400' : ''}`}
                    onClick={() => (d.statut === 'nouvelle' || d.statut === 'en_attente') && marquerVue(d.id)}
                    onKeyDown={(e) => {
                      if ((d.statut === 'nouvelle' || d.statut === 'en_attente') && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        marquerVue(d.id)
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900">{d.prenom} {d.nom}</span>
                          {canChatterEtudiant && d.etudiant_id != null && Number(d.etudiant_id) > 0 && (
                            <Link
                              to={chatWithStudentUrl(d.etudiant_id, d.prenom, d.nom)}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center rounded-lg border border-emerald-200 bg-white px-2 py-0.5 text-[11px] font-bold text-emerald-800 shadow-sm hover:bg-emerald-50"
                            >
                              💬 Chatter
                            </Link>
                          )}
                          {(d.statut === 'nouvelle' || d.statut === 'en_attente') && (
                            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">NOUVEAU</span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${d.type_formation === 'en_ligne' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {d.type_formation === 'en_ligne' ? '🌐 FAD' : '🏫 Présentiel'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 font-medium">{d.formation_titre}</p>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                          <span>📧 {d.email}</span>
                          <span>📞 {d.telephone}</span>
                          <span>📅 {new Date(d.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                        {d.details && <p className="text-xs text-gray-500 mt-2 italic bg-white rounded-lg p-2 border border-gray-100">"{d.details}"</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-mono text-xs text-gray-400">{d.reference}</div>
                        <span className={`inline-block mt-1 text-xs px-2 py-1 rounded-full font-semibold ${
                          d.statut === 'nouvelle' || d.statut === 'en_attente' ? 'bg-amber-100 text-amber-700'
                          : d.statut === 'vue' ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-500'
                        }`}>
                          {d.statut === 'en_attente' ? 'En attente' : d.statut === 'nouvelle' ? 'Nouvelle' : d.statut === 'vue' ? 'Vue' : 'Traitée'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}
    </DashboardPage>
  )
}
