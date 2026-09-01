import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { mediaUrl } from '../utils/mediaUrl'
import CachetScolarite from '../components/CachetScolarite'
import DocumentDownloadBar from '../components/DocumentDownloadBar'
import { resolveAffichageCandidat, resolveFormationAffichage } from '../utils/attestationDisplay'

const fmtDate = (d) => {
  if (d == null || d === '') return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function AttestationPreinscription() {
  const { dossierId } = useParams()
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
        ? `/api/etudiant/attestation/${dossierId}`
        : `/api/responsable/attestation/${dossierId}`
    axios
      .get(url)
      .then(({ data: d }) => setData(d))
      .catch((err) => {
        const msg = err.response?.data?.message
        if (msg) setError(msg)
        else if (err.code === 'ERR_NETWORK') {
          setError('Impossible de joindre l’API. Vérifiez le backend (port 5000) et l’URL du frontend (ex. localhost:5173).')
        } else setError(err.message || 'Erreur de chargement')
      })
      .finally(() => setLoading(false))
  }, [dossierId, user?.role, authLoading])

  useEffect(() => {
    if (!data?.dossier) return
    const prev = document.title
    const ref =
      data.attestation_extensions?.reference_attestation ||
      `ATT-${new Date().getFullYear()}-${String(data.dossier.id).padStart(5, '0')}`
    document.title = ref
    return () => {
      document.title = prev
    }
  }, [data])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-indigo-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement de l’attestation…</p>
        </div>
      </div>
    )
  }

  if (error || !data?.dossier) {
    return (
      <div className="min-h-screen bg-slate-200 flex items-center justify-center">
        <div className="card max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Attestation indisponible</h2>
          <p className="text-gray-500 mb-6">{error || 'Données incomplètes.'}</p>
          <Link to="/dashboard" className="btn-primary">
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    )
  }

  const {
    dossier,
    etudiant,
    formation,
    etablissement: etab,
    formation_libelle,
    filiere_libelle,
    niveau_libelle,
    annee_academique,
    attestation_extensions: ext = {},
  } = data

  const primary = etab?.couleur_primaire || '#1e3a8a'
  const secondary = etab?.couleur_secondaire || '#4f46e5'
  const bandStyle = { background: `linear-gradient(to right, ${primary}, ${secondary})` }
  const logoSrc = mediaUrl(etab?.logo_url)
  const refAtt = ext.reference_attestation || `ATT-${new Date().getFullYear()}-${String(dossier.id).padStart(5, '0')}`

  const { prenom: prenomT, nom: nomT, email: emailT, nomComplet } = resolveAffichageCandidat({ etudiant, dossier })
  const form = resolveFormationAffichage({
    formation_libelle,
    filiere_libelle,
    niveau_libelle,
    annee_academique,
    dossier,
    formation,
  })
  const nDossier = dossier?.numero_dossier || ext?.numero_dossier || '—'

  const texteCorps = `Nous attestons que ${nomComplet} est admis(e) en ${form.formation_libelle} pour l’année académique ${form.annee_academique}, sous réserve des formalités d’inscription définitive.`

  return (
    <div className="lettre-print-scope min-h-screen bg-slate-200 py-8 px-4">
      <DocumentDownloadBar
        documentRef={documentRef}
        filename={`${refAtt}.pdf`}
        primaryColor={primary}
        className="mx-auto mb-5 flex max-w-3xl flex-wrap items-center justify-between gap-3"
      />

      <div
        ref={documentRef}
        className="print-page max-w-3xl mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden"
      >
        <div className="h-2" style={bandStyle} />

        <div className="px-8 pt-8 pb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt=""
                  className="w-16 h-16 object-contain rounded-lg border border-gray-100 bg-white p-1 shrink-0"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center shadow text-white text-xs font-bold shrink-0"
                  style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
                >
                  {(etab?.nom || 'U').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Attestation de préinscription</p>
                <h1 className="text-xl font-black mt-0.5" style={{ color: primary }}>
                  {etab?.nom || 'Établissement'}
                </h1>
                {etab?.adresse && <p className="text-xs text-gray-600 mt-1 max-w-md">{etab.adresse}</p>}
                {(etab?.telephone || etab?.email_contact) && (
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {[etab.telephone, etab.email_contact].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right text-[11px] text-gray-500 shrink-0">
              <p className="font-mono font-semibold text-gray-800">{refAtt}</p>
              <p>Émis le {fmtDate(new Date())}</p>
            </div>
          </div>
        </div>

        <div className="mx-8 border-t border-gray-100" />

        <div className="px-8 py-6 space-y-5 text-gray-800">
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500">Bénéficiaire</h2>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <dt className="text-gray-400 text-[11px] uppercase">Prénom(s)</dt>
                <dd className="font-semibold text-base">{prenomT}</dd>
              </div>
              <div>
                <dt className="text-gray-400 text-[11px] uppercase">Nom</dt>
                <dd className="font-semibold text-base uppercase">{nomT}</dd>
              </div>
              {emailT && (
                <div className="sm:col-span-2">
                  <dt className="text-gray-400 text-[11px] uppercase">E-mail</dt>
                  <dd className="font-medium">{emailT}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-400 text-[11px] uppercase">N° dossier</dt>
                <dd className="font-mono font-semibold">{nDossier || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400 text-[11px] uppercase">Date de préinscription</dt>
                <dd className="font-medium">{fmtDate(dossier.created_at || dossier.date_acceptation)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-gray-100 bg-slate-50/90 px-4 py-3">
            <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Formation</h2>
            <dl className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-400 text-[11px] uppercase">Filière</dt>
                <dd className="font-semibold">{form.filiere_libelle}</dd>
              </div>
              <div>
                <dt className="text-gray-400 text-[11px] uppercase">Intitulé</dt>
                <dd className="font-semibold">{form.formation_libelle}</dd>
              </div>
              <div>
                <dt className="text-gray-400 text-[11px] uppercase">Niveau</dt>
                <dd className="font-medium">{form.niveau_libelle}</dd>
              </div>
              <div>
                <dt className="text-gray-400 text-[11px] uppercase">Année académique</dt>
                <dd className="font-medium">{form.annee_academique}</dd>
              </div>
            </dl>
          </div>

          <div className="border-l-4 pl-4 py-0.5" style={{ borderColor: primary }}>
            <p className="text-[15px] leading-relaxed font-medium">{texteCorps}</p>
            {ext.texte_officiel_base && (
              <p className="text-sm text-gray-600 mt-3 leading-relaxed">{ext.texte_officiel_base}</p>
            )}
          </div>

          <div className="flex flex-col items-center pt-4 pb-1">
            <CachetScolarite cachetUrl={etab?.cachet_url} />
            <p className="text-xs text-gray-400 mt-3">Fait à {etab?.nom || '…'}, le {fmtDate(new Date())}</p>
          </div>

          <p className="text-center text-[10px] text-gray-400 pt-2 border-t border-dashed border-gray-100">
            Document officiel — {refAtt} — ne remplace pas l’inscription définitive.
          </p>
        </div>

        <div className="h-2" style={bandStyle} />
      </div>
    </div>
  )
}
