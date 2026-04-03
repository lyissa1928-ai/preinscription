import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  DashboardPage,
  DashboardHero,
  StatTile,
  Panel,
  DashboardSpinner,
  TabPillBar,
  TabPill,
} from '../../components/dashboard/DashboardChrome'

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0)
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR')

const TABS = [
  { id: 'dashboard', label: '📊 Tableau de bord' },
  { id: 'proformas', label: '🧾 Factures proforma' },
  { id: 'tarifs', label: '💰 Tarifs' },
  { id: 'dossiers', label: '📁 Dossiers financiers' }
]

export default function ComptableDashboard() {
  const [tab, setTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [proformas, setProformas] = useState([])
  const [tarifs, setTarifs] = useState(null)
  const [dossiers, setDossiers] = useState([])
  const [filtreType, setFiltreType] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    axios.get('/api/comptable/dashboard').then(({ data }) => setStats(data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (tab === 'proformas') {
      setLoading(true)
      const params = new URLSearchParams({ limit: 50 })
      if (filtreType) params.append('type', filtreType)
      axios.get(`/api/comptable/proformas?${params}`)
        .then(({ data }) => setProformas(data.demandes))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
    if (tab === 'tarifs') {
      axios.get('/api/comptable/tarifs').then(({ data }) => setTarifs(data)).catch(() => {})
    }
    if (tab === 'dossiers') {
      setLoading(true)
      axios.get('/api/comptable/dossiers?limit=50')
        .then(({ data }) => setDossiers(data.dossiers))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [tab, filtreType])

  const handleValidationFinanciere = async (id, validation_financiere) => {
    try {
      await axios.put(`/api/comptable/dossiers/${id}/validation-financiere`, { validation_financiere })
      toast.success('Validation financière enregistrée.')
      setDossiers(prev => prev.map(d => d.id === id ? { ...d, validation_financiere } : d))
    } catch {
      toast.error('Erreur lors de la validation.')
    }
  }

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Finance"
        title="Espace comptabilité"
        subtitle="Supervision des factures proforma, tarifs et validation financière des dossiers."
      />

      <TabPillBar>
        {TABS.map((t) => (
          <TabPill key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </TabPill>
        ))}
      </TabPillBar>

        {tab === 'dashboard' && stats && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatTile icon={<span className="text-xl">📩</span>} gradient="blue" label="Demandes proforma" value={stats.total_demandes_proforma} />
              <StatTile icon={<span className="text-xl">🧾</span>} gradient="violet" label="Factures générées" value={stats.factures_generees} />
              <StatTile icon={<span className="text-xl">💵</span>} gradient="emerald" label="Montant total proforma" value={`${fmt(stats.montant_total_proforma)} FCFA`} />
              <StatTile icon={<span className="text-xl">✅</span>} gradient="amber" label="Dossiers acceptés" value={stats.dossiers_acceptes} />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {[
                { key: 'en_ligne', label: '🌐 Formation à distance (FAD)', ring: 'ring-emerald-200/60', blob: 'from-emerald-400/20' },
                { key: 'presentiel', label: '🏫 Formation présentielle', ring: 'ring-blue-200/60', blob: 'from-blue-400/20' },
              ].map(({ key, label, ring, blob }) => (
                <div
                  key={key}
                  className={`relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl shadow-slate-200/40 ring-1 ${ring} backdrop-blur-sm`}
                >
                  <div className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${blob} to-transparent blur-2xl`} aria-hidden />
                  <h3 className="relative mb-4 font-bold text-slate-800">{label}</h3>
                  <div className="relative flex justify-between gap-4">
                    <div>
                      <p className="text-3xl font-black text-slate-900">{stats.par_type?.[key]?.count || 0}</p>
                      <p className="text-xs font-medium text-slate-500">demandes</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-blue-700">{fmt(stats.par_type?.[key]?.montant)} FCFA</p>
                      <p className="text-xs text-slate-500">montant total</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {stats.recentes?.length > 0 && (
              <Panel title="Dernières factures générées" bodyClassName="p-6">
                <div className="space-y-2">
                  {stats.recentes.map((d, i) => (
                    <div key={i} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 transition-colors hover:bg-slate-100/80">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{d.nom}</p>
                        <p className="text-xs text-slate-400">
                          {d.type_formation === 'en_ligne' ? '🌐 FAD' : '🏫 Présentiel'} · {fmtDate(d.created_at)}
                        </p>
                      </div>
                      <p className="text-sm font-black text-blue-700">{fmt(d.montant)} FCFA</p>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        )}

        {tab === 'proformas' && (
          <Panel title="Factures proforma" bodyClassName="p-6">
            <div className="flex gap-3 mb-6">
              <select className="input-field sm:w-52" value={filtreType} onChange={e => setFiltreType(e.target.value)}>
                <option value="">Tous les types</option>
                <option value="en_ligne">🌐 FAD uniquement</option>
                <option value="presentiel">🏫 Présentiel uniquement</option>
              </select>
            </div>

            {loading ? (
              <DashboardSpinner />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Référence</th>
                      <th>Demandeur</th>
                      <th className="hidden sm:table-cell">Formation</th>
                      <th>Type</th>
                      <th className="text-right">Montant TTC</th>
                      <th className="hidden md:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proformas.map((d) => (
                      <tr key={d.reference}>
                        <td className="font-mono text-xs text-slate-500">{d.facture?.numero}</td>
                        <td>
                          <div className="font-medium text-slate-800">{d.prenom} {d.nom}</div>
                          <div className="text-xs text-slate-400">{d.email}</div>
                        </td>
                        <td className="hidden max-w-xs truncate text-xs text-slate-700 sm:table-cell">{d.formation_titre}</td>
                        <td>
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${d.type_formation === 'en_ligne' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {d.type_formation === 'en_ligne' ? 'FAD' : 'Présentiel'}
                          </span>
                        </td>
                        <td className="text-right font-bold text-blue-700">{fmt(d.facture?.montant_ttc)} FCFA</td>
                        <td className="hidden text-xs text-slate-400 md:table-cell">{fmtDate(d.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {proformas.length === 0 && <div className="py-10 text-center text-slate-400">Aucune facture proforma trouvée.</div>}
              </div>
            )}
          </Panel>
        )}

        {/* ── Tarifs ── */}
        {tab === 'tarifs' && tarifs && (
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              { key: 'en_ligne', label: '🌐 Formations à distance (FAD)', color: 'from-emerald-600 to-teal-700' },
              { key: 'presentiel', label: '🏫 Formations en présentiel', color: 'from-blue-600 to-indigo-700' },
            ].map(({ key, label, color }) => (
              <div key={key} className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-xl shadow-slate-200/30 backdrop-blur-md">
                <h3 className={`bg-gradient-to-r ${color} px-5 py-3 text-sm font-bold text-white shadow-inner`}>{label}</h3>
                <div className="p-5">
                <div className="space-y-3">
                  {tarifs[key]?.map((f) => (
                    <div key={f.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition-shadow hover:shadow-md">
                      <p className="mb-2 text-sm font-semibold text-slate-800">{f.titre}</p>
                      {f.ville && <p className="mb-2 text-xs text-slate-500">📍 {f.ville}</p>}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="rounded-xl bg-white p-2 text-center shadow-sm ring-1 ring-slate-100">
                          <p className="text-slate-400">Forfait annuel</p>
                          <p className="font-bold text-slate-800">{fmt(f.total_annuel ?? f.prix)}</p>
                        </div>
                        <div className="rounded-xl bg-white p-2 text-center shadow-sm ring-1 ring-slate-100">
                          <p className="text-slate-400">Inscription</p>
                          <p className="font-bold text-slate-800">{fmt(f.frais_inscription)}</p>
                        </div>
                        <div className="rounded-xl bg-white p-2 text-center shadow-sm ring-1 ring-slate-100">
                          <p className="text-slate-400">Mensualité</p>
                          <p className="font-bold text-slate-800">{fmt(f.mensualite)}</p>
                        </div>
                        <div className="rounded-xl bg-white p-2 text-center shadow-sm ring-1 ring-slate-100">
                          <p className="text-slate-400">Durée (mois)</p>
                          <p className="font-bold text-slate-800">{f.duree_mois != null ? f.duree_mois : '—'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Dossiers financiers ── */}
        {tab === 'dossiers' && (
          <Panel title="Dossiers financiers" bodyClassName="p-6">
            {loading ? (
              <DashboardSpinner />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Candidat</th>
                      <th className="hidden sm:table-cell">Formation</th>
                      <th>Statut péda</th>
                      <th className="text-right">Montant</th>
                      <th>Validation financière</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dossiers.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <div className="font-medium text-slate-800">{d.prenom} {d.nom}</div>
                          <div className="text-xs text-slate-400">{d.email}</div>
                        </td>
                        <td className="hidden max-w-xs truncate text-xs text-slate-700 sm:table-cell">{d.formation_titre}</td>
                        <td>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${d.statut === 'accepte' ? 'bg-emerald-100 text-emerald-700' : d.statut === 'refuse' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {d.statut}
                          </span>
                        </td>
                        <td className="text-right font-semibold text-blue-700">{fmt(d.montant)} FCFA</td>
                        <td>
                          <select
                            className={`rounded-lg border px-2 py-1 text-xs font-semibold ${d.validation_financiere === 'recevable' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : d.validation_financiere === 'non_recevable' ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-300 text-slate-600'}`}
                            value={d.validation_financiere || ''}
                            onChange={(e) => handleValidationFinanciere(d.id, e.target.value)}
                          >
                            <option value="">Non défini</option>
                            <option value="recevable">✅ Recevable</option>
                            <option value="en_attente">⏳ En attente</option>
                            <option value="non_recevable">❌ Non recevable</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {dossiers.length === 0 && <div className="py-10 text-center text-slate-400">Aucun dossier trouvé.</div>}
              </div>
            )}
          </Panel>
        )}
    </DashboardPage>
  )
}
