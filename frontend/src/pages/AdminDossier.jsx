import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import StatutBadge from '../components/StatutBadge'
import PreinscriptionConditionsBlock from '../components/PreinscriptionConditionsBlock'
import { isDossierAcceptePourDocuments } from '../utils/dossierStatut'
import { mediaUrl } from '../utils/mediaUrl'
import { primaryPhotoDocumentFromList, isPhotoDocumentType } from '../utils/preinscriptionDocumentRules'

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0)

const ALLOWED_TRANSITIONS = {
  en_attente: ['en_attente', 'en_cours', 'refuse', 'accepte'],
  en_cours: ['en_cours', 'accepte', 'refuse'],
  accepte: ['accepte'],
  refuse: ['refuse', 'en_cours'],
}

const panel =
  'rounded-2xl border border-slate-200/90 bg-white text-card-foreground shadow-sm ring-1 ring-slate-100/60'

function FieldLabel({ children }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{children}</span>
  )
}

function SectionTitle({ icon, children }) {
  return (
    <h2 className="mb-4 flex items-center gap-2.5 text-sm font-bold tracking-tight text-slate-900">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 text-base ring-1 ring-slate-200/80 shadow-inner"
        aria-hidden
      >
        {icon}
      </span>
      {children}
    </h2>
  )
}

function formatNomComplet(d) {
  const parts = [d?.prenom, d?.nom].map((s) => String(s || '').trim()).filter(Boolean)
  return parts.length ? parts.join(' ') : '—'
}

function formatDateFr(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR')
}

function initialsFrom(d) {
  const p = (d?.prenom || '?')[0]
  const n = (d?.nom || '')[0] || ''
  return `${p}${n}`.toUpperCase()
}

