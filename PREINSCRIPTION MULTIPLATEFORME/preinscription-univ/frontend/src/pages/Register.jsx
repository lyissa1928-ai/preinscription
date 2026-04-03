import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import ReCAPTCHA from 'react-google-recaptcha'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import {
  FaGraduationCap,
  FaEye,
  FaEyeSlash,
  FaUser,
  FaBuilding,
  FaPhone,
  FaEnvelope,
  FaLock,
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaShieldAlt,
  FaSearch,
} from 'react-icons/fa'
import AuthCinematicBackground from '../components/AuthCinematicBackground'
import RegistrationMascot from '../components/RegistrationMascot'
import { cn } from '@/lib/utils'
import { passwordStrength } from '@/lib/passwordStrength'
import { getRecaptchaSiteKey } from '@/lib/siteKeys'
import {
  trimStr,
  normalizeEmail,
  isValidEmailFormat,
  phoneDigitsCount,
  validatePasswordPolicy,
  validateNomPrenom,
} from '@/lib/inscriptionValidation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

const BRANDS = [
  {
    nom: 'ESEBAT',
    domaine: 'BTP / Génie Civil',
    couleurs: 'from-orange-500 to-amber-400',
    image: new URL('../../img/ESEBATBTP.jpg', import.meta.url).href,
  },
  {
    nom: 'ESCOA',
    domaine: 'Commerce / Gestion',
    couleurs: 'from-slate-900 to-blue-900',
    image: new URL('../../img/ESCOA.jpg', import.meta.url).href,
  },
  {
    nom: 'EFOSANTE',
    domaine: 'Santé',
    couleurs: 'from-red-700 to-sky-400',
    image: new URL('../../img/EFOSANTE.jpg', import.meta.url).href,
  },
]

const STEPS = [
  { id: 1, label: 'Identité', short: 'Vous', icon: FaUser },
  { id: 2, label: 'Établissement', short: 'École', icon: FaBuilding },
  { id: 3, label: 'Coordonnées', short: 'Contact', icon: FaEnvelope },
  { id: 4, label: 'Sécurité', short: 'Mot de passe', icon: FaLock },
  { id: 5, label: 'Validation', short: 'Finaliser', icon: FaShieldAlt },
]

/** Style commun champs — lisibilité et zones tactiles confortables */
const fieldClass =
  'h-11 rounded-xl border-slate-200/90 bg-white shadow-sm transition-[box-shadow,border-color] placeholder:text-slate-400 focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-500/15'

/** Aide sous un champ (texte secondaire) */
function FieldHint({ children }) {
  return <p className="text-[12px] leading-snug text-slate-500 mt-1.5">{children}</p>
}

