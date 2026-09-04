/**
 * Export HTML imprimable (plusieurs factures, une page A4 chacune).
 */
const { montantEnLettres } = require('./montantEnLettres');

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt(n) {
  return new Intl.NumberFormat('fr-FR').format(Number(n) || 0);
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function oneInvoiceHtml(facture) {
  const eb = facture.etablissement_snapshot || {};
  const et = facture.etudiant_snapshot || {};
  const fo = facture.formation_snapshot || {};
  const p1 = eb.couleur_primaire || '#1e3a8a';
  const p2 = eb.couleur_secondaire || '#4338ca';
  const typeRaw = String(facture.type_document || '').toLowerCase();
  const isDef = typeRaw === 'definitive' || typeRaw === 'définitive' || typeRaw === 'def';
  const isProforma = !isDef;
  const titreDoc = isDef ? 'FACTURE DÉFINITIVE' : 'FACTURE PROFORMA';
  const sousTitre = isDef ? 'Facture définitive' : 'Facture proforma — préinscription';
  const lignes = Array.isArray(facture.lignes) ? facture.lignes : [];
  const lignesSupp = Array.isArray(facture.lignes_supplementaires) ? facture.lignes_supplementaires : [];
  const total = Number(facture.montant_ttc) || 0;
  const totalLettres = montantEnLettres(total);

  let rows = lignes
    .map((l, i) => {
      const desc = l.description != null ? l.description : l.designation || '';
      const q = l.quantite != null ? l.quantite : 1;
      const tot = l.total != null ? l.total : l.montant || 0;
      const bg = i % 2 === 0 ? '#fff' : '#f9fafb';
      return `<tr style="background:${bg};"><td style="padding:8px 12px;font-size:12px;">${esc(desc)}</td><td style="padding:8px;text-align:center;font-size:12px;">${esc(q)}</td><td style="padding:8px 12px;text-align:right;font-size:12px;font-weight:600;">${fmt(tot)}</td></tr>`;
    })
    .join('');

  if (lignesSupp.length > 0) {
    lignesSupp.forEach((l, j) => {
      const desc = l.designation || '';
      const tot = l.montant != null ? l.montant : 0;
      const bg = (lignes.length + j) % 2 === 0 ? '#fffbeb' : '#fef3c7';
      rows += `<tr style="background:${bg};"><td style="padding:8px 12px;font-size:12px;">${esc(desc)}</td><td style="padding:8px;text-align:center;font-size:12px;">1</td><td style="padding:8px 12px;text-align:right;font-size:12px;font-weight:600;">${fmt(tot)}</td></tr>`;
    });
  }

  const typeLabel =
    fo.type === 'en_ligne'
      ? 'Formation en ligne'
      : `Formation présentielle${fo.ville ? ` · ${fo.ville}` : ''}`;
  const descFormation = fo.description
    ? `<div style="font-size:11px;color:#4b5563;margin-top:6px;line-height:1.4;">${esc(fo.description)}</div>`
    : '';

  return `
<div class="invoice">
  <div style="background:linear-gradient(to right, ${esc(p1)}, ${esc(p2)});color:#fff;padding:18px 28px;">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div>
        <div style="font-size:17px;font-weight:800;">${esc(eb.nom || 'Établissement')}</div>
        <div style="opacity:0.9;font-size:11px;margin-top:4px;">${esc(sousTitre)}</div>
        <div style="opacity:0.85;font-size:10px;margin-top:6px;line-height:1.45;">
          ${eb.adresse ? `<div>${esc(eb.adresse)}</div>` : ''}
          <div>${esc([eb.email_contact, eb.telephone].filter(Boolean).join(' · ') || '—')}</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="display:inline-block;background:#facc15;color:#111827;font-weight:900;font-size:14px;padding:6px 14px;border-radius:8px;margin-bottom:6px;">${esc(titreDoc)}</div>
        <div style="font-size:11px;opacity:0.9;">N° <strong style="font-family:monospace;color:#fff;">${esc(facture.numero)}</strong></div>
        <div style="font-size:11px;opacity:0.9;">Émission : <strong style="color:#fff;">${esc(fmtDate(facture.date_emission))}</strong></div>
        <div style="font-size:11px;opacity:0.9;">Valable jusqu'au : <strong style="color:#fff;">${esc(fmtDate(facture.date_echeance))}</strong></div>
      </div>
    </div>
  </div>
  <div style="padding:16px 28px;font-family:Segoe UI,system-ui,sans-serif;color:#111827;font-size:13px;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px;">
      <div>
        <div style="font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">${isProforma ? 'Identité du bénéficiaire' : 'Destinataire'}</div>
        <div style="background:#eff6ff;border:1px solid #dbeafe;border-radius:10px;padding:10px;">
          <div style="font-weight:700;">${esc(et.prenom)} ${esc(et.nom)}</div>
          <div style="font-size:12px;color:#4b5563;margin-top:4px;">
            ${et.email ? `<div>E-mail : ${esc(et.email)}</div>` : ''}
            ${et.telephone ? `<div>Tél : ${esc(et.telephone)}</div>` : ''}
            ${!isProforma && et.nationalite ? `<div>Nationalité : ${esc(et.nationalite)}</div>` : ''}
            ${isProforma && facture.type_payeur === 'organisation' && facture.payeur?.org_nom
              ? `<div style="margin-top:6px;font-weight:600;">Destinataire : ${esc(facture.payeur.org_nom)}</div>`
              : ''}
          </div>
        </div>
      </div>
      <div>
        <div style="font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Formation</div>
        <div style="border:1px solid ${esc(p1)}44;background:${esc(p1)}14;border-radius:10px;padding:10px;">
          <div style="font-weight:600;">${esc(fo.titre || '—')} (${esc(typeLabel)})</div>
          ${fo.duree || fo.niveau_requis || fo.niveau ? `<div style="font-size:11px;color:#6b7280;margin-top:4px;">Durée : ${esc(fo.duree || '—')} · Niveau : ${esc(fo.niveau || fo.niveau_requis || '—')}</div>` : ''}
          ${descFormation}
        </div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <thead>
        <tr style="background:linear-gradient(to right, ${esc(p1)}, ${esc(p2)});color:#fff;">
          <th style="text-align:left;padding:8px 12px;font-size:11px;">Désignation</th>
          <th style="text-align:center;padding:8px;font-size:11px;">Qté</th>
          <th style="text-align:right;padding:8px 12px;font-size:11px;">Montant (FCFA)</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="3" style="padding:12px;">Aucune ligne</td></tr>'}</tbody>
    </table>
    <div style="margin-top:0;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;overflow:hidden;">
      <div style="display:flex;justify-content:flex-end;">
        <div style="width:260px;">
          <div style="display:flex;justify-content:space-between;padding:8px 12px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;">
            <span style="color:#6b7280;">Sous-total HT</span><span style="font-weight:600;">${fmt(facture.montant_ht)} FCFA</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 12px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;">
            <span style="color:#6b7280;">TVA (${facture.tva_taux ?? 0}%)</span><span style="font-weight:600;">${Number(facture.tva_taux) === 0 ? 'Exonéré' : `${fmt(facture.montant_tva)} FCFA`}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px 12px;background:linear-gradient(to right, ${esc(p1)}, ${esc(p2)});color:#fff;font-weight:800;font-size:14px;">
            <span>TOTAL TTC</span><span>${fmt(total)} FCFA</span>
          </div>
        </div>
      </div>
      <p style="padding:10px 12px;margin:0;font-size:12px;font-weight:700;border-top:1px solid #e5e7eb;background:#fff;">
        Arrêté la présente facture à la somme de : ${esc(totalLettres)}.
      </p>
    </div>
    ${eb.compte_bancaire ? `<p style="margin-top:10px;font-size:11px;color:#4b5563;">RIB / compte : <strong style="font-family:monospace;">${esc(eb.compte_bancaire)}</strong></p>` : ''}
    <p style="margin-top:8px;font-size:10px;color:#9ca3af;">Dossier n° ${esc(facture.dossier_id)} · Document non contractuel</p>
  </div>
</div>`;
}

function buildFacturesExportHtml(factures, etabId) {
  const title = `Factures établissement ${etabId}`;
  const blocks = factures.map((f) => oneInvoiceHtml(f)).join('\n');
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/><title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 10mm; }
  body { margin: 0; background: #e5e7eb; }
  .invoice {
    background: #fff;
    width: 190mm;
    min-height: 277mm;
    max-height: 277mm;
    overflow: hidden;
    margin: 0 auto 12mm;
    page-break-after: always;
    page-break-inside: avoid;
    box-shadow: 0 1px 4px rgba(0,0,0,.08);
  }
  .invoice:last-child { page-break-after: auto; }
</style></head><body>${blocks}</body></html>`;
}

module.exports = { buildFacturesExportHtml, oneInvoiceHtml };
