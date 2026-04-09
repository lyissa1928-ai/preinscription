import { Link, Navigate, useParams } from 'react-router-dom'
import {
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaGraduationCap,
  FaInfoCircle,
} from 'react-icons/fa'
import Navbar from '../components/Navbar'
import { GUIDES, GUIDE_SLUGS, getGuide } from '../data/guideAdmissionContent'

const HERO_IMAGES = {
  esebat: new URL('../../img/ESEBATBTP.jpg', import.meta.url).href,
  escoa: new URL('../../img/ESCOA.jpg', import.meta.url).href,
  efosante: new URL('../../img/EFOSANTE.jpg', import.meta.url).href,
}

function SectionCard({ title, children, theme, accent = 'default' }) {
  const border =
    accent === 'amber'
      ? 'border-amber-200 bg-amber-50/80'
      : accent === 'slate'
        ? 'border-slate-200 bg-slate-50'
        : 'border-slate-200 bg-white shadow-sm'
  return (
    <section className={`rounded-2xl border p-5 sm:p-6 ${border}`}>
      <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-3 flex items-center gap-2">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${theme.sectionIcon}`}
        >
          <FaGraduationCap className="h-4 w-4" aria-hidden />
        </span>
        {title}
      </h2>
      <div className="text-slate-700 text-[15px] leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

function BulletList({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((t) => (
        <li key={t} className="flex gap-2">
          <FaCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  )
}

function GuideHub() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <header className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/40 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 py-12 sm:py-16 sm:px-6">
          <Link
            to="/accueil"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white mb-6"
          >
            <FaArrowLeft className="h-3 w-3" aria-hidden />
            Retour à l’accueil
          </Link>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300/90 mb-2">Candidature</p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">
            Conditions d’admission par établissement
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
            Choisissez l’établissement pour consulter la démarche, les pièces attendues par niveau et les exigences
            officielles.
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full flex-1">
        <ul className="grid gap-4 sm:grid-cols-1">
          {GUIDE_SLUGS.map((slug) => {
            const g = GUIDES[slug]
            if (!g) return null
            return (
              <li key={slug}>
                <Link
                  to={`/guide-conditions-admission/${slug}`}
                  className="group flex flex-col sm:flex-row sm:items-stretch gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
                >
                  <div className="sm:w-40 h-32 sm:h-auto shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    <img
                      src={HERO_IMAGES[slug] || HERO_IMAGES.esebat}
                      alt=""
                      className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h2 className="text-xl font-black text-slate-900 group-hover:text-blue-800 transition-colors">
                      {g.name}
                    </h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">{g.domainLabel}</p>
                    <p className="text-sm text-slate-600 mt-2 line-clamp-2">{g.intro}</p>
                    <span className="mt-3 text-sm font-bold text-blue-700 group-hover:underline">
                      Ouvrir le guide →
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>

        <p className="mt-8 text-center text-sm text-slate-500">
          <Link to="/etablissements" className="font-semibold text-blue-700 hover:underline">
            Voir la liste des établissements
          </Link>
        </p>
      </div>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        Contenu indicatif — seules les règles affichées par votre établissement et les instructions du Ministère font foi.
      </footer>
    </div>
  )
}

function GuideDetail({ g }) {
  const theme = g.theme
  const toc = g.toc

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <header className={`relative overflow-hidden bg-gradient-to-br ${theme.header} text-white`}>
        <div
          className={`absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${theme.radial} via-transparent to-transparent`}
        />
        <div className="relative max-w-4xl mx-auto px-4 py-12 sm:py-16 sm:px-6">
          <Link
            to="/guide-conditions-admission"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white mb-6"
          >
            <FaArrowLeft className="h-3 w-3" aria-hidden />
            Tous les guides
          </Link>
          <p className={`text-xs font-bold uppercase tracking-[0.2em] ${theme.badge} mb-2`}>Référentiel candidature</p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">
            Guide des conditions d’admission — {g.name}
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">{g.intro}</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 w-full flex-1">
        <nav
          aria-label="Sommaire"
          className="mb-10 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
            <FaInfoCircle className="h-4 w-4 text-blue-600" aria-hidden />
            Sommaire
          </p>
          <ol className="grid sm:grid-cols-2 gap-2 text-sm">
            {toc.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={`font-medium underline-offset-2 hover:underline ${theme.link}`}
                >
                  {i + 1}. {s.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-8">
          <div id="demarche" className="scroll-mt-24">
            <SectionCard title="Comment déposer une candidature" theme={theme}>
              <p>{g.demarche.lead}</p>
              <BulletList items={g.demarche.bullets} />
              <p className="pt-2">{g.demarche.footer}</p>
            </SectionCard>
          </div>

          <div id="licence3" className="scroll-mt-24">
            <SectionCard title={g.licence3.title} theme={theme}>
              <p className="font-semibold text-slate-900">Documents à fournir :</p>
              <BulletList items={g.licence3.items} />
            </SectionCard>
          </div>

          <div id="master1" className="scroll-mt-24">
            <SectionCard title={g.master1.title} theme={theme}>
              <BulletList items={g.master1.items} />
              {g.master1.alert && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 p-4 flex gap-3">
                  <FaExclamationTriangle className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" aria-hidden />
                  <div>
                    <p className="font-semibold text-amber-950">{g.master1.alert.title}</p>
                    <p className="text-amber-950/90 mt-1">{g.master1.alert.text}</p>
                  </div>
                </div>
              )}
            </SectionCard>
          </div>

          <div id="master2" className="scroll-mt-24">
            <SectionCard title={g.master2.title} theme={theme}>
              <BulletList items={g.master2.items} />
              {g.master2.footnote && (
                <p className="text-sm text-slate-600 mt-3">{g.master2.footnote}</p>
              )}
            </SectionCard>
          </div>

          {g.commerceBlock && (
            <div id={g.commerceBlock.id} className="scroll-mt-24">
              <SectionCard title={g.commerceBlock.title} theme={theme}>
                {g.commerceBlock.paragraphs.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </SectionCard>
            </div>
          )}

          {g.santeBlock && (
            <div id={g.santeBlock.id} className="scroll-mt-24">
              <SectionCard title={g.santeBlock.title} theme={theme} accent="amber">
                {g.santeBlock.paragraphs.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </SectionCard>
            </div>
          )}

          <div id="ministere" className="scroll-mt-24">
            <SectionCard title={g.ministere.title} theme={theme} accent="amber">
              <BulletList items={g.ministere.items} />
            </SectionCard>
          </div>

          <div id="courriel" className="scroll-mt-24">
            <SectionCard title={g.courriel.title} theme={theme} accent="slate">
              {g.courriel.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </SectionCard>
          </div>

          <div id="suite" className="scroll-mt-24">
            <SectionCard title={g.suite.title} theme={theme}>
              {g.suite.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </SectionCard>
          </div>

          {g.specialBt && (
            <div id="bt" className="scroll-mt-24">
              <section className="rounded-2xl border-2 border-orange-300 bg-gradient-to-br from-white to-orange-50/40 p-5 sm:p-6 shadow-md">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-white text-sm font-black">
                    BT
                  </span>
                  {g.specialBt.title}
                </h2>
                <p className="text-slate-700 mb-4">{g.specialBt.intro}</p>
                <BulletList items={g.specialBt.bullets} />
                <div className="mt-5 rounded-xl border border-slate-200 bg-white/90 p-4">
                  <p className="font-semibold text-slate-900 mb-2">{g.specialBt.orientationTitle}</p>
                  <p className="text-slate-700">{g.specialBt.orientationText}</p>
                </div>
              </section>
            </div>
          )}
        </div>

        <div className="mt-12 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">
            Besoin d’une facture indicative avant inscription ? Utilisez la demande proforma.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/demande-proforma"
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold text-white ${theme.cta}`}
            >
              Demande proforma
            </Link>
            <Link
              to="/inscription"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        Contenu indicatif — seules les règles affichées par votre établissement et les instructions du Ministère font foi.
      </footer>
    </div>
  )
}

export default function GuideConditionsAdmission() {
  const { slug } = useParams()

  if (!slug) {
    return <GuideHub />
  }

  const guide = getGuide(slug)
  if (!guide) {
    return <Navigate to="/guide-conditions-admission" replace />
  }

  return <GuideDetail g={guide} />
}
