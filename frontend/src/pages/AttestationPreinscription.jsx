import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { mediaUrl } from '../utils/mediaUrl'

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

  const qrSrc = useMemo(() => {
    if (!data?.attestation_extensions?.verification_id) return null
    const payload = data.attestation_extensions.verification_id
    return `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(payload)}`
  }, [data])

  const handlePrint = () => window.print()

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

  if (error) {
    return (
      <div className="min-h-screen bg-slate-200 flex items-center justify-center">
        <div className="card max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Attestation indisponible</h2>
          <p className="text-gray-500 mb-6">{error}</p>
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
    candidat,
    etablissement: etab,
    photo_url: rawPhoto,
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
  const photoSrc = mediaUrl(rawPhoto)
  const cachetSrc = mediaUrl(etab?.cachet_url)
  const refAtt = ext.reference_attestation || `ATT-${new Date().getFullYear()}-${String(dossier.id).padStart(5, '0')}`
  const verificationId = ext.verification_id || `${refAtt}-${String(dossier.id).padStart(4, '0')}`

  const prenomT = (etudiant.prenom || '').trim()
  const nomT = (etudiant.nom || '').trim()
  const nomComplet = [prenomT, nomT].filter(Boolean).join(' ') || '—'

  const texteCorps = `Nous attestons que l’étudiant(e) ${nomComplet} est admis(e) en ${formation_libelle} au titre de l’année académique ${annee_academique}.`

  return (
    <div className="lettre-print-scope min-h-screen bg-slate-200 py-8 px-4">
      <div className="no-print max-w-3xl mx-auto mb-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to={-1}
            className="flex items-center gap-2 font-medium text-sm bg-white px-4 py-2 rounded-lg border transition-colors"
            style={{ color: primary, borderColor: `${primary}55` }}
          >
            ← Retour
          </Link>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-md text-sm"
            style={{ backgroundColor: primary }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Imprimer / PDF
          </button>
        </div>
        <p className="text-xs text-gray-700 bg-amber-50/90 border border-amber-100 rounded-lg px-4 py-2.5 leading-relaxed">
          <span className="font-semibold text-amber-900">PDF propre :</span> dans la fenêtre d’impression, désactivez « En-têtes et pieds de page » avant d’enregistrer en PDF.
        </p>
      </div>

      <div className="print-page max-w-3xl mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden">
        <div className="h-2" style={bandStyle} />

        <div className="px-10 pt-8 pb-6">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-start gap-4 min-w-0">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt=""
                  className="w-16 h-16 object-contain rounded-xl border border-gray-100 bg-white p-1 shadow shrink-0"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center shadow text-white text-sm font-bold shrink-0"
                  style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
                >
                  {(etab?.nom || 'U').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Attestation de préinscription</p>
                <h1 className="text-xl font-black mt-1" style={{ color: primary }}>
                  {etab?.nom || 'Établissement'}
                </h1>
                {etab?.adresse && <p className="text-sm text-gray-600 mt-1">{etab.adresse}</p>}
                {(etab?.telephone || etab?.email_contact) && (
                  <p className="text-xs text-gray-500 mt-1">
                    {[etab.telephone, etab.email_contact].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right text-xs text-gray-500 shrink-0">
              <p className="font-mono font-bold text-gray-800">{refAtt}</p>
              <p>Émis le {fmtDate(new Date())}</p>
            </div>
          </div>
        </div>

        <div className="mx-10 border-t-2 border-gray-100" />

        <div className="px-10 py-8 space-y-8 text-gray-800">
          <div className="grid md:grid-cols-3 gap-6 items-start">
            <div className="md:col-span-2 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Informations étudiant</h2>
              <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-gray-400 text-xs uppercase">Nom et prénom</dt>
                  <dd className="font-semibold">{nomComplet}</dd>
                </div>
                <div>
                  <dt className="text-gray-400 text-xs uppercase">N° dossier</dt>
                  <dd className="font-mono font-semibold">{candidat?.numero_dossier || dossier.numero_dossier}</dd>
                </div>
                <div>
                  <dt className="text-gray-400 text-xs uppercase">Date de naissance</dt>
                  <dd className="font-semibold">{fmtDate(candidat?.date_naissance || dossier.date_naissance)}</dd>
                </div>
                <div>
                  <dt className="text-gray-400 text-xs uppercase">Nationalité</dt>
                  <dd className="font-semibold">{candidat?.nationalite || dossier.nationalite || '—'}</dd>
                </div>
              </dl>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Photo</p>
              {photoSrc ? (
                <img
                  src={photoSrc}
                  alt="Étudiant"
                  className="w-28 h-36 object-cover rounded-xl border-4 shadow-md mx-auto"
                  style={{ borderColor: primary }}
                />
              ) : (
                <div className="w-28 h-36 rounded-xl border-2 border-dashed border-gray-200 mx-auto flex items-center justify-center text-gray-400 text-xs">
                  Non fournie
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-slate-50/80 px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">Formation</h2>
            <dl className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-400 text-xs uppercase">Filière</dt>
                <dd className="font-semibold">{filiere_libelle || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400 text-xs uppercase">Formation</dt>
                <dd className="font-semibold">{formation_libelle}</dd>
              </div>
              <div>
                <dt className="text-gray-400 text-xs uppercase">Niveau</dt>
                <dd className="font-semibold">{niveau_libelle}</dd>
              </div>
              <div>
                <dt className="text-gray-400 text-xs uppercase">Année académique</dt>
                <dd className="font-semibold">{annee_academique}</dd>
              </div>
            </dl>
          </div>

          <div className="border-l-4 pl-5 py-1" style={{ borderColor: primary }}>
            <p className="text-base leading-relaxed font-medium">{texteCorps}</p>
            {ext.texte_officiel_base && (
              <p className="text-sm text-gray-600 mt-3 leading-relaxed">{ext.texte_officiel_base}</p>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-8 pt-4 items-end">
            <div className="text-center md:text-left">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Vérification</p>
              {qrSrc && (
                <img src={qrSrc} alt="QR code" className="w-[140px] h-[140px] mx-auto md:mx-0 border border-gray-100 rounded-lg bg-white p-1" />
              )}
              <p className="text-[11px] text-gray-400 mt-2 font-mono break-all">{verificationId}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Cachet établissement</p>
              {cachetSrc ? (
                <img src={cachetSrc} alt="Cachet" className="max-h-32 mx-auto object-contain" />
              ) : (
                <div
                  className="mx-auto w-36 h-24 rounded-xl border-2 border-dashed flex items-center justify-center text-gray-400 text-xs px-2"
                  style={{ borderColor: `${primary}44` }}
                >
                  Cachet
                </div>
              )}
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm font-bold text-gray-900">{etab?.signataire_nom || 'Le Responsable pédagogique'}</p>
              <p className="text-xs text-gray-500">{etab?.signataire_fonction || 'Pour le Directeur des études'}</p>
              <p className="text-xs text-gray-400 mt-4">Fait à {etab?.nom || '…'}, le {fmtDate(new Date())}</p>
            </div>
          </div>

          <p className="text-center text-[11px] text-gray-400 pt-4 border-t border-dashed border-gray-100">
            Document électronique — valable avec le QR de référence interne · {refAtt}
          </p>
        </div>

        <div className="h-2" style={bandStyle} />
      </div>
    </div>
  )
}
