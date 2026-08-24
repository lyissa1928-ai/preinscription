const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  dossierAppartientAEtablissement,
  demandeAppartientAEtablissement,
  buildFormationsMap,
} = require('../utils/etablissementScope');

/**
 * Logique identique à staffScope (sans charger db.js).
 */
describe('staffScope / IDOR (logique pure)', () => {
  const formations = [
    { id: 1, etablissement_id: 10 },
    { id: 2, etablissement_id: 20 },
  ];
  const map = buildFormationsMap(formations);
  const formationIdsEtab10 = [1];

  it('dossier hors établissement refusé', () => {
    const d = { formation_id: 2 };
    assert.equal(dossierAppartientAEtablissement(d, 10, map), false);
  });

  it('dossier dans établissement accepté', () => {
    const d = { formation_id: 1 };
    assert.equal(dossierAppartientAEtablissement(d, 10, map), true);
  });

  it('demande proforma hors périmètre refusée', () => {
    const dem = { formation_id: 2 };
    assert.equal(demandeAppartientAEtablissement(dem, 10, formationIdsEtab10), false);
  });

  it('demande proforma dans périmètre acceptée', () => {
    const dem = { etablissement_id: 10 };
    assert.equal(demandeAppartientAEtablissement(dem, 10, formationIdsEtab10), true);
  });
});
