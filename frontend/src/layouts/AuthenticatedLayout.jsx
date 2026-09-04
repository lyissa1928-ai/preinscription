import { Navigate, Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'

export default function AuthenticatedLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="app-shell-bg relative flex h-screen items-center justify-center">
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 rounded-full border-[3px] border-indigo-200/80" />
            <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-indigo-600 border-r-violet-500" />
          </div>
          <p className="text-sm font-semibold text-slate-500">Chargement…</p>
        </div>
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
    <div className="app-shell-bg relative flex h-screen overflow-hidden">
      <Sidebar />
      {/* Décalage sur mobile pour la topbar fixe */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto pt-14 scrollbar-thin md:pt-0">
        <Outlet />
      </div>
    </div>
  )
}
