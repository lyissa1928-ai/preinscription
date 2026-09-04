/**
 * Attestation de préinscription — certificat A4 administratif élégant.
 * Identité visuelle dynamique (logo, couleurs, cachet). Sans photo candidat.
 */
import CachetScolarite from './CachetScolarite'
import { mediaUrl } from '../utils/mediaUrl'
import { OfficialDocHeader, OfficialDocFooter } from './official/OfficialDocChrome'

const fmtDate = (d) => {
  if (d == null || d === '') return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function Field({ label, value }) {
  return (
    <div className="min-w-0 py-2">
      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</dt>
      <dd className="mt-0.5 border-b border-slate-100 pb-2 text-[13.5px] font-semibold leading-snug text-slate-900 break-words">
        {value || '—'}
      </dd>
    </div>
  )
}

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
  const emitDate = fmtDate(new Date())
  const lieu =
    etab?.ville ||
    etab?.adresse?.split(',')?.pop()?.trim() ||
    etab?.nom ||
    '—'

  return (
    <article
      ref={documentRef}
      className="print-page relative mx-auto flex min-h-[297mm] max-w-[210mm] flex-col overflow-hidden bg-white text-[13.5px] leading-relaxed text-slate-800 shadow-2xl"
    >
      {/* Filigrane discret */}
      {logoSrc ? (
        <img
          src={logoSrc}
          alt=""
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.04]"
        />
      ) : null}

      <div className="h-[3px] shrink-0" style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }} />

      <OfficialDocHeader
        etab={etab}
        compact
        rightSlot={
          <div className="w-[11rem] shrink-0 text-right">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-400">Document officiel</p>
            <p className="mt-1.5 text-[12px] font-black uppercase leading-tight tracking-[0.06em]" style={{ color: primary }}>
              Attestation de préinscription
            </p>
            <p className="mt-3 font-mono text-[11px] font-bold text-slate-800">{refAtt}</p>
            <p className="mt-1 text-[11px] text-slate-500">Émise le {emitDate}</p>
          </div>
        }
      />

      <div className="relative z-[1] flex flex-1 flex-col px-10 py-6">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Année académique {anneeAcademique || '—'}
        </p>

        <section
          className="mt-5 border-y-2 px-1 py-5 text-center"
          style={{ borderColor: `${primary}55` }}
        >
          <p className="mx-auto max-w-[36rem] text-[14.5px] font-medium leading-relaxed text-slate-800">
            {texteCorps}
          </p>
          {texteOfficiel ? (
            <p className="mx-auto mt-3 max-w-[36rem] text-[12px] leading-relaxed text-slate-500">{texteOfficiel}</p>
          ) : null}
        </section>

        <div className="mt-6 grid grid-cols-2 gap-10">
          <section>
            <h2
              className="mb-1 text-[11px] font-black uppercase tracking-[0.14em]"
              style={{ color: primary }}
            >
              Bénéficiaire
            </h2>
            <div className="mb-3 h-0.5 w-12" style={{ background: primary }} />
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
              className="mb-1 text-[11px] font-black uppercase tracking-[0.14em]"
              style={{ color: primary }}
            >
              Formation
            </h2>
            <div className="mb-3 h-0.5 w-12" style={{ background: primary }} />
            <dl>
              <Field label="Intitulé" value={formationTitre} />
              <Field label="Filière" value={filiere} />
              <Field label="Niveau" value={niveau} />
              <Field label="Année académique" value={anneeAcademique} />
            </dl>
          </section>
        </div>

        <section className="mt-auto flex items-end justify-between gap-8 pt-10">
          <div>
            <p className="text-[12px] text-slate-600">
              Fait à {lieu}, le {emitDate}
            </p>
            <div className="mt-4">
              <CachetScolarite cachetUrl={etab?.cachet_url} />
            </div>
            {(etab?.signataire_nom || etab?.signataire_fonction) && (
              <p className="mt-2 text-[11px] font-semibold text-slate-700">
                {[etab.signataire_fonction, etab.signataire_nom].filter(Boolean).join(' — ')}
              </p>
            )}
          </div>
          <div
            className="max-w-[8.5rem] border px-2.5 py-2 text-center text-[9px] font-bold uppercase leading-relaxed tracking-wide text-slate-500"
            style={{ borderColor: `${primary}40` }}
          >
            {(Array.isArray(etab?.valeurs_institutionnelles) && etab.valeurs_institutionnelles.length
              ? etab.valeurs_institutionnelles
              : ['Rigueur', 'Innovation', 'Engagement']
            ).map((v) => (
              <div key={v} className="py-0.5">
                {v}
              </div>
            ))}
          </div>
        </section>
      </div>

      <OfficialDocFooter etab={etab} primary={primary} secondary={secondary}>
        <p>
          Document officiel — {refAtt} — ne remplace pas l&apos;inscription définitive
        </p>
      </OfficialDocFooter>
    </article>
  )
}
