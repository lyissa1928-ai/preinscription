import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  FaGraduationCap,
  FaEnvelope,
  FaIdCard,
  FaLock,
  FaChevronRight,
  FaArrowLeft,
  FaBuilding,
} from 'react-icons/fa'

const SUPPORT = 'lyissa15@gmail.com'
const mailtoMatricule = `mailto:${SUPPORT}?subject=${encodeURIComponent('UniPréinscription — Récupération de matricule')}&body=${encodeURIComponent('Bonjour,\n\nJe ne retrouve plus mon matricule. Mon nom : \nMon email d’inscription : \n\nMerci.')}`

function ActionLink({ to, href, children }) {
  const className =
    'group flex items-start justify-between gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 text-left text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-blue-300/80 hover:bg-blue-50/60 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'
  if (href) {
    return (
      <a href={href} className={className}>
        <span className="min-w-0 flex-1 leading-snug">{children}</span>
        <FaChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" aria-hidden />
      </a>
    )
  }
  return (
    <Link to={to} className={className}>
      <span className="min-w-0 flex-1 leading-snug">{children}</span>
      <FaChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" aria-hidden />
    </Link>
  )
}

export default function MesAccesEtudiant() {
  const { user } = useAuth()

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
      <header className="mb-8 text-center sm:mb-10">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-blue-900 text-white shadow-lg shadow-slate-900/25 ring-1 ring-white/10">
          <FaGraduationCap className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Mes identifiants</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
          Informations utilisées pour vous connecter à UniPortail et déposer vos candidatures.
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_20px_50px_-24px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/[0.04]">
        {user?.etablissement_nom && (
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/40 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200/80">
                <FaBuilding className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Établissement</p>
                <p className="text-base font-semibold text-slate-900">{user.etablissement_nom}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 p-5 sm:p-6">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200/80">
                <FaEnvelope className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">E-mail · identifiant de connexion</p>
                <p className="mt-1.5 break-all font-mono text-base font-medium text-slate-900">{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200/80">
                <FaIdCard className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Matricule</p>
                <p className="mt-1.5 font-mono text-xl font-bold tracking-tight text-blue-900 sm:text-2xl">
                  {user?.matricule || '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-white shadow-sm">
                <FaLock className="h-3.5 w-3.5" aria-hidden />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Mot de passe</h2>
                <p className="text-xs text-slate-600">
                  Pour votre sécurité, il n’est pas affiché ni stocké en clair sur cette page.
                </p>
              </div>
            </div>
            <ul className="space-y-2">
              <li>
                <ActionLink to="/mot-de-passe-oublie-email">Recevoir un code de réinitialisation par e-mail</ActionLink>
              </li>
              <li>
                <ActionLink to="/mot-de-passe-oublie-matricule">Définir un nouveau mot de passe avec mon matricule</ActionLink>
              </li>
              <li>
                <ActionLink href={mailtoMatricule}>
                  <span>
                    J’ai oublié mon matricule — contacter le support
                    <span className="mt-1 block text-xs font-normal text-slate-500">{SUPPORT}</span>
                  </span>
                </ActionLink>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:px-6">
          <Link
            to="/dashboard"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white py-3 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <FaArrowLeft className="h-3.5 w-3.5 opacity-70" aria-hidden />
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  )
}
