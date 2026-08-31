import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { DashboardPage, DashboardHero } from '../../components/dashboard/DashboardChrome'
import { TabFacturesEtab } from './TabFacturesEtab'

export default function AdminFacturesEtabPage() {
  const [etablissements, setEtablissements] = useState([])
  const [etabId, setEtabId] = useState('')

  useEffect(() => {
    axios
      .get('/api/etablissements')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : []
        setEtablissements(list.filter((e) => e.actif !== false))
      })
      .catch(() => toast.error('Impossible de charger les établissements.'))
  }, [])

  return (
    <DashboardPage>
      <Link
        to="/admin"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-indigo-600"
      >
        <span aria-hidden className="text-lg leading-none">
          ←
        </span>
        Administration
      </Link>

      <DashboardHero
        eyebrow="Comptabilité"
        title="Factures par établissement"
        subtitle="Liste paginée (10), PDF individuel ou sélection, suppression."
      />

      <div className="mb-6 max-w-xl">
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

      {etabId ? (
        <div className="card overflow-hidden p-6">
          <TabFacturesEtab
            etabId={parseInt(etabId, 10)}
            etabNom={etablissements.find((e) => String(e.id) === String(etabId))?.nom}
          />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
          Sélectionnez un établissement.
        </p>
      )}
    </DashboardPage>
  )
}
