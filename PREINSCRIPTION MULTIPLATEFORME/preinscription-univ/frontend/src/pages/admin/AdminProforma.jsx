import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { mediaUrl } from '../../utils/mediaUrl'
import { DashboardPage, DashboardHero, DashboardSpinner } from '../../components/dashboard/DashboardChrome'

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0))
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

const FILTRES_STATUT = [
  { val: '', label: 'Tous' },
  { val: 'en_attente', label: 'En attente de validation' },
  { val: 'acceptee', label: 'Acceptée' },
  { val: 'refusee', label: 'Refusée' },
  { val: 'nouvelle', label: 'Ancien · nouvelle' },
  { val: 'vue', label: 'Ancien · vue' },
]

const PAYEUR_LABELS = {
  etudiant: 'Étudiant',
  tuteur: 'Tuteur',
  organisation: 'Organisme',
}

const PAGE_SIZE = 10

const JUSTIF_KEYS = [
  { key: 'diplome', label: 'Diplôme', short: 'Diplôme' },
  { key: 'releve', label: 'Relevé', short: 'Relevé' },
  { key: 'formation', label: 'Formation', short: 'Formation' },
]

function uploadUrl(rel) {
  if (!rel || !String(rel).trim()) return null
  const s = String(rel).trim()
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  return mediaUrl(`/uploads/${s.replace(/^\//, '')}`)
}

function demandeHasFacture(d) {
  return !!(d?.facture && d.facture.numero)
}

function badgeDemande(d) {
  const s = d?.statut
  if (s === 'acceptee') return { label: 'Acceptée', color: 'bg-emerald-100 text-emerald-800 ring-emerald-200/80' }
  if (s === 'refusee') return { label: 'Refusée', color: 'bg-red-100 text-red-800 ring-red-200/80' }
  if (s === 'en_attente') return { label: 'En attente', color: 'bg-amber-100 text-amber-900 ring-amber-200/80' }
  if (s === 'nouvelle' && demandeHasFacture(d)) {
    return { label: 'Acceptée', color: 'bg-emerald-100 text-emerald-800 ring-emerald-200/80' }
  }
  if (s === 'nouvelle' && !d?.facture?.numero) {
    return { label: 'En attente', color: 'bg-amber-100 text-amber-900 ring-amber-200/80' }
  }
  return { label: s || '—', color: 'bg-gray-100 text-gray-700 ring-gray-200/80' }
}

function demandeEnAttenteDecision(d) {
  if (!d) return false
  if (d.statut === 'en_attente') return true
  if (d.statut === 'nouvelle' && !d.facture?.numero) return true
  return false
}

/** Admin peut retirer la facture si une facture existe et que la demande n’est pas refusée */
function peutRetirerFacture(d) {
  if (!d || d.statut === 'refusee') return false
  return demandeHasFacture(d)
}

