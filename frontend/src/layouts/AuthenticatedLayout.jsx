import { Navigate, Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'

export default function AuthenticatedLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-700 border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/connexion" replace />
  }

  if (user.must_change_password) {
    return <Navigate to="/changer-mot-de-passe-obligatoire" replace />
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      {/* Décalage sur mobile pour la topbar fixe */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto md:pt-0 pt-14">
        <Outlet />
      </div>
    </div>
  )
}
