import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { TabFacturesEtab } from './admin/TabFacturesEtab'
import CreerProformaModal from '../components/CreerProformaModal'
import DemandesFacturePanel from '../components/DemandesFacturePanel'
import { DashboardPage } from '../components/dashboard/DashboardChrome'

/**
 * Page Factures unifiée — pour tous les rôles staff :
 * 1) Demandes à traiter
 * 2) Création / historique des factures
 */
export default function StaffFacturesEtab() {
  const { user } = useAuth()
  const etabId = user?.etablissement_id
  const [searchParams, setSearchParams] = useSearchParams()
  const section = searchParams.get('section') === 'creation' ? 'creation' : 'demandes'
  const [creerOpen, setCreerOpen] = useState(false)

  const setSection = (id) => {
    const next = new URLSearchParams(searchParams)
    if (id === 'creation') next.set('section', 'creation')
    else next.delete('section')
    setSearchParams(next, { replace: true })
  }

  if (!etabId) {
    return (
      <DashboardPage>
        <p className="text-gray-600">Aucun établissement associé.</p>
      </DashboardPage>
    )
  }

  return (
    <DashboardPage maxWidthClass="max-w-7xl">
      <Link to="/mon-etablissement" className="text-sm text-slate-500 hover:text-orange-700">
        ← Mon établissement
      </Link>
      <h1 className="mt-1 mb-1 text-xl font-black text-slate-900">Factures</h1>
      <p className="mb-4 text-sm text-slate-500">
        Traitez les demandes et créez de nouvelles factures au même endroit.
      </p>

      <div className="mb-5 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 text-sm font-semibold">
        {[
          { id: 'demandes', label: 'Demandes à traiter' },
          { id: 'creation', label: 'Créer / historique' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSection(t.id)}
            className={`rounded-lg px-4 py-2.5 ${
              section === t.id ? 'bg-orange-500 text-white shadow' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {section === 'demandes' ? (
        <DemandesFacturePanel embedded apiBase="/api/responsable" />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
            <div>
              <p className="font-bold text-orange-950">Nouvelle facture</p>
              <p className="text-sm text-orange-900/80">
                Guichet : facture proforma ou définitive (avec ou sans cachet à l’acceptation).
              </p>
            </div>
            <button type="button" className="btn-primary" onClick={() => setCreerOpen(true)}>
              Créer une facture
            </button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-3 text-base font-bold text-slate-900">Factures émises</h2>
            <TabFacturesEtab etabId={etabId} etabNom={user?.etablissement_nom} />
          </div>
        </div>
      )}

      <CreerProformaModal open={creerOpen} onClose={() => setCreerOpen(false)} />
    </DashboardPage>
  )
}
