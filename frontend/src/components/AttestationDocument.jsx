/**
 * Attestation de préinscription — certificat A4 sur une seule page.
 * Branding établissement conservé (couleurs, logo, cachet, contacts).
 */
import CachetScolarite from './CachetScolarite'
import { mediaUrl } from '../utils/mediaUrl'

const fmtDate = (d) => {
  if (d == null || d === '') return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
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
    '—'
  const nomComplet = `${(prenom || '').trim()} ${(nom || '').trim().toUpperCase()}`.trim()

  return (
    <article
      ref={documentRef}
      className="a4-sheet a4-sheet--single print-page relative box-border flex flex-col bg-white p-[8mm] text-slate-800 shadow-xl"
    >
      <div
        className="relative flex min-h-0 flex-1 flex-col border-[1.5px] p-[4mm]"
        style={{ borderColor: secondary }}
      >
        <div
          className="relative flex min-h-0 flex-1 flex-col border px-[9mm] py-[6mm]"
          style={{ borderColor: `${primary}99` }}
        >
          {logoSrc ? (
            <img
              src={logoSrc}
              alt=""
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-[40%] h-[70mm] w-[70mm] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.04]"
            />
          ) : null}

          <header className="relative z-[1] flex flex-col items-center text-center">
            {logoSrc ? (
              <img src={logoSrc} alt="" className="mb-1.5 h-[13mm] w-[13mm] object-contain" />
            ) : (
              <div
                className="mb-1.5 flex h-[12mm] w-[12mm] items-center justify-center text-xs font-bold text-white"
                style={{ background: primary }}
              >
                {(etab?.nom || 'ET').slice(0, 2).toUpperCase()}
              </div>
            )}
            <p
              className="text-[11px] font-bold uppercase tracking-[0.16em]"
              style={{ color: primary }}
            >
              {etab?.nom || 'Établissement'}
            </p>
            <div className="mt-0.5 max-w-[145mm] text-[8px] leading-snug text-slate-500">
              {[etab?.adresse, etab?.telephone, etab?.email_contact].filter(Boolean).join(' · ')}
            </div>
            {(etab?.ninea || etab?.rc) && (
              <p className="mt-0.5 text-[7.5px] text-slate-400">
                {[etab.ninea && `NINEA ${etab.ninea}`, etab.rc && `RC ${etab.rc}`].filter(Boolean).join(' — ')}
              </p>
            )}
          </header>

          <div className="relative z-[1] mx-auto mt-3 h-px w-[40mm]" style={{ background: primary }} />

          <h1
            className="relative z-[1] mt-3 text-center text-[13px] font-bold uppercase tracking-[0.18em]"
            style={{ color: secondary, fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
          >
            Attestation de préinscription
          </h1>

          <p className="relative z-[1] mt-1.5 text-center text-[9px] text-slate-500">
            Réf. <span className="font-mono font-semibold text-slate-700">{refAtt}</span>
            {' · '}Émise le {emitDate}
            {anneeAcademique ? ` · Année académique ${anneeAcademique}` : ''}
          </p>

          <section className="relative z-[1] my-5 flex min-h-0 flex-1 flex-col justify-center px-1">
            <p
              className="text-center text-[12.5px] font-medium leading-[1.65] text-slate-800"
              style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
            >
              {texteCorps || (
                <>
                  Nous attestons que <strong>{nomComplet}</strong> est admis(e) en{' '}
                  <strong>{formationTitre}</strong>
                  {anneeAcademique ? (
                    <>
                      {' '}
                      pour l&apos;année académique <strong>{anneeAcademique}</strong>
                    </>
                  ) : null}
                  , sous réserve des formalités d&apos;inscription définitive.
                </>
              )}
            </p>
            {texteOfficiel ? (
              <p className="mx-auto mt-3 max-w-[145mm] text-center text-[9.5px] leading-relaxed text-slate-500">
                {texteOfficiel}
              </p>
            ) : null}

            <div className="mx-auto mt-5 w-full max-w-[150mm] border-y border-slate-300 py-2 text-center text-[10px] leading-relaxed text-slate-700">
              <p>
                <strong>{nomComplet}</strong>
                {email ? ` · ${email}` : ''}
              </p>
              <p className="mt-0.5">
                Dossier <span className="font-mono">{nDossier}</span>
                {datePreinscription ? ` · Préinscrit(e) le ${fmtDate(datePreinscription)}` : ''}
              </p>
              <p className="mt-0.5">
                {[formationTitre, filiere && filiere !== formationTitre ? filiere : null, niveau]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </section>

          <section className="relative z-[1] mt-auto flex items-end justify-between gap-4 pt-2">
            <div>
              <p className="text-[10px] text-slate-600">
                Fait à {lieu}, le {emitDate}
              </p>
              <div className="mt-2">
                <CachetScolarite cachetUrl={etab?.cachet_url} />
              </div>
            </div>
            <p className="max-w-[50mm] text-right text-[7.5px] leading-snug text-slate-400">
              Document officiel — ne remplace pas l&apos;inscription définitive.
            </p>
          </section>
        </div>
      </div>
    </article>
  )
}
