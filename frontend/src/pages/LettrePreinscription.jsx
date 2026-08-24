import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { mediaUrl } from '../utils/mediaUrl'
import CachetScolarite from '../components/CachetScolarite'

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

/**
 * Lettre de préinscription — modèle unique, administratif et professionnel.
 * Alimentée par les données du dossier / établissement / formation.
 */
export default function LettrePreinscription() {
  const { dossierId } = useParams()
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (authLoading) return
    setLoading(true)
    setError(null)
    const url = user?.role === 'etudiant'
      ? `/api/etudiant/lettre/${dossierId}`
      : `/api/responsable/lettre/${dossierId}`
    axios.get(url)
      .then(({ data: d }) => setData(d))
      .catch((err) => {
        const msg = err.response?.data?.message
        if (msg) setError(msg)
        else if (err.code === 'ERR_NETWORK') {
          setError('Impossible de joindre l’API. Vérifiez que le backend est démarré.')
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-slate-700" />
          <p className="text-sm text-slate-600">Chargement de la lettre…</p>
        </div>
      </div>
    )
  }

  if (error || !data?.dossier) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Lettre indisponible</h2>
          <p className="mt-2 text-sm text-slate-500">{error || 'Données incompletes.'}</p>
          <Link to="/dashboard" className="btn-primary mt-6 inline-block">Retour</Link>
        </div>
      </div>
    )
  }

  const { dossier, formation, etablissement: etab, lettre_extensions: ext = {} } = data
  const etudiant = data.etudiant || {}
  const logoSrc = mediaUrl(etab?.logo_url)
  const photoSrc = mediaUrl(data.photo_url)
  const year = new Date().getFullYear()
  const refLettre = ext.reference_lettre || `LPI-${year}-${String(dossier.id).padStart(5, '0')}`
  const formationTitre = formation?.titre || dossier?.filiere || '—'
  const typeLabel = dossier.type_formation === 'en_ligne' || formation?.type === 'en_ligne'
    ? 'Formation à distance (FAD)'
    : 'Formation en présentiel'
  const annee = dossier.annee_academique || `${year}-${year + 1}`
  const ville = etab?.adresse?.split(',').pop()?.trim() || 'Dakar'
  const prenom = (etudiant.prenom || dossier.prenom || '').trim()
  const nom = (etudiant.nom || dossier.nom || '').trim().toUpperCase()

  return (
    <div className="lettre-print-scope min-h-screen bg-slate-200 px-4 py-8">
      {/* Actions écran */}
      <div className="no-print mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3">
        <Link to={-1} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          ← Retour
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-slate-800"
        >
          Imprimer / Enregistrer PDF
        </button>
      </div>
      <p className="no-print mx-auto mb-4 max-w-[210mm] rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
        Pour un PDF sans URL ni date du navigateur : dans la fenêtre d’impression, désactivez « En-têtes et pieds de page ».
      </p>

      {/* Document A4 */}
      <article className="print-page mx-auto max-w-[210mm] bg-white px-10 py-10 text-[13px] leading-relaxed text-slate-800 shadow-xl sm:px-14 sm:py-12">

        {/* En-tête établissement */}
        <header className="lettre-print-header-root flex items-start justify-between gap-6 border-b-2 border-slate-800 pb-5">
          <div className="flex min-w-0 items-start gap-4">
            {logoSrc ? (
              <img src={logoSrc} alt="" className="h-16 w-16 shrink-0 object-contain" />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-50 text-sm font-bold text-slate-600">
                {(etab?.nom || 'ET').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-base font-bold uppercase tracking-wide text-slate-900">
                {etab?.nom || 'Établissement'}
              </p>
              <div className="mt-1 space-y-0.5 text-[11px] text-slate-600">
                {etab?.adresse && <p>{etab.adresse}</p>}
                {(etab?.telephone || etab?.email_contact) && (
                  <p>
                    {[etab.telephone && `Tél. ${etab.telephone}`, etab.email_contact].filter(Boolean).join(' · ')}
                  </p>
                )}
                {(etab?.ninea || etab?.site_web) && (
                  <p>
                    {[etab.ninea && `NINEA ${etab.ninea}`, etab.site_web].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </div>
          </div>
          {photoSrc && (
            <img
              src={photoSrc}
              alt=""
              className="h-24 w-20 shrink-0 object-cover border border-slate-300"
            />
          )}
        </header>

        {/* Références + lieu/date */}
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4 text-[12px]">
          <div className="space-y-0.5">
            <p><span className="text-slate-500">Référence :</span> <strong className="font-mono">{refLettre}</strong></p>
            <p><span className="text-slate-500">N° dossier :</span> <strong className="font-mono">{dossier.numero_dossier}</strong></p>
            {ext.matricule_candidat && (
              <p><span className="text-slate-500">Matricule :</span> <strong className="font-mono">{ext.matricule_candidat}</strong></p>
            )}
          </div>
          <p className="text-right">
            {ville}, le {fmtDate(new Date())}
          </p>
        </div>

        {/* Titre */}
        <h1 className="mt-8 text-center text-lg font-bold uppercase tracking-[0.12em] text-slate-900 underline decoration-slate-800 underline-offset-4">
          Lettre de préinscription
        </h1>

        {/* Destinataire */}
        <div className="mt-8">
          <p className="font-semibold">
            Madame, Monsieur {prenom} {nom},
          </p>
        </div>

        {/* Objet */}
        <p className="mt-5">
          <span className="font-semibold">Objet :</span>{' '}
          Confirmation de préinscription — {formationTitre} — année académique {annee}
        </p>

        {/* Corps */}
        <div className="mt-6 space-y-4 text-justify">
          <p>
            Nous avons le plaisir de vous informer que votre demande de préinscription pour
            l’année académique <strong>{annee}</strong> a été <strong>acceptée</strong> par
            notre commission pédagogique.
          </p>
          <p>
            Vous êtes ainsi préinscrit(e) à la formation <strong>{formationTitre}</strong>
            {' '}({typeLabel})
            {formation?.duree ? <>, pour une durée de <strong>{formation.duree}</strong></> : null}.
          </p>
          <p>
            Cette lettre confirme votre place sous réserve de la finalisation administrative
            et financière de votre inscription, conformément au règlement de l’établissement.
            Les modalités de paiement figurent sur la facture proforma qui vous a été
            (ou sera) communiquée.
          </p>
        </div>

        {/* Tableau récapitulatif simple */}
        <table className="mt-8 w-full border-collapse border border-slate-300 text-[12px]">
          <tbody>
            <tr className="border-b border-slate-300">
              <td className="w-1/3 bg-slate-50 px-3 py-2 font-semibold text-slate-600">Candidat</td>
              <td className="px-3 py-2 font-medium">{prenom} {nom}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-600">Courriel</td>
              <td className="px-3 py-2">{etudiant.email || dossier.email || '—'}</td>
            </tr>
            {dossier.date_naissance && (
              <tr className="border-b border-slate-300">
                <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-600">Date de naissance</td>
                <td className="px-3 py-2">{fmtDate(dossier.date_naissance)}</td>
              </tr>
            )}
            {ext.numero_passeport && (
              <tr className="border-b border-slate-300">
                <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-600">Passeport / pièce</td>
                <td className="px-3 py-2 font-mono">{ext.numero_passeport}</td>
              </tr>
            )}
            {(ext.nationalite || dossier.nationalite) && (
              <tr className="border-b border-slate-300">
                <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-600">Nationalité</td>
                <td className="px-3 py-2">{ext.nationalite || dossier.nationalite}</td>
              </tr>
            )}
            <tr className="border-b border-slate-300">
              <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-600">Formation</td>
              <td className="px-3 py-2 font-medium">{formationTitre}</td>
            </tr>
            {(ext.niveau || formation?.niveau) && (
              <tr className="border-b border-slate-300">
                <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-600">Niveau</td>
                <td className="px-3 py-2">{ext.niveau || formation?.niveau}</td>
              </tr>
            )}
            <tr className="border-b border-slate-300">
              <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-600">Type</td>
              <td className="px-3 py-2">{typeLabel}</td>
            </tr>
            <tr>
              <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-600">Année académique</td>
              <td className="px-3 py-2">{annee}</td>
            </tr>
          </tbody>
        </table>

        {/* Formalités */}
        <div className="mt-6">
          <p className="font-semibold">Formalités à accomplir :</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Régler les frais selon la facture proforma.</li>
            <li>Déposer les pièces justificatives originales auprès du service scolarité.</li>
            <li>Conserver la présente lettre jusqu’à l’inscription définitive.</li>
          </ol>
        </div>

        <p className="mt-6">
          Nous vous souhaitons la bienvenue au sein de notre établissement et restons
          à votre disposition pour toute information complémentaire.
        </p>

        <p className="mt-4">
          Veuillez agréer, Madame, Monsieur, l’expression de nos salutations distinguées.
        </p>

        {/* Signature */}
        <div className="mt-10 flex justify-end">
          <CachetScolarite cachetUrl={etab?.cachet_url} className="w-56" />
        </div>

        {/* Pied */}
        <footer className="mt-12 border-t border-slate-300 pt-3 text-center text-[10px] text-slate-500">
          <p>
            Document émis électroniquement le {fmtDate(new Date())} · Réf. {refLettre}
            {' '}· Ne constitue pas une inscription définitive.
          </p>
          {etab?.nom && (
            <p className="mt-0.5">
              {etab.nom}
              {etab.email_contact || etab.telephone
                ? ` · ${[etab.email_contact, etab.telephone].filter(Boolean).join(' · ')}`
                : ''}
            </p>
          )}
        </footer>
      </article>
    </div>
  )
}
