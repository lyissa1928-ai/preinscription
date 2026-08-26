import { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { userMatchesRoles } from './utils/roles'
import AuthenticatedLayout from './layouts/AuthenticatedLayout'
import Login from './pages/Login'
import Landing from './pages/Landing'
import {
  Register,
  GuideConditionsAdmission,
  EtudiantDashboard,
  Preinscription,
  FactureView,
  LettrePreinscription,
  AttestationPreinscription,
  AttestationDemandePreinscription,
  AdminDashboard,
  AdminDossiers,
  AdminDossier,
  AdminUsers,
  AdminEtablissements,
  AdminEtablissementDetail,
  AdminProforma,
  AdminFacturesEtabPage,
  AdminAuditLogs,
  AdminChatbotStats,
  AdminSecurityEvents,
  AdminMaintenance,
  AdminRuntimeMonitoring,
  EtablissementHome,
  ResponsableDashboard,
  ResponsableDossier,
  ResponsableGestionEtab,
  ResponsableDemandesProforma,
  StaffPreinscriptionGuichet,
  AgentAdminDashboard,
  AgentAdminDossier,
  ComptableDashboard,
  QualiteDashboard,
  PublicFactureView,
  PublicProformaPage,
  PublicEtablissementPage,
  PublicEtablissementsPage,
  ForcePasswordChange,
  StaffFacturesEtab,
  StaffAcceptesParFormation,
  BienvenueCompte,
  MesAccesEtudiant,
  ChatPage,
  StaffChatDocuments,
  ResetPasswordMatricule,
  ResetPasswordStaff,
  VerifyEmail,
  ForgotPasswordEmail,
  MotDePasseOublie,
  ResetPasswordEmail,
  ProfilPage,
} from './lazyPages'
import RedirectLettreDemandeDeprecated from './pages/RedirectLettreDemandeDeprecated'
import ChatbotWidget from './components/ChatbotWidget'

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="app-shell-bg relative flex h-screen items-center justify-center">
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-[3px] border-indigo-200/80" />
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-indigo-600 border-r-violet-500" />
        </div>
        <p className="text-sm font-semibold text-slate-500">Ouverture de la session…</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/connexion" />
  // Rôle principal OU fonction supplémentaire (ex. responsable d'établissement désigné)
  if (roles && !userMatchesRoles(user, roles)) return <Navigate to="/" />
  return children
}

