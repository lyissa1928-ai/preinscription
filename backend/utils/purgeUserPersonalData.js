/**
 * Purge complète des données personnelles d’un utilisateur (hard delete).
 * Ne laisse pas de préremplissage / orphelins visibles.
 */
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const { unlinkQuiet } = require('./verifyUploadedFile');

function revokeSessionsForUser(userId) {
  try {
    const { revokeAllRefreshTokensForUser } = require('../database/authSessionStore');
    if (typeof revokeAllRefreshTokensForUser === 'function') {
      revokeAllRefreshTokensForUser(userId);
    }
  } catch {
    /* store optionnel */
  }
}

function scrubPersonalFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const keys = [
    'prenom', 'nom', 'email', 'telephone', 'adresse', 'date_naissance',
    'lieu_naissance', 'nationalite', 'pays_origine', 'pays_residence',
    'photo_url', 'matricule',
  ];
  const out = { ...obj };
  keys.forEach((k) => {
    if (k in out) out[k] = k === 'email' ? `supprime+${out.id || 'x'}@invalid.local` : '';
  });
  out.supprime = true;
  out.supprime_at = new Date().toISOString();
  return out;
}

/**
 * @param {number} userId
 * @returns {{ removed: boolean, scrubbed: object }}
 */
function purgeUserPersonalData(userId) {
  const id = Number(userId);
  const user = db.get('utilisateurs').find({ id }).value();
  if (!user) return { removed: false, scrubbed: {} };

  const emailNorm = String(user.email || '').trim().toLowerCase();
  const scrubbed = {
    prenom: user.prenom,
    nom: user.nom,
    email: user.email,
    telephone: user.telephone,
    adresse: user.adresse,
  };

  // Photo profil
  if (user.photo_url) {
    try {
      const rel = String(user.photo_url).replace(/^.*\/uploads\//, 'uploads/').replace(/^\//, '');
      const full = path.join(__dirname, '..', rel.startsWith('uploads') ? rel : path.join('uploads', path.basename(String(user.photo_url))));
      unlinkQuiet(full);
    } catch { /* ignore */ }
  }

  // Notifications
  const notifs = (db.get('notifications').value() || []).filter((n) => Number(n.user_id) === id);
  notifs.forEach((n) => db.get('notifications').remove({ id: n.id }).write());

  // Dossiers : anonymiser (garder historique métier sans PII)
  const dossiers = db.get('dossiers').value() || [];
  dossiers.forEach((d) => {
    if (Number(d.etudiant_id) === id || (emailNorm && String(d.email || '').toLowerCase() === emailNorm)) {
      db.get('dossiers').find({ id: d.id }).assign({
        prenom: '',
        nom: '',
        email: `dossier-${d.id}@supprime.invalid`,
        telephone: '',
        adresse: '',
        date_naissance: null,
        lieu_naissance: '',
        nationalite: '',
        pays_origine: '',
        pays_residence: '',
        etudiant_id: null,
        identite_supprimee: true,
        updated_at: new Date().toISOString(),
      }).write();
    }
  });

  // Demandes proforma
  const demandes = db.get('demandes_proforma').value() || [];
  demandes.forEach((d) => {
    const match =
      Number(d.etudiant_id) === id ||
      (emailNorm && String(d.email || '').toLowerCase() === emailNorm);
    if (match) {
      db.get('demandes_proforma').find({ id: d.id }).assign({
        prenom: '',
        nom: '',
        email: `demande-${d.id}@supprime.invalid`,
        telephone: '',
        adresse: '',
        etudiant_id: null,
        identite_supprimee: true,
        updated_at: new Date().toISOString(),
      }).write();
    }
  });

  // Factures snapshots
  const factures = db.get('factures').value() || [];
  factures.forEach((f) => {
    const snap = f.etudiant_snapshot;
    if (!snap) return;
    const match =
      Number(snap.id) === id ||
      (emailNorm && String(snap.email || '').toLowerCase() === emailNorm);
    if (match) {
      db.get('factures').find({ id: f.id }).assign({
        etudiant_snapshot: scrubPersonalFields({ ...snap, id: snap.id }),
        updated_at: new Date().toISOString(),
      }).write();
    }
  });

  // Chat messages meta (si collection messages)
  try {
    const messages = db.get('messages').value() || [];
    messages.forEach((m) => {
      if (Number(m.sender_id) === id || Number(m.user_id) === id) {
        db.get('messages').find({ id: m.id }).assign({
          sender_name: 'Utilisateur supprimé',
          updated_at: new Date().toISOString(),
        }).write();
      }
    });
  } catch { /* ignore */ }

  revokeSessionsForUser(id);
  db.get('utilisateurs').remove({ id }).write();

  return { removed: true, scrubbed };
}

module.exports = { purgeUserPersonalData, scrubPersonalFields };
