import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const BRAND_IMAGE = new URL('../../img/image-multisite.jpg', import.meta.url).href

const NAV_LINKS = {
  admin: [
    { to: '/admin', label: 'Dossiers' },
    { to: '/admin/utilisateurs', label: 'Utilisateurs' },
    { to: '/responsable', label: 'Pédagogie' },
    { to: '/agent-admin', label: 'Contrôle admin' },
    { to: '/comptable', label: 'Finance' }
  ],
  responsable: [
    { to: '/responsable', label: 'Mes dossiers' }
  ],
  agent_admin: [
    { to: '/agent-admin', label: 'Contrôle dossiers' }
  ],
  comptable: [
    { to: '/comptable', label: 'Finance & Comptabilité' }
  ],
  directeur: [
    { to: '/directeur', label: 'Supervision' }
  ],
  etudiant: [
    { to: '/preinscription', label: 'Préinscription' },
    { to: '/dashboard', label: 'Mon espace' }
  ],
  public: []
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    toast.success('Déconnexion réussie')
    navigate('/')
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  const links = user ? (NAV_LINKS[user.role] || NAV_LINKS.public) : NAV_LINKS.public

  const roleColor = {
    admin: 'bg-purple-600',
    responsable: 'bg-teal-600',
    agent_admin: 'bg-orange-500',
    comptable: 'bg-violet-600',
    directeur: 'bg-blue-800',
    etudiant: 'bg-blue-600'
  }

  const roleLabel = {
    admin: 'Administrateur',
    responsable: 'Resp. Pédagogique',
    agent_admin: 'Agent Administratif',
    comptable: 'Comptable',
    directeur: 'Directeur',
    etudiant: 'Étudiant'
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-blue-100 shadow bg-white">
              <img src={BRAND_IMAGE} alt="UniPortail" className="w-full h-full object-cover" />
            </div>
            <div className="hidden sm:block">
              <div className="text-base font-bold text-blue-900 leading-tight">UniPortail</div>
              <div className="text-xs text-gray-400 leading-tight">Plateforme officielle</div>
            </div>
          </Link>

          {/* Liens de navigation */}
          <div className="hidden md:flex items-center gap-1">
            {!user && (
              <Link to="/" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/') && location.pathname === '/' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-blue-700 hover:bg-gray-50'}`}>
                Accueil
              </Link>
            )}
            <Link
              to={user ? '/preinscription?guide=1' : '/?guide=1'}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:text-blue-700 hover:bg-gray-50"
            >
              Guide d'utilisation
            </Link>
            {links.map(link => (
              <Link key={link.to} to={link.to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(link.to) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-blue-700 hover:bg-gray-50'}`}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Droite */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${roleColor[user.role] || 'bg-gray-500'}`}>
                    {(user.prenom?.[0] || '?')}{(user.nom?.[0] || '')}
                  </div>
                  <div className="hidden md:block">
                    <div className="font-semibold text-gray-800 text-sm leading-tight">{user.prenom} {user.nom}</div>
                    <div className="text-xs text-gray-400 leading-tight">{roleLabel[user.role] || user.role}</div>
                  </div>
                </div>
                <button onClick={handleLogout}
                  className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800 border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline">Déconnexion</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/connexion" className="text-sm font-medium text-gray-600 hover:text-blue-700 px-3 py-2 rounded-lg transition-colors">
                  Se connecter
                </Link>
                <Link to="/inscription" className="btn-primary text-sm py-2 px-4">S'inscrire</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
