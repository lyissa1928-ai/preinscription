/**
 * Import Excel / CSV de comptes staff.
 * Colonnes : prenom, nom, email, role, telephone, adresse, service
 */
const ExcelJS = require('exceljs');
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { normalizeMatricule, normalizeTelephoneForUniqueness, telephoneTaken } = require('./userIdentity');
const { generateNextMatriculeForEtablissement, generateNextMatriculeGlobalAdmin } = require('./matriculeGenerator');
const { sendStaffInviteEmail } = require('./staffInviteEmail');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HEADER_ALIASES = {
  prenom: ['prenom', 'prénom', 'first_name', 'firstname'],
  nom: ['nom', 'last_name', 'lastname', 'name'],
  email: ['email', 'e-mail', 'mail', 'courriel'],
  role: ['role', 'rôle', 'profil'],
  telephone: ['telephone', 'téléphone', 'tel', 'phone', 'mobile'],
  adresse: ['adresse', 'address', 'adresse_physique'],
  service: ['service', 'fonction', 'poste'],
  etablissement_id: ['etablissement_id', 'etab_id', 'id_etablissement'],
};

function normHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
}

function mapHeader(raw) {
  const n = normHeader(raw);
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some((a) => normHeader(a) === n)) return key;
  }
  return null;
}

async function parseUserImportBuffer(buffer, originalName = '') {
  const name = String(originalName || '').toLowerCase();
  if (name.endsWith('.csv')) {
    const text = buffer.toString('utf8');
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return { error: 'Fichier vide ou sans données.' };
    const headers = lines[0].split(/[;,]/).map((h) => h.trim());
    const mapped = headers.map(mapHeader);
    if (!mapped.includes('prenom') || !mapped.includes('nom') || !mapped.includes('email') || !mapped.includes('role')) {
      return { error: 'Colonnes obligatoires manquantes : prenom, nom, email, role.' };
    }
    const rows = [];
    for (let i = 1; i < lines.length; i += 1) {
      const cells = lines[i].split(/[;,]/);
      const data = {};
      mapped.forEach((key, idx) => {
        if (key) data[key] = String(cells[idx] || '').trim();
      });
      if (Object.values(data).some((v) => v)) rows.push({ rowNumber: i + 1, data });
    }
    return { headers: mapped.filter(Boolean), rows };
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.worksheets[0];
  if (!sheet) return { error: 'Feuille Excel introuvable.' };
  const headerRow = sheet.getRow(1);
  const mapped = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    mapped[col - 1] = mapHeader(cell.value);
  });
  if (!mapped.includes('prenom') || !mapped.includes('nom') || !mapped.includes('email') || !mapped.includes('role')) {
    return { error: 'Colonnes obligatoires manquantes : prenom, nom, email, role.' };
  }
  const rows = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const data = {};
    mapped.forEach((key, idx) => {
      if (!key) return;
      const cell = row.getCell(idx + 1).value;
      data[key] = cell == null ? '' : String(typeof cell === 'object' && cell.text != null ? cell.text : cell).trim();
    });
    if (Object.values(data).some((v) => v)) rows.push({ rowNumber, data });
  });
  return { headers: mapped.filter(Boolean), rows };
}

async function buildUsersTemplateWorkbook() {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Utilisateurs');
  sheet.columns = [
    { header: 'prenom', key: 'prenom', width: 18 },
    { header: 'nom', key: 'nom', width: 18 },
    { header: 'email', key: 'email', width: 28 },
    { header: 'role', key: 'role', width: 20 },
    { header: 'telephone', key: 'telephone', width: 16 },
    { header: 'adresse', key: 'adresse', width: 30 },
    { header: 'service', key: 'service', width: 18 },
  ];
  sheet.addRow({
    prenom: 'Awa',
    nom: 'DIOP',
    email: 'awa.diop@exemple.sn',
    role: 'agent_admin',
    telephone: '771234567',
    adresse: 'Dakar',
    service: 'Scolarité',
  });
  sheet.getRow(1).font = { bold: true };
  return wb;
}

/**
 * @param {object} opts
 * @param {Array} opts.rows
 * @param {string[]} opts.allowedRoles
 * @param {number|null} opts.forcedEtabId — si défini, force etablissement_id
 * @param {boolean} opts.dryRun
 * @param {number} opts.actorId
 */
