import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import StatutBadge from '../../components/StatutBadge'
import TabConditionsAdmissionEtab from '../../components/TabConditionsAdmissionEtab'
import { useAuth } from '../../context/AuthContext'
import { DashboardPage, DashboardHero, Panel, DashboardSpinner } from '../../components/dashboard/DashboardChrome'

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0)

export default function DirecteurDashboard() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const conditionsAnchorRef = useRef(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/directeur/dashboard')
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (searchParams.get('tab') !== 'conditions') return
    const t = setTimeout(() => {
      conditionsAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
    return () => clearTimeout(t)
  }, [searchParams])

  if (loading) {
    return (
      <DashboardPage>
        <DashboardHero eyebrow="Direction" title="Chargement du tableau de bord…" subtitle="Récupération des indicateurs en cours." />
        <DashboardSpinner className="py-24" />
      </DashboardPage>
    )
  }

  return (
    <DashboardPage>
      {stats?.etablissement ? (
        <DashboardHero
          eyebrow="Supervision — Direction"
          title={stats.etablissement.nom}
          subtitle="Vue d’ensemble de votre établissement : dossiers, formations et dynamique des préinscriptions."
        />
      ) : (
        <DashboardHero
          eyebrow="Supervision"
          title="Direction — Vue d’ensemble"
          subtitle="Indicateurs clés globaux de la plateforme."
        />
      )}

        {stats?.etablissement?.logo_url && (
          <div className="-mt-4 mb-8 flex justify-center sm:justify-start">
            <img src={stats.etablissement.logo_url} alt="" className="h-14 w-14 rounded-2xl border border-white/80 bg-white object-contain p-1 shadow-lg shadow-slate-200/50" />
          </div>
        )}

        {stats && (
          <>
            <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { label: 'Total dossiers', value: fmt(stats.total_dossiers), icon: '📂', color: 'from-blue-700 via-indigo-700 to-indigo-900', sub: 'préinscriptions soumises' },
                { label: 'Acceptés', value: fmt(stats.acceptes), icon: '✅', color: 'from-emerald-600 to-teal-800', sub: `taux : ${stats.taux_acceptance}%` },
                { label: 'Formations actives', value: fmt(stats.total_formations ?? stats.refuses), icon: stats.total_formations !== undefined ? '🎓' : '❌', color: stats.total_formations !== undefined ? 'from-teal-500 to-cyan-800' : 'from-red-500 to-rose-800', sub: stats.total_formations !== undefined ? 'de votre catalogue' : `${stats.en_attente} en attente` },
                { label: 'Étudiants inscrits', value: fmt(stats.total_etudiants), icon: '👥', color: 'from-violet-600 to-purple-900', sub: 'comptes créés' },
              ].map((s, i) => (
                <div
                  key={i}
                  className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${s.color} p-6 text-white shadow-xl shadow-slate-400/25 ring-1 ring-white/20 transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl`}
                >
                  <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" aria-hidden />
                  <div className="relative text-3xl drop-shadow-sm">{s.icon}</div>
                  <p className="relative mt-3 text-3xl font-black tabular-nums tracking-tight">{s.value}</p>
                  <p className="relative mt-1 text-sm font-bold opacity-95">{s.label}</p>
                  <p className="relative mt-1 text-xs opacity-75">{s.sub}</p>
                </div>
              ))}
            </div>

            <div ref={conditionsAnchorRef} id="conditions-admission-directeur" className="mb-10 scroll-mt-24">
              <Panel
                title="Conditions d’admission (candidats — proforma)"
                meta={
                  <Link
                    to="/responsable/gestion-etablissement?tab=conditions"
                    className="text-xs font-semibold text-blue-700 hover:underline"
                  >
                    Gestion filières & formations →
                  </Link>
                }
                bodyClassName="p-6"
              >
                <p className="mb-6 text-sm text-slate-600">
                  Comme pour le responsable pédagogique : plusieurs blocs de conditions peuvent être publiés ; le champ
                  d’un nouveau bloc est vidé après chaque ajout validé. Affichage aux candidats sur la demande de facture
                  proforma après le choix de votre établissement.
                </p>
                {user?.etablissement_id ? (
                  <TabConditionsAdmissionEtab
                    etabId={user.etablissement_id}
                    etabNom={user.etablissement_nom || stats?.etablissement?.nom}
                  />
                ) : (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Aucun établissement n’est rattaché à votre compte.
                  </p>
                )}
              </Panel>
            </div>

            <Panel title="Taux d'acceptation global" bodyClassName="p-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="h-5 flex-1 overflow-hidden rounded-full bg-slate-200 shadow-inner">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm transition-all" style={{ width: `${stats.taux_acceptance}%` }} />
                </div>
                <span className="text-3xl font-black text-emerald-600 tabular-nums">{stats.taux_acceptance}%</span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 text-center text-sm sm:grid-cols-4">
                {[
                  { label: 'En attente', value: stats.en_attente, color: 'text-amber-600', bg: 'from-amber-50 to-orange-50' },
                  { label: 'En cours', value: stats.en_cours, color: 'text-blue-600', bg: 'from-blue-50 to-indigo-50' },
                  { label: 'Acceptés', value: stats.acceptes, color: 'text-emerald-600', bg: 'from-emerald-50 to-teal-50' },
                  { label: 'Refusés', value: stats.refuses, color: 'text-red-600', bg: 'from-red-50 to-rose-50' },
                ].map((s, i) => (
                  <div key={i} className={`rounded-2xl bg-gradient-to-br ${s.bg} p-4 ring-1 ring-slate-100/80`}>
                    <p className={`text-2xl font-black tabular-nums ${s.color}`}>{s.value}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <div className="mb-8 grid gap-6 lg:grid-cols-2">
              <Panel title="Répartition par formation" bodyClassName="p-6">
                <div className="space-y-4">
                  {stats.par_formation?.map((f, i) => (
                    <div key={i}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{f.titre}</p>
                          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${f.type === 'en_ligne' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {f.type === 'en_ligne' ? 'FAD' : 'Présentiel'}
                          </span>
                        </div>
                        <div className="ml-3 shrink-0 text-right">
                          <span className="text-sm font-black text-slate-800">{f.total}</span>
                          <span className="ml-1 text-xs font-semibold text-emerald-600">({f.acceptes} acc.)</span>
                        </div>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 shadow-inner">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 shadow-sm" style={{ width: `${stats.total_dossiers > 0 ? (f.total / stats.total_dossiers) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Activité globale" bodyClassName="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm">
                    <div>
                      <p className="font-bold text-blue-950">Demandes proforma publiques</p>
                      <p className="text-sm text-blue-700/90">Demandes proforma (candidats)</p>
                    </div>
                    <p className="text-3xl font-black text-blue-700 tabular-nums">{fmt(stats.demandes_proforma)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/90 p-4 text-center shadow-sm">
                      <p className="text-2xl font-black text-slate-800">{fmt(stats.en_attente)}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">Dossiers en attente</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/90 p-4 text-center shadow-sm">
                      <p className="text-2xl font-black text-slate-800">{fmt(stats.en_cours)}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">En cours d&apos;examen</p>
                    </div>
                  </div>
                </div>
              </Panel>
            </div>

            {stats.recents?.length > 0 && (
              <Panel title="Activités récentes" bodyClassName="p-6">
                <div className="space-y-2">
                  {stats.recents.map((d, i) => (
                    <div key={i} className="flex items-center justify-between rounded-2xl border border-slate-100/80 bg-slate-50/50 p-3 transition-colors hover:bg-white hover:shadow-md">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-sm font-bold text-white shadow-md">
                          {(d.prenom?.[0] || '?')}
                          {(d.nom?.[0] || '')}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {d.prenom} {d.nom}
                          </p>
                          <p className="text-xs text-slate-400">
                            {d.formation} · {new Date(d.updated_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <StatutBadge statut={d.statut} />
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </>
        )}
    </DashboardPage>
  )
}