export default function AdminDossier() {
  const { id } = useParams()
  const [dossier, setDossier] = useState(null)
  const [documents, setDocuments] = useState([])
  const [formation, setFormation] = useState(null)
  const [facture, setFacture] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [genFacture, setGenFacture] = useState(false)
  const [decision, setDecision] = useState({ statut: '', commentaire: '' })

  useEffect(() => {
    axios
      .get(`/api/admin/dossiers/${id}`)
      .then(({ data }) => {
        setDossier(data.dossier)
        setDocuments(Array.isArray(data.documents) ? data.documents : [])
        setFormation(data.formation || null)
        setFacture(data.facture || null)
        setDecision({
          statut: data.dossier.statut,
          commentaire: data.dossier.commentaire_admin || '',
        })
      })
      .catch(() => toast.error('Dossier introuvable'))
      .finally(() => setLoading(false))
  }, [id])

  const handleUpdateStatut = async () => {
    const current = dossier?.statut || 'en_attente'
    const allowed = ALLOWED_TRANSITIONS[current] || ['en_attente']
    if (!decision.statut || !allowed.includes(decision.statut)) {
      toast.error(`Transition non autorisée: ${current} → ${decision.statut || '?'}`)
      return
    }
    if (decision.statut === 'refuse' && !String(decision.commentaire || '').trim()) {
      toast.error('Le motif de refus est obligatoire.')
      return
    }
    setSaving(true)
    try {
      await axios.put(`/api/admin/dossiers/${id}/statut`, {
        statut: decision.statut,
        commentaire: decision.commentaire,
      })
      toast.success('Décision enregistrée')
      setDossier((prev) => ({
        ...prev,
        statut: decision.statut,
        commentaire_admin: decision.commentaire,
      }))
    } catch {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  const handleGenererFacture = async () => {
    setGenFacture(true)
    try {
      const { data } = await axios.post(`/api/factures/generer/${id}`)
      setFacture(data)
      toast.success('Facture générée')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur génération facture')
    } finally {
      setGenFacture(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-gradient-to-b from-slate-50 to-white">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        <p className="text-sm font-medium text-slate-600">Chargement du dossier…</p>
      </div>
    )
  }

  if (!dossier) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-slate-500">Dossier introuvable</p>
      </div>
    )
  }

  const allowedTransitions = ALLOWED_TRANSITIONS[dossier.statut || 'en_attente'] || ['en_attente']
  const isAccepte = isDossierAcceptePourDocuments(dossier.statut)
  const photoDoc = primaryPhotoDocumentFromList(documents)
  const nomComplet = formatNomComplet(dossier)

  const decisionBlock = (
    <div className="bg-gradient-to-br from-slate-50/90 via-white to-indigo-50/30 px-5 py-5 sm:px-6 sm:py-6">
      <SectionTitle icon="⚖️">Décision</SectionTitle>
      <p className="-mt-2 mb-4 text-xs leading-relaxed text-slate-600">
        Modifiez le statut du dossier et laissez un message au candidat si nécessaire.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {[
          ['en_attente', 'En attente', 'amber'],
          ['en_cours', 'En cours', 'indigo'],
          ['accepte', 'Accepter', 'emerald'],
          ['refuse', 'Refuser', 'red'],
        ].map(([value, label, tone]) => {
          const active = decision.statut === value
          const disabled = !allowedTransitions.includes(value)
          const tones = {
            amber: active
              ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm ring-1 ring-amber-200/80'
              : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50/40',
            indigo: active
              ? 'border-indigo-500 bg-indigo-50 text-indigo-800 shadow-sm'
              : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/40',
            emerald: active
              ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-200/80'
              : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400 hover:bg-emerald-50/40',
            red: active
              ? 'border-red-500 bg-red-50 text-red-900 shadow-sm'
              : 'border-slate-200 bg-white text-slate-700 hover:border-red-400 hover:bg-red-50/50',
          }
          return (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => setDecision((p) => ({ ...p, statut: value }))}
              className={`min-h-[2.75rem] rounded-xl border-2 py-2 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm ${tones[tone]}`}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-xs font-bold text-slate-700">Message à l&apos;étudiant</label>
        <textarea
          className="input-field min-h-[88px] rounded-xl py-2.5 text-sm leading-relaxed"
          rows={3}
          placeholder="Commentaire ou motif de la décision…"
          value={decision.commentaire}
          onChange={(e) => setDecision((p) => ({ ...p, commentaire: e.target.value }))}
        />
        {decision.statut === 'refuse' && (
          <p className="mt-1.5 text-xs font-medium text-red-600">Motif obligatoire pour un refus.</p>
        )}
      </div>

      <button
        type="button"
        onClick={handleUpdateStatut}
        disabled={saving || !decision.statut}
        className="btn-primary mt-5 w-full rounded-xl py-2.5 text-sm shadow-md shadow-indigo-900/15 disabled:opacity-50"
      >
        {saving ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Enregistrement…
          </span>
        ) : (
          'Enregistrer la décision'
        )}
      </button>
    </div>
  )

  const documentsOfficielsBlock = isAccepte && (
    <div className="border-t border-emerald-200/70 bg-gradient-to-b from-emerald-50/90 to-white px-5 py-5 sm:px-6">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-emerald-950">
        <span aria-hidden>📜</span>
        Documents officiels
      </h3>
      <p className="mb-4 text-xs leading-relaxed text-emerald-800/90">
        Attestation disponible. Lettre réservée aux candidats étrangers acceptés en ligne.
      </p>
      <div className="flex flex-col gap-2.5">
        {dossier.source !== 'staff' && (
          <Link
            to={`/lettre/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700"
          >
            Lettre de préinscription
          </Link>
        )}
        <Link
          to={`/attestation/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-indigo-600 bg-white px-4 py-3 text-sm font-semibold text-indigo-800 shadow-sm transition hover:bg-indigo-50"
        >
          Attestation de préinscription
        </Link>
      </div>
    </div>
  )

  const factureBlock = (
    <div className={`${panel} overflow-hidden`}>
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/40 px-5 py-4">
        <SectionTitle icon="🧾">Facture proforma</SectionTitle>
      </div>
      <div className="p-5">
        {facture ? (
          <>
            <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-inner">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Facture émise</p>
              <p className="mt-1 font-mono text-sm font-bold text-slate-800">{facture.numero}</p>
              <p className="mt-2 text-2xl font-black tabular-nums text-indigo-700">{fmt(facture.montant_ttc)} FCFA</p>
            </div>
            <Link
              to={`/facture/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/50"
            >
              Voir la facture →
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-slate-600">Aucune facture générée pour ce dossier.</p>
            <button
              type="button"
              onClick={handleGenererFacture}
              disabled={genFacture}
              className="btn-primary mt-4 w-full rounded-xl py-2.5 text-sm disabled:opacity-50"
            >
              {genFacture ? 'Génération…' : '+ Générer la facture'}
            </button>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-b from-slate-100/80 via-slate-50 to-white">
      <main className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        {/* En-tête candidat */}
        <header className="relative mb-6 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md ring-1 ring-slate-100/80">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 opacity-[0.97]"
            aria-hidden
          />
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-72 rounded-full bg-violet-500/15 blur-2xl" aria-hidden />

          <div className="relative px-5 py-6 sm:px-8 sm:py-8">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <Link
                to="/admin/dossiers"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                ← Retour
              </Link>
              {dossier.source === 'staff' && (
                <span className="rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-100 ring-1 ring-cyan-300/30">
                  Guichet
                </span>
              )}
              {dossier.etablissement_nom && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 ring-1 ring-white/10">
                  {dossier.etablissement_nom}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
              {photoDoc ? (
                <img
                  src={mediaUrl(`/uploads/${photoDoc.chemin}`)}
                  alt=""
                  className="h-24 w-20 shrink-0 rounded-2xl border-2 border-white/30 object-cover shadow-xl ring-2 ring-white/20"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-600 text-2xl font-black text-white shadow-xl ring-2 ring-white/25">
                  {initialsFrom(dossier)}
                </div>
              )}
              <div className="min-w-0 flex-1 text-white">
                <p className="text-xs font-semibold uppercase tracking-widest text-cyan-200/90">Dossier de préinscription</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{nomComplet}</h1>
                <p className="mt-1 font-mono text-sm text-slate-300">{dossier.numero_dossier}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatutBadge statut={dossier.statut} />
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${
                      dossier.type_formation === 'en_ligne'
                        ? 'bg-emerald-400/20 text-emerald-100 ring-emerald-300/40'
                        : 'bg-sky-400/20 text-sky-100 ring-sky-300/40'
                    }`}
                  >
                    {dossier.type_formation === 'en_ligne' ? 'FAD (en ligne)' : 'Présentiel'}
                  </span>
                  <span className="text-xs text-slate-400">
                    Déposé le{' '}
                    <time dateTime={dossier.created_at}>
                      {new Date(dossier.created_at).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
                    </time>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-12">
          {/* Colonne principale */}
          <div className="space-y-5 lg:col-span-8">
            <section className={`${panel} p-5 sm:p-6`}>
              <SectionTitle icon="👤">Informations personnelles</SectionTitle>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                {[
                  ['Nom complet', nomComplet],
                  ['Matricule (compte)', dossier.matricule || '—'],
                  ['Email', dossier.email || '—'],
                  ['Téléphone', dossier.telephone || '—'],
                  ['Nationalité', dossier.nationalite || '—'],
                  ['Date de naissance', formatDateFr(dossier.date_naissance)],
                  ['Lieu de naissance', dossier.lieu_naissance || '—'],
                  ['Adresse', dossier.adresse || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5">
                    <FieldLabel>{label}</FieldLabel>
                    <p className="mt-1 font-semibold leading-snug text-slate-900 break-words">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className={`${panel} p-5 sm:p-6`}>
              <SectionTitle icon="🎓">Formation demandée</SectionTitle>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                {[
                  ['Formation', dossier.filiere],
                  ['Type', dossier.type_formation === 'en_ligne' ? 'FAD (en ligne)' : 'Présentiel'],
                  ['Niveau requis (diplôme)', dossier.niveau],
                  ['Niveau de formation', dossier.formation_niveau_cible || formation?.niveau || '—'],
                  ['Année académique', dossier.annee_academique],
                  ['Dernier diplôme', dossier.dernier_diplome],
                  ['Établissement d\'origine', dossier.etablissement_origine],
                  ['Mention', dossier.mention || 'Non renseignée'],
                  ['Année d\'obtention', dossier.annee_obtention || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <FieldLabel>{label}</FieldLabel>
                    <p className="mt-1 font-semibold leading-snug text-slate-900">{value || '—'}</p>
                  </div>
                ))}
              </div>

              {formation && (
                <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 sm:grid-cols-4">
                  <div>
                    <FieldLabel>Inscription</FieldLabel>
                    <p className="mt-1 font-bold tabular-nums text-slate-800">{fmt(formation.frais_inscription)} FCFA</p>
                  </div>
                  <div>
                    <FieldLabel>Mensualité</FieldLabel>
                    <p className="mt-1 font-bold tabular-nums text-slate-800">
                      {fmt(formation.mensualite)} × {formation.duree_mois || '—'} mois
                    </p>
                  </div>
                  <div>
                    <FieldLabel>Total mensualités</FieldLabel>
                    <p className="mt-1 font-bold tabular-nums text-emerald-800">
                      {fmt((Number(formation.mensualite) || 0) * (Number(formation.duree_mois) || 0))} FCFA
                    </p>
                  </div>
                  <div>
                    <FieldLabel>Forfait annuel</FieldLabel>
                    <p className="mt-1 text-lg font-black tabular-nums text-indigo-700">{fmt(formation.prix)} FCFA</p>
                  </div>
                </div>
              )}

              <div className="mt-5 border-t border-slate-100 pt-5">
                <PreinscriptionConditionsBlock
                  formationNiveau={dossier.formation_niveau_cible || formation?.niveau}
                  profileKey={dossier.document_rule_profile}
                />
              </div>
            </section>

            <section className={`${panel} p-5 sm:p-6`}>
              <SectionTitle icon="📎">Documents soumis</SectionTitle>
              {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 py-12 text-center">
                  <span className="text-3xl opacity-40" aria-hidden>📭</span>
                  <p className="mt-2 text-sm font-medium text-slate-600">Aucun document soumis</p>
                  {dossier.source === 'staff' && (
                    <p className="mt-1 max-w-xs text-xs text-slate-500">Dossier guichet — saisie sans pièces jointes.</p>
                  )}
                </div>
              ) : (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={mediaUrl(`/uploads/${doc.chemin}`)}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 transition hover:border-indigo-300 hover:bg-indigo-50/60 hover:shadow-sm"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white bg-white text-lg shadow-sm">
                        {isPhotoDocumentType(doc.type_document) ? '🖼️' : '📄'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {doc.type_document.replace(/_/g, ' ')}
                        </p>
                        <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-indigo-800">
                          {doc.nom_fichier}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-indigo-600 opacity-0 transition group-hover:opacity-100">
                        Ouvrir →
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-5 lg:col-span-4 lg:sticky lg:top-4 lg:self-start">
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 shadow-md ring-1 ring-slate-100/60">
              {decisionBlock}
              {documentsOfficielsBlock}
            </div>

            {factureBlock}

            {dossier.commentaire_admin && (
              <div className={`${panel} p-5`}>
                <FieldLabel>Dernier commentaire admin</FieldLabel>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{dossier.commentaire_admin}</p>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  )
}
