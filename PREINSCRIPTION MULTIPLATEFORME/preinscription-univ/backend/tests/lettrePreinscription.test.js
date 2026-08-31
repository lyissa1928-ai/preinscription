const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { canIssueLettrePreinscription } = require('../utils/canIssueLettrePreinscription');
const { canIssueOfficialDocs } = require('../utils/canIssueOfficialDocs');

describe('lettre vs attestation', () => {
  it('refuse la lettre pour un walk-in (source staff)', () => {
    assert.equal(
      canIssueLettrePreinscription({
        source: 'staff',
        statut: 'accepte',
        etudiant_id: 1,
        nationalite: 'Malienne',
      }),
      false,
    );
    assert.equal(canIssueOfficialDocs({ source: 'staff', statut: 'accepte' }), true);
  });

  it('autorise la lettre pour un étranger accepté en ligne', () => {
    assert.equal(
      canIssueLettrePreinscription({
        statut: 'accepte',
        etudiant_id: 12,
        nationalite: 'Française',
      }),
      true,
    );
  });

  it('refuse la lettre pour un Sénégalais', () => {
    assert.equal(
      canIssueLettrePreinscription({
        statut: 'accepte',
        etudiant_id: 12,
        nationalite: 'Sénégalaise',
      }),
      false,
    );
  });

  it('refuse sans compte étudiant', () => {
    assert.equal(
      canIssueLettrePreinscription({
        statut: 'accepte',
        nationalite: 'Ivoirienne',
      }),
      false,
    );
  });
});
