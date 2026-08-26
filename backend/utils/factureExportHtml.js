/**
 * Export HTML imprimable (plusieurs factures, sauts de page) — sans dépendance externe.
 */

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
  const titreDoc = isDef ? 'FACTURE DÉFINITIVE' : 'FACTURE PROFORMA';
  const sousTitre = isDef ? 'Facture définitive' : 'Facture proforma — préinscription';
  const lignes = Array.isArray(facture.lignes) ? facture.lignes : [];
  const lignesSupp = Array.isArray(facture.lignes_supplementaires) ? facture.lignes_supplementaires : [];

  let rows = lignes
    .map((l, i) => {
      const desc = l.description != null ? l.description : l.designation || '';
      const q = l.quantite != null ? l.quantite : 1;
      const tot = l.total != null ? l.total : l.montant || 0;
      const bg = i % 2 === 0 ? '#fff' : '#f9fafb';
      return `<tr style="background:${bg};"><td style="padding:12px 16px;font-size:13px;">${esc(desc)}</td><td style="padding:12px;text-align:center;font-size:13px;">${esc(q)}</td><td style="padding:12px 16px;text-align:right;font-size:13px;font-weight:600;">${fmt(tot)}</td></tr>`;
    })
    .join('');

  if (lignesSupp.length > 0) {
    rows += `<tr><td colspan="3" style="padding:10px 16px;font-size:11px;font-style:italic;background:#fffbeb;color:#92400e;border-top:1px solid #fde68a;">Frais complémentaires (hors forfait annuel — non inclus dans le total TTC ci-dessous)</td></tr>`;
    lignesSupp.forEach((l, j) => {
      const desc = l.designation || '';
      const tot = l.montant != null ? l.montant : 0;
      const bg = (lignes.length + j) % 2 === 0 ? '#fffbeb' : '#fef3c7';
      rows += `<tr style="background:${bg};"><td style="padding:10px 16px;font-size:13px;">${esc(desc)}</td><td style="padding:10px;text-align:center;font-size:13px;">1</td><td style="padding:10px 16px;text-align:right;font-size:13px;font-weight:600;">${fmt(tot)}</td></tr>`;
    });
  }

  const typeLabel =
    fo.type === 'en_ligne'
      ? 'Formation en ligne'
      : `Formation présentielle${fo.ville ? ` · ${fo.ville}` : ''}`;

  return `
<div class="invoice">
  <div style="background:linear-gradient(to right, ${esc(p1)}, ${esc(p2)});color:#fff;padding:28px 36px;">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px;">
      <div>
        <div style="font-size:20px;font-weight:800;">${esc(eb.nom || 'Établissement')}</div>
        <div style="opacity:0.9;font-size:11px;margin-top:4px;">${esc(sousTitre)}</div>
        <div style="opacity:0.85;font-size:11px;margin-top:8px;line-height:1.5;">
          ${eb.adresse ? `<div>${esc(eb.adresse)}</div>` : ''}
          <div>${esc([eb.email_contact, eb.telephone].filter(Boolean).join(' · ') || '—')}</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="display:inline-block;background:#facc15;color:#111827;font-weight:900;font-size:16px;padding:8px 20px;border-radius:10px;margin-bottom:8px;">${esc(titreDoc)}</div>
        <div style="font-size:12px;opacity:0.9;">N° <strong style="font-family:monospace;color:#fff;">${esc(facture.numero)}</strong></div>
        <div style="font-size:12px;opacity:0.9;">Émission : <strong style="color:#fff;">${esc(fmtDate(facture.date_emission))}</strong></div>
        <div style="font-size:12px;opacity:0.9;">Valable jusqu'au : <strong style="color:#fff;">${esc(fmtDate(facture.date_echeance))}</strong></div>
      </div>
    </div>
  </div>
  <div style="padding:24px 36px;font-family:Segoe UI,system-ui,sans-serif;color:#111827;font-size:14px;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;">
      <div>
        <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Destinataire</div>
        <div style="background:#eff6ff;border:1px solid #dbeafe;border-radius:12px;padding:14px;">
          <div style="font-weight:700;">${esc(et.prenom)} ${esc(et.nom)}</div>
          <div style="font-size:13px;color:#4b5563;margin-top:6px;">
            ${et.nationalite ? `<div>Nationalité : ${esc(et.nationalite)}</div>` : ''}
            ${et.telephone ? `<div>Tél : ${esc(et.telephone)}</div>` : ''}
            ${et.email ? `<div>Email : ${esc(et.email)}</div>` : ''}
          </div>
        </div>
      </div>
      <div>
        <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Objet</div>
        <div style="border:1px solid ${esc(p1)}44;background:${esc(p1)}14;border-radius:12px;padding:14px;">
          <div style="font-weight:600;">Préinscription — ${esc(fo.titre || '—')} (${esc(typeLabel)})</div>
          ${fo.duree || fo.niveau_requis ? `<div style="font-size:12px;color:#6b7280;margin-top:6px;">Durée : ${esc(fo.duree || '—')} · Niveau requis : ${esc(fo.niveau_requis || '—')}</div>` : ''}
        </div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <thead>
        <tr style="background:linear-gradient(to right, ${esc(p1)}, ${esc(p2)});color:#fff;">
          <th style="text-align:left;padding:12px 16px;font-size:12px;">Désignation</th>
          <th style="text-align:center;padding:12px;font-size:12px;">Qté</th>
          <th style="text-align:right;padding:12px 16px;font-size:12px;">Montant (FCFA)</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="3" style="padding:16px;">Aucune ligne</td></tr>'}</tbody>
    </table>
    <div style="margin-top:0;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;overflow:hidden;">
      <div style="display:flex;justify-content:flex-end;">
        <div style="width:280px;">
          <div style="display:flex;justify-content:space-between;padding:10px 16px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:13px;">
            <span style="color:#6b7280;">Sous-total HT</span><span style="font-weight:600;">${fmt(facture.montant_ht)} FCFA</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px 16px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:13px;">
            <span style="color:#6b7280;">TVA (${facture.tva_taux ?? 0}%)</span><span style="font-weight:600;">${Number(facture.tva_taux) === 0 ? 'Exonéré' : `${fmt(facture.montant_tva)} FCFA`}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:14px 16px;background:linear-gradient(to right, ${esc(p1)}, ${esc(p2)});color:#fff;font-weight:800;font-size:15px;">
            <span>TOTAL TTC</span><span>${fmt(facture.montant_ttc)} FCFA</span>
          </div>
        </div>
      </div>
    </div>
    ${eb.compte_bancaire ? `<p style="margin-top:16px;font-size:12px;color:#4b5563;">RIB / compte : <strong style="font-family:monospace;">${esc(eb.compte_bancaire)}</strong></p>` : ''}
    <p style="margin-top:12px;font-size:11px;color:#9ca3af;">Dossier n° ${esc(facture.dossier_id)} · Document non contractuel</p>
  </div>
</div>`;
}

/**
 * @param {object[]} factures — objets facture complets lowdb
 * @param {number} etabId
 */
function buildFacturesExportHtml(factures, etabId) {
  const title = `Factures établissement ${etabId}`;
  const blocks = factures.map((f) => oneInvoiceHtml(f)).join('\n');
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(title)}</title>
<style>
  body { margin: 0; font-family: Segoe UI, system-ui, sans-serif; background: #e5e7eb; }
  .wrap { max-width: 900px; margin: 0 auto; padding: 16px; }
  .invoice { background: #fff; margin-bottom: 24px; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.08); page-break-after: always; }
  .invoice:last-child { page-break-after: auto; margin-bottom: 0; }
  @media print {
    body { background: #fff; }
    .wrap { padding: 0; max-width: none; }
    .invoice { box-shadow: none; border-radius: 0; }
  }
  @page { margin: 12mm; size: A4; }
</style>
</head>
<body>
<div class="wrap">
${blocks}
</div>
</body>
</html>`;
}

module.exports = { buildFacturesExportHtml, esc, fmt, fmtDate };
