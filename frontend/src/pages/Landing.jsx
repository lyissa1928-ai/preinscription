import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  FaPhone,
  FaEnvelope,
  FaGlobe,
  FaShieldAlt,
  FaFileInvoiceDollar,
  FaUniversity,
  FaBolt,
  FaCheckCircle,
  FaArrowRight,
  FaChevronDown,
} from 'react-icons/fa'
import Navbar from '../components/Navbar'

const STATS = [
  { value: '12 000+', label: 'Étudiants accompagnés', icon: '🎓' },
  { value: '3', label: 'Établissements partenaires', icon: '🏛️' },
  { value: '98%', label: 'Satisfaction', icon: '⭐' },
  { value: '15 ans', label: "D'excellence", icon: '🏆' },
]

const FEATURES = [
  {
    icon: FaBolt,
    title: 'Dossier 100 % numérique',
    desc: 'Après ouverture du compte, déposez votre préinscription en ligne ou suivez une autre démarche (ex. facture proforma).',
    accent: 'from-amber-400/20 to-orange-500/10',
  },
  {
    icon: FaShieldAlt,
    title: 'Données protégées',
    desc: 'Authentification, traçabilité et espaces étudiants conformes aux usages académiques.',
    accent: 'from-emerald-400/20 to-teal-500/10',
  },
  {
    icon: FaFileInvoiceDollar,
    title: 'Facture proforma (autre parcours)',
    desc: 'Une fois votre compte candidat ouvert, vous pouvez demander une facture indicative — sans passer par le dossier de préinscription complet.',
    accent: 'from-sky-400/20 to-blue-600/10',
  },
  {
    icon: FaUniversity,
    title: 'Multi-établissements',
    desc: 'BTP, commerce et santé : choisissez votre école et explorez les filières publiques.',
    accent: 'from-violet-400/20 to-indigo-600/10',
  },
]

const PARCOURS = [
  { step: '01', title: 'Explorer', text: 'Parcourez les établissements et les formations (conditions d’admission consultables publiquement).' },
  { step: '02', title: 'Compte candidat', text: 'Création gratuite et rattachement à un établissement — ce n’est pas encore une préinscription.' },
  { step: '03', title: 'Agir', text: 'Depuis votre espace : préinscription complète ou demande de facture proforma (deux parcours distincts).' },
  { step: '04', title: 'Suivi', text: 'Statut des demandes, lettres et factures dans votre tableau de bord.' },
]

const TYPE_ETAB_COLORS = {
  sante: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: '🏥' },
  btp: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: '🏗️' },
  gestion: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: '📊' },
}

const HERO_IMAGES = [
  new URL('../../img/ESEBATBTP.jpg', import.meta.url).href,
  new URL('../../img/ESCOA.jpg', import.meta.url).href,
  new URL('../../img/EFOSANTE.jpg', import.meta.url).href,
]

const BRAND_COLORS = {
  esebat: { prim: '#F97316', sec: '#FB923C' },
  escoa: { prim: '#0B2A66', sec: '#1E3A8A' },
  efosante: { prim: '#B91C1C', sec: '#38BDF8' },
}

function detectBrand(name = '') {
  const n = String(name).toLowerCase()
  if (n.includes('esebat')) return 'esebat'
  if (n.includes('escoa')) return 'escoa'
  if (n.includes('efosante') || n.includes('efo sante') || n.includes('efo-sante')) return 'efosante'
  return null
}

