import { useState, useEffect, useRef } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  FaBookOpen,
  FaGlobe,
  FaGraduationCap,
  FaIdCard,
  FaLandmark,
  FaMapMarkerAlt,
  FaPhone,
  FaScroll,
  FaUniversity,
  FaUser,
} from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import PreinscriptionConditionsBlock from '../components/PreinscriptionConditionsBlock'
import { NATIONALITES_SUGGESTIONS_FR } from '../data/nationalites'
import {
  normalizePreinscriptionNiveau,
  getRequiredFileFieldKeys,
  getOptionalCarteScolaireFieldKeys,
  DOC_FIELD_LABELS,
  areRequiredFilesPresent,
  emptyDossierFilesState,
} from '../utils/preinscriptionDocumentRules'
import { evaluateSanteFiliereEligibility } from '../utils/santeEligibility'
import { getRecaptchaSiteKey } from '@/lib/siteKeys'

const DIPLOMES = [
  'Baccalauréat',
  'Baccalauréat série S (scientifique)',
  'BFEM / Brevet des collèges',
  'Niveau 3ème',
  'Niveau Terminale (non bachelier)',
  'BTS',
  'DUT',
  'Licence',
  'Master',
  'Autre',
]
const MENTIONS = ['Très Bien', 'Bien', 'Assez Bien', 'Passable']
const ANNEES = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i)

const STEPS = [
  { label: 'Formation', short: 'Parcours', icon: FaGraduationCap },
  { label: 'Identité & coordonnées', short: 'Identité', icon: FaUser },
  { label: 'Parcours académique', short: 'Cursus', icon: FaBookOpen },
  { label: 'Documents', short: 'Pièces', icon: FaScroll },
]

