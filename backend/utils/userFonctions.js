/**
 * Fonctions (responsabilités supplémentaires) d'un utilisateur, indépendantes
 * de son rôle principal.
 *
 * Besoin métier : n'importe quel membre du staff d'un établissement peut être
 * désigné « responsable d'établissement » par l'administrateur, sans devoir
 * changer son rôle principal (un comptable peut être responsable désigné).
 *
 * La désignation vit dans `etablissements.responsable_id`. Un utilisateur
 * exerce la fonction `responsable` si l'établissement auquel il est rattaché
 * le désigne. La fonction est calculée à chaque requête (jamais stockée dans
 * le JWT) : retirer la désignation retire les droits immédiatement, et un
 * changement d'établissement fait perdre la fonction (le pointeur de l'ancien
 * établissement ne donne aucun droit sur le nouveau).
 */
// Require paresseux : permet aux tests d'importer les fonctions pures
// (computeEstResponsableDesigne, roleAllows, actsAsResponsable) sans charger la DB.
function getDb() {
  return require('../database/db');
}

/**
 * Version pure (testable sans DB).
 * @param {object} user  utilisateur (role, id, etablissement_id, actif)
 * @param {Array}  etablissements  liste des établissements
 * @returns {boolean} true si l'utilisateur est le responsable désigné de SON établissement
 */
function computeEstResponsableDesigne(user, etablissements) {
  if (!user || user.actif === false) return false;
  // Un étudiant ne peut pas exercer une fonction staff ; un admin global a déjà tous les droits.
  if (user.role === 'etudiant' || user.role === 'admin') return false;
  if (user.etablissement_id == null) return false;
  const etab = (etablissements || []).find((e) => Number(e.id) === Number(user.etablissement_id));
  if (!etab || etab.actif === false) return false;
  return etab.responsable_id != null && Number(etab.responsable_id) === Number(user.id);
}

/** Fonctions effectives d'un utilisateur (lecture DB). */
function getFonctions(user) {
  const etabs = getDb().get('etablissements').value() || [];
  return computeEstResponsableDesigne(user, etabs) ? ['responsable'] : [];
}

/** Version pure : l'utilisateur (req.user enrichi) agit-il comme responsable ? */
function actsAsResponsable(user) {
  if (!user) return false;
  return user.role === 'responsable' || (user.fonctions || []).includes('responsable');
}

/**
 * Version pure : décision d'un garde par rôles, en tenant compte des fonctions.
 * @param {object} user  req.user enrichi ({ role, fonctions })
 * @param {string[]} roles  rôles acceptés
 */
function roleAllows(user, roles) {
  if (!user || !user.role) return false;
  if (roles.includes(user.role)) return true;
  return (user.fonctions || []).some((f) => roles.includes(f));
}

/** Enrichit un utilisateur DB avec ses fonctions (pour chatRules, etc.). */
function withFonctions(user) {
  if (!user) return user;
  return { ...user, fonctions: getFonctions(user) };
}

module.exports = {
  computeEstResponsableDesigne,
  getFonctions,
  actsAsResponsable,
  roleAllows,
  withFonctions,
};
