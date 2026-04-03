import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthenticatedLayout from './layouts/AuthenticatedLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import Landing from './pages/Landing'
import EtudiantDashboard from './pages/EtudiantDashboard'
import Preinscription from './pages/Preinscription'
import FactureView from './pages/FactureView'
import LettrePreinscription from './pages/LettrePreinscription'
import AttestationPreinscription from './pages/AttestationPreinscription'
import LettreDemandePreinscription from './pages/LettreDemandePreinscription'
import AdminDashboard from './pages/AdminDashboard'
import AdminDossier from './pages/AdminDossier'
import AdminUsers from './pages/AdminUsers'
import AdminEtablissements from './pages/admin/AdminEtablissements'
import AdminEtablissementDetail from './pages/admin/AdminEtablissementDetail'
import AdminProforma from './pages/admin/AdminProforma'
import AdminAuditLogs from './pages/admin/AdminAuditLogs'
import AdminSecurityEvents from './pages/admin/AdminSecurityEvents'
import AdminMaintenance from './pages/admin/AdminMaintenance'
import AdminRuntimeMonitoring from './pages/admin/AdminRuntimeMonitoring'
import EtablissementHome from './pages/EtablissementHome'
import ResponsableDashboard from './pages/responsable/ResponsableDashboard'
import ResponsableDossier from './pages/responsable/ResponsableDossier'
import ResponsableGestionEtab from './pages/responsable/ResponsableGestionEtab'
import ResponsableDemandesProforma from './pages/responsable/ResponsableDemandesProforma'
import AgentAdminDashboard from './pages/agent-admin/AgentAdminDashboard'
import AgentAdminDossier from './pages/agent-admin/AgentAdminDossier'
import ComptableDashboard from './pages/comptable/ComptableDashboard'
import DirecteurDashboard from './pages/directeur/DirecteurDashboard'
import PublicFactureView from './pages/PublicFactureView'
import PublicProformaPage from './pages/PublicProformaPage'
import ForcePasswordChange from './pages/ForcePasswordChange'
import StaffFacturesEtab from './pages/StaffFacturesEtab'
import StaffAcceptesParFormation from './pages/StaffAcceptesParFormation'
import BienvenueCompte from './pages/BienvenueCompte'
import MesAccesEtudiant from './pages/MesAccesEtudiant'
import ResetPasswordMatricule from './pages/ResetPasswordMatricule'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPasswordEmail from './pages/ForgotPasswordEmail'
import ResetPasswordEmail from './pages/ResetPasswordEmail'

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-14 w-14 border-4 border-blue-700 border-t-transparent"></div>
    </div>
  )
  if (!user) return <Navigate to="/connexion" />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />
  return children
}

