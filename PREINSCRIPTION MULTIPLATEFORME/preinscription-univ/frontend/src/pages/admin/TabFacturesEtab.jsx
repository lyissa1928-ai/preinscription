import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { downloadFacturesPdfBatch } from '../../utils/downloadFacturesPdf'
import CreerProformaModal from '../../components/CreerProformaModal'
import { titreTypeDocument } from '../../utils/factureTypeDocument'

const PAGE_SIZE = 10
const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0)
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function DocumentLinks({ dossierId, attestationDisponible, lettreDisponible }) {
  if (!dossierId) return null
  return (
    <>
      {attestationDisponible && (
        <Link
          to={`/attestation/${dossierId}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-indigo-200 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
        >
          Attestation
        </Link>
      )}
      {lettreDisponible && (
        <Link
          to={`/lettre/${dossierId}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
        >
          Lettre
        </Link>
      )}
    </>
  )
}

export function TabFacturesEtab({ etabId, etabNom }) {
  const [list, setList] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(() => new Set())
  const [busy, setBusy] = useState(false)
  const [creerOpen, setCreerOpen] = useState(false)
  const selectAllRef = useRef(null)

  useEffect(() => { setPage(1) }, [etabId])

  const load = useCallback(() => {
    if (!etabId) return
    setLoading(true)
    axios
      .get(`/api/etablissements/${etabId}/factures`, {
        params: { page, limit: PAGE_SIZE },
      })
      .then(({ data }) => {
        setList(Array.isArray(data.items) ? data.items : [])
        setTotal(Number(data.total) || 0)
        setTotalPages(Math.max(1, Number(data.totalPages) || 1))
        if (typeof data.page === 'number' && data.page >= 1) setPage(data.page)
      })
      .catch(() => toast.error('Impossible de charger les factures.'))
      .finally(() => setLoading(false))
  }, [etabId, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setSelected(new Set()) }, [page])

  const pageIds = list.map((f) => f.id)
  const allSelected = list.length > 0 && pageIds.every((id) => selected.has(id))
  const someSelected = pageIds.some((id) => selected.has(id)) && !allSelected

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected
  }, [someSelected])

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const pdfItems = () => list.filter((f) => selected.has(f.id))

  const handlePdfSelection = async () => {
    const items = pdfItems()
    if (!items.length) return toast.error('Sélectionnez au moins une facture.')
    setBusy(true)
    try {
      await downloadFacturesPdfBatch(items, { etabNom })
      toast.success(`${items.length} PDF généré(s)`)
    } catch (e) {
      toast.error(e.message || 'Export PDF impossible')
    } finally {
      setBusy(false)
    }
  }

  const handlePdfOne = async (f) => {
    setBusy(true)
    try {
      await downloadFacturesPdfBatch([f], { etabNom })
    } catch (e) {
      toast.error(e.message || 'PDF impossible')
    } finally {
      setBusy(false)
    }
  }

  const runDelete = async (ids) => {
    if (!ids.length) return toast.error('Sélectionnez au moins une facture.')
    if (!window.confirm(`Supprimer ${ids.length} facture(s) ?`)) return
    setBusy(true)
    try {
      const { data } = await axios.post(`/api/etablissements/${etabId}/factures/delete-batch`, { ids })
      toast.success(data.message || 'Supprimé.')
      setSelected(new Set())
      load()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur suppression')
    } finally {
      setBusy(false)
    }
  }

  if (loading && list.length === 0 && total === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    )
  }

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total)

  return (
    <div className="space-y-4">
      <CreerProformaModal open={creerOpen} onClose={() => setCreerOpen(false)} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">
          {total} facture{total > 1 ? 's' : ''}
          {total > 0 && <span className="ml-1 font-normal text-slate-500">· {rangeStart}–{rangeEnd}</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setCreerOpen(true)} className="btn-primary text-sm">
            Nouvelle facture
          </button>
          <button type="button" disabled={busy || selected.size === 0} onClick={handlePdfSelection} className="btn-secondary text-sm disabled:opacity-40">
            PDF sélection ({selected.size})
          </button>
          <button type="button" disabled={busy || selected.size === 0} onClick={() => runDelete([...selected])} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40">
            Supprimer
          </button>
        </div>
      </div>

      {total === 0 && !loading ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
          Aucune facture pour cet établissement.
        </div>
      ) : (
        <>
          <div className="max-h-[min(58vh,520px)] overflow-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-10 p-2.5">
                    <input ref={selectAllRef} type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(pageIds))} className="rounded border-gray-300" />
                  </th>
                  <th className="p-2.5 font-semibold">N°</th>
                  <th className="p-2.5 font-semibold">Type</th>
                  <th className="p-2.5 font-semibold">Date</th>
                  <th className="p-2.5 font-semibold">Bénéficiaire</th>
                  <th className="p-2.5 font-semibold">Formation</th>
                  <th className="p-2.5 text-right font-semibold">Montant</th>
                  <th className="p-2.5 font-semibold">Statut</th>
                  <th className="p-2.5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((f) => {
                  const et = f.etudiant_snapshot || {}
                  const fo = f.formation_snapshot || {}
                  return (
                    <tr key={f.id} className="hover:bg-orange-50/40">
                      <td className="p-2.5">
                        <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggle(f.id)} className="rounded border-gray-300" />
                      </td>
                      <td className="p-2.5 font-mono text-xs font-semibold text-slate-800">{f.numero}</td>
                      <td className="p-2.5">
                        <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-800">
                          {titreTypeDocument(f.type_document, { uppercase: false })}
                        </span>
                      </td>
                      <td className="whitespace-nowrap p-2.5 text-slate-600">{fmtDate(f.date_emission)}</td>
                      <td className="p-2.5 font-medium text-slate-800">{et.prenom} {et.nom}</td>
                      <td className="max-w-[180px] truncate p-2.5 text-slate-600" title={fo.titre}>{fo.titre || '—'}</td>
                      <td className="p-2.5 text-right font-semibold tabular-nums">{fmt(f.montant_ttc)}</td>
                      <td className="p-2.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">{f.statut || '—'}</span>
                      </td>
                      <td className="p-2.5">
                        <div className="flex flex-wrap gap-1">
                          <button type="button" disabled={busy} onClick={() => handlePdfOne(f)} className="rounded-md bg-orange-500 px-2 py-1 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-40">
                            PDF
                          </button>
                          {f.dossier_id && (
                            <Link to={`/facture/${f.dossier_id}`} target="_blank" rel="noreferrer" className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                              Facture
                            </Link>
                          )}
                          <DocumentLinks
                            dossierId={f.dossier_id}
                            attestationDisponible={f.attestation_disponible}
                            lettreDisponible={f.lettre_disponible}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Page {page}/{totalPages}</span>
              <div className="flex gap-1">
                <button type="button" disabled={busy || page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn-secondary px-2 py-1 text-xs disabled:opacity-40">←</button>
                <button type="button" disabled={busy || page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="btn-secondary px-2 py-1 text-xs disabled:opacity-40">→</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
