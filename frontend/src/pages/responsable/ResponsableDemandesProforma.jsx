import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { mediaUrl } from '../../utils/mediaUrl'
import { useAuth } from '../../context/AuthContext'
import { actsAsResponsable } from '../../utils/roles'
import { chatWithStudentUrl } from '../../utils/chatWithStudentUrl'
import { TabAcceptesParFormation } from '../admin/TabAcceptesParFormation'

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0)

function justifUrl(rel) {
  if (!rel) return '#'
  return mediaUrl(`/uploads/${String(rel).replace(/^\//, '')}`)
}

const isPending = (s) => s === 'nouvelle' || s === 'en_attente' || s === 'vue'

export default function ResponsableDemandesProforma() {
  const { user } = useAuth()
  const canChatterEtudiant = actsAsResponsable(user) && user?.etablissement_id != null
  const [demandes, setDemandes] = useState([])
  const [pagination, setPagination] = useState({})
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [motifRefus, setMotifRefus] = useState('')
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  /** a_traiter | acceptations | listes */
  const [onglet, setOnglet] = useState('a_traiter')

  const load = (p = page) => {
    setLoading(true)
    axios.get(`/api/responsable/demandes-proforma?page=${p}&limit=20`)
      .then(({ data }) => {
        setDemandes(data.demandes || [])
        setPagination(data.pagination || {})
      })
      .catch(() => toast.error('Chargement impossible'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(page) }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => {
    if (onglet === 'a_traiter') return demandes.filter((d) => isPending(d.statut))
    if (onglet === 'acceptations') return demandes.filter((d) => d.statut === 'acceptee')
    return demandes
  }, [demandes, onglet])

  const marquerVue = (id) => {
    axios.put(`/api/responsable/demandes-proforma/${id}/statut`, { statut: 'vue' })
      .then(() => setDemandes((prev) => prev.map((d) => (d.id === id ? { ...d, statut: 'vue' } : d))))
      .catch(() => {})
  }

  const ouvrirDecision = (d, type) => {
    setMotifRefus('')
    setModal({ demande: d, type })
  }

  const confirmerDecision = async () => {
    if (!modal) return
    const { demande, type } = modal
    if (type === 'refuser' && !motifRefus.trim()) {
      toast.error('Indiquez un motif de refus')
      return
    }
    setSaving(true)
    try {
      await axios.put(`/api/responsable/demandes-proforma/${demande.id}/decision`, {
        decision: type === 'accepter' ? 'accepter' : 'refuser',
        motif_refus: type === 'refuser' ? motifRefus.trim() : undefined,
      })
      toast.success(type === 'accepter' ? 'Demande acceptée.' : 'Demande refusée.')
      setModal(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const exportRapportExcel = async () => {
    const etabId = user?.etablissement_id
    if (!etabId) {
      toast.error('Aucun établissement rattaché.')
      return
    }
    setExporting(true)
    try {
      const { data } = await axios.get(
        `/api/etablissements/${etabId}/rapport-etablissement/export-xlsx`,
        { responseType: 'blob' },
      )
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = `rapport-etablissement-${etabId}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Rapport Excel téléchargé')
    } catch {
      toast.error('Export Excel impossible')
    } finally {
      setExporting(false)
    }
  }

  const statutBadge = (s) => {
    if (s === 'acceptee') return 'bg-emerald-100 text-emerald-800'
    if (s === 'refusee') return 'bg-red-100 text-red-700'
    if (isPending(s)) return 'bg-amber-100 text-amber-800'
    return 'bg-gray-100 text-gray-600'
  }
  const statutLabel = (s) => {
    const m = { acceptee: 'Acceptée', refusee: 'Refusée', nouvelle: 'Nouvelle', en_attente: 'En attente', vue: 'Vue' }
    return m[s] || s
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">Préinscriptions à traiter</h1>
          <p className="text-sm text-gray-500">
            Dossiers à traiter, acceptations et listes d’étudiants acceptés par formation et niveau.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user?.etablissement_id && (
            <button
              type="button"
              className="btn-secondary text-sm disabled:opacity-50"
              disabled={exporting}
              onClick={exportRapportExcel}
            >
              {exporting ? 'Export…' : 'Excel'}
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 text-sm font-semibold">
        {[
          { id: 'a_traiter', label: 'À traiter' },
          { id: 'acceptations', label: 'Acceptations' },
          { id: 'listes', label: 'Listes acceptés' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setOnglet(t.id)}
            className={`rounded-lg px-3 py-2 ${onglet === t.id ? 'bg-orange-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {onglet === 'listes' ? (
        user?.etablissement_id ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <TabAcceptesParFormation etabId={user.etablissement_id} />
          </div>
        ) : (
          <p className="text-sm text-slate-500">Aucun établissement rattaché.</p>
        )
      ) : loading ? (
        <div className="flex justify-center py-12">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-400">
          {onglet === 'a_traiter' ? 'Aucune préinscription en attente.' : 'Aucune acceptation pour le moment.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="max-h-[min(62vh,560px)] overflow-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Candidat</th>
                  <th className="px-3 py-2.5 font-semibold">Formation</th>
                  <th className="px-3 py-2.5 font-semibold">Réf.</th>
                  <th className="px-3 py-2.5 font-semibold">Montant</th>
                  <th className="px-3 py-2.5 font-semibold">Statut</th>
                  <th className="px-3 py-2.5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((d) => (
                  <tr
                    key={d.id}
                    className={isPending(d.statut) ? 'bg-amber-50/40' : 'bg-white'}
                    onClick={() => (d.statut === 'nouvelle' || d.statut === 'en_attente') && marquerVue(d.id)}
                  >
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-slate-900">{d.prenom} {d.nom}</div>
                      <div className="text-xs text-slate-500">
                        {d.type_formation === 'en_ligne' ? 'FAD' : 'Présentiel'}
                        {d.telephone ? ` · ${d.telephone}` : ''}
                      </div>
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-2.5 text-slate-700" title={d.formation_titre}>
                      {d.formation_titre}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-500">
                      {d.reference}
                      <div className="text-[11px] text-slate-400">
                        {d.created_at ? new Date(d.created_at).toLocaleDateString('fr-FR') : ''}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-semibold tabular-nums text-slate-800">
                      {d.facture?.montant_ttc != null ? `${fmt(d.facture.montant_ttc)}` : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${statutBadge(d.statut)}`}>
                        {statutLabel(d.statut)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-1">
                        {d.statut !== 'acceptee' && d.statut !== 'refusee' && (
                          <>
                            <button
                              type="button"
                              onClick={() => ouvrirDecision(d, 'accepter')}
                              className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                            >
                              Accepter
                            </button>
                            <button
                              type="button"
                              onClick={() => ouvrirDecision(d, 'refuser')}
                              className="rounded-md border border-red-300 px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-50"
                            >
                              Refuser
                            </button>
                          </>
                        )}
                        {d.statut === 'acceptee' && d.reference && (
                          <Link
                            to={`/facture-publique/${d.reference}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md border border-blue-200 px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50"
                          >
                            Facture
                          </Link>
                        )}
                        {canChatterEtudiant && d.etudiant_id != null && Number(d.etudiant_id) > 0 && (
                          <Link
                            to={chatWithStudentUrl(d.etudiant_id, d.prenom, d.nom)}
                            className="rounded-md border border-emerald-200 px-2 py-1 text-xs font-bold text-emerald-800"
                          >
                            Chat
                          </Link>
                        )}
                        {d.justificatifs && (
                          <a
                            href={justifUrl(d.justificatifs.diplome)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600"
                          >
                            Docs
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination.totalPages > 1 && onglet === 'a_traiter' && (
            <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
              <span>{pagination.total} demande(s)</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="btn-secondary px-2 py-1 text-xs disabled:opacity-40">←</button>
                <span>{page}/{pagination.totalPages}</span>
                <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page === pagination.totalPages} className="btn-secondary px-2 py-1 text-xs disabled:opacity-40">→</button>
              </div>
            </div>
          )}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">
              {modal.type === 'accepter' ? 'Accepter la demande ?' : 'Refuser la demande ?'}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {modal.demande.prenom} {modal.demande.nom} — {modal.demande.formation_titre}
            </p>
            {modal.type === 'accepter' && (
              <p className="mt-3 text-sm text-emerald-800">
                Facture et attestation seront disponibles pour le candidat.
              </p>
            )}
            {modal.type === 'refuser' && (
              <textarea
                className="input-field mt-3"
                rows={3}
                placeholder="Motif du refus…"
                value={motifRefus}
                onChange={(e) => setMotifRefus(e.target.value)}
              />
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-secondary text-sm" onClick={() => setModal(null)} disabled={saving}>
                Annuler
              </button>
              <button
                type="button"
                className={`text-sm font-bold text-white px-4 py-2 rounded-lg ${
                  modal.type === 'accepter' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
                onClick={confirmerDecision}
                disabled={saving}
              >
                {saving ? '…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
