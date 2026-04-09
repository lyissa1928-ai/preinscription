import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'

const PAGE_SIZE = 10

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0)
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

export function TabFacturesEtab({ etabId }) {
  const [list, setList] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(() => new Set())
  const [busy, setBusy] = useState(false)
  const selectAllRef = useRef(null)

  useEffect(() => {
    setPage(1)
  }, [etabId])

  const load = useCallback(() => {
    if (!etabId) return
    setLoading(true)
    axios
      .get(`/api/etablissements/${etabId}/factures`, { params: { page, limit: PAGE_SIZE } })
      .then(({ data }) => {
        const items = Array.isArray(data.items) ? data.items : []
        setList(items)
        setTotal(Number(data.total) || 0)
        setTotalPages(Math.max(1, Number(data.totalPages) || 1))
        if (typeof data.page === 'number' && data.page >= 1) setPage(data.page)
      })
      .catch(() => toast.error('Impossible de charger les factures.'))
      .finally(() => setLoading(false))
  }, [etabId, page])

  useEffect(() => {
    load()
  }, [load])

  /** Changement de page : nouvelle sélection (au plus 10 lignes par page). */
  useEffect(() => {
    setSelected(new Set())
  }, [page])

  const pageIds = list.map((f) => f.id)
  const allSelected = list.length > 0 && pageIds.every((id) => selected.has(id))
  const someSelected = pageIds.some((id) => selected.has(id)) && !allSelected

  useEffect(() => {
    const el = selectAllRef.current
    if (el) el.indeterminate = someSelected
  }, [someSelected])

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllOnPage = () => {
    if (allSelected) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(pageIds))
  }

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  /** Export HTML de toutes les factures de l’établissement (sans limite côté fichier). */
  const handleExportAll = async () => {
    if (total === 0) return
    setBusy(true)
    try {
      const { data } = await axios.get(`/api/etablissements/${etabId}/factures/export`, {
        responseType: 'blob',
      })
      downloadBlob(data, `factures-etablissement-${etabId}.html`)
      toast.success('Fichier HTML téléchargé. Ouvrez-le puis utilisez Imprimer → PDF.')
    } catch (e) {
      if (e.response?.data instanceof Blob) {
        const text = await e.response.data.text()
        try {
          const j = JSON.parse(text)
          toast.error(j.message || 'Erreur export')
        } catch {
          toast.error('Erreur export')
        }
      } else {
        toast.error(e.response?.data?.message || 'Erreur export')
      }
    } finally {
      setBusy(false)
    }
  }

  /** Export HTML d’une sélection (max. PAGE_SIZE, les cases à cocher sont limitées à la page). */
  const handleExportSelection = async (ids) => {
    if (!ids.length) {
      toast.error('Sélectionnez au moins une facture.')
      return
    }
    if (ids.length > PAGE_SIZE) {
      toast.error(`Maximum ${PAGE_SIZE} facture(s) par export de sélection.`)
      return
    }
    setBusy(true)
    try {
      const { data } = await axios.get(`/api/etablissements/${etabId}/factures/export`, {
        params: { ids: ids.join(',') },
        responseType: 'blob',
      })
      downloadBlob(data, `factures-etablissement-${etabId}.html`)
      toast.success('Fichier HTML téléchargé. Ouvrez-le puis utilisez Imprimer → PDF.')
    } catch (e) {
      if (e.response?.data instanceof Blob) {
        const text = await e.response.data.text()
        try {
          const j = JSON.parse(text)
          toast.error(j.message || 'Erreur export')
        } catch {
          toast.error('Erreur export')
        }
      } else {
        toast.error(e.response?.data?.message || 'Erreur export')
      }
    } finally {
      setBusy(false)
    }
  }

  const runDelete = async (ids) => {
    if (!ids.length) {
      toast.error('Sélectionnez au moins une facture.')
      return
    }
    if (ids.length > PAGE_SIZE) {
      toast.error(`Maximum ${PAGE_SIZE} facture(s) par suppression groupée.`)
      return
    }
    const msg =
      ids.length === 1
        ? 'Supprimer définitivement cette facture de la base ? Les enregistrements seront retirés sans possibilité de récupération (une nouvelle facture pourra être générée depuis le dossier).'
        : `Supprimer définitivement ${ids.length} facture(s) de la base ? Action irréversible. Les dossiers restent ; une nouvelle facture pourra être créée si besoin.`
    if (!window.confirm(msg)) return
    setBusy(true)
    try {
      const { data } = await axios.post(`/api/etablissements/${etabId}/factures/delete-batch`, { ids })
      toast.success(data.message || 'Suppression effectuée.')
      if (data.skipped?.length) {
        toast(`${data.skipped.length} id(s) ignoré(s) (hors établissement ou introuvable).`, { icon: '⚠️' })
      }
      setSelected(new Set())
      load()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur suppression')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteBatch = () => runDelete([...selected])

  /** Supprime toutes les factures par lots de 10 côté API. */
  const handleDeleteAllInList = async () => {
    if (total === 0) return
    if (
      !window.confirm(
        `Supprimer définitivement les ${total} facture(s) de cet établissement ? Action irréversible, traitée par lots de ${PAGE_SIZE}. Les dossiers restent.`,
      )
    ) {
      return
    }
    setBusy(true)
    let removed = 0
    try {
      let remaining = true
      while (remaining) {
        const { data } = await axios.get(`/api/etablissements/${etabId}/factures`, {
          params: { page: 1, limit: PAGE_SIZE },
        })
        const items = Array.isArray(data.items) ? data.items : []
        if (items.length === 0) {
          remaining = false
          break
        }
        const ids = items.map((f) => f.id)
        const { data: del } = await axios.post(`/api/etablissements/${etabId}/factures/delete-batch`, { ids })
        removed += del.removed?.length ?? ids.length
      }
      toast.success(`${removed} facture(s) supprimée(s) de la base.`)
      setSelected(new Set())
      setPage(1)
      load()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur lors de la suppression globale')
      load()
    } finally {
      setBusy(false)
    }
  }

  if (loading && list.length === 0 && total === 0) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />
      </div>
    )
  }

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          <strong>{total}</strong> facture(s) proforma liée(s) aux dossiers de cet établissement — affichage par lots de{' '}
          <strong>{PAGE_SIZE}</strong>. Cochez les lignes puis supprimez — les enregistrements sont{' '}
          <strong>retirés de la base</strong> (pas seulement masqués). Suppression groupée : au plus {PAGE_SIZE} par
          action.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || total === 0}
            onClick={handleExportAll}
            className="btn-secondary text-sm disabled:opacity-40"
          >
            Télécharger tout (HTML)
          </button>
          <button
            type="button"
            disabled={busy || selected.size === 0}
            onClick={() => handleExportSelection([...selected])}
            className="btn-primary text-sm disabled:opacity-40"
          >
            Télécharger la sélection (HTML)
          </button>
          <button
            type="button"
            disabled={busy || selected.size === 0}
            onClick={handleDeleteBatch}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:border-red-400 hover:bg-red-50 disabled:opacity-40"
          >
            Supprimer la sélection ({selected.size})
          </button>
          <button
            type="button"
            disabled={busy || total === 0}
            onClick={handleDeleteAllInList}
            className="rounded-lg border-2 border-red-600 bg-red-50 px-4 py-2 text-sm font-bold text-red-800 hover:bg-red-100 disabled:opacity-40"
          >
            Tout supprimer ({total})
          </button>
        </div>
      </div>

      <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-gray-500">
        Le fichier regroupe les factures pour impression ou enregistrement PDF depuis le navigateur. Les logos en ligne ne s’affichent pas hors serveur : les données textuelles restent complètes.
      </p>

      {total === 0 && !loading ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-14 text-center text-gray-400">
          Aucune facture enregistrée pour cet établissement.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="w-10 p-3">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allSelected}
                      onChange={selectAllOnPage}
                      title={allSelected ? 'Tout désélectionner (cette page)' : `Tout sélectionner (cette page, max. ${PAGE_SIZE})`}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="p-3">N° facture</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Bénéficiaire</th>
                  <th className="p-3">Formation</th>
                  <th className="p-3 text-right">Montant TTC</th>
                  <th className="p-3">Dossier</th>
                  <th className="w-28 p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.map((f) => {
                  const et = f.etudiant_snapshot || {}
                  const fo = f.formation_snapshot || {}
                  return (
                    <tr key={f.id} className="hover:bg-gray-50/80">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selected.has(f.id)}
                          onChange={() => toggle(f.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="p-3 font-mono text-xs font-semibold text-gray-800">{f.numero}</td>
                      <td className="whitespace-nowrap p-3 text-gray-600">{fmtDate(f.date_emission)}</td>
                      <td className="p-3">
                        <span className="font-medium text-gray-800">
                          {et.prenom} {et.nom}
                        </span>
                        {et.email && <div className="max-w-[200px] truncate text-xs text-gray-400">{et.email}</div>}
                      </td>
                      <td className="max-w-xs truncate p-3 text-gray-700" title={fo.titre}>
                        {fo.titre || '—'}
                      </td>
                      <td className="p-3 text-right font-semibold tabular-nums">{fmt(f.montant_ttc)} FCFA</td>
                      <td className="p-3 font-mono text-xs text-gray-500">#{f.dossier_id}</td>
                      <td className="p-3">
                        <Link to={`/facture/${f.dossier_id}`} className="text-xs font-semibold text-blue-600 hover:underline">
                          Voir
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-500">
                Lignes {rangeStart}–{rangeEnd} sur {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy || page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40"
                >
                  ← Précédent
                </button>
                <span className="px-2 text-sm text-gray-600">
                  Page {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={busy || page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40"
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
