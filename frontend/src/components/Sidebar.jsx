import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { mediaUrl } from '../utils/mediaUrl'
import { actsAsResponsable } from '../utils/roles'
import { getUserBrandColor, normalizeBrandColor } from '../utils/etabTheme'

const BRAND_IMAGE = new URL('../../img/image-multisite.jpg', import.meta.url).href

/* ─── Icônes SVG inline légères ─────────────────────────────────── */
const Icon = ({ d, d2 }) => (
  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} />
    {d2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d2} />}
  </svg>
)

const ICONS = {
  accueil:     <Icon d="M3 12l9-9 9 9M4 10v10a1 1 0 001 1h5v-6h4v6h5a1 1 0 001-1V10" />,
  dashboard:   <Icon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
  dossiers:    <Icon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  users:       <Icon d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
  formations:  <Icon d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
  etablissements: <Icon d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
  finance:     <Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  stats:       <Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  audit:       <Icon d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" d2="M9 8h.01M12 8h.01M15 8h.01" />,
  shield:      <Icon d="M12 3l8 4v5c0 5.25-3.5 9-8 10-4.5-1-8-4.75-8-10V7l8-4z" />,
  settings:    <Icon d="M10.325 4.317a1.724 1.724 0 013.35 0 1.724 1.724 0 002.573 1.066 1.724 1.724 0 012.297 2.297 1.724 1.724 0 001.065 2.573 1.724 1.724 0 010 3.35 1.724 1.724 0 00-1.065 2.573 1.724 1.724 0 01-2.297 2.297 1.724 1.724 0 00-2.573 1.066 1.724 1.724 0 01-3.35 0 1.724 1.724 0 00-2.573-1.066 1.724 1.724 0 01-2.297-2.297 1.724 1.724 0 00-1.066-2.573 1.724 1.724 0 010-3.35 1.724 1.724 0 001.066-2.573 1.724 1.724 0 012.297-2.297 1.724 1.724 0 002.573-1.066z" d2="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
  pulse:       <Icon d="M3 12h4l2-5 4 10 2-5h6" />,
  controle:    <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
  pedago:      <Icon d="M12 14l9-5-9-5-9 5 9 5z" d2="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />,
  preinscription: <Icon d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
  /** File de demandes (liste + puces) — distinct du crayon « formulaire » */
  demandesListe: (
    <Icon
      d="M8.25 6.75h12M8.25 12h12m-12 5.25h12"
      d2="M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
    />
  ),
  conditions: <Icon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  identifiants: <Icon d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />,
  chat:        <Icon d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />,
  docsChat:    <Icon d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />,
  logout:      <Icon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />,
  menu:        <Icon d="M4 6h16M4 12h16M4 18h16" />,
  close:       <Icon d="M6 18L18 6M6 6l12 12" />,
  chevron:     <Icon d="M9 5l7 7-7 7" />,
}

