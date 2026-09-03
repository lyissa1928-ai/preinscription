/**
 * Attestation de préinscription — template de référence (A4).
 * Identité visuelle 100 % dynamique par établissement (logo, couleurs, coords, cachet).
 * Pas de photo candidat (contrairement à la lettre).
 */
import CachetScolarite from './CachetScolarite'
import { mediaUrl } from '../utils/mediaUrl'

const fmtDate = (d) => {
  if (d == null || d === '') return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function SectionTitle({ children, color }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white text-xs font-bold shadow-sm"
        style={{ background: color }}
        aria-hidden
      >
        ◆
      </span>
      <h2 className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color }}>
        {children}
      </h2>
    </div>
  )
}

function Field({ label, value, color }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-wide" style={{ color }}>
        {label}
      </dt>
      <dd className="mt-0.5 text-[13px] font-semibold text-slate-900 break-words">{value || '—'}</dd>
    </div>
  )
}

/**
 * @param {object} props
 * @param {object} props.etab
 * @param {string} props.refAtt
 * @param {string} props.prenom
 * @param {string} props.nom
 * @param {string} [props.email]
 * @param {string} props.nDossier
 * @param {string|Date} props.datePreinscription
 * @param {string} props.filiere
 * @param {string} props.formationTitre
 * @param {string} props.niveau
 * @param {string} props.anneeAcademique
 * @param {string} props.texteCorps
 * @param {string} [props.texteOfficiel]
 * @param {React.Ref} props.documentRef
 */
