/**
 * Attestation de préinscription — certificat A4 (cadre, titre fort, phrase centrale).
 * Pas de photo. Pas de grille formulaire. Branding établissement dynamique.
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
      className="a4-sheet print-page relative box-border flex flex-col bg-white p-[10mm] text-slate-800 shadow-xl"
      style={{ minHeight: '297mm' }}
    >
      {/* Cadre double certificat */}
      <div
        className="relative flex min-h-[calc(297mm-20mm)] flex-1 flex-col border-[1.5px] p-[5mm]"
        style={{ borderColor: secondary }}
      >
        <div
          className="relative flex flex-1 flex-col border px-[10mm] py-[8mm]"
          style={{ borderColor: `${primary}99` }}
        >
          {/* Filigrane */}
          {logoSrc ? (
            <img
              src={logoSrc}
              alt=""
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-[42%] h-[90mm] w-[90mm] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.045]"
            />
          ) : null}

          {/* En-tête centré certificat */}
          <header className="relative z-[1] flex flex-col items-center text-center">
            {logoSrc ? (
              <img src={logoSrc} alt="" className="mb-2 h-[16mm] w-[16mm] object-contain" />
            ) : (
              <div
                className="mb-2 flex h-[14mm] w-[14mm] items-center justify-center text-xs font-bold text-white"
                style={{ background: primary }}
              >
                {(etab?.nom || 'ET').slice(0, 2).toUpperCase()}
              </div>
            )}
            <p
              className="text-[12px] font-bold uppercase tracking-[0.18em]"
              style={{ color: primary, fontFamily: 'system-ui, sans-serif' }}
            >
              {etab?.nom || 'Établissement'}
            </p>
            <div className="mt-1 max-w-[140mm] text-[8.5px] leading-snug text-slate-500" style={{ fontFamily: 'system-ui, sans-serif' }}>
              {[etab?.adresse, etab?.telephone, etab?.email_contact].filter(Boolean).join(' · ')}
            </div>
            {(etab?.ninea || etab?.rc) && (
              <p className="mt-0.5 text-[8px] text-slate-400" style={{ fontFamily: 'system-ui, sans-serif' }}>
                {[etab.ninea && `NINEA ${etab.ninea}`, etab.rc && `RC ${etab.rc}`].filter(Boolean).join(' — ')}
              </p>
            )}
          </header>

          <div className="relative z-[1] mx-auto mt-5 h-px w-[48mm]" style={{ background: primary }} />

          <h1
            className="relative z-[1] mt-5 text-center text-[15px] font-bold uppercase tracking-[0.2em]"
            style={{ color: secondary, fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
          >
            Attestation de préinscription
          </h1>

          <p
            className="relative z-[1] mt-2 text-center text-[10px] text-slate-500"
            style={{ fontFamily: 'system-ui, sans-serif' }}
          >
            Réf. <span className="font-mono font-semibold text-slate-700">{refAtt}</span>
            {' · '}Émise le {emitDate}
            {anneeAcademique ? ` · Année académique ${anneeAcademique}` : ''}
          </p>

          {/* Phrase centrale */}
          <section className="relative z-[1] my-8 flex flex-1 flex-col justify-center px-2">
            <p
              className="text-center text-[14px] font-medium leading-[1.7] text-slate-800"
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
              <p
                className="mx-auto mt-4 max-w-[145mm] text-center text-[10.5px] leading-relaxed text-slate-500"
                style={{ fontFamily: 'system-ui, sans-serif' }}
              >
                {texteOfficiel}
              </p>
            ) : null}

            {/* Synthèse compacte — une seule bande, pas une grille de labels */}
            <div
              className="mx-auto mt-8 w-full max-w-[150mm] border-y border-slate-300 py-3 text-center text-[11px] leading-relaxed text-slate-700"
              style={{ fontFamily: 'system-ui, sans-serif' }}
            >
              <p>
                <strong>{nomComplet}</strong>
                {email ? ` · ${email}` : ''}
              </p>
              <p className="mt-1">
                Dossier <span className="font-mono">{nDossier}</span>
                {datePreinscription ? ` · Préinscrit(e) le ${fmtDate(datePreinscription)}` : ''}
              </p>
              <p className="mt-1">
                {[formationTitre, filiere && filiere !== formationTitre ? filiere : null, niveau]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </section>

          {/* Signature */}
          <section className="relative z-[1] mt-auto flex items-end justify-between gap-6 pt-4">
            <div>
              <p className="text-[11px] text-slate-600">
                Fait à {lieu}, le {emitDate}
              </p>
              <div className="mt-3">
                <CachetScolarite cachetUrl={etab?.cachet_url} />
              </div>
            </div>
            <p className="max-w-[55mm] text-right text-[8px] leading-snug text-slate-400">
              Document officiel — ne remplace pas l&apos;inscription définitive.
            </p>
          </section>
        </div>
      </div>
    </article>
  )
}