/** Image de fond selon le nom d’établissement (ESEBAT, ESCOA, EFOSANTE, etc.) */
function resolveEtabHeroImage(etabNom) {
  if (!etabNom) return null
  const n = normalize(etabNom)
  for (const b of BRANDS) {
    if (n.includes(normalize(b.nom))) return b.image
  }
  return null
}

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export default function Register() {
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    etablissement_id: '',
    telephone: '',
    adresse: '',
    mot_de_passe: '',
    confirm: '',
  })
  const [step, setStep] = useState(1)
  const [etablissements, setEtablissements] = useState([])
  const [etabSearch, setEtabSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [acceptPolicy, setAcceptPolicy] = useState(false)
  const [showPolicy, setShowPolicy] = useState(false)
  const [botStartedAt] = useState(() => Date.now())
  const [honeypot, setHoneypot] = useState('')
  const [recaptchaToken, setRecaptchaToken] = useState('')
  const recaptchaRef = useRef(null)
  const recaptchaSiteKey = getRecaptchaSiteKey()
  const useRecaptcha = Boolean(recaptchaSiteKey)
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const etablissementIdFromQuery = searchParams.get('etablissement_id') ?? ''

  const strength = useMemo(() => passwordStrength(form.mot_de_passe), [form.mot_de_passe])

  const etablissementsFiltres = useMemo(() => {
    const q = normalize(etabSearch)
    const base = (etablissements || []).filter((e) => e.actif !== false)
    if (!q) return base
    return base.filter((e) => normalize(e.nom).includes(q))
  }, [etablissements, etabSearch])

  useEffect(() => {
    if (!etablissementIdFromQuery) return
    setForm((f) =>
      f.etablissement_id
        ? f
        : { ...f, etablissement_id: String(parseInt(etablissementIdFromQuery, 10) || etablissementIdFromQuery) }
    )
  }, [etablissementIdFromQuery])

  useEffect(() => {
    axios
      .get('/api/etablissements')
      .then(({ data }) => setEtablissements((data || []).filter((e) => e.actif !== false)))
      .catch(() => setEtablissements([]))
  }, [])

  // Le bloc formulaire utilise key={step} : en quittant l’étape 5 le widget reCAPTCHA est démonté
  // mais l’ancien jeton pouvait rester en state → envoi invalide côté Google. On réinitialise à la sortie.
  useEffect(() => {
    if (step === 5) return
    setRecaptchaToken('')
    try {
      recaptchaRef.current?.reset()
    } catch {
      /* ignore */
    }
  }, [step])

  const validateStep = useCallback(
    (s) => {
      if (s === 1) {
        const vn = validateNomPrenom(form.nom, form.prenom)
        if (!vn.ok) {
          toast.error(vn.message)
          return false
        }
        return true
      }
      if (s === 2) {
        if (!form.etablissement_id) {
          toast.error('Sélectionnez votre établissement.')
          return false
        }
        return true
      }
      if (s === 3) {
        const em = normalizeEmail(form.email)
        if (!em) {
          toast.error("L'adresse e-mail est obligatoire.")
          return false
        }
        if (!isValidEmailFormat(em)) {
          toast.error('Le format de l’adresse e-mail est invalide.')
          return false
        }
        if (phoneDigitsCount(form.telephone) < 8) {
          toast.error('Le numéro de téléphone est trop court (au moins 8 chiffres).')
          return false
        }
        return true
      }
      if (s === 4) {
        if (form.mot_de_passe !== form.confirm) {
          toast.error('Les mots de passe ne correspondent pas.')
          return false
        }
        const vp = validatePasswordPolicy(form.mot_de_passe)
        if (!vp.ok) {
          toast.error(vp.message)
          return false
        }
        return true
      }
      return true
    },
    [form]
  )

  const goNext = () => {
    if (!validateStep(step)) return
    setStep((x) => Math.min(STEPS.length, x + 1))
  }

  const goPrev = () => setStep((x) => Math.max(1, x - 1))

  const submitRegistration = async () => {
    if (import.meta.env.PROD && !useRecaptcha) {
      toast.error(
        'Inscription indisponible : configurez reCAPTCHA (VITE_RECAPTCHA_SITE_KEY au build ou config-site.js sur le serveur).',
      )
      return
    }
    if (useRecaptcha && !recaptchaToken) {
      toast.error('Veuillez cocher « Je ne suis pas un robot » (reCAPTCHA) avant de créer votre compte.')
      return
    }
    if (!acceptPolicy) {
      toast.error('Veuillez accepter la politique de création de compte.')
      return
    }
    if (!validateStep(4)) return

    setLoading(true)
    try {
      const recaptchaPayload =
        useRecaptcha && recaptchaRef.current?.getValue
          ? recaptchaRef.current.getValue() || recaptchaToken
          : recaptchaToken
      const { data } = await axios.post('/api/auth/inscription', {
        nom: trimStr(form.nom),
        prenom: trimStr(form.prenom),
        email: normalizeEmail(form.email),
        etablissement_id: parseInt(form.etablissement_id, 10),
        telephone: trimStr(form.telephone),
        adresse: trimStr(form.adresse) || undefined,
        mot_de_passe: form.mot_de_passe,
        mot_de_passe_confirmation: form.confirm,
        bot_started_at: botStartedAt,
        website: honeypot,
        ...(useRecaptcha ? { recaptcha_token: recaptchaPayload } : {}),
      })
      if (data.requires_email_verification) {
        toast.success(data.message || 'Consultez votre boîte e-mail pour confirmer votre compte.')
        navigate('/connexion', {
          replace: true,
          state: { pendingEmailVerification: normalizeEmail(form.email) },
        })
        return
      }
      if (!data.token || !data.utilisateur) {
        toast.error('Réponse serveur inattendue.')
        return
      }
      login(data.token, data.utilisateur)
      try {
        sessionStorage.setItem('signup_creds_once', JSON.stringify({ p: form.mot_de_passe, t: Date.now() }))
      } catch {
        /* ignore */
      }
      toast.success('Compte créé — notez vos identifiants sur l’écran suivant.')
      navigate('/bienvenue-compte', { replace: true })
    } catch (err) {
      recaptchaRef.current?.reset()
      setRecaptchaToken('')
      const d = err.response?.data
      const msg =
        d?.message ||
        (err.response?.status === 409
          ? 'Cette adresse e-mail ou ce numéro est déjà utilisé.'
          : "Erreur lors de l'inscription")
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const progressPct = ((step - 1) / (STEPS.length - 1)) * 100

  const selectedEtab = etablissements.find((e) => String(e.id) === String(form.etablissement_id))

  const etabHeroImage = useMemo(() => resolveEtabHeroImage(selectedEtab?.nom), [selectedEtab?.nom])

  const currentStepMeta = STEPS[Math.min(STEPS.length, Math.max(1, step)) - 1]

  const captchaBlocked = (useRecaptcha && !recaptchaToken) || (import.meta.env.PROD && !useRecaptcha)

  return (
    <div className="min-h-screen relative overflow-hidden px-3 sm:px-5 py-6 md:py-10">
      <style>{`
        @keyframes fadeStep {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-step { animation: fadeStep 0.42s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        @media (prefers-reduced-motion: reduce) {
          .animate-step { animation: none !important; opacity: 1; transform: none; }
        }
      `}</style>
      <AuthCinematicBackground showProgressDots focusedImageUrl={etabHeroImage ?? undefined} />

      <div className="relative z-10 w-full max-w-[1200px] xl:max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[1fr_minmax(0,650px)] gap-6 lg:gap-8 xl:gap-10 items-start">
          {/* Colonne gauche — branding */}
          <div className="hidden lg:block pt-4 lg:sticky lg:top-8">
            <div className="rounded-2xl border border-white/35 bg-white/10 backdrop-blur-md p-3 mb-6">
              <div className="grid grid-cols-3 gap-2">
                {BRANDS.map((b) => (
                  <div
                    key={b.nom}
                    className="rounded-xl border border-white/40 bg-white/15 backdrop-blur-sm p-1.5 shadow-lg transition-transform duration-300 hover:-translate-y-1"
                  >
                    <img src={b.image} alt="" className="w-full h-12 object-cover rounded-md mb-1.5" loading="lazy" />
                    <div className={`h-1 rounded-full bg-gradient-to-r ${b.couleurs} mb-1`} />
                    <p className="text-[10px] font-bold text-white tracking-wide">{b.nom}</p>
                    <p className="text-[9px] text-white/70">{b.domaine}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 border border-white/35 text-xs font-semibold text-white backdrop-blur-sm mb-4">
              <FaGraduationCap className="text-amber-300" />
              UniPréinscription — inscription étudiant
            </div>
            <h1 className="text-3xl xl:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-[0_2px_24px_rgba(0,0,0,0.35)]">
              Créez votre espace
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-cyan-200 mt-1">
                en quelques étapes
              </span>
            </h1>
            <p className="text-blue-100/90 mt-4 text-sm leading-relaxed max-w-md">
              Un compte unique pour déposer votre dossier, suivre votre préinscription et accéder à vos documents
              (facture proforma, lettres, etc.).
            </p>
            <ul className="mt-8 space-y-3 text-sm text-white/90">
              {[
                'Matricule attribué automatiquement après votre établissement',
                'E-mail et téléphone uniques pour sécuriser votre accès',
                'Protection anti-bot (reCAPTCHA) en production',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <FaCheck className="text-emerald-400 mt-0.5 shrink-0" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Colonne droite — formulaire max ~650px, pleine largeur sur mobile */}
          <div className="w-full max-w-[min(100%,650px)] mx-auto lg:mx-0">
            <div className="text-center lg:hidden mb-6">
              <FaGraduationCap className="text-amber-300 text-4xl mx-auto mb-2" />
              <h2 className="text-2xl font-black text-white">Créer un compte</h2>
              <p className="text-blue-100 text-sm mt-1">UniPréinscription</p>
            </div>

            <div className="flex flex-col items-stretch gap-5 xl:flex-row xl:items-end xl:gap-0 xl:max-w-[650px] xl:mx-auto">
              {/* Mascotte mobile */}
              <div className="flex justify-center xl:hidden -mt-1 mb-1">
                <RegistrationMascot compact />
              </div>

              {/* Mascotte desktop — à gauche du formulaire */}
              <div className="relative z-[11] hidden shrink-0 xl:flex xl:w-[200px] xl:flex-col xl:items-center xl:justify-end xl:pb-10 xl:pr-1">
                <RegistrationMascot />
              </div>

              <div className="relative min-w-0 flex-1 xl:pl-1">
                {/* Lien visuel corde → panneau */}
                <div
                  className="pointer-events-none absolute -left-1 top-[28%] hidden h-px w-4 bg-gradient-to-r from-white/40 to-transparent xl:block"
                  aria-hidden="true"
                />
                <Card className="rounded-[1.35rem] border border-slate-200/80 bg-white text-slate-900 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.35),0_0_0_1px_rgba(255,255,255,0.6)_inset] ring-1 ring-slate-900/[0.04] backdrop-blur-xl overflow-hidden">
              {/* Barre de progression */}
              <div className="relative px-4 pt-5 pb-4 sm:px-6 xl:px-8 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 border-b border-slate-100">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 opacity-90" aria-hidden />
                <div className="mb-3 pt-0.5 space-y-2">
                  <p className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                    Étape {step} sur {STEPS.length}
                    <span className="text-slate-300 font-normal mx-2" aria-hidden>
                      —
                    </span>
                    <span className="text-blue-800 font-bold">{currentStepMeta?.label ?? ''}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {step >= STEPS.length
                      ? 'Dernière étape — vérifiez vos informations avant validation.'
                      : `Progression environ ${Math.round(progressPct)} % — il reste ${STEPS.length - step} étape${STEPS.length - step > 1 ? 's' : ''}.`}
                  </p>
                </div>
                <Progress
                  value={progressPct}
                  className="h-2.5 rounded-full bg-slate-200/90 [&>div]:rounded-full [&>div]:bg-gradient-to-r [&>div]:from-blue-600 [&>div]:via-indigo-600 [&>div]:to-violet-600"
                />
                <div className="flex justify-between gap-1 mt-3" role="presentation" aria-hidden>
                  {STEPS.map((s) => {
                    const done = step > s.id
                    const active = step === s.id
                    return (
                      <div
                        key={s.id}
                        className={cn(
                          'h-1.5 flex-1 rounded-full transition-colors duration-300',
                          active && 'bg-blue-600',
                          done && !active && 'bg-emerald-400',
                          !active && !done && 'bg-slate-200'
                        )}
                      />
                    )
                  })}
                </div>
                <div className="flex justify-between mt-4 gap-1.5 sm:gap-2">
                  {STEPS.map((s) => {
                    const active = step === s.id
                    const done = step > s.id
                    const Icon = s.icon
                    return (
                      <Button
                        key={s.id}
                        type="button"
                        variant="ghost"
                        size="sm"
                        title={s.id < step ? `Revenir à : ${s.label}` : undefined}
                        disabled={s.id > step}
                        onClick={() => {
                          if (s.id < step) setStep(s.id)
                        }}
                        className={cn(
                          'flex-1 flex flex-col items-center gap-1.5 min-w-0 rounded-2xl py-2.5 px-0.5 sm:px-1 h-auto font-semibold transition-all duration-200',
                          active &&
                            'bg-blue-600 text-white shadow-md shadow-blue-600/25 hover:bg-blue-600 hover:text-white scale-[1.02]',
                          done && !active && 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80 hover:bg-emerald-100 hover:text-emerald-900',
                          !active && !done && 'bg-slate-100/90 text-slate-400 hover:bg-slate-100 hover:text-slate-400'
                        )}
                      >
                        <Icon className="text-[15px] sm:text-base shrink-0" />
                        <span className="text-[9px] sm:text-[10px] font-bold truncate w-full text-center leading-tight px-0.5">
                          {s.short}
                        </span>
                      </Button>
                    )
                  })}
                </div>
              </div>

              <div className="p-5 sm:p-7 xl:p-9">
                <div key={step} className="animate-step space-y-6">
                  {step === 1 && (
                    <>
                      <div className="space-y-3">
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Votre identité</h2>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          Ces informations servent à constituer votre dossier administratif et à vous identifier sans ambiguïté.
                          Utilisez la même graphie que sur vos pièces d’identité ou votre baccalauréat.
                        </p>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-x-5 gap-y-5">
                        <div className="space-y-2">
                          <Label htmlFor="reg-nom" className="text-sm font-medium text-slate-700">
                            Nom <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="reg-nom"
                            type="text"
                            className={fieldClass}
                            placeholder="Ex. DIALLO"
                            value={form.nom}
                            onChange={update('nom')}
                            autoComplete="family-name"
                          />
                          <FieldHint>Nom de famille tel qu’il apparaît sur vos documents officiels (majuscules acceptées).</FieldHint>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reg-prenom" className="text-sm font-medium text-slate-700">
                            Prénom <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="reg-prenom"
                            type="text"
                            className={fieldClass}
                            placeholder="Ex. Mamadou"
                            value={form.prenom}
                            onChange={update('prenom')}
                            autoComplete="given-name"
                          />
                          <FieldHint>Prénom usuel ; en cas de plusieurs prénoms, indiquez le principal.</FieldHint>
                        </div>
                      </div>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <div className="space-y-3">
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Votre établissement</h2>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          Le choix détermine votre <strong className="text-slate-800">rattachement</strong> et le préfixe de
                          votre futur <strong className="text-slate-800">matricule</strong> (généré automatiquement : 3
                          lettres + 3 chiffres). L’arrière-plan s’adapte à l’établissement sélectionné pour vous aider à
                          visualiser votre orientation.
                        </p>
                      </div>
                      <div className="relative">
                        <FaSearch className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-slate-400 text-sm" />
                        <Input
                          type="search"
                          className={cn('pl-9', fieldClass)}
                          placeholder="Rechercher un établissement…"
                          value={etabSearch}
                          onChange={(e) => setEtabSearch(e.target.value)}
                          aria-label="Filtrer les établissements"
                        />
                        <FieldHint>Filtrez la liste si vous connaissez déjà le nom de l’école.</FieldHint>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-etab" className="text-sm font-medium text-slate-700">
                          Établissement <span className="text-red-500">*</span>
                        </Label>
                        <select
                          id="reg-etab"
                          className={cn(
                            fieldClass,
                            'flex w-full px-3 py-2 text-sm text-slate-900 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50'
                          )}
                          value={form.etablissement_id}
                          onChange={update('etablissement_id')}
                        >
                          <option value="">— Choisir —</option>
                          {etablissementsFiltres.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.nom}
                            </option>
                          ))}
                        </select>
                        <FieldHint>Obligatoire : votre compte étudiant sera lié à cet établissement pour la préinscription.</FieldHint>
                        {selectedEtab && (
                          <p className="text-xs text-emerald-700 mt-2 font-medium flex items-center gap-1">
                            <FaCheck /> {selectedEtab.nom}
                          </p>
                        )}
                        {etablissements.length === 0 && (
                          <p className="text-xs text-amber-700 mt-2 font-medium">
                            Aucun établissement disponible pour l’instant. Contactez l’administration.
                          </p>
                        )}
                        {etablissements.length > 0 && etablissementsFiltres.length === 0 && (
                          <p className="text-xs text-amber-700 mt-2">Aucun résultat pour « {etabSearch} ».</p>
                        )}
                      </div>
                    </>
                  )}

                  {step === 3 && (
                    <>
                      <div className="space-y-3">
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Coordonnées</h2>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          Nous utilisons ces informations pour vous <strong>contacter</strong> (convocations, suivi) et pour
                          garantir qu’<strong>un seul compte</strong> existe par combinaison e-mail / téléphone.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-email" className="text-sm font-medium text-slate-700">
                          E-mail <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <FaEnvelope className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-slate-400 text-sm" />
                          <Input
                            id="reg-email"
                            type="email"
                            className={cn('pl-9', fieldClass)}
                            placeholder="exemple@email.com"
                            value={form.email}
                            onChange={update('email')}
                            autoComplete="email"
                          />
                        </div>
                        <FieldHint>
                          Sera aussi votre identifiant de connexion. Utilisez une adresse à laquelle vous avez accès
                          régulièrement.
                        </FieldHint>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-tel" className="text-sm font-medium text-slate-700">
                          Téléphone <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <FaPhone className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-slate-400 text-sm" />
                          <Input
                            id="reg-tel"
                            type="tel"
                            className={cn('pl-9', fieldClass)}
                            placeholder="+221 77 …"
                            value={form.telephone}
                            onChange={update('telephone')}
                            autoComplete="tel"
                          />
                        </div>
                        <FieldHint>Numéro joignable (indicatif pays inclus). Au moins 8 chiffres — espaces ignorés pour le contrôle.</FieldHint>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-adr" className="text-sm font-medium text-slate-700">
                          Adresse <span className="text-slate-400 font-normal">(facultatif)</span>
                        </Label>
                        <Input
                          id="reg-adr"
                          type="text"
                          className={fieldClass}
                          placeholder="Ville, quartier…"
                          value={form.adresse}
                          onChange={update('adresse')}
                          autoComplete="street-address"
                        />
                        <FieldHint>Utile pour le courrier ou les dossiers ; vous pourrez la compléter plus tard si besoin.</FieldHint>
                      </div>
                    </>
                  )}

                  {step === 4 && (
                    <>
                      <div className="space-y-3">
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Sécurité du compte</h2>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          Ce mot de passe protège votre espace : choisissez-le <strong>personnel</strong>, difficile à deviner,
                          et ne le partagez pas. Règles : au moins 8 caractères, une majuscule, une minuscule, un chiffre et un
                          caractère spécial (ex. ! ? @ #).
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-pw" className="text-sm font-medium text-slate-700">
                          Mot de passe <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <FaLock className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-slate-400 text-sm" />
                          <Input
                            id="reg-pw"
                            type={showPassword ? 'text' : 'password'}
                            className={cn('pl-9 pr-10', fieldClass)}
                            placeholder="••••••••"
                            value={form.mot_de_passe}
                            onChange={update('mot_de_passe')}
                            autoComplete="new-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                          >
                            {showPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                          </Button>
                        </div>
                        {form.mot_de_passe.length > 0 && (
                          <div className="mt-2">
                            <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-slate-200">
                              {[0, 1, 2, 3].map((i) => (
                                <div
                                  key={i}
                                  className={`flex-1 rounded-full transition-colors ${
                                    i <= strength.score ? strength.color : 'bg-slate-200'
                                  }`}
                                />
                              ))}
                            </div>
                            <p className="text-xs mt-1 font-medium text-slate-600">
                              Robustesse : <span className="text-slate-900">{strength.label}</span>
                            </p>
                          </div>
                        )}
                        <FieldHint>Évitez les dates de naissance ou séquences simples (123456, mot de passe identique à l’e-mail).</FieldHint>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-pw2" className="text-sm font-medium text-slate-700">
                          Confirmation <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="reg-pw2"
                            type={showConfirmPw ? 'text' : 'password'}
                            className={cn('pr-10', fieldClass)}
                            placeholder="Répétez le mot de passe"
                            value={form.confirm}
                            onChange={update('confirm')}
                            autoComplete="new-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowConfirmPw(!showConfirmPw)}
                            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                            aria-label={showConfirmPw ? 'Masquer' : 'Afficher'}
                          >
                            {showConfirmPw ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                          </Button>
                        </div>
                        {form.confirm && form.mot_de_passe === form.confirm && (
                          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                            <FaCheck /> Les mots de passe correspondent
                          </p>
                        )}
                        <FieldHint>Saisissez exactement le même mot de passe pour éviter un refus à la création du compte.</FieldHint>
                      </div>
                    </>
                  )}

                  {step === 5 && (
                    <>
                      <div className="space-y-3">
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Validation</h2>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          Contrôlez le récapitulatif, acceptez la politique de création de compte, puis cochez le
                          reCAPTCHA lorsqu’il est affiché (obligatoire en production tant que la clé site est configurée).
                        </p>
                      </div>
                      <div className="rounded-2xl border border-blue-100/80 bg-gradient-to-br from-blue-50/90 to-indigo-50/70 px-4 py-4 text-sm text-slate-700 shadow-sm">
                        <p className="font-semibold text-slate-900 mb-3">Récapitulatif</p>
                        <ul className="space-y-1 text-xs text-slate-600">
                          <li>
                            <span className="text-slate-400">Nom :</span> {form.prenom} {form.nom}
                          </li>
                          <li>
                            <span className="text-slate-400">Établissement :</span> {selectedEtab?.nom || '—'}
                          </li>
                          <li>
                            <span className="text-slate-400">E-mail :</span> {form.email}
                          </li>
                          <li>
                            <span className="text-slate-400">Téléphone :</span> {form.telephone}
                          </li>
                        </ul>
                      </div>

                      <div className="rounded-xl border border-blue-100 bg-blue-50/90 px-3 py-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="accept-policy"
                            checked={acceptPolicy}
                            onCheckedChange={(v) => setAcceptPolicy(Boolean(v))}
                            className="mt-1 border-slate-300"
                            aria-label="J’accepte la politique de création de compte"
                          />
                          <p className="text-sm leading-snug text-slate-700">
                            J’accepte la{' '}
                            <button
                              type="button"
                              onClick={() => setShowPolicy(true)}
                              className="font-bold text-blue-700 hover:underline"
                            >
                              politique de création de compte
                            </button>
                            .
                          </p>
                        </div>
                      </div>

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

                      {useRecaptcha && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                          <p className="text-sm font-semibold text-slate-700 mb-2">
                            reCAPTCHA <span className="text-red-500">*</span>
                          </p>
                          <div className="flex justify-center">
                            <ReCAPTCHA
                              ref={recaptchaRef}
                              sitekey={recaptchaSiteKey}
                              onChange={(t) => setRecaptchaToken(t || '')}
                              onExpired={() => setRecaptchaToken('')}
                            />
                          </div>
                          <p className="text-xs text-slate-500 mt-2 text-center">Protection contre les inscriptions automatisées.</p>
                        </div>
                      )}

                      {!useRecaptcha && import.meta.env.DEV && (
                        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          Dev : sans captcha, le serveur doit autoriser l’inscription (ex.{' '}
                          <code className="font-mono">AUTH_INSCRIPTION_BYPASS_CAPTCHA=1</code>).
                        </p>
                      )}

                      {!useRecaptcha && import.meta.env.PROD && (
                        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                          Configuration manquante : définissez la clé site <strong>reCAPTCHA</strong> — variable{' '}
                          <code className="font-mono">VITE_RECAPTCHA_SITE_KEY</code> au build, ou champ{' '}
                          <code className="font-mono">recaptcha</code> dans <code className="font-mono">public/config-site.js</code>{' '}
                          puis <strong>rebuild</strong> du frontend, ou éditez <code className="font-mono">dist/config-site.js</code> après
                          déploiement sans rebuild.
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Navigation : pleine largeur sur mobile, alignée sur bureau */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="flex justify-center sm:justify-start min-h-[44px] items-center">
                      {step > 1 ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={goPrev}
                          className="w-full sm:w-auto rounded-xl border-slate-200 bg-white px-5 py-2.5 h-11 font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                        >
                          <FaChevronLeft className="text-xs" /> Retour
                        </Button>
                      ) : null}
                    </div>
                    <div className="w-full sm:w-auto sm:min-w-[200px] sm:flex sm:justify-end">
                      {step < STEPS.length ? (
                        <Button
                          type="button"
                          onClick={goNext}
                          disabled={etablissements.length === 0 && step === 2}
                          className="w-full sm:w-auto min-h-[3rem] rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-10 py-3 text-base font-bold text-white shadow-xl shadow-blue-600/35 ring-2 ring-white/25 hover:-translate-y-0.5 hover:shadow-blue-500/45 hover:brightness-[1.03] disabled:opacity-40 disabled:hover:translate-y-0 disabled:ring-0"
                        >
                          Continuer <FaChevronRight className="text-sm ml-1.5 opacity-95" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={submitRegistration}
                          disabled={
                            loading ||
                            etablissements.length === 0 ||
                            !acceptPolicy ||
                            captchaBlocked
                          }
                          className="w-full sm:w-auto min-h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-2.5 font-semibold text-white shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 hover:shadow-emerald-500/35 disabled:opacity-50 disabled:hover:translate-y-0"
                        >
                          {loading ? (
                            <>
                              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                              Création…
                            </>
                          ) : (
                            <>
                              <FaShieldAlt className="mr-2" /> Créer mon compte
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
            </div>
            </div>

            <div className="mt-6 max-w-md mx-auto space-y-3">
              <div className="rounded-2xl border border-white/25 bg-slate-950/55 backdrop-blur-md px-5 py-4 text-center shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
                <p className="text-sm text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  Déjà un compte ?{' '}
                  <Link
                    to="/connexion"
                    className="font-semibold text-amber-200 hover:text-amber-100 underline underline-offset-2 decoration-amber-200/70"
                  >
                    Se connecter
                  </Link>
                </p>
                {useRecaptcha && (
                  <p className="text-xs text-white/75 mt-2 leading-snug">
                    reCAPTCHA actif sur cette page en production.
                  </p>
                )}
              </div>
              <p className="text-center">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-4 py-2 text-sm font-medium text-white shadow-md backdrop-blur-sm hover:bg-black/45 hover:border-white/35 transition-colors"
                >
                  ← Retour à l’accueil
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showPolicy} onOpenChange={setShowPolicy}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden border-slate-100 p-0 sm:max-w-2xl">
          <div className="flex shrink-0 items-start justify-between gap-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 px-5 py-4 text-white">
            <div>
              <DialogTitle className="border-0 p-0 text-lg font-black text-white">Politique de création de compte</DialogTitle>
              <DialogDescription className="mt-0 text-xs text-blue-100">
                Règles pour un compte étudiant valide
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-2xl leading-none text-white hover:bg-white/20 hover:text-white"
                aria-label="Fermer"
              >
                ×
              </Button>
            </DialogClose>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5 text-sm text-slate-700">
            <p>
              <strong>1) Un compte = un étudiant.</strong> Les données doivent correspondre à votre identité réelle.
            </p>
            <p>
              <strong>2) Email et téléphone uniques.</strong> Ils servent à éviter les doublons et à sécuriser l’accès.
            </p>
            <p>
              <strong>3) Rattachement établissement.</strong> Le compte étudiant est lié à un établissement et aux formations associées.
            </p>
            <p>
              <strong>4) Mot de passe personnel.</strong> Gardez-le confidentiel et ne le partagez pas.
            </p>
            <p>
              <strong>5) Données académiques sincères.</strong> Les informations fournies doivent être exactes et vérifiables.
            </p>
            <p>
              <strong>6) Documents lisibles.</strong> Les pièces soumises pendant la préinscription doivent être complètes et exploitables.
            </p>
            <p>
              <strong>7) Usage des données.</strong> Les données sont utilisées pour traiter la candidature et le suivi administratif.
            </p>
            <p>
              <strong>8) Correction en cas d’erreur.</strong> L’établissement peut demander des ajustements si nécessaire.
            </p>
          </div>
          <DialogFooter className="shrink-0 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:justify-end">
            <DialogClose asChild>
              <Button type="button" className="rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white hover:bg-blue-700">
                J’ai lu
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
