/**
 * Validations métier — inscription candidat (POST /api/auth/inscription).
 * À garder aligné avec frontend/src/lib/inscriptionValidation.js
 */

const MAX_NAME_LEN = 120;

/** Chaîne utilisable après saisie utilisateur (sans modifier le sens métier). */
function trimStr(v) {
  return String(v ?? '').trim();
}

/** Email : minuscules + trim (unicité et login). */
function normalizeEmail(email) {
  return trimStr(email).toLowerCase();
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmailFormat(emailNorm) {
  return EMAIL_REGEX.test(emailNorm);
}

/**
 * Politique mot de passe — nouveaux comptes uniquement (connexion inchangée pour les anciens mots de passe).
 * Min 8 caractères, 1 minuscule, 1 majuscule, 1 chiffre, 1 caractère spécial.
 */
function validatePasswordPolicy(motDePasse) {
  const p = String(motDePasse ?? '');
  if (p.length < 8) {
    return { ok: false, message: 'Le mot de passe doit contenir au moins 8 caractères.' };
  }
  if (!/[a-z]/.test(p)) {
    return { ok: false, message: 'Le mot de passe doit contenir au moins une lettre minuscule.' };
  }
  if (!/[A-Z]/.test(p)) {
    return { ok: false, message: 'Le mot de passe doit contenir au moins une lettre majuscule.' };
  }
  if (!/[0-9]/.test(p)) {
    return { ok: false, message: 'Le mot de passe doit contenir au moins un chiffre.' };
  }
  if (!/[^A-Za-z0-9]/.test(p)) {
    return { ok: false, message: 'Le mot de passe doit contenir au moins un caractère spécial (ex. ! ? @ #).' };
  }
  return { ok: true };
}

function validateNomPrenom(nom, prenom) {
  const n = trimStr(nom);
  const p = trimStr(prenom);
  if (!n) {
    return { ok: false, message: 'Le nom est obligatoire.' };
  }
  if (!p) {
    return { ok: false, message: 'Le prénom est obligatoire.' };
  }
  if (n.length > MAX_NAME_LEN || p.length > MAX_NAME_LEN) {
    return { ok: false, message: 'Le nom ou le prénom est trop long (maximum 120 caractères).' };
  }
  return { ok: true, nom: n, prenom: p };
}

module.exports = {
  trimStr,
  normalizeEmail,
  isValidEmailFormat,
  validatePasswordPolicy,
  validateNomPrenom,
  MAX_NAME_LEN,
};
