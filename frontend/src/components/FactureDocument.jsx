/**
 * Facture proforma / définitive — document A4 institutionnel (1 page).
 * Composition : en-tête → parties → description → tableau des coûts (centre) →
 * total / lettres → paiement → zone de validation + pied de page.
 */
import { mediaUrl } from '../utils/mediaUrl'
import CachetScolarite from './CachetScolarite'
import { titreTypeDocument, isFactureDefinitive } from '../utils/factureTypeDocument'
import { montantEnLettresCapitalise } from '../utils/montantEnLettres'

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0))
const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}
const typeLabel = (t) => (t === 'en_ligne' ? 'Formation à distance (FAD)' : 'Formation en présentiel')

function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '')
  if (h.length !== 6) return null
  const n = parseInt(h, 16)
  if (Number.isNaN(n)) return null
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function SectionLabel({ color, children }) {
  return (
    <p
      className="mb-1 text-[8.5px] font-bold uppercase tracking-[0.14em]"
      style={{ color }}
    >
      {children}
    </p>
  )
}

export default function FactureDocument({
  documentRef,
  etab,
  facture,
  etudiant = {},
  formation = {},
  rows = [],
  totalAPayer = 0,
}) {
  const primary = etab?.couleur_primaire || '#1e3a8a'
  const secondary = etab?.couleur_secondaire || '#334155'
  const logoSrc = mediaUrl(etab?.logo_url)
  const nomEtab = etab?.nom || 'Établissement'
  const prenom = (etudiant.prenom || '').trim()
  const nom = (etudiant.nom || '').trim().toUpperCase()
  const definitive = isFactureDefinitive(facture?.type_document)
  const titreDoc = titreTypeDocument(facture?.type_document, { uppercase: true })
  const totalLettres = montantEnLettresCapitalise(totalAPayer)
  const description = String(formation.description || '').trim()
  const anneeAcad = facture?.annee_academique || formation?.annee_academique || ''
  const rgb = hexToRgb(primary)
  const headerTint = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.07)` : 'rgba(30,58,138,0.07)'
  const headerBorder = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.28)` : 'rgba(30,58,138,0.28)'
  const softBg = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.045)` : 'rgba(30,58,138,0.045)'

  const contactLines = [
    etab?.adresse,
    etab?.telephone && `Tél. ${etab.telephone}`,
    etab?.email_contact,
  ].filter(Boolean)

  const adminLines = [
    etab?.ninea && `NINEA ${etab.ninea}`,
    etab?.rc && `RC ${etab.rc}`,
    etab?.arrete && `Arrêté ${etab.arrete}`,
  ].filter(Boolean)

  const payLines = [
    etab?.banque && { label: 'Banque', value: String(etab.banque).trim() },
    etab?.rc && { label: 'RC', value: String(etab.rc).trim() },
    (etab?.compte_bancaire || etab?.iban) && {
      label: 'Compte / IBAN',
      value: etab.compte_bancaire || etab.iban,
    },
    etab?.swift && { label: 'SWIFT', value: etab.swift },
  ].filter(Boolean)

  const formationMeta = [
    formation.niveau && { label: 'Niveau', value: formation.niveau },
    formation.niveau_requis && { label: 'Prérequis', value: formation.niveau_requis },
    typeLabel(formation.type) && { label: 'Modalité', value: typeLabel(formation.type) },
    (formation.duree || formation.nombre_annees) && {
      label: 'Durée',
      value: formation.duree || `${formation.nombre_annees} an(s)`,
    },
    anneeAcad && { label: 'Année académique', value: anneeAcad },
  ].filter(Boolean)

  return (
    <article
      ref={documentRef}
      className="a4-sheet a4-sheet--single print-page flex flex-col bg-white text-[12px] leading-snug text-slate-800"
    >
      {/* Bandeau supérieur */}
      <div
        className="h-[3px] w-full shrink-0"
        style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }}
      />

      {/* ── En-tête ── */}
      <header
        className="shrink-0 px-[14mm] pb-[3.5mm] pt-[8mm]"
        style={{
          background: `linear-gradient(180deg, ${headerTint} 0%, transparent 92%)`,
          borderBottom: `1px solid ${headerBorder}`,
        }}
      >
        <div className="a4-row items-start justify-between gap-[5mm]">
          <div className="a4-row min-w-0 flex-1 gap-[3mm]">
            {logoSrc ? (
              <img src={logoSrc} alt="" className="h-[16mm] w-[16mm] shrink-0 object-contain" />
            ) : (
              <div
                className="flex h-[16mm] w-[16mm] shrink-0 items-center justify-center text-sm font-bold text-white"
                style={{ background: primary }}
              >
                {nomEtab.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 pt-0.5">
              <p
                className="text-[13px] font-bold uppercase leading-tight tracking-[0.04em]"
                style={{ color: primary }}
              >
                {nomEtab}
              </p>
              <div className="mt-1 space-y-0.5 text-[9px] leading-snug text-slate-600">
                {contactLines.map((l) => (
                  <p key={l}>{l}</p>
                ))}
                {adminLines.length > 0 && (
                  <p className="pt-0.5 text-[8.5px] text-slate-500">{adminLines.join(' · ')}</p>
                )}
              </div>
            </div>
          </div>

          <div className="w-[58mm] shrink-0 text-right">
            <p
              className="text-[12.5px] font-bold uppercase leading-tight tracking-[0.1em]"
              style={{
                color: primary,
                fontFamily: 'Georgia, "Times New Roman", Times, serif',
              }}
            >
              {titreDoc}
            </p>
            <div
              className="ml-auto mt-2 w-full border px-2.5 py-1.5 text-left text-[10px] text-slate-700"
              style={{ borderColor: headerBorder, background: softBg }}
            >
              <p className="flex justify-between gap-2">
                <span className="text-slate-500">N°</span>
                <span className="font-mono font-semibold text-slate-900">{facture?.numero || '—'}</span>
              </p>
              <p className="mt-0.5 flex justify-between gap-2">
                <span className="text-slate-500">Date</span>
                <span className="font-medium">{fmtDate(facture?.date_emission)}</span>
              </p>
              {anneeAcad ? (
                <p className="mt-0.5 flex justify-between gap-2">
                  <span className="text-slate-500">Année</span>
                  <span className="font-medium">{anneeAcad}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* Corps : répartition verticale harmonieuse */}
      <div className="flex min-h-0 flex-1 flex-col px-[14mm] pt-[4mm]">
        {/* Bénéficiaire + Formation */}
        <section className="a4-grid-2 shrink-0 gap-[5mm]">
          <div className="border border-slate-200 px-3 py-2.5" style={{ background: softBg }}>
            <SectionLabel color={primary}>Bénéficiaire</SectionLabel>
            <p className="text-[13px] font-bold text-slate-900">
              {prenom} {nom}
            </p>
            {etudiant.email && (
              <p className="mt-1 text-[10.5px] text-slate-600">{etudiant.email}</p>
            )}
            {etudiant.telephone && (
              <p className="text-[10.5px] text-slate-600">Tél. {etudiant.telephone}</p>
            )}
            {!definitive && facture?.type_payeur === 'organisation' && facture?.payeur?.org_nom && (
              <p className="mt-1.5 text-[10.5px] font-semibold text-slate-800">
                Destinataire : {facture.payeur.org_nom}
              </p>
            )}
          </div>
          <div className="border border-slate-200 px-3 py-2.5">
            <SectionLabel color={primary}>Formation</SectionLabel>
            <p className="text-[12.5px] font-bold leading-snug text-slate-900">
              {formation.titre || '—'}
            </p>
            <dl className="mt-1.5 space-y-0.5 text-[10px] text-slate-600">
              {formationMeta.map((m) => (
                <div key={m.label} className="a4-row justify-between gap-2">
                  <dt className="shrink-0 text-slate-400">{m.label}</dt>
                  <dd className="text-right font-medium text-slate-700">{m.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Description — juste avant le tableau */}
        {description ? (
          <section className="mt-[4mm] shrink-0">
            <SectionLabel color={primary}>Description de la formation</SectionLabel>
            <div
              className="border-l-[3px] px-3 py-2 text-[11px] leading-relaxed text-slate-700"
              style={{ borderColor: primary, background: softBg }}
            >
              {description}
            </div>
          </section>
        ) : null}

        {/* Tableau des coûts — centre visuel */}
        <section className="mt-[4.5mm] shrink-0">
          <SectionLabel color={primary}>Détail des frais</SectionLabel>
          <div className="mx-auto w-full max-w-[172mm]">
            <table className="text-[12.5px]">
              <thead>
                <tr style={{ background: softBg }}>
                  <th
                    className="border-b-2 py-2 pl-1 text-left text-[9px] font-bold uppercase tracking-[0.1em]"
                    style={{ borderColor: primary, color: primary }}
                  >
                    Désignation
                  </th>
                  <th
                    className="w-[48mm] border-b-2 py-2 pr-1 text-right text-[9px] font-bold uppercase tracking-[0.1em]"
                    style={{ borderColor: primary, color: primary }}
                  >
                    Montant (FCFA)
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={`${r.designation}-${i}`}
                    className="border-b border-slate-200"
                  >
                    <td
                      className={`py-[2.2mm] pl-1 pr-2 ${
                        r.isTotalMensualites
                          ? 'font-semibold text-slate-900'
                          : r.isUnitMensualite
                            ? 'text-slate-600'
                            : 'text-slate-800'
                      }`}
                    >
                      {r.designation}
                    </td>
                    <td
                      className={`py-[2.2mm] pr-1 text-right tabular-nums ${
                        r.isTotalMensualites
                          ? 'text-[13px] font-semibold text-slate-900'
                          : 'text-[13px] font-medium text-slate-900'
                      }`}
                    >
                      {fmt(r.montant)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total mis en évidence */}
            <div
              className="mt-2 flex items-end justify-between gap-3 border-t-2 px-1 pt-2.5"
              style={{ borderColor: primary }}
            >
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                  Montant total à payer
                </p>
                <p className="mt-1 text-[11px] leading-snug text-slate-800">
                  Arrêté la présente facture à la somme de :{' '}
                  <span className="font-bold">{totalLettres}</span>.
                </p>
              </div>
              <p
                className="shrink-0 text-[18px] font-bold tabular-nums leading-none"
                style={{ color: primary }}
              >
                {fmt(totalAPayer)}
                <span className="ml-1 text-[11px] font-semibold tracking-wide">FCFA</span>
              </p>
            </div>
          </div>
        </section>

        {/* Coordonnées de paiement */}
        {payLines.length > 0 ? (
          <section className="mt-[4.5mm] shrink-0">
            <SectionLabel color={primary}>Coordonnées de paiement</SectionLabel>
            <div
              className="grid grid-cols-2 gap-x-4 gap-y-1 border px-3 py-2.5 text-[10.5px] text-slate-700"
              style={{ borderColor: headerBorder, background: softBg }}
            >
              {payLines.map((l) => (
                <p key={l.label} className="leading-snug">
                  <span className="font-semibold text-slate-500">{l.label} :</span>{' '}
                  <span className="font-medium text-slate-800">{l.value}</span>
                </p>
              ))}
            </div>
          </section>
        ) : null}

        {/* Espace flexible : pousse la validation en bas de page */}
        <div className="min-h-[4mm] flex-1" aria-hidden />

        {/* Zone de validation institutionnelle */}
        <section
          className="a4-row shrink-0 items-end justify-between gap-[6mm] border-t pt-[3.5mm]"
          style={{ borderColor: headerBorder }}
        >
          <div className="max-w-[58%] pb-1 text-[9px] leading-relaxed text-slate-500">
            <p>
              {definitive
                ? 'Facture définitive — document à conserver.'
                : 'Document non contractuel — facture proforma émise à titre indicatif.'}
            </p>
            {facture?.date_echeance ? (
              <p className="mt-1">Valable jusqu’au {fmtDate(facture.date_echeance)}.</p>
            ) : null}
          </div>
          <div className="w-[52mm] shrink-0 text-center">
            <CachetScolarite
              cachetUrl={etab?.cachet_url}
              className="!text-[10px] [&_img]:!my-1.5 [&_img]:!max-h-[22mm] [&_p]:!tracking-[0.12em]"
            />
          </div>
        </section>
      </div>

      {/* Pied de page */}
      <footer
        className="mt-auto shrink-0 border-t px-[14mm] py-[2mm] text-center text-[8px] leading-snug text-slate-500"
        style={{ borderColor: headerBorder }}
      >
        {[nomEtab, etab?.email_contact, etab?.telephone, etab?.adresse].filter(Boolean).join(' · ')}
      </footer>
      <div
        className="h-[2.5px] w-full shrink-0"
        style={{ background: `linear-gradient(90deg, ${secondary}, ${primary})` }}
      />
    </article>
  )
}
