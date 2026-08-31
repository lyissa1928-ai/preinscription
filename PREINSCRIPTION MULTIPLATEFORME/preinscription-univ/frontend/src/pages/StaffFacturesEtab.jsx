import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { TabFacturesEtab } from './admin/TabFacturesEtab'

export default function StaffFacturesEtab() {
  const { user } = useAuth()
  const etabId = user?.etablissement_id

  if (!etabId) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-gray-600">Aucun établissement associé.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-5">
      <Link to="/mon-etablissement" className="text-sm text-slate-500 hover:text-orange-700">
        ← Mon établissement
      </Link>
      <h1 className="mt-1 mb-4 text-xl font-black text-slate-900">Factures</h1>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <TabFacturesEtab etabId={etabId} etabNom={user?.etablissement_nom} />
      </div>
    </main>
  )
}