export default function AttestationDocument({
  etab,
  refAtt,
  prenom,
  nom,
  email,
  nDossier,
  datePreinscription,
  filiere,
  formationTitre,
  niveau,
  anneeAcademique,
  texteCorps,
  texteOfficiel,
  documentRef,
}) {
  const primary = etab?.couleur_primaire || '#E5742A'
  const secondary = etab?.couleur_secondaire || '#1e3a5f'
  const logoSrc = mediaUrl(etab?.logo_url)
  const siteWeb = (etab?.site_web || '').replace(/^https?:\/\//i, '') || null
  const valeurs = Array.isArray(etab?.valeurs_institutionnelles) && etab.valeurs_institutionnelles.length
    ? etab.valeurs_institutionnelles
    : ['Rigueur', 'Innovation', 'Professionnalisme', 'Engagement']
  const emitDate = fmtDate(new Date())
  const lieu = etab?.nom || 'l’établissement'

  return (
    <article
      ref={documentRef}
      className="print-page relative mx-auto max-w-[210mm] overflow-hidden bg-white text-[13px] leading-relaxed text-slate-800 shadow-2xl"
      style={{ '--att-primary': primary, '--att-secondary': secondary }}
    >
      {/* Accent géométrique haut droite */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-0 w-0 border-l-[72px] border-t-[72px] border-l-transparent"
        style={{ borderTopColor: primary }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-0 top-0 h-0 w-0 border-l-[48px] border-t-[48px] border-l-transparent opacity-80"
        style={{ borderTopColor: secondary }}
        aria-hidden
      />

      {/* En-tête */}
      <header className="relative z-[1] flex items-start justify-between gap-4 border-b-2 px-9 pb-5 pt-8" style={{ borderColor: primary }}>
        <div className="flex min-w-0 items-start gap-3">
          {logoSrc ? (
            <img src={logoSrc} alt="" className="h-[4.25rem] w-[4.25rem] shrink-0 object-contain" />
          ) : (
            <div
              className="flex h-[4.25rem] w-[4.25rem] shrink-0 items-center justify-center rounded-lg text-sm font-black text-white shadow"
              style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
            >
              {(etab?.nom || 'ET').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 pt-0.5">
            <p className="text-lg font-black uppercase tracking-wide" style={{ color: secondary }}>
              {etab?.nom || 'Établissement'}
            </p>
            {etab?.description && (
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: primary }}>
                {etab.description}
              </p>
            )}
          </div>
        </div>

        <div className="max-w-[15rem] shrink-0 text-right">
          <h1 className="text-[13px] font-black uppercase leading-tight tracking-[0.06em]" style={{ color: secondary }}>
            Attestation de préinscription
          </h1>
          <p className="mt-1 text-base font-black uppercase" style={{ color: primary }}>
            {etab?.nom || '—'}
          </p>
          <div className="mt-2 space-y-0.5 text-[10px] leading-snug text-slate-600">
            {etab?.adresse && <p>{etab.adresse}</p>}
            {etab?.telephone && <p>Tél. {etab.telephone}</p>}
            {etab?.email_contact && <p>{etab.email_contact}</p>}
          </div>
        </div>
      </header>

      {/* Références */}
      <div className="flex flex-wrap items-baseline justify-between gap-3 px-9 py-3 text-[11px]">
        <p className="font-mono font-bold text-slate-800">{refAtt}</p>
        <p className="text-slate-500">
          Émise le <span className="font-semibold text-slate-700">{emitDate}</span>
        </p>
      </div>

      <div className="space-y-5 px-9 pb-6 pt-1">
        {/* Bénéficiaire */}
        <section>
          <SectionTitle color={primary}>Bénéficiaire</SectionTitle>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border px-4 py-3" style={{ borderColor: `${primary}33` }}>
            <Field label="Prénom(s)" value={prenom} color={primary} />
            <Field label="Nom" value={(nom || '').toUpperCase()} color={primary} />
            <Field label="E-mail" value={email} color={primary} />
            <Field label="Date de préinscription" value={fmtDate(datePreinscription)} color={primary} />
            <div className="col-span-2">
              <Field label="N° dossier" value={nDossier} color={primary} />
            </div>
          </dl>
        </section>

        {/* Formation */}
        <section>
          <SectionTitle color={primary}>Formation</SectionTitle>
          <dl
            className="grid grid-cols-2 gap-4 rounded-lg border-2 bg-orange-50/30 px-4 py-3"
            style={{ borderColor: `${primary}55`, background: `${primary}0d` }}
          >
            <Field label="Filière" value={filiere} color={primary} />
            <Field label="Intitulé" value={formationTitre} color={primary} />
            <Field label="Niveau" value={niveau} color={primary} />
            <Field label="Année académique" value={anneeAcademique} color={primary} />
          </dl>
        </section>

        {/* Texte officiel */}
        <section
          className="rounded-lg border-l-4 px-4 py-3"
          style={{ borderColor: primary, background: `${primary}08` }}
        >
          <p className="text-[13px] font-medium leading-relaxed text-slate-800">{texteCorps}</p>
          {texteOfficiel && (
            <p className="mt-3 text-[12px] leading-relaxed text-slate-600">{texteOfficiel}</p>
          )}
        </section>

        {/* Signature / cachet — sans photo */}
        <section className="flex flex-wrap items-end justify-between gap-6 pt-2">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: secondary }}>
              La scolarité
            </p>
            <div className="mt-2">
              <CachetScolarite cachetUrl={etab?.cachet_url} />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Fait à {lieu}, le {emitDate}
            </p>
            {(etab?.signataire_nom || etab?.signataire_fonction) && (
              <p className="mt-1 text-[11px] text-slate-600">
                {[etab.signataire_fonction, etab.signataire_nom].filter(Boolean).join(' — ')}
              </p>
            )}
          </div>
          <div
            className="max-w-[9rem] rounded-md px-2 py-2 text-center text-[9px] font-bold uppercase leading-tight tracking-wide text-white"
            style={{ background: primary }}
          >
            {valeurs.map((v) => (
              <div key={v} className="py-0.5">{v}</div>
            ))}
          </div>
        </section>
      </div>

      {/* Pied */}
      <footer
        className="flex flex-wrap items-center justify-between gap-3 px-9 py-3 text-[10px] text-white"
        style={{ background: secondary }}
      >
        <div className="space-y-0.5">
          {siteWeb && <p className="font-semibold opacity-95">{siteWeb}</p>}
          <p className="opacity-80">
            Document officiel — {refAtt} — ne remplace pas l’inscription définitive
          </p>
        </div>
        {(etab?.ninea || etab?.rc) && (
          <p className="opacity-70">
            {[etab.ninea && `NINEA ${etab.ninea}`, etab.rc && `RC ${etab.rc}`].filter(Boolean).join(' · ')}
          </p>
        )}
      </footer>

      {/* Accent bas gauche */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-0 w-0 border-r-[56px] border-b-[56px] border-r-transparent"
        style={{ borderBottomColor: primary }}
        aria-hidden
      />
    </article>
  )
}
