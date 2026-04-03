import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { mediaUrl } from '../utils/mediaUrl'

const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
const fmtMoney = (n) => {
  const value = Number(n)
  if (!Number.isFinite(value) || value <= 0) return null
  return `${value.toLocaleString('fr-FR')} FCFA`
}

export default function LettrePreinscription() {
  const { dossierId } = useParams()
  const { user, loading: authLoading } = useAuth()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    if (authLoading) return
    setLoading(true)
    setError(null)
    const url = user?.role === 'etudiant'
      ? `/api/etudiant/lettre/${dossierId}`
      : `/api/responsable/lettre/${dossierId}`
    axios.get(url)
      .then(({ data }) => setData(data))
      .catch((err) => {
        const msg = err.response?.data?.message
        if (msg) setError(msg)
        else if (err.code === 'ERR_NETWORK') {
          setError('Impossible de joindre l’API. Vérifiez que le backend tourne (port 5000) et que vous ouvrez l’app via l’URL du frontend (ex. http://localhost:5173).')
        } else setError(err.message || 'Erreur de chargement')
      })
      .finally(() => setLoading(false))
  }, [dossierId, user?.role, authLoading])

  useEffect(() => {
    if (!data?.dossier) return
    const prev = document.title
    const y = new Date().getFullYear()
    const ref = data.lettre_extensions?.reference_lettre || `LPI-${y}-${String(data.dossier.id).padStart(5, '0')}`
    document.title = ref
    return () => { document.title = prev }
  }, [data])

  const handlePrint = () => window.print()

  if (loading) return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-14 w-14 border-4 border-emerald-600 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Chargement de la lettre...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center">
      <div className="card max-w-md w-full text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Lettre indisponible</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link to="/dashboard" className="btn-primary">Retour au tableau de bord</Link>
      </div>
    </div>
  )

  if (!data?.dossier || !data?.etudiant) {
    return (
      <div className="min-h-screen bg-gray-200 flex items-center justify-center">
        <div className="card max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Données incomplètes</h2>
          <p className="text-gray-500 mb-6">La réponse du serveur ne permet pas d’afficher la lettre. Réessayez ou contactez le support.</p>
          <Link to="/dashboard" className="btn-primary">Retour au tableau de bord</Link>
        </div>
      </div>
    )
  }

  const { dossier, etudiant, formation, photo_url: rawPhotoUrl, etablissement: etab, lettre_extensions: ext = {} } = data
  const logoSrc = mediaUrl(etab?.logo_url)
  const cachetSrc = mediaUrl(etab?.cachet_url)
  const photo_url = mediaUrl(rawPhotoUrl)
  const typeLabel = dossier.type_formation === 'en_ligne' ? 'Formation à distance (FAD)' : 'Formation présentielle'
  const refLettre = ext.reference_lettre || `LPI-${new Date().getFullYear()}-${String(dossier.id).padStart(5, '0')}`
  const formationTitre = formation?.titre || dossier?.filiere || '—'
  const formationDuree = formation?.duree || '—'
  const fraisInscription = Number(formation?.frais_inscription || 0)
  const scolariteAnnuelle = Number(formation?.prix || 0)
  const totalAnnuel = fraisInscription + scolariteAnnuelle
  const mensualite = Number(formation?.mensualite || 0)
  const primary = etab?.couleur_primaire || '#1e40af'
  const secondary = etab?.couleur_secondaire || '#059669'
  const bandStyle = { background: `linear-gradient(to right, ${primary}, ${secondary})` }
  const verificationId = `${refLettre}-${String(dossier.id).padStart(4, '0')}`
  const prenomT = (etudiant?.prenom || '').trim()
  const nomT = (etudiant?.nom || '').trim()
  const appelNom =
    prenomT && nomT && prenomT.toUpperCase() === nomT.toUpperCase()
      ? nomT.toUpperCase()
      : `${prenomT} ${nomT.toUpperCase()}`.trim()

  return (
    <div className="lettre-print-scope min-h-screen bg-gray-200 py-8 px-4">

      {/* Barre d'actions */}
      <div className="no-print max-w-3xl mx-auto mb-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to={-1}
            className="flex items-center gap-2 font-medium text-sm bg-white px-4 py-2 rounded-lg border transition-colors"
            style={{ color: primary, borderColor: `${primary}55` }}
          >
            ← Retour
          </Link>
          <button type="button" onClick={handlePrint}
            className="flex items-center gap-2 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-md text-sm"
            style={{ backgroundColor: primary }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Imprimer / Télécharger PDF
          </button>
        </div>
        <p className="text-xs text-gray-700 bg-amber-50/90 border border-amber-100 rounded-lg px-4 py-2.5 leading-relaxed">
          <span className="font-semibold text-amber-900">PDF sans URL ni date du navigateur :</span>{' '}
          dans la fenêtre d’impression, désactivez l’option « En-têtes et pieds de page » (Chrome, Edge, Firefox) avant d’enregistrer au format PDF.
        </p>
      </div>

      {/* LETTRE */}
      <div className="print-page max-w-3xl mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden">

        {/* En-tête de la lettre */}
        <div className="relative lettre-print-header-root">
          <div className="h-2" style={bandStyle} />

          <div className="px-10 pt-8 pb-6">
            <div className="flex items-start justify-between gap-6 lettre-print-header-row">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  {logoSrc ? (
                    <img
                      src={logoSrc}
                      alt=""
                      className="w-14 h-14 object-contain rounded-xl border border-gray-100 bg-white p-1 shadow"
                    />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center shadow text-white text-xs font-bold"
                      style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
                    >
                      {(etab?.nom || 'U').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-xl font-black leading-tight" style={{ color: primary }}>
                      {etab?.nom || 'UNIVERSITÉ NATIONALE'}
                    </div>
                    <div className="text-sm font-semibold text-gray-500">
                      Lettre de préinscription · Service des formations
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 leading-relaxed">
                  {etab ? (
                    <>
                      {etab.adresse && <p>{etab.adresse}</p>}
                      {(etab.telephone || etab.email_contact) && (
                        <p>
                          {etab.telephone && (
                            <>
                              <span className="no-print" aria-hidden>📞 </span>
                              <span className="hidden print:inline">Tél. </span>
                              {etab.telephone}
                            </>
                          )}
                          {etab.telephone && etab.email_contact && ' · '}
                          {etab.email_contact && (
                            <>
                              <span className="no-print" aria-hidden>✉ </span>
                              <span className="hidden print:inline">Courriel : </span>
                              {etab.email_contact}
                            </>
                          )}
                        </p>
                      )}
                      {(etab.ninea || etab.site_web) && (
                        <p>
                          {etab.ninea && <>NINEA : {etab.ninea}</>}
                          {etab.ninea && etab.site_web && ' · '}
                          {etab.site_web && <>{etab.site_web}</>}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p>BP 5005, Dakar, Sénégal</p>
                      <p>
                        <span className="no-print" aria-hidden>📞 </span>
                        <span className="hidden print:inline">Tél. </span>
                        +221 33 000 00 00 &nbsp;|&nbsp;
                        <span className="no-print" aria-hidden>✉ </span>
                        <span className="hidden print:inline">Courriel : </span>
                        contact@universite.sn
                      </p>
                      <p>NINEA : 123456789 &nbsp;|&nbsp; www.universite.sn</p>
                    </>
                  )}
                </div>
              </div>

              <div className="text-center shrink-0 lettre-print-photo-top">
                {photo_url ? (
                  <img
                    src={photo_url}
                    alt="Photo du candidat"
                    className="w-28 h-32 object-cover border-4 rounded-lg shadow-md"
                    style={{ borderColor: primary }}
                  />
                ) : (
                  <div className="w-28 h-32 border-4 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50">
                    <span className="text-3xl text-gray-300 no-print" aria-hidden>👤</span>
                    <span className="text-xs text-gray-400 mt-1">Photo</span>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">Photo d'identité</p>
              </div>
            </div>
          </div>

          {/* Séparateur */}
          <div className="mx-10 border-t-2 border-gray-100"></div>
        </div>

        <div className="px-10 py-8">
          {/* Titre officiel */}
          <div className="text-center mb-8">
            <div className="inline-block border-2 px-8 py-3 rounded-xl" style={{ borderColor: primary }}>
              <h1 className="text-2xl font-black tracking-wide uppercase" style={{ color: primary }}>Lettre de Préinscription</h1>
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-[11px] text-gray-700">
              <span className="font-semibold uppercase tracking-wide">Document officiel</span>
              <span>Version 1.0</span>
              <span className="font-mono">ID {verificationId}</span>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500 lettre-print-meta-row">
              <span>Réf : <strong className="font-mono text-gray-700">{refLettre}</strong></span>
              <span>N° Dossier : <strong className="font-mono text-gray-700">{dossier.numero_dossier}</strong></span>
              <span>Dakar, le <strong className="text-gray-700">{fmtDate(new Date())}</strong></span>
            </div>
          </div>

          {/* Corps de la lettre */}
          <div className="space-y-5 text-sm leading-relaxed text-gray-800">

            {/* Formule d'appel */}
            <p>
              <strong>Madame, Monsieur {appelNom},</strong>
            </p>

            {/* Objet */}
            <div className="border-l-4 px-5 py-3 rounded-r-xl" style={{ borderLeftColor: primary, backgroundColor: `${primary}12` }}>
              <p className="font-bold" style={{ color: primary }}>Objet : Préinscription à la formation — <em>{formationTitre}</em> ({typeLabel})</p>
            </div>

            {/* Corps principal */}
            <p>
              Nous avons bien reçu votre dossier de candidature et nous avons le plaisir de vous informer que votre
              demande de préinscription pour l'année académique <strong>{dossier.annee_academique}</strong> a été
              <strong style={{ color: primary }}> acceptée</strong> par notre commission pédagogique.
            </p>

            <p>
              Au regard des éléments transmis lors de votre demande, vous êtes admis(e) en
              <strong> {formationTitre}</strong>. Cette lettre confirme votre place sous réserve de finalisation
              administrative et financière conformément au règlement intérieur de l’établissement.
            </p>

            <div className="rounded-xl border px-5 py-4" style={{ borderColor: `${primary}44`, backgroundColor: `${primary}12` }}>
              <p className="font-bold text-sm mb-2" style={{ color: primary }}>Décision de préinscription conditionnelle</p>
              <p className="text-sm leading-relaxed" style={{ color: primary }}>
                Statut académique : <strong>Admis(e) sous réserve</strong> de validation définitive du paiement des frais
                exigibles et de conformité documentaire complète auprès des services compétents.
              </p>
            </div>

            {/* Encadré informations */}
            <div className="rounded-xl border border-gray-200 overflow-hidden lettre-print-encadre-infos">
              <div className="text-white px-5 py-3" style={{ background: `linear-gradient(to right, ${primary}, ${secondary})` }}>
                <p className="font-bold text-sm">Informations de votre préinscription</p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-gray-100">
                <div className="p-4 space-y-3">
                  <div><p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">Candidat</p><p className="font-bold text-gray-900">{etudiant.prenom} {etudiant.nom.toUpperCase()}</p></div>
                  <div><p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">Email</p><p className="text-gray-700">{etudiant.email}</p></div>
                  <div><p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">Nationalité</p><p className="text-gray-700">{dossier.nationalite}</p></div>
                  <div><p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">Date de naissance</p><p className="text-gray-700">{fmtDate(dossier.date_naissance)}</p></div>
                </div>
                <div className="p-4 space-y-3">
                  <div><p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">Formation</p><p className="font-bold text-gray-900">{formationTitre}</p></div>
                  <div><p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">Type</p>
                    <p className="font-semibold">
                      {dossier.type_formation === 'en_ligne'
                        ? (
                          <span style={{ color: primary }}>
                            <span className="no-print" aria-hidden>🌐 </span>
                            Formation à distance (FAD)
                          </span>
                        )
                        : (
                          <span style={{ color: secondary }}>
                            <span className="no-print" aria-hidden>🏫 </span>
                            Formation présentielle
                          </span>
                        )}
                    </p>
                  </div>
                  <div><p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">Durée</p><p className="text-gray-700">{formationDuree}</p></div>
                  <div><p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">Année académique</p><p className="text-gray-700">{dossier.annee_academique}</p></div>
                </div>
              </div>
            </div>

            {/* Conditions financières et modalités (inspiration lettre institutionnelle) */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/70 px-5 py-4">
              <p className="font-bold text-sm mb-3" style={{ color: primary }}>
                Conditions financières et modalités d’inscription
              </p>
              <div className="space-y-2 text-sm text-gray-800">
                {(fraisInscription > 0 || scolariteAnnuelle > 0 || totalAnnuel > 0) && (
                  <p>
                    Les frais académiques prévisionnels de l’année comprennent :
                    {fraisInscription > 0 && <> <strong>frais d’inscription {fmtMoney(fraisInscription)}</strong></>}
                    {fraisInscription > 0 && scolariteAnnuelle > 0 && <> et </>}
                    {scolariteAnnuelle > 0 && <> <strong>scolarité annuelle {fmtMoney(scolariteAnnuelle)}</strong></>}
                    {totalAnnuel > 0 && <> (total indicatif : <strong>{fmtMoney(totalAnnuel)}</strong>).</>}
                  </p>
                )}
                {mensualite > 0 && (
                  <p>
                    En cas de paiement échelonné, la mensualité de référence est de <strong>{fmtMoney(mensualite)}</strong>.
                  </p>
                )}
                {etab?.compte_bancaire ? (
                  <p>
                    Pour un règlement bancaire, utiliser les références communiquées par l’établissement :
                    <strong className="font-mono"> {etab.compte_bancaire}</strong>.
                  </p>
                ) : (
                  <p>
                    Le détail des modalités de paiement (banque, échéancier, quittance) sera précisé sur votre facture proforma.
                  </p>
                )}
              </div>
            </div>

            {/* Formalités complémentaires */}
            <div className="rounded-xl border border-dashed border-gray-300 px-5 py-4">
              <p className="font-bold text-sm mb-2 text-gray-900">Formalités complémentaires</p>
              <ul className="space-y-1.5 text-sm text-gray-700 list-disc pl-5">
                <li>Finaliser votre dossier administratif auprès du service scolarité.</li>
                <li>Présenter les originaux et copies légalisées des pièces demandées, selon les exigences de la filière.</li>
                <li>Conserver cette lettre et la facture proforma jusqu’à l’inscription définitive.</li>
              </ul>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
              <p className="font-bold text-sm mb-2 text-gray-900">Conformité réglementaire de l’établissement</p>
              <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-700">
                <p>NINEA : <strong>{etab?.ninea || '—'}</strong></p>
                <p>Registre de commerce : <strong>{etab?.rc || '—'}</strong></p>
                <p>Autorisation / Agrément : <strong>{etab?.arrete || '—'}</strong></p>
                <p>ID vérification document : <strong className="font-mono">{verificationId}</strong></p>
              </div>
            </div>

            {/* Prochaines étapes */}
            <div>
              <p className="font-bold text-gray-900 mb-2">
                <span className="no-print" aria-hidden>📋 </span>
                Prochaines étapes :
              </p>
              <div className="space-y-2">
                {[
                  'Régler les frais d\'inscription selon la facture proforma qui vous sera transmise.',
                  dossier.type_formation === 'en_ligne'
                    ? 'Vous recevrez vos accès à la plateforme d\'enseignement en ligne après confirmation du paiement.'
                    : 'Vous présenter au secrétariat avec l\'original de cette lettre et de vos pièces justificatives.',
                  'Conserver cette lettre — elle vous sera demandée lors de votre inscription définitive.'
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: `${primary}22`, color: primary }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-700">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Formule de clôture */}
            <p>
              Nous sommes heureux de vous accueillir au sein de notre établissement et nous restons disponibles pour toute question complémentaire.
            </p>

            <p>Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.</p>
          </div>

          {/* Synthèse identité, références demande, cachet officiel pédagogie */}
          <div
            className="mt-10 pt-8 border-t-2 border-gray-200 rounded-2xl bg-gradient-to-b from-gray-50/80 to-white px-6 py-6 print:border-gray-300 lettre-print-blocsynthese"
            style={{ borderTopColor: `${primary}33` }}
          >
            <p className="text-center text-xs font-bold uppercase tracking-widest mb-5" style={{ color: primary }}>
              Identité du candidat · Références de la demande · Visa pédagogique
            </p>
            <div className="grid md:grid-cols-3 gap-8 print:grid-cols-3 print:gap-4 items-start">
              <div className="text-center md:text-left">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Photo d’identité</p>
                {photo_url ? (
                  <img
                    src={photo_url}
                    alt="Candidat"
                    className="w-32 h-40 object-cover rounded-xl border-4 shadow-md mx-auto md:mx-0"
                    style={{ borderColor: primary }}
                  />
                ) : (
                  <div className="w-32 h-40 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm mx-auto md:mx-0">
                    Non fournie
                  </div>
                )}
              </div>
              <div className="space-y-3 text-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase">Références enregistrées lors de la demande</p>
                <ul className="space-y-2 text-gray-800">
                  <li><span className="text-gray-500">Réf. lettre :</span> <strong className="font-mono">{refLettre}</strong></li>
                  <li><span className="text-gray-500">N° dossier :</span> <strong className="font-mono">{ext.numero_dossier || dossier.numero_dossier}</strong></li>
                  {ext.date_soumission && (
                    <li><span className="text-gray-500">Date de dépôt du dossier :</span> <strong>{fmtDate(ext.date_soumission)}</strong></li>
                  )}
                  {ext.matricule_candidat && (
                    <li><span className="text-gray-500">Matricule candidat :</span> <strong className="font-mono">{ext.matricule_candidat}</strong></li>
                  )}
                  <li>
                    <span className="text-gray-500">N° passeport / CNI :</span>{' '}
                    <strong>{ext.numero_passeport || dossier.numero_passeport || '— (indiqué sur la pièce jointe au dossier)'}</strong>
                  </li>
                </ul>
                <div className="mt-3 rounded-lg border border-gray-200 bg-white/80 p-3 text-xs text-gray-700">
                  <p className="font-semibold text-gray-800 mb-1">Références de paiement (si applicables)</p>
                  <p>Banque : <strong>{etab?.banque || '—'}</strong></p>
                  <p>Compte : <strong className="font-mono">{etab?.compte_bancaire || '—'}</strong></p>
                  <p>IBAN : <strong className="font-mono">{etab?.iban || '—'}</strong></p>
                  <p>SWIFT : <strong className="font-mono">{etab?.swift || '—'}</strong></p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Cachet officiel — Pédagogie</p>
                {cachetSrc ? (
                  <div className="inline-flex flex-col items-center gap-2">
                    <img
                      src={cachetSrc}
                      alt="Cachet officiel"
                      className="max-h-36 max-w-full object-contain opacity-95"
                    />
                    <p className="text-xs text-gray-600 font-semibold">Validé par le service pédagogique</p>
                  </div>
                ) : (
                  <div
                    className="mx-auto w-40 h-28 rounded-xl border-2 flex flex-col items-center justify-center text-gray-400 text-xs p-2"
                    style={{ borderColor: `${primary}44` }}
                  >
                    <span className="font-semibold text-gray-500">Cachet établissement</span>
                    <span className="text-center mt-1">À compléter par l’administrateur (upload cachet)</span>
                  </div>
                )}
                <p className="text-xs font-bold text-gray-700 mt-4">{etab?.signataire_nom || 'Le Responsable pédagogique'}</p>
                <p className="text-xs text-gray-500">{etab?.signataire_fonction || 'Pour le Directeur des études'}</p>
              </div>
            </div>
          </div>

          {/* Pied document (références courtes) */}
          <div className="mt-8 flex justify-between items-end text-xs text-gray-400 print:text-gray-600">
            <div>
              <p>Document émis le {fmtDate(new Date())}</p>
              <p>Réf : {refLettre} &nbsp;|&nbsp; Dossier : {dossier.numero_dossier}</p>
            </div>
          </div>

          {/* Mention légale */}
          <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              Cette lettre de préinscription est émise électroniquement et est valide sans signature manuscrite originale.
              Elle ne constitue pas une inscription définitive. · {refLettre}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              Vérification interne : ID <span className="font-mono">{verificationId}</span> · Émis le {fmtDate(new Date())}
            </p>
          </div>
        </div>

        {/* Pied de page */}
        <div className="h-2" style={bandStyle} />
        <div className="bg-gray-900 text-gray-400 text-center py-3 px-10 lettre-print-footer-etab">
          <p className="text-xs">
            {etab?.nom
              ? `${etab.nom}${etab?.email_contact || etab?.telephone ? ` · ${[etab.email_contact, etab.telephone].filter(Boolean).join(' · ')}` : ''}`
              : 'Coordonnées de l’établissement · À renseigner côté administration'}
          </p>
        </div>
      </div>
    </div>
  )
}
