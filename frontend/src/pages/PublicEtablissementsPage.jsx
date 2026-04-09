import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { FaPhone, FaEnvelope, FaGlobe, FaArrowLeft, FaBuilding } from 'react-icons/fa'
import Navbar from '../components/Navbar'

const TYPE_ETAB_COLORS = {
  sante: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: '🏥' },
  btp: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: '🏗️' },
  gestion: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: '📊' },
}

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

const HERO_IMAGES = [
  new URL('../../img/ESEBATBTP.jpg', import.meta.url).href,
  new URL('../../img/ESCOA.jpg', import.meta.url).href,
  new URL('../../img/EFOSANTE.jpg', import.meta.url).href,
]

const FILTRES = [
  { id: 'all', label: 'Tous' },
  { id: 'sante', label: 'Santé' },
  { id: 'btp', label: 'BTP & génie civil' },
  { id: 'gestion', label: 'Commerce & gestion' },
]

export default function PublicEtablissementsPage() {
  const [etablissements, setEtablissements] = useState([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState(false)
  const [filtreType, setFiltreType] = useState('all')

  useEffect(() => {
    let cancelled = false
    axios
      .get('/api/etablissements')
      .then(({ data }) => {
        if (!cancelled) setEtablissements(Array.isArray(data) ? data.filter((e) => e.actif !== false) : [])
      })
      .catch(() => {
        if (!cancelled) {
          setErreur(true)
          setEtablissements([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

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

  const listeFiltree = useMemo(() => {
    if (filtreType === 'all') return etablissements
    return etablissements.filter((e) => e.type === filtreType)
  }, [etablissements, filtreType])

  return (
    <>
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes heroSlides { 0%, 28% { opacity: 1; } 31%, 97% { opacity: 0; } 100% { opacity: 0; } }
        .float-1 { animation: float 7s ease-in-out infinite; }
        .float-2 { animation: float 9s ease-in-out infinite 1.5s; }
        .page-hero-gradient { background: linear-gradient(125deg, #0f172a 0%, #1e3a8a 38%, #1d4ed8 62%, #312e81 100%); background-size: 200% 200%; animation: gradientShift 22s ease infinite; }
        .hero-bg-slide { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; animation: heroSlides 21s ease-in-out infinite; }
        .fade-up-card { animation: fadeInUp 0.55s ease forwards; }
        .grid-pattern { background-image: linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px); background-size: 48px 48px; }
      `}</style>

      <div
        className="min-h-screen flex flex-col bg-slate-50"
        style={{ '--page-prim': palette.prim, '--page-sec': palette.sec, '--page-tri': palette.tri }}
      >
        <Navbar />

        {/* Hero */}
        <header className="relative overflow-hidden text-white">
          <div className="page-hero-gradient absolute inset-0" />
          <div className="absolute inset-0 opacity-[0.35]">
            {HERO_IMAGES.map((src, idx) => (
              <img
                key={src}
                src={src}
                alt=""
                className="hero-bg-slide"
                loading={idx === 0 ? 'eager' : 'lazy'}
                style={{ animationDelay: `${idx * 7}s` }}
              />
            ))}
          </div>
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(160deg, rgba(15,23,42,0.92) 0%, color-mix(in srgb, var(--page-prim) 42%, #0f172a) 45%, rgba(15,23,42,0.88) 100%)`,
            }}
          />
          <div className="absolute inset-0 grid-pattern pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-14 sm:pb-20">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-white/75 hover:text-white transition-colors mb-8 group"
            >
              <FaArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" aria-hidden />
              Retour à l&apos;accueil
            </Link>

            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-blue-100 mb-5">
                <FaBuilding className="h-3.5 w-3.5 text-amber-300" aria-hidden />
                Réseau partenaire UniPortail
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] mb-4">
                Tous nos{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-300">
                  établissements
                </span>
              </h1>
              <p className="text-base sm:text-lg text-blue-100/90 leading-relaxed max-w-2xl">
                Explorez les écoles rattachées à la plateforme : filières et formations publiques (sans tarifs), inscription
                ciblée et demande de facture proforma.
              </p>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        </header>

        {/* Contenu */}
        <main className="flex-1 relative -mt-6 sm:-mt-8 z-10 px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-7xl mx-auto">
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/5 px-4 py-5 sm:px-6 sm:py-6 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">Filtrer</p>
                  <p className="text-sm text-slate-600">Affinez la liste par domaine d&apos;études.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {FILTRES.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFiltreType(f.id)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                        filtreType === f.id
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
                <p className="text-sm font-medium text-slate-500">Chargement des établissements…</p>
              </div>
            )}

            {!loading && erreur && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
                <p className="text-red-800 font-semibold mb-2">Impossible de charger la liste pour le moment.</p>
                <p className="text-sm text-red-700/90 mb-4">Vérifiez votre connexion ou réessayez plus tard.</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800"
                >
                  Réessayer
                </button>
              </div>
            )}

            {!loading && !erreur && listeFiltree.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-8 py-16 text-center">
                <p className="text-slate-700 font-semibold text-lg mb-2">
                  {etablissements.length === 0
                    ? 'Aucun établissement partenaire pour le moment.'
                    : 'Aucun établissement ne correspond à ce filtre.'}
                </p>
                {etablissements.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFiltreType('all')}
                    className="mt-2 text-sm font-semibold text-blue-600 hover:underline"
                  >
                    Afficher tous les établissements
                  </button>
                )}
              </div>
            )}

            {!loading && !erreur && listeFiltree.length > 0 && (
              <div
                className={`grid gap-5 sm:gap-6 ${
                  listeFiltree.length === 1
                    ? 'grid-cols-1 max-w-lg mx-auto'
                    : listeFiltree.length === 2
                      ? 'md:grid-cols-2 max-w-4xl mx-auto'
                      : 'sm:grid-cols-2 xl:grid-cols-3'
                }`}
              >
                {listeFiltree.map((e, i) => {
                  const typeStyle = TYPE_ETAB_COLORS[e.type] || TYPE_ETAB_COLORS.gestion
                  const brandKey = detectBrand(e.nom)
                  const brand = brandKey ? BRAND_COLORS[brandKey] : null
                  const cardPrim = brand?.prim || e.couleur_primaire || '#1e40af'
                  const cardSec = brand?.sec || e.couleur_secondaire || '#3b82f6'
                  const domainLabel =
                    e.type === 'sante' ? 'Santé' : e.type === 'btp' ? 'BTP / Génie civil' : 'Commerce / Gestion'
                  const telRaw = e.telephone && String(e.telephone).trim()
                  const phones = telRaw ? splitPhoneNumbers(telRaw) : []
                  const mail = e.email_contact && String(e.email_contact).trim()
                  const site = e.site_web && String(e.site_web).trim()
                  const siteHref = siteWebHref(site)

                  return (
                    <article
                      key={e.id}
                      className="fade-up-card group flex flex-col rounded-2xl border border-slate-200/90 bg-white shadow-sm hover:shadow-xl hover:shadow-slate-900/8 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                      style={{ animationDelay: `${Math.min(i, 8) * 70}ms`, animationFillMode: 'forwards' }}
                    >
                      <div
                        className="h-24 relative overflow-hidden"
                        style={{ background: `linear-gradient(135deg, ${cardPrim}, ${cardSec})` }}
                      >
                        <div className="float-1 absolute top-3 right-6 w-16 h-16 rounded-full bg-white/10 blur-sm" />
                        <div className="float-2 absolute -bottom-8 -right-4 w-32 h-32 rounded-full bg-white/5" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      </div>

                      <div className="px-5 pb-5 -mt-10 relative flex-1 flex flex-col">
                        <div className="w-20 h-20 rounded-2xl border-[3px] border-white shadow-lg bg-white flex items-center justify-center mb-4">
                          {e.logo_url ? (
                            <img src={e.logo_url} alt="" className="w-full h-full object-contain p-1.5" />
                          ) : (
                            <span className="text-2xl font-black" style={{ color: cardPrim }}>
                              {String(e.nom || '?')[0]}
                            </span>
                          )}
                        </div>

                        <div className="mb-3">
                          <h2 className="text-xl font-black text-slate-900 leading-snug tracking-tight mb-2">{e.nom}</h2>
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${typeStyle.bg} ${typeStyle.text} border ${typeStyle.border}`}
                          >
                            {typeStyle.icon} {domainLabel}
                          </span>
                        </div>

                        {e.description && (
                          <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 mb-4 flex-1">{e.description}</p>
                        )}

                        {(e.adresse || phones.length > 0) && (
                          <div className="space-y-1 text-xs text-slate-500 mb-4 border-t border-slate-100 pt-4">
                            {e.adresse && <p className="flex gap-1.5 items-start">📍 <span>{e.adresse}</span></p>}
                            {phones.slice(0, 2).map((num, idx) => (
                              <a
                                key={idx}
                                href={telHref(num)}
                                className="flex items-center gap-2 text-slate-600 hover:text-blue-700 font-medium"
                              >
                                <FaPhone className="h-3 w-3 shrink-0 text-rose-500" aria-hidden />
                                {num}
                              </a>
                            ))}
                            {mail && (
                              <a
                                href={`mailto:${mail}`}
                                className="flex items-center gap-2 text-slate-600 hover:text-blue-700 break-all"
                              >
                                <FaEnvelope className="h-3 w-3 shrink-0 text-sky-500" aria-hidden />
                                {mail}
                              </a>
                            )}
                            {siteHref && (
                              <a
                                href={siteHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-slate-600 hover:text-blue-700 break-all"
                              >
                                <FaGlobe className="h-3 w-3 shrink-0 text-cyan-500" aria-hidden />
                                {site || siteHref.replace(/^https?:\/\//i, '')}
                              </a>
                            )}
                          </div>
                        )}

                        <div className="mt-auto space-y-2 pt-2">
                          <Link
                            to={`/etablissement/${e.id}`}
                            className="block w-full text-center py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-95 hover:shadow-md"
                            style={{ background: `linear-gradient(135deg, ${cardPrim}, ${cardSec})` }}
                          >
                            Filières &amp; formations →
                          </Link>
                          <Link
                            to={`/inscription?etablissement_id=${e.id}`}
                            className="block w-full text-center py-2 rounded-xl text-xs font-semibold border-2 border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-white transition-colors"
                          >
                            S&apos;inscrire — cet établissement
                          </Link>
                          <Link
                            to={`/demande-proforma?etablissement_id=${e.id}&tab=conditions`}
                            className="block w-full text-center py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900"
                          >
                            Facture proforma (compte requis)
                          </Link>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </main>

        {/* CTA bas de page */}
        {!loading && !erreur && etablissements.length > 0 && (
          <section
            className="mt-auto py-12 sm:py-14 px-4 text-white relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${palette.tri}, ${palette.prim}, ${palette.sec})`,
            }}
          >
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="float-1 absolute top-0 left-1/3 w-64 h-64 bg-white rounded-full blur-3xl" />
            </div>
            <div className="relative max-w-3xl mx-auto text-center">
              <h3 className="text-2xl sm:text-3xl font-black mb-3">Vous hésitez encore ?</h3>
              <p className="text-blue-100/95 text-sm sm:text-base mb-6">
                Créez un compte gratuit ou demandez une facture proforma sans inscription.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link
                  to="/inscription"
                  className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold px-6 py-3 rounded-xl text-sm shadow-lg hover:bg-blue-50 transition-colors"
                >
                  Créer mon compte
                </Link>
                <Link
                  to="/demande-proforma"
                  className="inline-flex items-center gap-2 border-2 border-white/40 bg-white/10 font-semibold px-6 py-3 rounded-xl text-sm hover:bg-white/15 transition-colors"
                >
                  Facture proforma
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  )
}
