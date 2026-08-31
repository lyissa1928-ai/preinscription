import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import TabConditionsAdmissionEtab from '../components/TabConditionsAdmissionEtab'
import { DashboardPage, DashboardHero, Panel } from '../components/dashboard/DashboardChrome'
import CreerProformaModal from '../components/CreerProformaModal'

/** Vue Conditions d'admission (menu dédié, hors dashboard). */
function ConditionsView() {
  const [etablissements, setEtablissements] = useState([])
  const [etabId, setEtabId] = useState(null)

  useEffect(() => {
    axios
      .get('/api/etablissements')
      .then(({ data }) => setEtablissements((data || []).filter((e) => e.actif !== false)))
      .catch(() => {})
  }, [])

  return (
    <DashboardPage>
      <Link
        to="/admin"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"
      >
        ← Tableau de bord
      </Link>
      <DashboardHero
        eyebrow="Administration"
        title="Conditions d’admission"
        subtitle="Texte affiché aux candidats lors d’une demande de facture proforma."
      />
      <Panel title="Conditions par établissement" bodyClassName="p-6">
        {etablissements.length === 0 ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Aucun établissement actif. Créez-en un dans « Établissements ».
          </p>
        ) : (
          <>
            <label className="mb-2 block text-sm font-semibold text-slate-800">Établissement</label>
            <select
              className="input-field mb-6 max-w-xl"
              value={etabId ?? ''}
              onChange={(e) => setEtabId(e.target.value === '' ? null : Number(e.target.value))}
            >
              <option value="">— Choisir un établissement —</option>
              {etablissements.map((e) => (
                <option key={e.id} value={e.id}>{e.nom}</option>
              ))}
            </select>
            {etabId != null && (
              <TabConditionsAdmissionEtab
                etabId={etabId}
                etabNom={etablissements.find((e) => e.id === etabId)?.nom}
              />
            )}
          </>
        )}
      </Panel>
    </DashboardPage>
  )
}

/**
 * Tableau de bord Administrateur — volontairement minimal.
 * Vision rapide : 3 chiffres + ce qui attend une décision + 4 actions.
 * Tout le reste reste accessible via le menu latéral.
 */
export default function AdminDashboard() {
  const [searchParams] = useSearchParams()
  const [stats, setStats] = useState(null)
  const [creerOpen, setCreerOpen] = useState(false)

  useEffect(() => {
    axios
      .get('/api/admin/statistiques-globales')
      .then(({ data }) => setStats(data))
      .catch(() => {})
  }, [])

  if (searchParams.get('tab') === 'conditions') return <ConditionsView />

  const dossiersEnAttente = stats?.dossiers?.en_attente ?? 0
  const proformaEnAttente = stats?.demandes_proforma_en_attente ?? 0

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Administration"
        title="Tableau de bord"
        subtitle="Vue d’ensemble — les détails se traitent dans chaque module."
        actions={
          <button type="button" onClick={() => setCreerOpen(true)} className="btn-primary text-sm">
            Nouvelle facture proforma
          </button>
        }
      />

      <CreerProformaModal open={creerOpen} onClose={() => setCreerOpen(false)} />

      {/* 3 indicateurs seulement */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          to="/admin/dossiers?statut=en_attente"
          className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm transition hover:border-amber-300"
        >
          <p className="text-3xl font-black tabular-nums text-amber-600">{dossiersEnAttente}</p>
          <p className="mt-1 text-sm font-medium text-slate-600">Dossiers en attente</p>
        </Link>
        <Link
          to="/admin/proforma"
          className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm transition hover:border-violet-300"
        >
          <p className="text-3xl font-black tabular-nums text-violet-700">{proformaEnAttente}</p>
          <p className="mt-1 text-sm font-medium text-slate-600">Proformas à traiter</p>
        </Link>
        <Link
          to="/admin/utilisateurs"
          className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm transition hover:border-slate-400"
        >
          <p className="text-3xl font-black tabular-nums text-slate-900">{stats?.utilisateurs?.etudiants ?? '—'}</p>
          <p className="mt-1 text-sm font-medium text-slate-600">Étudiants</p>
        </Link>
      </div>

      {/* Ce qui demande une action */}
      {(dossiersEnAttente > 0 || proformaEnAttente > 0) && (
        <Panel title="À traiter" bodyClassName="p-5" className="mb-8">
          <ul className="space-y-2">
            {dossiersEnAttente > 0 && (
              <li>
                <Link
                  to="/admin/dossiers?statut=en_attente"
                  className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 hover:bg-amber-100"
                >
                  <span>{dossiersEnAttente} dossier(s) en attente</span>
                  <span aria-hidden>→</span>
                </Link>
              </li>
            )}
            {proformaEnAttente > 0 && (
              <li>
                <Link
                  to="/admin/proforma"
                  className="flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-950 hover:bg-violet-100"
                >
                  <span>{proformaEnAttente} demande(s) proforma sans décision</span>
                  <span aria-hidden>→</span>
                </Link>
              </li>
            )}
          </ul>
        </Panel>
      )}

      {/* 4 accès essentiels */}
      <Panel title="Accès rapides" bodyClassName="p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { label: 'Dossiers', to: '/admin/dossiers', desc: 'Préinscriptions' },
            { label: 'Proformas', to: '/admin/proforma', desc: 'Factures & décisions' },
            { label: 'Établissements', to: '/admin/etablissements', desc: 'Fiches & formations' },
            { label: 'Utilisateurs', to: '/admin/utilisateurs', desc: 'Comptes & rôles' },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-indigo-300 hover:bg-indigo-50/40"
            >
              <p className="text-sm font-bold text-slate-800">{l.label}</p>
              <p className="text-xs text-slate-500">{l.desc}</p>
            </Link>
          ))}
        </div>
      </Panel>
    </DashboardPage>
  )
}
