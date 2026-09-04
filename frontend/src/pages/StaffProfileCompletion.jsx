import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRoleHome } from '../utils/smartBack'

/** Ancien écran d’activation bloquant — redirection vers l’espace métier. */
export default function StaffProfileCompletion() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/connexion" replace />
  if (user.must_change_password) {
    return <Navigate to="/changer-mot-de-passe-obligatoire" replace />
  }
  return <Navigate to={getRoleHome(user.role)} replace />
}
