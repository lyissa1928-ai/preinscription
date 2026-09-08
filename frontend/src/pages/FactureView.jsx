import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import DocumentDownloadBar from '../components/DocumentDownloadBar'
import FactureDocument from '../components/FactureDocument'
import { buildDisplayRows } from '../utils/factureDisplayRows'
import { useAuth } from '../context/AuthContext'
import { getRoleHome } from '../utils/smartBack'

const STAFF_EMAIL_ROLES = [
  'admin', 'admin_etablissement', 'responsable', 'responsable_fad',
  'agent_fad', 'comptable', 'agent_admin', 'controleur_qualite',
]

/** FAD : tél / e-mail FAD uniquement. Banque, NINEA, adresse = présentiel. */
function pickFadPhoneOrEmail(live, fadKey, presKey, enLigne) {
  if (enLigne && live?.[fadKey]) return live[fadKey]
  return live?.[presKey] || ''
}

export default function FactureView() {
  const { dossierId } = useParams()
  const { user } = useAuth()
  const home = getRoleHome(user?.role)
  const documentRef = useRef(null)
  const [facture, setFacture] = useState(null)
  const [etabLive, setEtabLive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [avecCachet, setAvecCachet] = useState(true)

  useEffect(() => {
    setLoading(true)
    setLoadError(null)
    setFacture(null)
    axios.get(`/api/factures/dossier/${dossierId}`)
      .then(({ data }) => setFacture(data))
      .catch((err) => {
        const status = err.response?.status
        const msg = err.response?.data?.message
        if (status === 403) {
          setLoadError(msg || 'Accès refusé à cette facture. Reconnectez-vous si votre rôle a récemment changé.')
          return
        }
        if (status === 404 && msg === 'Dossier non trouvé') {
          setLoadError('Dossier introuvable.')
          return
        }
        // Étudiant : facture uniquement auto à l’acceptation — pas de génération manuelle
        if (user?.role === 'etudiant') {
          setLoadError(
            msg === 'Aucune facture générée'
              ? 'Aucune facture disponible pour le moment. Elle est générée automatiquement dès l’acceptation de votre préinscription.'
              : (msg || 'Facture indisponible.'),
          )
          return
        }
        setGenerating(true)
        axios.post(`/api/factures/generer/${dossierId}`)
          .then(({ data }) => {
            setFacture(data)
            toast.success('Facture générée et enregistrée dans l’historique.')
          })
          .catch((genErr) => {
            const genMsg = genErr.response?.data?.message || 'Erreur génération facture'
            setLoadError(genMsg)
            toast.error(genMsg)
          })
          .finally(() => setGenerating(false))
      })
      .finally(() => setLoading(false))
  }, [dossierId, user?.role])

  useEffect(() => {
    const snap = facture?.etablissement_snapshot
    if (!facture) return
    const missing =
      !snap?.adresse || !snap?.telephone || !snap?.email_contact || !snap?.arrete
      || !snap?.rc || !(snap?.compte_bancaire || snap?.iban) || !snap?.swift
    if (!missing) return
    const tryIds = [facture?.etablissement_id, snap?.id, facture?.formation_snapshot?.etablissement_id].filter(Boolean)
    const applyList = (data) => {
      const list = Array.isArray(data) ? data : []
      const found = tryIds.length
        ? list.find((e) => tryIds.some((id) => Number(e.id) === Number(id)))
        : list.find((e) => e.nom && snap?.nom && e.nom === snap.nom)
      if (found) setEtabLive(found)
    }
    if (tryIds.length) {
      axios.get(`/api/etablissements/${tryIds[0]}`)
        .then(({ data }) => setEtabLive(data))
        .catch(() => axios.get('/api/etablissements').then(({ data }) => applyList(data)).catch(() => {}))
    } else {
      axios.get('/api/etablissements').then(({ data }) => applyList(data)).catch(() => {})
    }
  }, [facture])

  const mergeEtab = (snap = {}, live = null, formationType = '') => {
    const enLigne = formationType === 'en_ligne'
    return {
      ...snap,
      email_contact:
        snap.email_contact
        || pickFadPhoneOrEmail(live, 'email_contact_fad', 'email_contact', enLigne)
        || '',
      telephone:
        snap.telephone
        || pickFadPhoneOrEmail(live, 'telephone_fad', 'telephone', enLigne)
        || '',
      rc: snap.rc || live?.rc || '',
      arrete: snap.arrete || live?.arrete || '',
      // Banque / NINEA / adresse : toujours présentiel (identiques FAD et présentiel)
      compte_bancaire: snap.compte_bancaire || live?.compte_bancaire || live?.iban || '',
      iban: snap.iban || live?.iban || '',
      swift: snap.swift || live?.swift || '',
      ninea: snap.ninea || live?.ninea || '',
      adresse: snap.adresse || live?.adresse || '',
      banque: snap.banque || live?.banque || '',
      cachet_url: snap.cachet_url || live?.cachet_url || null,
      logo_url: snap.logo_url || live?.logo_url || null,
      nom: snap.nom || live?.nom || '',
      couleur_primaire: snap.couleur_primaire || live?.couleur_primaire,
      couleur_secondaire: snap.couleur_secondaire || live?.couleur_secondaire,
    }
  }

  if (loading || generating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />
          <p className="font-medium text-gray-600">
            {generating ? 'Génération de votre facture…' : 'Chargement…'}
          </p>
        </div>
      </div>
    )
  }

  if (!facture) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="max-w-md px-4 text-center">
          <p className="mb-2 text-lg font-semibold text-gray-800">Facture introuvable</p>
          {loadError && <p className="mb-4 text-sm text-gray-500">{loadError}</p>}
          <Link to={home} className="btn-primary">Retour</Link>
        </div>
      </div>
    )
  }

  const et = facture.etudiant_snapshot || {}
  const fo = facture.formation_snapshot || {}
  const eb = mergeEtab(facture.etablissement_snapshot || {}, etabLive, fo.type)
  const primary = eb.couleur_primaire || '#1e40af'
  const { rows, totalAPayer } = buildDisplayRows(facture, fo)
  const isEtudiant = user?.role === 'etudiant'
  // Étudiant : pas de choix cachet — toujours avec cachet si disponible
  const showCachet =
    (isEtudiant || avecCachet) &&
    facture.facture_avec_cachet !== false &&
    !!eb.cachet_url

  const canSendEmail = STAFF_EMAIL_ROLES.includes(user?.role)

  const sendFactureEmail = async () => {
    const { data } = await axios.post(`/api/responsable/dossiers/${dossierId}/envoyer-facture-email`)
    toast.success(data.message || 'Facture envoyée par e-mail.')
  }

  return (
    <div className="lettre-print-scope min-h-screen bg-slate-200 px-4 py-8">
      <DocumentDownloadBar
        documentRef={documentRef}
        filename={`${facture.numero || 'facture'}.pdf`}
        primaryColor={primary}
        backFallback={home}
        onSendEmail={canSendEmail ? sendFactureEmail : undefined}
      />

      {!isEtudiant && (
        <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-end gap-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
          <span className="font-semibold text-slate-700">Cachet sur le PDF :</span>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="radio" name="cachet_view" checked={avecCachet} onChange={() => setAvecCachet(true)} />
            Avec cachet
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="radio" name="cachet_view" checked={!avecCachet} onChange={() => setAvecCachet(false)} />
            Sans cachet
          </label>
        </div>
      )}

      <div className="a4-preview-stage">
        <FactureDocument
          documentRef={documentRef}
          etab={eb}
          facture={facture}
          etudiant={et}
          formation={{
            titre: fo.titre,
            niveau: fo.niveau,
            niveau_requis: fo.niveau_requis,
            nombre_annees: fo.nombre_annees,
            type: fo.type,
            duree: fo.duree_formation || fo.duree,
            description: fo.description || '',
            debouches: fo.debouches || '',
            duree_mois: fo.duree_mois,
            mensualite: fo.mensualite,
            frais_inscription: fo.frais_inscription,
            frais_bibliotheque: fo.frais_bibliotheque,
            frais_epi: fo.frais_epi,
            libelles_champs: fo.libelles_champs,
            annee_academique: facture.annee_academique || fo.annee_academique,
          }}
          rows={rows}
          totalAPayer={totalAPayer}
          showCachet={showCachet}
        />
      </div>
    </div>
  )
}