// ─── Modale détail ────────────────────────────────────────────────────────────
function ModalDetail({ demande, onClose, onDecisionDone }) {
  const [motifRefus, setMotifRefus] = useState('')
  const [saving, setSaving] = useState(false)
  const es = demande.etablissement_snapshot || {}
  const fac = demande.facture || {}
  const pending = demandeEnAttenteDecision(demande)
  const b = badgeDemande(demande)

  const doDecision = async (decision) => {
    if (decision === 'refuser' && !String(motifRefus).trim()) {
      toast.error('Indiquez un motif de refus.')
      return
    }
    setSaving(true)
    try {
      await axios.put(`/api/admin/demandes-proforma/${demande.id}/decision`, {
        decision: decision === 'accepter' ? 'accepter' : 'refuser',
        motif_refus: decision === 'refuser' ? String(motifRefus).trim() : undefined,
      })
      toast.success(decision === 'accepter' ? 'Demande acceptée.' : 'Demande refusée.')
      onDecisionDone()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action impossible.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="animate-scale-in max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/60 bg-white shadow-[0_25px_80px_-12px_rgba(15,23,42,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-white to-indigo-50/30 p-5">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Demande proforma</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{demande.reference}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ring-1 ${b.color}`}>{b.label}</span>
          </div>

          {es.nom && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3">
              {es.logo_url ? (
                <img
                  src={es.logo_url}
                  alt=""
                  className="w-10 h-10 rounded-lg object-contain border border-gray-200 bg-white"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-lg"
                  style={{ background: es.couleur_primaire || '#1e40af' }}
                >
                  {es.nom[0]}
                </div>
              )}
              <div>
                <p className="font-bold text-blue-800 text-sm">{es.nom}</p>
                {es.adresse && <p className="text-xs text-blue-600">{es.adresse}</p>}
              </div>
            </div>
          )}

          <div className={`grid gap-4 ${demande.type_payeur !== 'etudiant' && demande.payeur ? 'sm:grid-cols-2' : ''}`}>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Étudiant</p>
              <p className="font-bold text-gray-800">
                {demande.prenom} {demande.nom?.toUpperCase()}
              </p>
              <p className="text-sm text-gray-600">{demande.email}</p>
              <p className="text-sm text-gray-600">Tél : {demande.telephone}</p>
              {demande.niveau && <p className="text-sm text-gray-500 mt-1">Niveau : {demande.niveau}</p>}
            </div>

            {demande.type_payeur !== 'etudiant' && demande.payeur && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  {demande.type_payeur === 'tuteur' ? 'Tuteur / Payeur' : 'Organisme Payeur'}
                </p>
                {demande.type_payeur === 'tuteur' ? (
                  <>
                    <p className="font-bold text-gray-800">
                      {demande.payeur.prenom} {demande.payeur.nom?.toUpperCase()}
                    </p>
                    {demande.payeur.relation && <p className="text-sm text-gray-600">Lien : {demande.payeur.relation}</p>}
                    {demande.payeur.telephone && <p className="text-sm text-gray-600">Tél : {demande.payeur.telephone}</p>}
                  </>
                ) : (
                  <>
                    <p className="font-bold text-gray-800">{demande.payeur.org_nom}</p>
                    {demande.payeur.ninea && <p className="text-sm text-gray-600">NINEA : {demande.payeur.ninea}</p>}
                    {demande.payeur.contact && <p className="text-sm text-gray-600">Contact : {demande.payeur.contact}</p>}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Formation</p>
            <p className="font-bold text-gray-800">{demande.formation_titre}</p>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                {demande.type_formation === 'en_ligne' ? 'En ligne (FAD)' : 'Présentiel'}
              </span>
              {demande.formation_ville && <span>📍 {demande.formation_ville}</span>}
              {demande.formation_niveau_requis && <span>🎓 Niveau requis : {demande.formation_niveau_requis}</span>}
            </div>
          </div>

          {demande.justificatifs && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Justificatifs déposés</p>
              <div className="flex flex-wrap gap-2">
                {JUSTIF_KEYS.map(({ key, label }) => {
                  const rel = demande.justificatifs[key]
                  const href = uploadUrl(rel)
                  return href ? (
                    <a
                      key={key}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-100"
                    >
                      📎 {label}
                    </a>
                  ) : (
                    <span
                      key={key}
                      className="inline-flex text-xs px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-900"
                    >
                      {label} — manquant
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {fac.numero && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Facture proforma</p>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Désignation</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(fac.lignes || []).map((l, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-700">{l.designation}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-800 tabular-nums">{fmt(l.montant)} FCFA</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-200">
                    <tr className="bg-blue-700 text-white">
                      <td className="px-4 py-3 font-bold">TOTAL TTC</td>
                      <td className="px-4 py-3 text-right font-black text-lg tabular-nums">{fmt(fac.montant_ttc)} FCFA</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-400">
                <span>N° {fac.numero}</span>
                {fac.validite_jusqu_au && <span>Valable jusqu'au {fmtDate(fac.validite_jusqu_au)}</span>}
              </div>
            </div>
          )}

          {demande.statut === 'refusee' && demande.motif_refus && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-red-900 text-sm">
              <p className="font-bold mb-1">Motif du refus</p>
              <p>{demande.motif_refus}</p>
            </div>
          )}

          {pending && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <p className="text-sm text-gray-700">
                <strong>Validation requise</strong> : acceptez ou refusez la demande. Le candidat ne pourra télécharger la
                facture proforma et l’attestation de préinscription qu’après acceptation.
              </p>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Motif (obligatoire en cas de refus)</label>
                <textarea
                  className="w-full input-field text-sm min-h-[80px]"
                  placeholder="Motif de refus…"
                  value={motifRefus}
                  onChange={(e) => setMotifRefus(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => doDecision('accepter')}
                  className="btn-primary flex-1 text-sm disabled:opacity-50"
                >
                  {saving ? '…' : 'Accepter la demande'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => doDecision('refuser')}
                  className="btn-secondary flex-1 text-sm border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Refuser
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 flex-wrap border-t border-gray-100 pt-4">
            {demande.statut === 'acceptee' && demande.reference && (
              <a
                href={`/facture-publique/${demande.reference}`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary flex-1 text-center text-sm min-w-[140px]"
              >
                Voir la facture →
              </a>
            )}
            <button type="button" onClick={onClose} className="btn-outline flex-1 text-sm min-w-[120px]">
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function JustificatifsCell({ demande }) {
  const j = demande?.justificatifs || {}
  return (
    <div className="inline-flex flex-nowrap items-center gap-1.5">
      {JUSTIF_KEYS.map(({ key, short, label }) => {
        const href = uploadUrl(j[key])
        return href ? (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={`Ouvrir : ${label}`}
            className="inline-flex items-center justify-center gap-0.5 rounded-lg border border-violet-200/90 bg-gradient-to-b from-violet-50 to-white px-2 py-1 text-[11px] font-bold text-violet-900 shadow-sm hover:border-violet-400 hover:shadow transition-all whitespace-nowrap"
          >
            <span className="opacity-90">📄</span>
            {short}
          </a>
        ) : (
          <span
            key={key}
            title="Fichier manquant"
            className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-900 whitespace-nowrap"
          >
            {short} ✕
          </span>
        )
      })}
    </div>
  )
}

export default function AdminProforma() {
  const [demandes, setDemandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [rowSelection, setRowSelection] = useState(() => new Set())
  const [batchBusy, setBatchBusy] = useState(false)
  const [detailDemande, setDetailDemande] = useState(null)
  const [decisionLoadingId, setDecisionLoadingId] = useState(null)
  const [revokeLoadingId, setRevokeLoadingId] = useState(null)
  const [refuseFor, setRefuseFor] = useState(null)
  const [refuseMotif, setRefuseMotif] = useState('')
  const [refuseSaving, setRefuseSaving] = useState(false)
  const [revokeConfirm, setRevokeConfirm] = useState(null)

  const load = () => {
    setLoading(true)
    axios
      .get('/api/admin/demandes-proforma')
      .then(({ data }) => setDemandes(data))
      .catch(() => toast.error('Erreur de chargement.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleDecisionDone = () => {
    load()
  }

  const pendingCount = useMemo(
    () => demandes.filter((d) => d.statut === 'en_attente' || (d.statut === 'nouvelle' && !d.facture?.numero)).length,
    [demandes],
  )

  const doAcceptRow = async (demande) => {
    setDecisionLoadingId(demande.id)
    try {
      await axios.put(`/api/admin/demandes-proforma/${demande.id}/decision`, {
        decision: 'accepter',
      })
      toast.success('Demande acceptée. Le candidat peut télécharger la facture proforma et l’attestation sur son espace.')
      handleDecisionDone()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Acceptation impossible.')
    } finally {
      setDecisionLoadingId(null)
    }
  }

  const doRevokeRow = async (demande) => {
    setRevokeLoadingId(demande.id)
    try {
      await axios.put(`/api/admin/demandes-proforma/${demande.id}/revoke-acceptation`)
      toast.success('Facture retirée. La demande est à nouveau en attente.')
      setRevokeConfirm(null)
      handleDecisionDone()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action impossible.')
    } finally {
      setRevokeLoadingId(null)
    }
  }

  const submitRefuseRow = async () => {
    if (!refuseFor) return
    if (!String(refuseMotif).trim()) {
      toast.error('Indiquez un motif de refus.')
      return
    }
    setRefuseSaving(true)
    try {
      await axios.put(`/api/admin/demandes-proforma/${refuseFor.id}/decision`, {
        decision: 'refuser',
        motif_refus: String(refuseMotif).trim(),
      })
      toast.success('Demande refusée.')
      setRefuseFor(null)
      setRefuseMotif('')
      handleDecisionDone()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action impossible.')
    } finally {
      setRefuseSaving(false)
    }
  }

  const filtered = useMemo(
    () =>
      demandes.filter((d) => {
        let matchStatut = true
        if (filtre) {
          if (filtre === 'en_attente') {
            matchStatut = d.statut === 'en_attente' || (d.statut === 'nouvelle' && !d.facture?.numero)
          } else {
            matchStatut = d.statut === filtre
          }
        }
        const s = search.toLowerCase()
        const matchSearch =
          !s ||
          (d.nom || '').toLowerCase().includes(s) ||
          (d.prenom || '').toLowerCase().includes(s) ||
          (d.email || '').toLowerCase().includes(s) ||
          (d.reference || '').toLowerCase().includes(s) ||
          (d.formation_titre || '').toLowerCase().includes(s)
        return matchStatut && matchSearch
      }),
    [demandes, filtre, search],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages))
  }, [totalPages])

  const paginated = useMemo(() => {
    const p = Math.min(page, totalPages)
    const start = (p - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page, totalPages])

  useEffect(() => {
    setPage(1)
  }, [filtre, search])

  useEffect(() => {
    setRowSelection(new Set())
  }, [page, filtre, search])

  const selectAllRef = useRef(null)
  const pageIds = paginated.map((d) => d.id)
  const allPageSelected = paginated.length > 0 && pageIds.every((id) => rowSelection.has(id))
  const somePageSelected = pageIds.some((id) => rowSelection.has(id)) && !allPageSelected

  useEffect(() => {
    const el = selectAllRef.current
    if (el) el.indeterminate = somePageSelected
  }, [somePageSelected])

  const toggleRow = (id) => {
    setRowSelection((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllOnPage = () => {
    if (allPageSelected) {
      setRowSelection(new Set())
      return
    }
    setRowSelection(new Set(pageIds))
  }

  const runDeleteDemandes = async (ids) => {
    if (!ids.length) {
      toast.error('Sélectionnez au moins une demande.')
      return
    }
    if (ids.length > PAGE_SIZE) {
      toast.error(`Maximum ${PAGE_SIZE} demande(s) par suppression groupée.`)
      return
    }
    const msg =
      ids.length === 1
        ? 'Supprimer définitivement cette demande de la base ? Action irréversible.'
        : `Supprimer définitivement ${ids.length} demande(s) ? Action irréversible.`
    if (!window.confirm(msg)) return
    setBatchBusy(true)
    try {
      const { data } = await axios.post('/api/admin/demandes-proforma/delete-batch', { ids })
      toast.success(data.message || 'Suppression effectuée.')
      setRowSelection(new Set())
      load()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur suppression')
    } finally {
      setBatchBusy(false)
    }
  }

  const handleDeleteSelection = () => runDeleteDemandes([...rowSelection])

  const handleDeleteAllFiltered = async () => {
    if (filtered.length === 0) return
    if (
      !window.confirm(
        `Supprimer définitivement les ${filtered.length} demande(s) correspondant aux filtres actuels ? Traitement par lots de ${PAGE_SIZE}. Action irréversible.`,
      )
    ) {
      return
    }
    setBatchBusy(true)
    const allIds = filtered.map((d) => d.id)
    try {
      let removed = 0
      for (let i = 0; i < allIds.length; i += PAGE_SIZE) {
        const chunk = allIds.slice(i, i + PAGE_SIZE)
        const { data } = await axios.post('/api/admin/demandes-proforma/delete-batch', { ids: chunk })
        removed += Array.isArray(data.removed) ? data.removed.length : 0
      }
      toast.success(`${removed} demande(s) supprimée(s).`)
      setRowSelection(new Set())
      setPage(1)
      load()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur suppression')
      load()
    } finally {
      setBatchBusy(false)
    }
  }

  const countByFiltre = (val) => {
    if (!val) return demandes.length
    if (val === 'en_attente') {
      return demandes.filter((d) => d.statut === 'en_attente' || (d.statut === 'nouvelle' && !d.facture?.numero)).length
    }
    return demandes.filter((d) => d.statut === val).length
  }

  const isRevokingModal = revokeConfirm != null && revokeLoadingId === revokeConfirm.id

  return (
    <DashboardPage>
      <Link
        to="/admin"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-indigo-600"
      >
        <span aria-hidden className="text-lg leading-none">
          ←
        </span>
        Administration
      </Link>

      <DashboardHero
        eyebrow="Facturation & candidatures"
        title="Demandes proforma"
        subtitle="File des demandes : pièces sur chaque ligne, puis validation. Le candidat reçoit la facture proforma et l’attestation une fois accepté. Vous pouvez retirer la facture pour remettre en attente."
        actions={
          <div className="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-indigo-50/50 px-6 py-4 text-right shadow-lg shadow-violet-500/10 ring-1 ring-white/60">
            <p className="text-4xl font-black tabular-nums text-transparent bg-gradient-to-r from-violet-700 to-indigo-700 bg-clip-text">
              {demandes.length}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total demandes</p>
            {pendingCount > 0 && (
              <p className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900 ring-1 ring-amber-200/80">
                {pendingCount} à traiter
              </p>
            )}
          </div>
        }
      />

      {pendingCount > 0 && (
        <div className="animate-fade-in mb-6 rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50 to-orange-50/50 px-4 py-3.5 text-sm text-amber-950 shadow-md shadow-amber-500/5">
          <span className="font-bold">Action requise :</span> {pendingCount} demande(s) sans décision — utilisez{' '}
          <span className="font-semibold text-emerald-800">Accepter</span> / <span className="font-semibold text-red-800">Refuser</span>{' '}
          (filtre « En attente »).
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTRES_STATUT.map((f) => (
          <button
            key={f.val || 'all'}
            type="button"
            onClick={() => setFiltre(f.val)}
            className={`rounded-full border-2 px-3.5 py-2 text-xs font-bold transition-all duration-200
              ${
                filtre === f.val
                  ? 'border-violet-600 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25'
                  : 'border-slate-200/90 bg-white/90 text-slate-600 shadow-sm hover:border-violet-300 hover:text-violet-800'
              }`}
          >
            {f.label} ({countByFiltre(f.val)})
          </button>
        ))}
      </div>

      <div className="relative mb-6 max-w-lg">
        <svg
          className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          className="input-field rounded-xl border-slate-200/90 bg-white/90 pl-10 shadow-inner shadow-slate-200/50 ring-1 ring-slate-100 focus:ring-2 focus:ring-indigo-500/30"
          placeholder="Rechercher par nom, email, référence, formation…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <DashboardSpinner className="py-24" />
      ) : filtered.length === 0 ? (
        <div className="animate-scale-in rounded-2xl border border-dashed border-slate-200 bg-white/80 py-20 text-center shadow-inner">
          <div className="mb-4 text-6xl opacity-40">📋</div>
          <p className="font-medium text-slate-600">Aucune demande ne correspond à ces critères.</p>
          <p className="mt-1 text-sm text-slate-400">Modifiez les filtres ou la recherche.</p>
        </div>
      ) : (
        <div className="animate-scale-in overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.15)] ring-1 ring-slate-100/80">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{filtered.length}</span> résultat(s) ·{' '}
              <span className="font-semibold text-slate-700">{PAGE_SIZE}</span> par page
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={batchBusy || rowSelection.size === 0}
                onClick={handleDeleteSelection}
                className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Supprimer la sélection ({rowSelection.size})
              </button>
              <button
                type="button"
                disabled={batchBusy || filtered.length === 0}
                onClick={handleDeleteAllFiltered}
                className="rounded-xl border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-800 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Tout supprimer (filtre actuel)
              </button>
            </div>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="min-w-[1000px] w-full text-sm">
              <thead className="border-b border-slate-200 bg-gradient-to-r from-slate-50/95 via-indigo-50/20 to-violet-50/30">
                <tr>
                  <th className="w-10 px-3 py-3.5">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      checked={allPageSelected && paginated.length > 0}
                      onChange={selectAllOnPage}
                      disabled={paginated.length === 0 || batchBusy}
                      title="Sélectionner les lignes de cette page"
                    />
                  </th>
                  {['Référence', 'Étudiant', 'Formation', 'Montant', 'Payeur', 'Date', 'Pièces jointes', 'Statut', 'Actions'].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((d) => {
                  const b = badgeDemande(d)
                  const pending = demandeEnAttenteDecision(d)
                  const busy = decisionLoadingId === d.id
                  const revokeBusy = revokeLoadingId === d.id
                  const showRevoke = peutRetirerFacture(d)
                  return (
                    <tr
                      key={d.id}
                      className="group border-b border-slate-100/80 transition-all duration-200 hover:bg-gradient-to-r hover:from-violet-50/50 hover:to-indigo-50/30 hover:shadow-[inset_3px_0_0_0_rgba(139,92,246,0.4)]"
                    >
                      <td className="px-3 py-3.5 align-middle">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                          checked={rowSelection.has(d.id)}
                          onChange={() => toggleRow(d.id)}
                          disabled={batchBusy}
                        />
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-purple-700 font-bold whitespace-nowrap align-middle">
                        {d.reference}
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <p className="font-semibold text-gray-800 whitespace-nowrap">
                          {d.prenom} {d.nom?.toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-500">{d.email}</p>
                      </td>
                      <td className="px-4 py-3.5 max-w-[220px] align-middle">
                        <p className="text-gray-800 font-medium leading-snug line-clamp-2">{d.formation_titre}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {d.type_formation === 'en_ligne' ? 'En ligne' : 'Présentiel'}
                          {d.formation_ville ? ` · ${d.formation_ville}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-800 tabular-nums whitespace-nowrap align-middle">
                        {d.facture ? `${fmt(d.facture.montant_ttc)} F` : '—'}
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <span
                          className={`inline-flex text-xs font-bold px-2.5 py-1 rounded-full
                        ${
                          d.type_payeur === 'tuteur'
                            ? 'bg-emerald-100 text-emerald-800'
                            : d.type_payeur === 'organisation'
                              ? 'bg-violet-100 text-violet-800'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                        >
                          {PAYEUR_LABELS[d.type_payeur] || 'Étudiant'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap align-middle">{fmtDate(d.created_at)}</td>
                      <td className="px-4 py-3.5 align-middle">
                        <JustificatifsCell demande={d} />
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <span className={`inline-flex text-xs font-bold px-2.5 py-1 rounded-full ring-1 ${b.color}`}>{b.label}</span>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex flex-col gap-2 min-w-[158px]">
                          {pending && (
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => doAcceptRow(d)}
                                className="inline-flex flex-1 min-w-[72px] justify-center items-center text-xs font-extrabold text-white bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 px-2.5 py-2 rounded-xl shadow-sm border border-emerald-700/20"
                              >
                                {busy ? '…' : 'Accepter'}
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  setRefuseFor(d)
                                  setRefuseMotif('')
                                }}
                                className="inline-flex flex-1 min-w-[72px] justify-center items-center text-xs font-extrabold border-2 border-red-300 text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 px-2.5 py-2 rounded-xl"
                              >
                                Refuser
                              </button>
                            </div>
                          )}
                          {showRevoke && !pending && (
                            <button
                              type="button"
                              disabled={revokeBusy}
                              onClick={() => setRevokeConfirm(d)}
                              className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 hover:bg-rose-100 disabled:opacity-50 px-2.5 py-2 rounded-xl w-full transition-colors"
                            >
                              {revokeBusy ? '…' : 'Retirer la facture'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDetailDemande(d)}
                            className="text-xs font-bold text-purple-700 bg-white border border-purple-200 hover:border-purple-400 hover:bg-purple-50/80 px-2.5 py-2 rounded-xl w-full transition-colors"
                          >
                            Fiche détaillée
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-4 py-3">
            <p className="text-xs text-slate-600">
              Lignes{' '}
              <span className="font-semibold tabular-nums">
                {filtered.length === 0 ? 0 : (Math.min(page, totalPages) - 1) * PAGE_SIZE + 1}
              </span>
              {'–'}
              <span className="font-semibold tabular-nums">
                {Math.min(Math.min(page, totalPages) * PAGE_SIZE, filtered.length)}
              </span>{' '}
              sur <span className="font-semibold tabular-nums">{filtered.length}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={batchBusy || page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Précédent
              </button>
              <span className="text-xs font-semibold text-slate-500 tabular-nums">
                Page {Math.min(page, totalPages)} / {totalPages}
              </span>
              <button
                type="button"
                disabled={batchBusy || page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      )}

      {detailDemande && (
        <ModalDetail demande={detailDemande} onClose={() => setDetailDemande(null)} onDecisionDone={handleDecisionDone} />
      )}

      {refuseFor && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-md"
          onClick={() => !refuseSaving && setRefuseFor(null)}
        >
          <div
            className="animate-scale-in w-full max-w-md rounded-2xl border border-white/60 bg-white p-5 shadow-[0_25px_80px_-12px_rgba(15,23,42,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-gray-900">Refuser la demande {refuseFor.reference}</h3>
            <p className="text-sm text-gray-500 mt-1">Le motif sera visible par le candidat.</p>
            <textarea
              className="mt-3 w-full input-field text-sm min-h-[100px] rounded-xl"
              placeholder="Motif du refus…"
              value={refuseMotif}
              onChange={(e) => setRefuseMotif(e.target.value)}
              disabled={refuseSaving}
            />
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                disabled={refuseSaving}
                onClick={() => {
                  setRefuseFor(null)
                  setRefuseMotif('')
                }}
                className="btn-outline flex-1 text-sm rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={refuseSaving}
                onClick={submitRefuseRow}
                className="flex-1 text-sm font-bold rounded-xl border border-red-300 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 px-4 py-2"
              >
                {refuseSaving ? '…' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {revokeConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-md"
          onClick={() => !isRevokingModal && setRevokeConfirm(null)}
        >
          <div
            className="animate-scale-in w-full max-w-md rounded-2xl border border-white/60 bg-white p-5 shadow-[0_25px_80px_-12px_rgba(15,23,42,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-gray-900">Retirer la facture ?</h3>
            <p className="text-sm text-gray-600 mt-2">
              La demande <span className="font-mono font-semibold">{revokeConfirm.reference}</span> repassera en{' '}
              <strong>attente de validation</strong>. Le candidat ne pourra plus télécharger la facture ni
              l&apos;attestation tant qu&apos;une nouvelle acceptation n&apos;aura pas été faite.
            </p>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                disabled={isRevokingModal}
                onClick={() => setRevokeConfirm(null)}
                className="btn-outline flex-1 text-sm rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isRevokingModal}
                onClick={() => doRevokeRow(revokeConfirm)}
                className="flex-1 text-sm font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 px-4 py-2.5"
              >
                {isRevokingModal ? '…' : 'Oui, retirer la facture'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardPage>
  )
}
