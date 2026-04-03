import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import StatutBadge from '../components/StatutBadge'
import PreinscriptionConditionsBlock from '../components/PreinscriptionConditionsBlock'
import { DashboardPage, DashboardHero, Panel, DashboardSpinner } from '../components/dashboard/DashboardChrome'
import { isDossierAcceptePourDocuments } from '../utils/dossierStatut'

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n)

const STATUT_CONFIG = {
  en_attente: { color: 'bg-amber-50 border-amber-200', icon: '⏳', msg: 'Votre dossier est en file d\'attente. Nous vous notifierons dès qu\'il sera pris en charge.' },
  en_cours: { color: 'bg-blue-50 border-blue-200', icon: '🔍', msg: 'Votre dossier est en cours d\'examen par notre équipe pédagogique.' },
  accepte: { color: 'bg-emerald-50 border-emerald-200', icon: '🎉', msg: 'Félicitations ! Votre préinscription est acceptée. Procédez au paiement pour confirmer votre place.' },
  refuse: { color: 'bg-red-50 border-red-200', icon: '❌', msg: 'Votre dossier n\'a pas été retenu. Consultez le commentaire de l\'administration.' },
}

function EtudiantDossierPanel({ dossier, documents, formation, facture }) {
  return (
    <div className="space-y-6 rounded-3xl border border-slate-200/80 bg-slate-50/30 p-4 sm:p-6">
      <div className={`rounded-3xl border-2 p-6 shadow-lg shadow-slate-200/30 ${STATUT_CONFIG[dossier.statut]?.color || 'border-slate-200 bg-slate-50'}`}>
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-3xl shadow-inner">{STATUT_CONFIG[dossier.statut]?.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h2 className="text-lg font-bold text-gray-900">Dossier N° {dossier.numero_dossier}</h2>
              <StatutBadge statut={dossier.statut} />
            </div>
            {formation?.titre && (
              <p className="text-sm font-semibold text-blue-900 mb-1">{formation.titre}</p>
            )}
            <p className="text-gray-600 text-sm mb-2">{STATUT_CONFIG[dossier.statut]?.msg}</p>
            {dossier.commentaire_admin && (
              <div className="mt-3 p-3 bg-white/70 rounded-xl border border-white">
                <p className="text-xs font-bold text-gray-500 mb-1">MESSAGE DE L&apos;ADMINISTRATION</p>
                <p className="text-sm text-gray-700">{dossier.commentaire_admin}</p>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2">Soumis le {new Date(dossier.created_at).toLocaleDateString('fr-FR', { dateStyle: 'long' })}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {formation && (
          <div className="lg:col-span-2 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xl shadow-slate-200/30 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-lg text-white shadow-md">🎓</div>
              <h3 className="font-bold text-slate-900">Formation concernée</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold text-gray-900">{formation.titre}</h4>
                  <span className={`inline-block mt-1 text-xs font-semibold px-2.5 py-1 rounded-full ${formation.type === 'en_ligne' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                    {formation.type === 'en_ligne' ? '🌐 En ligne' : `🏫 Présentiel · ${formation.ville}`}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                Les montants (frais et scolarité) figurent sur votre facture proforma une fois le dossier instruit.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 text-sm">
                {[
                  ['Durée', formation.duree],
                  ['Niveau de formation', formation.niveau || '—'],
                  ['Niveau requis (diplôme)', formation.niveau_requis],
                  ['Année', dossier.annee_academique],
                ].map(([l, v]) => (
                  <div key={l}><span className="text-gray-400 text-xs uppercase">{l}</span><p className="font-semibold text-gray-800">{v}</p></div>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <PreinscriptionConditionsBlock
                formationNiveau={dossier.formation_niveau_cible || formation?.niveau}
                profileKey={dossier.document_rule_profile}
              />
            </div>
          </div>
        )}

        {dossier && !isDossierAcceptePourDocuments(dossier.statut) && (
          <div className="lg:col-span-3 overflow-hidden rounded-3xl border border-amber-200/80 bg-amber-50/40 p-5 shadow-sm">
            <p className="text-sm text-amber-950/90">
              <span className="font-bold">Documents officiels :</span> la lettre et l&apos;attestation de préinscription ne sont téléchargeables qu&apos;après{' '}
              <strong>validation</strong> de cette candidature (statut « accepté »).
            </p>
          </div>
        )}

        {isDossierAcceptePourDocuments(dossier.statut) && (
          <div className="lg:col-span-3 overflow-hidden rounded-3xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-teal-50/50 p-6 shadow-lg shadow-emerald-100/40">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="flex items-center gap-2 font-bold text-emerald-900">📜 Documents officiels disponibles</h3>
                <p className="mt-1 text-sm text-emerald-800/90">
                  Cette préinscription est acceptée : lettre et attestation pour ce dossier.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 shrink-0">
                <Link
                  to={`/lettre/${dossier.id}`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:from-emerald-700 hover:to-teal-700 hover:shadow-lg"
                >
                  📄 Lettre de préinscription
                </Link>
                <Link
                  to={`/attestation/${dossier.id}`}
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-indigo-600 bg-white px-5 py-2.5 text-sm font-bold text-indigo-700 shadow-sm transition-all hover:bg-indigo-50"
                >
                  🏅 Attestation de préinscription
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xl shadow-slate-200/30 backdrop-blur-sm lg:col-span-1">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-lg shadow-md">🧾</div>
            <h3 className="font-bold text-slate-900">Facture Proforma</h3>
          </div>
          {facture ? (
            <div className="flex-1 flex flex-col">
              <div className="mb-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-inner">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-emerald-600">Facture émise</p>
                <p className="font-mono font-bold text-slate-800">{facture.numero}</p>
                <p className="mt-2 text-2xl font-black text-blue-700 tabular-nums">
                  {fmt(facture.montant_ttc)} <span className="text-sm font-semibold text-slate-500">FCFA</span>
                </p>
              </div>
              <Link to={`/facture/${dossier.id}`} className="btn-primary mt-auto flex w-full items-center justify-center gap-2 text-center text-sm shadow-lg shadow-blue-600/20">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                Voir & Imprimer la facture
              </Link>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
              <p className="text-gray-400 text-sm mb-4">Aucune facture générée</p>
              <Link to={`/facture/${dossier.id}`} className="btn-outline text-sm w-full text-center">
                Générer ma facture proforma
              </Link>
            </div>
          )}
        </div>
      </div>

      {documents && documents.length > 0 && (
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xl shadow-slate-200/30 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg shadow-inner">📎</div>
            <h3 className="font-bold text-slate-900">Documents soumis</h3>
            <span className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">{documents.length} fichier(s)</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 transition-colors hover:bg-white hover:shadow-md">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg shadow-sm">📄</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-700 capitalize">{doc.type_document.replace('_', ' ')}</p>
                  <p className="text-xs text-gray-400 truncate">{doc.nom_fichier}</p>
                </div>
                <span className="text-emerald-500 text-lg">✓</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function EtudiantDashboard() {
  const { user } = useAuth()
  const [dossierItems, setDossierItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [demandesPro, setDemandesPro] = useState([])
  const [notifications, setNotifications] = useState([])
  const [unreadNotif, setUnreadNotif] = useState(0)

  useEffect(() => {
    axios
      .get('/api/etudiant/dossiers')
      .then(({ data }) => setDossierItems(Array.isArray(data?.dossiers) ? data.dossiers : []))
      .catch(() => setDossierItems([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    axios.get('/api/etudiant/demandes-proforma')
      .then(({ data }) => setDemandesPro(Array.isArray(data) ? data : []))
      .catch(() => setDemandesPro([]))
  }, [])

  useEffect(() => {
    axios.get('/api/etudiant/notifications', { params: { limit: 8 } })
      .then(({ data }) => {
        setNotifications(Array.isArray(data.items) ? data.items : [])
        setUnreadNotif(Number(data.unread || 0))
      })
      .catch(() => {
        setNotifications([])
        setUnreadNotif(0)
      })
  }, [])

  const demandesAcceptees = demandesPro.filter((d) => d.statut === 'acceptee')
  const hasDossiers = dossierItems.length > 0

  return (
    <DashboardPage maxWidthClass="max-w-5xl">
      <DashboardHero
        eyebrow="Espace étudiant"
        title={`Bonjour, ${user.prenom} ${user.nom}`}
        subtitle="Suivez chaque candidature (plusieurs formations possibles pour le même établissement), vos notifications et vos documents."
        actions={
          !loading ? (
            <Link to="/preinscription" className="btn-primary inline-flex items-center gap-2 shadow-lg shadow-blue-600/25">
              {hasDossiers ? '+ Candidater à une autre formation' : '+ Nouvelle préinscription'}
            </Link>
          ) : null
        }
      />

      {notifications.length > 0 && (
        <Panel
          className="mb-8"
          title="Notifications récentes"
          meta={
            unreadNotif > 0 ? (
              <button
                type="button"
                className="rounded-lg border border-blue-200/80 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
                onClick={async () => {
                  try {
                    await axios.post('/api/etudiant/notifications/read-all')
                    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })))
                    setUnreadNotif(0)
                  } catch { /* ignore */ }
                }}
              >
                Marquer tout comme lu ({unreadNotif})
              </button>
            ) : null
          }
          bodyClassName="p-6"
        >
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`rounded-2xl border px-4 py-3 transition-shadow ${n.read_at ? 'border-slate-100 bg-slate-50/80' : 'border-blue-200/80 bg-gradient-to-r from-blue-50 to-indigo-50/50 shadow-sm'}`}
              >
                <p className="text-sm font-bold text-slate-800">{n.title}</p>
                <p className="text-sm text-slate-600">{n.message}</p>
                <p className="mt-1 text-xs text-slate-400">{new Date(n.created_at).toLocaleString('fr-FR')}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {loading ? (
        <DashboardSpinner className="py-24" />
      ) : !hasDossiers ? (
        <div className="space-y-6">
          {demandesAcceptees.length > 0 && (
            <div className="mb-6 overflow-hidden rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/40 p-6 shadow-lg shadow-emerald-100/50 backdrop-blur-sm">
              <h2 className="mb-3 font-bold text-emerald-900">📜 Préinscriptions acceptées (demande en ligne)</h2>
              <p className="text-sm text-emerald-800 mb-4">
                Vous aviez demandé une facture proforma avec cette adresse e-mail : lettre et facture à jour sont disponibles ci-dessous.
              </p>
              <ul className="space-y-3">
                {demandesAcceptees.map((d) => (
                  <li key={d.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white rounded-xl border border-emerald-100 p-4">
                    <div>
                      <p className="font-semibold text-gray-900">{d.formation_titre}</p>
                      <p className="text-xs text-gray-500 font-mono">{d.reference}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/lettre-demande/${d.id}`}
                        className="text-sm font-semibold bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
                      >
                        Lettre de préinscription
                      </Link>
                      <Link
                        to={`/facture-publique/${d.reference}`}
                        className="text-sm font-semibold border border-blue-300 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-50"
                      >
                        Facture proforma
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-3xl border border-slate-200/80 bg-white/90 px-6 py-16 text-center shadow-xl shadow-slate-200/40 backdrop-blur-md">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-blue-50 text-5xl shadow-inner">📂</div>
            <h2 className="mb-2 text-2xl font-black text-slate-800">Aucun dossier soumis</h2>
            <p className="mx-auto mb-8 max-w-md text-slate-500">
              Créez votre compte avec la vérification anti-bot, puis déposez un ou plusieurs dossiers (une candidature par formation).
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/mon-etablissement" className="btn-outline inline-flex items-center gap-2 px-6 py-3 text-base shadow-sm">
                Voir les filières et formations
              </Link>
              <Link to="/preinscription" className="btn-primary inline-flex items-center gap-2 px-8 py-3 text-base shadow-lg shadow-blue-600/20">
                Démarrer une préinscription →
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {demandesAcceptees.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/40 p-6 shadow-lg shadow-emerald-100/50 backdrop-blur-sm">
              <h2 className="mb-3 font-bold text-emerald-900">📜 Demandes proforma acceptées</h2>
              <ul className="space-y-3">
                {demandesAcceptees.map((d) => (
                  <li key={d.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white rounded-xl border border-emerald-100 p-4">
                    <div>
                      <p className="font-semibold text-gray-900">{d.formation_titre}</p>
                      <p className="text-xs text-gray-500 font-mono">{d.reference}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/lettre-demande/${d.id}`} className="text-sm font-semibold bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
                        Lettre
                      </Link>
                      <Link to={`/facture-publique/${d.reference}`} className="text-sm font-semibold border border-blue-300 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-50">
                        Facture proforma
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h2 className="text-lg font-black text-slate-800 mb-4">Vos candidatures ({dossierItems.length})</h2>
            <div className="space-y-10">
              {dossierItems.map(({ dossier, documents, formation, facture }) => (
                <EtudiantDossierPanel
                  key={dossier.id}
                  dossier={dossier}
                  documents={documents}
                  formation={formation}
                  facture={facture}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardPage>
  )
}
