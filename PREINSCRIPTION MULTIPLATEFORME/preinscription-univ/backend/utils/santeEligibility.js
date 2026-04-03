/**
 * Éligibilité aux filières santé (EFOSANTE) selon le dernier diplôme déclaré.
 * Codes normalisés : BAC_S, BAC, BFEM, NIVEAU_3EME, TERMINALE, BAC_PLUS.
 * Rétrocompatible avec d’anciennes valeurs de liste (ex. « Baccalauréat » seul).
 */

/**
 * @param {string|null|undefined} dernierDiplome
 * @returns {string[]}
 */
function levelsFromDiplome(dernierDiplome) {
  const raw = String(dernierDiplome || '').trim().toLowerCase();
  if (!raw) return [];

  const codes = [];

  const hasSerieS =
    raw.includes('série s') ||
    raw.includes('serie s') ||
    raw.includes('scientifique');

  if (hasSerieS && raw.includes('baccalaur')) {
    codes.push('BAC_S');
  } else if (raw.includes('baccalaur')) {
    codes.push('BAC');
  }

  if (raw.includes('bfem') || raw.includes('brevet des collèges') || raw.includes('brevet')) {
    if (!raw.includes('baccalaur')) codes.push('BFEM');
  }

  if (raw.includes('3ème') || raw.includes('3eme') || raw.includes('troisième')) {
    codes.push('NIVEAU_3EME');
  }

  if (raw.includes('terminale') && !raw.includes('baccalaur')) {
    codes.push('TERMINALE');
  }

  if (
    raw.includes('bts') ||
    raw.includes('dut') ||
    raw.includes('licence') ||
    raw.includes('master')
  ) {
    codes.push('BAC_PLUS');
  }

  return [...new Set(codes)];
}

/**
 * @param {string[]} codes
 * @param {string[]} accept
 * @param {{ strict_bac_s?: boolean }} [opts]
 * @returns {boolean}
 */
function matchesAccept(codes, accept, opts = {}) {
  if (!accept || accept.length === 0) return false;
  const set = new Set(codes);

  if (opts.strict_bac_s) {
    return accept.includes('BAC_S') && set.has('BAC_S');
  }

  const expanded = new Set(set);
  if (set.has('BAC_S')) expanded.add('BAC');

  for (const req of accept) {
    if (expanded.has(req) || set.has(req)) return true;
  }
  return false;
}

/**
 * @param {{ eligibility?: { accept?: string[], strict_bac_s?: boolean }, condition_acces?: string } | null | undefined } filiere
 * @param {string|null|undefined} dernierDiplome
 * @returns {{ eligible: boolean | null, message: string, candidat_levels: string[] }}
 */
function evaluateSanteFiliereEligibility(filiere, dernierDiplome) {
  const e = filiere && filiere.eligibility;
  if (!e || !Array.isArray(e.accept)) {
    return {
      eligible: null,
      message: '',
      candidat_levels: levelsFromDiplome(dernierDiplome),
    };
  }

  const candidat_levels = levelsFromDiplome(dernierDiplome);
  const ok = matchesAccept(candidat_levels, e.accept, {
    strict_bac_s: !!e.strict_bac_s,
  });

  if (candidat_levels.length === 0) {
    return {
      eligible: null,
      message:
        'Indiquez votre dernier diplôme pour vérifier l’éligibilité à cette filière.',
      candidat_levels,
    };
  }

  return {
    eligible: ok,
    message: ok
      ? 'Profil compatible avec les conditions d’accès de cette filière (selon votre déclaration).'
      : `Profil non compatible ou à confirmer : conditions d’accès « ${filiere.condition_acces || 'voir filière'} ». L’administration pourra valider sur pièces.`,
    candidat_levels,
  };
}

module.exports = {
  levelsFromDiplome,
  matchesAccept,
  evaluateSanteFiliereEligibility,
};
