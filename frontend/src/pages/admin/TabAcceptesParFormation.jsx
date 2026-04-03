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

export function TabAcceptesParFormation({ etabId }) {
  const { user } = useAuth()
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [openIds, setOpenIds] = useState(() => new Set())
  const [filiereFilterId, setFiliereFilterId] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const load = useCallback(() => {
    if (!etabId) return
    setLoading(true)
    axios
      .get(`/api/etablissements/${etabId}/acceptes-par-formation`)
      .then(({ data }) => setPayload(data))
      .catch(() => toast.error('Impossible de charger les listes par formation.'))
      .finally(() => setLoading(false))
  }, [etabId])

  useEffect(() => {
    load()
  }, [load])

  const toggleOpen = (formationId) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(formationId)) next.delete(formationId)
      else next.add(formationId)
      return next
    })
  }

  const expandAll = () => {
    const listes = payload?.listes || []
    if (openIds.size === listes.length) setOpenIds(new Set())
    else setOpenIds(new Set(listes.map((l) => l.formation_id)))
  }

  const exportFiliereXlsx = async (filiereId, filiereNom) => {
    try {
      if (!filiereId || Number(filiereId) <= 0) {
        toast.error("Export XLSX indisponible pour une filière non définie.")
        return
      }
      const { data } = await axios.get(
        `/api/etablissements/${etabId}/acceptes-par-formation/export-xlsx`,
        {
          params: { filiere_id: filiereId, ...(typeFilter ? { type: typeFilter } : {}) },
          responseType: 'blob',
        }
      )
      const url = URL.createObjectURL(new Blob([data]))
      const a = document.createElement('a')
      const slug = String(filiereNom || 'filiere').toLowerCase().replace(/\s+/g, '-')
      a.href = url
      a.download = `acceptes-${slug}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success(`Export filière "${filiereNom}" prêt.`)
    } catch (e) {
      // Les erreurs backend reviennent en blob avec responseType: 'blob'
      if (e?.response?.data instanceof Blob) {
        try {
          const txt = await e.response.data.text()
          const parsed = JSON.parse(txt)
          toast.error(parsed?.message || "Impossible d'exporter cette filière.")
          return
        } catch {
          // fallback standard
        }
      }
      toast.error(e?.response?.data?.message || "Impossible d'exporter cette filière.")
    }
  }

  const exportFiliereCsv = (filiere) => {
    const formations = filiere?.formations || []
    const rows = []
    formations.forEach((bloc) => {
      ;(bloc.etudiants || []).forEach((row) => {
        rows.push({
          filiere: filiere.filiere_nom || '',
          formation: bloc.titre || '',
          niveau: bloc.niveau || '',
          type: bloc.type || '',
          prenom: row.prenom || '',
          nom: row.nom || '',
          email: row.email || '',
          matricule: row.matricule || '',
          numero_dossier: row.numero_dossier || '',
          date_acceptation: row.date_acceptation || '',
        })
      })
    })
    if (rows.length === 0) {
      toast.error('Aucun étudiant accepté à exporter pour cette filière.')
      return
    }
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const headers = ['Filière', 'Formation', 'Niveau', 'Type', 'Prénom', 'Nom', 'Email', 'Matricule', 'Numéro dossier', 'Date acceptation']
    const content = [
      headers.join(';'),
      ...rows.map((r) => [
        esc(r.filiere), esc(r.formation), esc(r.niveau), esc(r.type), esc(r.prenom),
        esc(r.nom), esc(r.email), esc(r.matricule), esc(r.numero_dossier), esc(r.date_acceptation),
      ].join(';')),
    ].join('\n')
    const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const slug = String(filiere.filiere_nom || 'filiere').toLowerCase().replace(/\s+/g, '-')
    a.href = url
    a.download = `acceptes-${slug}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.success(`CSV filière "${filiere.filiere_nom}" généré.`)
  }

  const exportCsv = () => {
    const listesData = payload?.listes || []
    const rows = []
    listesData.forEach((bloc) => {
      ;(bloc.etudiants || []).forEach((row) => {
        rows.push({
          formation: bloc.titre || '',
          niveau: bloc.niveau || '',
          type: bloc.type || '',
          prenom: row.prenom || '',
          nom: row.nom || '',
          email: row.email || '',
          matricule: row.matricule || '',
          numero_dossier: row.numero_dossier || '',
          date_acceptation: row.date_acceptation || '',
        })
      })
    })

    if (rows.length === 0) {
      toast.error('Aucun étudiant accepté à exporter en CSV.')
      return
    }

    const headers = [
      'Formation',
      'Niveau',
      'Type',
      'Prénom',
      'Nom',
      'Email',
      'Matricule',
      'Numéro dossier',
      'Date acceptation',
    ]
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const content = [
      headers.join(';'),
      ...rows.map((r) => [
        esc(r.formation),
        esc(r.niveau),
        esc(r.type),
        esc(r.prenom),
        esc(r.nom),
        esc(r.email),
        esc(r.matricule),
        esc(r.numero_dossier),
        esc(r.date_acceptation),
      ].join(';')),
    ].join('\n')

    const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `acceptes-par-formation-${stamp}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.success('Export CSV généré.')
  }

  const listes = payload?.listes || []
  const role = user?.role
  const filieres = useMemo(() => {
    const byId = new Map()
    listes.forEach((bloc) => {
      const fid = Number(bloc.filiere_id || 0)
      const key = Number.isNaN(fid) ? 0 : fid
      if (!byId.has(key)) {
        byId.set(key, {
          filiere_id: key,
          filiere_nom: bloc.filiere_nom || 'Sans filière',
          formations: [],
          total_acceptes: 0,
        })
      }
      const target = byId.get(key)
      target.formations.push(bloc)
      target.total_acceptes += Number(bloc.count || 0)
    })
    return [...byId.values()].sort((a, b) =>
      String(a.filiere_nom || '').localeCompare(String(b.filiere_nom || ''), 'fr', { sensitivity: 'base' })
    )
  }, [listes])

  const visibleFilieres = useMemo(() => {
    let list = filieres
    if (filiereFilterId) {
      list = list.filter((f) => String(f.filiere_id) === String(filiereFilterId))
    }
    if (!typeFilter) return list
    return list
      .map((f) => {
        const formations = (f.formations || []).filter((x) => String(x.type || '') === typeFilter)
        return {
          ...f,
          formations,
          total_acceptes: formations.reduce((s, x) => s + Number(x.count || 0), 0),
        }
      })
      .filter((f) => f.formations.length > 0)
  }, [filieres, filiereFilterId, typeFilter])

  if (!etabId) return null

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-700 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Préinscriptions acceptées par formation</h2>
          <p className="text-sm text-gray-500 mt-1">
            Affichage regroupé par filière pour réduire la longueur de page. Chaque filière contient ses formations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={load} className="text-sm font-semibold px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            Actualiser
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="text-sm font-semibold px-3 py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            Télécharger CSV (lot)
          </button>
          {listes.length > 0 && (
            <button type="button" onClick={expandAll} className="text-sm font-semibold px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
              {openIds.size === listes.length ? 'Tout replier' : 'Tout déplier'}
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Filtrer les filières</label>
            <select
              className="input-field"
              value={filiereFilterId}
              onChange={(e) => setFiliereFilterId(e.target.value)}
            >
              <option value="">Toutes les filières</option>
              {filieres.map((f) => (
                <option key={f.filiere_id} value={String(f.filiere_id)}>
                  {f.filiere_nom} ({f.formations.length} formation{f.formations.length > 1 ? 's' : ''})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Filtrer par mode</label>
            <select className="input-field" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">Tous les modes</option>
              <option value="presentiel">Présentiel</option>
              <option value="en_ligne">FAD</option>
            </select>
          </div>
        </div>
      </div>

      {listes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-8 text-center text-gray-500 text-sm">
          Aucune formation enregistrée pour cet établissement. Créez des formations pour voir les listes
          d’étudiants acceptés.
        </div>
      ) : visibleFilieres.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-8 text-center text-gray-500 text-sm">
          Aucune filière ne correspond au filtre.
        </div>
      ) : (
        <ul className="space-y-3">
          {visibleFilieres.map((f) => {
            return (
              <li
                key={`filiere-${f.filiere_id}`}
                className="rounded-xl border border-gray-200 bg-white overflow-hidden"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 truncate">{f.filiere_nom}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {f.formations.length} formation(s) · {f.total_acceptes} accepté(s)
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => exportFiliereCsv(f)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      Export CSV filière
                    </button>
                    <button
                      type="button"
                      onClick={() => exportFiliereXlsx(f.filiere_id, f.filiere_nom)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                      Export filière (1 feuille/formation)
                    </button>
                  </div>
                </div>

                <ul className="space-y-3 p-3">
                  {f.formations.map((bloc) => {
                    const expanded = openIds.has(bloc.formation_id)
                    const typeLabel =
                      bloc.type === 'en_ligne' ? 'FAD' : bloc.type === 'presentiel' ? 'Présentiel' : bloc.type || ''
                    return (
                      <li key={bloc.formation_id} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                        <button
                          type="button"
                          onClick={() => toggleOpen(bloc.formation_id)}
                          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50/80 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900 truncate">{bloc.titre}</div>
                            <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-2 gap-y-0">
                              {typeLabel && <span>{typeLabel}</span>}
                              {bloc.niveau && <span>· {bloc.niveau}</span>}
                              {bloc.actif === false && <span className="text-amber-600">· Formation inactive</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">
                              {bloc.count} accepté{bloc.count !== 1 ? 's' : ''}
                            </span>
                            <span className="text-gray-400 text-lg">{expanded ? '▼' : '▶'}</span>
                          </div>
                        </button>

                        {expanded && (
                          <div className="border-t border-gray-100 px-2 pb-3">
                            {bloc.etudiants.length === 0 ? (
                              <p className="text-sm text-gray-500 py-6 text-center">Aucun étudiant accepté pour cette formation.</p>
                            ) : (
                              <div className="overflow-x-auto mt-2">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-left text-gray-500 border-b border-gray-100">
                                      <th className="py-2 px-2 font-semibold">Étudiant</th>
                                      <th className="py-2 px-2 font-semibold hidden sm:table-cell">Email</th>
                                      <th className="py-2 px-2 font-semibold hidden md:table-cell">Matricule</th>
                                      <th className="py-2 px-2 font-semibold">N° dossier</th>
                                      <th className="py-2 px-2 font-semibold hidden lg:table-cell">Accepté le</th>
                                      <th className="py-2 px-2 font-semibold text-right">Liens</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {bloc.etudiants.map((row) => {
                                      const hrefDossier = lienDossier(role, row.dossier_id)
                                      return (
                                        <tr key={row.dossier_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                          <td className="py-2 px-2 font-medium text-gray-900">
                                            {row.prenom} {row.nom}
                                          </td>
                                          <td className="py-2 px-2 text-gray-600 hidden sm:table-cell">{row.email || '—'}</td>
                                          <td className="py-2 px-2 text-gray-600 hidden md:table-cell">{row.matricule || '—'}</td>
                                          <td className="py-2 px-2 text-gray-700 font-mono text-xs">{row.numero_dossier || '—'}</td>
                                          <td className="py-2 px-2 text-gray-600 hidden lg:table-cell">{fmtDate(row.date_acceptation)}</td>
                                          <td className="py-2 px-2 text-right whitespace-nowrap">
                                            {hrefDossier ? (
                                              <Link to={hrefDossier} className="text-blue-700 font-semibold hover:underline text-xs mr-2">
                                                Dossier
                                              </Link>
                                            ) : null}
                                            <Link
                                              to={`/facture/${row.dossier_id}`}
                                              className="text-blue-700 font-semibold hover:underline text-xs"
                                            >
                                              Facture
                                            </Link>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
