/**
 * Document facture A4 — une page.
 * Prix : inscription, mensualité, solde, frais par an (+ bib/EPI).
 * Description / débouchés facultatifs sous le bloc prix.
 * En-tête aux couleurs d’identité de l’établissement.
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
  const totalLettres = montantEnLettresCapitalise(totalAPayer)
  const description = String(formation.description || '').trim()
  const debouches = String(formation.debouches || '').trim()
  const rgb = hexToRgb(primary)
  const headerTint = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.08)` : 'rgba(30,58,138,0.08)'
  const headerBorder = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)` : 'rgba(30,58,138,0.35)'

  const contactBits = [
    etab?.adresse,
    etab?.telephone && `Tél. ${etab.telephone}`,
    etab?.email_contact,
    etab?.ninea && `NINEA ${etab.ninea}`,
    etab?.rc && `RC ${etab.rc}`,
  ].filter(Boolean)

  const payLines = [
    etab?.rc && { label: 'RC', value: String(etab.rc).trim() },
    (etab?.compte_bancaire || etab?.iban) && {
      label: 'Compte / IBAN',
      value: etab.compte_bancaire || etab.iban,
    },
    etab?.swift && { label: 'SWIFT', value: etab.swift },
  ].filter(Boolean)

  return (
    <article
      ref={documentRef}
      className="a4-sheet a4-sheet--single print-page flex flex-col bg-white text-[11.5px] leading-snug text-slate-800"
    >
      {/* Bande identité établissement */}
      <div
        className="h-[4px] w-full shrink-0"
        style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }}
      />

      <header
        className="a4-row justify-between gap-[5mm] px-[14mm] pb-[3mm] pt-[8mm]"
        style={{
          background: `linear-gradient(180deg, ${headerTint} 0%, transparent 100%)`,
          borderBottom: `1.5px solid ${headerBorder}`,
        }}
      >
        <div className="a4-row min-w-0 flex-1 gap-[2.5mm]">
          {logoSrc ? (
            <img src={logoSrc} alt="" className="h-[14mm] w-[14mm] shrink-0 object-contain" />
          ) : (
            <div
              className="flex h-[14mm] w-[14mm] shrink-0 items-center justify-center text-xs font-bold text-white"
              style={{ background: primary }}
            >
              {nomEtab.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-wide" style={{ color: primary }}>
              {nomEtab}
            </p>
            <div className="mt-0.5 space-y-0 text-[8.5px] leading-snug text-slate-600">
              {contactBits.slice(0, 4).map((l) => (
                <p key={l}>{l}</p>
              ))}
            </div>
          </div>
        </div>

        <div className="w-[48mm] shrink-0 text-right">
          <p
            className="inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white"
            style={{ background: primary }}
          >
            {titreTypeDocument(facture?.type_document, { uppercase: false })}
          </p>
          <div className="mt-1.5 space-y-0.5 pt-1 text-[9.5px] text-slate-700">
            <p>
              <span className="text-slate-500">N°</span>{' '}
              <span className="font-mono font-semibold">{facture?.numero || '—'}</span>
            </p>
            <p>
              <span className="text-slate-500">Date</span> {fmtDate(facture?.date_emission)}
            </p>
            {(facture?.annee_academique || formation?.annee_academique) && (
              <p>
                <span className="text-slate-500">Année</span>{' '}
                {facture?.annee_academique || formation?.annee_academique}
              </p>
            )}
          </div>
        </div>
      </header>

      <section className="a4-grid-2 gap-[5mm] px-[14mm] py-[3mm]">
        <div>
          <p className="text-[8.5px] font-semibold uppercase tracking-[0.12em]" style={{ color: primary }}>
            Bénéficiaire
          </p>
          <p className="mt-0.5 text-[12px] font-bold text-slate-900">
            {prenom} {nom}
          </p>
          {etudiant.email && <p className="mt-0.5 text-[9.5px] text-slate-600">{etudiant.email}</p>}
          {etudiant.telephone && (
            <p className="text-[9.5px] text-slate-600">Tél. {etudiant.telephone}</p>
          )}
          {!definitive && facture?.type_payeur === 'organisation' && facture?.payeur?.org_nom && (
            <p className="mt-0.5 text-[9.5px] font-semibold text-slate-800">
              Destinataire : {facture.payeur.org_nom}
            </p>
          )}
        </div>
        <div>
          <p className="text-[8.5px] font-semibold uppercase tracking-[0.12em]" style={{ color: primary }}>
            Formation
          </p>
          <p className="mt-0.5 text-[11.5px] font-bold leading-snug text-slate-900">
            {formation.titre || '—'}
          </p>
          <p className="mt-0.5 text-[9px] leading-snug text-slate-600">
            {[
              formation.niveau,
              formation.niveau_requis && `Exigé : ${formation.niveau_requis}`,
              formation.nombre_annees && `${formation.nombre_annees} an(s)`,
              typeLabel(formation.type),
              formation.duree && `Durée : ${formation.duree}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </section>

      {/* Bloc prix */}
      <section className="px-[14mm] pb-[2mm]">
        <p
          className="mb-1 text-[8.5px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: primary }}
        >
          Détail des frais
        </p>
        <table className="text-[10.5px]">
          <thead>
            <tr style={{ borderColor: primary, borderTopWidth: 2, borderBottomWidth: 1.5 }}>
              <th
                className="py-1.5 text-left text-[8.5px] font-semibold uppercase tracking-wide"
                style={{ color: primary }}
              >
                Désignation
              </th>
              <th
                className="w-[38mm] py-1.5 text-right text-[8.5px] font-semibold uppercase tracking-wide"
                style={{ color: primary }}
              >
                Montant (FCFA)
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={`${r.designation}-${i}`}
                className={`border-b border-slate-200 ${r.isFraisParAn ? 'bg-slate-50' : ''}`}
              >
                <td
                  className={`py-1.5 pr-2 ${
                    r.isFraisParAn || r.isTotalMensualites
                      ? 'font-semibold text-slate-900'
                      : r.isUnitMensualite
                        ? 'text-slate-600'
                        : 'text-slate-800'
                  }`}
                >
                  {r.designation}
                  {r.hint ? (
                    <span className="ml-1 text-[8.5px] font-normal text-slate-400">({r.hint})</span>
                  ) : null}
                </td>
                <td
                  className={`py-1.5 text-right tabular-nums ${
                    r.isFraisParAn
                      ? 'font-bold'
                      : r.isTotalMensualites
                        ? 'font-semibold text-slate-900'
                        : r.isUnitMensualite
                          ? 'text-slate-600'
                          : 'font-medium text-slate-900'
                  }`}
                  style={r.isFraisParAn ? { color: primary } : undefined}
                >
                  {fmt(r.montant)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="border-t-2 py-2 text-[11px] font-bold text-slate-900" style={{ borderColor: primary }}>
                Montant total à payer
              </td>
              <td
                className="border-t-2 py-2 text-right text-[12px] font-bold tabular-nums"
                style={{ borderColor: primary, color: primary }}
              >
                {fmt(totalAPayer)} FCFA
              </td>
            </tr>
            <tr>
              <td colSpan={2} className="pb-1 pt-1.5 text-[10px] font-bold leading-snug text-slate-900">
                Arrêté la présente facture à la somme de : {totalLettres}.
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Description / débouchés — facultatifs */}
      {(description || debouches) && (
        <section className="px-[14mm] pb-[2.5mm]">
          {description ? (
            <div className="mb-1.5">
              <p className="text-[8.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: primary }}>
                Description de la formation
              </p>
              <p className="mt-0.5 max-h-[14mm] overflow-hidden text-[9px] leading-snug text-slate-600">
                {description}
              </p>
            </div>
          ) : null}
          {debouches ? (
            <div>
              <p className="text-[8.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: primary }}>
                Débouchés
              </p>
              <p className="mt-0.5 max-h-[12mm] overflow-hidden text-[9px] leading-snug text-slate-600">
                {debouches}
              </p>
            </div>
          ) : null}
        </section>
      )}

      {payLines.length > 0 && (
        <section className="px-[14mm] pb-[2mm]">
          <p className="mb-1 text-[8.5px] font-semibold uppercase tracking-[0.12em]" style={{ color: primary }}>
            Coordonnées de paiement
          </p>
          <div
            className="border px-2.5 py-1.5 text-[9.5px] text-slate-700"
            style={{ borderColor: headerBorder, background: headerTint }}
          >
            {payLines.map((l) => (
              <p key={l.label} className="leading-snug">
                <span className="font-semibold text-slate-500">{l.label} :</span> {l.value}
              </p>
            ))}
          </div>
        </section>
      )}

      <section className="a4-row mt-auto justify-between gap-[5mm] px-[14mm] pb-[2mm] pt-[1mm]">
        <div className="max-w-[55%] text-[8.5px] leading-snug text-slate-500">
          <p>
            {definitive
              ? 'Facture définitive — document à conserver.'
              : 'Document non contractuel — facture proforma émise à titre indicatif.'}
          </p>
          {facture?.date_echeance && (
            <p className="mt-0.5">Valable jusqu’au {fmtDate(facture.date_echeance)}.</p>
          )}
        </div>
        <CachetScolarite cachetUrl={etab?.cachet_url} />
      </section>

      <footer
        className="border-t px-[14mm] py-1.5 text-center text-[8px] text-slate-500"
        style={{ borderColor: headerBorder }}
      >
        {[nomEtab, etab?.email_contact, etab?.telephone].filter(Boolean).join(' · ')}
      </footer>
      <div
        className="h-[3px] w-full shrink-0"
        style={{ background: `linear-gradient(90deg, ${secondary}, ${primary})` }}
      />
    </article>
  )
}