function AppRoutes() {
  const { user } = useAuth()

  const homeRedirect = () => {
    if (!user) return '/'
    if (user.must_change_password) return '/changer-mot-de-passe-obligatoire'
    if (user.role === 'admin') return '/admin'
    if (user.role === 'controleur_qualite') return '/qualite'
    if (user.role === 'responsable') return '/responsable'
    if (user.role === 'agent_admin') return '/agent-admin'
    if (user.role === 'comptable') return '/comptable'
    return '/dashboard'
  }

  return (
    <Routes>
      {/* ─── Public / Redirection selon rôle ────────────── */}
      <Route path="/" element={
        user
          ? <Navigate to={homeRedirect()} replace />
          : <Landing />
      } />
      <Route path="/accueil" element={
        user && ['responsable', 'agent_admin', 'comptable', 'controleur_qualite', 'admin'].includes(user.role)
          ? <Navigate to={homeRedirect()} replace />
          : <Landing />
      } />
      <Route path="/guide-conditions-admission" element={<GuideConditionsAdmission />} />
      <Route path="/guide-conditions-admission/:slug" element={<GuideConditionsAdmission />} />
      <Route path="/formations" element={<Navigate to="/" replace />} />
      <Route path="/facture-publique/:reference" element={<PublicFactureView />} />
      <Route path="/demande-proforma" element={<PublicProformaPage />} />
      <Route path="/etablissements" element={<PublicEtablissementsPage />} />
      <Route path="/etablissement/:id" element={<PublicEtablissementPage />} />
      <Route path="/connexion" element={user ? <Navigate to={homeRedirect()} /> : <Login />} />
      <Route path="/register" element={<Navigate to="/inscription" replace />} />
      <Route path="/inscription" element={user ? <Navigate to={homeRedirect()} /> : <Register />} />
      <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
      <Route path="/mot-de-passe-oublie-matricule" element={<ResetPasswordMatricule />} />
      <Route path="/mot-de-passe-oublie-personnel" element={<ResetPasswordStaff />} />
      <Route path="/verifier-email" element={<VerifyEmail />} />
      <Route path="/mot-de-passe-oublie-email" element={<ForgotPasswordEmail />} />
      <Route path="/reinitialiser-mot-de-passe-email" element={<ResetPasswordEmail />} />
      <Route path="/changer-mot-de-passe-obligatoire" element={<PrivateRoute><ForcePasswordChange /></PrivateRoute>} />

      {/* ─── Pages avec sidebar (layout authentifié) ─────── */}
      <Route element={<AuthenticatedLayout />}>
        <Route path="/profil" element={<PrivateRoute><ProfilPage /></PrivateRoute>} />
        {/* Étudiant */}
        <Route path="/dashboard" element={<PrivateRoute roles={['etudiant']}><EtudiantDashboard /></PrivateRoute>} />
        <Route path="/bienvenue-compte" element={<PrivateRoute roles={['etudiant']}><BienvenueCompte /></PrivateRoute>} />
        <Route path="/mes-acces" element={<PrivateRoute roles={['etudiant']}><MesAccesEtudiant /></PrivateRoute>} />
        <Route path="/preinscription" element={<PrivateRoute roles={['etudiant']}><Preinscription /></PrivateRoute>} />
        <Route path="/preinscription/:formationId" element={<PrivateRoute roles={['etudiant']}><Preinscription /></PrivateRoute>} />
        <Route path="/facture/:dossierId" element={<PrivateRoute roles={['etudiant', 'admin', 'responsable', 'comptable', 'agent_admin', 'controleur_qualite']}><FactureView /></PrivateRoute>} />

        {/* Lettre */}
        <Route path="/lettre/:dossierId" element={<PrivateRoute roles={['etudiant', 'admin', 'responsable', 'agent_admin', 'comptable', 'controleur_qualite']}><LettrePreinscription /></PrivateRoute>} />
        <Route path="/attestation/:dossierId" element={<PrivateRoute roles={['etudiant', 'admin', 'responsable', 'agent_admin', 'comptable', 'controleur_qualite']}><AttestationPreinscription /></PrivateRoute>} />
        <Route
          path="/lettre-demande/:demandeId"
          element={
            <PrivateRoute roles={['etudiant']}>
              <RedirectLettreDemandeDeprecated />
            </PrivateRoute>
          }
        />
        <Route path="/attestation-demande/:demandeId" element={<PrivateRoute roles={['etudiant']}><AttestationDemandePreinscription /></PrivateRoute>} />

        {/* Accueil établissement (staff + étudiants : catalogue sans tarifs pour les étudiants) */}
        <Route path="/mon-etablissement" element={
          <PrivateRoute roles={['responsable', 'agent_admin', 'comptable', 'controleur_qualite', 'etudiant']}>
            <EtablissementHome />
          </PrivateRoute>
        } />
        <Route path="/mon-etablissement/factures" element={
          <PrivateRoute roles={['responsable', 'agent_admin', 'comptable', 'controleur_qualite']}>
            <StaffFacturesEtab />
          </PrivateRoute>
        } />
        <Route path="/mon-etablissement/acceptes-par-formation" element={
          <PrivateRoute roles={['responsable', 'agent_admin', 'comptable']}>
            <StaffAcceptesParFormation />
          </PrivateRoute>
        } />
        <Route path="/mon-etablissement/documents-chat" element={
          <PrivateRoute roles={['responsable', 'agent_admin', 'comptable', 'controleur_qualite']}>
            <StaffChatDocuments />
          </PrivateRoute>
        } />

        {/* Responsable — acceptation pédagogique */}
        <Route path="/responsable" element={<PrivateRoute roles={['responsable', 'admin']}><ResponsableDashboard /></PrivateRoute>} />
        <Route path="/responsable/dossier/:id" element={<PrivateRoute roles={['responsable', 'admin']}><ResponsableDossier /></PrivateRoute>} />
        <Route path="/responsable/gestion-etablissement" element={
          <PrivateRoute roles={['responsable']}>
            <ResponsableGestionEtab />
          </PrivateRoute>
        } />
        <Route path="/responsable/demandes-proforma" element={<PrivateRoute roles={['responsable', 'admin', 'comptable']}><ResponsableDemandesProforma /></PrivateRoute>} />
        <Route path="/responsable/preinscription-guichet" element={<PrivateRoute roles={['responsable', 'admin', 'agent_admin']}><StaffPreinscriptionGuichet /></PrivateRoute>} />

        {/* Agent admin */}
        <Route path="/agent-admin" element={<PrivateRoute roles={['agent_admin', 'admin']}><AgentAdminDashboard /></PrivateRoute>} />
        <Route path="/agent-admin/dossier/:id" element={<PrivateRoute roles={['agent_admin', 'admin']}><AgentAdminDossier /></PrivateRoute>} />

        {/* Comptable */}
        <Route path="/comptable" element={<PrivateRoute roles={['comptable', 'admin']}><ComptableDashboard /></PrivateRoute>} />

        {/* Contrôleur qualité */}
        <Route path="/qualite" element={<PrivateRoute roles={['controleur_qualite', 'admin']}><QualiteDashboard /></PrivateRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<PrivateRoute roles={['admin']}><AdminDashboard /></PrivateRoute>} />
        <Route path="/admin/dossiers" element={<PrivateRoute roles={['admin']}><AdminDossiers /></PrivateRoute>} />
        <Route path="/admin/dossier/:id" element={<PrivateRoute roles={['admin']}><AdminDossier /></PrivateRoute>} />
        <Route path="/admin/utilisateurs" element={<PrivateRoute roles={['admin']}><AdminUsers /></PrivateRoute>} />
        <Route path="/admin/etablissements" element={<PrivateRoute roles={['admin']}><AdminEtablissements /></PrivateRoute>} />
        <Route path="/admin/etablissements/:id" element={<PrivateRoute roles={['admin']}><AdminEtablissementDetail /></PrivateRoute>} />
        <Route path="/admin/proforma" element={<PrivateRoute roles={['admin']}><AdminProforma /></PrivateRoute>} />
        <Route path="/admin/factures-etablissement" element={<PrivateRoute roles={['admin']}><AdminFacturesEtabPage /></PrivateRoute>} />
        <Route path="/admin/audit-logs" element={<PrivateRoute roles={['admin']}><AdminAuditLogs /></PrivateRoute>} />
        <Route path="/admin/chatbot" element={<PrivateRoute roles={['admin']}><AdminChatbotStats /></PrivateRoute>} />
        <Route path="/admin/security-events" element={<PrivateRoute roles={['admin']}><AdminSecurityEvents /></PrivateRoute>} />
        <Route path="/admin/maintenance" element={<PrivateRoute roles={['admin']}><AdminMaintenance /></PrivateRoute>} />
        <Route path="/admin/runtime-monitoring" element={<PrivateRoute roles={['admin']}><AdminRuntimeMonitoring /></PrivateRoute>} />
      </Route>

      {/* Chat : route dédiée (layout + index) pour éviter les soucis de matching sous layout sans path */}
      <Route
        path="/chat"
        element={
          <PrivateRoute
            roles={['etudiant', 'responsable', 'agent_admin', 'comptable', 'controleur_qualite']}
          >
            <AuthenticatedLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<ChatPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

function PageLoadingFallback() {
  return (
    <div className="app-shell-bg relative flex min-h-screen items-center justify-center">
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-[3px] border-indigo-200/80" />
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-indigo-600 border-r-violet-500" />
        </div>
        <p className="text-sm font-semibold text-slate-500">Chargement de la page…</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoadingFallback />}>
        <AppRoutes />
      </Suspense>
      <ChatbotWidget />
    </AuthProvider>
  )
}
