import { useState, useEffect, useRef, Fragment } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { mediaUrl } from '../utils/mediaUrl'
import StatutBadge from '../components/StatutBadge'
import PreinscriptionConditionsBlock from '../components/PreinscriptionConditionsBlock'
import { DashboardPage, DashboardHero, Panel, DashboardSpinner } from '../components/dashboard/DashboardChrome'
import { isDossierAcceptePourDocuments, canShowLettrePreinscription } from '../utils/dossierStatut'
import { primaryPhotoDocumentFromList, inferIsForeignerFromNationalite } from '../utils/preinscriptionDocumentRules'

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n)
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

/** Libellé + classes pour demandes proforma (tous flux confondus). */
function badgeProforma(statut, demande) {
  if (statut === 'acceptee') return { label: 'Acceptée', cls: 'bg-emerald-100 text-emerald-800 ring-emerald-200' }
  if (statut === 'refusee') return { label: 'Refusée', cls: 'bg-red-100 text-red-700 ring-red-200' }
  if (statut === 'en_attente') return { label: 'En attente de validation', cls: 'bg-amber-100 text-amber-900 ring-amber-200' }
  if (statut === 'vue' || statut === 'traitee') return { label: 'En cours de traitement', cls: 'bg-blue-100 text-blue-800 ring-blue-200' }
  if (statut === 'nouvelle') {
    const legacy = demande?.facture?.numero
    return legacy
      ? { label: 'En cours (historique)', cls: 'bg-slate-100 text-slate-700 ring-slate-200' }
      : { label: 'En attente de validation', cls: 'bg-amber-100 text-amber-900 ring-amber-200' }
  }
  return { label: statut || '—', cls: 'bg-gray-100 text-gray-700 ring-gray-200' }
}

const STATUT_CONFIG = {
  en_attente: { color: 'bg-amber-50 border-amber-200', icon: '⏳', msg: 'Votre dossier est en file d\'attente. Nous vous notifierons dès qu\'il sera pris en charge.' },
  en_cours: { color: 'bg-blue-50 border-blue-200', icon: '🔍', msg: 'Votre dossier est en cours d\'examen par notre équipe pédagogique.' },
  accepte: { color: 'bg-emerald-50 border-emerald-200', icon: '🎉', msg: 'Félicitations ! Votre préinscription est acceptée. Procédez au paiement pour confirmer votre place.' },
  refuse: { color: 'bg-red-50 border-red-200', icon: '❌', msg: 'Votre dossier n\'a pas été retenu. Consultez le commentaire de l\'administration.' },
}

function labelDossierStatut(statut) {
  if (statut === 'en_attente') return { label: 'En attente', cls: 'bg-amber-100 text-amber-900 ring-amber-200' }
  if (statut === 'en_cours') return { label: 'En cours de traitement', cls: 'bg-blue-100 text-blue-800 ring-blue-200' }
  if (statut === 'accepte') return { label: 'Acceptée', cls: 'bg-emerald-100 text-emerald-800 ring-emerald-200' }
  if (statut === 'refuse') return { label: 'Refusée', cls: 'bg-red-100 text-red-700 ring-red-200' }
  return { label: statut || '—', cls: 'bg-gray-100 text-gray-700 ring-gray-200' }
}

