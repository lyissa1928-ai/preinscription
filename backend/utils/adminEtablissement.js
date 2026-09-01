const db = require('../database/db');
const { ROLE_ADMIN_ETABLISSEMENT } = require('./staffRoles');

const ROLE_FALLBACK_AFTER_DEMOTE = 'agent_admin';

function demotePatchFromAdminEtab(user) {
  const restored =
    user?.role_before_admin_etab && user.role_before_admin_etab !== ROLE_ADMIN_ETABLISSEMENT
      ? user.role_before_admin_etab
      : ROLE_FALLBACK_AFTER_DEMOTE;
  return {
    role: restored,
    role_before_admin_etab: null,
    updated_at: new Date().toISOString(),
  };
}

function promotePatchToAdminEtab(user) {
  const patch = {
    role: ROLE_ADMIN_ETABLISSEMENT,
    updated_at: new Date().toISOString(),
  };
  if (user?.role !== ROLE_ADMIN_ETABLISSEMENT) {
    patch.role_before_admin_etab = user?.role || ROLE_FALLBACK_AFTER_DEMOTE;
  }
  return patch;
}

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
 * L’ancien admin reprend son rôle d’origine (role_before_admin_etab) ou agent_admin par défaut.
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
    (db.get('utilisateurs').value() || [])
      .filter((u) => u.role === ROLE_ADMIN_ETABLISSEMENT && Number(u.etablissement_id) === eid)
      .forEach((u) => {
        db.get('utilisateurs').find({ id: u.id }).assign(demotePatchFromAdminEtab(u)).write();
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

  (db.get('utilisateurs').value() || [])
    .filter(
      (u) =>
        u.role === ROLE_ADMIN_ETABLISSEMENT &&
        Number(u.etablissement_id) === eid &&
        Number(u.id) !== uid
    )
    .forEach((u) => {
      db.get('utilisateurs').find({ id: u.id }).assign(demotePatchFromAdminEtab(u)).write();
    });

  (db.get('etablissements').value() || []).forEach((e) => {
    if (e.id !== eid && Number(e.admin_etablissement_id) === uid) {
      db.get('etablissements').find({ id: e.id }).assign({ admin_etablissement_id: null }).write();
    }
  });

  db.get('utilisateurs')
    .find({ id: uid })
    .assign({
      ...promotePatchToAdminEtab(user),
      etablissement_id: eid,
    })
    .write();

  db.get('etablissements').find({ id: eid }).assign({ admin_etablissement_id: uid }).write();

  return { ok: true, previous_id: previousId, nouveau_id: uid };
}

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
  demotePatchFromAdminEtab,
  promotePatchToAdminEtab,
  ROLE_FALLBACK_AFTER_DEMOTE,
};
