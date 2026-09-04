import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { mediaUrl } from '../utils/mediaUrl'
import CachetScolarite from '../components/CachetScolarite'
import DocumentDownloadBar from '../components/DocumentDownloadBar'
import { getRoleHome } from '../utils/smartBack'

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

/**
 * Lettre de préinscription — modèle unifié avec photo, identité complète et formation.
 */
export default function LettrePreinscription() {
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
    const url = user?.role === 'etudiant'
      ? `/api/etudiant/lettre/${dossierId}`
      : `/api/responsable/lettre/${dossierId}`
    axios.get(url)
      .then(({ data: d }) => setData(d))
      .catch((err) => {
        const msg = err.response?.data?.message
        if (msg) setError(msg)
        else if (err.code === 'ERR_NETWORK') {
          setError("Impossible de joindre l'API.")
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
          <p className="mt-2 text-sm text-slate-500">{error || 'Données incomplètes.'}</p>
          <Link to={getRoleHome(user?.role)} className="btn-primary mt-6 inline-block">Retour</Link>
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

  // Identité complète demandeur
  const dateNaissance = dossier.date_naissance || etudiant.date_naissance || null
  const lieuNaissance = dossier.lieu_naissance || etudiant.lieu_naissance || null
  const nin = dossier.numero_piece || dossier.numero_passeport || ext.numero_passeport || etudiant.numero_piece || null
  const adresse = dossier.adresse || etudiant.adresse || null
  const paysOrigine = dossier.pays_residence || dossier.nationalite || etudiant.nationalite || null
  const email = etudiant.email || dossier.email || null

  const primary = etab?.couleur_primaire || '#1e3a8a'

  return (
    <div className="lettre-print-scope min-h-screen bg-slate-200 px-3 py-6 sm:px-4 sm:py-8">
      <DocumentDownloadBar
        documentRef={documentRef}
        filename={`${refLettre}.pdf`}
        primaryColor={primary}
        backFallback={getRoleHome(user?.role)}
      />
      <article
        ref={documentRef}
        className="print-page mx-auto flex min-h-[297mm] max-w-[210mm] flex-col bg-white text-[13.5px] leading-relaxed text-slate-800 shadow-xl"
      >
        <div className="h-2.5 shrink-0" style={{ background: `linear-gradient(90deg, ${primary}, ${etab?.couleur_secondaire || primary})` }} />

        {/* En-tête établissement */}
        <header className="lettre-print-header-root flex items-start justify-between gap-5 border-b border-slate-200 px-10 py-6">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            {logoSrc ? (
              <img src={logoSrc} alt="" className="h-[4.25rem] w-[4.25rem] shrink-0 object-contain" />
            ) : (
              <div
                className="flex h-[4.25rem] w-[4.25rem] shrink-0 items-center justify-center rounded border text-sm font-bold text-white"
                style={{ background: primary }}
              >
                {(etab?.nom || 'ET').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[15px] font-black uppercase leading-tight tracking-wide" style={{ color: primary }}>
                {etab?.nom || 'Établissement'}
              </p>
              {etab?.description && (
                <p className="mt-0.5 text-[11px] italic text-slate-500">{etab.description}</p>
              )}
              <div className="mt-2 space-y-0.5 text-[11px] leading-snug text-slate-600">
                {etab?.adresse && <p>{etab.adresse}</p>}
                {(etab?.telephone || etab?.email_contact) && (
                  <p>{[etab.telephone && `Tél. ${etab.telephone}`, etab.email_contact].filter(Boolean).join(' · ')}</p>
                )}
                {(etab?.ninea || etab?.rc) && (
                  <p className="text-[10px] text-slate-500">
                    {[etab.ninea && `NINEA ${etab.ninea}`, etab.rc && `RC ${etab.rc}`].filter(Boolean).join(' — ')}
                  </p>
                )}
                {etab?.arrete && <p className="text-[10px] text-slate-500">Arrêté : {etab.arrete}</p>}
              </div>
            </div>
          </div>

          <div className="shrink-0 text-center">
            {photoSrc ? (
              <img
                src={photoSrc}
                alt="Photo candidat"
                className="h-[7.5rem] w-[6rem] border border-slate-300 object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-[7.5rem] w-[6rem] items-center justify-center border border-dashed border-slate-300 bg-slate-50 text-[10px] text-slate-400">
                Photo
              </div>
            )}
          </div>
        </header>

        {/* Références + lieu/date */}
        <div className="flex flex-wrap items-start justify-between gap-4 px-10 py-4 text-[12.5px]">
          <div className="space-y-1">
            <p>
              <span className="text-slate-500">Réf. :</span>{' '}
              <strong className="font-mono tracking-wide">{refLettre}</strong>
            </p>
            <p>
              <span className="text-slate-500">N° dossier :</span>{' '}
              <strong className="font-mono">{dossier.numero_dossier}</strong>
            </p>
            {ext.matricule_candidat && (
              <p>
                <span className="text-slate-500">Matricule :</span>{' '}
                <strong className="font-mono">{ext.matricule_candidat}</strong>
              </p>
            )}
          </div>
          <p className="text-right font-medium text-slate-700">
            {ville}, le {fmtDate(new Date())}
          </p>
        </div>

        <h1
          className="mx-10 border-b-2 pb-2 text-center text-[14px] font-black uppercase tracking-[0.12em]"
          style={{ color: primary, borderColor: primary }}
        >
          Lettre de préinscription
        </h1>

        <div className="flex flex-1 flex-col space-y-4 px-10 py-5">
          <p className="font-semibold text-[13.5px]">
            Madame, Monsieur {prenom} {nom},
          </p>

          <p className="text-[13.5px]">
            <span className="font-semibold">Objet :</span> Confirmation de préinscription — {formationTitre} — année
            académique {annee}
          </p>

          <div className="space-y-3 text-justify text-[13.5px] leading-[1.55]">
            <p>
              Nous avons le plaisir de vous informer que votre demande de préinscription pour l&apos;année académique{' '}
              <strong>{annee}</strong> a été <strong>acceptée</strong> par notre commission pédagogique.
            </p>
            <p>
              Vous êtes ainsi préinscrit(e) à la formation <strong>{formationTitre}</strong> ({typeLabel})
              {formation?.duree ? (
                <>
                  , pour une durée de <strong>{formation.duree}</strong>
                </>
              ) : null}
              .
            </p>
            <p>
              Cette lettre confirme votre place sous réserve de la finalisation administrative et financière de votre
              inscription. Les modalités de paiement figurent sur la facture proforma qui vous a été (ou sera)
              communiquée.
            </p>
          </div>

          <table className="mt-2 w-full border-collapse border border-slate-300 text-[12.5px]">
            <thead>
              <tr style={{ background: primary }}>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-white" colSpan={2}>
                  Informations du candidat
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="w-[38%] bg-slate-50 px-3 py-2 font-semibold text-slate-600">Nom complet</td>
                <td className="px-3 py-2 font-bold">
                  {prenom} {nom}
                </td>
              </tr>
              {dateNaissance && (
                <tr className="border-b border-slate-200">
                  <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-600">Date de naissance</td>
                  <td className="px-3 py-2">
                    {fmtDate(dateNaissance)}
                    {lieuNaissance ? ` — ${lieuNaissance}` : ''}
                  </td>
                </tr>
              )}
              {nin && (
                <tr className="border-b border-slate-200">
                  <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-600">NIN / Passeport</td>
                  <td className="px-3 py-2 font-mono">{nin}</td>
                </tr>
              )}
              {email && (
                <tr className="border-b border-slate-200">
                  <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-600">Courriel</td>
                  <td className="px-3 py-2 break-all">{email}</td>
                </tr>
              )}
              {adresse && (
                <tr className="border-b border-slate-200">
                  <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-600">Adresse</td>
                  <td className="px-3 py-2">{adresse}</td>
                </tr>
              )}
              {paysOrigine && (
                <tr className="border-b border-slate-200">
                  <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-600">Pays / Nationalité</td>
                  <td className="px-3 py-2">{paysOrigine}</td>
                </tr>
              )}
            </tbody>
            <thead>
              <tr style={{ background: primary }}>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-white" colSpan={2}>
                  Formation retenue
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-600">Intitulé</td>
                <td className="px-3 py-2 font-medium">{formationTitre}</td>
              </tr>
              {(ext.niveau || formation?.niveau) && (
                <tr className="border-b border-slate-200">
                  <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-600">Niveau</td>
                  <td className="px-3 py-2">{ext.niveau || formation?.niveau}</td>
                </tr>
              )}
              <tr className="border-b border-slate-200">
                <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-600">Modalité</td>
                <td className="px-3 py-2">{typeLabel}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="bg-slate-50 px-3 py-2 font-semibold text-slate-600">Année académique</td>
                <td className="px-3 py-2 font-semibold">{annee}</td>
              </tr>
            </tbody>
          </table>

          <div>
            <p className="font-semibold text-[13px]">Formalités à accomplir :</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-[12.5px]">
              <li>Régler les frais selon la facture proforma.</li>
              <li>Déposer les pièces justificatives originales auprès du service scolarité.</li>
              <li>Conserver la présente lettre jusqu&apos;à l&apos;inscription définitive.</li>
            </ol>
          </div>

          <p className="text-[13.5px]">
            Nous vous souhaitons la bienvenue au sein de notre établissement et restons à votre disposition pour toute
            information complémentaire.
          </p>

          <p className="text-[13.5px]">
            Veuillez agréer, Madame, Monsieur, l&apos;expression de nos salutations distinguées.
          </p>

          <div className="flex justify-end pt-2">
            <div className="text-center">
              <CachetScolarite cachetUrl={etab?.cachet_url} className="w-48" />
              <p className="mt-1 text-[11px] font-semibold text-slate-600">
                {[etab?.signataire_fonction, etab?.signataire_nom].filter(Boolean).join(' — ') ||
                  'Pour la scolarité, Le Responsable'}
              </p>
            </div>
          </div>
        </div>

        <footer className="mt-auto border-t border-slate-300 px-10 py-3 text-center text-[10px] leading-snug text-slate-500">
          <p>
            Document émis électroniquement le {fmtDate(new Date())} · Réf. {refLettre} · Ne constitue pas une inscription
            définitive.
          </p>
          {etab?.nom && (
            <p className="mt-0.5">
              {etab.nom}
              {(etab.email_contact || etab.telephone)
                ? ` · ${[etab.email_contact, etab.telephone].filter(Boolean).join(' · ')}`
                : ''}
              {etab?.ninea ? ` · NINEA ${etab.ninea}` : ''}
            </p>
          )}
        </footer>

        <div className="h-2 shrink-0" style={{ background: primary }} />
      </article>
    </div>
  )
}
