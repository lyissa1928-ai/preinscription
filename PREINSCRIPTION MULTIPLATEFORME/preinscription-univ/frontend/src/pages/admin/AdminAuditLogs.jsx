import { useEffect, useState } from 'react'
import axios from 'axios'

const ACTIONS = [
  '', 'create', 'update', 'deactivate', 'delete_hard', 'batch_upsert', 'batch_delete',
  'membre_staff_cree', 'membre_staff_modifie', 'membre_staff_desactive',
]
const ENTITIES = ['', 'formation', 'etablissement']
const USER_ROLES = ['', 'admin_etablissement', 'responsable', 'admin']

export default function AdminAuditLogs() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 30, totalPages: 1 })
  const [filters, setFilters] = useState({ q: '', action: '', entity: '', user_role: '' })

  const fetchLogs = async (targetPage = page) => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/admin/audit-logs', {
        params: {
          page: targetPage,
          limit: 30,
          q: filters.q || undefined,
          action: filters.action || undefined,
          entity: filters.entity || undefined,
          user_role: filters.user_role || undefined,
        },
      })
      setItems(data.items || [])
      setPagination(data.pagination || { total: 0, page: 1, limit: 30, totalPages: 1 })
      setPage(targetPage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fmtDate = (d) => {
    try { return new Date(d).toLocaleString('fr-FR') } catch { return d || '—' }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Journal d'audit</h1>
          <p className="text-sm text-gray-500">Traçabilité des actions — y compris celles des administrateurs établissement</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input
          className="input-field"
          placeholder="Recherche libre (action, route, détails...)"
          value={filters.q}
          onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
        />
        <select className="input-field" value={filters.action} onChange={(e) => setFilters((p) => ({ ...p, action: e.target.value }))}>
          {ACTIONS.map((x) => <option key={x || 'all'} value={x}>{x || 'Toutes actions'}</option>)}
        </select>
        <select className="input-field" value={filters.entity} onChange={(e) => setFilters((p) => ({ ...p, entity: e.target.value }))}>
          {ENTITIES.map((x) => <option key={x || 'all'} value={x}>{x || 'Toutes entités'}</option>)}
        </select>
        <select className="input-field" value={filters.user_role} onChange={(e) => setFilters((p) => ({ ...p, user_role: e.target.value }))}>
          {USER_ROLES.map((x) => <option key={x || 'all'} value={x}>{x ? `Rôle : ${x}` : 'Tous rôles acteurs'}</option>)}
        </select>
        <button className="btn-primary" onClick={() => fetchLogs(1)} disabled={loading}>
          {loading ? 'Chargement...' : 'Filtrer'}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 text-sm text-gray-600">
          {pagination.total} entrée(s)
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Entité</th>
                <th className="px-4 py-2">ID entité</th>
                <th className="px-4 py-2">Utilisateur</th>
                <th className="px-4 py-2">Route</th>
                <th className="px-4 py-2">Détails</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td className="px-4 py-8 text-center text-gray-400" colSpan={7}>Aucun log.</td></tr>
              ) : items.map((it) => (
                <tr key={it.id} className={`border-b border-gray-50 align-top ${it.user_role === 'admin_etablissement' ? 'bg-blue-50/40' : ''}`}>
                  <td className="px-4 py-2 whitespace-nowrap">{fmtDate(it.created_at)}</td>
                  <td className="px-4 py-2 font-semibold text-gray-800">{it.action || '—'}</td>
                  <td className="px-4 py-2">{it.entity || '—'}</td>
                  <td className="px-4 py-2">{it.entity_id ?? '—'}</td>
                  <td className="px-4 py-2">
                    <div className="text-gray-800">#{it.user_id ?? '—'}</div>
                    <div className="text-xs text-gray-500">{it.user_role || '—'}</div>
                  </td>
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
          <button
            className="btn-secondary text-sm"
            disabled={loading || page <= 1}
            onClick={() => fetchLogs(page - 1)}
          >
            Précédent
          </button>
          <span className="text-sm text-gray-500">Page {pagination.page} / {pagination.totalPages}</span>
          <button
            className="btn-secondary text-sm"
            disabled={loading || page >= pagination.totalPages}
            onClick={() => fetchLogs(page + 1)}
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  )
}

