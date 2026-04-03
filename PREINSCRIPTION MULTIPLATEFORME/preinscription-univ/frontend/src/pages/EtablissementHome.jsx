import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import PreinscriptionConditionsBlock from '../components/PreinscriptionConditionsBlock'
import { forfaitAnnuelFromFormation } from '../lib/formationTarifs'

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0)

const ROLE_LINKS = {
  responsable: { label: 'Traiter les dossiers',    path: '/responsable',  icon: '📋' },
  agent_admin:  { label: 'Contrôle administratif', path: '/agent-admin',   icon: '🗂️' },
  comptable:    { label: 'Finance & Facturation',   path: '/comptable',    icon: '💰' },
  directeur:    { label: 'Supervision générale',    path: '/directeur',    icon: '👁️' },
}

export default function EtablissementHome() {
  const { user } = useAuth()
  const [etab, setEtab] = useState(null)
  const [formations, setFormations] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filtreType, setFiltreType] = useState('all')
  const [filtreNiveau, setFiltreNiveau] = useState('all')

  const etabId = user?.etablissement_id

  useEffect(() => {
    if (!etabId) return
    Promise.all([
      axios.get(`/api/etablissements/${etabId}`),
      axios.get(`/api/formations?etablissement_id=${etabId}`),
      // Statistiques des demandes proforma de l'établissement
      user.role === 'responsable' || user.role === 'agent_admin' || user.role === 'comptable' || user.role === 'directeur'
        ? axios.get('/api/responsable/statistiques').catch(() => ({ data: null }))
        : Promise.resolve({ data: null })
    ]).then(([etabRes, formRes, statsRes]) => {
      setEtab(etabRes.data)
      setFormations(formRes.data)
      setStats(statsRes.data)
    }).catch(() => {})
      .finally(() => setLoading(false))
  }, [etabId])

  if (!etabId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-gray-600 font-semibold">Aucun établissement associé à votre compte.</p>
          <p className="text-gray-400 text-sm mt-1">Contactez l'administrateur principal.</p>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-700 border-t-transparent" />
    </div>
  )

  if (!etab) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-500">Établissement introuvable.</p>
    </div>
  )

  const primary   = etab.couleur_primaire   || '#1e40af'
  const secondary = etab.couleur_secondaire || '#3b82f6'
  const roleLink  = ROLE_LINKS[user?.role]

  const niveauxDisponibles = [...new Set(formations.map(f => f.niveau_requis).filter(Boolean))].sort()
  const formationsFiltrees = formations
    .filter(f => filtreType === 'all' || f.type === filtreType)
    .filter(f => filtreNiveau === 'all' || f.niveau_requis === filtreNiveau)

  const isEtudiant = user?.role === 'etudiant'
  const formationsParFiliere = (() => {
    const map = new Map()
    for (const f of formationsFiltrees) {
      const key = (f.filiere_nom && String(f.filiere_nom).trim()) || 'Sans filière'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(f)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'))
  })()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 w-full space-y-8">

      {/* ── EN-TÊTE ÉTABLISSEMENT ─────────────────────────────── */}
      <div className="rounded-3xl overflow-hidden shadow-lg">
        {/* Bannière */}
        <div className="h-28 relative" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
          <div className="absolute inset-0 overflow-hidden opacity-20">
            <div className="absolute top-2 right-8 w-24 h-24 rounded-full bg-white" />
            <div className="absolute bottom-0 left-1/4 w-16 h-16 rounded-full bg-white" />
          </div>
        </div>
        <div className="bg-white px-8 pb-6 -mt-10 relative">
          <div className="flex items-end gap-5 flex-wrap">
            {/* Logo */}
            <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
              {etab.logo_url
                ? <img src={etab.logo_url} alt={etab.nom} className="w-full h-full object-contain" />
                : <span className="text-3xl font-black" style={{ color: primary }}>{etab.nom[0]}</span>}
            </div>
            <div className="flex-1 min-w-0 pt-10">
              <h1 className="text-2xl font-black text-gray-900 truncate">{etab.nom}</h1>
              <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                {etab.adresse    && <span>📍 {etab.adresse}</span>}
                {etab.telephone  && <span>📞 {etab.telephone}</span>}
                {etab.email_contact && <span>✉️ {etab.email_contact}</span>}
              </div>
            </div>
            {/* Accès rapide rôle */}
            {roleLink && (
              <Link to={roleLink.path}
                className="flex items-center gap-2 text-white font-bold px-5 py-2.5 rounded-xl shadow-md hover:opacity-90 transition-all flex-shrink-0"
                style={{ background: primary }}>
                <span>{roleLink.icon}</span> {roleLink.label}
              </Link>
            )}
          </div>
          {etab.description && (
            <p className="mt-4 text-gray-500 text-sm leading-relaxed max-w-2xl">{etab.description}</p>
          )}
        </div>
      </div>

      {/* ── STATISTIQUES ────────────────────────────────────────── */}
      {stats && !isEtudiant && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Formations',        value: formations.length,             icon: '🎓', color: primary },
            { label: 'Dossiers total',    value: stats.total,                   icon: '📂', color: secondary },
            { label: 'En attente',        value: stats.fad?.en_attente + stats.presentiel?.en_attente || 0, icon: '⏳', color: '#f59e0b' },
            { label: 'Demandes proforma', value: stats.demandes_proforma || 0,  icon: '🧾', color: '#10b981' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {['responsable', 'directeur', 'comptable', 'agent_admin'].includes(user?.role) && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-gray-800 text-sm">Factures proforma de l’établissement</p>
              <p className="text-xs text-gray-500">Consulter, exporter par lot (HTML) ou supprimer plusieurs factures.</p>
            </div>
            <Link
              to="/mon-etablissement/factures"
              className="text-sm font-bold px-4 py-2 rounded-xl text-white shrink-0"
              style={{ background: primary }}
            >
              Liste des factures
            </Link>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-gray-800 text-sm">Acceptés par formation</p>
              <p className="text-xs text-gray-500">Une liste par formation ; mise à jour automatique à chaque acceptation.</p>
            </div>
            <Link
              to="/mon-etablissement/acceptes-par-formation"
              className="text-sm font-bold px-4 py-2 rounded-xl border-2 shrink-0 transition-all hover:opacity-80"
              style={{ color: primary, borderColor: primary }}
            >
              Voir les listes
            </Link>
          </div>
        </div>
      )}

      {/* ── FORMATIONS DE L'ÉTABLISSEMENT ───────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-black text-gray-900">{isEtudiant ? 'Filières et formations' : 'Formations proposées'}</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {formationsFiltrees.length}/{formations.length} formation{formations.length !== 1 ? 's' : ''}
            </p>
            {isEtudiant && (
              <p className="text-sm text-gray-600 mt-2 max-w-2xl leading-relaxed">
                Consultez les filières et formations proposées par votre établissement. Les tarifs ne sont pas affichés ici ; utilisez le bouton « Candidater » pour déposer un dossier de préinscription.
              </p>
            )}
          </div>
          {(user?.role === 'responsable' || user?.role === 'directeur') && (
            <Link to="/responsable/gestion-etablissement"
              className="text-sm font-bold px-4 py-2 rounded-xl border-2 transition-all hover:opacity-80"
              style={{ color: primary, borderColor: primary }}>
              + Filières & formations
            </Link>
          )}
        </div>

        {/* Filtres type + niveau */}
        {formations.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {[
              { val: 'all', label: 'Tous' },
              { val: 'presentiel', label: '🏫 Présentiel' },
              { val: 'en_ligne', label: '🌐 FAD' },
            ].map(t => (
              <button key={t.val} onClick={() => setFiltreType(t.val)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${filtreType === t.val ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
                style={filtreType === t.val ? { background: primary } : {}}>
                {t.label}
              </button>
            ))}
            {niveauxDisponibles.length > 0 && (
              <>
                <div className="w-px bg-gray-200" />
                {['all', ...niveauxDisponibles].map(n => (
                  <button key={n} onClick={() => setFiltreNiveau(n)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${filtreNiveau === n ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
                    style={filtreNiveau === n ? { background: secondary } : {}}>
                    {n === 'all' ? 'Tous niveaux' : n}
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {formationsFiltrees.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
            <div className="text-5xl mb-4">📚</div>
            <p className="font-bold text-gray-700 mb-1">
              {formations.length === 0 ? 'Aucune formation enregistrée' : 'Aucune formation ne correspond aux filtres'}
            </p>
            <p className="text-gray-400 text-sm">
              {formations.length === 0
                ? 'Contactez l\'administrateur pour ajouter des formations.'
                : <button onClick={() => { setFiltreType('all'); setFiltreNiveau('all') }} className="text-blue-600 underline">Réinitialiser les filtres</button>}
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {formationsParFiliere.map(([filiereNom, liste], idx) => (
              <section key={filiereNom} aria-labelledby={`filiere-heading-${idx}`}>
                <h3 id={`filiere-heading-${idx}`} className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: primary }} aria-hidden />
                  {filiereNom}
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {liste.map((f) => (
                    <div key={f.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden flex flex-col">
                      <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }} />
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${f.type === 'en_ligne' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {f.type === 'en_ligne' ? '🌐 FAD' : `🏫 ${f.ville || 'Présentiel'}`}
                          </span>
                          {f.niveau_requis && <span className="text-xs text-gray-400">{f.niveau_requis}</span>}
                        </div>
                        <h3 className="font-bold text-gray-900 mb-2 leading-snug">{f.titre}</h3>
                        {f.filiere_duree_cycle && (
                          <p className="text-xs text-gray-700 mb-1">Durée du cycle (filière) : <span className="font-semibold">{f.filiere_duree_cycle}</span></p>
                        )}
                        {f.filiere_condition_acces && (
                          <p className="text-xs text-gray-700 mb-2">Condition d&apos;accès : {f.filiere_condition_acces}</p>
                        )}
                        {f.niveau && <p className="text-xs text-gray-600 mb-2">Niveau : {f.niveau}</p>}
                        {f.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{f.description}</p>}
                        <details className="mb-3 text-xs">
                          <summary className="cursor-pointer font-semibold text-blue-700">Conditions d&apos;entrée (texte de référence)</summary>
                          <div className="mt-2">
                            <PreinscriptionConditionsBlock formationNiveau={f.niveau} />
                          </div>
                        </details>
                        <div className="border-t border-gray-100 pt-3 mt-auto">
                          {isEtudiant ? (
                            <div className="space-y-2">
                              {f.places != null && f.places !== '' && (
                                <p className="text-xs text-gray-500 text-center">
                                  <span className="font-semibold text-gray-700">{f.places}</span> place{Number(f.places) > 1 ? 's' : ''} (indicatif)
                                </p>
                              )}
                              <Link
                                to={`/preinscription/${f.id}`}
                                className="block w-full text-center text-sm font-bold py-2.5 rounded-xl text-white shadow-sm hover:opacity-95 transition-opacity"
                                style={{ background: primary }}
                              >
                                Candidater
                              </Link>
                              <p className="text-[10px] text-center text-gray-400 leading-snug">Les montants vous seront communiqués sur la facture proforma après instruction du dossier.</p>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="font-black text-base" style={{ color: primary }}>{fmt(forfaitAnnuelFromFormation(f))} <span className="text-xs font-normal text-gray-400">FCFA/an</span></div>
                                <div className="text-xs text-gray-500">
                                  Inscription {fmt(f.frais_inscription)}
                                  {f.mensualite > 0 && (
                                    <> · {fmt(f.mensualite)}/mois{f.duree_mois ? ` × ${f.duree_mois} mois` : ''}</>
                                  )}
                                </div>
                              </div>
                              {f.places && (
                                <div className="text-center shrink-0">
                                  <div className="text-sm font-black text-gray-700">{f.places}</div>
                                  <div className="text-xs text-gray-400">places</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* ── ACCÈS RAPIDES ───────────────────────────────────────── */}
      {!isEtudiant && (
        <div>
          <h2 className="text-xl font-black text-gray-900 mb-4">Accès rapides</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              roleLink && { ...roleLink, desc: 'Gérer les dossiers de préinscription' },
              { label: 'Demandes proforma',  path: '/responsable/demandes-proforma', icon: '🧾', desc: 'Factures proforma de l\'établissement' },
              user?.role === 'responsable' && { label: 'Valider des dossiers', path: '/responsable', icon: '✅', desc: 'Accepter ou refuser des candidatures' },
              user?.role === 'agent_admin'  && { label: 'Vérifier les documents', path: '/agent-admin', icon: '📎', desc: 'Contrôle de complétude des dossiers' },
              user?.role === 'comptable'    && { label: 'Finance', path: '/comptable', icon: '💰', desc: 'Gestion financière et facturation' },
              user?.role === 'directeur'    && { label: 'Supervision', path: '/directeur', icon: '👁️', desc: 'Vue globale de l\'établissement' },
            ].filter(Boolean).slice(0, 4).map((item, i) => (
              <Link key={i} to={item.path}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                <div className="text-2xl mb-3">{item.icon}</div>
                <div className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors text-sm">{item.label}</div>
                <div className="text-xs text-gray-400 mt-1">{item.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Infos légales */}
      {(etab.ninea || etab.rc || etab.arrete) && (
        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 text-xs text-gray-500 space-y-1">
          <p className="font-bold text-gray-700 text-sm mb-2">Informations légales</p>
          {etab.ninea   && <p>NINEA : <span className="font-semibold text-gray-700">{etab.ninea}</span></p>}
          {etab.rc      && <p>RC : <span className="font-semibold text-gray-700">{etab.rc}</span></p>}
          {etab.arrete  && <p>Arrêté : <span className="font-semibold text-gray-700">{etab.arrete}</span></p>}
        </div>
      )}
    </div>
  )
}
