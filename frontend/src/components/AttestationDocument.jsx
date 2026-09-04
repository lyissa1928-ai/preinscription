/**
 * Attestation de préinscription — template A4 administratif.
 * Identité visuelle dynamique par établissement (logo, couleurs, coords, cachet).
 * Pas de photo candidat (contrairement à la lettre).
 */
import CachetScolarite from './CachetScolarite'
import { mediaUrl } from '../utils/mediaUrl'

const fmtDate = (d) => {
  if (d == null || d === '') return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function Field({ label, value }) {
  return (
    <div className="min-w-0 border-b border-slate-100 py-2 last:border-0">
      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-[13.5px] font-semibold leading-snug text-slate-900 break-words">{value || '—'}</dd>
    </div>
  )
}

/**
 * @param {object} props
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
  const primary = etab?.couleur_primaire || '#1e3a8a'
  const secondary = etab?.couleur_secondaire || '#0f172a'
  const logoSrc = mediaUrl(etab?.logo_url)
  const siteWeb = (etab?.site_web || '').replace(/^https?:\/\//i, '') || null
  const emitDate = fmtDate(new Date())
  const lieu = etab?.ville || etab?.adresse?.split(',')?.pop()?.trim() || etab?.nom || '—'

  return (
    <article
      ref={documentRef}
      className="print-page relative mx-auto flex min-h-[297mm] max-w-[210mm] flex-col overflow-hidden bg-white text-[13.5px] leading-relaxed text-slate-800 shadow-2xl"
      style={{ '--att-primary': primary, '--att-secondary': secondary }}
    >
      {/* Bande institutionnelle */}
      <div className="h-2.5 shrink-0" style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }} />

      {/* En-tête */}
      <header className="lettre-print-header-root flex items-start justify-between gap-6 border-b px-10 pb-5 pt-7" style={{ borderColor: `${primary}55` }}>
        <div className="flex min-w-0 flex-1 items-start gap-4">
          {logoSrc ? (
            <img src={logoSrc} alt="" className="h-[4.5rem] w-[4.5rem] shrink-0 object-contain" />
          ) : (
            <div
              className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded text-sm font-black text-white"
              style={{ background: primary }}
            >
              {(etab?.nom || 'ET').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 pt-0.5">
            <p className="text-[15px] font-black uppercase leading-tight tracking-wide" style={{ color: secondary }}>
              {etab?.nom || 'Établissement'}
            </p>
            {etab?.description && (
              <p className="mt-0.5 text-[11px] font-medium italic text-slate-500">{etab.description}</p>
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
            </div>
          </div>
        </div>
        <div className="w-[11.5rem] shrink-0 text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Document officiel</p>
          <h1 className="mt-1 text-[13px] font-black uppercase leading-tight tracking-wide" style={{ color: primary }}>
            Attestation de préinscription
          </h1>
          <p className="mt-3 font-mono text-[11px] font-bold text-slate-800">{refAtt}</p>
          <p className="mt-1 text-[11px] text-slate-500">Émise le {emitDate}</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-10 py-6">
        <p className="text-center text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          Année académique {anneeAcademique || '—'}
        </p>

        {/* Corps synthétique */}
        <section className="mt-5 rounded border px-5 py-4" style={{ borderColor: `${primary}40`, background: `${primary}08` }}>
          <p className="text-[14px] font-medium leading-relaxed text-slate-800">{texteCorps}</p>
          {texteOfficiel ? (
            <p className="mt-3 border-t pt-3 text-[12.5px] leading-relaxed text-slate-600" style={{ borderColor: `${primary}25` }}>
              {texteOfficiel}
            </p>
          ) : null}
        </section>

        <div className="mt-6 grid grid-cols-2 gap-8">
          <section>
            <h2
              className="mb-2 border-b-2 pb-1 text-[11px] font-black uppercase tracking-[0.14em]"
              style={{ color: primary, borderColor: primary }}
            >
              Bénéficiaire
            </h2>
            <dl>
              <Field label="Prénom(s)" value={prenom} />
              <Field label="Nom" value={(nom || '').toUpperCase()} />
              <Field label="E-mail" value={email} />
              <Field label="N° dossier" value={nDossier} />
              <Field label="Date de préinscription" value={fmtDate(datePreinscription)} />
            </dl>
          </section>
          <section>
            <h2
              className="mb-2 border-b-2 pb-1 text-[11px] font-black uppercase tracking-[0.14em]"
              style={{ color: primary, borderColor: primary }}
            >
              Formation
            </h2>
            <dl>
              <Field label="Intitulé" value={formationTitre} />
              <Field label="Filière" value={filiere} />
              <Field label="Niveau" value={niveau} />
              <Field label="Année académique" value={anneeAcademique} />
            </dl>
          </section>
        </div>

        {/* Signature */}
        <section className="mt-auto flex items-end justify-between gap-8 pt-10">
          <div className="max-w-[55%]">
            <p className="text-[12px] text-slate-600">
              Fait à {lieu}, le {emitDate}
            </p>
            <p className="mt-4 text-[11px] font-black uppercase tracking-wide" style={{ color: secondary }}>
              La scolarité
            </p>
            <div className="mt-2">
              <CachetScolarite cachetUrl={etab?.cachet_url} />
            </div>
            {(etab?.signataire_nom || etab?.signataire_fonction) && (
              <p className="mt-2 text-[11px] font-semibold text-slate-700">
                {[etab.signataire_fonction, etab.signataire_nom].filter(Boolean).join(' — ')}
              </p>
            )}
          </div>
          <div
            className="rounded border px-3 py-2 text-center text-[9px] font-bold uppercase leading-relaxed tracking-wide text-slate-600"
            style={{ borderColor: `${primary}55` }}
          >
            <p className="mb-1 text-[8px] text-slate-400">Valeurs</p>
            {(Array.isArray(etab?.valeurs_institutionnelles) && etab.valeurs_institutionnelles.length
              ? etab.valeurs_institutionnelles
              : ['Rigueur', 'Innovation', 'Engagement']
            ).map((v) => (
              <div key={v}>{v}</div>
            ))}
          </div>
        </section>
      </div>

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 px-10 py-3 text-[10px] text-white" style={{ background: secondary }}>
        <div className="space-y-0.5">
          {siteWeb && <p className="font-semibold opacity-95">{siteWeb}</p>}
          <p className="opacity-85">
            Document officiel — {refAtt} — ne remplace pas l’inscription définitive
          </p>
        </div>
        {(etab?.ninea || etab?.rc) && (
          <p className="opacity-70">
            {[etab.ninea && `NINEA ${etab.ninea}`, etab.rc && `RC ${etab.rc}`].filter(Boolean).join(' · ')}
          </p>
        )}
      </footer>
    </article>
  )
}
