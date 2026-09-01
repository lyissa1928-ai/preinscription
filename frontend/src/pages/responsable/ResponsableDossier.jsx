import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { chatWithStudentUrl } from '../../utils/chatWithStudentUrl'
import StatutBadge from '../../components/StatutBadge'
import PreinscriptionConditionsBlock from '../../components/PreinscriptionConditionsBlock'
import { isDossierAcceptePourDocuments } from '../../utils/dossierStatut'
import { mediaUrl } from '../../utils/mediaUrl'
import { primaryPhotoDocumentFromList, isPhotoDocumentType } from '../../utils/preinscriptionDocumentRules'

const ALLOWED_TRANSITIONS = {
  en_attente: ['en_attente', 'en_cours', 'refuse', 'accepte'],
  en_cours: ['en_cours', 'accepte', 'refuse'],
  accepte: ['accepte'],
  refuse: ['refuse', 'en_cours'],
}

const panel =
  'rounded-xl border border-slate-200/90 bg-white text-card-foreground shadow-sm'

const FieldLabel = ({ children }) => (
  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{children}</span>
)

function SectionTitle({ icon, children }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-tight text-slate-900">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm ring-1 ring-slate-200/80"
        aria-hidden
      >
        {icon}
      </span>
      {children}
    </h2>
  )
}