function AppRoutes() {
  const { user } = useAuth()

  const homeRedirect = () => {
    if (!user) return '/'
    if (user.must_change_password) return '/changer-mot-de-passe-obligatoire'
    if (user.role === 'admin') return '/admin'
    if (user.role === 'directeur') return '/directeur'
    if (['responsable', 'agent_admin', 'comptable'].includes(user.role)) return '/mon-etablissement'
    return '/dashboard'
  }

  return (
    <Routes>
      {/* ─── Public / Redirection selon rôle ────────────── */}
      <Route path="/" element={
        user && ['responsable', 'agent_admin', 'comptable'].includes(user.role)
          ? <Navigate to="/mon-etablissement" />
          : <Landing />
      } />
      <Route path="/accueil" element={<Landing />} />
      <Route path="/formations" element={<Navigate to="/" replace />} />
      <Route path="/facture-publique/:reference" element={<PublicFactureView />} />
      <Route path="/demande-proforma" element={<PublicProformaPage />} />
      <Route path="/connexion" element={user ? <Navigate to={homeRedirect()} /> : <Login />} />
      <Route path="/inscription" element={user ? <Navigate to={homeRedirect()} /> : <Register />} />
      <Route path="/mot-de-passe-oublie-matricule" element={<ResetPasswordMatricule />} />
      <Route path="/verifier-email" element={<VerifyEmail />} />
      <Route path="/mot-de-passe-oublie-email" element={<ForgotPasswordEmail />} />
      <Route path="/reinitialiser-mot-de-passe-email" element={<ResetPasswordEmail />} />
      <Route path="/changer-mot-de-passe-obligatoire" element={<PrivateRoute><ForcePasswordChange /></PrivateRoute>} />

      {/* ─── Pages avec sidebar (layout authentifié) ─────── */}
      <Route element={<AuthenticatedLayout />}>
        {/* Étudiant */}
        <Route path="/dashboard" element={<PrivateRoute roles={['etudiant']}><EtudiantDashboard /></PrivateRoute>} />
        <Route path="/bienvenue-compte" element={<PrivateRoute roles={['etudiant']}><BienvenueCompte /></PrivateRoute>} />
        <Route path="/mes-acces" element={<PrivateRoute roles={['etudiant']}><MesAccesEtudiant /></PrivateRoute>} />
        <Route path="/preinscription" element={<PrivateRoute roles={['etudiant']}><Preinscription /></PrivateRoute>} />
        <Route path="/preinscription/:formationId" element={<PrivateRoute roles={['etudiant']}><Preinscription /></PrivateRoute>} />
        <Route path="/facture/:dossierId" element={<PrivateRoute roles={['etudiant', 'admin', 'responsable', 'directeur', 'comptable', 'agent_admin']}><FactureView /></PrivateRoute>} />

        {/* Lettre */}
        <Route path="/lettre/:dossierId" element={<PrivateRoute roles={['etudiant', 'admin', 'responsable', 'agent_admin', 'comptable', 'directeur']}><LettrePreinscription /></PrivateRoute>} />
        <Route path="/attestation/:dossierId" element={<PrivateRoute roles={['etudiant', 'admin', 'responsable', 'agent_admin', 'comptable', 'directeur']}><AttestationPreinscription /></PrivateRoute>} />
        <Route path="/lettre-demande/:demandeId" element={<PrivateRoute roles={['etudiant']}><LettreDemandePreinscription /></PrivateRoute>} />

        {/* Accueil établissement (staff + étudiants : catalogue sans tarifs pour les étudiants) */}
        <Route path="/mon-etablissement" element={
          <PrivateRoute roles={['responsable', 'agent_admin', 'comptable', 'directeur', 'etudiant']}>
            <EtablissementHome />
          </PrivateRoute>
        } />
        <Route path="/mon-etablissement/factures" element={
          <PrivateRoute roles={['responsable', 'agent_admin', 'comptable', 'directeur']}>
            <StaffFacturesEtab />
          </PrivateRoute>
        } />
        <Route path="/mon-etablissement/acceptes-par-formation" element={
          <PrivateRoute roles={['responsable', 'agent_admin', 'comptable', 'directeur']}>
            <StaffAcceptesParFormation />
          </PrivateRoute>
        } />

        {/* Responsable */}
        <Route path="/responsable" element={<PrivateRoute roles={['responsable', 'admin']}><ResponsableDashboard /></PrivateRoute>} />
        <Route path="/responsable/dossier/:id" element={<PrivateRoute roles={['responsable', 'admin']}><ResponsableDossier /></PrivateRoute>} />
        <Route path="/responsable/gestion-etablissement" element={
          <PrivateRoute roles={['responsable', 'directeur']}>
            <ResponsableGestionEtab />
          </PrivateRoute>
        } />
        <Route path="/responsable/demandes-proforma" element={<PrivateRoute roles={['responsable', 'admin']}><ResponsableDemandesProforma /></PrivateRoute>} />

        {/* Agent admin */}
        <Route path="/agent-admin" element={<PrivateRoute roles={['agent_admin', 'admin']}><AgentAdminDashboard /></PrivateRoute>} />
        <Route path="/agent-admin/dossier/:id" element={<PrivateRoute roles={['agent_admin', 'admin']}><AgentAdminDossier /></PrivateRoute>} />

        {/* Comptable */}
        <Route path="/comptable" element={<PrivateRoute roles={['comptable', 'admin']}><ComptableDashboard /></PrivateRoute>} />

        {/* Directeur */}
        <Route path="/directeur" element={<PrivateRoute roles={['directeur', 'admin']}><DirecteurDashboard /></PrivateRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<PrivateRoute roles={['admin']}><AdminDashboard /></PrivateRoute>} />
        <Route path="/admin/dossier/:id" element={<PrivateRoute roles={['admin']}><AdminDossier /></PrivateRoute>} />
        <Route path="/admin/utilisateurs" element={<PrivateRoute roles={['admin']}><AdminUsers /></PrivateRoute>} />
        <Route path="/admin/etablissements" element={<PrivateRoute roles={['admin']}><AdminEtablissements /></PrivateRoute>} />
        <Route path="/admin/etablissements/:id" element={<PrivateRoute roles={['admin']}><AdminEtablissementDetail /></PrivateRoute>} />
        <Route path="/admin/proforma" element={<PrivateRoute roles={['admin']}><AdminProforma /></PrivateRoute>} />
        <Route path="/admin/audit-logs" element={<PrivateRoute roles={['admin']}><AdminAuditLogs /></PrivateRoute>} />
        <Route path="/admin/security-events" element={<PrivateRoute roles={['admin']}><AdminSecurityEvents /></PrivateRoute>} />
        <Route path="/admin/maintenance" element={<PrivateRoute roles={['admin']}><AdminMaintenance /></PrivateRoute>} />
        <Route path="/admin/runtime-monitoring" element={<PrivateRoute roles={['admin']}><AdminRuntimeMonitoring /></PrivateRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
