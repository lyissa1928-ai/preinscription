import { useEffect, useState } from 'react'
import axios from 'axios'

const TYPES = [
  '',
  'rate_limit_block',
  'recaptcha_verification_failed',
  'auth_login_failed',
  'auth_login_disabled_account',
  'auth_reset_matricule_not_found',
  'auth_reset_matricule_disabled_account',
]
const SEVERITIES = ['', 'warning', 'critical', 'info']

export default function AdminSecurityEvents() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 30, totalPages: 1 })
  const [filters, setFilters] = useState({ q: '', type: '', severity: '' })

  const load = async (targetPage = page) => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/admin/security-events', {
        params: {
          page: targetPage,
          limit: 30,
          q: filters.q || undefined,
          type: filters.type || undefined,
          severity: filters.severity || undefined,
        },
      })
      setItems(data.items || [])
      setPagination(data.pagination || { total: 0, page: 1, limit: 30, totalPages: 1 })
      setPage(targetPage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1) }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Événements sécurité</h1>
        <p className="text-sm text-gray-500">Brute-force, rate-limit et incidents d’authentification.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          className="input-field"
          placeholder="Recherche (ip, route, détails...)"
          value={filters.q}
          onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
        />
        <select className="input-field" value={filters.type} onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}>
          {TYPES.map((x) => <option key={x || 'all'} value={x}>{x || 'Tous types'}</option>)}
        </select>
        <select className="input-field" value={filters.severity} onChange={(e) => setFilters((p) => ({ ...p, severity: e.target.value }))}>
          {SEVERITIES.map((x) => <option key={x || 'all'} value={x}>{x || 'Toutes sévérités'}</option>)}
        </select>
        <button className="btn-primary" onClick={() => load(1)} disabled={loading}>
          {loading ? 'Chargement...' : 'Filtrer'}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 text-sm text-gray-600">{pagination.total} événement(s)</div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Sévérité</th>
                <th className="px-4 py-2">IP</th>
                <th className="px-4 py-2">Utilisateur</th>
                <th className="px-4 py-2">Route</th>
                <th className="px-4 py-2">Détails</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td className="px-4 py-8 text-center text-gray-400" colSpan={7}>Aucun événement.</td></tr>
              ) : items.map((it) => (
                <tr key={it.id} className="border-b border-gray-50 align-top">
                  <td className="px-4 py-2 whitespace-nowrap">{new Date(it.created_at).toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-2 font-semibold text-gray-800">{it.type}</td>
                  <td className="px-4 py-2">{it.severity}</td>
                  <td className="px-4 py-2">{it.ip || '—'}</td>
                  <td className="px-4 py-2 text-xs text-gray-600">#{it.user_id ?? '—'} ({it.user_role || '—'})</td>
                  <td className="px-4 py-2 text-xs text-gray-600 break-all">{it.method} {it.path}</td>
                  <td className="px-4 py-2">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap break-words max-w-[380px]">{it.details ? JSON.stringify(it.details) : '—'}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <button className="btn-secondary text-sm" disabled={loading || page <= 1} onClick={() => load(page - 1)}>Précédent</button>
          <span className="text-sm text-gray-500">Page {pagination.page} / {pagination.totalPages}</span>
          <button className="btn-secondary text-sm" disabled={loading || page >= pagination.totalPages} onClick={() => load(page + 1)}>Suivant</button>
        </div>
      </div>
    </div>
  )
}

