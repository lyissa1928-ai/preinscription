import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n)
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

export default function FactureView() {
  const { dossierId } = useParams()
  const [facture, setFacture] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const printRef = useRef()

  useEffect(() => {
    // Essayer de charger la facture existante
    axios.get(`/api/factures/dossier/${dossierId}`)
      .then(({ data }) => setFacture(data))
      .catch(() => {
        // Si pas de facture, la générer
        setGenerating(true)
        axios.post(`/api/factures/generer/${dossierId}`)
          .then(({ data }) => { setFacture(data); toast.success('Facture générée avec succès !') })
          .catch(err => toast.error(err.response?.data?.message || 'Erreur génération facture'))
          .finally(() => setGenerating(false))
      })
      .finally(() => setLoading(false))
  }, [dossierId])

  const handlePrint = () => window.print()

  if (loading || generating) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-14 w-14 border-4 border-blue-700 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">{generating ? 'Génération de votre facture...' : 'Chargement...'}</p>
      </div>
    </div>
  )

  if (!facture) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 text-lg mb-4">Facture introuvable</p>
        <Link to="/dashboard" className="btn-primary">Retour au tableau de bord</Link>
      </div>
    </div>
  )

  const { etudiant_snapshot: et, formation_snapshot: fo, etablissement_snapshot: eb } = facture
  const p1 = eb?.couleur_primaire || '#1e3a8a'
  const p2 = eb?.couleur_secondaire || '#4338ca'
  const headerGrad = { background: `linear-gradient(to right, ${p1}, ${p2})` }
  const bandStyle = { background: `linear-gradient(to right, ${p1}, ${p2})` }

  return (
    <div className="min-h-screen bg-gray-200 py-8 px-4">
      {/* Barre d'actions (masquée à l'impression) */}
      <div className="no-print max-w-4xl mx-auto mb-6 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium text-sm bg-white px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
          ← Retour au tableau de bord
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Facture N° <strong className="text-gray-800">{facture.numero}</strong></span>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 text-white font-semibold px-5 py-2.5 rounded-lg transition-opacity shadow-md hover:shadow-lg text-sm hover:opacity-90"
            style={{ backgroundColor: p1 }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Imprimer / Télécharger PDF
          </button>
        </div>
      </div>

      {/* FACTURE */}
      <div ref={printRef} className="print-page max-w-4xl mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden">

        <div className="text-white px-10 py-8" style={headerGrad}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                {eb?.logo_url ? (
                  <img src={eb.logo_url} alt="" className="w-12 h-12 object-contain rounded-xl bg-white/95 p-1" />
                ) : (
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-sm font-bold">
                    {(eb?.nom || 'U').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-xl font-bold">{eb?.nom || 'UniPréinscription'}</div>
                  <div className="text-white/80 text-xs">
                    {eb?.nom ? 'Facture proforma — préinscription' : 'Plateforme officielle de préinscription'}
                  </div>
                </div>
              </div>
              <div className="text-white/80 text-xs leading-relaxed">
                {eb ? (
                  <>
                    {eb.adresse && <p>{eb.adresse}</p>}
                    <p>
                      {[eb.email_contact, eb.telephone].filter(Boolean).join(' · ') || '—'}
                    </p>
                    {(eb.ninea || eb.site_web) && (
                      <p>
                        {eb.ninea && <>NINEA : {eb.ninea}</>}
                        {eb.ninea && eb.site_web && ' · '}
                        {eb.site_web}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p>Dakar, Sénégal</p>
                    <p>contact@universite.sn · +221 33 000 00 00</p>
                    <p>NINEA : 123456789 · RC : SN-DKR-2010-A-12345</p>
                  </>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="inline-block bg-yellow-400 text-gray-900 font-black text-xl px-6 py-2 rounded-xl tracking-wide mb-3">
                FACTURE PROFORMA
              </div>
              <div className="space-y-1 text-sm">
                <div className="text-white/80">N° <strong className="text-white font-mono text-base">{facture.numero}</strong></div>
                <div className="text-white/80">Date d'émission : <strong className="text-white">{fmtDate(facture.date_emission)}</strong></div>
                <div className="text-white/80">Valable jusqu'au : <strong className="text-white">{fmtDate(facture.date_echeance)}</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* Bandeau statut */}
        <div className="bg-amber-50 border-b border-amber-100 px-10 py-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          <p className="text-amber-700 text-sm font-medium">Document non contractuel — Cette facture proforma est émise à titre indicatif avant confirmation de votre inscription.</p>
        </div>

        <div className="px-10 py-8">
          {/* Parties */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Émetteur */}
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Émetteur</div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="font-bold text-gray-900 text-base">{eb?.nom || 'UniPréinscription'}</div>
                <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                  {eb ? (
                    <>
                      {eb.adresse && <p>{eb.adresse}</p>}
                      {eb.telephone && <p>Tél : {eb.telephone}</p>}
                      {eb.email_contact && <p>Email : {eb.email_contact}</p>}
                      {eb.site_web && <p>{eb.site_web}</p>}
                    </>
                  ) : (
                    <>
                      <p>Université Nationale du Sénégal</p>
                      <p>BP 5005, Dakar, Sénégal</p>
                      <p>Tél : +221 33 000 00 00</p>
                      <p>Email : contact@universite.sn</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Destinataire */}
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Destinataire</div>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="font-bold text-gray-900 text-base">{et.prenom} {et.nom}</div>
                <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                  <p>Nationalité : {et.nationalite}</p>
                  <p>Tél : {et.telephone}</p>
                  <p>Email : {et.email}</p>
                  <p className="text-xs">{et.adresse}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Objet */}
          <div className="mb-6 p-4 rounded-xl border" style={{ backgroundColor: `${p1}12`, borderColor: `${p1}33` }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-1 opacity-70" style={{ color: p1 }}>Objet</div>
            <p className="font-semibold text-gray-900">
              Préinscription — {fo.titre} ({fo.type === 'en_ligne' ? 'Formation en ligne' : `Formation présentielle · ${fo.ville}`})
            </p>
            <p className="text-sm mt-1 text-gray-600">Durée : {fo.duree} · Niveau requis : {fo.niveau_requis}</p>
          </div>

          {/* Tableau des montants */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="text-white" style={bandStyle}>
                  <th className="text-left py-3.5 px-5 text-sm font-semibold rounded-tl-xl">Désignation</th>
                  <th className="text-center py-3.5 px-4 text-sm font-semibold">Qté</th>
                  <th className="text-right py-3.5 px-5 text-sm font-semibold rounded-tr-xl">Montant (FCFA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {facture.lignes.map((ligne, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-4 px-5">
                      <div className="text-sm font-medium text-gray-800">{ligne.description}</div>
                    </td>
                    <td className="py-4 px-4 text-center text-sm text-gray-600">{ligne.quantite}</td>
                    <td className="py-4 px-5 text-right text-sm font-semibold text-gray-800">{fmt(ligne.total)}</td>
                  </tr>
                ))}
                {(facture.lignes_supplementaires || []).map((ligne, j) => (
                  <tr key={`sup-${j}`} className="bg-amber-50/90">
                    <td className="py-4 px-5">
                      <div className="text-sm font-medium text-amber-900">{ligne.designation}</div>
                      <div className="text-xs text-amber-800">Non inclus dans le sous-total HT (forfait annuel)</div>
                    </td>
                    <td className="py-4 px-4 text-center text-sm text-gray-600">1</td>
                    <td className="py-4 px-5 text-right text-sm font-semibold text-amber-900">{fmt(ligne.montant)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totaux */}
            <div className="mt-0 border border-gray-100 rounded-b-xl overflow-hidden">
              <div className="flex justify-end">
                <div className="w-72">
                  <div className="flex justify-between items-center px-5 py-3 bg-gray-50 border-t border-gray-100">
                    <span className="text-sm text-gray-600">Sous-total HT</span>
                    <span className="text-sm font-semibold text-gray-800">{fmt(facture.montant_ht)} FCFA</span>
                  </div>
                  <div className="flex justify-between items-center px-5 py-3 bg-gray-50 border-t border-gray-100">
                    <span className="text-sm text-gray-600">TVA ({facture.tva_taux}%)</span>
                    <span className="text-sm font-semibold text-gray-500">{facture.tva_taux === 0 ? 'Exonéré' : `${fmt(facture.montant_tva)} FCFA`}</span>
                  </div>
                  <div
                    className="flex justify-between items-center px-5 py-4 text-white rounded-b-xl border-t border-gray-100"
                    style={bandStyle}
                  >
                    <span className="font-bold text-base">TOTAL TTC</span>
                    <span className="font-black text-xl">{fmt(facture.montant_ttc)} FCFA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Montant en lettres */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-8">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Arrêté à la somme de : </span>
            <span className="text-sm font-semibold text-gray-800 ml-1">{fmt(facture.montant_ttc)} Francs CFA</span>
          </div>

          {/* Conditions de paiement */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Modalités de paiement</div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <span className="font-bold mt-0.5" style={{ color: p1 }}>▸</span>
                  <span>
                    <strong>Virement bancaire :</strong>{' '}
                    {eb?.compte_bancaire?.trim()
                      ? eb.compte_bancaire
                      : 'IBAN SN00 XXXX XXXX XXXX XXXX XXXX XXX'}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold mt-0.5" style={{ color: p1 }}>▸</span>
                  <span>
                    <strong>Mobile Money :</strong>{' '}
                    {eb?.telephone ? `Coordonnées secrétariat : ${eb.telephone}` : 'Orange Money / Wave (+221 77 000 00 00)'}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold mt-0.5" style={{ color: p1 }}>▸</span>
                  <span>
                    <strong>Espèces :</strong>{' '}
                    {eb?.nom ? `à la caisse de ${eb.nom} (selon consignes du secrétariat)` : "à la caisse de l'université (Lun-Ven 8h-16h)"}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Informations importantes</div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start gap-2"><span className="text-amber-500 font-bold mt-0.5">▸</span><span>Cette facture est valable jusqu'au <strong>{fmtDate(facture.date_echeance)}</strong></span></div>
                <div className="flex items-start gap-2"><span className="text-amber-500 font-bold mt-0.5">▸</span><span>Joindre le numéro de dossier lors du paiement</span></div>
                <div className="flex items-start gap-2"><span className="text-amber-500 font-bold mt-0.5">▸</span><span>L'inscription est confirmée après réception du paiement</span></div>
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="flex justify-between items-end border-t border-gray-100 pt-6">
            <div className="text-xs text-gray-400 max-w-xs">
              <p>Ce document a été généré électroniquement et est valide sans signature manuscrite.</p>
              <p className="mt-1">Référence dossier : <strong className="font-mono text-gray-600">{dossierId}</strong></p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400 mb-4">
                {eb?.nom ? `Pour ${eb.nom}` : "Pour l'administration"}
              </div>
              <div className="w-44 min-h-[4.5rem] border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center p-2 mx-auto ml-auto">
                {eb?.cachet_url ? (
                  <img src={eb.cachet_url} alt="Cachet officiel" className="max-h-20 max-w-full object-contain" />
                ) : (
                  <div className="text-center py-2">
                    <div className="text-xs text-gray-400">Cachet & Signature</div>
                  </div>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-500 font-semibold">Le Directeur des Études</div>
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div className="bg-gray-900 text-gray-400 text-center py-4 px-10">
          <p className="text-xs">
            {eb?.nom ? eb.nom : 'UniPréinscription · Dakar, Sénégal'}
            {eb?.email_contact || eb?.telephone
              ? ` · ${[eb.email_contact, eb.telephone].filter(Boolean).join(' · ')}`
              : ' · contact@universite.sn · Tél : +221 33 000 00 00'}
          </p>
          <p className="text-xs mt-1 text-gray-500">Document généré le {fmtDate(facture.created_at)} · Facture N° {facture.numero}</p>
        </div>
      </div>
    </div>
  )
}
