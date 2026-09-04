/**
 * Génération PDF simple (PDFKit) pour rapports hebdomadaires.
 */
const PDFDocument = require('pdfkit');
const fs = require('fs');

function writePdfFile(absPath, buildFn) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const stream = fs.createWriteStream(absPath);
    doc.pipe(stream);
    try {
      buildFn(doc);
      doc.end();
    } catch (e) {
      reject(e);
      return;
    }
    stream.on('finish', () => resolve(absPath));
    stream.on('error', reject);
  });
}

function drawTitle(doc, title, subtitle) {
  doc.fontSize(16).fillColor('#1e3a5f').text(title, { align: 'left' });
  if (subtitle) {
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#4b5563').text(subtitle);
  }
  doc.moveDown(0.8);
}

function drawKv(doc, label, value) {
  doc.fontSize(10).fillColor('#111827');
  doc.text(`${label} : ${value == null ? '—' : value}`);
}

/**
 * PDF activité staff d'un établissement.
 */
async function writeStaffActivityPdf(absPath, { etabNom, periodLabel, activity, generatedAt }) {
  return writePdfFile(absPath, (doc) => {
    drawTitle(
      doc,
      `Rapport hebdomadaire — ${etabNom || 'Établissement'}`,
      `${periodLabel || ''}\nGénéré le ${generatedAt || new Date().toLocaleString('fr-FR')} — UniPortail`,
    );

    doc.fontSize(12).fillColor('#1e40af').text('Synthèse activité staff');
    doc.moveDown(0.4);
    drawKv(doc, 'Membres staff', activity?.totals?.staff_count ?? 0);
    drawKv(doc, 'Actions totales', activity?.totals?.actions_total ?? 0);
    drawKv(doc, 'Dossiers / préinscriptions traités', activity?.totals?.dossiers_traites ?? 0);
    drawKv(doc, 'Factures / proformas générées', activity?.totals?.factures_generees ?? 0);
    drawKv(doc, 'Demandes traitées', activity?.totals?.demandes_traitees ?? 0);
    doc.moveDown(0.6);

    const star = activity?.mostActive;
    if (star) {
      doc.fontSize(11).fillColor('#b45309').text(
        `Membre le plus actif : ${star.prenom} ${star.nom} (${star.actions_total} action${star.actions_total > 1 ? 's' : ''})`,
      );
      doc.moveDown(0.6);
    } else {
      doc.fontSize(10).fillColor('#6b7280').text('Aucune activité staff enregistrée sur la période.');
      doc.moveDown(0.6);
    }

    doc.fontSize(12).fillColor('#1e40af').text('Classement par activité');
    doc.moveDown(0.4);

    const ranking = activity?.ranking || [];
    if (ranking.length === 0) {
      doc.fontSize(10).fillColor('#6b7280').text('Aucun membre.');
      return;
    }

    ranking.forEach((r, i) => {
      doc.fontSize(10).fillColor('#111827');
      doc.text(
        `${i + 1}. ${r.prenom} ${r.nom} — ${r.role} — ${r.actions_total} action(s)`
          + ` (dossiers: ${r.dossiers_traites}, factures: ${r.factures_generees}, demandes: ${r.demandes_traitees}, audit: ${r.audit_actions})`,
      );
      doc.moveDown(0.25);
      if (doc.y > 720) doc.addPage();
    });
  });
}

/**
 * PDF comparaison multi-établissements (Directeur).
 */
async function writeDirecteurComparePdf(absPath, { periodLabel, rows, generatedAt }) {
  return writePdfFile(absPath, (doc) => {
    drawTitle(
      doc,
      'Rapport Directeur — comparaison des établissements',
      `${periodLabel || ''}\nGénéré le ${generatedAt || new Date().toLocaleString('fr-FR')} — UniPortail`,
    );

    (rows || []).forEach((r, i) => {
      doc.fontSize(11).fillColor('#1e3a5f').text(`${i + 1}. ${r.etablissement_nom || 'Établissement'}`);
      doc.fontSize(9).fillColor('#374151');
      doc.text(
        `Préinscriptions: ${r.dossiers ?? 0}  ·  Factures: ${r.factures ?? 0}  ·  Demandes: ${r.demandes ?? 0}`
          + `  ·  Actions staff: ${r.staff_actions ?? 0}`
          + (r.most_active_name ? `  ·  Top: ${r.most_active_name}` : ''),
      );
      doc.moveDown(0.45);
      if (doc.y > 720) doc.addPage();
    });
  });
}

module.exports = {
  writeStaffActivityPdf,
  writeDirecteurComparePdf,
  writePdfFile,
};
