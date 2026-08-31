/** Normalisation texte FR pour recherche (accents, fautes courantes, ponctuation). */

function stripAccents(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeText(s) {
  return stripAccents(String(s || '').toLowerCase())
    .replace(/['’]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/[^a-z0-9\s+/.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Corrections phonétiques / abréviations fréquentes des candidats. */
const TYPO_MAP = {
  bjr: 'bonjour',
  slt: 'salut',
  kelle: 'quelle',
  koi: 'quoi',
  fo: 'faut',
  pe: 'peut',
  peus: 'peux',
  chui: 'suis',
  jveux: 'veux',
  jai: 'ai',
  tjr: 'toujours',
  stp: 'svp',
  informatik: 'informatique',
  informatiqe: 'informatique',
  informatiq: 'informatique',
  cybersecurite: 'cybersecurite',
  cybersécurité: 'cybersecurite',
  reseaux: 'reseau',
  réseaux: 'reseau',
  batiment: 'batiment',
  génie: 'genie',
  licence: 'licence',
  master: 'master',
  bts: 'bts',
};

function expandTypos(normalized) {
  return normalized
    .split(' ')
    .map((w) => TYPO_MAP[w] || w)
    .join(' ');
}

function tokenize(s) {
  return expandTypos(normalizeText(s))
    .split(' ')
    .filter((t) => t.length >= 2);
}

module.exports = { stripAccents, normalizeText, expandTypos, tokenize };
