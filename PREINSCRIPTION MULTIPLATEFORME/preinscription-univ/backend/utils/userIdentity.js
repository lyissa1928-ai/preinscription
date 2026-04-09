const db = require('../database/db');

function normalizeMatricule(m) {
  return String(m || '').trim().toUpperCase();
}

/** Format : lettres, chiffres, tirets — 4 à 32 caractères au total */
function isValidMatriculeFormat(m) {
  const s = normalizeMatricule(m);
  return /^[A-Z0-9][A-Z0-9-]{2,30}$/.test(s) && s.length >= 4 && s.length <= 32;
}

function matriculeTaken(normalizedMatricule, excludeUserId) {
  const m = normalizeMatricule(normalizedMatricule);
  if (!m) return false;
  return (db.get('utilisateurs').value() || []).some(
    u => (excludeUserId == null || u.id !== excludeUserId) && normalizeMatricule(u.matricule) === m
  );
}

/** Chiffres uniquement — pour comparer +221 77… et 77… */
function normalizeTelephoneForUniqueness(t) {
  return String(t || '').replace(/\D/g, '');
}

/** Téléphone déjà utilisé par un autre compte (hors excludeUserId). Chaîne vide = jamais « pris ». */
function telephoneTaken(normalizedDigits, excludeUserId) {
  const n = normalizedDigits;
  if (!n) return false;
  return (db.get('utilisateurs').value() || []).some((u) => {
    if (excludeUserId != null && u.id === excludeUserId) return false;
    return normalizeTelephoneForUniqueness(u.telephone) === n;
  });
}

module.exports = {
  normalizeMatricule,
  isValidMatriculeFormat,
  matriculeTaken,
  normalizeTelephoneForUniqueness,
  telephoneTaken,
};
