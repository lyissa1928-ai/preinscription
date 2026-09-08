/**
 * Purge GDPR — suppression définitive d’un utilisateur :
 * aucune donnée personnelle ne doit rester consultable (interfaces, formulaires, JSON).
 */
const path = require('path');
const db = require('../database/db');
const { unlinkQuiet } = require('./verifyUploadedFile');

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

function resolveUploadPath(cheminOrUrl) {
  if (!cheminOrUrl) return null;
  const s = String(cheminOrUrl).replace(/\\/g, '/');
  const idx = s.indexOf('/uploads/');
  const rel = idx >= 0
    ? s.slice(idx + '/uploads/'.length)
    : s.replace(/^uploads\//, '').replace(/^\//, '');
  if (!rel || rel.includes('..')) return null;
  return path.join(UPLOADS_ROOT, rel);
}

function deleteUploadFile(cheminOrUrl) {
  const full = resolveUploadPath(cheminOrUrl);
  if (full) unlinkQuiet(full);
}

function revokeAndDeleteSessions(userId) {
  try {
    const store = require('../database/authSessionStore');
    if (typeof store.deleteAllRefreshTokensForUser === 'function') {
      store.deleteAllRefreshTokensForUser(userId);
    } else if (typeof store.revokeAllRefreshTokensForUser === 'function') {
      store.revokeAllRefreshTokensForUser(userId);
    }
  } catch {
    /* store optionnel */
  }
}

function purgeChatForUser(userId) {
  try {
    const chatStore = require('../database/chatStore');
    if (typeof chatStore.purgeUserFromChat === 'function') {
      chatStore.purgeUserFromChat(userId);
    }
  } catch {
    /* chat store optionnel */
  }
}

function scrubLogDetails(details) {
  if (!details || typeof details !== 'object') return details;
  const out = { ...details };
  [
    'email', 'target_email', 'prenom', 'nom', 'telephone', 'adresse',
    'matricule', 'confirmation_email', 'confirmation_matricule',
  ].forEach((k) => {
    if (k in out) delete out[k];
  });
  return out;
}

/**
 * @param {number} userId
 * @returns {{ removed: boolean }}
 */
function purgeUserPersonalData(userId) {
  const id = Number(userId);
  const user = db.get('utilisateurs').find({ id }).value();
  if (!user) return { removed: false };

  const emailNorm = String(user.email || '').trim().toLowerCase();
  const matriculeNorm = String(user.matricule || '').trim().toUpperCase();

  // Photo profil
  if (user.photo_url) deleteUploadFile(user.photo_url);

  // Notifications
  const notifs = (db.get('notifications').value() || []).filter((n) => Number(n.user_id) === id);
  notifs.forEach((n) => db.get('notifications').remove({ id: n.id }).write());

  // Dossiers du candidat → documents + fichiers + factures liées
  const dossiers = db.get('dossiers').value() || [];
  const dossierIdsToDelete = new Set();
  dossiers.forEach((d) => {
    const owned =
      Number(d.etudiant_id) === id
      || (emailNorm && String(d.email || '').toLowerCase() === emailNorm)
      || (matriculeNorm && String(d.matricule || '').toUpperCase() === matriculeNorm);
    if (owned) dossierIdsToDelete.add(d.id);
  });

  dossierIdsToDelete.forEach((dossierId) => {
    const docs = (db.get('documents').value() || []).filter((doc) => Number(doc.dossier_id) === Number(dossierId));
    docs.forEach((doc) => {
      deleteUploadFile(doc.chemin);
      db.get('documents').remove({ id: doc.id }).write();
    });
    const facts = (db.get('factures').value() || []).filter(
      (f) => Number(f.dossier_id) === Number(dossierId) || Number(f.etudiant_id) === id,
    );
    facts.forEach((f) => db.get('factures').remove({ id: f.id }).write());
    db.get('dossiers').remove({ id: dossierId }).write();
  });

  // Autres dossiers : effacer références staff (noms / ids) sans PII du compte
  (db.get('dossiers').value() || []).forEach((d) => {
    const patch = {};
    if (Number(d.traite_par) === id) patch.traite_par = null;
    if (Number(d.verifie_par) === id) {
      patch.verifie_par = null;
      patch.verifie_par_nom = '';
    }
    if (Number(d.valide_par_comptable) === id) patch.valide_par_comptable = null;
    if (Object.keys(patch).length) {
      db.get('dossiers').find({ id: d.id }).assign({
        ...patch,
        updated_at: new Date().toISOString(),
      }).write();
    }
  });

  // Demandes proforma (candidat)
  const demandes = db.get('demandes_proforma').value() || [];
  demandes.forEach((d) => {
    const match =
      Number(d.etudiant_id) === id
      || (emailNorm && String(d.email || '').toLowerCase() === emailNorm);
    if (!match) {
      // Staff refs
      const patch = {};
      if (Number(d.creee_par) === id) patch.creee_par = null;
      if (Number(d.acceptee_par) === id) patch.acceptee_par = null;
      if (Object.keys(patch).length) {
        db.get('demandes_proforma').find({ id: d.id }).assign(patch).write();
      }
      return;
    }
    const just = d.justificatifs || {};
    Object.values(just).forEach((v) => {
      if (typeof v === 'string') deleteUploadFile(v);
      else if (v && typeof v === 'object') {
        deleteUploadFile(v.chemin || v.path || v.url);
      }
    });
    if (Array.isArray(d.pieces)) {
      d.pieces.forEach((p) => deleteUploadFile(p?.chemin || p?.url || p));
    }
    if (d.facture_id) {
      db.get('factures').remove({ id: d.facture_id }).write();
    }
    db.get('demandes_proforma').remove({ id: d.id }).write();
  });

  // Factures restantes (snapshot / etudiant_id)
  (db.get('factures').value() || []).forEach((f) => {
    const snap = f.etudiant_snapshot || {};
    const match =
      Number(f.etudiant_id) === id
      || Number(snap.id) === id
      || (emailNorm && String(snap.email || '').toLowerCase() === emailNorm);
    if (match) {
      db.get('factures').remove({ id: f.id }).write();
    }
  });

  // Établissements : pointeurs
  (db.get('etablissements').value() || []).forEach((e) => {
    const patch = {};
    if (Number(e.responsable_id) === id) patch.responsable_id = null;
    if (Number(e.admin_etablissement_id) === id) patch.admin_etablissement_id = null;
    if (Object.keys(patch).length) {
      db.get('etablissements').find({ id: e.id }).assign(patch).write();
    }
  });

  // Flyers / conditions
  (db.get('flyers').value() || []).forEach((f) => {
    if (Number(f.created_by) === id) {
      db.get('flyers').find({ id: f.id }).assign({ created_by: null }).write();
    }
  });
  (db.get('conditions_admission').value() || []).forEach((r) => {
    if (Number(r.updated_by_user_id) === id) {
      db.get('conditions_admission').find({ id: r.id }).assign({ updated_by_user_id: null }).write();
    }
  });

  // Autres utilisateurs : created_by / updated_by
  (db.get('utilisateurs').value() || []).forEach((u) => {
    if (u.id === id) return;
    const patch = {};
    if (Number(u.created_by) === id) patch.created_by = null;
    if (Number(u.updated_by) === id) patch.updated_by = null;
    if (Object.keys(patch).length) {
      db.get('utilisateurs').find({ id: u.id }).assign(patch).write();
    }
  });

  // Audit / sécurité / chatbot — supprimer les lignes liées, sinon scrub email
  const scrubCollections = ['audit_logs', 'security_events', 'chatbot_logs'];
  scrubCollections.forEach((col) => {
    try {
      const rows = db.get(col).value() || [];
      const kept = [];
      rows.forEach((row) => {
        const byId = Number(row.user_id) === id
          || Number(row.details?.user_id) === id
          || Number(row.details?.target_user_id) === id
          || Number(row.details?.membre_id) === id;
        const byEmail = emailNorm && (
          String(row.details?.email || '').toLowerCase() === emailNorm
          || String(row.details?.target_email || '').toLowerCase() === emailNorm
        );
        if (byId || byEmail) return; // drop
        if (row.details && typeof row.details === 'object') {
          kept.push({ ...row, details: scrubLogDetails(row.details), user_id: Number(row.user_id) === id ? null : row.user_id });
        } else {
          kept.push(row);
        }
      });
      if (kept.length !== rows.length) db.set(col, kept).write();
    } catch {
      /* collection absente */
    }
  });

  purgeChatForUser(id);
  revokeAndDeleteSessions(id);

  // Compte utilisateur (dernier)
  db.get('utilisateurs').remove({ id }).write();

  return { removed: true };
}

module.exports = { purgeUserPersonalData, deleteUploadFile };