/* ─── Menus par rôle — une entrée par action, périmètre strict ─ */
const MENUS = {
  admin: [
    {
      label: 'Tableau de bord',
      to: '/admin',
      icon: ICONS.dashboard,
      exact: true,
      isActive: (loc) => loc.pathname === '/admin' && new URLSearchParams(loc.search).get('tab') !== 'conditions',
    },
    { label: 'Dossiers', to: '/admin/dossiers', icon: ICONS.dossiers },
    { label: 'Demandes proforma', to: '/admin/proforma', icon: ICONS.demandesListe },
    { label: 'Établissements', to: '/admin/etablissements', icon: ICONS.etablissements },
    { label: 'Utilisateurs', to: '/admin/utilisateurs', icon: ICONS.users },
    { label: 'Niveaux d’étude', to: '/admin/niveaux-etude', icon: ICONS.pedago },
    { label: 'Factures', to: '/admin/factures-etablissement', icon: ICONS.finance },
    { label: 'Rapports hebdo', to: '/admin/rapports-hebdo', icon: ICONS.stats },
    {
      label: 'Conditions d’admission',
      to: '/admin?tab=conditions',
      icon: ICONS.conditions,
      isActive: (loc) => loc.pathname === '/admin' && new URLSearchParams(loc.search).get('tab') === 'conditions',
    },
    { label: 'Journal d’audit', to: '/admin/audit-logs', icon: ICONS.audit },
    { label: 'Sécurité', to: '/admin/security-events', icon: ICONS.shield },
    { label: 'Maintenance', to: '/admin/maintenance', icon: ICONS.settings },
    { label: 'Mon profil', to: '/profil', icon: ICONS.identifiants },
  ],
  directeur: [
    {
      label: 'Tableau de bord',
      to: '/admin',
      icon: ICONS.dashboard,
      exact: true,
    },
    { label: 'Établissements', to: '/admin/etablissements', icon: ICONS.etablissements },
    { label: 'Dossiers', to: '/admin/dossiers', icon: ICONS.dossiers },
    { label: 'Demandes proforma', to: '/admin/proforma', icon: ICONS.demandesListe },
    { label: 'Factures', to: '/admin/factures-etablissement', icon: ICONS.finance },
    { label: 'Rapports hebdo', to: '/admin/rapports-hebdo', icon: ICONS.stats },
    { label: 'Mon profil', to: '/profil', icon: ICONS.identifiants },
  ],
  admin_etablissement: [
    { label: 'Mon établissement', to: '/mon-etablissement', icon: ICONS.etablissements },
    { label: 'Identité établissement', to: '/mon-etablissement/identite', icon: ICONS.identifiants },
    { label: 'Flyers publics', to: '/mon-etablissement/flyers', icon: ICONS.dossiers },
    { label: 'Équipe & comptes', to: '/mon-etablissement/equipe', icon: ICONS.users, exact: true },
    { label: 'Filières & formations', to: '/responsable/gestion-etablissement', icon: ICONS.formations },
    { label: 'Dossiers & acceptation', to: '/responsable', icon: ICONS.dossiers },
    { label: 'Demandes proforma', to: '/responsable/demandes-proforma', icon: ICONS.demandesListe },
    { label: 'Guichet / factures', to: '/responsable/preinscription-guichet', icon: ICONS.finance },
    { label: 'Factures', to: '/mon-etablissement/factures', icon: ICONS.finance },
    { label: 'Acceptés par formation', to: '/mon-etablissement/acceptes-par-formation', icon: ICONS.dossiers },
    { label: 'Rapports hebdo', to: '/mon-etablissement/rapports-hebdo', icon: ICONS.stats },
    { label: 'Messages', to: '/chat', icon: ICONS.chat },
    { label: 'Mon profil', to: '/profil', icon: ICONS.identifiants },
  ],
  responsable: [
    { label: 'Mon établissement', to: '/mon-etablissement', icon: ICONS.etablissements },
    {
      label: 'Dossiers préinscription',
      to: '/responsable',
      icon: ICONS.dashboard,
      exact: true,
      isActive: (loc) =>
        loc.pathname === '/responsable'
        && new URLSearchParams(loc.search).get('tab') !== 'conditions',
    },
    { label: 'Demandes proforma', to: '/responsable/demandes-proforma', icon: ICONS.demandesListe },
    { label: 'Guichet', to: '/responsable/preinscription-guichet', icon: ICONS.finance },
    { label: 'Formations', to: '/responsable/gestion-etablissement', icon: ICONS.formations },
    { label: 'Messages', to: '/chat', icon: ICONS.chat },
    { label: 'Factures', to: '/mon-etablissement/factures', icon: ICONS.dossiers },
    { label: 'Mon profil', to: '/profil', icon: ICONS.identifiants },
  ],
  responsable_fad: [
    { label: 'Mon établissement (FAD)', to: '/mon-etablissement', icon: ICONS.etablissements },
    {
      label: 'Dossiers FAD',
      to: '/responsable',
      icon: ICONS.dashboard,
      exact: true,
      isActive: (loc) =>
        loc.pathname === '/responsable'
        && new URLSearchParams(loc.search).get('tab') !== 'conditions',
    },
    { label: 'Demandes proforma FAD', to: '/responsable/demandes-proforma', icon: ICONS.demandesListe },
    { label: 'Guichet FAD', to: '/responsable/preinscription-guichet', icon: ICONS.finance },
    { label: 'Formations FAD', to: '/responsable/gestion-etablissement', icon: ICONS.formations },
    { label: 'Agents FAD', to: '/responsable/agents-fad', icon: ICONS.users },
    { label: 'Messages', to: '/chat', icon: ICONS.chat },
    { label: 'Factures', to: '/mon-etablissement/factures', icon: ICONS.dossiers },
    { label: 'Mon profil', to: '/profil', icon: ICONS.identifiants },
  ],
  agent_fad: [
    { label: 'Mon établissement (FAD)', to: '/mon-etablissement', icon: ICONS.etablissements },
    {
      label: 'Dossiers FAD',
      to: '/responsable',
      icon: ICONS.dashboard,
      exact: true,
      isActive: (loc) =>
        loc.pathname === '/responsable'
        && new URLSearchParams(loc.search).get('tab') !== 'conditions',
    },
    { label: 'Demandes proforma FAD', to: '/responsable/demandes-proforma', icon: ICONS.demandesListe },
    { label: 'Guichet FAD', to: '/responsable/preinscription-guichet', icon: ICONS.finance },
    { label: 'Formations FAD', to: '/responsable/gestion-etablissement', icon: ICONS.formations },
    { label: 'Messages', to: '/chat', icon: ICONS.chat },
    { label: 'Factures', to: '/mon-etablissement/factures', icon: ICONS.dossiers },
    { label: 'Mon profil', to: '/profil', icon: ICONS.identifiants },
  ],
  agent_admin: [
    { label: 'Tableau de bord', to: '/agent-admin', icon: ICONS.dashboard, exact: true },
    { label: 'Guichet', to: '/responsable/preinscription-guichet', icon: ICONS.finance },
    { label: 'Demandes proforma', to: '/responsable/demandes-proforma', icon: ICONS.demandesListe },
    { label: 'Messages', to: '/chat', icon: ICONS.chat },
    { label: 'Mon établissement', to: '/mon-etablissement', icon: ICONS.etablissements },
    { label: 'Factures', to: '/mon-etablissement/factures', icon: ICONS.dossiers },
    { label: 'Mon profil', to: '/profil', icon: ICONS.identifiants },
  ],
  comptable: [
    { label: 'Tableau de bord', to: '/comptable', icon: ICONS.dashboard, exact: true },
    { label: 'Demandes proforma', to: '/responsable/demandes-proforma', icon: ICONS.demandesListe },
    { label: 'Factures', to: '/mon-etablissement/factures', icon: ICONS.dossiers },
    { label: 'Messages', to: '/chat', icon: ICONS.chat },
    { label: 'Mon établissement', to: '/mon-etablissement', icon: ICONS.etablissements },
    { label: 'Mon profil', to: '/profil', icon: ICONS.identifiants },
  ],
  controleur_qualite: [
    { label: 'Tableau de bord', to: '/qualite', icon: ICONS.dashboard, exact: true },
    { label: 'Demandes proforma', to: '/responsable/demandes-proforma', icon: ICONS.demandesListe },
    { label: 'Messages', to: '/chat', icon: ICONS.chat },
    { label: 'Mon établissement', to: '/mon-etablissement', icon: ICONS.etablissements },
    { label: 'Mon profil', to: '/profil', icon: ICONS.identifiants },
  ],
  etudiant: [
    { label: 'Tableau de bord', to: '/dashboard', icon: ICONS.dashboard },
    { label: 'Préinscription', to: '/preinscription', icon: ICONS.preinscription },
    { label: 'Demande proforma', to: '/demande-proforma', icon: ICONS.demandesListe },
    { label: 'Messages', to: '/chat', icon: ICONS.chat },
    { label: 'Mon profil', to: '/profil', icon: ICONS.identifiants },
    { label: 'Mes identifiants', to: '/mes-acces', icon: ICONS.identifiants },
  ],
}

