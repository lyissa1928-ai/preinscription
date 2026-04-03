/**
 * node --test backend/test/santeEligibility.test.js
 */
const { test } = require('node:test');
const assert = require('node:assert');
const {
  levelsFromDiplome,
  evaluateSanteFiliereEligibility,
} = require('../utils/santeEligibility');

test('BAC S détecté pour Baccalauréat série S', () => {
  const l = levelsFromDiplome('Baccalauréat série S (scientifique)');
  assert.ok(l.includes('BAC_S'));
});

test('Technicien biologie : strict BAC S uniquement', () => {
  const filiere = {
    condition_acces: 'BAC S',
    eligibility: { accept: ['BAC_S'], strict_bac_s: true },
  };
  const ok = evaluateSanteFiliereEligibility(filiere, 'Baccalauréat série S (scientifique)');
  assert.strictEqual(ok.eligible, true);
  const nok = evaluateSanteFiliereEligibility(filiere, 'Baccalauréat');
  assert.strictEqual(nok.eligible, false);
});

test('Sage-femme : BAC général ou BAC S ou Licence', () => {
  const filiere = {
    condition_acces: 'BAC',
    eligibility: { accept: ['BAC', 'BAC_S', 'BAC_PLUS'] },
  };
  assert.strictEqual(evaluateSanteFiliereEligibility(filiere, 'Baccalauréat').eligible, true);
  assert.strictEqual(evaluateSanteFiliereEligibility(filiere, 'Licence').eligible, true);
  assert.strictEqual(evaluateSanteFiliereEligibility(filiere, 'BFEM / Brevet des collèges').eligible, false);
});

test('Aide-soignant : BFEM ou 3ème', () => {
  const filiere = {
    eligibility: { accept: ['BFEM', 'NIVEAU_3EME'] },
  };
  assert.strictEqual(evaluateSanteFiliereEligibility(filiere, 'Niveau 3ème').eligible, true);
  assert.strictEqual(evaluateSanteFiliereEligibility(filiere, 'BFEM / Brevet des collèges').eligible, true);
});
