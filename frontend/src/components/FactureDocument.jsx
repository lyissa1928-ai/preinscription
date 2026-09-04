/**
 * Document facture A4 — une seule source (aperçu = PDF).
 * Largeur fixe 210 mm — aucun layout responsive.
 */
import { mediaUrl } from '../utils/mediaUrl'
import CachetScolarite from './CachetScolarite'
import { titreTypeDocument, isFactureDefinitive } from '../utils/factureTypeDocument'

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0))
const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}
const typeLabel = (t) => (t === 'en_ligne' ? 'Formation à distance (FAD)' : 'Formation en présentiel')

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

  const contactBits = [
    etab?.adresse,
    etab?.telephone && `Tél. ${etab.telephone}`,
    etab?.email_contact,
    etab?.ninea && `NINEA ${etab.ninea}`,
    etab?.rc && `RC ${etab.rc}`,
    etab?.arrete && `Arrêté : ${etab.arrete}`,
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
      className="a4-sheet print-page flex flex-col bg-white text-[12.5px] leading-snug text-slate-800"
      style={{ minHeight: '297mm' }}
    >
      <div className="h-[2.5px] w-full shrink-0" style={{ background: primary }} />

      <header className="a4-row justify-between gap-[6mm] px-[16mm] pb-[4mm] pt-[12mm]">
        <div className="a4-row min-w-0 flex-1 gap-[3mm]">
          {logoSrc ? (
            <img src={logoSrc} alt="" className="h-[18mm] w-[18mm] shrink-0 object-contain" />
          ) : (
            <div
              className="flex h-[18mm] w-[18mm] shrink-0 items-center justify-center text-sm font-bold text-white"
              style={{ background: primary }}
            >
              {nomEtab.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[13px] font-bold uppercase tracking-wide" style={{ color: primary }}>
              {nomEtab}
            </p>
            <div className="mt-1 space-y-0.5 text-[9.5px] leading-snug text-slate-600">
              {contactBits.map((l) => (
                <p key={l}>{l}</p>
              ))}
            </div>
          </div>
        </div>

        <div className="w-[48mm] shrink-0 text-right">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-900">
            {titreTypeDocument(facture?.type_document, { uppercase: false })}
          </p>
          <div className="mt-2 space-y-0.5 border-t border-slate-300 pt-2 text-[10px] text-slate-700">
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

      <div className="mx-[16mm] border-b border-slate-300" />

      <section className="a4-grid-2 px-[16mm] py-[4mm]">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Bénéficiaire</p>
          <p className="mt-1 text-[13px] font-bold text-slate-900">
            {prenom} {nom}
          </p>
          {etudiant.email && <p className="mt-0.5 text-[10.5px] text-slate-600">{etudiant.email}</p>}
          {etudiant.telephone && (
            <p className="text-[10.5px] text-slate-600">Tél. {etudiant.telephone}</p>
          )}
          {definitive && etudiant.nationalite && (
            <p className="text-[10.5px] text-slate-600">Nationalité : {etudiant.nationalite}</p>
          )}
          {!definitive && facture?.type_payeur === 'organisation' && facture?.payeur?.org_nom && (
            <p className="mt-1 text-[10.5px] font-semibold text-slate-800">
              Destinataire : {facture.payeur.org_nom}
            </p>
          )}
        </div>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Formation</p>
          <p className="mt-1 text-[12.5px] font-bold leading-snug text-slate-900">
            {formation.titre || '—'}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
            {[
              formation.niveau,
              typeLabel(formation.type),
              formation.duree && `Durée : ${formation.duree}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </section>

      <section className="px-[16mm] pb-[3mm]">
        <table className="text-[11.5px]">
          <thead>
            <tr className="border-y border-slate-800">
              <th className="py-2 text-left text-[9.5px] font-semibold uppercase tracking-wide text-slate-800">
                Désignation
              </th>
              <th className="w-[42mm] py-2 text-right text-[9.5px] font-semibold uppercase tracking-wide text-slate-800">
                Montant (FCFA)
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.designation}-${i}`} className="border-b border-slate-200">
                <td
                  className={`py-2 pr-3 ${
                    r.isTotalMensualites
                      ? 'font-semibold text-slate-900'
                      : r.isUnitMensualite || r.isQuantite
                        ? 'text-slate-500'
                        : 'text-slate-800'
                  }`}
                >
                  {r.designation}
                </td>
                <td
                  className={`py-2 text-right tabular-nums ${
                    r.isTotalMensualites
                      ? 'font-bold text-slate-900'
                      : r.isUnitMensualite || r.isQuantite
                        ? 'text-slate-500'
                        : 'font-medium text-slate-900'
                  }`}
                >
                  {r.isQuantite ? String(r.montant) : fmt(r.montant)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="border-t-2 border-slate-800 py-2.5 text-[12px] font-bold text-slate-900">
                Montant total à payer
              </td>
              <td
                className="border-t-2 border-slate-800 py-2.5 text-right text-[13px] font-bold tabular-nums"
                style={{ color: primary }}
              >
                {fmt(totalAPayer)} FCFA
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      {payLines.length > 0 && (
        <section className="px-[16mm] pb-[4mm]">
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Coordonnées de paiement
          </p>
          <div className="border border-slate-200 bg-slate-50 px-3 py-2.5 text-[10.5px] text-slate-700">
            {payLines.map((l) => (
              <p key={l.label} className="leading-relaxed">
                <span className="font-semibold text-slate-500">{l.label} :</span> {l.value}
              </p>
            ))}
          </div>
        </section>
      )}

      <section className="a4-row mt-auto justify-between gap-[6mm] px-[16mm] pb-[3mm] pt-[2mm]">
        <div className="max-w-[55%] text-[9.5px] leading-relaxed text-slate-500">
          <p>
            {definitive
              ? 'Facture définitive — document à conserver.'
              : 'Document non contractuel — facture proforma émise à titre indicatif.'}
          </p>
          {facture?.date_echeance && (
            <p className="mt-1">Valable jusqu’au {fmtDate(facture.date_echeance)}.</p>
          )}
        </div>
        <CachetScolarite cachetUrl={etab?.cachet_url} />
      </section>

      <footer className="mt-2 border-t border-slate-300 px-[16mm] py-2.5 text-center text-[8.5px] text-slate-500">
        {[nomEtab, etab?.email_contact, etab?.telephone].filter(Boolean).join(' · ')}
      </footer>
      <div className="h-[2px] w-full shrink-0" style={{ background: secondary }} />
    </article>
  )
}
