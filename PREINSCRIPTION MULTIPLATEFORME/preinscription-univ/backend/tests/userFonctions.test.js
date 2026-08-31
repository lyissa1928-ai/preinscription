const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  computeEstResponsableDesigne,
  actsAsResponsable,
  roleAllows,
} = require('../utils/userFonctions');

const etabs = [
  { id: 1, nom: 'ESEBAT', actif: true, responsable_id: 8 },
  { id: 2, nom: 'ESCOA', actif: true, responsable_id: null },
  { id: 3, nom: 'FERME', actif: false, responsable_id: 9 },
];

describe('userFonctions.computeEstResponsableDesigne', () => {
  it('comptable désigné responsable de SON établissement -> true', () => {
    const u = { id: 8, role: 'comptable', etablissement_id: 1, actif: true };
    assert.equal(computeEstResponsableDesigne(u, etabs), true);
  });

  it('membre non désigné -> false', () => {
    const u = { id: 12, role: 'agent_admin', etablissement_id: 1, actif: true };
    assert.equal(computeEstResponsableDesigne(u, etabs), false);
  });

  it('désigné mais rattaché à un AUTRE établissement -> false (pas de droits croisés)', () => {
    const u = { id: 8, role: 'comptable', etablissement_id: 2, actif: true };
    assert.equal(computeEstResponsableDesigne(u, etabs), false);
  });

  it('désigné sur un établissement inactif -> false', () => {
    const u = { id: 9, role: 'comptable', etablissement_id: 3, actif: true };
    assert.equal(computeEstResponsableDesigne(u, etabs), false);
  });

  it('compte désactivé -> false', () => {
    const u = { id: 8, role: 'comptable', etablissement_id: 1, actif: false };
    assert.equal(computeEstResponsableDesigne(u, etabs), false);
  });

  it('étudiant jamais responsable (même avec pointeur obsolète)', () => {
    const u = { id: 8, role: 'etudiant', etablissement_id: 1, actif: true };
    assert.equal(computeEstResponsableDesigne(u, etabs), false);
  });

  it('admin global jamais via fonction (a déjà tous les droits)', () => {
    const u = { id: 8, role: 'admin', etablissement_id: 1, actif: true };
    assert.equal(computeEstResponsableDesigne(u, etabs), false);
  });
});

describe('userFonctions.actsAsResponsable', () => {
  it('rôle responsable -> true', () => {
    assert.equal(actsAsResponsable({ role: 'responsable' }), true);
  });
  it('fonction responsable (rôle comptable) -> true', () => {
    assert.equal(actsAsResponsable({ role: 'comptable', fonctions: ['responsable'] }), true);
  });
  it('comptable sans fonction -> false', () => {
    assert.equal(actsAsResponsable({ role: 'comptable', fonctions: [] }), false);
  });
});

describe('userFonctions.roleAllows (logique roleGuard)', () => {
  it('rôle principal accepté', () => {
    assert.equal(roleAllows({ role: 'admin', fonctions: [] }, ['responsable', 'admin']), true);
  });
  it('fonction acceptée à la place du rôle', () => {
    assert.equal(roleAllows({ role: 'comptable', fonctions: ['responsable'] }, ['responsable', 'admin']), true);
  });
  it('ni rôle ni fonction -> refusé', () => {
    assert.equal(roleAllows({ role: 'comptable', fonctions: [] }, ['responsable', 'admin']), false);
  });
  it('fonctions absentes (undefined) -> refusé sans crash', () => {
    assert.equal(roleAllows({ role: 'comptable' }, ['responsable']), false);
  });
});
