const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isDossierAffichable,
  filterDossiersAffichables,
} = require('../utils/dossierVisibility');

describe('dossierVisibility', () => {
  const users = [
    { id: 1, role: 'etudiant' },
    { id: 2, role: 'admin' },
  ];
  const byId = new Map(users.map((u) => [u.id, u]));

  it('affiche dossier guichet sans etudiant_id', () => {
    assert.equal(isDossierAffichable({ id: 10, etudiant_id: null }, byId), true);
    assert.equal(isDossierAffichable({ id: 11 }, byId), true);
  });

  it('affiche dossier si compte étudiant existe', () => {
    assert.equal(isDossierAffichable({ id: 12, etudiant_id: 1 }, byId), true);
  });

  it('masque dossier si compte étudiant supprimé', () => {
    assert.equal(isDossierAffichable({ id: 13, etudiant_id: 999 }, byId), false);
  });

  it('masque dossier si etudiant_id pointe vers non-étudiant', () => {
    assert.equal(isDossierAffichable({ id: 14, etudiant_id: 2 }, byId), false);
  });

  it('filterDossiersAffichables exclut orphelins', () => {
    const dossiers = [
      { id: 1, etudiant_id: 1 },
      { id: 2, etudiant_id: 999 },
      { id: 3, etudiant_id: null },
    ];
    const out = filterDossiersAffichables(dossiers, users);
    assert.deepEqual(out.map((d) => d.id), [1, 3]);
  });
});
