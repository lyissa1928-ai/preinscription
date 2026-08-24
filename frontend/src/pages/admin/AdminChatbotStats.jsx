import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { DashboardPage, DashboardHero, Panel } from '../../components/dashboard/DashboardChrome'

const EMPTY_CONTACT = { label: '', nom: '', email: '', telephone: '' }

/** Admin : configuration + statistiques de l’accueil virtuel. */
export default function AdminChatbotStats() {
  const [tab, setTab] = useState('config')
  const [stats, setStats] = useState(null)
  const [days, setDays] = useState(30)
  const [etabId, setEtabId] = useState('')
  const [etabs, setEtabs] = useState([])
  const [config, setConfig] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadConfig = () => {
    setLoading(true)
    const q = etabId ? `?etablissement_id=${etabId}` : ''
    axios
      .get(`/api/chatbot/admin/config${q}`)
      .then(({ data }) => {
        setConfig(data.config)
        setEtabs(data.etablissements || [])
      })
      .catch(() => toast.error('Impossible de charger la configuration'))
      .finally(() => setLoading(false))
  }

  const loadStats = () => {
    const params = new URLSearchParams({ days: String(days) })
    if (etabId) params.set('etablissement_id', etabId)
    axios
      .get(`/api/chatbot/admin/stats?${params}`)
      .then(({ data }) => setStats(data))
      .catch(() => setStats(null))
  }

  useEffect(() => {
    loadConfig()
  }, [etabId])

  useEffect(() => {
    if (tab === 'stats') loadStats()
  }, [tab, days, etabId])

  const up = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setConfig((c) => ({ ...c, [key]: val }))
  }

  const upContact = (service, field) => (e) => {
    setConfig((c) => ({
      ...c,
      contacts: {
        ...c.contacts,
        [service]: { ...(c.contacts?.[service] || EMPTY_CONTACT), [field]: e.target.value },
      },
    }))
  }

  const save = async () => {
    setSaving(true)
    try {
      const body = {
        ...config,
        etablissement_id: etabId === '' ? null : Number(etabId),
      }
      const { data } = await axios.put('/api/chatbot/admin/config', body)
      setConfig(data.config)
      toast.success('Configuration enregistrée')
    } catch {
      toast.error('Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Administration"
        title="Accueil virtuel"
        subtitle="Configurez l’assistant d’accueil, les contacts publics et consultez les statistiques."
        actions={
          <select
            className="input-field w-auto max-w-xs text-sm"
            value={etabId}
            onChange={(e) => setEtabId(e.target.value)}
          >
            <option value="">Configuration globale</option>
            {etabs.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nom}
              </option>
            ))}
          </select>
        }
      />

      <div className="mb-6 flex gap-2">
        {[
          { id: 'config', label: 'Configuration' },
          { id: 'stats', label: 'Statistiques' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${
              tab === t.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'config' && (
        <div className="space-y-6">
          {loading || !config ? (
            <p className="text-sm text-slate-500">Chargement…</p>
          ) : (
            <>
              <Panel title="Comportement général" bodyClassName="space-y-4 p-5">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={!!config.enabled} onChange={up('enabled')} />
                  Chatbot activé
                </label>
                <div>
                  <label className="mb-1 block text-sm font-semibold">Nom de l’assistant</label>
                  <input className="input-field" value={config.assistant_name || ''} onChange={up('assistant_name')} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">Message d’accueil</label>
                  <textarea
                    className="input-field min-h-[90px]"
                    value={config.welcome_message || ''}
                    onChange={up('welcome_message')}
                    placeholder="Laisser vide pour le message automatique"
                  />
                </div>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={!!config.expose_staff_contacts}
                    onChange={up('expose_staff_contacts')}
                  />
                  <span>
                    <strong>Autoriser l’affichage des e-mails staff</strong> (responsable désigné / rôle
                    responsable) aux visiteurs. Sinon, seuls les contacts publics ci-dessous et l’e-mail
                    établissement sont utilisés.
                  </span>
                </label>
              </Panel>

              <Panel title="Contacts publics (visiteurs)" bodyClassName="space-y-5 p-5">
                {['scolarite', 'pedagogie', 'finance', 'etablissement'].map((key) => {
                  const c = config.contacts?.[key] || EMPTY_CONTACT
                  const titles = {
                    scolarite: 'Scolarité / Accueil',
                    pedagogie: 'Responsable pédagogique',
                    finance: 'Service financier',
                    etablissement: 'Responsable d’établissement',
                  }
                  return (
                    <div key={key} className="rounded-xl border border-slate-200 p-4">
                      <p className="mb-3 text-sm font-bold text-slate-800">{titles[key]}</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          className="input-field"
                          placeholder="Libellé"
                          value={c.label || ''}
                          onChange={upContact(key, 'label')}
                        />
                        <input
                          className="input-field"
                          placeholder="Nom affiché"
                          value={c.nom || ''}
                          onChange={upContact(key, 'nom')}
                        />
                        <input
                          className="input-field"
                          placeholder="E-mail public"
                          value={c.email || ''}
                          onChange={upContact(key, 'email')}
                        />
                        <input
                          className="input-field"
                          placeholder="Téléphone"
                          value={c.telephone || ''}
                          onChange={upContact(key, 'telephone')}
                        />
                      </div>
                    </div>
                  )
                })}
              </Panel>

              <div className="flex justify-end">
                <button type="button" className="btn-primary" onClick={save} disabled={saving}>
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'stats' && stats && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <select className="input-field w-auto text-sm" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={7}>7 jours</option>
              <option value={30}>30 jours</option>
              <option value={90}>90 jours</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-2xl font-black tabular-nums">{stats.total_turns}</p>
              <p className="text-sm text-slate-600">Messages</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-2xl font-black tabular-nums text-amber-600">{stats.no_match}</p>
              <p className="text-sm text-slate-600">Sans correspondance</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-2xl font-black tabular-nums">{stats.off_topic}</p>
              <p className="text-sm text-slate-600">Hors sujet</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-2xl font-black tabular-nums">{Object.keys(stats.intents || {}).length}</p>
              <p className="text-sm text-slate-600">Intentions</p>
            </div>
          </div>
          <Panel title="Formations les plus évoquées" bodyClassName="p-4">
            {(stats.top_formations || []).length === 0 ? (
              <p className="text-sm text-slate-500">Pas encore de données.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {stats.top_formations.map((f) => (
                  <li key={f.formation_id} className="flex justify-between py-2">
                    <span>{f.titre || `Formation #${f.formation_id}`}</span>
                    <span className="font-bold tabular-nums">{f.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Questions sans réponse catalogue" bodyClassName="p-4">
            {(stats.recent_unanswered || []).length === 0 ? (
              <p className="text-sm text-slate-500">Aucune pour la période.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {stats.recent_unanswered.map((u, i) => (
                  <li key={`${u.at}-${i}`} className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-slate-800">{u.preview}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {u.at} · {u.intent}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </DashboardPage>
  )
}
