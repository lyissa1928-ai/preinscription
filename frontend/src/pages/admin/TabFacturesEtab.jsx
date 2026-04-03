import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0)
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

export function TabFacturesEtab({ etabId }) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(() => new Set())
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    if (!etabId) return
    setLoading(true)
    axios
      .get(`/api/etablissements/${etabId}/factures`)
      .then(({ data }) => setList(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Impossible de charger les factures.'))
      .finally(() => setLoading(false))
  }, [etabId])

  useEffect(() => {
    load()
  }, [load])

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selected.size === list.length) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(list.map((f) => f.id)))
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

  const handleExport = async (ids) => {
    if (!ids.length) {
      toast.error('Sélectionnez au moins une facture.')
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

  const handleDeleteBatch = async () => {
    const ids = [...selected]
    if (!ids.length) {
      toast.error('Sélectionnez au moins une facture.')
      return
    }
    if (!confirm(`Supprimer définitivement ${ids.length} facture(s) ? Cette action est irréversible.`)) return
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

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-700 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          {list.length} facture(s) proforma liée(s) aux dossiers de cet établissement.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || list.length === 0}
            onClick={() => handleExport(list.map((f) => f.id))}
            className="btn-secondary text-sm disabled:opacity-40"
          >
            Télécharger tout (HTML)
          </button>
          <button
            type="button"
            disabled={busy || selected.size === 0}
            onClick={() => handleExport([...selected])}
            className="btn-primary text-sm disabled:opacity-40"
          >
            Télécharger la sélection (HTML)
          </button>
          <button
            type="button"
            disabled={busy || selected.size === 0}
            onClick={handleDeleteBatch}
            className="text-sm font-semibold text-red-700 border border-red-200 hover:border-red-400 px-4 py-2 rounded-lg disabled:opacity-40"
          >
            Supprimer la sélection
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
        Le fichier regroupe les factures pour impression ou enregistrement PDF depuis le navigateur. Les logos en ligne ne s’affichent pas hors serveur : les données textuelles restent complètes.
      </p>

      {list.length === 0 ? (
        <div className="text-center py-14 text-gray-400 border border-dashed border-gray-200 rounded-xl">
          Aucune facture enregistrée pour cet établissement.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={list.length > 0 && selected.size === list.length}
                    onChange={selectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="p-3">N° facture</th>
                <th className="p-3">Date</th>
                <th className="p-3">Bénéficiaire</th>
                <th className="p-3">Formation</th>
                <th className="p-3 text-right">Montant TTC</th>
                <th className="p-3">Dossier</th>
                <th className="p-3 w-28">Action</th>
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
                    <td className="p-3 text-gray-600 whitespace-nowrap">{fmtDate(f.date_emission)}</td>
                    <td className="p-3">
                      <span className="font-medium text-gray-800">{et.prenom} {et.nom}</span>
                      {et.email && <div className="text-xs text-gray-400 truncate max-w-[200px]">{et.email}</div>}
                    </td>
                    <td className="p-3 text-gray-700 max-w-xs truncate" title={fo.titre}>{fo.titre || '—'}</td>
                    <td className="p-3 text-right font-semibold tabular-nums">{fmt(f.montant_ttc)} FCFA</td>
                    <td className="p-3 font-mono text-xs text-gray-500">#{f.dossier_id}</td>
                    <td className="p-3">
                      <Link
                        to={`/facture/${f.dossier_id}`}
                        className="text-xs text-blue-600 hover:underline font-semibold"
                      >
                        Voir
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
  )
}
