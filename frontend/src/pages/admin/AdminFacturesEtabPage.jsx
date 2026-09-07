import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { DashboardPage, DashboardHero } from '../../components/dashboard/DashboardChrome'
import { TabFacturesEtab } from './TabFacturesEtab'
import DemandesFacturePanel from '../../components/DemandesFacturePanel'
import CreerProformaModal from '../../components/CreerProformaModal'

export default function AdminFacturesEtabPage() {
  const [etablissements, setEtablissements] = useState([])
  const [etabId, setEtabId] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const section = searchParams.get('section') === 'creation' ? 'creation' : 'demandes'
  const [creerOpen, setCreerOpen] = useState(false)

  useEffect(() => {
    axios
      .get('/api/etablissements')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : []
        setEtablissements(list.filter((e) => e.actif !== false))
      })
      .catch(() => toast.error('Impossible de charger les établissements.'))
  }, [])

  const setSection = (id) => {
    const next = new URLSearchParams(searchParams)
    if (id === 'creation') next.set('section', 'creation')
    else next.delete('section')
    setSearchParams(next, { replace: true })
  }

  return (
    <DashboardPage>
      <Link
        to="/admin"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-indigo-600"
      >
        ← Administration
      </Link>

      <DashboardHero
        eyebrow="Comptabilité"
        title="Factures"
        subtitle="Demandes à traiter et création / historique des factures."
      />

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
              section === t.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {section === 'demandes' ? (
        <DemandesFacturePanel embedded apiBase="/api/admin" />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-xl flex-1">
              <label htmlFor="admin-factures-etab" className="mb-2 block text-sm font-bold text-slate-700">
                Établissement
              </label>
              <select
                id="admin-factures-etab"
                className="input-field w-full rounded-xl border-slate-200 bg-white"
                value={etabId}
                onChange={(e) => setEtabId(e.target.value)}
              >
                <option value="">— Choisir un établissement —</option>
                {etablissements.map((e) => (
                  <option key={e.id} value={String(e.id)}>
                    {e.nom}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn-primary" onClick={() => setCreerOpen(true)}>
              Créer une facture
            </button>
          </div>

          {etabId ? (
            <div className="card overflow-hidden p-6">
              <TabFacturesEtab
                etabId={parseInt(etabId, 10)}
                etabNom={etablissements.find((e) => String(e.id) === String(etabId))?.nom}
              />
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
              Sélectionnez un établissement pour l’historique des factures.
            </p>
          )}
        </>
      )}

      <CreerProformaModal open={creerOpen} onClose={() => setCreerOpen(false)} />
    </DashboardPage>
  )
}

