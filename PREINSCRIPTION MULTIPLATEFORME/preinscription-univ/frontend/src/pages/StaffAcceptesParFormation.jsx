import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { TabAcceptesParFormation } from './admin/TabAcceptesParFormation'

export default function StaffAcceptesParFormation() {
  const { user } = useAuth()
  const etabId = user?.etablissement_id

  if (!etabId) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-600">Aucun établissement associé.</p>
      </main>
    )
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <Link to="/mon-etablissement" className="text-sm text-gray-500 hover:text-blue-700">
          ← Mon établissement
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Étudiants acceptés par filière</h1>
      <p className="text-gray-500 text-sm mb-6">
        Vue synthétique par filière avec détail des formations : chaque acceptation de préinscription met à jour
        automatiquement la formation concernée.
      </p>
      <div className="card">
        <TabAcceptesParFormation etabId={etabId} />
      </div>
    </main>
  )
}
