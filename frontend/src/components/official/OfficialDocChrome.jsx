/**
 * En-tête / pied institutionnels partagés pour documents A4 officiels.
 * Couleurs et logo dynamiques selon l’établissement.
 */
import { mediaUrl } from '../../utils/mediaUrl'

export function officialBrand(etab) {
  return {
    primary: etab?.couleur_primaire || '#1e3a8a',
    secondary: etab?.couleur_secondaire || '#0f172a',
    logoSrc: mediaUrl(etab?.logo_url),
    nom: etab?.nom || 'Établissement',
  }
}

export function OfficialDocHeader({
  etab,
  rightSlot = null,
  compact = false,
}) {
  const { primary, secondary, logoSrc, nom } = officialBrand(etab)
  const pad = compact ? 'px-9 py-5' : 'px-10 py-6'

  return (
    <header className={`lettre-print-header-root flex items-start justify-between gap-5 border-b ${pad}`} style={{ borderColor: `${primary}40` }}>
      <div className="flex min-w-0 flex-1 items-start gap-3.5">
        {logoSrc ? (
          <img src={logoSrc} alt="" className="h-[4.4rem] w-[4.4rem] shrink-0 object-contain" />
        ) : (
          <div
            className="flex h-[4.4rem] w-[4.4rem] shrink-0 items-center justify-center text-sm font-black text-white"
            style={{ background: primary }}
          >
            {nom.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 pt-0.5">
          <p className="text-[15px] font-black uppercase leading-tight tracking-[0.04em]" style={{ color: primary }}>
            {nom}
          </p>
          {etab?.description && (
            <p className="mt-0.5 text-[10.5px] font-medium italic leading-snug text-slate-500">{etab.description}</p>
          )}
          <div className="mt-1.5 space-y-0.5 text-[10.5px] leading-snug text-slate-600">
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
      {rightSlot}
      {!rightSlot && (
        <div className="hidden w-px shrink-0 self-stretch sm:block" style={{ background: `${secondary}18` }} aria-hidden />
      )}
    </header>
  )
}

export function OfficialDocTitle({ children, primary }) {
  return (
    <div className="mx-10 mt-5 text-center">
      <h1
        className="inline-block border-b-2 pb-2 text-[13.5px] font-black uppercase tracking-[0.14em]"
        style={{ color: primary, borderColor: primary }}
      >
        {children}
      </h1>
    </div>
  )
}

export function OfficialDocFooter({ etab, primary, secondary, children }) {
  const siteWeb = (etab?.site_web || '').replace(/^https?:\/\//i, '') || null
  return (
    <footer className="mt-auto">
      <div className="border-t border-slate-200 px-10 py-3 text-center text-[10px] leading-snug text-slate-500">
        {children}
        {etab?.nom && (
          <p className="mt-0.5">
            {etab.nom}
            {(etab.email_contact || etab.telephone)
              ? ` · ${[etab.email_contact, etab.telephone].filter(Boolean).join(' · ')}`
              : ''}
            {siteWeb ? ` · ${siteWeb}` : ''}
          </p>
        )}
      </div>
      <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${primary}, ${secondary || primary})` }} />
    </footer>
  )
}

/** Tableau administratif : en-tête clair, pas de bandeaux saturés. */
export function OfficialDataTable({ primary, title, rows }) {
  return (
    <table className="w-full border-collapse overflow-hidden border border-slate-200 text-[12.5px]">
      {title ? (
        <thead>
          <tr>
            <th
              colSpan={2}
              className="border-b px-3.5 py-2 text-left text-[10.5px] font-bold uppercase tracking-[0.12em]"
              style={{
                color: primary,
                background: `${primary}0f`,
                borderColor: `${primary}35`,
              }}
            >
              {title}
            </th>
          </tr>
        </thead>
      ) : null}
      <tbody>
        {rows.map(([label, value], i) =>
          value == null || value === '' ? null : (
            <tr key={`${label}-${i}`} className="border-b border-slate-100 last:border-0">
              <td className="w-[36%] bg-slate-50/90 px-3.5 py-2 align-top text-[11.5px] font-semibold text-slate-500">
                {label}
              </td>
              <td className="px-3.5 py-2 align-top font-medium text-slate-900 break-words">{value}</td>
            </tr>
          )
        )}
      </tbody>
    </table>
  )
}
