import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import DocumentDownloadBar from '../components/DocumentDownloadBar'
import AttestationDocument from '../components/AttestationDocument'
import { resolveAffichageCandidat, resolveFormationAffichage } from '../utils/attestationDisplay'
import { getRoleHome } from '../utils/smartBack'

export default function AttestationDemandePreinscription() {
  const { demandeId } = useParams()
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const documentRef = useRef(null)

  useEffect(() => {
    if (authLoading) return
    setLoading(true)
    setError(null)
    const url =
      user?.role === 'etudiant'
        ? `/api/etudiant/attestation-demande/${demandeId}`
        : `/api/responsable/attestation-demande/${demandeId}`
    axios
      .get(url)
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(err.response?.data?.message || 'Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [demandeId, user?.role, authLoading])

  useEffect(() => {
    if (!data?.attestation_extensions?.reference_attestation) return
    const prev = document.title
    document.title = data.attestation_extensions.reference_attestation
    return () => {
      document.title = prev
    }
  }, [data])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-orange-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement de l’attestation…</p>
        </div>
      </div>
    )
  }

  if (error || !data?.demande) {
    return (
      <div className="min-h-screen bg-slate-200 flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Attestation indisponible</h2>
          <p className="text-gray-500 mb-6">{error || 'Données incomplètes.'}</p>
          <Link to={getRoleHome(user?.role)} className="btn-primary">
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    )
  }

  const {
    demande,
    etudiant,
    formation,
    etablissement: etab,
    formation_libelle,
    filiere_libelle,
    niveau_libelle,
    annee_academique,
    attestation_extensions: ext = {},
  } = data

  const primary = etab?.couleur_primaire || '#E5742A'
  const refAtt = ext.reference_attestation || `ATT-DEM-${demande?.id || ''}`
  const { prenom: prenomT, nom: nomT, email: emailT, nomComplet } = resolveAffichageCandidat({ etudiant, demande })
  const form = resolveFormationAffichage({
    formation_libelle,
    filiere_libelle,
    niveau_libelle,
    annee_academique,
    demande,
    formation,
  })
  const nDossier = demande?.reference || ext?.numero_dossier || `DEM-${demande?.id || '—'}`
  const texteCorps = `Nous attestons que ${nomComplet} est admis(e) en ${form.formation_libelle} pour l’année académique ${form.annee_academique}, sous réserve des formalités d’inscription définitive.`

  return (
    <div className="lettre-print-scope min-h-screen bg-slate-200 py-8 px-4">
      <DocumentDownloadBar
        documentRef={documentRef}
        filename={`${refAtt}.pdf`}
        primaryColor={primary}
        backFallback={getRoleHome(user?.role)}
        className="mx-auto mb-5 flex max-w-[210mm] flex-wrap items-center justify-between gap-3"
      />
      <AttestationDocument
        documentRef={documentRef}
        etab={etab}
        refAtt={refAtt}
        prenom={prenomT}
        nom={nomT}
        email={emailT}
        nDossier={nDossier}
        datePreinscription={demande.created_at || demande.date_acceptation}
        filiere={form.filiere_libelle}
        formationTitre={form.formation_libelle}
        niveau={form.niveau_libelle}
        anneeAcademique={form.annee_academique}
        texteCorps={texteCorps}
        texteOfficiel={ext.texte_officiel_base}
      />
    </div>
  )
}
