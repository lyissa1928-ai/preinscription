import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const BRAND_IMAGE = new URL('../../img/image-multisite.jpg', import.meta.url).href

const NAV_LINKS = {
  admin: [
    { to: '/admin', label: 'Tableau de bord' },
    { to: '/admin/etablissements', label: 'Établissements' },
    { to: '/admin/utilisateurs', label: 'Utilisateurs' },
  ],
  responsable: [
    { to: '/responsable', label: 'Tableau de bord' },
    { to: '/responsable/demandes-proforma', label: 'Proforma' },
    { to: '/chat', label: 'Messages' },
  ],
  agent_admin: [
    { to: '/agent-admin', label: 'Tableau de bord' },
    { to: '/responsable/preinscription-guichet', label: 'Guichet' },
    { to: '/chat', label: 'Messages' },
  ],
  comptable: [
    { to: '/comptable', label: 'Tableau de bord' },
    { to: '/responsable/demandes-proforma', label: 'Proforma' },
    { to: '/mon-etablissement/factures', label: 'Factures' },
  ],
  controleur_qualite: [
    { to: '/qualite', label: 'Tableau de bord' },
    { to: '/chat', label: 'Messages' },
    { to: '/mon-etablissement', label: 'Établissement' },
  ],
  etudiant: [
    { to: '/dashboard', label: 'Tableau de bord' },
    { to: '/preinscription', label: 'Préinscription' },
    { to: '/demande-proforma', label: 'Proforma' },
    { to: '/chat', label: 'Messages' },
  ],
  public: [],
}

/** Liens affichés pour les visiteurs (non connectés) */
const VISITOR_NAV = [
  {
    to: '/',
    label: 'Accueil',
    isActive: (loc) =>
      (loc.pathname === '/' || loc.pathname === '/accueil') &&
      !loc.hash &&
      !String(loc.search || '').includes('guide='),
  },
  {
    to: '/?guide=1',
    label: 'Guide',
    isActive: (loc) => String(loc.search || '').includes('guide=1'),
  },
  {
    to: '/etablissements',
    label: 'Établissements',
    isActive: (loc) => loc.pathname === '/etablissements',
  },
]

function navLinkClass(active) {
  return `px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
    active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-blue-700 hover:bg-gray-50'
  }`
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, location.search, location.hash])

  const handleLogout = () => {
    logout()
    toast.success('Déconnexion réussie')
    navigate('/')
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  const links = user ? NAV_LINKS[user.role] || NAV_LINKS.public : NAV_LINKS.public

  const roleColor = {
    admin: 'bg-purple-600',
    responsable: 'bg-teal-600',
    agent_admin: 'bg-orange-500',
    comptable: 'bg-violet-600',
    controleur_qualite: 'bg-cyan-700',
    etudiant: 'bg-blue-600',
  }

  const roleLabel = {
    admin: 'Administrateur',
    responsable: 'Resp. Pédagogique',
    agent_admin: 'Agent Administratif',
    comptable: 'Comptable',
    controleur_qualite: 'Contrôleur qualité',
    etudiant: 'Étudiant',
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex min-w-0 flex-shrink-0 items-center gap-2 sm:gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 overflow-hidden rounded-xl border border-blue-100 bg-white shadow">
              <img src={BRAND_IMAGE} alt="UniPortail" className="h-full w-full object-cover" />
            </div>
            <div className="hidden min-w-0 sm:block">
              <div className="text-sm font-bold leading-tight text-blue-900 sm:text-base">UniPortail</div>
              <div className="text-[10px] leading-tight text-gray-400 sm:text-xs">Plateforme officielle</div>
            </div>
          </Link>

          {/* Desktop — visiteurs */}
          {!user && (
            <div className="hidden flex-1 items-center justify-center gap-0.5 md:flex lg:gap-1">
              {VISITOR_NAV.map((item) => (
                <Link key={item.label} to={item.to} className={navLinkClass(item.isActive(location))}>
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          {/* Desktop — connectés : Accueil + Tableau de bord */}
          {user && (
            <div className="hidden flex-1 items-center justify-center gap-0.5 md:flex lg:gap-1">
              {links.map((link) => (
                <Link key={link.to} to={link.to} className={navLinkClass(isActive(link.to))}>
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Droite + menu mobile */}
          <div className="flex items-center gap-2">
            {!user && (
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 md:hidden"
                aria-expanded={mobileOpen}
                aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                onClick={() => setMobileOpen((o) => !o)}
              >
                {mobileOpen ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            )}

            {user ? (
              <>
                <div className="hidden items-center gap-2 sm:flex">
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                      roleColor[user.role] || 'bg-gray-500'
                    }`}
                  >
                    {user.prenom?.[0] || '?'}
                    {user.nom?.[0] || ''}
                  </div>
                  <div className="hidden md:block">
                    <div className="text-sm font-semibold leading-tight text-gray-800">
                      {user.prenom} {user.nom}
                    </div>
                    <div className="text-xs leading-tight text-gray-400">{roleLabel[user.role] || user.role}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-sm text-red-600 transition-colors hover:border-red-300 hover:text-red-800 sm:px-3"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span className="hidden sm:inline">Déconnexion</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/connexion"
                  className="hidden text-sm font-medium text-gray-600 transition-colors hover:text-blue-700 sm:inline-block sm:px-2 sm:py-2"
                >
                  Se connecter
                </Link>
                <Link to="/inscription" className="btn-primary py-2 px-3 text-sm sm:px-4">
                  S&apos;inscrire
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Panneau mobile — visiteurs */}
        {!user && mobileOpen && (
          <div className="border-t border-gray-100 bg-gray-50/95 py-3 md:hidden">
            <div className="flex flex-col gap-0.5">
              {VISITOR_NAV.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                    item.isActive(location) ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-white'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/connexion"
                className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-center text-sm font-semibold text-gray-800"
              >
                Se connecter
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