export default function ResponsableDossier() {
  const { id } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [decision, setDecision] = useState({ statut: '', motif_rejet: '' })

  useEffect(() => {
    axios
      .get(`/api/responsable/dossiers/${id}`)
      .then(({ data }) => {
        setData(data)
        setDecision((prev) => ({ ...prev, statut: data.dossier.statut }))
      })
      .catch(() => toast.error('Dossier introuvable'))
      .finally(() => setLoading(false))
  }, [id])

  const handleDecision = async () => {
    if (!decision.statut) return toast.error('Choisissez un statut')
    const current = data?.dossier?.statut || 'en_attente'
    const allowed = ALLOWED_TRANSITIONS[current] || ['en_attente']
    if (!allowed.includes(decision.statut)) {
      return toast.error(`Transition non autorisée: ${current} -> ${decision.statut}`)
    }
    if (decision.statut === 'refuse' && !String(decision.motif_rejet || '').trim()) {
      return toast.error('Le motif de rejet est obligatoire.')
    }
    setSaving(true)
    try {
      const { data: res } = await axios.put(`/api/responsable/dossiers/${id}/statut`, decision)
      toast.success(res.message)
      setData((prev) => ({
        ...prev,
        dossier: {
          ...prev.dossier,
          statut: decision.statut,
          commentaire_admin: decision.statut === 'refuse' ? decision.motif_rejet : prev.dossier.commentaire_admin,
          lettre_generee: decision.statut === 'accepte',
        },
      }))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        <p className="text-sm font-medium text-slate-600">Chargement du dossier…</p>
      </div>
    )
  }
  if (!data) return null

  const { dossier, documents: docsRaw, formation } = data
  const documents = Array.isArray(docsRaw) ? docsRaw : []
  const photoDoc = primaryPhotoDocumentFromList(documents)
  const allowedTransitions = ALLOWED_TRANSITIONS[dossier.statut || 'en_attente'] || ['en_attente']

  const isAccepte = isDossierAcceptePourDocuments(dossier.statut)

  const showChatterCandidat =
    user?.role === 'responsable' &&
    user?.etablissement_id != null &&
    dossier.etudiant_id != null &&
    Number(dossier.etudiant_id) > 0

  const decisionBlock = (
    <>
      <div
        className={`bg-gradient-to-br from-slate-50/90 via-white to-indigo-50/30 px-5 py-5 sm:px-6 sm:py-6 ${isAccepte ? 'border-b border-slate-100' : ''}`}
      >
        <SectionTitle icon="⚖️">Décision pédagogique</SectionTitle>
        <p className="-mt-2 mb-4 text-xs leading-relaxed text-slate-600">
          Choisissez le statut puis enregistrez. Les transitions possibles dépendent de l’état actuel du dossier.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDecision((p) => ({ ...p, statut: 'en_cours' }))}
            disabled={!allowedTransitions.includes('en_cours')}
            className={`min-h-[2.75rem] rounded-xl border-2 py-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
              decision.statut === 'en_cours'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-800 shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-slate-50'
            }`}
          >
            En cours
          </button>
          <button
            type="button"
            onClick={() => setDecision((p) => ({ ...p, statut: 'en_attente' }))}
            disabled={!allowedTransitions.includes('en_attente')}
            className={`min-h-[2.75rem] rounded-xl border-2 py-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
              decision.statut === 'en_attente'
                ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-slate-50'
            }`}
          >
            En attente
          </button>
          <button
            type="button"
            onClick={() => setDecision((p) => ({ ...p, statut: 'accepte' }))}
            disabled={!allowedTransitions.includes('accepte')}
            className={`min-h-[2.75rem] rounded-xl border-2 py-2 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
              decision.statut === 'accepte'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-200/80'
                : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400 hover:bg-emerald-50/40'
            }`}
          >
            Accepter
          </button>
          <button
            type="button"
            onClick={() => setDecision((p) => ({ ...p, statut: 'refuse' }))}
            disabled={!allowedTransitions.includes('refuse')}
            className={`min-h-[2.75rem] rounded-xl border-2 py-2 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
              decision.statut === 'refuse'
                ? 'border-red-500 bg-red-50 text-red-900 shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-red-400 hover:bg-red-50/50'
            }`}
          >
            Refuser
          </button>
        </div>

        {decision.statut === 'refuse' && (
          <div className="mt-4">
            <label className="label-field">
              Motif de rejet <span className="text-red-500">*</span>
            </label>
            <textarea
              className="input-field min-h-[88px] rounded-xl py-2.5 text-sm leading-relaxed"
              rows={3}
              placeholder="Expliquez le motif du rejet au candidat…"
              value={decision.motif_rejet}
              onChange={(e) => setDecision((p) => ({ ...p, motif_rejet: e.target.value }))}
            />
          </div>
        )}

        {decision.statut === 'accepte' && (
          <div className="mt-4 rounded-xl border border-emerald-200/90 bg-emerald-50/90 p-3.5 text-sm text-emerald-900 shadow-inner">
            <p className="font-semibold">Acceptation</p>
            <p className="mt-1 text-xs leading-relaxed text-emerald-800/95">
              Après enregistrement de la décision, la lettre de préinscription sera générée et disponible au téléchargement (section ci-dessous lorsque le dossier est accepté).
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={handleDecision}
          disabled={saving || !decision.statut}
          className="btn-primary mt-5 w-full rounded-xl py-2.5 text-sm shadow-md shadow-primary/20"
        >
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Enregistrement…
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <svg className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l3 3m0 0l-3 3m3-3H12" />
              </svg>
              Enregistrer la décision
            </span>
          )}
        </button>
      </div>
    </>
  )

  const documentsOfficielsBlock =
    isAccepte && (
      <div className="border-t border-emerald-200/70 bg-gradient-to-b from-emerald-50/90 to-white px-5 py-5 sm:px-6 sm:py-6">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-emerald-950">
          <span className="text-base" aria-hidden>
            📜
          </span>
          Documents officiels
        </h3>
        <p className="mb-4 text-xs leading-relaxed text-emerald-800/90">
          Préinscription acceptée : attestation (et lettre uniquement pour un candidat étranger en ligne).
        </p>
        <div className="flex flex-col gap-2.5">
          {dossier?.source !== 'staff' && (
            <Link
              to={`/lettre/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-700 hover:shadow-lg"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Lettre de préinscription
            </Link>
          )}
          <Link
            to={`/attestation/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-indigo-600 bg-white px-4 py-3 text-sm font-semibold text-indigo-800 shadow-sm transition hover:border-indigo-700 hover:bg-indigo-50"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Attestation de préinscription
          </Link>
        </div>
      </div>
    )

  return (
    <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      {/* En-tête */}
      <header className="mb-8 rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-sm ring-1 ring-slate-100/80 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-8">
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              to="/responsable"
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              <span aria-hidden className="text-base leading-none">
                ←
              </span>
              Retour
            </Link>
            {showChatterCandidat && (
              <Link
                to={chatWithStudentUrl(dossier.etudiant_id, dossier.prenom, dossier.nom)}
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-bold text-emerald-900 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-100"
              >
                💬 Chatter avec le candidat
              </Link>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Dossier {dossier.numero_dossier}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatutBadge statut={dossier.statut} />
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${
                  dossier.type_formation === 'en_ligne'
                    ? 'bg-emerald-100 text-emerald-800 ring-emerald-200/80'
                    : 'bg-sky-100 text-sky-900 ring-sky-200/80'
                }`}
              >
                {dossier.type_formation === 'en_ligne' ? 'FAD (en ligne)' : 'Présentiel'}
              </span>
              <span className="text-xs text-slate-500">
                Déposé le{' '}
                <time dateTime={dossier.created_at}>
                  {new Date(dossier.created_at).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
                </time>
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        {/* Colonne principale */}
        <div className="space-y-4 lg:col-span-8">
          {/* Photo + identité */}
          <section className={`${panel} p-4`}>
            <SectionTitle icon="👤">Informations personnelles</SectionTitle>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {photoDoc ? (
                <img
                  src={mediaUrl(`/uploads/${photoDoc.chemin}`)}
                  alt=""
                  className="h-24 w-20 shrink-0 rounded-xl border border-slate-200 object-cover shadow-sm"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              ) : (
                <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-2xl text-slate-400">
                  <span aria-hidden>👤</span>
                </div>
              )}
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-2">
                {[
                  ['Nom complet', [dossier.prenom, dossier.nom].filter(Boolean).join(' ') || '—'],
                  ['Matricule (compte)', dossier.matricule || '—'],
                  ['Email', dossier.email || '—'],
                  ['Téléphone', dossier.telephone || '—'],
                  ['Nationalité', dossier.nationalite || '—'],
                  ['Date de naissance', dossier.date_naissance ? new Date(dossier.date_naissance).toLocaleDateString('fr-FR') : '—'],
                  ['Lieu de naissance', dossier.lieu_naissance || '—'],
                  ['Adresse', dossier.adresse || '—'],
                ].map(([l, v]) => (
                  <div key={l} className="min-w-0">
                    <FieldLabel>{l}</FieldLabel>
                    <p className="mt-0.5 font-semibold leading-snug text-slate-900 break-words">{v || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Formation */}
          <section className={`${panel} p-4`}>
            <SectionTitle icon="🎓">Formation demandée</SectionTitle>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-2">
              {[
                ['Formation', dossier.filiere],
                ['Type', dossier.type_formation === 'en_ligne' ? 'FAD (en ligne)' : 'Présentiel'],
                ['Année académique', dossier.annee_academique],
                ['Niveau requis (diplôme)', dossier.niveau],
                ['Niveau de formation', dossier.formation_niveau_cible || formation?.niveau || '—'],
                ['Dernier diplôme', dossier.dernier_diplome],
                ['Établissement', dossier.etablissement_origine],
                ['Mention', dossier.mention || 'Non renseignée'],
                ["Année d'obtention", dossier.annee_obtention],
              ].map(([l, v]) => (
                <div key={l} className="min-w-0">
                  <FieldLabel>{l}</FieldLabel>
                  <p className="mt-0.5 font-semibold leading-snug text-slate-900">{v || '—'}</p>
                </div>
              ))}
            </div>
            {formation && (
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-4">
                <div>
                  <FieldLabel>Inscription</FieldLabel>
                  <p className="font-semibold tabular-nums text-slate-800">{new Intl.NumberFormat('fr-FR').format(formation.frais_inscription || 0)}</p>
                </div>
                <div>
                  <FieldLabel>Mensualité × mois</FieldLabel>
                  <p className="font-semibold tabular-nums text-slate-800">
                    {new Intl.NumberFormat('fr-FR').format(formation.mensualite || 0)}
                    {' × '}
                    {formation.duree_mois || '—'}
                  </p>
                </div>
                <div>
                  <FieldLabel>Total mensualités</FieldLabel>
                  <p className="font-semibold tabular-nums text-emerald-800">
                    {new Intl.NumberFormat('fr-FR').format(
                      (Number(formation.mensualite) || 0) * (Number(formation.duree_mois) || 0)
                    )}
                  </p>
                </div>
                <div>
                  <FieldLabel>Forfait annuel</FieldLabel>
                  <p className="text-lg font-bold tabular-nums text-indigo-700">
                    {new Intl.NumberFormat('fr-FR').format(formation.prix || 0)}
                  </p>
                </div>
              </div>
            )}
            <div className="mt-3 border-t border-slate-100 pt-3">
              <PreinscriptionConditionsBlock
                formationNiveau={dossier.formation_niveau_cible || formation?.niveau}
                profileKey={dossier.document_rule_profile}
              />
            </div>
          </section>

          {/* Documents */}
          <section className={`${panel} p-4`}>
            <SectionTitle icon="📎">Documents soumis</SectionTitle>
            {documents.length === 0 ? (
              <p className="text-sm text-slate-500 py-1">Aucun document soumis.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={mediaUrl(`/uploads/${doc.chemin}`)}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/80 p-2.5 transition hover:border-indigo-300 hover:bg-indigo-50/60"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white bg-white text-base shadow-sm">
                      {isPhotoDocumentType(doc.type_document) ? '🖼️' : '📄'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {doc.type_document.replace('_', ' ')}
                      </p>
                      <p className="truncate text-sm font-medium text-slate-800">{doc.nom_fichier}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Colonne décision + documents */}
        <aside className="space-y-3 lg:col-span-4 lg:sticky lg:top-4 lg:self-start">
          {isAccepte ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
              {decisionBlock}
              {documentsOfficielsBlock}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
              {decisionBlock}
            </div>
          )}

          {dossier.commentaire_admin && (
            <div className={`${panel} p-4`}>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Dernier commentaire</p>
              <p className="text-sm leading-relaxed text-slate-700">{dossier.commentaire_admin}</p>
            </div>
          )}
        </aside>
      </div>
    </main>
  )
}
