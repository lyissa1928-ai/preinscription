const db = require('../database/db');
const { ROLE_ADMIN_ETABLISSEMENT } = require('./staffRoles');

const ROLE_FALLBACK_AFTER_DEMOTE = 'agent_admin';

function normalizeIdList(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0))];
}

function administreIdsOf(user) {
  const ids = normalizeIdList(user?.administre_etablissement_ids);
  if (user?.etablissement_id != null && user.role === ROLE_ADMIN_ETABLISSEMENT) {
    const primary = Number(user.etablissement_id);
    if (Number.isFinite(primary) && !ids.includes(primary)) ids.unshift(primary);
  }
  return ids;
}

function demotePatchFromAdminEtab(user) {
  const restored =
    user?.role_before_admin_etab && user.role_before_admin_etab !== ROLE_ADMIN_ETABLISSEMENT
      ? user.role_before_admin_etab
      : ROLE_FALLBACK_AFTER_DEMOTE;
  return {
    role: restored,
    role_before_admin_etab: null,
    administre_etablissement_ids: [],
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
 * Résout l’administrateur établissement actuel (pointeur ou rôle + liste).
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
      (Number(byPtr.etablissement_id) === eid || administreIdsOf(byPtr).includes(eid))
    ) {
      return byPtr;
    }
  }

  const byRole = (db.get('utilisateurs').value() || []).find(
    (u) =>
      u.role === ROLE_ADMIN_ETABLISSEMENT &&
      u.actif !== false &&
      (Number(u.etablissement_id) === eid || administreIdsOf(u).includes(eid))
  );
  return byRole || null;
}

/**
 * Désigne (ou retire) l’administrateur d’un établissement.
 * Une même personne peut administrer plusieurs établissements (ex. présentiel + FAD) :
 * on ne retire plus ses autres désignations.
 *
 * @param {number} etabId
 * @param {number|null} userId  null = retirer
 */
function designateAdminEtablissement(etabId, userId) {
  const eid = Number(etabId);
  const etab = db.get('etablissements').find({ id: eid }).value();
  if (!etab) return { ok: false, status: 404, message: 'Établissement introuvable.' };

  const previous = findAdminEtablissementUser(eid);
  const previousId = previous?.id ?? etab.admin_etablissement_id ?? null;

  if (userId == null || userId === '' || userId === 0) {
    (db.get('utilisateurs').value() || [])
      .filter(
        (u) =>
          u.role === ROLE_ADMIN_ETABLISSEMENT &&
          (Number(u.etablissement_id) === eid || administreIdsOf(u).includes(eid))
      )
      .forEach((u) => {
        const remaining = administreIdsOf(u).filter((id) => id !== eid);
        if (remaining.length === 0) {
          db.get('utilisateurs').find({ id: u.id }).assign(demotePatchFromAdminEtab(u)).write();
        } else {
          db.get('utilisateurs')
            .find({ id: u.id })
            .assign({
              administre_etablissement_ids: remaining,
              etablissement_id: remaining[0],
              updated_at: new Date().toISOString(),
            })
            .write();
        }
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

  const alreadyAdminElsewhere =
    user.role === ROLE_ADMIN_ETABLISSEMENT && administreIdsOf(user).some((id) => id !== eid);
  const isMember = Number(user.etablissement_id) === eid || administreIdsOf(user).includes(eid);
  if (!isMember && !alreadyAdminElsewhere) {
    return {
      ok: false,
      status: 400,
      message:
        'L’utilisateur doit être membre de cet établissement, ou déjà administrateur d’un autre établissement (présentiel / FAD).',
    };
  }

  // Un seul admin « actif » par établissement (autres rétrogradés sur CET étab. uniquement)
  (db.get('utilisateurs').value() || [])
    .filter(
      (u) =>
        Number(u.id) !== uid &&
        u.role === ROLE_ADMIN_ETABLISSEMENT &&
        (Number(u.etablissement_id) === eid || administreIdsOf(u).includes(eid))
    )
    .forEach((u) => {
      const remaining = administreIdsOf(u).filter((id) => id !== eid);
      if (remaining.length === 0) {
        db.get('utilisateurs').find({ id: u.id }).assign(demotePatchFromAdminEtab(u)).write();
      } else {
        db.get('utilisateurs')
          .find({ id: u.id })
          .assign({
            administre_etablissement_ids: remaining,
            etablissement_id: Number(u.etablissement_id) === eid ? remaining[0] : u.etablissement_id,
            updated_at: new Date().toISOString(),
          })
          .write();
      }
    });

  const ids = administreIdsOf(user);
  if (!ids.includes(eid)) ids.push(eid);

  const primary =
    user.role === ROLE_ADMIN_ETABLISSEMENT && user.etablissement_id != null
      ? Number(user.etablissement_id)
      : eid;

  db.get('utilisateurs')
    .find({ id: uid })
    .assign({
      ...promotePatchToAdminEtab(user),
      etablissement_id: primary,
      administre_etablissement_ids: ids,
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
    etablissement_id: user.etablissement_id ?? null,
    administre_etablissement_ids: administreIdsOf(user),
  };
}

module.exports = {
  findAdminEtablissementUser,
  designateAdminEtablissement,
  enforceSingleAdminEtablissement,
  pickAdminPublic,
  demotePatchFromAdminEtab,
  promotePatchToAdminEtab,
  administreIdsOf,
  ROLE_FALLBACK_AFTER_DEMOTE,
};
