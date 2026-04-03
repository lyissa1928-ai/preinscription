const db = require('../database/db');
const { normalizeMatricule } = require('./userIdentity');

/** Retire les accents (NFKD + suppression des marques diacritiques). */
function stripAccents(str) {
  return String(str || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Trois lettres majuscules dérivées du nom d'établissement (A–Z uniquement).
 * Complété par X si moins de 3 lettres disponibles.
 */
function threeLetterPrefixFromEtablissementNom(nom) {
  const letters = stripAccents(nom)
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  const base = letters.length >= 3 ? letters.slice(0, 3) : `${letters}XXX`.slice(0, 3);
  return base;
}

/**
 * Prochain matricule unique : préfixe (3 lettres du nom d'établissement) + 3 chiffres (001–999).
 * @param {number} etablissementId
 * @returns {{ matricule?: string, error?: string }}
 */
function generateNextMatriculeForEtablissement(etablissementId) {
  const id = parseInt(String(etablissementId), 10);
  if (Number.isNaN(id)) {
    return { error: 'Identifiant d\'établissement invalide.' };
  }
  const etab = db.get('etablissements').find({ id }).value();
  if (!etab) {
    return { error: 'Établissement introuvable.' };
  }
  const prefix = threeLetterPrefixFromEtablissementNom(etab.nom);
  const re = new RegExp(`^${prefix}(\\d{3})$`, 'i');
  let max = 0;
  for (const u of db.get('utilisateurs').value()) {
    const m = normalizeMatricule(u.matricule).match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const next = max + 1;
  if (next > 999) {
    return {
      error: 'Nombre maximum de matricules atteint pour ce préfixe (999). Renommez ou différenciez le nom d\'établissement.',
    };
  }
  return { matricule: prefix + String(next).padStart(3, '0') };
}

module.exports = {
  threeLetterPrefixFromEtablissementNom,
  generateNextMatriculeForEtablissement,
};