const ROLE_CONFIG = {
  admin:       { label: 'Administrateur',     color: 'from-purple-700 to-purple-900', badge: 'bg-purple-500' },
  directeur:   { label: 'Directeur',          color: 'from-slate-700 to-indigo-900', badge: 'bg-indigo-500' },
  admin_etablissement: { label: 'Admin. établissement', color: 'from-blue-700 to-blue-900', badge: 'bg-blue-500' },
  responsable: { label: 'Resp. Pédagogique', color: 'from-teal-700 to-teal-900',    badge: 'bg-teal-500' },
  responsable_fad: { label: 'Responsable FAD', color: 'from-indigo-700 to-indigo-900', badge: 'bg-indigo-500' },
  agent_fad: { label: 'Agent FAD', color: 'from-sky-700 to-indigo-900', badge: 'bg-sky-500' },
  agent_admin: { label: 'Agent Administratif',color: 'from-orange-600 to-orange-800',badge: 'bg-orange-500' },
  comptable:   { label: 'Comptable',          color: 'from-violet-700 to-violet-900',badge: 'bg-violet-500' },
  controleur_qualite: { label: 'Contrôleur qualité', color: 'from-cyan-800 to-slate-900', badge: 'bg-cyan-600' },
  etudiant:    { label: 'Étudiant',           color: 'from-blue-600 to-blue-800',    badge: 'bg-blue-500' },
}

