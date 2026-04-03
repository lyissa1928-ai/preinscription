import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { FaPhone, FaEnvelope, FaGlobe } from 'react-icons/fa'
import Navbar from '../components/Navbar'

/* ─── Données statiques ────────────────────────────────────────────────────── */
const STATS = [
  { value: '12 000+', label: 'Étudiants inscrits',      icon: '🎓' },
  { value: '3',       label: 'Établissements partenaires', icon: '🏛️' },
  { value: '98%',     label: 'Taux de satisfaction',     icon: '⭐' },
  { value: '15 ans',  label: "D'excellence académique",  icon: '🏆' },
]

const TYPE_ETAB_COLORS = {
  sante:   { bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-700',   icon: '🏥' },
  btp:     { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: '🏗️' },
  gestion: { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',  icon: '📊' },
}

const HERO_IMAGES = [
  new URL('../../img/ESEBATBTP.jpg', import.meta.url).href,
  new URL('../../img/ESCOA.jpg', import.meta.url).href,
  new URL('../../img/EFOSANTE.jpg', import.meta.url).href,
]

const BRAND_COLORS = {
  esebat: { prim: '#F97316', sec: '#FB923C' }, // orange
  escoa: { prim: '#0B2A66', sec: '#1E3A8A' },  // bleu fonce
  efosante: { prim: '#B91C1C', sec: '#38BDF8' }, // rouge sang + bleu clair
}

function detectBrand(name = '') {
  const n = String(name).toLowerCase()
  if (n.includes('esebat')) return 'esebat'
  if (n.includes('escoa')) return 'escoa'
  if (n.includes('efosante') || n.includes('efo sante') || n.includes('efo-sante')) return 'efosante'
  return null
}

/** Lien site web sûr pour href (ajoute https:// si besoin). */
function siteWebHref(raw) {
  const t = String(raw || '').trim()
  if (!t) return null
  if (/^https?:\/\//i.test(t)) return t
  return `https://${t}`
}

/**
 * Découpe une chaîne pouvant contenir plusieurs numéros (séparateurs / | — ; etc.)
 * pour affichage ligne par ligne et liens tel: propres.
 */
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

/* ─── Compteur animé ────────────────────────────────────────────────────────── */
function AnimatedStat({ value, label, icon, delay = 0 }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className={`text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="text-3xl mb-1">{icon}</div>
      <div className="text-3xl font-black text-white">{value}</div>
      <div className="text-sm text-blue-200 mt-1">{label}</div>
    </div>
  )
}

/* ─── Page principale ──────────────────────────────────────────────────────── */
export default function Landing() {
  const location = useLocation()
  const navigate = useNavigate()
  const [etablissements, setEtablissements] = useState([])
  const [showGuide, setShowGuide] = useState(false)
  const [guideStep, setGuideStep] = useState(0)

  useEffect(() => {
    axios.get('/api/etablissements').then(({ data }) => setEtablissements(data.filter(e => e.actif !== false))).catch(() => {})
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
        'Cliquez sur “S’inscrire” depuis la barre de navigation.',
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
      {/* Animations globales */}
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-20px) rotate(5deg); } }
        @keyframes floatReverse { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(20px) rotate(-5deg); } }
        @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes pulseGlow { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.05); } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes heroSlides { 0%, 30% { opacity: 1; transform: scale(1.06); } 33%, 97% { opacity: 0; transform: scale(1.02); } 100% { opacity: 0; transform: scale(1.02); } }
        .float-1 { animation: float 6s ease-in-out infinite; }
        .float-2 { animation: floatReverse 8s ease-in-out infinite; }
        .float-3 { animation: float 10s ease-in-out infinite 2s; }
        .float-4 { animation: floatReverse 7s ease-in-out infinite 1s; }
        .hero-gradient { background: linear-gradient(135deg, #0f172a, #1e3a8a, #1e40af, #312e81, #0f172a); background-size: 400% 400%; animation: gradientShift 12s ease infinite; }
        .glow-orb { animation: pulseGlow 4s ease-in-out infinite; }
        .slide-left { animation: slideInLeft 0.8s ease forwards; }
        .slide-right { animation: slideInRight 0.8s ease forwards 0.2s; }
        .fade-up { animation: fadeInUp 0.6s ease forwards; }
        .card-hover { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.12); }
        .hero-bg-slide { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; animation: heroSlides 18s ease-in-out infinite; }
        .hero-bg-overlay { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(15,23,42,0.78), color-mix(in srgb, var(--hero-prim) 55%, black) 72%, color-mix(in srgb, var(--hero-sec) 55%, black) 68%, color-mix(in srgb, var(--hero-tri) 50%, black) 65%); }
        .etab-tint { background: linear-gradient(120deg, color-mix(in srgb, var(--hero-prim) 11%, white), color-mix(in srgb, var(--hero-sec) 12%, white), color-mix(in srgb, var(--hero-tri) 10%, white)); }
      `}</style>

      <div
        className="min-h-screen flex flex-col bg-white"
        style={{
          '--hero-prim': palette.prim,
          '--hero-sec': palette.sec,
          '--hero-tri': palette.tri,
        }}
      >
        <Navbar />

        {/* ══ HERO ═══════════════════════════════════════════════════════════ */}
        <section className="hero-gradient relative overflow-hidden text-white min-h-screen flex flex-col justify-center">
          <div className="absolute inset-0 pointer-events-none">
            {HERO_IMAGES.map((src, idx) => (
              <img key={`hero-${idx}`} src={src} alt="" className="hero-bg-slide" loading={idx === 0 ? 'eager' : 'lazy'} style={{ animationDelay: `${idx * 6}s` }} />
            ))}
            <div className="hero-bg-overlay" />
          </div>

          {/* Orbes flottantes */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="float-1 glow-orb absolute top-1/4 left-1/6 w-80 h-80 bg-blue-500 rounded-full opacity-20 blur-3xl" />
            <div className="float-2 glow-orb absolute bottom-1/4 right-1/6 w-96 h-96 bg-indigo-400 rounded-full opacity-20 blur-3xl" />
            <div className="float-3 absolute top-1/3 right-1/3 w-48 h-48 bg-violet-500 rounded-full opacity-10 blur-2xl" />
            <div className="float-4 absolute bottom-1/3 left-1/3 w-56 h-56 bg-cyan-400 rounded-full opacity-15 blur-2xl" />

            {/* Formes géométriques animées */}
            <div className="float-1 absolute top-16 right-1/4 w-8 h-8 border-2 border-yellow-400/40 rotate-45" style={{ animationDelay: '1s' }} />
            <div className="float-2 absolute top-1/3 left-16 w-5 h-5 bg-yellow-400/30 rotate-12" style={{ animationDelay: '2s' }} />
            <div className="float-3 absolute bottom-1/4 right-16 w-12 h-12 border-2 border-blue-300/30 rounded-full" style={{ animationDelay: '0.5s' }} />
            <div className="float-4 absolute top-2/3 left-1/4 w-6 h-6 bg-white/10 rotate-45" style={{ animationDelay: '3s' }} />
            <div className="float-1 absolute bottom-16 left-1/3 w-4 h-4 border border-cyan-300/40" style={{ animationDelay: '1.5s' }} />
            <div className="float-2 absolute top-1/4 right-12 w-3 h-12 bg-gradient-to-b from-yellow-400/20 to-transparent rounded-full" style={{ animationDelay: '0.8s' }} />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-20 w-full">
            <div className="grid lg:grid-cols-2 gap-12 items-center">

              {/* Texte hero */}
              <div className="slide-left">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Préinscriptions ouvertes — 2025-2026
                </div>
                <h1 className="text-5xl sm:text-6xl font-black leading-tight mb-6 tracking-tight">
                  Votre avenir<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                    commence ici.
                  </span>
                </h1>
                <p className="text-xl text-blue-100 mb-6 leading-relaxed max-w-lg">
                  Plateforme officielle multi-établissements. Déposez votre dossier, obtenez votre lettre et votre facture proforma en ligne, en quelques minutes.
                </p>

                {/* Badges établissements */}
                <div className="flex flex-wrap gap-2 mb-8">
                  {etablissements.map(e => (
                    <div key={e.id} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1.5 rounded-full text-sm">
                      {e.logo_url
                        ? <img src={e.logo_url} alt="" className="w-5 h-5 object-contain rounded-full bg-white/20" />
                        : <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">{e.nom[0]}</span>}
                      <span className="font-semibold text-sm">{e.nom}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-4">
                  <Link to="/inscription" className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 text-blue-900 font-black px-8 py-4 rounded-2xl transition-all shadow-2xl hover:shadow-yellow-400/30 hover:-translate-y-0.5 text-base">
                    Créer un compte puis préinscrire →
                  </Link>
                  <Link
                    to="/demande-proforma"
                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 font-semibold px-6 py-4 rounded-2xl transition-all backdrop-blur-sm text-base"
                  >
                    Facture proforma sans compte
                  </Link>
                </div>
              </div>

              {/* Visuel hero (à la place du formulaire) */}
              <div className="slide-right">
                <div className="rounded-3xl border border-white/30 bg-white/10 backdrop-blur-md p-4 sm:p-5 shadow-2xl">
                  <div className="grid grid-cols-2 gap-3">
                    <img src={HERO_IMAGES[0]} alt="BTP" className="w-full h-36 sm:h-44 object-cover rounded-2xl" loading="lazy" />
                    <img src={HERO_IMAGES[1]} alt="Management" className="w-full h-36 sm:h-44 object-cover rounded-2xl" loading="lazy" />
                    <img src={HERO_IMAGES[2]} alt="Santé" className="w-full h-36 sm:h-44 object-cover rounded-2xl col-span-2" loading="lazy" />
                  </div>
                  <Link to="/demande-proforma" className="mt-4 inline-flex w-full justify-center items-center gap-2 bg-white text-blue-800 font-bold py-3 rounded-xl hover:bg-blue-50 transition-all">
                    Accéder au formulaire de facture proforma →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Vague en bas */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path d="M0 60L60 50C120 40 240 20 360 15C480 10 600 20 720 25C840 30 960 30 1080 25C1200 20 1320 10 1380 5L1440 0V60H0Z" fill="white"/>
            </svg>
          </div>
        </section>

        {/* ══ STATS ══════════════════════════════════════════════════════════ */}
        <section className="py-16 px-4 relative overflow-hidden" style={{ background: `linear-gradient(90deg, ${palette.prim}, ${palette.sec})` }}>
          <div className="absolute inset-0 opacity-10">
            <div className="float-1 absolute top-0 left-1/4 w-64 h-64 bg-white rounded-full -translate-y-1/2 blur-3xl" />
            <div className="float-2 absolute bottom-0 right-1/4 w-64 h-64 bg-white rounded-full translate-y-1/2 blur-3xl" />
          </div>
          <div className="relative max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s, i) => <AnimatedStat key={i} {...s} delay={i * 100} />)}
          </div>
        </section>

        {/* ══ ÉTABLISSEMENTS ════════════════════════════════════════════════ */}
        {etablissements.length > 0 && (
          <section className="py-20 px-4 etab-tint">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-blue-600 font-bold text-sm uppercase tracking-widest mb-2">Nos Partenaires</p>
                <h2 className="text-4xl font-black text-gray-900 mb-3">Nos établissements</h2>
                <p className="text-gray-500 text-lg max-w-xl mx-auto">Chaque établissement publie ses formations sur la plateforme : créez votre compte rattaché à l’établissement souhaité pour postuler.</p>
              </div>

              <div className={`grid gap-6 ${etablissements.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : etablissements.length === 2 ? 'md:grid-cols-2 max-w-2xl mx-auto' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
                {etablissements.map((e, i) => {
                  const typeStyle = TYPE_ETAB_COLORS[e.type] || TYPE_ETAB_COLORS.gestion
                  const brandKey = detectBrand(e.nom)
                  const brand = brandKey ? BRAND_COLORS[brandKey] : null
                  const cardPrim = brand?.prim || e.couleur_primaire || '#1e40af'
                  const cardSec = brand?.sec || e.couleur_secondaire || '#3b82f6'
                  const domainLabel = e.type === 'sante' ? 'Santé' : e.type === 'btp' ? 'BTP / Génie Civil' : 'Commerce / Gestion'
                  return (
                    <div key={e.id} className={`card-hover bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm fade-up`} style={{ animationDelay: `${i * 150}ms` }}>
                      {/* Bannière couleur */}
                      <div className="h-24 relative flex items-end pb-0 overflow-hidden" style={{ background: `linear-gradient(135deg, ${cardPrim}, ${cardSec})` }}>
                        <div className="float-1 absolute top-2 right-4 w-14 h-14 bg-white/15 rounded-full" />
                        <div className="float-2 absolute top-4 right-14 w-7 h-7 bg-white/15 rounded-full" />
                        <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/10 to-transparent" />
                      </div>

                      <div className="px-6 pb-6 -mt-10 relative">
                        {/* Logo */}
                        <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-white flex items-center justify-center mb-4">
                          {e.logo_url
                            ? <img src={e.logo_url} alt={e.nom} className="w-full h-full object-contain p-1.5" />
                            : <span className="text-2xl font-black" style={{ color: e.couleur_primaire || '#1e40af' }}>{e.nom[0]}</span>}
                        </div>

                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-black text-gray-900 text-xl leading-tight tracking-tight">{e.nom}</h3>
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${typeStyle.bg} ${typeStyle.text} border ${typeStyle.border}`}>
                              {typeStyle.icon} {domainLabel}
                            </span>
                          </div>
                        </div>

                        {e.description && <p className="text-sm text-gray-500 mb-4 line-clamp-2">{e.description}</p>}

                        <div className="space-y-1 text-xs text-gray-500 mb-4">
                          {e.adresse && <p className="flex items-center gap-1">📍 {e.adresse}</p>}
                          {e.telephone && <p className="flex items-center gap-1">📞 {e.telephone}</p>}
                        </div>

                        <Link
                          to="/demande-proforma"
                          className="block w-full text-center py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 hover:shadow-md"
                          style={{ background: `linear-gradient(135deg, ${cardPrim}, ${cardSec})` }}
                        >
                          Demander une facture proforma →
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* ══ CTA FINAL ════════════════════════════════════════════════════ */}
        <section className="py-24 px-4 relative overflow-hidden text-white" style={{ background: `linear-gradient(135deg, ${palette.tri}, ${palette.prim}, ${palette.sec})` }}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="float-1 glow-orb absolute top-0 left-1/4 w-64 h-64 bg-blue-400 rounded-full opacity-20 blur-3xl" />
            <div className="float-2 glow-orb absolute bottom-0 right-1/4 w-64 h-64 bg-indigo-400 rounded-full opacity-20 blur-3xl" />
          </div>
          <div className="relative max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> Candidatures ouvertes
            </div>
            <h2 className="text-5xl font-black mb-4 leading-tight">
              Prêt à écrire<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">votre avenir ?</span>
            </h2>
            <p className="text-blue-100 text-xl mb-10 max-w-xl mx-auto">
              Rejoignez des milliers d'étudiants qui ont choisi l'excellence. Inscription gratuite, réponse rapide.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/inscription" className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 text-blue-900 font-black px-10 py-4 rounded-2xl text-lg transition-all shadow-2xl hover:-translate-y-0.5">
                Créer mon compte gratuitement →
              </Link>
              <Link to="/connexion" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 font-semibold px-8 py-4 rounded-2xl text-lg transition-all backdrop-blur-sm">
                Se connecter
              </Link>
            </div>
          </div>
        </section>

        {/* ══ FOOTER ═══════════════════════════════════════════════════════ */}
        <footer className="bg-gray-950 text-gray-400 py-12 sm:py-16 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 gap-10 lg:gap-12 lg:grid-cols-12 mb-10 lg:mb-12">
              <div className="lg:col-span-3">
                <div className="text-white font-black text-xl mb-3 tracking-tight">UniPréinscription</div>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                  Plateforme officielle multi-établissements de préinscription universitaire au Sénégal.
                </p>
              </div>

              <div className="lg:col-span-6">
                <h2 className="text-white font-bold mb-4 sm:mb-5 text-xs uppercase tracking-[0.14em]">
                  Établissements &amp; coordonnées
                </h2>
                {etablissements.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucun établissement partenaire pour le moment.</p>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 list-none p-0 m-0">
                    {etablissements.map((e) => {
                      const telRaw = e.telephone && String(e.telephone).trim()
                      const phones = telRaw ? splitPhoneNumbers(telRaw) : []
                      const mail = e.email_contact && String(e.email_contact).trim()
                      const site = e.site_web && String(e.site_web).trim()
                      const siteHref = siteWebHref(site)
                      const hasContact = phones.length > 0 || mail || siteHref
                      return (
                        <li key={e.id} className="h-full min-w-0">
                          <article className="h-full flex flex-col rounded-2xl border border-gray-800/90 bg-gradient-to-b from-gray-900/80 to-gray-950/90 px-4 py-4 shadow-lg shadow-black/20 ring-1 ring-white/5">
                            <h3 className="font-semibold text-gray-100 text-[15px] leading-snug mb-3 border-b border-gray-800/80 pb-2.5">
                              {e.nom}
                            </h3>
                            {hasContact ? (
                              <div className="space-y-2.5 text-[13px] leading-snug flex-1">
                                {phones.length > 0 && (
                                  <div className="space-y-1.5">
                                    {phones.map((num, idx) => (
                                      <a
                                        key={`${e.id}-tel-${idx}`}
                                        href={telHref(num)}
                                        className="group flex items-start gap-2.5 text-gray-400 hover:text-white transition-colors"
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
                                    className="group flex items-start gap-2.5 text-gray-400 hover:text-white transition-colors break-all"
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
                                    className="group flex items-start gap-2.5 text-gray-400 hover:text-white transition-colors break-all"
                                  >
                                    <FaGlobe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400/90 group-hover:text-cyan-300" aria-hidden />
                                    <span>{site || siteHref.replace(/^https?:\/\//i, '')}</span>
                                  </a>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-600 italic flex-1">Coordonnées à compléter côté administration.</p>
                            )}
                          </article>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <nav className="lg:col-span-3" aria-label="Liens utiles">
                <h2 className="text-white font-bold mb-4 sm:mb-5 text-xs uppercase tracking-[0.14em]">Liens utiles</h2>
                <ul className="space-y-2.5 text-sm">
                  <li>
                    <Link to="/inscription" className="text-gray-400 hover:text-white transition-colors inline-block py-0.5 border-b border-transparent hover:border-gray-600">
                      Créer un compte
                    </Link>
                  </li>
                  <li>
                    <Link to="/connexion" className="text-gray-400 hover:text-white transition-colors inline-block py-0.5 border-b border-transparent hover:border-gray-600">
                      Connexion
                    </Link>
                  </li>
                  <li>
                    <Link to="/demande-proforma" className="text-gray-400 hover:text-white transition-colors inline-block py-0.5 border-b border-transparent hover:border-gray-600">
                      Facture proforma (sans compte)
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>

            <div className="border-t border-gray-800/90 pt-6 sm:pt-8 flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-4 sm:gap-6">
              <p className="text-xs text-gray-600 order-2 sm:order-1">
                © {new Date().getFullYear()} UniPréinscription. Tous droits réservés.
              </p>
              {etablissements.length > 0 && (
                <div className="flex flex-wrap items-center gap-2.5 order-1 sm:order-2" aria-label="Logos des établissements partenaires">
                  <span className="text-[10px] uppercase tracking-wider text-gray-600 hidden sm:inline mr-1">Partenaires</span>
                  {etablissements.map((e) => (
                    <div
                      key={e.id}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-gray-700/90 overflow-hidden flex items-center justify-center shadow-inner"
                      style={{ background: `${e.couleur_primaire || '#4b5563'}26` }}
                      title={e.nom}
                    >
                      {e.logo_url ? (
                        <img src={e.logo_url} alt="" className="w-full h-full object-contain p-0.5" />
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
            navigate('/?guide=1', { replace: true })
          }}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl px-4 py-3 text-sm font-bold transition-all hover:-translate-y-0.5"
          title="Ouvrir le guide d'utilisation"
        >
          ✨ Guide
        </button>
      )}

      {showGuide && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-blue-700 to-cyan-600 text-white flex items-center justify-between">
              <div>
                <p className="text-xl font-black">Guide d'utilisation</p>
                <p className="text-sm text-blue-100">Visiteur — étape {safeStep + 1} sur {guideTotal}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowGuide(false)
                  navigate('/', { replace: true })
                }}
                className="text-white/90 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-5">
              <div className="flex gap-1.5 mb-4">
                {publicGuide.map((_, i) => (
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
                disabled={safeStep === 0}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-semibold disabled:opacity-40"
              >
                ← Précédent
              </button>
              <div className="text-xs text-gray-500">Étape {safeStep + 1}/{guideTotal}</div>
              <button
                type="button"
                onClick={() => {
                  if (safeStep >= guideTotal - 1) {
                    setShowGuide(false)
                    navigate('/', { replace: true })
                  } else setGuideStep((s) => s + 1)
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
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
