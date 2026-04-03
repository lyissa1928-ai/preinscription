import { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function AdminMaintenance() {
  const [cfg, setCfg] = useState(null)
  const [form, setForm] = useState({
    audit_logs_days: '',
    security_events_days: '',
    notifications_days: '',
    read_notifications_days: '',
    backup_max_files: '',
  })
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [dryRun, setDryRun] = useState(true)
  const [preBackup, setPreBackup] = useState(true)
  const [lastResult, setLastResult] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/admin/maintenance/retention')
      setCfg(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const runPrune = async () => {
    setRunning(true)
    try {
      const payload = {}
      Object.entries(form).forEach(([k, v]) => {
        if (String(v).trim() !== '') payload[k] = parseInt(v, 10)
      })
      payload.dry_run = dryRun
      payload.pre_backup = preBackup
      const { data } = await axios.post('/api/admin/maintenance/prune', payload)
      setLastResult({
        report: data.report || null,
        pre_backup: data.pre_backup || null,
        result: data.result || null,
      })
      toast.success(data.message || 'Maintenance terminée.')
      await load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur pendant la maintenance')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Maintenance & Rétention</h1>
        <p className="text-sm text-gray-500">Purge opérationnelle des logs, événements sécurité, notifications et backups.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        {loading ? (
          <p className="text-sm text-gray-500">Chargement configuration...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <Info label="Audit logs (jours)" value={cfg?.audit_logs_days} />
            <Info label="Security events (jours)" value={cfg?.security_events_days} />
            <Info label="Notifications (jours)" value={cfg?.notifications_days} />
            <Info label="Notifications lues (jours)" value={cfg?.read_notifications_days} />
            <Info label="Backups max fichiers" value={cfg?.backup_max_files} />
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
        <p className="text-sm text-gray-700">Override ponctuel (optionnel)</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.keys(form).map((k) => (
            <label key={k} className="text-xs text-gray-500">
              {k}
              <input
                type="number"
                min="1"
                className="input-field mt-1"
                value={form[k]}
                onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                placeholder="laisser vide"
              />
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
            Exécuter en simulation (dry-run)
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={preBackup}
              onChange={(e) => setPreBackup(e.target.checked)}
              disabled={dryRun}
            />
            Backup avant purge réelle
          </label>
        </div>
        <button className="btn-primary" onClick={runPrune} disabled={running}>
          {running ? 'Maintenance en cours...' : (dryRun ? 'Lancer une simulation' : 'Lancer la purge')}
        </button>
      </div>

      {lastResult && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="font-semibold text-gray-900 mb-2">Dernier résultat</p>
          {lastResult.report && (
            <div className="text-sm text-gray-600 mb-2">
              Type: <strong>{lastResult.report.type}</strong> · Total: <strong>{lastResult.report.total_removed}</strong>
            </div>
          )}
          {lastResult.pre_backup && (
            <p className="text-xs text-emerald-700 mb-2">Backup pré-purge: {lastResult.pre_backup}</p>
          )}
          <pre className="text-xs text-gray-600 whitespace-pre-wrap break-words">{JSON.stringify(lastResult.result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-semibold text-gray-800">{value ?? '—'}</p>
    </div>
  )
}