/** Regroupe les formations par filière (libellé API `filiere_nom`). */
function groupFormationsByFiliere(list) {
  const map = new Map()
  for (const f of list) {
    const key = (f.filiere_nom && String(f.filiere_nom).trim()) || 'Sans filière'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(f)
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'))
}

/** Plusieurs dossiers possibles par étudiant : une seule candidature « active » par formation. */
/** Éligibilité indicative pour les filières santé (EFOSANTE, établissement id 3). */
function eligibiliteSantePourFormation(formation, etablissementId, dernierDiplome) {
  if (String(etablissementId) !== '3' || !formation?.filiere_eligibility) return null
  return evaluateSanteFiliereEligibility(
    {
      eligibility: formation.filiere_eligibility,
      condition_acces: formation.filiere_condition_acces,
    },
    dernierDiplome,
  )
}

function candidatureBlockForFormation(dossiersListe, formationId) {
  const fid = Number(formationId)
  const relevant = (dossiersListe || [])
    .filter((d) => Number(d.formation_id) === fid)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  for (const d of relevant) {
    if (['en_attente', 'en_cours'].includes(d.statut)) {
      return {
        blocked: true,
        label: d.statut === 'en_cours' ? 'En examen' : 'En attente',
        message: 'Vous avez déjà une candidature en cours pour cette formation. Suivez-la depuis votre espace étudiant.',
      }
    }
    if (d.statut === 'accepte') {
      return {
        blocked: true,
        label: 'Accepté',
        message: 'Vous avez déjà été accepté pour cette formation.',
      }
    }
  }
  return { blocked: false }
}

export default function Preinscription() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()
  const { formationId } = useParams()
  const [studentDossiers, setStudentDossiers] = useState([])
  const [step, setStep] = useState(formationId ? 1 : 0)
  const [loading, setLoading] = useState(false)
  const [formations, setFormations] = useState([])
  const [formation, setFormation] = useState(null)
  const [filtreType, setFiltreType] = useState('tous')
  const [showGuide, setShowGuide] = useState(false)
  const [guideStep, setGuideStep] = useState(0)
  const [botStartedAt] = useState(() => Date.now())
  const [honeypot, setHoneypot] = useState('')
  const [recaptchaToken, setRecaptchaToken] = useState('')
  const recaptchaRef = useRef(null)
  const recaptchaSiteKey = getRecaptchaSiteKey()

  const [form, setForm] = useState({
    formation_id: formationId || '',
    annee_academique: `2025-2026`,
    date_naissance: '', lieu_naissance: '', nationalite: '', telephone: '', adresse: '',
    dernier_diplome: '', etablissement_origine: '', mention: '', annee_obtention: '',
    numero_passeport: '',
  })
  const [files, setFiles] = useState(emptyDossierFilesState)

  useEffect(() => {
    if (authLoading) return
    if (!user?.etablissement_id) {
      setFormations([])
      return
    }
    axios
      .get('/api/formations', { params: { etablissement_id: user.etablissement_id } })
      .then(({ data }) => setFormations(data || []))
      .catch(() => setFormations([]))
  }, [authLoading, user?.etablissement_id])

  useEffect(() => {
    if (authLoading || user?.role !== 'etudiant') {
      setStudentDossiers([])
      return
    }
    axios
      .get('/api/etudiant/dossiers')
      .then(({ data }) => {
        const rows = (data?.dossiers || []).map((x) => x.dossier).filter(Boolean)
        setStudentDossiers(rows)
      })
      .catch(() => setStudentDossiers([]))
  }, [authLoading, user?.role, user?.id])

  useEffect(() => {
    if (authLoading || !formationId || formations.length === 0) return
    const fid = parseInt(formationId, 10)
    if (!formations.some((f) => f.id === fid)) {
      toast.error('Cette formation n’est pas proposée par votre établissement d’inscription.')
      navigate('/preinscription', { replace: true })
    }
  }, [formationId, formations, authLoading, navigate])

  useEffect(() => {
    if (form.formation_id) {
      const f = formations.find(f => f.id === parseInt(form.formation_id))
      setFormation(f || null)
    } else {
      setFormation(null)
    }
  }, [form.formation_id, formations])

  useEffect(() => {
    if (formationId && formations.length > 0) {
      const f = formations.find(f => f.id === parseInt(formationId))
      if (f) { setFormation(f); setForm(prev => ({ ...prev, formation_id: formationId })) }
    }
  }, [formationId, formations])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('guide') === '1') {
      setGuideStep(0)
      setShowGuide(true)
    }
  }, [location.search])

  useEffect(() => {
    if (step === 3) return
    setRecaptchaToken('')
    try {
      recaptchaRef.current?.reset()
    } catch {
      /* ignore */
    }
  }, [step])

  const up = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }))
  const upFile = (field) => (e) => setFiles(p => ({ ...p, [field]: e.target.files[0] }))

  const selectFormation = (f) => {
    const block = candidatureBlockForFormation(studentDossiers, f.id)
    if (block.blocked) {
      toast.error(block.message)
      return
    }
    setForm(p => ({ ...p, formation_id: String(f.id) }))
    setFormation(f)
    setFiles(emptyDossierFilesState())
    setStep(1)
  }

  const niveauKey = formation ? normalizePreinscriptionNiveau(formation.niveau) : 'generic'
  const { required: reqFileKeys, oneOf: oneOfFileGroups } = getRequiredFileFieldKeys(
    niveauKey,
    form.nationalite,
  )
  const optionalCarteKeys = getOptionalCarteScolaireFieldKeys(niveauKey)

  const docsMissing = (() => {
    const miss = []
    for (const k of reqFileKeys) {
      if (!files[k]) miss.push(DOC_FIELD_LABELS[k] || k)
    }
    for (const group of oneOfFileGroups) {
      if (!group.some((k) => files[k])) {
        miss.push(`(${group.map((k) => DOC_FIELD_LABELS[k]).join(' ou ')})`)
      }
    }
    return miss
  })()

  const orderedFileFields = [
    ...reqFileKeys,
    ...oneOfFileGroups.flat().filter((k) => !reqFileKeys.includes(k)),
    ...optionalCarteKeys.filter((k) => !reqFileKeys.includes(k)),
  ]

  const canNext = () => {
    if (step === 0) return !!form.formation_id
    if (step === 1) return form.date_naissance && form.lieu_naissance && form.nationalite && form.telephone && form.adresse
    if (step === 2) return form.dernier_diplome && form.etablissement_origine && form.annee_obtention
    return true
  }

  const recaptchaConfigured = Boolean(recaptchaSiteKey)
  const prodNoRecaptcha = import.meta.env.PROD && !recaptchaConfigured
  const canSubmit =
    areRequiredFilesPresent(files, niveauKey, form.nationalite) &&
    (!recaptchaConfigured || !!recaptchaToken) &&
    !prodNoRecaptcha

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const formData = new FormData()
      Object.entries(form).forEach(([k, v]) => formData.append(k, v))
      Object.entries(files).forEach(([k, v]) => { if (v) formData.append(k, v) })
      formData.append('bot_started_at', String(botStartedAt))
      formData.append('website', honeypot)
      if (recaptchaSiteKey) {
        const t = String(recaptchaRef.current?.getValue?.() || recaptchaToken || '').trim()
        if (t) formData.append('recaptcha_token', t)
      }
      const { data } = await axios.post('/api/etudiant/dossier', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success(`Dossier soumis ! N° ${data.numero_dossier}`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la soumission')
    } finally {
      setLoading(false)
    }
  }

  const FileInput = ({ label, field, required }) => (
    <div>
      <label className="label-field">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <label
        htmlFor={field}
        className={`flex min-h-[8.5rem] flex-col items-center justify-center w-full cursor-pointer rounded-xl border-2 border-dashed px-3 py-4 transition-all ${
          files[field]
            ? 'border-emerald-400 bg-emerald-50/60'
            : 'border-slate-300 bg-slate-50/80 hover:border-blue-400 hover:bg-blue-50/50'
        }`}
      >
        <input type="file" id={field} accept=".pdf,.jpg,.jpeg,.png" onChange={upFile(field)} className="hidden" />
        {files[field] ? (
          <div className="text-center">
            <div className="text-emerald-600 text-2xl font-bold mb-1" aria-hidden>
              ✓
            </div>
            <p className="text-sm font-semibold text-emerald-800 break-all">{files[field].name}</p>
            <p className="text-xs text-emerald-600 mt-1">Cliquer pour remplacer le fichier</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-slate-400 text-sm font-semibold uppercase tracking-wide mb-2">Déposer</div>
            <p className="text-sm font-medium text-slate-600">Sélectionner un fichier</p>
            <p className="text-xs text-slate-500 mt-1">PDF, JPG ou PNG — max. 2 Mo</p>
          </div>
        )}
      </label>
    </div>
  )

  const filteredFormations = filtreType === 'tous' ? formations : formations.filter(f => f.type === filtreType)
  const formationsParFiliere = groupFormationsByFiliere(filteredFormations)

  const guideItems = [
    {
      title: 'Connexion et accès',
      subtitle: 'Accédez à votre espace étudiant',
      points: [
        'Connectez-vous avec vos identifiants étudiant.',
        user?.etablissement_nom
          ? `Votre compte est rattaché à ${user.etablissement_nom}.`
          : 'Vérifiez que votre compte est bien rattaché à un établissement.',
        'Ouvrez le menu Préinscription.',
      ],
    },
    {
      title: 'Choisir la formation',
      subtitle: 'Sélectionnez le bon parcours',
      points: [
        `Formations disponibles actuellement : ${filteredFormations.length}.`,
        `Filtre actif : ${filtreType === 'tous' ? 'toutes' : filtreType}.`,
        'Cliquez sur une carte formation pour continuer.',
      ],
    },
    {
      title: 'Compléter l’état civil',
      subtitle: 'Informations personnelles',
      points: [
        'Renseignez date/lieu de naissance, nationalité, téléphone et adresse.',
        'Le numéro passeport/CNI est recommandé pour la lettre.',
        `Progression actuelle : étape ${step + 1} / ${STEPS.length}.`,
      ],
    },
    {
      title: 'Renseigner le parcours académique',
      subtitle: 'Historique et diplôme',
      points: [
        'Indiquez année académique, diplôme, année d’obtention et établissement d’origine.',
        'La mention est optionnelle.',
        `Année sélectionnée : ${form.annee_academique || 'non renseignée'}.`,
      ],
    },
    {
      title: 'Déposer les documents',
      subtitle: 'Pièces obligatoires',
      points: [
        'Ajoutez les pièces demandées à l’étape Documents (PDF/JPG/PNG), selon le niveau de formation.',
        `Documents manquants actuellement : ${docsMissing.length}.`,
        docsMissing.length > 0 ? `Manquants : ${docsMissing.join(', ')}.` : 'Tous les documents requis sont fournis.',
      ],
    },
    {
      title: 'Soumettre et suivre',
      subtitle: 'Validation finale',
      points: [
        'Vérifiez le récapitulatif de la formation choisie.',
        'Cliquez sur “Soumettre mon dossier”.',
        'Un numéro de dossier est généré pour le suivi.',
      ],
    },
  ]
  const guideTotal = guideItems.length
  const currentGuide = guideItems[guideStep]

  return (
    <div className="w-full min-h-screen bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(30,58,138,0.08),transparent)] bg-slate-50">
      <div className="border-b border-slate-200/80 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-10">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">
            <FaLandmark className="text-slate-400 shrink-0" aria-hidden />
            <Link to="/" className="hover:text-blue-700 transition-colors">
              Accueil
            </Link>
            <span className="text-slate-300" aria-hidden>
              /
            </span>
            <span className="text-slate-700">Candidature</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-[2rem] font-bold tracking-tight text-slate-900 leading-tight">
            Dossier de préinscription
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl font-medium">
            Soumission académique — informations sincères et vérifiables.
          </p>
          <p className="mt-3 text-sm text-slate-600 max-w-2xl leading-relaxed">
            Le dossier est suivi depuis votre espace étudiant (acceptation, refus). Vous pouvez déposer une candidature par formation auprès de votre établissement d’inscription.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setGuideStep(0)
                setShowGuide(true)
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              Guide d’utilisation
            </button>
          </div>
          {!authLoading && user?.etablissement_nom && (
            <p className="mt-4 text-sm text-slate-800 bg-slate-100/90 border border-slate-200/80 rounded-xl px-4 py-3 max-w-2xl">
              <span className="font-semibold text-slate-900">{user.etablissement_nom}</span>
              <span className="text-slate-600"> — formations ouvertes aux candidatures rattachées à ce compte.</span>
            </p>
          )}
          {!authLoading && !user?.etablissement_id && (
            <p className="mt-4 text-sm text-amber-900 bg-amber-50 border border-amber-200/80 rounded-xl px-4 py-3 max-w-2xl">
              Votre compte n’est pas rattaché à un établissement. Contactez l’administration avant de déposer un dossier.
            </p>
          )}

          <div className="mt-8 rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-sm">
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-0">
              {STEPS.map((s, i) => {
                const Icon = s.icon
                const done = i < step
                const active = i === step
                return (
                  <div key={s.label} className="flex items-center flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 transition-all ${
                          done
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : active
                              ? 'border-blue-700 bg-blue-700 text-white shadow-md ring-4 ring-blue-100'
                              : 'border-slate-200 bg-slate-50 text-slate-400'
                        }`}
                      >
                        {done ? <span className="text-sm font-bold">✓</span> : <Icon className="text-sm" aria-hidden />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-[11px] font-bold uppercase tracking-wide leading-tight truncate ${
                            active ? 'text-blue-800' : done ? 'text-emerald-800' : 'text-slate-400'
                          }`}
                        >
                          {s.short}
                        </p>
                        <p className={`text-xs font-semibold leading-tight truncate hidden sm:block ${active ? 'text-slate-900' : 'text-slate-500'}`}>
                          {s.label}
                        </p>
                      </div>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`hidden sm:block flex-1 h-0.5 mx-2 rounded-full min-w-[8px] ${i < step ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 md:py-10">
        <form onSubmit={handleSubmit}>
          {/* Étape 0 : Choisir la formation */}
          {step === 0 && (
            <div>
              {!authLoading && !user?.etablissement_id ? (
                <div className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 mb-6">
                  Impossible de choisir une formation sans établissement rattaché à votre compte.
                </div>
              ) : null}
              {!authLoading && user?.etablissement_id && formations.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 mb-6">
                  Aucune formation active pour votre établissement pour le moment.
                </div>
              ) : null}
              {user?.etablissement_id && (
              <>
              <div className="flex flex-wrap items-center gap-2 mb-8">
                {[['tous', 'Toutes'], ['en_ligne', 'En ligne'], ['presentiel', 'Présentiel']].map(([val, label]) => (
                  <button type="button" key={val} onClick={() => setFiltreType(val)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filtreType === val ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="space-y-10">
                {formationsParFiliere.map(([filiereNom, fs]) => (
                  <section key={filiereNom}>
                    <h3 className="font-serif text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                      <FaUniversity className="text-blue-800 shrink-0" aria-hidden />
                      {filiereNom}
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {fs.map((f) => {
                        const bloc = candidatureBlockForFormation(studentDossiers, f.id)
                        const eligSante = eligibiliteSantePourFormation(f, user?.etablissement_id, form.dernier_diplome)
                        return (
                        <div
                          key={f.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => selectFormation(f)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectFormation(f) } }}
                          className={`rounded-2xl border-2 bg-white p-5 text-left shadow-sm transition-all hover:shadow-md ${bloc.blocked ? 'opacity-75 border-slate-200 cursor-not-allowed' : 'cursor-pointer'} ${form.formation_id == f.id ? 'border-blue-600 ring-2 ring-blue-100' : 'border-slate-200/90 hover:border-blue-300'}`}
                        >
                          <div className="flex items-start justify-between mb-2 gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md ${f.type === 'en_ligne' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80' : 'bg-slate-100 text-slate-800 border border-slate-200'}`}>
                              {f.type === 'en_ligne' ? (
                                <><FaGlobe className="opacity-80" aria-hidden /> En ligne</>
                              ) : (
                                <><FaMapMarkerAlt className="opacity-80" aria-hidden /> Présentiel · {f.ville}</>
                              )}
                            </span>
                            <div className="flex items-center gap-2">
                              {bloc.blocked && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">{bloc.label}</span>
                              )}
                              {form.formation_id == f.id && <span className="text-emerald-500 font-bold text-lg" aria-hidden>✓</span>}
                            </div>
                          </div>
                          <h3 className="font-bold text-gray-900 mb-1">{f.titre}</h3>
                          <p className="text-xs text-gray-600 mb-1">Niveau : {f.niveau || '—'}</p>
                          {f.filiere_duree_cycle && (
                            <p className="text-xs text-slate-700 mb-0.5">Durée du cycle (filière) : <span className="font-semibold">{f.filiere_duree_cycle}</span></p>
                          )}
                          {f.filiere_condition_acces && (
                            <p className="text-xs text-slate-700 mb-1">Condition d&apos;accès : {f.filiere_condition_acces}</p>
                          )}
                          <p className="text-xs text-gray-500 mb-3">{f.duree}{f.niveau_requis ? ` · ${f.niveau_requis}` : ''}</p>
                          {eligSante && form.dernier_diplome && (
                            <p
                              className={`text-xs font-semibold mb-2 rounded-lg px-2 py-1.5 border ${
                                eligSante.eligible === true
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                                  : eligSante.eligible === false
                                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                                    : 'border-slate-200 bg-slate-50 text-slate-700'
                              }`}
                            >
                              {eligSante.eligible === true && 'Éligibilité (indicatif) : profil compatible avec la filière.'}
                              {eligSante.eligible === false && 'Éligibilité (indicatif) : à confirmer sur pièces — voir condition d’accès.'}
                              {eligSante.eligible === null && eligSante.message}
                            </p>
                          )}
                          <details className="text-left mb-3" onClick={(e) => e.stopPropagation()}>
                            <summary className="text-xs font-semibold text-blue-700 cursor-pointer">Conditions d&apos;entrée (texte de référence)</summary>
                            <div className="mt-2 pointer-events-none">
                              <PreinscriptionConditionsBlock formationNiveau={f.niveau} />
                            </div>
                          </details>
                          <p className="text-xs font-semibold text-blue-800 border-t border-blue-100 pt-3">
                            {bloc.blocked ? 'Candidature non disponible (voir message si vous cliquez).' : 'Cliquer pour candidater à cette formation →'}
                          </p>
                        </div>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
              </>
              )}
            </div>
          )}

          {/* Étape 1 : Identité & coordonnées */}
          {step === 1 && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 md:p-8 shadow-sm">
              <div className="mb-8 border-b border-slate-100 pb-5">
                <h2 className="font-serif text-xl font-semibold text-slate-900 tracking-tight">
                  Identité &amp; coordonnées
                </h2>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                  Les informations doivent correspondre à votre pièce d’identité. La <strong>nationalité</strong> est enregistrée dans le dossier administratif.
                </p>
              </div>

              <div className="space-y-8">
                <section aria-labelledby="prein-identity-heading">
                  <h3 id="prein-identity-heading" className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500 mb-4">
                    <FaIdCard className="text-blue-800" aria-hidden />
                    État civil
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-5 md:gap-6">
                    <div>
                      <label htmlFor="prein-dob" className="label-field">
                        Date de naissance <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="prein-dob"
                        type="date"
                        className="input-field"
                        value={form.date_naissance}
                        onChange={up('date_naissance')}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="prein-lieu" className="label-field">
                        Lieu de naissance <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="prein-lieu"
                        type="text"
                        className="input-field"
                        placeholder="Ville, pays"
                        value={form.lieu_naissance}
                        onChange={up('lieu_naissance')}
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="prein-nationalite" className="label-field">
                        Nationalité <span className="text-red-500">*</span>
                      </label>
                      <p className="text-xs text-slate-500 mb-2 leading-snug">
                        Indiquez l’adjectif usuel (ex. « Sénégalaise »). Choisissez une suggestion ou saisissez une autre nationalité ; en cas de double nationalité, indiquez la principale.
                      </p>
                      <div className="relative">
                        <FaGlobe className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-slate-400 text-sm" aria-hidden />
                        <input
                          id="prein-nationalite"
                          type="text"
                          list="nationalites-datalist-preinscription"
                          className="input-field pl-9"
                          placeholder="Ex. Sénégalaise, Française…"
                          value={form.nationalite}
                          onChange={up('nationalite')}
                          autoComplete="off"
                          required
                        />
                      </div>
                      <datalist id="nationalites-datalist-preinscription">
                        {NATIONALITES_SUGGESTIONS_FR.map((n) => (
                          <option key={n} value={n} />
                        ))}
                      </datalist>
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="prein-passeport" className="label-field">
                        N° passeport ou CNI{' '}
                        <span className="text-slate-400 font-normal normal-case">(recommandé pour la lettre de préinscription)</span>
                      </label>
                      <input
                        id="prein-passeport"
                        type="text"
                        className="input-field font-mono text-sm"
                        placeholder="Ex. A1234567"
                        value={form.numero_passeport}
                        onChange={up('numero_passeport')}
                      />
                    </div>
                  </div>
                </section>

                <section aria-labelledby="prein-contact-heading">
                  <h3 id="prein-contact-heading" className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500 mb-4">
                    <FaPhone className="text-blue-800" aria-hidden />
                    Coordonnées
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-5 md:gap-6">
                    <div>
                      <label htmlFor="prein-tel" className="label-field">
                        Téléphone <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="prein-tel"
                        type="tel"
                        className="input-field"
                        placeholder="+221 77 000 00 00"
                        value={form.telephone}
                        onChange={up('telephone')}
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="prein-adr" className="label-field">
                        Adresse complète <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="prein-adr"
                        className="input-field min-h-[100px] resize-y"
                        rows={3}
                        placeholder="Rue, quartier, code postal, ville, pays"
                        value={form.adresse}
                        onChange={up('adresse')}
                        required
                      />
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* Étape 2 : Parcours académique */}
          {step === 2 && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 md:p-8 shadow-sm">
              <div className="mb-8 border-b border-slate-100 pb-5">
                <h2 className="font-serif text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                  <FaBookOpen className="text-blue-800 shrink-0" aria-hidden />
                  Parcours académique
                </h2>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                  Antécédents scolaires ou universitaires les plus récents, tels qu’ils pourront être vérifiés par l’administration.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-5 md:gap-6">
                <div className="sm:col-span-2">
                  <label htmlFor="prein-an-acad" className="label-field">
                    Année académique visée <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="prein-an-acad"
                    type="text"
                    className="input-field max-w-md"
                    value={form.annee_academique}
                    onChange={up('annee_academique')}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="prein-diplome" className="label-field">
                    Dernier diplôme obtenu <span className="text-red-500">*</span>
                  </label>
                  <select id="prein-diplome" className="input-field" value={form.dernier_diplome} onChange={up('dernier_diplome')} required>
                    <option value="">— Sélectionner —</option>
                    {DIPLOMES.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="prein-an-obt" className="label-field">
                    Année d’obtention <span className="text-red-500">*</span>
                  </label>
                  <select id="prein-an-obt" className="input-field" value={form.annee_obtention} onChange={up('annee_obtention')} required>
                    <option value="">— Sélectionner —</option>
                    {ANNEES.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="prein-etab" className="label-field">
                    Établissement d’origine <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="prein-etab"
                    type="text"
                    className="input-field"
                    placeholder="Nom officiel de l’établissement"
                    value={form.etablissement_origine}
                    onChange={up('etablissement_origine')}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="prein-mention" className="label-field">
                    Mention <span className="text-slate-400 font-normal normal-case">(optionnel)</span>
                  </label>
                  <select id="prein-mention" className="input-field" value={form.mention} onChange={up('mention')}>
                    <option value="">— Non renseigné —</option>
                    {MENTIONS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Étape 3 : Documents */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 md:p-8 shadow-sm">
                <h2 className="font-serif text-xl font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <FaScroll className="text-blue-800 shrink-0" aria-hidden />
                  Pièces justificatives
                </h2>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                  Liste imposée selon le <strong>niveau de formation</strong> (référence ci-dessous). Formats acceptés : PDF, JPG, PNG — taille maximale 2 Mo par fichier.
                </p>
                {formation && (
                  <div className="mb-4">
                    <PreinscriptionConditionsBlock formationNiveau={formation.niveau} />
                  </div>
                )}
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  name="website"
                  aria-hidden="true"
                />
                {docsMissing.length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    <p className="font-semibold mb-1">⚠️ Documents manquants :</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {docsMissing.map((label, idx) => <li key={idx}>{label}</li>)}
                    </ul>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-5">
                  {orderedFileFields.map((field) => (
                    <FileInput
                      key={field}
                      label={DOC_FIELD_LABELS[field] || field}
                      field={field}
                      required={!optionalCarteKeys.includes(field)}
                    />
                  ))}
                </div>
                {recaptchaSiteKey && (
                  <div className="mt-5">
                    <p className="text-sm font-semibold text-gray-700 mb-2">reCAPTCHA <span className="text-red-500">*</span></p>
                    <div className="flex justify-start">
                      <ReCAPTCHA
                        ref={recaptchaRef}
                        sitekey={recaptchaSiteKey}
                        onChange={(t) => setRecaptchaToken(t || '')}
                        onExpired={() => setRecaptchaToken('')}
                      />
                    </div>
                  </div>
                )}
                {!recaptchaSiteKey && import.meta.env.PROD && (
                  <p className="mt-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    En production, définissez <code className="font-mono">VITE_RECAPTCHA_SITE_KEY</code> ou{' '}
                    <code className="font-mono">config-site.js</code> (clé <code className="font-mono">recaptcha</code>).
                  </p>
                )}
              </div>

              {/* Récapitulatif */}
              {formation && (
                <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-slate-50 to-blue-50/50 p-6 md:p-7 shadow-sm">
                  <h3 className="font-serif text-lg font-semibold text-slate-900 mb-4">Récapitulatif de la demande</h3>
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div className="sm:col-span-2 pb-2 border-b border-slate-200/80">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Formation</span>
                      <p className="font-semibold text-slate-900 mt-0.5">{formation.titre}</p>
                    </div>
                    {formation.filiere_nom && (
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Filière</span>
                        <p className="font-medium text-slate-800 mt-0.5">{formation.filiere_nom}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Niveau</span>
                      <p className="font-medium text-slate-800 mt-0.5">{formation.niveau || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Modalité</span>
                      <p className="font-medium text-slate-800 mt-0.5">
                        {formation.type === 'en_ligne' ? 'En ligne' : `Présentiel · ${formation.ville}`}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Durée</span>
                      <p className="font-medium text-slate-800 mt-0.5">{formation.duree}</p>
                    </div>
                    <div className="sm:col-span-2 pt-2 border-t border-slate-200/80">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Candidat</span>
                      <p className="text-slate-800 mt-1">
                        Né(e) le <strong>{form.date_naissance || '—'}</strong> à <strong>{form.lieu_naissance || '—'}</strong> — nationalité{' '}
                        <strong>{form.nationalite || '—'}</strong>
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Tarification</span>
                      <p className="text-slate-600 mt-0.5 text-sm leading-relaxed">
                        Les montants applicables figureront sur la facture proforma après instruction du dossier.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5">
                    <PreinscriptionConditionsBlock formationNiveau={formation.niveau} />
                  </div>
                  <p className="text-xs text-slate-500 mt-4 border-t border-slate-200/80 pt-3">
                    Après validation, une facture proforma est générée automatiquement pour la suite du parcours administratif.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-10 pt-6 border-t border-slate-200/90">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="btn-secondary flex items-center gap-2 rounded-xl px-5"
              >
                ← Précédent
              </button>
            ) : (
              <div />
            )}

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext()}
                className="btn-primary flex items-center gap-2 rounded-xl px-6 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Étape suivante →
              </button>
            ) : (
              <div className="flex flex-col items-end gap-2">
                {!canSubmit && (
                  <p className="text-xs text-red-600 font-medium text-right max-w-xs">
                    {prodNoRecaptcha
                      ? 'En production, la clé site reCAPTCHA doit être configurée côté build ou serveur.'
                      : 'Fournissez toutes les pièces obligatoires et validez le reCAPTCHA si affiché.'}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading || !canSubmit}
                  className="btn-success flex items-center gap-2 rounded-xl px-8 py-2.5 font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
                  {loading ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Envoi du dossier…
                    </>
                  ) : (
                    <>Soumettre le dossier</>
                  )}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>

      {showGuide && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-blue-700 to-cyan-600 text-white flex items-center justify-between">
              <div>
                <p className="text-xl font-black">Guide d'utilisation</p>
                <p className="text-sm text-blue-100">Préinscription étudiante — étape {guideStep + 1} sur {guideTotal}</p>
              </div>
              <button type="button" onClick={() => setShowGuide(false)} className="text-white/90 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="p-5">
              <div className="flex gap-1.5 mb-4">
                {guideItems.map((_, i) => (
                  <div key={i} className={`h-2 rounded-full flex-1 ${i <= guideStep ? 'bg-cyan-500' : 'bg-gray-200'}`} />
                ))}
              </div>

              <h3 className="text-3xl font-black text-gray-900 leading-tight">{currentGuide.title}</h3>
              <p className="text-gray-500 mt-1 mb-4">{currentGuide.subtitle}</p>

              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-3">
                {currentGuide.points.map((p, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-7 h-7 shrink-0 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">{i + 1}</span>
                    <p className="text-gray-700">{p}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setGuideStep((s) => Math.max(0, s - 1))}
                disabled={guideStep === 0}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-semibold disabled:opacity-40"
              >
                ← Précédent
              </button>
              <div className="text-xs text-gray-500">Étape {guideStep + 1}/{guideTotal}</div>
              <button
                type="button"
                onClick={() => {
                  if (guideStep >= guideTotal - 1) setShowGuide(false)
                  else setGuideStep((s) => s + 1)
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
              >
                {guideStep >= guideTotal - 1 ? 'Terminer' : 'Suivant →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