async function importUsersRows({ rows, allowedRoles, forcedEtabId = null, dryRun = true, actorId = null }) {
  const errors = [];
  const toCreate = [];
  let skipped = 0;

  for (const { rowNumber, data } of rows) {
    const prenom = String(data.prenom || '').trim();
    const nom = String(data.nom || '').trim();
    const email = String(data.email || '').trim().toLowerCase();
    const role = String(data.role || '').trim().toLowerCase();
    const telephone = String(data.telephone || '').trim();
    const adresse = String(data.adresse || '').trim();
    const service = String(data.service || '').trim();

    if (!prenom) errors.push({ row: rowNumber, field: 'prenom', message: 'Prénom obligatoire.' });
    if (!nom) errors.push({ row: rowNumber, field: 'nom', message: 'Nom obligatoire.' });
    if (!email || !EMAIL_RE.test(email)) errors.push({ row: rowNumber, field: 'email', message: 'Email invalide.' });
    if (!role || !allowedRoles.includes(role)) {
      errors.push({ row: rowNumber, field: 'role', message: `Rôle invalide (autorisés : ${allowedRoles.join(', ')}).` });
    }

    let etabId = forcedEtabId;
    if (etabId == null && data.etablissement_id) {
      etabId = parseInt(data.etablissement_id, 10);
    }
    const isGlobal = role === 'admin' || role === 'directeur';
    if (!isGlobal && !etabId) {
      errors.push({ row: rowNumber, field: 'etablissement_id', message: 'Établissement obligatoire pour ce rôle.' });
    }
    if (etabId && !isGlobal) {
      const etab = db.get('etablissements').find({ id: etabId }).value();
      if (!etab) errors.push({ row: rowNumber, field: 'etablissement_id', message: 'Établissement introuvable.' });
    }

    if (email && db.get('utilisateurs').find({ email }).value()) {
      skipped += 1;
      continue;
    }
    if (telephone) {
      const telNorm = normalizeTelephoneForUniqueness(telephone);
      if (telNorm.length < 8) {
        errors.push({ row: rowNumber, field: 'telephone', message: 'Téléphone trop court.' });
      } else if (telephoneTaken(telNorm, null)) {
        errors.push({ row: rowNumber, field: 'telephone', message: 'Téléphone déjà utilisé.' });
      }
    }

    toCreate.push({
      rowNumber,
      prenom,
      nom,
      email,
      role,
      telephone,
      adresse,
      service,
      etablissement_id: isGlobal ? null : etabId,
    });
  }

  if (errors.length) {
    return {
      ok: false,
      dry_run: dryRun,
      summary: { total_rows: rows.length, valid_rows: 0, invalid_rows: errors.length, created: 0, skipped },
      errors,
      created: [],
    };
  }

  const created = [];
  if (!dryRun) {
    for (const p of toCreate) {
      const isGlobal = p.role === 'admin' || p.role === 'directeur';
      const gen = isGlobal
        ? generateNextMatriculeGlobalAdmin()
        : generateNextMatriculeForEtablissement(p.etablissement_id);
      if (gen.error) {
        errors.push({ row: p.rowNumber, field: 'matricule', message: gen.error });
        continue;
      }
      // MDP temporaire aléatoire — activation via e-mail
      const tempPwd = bcrypt.hashSync(`Tmp${Date.now()}${Math.random().toString(36).slice(2)}!`, 10);
      const id = db.nextId('utilisateurs');
      const user = {
        id,
        prenom: p.prenom,
        nom: p.nom,
        email: p.email,
        matricule: normalizeMatricule(gen.matricule),
        date_naissance: null,
        telephone: p.telephone || '',
        adresse: p.adresse || '',
        service: p.service || '',
        fonction: p.service || '',
        mot_de_passe: tempPwd,
        role: p.role,
        etablissement_id: p.etablissement_id,
        actif: true,
        must_change_password: true,
        must_complete_profile: false,
        photo_url: null,
        login_attempts: 0,
        is_locked: false,
        lock_until: null,
        created_at: new Date().toISOString(),
        created_by: actorId,
        imported_excel: true,
      };
      db.get('utilisateurs').push(user).write();
      let emailSent = false;
      try {
        emailSent = await sendStaffInviteEmail(user);
      } catch { /* ignore */ }
      created.push({
        id,
        email: user.email,
        matricule: user.matricule,
        role: user.role,
        email_invite_sent: emailSent,
      });
    }
  }

  return {
    ok: true,
    dry_run: dryRun,
    summary: {
      total_rows: rows.length,
      valid_rows: toCreate.length,
      invalid_rows: 0,
      created: dryRun ? 0 : created.length,
      skipped,
    },
    errors: [],
    created: dryRun ? [] : created,
  };
}

module.exports = {
  parseUserImportBuffer,
  buildUsersTemplateWorkbook,
  importUsersRows,
};
