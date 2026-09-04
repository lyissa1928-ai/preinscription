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
 * Lettre de préinscription — vraie lettre administrative A4 (pas une fiche dashboard).
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
        else if (err.code === 'ERR_NETWORK') setError("Impossible de joindre l'API.")
        else setError(err.message || 'Erreur de chargement')
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
  const photoSrc = mediaUrl(data.photo_url)
  const logoSrc = mediaUrl(etab?.logo_url)
  const year = new Date().getFullYear()
  const refLettre = ext.reference_lettre || `LPI-${year}-${String(dossier.id).padStart(5, '0')}`
  const formationTitre = formation?.titre || dossier?.filiere || '—'
  const typeLabel = dossier.type_formation === 'en_ligne' || formation?.type === 'en_ligne'
    ? 'formation à distance (FAD)'
    : 'formation en présentiel'
  const annee = dossier.annee_academique || `${year}-${year + 1}`
  const ville = etab?.ville || etab?.adresse?.split(',').pop()?.trim() || 'Dakar'
  const prenom = (etudiant.prenom || dossier.prenom || '').trim()
  const nom = (etudiant.nom || dossier.nom || '').trim().toUpperCase()
  const dateNaissance = dossier.date_naissance || etudiant.date_naissance || null
  const lieuNaissance = dossier.lieu_naissance || etudiant.lieu_naissance || null
  const nin = dossier.numero_piece || dossier.numero_passeport || ext.numero_passeport || etudiant.numero_piece || null
  const adresse = dossier.adresse || etudiant.adresse || null
  const paysOrigine = dossier.pays_residence || dossier.nationalite || etudiant.nationalite || null
  const email = etudiant.email || dossier.email || null
  const primary = etab?.couleur_primaire || '#1e3a8a'
  const secondary = etab?.couleur_secondaire || '#0f172a'
  const niveau = ext.niveau || formation?.niveau

  const identityLines = [
    ['Nom complet', `${prenom} ${nom}`],
    dateNaissance && ['Date de naissance', `${fmtDate(dateNaissance)}${lieuNaissance ? ` — ${lieuNaissance}` : ''}`],
    nin && ['NIN / Passeport', nin],
    email && ['Courriel', email],
    adresse && ['Adresse', adresse],
    paysOrigine && ['Nationalité / Pays', paysOrigine],
  ].filter(Boolean)

  const formationLines = [
    ['Formation', formationTitre],
    niveau && ['Niveau', niveau],
    ['Modalité', typeLabel],
    ['Année académique', annee],
    formation?.duree && ['Durée', formation.duree],
  ].filter(Boolean)

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
        className="print-page relative mx-auto flex min-h-[297mm] w-full max-w-[210mm] flex-col bg-white text-[12.5px] leading-[1.55] text-slate-800 shadow-xl"
        style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
      >
        {/* En-tête centré type papier à en-tête */}
        <header className="relative border-b border-slate-300 px-[16mm] pb-4 pt-[12mm]">
          {/* Photo — coin haut droit */}
          <div
            className="absolute right-[16mm] top-[12mm] border border-slate-400 bg-white p-[1.5px]"
            style={{ fontFamily: 'system-ui, sans-serif' }}
          >
            {photoSrc ? (
              <img src={photoSrc} alt="Photo du candidat" className="h-[28mm] w-[22mm] object-cover" />
            ) : (
              <div className="flex h-[28mm] w-[22mm] items-center justify-center bg-slate-50 text-[8px] text-slate-400">
                Photo
              </div>
            )}
          </div>

          <div className="mx-auto flex max-w-[130mm] flex-col items-center pr-[24mm] text-center">
            {logoSrc ? (
              <img src={logoSrc} alt="" className="mb-2 h-[15mm] w-[15mm] object-contain" />
            ) : (
              <div
                className="mb-2 flex h-[14mm] w-[14mm] items-center justify-center text-xs font-bold text-white"
                style={{ background: primary, fontFamily: 'system-ui, sans-serif' }}
              >
                {(etab?.nom || 'ET').slice(0, 2).toUpperCase()}
              </div>
            )}
            <p
              className="text-[13px] font-bold uppercase tracking-[0.12em]"
              style={{ color: primary, fontFamily: 'system-ui, sans-serif' }}
            >
              {etab?.nom || 'Établissement'}
            </p>
            {etab?.description && (
              <p className="mt-0.5 text-[9px] italic text-slate-500">{etab.description}</p>
            )}
            <div
              className="mt-1.5 space-y-0.5 text-[8.5px] leading-snug text-slate-600"
              style={{ fontFamily: 'system-ui, sans-serif' }}
            >
              {etab?.adresse && <p>{etab.adresse}</p>}
              <p>
                {[etab?.telephone && `Tél. ${etab.telephone}`, etab?.email_contact].filter(Boolean).join(' · ')}
              </p>
              {(etab?.ninea || etab?.rc || etab?.arrete) && (
                <p className="text-[8px] text-slate-500">
                  {[
                    etab.ninea && `NINEA ${etab.ninea}`,
                    etab.rc && `RC ${etab.rc}`,
                    etab.arrete && `Arrêté : ${etab.arrete}`,
                  ]
                    .filter(Boolean)
                    .join(' — ')}
                </p>
              )}
            </div>
          </div>
        </header>

        {/* Références */}
        <div
          className="flex justify-between gap-4 px-[16mm] pt-4 text-[11px]"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          <div className="space-y-0.5">
            <p>
              N/Réf. : <strong className="font-mono">{refLettre}</strong>
            </p>
            <p>
              Dossier : <strong className="font-mono">{dossier.numero_dossier}</strong>
            </p>
            {ext.matricule_candidat && (
              <p>
                Matricule : <strong className="font-mono">{ext.matricule_candidat}</strong>
              </p>
            )}
          </div>
          <p className="text-right">
            {ville}, le {fmtDate(new Date())}
          </p>
        </div>

        <h1
          className="mx-[16mm] mt-5 border-b pb-1.5 text-center text-[13px] font-bold uppercase tracking-[0.16em]"
          style={{ color: secondary, borderColor: primary, fontFamily: 'system-ui, sans-serif' }}
        >
          Lettre de préinscription
        </h1>

        <div className="flex flex-1 flex-col px-[16mm] py-4">
          <p className="font-semibold">Madame, Monsieur {prenom} {nom},</p>

          <p className="mt-3">
            <span className="font-semibold">Objet :</span> Confirmation de préinscription — {formationTitre} — année
            académique {annee}
          </p>

          <div className="mt-4 space-y-3 text-justify">
            <p>
              Nous avons le plaisir de vous informer que votre demande de préinscription pour l&apos;année académique{' '}
              <strong>{annee}</strong> a été <strong>acceptée</strong> par notre commission pédagogique.
            </p>
            <p>
              Vous êtes ainsi préinscrit(e) à la formation <strong>{formationTitre}</strong>
              {niveau ? <> ({niveau})</> : null}, en {typeLabel}
              {formation?.duree ? (
                <>
                  , pour une durée de <strong>{formation.duree}</strong>
                </>
              ) : null}
              .
            </p>
            <p>
              La présente lettre confirme votre place sous réserve de la finalisation administrative et financière de
              votre inscription. Les modalités de paiement figurent sur la facture proforma qui vous a été ou vous sera
              communiquée.
            </p>
          </div>

          {/* Annexe discrète — traits fins, pas de bandeaux colorés */}
          <div
            className="mt-5 border border-slate-300"
            style={{ fontFamily: 'system-ui, sans-serif' }}
          >
            <p
              className="border-b border-slate-300 bg-slate-50 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-600"
            >
              Récapitulatif
            </p>
            <div className="grid grid-cols-2 divide-x divide-slate-200 text-[10.5px]">
              <div className="divide-y divide-slate-100">
                {identityLines.map(([k, v]) => (
                  <div key={k} className="flex gap-2 px-3 py-1.5">
                    <span className="w-[28mm] shrink-0 text-slate-500">{k}</span>
                    <span className="min-w-0 font-medium text-slate-900 break-words">{v}</span>
                  </div>
                ))}
              </div>
              <div className="divide-y divide-slate-100">
                {formationLines.map(([k, v]) => (
                  <div key={k} className="flex gap-2 px-3 py-1.5">
                    <span className="w-[28mm] shrink-0 capitalize text-slate-500">{k}</span>
                    <span className="min-w-0 font-medium text-slate-900 break-words">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="font-semibold">Formalités à accomplir :</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-[12px]">
              <li>Régler les frais selon la facture proforma.</li>
              <li>Déposer les pièces justificatives originales auprès du service de la scolarité.</li>
              <li>Conserver la présente lettre jusqu&apos;à l&apos;inscription définitive.</li>
            </ol>
          </div>

          <p className="mt-4">
            Nous vous souhaitons la bienvenue au sein de notre établissement et restons à votre disposition pour toute
            information complémentaire.
          </p>

          <p className="mt-3">
            Veuillez agréer, Madame, Monsieur, l&apos;expression de nos salutations distinguées.
          </p>

          <div className="mt-6 flex justify-end">
            <div className="text-center" style={{ fontFamily: 'system-ui, sans-serif' }}>
              <CachetScolarite cachetUrl={etab?.cachet_url} className="w-44" />
              <p className="mt-1 text-[10px] font-semibold text-slate-600">
                {[etab?.signataire_fonction, etab?.signataire_nom].filter(Boolean).join(' — ') ||
                  'Pour la scolarité'}
              </p>
            </div>
          </div>
        </div>

        <footer
          className="mt-auto border-t border-slate-300 px-[16mm] py-2.5 text-center text-[8.5px] leading-snug text-slate-500"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          <p>
            Document émis électroniquement le {fmtDate(new Date())} · Réf. {refLettre} · Ne constitue pas une
            inscription définitive.
          </p>
          <p className="mt-0.5">
            {[etab?.nom, etab?.email_contact, etab?.telephone].filter(Boolean).join(' · ')}
          </p>
        </footer>
        <div className="h-[2px] w-full" style={{ background: primary }} />
      </article>
    </div>
  )
}
