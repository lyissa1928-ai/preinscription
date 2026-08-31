const db = require('../database/db');
const { ROLE_ADMIN_ETABLISSEMENT } = require('./staffRoles');

const ROLE_FALLBACK_AFTER_DEMOTE = 'agent_admin';

/**
 * Résout l’administrateur établissement actuel (pointeur ou rôle).
 * @returns {object|null} utilisateur DB
 */
function findAdminEtablissementUser(etabId) {
  const eid = Number(etabId);
  const etab = db.get('etablissements').find({ id: eid }).value();
  if (!etab) return null;

  if (etab.admin_etablissement_id != null) {
    const byPtr = db.get('utilisateurs').find({ id: Number(etab.admin_etablissement_id) }).value();
    if (
      byPtr &&
      byPtr.actif !== false &&
      byPtr.role === ROLE_ADMIN_ETABLISSEMENT &&
      Number(byPtr.etablissement_id) === eid
    ) {
      return byPtr;
    }
  }

  const byRole = (db.get('utilisateurs').value() || []).find(
    (u) =>
      u.role === ROLE_ADMIN_ETABLISSEMENT &&
      Number(u.etablissement_id) === eid &&
      u.actif !== false
  );
  return byRole || null;
}

/**
 * Désigne (ou retire) l’unique administrateur d’un établissement.
 * L’ancien admin perd automatiquement le rôle (rétrogradé en agent_admin).
 *
 * @param {number} etabId
 * @param {number|null} userId  null = retirer
 * @returns {{ ok: true, previous_id, nouveau_id } | { ok: false, status, message }}
 */
function designateAdminEtablissement(etabId, userId) {
  const eid = Number(etabId);
  const etab = db.get('etablissements').find({ id: eid }).value();
  if (!etab) return { ok: false, status: 404, message: 'Établissement introuvable.' };

  const previous = findAdminEtablissementUser(eid);
  const previousId = previous?.id ?? etab.admin_etablissement_id ?? null;

  if (userId == null || userId === '' || userId === 0) {
    // Retirer
    (db.get('utilisateurs').value() || [])
      .filter((u) => u.role === ROLE_ADMIN_ETABLISSEMENT && Number(u.etablissement_id) === eid)
      .forEach((u) => {
        db.get('utilisateurs')
          .find({ id: u.id })
          .assign({ role: ROLE_FALLBACK_AFTER_DEMOTE, updated_at: new Date().toISOString() })
          .write();
      });
    db.get('etablissements').find({ id: eid }).assign({ admin_etablissement_id: null }).write();
    return { ok: true, previous_id: previousId, nouveau_id: null };
  }

  const uid = parseInt(userId, 10);
  if (Number.isNaN(uid)) {
    return { ok: false, status: 400, message: 'Identifiant utilisateur invalide.' };
  }

  const user = db.get('utilisateurs').find({ id: uid }).value();
  if (!user) return { ok: false, status: 404, message: 'Utilisateur introuvable.' };
  if (user.actif === false) {
    return { ok: false, status: 400, message: 'Ce compte est désactivé : réactivez-le avant de le désigner.' };
  }
  if (user.role === 'etudiant') {
    return { ok: false, status: 400, message: 'Un compte étudiant ne peut pas être administrateur d’établissement.' };
  }
  if (user.role === 'admin') {
    return {
      ok: false,
      status: 400,
      message: 'Un administrateur plateforme dispose déjà de tous les droits.',
    };
  }
  if (Number(user.etablissement_id) !== eid) {
    return {
      ok: false,
      status: 400,
      message: 'L’utilisateur doit être membre de cet établissement.',
    };
  }

  // Rétrograder tous les autres admin_etablissement de cet établissement
  (db.get('utilisateurs').value() || [])
    .filter(
      (u) =>
        u.role === ROLE_ADMIN_ETABLISSEMENT &&
        Number(u.etablissement_id) === eid &&
        Number(u.id) !== uid
    )
    .forEach((u) => {
      db.get('utilisateurs')
        .find({ id: u.id })
        .assign({ role: ROLE_FALLBACK_AFTER_DEMOTE, updated_at: new Date().toISOString() })
        .write();
    });

  // Nettoyer le pointeur sur d’autres établissements si ce compte y était admin
  (db.get('etablissements').value() || []).forEach((e) => {
    if (e.id !== eid && Number(e.admin_etablissement_id) === uid) {
      db.get('etablissements').find({ id: e.id }).assign({ admin_etablissement_id: null }).write();
    }
  });
  // Si ce compte était admin_etablissement ailleurs, le rétrograder aussi
  if (user.role === ROLE_ADMIN_ETABLISSEMENT && Number(user.etablissement_id) !== eid) {
    // already handled by etab change above
  }

  db.get('utilisateurs')
    .find({ id: uid })
    .assign({
      role: ROLE_ADMIN_ETABLISSEMENT,
      etablissement_id: eid,
      updated_at: new Date().toISOString(),
    })
    .write();

  db.get('etablissements').find({ id: eid }).assign({ admin_etablissement_id: uid }).write();

  return { ok: true, previous_id: previousId, nouveau_id: uid };
}

/**
 * À appeler après création/promotion d’un membre en admin_etablissement :
 * garantit l’unicité (remplace l’ancien).
 */
function enforceSingleAdminEtablissement(etabId, newAdminUserId) {
  return designateAdminEtablissement(etabId, newAdminUserId);
}

function pickAdminPublic(user) {
  if (!user) return null;
  return {
    id: user.id,
    prenom: user.prenom,
    nom: user.nom,
    email: user.email,
    role: user.role,
    actif: user.actif !== false,
  };
}

module.exports = {
  findAdminEtablissementUser,
  designateAdminEtablissement,
  enforceSingleAdminEtablissement,
  pickAdminPublic,
  ROLE_FALLBACK_AFTER_DEMOTE,
};
