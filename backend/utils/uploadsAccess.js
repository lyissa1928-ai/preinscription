/**
 * Logique d'accès aux fichiers /uploads, isolée du middleware pour être testable
 * sans HTTP ni base de données (Lot 3 : filet de tests sur la sécurité Lot 1).
 *
 * `decideUploadAccess` est une fonction pure : elle reçoit le chemin relatif, le
 * rôle/établissement de l'utilisateur et un contexte de résolution du dossier,
 * et retourne une décision normalisée.
 */
const PUBLIC_PREFIXES = ['etablissements/'];
const STAFF_ROLES = new Set(['admin', 'responsable', 'agent_admin', 'comptable', 'controleur_qualite']);

/** Normalise un chemin d'upload et détecte les tentatives de traversal. */
function normalizeUploadPath(rawPath) {
  let rel;
  try {
    rel = decodeURIComponent(String(rawPath || '')).replace(/\\/g, '/').replace(/^\/+/, '');
  } catch {
    return { ok: false, rel: null };
  }
  if (!rel || rel.includes('..')) return { ok: false, rel: null };
  return { ok: true, rel };
}

function isStaffRole(role) {
  return STAFF_ROLES.has(role);
}

function isPublicUploadPath(rel) {
  return PUBLIC_PREFIXES.some((p) => rel.startsWith(p));
}

/**
 * @param {string} rel  chemin relatif normalisé (sans slash initial)
 * @param {{role:string, id:number|string, etablissement_id?:number|string|null}} user
 * @param {{doc:object|null, dossier:object|null, etabId:number|null}} [dossierCtx]
 *        résolution du document racine (fournie par le middleware via la DB).
 * @returns {{ allow:boolean, status?:number, reason?:string }}
 */
function decideUploadAccess(rel, user, dossierCtx) {
  if (!user || !user.role) return { allow: false, status: 401, reason: 'no_user' };
  const role = user.role;

  if (rel.startsWith('chat-attachments/')) return { allow: true };

  if (rel.startsWith('proforma-justificatifs/')) {
    return isStaffRole(role)
      ? { allow: true }
      : { allow: false, status: 403, reason: 'proforma_staff_only' };
  }

  // Racine : documents des dossiers étudiants.
  if (role === 'admin') return { allow: true };

  const ctx = dossierCtx || { doc: null, dossier: null, etabId: null };
  if (!ctx.doc || !ctx.dossier) {
    return { allow: false, status: 404, reason: 'not_found' };
  }

  if (role === 'etudiant') {
    return Number(ctx.dossier.etudiant_id) === Number(user.id)
      ? { allow: true }
      : { allow: false, status: 403, reason: 'not_owner' };
  }

  if (isStaffRole(role)) {
    const sameEtab =
      ctx.etabId != null &&
      user.etablissement_id != null &&
      Number(ctx.etabId) === Number(user.etablissement_id);
    return sameEtab
      ? { allow: true }
      : { allow: false, status: 403, reason: 'cross_etab' };
  }

  return { allow: false, status: 403, reason: 'forbidden' };
}

module.exports = {
  PUBLIC_PREFIXES,
  STAFF_ROLES,
  normalizeUploadPath,
  isStaffRole,
  isPublicUploadPath,
  decideUploadAccess,
};
