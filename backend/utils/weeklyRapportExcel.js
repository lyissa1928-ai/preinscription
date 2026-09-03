/**
 * Rapport Excel hebdomadaire Directeur — 1 fichier .xlsx par établissement.
 */
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const db = require('../database/db');

function hexToArgb(hex, fallback = 'FF1E40AF') {
  if (!hex || typeof hex !== 'string') return fallback;
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return fallback;
  return `FF${h.toUpperCase()}`;
}

async function prepareExcelLogoImageId(wb, logoUrl) {
  if (!logoUrl) return null;
  try {
    const rel = String(logoUrl).replace(/^\/+/, '').replace(/^uploads\//, '');
    const abs = path.join(__dirname, '..', 'uploads', rel);
    if (!fs.existsSync(abs)) return null;
    const buf = fs.readFileSync(abs);
    const ext = path.extname(abs).toLowerCase();
    const extension = ext === '.jpg' || ext === '.jpeg' ? 'jpeg' : ext === '.gif' ? 'gif' : 'png';
    return wb.addImage({ buffer: buf, extension });
  } catch {
    return null;
  }
}

function slugify(name) {
  return String(name || 'etablissement')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 40) || 'etablissement';
}

function weekBounds(refDate = new Date()) {
  const end = new Date(refDate);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function inRange(iso, start, end) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t >= start.getTime() && t <= end.getTime();
}

