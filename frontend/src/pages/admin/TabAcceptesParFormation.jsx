import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function lienDossier(role, dossierId) {
  if (role === 'admin') return `/admin/dossier/${dossierId}`
  if (role === 'responsable') return `/responsable/dossier/${dossierId}`
  if (role === 'agent_admin') return `/agent-admin/dossier/${dossierId}`
  return null
}

function typeLabel(t) {
  if (t === 'en_ligne') return 'Distance (FAD)'
  if (t === 'presentiel') return 'Présentiel'
  return t || 'Non précisé'
}

function niveauKey(n) {
  return String(n || '').trim() || 'Sans niveau'
}

export function TabAcceptesParFormation({ etabId }) {
  const { user } = useAuth()
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [openKey, setOpenKey] = useState(null)
  const [typeFilter, setTypeFilter] = useState('')
  const [niveauFilter, setNiveauFilter] = useState('')
  const [exporting, setExporting] = useState(null)

  const load = useCallback(() => {
    if (!etabId) return
    setLoading(true)
    axios
      .get(`/api/etablissements/${etabId}/acceptes-par-formation`)
      .then(({ data }) => setPayload(data))
      .catch(() => toast.error('Chargement impossible.'))
      .finally(() => setLoading(false))
  }, [etabId])

  useEffect(() => { load() }, [load])

  const listes = payload?.listes || []
  const role = user?.role

  const classes = useMemo(() => {
    const map = new Map()
    listes.forEach((bloc) => {
      const niveau = niveauKey(bloc.niveau)
      const type = bloc.type === 'en_ligne' || bloc.type === 'presentiel' ? bloc.type : 'autre'
      if (typeFilter && type !== typeFilter) return
      if (niveauFilter && niveau !== niveauFilter) return
      const key = `${niveau}||${type}`
      if (!map.has(key)) map.set(key, { key, niveau, type, etudiants: [] })
      const c = map.get(key)
      ;(bloc.etudiants || []).forEach((e) => {
        c.etudiants.push({ ...e, formation_titre: bloc.titre, formation_id: bloc.formation_id })
      })
    })
    return [...map.values()]
      .map((c) => ({ ...c, count: c.etudiants.length }))
      .sort((a, b) => {
        const n = String(a.niveau).localeCompare(String(b.niveau), 'fr')
        return n !== 0 ? n : String(a.type).localeCompare(String(b.type), 'fr')
      })
  }, [listes, typeFilter, niveauFilter])

  const niveauxDisponibles = useMemo(() => {
    return [...new Set(listes.map((b) => niveauKey(b.niveau)))].sort((a, b) => a.localeCompare(b, 'fr'))
  }, [listes])

  const exportClasse = async (classe) => {
    setExporting(classe.key)
    try {
      const { data } = await axios.get(`/api/etablissements/${etabId}/acceptes-par-classe/export-xlsx`, {
        params: {
          niveau: classe.niveau,
          ...((classe.type === 'presentiel' || classe.type === 'en_ligne') ? { type: classe.type } : {}),
        },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(new Blob([data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `classe-${classe.niveau}-${classe.type}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Excel ${classe.niveau} — ${typeLabel(classe.type)}`)
    } catch (e) {
      if (e?.response?.data instanceof Blob) {
        try {
          toast.error(JSON.parse(await e.response.data.text())?.message || 'Export impossible')
          return
        } catch { /* ignore */ }
      }
      toast.error('Export Excel impossible')
    } finally {
      setExporting(null)
    }
  }

  if (!etabId) return null
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">Acceptés par classe</h2>
        <button type="button" onClick={load} className="btn-secondary text-sm">Actualiser</button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select className="input-field py-2 text-sm" value={niveauFilter} onChange={(e) => setNiveauFilter(e.target.value)}>
          <option value="">Tous les niveaux</option>
          {niveauxDisponibles.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select className="input-field py-2 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Présentiel & distance</option>
          <option value="presentiel">Présentiel</option>
          <option value="en_ligne">Distance (FAD)</option>
        </select>
      </div>

      {classes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
          Aucun accepté pour ces filtres.
        </div>
      ) : (
        <ul className="space-y-2">
          {classes.map((c) => {
            const open = openKey === c.key
            return (
              <li key={c.key} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3 py-2.5">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpenKey(open ? null : c.key)}>
                    <span className="font-bold text-slate-900">{c.niveau}</span>
                    <span className="mx-2 text-slate-300">·</span>
                    <span className="text-sm font-semibold text-orange-700">{typeLabel(c.type)}</span>
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">{c.count}</span>
                  </button>
                  <button
                    type="button"
                    disabled={exporting === c.key || c.count === 0}
                    onClick={() => exportClasse(c)}
                    className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100 disabled:opacity-40"
                  >
                    {exporting === c.key ? '…' : 'Excel classe'}
                  </button>
                </div>
                {open && (
                  <div className="max-h-[280px] overflow-auto border-t border-slate-100">
                    {c.etudiants.length === 0 ? (
                      <p className="py-6 text-center text-sm text-slate-400">Aucun étudiant</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white text-xs text-slate-500">
                          <tr>
                            <th className="px-3 py-2 text-left">Étudiant</th>
                            <th className="hidden px-3 py-2 text-left sm:table-cell">Formation</th>
                            <th className="px-3 py-2 text-left">Dossier</th>
                            <th className="px-3 py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {c.etudiants.map((row) => {
                            const href = lienDossier(role, row.dossier_id)
                            return (
                              <tr key={`${row.dossier_id}-${row.formation_id}`}>
                                <td className="px-3 py-2 font-medium text-slate-900">
                                  {row.prenom} {row.nom}
                                  <div className="text-[11px] text-slate-400">{fmtDate(row.date_acceptation)}</div>
                                </td>
                                <td className="hidden max-w-[180px] truncate px-3 py-2 text-slate-600 sm:table-cell">{row.formation_titre}</td>
                                <td className="px-3 py-2 font-mono text-xs text-slate-500">{row.numero_dossier || '—'}</td>
                                <td className="px-3 py-2 text-right">
                                  <div className="flex justify-end gap-1">
                                    {href && <Link to={href} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">Dossier</Link>}
                                    <Link to={`/facture/${row.dossier_id}`} className="rounded-md bg-orange-500 px-2 py-1 text-xs font-bold text-white">Facture</Link>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