/* ─── NavLink item ───────────────────────────────────────────────── */
function NavItem({ item, collapsed, onClick }) {
  const location = useLocation()
  const basePath = typeof item.to === 'string' ? item.to.split('?')[0] : item.to?.pathname || ''
  const isActive =
    typeof item.isActive === 'function'
      ? item.isActive(location)
      : item.exact
        ? location.pathname === basePath
        : location.pathname === basePath || location.pathname.startsWith(`${basePath}/`)

  return (
    <Link
      to={item.to}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={`relative flex items-center gap-3 rounded-xl py-2.5 pl-3 pr-3 text-sm font-medium transition-all duration-150 group
        ${isActive
          ? 'bg-white/20 text-white shadow-inner'
          : 'text-white/70 hover:bg-white/10 hover:text-white'
        }`}
    >
      {isActive && (
        <span
          className="absolute left-1 top-1/2 h-7 w-0.5 -translate-y-1/2 rounded-full bg-white shadow-sm"
          aria-hidden
        />
      )}
      <span className={`transition-all ${isActive ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
        {item.icon}
      </span>
      {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
    </Link>
  )
}

/* ─── Sidebar principale ─────────────────────────────────────────── */
export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!user) return null

  // Menu du rôle principal, complété par les entrées « responsable » si
  // l'utilisateur est désigné responsable d'établissement (fonction supplémentaire).
  let menu = MENUS[user.role] || []
  const responsableDesigne = user.role !== 'responsable' && user.role !== 'admin' && actsAsResponsable(user)
  if (responsableDesigne) {
    const existing = new Set(menu.map((i) => (typeof i.to === 'string' ? i.to : '')))
    menu = [...menu, ...MENUS.responsable.filter((i) => !existing.has(i.to))]
  }
  const baseCfg = ROLE_CONFIG[user.role] || { label: user.role, color: 'from-gray-700 to-gray-900', badge: 'bg-gray-500' }
  const cfg = responsableDesigne ? { ...baseCfg, label: `${baseCfg.label} · Resp. étab.` } : baseCfg
  const initials = `${user.prenom?.[0] || '?'}${user.nom?.[0] || ''}`
  const homePath = '/accueil'
  const etabLogoSrc = user?.etablissement_logo ? mediaUrl(user.etablissement_logo) : null
  // Couleur établissement (prioritaire) — sinon dégradé du rôle.
  const brandHex = getUserBrandColor(user)
  const brand = brandHex ? normalizeBrandColor(brandHex) : null
  const sidebarStyle = brand
    ? { background: `linear-gradient(180deg, ${brand.primary} 0%, ${brand.secondary} 100%)` }
    : undefined
  const badgeStyle = brand ? { backgroundColor: brand.secondary } : undefined
  const topbarStyle = brand
    ? { background: `linear-gradient(90deg, ${brand.primary}, ${brand.secondary})` }
    : undefined

  const handleLogout = () => {
    logout()
    toast.success('Déconnexion réussie')
    navigate('/')
  }

  const SidebarContent = ({ isMobile = false }) => (
    <div
      className={`flex flex-col h-full text-white ${brand ? '' : `bg-gradient-to-b ${cfg.color}`}`}
      style={sidebarStyle}
    >

      {/* ── Logo + toggle ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 h-16 flex-shrink-0 border-b border-white/10">
        {(!collapsed || isMobile) && (
          <Link to={homePath} className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/30 bg-white flex items-center justify-center flex-shrink-0 p-0.5">
              {etabLogoSrc
                ? <img src={etabLogoSrc} alt="" className="w-full h-full object-contain" />
                : <img src={BRAND_IMAGE} alt="UniPortail" className="w-full h-full object-cover" />}
            </div>
            <span className="font-bold text-sm truncate leading-tight">UniPortail</span>
          </Link>
        )}
        {collapsed && !isMobile && (
          <Link to={homePath} className="w-8 h-8 rounded-lg overflow-hidden border border-white/30 bg-white flex items-center justify-center mx-auto p-0.5">
            {etabLogoSrc
              ? <img src={etabLogoSrc} alt="" className="w-full h-full object-contain" />
              : <img src={BRAND_IMAGE} alt="UniPortail" className="w-full h-full object-cover" />}
          </Link>
        )}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(c => !c)}
            className="ml-auto p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors flex-shrink-0"
          >
            <svg className={`w-4 h-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        )}
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70">
            {ICONS.close}
          </button>
        )}
      </div>

      {/* ── Profil utilisateur ────────────────────────────────── */}
      <div className={`px-3 py-4 border-b border-white/10 flex-shrink-0 ${collapsed && !isMobile ? 'flex justify-center' : ''}`}>
        {(!collapsed || isMobile) ? (
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${brand ? '' : cfg.badge}`}
              style={badgeStyle}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-white truncate">{user.prenom} {user.nom}</p>
              <p className="text-xs text-white/60 truncate">{cfg.label}</p>
            </div>
          </div>
        ) : (
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs ${brand ? '' : cfg.badge}`}
            style={badgeStyle}
            title={`${user.prenom} ${user.nom}`}
          >
            {initials}
          </div>
        )}
      </div>

      {/* ── Menu items ────────────────────────────────────────── */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {menu.map((item, i) => (
          <NavItem
            key={i}
            item={item}
            collapsed={collapsed && !isMobile}
            onClick={() => isMobile && setMobileOpen(false)}
          />
        ))}
      </nav>

      {/* ── Déconnexion ───────────────────────────────────────── */}
      <div className="px-2 py-3 border-t border-white/10 flex-shrink-0">
        <button
          onClick={handleLogout}
          title={collapsed && !isMobile ? 'Déconnexion' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors ${collapsed && !isMobile ? 'justify-center' : ''}`}
        >
          {ICONS.logout}
          {(!collapsed || isMobile) && <span>Déconnexion</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Sidebar desktop ───────────────────────────────────── */}
      <aside data-no-print className={`hidden md:flex flex-col flex-shrink-0 h-screen sticky top-0 transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'}`}>
        <SidebarContent />
      </aside>

      {/* ── Topbar mobile ─────────────────────────────────────── */}
      <div
        className={`md:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center px-4 gap-3 shadow-lg ${brand ? '' : `bg-gradient-to-r ${cfg.color}`}`}
        style={topbarStyle}
      >
        <button onClick={() => setMobileOpen(true)} className="text-white p-1">
          {ICONS.menu}
        </button>
        <Link to={homePath} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md overflow-hidden border border-white/30 bg-white/15">
            <img src={BRAND_IMAGE} alt="UniPortail" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-sm text-white">UniPortail</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${brand ? '' : cfg.badge}`}
            style={badgeStyle}
          >
            {initials}
          </div>
        </div>
      </div>

      {/* ── Drawer mobile ─────────────────────────────────────── */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside data-no-print className="md:hidden fixed top-0 left-0 z-50 h-full w-72 flex flex-col shadow-2xl">
            <SidebarContent isMobile />
          </aside>
        </>
      )}
    </>
  )
}
