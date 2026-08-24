import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { TabFilieres, TabFormations } from '../admin/AdminEtablissementDetail'
import { TabFacturesEtab } from '../admin/TabFacturesEtab'
import { TabAcceptesParFormation } from '../admin/TabAcceptesParFormation'
import { FaBook, FaGraduationCap, FaCheckCircle, FaFileInvoice, FaClipboardList } from 'react-icons/fa'
import TabConditionsAdmissionEtab from '../../components/TabConditionsAdmissionEtab'

const TABS = [
  { id: 'filieres', label: 'Filières', Icon: FaBook },
  { id: 'formations', label: 'Formations', Icon: FaGraduationCap },
  { id: 'conditions', label: 'Conditions d’admission', Icon: FaClipboardList },
  { id: 'acceptes', label: 'Acceptés', Icon: FaCheckCircle },
  { id: 'factures', label: 'Factures', Icon: FaFileInvoice },
]

export default function ResponsableGestionEtab() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const etabId = user?.etablissement_id
  const [etab, setEtab] = useState(null)
  const [tab, setTab] = useState(() => (searchParams.get('tab') === 'conditions' ? 'conditions' : 'filieres'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (searchParams.get('tab') === 'conditions') setTab('conditions')
  }, [searchParams])

  const load = () => {
    if (!etabId) return
    setLoading(true)
    axios.get(`/api/etablissements/${etabId}`)
      .then(({ data }) => setEtab(data))
      .catch(() => toast.error('Impossible de charger l\'établissement.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [etabId])

  useEffect(() => {
    if (tab === 'formations' && etabId) load()
  }, [tab])

  const refreshFilieresOnly = async () => {
    if (!etabId) return
    try {
      const { data } = await axios.get(`/api/etablissements/${etabId}/filieres`)
      setEtab(prev => prev ? { ...prev, filieres: Array.isArray(data) ? data : prev.filieres } : prev)
    } catch {
      // no-op
    }
  }

  const refreshFormationsOnly = async () => {
    if (!etabId) return
    try {
      const { data } = await axios.get(`/api/etablissements/${etabId}/formations`)
      setEtab(prev => prev ? { ...prev, formations: Array.isArray(data) ? data : prev.formations } : prev)
    } catch {
      // no-op
    }
  }

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
        <Link to="/mon-etablissement" className="inline-flex text-sm font-medium text-slate-500 hover:text-blue-700 transition-colors mb-6">
          ← Mon établissement
        </Link>

        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
              {etab.logo_url ? (
                <img src={etab.logo_url} alt="" className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-xl font-black text-slate-400">{String(etab.nom || '?')[0]}</span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Filières & formations</h1>
              <p className="text-slate-500 text-sm truncate">
                {etab.nom} — modification limitée à votre établissement
              </p>
            </div>
          </div>
        </header>

        <div className="flex gap-1 p-1.5 rounded-2xl bg-slate-100/90 ring-1 ring-slate-200/80 overflow-x-auto mb-6">
          {TABS.map((t) => {
            const Icon = t.Icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-shrink-0 inline-flex items-center gap-2 text-sm font-semibold py-2.5 px-3 sm:px-4 rounded-xl transition-all ${
                  active ? 'bg-white text-blue-800 shadow-md ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? 'text-blue-600' : 'text-slate-400'}`} aria-hidden />
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="card overflow-hidden border-slate-200/80 shadow-md">
          <div className="p-5 md:p-6 lg:p-8">
        {tab === 'filieres' && (
          <TabFilieres
            etabId={etab.id}
            filieres={etab.filieres || []}
            onFiliereChange={list => setEtab(prev => ({ ...prev, filieres: list }))}
          />
        )}
        {tab === 'formations' && (
          <TabFormations
            etabId={etab.id}
            formations={etab.formations}
            filieres={etab.filieres || []}
            onRefreshFilieres={refreshFilieresOnly}
            onRefreshFormations={refreshFormationsOnly}
          />
        )}
        {tab === 'conditions' && (
          <TabConditionsAdmissionEtab etabId={etab.id} etabNom={etab.nom} />
        )}
        {tab === 'acceptes' && (
          <TabAcceptesParFormation etabId={etab.id} />
        )}
        {tab === 'factures' && (
          <TabFacturesEtab etabId={etab.id} />
        )}
          </div>
        </div>
      </div>
    </main>
  )
}