function countBy(arr, keyFn) {
  const map = new Map();
  for (const item of arr) {
    const k = keyFn(item) || '—';
    map.set(k, (map.get(k) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}

function styleHeaderRow(row, primary) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primary } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  row.height = 22;
}

/**
 * Génère un workbook Excel professionnel pour un établissement (période hebdo).
 */
async function buildWeeklyWorkbookForEtab(etab, { start, end } = weekBounds()) {
  const etabId = etab.id;
  const formations = (db.get('formations').value() || []).filter(
    (f) => Number(f.etablissement_id) === Number(etabId),
  );
  const formationById = new Map(formations.map((f) => [Number(f.id), f]));
  const filieres = (db.get('filieres').value() || []).filter(
    (f) => Number(f.etablissement_id) === Number(etabId),
  );
  const filiereById = new Map(filieres.map((f) => [Number(f.id), f]));

  const dossiers = (db.get('dossiers').value() || []).filter((d) => {
    if (Number(d.etablissement_id) === Number(etabId)) return true;
    const fo = d.formation_id != null ? formationById.get(Number(d.formation_id)) : null;
    return fo != null;
  }).filter((d) => inRange(d.created_at, start, end));

  const factures = (db.get('factures').value() || []).filter((f) => {
    if (f.supprime_at) return false;
    const fo = f.formation_id != null ? formationById.get(Number(f.formation_id)) : null;
    if (fo) return inRange(f.created_at || f.date_emission, start, end);
    const d = f.dossier_id != null
      ? (db.get('dossiers').find({ id: f.dossier_id }).value())
      : null;
    if (d && Number(d.etablissement_id) === Number(etabId)) {
      return inRange(f.created_at || f.date_emission, start, end);
    }
    return false;
  });

  const demandes = (db.get('demandes_proforma').value() || []).filter((d) => {
    if (Number(d.etablissement_id) === Number(etabId)) return inRange(d.created_at, start, end);
    const fo = d.formation_id != null ? formationById.get(Number(d.formation_id)) : null;
    return fo != null && inRange(d.created_at, start, end);
  });

  const byFiliere = countBy(dossiers, (d) => {
    if (d.filiere) return d.filiere;
    const fo = formationById.get(Number(d.formation_id));
    if (fo?.filiere_id) return filiereById.get(Number(fo.filiere_id))?.nom || `Filière #${fo.filiere_id}`;
    return '—';
  });
  const byFormation = countBy(dossiers, (d) => {
    if (d.formation_titre) return d.formation_titre;
    const fo = formationById.get(Number(d.formation_id));
    return fo?.titre || '—';
  });
  const byNiveau = countBy(dossiers, (d) => {
    if (d.formation_niveau_cible) return d.formation_niveau_cible;
    const fo = formationById.get(Number(d.formation_id));
    return fo?.niveau || '—';
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'UniPortail';
  wb.created = new Date();
  wb.title = `Rapport hebdomadaire — ${etab.nom || 'Établissement'}`;
  const primary = hexToArgb(etab.couleur_primaire, 'FFE5742A');
  const logoImageId = await prepareExcelLogoImageId(wb, etab.logo_url);

  const fmtDate = (d) => d.toLocaleDateString('fr-FR');
  const periodLabel = `Du ${fmtDate(start)} au ${fmtDate(end)}`;

  // ── Feuille Synthèse ──
  const syn = wb.addWorksheet('Synthèse');
  syn.views = [{ state: 'frozen', ySplit: 8 }];
  ;[14, 42, 18, 18, 18].forEach((w, i) => { syn.getColumn(i + 1).width = w; });
  syn.getRow(1).height = 56;

  syn.mergeCells('B1:E1');
  syn.getCell('B1').value = etab.nom || 'Établissement';
  syn.getCell('B1').font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
  syn.getCell('B1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primary } };
  syn.getCell('B1').alignment = { vertical: 'middle' };

  syn.mergeCells('B2:E2');
  syn.getCell('B2').value = 'Rapport hebdomadaire automatique — Directeur';
  syn.getCell('B2').font = { bold: true, size: 12, color: { argb: 'FF1F2937' } };

  syn.mergeCells('B3:E3');
  syn.getCell('B3').value = periodLabel;
  syn.getCell('B3').font = { size: 11, color: { argb: 'FF4B5563' } };

  syn.mergeCells('B4:E4');
  syn.getCell('B4').value = [
    etab.adresse,
    etab.telephone ? `Tél. ${etab.telephone}` : null,
    (etab.email_contact || etab.email) ? `E-mail ${etab.email_contact || etab.email}` : null,
  ].filter(Boolean).join('  ·  ') || 'Coordonnées non renseignées';
  syn.getCell('B4').font = { size: 9, color: { argb: 'FF6B7280' } };

  syn.mergeCells('B5:E5');
  syn.getCell('B5').value = `Généré le ${new Date().toLocaleString('fr-FR')} — UniPortail`;
  syn.getCell('B5').font = { italic: true, size: 9, color: { argb: 'FF9CA3AF' } };

  if (logoImageId) {
    syn.addImage(logoImageId, { tl: { col: 0, row: 0 }, ext: { width: 68, height: 68 } });
  }

  const kpiHeaders = ['Indicateur', 'Valeur', '', '', ''];
  const kpiRow = 7;
  kpiHeaders.forEach((h, i) => { syn.getCell(kpiRow, i + 1).value = h || ''; });
  styleHeaderRow(syn.getRow(kpiRow), primary);

  const kpis = [
    ['Factures / proformas créées', factures.length + demandes.filter((d) => d.facture).length],
    ['Factures (table factures)', factures.length],
    ['Demandes proforma', demandes.length],
    ['Préinscriptions (dossiers)', dossiers.length],
    ['Formations catalogue actives', formations.filter((f) => f.actif !== false).length],
    ['Filières', filieres.length],
  ];
  kpis.forEach((row, idx) => {
    const r = kpiRow + 1 + idx;
    syn.getCell(r, 1).value = row[0];
    syn.getCell(r, 2).value = row[1];
    syn.getCell(r, 1).font = { bold: true };
  });

  // Totaux ligne
  const totalRow = kpiRow + 1 + kpis.length + 1;
  syn.getCell(totalRow, 1).value = 'TOTAL PRÉINSCRIPTIONS';
  syn.getCell(totalRow, 2).value = dossiers.length;
  syn.getCell(totalRow, 1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  syn.getCell(totalRow, 2).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  syn.getCell(totalRow, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primary } };
  syn.getCell(totalRow, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primary } };

  function addCountSheet(name, pairs, colA, colB) {
    const sh = wb.addWorksheet(name);
    sh.getColumn(1).width = 48;
    sh.getColumn(2).width = 14;
    sh.getCell(1, 1).value = `${name} — ${etab.nom}`;
    sh.getCell(1, 1).font = { bold: true, size: 13 };
    sh.mergeCells('A1:B1');
    sh.getCell(2, 1).value = periodLabel;
    sh.getCell(2, 1).font = { italic: true, size: 9, color: { argb: 'FF6B7280' } };
    sh.getCell(4, 1).value = colA;
    sh.getCell(4, 2).value = colB;
    styleHeaderRow(sh.getRow(4), primary);
    if (pairs.length === 0) {
      sh.getCell(5, 1).value = 'Aucune donnée sur la période';
    } else {
      pairs.forEach(([k, v], i) => {
        sh.getCell(5 + i, 1).value = k;
        sh.getCell(5 + i, 2).value = v;
      });
      const tr = 5 + pairs.length;
      sh.getCell(tr, 1).value = 'TOTAL';
      sh.getCell(tr, 2).value = pairs.reduce((s, [, v]) => s + v, 0);
      sh.getCell(tr, 1).font = { bold: true };
      sh.getCell(tr, 2).font = { bold: true };
      sh.getCell(tr, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      sh.getCell(tr, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    }
  }

  addCountSheet('Par filière', byFiliere, 'Filière', 'Préinscriptions');
  addCountSheet('Par formation', byFormation, 'Formation', 'Préinscriptions');
  addCountSheet('Par niveau', byNiveau, 'Niveau d’étude', 'Préinscriptions');

  // Feuille détail dossiers
  const det = wb.addWorksheet('Détail préinscriptions');
  ;[14, 14, 14, 28, 22, 12, 14, 14, 12].forEach((w, i) => { det.getColumn(i + 1).width = w; });
  const headers = ['N° dossier', 'Prénom', 'Nom', 'Email', 'Formation', 'Niveau', 'Filière', 'Modalité', 'Date'];
  headers.forEach((h, i) => { det.getCell(1, i + 1).value = h; });
  styleHeaderRow(det.getRow(1), primary);
  dossiers
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .forEach((d, idx) => {
      const fo = formationById.get(Number(d.formation_id));
      const r = 2 + idx;
      det.getCell(r, 1).value = d.numero_dossier || d.id;
      det.getCell(r, 2).value = d.prenom || '';
      det.getCell(r, 3).value = d.nom || '';
      det.getCell(r, 4).value = d.email || '';
      det.getCell(r, 5).value = d.formation_titre || fo?.titre || '';
      det.getCell(r, 6).value = d.formation_niveau_cible || fo?.niveau || '';
      det.getCell(r, 7).value = d.filiere || '';
      det.getCell(r, 8).value = d.type_formation === 'en_ligne' ? 'FAD' : 'Présentiel';
      det.getCell(r, 9).value = d.created_at ? new Date(d.created_at).toLocaleDateString('fr-FR') : '';
    });

  return {
    workbook: wb,
    stats: {
      etablissement_id: etabId,
      etablissement_nom: etab.nom,
      period_start: start.toISOString(),
      period_end: end.toISOString(),
      dossiers: dossiers.length,
      factures: factures.length,
      demandes: demandes.length,
    },
  };
}

function rapportsDir() {
  const dir = path.join(__dirname, '..', 'uploads', 'rapports-hebdomadaires');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Génère et enregistre un .xlsx par établissement pour la semaine écoulée.
 */
async function generateWeeklyRapportsForAllEtabs(refDate = new Date()) {
  const { start, end } = weekBounds(refDate);
  const etabs = (db.get('etablissements').value() || []).filter((e) => e && e.actif !== false);
  const dir = rapportsDir();
  const stamp = end.toISOString().slice(0, 10);
  const results = [];

  for (const etab of etabs) {
    try {
      const { workbook, stats } = await buildWeeklyWorkbookForEtab(etab, { start, end });
      const filename = `rapport-hebdo-${slugify(etab.nom)}-${etab.id}-${stamp}.xlsx`;
      const abs = path.join(dir, filename);
      await workbook.xlsx.writeFile(abs);
      results.push({
        ok: true,
        path: abs,
        filename,
        url: `/uploads/rapports-hebdomadaires/${filename}`,
        ...stats,
      });
    } catch (e) {
      results.push({
        ok: false,
        etablissement_id: etab.id,
        etablissement_nom: etab.nom,
        error: e.message,
      });
    }
  }

  // Méta pour le Directeur
  const meta = {
    generated_at: new Date().toISOString(),
    period_start: start.toISOString(),
    period_end: end.toISOString(),
    files: results.filter((r) => r.ok),
    errors: results.filter((r) => !r.ok),
  };
  if (!Array.isArray(db.get('rapports_hebdomadaires').value())) {
    db.set('rapports_hebdomadaires', []).write();
  }
  db.get('rapports_hebdomadaires').push(meta).write();

  return meta;
}

module.exports = {
  weekBounds,
  buildWeeklyWorkbookForEtab,
  generateWeeklyRapportsForAllEtabs,
  hexToArgb,
  prepareExcelLogoImageId,
  slugify,
};
