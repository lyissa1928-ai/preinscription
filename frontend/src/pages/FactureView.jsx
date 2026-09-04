import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import DocumentDownloadBar from '../components/DocumentDownloadBar'
import FactureDocument from '../components/FactureDocument'
import { buildDisplayRows } from '../utils/factureDisplayRows'
import { useAuth } from '../context/AuthContext'
import { getRoleHome } from '../utils/smartBack'

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
  }, [dossierId])

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

  const mergeEtab = (snap = {}, live = null) => ({
    ...snap,
    email_contact: snap.email_contact || live?.email_contact || '',
    telephone: snap.telephone || live?.telephone || '',
    rc: snap.rc || live?.rc || '',
    arrete: snap.arrete || live?.arrete || '',
    compte_bancaire: snap.compte_bancaire || live?.compte_bancaire || live?.iban || '',
    iban: snap.iban || live?.iban || '',
    swift: snap.swift || live?.swift || '',
    ninea: snap.ninea || live?.ninea || '',
    adresse: snap.adresse || live?.adresse || '',
    cachet_url: snap.cachet_url || live?.cachet_url || null,
    logo_url: snap.logo_url || live?.logo_url || null,
    nom: snap.nom || live?.nom || '',
    couleur_primaire: snap.couleur_primaire || live?.couleur_primaire,
    couleur_secondaire: snap.couleur_secondaire || live?.couleur_secondaire,
  })

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
  const eb = mergeEtab(facture.etablissement_snapshot || {}, etabLive)
  const primary = eb.couleur_primaire || '#1e40af'
  const { rows, totalAPayer } = buildDisplayRows(facture, fo)

  return (
    <div className="lettre-print-scope min-h-screen bg-slate-200 px-4 py-8">
      <DocumentDownloadBar
        documentRef={documentRef}
        filename={`${facture.numero || 'facture'}.pdf`}
        primaryColor={primary}
        backFallback={home}
      />

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
        />
      </div>
    </div>
  )
}