function ModalDetail({ open, onClose, type, payload }) {
  if (!open || !payload) return null

  const stop = (e) => e.stopPropagation()

  if (type === 'proforma') {
    const d = payload
    const b = badgeProforma(d.statut, d)
    const okDocs = d.statut === 'acceptee'
    return (
      <div className="ui-modal-overlay" role="dialog" aria-modal onClick={onClose}>
        <div className="ui-modal" onClick={stop}>
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-4 sm:px-5">
            <div className="min-w-0 pr-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Demande de facture proforma</p>
              <p className="truncate font-mono font-bold text-slate-900">{d.reference}</p>
            </div>
            <button type="button" onClick={onClose} className="shrink-0 text-2xl leading-none text-slate-400 hover:text-slate-700" aria-label="Fermer">
              ×
            </button>
          </div>
          <div className="ui-modal-body space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ring-1 ${b.cls}`}>{b.label}</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Formation</p>
              <p className="font-semibold text-slate-900">{d.formation_titre || '—'}</p>
              <p className="text-xs text-slate-500 mt-1">
                {d.type_formation === 'en_ligne' ? 'À distance (FAD)' : 'Présentiel'}
                {d.niveau ? ` · ${d.niveau}` : ''}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-slate-500 font-semibold">Déposée le</p>
                <p>{fmtDate(d.created_at)}</p>
              </div>
              {d.acceptee_le && (
                <div>
                  <p className="text-slate-500 font-semibold">Traitée le</p>
                  <p>{fmtDate(d.acceptee_le)}</p>
                </div>
              )}
            </div>
            {d.statut === 'refusee' && d.motif_refus && (
              <div className="rounded-xl border border-red-100 bg-red-50/80 px-3 py-2 text-red-900 text-xs">
                <p className="font-bold mb-1">Motif du refus</p>
                <p>{d.motif_refus}</p>
              </div>
            )}
            {!okDocs && d.statut !== 'refusee' && (
              <p className="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                La facture proforma et l&apos;attestation de préinscription ne sont disponibles qu&apos;après <strong>validation</strong> par le service pédagogique.
              </p>
            )}
            {okDocs && (
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                <p className="text-xs font-bold text-emerald-800">Vos documents sont prêts (même page depuis le tableau) :</p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/facture-publique/${d.reference}`}
                    className="text-xs font-bold bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 shadow-sm"
                    onClick={onClose}
                  >
                    Facture proforma
                  </Link>
                  <Link to={`/attestation-demande/${d.id}`} className="text-xs font-bold bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700" onClick={onClose}>
                    Attestation de préinscription
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const { dossier, formation, facture, documents } = payload
  const ld = labelDossierStatut(dossier.statut)
  return (
    <div className="ui-modal-overlay" role="dialog" aria-modal onClick={onClose}>
      <div className="ui-modal" onClick={stop}>
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-4 sm:px-5">
          <div className="min-w-0 pr-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Préinscription</p>
            <p className="truncate font-mono font-bold text-slate-900">{dossier.numero_dossier}</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 text-2xl leading-none text-slate-400 hover:text-slate-700" aria-label="Fermer">
            ×
          </button>
        </div>
        <div className="ui-modal-body space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ring-1 ${ld.cls}`}>{ld.label}</span>
            <StatutBadge statut={dossier.statut} />
          </div>
          {formation?.titre && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Formation</p>
              <p className="font-semibold text-slate-900">{formation.titre}</p>
            </div>
          )}
          <p className="text-xs text-slate-500">Soumise le {fmtDate(dossier.created_at)}</p>
          {dossier.commentaire_admin && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
              <p className="font-bold text-slate-600 mb-1">Message administration</p>
              <p className="text-slate-800">{dossier.commentaire_admin}</p>
            </div>
          )}
          {isDossierAcceptePourDocuments(dossier.statut) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              <Link to={`/facture/${dossier.id}`} className="text-xs font-bold border border-blue-300 text-blue-700 px-3 py-2 rounded-lg" onClick={onClose}>
                Facture
              </Link>
              <Link to={`/attestation/${dossier.id}`} className="text-xs font-bold bg-indigo-600 text-white px-3 py-2 rounded-lg" onClick={onClose}>
                Attestation
              </Link>
              {canShowLettrePreinscription(dossier, inferIsForeignerFromNationalite) && (
                <Link to={`/lettre/${dossier.id}`} className="text-xs font-bold bg-emerald-600 text-white px-3 py-2 rounded-lg" onClick={onClose}>
                  Lettre
                </Link>
              )}
            </div>
          )}
          {documents?.length > 0 && (
            <div className="text-xs text-slate-500">
              <p className="font-semibold text-slate-700 mb-1">{documents.length} document(s) joint(s)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EtudiantDossierPanel({ dossier, documents, formation, facture, onReload }) {
  const photoDoc = Array.isArray(documents) ? primaryPhotoDocumentFromList(documents) : null
  const canEditPhoto = dossier.statut === 'en_attente' || dossier.statut === 'en_cours'
  const [photoBusy, setPhotoBusy] = useState(false)
  const photoInputRef = useRef(null)
  const showLettre = canShowLettrePreinscription(dossier, inferIsForeignerFromNationalite)
  const accepted = isDossierAcceptePourDocuments(dossier.statut)
  const statutCfg = STATUT_CONFIG[dossier.statut] || { color: 'border-slate-200 bg-slate-50', icon: '📋', msg: '' }

  const handlePhotoSelected = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoBusy(true)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      await axios.post(`/api/etudiant/dossiers/${dossier.id}/photo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Photo d’identité enregistrée.')
      onReload?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Impossible d’enregistrer la photo.')
    } finally {
      setPhotoBusy(false)
    }
  }

  return (
    <article className="space-y-5 sm:space-y-6">
      {canEditPhoto && (
        <div className="flex flex-col gap-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {photoDoc && (
              <img
                src={mediaUrl(`/uploads/${photoDoc.chemin}`)}
                alt=""
                className="h-16 w-14 shrink-0 rounded-lg border border-white object-cover shadow ring-1 ring-indigo-200"
              />
            )}
            <div className="min-w-0 text-sm text-indigo-950">
              <p className="font-bold">Photo d’identité</p>
              <p className="mt-0.5 text-indigo-900/80">
                {photoDoc
                  ? 'Une photo est déjà jointe — vous pouvez la remplacer tant que le dossier n’est pas tranché.'
                  : 'Ajoutez une photo d’identité (JPG/PNG) pour les documents officiels.'}
              </p>
            </div>
          </div>
          <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/jpg" className="hidden" onChange={handlePhotoSelected} />
          <button
            type="button"
            disabled={photoBusy}
            onClick={() => photoInputRef.current?.click()}
            className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center rounded-xl border-2 border-indigo-300 bg-white px-4 py-2.5 text-sm font-bold text-indigo-800 shadow-sm hover:bg-indigo-50 disabled:opacity-50 sm:w-auto"
          >
            {photoBusy ? 'Envoi…' : photoDoc ? 'Remplacer la photo' : 'Ajouter ma photo'}
          </button>
        </div>
      )}

      {/* 1. Statut de la candidature */}
      <section className={`ui-section border-2 ${statutCfg.color}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-2xl shadow-inner sm:h-14 sm:w-14 sm:text-3xl">
            {statutCfg.icon}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                Dossier N° <span className="font-mono">{dossier.numero_dossier}</span>
              </h2>
              <StatutBadge statut={dossier.statut} />
            </div>
            {formation?.titre && (
              <p className="text-sm font-semibold text-blue-900 text-safe">{formation.titre}</p>
            )}
            <p className="text-sm leading-relaxed text-slate-600">{statutCfg.msg}</p>
            {dossier.commentaire_admin && (
              <div className="mt-2 rounded-xl border border-white/80 bg-white/70 p-3">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Message de l&apos;administration</p>
                <p className="text-sm text-slate-700 text-safe">{dossier.commentaire_admin}</p>
              </div>
            )}
            <p className="text-xs text-slate-500">
              Soumis le {new Date(dossier.created_at).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Formation concernée */}
      {formation && (
        <section className="ui-section">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-lg text-white shadow-md">
              🎓
            </div>
            <div className="min-w-0">
              <h3 className="ui-section-title mb-0">Formation concernée</h3>
            </div>
          </div>
          <h4 className="text-lg font-bold text-slate-900 text-safe sm:text-xl">{formation.titre}</h4>
          <span
            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
              formation.type === 'en_ligne' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
            }`}
          >
            {formation.type === 'en_ligne' ? 'En ligne (FAD)' : `Présentiel${formation.ville ? ` · ${formation.ville}` : ''}`}
          </span>
          <p className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
            Les montants (frais et scolarité) figurent sur votre facture proforma une fois le dossier instruit.
          </p>
          <div className="ui-info-grid mt-4 border-t border-slate-100 pt-4">
            {[
              ['Durée', formation.duree],
              ['Niveau de formation', formation.niveau || '—'],
              ['Niveau requis', formation.niveau_requis],
              ['Année académique', dossier.annee_academique],
            ].map(([l, v]) => (
              <div key={l} className="min-w-0 rounded-xl bg-slate-50/80 px-3 py-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{l}</span>
                <p className="mt-0.5 font-semibold text-slate-800 text-safe">{v || '—'}</p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <PreinscriptionConditionsBlock
              formationNiveau={dossier.formation_niveau_cible || formation?.niveau}
              profileKey={dossier.document_rule_profile}
            />
          </div>
        </section>
      )}

      {/* 3. Documents officiels */}
      <section
        className={`ui-section ${
          accepted ? 'border-emerald-200/90 bg-gradient-to-br from-emerald-50/80 to-white' : 'border-amber-200/80 bg-amber-50/40'
        }`}
      >
        <h3 className="ui-section-title">Documents officiels</h3>
        {!accepted ? (
          <p className="text-sm leading-relaxed text-amber-950/90">
            La facture proforma, l&apos;attestation et la lettre de préinscription ne sont téléchargeables qu&apos;après{' '}
            <strong>validation</strong> de cette candidature (statut « accepté »).
          </p>
        ) : (
          <>
            <p className="ui-section-sub">
              Candidature acceptée — téléchargez vos documents administratifs
              {showLettre ? ' (lettre réservée aux candidats étrangers éligibles).' : '.'}
            </p>
            <div className="ui-action-bar">
              <Link to={`/facture/${dossier.id}`} className="ui-doc-btn">
                Facture proforma
              </Link>
              <Link to={`/attestation/${dossier.id}`} className="ui-doc-btn">
                Attestation de préinscription
              </Link>
              {showLettre && (
                <Link to={`/lettre/${dossier.id}`} className="ui-doc-btn-solid">
                  Lettre de préinscription
                </Link>
              )}
            </div>
            {facture && (
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-emerald-100 bg-white/90 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Facture émise</p>
                  <p className="font-mono text-sm font-bold text-slate-800">{facture.numero}</p>
                  <p className="mt-1 text-xl font-black tabular-nums text-slate-900">
                    {fmt(facture.montant_ttc)} <span className="text-sm font-semibold text-slate-500">FCFA</span>
                  </p>
                </div>
                <Link to={`/facture/${dossier.id}`} className="btn-primary inline-flex min-h-[44px] w-full items-center justify-center sm:w-auto">
                  Voir et télécharger
                </Link>
              </div>
            )}
          </>
        )}
      </section>

      {/* 4. Documents soumis */}
      {documents && documents.length > 0 && (
        <section className="ui-section">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h3 className="ui-section-title mb-0">Documents soumis</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
              {documents.length} fichier{documents.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="ui-grid-docs">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-base shadow-sm">
                  📄
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold capitalize text-slate-800">
                    {String(doc.type_document || '').replace(/_/g, ' ')}
                  </p>
                  <p className="truncate text-xs text-slate-400" title={doc.nom_fichier}>
                    {doc.nom_fichier}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-emerald-600" title="Déposé">
                  ✓
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  )
}

export default function EtudiantDashboard() {
  const { user } = useAuth()
  const [dossierItems, setDossierItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [demandesPro, setDemandesPro] = useState([])
  const [notifications, setNotifications] = useState([])
  const [unreadNotif, setUnreadNotif] = useState(0)
  const [modal, setModal] = useState(null)

  const reloadDossiers = () => {
    axios
      .get('/api/etudiant/dossiers')
      .then((r) => r.data)
      .then((d1) => setDossierItems(Array.isArray(d1?.dossiers) ? d1.dossiers : []))
      .catch(() => {})
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      axios.get('/api/etudiant/dossiers').then((r) => r.data).catch(() => ({ dossiers: [] })),
      axios.get('/api/etudiant/demandes-proforma').then((r) => r.data).catch(() => []),
    ])
      .then(([d1, d2]) => {
        setDossierItems(Array.isArray(d1?.dossiers) ? d1.dossiers : [])
        setDemandesPro(Array.isArray(d2) ? d2 : [])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    axios.get('/api/etudiant/notifications', { params: { limit: 8 } })
      .then(({ data }) => {
        setNotifications(Array.isArray(data.items) ? data.items : [])
        setUnreadNotif(Number(data.unread || 0))
      })
      .catch(() => {
        setNotifications([])
        setUnreadNotif(0)
      })
  }, [])

  const hasDossiers = dossierItems.length > 0
  const demandesProSorted = [...demandesPro].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const dossiersSorted = [...dossierItems].sort((a, b) => new Date(b.dossier?.created_at) - new Date(a.dossier?.created_at))

  return (
    <DashboardPage maxWidthClass="max-w-7xl">
      <DashboardHero
        eyebrow="Espace étudiant"
        title={`Bonjour, ${user.prenom} ${user.nom}`}
        subtitle="Votre compte candidat regroupe la préinscription et la demande de facture proforma — deux démarches distinctes. Utilisez les actions ci-dessous, puis suivez l’avancement de chaque dossier."
        actions={
          !loading ? (
            <>
              <Link to="/chat" className="btn-outline inline-flex min-h-[44px] items-center justify-center gap-2">
                Messages
              </Link>
              <Link to="/mes-acces" className="btn-outline inline-flex min-h-[44px] items-center justify-center gap-2">
                Mes identifiants
              </Link>
              <Link
                to="/demande-proforma"
                className="btn-outline inline-flex min-h-[44px] items-center justify-center gap-2 border-violet-200 text-violet-800 hover:bg-violet-50"
              >
                Demande de facture proforma
              </Link>
              <Link to="/preinscription" className="btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 shadow-lg shadow-blue-600/20">
                {hasDossiers ? '+ Candidater à une autre formation' : '+ Nouvelle préinscription'}
              </Link>
            </>
          ) : null
        }
      />

      <ModalDetail
        open={!!modal}
        onClose={() => setModal(null)}
        type={modal?.type}
        payload={modal?.payload}
      />

      {notifications.length > 0 && (
        <Panel
          className="mb-8"
          title="Notifications récentes"
          meta={
            unreadNotif > 0 ? (
              <button
                type="button"
                className="rounded-lg border border-blue-200/80 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
                onClick={async () => {
                  try {
                    await axios.post('/api/etudiant/notifications/read-all')
                    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })))
                    setUnreadNotif(0)
                  } catch { /* ignore */ }
                }}
              >
                Marquer tout comme lu ({unreadNotif})
              </button>
            ) : null
          }
          bodyClassName="p-6"
        >
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`rounded-2xl border px-4 py-3 transition-shadow ${n.read_at ? 'border-slate-100 bg-slate-50/80' : 'border-blue-200/80 bg-gradient-to-r from-blue-50 to-indigo-50/50 shadow-sm'}`}
              >
                <p className="text-sm font-bold text-slate-800">{n.title}</p>
                <p className="text-sm text-slate-600">{n.message}</p>
                <p className="mt-1 text-xs text-slate-400">{new Date(n.created_at).toLocaleString('fr-FR')}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {loading ? (
        <DashboardSpinner className="py-24" />
      ) : (
        <div className="space-y-8">
          <Panel
            title="Demandes de facture proforma"
            meta={
              <Link
                to="/demande-proforma"
                className="text-xs font-semibold text-violet-700 hover:underline shrink-0"
              >
                + Déposer une demande
              </Link>
            }
            bodyClassName="p-0 overflow-hidden"
          >
            <p className="px-5 pt-4 pb-2 text-xs text-slate-500">
              Après envoi des justificatifs prévus aux conditions d’admission, la <strong>facture proforma</strong> et
              l&apos;<strong>attestation</strong> apparaissent ici dès que la demande est <strong>acceptée</strong>.
            </p>
            <div className="md:hidden divide-y divide-slate-100 border-t border-slate-100">
              {demandesProSorted.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-400">
                  Aucune demande.{' '}
                  <Link to="/demande-proforma" className="font-semibold text-blue-700 hover:underline">
                    Déposer une demande
                  </Link>
                </div>
              ) : (
                demandesProSorted.map((d) => {
                  const b = badgeProforma(d.statut, d)
                  const accepted = d.statut === 'acceptee'
                  return (
                    <div key={d.id} className="p-4 space-y-3">
                      <button
                        type="button"
                        className="w-full min-h-[44px] rounded-xl text-left text-sm text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        onClick={() => setModal({ type: 'proforma', payload: d })}
                      >
                        <p className="font-mono text-xs font-bold text-slate-700">{d.reference}</p>
                        <p className="mt-1 line-clamp-2 font-medium text-slate-900">{d.formation_titre || '—'}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-500">{fmtDate(d.created_at)}</span>
                          <span className={`inline-flex text-xs font-bold px-2.5 py-1 rounded-full ring-1 ${b.cls}`}>{b.label}</span>
                        </div>
                      </button>
                      <div className="flex min-h-[44px] items-center">
                        <button
                          type="button"
                          className="text-sm font-bold text-blue-700 underline-offset-2 hover:underline"
                          onClick={() => setModal({ type: 'proforma', payload: d })}
                        >
                          Voir le détail
                        </button>
                      </div>
                      {accepted && d.reference && (
                        <div className="rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50/90 to-teal-50/40 p-3">
                          <p className="mb-2 text-xs font-bold text-emerald-900">Documents disponibles</p>
                          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <Link
                              to={`/facture-publique/${d.reference}`}
                              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-blue-600 px-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
                            >
                              Facture proforma
                            </Link>
                            <Link
                              to={`/attestation-demande/${d.id}`}
                              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-indigo-600 px-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
                            >
                              Attestation de préinscription
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
            <div className="hidden md:block table-scroll">
              <table className="dashboard-table w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Référence</th>
                    <th className="px-4 py-3 min-w-[12rem]">Formation</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">État</th>
                    <th className="px-4 py-3 w-28"> </th>
                  </tr>
                </thead>
                <tbody>
                  {demandesProSorted.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                        Aucune demande.{' '}
                        <Link to="/demande-proforma" className="font-semibold text-blue-700 hover:underline">
                          Déposer une demande
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    demandesProSorted.map((d) => {
                      const b = badgeProforma(d.statut, d)
                      const accepted = d.statut === 'acceptee'
                      return (
                        <Fragment key={d.id}>
                          <tr
                            className="border-b border-slate-100 hover:bg-blue-50/40 cursor-pointer transition-colors"
                            onClick={() => setModal({ type: 'proforma', payload: d })}
                          >
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">{d.reference}</td>
                            <td className="px-4 py-3 font-medium text-slate-900 table-cell-primary" title={d.formation_titre}>
                              {d.formation_titre || '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDate(d.created_at)}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex text-xs font-bold px-2.5 py-1 rounded-full ring-1 ${b.cls}`}>{b.label}</span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                className="text-xs font-bold text-blue-700 hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setModal({ type: 'proforma', payload: d })
                                }}
                              >
                                Voir le détail
                              </button>
                            </td>
                          </tr>
                          {accepted && d.reference && (
                            <tr className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50/90 to-teal-50/40">
                              <td colSpan={5} className="px-4 py-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                                  <span className="text-xs font-bold text-emerald-900 shrink-0">Documents disponibles :</span>
                                  <div className="flex flex-wrap gap-2">
                                    <Link
                                      to={`/facture-publique/${d.reference}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                                    >
                                      Facture proforma
                                    </Link>
                                    <Link
                                      to={`/attestation-demande/${d.id}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
                                    >
                                      Attestation de préinscription
                                    </Link>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Préinscriptions (dossiers)" bodyClassName="p-0 overflow-hidden">
            <p className="px-5 pt-4 pb-2 text-xs text-slate-500">
              Candidatures déposées sur la plateforme — suivez le traitement jusqu&apos;à décision (acceptée ou refusée).
            </p>
            <div className="md:hidden divide-y divide-slate-100 border-t border-slate-100">
              {dossiersSorted.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-400">
                  Aucun dossier.{' '}
                  <Link to="/preinscription" className="font-semibold text-blue-700 hover:underline">
                    Lancer une préinscription
                  </Link>
                </div>
              ) : (
                dossiersSorted.map((row) => {
                  const { dossier, formation } = row
                  const ld = labelDossierStatut(dossier.statut)
                  return (
                    <div key={dossier.id} className="p-4 space-y-3">
                      <button
                        type="button"
                        className="w-full min-h-[44px] rounded-xl text-left text-sm text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        onClick={() => setModal({ type: 'dossier', payload: row })}
                      >
                        <p className="font-mono text-xs font-bold text-slate-700">{dossier.numero_dossier}</p>
                        <p className="mt-1 line-clamp-2 font-medium text-slate-900">{formation?.titre || '—'}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-500">{fmtDate(dossier.created_at)}</span>
                          <span className={`inline-flex text-xs font-bold px-2.5 py-1 rounded-full ring-1 ${ld.cls}`}>{ld.label}</span>
                        </div>
                      </button>
                      <div className="flex min-h-[44px] items-center">
                        <button
                          type="button"
                          className="text-sm font-bold text-blue-700 underline-offset-2 hover:underline"
                          onClick={() => setModal({ type: 'dossier', payload: row })}
                        >
                          Voir le détail
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="hidden md:block table-scroll">
              <table className="dashboard-table w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">N° dossier</th>
                    <th className="px-4 py-3 min-w-[12rem]">Formation</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">État</th>
                    <th className="px-4 py-3 w-28"> </th>
                  </tr>
                </thead>
                <tbody>
                  {dossiersSorted.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                        Aucun dossier.{' '}
                        <Link to="/preinscription" className="font-semibold text-blue-700 hover:underline">
                          Lancer une préinscription
                        </Link>
                      </td>
                    </tr>
                  ) : (
                dossiersSorted.map((row) => {
                  const { dossier, formation } = row
                  const ld = labelDossierStatut(dossier.statut)
                  const accepted = isDossierAcceptePourDocuments(dossier.statut)
                  const showLettre = canShowLettrePreinscription(dossier, inferIsForeignerFromNationalite)
                  return (
                    <Fragment key={dossier.id}>
                      <tr
                        className="border-b border-slate-100 hover:bg-blue-50/40 cursor-pointer transition-colors"
                        onClick={() => setModal({ type: 'dossier', payload: row })}
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">{dossier.numero_dossier}</td>
                        <td className="px-4 py-3 font-medium text-slate-900 table-cell-primary" title={formation?.titre}>
                          {formation?.titre || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDate(dossier.created_at)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex text-xs font-bold px-2.5 py-1 rounded-full ring-1 ${ld.cls}`}>{ld.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="text-xs font-bold text-blue-700 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation()
                              setModal({ type: 'dossier', payload: row })
                            }}
                          >
                            Voir le détail
                          </button>
                        </td>
                      </tr>
                      {accepted && (
                        <tr className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50/90 to-teal-50/40">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                              <span className="text-xs font-bold text-emerald-900 shrink-0">Documents disponibles :</span>
                              <div className="flex flex-wrap gap-2">
                                <Link
                                  to={`/facture/${dossier.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                                >
                                  Facture proforma
                                </Link>
                                <Link
                                  to={`/attestation/${dossier.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
                                >
                                  Attestation
                                </Link>
                                {showLettre && (
                                  <Link
                                    to={`/lettre/${dossier.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                                  >
                                    Lettre de préinscription
                                  </Link>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          {!hasDossiers ? (
            <div className="rounded-3xl border border-slate-200/80 bg-white/90 px-6 py-12 text-center shadow-xl shadow-slate-200/40 backdrop-blur-md">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-blue-50 text-4xl shadow-inner">📂</div>
              <h2 className="mb-2 text-xl font-black text-slate-800">Aucun dossier de préinscription détaillé</h2>
              <p className="mx-auto mb-6 max-w-md text-slate-500 text-sm">
                Les tableaux ci-dessus listent vos demandes. Pour une candidature complète avec pièces, démarrez une préinscription ou une demande de facture proforma selon votre besoin.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/demande-proforma" className="btn-outline inline-flex items-center gap-2 px-5 py-2.5 text-sm">
                  🧾 Demande facture proforma
                </Link>
                <Link to="/mon-etablissement" className="btn-outline inline-flex items-center gap-2 px-5 py-2.5 text-sm shadow-sm">
                  Filières & formations
                </Link>
                <Link to="/preinscription" className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-sm shadow-lg shadow-blue-600/20">
                  Démarrer une préinscription →
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h2 className="text-lg font-black text-slate-800">Détail de vos candidatures</h2>
              <div className="space-y-10">
                {dossierItems.map(({ dossier, documents, formation, facture }) => (
                  <EtudiantDossierPanel
                    key={dossier.id}
                    dossier={dossier}
                    documents={documents}
                    formation={formation}
                    facture={facture}
                    onReload={reloadDossiers}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardPage>
  )
}
