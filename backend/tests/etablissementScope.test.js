const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  getFormationIdsForEtab,
  dossierAppartientAEtablissement,
  demandeAppartientAEtablissement,
  buildFormationsMap,
} = require('../utils/etablissementScope');

const formations = [
  { id: 10, etablissement_id: 1 },
  { id: 20, etablissement_id: 2 },
];
const map = buildFormationsMap(formations);

describe('etablissementScope', () => {
  it('filtre les formations par établissement', () => {
    assert.deepEqual(getFormationIdsForEtab(formations, 1), [10]);
    assert.equal(getFormationIdsForEtab(formations, null), null);
  });

  it('associe un dossier à son établissement via formation_id', () => {
    const d = { formation_id: 10 };
    assert.equal(dossierAppartientAEtablissement(d, 1, map), true);
    assert.equal(dossierAppartientAEtablissement(d, 2, map), false);
  });

  it('associe une demande proforma au périmètre', () => {
    const dem = { formation_id: 10 };
    assert.equal(demandeAppartientAEtablissement(dem, 1, [10]), true);
    assert.equal(demandeAppartientAEtablissement(dem, 2, [20]), false);
  });
});