function siteWebHref(raw) {
  const t = String(raw || '').trim()
  if (!t) return null
  if (/^https?:\/\//i.test(t)) return t
  return `https://${t}`
}

function splitPhoneNumbers(raw) {
  const s = String(raw || '').trim()
  if (!s) return []
  const parts = s
    .split(/\s*[/|]\s*|—|–|\s*;\s*|\s{2,}/u)
    .map((x) => x.trim())
    .filter(Boolean)
  return parts.length ? parts : [s]
}

function telHref(digits) {
  const cleaned = String(digits || '').trim().replace(/\s/g, '')
  return cleaned ? `tel:${cleaned}` : '#'
}

function AnimatedStat({ value, label, icon, delay = 0 }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setVisible(true)
    }, { threshold: 0.25 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={`rounded-2xl border border-white/20 bg-white/10 px-4 py-5 backdrop-blur-md transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="text-2xl mb-1 text-center">{icon}</div>
      <div className="text-2xl sm:text-3xl font-black text-white text-center tracking-tight">{value}</div>
      <div className="text-[11px] sm:text-xs text-white/80 mt-1 text-center font-medium leading-snug">{label}</div>
    </div>
  )
}

export default function Landing() {
  const location = useLocation()
  const navigate = useNavigate()
  const [etablissements, setEtablissements] = useState([])
  const [etablissementsLoaded, setEtablissementsLoaded] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [guideStep, setGuideStep] = useState(0)

  useEffect(() => {
    axios
      .get('/api/etablissements')
      .then(({ data }) => setEtablissements((data || []).filter((e) => e.actif !== false)))
      .catch(() => setEtablissements([]))
      .finally(() => setEtablissementsLoaded(true))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('guide') === '1') {
      setGuideStep(0)
      setShowGuide(true)
    }
  }, [location.search])

  const palette = useMemo(() => {
    const brands = etablissements.map((e) => detectBrand(e.nom)).filter(Boolean)
    const uniq = [...new Set(brands)]
    const first = uniq[0] ? BRAND_COLORS[uniq[0]] : null
    const second = uniq[1] ? BRAND_COLORS[uniq[1]] : null
    const third = uniq[2] ? BRAND_COLORS[uniq[2]] : null

    const prim = first?.prim || etablissements.map((e) => e.couleur_primaire).find(Boolean) || '#1e40af'
    const sec = second?.prim || first?.sec || etablissements.map((e) => e.couleur_secondaire).find(Boolean) || '#1d4ed8'
    const tri = third?.prim || second?.sec || '#312e81'
    return { prim, sec, tri }
  }, [etablissements])

  const publicGuide = [
    {
      title: 'Découvrir les établissements',
      subtitle: 'Consultez les écoles disponibles',
      points: [
        'Parcourez les établissements partenaires visibles sur la page d’accueil.',
        'Identifiez le domaine qui vous intéresse : BTP, Management ou Santé.',
        'Repérez les informations de contact et la présentation de chaque établissement.',
      ],
    },
    {
      title: 'Créer un compte',
      subtitle: 'Accès étudiant sécurisé',
      points: [
        'Cliquez sur « S’inscrire » depuis la barre de navigation.',
        'Remplissez vos informations personnelles.',
        'Connectez-vous ensuite à votre espace étudiant.',
      ],
    },
    {
      title: 'Lancer la préinscription',
      subtitle: 'Choix de la formation',
      points: [
        'Depuis votre espace, ouvrez le module Préinscription.',
        'Choisissez une formation proposée par votre établissement.',
        'Renseignez correctement vos données académiques et personnelles.',
      ],
    },
    {
      title: 'Déposer les documents',
      subtitle: 'Pièces obligatoires',
      points: [
        'Téléversez les pièces demandées (diplôme, relevé, photo, pièce d’identité).',
        'Vérifiez la qualité et la lisibilité des fichiers.',
        'Validez l’envoi du dossier pour traitement.',
      ],
    },
    {
      title: 'Suivre votre dossier',
      subtitle: 'Résultats et documents',
      points: [
        'Consultez le statut de votre dossier depuis votre espace.',
        'Après validation, récupérez vos documents (lettre/facture) disponibles.',
        'En cas de besoin, contactez l’établissement via les canaux affichés.',
      ],
    },
  ]
  const guideTotal = publicGuide.length
  const safeStep = Math.min(Math.max(0, guideStep), guideTotal - 1)
  const currentGuide = publicGuide[safeStep] ?? publicGuide[0]

  return (
    <>
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-18px) rotate(4deg); } }
        @keyframes floatReverse { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(18px) rotate(-4deg); } }
        @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes pulseGlow { 0%, 100% { opacity: 0.18; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.04); } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes heroSlides { 0%, 26% { opacity: 1; transform: scale(1.05); } 30%, 96% { opacity: 0; transform: scale(1.02); } 100% { opacity: 0; transform: scale(1.02); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .float-1 { animation: float 7s ease-in-out infinite; }
        .float-2 { animation: floatReverse 9s ease-in-out infinite; }
        .float-3 { animation: float 11s ease-in-out infinite 2s; }
        .float-4 { animation: floatReverse 8s ease-in-out infinite 1s; }
        .hero-gradient { background: linear-gradient(135deg, #020617, #0f172a, #1e3a8a, #1e40af, #312e81, #020617); background-size: 400% 400%; animation: gradientShift 22s ease infinite; }
        .glow-orb { animation: pulseGlow 6s ease-in-out infinite; }
        .slide-left { animation: slideInLeft 0.95s cubic-bezier(0.22,1,0.36,1) forwards; }
        .slide-right { animation: slideInRight 0.95s cubic-bezier(0.22,1,0.36,1) 0.12s forwards; opacity: 0; animation-fill-mode: forwards; }
        .fade-up { animation: fadeInUp 0.65s ease forwards; }
        .card-hover { transition: transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s ease; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 24px 48px -12px rgba(15,23,42,0.18); }
        .hero-bg-slide { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; animation: heroSlides 27s ease-in-out infinite; }
        .hero-bg-overlay { position: absolute; inset: 0; background: linear-gradient(165deg, rgba(2,6,23,0.82) 0%, color-mix(in srgb, var(--hero-prim) 48%, #020617) 42%, rgba(15,23,42,0.88) 100%); }
        .etab-tint { background: linear-gradient(165deg, #f8fafc 0%, color-mix(in srgb, var(--hero-prim) 6%, white) 40%, color-mix(in srgb, var(--hero-sec) 5%, white) 100%); }
        .mesh-grid { background-image: radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px); background-size: 28px 28px; }
        .noise-overlay { opacity: 0.035; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
        .headline-shine { background-size: 200% auto; animation: shimmer 8s linear infinite; }
      `}</style>

      <div
        className="min-h-screen flex flex-col bg-slate-50"
        style={{
          '--hero-prim': palette.prim,
          '--hero-sec': palette.sec,
          '--hero-tri': palette.tri,
        }}
      >
        <Navbar />

        {etablissementsLoaded && etablissements.length === 0 && (
          <div className="relative z-20 mx-auto max-w-4xl px-4 pt-4">
            <div className="rounded-2xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
              <p className="font-bold">Aucun établissement affiché pour le moment</p>
              <p className="mt-1 text-amber-900/90">
                Vérifiez que le backend tourne et que le fichier de base contient des établissements actifs. En cas de
                perte de données, une sauvegarde peut être restaurée depuis le dossier{' '}
                <code className="rounded bg-amber-100/80 px-1">backend/database/backups</code>.
              </p>
            </div>
          </div>
        )}

        {/* ─── HERO ─── */}
        <section className="hero-gradient relative overflow-hidden text-white min-h-[92vh] sm:min-h-[min(100vh,920px)] flex flex-col justify-center">
          <div className="absolute inset-0 pointer-events-none">
            {HERO_IMAGES.map((src, idx) => (
              <img
                key={`hero-${idx}`}
                src={src}
                alt=""
                className="hero-bg-slide"
                loading={idx === 0 ? 'eager' : 'lazy'}
                style={{ animationDelay: `${idx * 9}s` }}
              />
            ))}
            <div className="hero-bg-overlay" />
            <div className="absolute inset-0 mesh-grid opacity-90" />
            <div className="absolute inset-0 noise-overlay pointer-events-none mix-blend-overlay" />
          </div>

          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="float-1 glow-orb absolute -top-20 -left-20 w-[28rem] h-[28rem] bg-blue-500 rounded-full blur-3xl opacity-20" />
            <div className="float-2 glow-orb absolute -bottom-32 -right-10 w-[32rem] h-[32rem] bg-indigo-500 rounded-full blur-3xl opacity-15" />
            <div className="float-3 absolute top-1/4 right-[12%] w-3 h-24 bg-gradient-to-b from-amber-400/30 to-transparent rounded-full hidden lg:block" />
            <div className="float-4 absolute bottom-1/3 left-[8%] w-20 h-20 border border-white/10 rounded-2xl rotate-12 hidden md:block" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 w-full">
            <div className="grid lg:grid-cols-[1.08fr_0.92fr] gap-12 lg:gap-16 items-center">
              <div className="slide-left max-w-xl lg:max-w-none">
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] sm:text-xs font-semibold tracking-wide backdrop-blur-md">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                    Préinscriptions 2025-2026
                  </span>
                  <span className="text-[10px] sm:text-xs font-medium text-white/50 uppercase tracking-[0.2em]">Sénégal</span>
                </div>

                <h1 className="text-[2.1rem] sm:text-5xl lg:text-[3.35rem] font-black leading-[1.08] tracking-tight mb-5">
                  <span className="block text-white">Votre admission</span>
                  <span className="block mt-1 bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-300 bg-clip-text text-transparent headline-shine">
                    en ligne, sans friction.
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-slate-300/95 mb-8 leading-relaxed max-w-xl font-medium">
                  Ouvrez d’abord un <span className="text-white">compte candidat</span> (identité et école), puis choisissez :{' '}
                  <span className="text-white">préinscription complète</span> ou{' '}
                  <span className="text-white">demande de facture proforma</span> — deux démarches distinctes.
                </p>

                <div className="flex flex-wrap gap-2 mb-8">
                  {['Dossier sécurisé', 'Proforma contrôlée', 'Multi-campus'].map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] sm:text-xs font-medium text-slate-200"
                    >
                      <FaCheckCircle className="h-3 w-3 text-emerald-400 shrink-0" aria-hidden />
                      {t}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 mb-8 sm:mb-10 max-w-full">
                  {etablissements.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center gap-2 rounded-full border border-white/20 bg-black/20 pl-1 pr-3 py-1 backdrop-blur-md"
                    >
                      <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/15 ring-1 ring-white/20">
                        {e.logo_url ? (
                          <img src={e.logo_url} alt="" className="h-full w-full object-contain p-0.5" />
                        ) : (
                          <span className="text-xs font-bold">{e.nom[0]}</span>
                        )}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-white/95 truncate max-w-[10rem] sm:max-w-none">{e.nom}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-stretch gap-3">
                    <Link
                      to="/inscription"
                      className="group inline-flex justify-center items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-7 py-3.5 text-sm sm:text-base font-black text-slate-900 shadow-lg shadow-orange-500/25 transition-all hover:shadow-orange-400/35 hover:-translate-y-0.5"
                    >
                      Créer un compte
                      <FaArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </Link>
                    <Link
                      to="/connexion"
                      className="inline-flex justify-center items-center rounded-2xl border border-white/25 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10"
                    >
                      Connexion
                    </Link>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Sans compte : consultation des{' '}
                    <Link to="/etablissements" className="font-semibold text-white/90 hover:text-white underline decoration-white/30 underline-offset-2">
                      établissements
                    </Link>
                    {' '}et des conditions d’admission (lecture). La préinscription et la demande de facture proforma se font après{' '}
                    <Link to="/inscription" className="font-semibold text-amber-200/95 hover:text-white underline decoration-amber-400/40 underline-offset-2">
                      création de compte
                    </Link>
                    .
                  </p>
                </div>
              </div>

              <div className="slide-right">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-amber-500/15 blur-2xl" />
                  <div className="relative overflow-hidden rounded-[1.75rem] border border-white/20 bg-white/[0.07] p-1 shadow-2xl shadow-black/30 backdrop-blur-xl ring-1 ring-white/10">
                    <div className="rounded-[1.4rem] bg-slate-950/40 p-4 sm:p-5">
                      <div className="mb-4 flex items-center justify-between gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Aperçu plateforme</p>
                        <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-400/30">
                          En direct
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <img src={HERO_IMAGES[0]} alt="" className="h-28 sm:h-36 w-full rounded-xl object-cover ring-1 ring-white/10" loading="lazy" />
                        <img src={HERO_IMAGES[1]} alt="" className="h-28 sm:h-36 w-full rounded-xl object-cover ring-1 ring-white/10" loading="lazy" />
                        <img src={HERO_IMAGES[2]} alt="" className="col-span-2 h-24 sm:h-28 w-full rounded-xl object-cover object-center ring-1 ring-white/10" loading="lazy" />
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-black/25 p-3 text-center">
                        <div>
                          <p className="text-lg font-black text-white">3</p>
                          <p className="text-[9px] font-medium uppercase tracking-wider text-white/45">Écoles</p>
                        </div>
                        <div className="border-x border-white/10">
                          <p className="text-lg font-black text-amber-300">24/7</p>
                          <p className="text-[9px] font-medium uppercase tracking-wider text-white/45">Accès</p>
                        </div>
                        <div>
                          <p className="text-lg font-black text-emerald-300">100%</p>
                          <p className="text-[9px] font-medium uppercase tracking-wider text-white/45">Web</p>
                        </div>
                      </div>
                      <Link
                        to="/etablissements"
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/15"
                      >
                        Explorer les établissements
                        <FaArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <a
              href="#avantages"
              className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors"
            >
              Découvrir
              <FaChevronDown className="h-3 w-3 animate-bounce" aria-hidden />
            </a>
          </div>

          <div className="absolute bottom-0 left-0 right-0 leading-[0]">
            <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-12 sm:h-16" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f8fafc" />
                  <stop offset="100%" stopColor="#f1f5f9" />
                </linearGradient>
              </defs>
              <path
                d="M0 80V40C180 10 360 0 540 18C720 36 900 72 1080 68C1260 64 1380 28 1440 12V80H0Z"
                fill="url(#waveGrad)"
              />
            </svg>
          </div>
        </section>

        {/* ─── AVANTAGES ─── */}
        <section id="avantages" className="relative scroll-mt-20 -mt-1 bg-slate-50 px-4 py-16 sm:py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Pourquoi UniPortail</p>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Pensé pour les candidats et les écoles</h2>
              <p className="mt-3 text-slate-600 sm:text-lg">
                Compte candidat, puis préinscription ou facture proforma : tout est centralisé, sans confondre les étapes.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-xl"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div
                    className={`absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${f.accent} opacity-80 blur-2xl transition-opacity group-hover:opacity-100`}
                  />
                  <div className="relative">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-amber-400 shadow-lg shadow-slate-900/20">
                      <f.icon className="h-5 w-5" aria-hidden />
                    </div>
                    <h3 className="text-lg font-black text-slate-900">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── PARCOURS ─── */}
        <section className="border-y border-slate-200/80 bg-white px-4 py-14 sm:py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">Votre parcours en quatre temps</h2>
              <p className="mt-2 text-slate-500">Compte d’abord, puis préinscription ou facture proforma — jusqu’au suivi de vos demandes.</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {PARCOURS.map((p, i) => (
                <div key={p.step} className="relative">
                  {i < PARCOURS.length - 1 && (
                    <div
                      className="absolute left-[calc(50%+2.5rem)] top-10 hidden h-px w-[calc(100%-1.25rem)] bg-gradient-to-r from-blue-200 to-transparent lg:block"
                      aria-hidden
                    />
                  )}
                  <div className="relative rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-5 text-center shadow-sm ring-1 ring-slate-100">
                    <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-sm font-black text-white shadow-md">
                      {p.step}
                    </span>
                    <h3 className="font-bold text-slate-900">{p.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── STATS ─── */}
        <section
          className="relative overflow-hidden px-4 py-14 sm:py-16 sm:px-6 lg:px-8"
          style={{ background: `linear-gradient(125deg, ${palette.tri} 0%, ${palette.prim} 48%, ${palette.sec} 100%)` }}
        >
          <div className="absolute inset-0 opacity-25">
            <div className="float-1 absolute -left-20 top-0 h-72 w-72 rounded-full bg-white blur-3xl" />
            <div className="float-2 absolute -right-10 bottom-0 h-80 w-80 rounded-full bg-cyan-300 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-5xl">
            <p className="mb-8 text-center text-xs font-bold uppercase tracking-[0.25em] text-white/70">Chiffres clés</p>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              {STATS.map((s, i) => (
                <AnimatedStat key={i} {...s} delay={i * 90} />
              ))}
            </div>
          </div>
        </section>

        {/* ─── ÉTABLISSEMENTS ─── */}
        {etablissements.length > 0 && (
          <section id="etablissements" className="etab-tint scroll-mt-20 px-4 py-16 sm:py-20 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <div className="mb-10 flex flex-col items-start justify-between gap-6 sm:mb-12 md:flex-row md:items-end">
                <div className="max-w-2xl">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Réseau partenaire</p>
                  <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Nos établissements</h2>
                  <p className="mt-3 text-slate-600 sm:text-lg">
                    Chaque école publie ses formations sur la plateforme. Choisissez votre établissement pour préinscrire ou consulter le catalogue public.
                  </p>
                </div>
                <Link
                  to="/etablissements"
                  className="group inline-flex shrink-0 items-center gap-2 rounded-2xl border-2 border-slate-900 bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-800 hover:shadow-xl"
                >
                  Voir la page complète
                  <FaArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </div>

              <div
                className={`grid gap-5 sm:gap-6 ${
                  etablissements.length === 1
                    ? 'mx-auto max-w-md grid-cols-1'
                    : etablissements.length === 2
                      ? 'mx-auto max-w-4xl md:grid-cols-2'
                      : 'md:grid-cols-2 xl:grid-cols-3'
                }`}
              >
                {etablissements.map((e, i) => {
                  const typeStyle = TYPE_ETAB_COLORS[e.type] || TYPE_ETAB_COLORS.gestion
                  const brandKey = detectBrand(e.nom)
                  const brand = brandKey ? BRAND_COLORS[brandKey] : null
                  const cardPrim = brand?.prim || e.couleur_primaire || '#1e40af'
                  const cardSec = brand?.sec || e.couleur_secondaire || '#3b82f6'
                  const domainLabel = e.type === 'sante' ? 'Santé' : e.type === 'btp' ? 'BTP / Génie Civil' : 'Commerce / Gestion'
                  return (
                    <div
                      key={e.id}
                      className="card-hover fade-up overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <div className="relative h-24 overflow-hidden" style={{ background: `linear-gradient(135deg, ${cardPrim}, ${cardSec})` }}>
                        <div className="float-1 absolute right-6 top-3 h-14 w-14 rounded-full bg-white/15 blur-sm" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                      </div>
                      <div className="relative -mt-10 px-5 pb-6">
                        <div className="mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-[3px] border-white bg-white shadow-lg">
                          {e.logo_url ? (
                            <img src={e.logo_url} alt={e.nom} className="h-full w-full object-contain p-1" />
                          ) : (
                            <span className="text-2xl font-black" style={{ color: e.couleur_primaire || '#1e40af' }}>
                              {e.nom[0]}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-black leading-tight tracking-tight text-slate-900">{e.nom}</h3>
                        <span
                          className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}
                        >
                          {typeStyle.icon} {domainLabel}
                        </span>
                        {e.description && <p className="mt-3 line-clamp-2 text-sm text-slate-600">{e.description}</p>}
                        <div className="mt-3 space-y-1 text-xs text-slate-500">
                          {e.adresse && <p>📍 {e.adresse}</p>}
                          {e.telephone && <p>📞 {e.telephone}</p>}
                        </div>
                        <div className="mt-4 grid grid-cols-1 gap-2">
                          <Link
                            to={`/etablissement/${e.id}`}
                            className="block w-full rounded-xl py-2.5 text-center text-sm font-bold text-white transition-all hover:opacity-95"
                            style={{ background: `linear-gradient(135deg, ${cardPrim}, ${cardSec})` }}
                          >
                            Filières &amp; formations →
                          </Link>
                          <Link
                            to={`/inscription?etablissement_id=${e.id}`}
                            className="block w-full rounded-xl border-2 border-slate-200 bg-white py-2 text-center text-xs font-semibold text-slate-800 hover:border-slate-300"
                          >
                            S’inscrire — cet établissement
                          </Link>
                          <Link
                            to={`/demande-proforma?etablissement_id=${e.id}&tab=conditions`}
                            className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Facture proforma (compte requis)
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* ─── CTA ─── */}
        <section
          className="relative overflow-hidden px-4 py-16 text-white sm:py-20 sm:px-6 lg:px-8"
          style={{ background: `linear-gradient(135deg, #020617 0%, ${palette.tri} 35%, ${palette.prim} 70%, ${palette.sec} 100%)` }}
        >
          <div className="absolute inset-0 opacity-30">
            <div className="float-1 glow-orb absolute left-1/4 top-0 h-64 w-64 rounded-full bg-amber-400 blur-3xl" />
            <div className="float-2 absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-indigo-500 blur-3xl opacity-50" />
          </div>
          <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Candidatures ouvertes
              </div>
              <h2 className="text-3xl font-black leading-tight sm:text-4xl lg:text-[2.6rem]">
                Prêt à écrire{' '}
                <span className="bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent">votre avenir</span> ?
              </h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-blue-100/90">
                Inscription gratuite, interface claire et accompagnement jusqu’à la validation de votre dossier.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch">
              <Link
                to="/inscription"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-8 py-4 text-center text-base font-black text-slate-900 shadow-xl shadow-orange-500/20 transition-transform hover:-translate-y-0.5"
              >
                Créer mon compte gratuitement
                <FaArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                to="/connexion"
                className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-8 py-4 text-center text-base font-semibold backdrop-blur-sm transition-colors hover:bg-white/15"
              >
                J’ai déjà un compte
              </Link>
            </div>
          </div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer className="bg-[#0a0f1a] px-4 py-12 text-gray-400 sm:px-6 sm:py-14 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-3">
                <div className="mb-3 text-xl font-black tracking-tight text-white">UniPréinscription</div>
                <p className="max-w-xs text-sm leading-relaxed text-slate-500">
                  Plateforme officielle multi-établissements de préinscription universitaire au Sénégal.
                </p>
              </div>

              <div className="lg:col-span-6">
                <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Établissements &amp; coordonnées</h2>
                {etablissements.length === 0 ? (
                  <p className="text-sm text-slate-600">Aucun établissement partenaire pour le moment.</p>
                ) : (
                  <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
                    {etablissements.map((e) => {
                      const telRaw = e.telephone && String(e.telephone).trim()
                      const phones = telRaw ? splitPhoneNumbers(telRaw) : []
                      const mail = e.email_contact && String(e.email_contact).trim()
                      const site = e.site_web && String(e.site_web).trim()
                      const siteHref = siteWebHref(site)
                      const hasContact = phones.length > 0 || mail || siteHref
                      return (
                        <li key={e.id} className="min-w-0">
                          <article className="flex h-full flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950 px-4 py-4 shadow-lg ring-1 ring-white/5">
                            <h3 className="mb-3 border-b border-white/10 pb-2.5 text-[15px] font-semibold leading-snug text-slate-100">
                              {e.nom}
                            </h3>
                            {hasContact ? (
                              <div className="flex-1 space-y-2.5 text-[13px] leading-snug">
                                {phones.length > 0 && (
                                  <div className="space-y-1.5">
                                    {phones.map((num, idx) => (
                                      <a
                                        key={`${e.id}-tel-${idx}`}
                                        href={telHref(num)}
                                        className="group flex items-start gap-2.5 text-slate-400 transition-colors hover:text-white"
                                      >
                                        <FaPhone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400/90 group-hover:text-rose-300" aria-hidden />
                                        <span className="break-words">{num}</span>
                                      </a>
                                    ))}
                                  </div>
                                )}
                                {mail && (
                                  <a
                                    href={`mailto:${mail}`}
                                    className="group flex items-start gap-2.5 break-all text-slate-400 transition-colors hover:text-white"
                                  >
                                    <FaEnvelope className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400/90 group-hover:text-sky-300" aria-hidden />
                                    <span>{mail}</span>
                                  </a>
                                )}
                                {siteHref && (
                                  <a
                                    href={siteHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-start gap-2.5 break-all text-slate-400 transition-colors hover:text-white"
                                  >
                                    <FaGlobe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400/90 group-hover:text-cyan-300" aria-hidden />
                                    <span>{site || siteHref.replace(/^https?:\/\//i, '')}</span>
                                  </a>
                                )}
                              </div>
                            ) : (
                              <p className="flex-1 text-xs italic text-slate-600">Coordonnées à compléter côté administration.</p>
                            )}
                          </article>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <nav className="lg:col-span-3" aria-label="Liens utiles">
                <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Liens utiles</h2>
                <ul className="space-y-2.5 text-sm">
                  <li>
                    <Link to="/etablissements" className="inline-block border-b border-transparent py-0.5 text-slate-400 transition-colors hover:border-slate-600 hover:text-white">
                      Tous les établissements
                    </Link>
                  </li>
                  <li>
                    <Link to="/inscription" className="inline-block border-b border-transparent py-0.5 text-slate-400 transition-colors hover:border-slate-600 hover:text-white">
                      Créer un compte
                    </Link>
                  </li>
                  <li>
                    <Link to="/connexion" className="inline-block border-b border-transparent py-0.5 text-slate-400 transition-colors hover:border-slate-600 hover:text-white">
                      Connexion
                    </Link>
                  </li>
                  <li>
                    <Link to="/demande-proforma" className="inline-block border-b border-transparent py-0.5 text-slate-400 transition-colors hover:border-slate-600 hover:text-white">
                      Facture proforma (compte requis)
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>

            <div className="flex flex-col flex-wrap items-start justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center">
              <p className="order-2 text-xs text-slate-600 sm:order-1">© {new Date().getFullYear()} UniPréinscription. Tous droits réservés.</p>
              {etablissements.length > 0 && (
                <div className="order-1 flex flex-wrap items-center gap-2.5 sm:order-2" aria-label="Logos des établissements partenaires">
                  <span className="mr-1 hidden text-[10px] uppercase tracking-wider text-slate-600 sm:inline">Partenaires</span>
                  {etablissements.map((e) => (
                    <div
                      key={e.id}
                      className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/15 shadow-inner sm:h-10 sm:w-10"
                      style={{ background: `${e.couleur_primaire || '#4b5563'}26` }}
                      title={e.nom}
                    >
                      {e.logo_url ? (
                        <img src={e.logo_url} alt="" className="h-full w-full object-contain p-0.5" />
                      ) : (
                        <span className="text-[11px] font-bold" style={{ color: e.couleur_primaire || '#9ca3af' }}>
                          {String(e.nom || '?')[0]}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </footer>
      </div>

      {!showGuide && (
        <button
          type="button"
          onClick={() => {
            setGuideStep(0)
            setShowGuide(true)
            navigate('/?guide=1')
          }}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full border border-white/20 bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-2xl shadow-blue-900/40 transition-all hover:-translate-y-0.5 hover:from-blue-500 hover:to-indigo-500"
          title="Ouvrir le guide d'utilisation"
        >
          <span aria-hidden>✨</span> Guide
        </button>
      )}

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-800 via-blue-700 to-cyan-600 px-5 py-4 text-white">
              <div>
                <p className="text-xl font-black">Guide d&apos;utilisation</p>
                <p className="text-sm text-blue-100">
                  Visiteur — étape {safeStep + 1} sur {guideTotal}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowGuide(false)
                  navigate({ pathname: location.pathname, search: '' }, { replace: true })
                }}
                title="Fermer"
                className="text-2xl leading-none text-white/90 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="p-5">
              <div className="mb-4 flex gap-1.5">
                {publicGuide.map((_, i) => (
                  <div key={i} className={`h-2 flex-1 rounded-full ${i <= guideStep ? 'bg-cyan-500' : 'bg-slate-200'}`} />
                ))}
              </div>
              <h3 className="text-3xl font-black leading-tight text-slate-900">{currentGuide.title}</h3>
              <p className="mt-1 mb-4 text-slate-500">{currentGuide.subtitle}</p>
              <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                {currentGuide.points.map((p, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                      {i + 1}
                    </span>
                    <p className="text-slate-700">{p}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setGuideStep((s) => Math.max(0, s - 1))}
                disabled={safeStep === 0}
                className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 disabled:opacity-40"
              >
                ← Précédent
              </button>
              <div className="text-xs text-slate-500">
                Étape {safeStep + 1}/{guideTotal}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (safeStep >= guideTotal - 1) {
                    setShowGuide(false)
                    navigate({ pathname: location.pathname, search: '' }, { replace: true })
                  } else setGuideStep((s) => s + 1)
                }}
                className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
              >
                {safeStep >= guideTotal - 1 ? 'Terminer' : 'Suivant →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
