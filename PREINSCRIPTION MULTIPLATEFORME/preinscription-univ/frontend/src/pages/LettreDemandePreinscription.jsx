import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'

const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
const fmtMoney = (n) => {
  const value = Number(n)
  if (!Number.isFinite(value) || value <= 0) return null
  return `${value.toLocaleString('fr-FR')} FCFA`
}

export default function LettreDemandePreinscription() {
  const { demandeId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    axios.get(`/api/etudiant/lettre-demande/${demandeId}`)
      .then(({ data }) => setData(data))
      .catch(err => setError(err.response?.data?.message || 'Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [demandeId])

  useEffect(() => {
    if (!data?.demande) return
    const prev = document.title
    const ref = data.lettre?.reference || `LPI-DEM-${String(data.demande.id).padStart(5, '0')}`
    document.title = ref
    return () => { document.title = prev }
  }, [data])

  const handlePrint = () => window.print()

  if (loading) return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center">
      <div className="animate-spin rounded-full h-14 w-14 border-4 border-emerald-600 border-t-transparent" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center px-4">
      <div className="card max-w-md w-full text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Lettre indisponible</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link to="/dashboard" className="btn-primary">Retour au tableau de bord</Link>
      </div>
    </div>
  )

  const { demande, formation, lettre, etablissement_snapshot: etab } = data
  const typeLabel = demande.type_formation === 'en_ligne' ? 'Formation à distance (FAD)' : 'Formation présentielle'
  const refLettre = lettre?.reference || `LPI-DEM-${demande.id}`
  const nomEtab = etab?.nom || 'Établissement'
  const primary = etab?.couleur_primaire || '#1e40af'
  const secondary = etab?.couleur_secondaire || '#059669'
  const bandStyle = { background: `linear-gradient(to right, ${primary}, ${secondary})` }
  const verificationId = `${refLettre}-${String(demande.id).padStart(4, '0')}`
  const facture = demande?.facture || null
  const montantTotal = Number(facture?.montant_ttc || facture?.montant_ht || 0)
  const lignesFac = Array.isArray(facture?.lignes) ? facture.lignes : []
  const montantInscription = Number(lignesFac.find((l) => /inscription/i.test(String(l.designation || '')))?.montant) || 0
  const montantMensualites = lignesFac
    .filter((l) => /mensualit/i.test(String(l.designation || '')))
    .reduce((s, l) => s + Number(l.montant || 0), 0)
  const lignesSupp = facture?.lignes_frais_supplementaires || facture?.lignes_supplementaires || []

  return (
    <div className="lettre-print-scope min-h-screen bg-gray-200 py-8 px-4">
      <div className="no-print max-w-3xl mx-auto mb-6 flex items-center justify-between">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 font-medium text-sm bg-white px-4 py-2 rounded-lg border"
          style={{ color: primary, borderColor: `${primary}55` }}
        >
          ← Retour
        </Link>
        <button type="button" onClick={handlePrint}
          className="flex items-center gap-2 text-white font-semibold px-5 py-2.5 rounded-lg shadow-md text-sm"
          style={{ backgroundColor: primary }}
        >
          Imprimer / PDF
        </button>
      </div>

      <div className="print-page max-w-3xl mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden">
        <div className="h-2" style={bandStyle} />

        <div className="px-10 pt-8 pb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {etab?.logo_url ? (
                <img
                  src={etab.logo_url}
                  alt=""
                  className="w-14 h-14 object-contain rounded-xl border border-gray-100 bg-white p-1 shrink-0"
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
                >
                  {nomEtab.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-xl font-black" style={{ color: primary }}>{nomEtab}</h2>
                {etab?.adresse && <p className="text-xs text-gray-500 mt-1">{etab.adresse}</p>}
                {(etab?.telephone || etab?.email_contact) && (
                  <p className="text-xs text-gray-500 mt-1">
                    {etab.telephone && <span>📞 {etab.telephone}</span>}
                    {etab.telephone && etab.email_contact && ' · '}
                    {etab.email_contact && <span>✉ {etab.email_contact}</span>}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-10 border-t-2 border-gray-100" />

        <div className="px-10 py-8">
          <div className="text-center mb-8">
            <div className="inline-block border-2 px-8 py-3 rounded-xl" style={{ borderColor: primary }}>
              <h1 className="text-2xl font-black tracking-wide uppercase" style={{ color: primary }}>Lettre de Préinscription</h1>
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-[11px] text-gray-700">
              <span className="font-semibold uppercase tracking-wide">Document officiel</span>
              <span>Version 1.0</span>
              <span className="font-mono">ID {verificationId}</span>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500 flex-wrap">
              <span>Réf : <strong className="font-mono text-gray-700">{refLettre}</strong></span>
              <span>Demande : <strong className="font-mono text-gray-700">{demande.reference}</strong></span>
              <span>Le <strong className="text-gray-700">{fmtDate(lettre?.date_emission || demande.acceptee_le || new Date())}</strong></span>
            </div>
          </div>

          <div className="space-y-5 text-sm leading-relaxed text-gray-800">
            <p><strong>Madame, Monsieur {demande.prenom} {String(demande.nom || '').toUpperCase()},</strong></p>

            <div className="border-l-4 px-5 py-3 rounded-r-xl" style={{ borderLeftColor: primary, backgroundColor: `${primary}12` }}>
              <p className="font-bold" style={{ color: primary }}>
                Objet : Préinscription — <em>{formation?.titre || demande.formation_titre}</em> ({typeLabel})
              </p>
            </div>

            <p>
              Nous avons le plaisir de vous informer que votre demande de préinscription
              {demande.niveau && <> (niveau indiqué : <strong>{demande.niveau}</strong>)</>} a été{' '}
              <strong style={{ color: primary }}>acceptée</strong> par {nomEtab}.
            </p>

            <div className="rounded-xl border px-5 py-4" style={{ borderColor: `${primary}44`, backgroundColor: `${primary}12` }}>
              <p className="font-bold text-sm mb-2" style={{ color: primary }}>Décision de préinscription conditionnelle</p>
              <p className="text-sm leading-relaxed" style={{ color: primary }}>
                Statut académique : <strong>Admis(e) sous réserve</strong> de la finalisation financière et de la conformité des pièces.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="text-white px-5 py-3" style={{ background: `linear-gradient(to right, ${primary}, ${secondary})` }}>
                <p className="font-bold text-sm">Récapitulatif</p>
              </div>
              <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                <div className="p-4 space-y-2">
                  <p className="text-xs text-gray-400 uppercase font-semibold">Demandeur</p>
                  <p className="font-bold">{demande.prenom} {demande.nom}</p>
                  <p className="text-gray-600 text-sm">{demande.email}</p>
                  <p className="text-gray-600 text-sm">{demande.telephone}</p>
                </div>
                <div className="p-4 space-y-2">
                  <p className="text-xs text-gray-400 uppercase font-semibold">Formation</p>
                  <p className="font-bold">{formation?.titre || demande.formation_titre}</p>
                  <p className="text-sm">{typeLabel}</p>
                  {formation?.duree && <p className="text-sm text-gray-600">Durée : {formation.duree}</p>}
                </div>
              </div>
            </div>

            <p>
              Vous trouverez sur votre espace étudiant la <strong>facture proforma</strong> actualisée conformément aux frais en vigueur.
              Les prochaines étapes (paiement, pièces complémentaires) vous seront communiquées par le secrétariat.
            </p>

            <div className="rounded-xl border border-gray-200 bg-gray-50/70 px-5 py-4">
              <p className="font-bold text-sm mb-3" style={{ color: primary }}>
                Conditions financières et modalités
              </p>
              <div className="space-y-2 text-sm text-gray-800">
                {(montantTotal > 0 || montantInscription > 0 || montantMensualites > 0) && (
                  <p>
                    Forfait annuel sur la facture proforma : <strong>{fmtMoney(montantTotal)}</strong>
                    {(montantInscription > 0 || montantMensualites > 0) && (
                      <>
                        {' '}(détail :{' '}
                        {montantInscription > 0 && <>inscription {fmtMoney(montantInscription)}</>}
                        {montantInscription > 0 && montantMensualites > 0 && ' · '}
                        {montantMensualites > 0 && <>mensualités {fmtMoney(montantMensualites)}</>}
                        ).
                      </>
                    )}
                  </p>
                )}
                {Array.isArray(lignesSupp) && lignesSupp.length > 0 && (
                  <p className="text-amber-900/90">
                    Frais complémentaires (hors forfait annuel) :{' '}
                    {lignesSupp.map((l, i) => (
                      <span key={i}>
                        {l.designation} {fmtMoney(l.montant)}
                        {i < lignesSupp.length - 1 ? ' · ' : ''}
                      </span>
                    ))}
                  </p>
                )}
                {etab?.compte_bancaire && (
                  <p>Référence de compte communiquée : <strong className="font-mono">{etab.compte_bancaire}</strong></p>
                )}
                {(etab?.banque || etab?.iban || etab?.swift) && (
                  <p>
                    {(etab?.banque || 'Banque non renseignée')}
                    {etab?.iban && <> · IBAN <strong className="font-mono">{etab.iban}</strong></>}
                    {etab?.swift && <> · SWIFT <strong className="font-mono">{etab.swift}</strong></>}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
              <p className="font-bold text-sm mb-2 text-gray-900">Conformité réglementaire de l’établissement</p>
              <div className="grid sm:grid-cols-2 gap-2 text-sm text-gray-700">
                <p>NINEA : <strong>{etab?.ninea || '—'}</strong></p>
                <p>Registre de commerce : <strong>{etab?.rc || '—'}</strong></p>
                <p>Autorisation / Agrément : <strong>{etab?.arrete || '—'}</strong></p>
                <p>ID vérification document : <strong className="font-mono">{verificationId}</strong></p>
              </div>
            </div>

            <p>Veuillez agréer, Madame, Monsieur, l&apos;expression de nos salutations distinguées.</p>
          </div>

          <div className="mt-10 flex justify-end">
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-8">Pour l&apos;établissement,</p>
              <p className="text-xs font-bold text-gray-600">{etab?.signataire_nom || 'Le Responsable pédagogique'}</p>
              <p className="text-xs text-gray-500">{etab?.signataire_fonction || 'Pour le Directeur des études'}</p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              Document émis électroniquement — {refLettre} — ne constitue pas une inscription définitive.
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              Vérification interne : ID <span className="font-mono">{verificationId}</span>
            </p>
          </div>
        </div>

        <div className="h-2" style={bandStyle} />
      </div>
    </div>
  )
}
