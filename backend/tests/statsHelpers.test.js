const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { countDossiersByStatut } = require('../utils/statsHelpers');

describe('statsHelpers', () => {
  it('calcule le taux d’acceptation', () => {
    const r = countDossiersByStatut([
      { statut: 'accepte' },
      { statut: 'accepte' },
      { statut: 'refuse' },
      { statut: 'en_attente' },
    ]);
    assert.equal(r.total, 4);
    assert.equal(r.acceptes, 2);
    assert.equal(r.taux_acceptation_pct, 66.7);
  });
});
