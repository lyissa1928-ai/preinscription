import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { TabMembres } from './admin/AdminEtablissementDetail'

/** Équipe staff — réservé à l’administrateur établissement (ou admin plateforme). */
export default function StaffEtabEquipe() {
  const { user } = useAuth()
  const etabId = user?.etablissement_id
  const [etab, setEtab] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!etabId) return
    axios
      .get(`/api/etablissements/${etabId}`)
      .then(({ data }) => setEtab(data))
      .catch(() => toast.error('Impossible de charger l’établissement.'))
      .finally(() => setLoading(false))
  }, [etabId])

  if (!etabId) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-600">Aucun établissement associé à votre compte.</p>
      </main>
    )
  }

  if (loading || !etab) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-700 border-t-transparent" />
      </div>
    )
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] w-full bg-gradient-to-b from-slate-50 via-white to-slate-50/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-10 w-full">
        <Link to="/mon-etablissement" className="inline-flex text-sm font-medium text-slate-500 hover:text-blue-700 mb-6">
          ← Mon établissement
        </Link>
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Équipe — {etab.nom}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Créez et gérez les comptes staff de votre établissement. Toutes vos actions sont enregistrées dans le journal d’audit visible par l’administrateur plateforme.
          </p>
        </header>
        <div className="card overflow-hidden border-slate-200/80 shadow-md p-5 md:p-8 space-y-8">
          <TabMembres etabId={etab.id} membres={etab.membres || []} responsable_id={etab.responsable_id} />
        </div>
      </div>
    </main>
  )
}
