/**
 * Nettoie les traces d’utilisateurs absents de `utilisateurs`
 * (orphelins après suppressions incomplètes / anciennes anonymisations).
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

function isPlaceholderEmail(email) {
  const e = String(email || '').toLowerCase();
  return (
    e.endsWith('@supprime.invalid')
    || e.endsWith('@invalid.local')
    || e.startsWith('supprime+')
    || e.includes('@supprime.')
  );
}

function hasIdentityPii(row) {
  if (!row) return false;
  return Boolean(
    String(row.prenom || '').trim()
    || String(row.nom || '').trim()
    || String(row.email || '').trim()
    || String(row.telephone || '').trim()
    || String(row.adresse || '').trim()
    || row.date_naissance
    || String(row.lieu_naissance || '').trim()
    || String(row.matricule || '').trim(),
  );
}

/**
 * @returns {{ summary: object }}
 */
function purgeOrphanUserTraces({ dryRun = false } = {}) {
  const users = db.get('utilisateurs').value() || [];
  const userIds = new Set(users.map((u) => Number(u.id)).filter((n) => Number.isFinite(n)));

  const summary = {
    dry_run: dryRun,
    dossiers_removed: 0,
    documents_removed: 0,
    factures_removed: 0,
    demandes_removed: 0,
    refs_cleared: 0,
    logs_scrubbed: 0,
    chat_purged: false,
  };

  const dossierIdsToDelete = new Set();
  (db.get('dossiers').value() || []).forEach((d) => {
    const orphanId = d.etudiant_id != null && !userIds.has(Number(d.etudiant_id));
    const placeholder = isPlaceholderEmail(d.email) || d.identite_supprimee === true;
    if (orphanId || placeholder) {
      dossierIdsToDelete.add(d.id);
    }
  });

  dossierIdsToDelete.forEach((dossierId) => {
    const docs = (db.get('documents').value() || []).filter((doc) => Number(doc.dossier_id) === Number(dossierId));
    docs.forEach((doc) => {
      if (!dryRun) {
        deleteUploadFile(doc.chemin);
        db.get('documents').remove({ id: doc.id }).write();
      }
      summary.documents_removed += 1;
    });
    const facts = (db.get('factures').value() || []).filter((f) => Number(f.dossier_id) === Number(dossierId));
    facts.forEach((f) => {
      if (!dryRun) db.get('factures').remove({ id: f.id }).write();
      summary.factures_removed += 1;
    });
    if (!dryRun) db.get('dossiers').remove({ id: dossierId }).write();
    summary.dossiers_removed += 1;
  });

  // Demandes orphelines / placeholder
  (db.get('demandes_proforma').value() || []).forEach((d) => {
    const orphanId = d.etudiant_id != null && !userIds.has(Number(d.etudiant_id));
    const placeholder = isPlaceholderEmail(d.email) || d.identite_supprimee === true;
    if (!orphanId && !placeholder) return;
    const just = d.justificatifs || {};
    if (!dryRun) {
      Object.values(just).forEach((v) => {
        if (typeof v === 'string') deleteUploadFile(v);
        else if (v && typeof v === 'object') deleteUploadFile(v.chemin || v.path || v.url);
      });
      if (d.facture_id) db.get('factures').remove({ id: d.facture_id }).write();
      db.get('demandes_proforma').remove({ id: d.id }).write();
    }
    summary.demandes_removed += 1;
  });

  // Factures avec snapshot orphelin
  (db.get('factures').value() || []).forEach((f) => {
    const snap = f.etudiant_snapshot || {};
    const orphan =
      (f.etudiant_id != null && !userIds.has(Number(f.etudiant_id)))
      || (snap.id != null && !userIds.has(Number(snap.id)))
      || isPlaceholderEmail(snap.email)
      || snap.supprime === true;
    if (!orphan) return;
    if (!dryRun) db.get('factures').remove({ id: f.id }).write();
    summary.factures_removed += 1;
  });

  // Références staff orphelines
  const clearIfMissing = (val) => val != null && !userIds.has(Number(val));

  (db.get('dossiers').value() || []).forEach((d) => {
    const patch = {};
    if (clearIfMissing(d.traite_par)) patch.traite_par = null;
    if (clearIfMissing(d.verifie_par)) {
      patch.verifie_par = null;
      patch.verifie_par_nom = '';
    }
    if (clearIfMissing(d.valide_par_comptable)) patch.valide_par_comptable = null;
    if (Object.keys(patch).length) {
      if (!dryRun) {
        db.get('dossiers').find({ id: d.id }).assign({ ...patch, updated_at: new Date().toISOString() }).write();
      }
      summary.refs_cleared += 1;
    }
  });

  (db.get('demandes_proforma').value() || []).forEach((d) => {
    const patch = {};
    if (clearIfMissing(d.creee_par)) patch.creee_par = null;
    if (clearIfMissing(d.acceptee_par)) patch.acceptee_par = null;
    if (Object.keys(patch).length) {
      if (!dryRun) db.get('demandes_proforma').find({ id: d.id }).assign(patch).write();
      summary.refs_cleared += 1;
    }
  });

  (db.get('etablissements').value() || []).forEach((e) => {
    const patch = {};
    if (clearIfMissing(e.responsable_id)) patch.responsable_id = null;
    if (clearIfMissing(e.admin_etablissement_id)) patch.admin_etablissement_id = null;
    if (Object.keys(patch).length) {
      if (!dryRun) db.get('etablissements').find({ id: e.id }).assign(patch).write();
      summary.refs_cleared += 1;
    }
  });

  (db.get('flyers').value() || []).forEach((f) => {
    if (clearIfMissing(f.created_by)) {
      if (!dryRun) db.get('flyers').find({ id: f.id }).assign({ created_by: null }).write();
      summary.refs_cleared += 1;
    }
  });

  (db.get('conditions_admission').value() || []).forEach((r) => {
    if (clearIfMissing(r.updated_by_user_id)) {
      if (!dryRun) db.get('conditions_admission').find({ id: r.id }).assign({ updated_by_user_id: null }).write();
      summary.refs_cleared += 1;
    }
  });

  (db.get('utilisateurs').value() || []).forEach((u) => {
    const patch = {};
    if (clearIfMissing(u.created_by)) patch.created_by = null;
    if (clearIfMissing(u.updated_by)) patch.updated_by = null;
    if (Object.keys(patch).length) {
      if (!dryRun) db.get('utilisateurs').find({ id: u.id }).assign(patch).write();
      summary.refs_cleared += 1;
    }
  });

  // Logs : drop rows pointant vers user_id inexistant
  ['audit_logs', 'security_events', 'chatbot_logs'].forEach((col) => {
    try {
      const rows = db.get(col).value() || [];
      const kept = rows.filter((row) => {
        if (row.user_id != null && !userIds.has(Number(row.user_id))) {
          summary.logs_scrubbed += 1;
          return false;
        }
        const tid = row.details?.target_user_id ?? row.details?.membre_id ?? row.details?.user_id;
        if (tid != null && !userIds.has(Number(tid))) {
          summary.logs_scrubbed += 1;
          return false;
        }
        return true;
      });
      if (!dryRun && kept.length !== rows.length) db.set(col, kept).write();
    } catch {
      /* ignore */
    }
  });

  // Chat : conversations dont un participant n’existe plus
  if (!dryRun) {
    try {
      const chatStore = require('../database/chatStore');
      const convs = (chatStore.chatDb.get('conversations').value() || []);
      const orphanConvs = convs.filter(
        (c) => Array.isArray(c.participants) && c.participants.some((p) => !userIds.has(Number(p))),
      );
      orphanConvs.forEach((c) => {
        const parts = (c.participants || []).map(Number);
        parts.forEach((pid) => {
          if (!userIds.has(pid) && typeof chatStore.purgeUserFromChat === 'function') {
            chatStore.purgeUserFromChat(pid);
          }
        });
      });
      if (orphanConvs.length) summary.chat_purged = true;
    } catch {
      /* ignore */
    }
  }

  return { summary, remaining_users: userIds.size };
}

module.exports = {
  purgeOrphanUserTraces,
  isPlaceholderEmail,
  hasIdentityPii,
};
